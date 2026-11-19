// Free Premium for an existing account (the owner, teachers, partners), without Stripe.
//
//   node functions/scripts/grant-premium.mjs <e-mail>            grant lifetime Premium
//   node functions/scripts/grant-premium.mjs <e-mail> --revoke   take it back
//
// Uses your gcloud login (gcloud auth application-default login), no key files.
// Writes billing/{uid} like the Stripe webhook does (functions/src/index.ts): a
// lifetime grant keeps Premium whatever the subscription events say. `granted`
// marks it as a gift, not a purchase.

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node functions/scripts/grant-premium.mjs <e-mail> [--revoke]");
  process.exit(1);
}
const revoke = flag === "--revoke";

initializeApp({ credential: applicationDefault(), projectId: "guitar-workouts" });
const db = getFirestore();
const user = await getAuth().getUserByEmail(email);
const ref = db.collection("billing").doc(user.uid);
const current = (await ref.get()).data() ?? {};

if (revoke && !current.granted) {
  console.error(`${email}: Premium was not granted with this script (bought in Stripe?); nothing changed.`);
  process.exit(1);
}

const update = revoke
  ? { lifetime: false, granted: FieldValue.delete(), plan: current.subscription_id ? current.plan ?? null : null }
  : { lifetime: true, plan: "lifetime", granted: "gift" };
const premium = !revoke || ["active", "trialing"].includes(current.status);
await ref.set({ ...update, premium, updated_at: FieldValue.serverTimestamp() }, { merge: true });
await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, stripeRole: premium ? "premium" : null });

console.log(`${email}: Premium ${premium ? "on (lifetime, gift)" : "off"}`);
