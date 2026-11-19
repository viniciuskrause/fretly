import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import Stripe from "stripe";

// Guitar Workouts Premium, with Stripe.
//
//   createCheckout  (callable) a Stripe Checkout page for the chosen plan
//   createPortal    (callable) the Stripe customer portal (card, invoices, cancel)
//   stripeWebhook   (HTTP)     Stripe's events: keeps billing/{uid} up to date
//
// billing/{uid} is written only here (firestore.rules lets the owner read it):
//   customer_id, premium, plan, status, lifetime, current_period_end, cancel_at_period_end
// The app reads `premium` from it (src/premium.ts).
//
// Secrets live in Google Secret Manager, never in the code:
//   STRIPE_SECRET_KEY      a restricted key (rk_...) from the Stripe dashboard
//   STRIPE_WEBHOOK_SECRET  the signing secret of the webhook endpoint (whsec_...)

initializeApp();
const db = getFirestore();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const SITE = "https://guitarworkouts.app";
type Plan = "annual" | "monthly" | "lifetime";
const LOOKUP_KEYS: Record<Plan, string> = { annual: "premium_annual", monthly: "premium_monthly", lifetime: "premium_lifetime" };
// EU consumers: Premium starts right away, so the right of withdrawal lapses once
// access begins (§ 356(5) BGB) if they ask for that at checkout. The checkbox (Stripe's
// terms of service consent, with this text) is required; the receipt confirms it.
const WAIVER = {
  pt: {
    checkout: `Concordo com os [Termos de Uso](${SITE}/pt/termos/) e a [Política de Privacidade](${SITE}/pt/privacidade/). Peço que o Premium comece agora e sei que perco o direito de desistência quando o acesso começa.`,
    receipt: "Você pediu que o Premium começasse imediatamente e confirmou saber que perde o direito de desistência quando o acesso começa (§ 356(5) BGB).",
  },
  en: {
    checkout: `I agree to the [Terms of Service](${SITE}/terms/) and the [Privacy Policy](${SITE}/privacy/). I ask for Premium to start now and understand that I lose my right of withdrawal once access begins.`,
    receipt: "You asked for Premium to start immediately and confirmed you know you lose your right of withdrawal once access begins (§ 356(5) BGB).",
  },
};
const PLAN_OF_LOOKUP: Record<string, Plan> = { premium_annual: "annual", premium_monthly: "monthly", premium_lifetime: "lifetime" };

const stripe = () => new Stripe(STRIPE_SECRET_KEY.value());
const billingDoc = (uid: string) => db.collection("billing").doc(uid);

/** The learner's Stripe customer, created on the first checkout (one per account). */
async function customerFor(client: Stripe, uid: string, email: string | undefined, lang: "pt" | "en"): Promise<string> {
  const snapshot = await billingDoc(uid).get();
  const existing = snapshot.get("customer_id") as string | undefined;
  // The waiver goes on the customer's invoices (subscriptions), in the checkout's language.
  const invoice_settings = { footer: WAIVER[lang].receipt };
  if (existing) {
    await client.customers.update(existing, { invoice_settings, preferred_locales: [lang === "pt" ? "pt-BR" : "en"] });
    return existing;
  }
  const customer = await client.customers.create(
    { email, metadata: { uid }, invoice_settings, preferred_locales: [lang === "pt" ? "pt-BR" : "en"] },
    { idempotencyKey: `customer-${uid}-${lang}` },
  );
  await billingDoc(uid).set({ customer_id: customer.id }, { merge: true });
  return customer.id;
}

function requireLearner(auth: { uid: string; token: Record<string, unknown> } | undefined) {
  if (!auth) throw new HttpsError("unauthenticated", "Log in first.");
  if (auth.token.email_verified !== true) throw new HttpsError("permission-denied", "Confirm your e-mail first.");
  return auth;
}

export const createCheckout = onCall({ secrets: [STRIPE_SECRET_KEY], cors: true }, async (request) => {
  const auth = requireLearner(request.auth);
  const plan = request.data?.plan as Plan;
  const lang = request.data?.lang === "pt" ? "pt" : "en";
  if (!(plan in LOOKUP_KEYS)) throw new HttpsError("invalid-argument", "Unknown plan.");

  const billing = (await billingDoc(auth.uid).get()).data();
  if (billing?.premium) throw new HttpsError("already-exists", "Already Premium.");

  const client = stripe();
  const prices = await client.prices.list({ lookup_keys: [LOOKUP_KEYS[plan]], active: true });
  const price = prices.data[0];
  if (!price) throw new HttpsError("failed-precondition", "Price not found.");

  const customer = await customerFor(client, auth.uid, auth.token.email as string | undefined, lang);
  const subscription = plan !== "lifetime";
  const session = await client.checkout.sessions.create({
    mode: subscription ? "subscription" : "payment",
    customer,
    client_reference_id: auth.uid,
    line_items: [{ price: price.id, quantity: 1 }],
    // Reais on the Portuguese site, dollars on the English one (the price has both).
    currency: lang === "pt" ? "brl" : "usd",
    locale: lang === "pt" ? "pt-BR" : "en",
    automatic_tax: { enabled: true },
    // Stripe Tax needs the address; keep it on the customer for the next invoices.
    customer_update: { address: "auto", name: "auto" },
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    consent_collection: { terms_of_service: "required" },
    custom_text: { terms_of_service_acceptance: { message: WAIVER[lang].checkout } },
    metadata: { uid: auth.uid, plan },
    ...(subscription
      ? { subscription_data: { metadata: { uid: auth.uid, plan } } }
      : { invoice_creation: { enabled: true, invoice_data: { footer: WAIVER[lang].receipt, metadata: { uid: auth.uid, plan } } }, payment_intent_data: { metadata: { uid: auth.uid, plan } } }),
    success_url: `${SITE}/profile/?lang=${lang}&checkout=success`,
    cancel_url: `${SITE}/upgrade/?lang=${lang}`,
  });
  return { url: session.url };
});

export const createPortal = onCall({ secrets: [STRIPE_SECRET_KEY], cors: true }, async (request) => {
  const auth = requireLearner(request.auth);
  const lang = request.data?.lang === "pt" ? "pt" : "en";
  const customer = (await billingDoc(auth.uid).get()).get("customer_id") as string | undefined;
  if (!customer) throw new HttpsError("failed-precondition", "No billing account yet.");
  const session = await stripe().billingPortal.sessions.create({
    customer,
    locale: lang === "pt" ? "pt-BR" : "en",
    return_url: `${SITE}/profile/?lang=${lang}`,
  });
  return { url: session.url };
});

/** Account of a Stripe customer (from its metadata, else from billing/). */
async function uidOfCustomer(client: Stripe, customerId: string): Promise<string | null> {
  const customer = await client.customers.retrieve(customerId);
  if (!customer.deleted && customer.metadata?.uid) return customer.metadata.uid;
  const match = await db.collection("billing").where("customer_id", "==", customerId).limit(1).get();
  return match.empty ? null : match.docs[0].id;
}

/** Recomputes Premium from what is stored: a lifetime purchase, or an active subscription. */
async function saveBilling(uid: string, update: Record<string, unknown>) {
  const ref = billingDoc(uid);
  await db.runTransaction(async (transaction) => {
    const current = (await transaction.get(ref)).data() ?? {};
    const next = { ...current, ...update };
    const premium = next.lifetime === true || ["active", "trialing"].includes(next.status as string);
    transaction.set(ref, { ...update, premium, updated_at: FieldValue.serverTimestamp() }, { merge: true });
  });
  // Also on the ID token (stripeRole), for anything that checks claims.
  const user = await getAuth().getUser(uid);
  const fresh = (await ref.get()).get("premium") === true;
  if ((user.customClaims?.stripeRole === "premium") !== fresh) {
    await getAuth().setCustomUserClaims(uid, { ...user.customClaims, stripeRole: fresh ? "premium" : null });
  }
}

async function onSubscription(client: Stripe, subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const uid = subscription.metadata?.uid || (await uidOfCustomer(client, customerId));
  if (!uid) return logger.warn("Subscription without an account", { subscription: subscription.id });
  const item = subscription.items.data[0];
  const periodEnd = item?.current_period_end;
  await saveBilling(uid, {
    customer_id: customerId,
    subscription_id: subscription.id,
    status: subscription.status,
    plan: PLAN_OF_LOOKUP[item?.price.lookup_key ?? ""] ?? null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  });
}

async function onPaidCheckout(session: Stripe.Checkout.Session) {
  // Subscriptions are handled by their own events; this is the lifetime purchase.
  if (session.mode !== "payment" || session.payment_status !== "paid") return;
  const uid = session.client_reference_id || session.metadata?.uid;
  if (!uid) return logger.warn("Checkout without an account", { session: session.id });
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  await saveBilling(uid, { customer_id: customerId ?? null, lifetime: true, plan: "lifetime", lifetime_session: session.id });
}

export const stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const client = stripe();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(req.rawBody, req.header("stripe-signature") ?? "", STRIPE_WEBHOOK_SECRET.value());
  } catch (error) {
    logger.warn("Webhook signature check failed", { error: (error as Error).message });
    res.status(400).send("Invalid signature");
    return;
  }
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await onPaidCheckout(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await onSubscription(client, event.data.object);
        break;
      case "charge.refunded": {
        // A refunded lifetime purchase removes Premium.
        const charge = event.data.object;
        const uid = charge.metadata?.uid;
        if (uid && charge.metadata?.plan === "lifetime" && charge.refunded) await saveBilling(uid, { lifetime: false });
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (error) {
    logger.error("Webhook handling failed", { type: event.type, error: (error as Error).message });
    // Stripe retries on errors.
    res.status(500).send("Error");
  }
});
