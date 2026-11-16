import type { ReactNode } from "react";

/** Line icons (24×24, stroke = currentColor) shared by the app, the auth pages and the homepage menu. */
export function Icon({
  name,
  className = "size-5",
}: {
  name:
    | "home"
    | "path"
    | "practice"
    | "profile"
    | "fire"
    | "notebook"
    | "dictionary"
    | "play"
    | "check"
    | "lock"
    | "headphones"
    | "heart"
    | "target"
    | "close"
    | "back"
    | "replay"
    | "metronome"
    | "chevron"
    | "trophy";
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    path: (
      <>
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18c6 0 2-12 8-12" />
      </>
    ),
    practice: (
      <>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    fire: (
      <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-1 4-3 5 0-4-2-7-2-7-3 4-4 7-4 10 0 5 3 8 7 8Z" />
    ),
    notebook: (
      <>
        <rect x="6" y="3" width="14" height="18" rx="2" />
        <path d="M3.5 7.5h5M3.5 12h5M3.5 16.5h5M11.5 8h5M11.5 12h5M11.5 16h3" />
      </>
    ),
    dictionary: (
      <>
        <path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5Z" />
        <path d="M12 6.5V20" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    headphones: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h3v6H5a1 1 0 0 1-1-1Zm16 0h-3v6h2a1 1 0 0 0 1-1Z" />
      </>
    ),
    heart: (
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="m15 9 6-6M17 3h4v4" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    back: (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h10" />
      </>
    ),
    replay: (
      <>
        <path d="M20 12a8 8 0 1 1-2.3-5.7L20 9" />
        <path d="M20 4v5h-5" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v6a4 4 0 0 1-8 0Z" />
        <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    metronome: (
      <>
        <path d="M8 3h8l4 18H4Z" />
        <path d="m12 16 3-9M8 17h8" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export type IconName = Parameters<typeof Icon>[0]["name"];
