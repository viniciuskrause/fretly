import { useEffect, useState } from "react";

import { doc, onSnapshot } from "firebase/firestore";

import { db, useAccount } from "./auth/firebase.ts";
import type { Lang } from "./i18n.tsx";
import { sections } from "./lessons.ts";
import type { Progress } from "./progress.ts";

// Guitar Workouts Premium. Free learners practise until they have finished
// FREE_LESSONS aulas (trails, each in all its keys); after that, starting an
// exercise they haven't done yet opens the paywall (src/premium/UpgradeView.tsx).
// Exercises already done can always be replayed.
//
// Payment goes through Stripe (functions/). The prices shown here mirror the
// Stripe prices (lookup keys premium_annual, premium_monthly, premium_lifetime):
// change both together.

export const FREE_LESSONS = 20;

/** Aulas (trails) finished in every key, as the dashboard counts them. */
export function finishedLessons(progress: Progress) {
  return sections.flatMap((section) => section.trails).filter((trail) => trail.lessons.every((lesson) => progress[lesson.key])).length;
}

export const totalLessons = () => sections.flatMap((section) => section.trails).length;

/** True when this exercise is behind the paywall for this learner. */
export function isLocked({ premium, progress, lessonKey }: { premium: boolean; progress: Progress; lessonKey: string }) {
  return !premium && !progress[lessonKey] && finishedLessons(progress) >= FREE_LESSONS;
}

/** billing/{uid}, written by the Stripe functions (functions/src/index.ts). */
export type Billing = {
  premium?: boolean;
  plan?: "annual" | "monthly" | "lifetime" | null;
  status?: string;
  lifetime?: boolean;
  cancel_at_period_end?: boolean;
  current_period_end?: string | null;
  customer_id?: string;
};

/** The logged-in learner's billing record, live (null while logged out or before any purchase). */
export function useBilling() {
  const account = useAccount();
  const uid = account?.uid;
  const [billing, setBilling] = useState<Billing | null>(null);
  useEffect(() => {
    setBilling(null);
    if (!uid || !db) return;
    return onSnapshot(
      doc(db, "billing", uid),
      (snapshot) => setBilling((snapshot.data() as Billing | undefined) ?? null),
      () => setBilling(null),
    );
  }, [uid]);
  return billing;
}

/** Whether the logged-in learner has Premium (a lifetime purchase or an active subscription). */
export function usePremium() {
  return useBilling()?.premium === true;
}

export type PlanId = "annual" | "lifetime" | "monthly";

/** Prices as set in Stripe (taxes included): reais on the Portuguese site, dollars on the English one. */
const PRICES: Record<Lang, { currency: string; locale: string; monthly: number; annual: number; lifetime: number }> = {
  // Same structure in reais: annual R$ 14,99 a month (R$ 179,88 a year), 75% less than monthly (R$ 59,90); lifetime ≈ 1.9 years of annual.
  pt: { currency: "BRL", locale: "pt-BR", monthly: 59.9, annual: 179.88, lifetime: 339.9 },
  // Annual: $3.99 a month (billed $47.88 a year), 75% less than monthly ($3.99 / 0.25 ≈ $15.99).
  en: { currency: "USD", locale: "en-US", monthly: 15.99, annual: 47.88, lifetime: 90.99 },
};

export type Plan = {
  id: PlanId;
  /** Big price on the right ("$4.99") and what it is per ("/month", "one-time"). */
  price: string;
  per: { pt: string; en: string };
  name: { pt: string; en: string };
  detail: { pt: string; en: string };
  /** Badge on the highlighted plan. */
  badge?: { pt: string; en: string };
};

export function plansFor(lang: Lang): Plan[] {
  const p = PRICES[lang];
  const money = (value: number) =>
    new Intl.NumberFormat(p.locale, { style: "currency", currency: p.currency, minimumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
  const save = Math.round((1 - p.annual / (p.monthly * 12)) * 100);
  return [
    {
      id: "annual",
      price: money(Math.floor((p.annual / 12) * 100) / 100),
      per: { pt: "/mês", en: "/month" },
      name: { pt: "Anual", en: "Annual" },
      detail: { pt: `${money(p.annual)} por ano`, en: `${money(p.annual)}, billed yearly` },
      badge: { pt: `Mais popular — economize ${save}%`, en: `Most popular — save ${save}%` },
    },
    {
      id: "monthly",
      price: money(p.monthly),
      per: { pt: "/mês", en: "/month" },
      name: { pt: "Mensal", en: "Monthly" },
      detail: { pt: "Flexível, cancele quando quiser", en: "Flexible, cancel anytime" },
    },
    {
      id: "lifetime",
      price: money(p.lifetime),
      per: { pt: "uma vez", en: "one-time" },
      name: { pt: "Vitalício", en: "Lifetime" },
      detail: { pt: "Pague uma vez, é seu para sempre", en: "Pay once, yours forever" },
    },
  ];
}
