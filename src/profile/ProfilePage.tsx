import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { ErrorText, Field, homeHref, useErrorMessage } from "../auth/AuthPage.tsx";
import { deleteAccountData, resetAccountProgress, syncProgress } from "../auth/progressSync.ts";
import { confirmPassword, deleteAuthAccount, openBillingPortal, signOutAccount, siteUrl, useAccount, verifiedAccount, type Account } from "../auth/firebase.ts";
import { LANGUAGES, useI18n, type Lang } from "../i18n.tsx";
import { sections } from "../lessons.ts";
import { clearLocalProgress, loadProgress, saveProgress, type Progress } from "../progress.ts";
import { UserMenu } from "../UserMenu.tsx";
import { BpmControl } from "../BpmControl.tsx";
import { track } from "../analytics.ts";
import { adoptAccountDefaults, loadDefaultBpm, saveDefaultBpm, type BpmKind } from "../defaultBpm.ts";
import { FREE_LESSONS, useBilling } from "../premium.ts";

// Account pages, both opened from the user menu and only for logged-in users
// (the session is confirmed with the server first):
// - profile/ ("Minha conta"): a greeting, the account details and the account deletion;
// - settings/ ("Configurações"): lesson progress (and its reset), language and metronome.

type Status = "loading" | "out" | "in";

/** Confirms the stored session with the server once; the account itself stays live (useAccount). */
function useVerifiedStatus() {
  const [status, setStatus] = useState<Status>("loading");
  useEffect(() => {
    void verifiedAccount().then((account) => setStatus(account ? "in" : "out"));
  }, []);
  return status;
}

function Card({ title, tone = "default", children }: { title: string; tone?: "default" | "danger"; children: ReactNode }) {
  return (
    <section
      className={`rounded-card border p-5 sm:p-7 ${tone === "danger" ? "border-danger/30 bg-danger/[0.03]" : "border-line bg-surface"}`}
      aria-label={title}
    >
      <h2 className={`font-display text-[20px] font-bold tracking-[-0.02em] ${tone === "danger" ? "text-danger" : "text-ink"}`}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <dt className="text-[15px] text-ink-2">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[15px] font-medium text-ink">{value}</dd>
    </div>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-4">
      <span className="shrink-0 font-mono text-[18px] font-semibold text-brand-ink">
        {done}/{total}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={t("Exercícios concluídos", "Exercises completed")}
        className="h-3 flex-1 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

/** Confirmation dialog (native <dialog>, closes with Esc). */
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[min(92vw,460px)] rounded-card border border-line bg-surface p-6 text-ink backdrop:bg-ink/50 sm:p-8"
    >
      <h2 className="font-display text-[24px] font-bold tracking-[-0.03em]">{title}</h2>
      {children}
    </dialog>
  );
}

const buttonBase = "inline-flex h-11 items-center justify-center rounded-control px-4 text-[15px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-70";
const outlineButton = `${buttonBase} border border-line-strong bg-surface text-ink-2 hover:border-subtle hover:text-ink`;
const dangerOutline = `${buttonBase} border border-danger/50 bg-surface text-danger hover:bg-danger/[0.06]`;
const dangerSolid = `${buttonBase} bg-danger text-white hover:opacity-90`;

function ResetProgressDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog title={t("Zerar o progresso?", "Reset progress?")} onClose={onClose}>
      <p className="mt-3 text-[16px] leading-7 text-ink-2">
        {t(
          "Todas as aulas concluídas e os andamentos (BPM) salvos serão apagados, neste e nos outros aparelhos. Isso não pode ser desfeito.",
          "All completed lessons and saved tempos (BPM) will be erased, on this and your other devices. This cannot be undone.",
        )}
      </p>
      <div className="mt-4">
        <ErrorText message={error} />
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button type="button" className={outlineButton} onClick={onClose}>
          {t("Cancelar", "Cancel")}
        </button>
        <button
          type="button"
          disabled={busy}
          className={dangerSolid}
          onClick={async () => {
            setBusy(true);
            const failure = await resetAccountProgress();
            setBusy(false);
            if (failure) return setError(errorMessage(failure.code));
            onDone();
          }}
        >
          {busy ? t("Aguarde…", "Please wait…") : t("Zerar progresso", "Reset progress")}
        </button>
      </div>
    </Dialog>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const errorMessage = useErrorMessage();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    // Confirm it is really the owner: check the password again (Firebase also asks
    // for a recent log-in before deleting an account).
    const failure = (await confirmPassword(password)) ?? (await deleteAccountData()) ?? (await deleteAuthAccount());
    if (failure) {
      setBusy(false);
      return setError(errorMessage(failure.code));
    }
    // The account no longer exists: forget it in this browser too.
    await signOutAccount();
    clearLocalProgress();
    window.location.assign(siteUrl(homeHref(lang)));
  }

  return (
    <Dialog title={t("Excluir sua conta?", "Delete your account?")} onClose={onClose}>
      <p className="mt-3 text-[16px] leading-7 text-ink-2">{t("Isso apaga para sempre:", "This permanently removes:")}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] leading-7 text-ink-2">
        <li>{t("seu perfil e todo o seu progresso nas aulas;", "your profile and all your lesson progress;")}</li>
        <li>{t("seu acesso: não será mais possível entrar com este e-mail.", "your sign-in: you won't be able to log in with this e-mail again.")}</li>
      </ul>
      <p className="mt-3 text-[16px] font-semibold text-ink">{t("Isso não pode ser desfeito.", "This cannot be undone.")}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field
          label={t("Senha", "Password")}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          hint={t("Confirme sua senha para excluir a conta.", "Confirm your password to delete the account.")}
        />
        <ErrorText message={error} />
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={outlineButton} onClick={onClose}>
            {t("Manter minha conta", "Keep my account")}
          </button>
          <button type="submit" disabled={busy} className={dangerSolid}>
            {busy ? t("Excluindo…", "Deleting…") : t("Excluir definitivamente", "Permanently delete")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Language of the whole site (app, profile, log-in), saved in this browser. */
function LanguagePicker() {
  const { t, lang, setLang } = useI18n();
  function choose(next: Lang) {
    if (next !== lang) track("change_language", { language: next });
    setLang(next);
    // Keep the address in step, so a reload doesn't bring back the old ?lang=.
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(null, "", url);
  }
  return (
    <div role="radiogroup" aria-label={t("Idioma", "Language")} className="grid gap-3 sm:grid-cols-2">
      {LANGUAGES.map((language) => {
        const selected = language.id === lang;
        return (
          <button
            key={language.id}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={language.htmlLang}
            onClick={() => choose(language.id)}
            className={`flex h-12 items-center justify-between rounded-control border px-4 text-[16px] font-semibold transition-colors ${
              selected ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface text-ink-2 hover:border-subtle hover:text-ink"
            }`}
          >
            <span>{language.label}</span>
            {selected && (
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** A default metronome tempo (exercises or final exercise). Saved shortly after each change. */
function DefaultBpmPicker({ kind, label, hint }: { kind: BpmKind; label: string; hint: string }) {
  const { t } = useI18n();
  const errorMessage = useErrorMessage();
  const [bpm, setBpm] = useState(() => loadDefaultBpm(kind));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | { error: string }>("idle");
  const changed = useRef(false);

  useEffect(() => {
    if (!changed.current) return;
    setStatus("saving");
    const timer = window.setTimeout(() => {
      void saveDefaultBpm(kind, bpm).then((failure) => {
        setStatus(failure ? { error: errorMessage(failure.code) } : "saved");
        if (!failure) track("change_setting", { setting: kind === "exercise" ? "default_bpm" : "sequence_bpm", value: bpm });
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [bpm]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border-b border-line py-4 last:border-b-0 last:pb-0">
      <h3 className="text-[16px] font-semibold text-ink">{label}</h3>
      <p className="mt-1 mb-3 text-[15px] text-ink-2">{hint}</p>
      <div className="flex flex-wrap items-center gap-4">
        <BpmControl
          bpm={bpm}
          disabled={false}
          onChange={(update) => {
            changed.current = true;
            setBpm(update);
          }}
        />
        <span role="status" className="text-sm text-muted">
          {status === "saving" && t("Salvando…", "Saving…")}
          {status === "saved" && t("Salvo", "Saved")}
        </span>
        {typeof status === "object" && <ErrorText message={status.error} />}
      </div>
    </div>
  );
}

export function Header() {
  const { t, lang } = useI18n();
  return (
    <header className="border-b border-line bg-canvas">
      <nav className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:h-[88px] sm:px-8">
        <a href={homeHref(lang)} className="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[22px]">
          Guitar <span className="text-accent-ink">Workouts</span>
        </a>
        <div className="flex items-center gap-3">
          <a
            href={`../app/?lang=${lang}`}
            className="hidden h-11 items-center rounded-control bg-brand px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-strong sm:flex"
          >
            {t("Continuar praticando", "Continue practicing")}
          </a>
          <UserMenu onSignOut={() => window.location.assign(homeHref(lang))} />
        </div>
      </nav>
    </header>
  );
}

type AccountPageKind = "profile" | "settings";

export function ProfilePage() {
  return <AccountPage page="profile" />;
}

export function SettingsPage() {
  return <AccountPage page="settings" />;
}

function AccountPage({ page }: { page: AccountPageKind }) {
  const { t, lang } = useI18n();
  const status = useVerifiedStatus();
  const liveAccount = useAccount();
  // Logged in once the server confirmed it and the account has loaded.
  const account: Account | null = status === "in" ? liveAccount : null;
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [dialog, setDialog] = useState<"reset" | "delete" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const userId = account?.uid ?? null;
  const billing = useBilling();
  const premium = billing?.premium === true;
  // A subscription that will still renew: cancel it before deleting the account
  // (deleting the account does not stop the billing in Stripe).
  const renewing = premium && billing?.plan !== "lifetime" && !billing?.cancel_at_period_end;
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState(false);
  // Back from Stripe Checkout (functions/: success_url): the webhook turns Premium on within seconds.
  const [justPaid] = useState(() => new URLSearchParams(window.location.search).get("checkout") === "success");
  const accountData = account?.dataLoaded ? account.data : undefined;

  // The account's default tempos come into this browser before the pickers read them.
  useEffect(() => {
    if (accountData) adoptAccountDefaults(accountData);
  }, [accountData]);

  useEffect(() => {
    document.title =
      page === "profile"
        ? t("Minha conta – Guitar Workouts", "My account – Guitar Workouts")
        : t("Configurações – Guitar Workouts", "Settings – Guitar Workouts");
  }, [lang, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show the account's progress (merged with this browser's, as in the app).
  useEffect(() => {
    if (!userId) return;
    void syncProgress(loadProgress()).then((merged) => {
      if (!merged) return;
      saveProgress(merged);
      setProgress(merged);
    });
  }, [userId]);

  const date = (iso?: string | null) =>
    iso ? new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", { dateStyle: "long" }).format(new Date(iso)) : "—";

  let content: ReactNode;
  if (status === "loading" || (status === "in" && !account?.dataLoaded)) {
    content = <p className="text-[16px] text-muted">{t("Carregando…", "Loading…")}</p>;
  } else if (status === "out" || !account) {
    content = (
      <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <h1 className="font-display text-[30px] font-bold tracking-[-0.04em] text-ink">
          {page === "profile" ? t("Minha conta", "My account") : t("Configurações", "Settings")}
        </h1>
        <p className="mt-3 text-[16px] text-ink-2">
          {page === "profile"
            ? t("Entre na sua conta para vê-la.", "Log in to see your account.")
            : t("Entre na sua conta para ver as suas configurações.", "Log in to see your settings.")}
        </p>
        <a href={`../login/?lang=${lang}`} className="mt-6 inline-flex h-12 items-center rounded-control bg-brand px-5 text-[16px] font-semibold text-white hover:bg-brand-strong">
          {t("Entrar", "Log in")}
        </a>
      </div>
    );
  } else {
    const { firstName, username } = account;
    // An aula counts once all its 12 keys are done.
    const trails = sections.flatMap((section) => section.trails);
    const total = trails.length;
    const done = trails.filter((trail) => trail.lessons.every((lesson) => progress[lesson.key])).length;

    content = (
      <div className="space-y-6">
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[40px]">
          {page === "settings"
            ? t("Configurações", "Settings")
            : firstName
              ? t(`Olá, ${firstName}`, `Hey, ${firstName}`)
              : t("Minha conta", "My account")}
        </h1>
        {notice && (
          <p role="status" className="rounded-control border border-success bg-success-soft p-4 text-sm font-medium text-ink">
            {notice}
          </p>
        )}

        {page === "profile" ? (
          <>
            <Card title={t("Dados da conta", "Account details")}>
              <dl>
                {firstName && <DetailRow label={t("Nome", "First name")} value={firstName} />}
                <DetailRow label={t("E-mail", "E-mail")} value={account.email || "—"} />
                {username && <DetailRow label={t("Nome de usuário", "Username")} value={username} />}
                <DetailRow label={t("Membro desde", "Member since")} value={date(account.createdAt)} />
                <DetailRow label={t("Último acesso", "Last active")} value={date(account.lastSignInAt)} />
              </dl>
            </Card>

            <Card title={t("Assinatura", "Subscription")}>
              {justPaid && (
                <p role="status" className="mb-4 rounded-control border border-success bg-success-soft p-4 text-sm font-medium text-ink">
                  {premium
                    ? t("Pagamento confirmado. Bem-vindo ao Premium!", "Payment confirmed. Welcome to Premium!")
                    : t("Pagamento recebido. Seu Premium é ativado em instantes.", "Payment received. Your Premium will be active in a moment.")}
                </p>
              )}
              <dl>
                <DetailRow label={t("Nível de acesso", "Access level")} value={premium ? "Premium" : t("Grátis", "Free")} />
                {premium && billing?.plan && (
                  <DetailRow
                    label={t("Plano", "Plan")}
                    value={billing.plan === "lifetime" ? t("Vitalício", "Lifetime") : billing.plan === "annual" ? t("Anual", "Annual") : t("Mensal", "Monthly")}
                  />
                )}
                {premium && billing?.plan !== "lifetime" && billing?.current_period_end && (
                  <DetailRow
                    label={billing.cancel_at_period_end ? t("Acesso até", "Access until") : t("Próxima renovação", "Renews on")}
                    value={date(billing.current_period_end)}
                  />
                )}
                {!premium && <DetailRow label={t("Aulas grátis concluídas", "Free lessons completed")} value={`${Math.min(done, FREE_LESSONS)}/${FREE_LESSONS}`} />}
              </dl>
              {billing?.customer_id && (
                <button
                  type="button"
                  disabled={portalBusy}
                  className={`${outlineButton} mt-5 mr-3`}
                  onClick={async () => {
                    setPortalError(false);
                    setPortalBusy(true);
                    const failure = await openBillingPortal(lang);
                    if (failure) {
                      setPortalBusy(false);
                      setPortalError(true);
                    }
                  }}
                >
                  {portalBusy
                    ? t("Abrindo…", "Opening…")
                    : billing.plan === "lifetime"
                      ? t("Ver pagamentos e faturas", "View payments and invoices")
                      : t("Gerenciar assinatura e faturas", "Manage subscription and invoices")}
                </button>
              )}
              {portalError && <ErrorText message={t("Não foi possível abrir o portal. Tente de novo.", "Couldn't open the portal. Please try again.")} />}
              {!premium && (
                <a href={`../upgrade/?lang=${lang}`} className={`${buttonBase} mt-5 bg-brand text-white hover:bg-brand-strong`}>
                  {t("Fazer upgrade para Premium", "Upgrade to Premium")}
                </a>
              )}
            </Card>

            <Card title={t("Excluir conta", "Delete account")} tone="danger">
              <p className="text-[16px] leading-7 text-ink-2">
                {t(
                  "Exclua para sempre a sua conta e tudo o que está salvo nela: o seu progresso e os dados do perfil. Isso não pode ser desfeito.",
                  "Permanently delete your account and everything saved with it: your progress and profile details. This cannot be undone.",
                )}
              </p>
              {renewing && (
                <p className="mt-3 text-[15px] font-medium leading-6 text-ink">
                  {t(
                    "Você tem uma assinatura ativa. Cancele-a antes em Assinatura → Gerenciar assinatura e faturas.",
                    "You have an active subscription. Cancel it first under Subscription → Manage subscription and invoices.",
                  )}
                </p>
              )}
              <button type="button" className={`${dangerOutline} mt-5`} onClick={() => setDialog("delete")} disabled={renewing}>
                {t("Excluir minha conta", "Delete my account")}
              </button>
            </Card>
          </>
        ) : (
          <>
            <Card title={t("Progresso nas aulas", "Lesson progress")}>
              <ProgressBar done={done} total={total} />
              <p className="mt-2 text-sm text-muted">{t("Aulas concluídas, cada uma nas 12 tonalidades.", "Lessons completed, each in all 12 keys.")}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a href={`../app/?lang=${lang}`} className={`${buttonBase} bg-brand text-white hover:bg-brand-strong`}>
                  {t("Ir para as aulas →", "Go to lessons →")}
                </a>
                <button type="button" className={outlineButton} onClick={() => setDialog("reset")} disabled={done === 0}>
                  {t("Zerar progresso", "Reset progress")}
                </button>
              </div>
              <p className="mt-2 text-sm text-muted">{t("Comece do zero e refaça todas as aulas.", "Start fresh and go through all lessons again.")}</p>
            </Card>

            <Card title={t("Metrônomo", "Metronome")}>
              <p className="mb-1 text-[15px] text-ink-2">
                {t(
                  "Andamentos iniciais (BPM). Uma aula já concluída reabre no andamento da sua última execução, que fica registrado na trilha.",
                  "Starting tempos (BPM). A lesson you have finished reopens at the tempo of your last run, which is recorded on the trail.",
                )}
              </p>
              <DefaultBpmPicker
                kind="exercise"
                label={t("Exercícios", "Exercises")}
                hint={t("Cada forma da aula, passo a passo.", "Each shape of the lesson, step by step.")}
              />
              <DefaultBpmPicker
                kind="sequence"
                label={t("Exercício final em sequência", "Final exercise in sequence")}
                hint={t(
                  "Todas as formas da aula tocadas em seguida, no fim. Use um andamento mais lento para tocar tudo sem parar.",
                  "All the lesson's shapes played in a row, at the end. Use a slower tempo to play it all without stopping.",
                )}
              />
            </Card>

            <Card title={t("Idioma", "Language")}>
              <p className="mb-4 text-[15px] text-ink-2">
                {t("Idioma das aulas e de todo o site.", "Language of the lessons and the whole site.")}
              </p>
              <LanguagePicker />
            </Card>
          </>
        )}

        {dialog === "reset" && (
          <ResetProgressDialog
            onClose={() => setDialog(null)}
            onDone={() => {
              setProgress({});
              setDialog(null);
              setNotice(t("Seu progresso foi zerado.", "Your progress has been reset."));
            }}
          />
        )}
        {dialog === "delete" && <DeleteAccountDialog onClose={() => setDialog(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <Header />
      <main className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-8 sm:py-14">{content}</main>
    </div>
  );
}
