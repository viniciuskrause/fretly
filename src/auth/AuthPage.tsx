import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { useI18n } from "../i18n.tsx";
import { siteUrl, supabase } from "./supabase.ts";

// Sign-up and log-in pages (signup/ and login/), modelled on the reference
// register/login pages: a profile form that saves progress, and a log-in that
// sends a link by e-mail by default, with password log-in and password reset.

export type AuthMode = "signup" | "login";

/** Log-in page views: e-mail link (default), password, reset request, new password (after a reset link). */
type LoginView = "link" | "password" | "reset" | "newPassword";

const MIN_PASSWORD = 8;

/** The homepage in the current language (en at the site root, pt in pt/). */
const homeHref = (lang: string) => (lang === "pt" ? "../pt/" : "../");

function useErrorMessage() {
  const { t } = useI18n();
  return (message: string) => {
    const text = message.toLowerCase();
    if (text.includes("invalid login credentials")) return t("E-mail ou senha incorretos.", "Wrong e-mail or password.");
    if (text.includes("already registered")) return t("Já existe uma conta com este e-mail. Entre na sua conta.", "There is already an account with this e-mail. Log in instead.");
    if (text.includes("signups not allowed") || text.includes("user not found"))
      return t("Não encontramos uma conta com este e-mail.", "We couldn't find an account with this e-mail.");
    if (text.includes("email not confirmed")) return t("Confirme seu e-mail pelo link que enviamos antes de entrar.", "Confirm your e-mail with the link we sent before logging in.");
    if (text.includes("rate limit") || text.includes("security purposes"))
      return t("Muitas tentativas. Espere um minuto e tente de novo.", "Too many attempts. Wait a minute and try again.");
    return t(`Algo deu errado: ${message}`, `Something went wrong: ${message}`);
  };
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-[16px] text-ink transition-colors hover:border-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-line"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ label, busy }: { label: string; busy: boolean }) {
  const { t } = useI18n();
  return (
    <button
      type="submit"
      disabled={busy}
      className="h-12 w-full rounded-control bg-accent text-[16px] font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? t("Aguarde…", "Please wait…") : label}
    </button>
  );
}

function ErrorText({ message }: { message: string | null }) {
  return (
    <p role="alert" className={`text-sm font-medium text-danger ${message ? "" : "hidden"}`}>
      {message}
    </p>
  );
}

function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">
      {children}
    </button>
  );
}

/** "Check your e-mail" notice, shown after a link was sent. */
function EmailNotice({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="email-notice-title"
      className="m-auto w-[min(92vw,440px)] rounded-card border border-line bg-surface p-6 text-ink backdrop:bg-ink/50 sm:p-8"
    >
      <h2 id="email-notice-title" className="font-display text-[24px] font-bold tracking-[-0.03em]">
        {t("Confira seu e-mail", "Check your e-mail")}
      </h2>
      <p className="mt-3 text-[16px] leading-7 text-ink-2">
        {t(
          "Acabamos de enviar um link para você. Se ele não chegar em alguns minutos, confira a caixa de spam.",
          "We just sent you a link. If you don't see it in a few minutes, check your spam folder.",
        )}
      </p>
      <form method="dialog" className="mt-6">
        <button className="h-11 w-full rounded-control bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-strong">
          {t("Fechar", "Close")}
        </button>
      </form>
    </dialog>
  );
}

function AuthHeader({ mode }: { mode: AuthMode }) {
  const { t, lang } = useI18n();
  return (
    <header className="border-b border-line bg-canvas">
      <nav className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:h-[88px] sm:px-8">
        <a href={homeHref(lang)} className="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[22px]">
          Guitar Workouts <span className="text-accent-ink">for Nerds</span>
        </a>
        <a
          href={mode === "signup" ? `../login/?lang=${lang}` : `../signup/?lang=${lang}`}
          className="flex h-11 shrink-0 items-center rounded-control border border-line-strong bg-surface px-4 text-[15px] font-semibold text-ink-2 transition-colors hover:border-subtle hover:text-ink"
        >
          {mode === "signup" ? t("Entrar", "Log in") : t("Criar conta", "Sign up")}
        </a>
      </nav>
    </header>
  );
}

function NotConfigured() {
  const { t } = useI18n();
  return (
    <p className="rounded-control border border-accent bg-accent-soft p-4 text-sm font-medium text-accent-ink">
      {t(
        "O login ainda não está configurado neste site. Volte em breve.",
        "Log-in is not set up on this site yet. Please check back soon.",
      )}
    </p>
  );
}

function SignupForm() {
  const { t, lang } = useI18n();
  const errorMessage = useErrorMessage();
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase())
      return setError(t("Os e-mails não são iguais.", "The e-mail addresses don't match."));
    if (password.length < MIN_PASSWORD)
      return setError(t(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`, `The password needs at least ${MIN_PASSWORD} characters.`));
    if (!supabase) return;
    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { first_name: firstName.trim(), username: username.trim(), language: lang },
        emailRedirectTo: siteUrl(`../app/?lang=${lang}`),
      },
    });
    setBusy(false);
    if (signUpError) return setError(errorMessage(signUpError.message));
    // E-mail confirmation off: the session starts right away.
    if (data.session) window.location.assign(siteUrl(`../app/?lang=${lang}`));
    else setSent(true);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {!supabase && <NotConfigured />}
      <Field label={t("Nome", "First name")} value={firstName} onChange={setFirstName} autoComplete="given-name" />
      {/* A display handle, not the log-in id (that is the e-mail): "nickname" keeps password
          managers off this field — "username" here made Brave crash while typing. */}
      <Field label={t("Nome de usuário", "Username")} value={username} onChange={setUsername} autoComplete="nickname" />
      <Field label={t("E-mail", "E-mail address")} type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field label={t("Confirme o e-mail", "Confirm e-mail address")} type="email" value={confirmEmail} onChange={setConfirmEmail} autoComplete="email" />
      <Field
        label={t("Senha", "Password")}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        hint={t(`Pelo menos ${MIN_PASSWORD} caracteres.`, `At least ${MIN_PASSWORD} characters.`)}
      />
      <ErrorText message={error} />
      <SubmitButton label={t("Criar conta grátis", "Create free account")} busy={busy} />
      {sent && <EmailNotice onClose={() => setSent(false)} />}
    </form>
  );
}

function LoginForm() {
  const { t, lang } = useI18n();
  const errorMessage = useErrorMessage();
  const [view, setView] = useState<LoginView>("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const appUrl = siteUrl(`../app/?lang=${lang}`);

  // Coming back from a password-reset e-mail: ask for the new password.
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView("newPassword");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function go(next: LoginView) {
    setError(null);
    setView(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!supabase) return;
    setBusy(true);
    let failure: { message: string } | null = null;
    if (view === "link") {
      ({ error: failure } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: appUrl, shouldCreateUser: false },
      }));
      if (!failure) setSent(true);
    } else if (view === "password") {
      ({ error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password }));
      if (!failure) window.location.assign(appUrl);
    } else if (view === "reset") {
      ({ error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: siteUrl(`../login/?lang=${lang}`),
      }));
      if (!failure) setSent(true);
    } else {
      if (password.length < MIN_PASSWORD) {
        setBusy(false);
        return setError(t(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`, `The password needs at least ${MIN_PASSWORD} characters.`));
      }
      ({ error: failure } = await supabase.auth.updateUser({ password }));
      if (!failure) setPasswordChanged(true);
    }
    setBusy(false);
    if (failure) setError(errorMessage(failure.message));
  }

  const heading = {
    link: t("Entrar", "Log in"),
    password: t("Entrar", "Log in"),
    reset: t("Redefinir senha", "Reset password"),
    newPassword: t("Nova senha", "New password"),
  }[view];

  if (passwordChanged) {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink">{heading}</h1>
        <p className="text-[16px] leading-7 text-ink-2">{t("Sua senha foi alterada.", "Your password has been changed.")}</p>
        <a href={appUrl} className="flex h-12 items-center justify-center rounded-control bg-brand text-[16px] font-semibold text-white hover:bg-brand-strong">
          {t("Continuar praticando", "Continue practicing")}
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[40px]">{heading}</h1>
      {(view === "link" || view === "password") && (
        <p className="mt-3 text-[16px] text-ink-2">
          {t("Ainda não tem conta?", "Don't have an account yet?")}{" "}
          <a href={`../signup/?lang=${lang}`} className="font-semibold text-brand-ink underline underline-offset-4">
            {t("Crie uma conta grátis!", "Create a free account!")}
          </a>
        </p>
      )}
      {view === "reset" && (
        <p className="mt-3 text-[16px] text-ink-2">
          {t("Enviaremos um link para você criar uma nova senha.", "We'll send you a link to set a new password.")}
        </p>
      )}
      <form onSubmit={submit} className="mt-8 space-y-5">
        {!supabase && <NotConfigured />}
        {view !== "newPassword" && (
          <Field label={t("E-mail", "E-mail address")} type="email" value={email} onChange={setEmail} autoComplete="email" />
        )}
        {(view === "password" || view === "newPassword") && (
          <Field
            label={view === "newPassword" ? t("Nova senha", "New password") : t("Senha", "Password")}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={view === "newPassword" ? "new-password" : "current-password"}
            minLength={view === "newPassword" ? MIN_PASSWORD : undefined}
          />
        )}
        <ErrorText message={error} />
        <SubmitButton
          busy={busy}
          label={
            {
              link: t("Receber link de acesso", "Get log-in link"),
              password: t("Entrar", "Log in"),
              reset: t("Redefinir senha", "Reset password"),
              newPassword: t("Salvar nova senha", "Save new password"),
            }[view]
          }
        />
        <div className="flex flex-wrap justify-between gap-3">
          {view === "link" && <TextButton onClick={() => go("password")}>{t("Entrar com senha", "Log in with password instead")}</TextButton>}
          {view === "password" && (
            <>
              <TextButton onClick={() => go("link")}>{t("Receber link por e-mail", "Get a log-in link instead")}</TextButton>
              <TextButton onClick={() => go("reset")}>{t("Esqueceu a senha?", "Forgot password?")}</TextButton>
            </>
          )}
          {view === "reset" && <TextButton onClick={() => go("password")}>{t("Voltar ao login", "Back to log in")}</TextButton>}
        </div>
      </form>
      {sent && <EmailNotice onClose={() => setSent(false)} />}
    </div>
  );
}

/** Side panel of the sign-up page: what the free account includes (facts from the app). */
function SignupPanel() {
  const { t } = useI18n();
  const items = [
    t("20 aulas e 240 exercícios com som e metrônomo", "20 lessons and 240 exercises with sound and a metronome"),
    t("O sistema CAGED e as inversões de tétrades", "The CAGED system and seventh-chord inversions"),
    t("As 12 tonalidades, no ciclo de quartas", "All 12 keys, in the cycle of fourths"),
    t("Dicionário com todas as digitações", "A chord dictionary with every fingering"),
  ];
  return (
    <aside className="rounded-card bg-brand p-8 text-white sm:p-10">
      <p className="font-display text-[24px] font-bold leading-tight tracking-[-0.03em]">
        {t("O que você pratica com a conta grátis", "What you practice with your free account")}
      </p>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-[16px] leading-6 text-brand-soft">
            <svg className="mt-0.5 size-5 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { t, lang } = useI18n();
  useEffect(() => {
    document.title =
      mode === "signup"
        ? t("Criar conta – Guitar Workouts for Nerds", "Sign up – Guitar Workouts for Nerds")
        : t("Entrar – Guitar Workouts for Nerds", "Log in – Guitar Workouts for Nerds");
  }, [mode, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <AuthHeader mode={mode} />
      {mode === "signup" ? (
        <main className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
          <div className="max-w-[520px]">
            <h1 className="text-balance font-display text-[34px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[44px]">
              {t("Domine os acordes no braço inteiro", "Master chords across the whole fretboard")}
            </h1>
            <p className="mt-4 font-display text-[19px] font-semibold text-ink">
              {t("Crie um perfil grátis para começar a praticar.", "Create a free profile to start practicing.")}
            </p>
            <p className="mt-3 text-[16px] leading-7 text-ink-2">
              {t(
                "Leva menos de um minuto. Depois de criar a conta, você vai direto para a primeira aula.",
                "It takes less than a minute. Once your account is created, you go straight to the first lesson.",
              )}
            </p>
            <div className="mt-8">
              <SignupForm />
            </div>
            <p className="mt-6 text-sm text-muted">
              {t("Já tem conta?", "Already have an account?")}{" "}
              <a href="../login/" className="font-semibold text-brand-ink underline underline-offset-4">
                {t("Entrar", "Log in")}
              </a>
            </p>
          </div>
          <div className="lg:pt-4">
            <SignupPanel />
          </div>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[460px] px-4 py-12 sm:py-20">
          <LoginForm />
        </main>
      )}
    </div>
  );
}
