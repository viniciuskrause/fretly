import { useEffect, useState, type ReactNode } from "react";

import { track } from "../analytics.ts";
import { useI18n } from "../i18n.tsx";
import { startCheckout, useAccount, useAccountReady } from "../auth/firebase.ts";
import { FREE_LESSONS, plansFor, totalLessons, usePremium, type PlanId } from "../premium.ts";

// The paywall: what Premium includes and its plans. Shown in the app when a free
// learner has finished FREE_LESSONS aulas and opens a new exercise
// (reason "limit"), and on its own page (upgrade/), from "Minha conta".
// "Upgrade" opens Stripe Checkout (functions/src/index.ts: createCheckout).

const Check = () => (
  <svg className="mt-0.5 size-5 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

function Question({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-[16px] font-semibold text-ink">
        {question}
        <svg className="size-5 shrink-0 text-ink-2 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <p className="px-5 pb-5 text-[15px] leading-7 text-ink-2">{children}</p>
    </details>
  );
}

export function UpgradeView({ reason, onBack, backLabel }: { reason?: "limit"; onBack?: () => void; backLabel?: string }) {
  const { t, lang } = useI18n();
  const plans = plansFor(lang);
  const [plan, setPlan] = useState<PlanId>("annual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const account = useAccount();
  const ready = useAccountReady();
  const premium = usePremium();

  async function upgrade() {
    track("begin_checkout", { plan });
    // Payments belong to an account: log in (or sign up) first, then come back here.
    if (!account) {
      window.location.assign(`../login/?lang=${lang}`);
      return;
    }
    setError(false);
    setBusy(true);
    const failure = await startCheckout(plan, lang);
    // On success the browser is already leaving for Stripe.
    if (failure) {
      setBusy(false);
      setError(true);
    }
  }
  const total = totalLessons();

  useEffect(() => {
    track("view_paywall", { reason: reason ?? "account" });
  }, [reason]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-8 sm:py-14">
      {onBack && (
        <button type="button" onClick={onBack} className="-ml-2 mb-6 inline-flex h-11 items-center gap-1.5 rounded-control px-2 text-[15px] font-semibold text-ink-2 hover:bg-sunken hover:text-ink">
          <span aria-hidden="true">←</span> {backLabel ?? t("Voltar", "Back")}
        </button>
      )}
      {/* Phones: benefits, plans, questions. Desktop: plans in a column on the right. */}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-14 lg:gap-y-0">
        <div className="lg:col-start-1 lg:row-start-1">
          <h1 className="text-balance font-display text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[44px]">
            {reason === "limit" ? t("Faça upgrade para continuar praticando", "Upgrade to keep practicing") : t("Guitar Workouts Premium", "Guitar Workouts Premium")}
          </h1>
          <p className="mt-4 max-w-[640px] text-[18px] leading-8 text-ink-2">
            {reason === "limit"
              ? t(
                  `Você concluiu as ${FREE_LESSONS} aulas grátis. Com o Premium, siga praticando o braço inteiro, em todos os tons, sem limites.`,
                  `You've finished your ${FREE_LESSONS} free lessons. With Premium, keep practicing the whole fretboard, in every key, with no limits.`,
                )
              : t(
                  `O plano grátis inclui ${FREE_LESSONS} aulas. O Premium libera tudo, para você praticar o braço inteiro sem limites.`,
                  `The free plan includes ${FREE_LESSONS} lessons. Premium unlocks everything, so you can practice the whole fretboard with no limits.`,
                )}
          </p>
          <ul className="mt-8 space-y-4">
            {[
              t(`Todas as ${total} aulas dos seis módulos, e as que ainda vão chegar`, `All ${total} lessons in the six modules, and the ones still to come`),
              t("CAGED, inversões, escalas e arpejos em todos os tons e regiões do braço", "CAGED, inversions, scales and arpeggios in every key and region of the neck"),
              t("Seu progresso e seus andamentos salvos em todos os seus aparelhos", "Your progress and tempos saved across all your devices"),
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-[17px] leading-7 text-ink">
                <Check />
                <span>{item}</span>
              </li>
            ))}
          </ul>

        </div>

        <aside className="rounded-card border border-line bg-surface p-6 sm:p-7 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-labelledby="plans-title">
          <h2 id="plans-title" className="font-display text-[24px] font-bold tracking-[-0.03em] text-ink">
            {t("Guitar Workouts Premium", "Guitar Workouts Premium")}
          </h2>
          <p className="mt-1 text-[15px] leading-6 text-ink-2">
            {t("Um plano com tudo incluído. Escolha como prefere pagar.", "One plan with everything included. Just choose how you'd like to pay.")}
          </p>
          <div role="radiogroup" aria-label={t("Forma de pagamento", "How to pay")} className="mt-6 space-y-3">
            {plans.map((item) => {
              const selected = item.id === plan;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPlan(item.id)}
                  className={`relative flex w-full items-center gap-3 rounded-card border px-4 py-4 text-left transition-colors ${
                    selected ? "border-brand bg-brand-soft" : "border-line-strong bg-surface hover:border-subtle"
                  } ${item.badge ? "mt-3" : ""}`}
                >
                  {item.badge && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">{t(item.badge.pt, item.badge.en)}</span>
                  )}
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-brand" : "border-line-strong"}`} aria-hidden="true">
                    {selected && <span className="size-2.5 rounded-full bg-brand" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold text-ink">{t(item.name.pt, item.name.en)}</span>
                    <span className="block text-[13px] text-ink-2">{t(item.detail.pt, item.detail.en)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-display text-[20px] font-bold tracking-[-0.02em] text-ink">{item.price}</span>
                    <span className="ml-0.5 text-[13px] text-muted">{t(item.per.pt, item.per.en)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {premium ? (
            <p role="status" className="mt-6 rounded-control border border-success bg-success-soft p-4 text-center text-[15px] font-semibold text-ink">
              {t("Você já tem o Premium. Bons estudos!", "You already have Premium. Enjoy practicing!")}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void upgrade()}
              disabled={busy || !ready}
              className="mt-6 flex h-14 w-full items-center justify-center rounded-control bg-accent text-[17px] font-semibold text-white transition-colors hover:bg-accent-strong active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? t("Abrindo o pagamento…", "Opening checkout…") : account || !ready ? t("Fazer upgrade", "Upgrade") : t("Entre para fazer upgrade", "Log in to upgrade")}
            </button>
          )}
          {error && (
            <p role="alert" className="mt-3 text-center text-sm font-medium text-danger">
              {t("Não foi possível abrir o pagamento. Tente de novo em instantes.", "Couldn't open checkout. Please try again in a moment.")}
            </p>
          )}
          <p className="mt-4 text-center text-sm text-muted">{t("Cancele quando quiser", "Cancel any time")}</p>
          <p className="mt-3 text-center text-xs leading-5 text-muted">
            {t("Preços com impostos incluídos. ", "Prices include taxes. ")}
            <a href={t("/pt/termos/", "/terms/")} className="underline underline-offset-2 hover:text-ink">
              {t("Termos de Uso", "Terms of Service")}
            </a>
            {" · "}
            <a href={t("/pt/privacidade/", "/privacy/")} className="underline underline-offset-2 hover:text-ink">
              {t("Privacidade", "Privacy")}
            </a>
          </p>
        </aside>

        <div className="lg:col-start-1 lg:row-start-2 lg:pt-12">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">{t("Perguntas frequentes", "Frequently asked questions")}</h2>
          <div className="mt-4 rounded-card border border-line bg-surface">
            <Question question={t("Como eu cancelo?", "How can I cancel?")}>
              {t(
                "Na página Minha conta, a qualquer momento. Você continua com o Premium até o fim do período já pago, e a assinatura não é renovada.",
                "On the My account page, at any time. You keep Premium until the end of the period you've paid for, and the subscription isn't renewed.",
              )}
            </Question>
            <Question question={t("O que está incluído?", "What's included?")}>
              {t(
                `Todas as ${total} aulas, nos 12 tons, com som, metrônomo, tablatura e partitura, além das aulas novas que forem lançadas. Todos os planos incluem o mesmo conteúdo; só muda a forma de pagar.`,
                `All ${total} lessons, in all 12 keys, with sound, metronome, tab and notation, plus new lessons as they come out. Every plan includes the same content; only the way you pay changes.`,
              )}
            </Question>
            <Question question={t("O que acontece com o meu progresso?", "What happens to my progress?")}>
              {t(
                "Nada muda: as aulas que você já concluiu e os seus andamentos continuam salvos na sua conta, com ou sem o Premium.",
                "Nothing changes: the lessons you've finished and your tempos stay saved in your account, with or without Premium.",
              )}
            </Question>
            <Question question={t("E se eu não gostar?", "What if I don't like it?")}>
              {t(
                "Cancele quando quiser, sem multa. Você ainda pode refazer as aulas grátis que já concluiu.",
                "Cancel whenever you like, with no fee. You can still replay the free lessons you've already finished.",
              )}
            </Question>
          </div>
        </div>
      </div>
    </div>
  );
}
