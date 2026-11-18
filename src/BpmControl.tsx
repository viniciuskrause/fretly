import { useState } from "react";

import { Icon } from "./Icon.tsx";
import { useI18n } from "./i18n.tsx";
import { clampBpm, MAX_BPM, MIN_BPM } from "./defaultBpm.ts";

// Metronome tempo control: − / typed value / +. Used in the exercise footer and
// on the profile page (default tempo).

export function BpmControl({
  bpm,
  onChange,
  disabled,
}: {
  bpm: number;
  onChange: (update: (value: number) => number) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  // Text being typed; null while the field isn't being edited.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    if (Number.isFinite(value)) onChange(() => clampBpm(value));
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-2 rounded-control bg-surface p-1.5 border border-line" role="group" aria-label={t(`Andamento: ${bpm} BPM`, `Tempo: ${bpm} BPM`)}>
      <div className="flex items-center px-2 text-muted" title="BPM">
        <Icon name="metronome" className="size-5" />
      </div>
      <button
        onClick={() => onChange((value) => clampBpm(value - 4))}
        disabled={disabled}
        className="flex size-9 items-center justify-center rounded-lg bg-sunken font-mono text-base font-semibold text-ink-2 transition hover:bg-line hover:text-ink active:scale-95 disabled:opacity-40 disabled:hover:bg-sunken"
        aria-label={t("Diminuir BPM", "Decrease BPM")}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
        value={draft ?? String(bpm)}
        disabled={disabled}
        aria-label={t(`Andamento em BPM (${MIN_BPM} a ${MAX_BPM})`, `Tempo in BPM (${MIN_BPM} to ${MAX_BPM})`)}
        title={t(`Digite o andamento (${MIN_BPM}–${MAX_BPM} BPM)`, `Type the tempo (${MIN_BPM}–${MAX_BPM} BPM)`)}
        onFocus={(event) => {
          setDraft(String(bpm));
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          else if (event.key === "Escape") {
            setDraft(null);
            // Blur without committing: draft is already cleared.
            requestAnimationFrame(() => (event.target as HTMLInputElement).blur());
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const next = clampBpm(Number.parseInt(draft ?? String(bpm), 10) + (event.key === "ArrowUp" ? 1 : -1) || bpm);
            setDraft(String(next));
            onChange(() => next);
          }
        }}
        className="h-9 w-14 rounded-lg border-2 border-transparent bg-transparent text-center font-mono text-[15px] font-semibold tabular-nums text-ink outline-none transition hover:border-line focus:border-brand focus:bg-brand-soft disabled:opacity-60"
      />
      <button
        onClick={() => onChange((value) => clampBpm(value + 4))}
        disabled={disabled}
        className="flex size-9 items-center justify-center rounded-lg bg-sunken font-mono text-base font-semibold text-ink-2 transition hover:bg-line hover:text-ink active:scale-95 disabled:opacity-40 disabled:hover:bg-sunken"
        aria-label={t("Aumentar BPM", "Increase BPM")}
      >
        +
      </button>
    </div>
  );
}
