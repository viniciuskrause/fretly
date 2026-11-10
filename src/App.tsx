import { useEffect, useRef, useState, type ReactNode } from "react";

type Lesson = {
  id: number;
  title: string;
  exerciseTitle: string;
  subtitle: string;
  type: "theory" | "chord" | "practice" | "review";
  status: "done" | "current" | "locked";
  steps: ChordStep[];
};

type ChordStep = {
  chord: string;
  shape: "C" | "A" | "G" | "E" | "D";
  fret: number;
  instruction: string;
};

const lessons: Lesson[] = [
  {
    id: 1,
    title: "Primeira posição",
    exerciseTitle: "Acordes na posição 1",
    subtitle: "As cinco formas abertas",
    type: "chord",
    status: "done",
    steps: [
      {
        chord: "C",
        shape: "C",
        fret: 0,
        instruction: "Monte a forma de C e toque corda por corda.",
      },
      {
        chord: "A",
        shape: "A",
        fret: 0,
        instruction: "Mantenha os três dedos próximos ao traste.",
      },
      { chord: "G", shape: "G", fret: 0, instruction: "Deixe todas as cordas soarem com clareza." },
      { chord: "E", shape: "E", fret: 0, instruction: "Relaxe o polegar atrás do braço." },
      { chord: "D", shape: "D", fret: 0, instruction: "Toque somente as quatro cordas agudas." },
    ],
  },
  {
    id: 3,
    title: "Segunda posição",
    exerciseTitle: "Acordes na posição 2",
    subtitle: "Conecte C com a forma de A",
    type: "chord",
    status: "current",
    steps: [
      { chord: "C", shape: "A", fret: 3, instruction: "Encontre C usando a forma móvel de A." },
      {
        chord: "A",
        shape: "G",
        fret: 2,
        instruction: "Visualize a forma de G sem mover a tônica.",
      },
      { chord: "G", shape: "E", fret: 3, instruction: "Faça a pestana completa na terceira casa." },
      { chord: "E", shape: "D", fret: 2, instruction: "Ataque apenas as quatro primeiras cordas." },
      { chord: "D", shape: "C", fret: 2, instruction: "Feche o ciclo voltando à forma de C." },
    ],
  },
  {
    id: 4,
    title: "Terceira posição",
    exerciseTitle: "Acordes na posição 3",
    subtitle: "Avance pelo braço",
    type: "chord",
    status: "locked",
    steps: [
      { chord: "C", shape: "G", fret: 5, instruction: "Veja a forma de G dentro desta região." },
      { chord: "A", shape: "E", fret: 5, instruction: "Apoie o indicador em uma pestana firme." },
      {
        chord: "G",
        shape: "D",
        fret: 5,
        instruction: "Mantenha a tônica da segunda corda evidente.",
      },
      { chord: "E", shape: "C", fret: 4, instruction: "Conecte a forma de C ao desenho anterior." },
      { chord: "D", shape: "A", fret: 5, instruction: "Feche a sequência com a forma de A." },
    ],
  },
  {
    id: 5,
    title: "Quarta posição",
    exerciseTitle: "Acordes na posição 4",
    subtitle: "Reconheça formas agudas",
    type: "chord",
    status: "locked",
    steps: [
      {
        chord: "C",
        shape: "E",
        fret: 8,
        instruction: "Encontre C na oitava casa com a forma de E.",
      },
      {
        chord: "A",
        shape: "D",
        fret: 7,
        instruction: "Toque a forma de D nas quatro cordas agudas.",
      },
      { chord: "G", shape: "C", fret: 7, instruction: "Observe a tônica na quinta corda." },
      { chord: "E", shape: "A", fret: 7, instruction: "Comprima a forma de A sem tensão." },
      { chord: "D", shape: "G", fret: 7, instruction: "Visualize a forma inteira antes de tocar." },
    ],
  },
  {
    id: 6,
    title: "Quinta posição",
    exerciseTitle: "Acordes na posição 5",
    subtitle: "Complete o mapa CAGED",
    type: "chord",
    status: "locked",
    steps: [
      {
        chord: "C",
        shape: "D",
        fret: 10,
        instruction: "Complete C com a forma de D na região aguda.",
      },
      {
        chord: "A",
        shape: "C",
        fret: 9,
        instruction: "Mantenha a visualização mesmo sem tocar graves.",
      },
      { chord: "G", shape: "A", fret: 10, instruction: "Use uma mini pestana para a forma de A." },
      { chord: "E", shape: "G", fret: 9, instruction: "Reconheça o contorno da forma de G." },
      { chord: "D", shape: "E", fret: 10, instruction: "Conclua o mapa com a forma de E." },
    ],
  },
  {
    id: 7,
    title: "Ciclo das quartas",
    exerciseTitle: "Acordes no ciclo das quartas",
    subtitle: "Aplique CAGED em 12 tons",
    type: "review",
    status: "locked",
    steps: [
      { chord: "C", shape: "C", fret: 0, instruction: "Comece em C e escute a resolução." },
      { chord: "F", shape: "E", fret: 1, instruction: "Avance uma quarta até F." },
      { chord: "B♭", shape: "A", fret: 1, instruction: "Mantenha o pulso ao chegar em B♭." },
      {
        chord: "E♭",
        shape: "D",
        fret: 1,
        instruction: "Conecte a próxima região sem interromper.",
      },
      { chord: "A♭", shape: "G", fret: 1, instruction: "Antecipe a próxima forma antes da troca." },
      { chord: "D♭", shape: "C", fret: 1, instruction: "Siga o ciclo com movimento mínimo." },
      { chord: "G♭", shape: "E", fret: 2, instruction: "Mantenha todas as vozes equilibradas." },
      { chord: "B", shape: "A", fret: 2, instruction: "Continue o pulso e respire entre ataques." },
      { chord: "E", shape: "E", fret: 0, instruction: "Volte a uma forma aberta sem acelerar." },
      { chord: "A", shape: "A", fret: 0, instruction: "Prepare a penúltima troca do ciclo." },
      { chord: "D", shape: "D", fret: 0, instruction: "Toque D com articulação clara." },
      { chord: "G", shape: "G", fret: 0, instruction: "Finalize em G e retorne para C." },
    ],
  },
];

function Icon({
  name,
  className = "size-5",
}: {
  name:
    | "home"
    | "path"
    | "practice"
    | "profile"
    | "fire"
    | "book"
    | "play"
    | "check"
    | "lock"
    | "headphones"
    | "heart"
    | "target"
    | "close"
    | "back"
    | "replay"
    | "metronome";
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
    book: (
      <>
        <path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3Z" />
        <path d="M4 5v17M8 6h8M8 10h6" />
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

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-11 rotate-[-5deg] items-center justify-center rounded-[14px] bg-[#ff6b45] text-white shadow-[0_4px_0_#c94225]">
        <Icon name="practice" className="size-6" />
      </div>
      <div>
        <p className="text-[20px] font-bold leading-none tracking-[-0.04em] text-[#182b2a]">
          Fretly
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#80918d]">
          guitar lab
        </p>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-[#e3e9e5]/90 bg-[#f7f8f3]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[720px] items-center justify-between px-5 sm:px-8">
        <Brand />
        <button
          className="flex size-9 items-center justify-center rounded-full bg-[#efe4d0] text-xs font-black text-[#705538] ring-2 ring-white shadow-sm"
          aria-label="Abrir perfil"
        >
          RL
        </button>
      </div>
    </header>
  );
}

function LessonIcon({ lesson }: { lesson: Lesson }) {
  if (lesson.status === "done") return <Icon name="check" className="size-8" />;
  if (lesson.status === "locked") return <Icon name="lock" className="size-6" />;
  if (lesson.type === "chord")
    return <span className="text-2xl font-black">{lesson.steps[0].shape}</span>;
  if (lesson.type === "review") return <Icon name="target" className="size-7" />;
  return <Icon name="play" className="size-7 fill-current" />;
}

function PathNode({
  lesson,
  pathIndex,
  onSelect,
}: {
  lesson: Lesson;
  pathIndex: number;
  onSelect: (lesson: Lesson) => void;
}) {
  return (
    <div className={`path-row path-row-${(pathIndex + 1) % 3}`}>
      <div className="relative flex flex-col items-center">
        {lesson.status === "current" && (
          <div className="mb-3 animate-[float_3s_ease-in-out_infinite] rounded-xl bg-[#183e39] px-4 py-2 text-[11px] font-black tracking-[0.08em] text-white shadow-md after:absolute after:bottom-[-5px] after:left-1/2 after:size-3 after:-translate-x-1/2 after:rotate-45 after:bg-[#183e39]">
            CONTINUE AQUI
          </div>
        )}
        <button
          className={`lesson-node lesson-node--${lesson.status}`}
          onClick={() => onSelect(lesson)}
          aria-label={`${lesson.title}: ${lesson.subtitle}`}
        >
          <LessonIcon lesson={lesson} />
        </button>
        <div className="mt-3 max-w-[190px] text-center">
          <p
            className={`text-sm font-black ${lesson.status === "locked" ? "text-[#96a29f]" : "text-[#243633]"}`}
          >
            {lesson.title}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#91a09c]">
            {lesson.steps.length} etapas
          </p>
        </div>
      </div>
    </div>
  );
}

function PathSection({ onSelect }: { onSelect: (lesson: Lesson) => void }) {
  return (
    <section>
      <div className="overflow-hidden rounded-[26px] bg-[#157b67] text-white shadow-[0_7px_0_#0d5b4b]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ee9d1]">
              Unidade 1
            </p>
            <h2 className="mt-2 text-[25px] font-black tracking-[-0.03em]">
              CAGED: conecte o braço inteiro
            </h2>
            <p className="mt-1 text-sm text-white/75">Fundamentos • 6 exercícios</p>
          </div>
          <button
            onClick={() =>
              onSelect(lessons.find((lesson) => lesson.status === "current") ?? lessons[0])
            }
            className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white px-5 py-3 text-xs font-black text-[#126a59] shadow-[0_4px_0_#b5d9ce] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_#b5d9ce] active:translate-y-1 active:shadow-none"
          >
            <Icon name="book" className="size-4" /> GUIA
          </button>
        </div>
        <div className="h-1.5 bg-[#0b6654]">
          <div className="h-full w-[38%] rounded-r-full bg-[#75e0bd]" />
        </div>
      </div>

      <div className="relative mx-auto mt-4 min-h-[940px] max-w-[560px] py-8">
        <svg
          className="pointer-events-none absolute left-1/2 top-[93px] h-[770px] w-[310px] -translate-x-1/2 overflow-visible"
          viewBox="0 0 310 770"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M155 0C155 80 55 78 55 154s200 78 200 154S55 386 55 462s200 78 200 154S155 692 155 770"
            stroke="#d8e0dc"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="4 18"
          />
        </svg>
        <div className="relative space-y-7">
          {lessons.map((lesson, index) => (
            <PathNode key={lesson.id} lesson={lesson} pathIndex={index} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}

const shapeFingerings: Record<ChordStep["shape"], Array<[number, number]>> = {
  C: [
    [1, 1],
    [2, 3],
    [3, 4],
  ],
  A: [
    [2, 1],
    [2, 2],
    [2, 3],
  ],
  G: [
    [3, 0],
    [2, 4],
    [3, 5],
  ],
  E: [
    [1, 2],
    [2, 3],
    [2, 4],
  ],
  D: [
    [2, 0],
    [3, 1],
    [2, 2],
  ],
};

const shapeOpenStrings: Record<ChordStep["shape"], number[]> = {
  C: [0, 2],
  A: [0, 4],
  G: [1, 2, 3],
  E: [0, 1, 5],
  D: [3],
};

const stringFrequencies = [329.63, 246.94, 196, 146.83, 110, 82.41];

function ChordDiagram({
  step,
  activeNoteIndexes,
  activeOpenStrings,
  showPulse = true,
}: {
  step: ChordStep;
  activeNoteIndexes: number[];
  activeOpenStrings: number[];
  showPulse?: boolean;
}) {
  const hasBarre = step.fret > 0 && (step.shape === "A" || step.shape === "E");
  const fingerings = shapeFingerings[step.shape];
  return (
    <svg
      width="300"
      height="250"
      viewBox="0 0 300 250"
      fill="none"
      className="block max-w-full"
      aria-label={`Diagrama de ${step.chord} usando a forma de ${step.shape}`}
      role="img"
    >
      <rect x="28" y="18" width="244" height="206" rx="16" fill="#FCFDF9" />
      {[0, 1, 2, 3, 4, 5].map((string) => {
        const isActive =
          activeNoteIndexes.some((index) => fingerings[index]?.[1] === string) ||
          activeOpenStrings.includes(string);
        return (
          <g key={`string-${string}`}>
            <line
              x1="56"
              y1={48 + string * 29}
              x2="258"
              y2={48 + string * 29}
              stroke={isActive ? "#FF6B45" : "#85938F"}
              strokeWidth={isActive ? 4 : string === 0 ? 1.3 : 1}
              className="transition-all duration-150"
            />
            {activeOpenStrings.includes(string) && (
              <circle
                cx="42"
                cy={48 + string * 29}
                r="7"
                fill="none"
                stroke="#FF6B45"
                strokeWidth="3"
              />
            )}
          </g>
        );
      })}
      {[0, 1, 2, 3, 4, 5].map((fret) => (
        <line
          key={`fret-${fret}`}
          x1={56 + fret * 40.4}
          y1="48"
          x2={56 + fret * 40.4}
          y2="193"
          stroke="#64736F"
          strokeWidth={fret === 0 && step.fret === 0 ? 6 : 1.4}
        />
      ))}
      {hasBarre && (
        <line
          x1="76"
          y1="51"
          x2="76"
          y2="190"
          stroke="#183E39"
          strokeWidth="13"
          strokeLinecap="round"
        />
      )}
      {fingerings.map(([fret, string], index) => {
        const isActive = activeNoteIndexes.includes(index);
        return (
          <g key={`${fret}-${string}-${index}`}>
            {isActive && showPulse && (
              <circle
                cx={76 + fret * 40}
                cy={48 + string * 29}
                r="19"
                fill="#FF6B45"
                opacity="0.18"
                className="animate-ping"
              />
            )}
            <circle
              cx={76 + fret * 40}
              cy={48 + string * 29}
              r={isActive ? 13 : 10}
              fill={isActive ? "#FF6B45" : "#183E39"}
              className="transition-all duration-150"
            />
            <text
              x={76 + fret * 40}
              y={52 + string * 29}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="white"
            >
              {index + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ExercisePage({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [bpm, setBpm] = useState(72);
  const [playbackStatus, setPlaybackStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [activeNoteIndexes, setActiveNoteIndexes] = useState<number[]>([]);
  const [activeOpenStrings, setActiveOpenStrings] = useState<number[]>([]);
  const [finalExercise, setFinalExercise] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [sequenceStatus, setSequenceStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [complete, setComplete] = useState(false);
  const timeoutIds = useRef<number[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const step = lesson.steps[stepIndex];
  const progress = complete || finalExercise ? 100 : ((stepIndex + 1) / lesson.steps.length) * 100;

  function clearPlayback() {
    timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIds.current = [];
  }

  useEffect(() => {
    return () => {
      clearPlayback();
      if (audioContext.current) void audioContext.current.close();
    };
  }, []);

  function getAudioContext() {
    if (!audioContext.current) audioContext.current = new AudioContext();
    return audioContext.current;
  }

  // Wait until audio output is actually running before scheduling notes, so the
  // first note of a sequence (the 6th string on G and E shapes) is not swallowed.
  async function prepareAudio() {
    const isNew = !audioContext.current;
    const context = getAudioContext();
    if (context.state !== "running") await context.resume();
    if (isNew) await new Promise((resolve) => window.setTimeout(resolve, 150));
  }

  // Plucked-string synthesis (Karplus–Strong). Unlike a plain triangle wave, it has
  // strong upper harmonics, so low notes such as G2 (98 Hz) stay audible on laptop
  // and phone speakers that can't reproduce the fundamental.
  function playGuitarTone(frequency: number, volume = 0.16) {
    const context = getAudioContext();
    const now = context.currentTime;
    const { sampleRate } = context;
    const duration = 1.4;
    const buffer = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    // The two-point average adds half a sample of delay per loop.
    const period = Math.max(2, Math.round(sampleRate / frequency - 0.5));
    for (let i = 0; i < period; i++) data[i] = Math.random() * 2 - 1;
    for (let i = period; i < data.length; i++) {
      const previous = i - period - 1 >= 0 ? data[i - period - 1] : 0;
      data[i] = 0.996 * 0.5 * (data[i - period] + previous);
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    const output = context.createGain();
    output.gain.setValueAtTime(volume * 1.4, now);
    output.gain.setTargetAtTime(0, now + 1.0, 0.1);
    source.connect(output);
    output.connect(context.destination);
    source.start(now);
    source.stop(now + duration);
  }

  function playNote(chordStep: ChordStep, noteIndex: number, volume?: number) {
    const [relativeFret, string] = shapeFingerings[chordStep.shape][noteIndex];
    const frequency = stringFrequencies[string] * 2 ** ((chordStep.fret + relativeFret) / 12);
    playGuitarTone(frequency, volume);
  }

  // "Open" strings of a shape sound at the shape's base fret (nut or barre).
  function playOpenString(chordStep: ChordStep, string: number, volume?: number) {
    playGuitarTone(stringFrequencies[string] * 2 ** (chordStep.fret / 12), volume);
  }

  function playFullChord(chordStep: ChordStep) {
    shapeFingerings[chordStep.shape].forEach((_, noteIndex) => {
      playNote(chordStep, noteIndex, 0.075);
    });
    shapeOpenStrings[chordStep.shape].forEach((string) => {
      playOpenString(chordStep, string, 0.065);
    });
  }

  async function startPlayback() {
    clearPlayback();
    setPlaybackStatus("playing");
    setActiveNoteIndexes([]);
    setActiveOpenStrings([]);
    await prepareAudio();

    const beatDuration = 60000 / bpm;
    const fingerings = shapeFingerings[step.shape];
    // Every sounding string, fretted or open, from the 6th string up to the 1st.
    const bottomToTop = [
      ...fingerings.map(([, string], noteIndex) => ({ string, noteIndex })),
      ...shapeOpenStrings[step.shape].map((string) => ({ string, noteIndex: null })),
    ].sort((a, b) => b.string - a.string);

    bottomToTop.forEach(({ string, noteIndex }, sequenceIndex) => {
      const timeoutId = window.setTimeout(() => {
        if (noteIndex === null) {
          setActiveNoteIndexes([]);
          setActiveOpenStrings([string]);
          playOpenString(step, string);
        } else {
          setActiveOpenStrings([]);
          setActiveNoteIndexes([noteIndex]);
          playNote(step, noteIndex);
        }
      }, sequenceIndex * beatDuration);
      timeoutIds.current.push(timeoutId);
    });

    const chordTimeout = window.setTimeout(() => {
      setActiveNoteIndexes(fingerings.map((_, noteIndex) => noteIndex));
      setActiveOpenStrings(shapeOpenStrings[step.shape]);
      playFullChord(step);
    }, bottomToTop.length * beatDuration);
    timeoutIds.current.push(chordTimeout);

    const finishTimeout = window.setTimeout(
      () => setPlaybackStatus("finished"),
      (bottomToTop.length + 1) * beatDuration,
    );
    timeoutIds.current.push(finishTimeout);
  }

  function resetPlayback() {
    clearPlayback();
    setPlaybackStatus("idle");
    setActiveNoteIndexes([]);
    setActiveOpenStrings([]);
  }

  function nextStep() {
    resetPlayback();
    if (stepIndex === lesson.steps.length - 1) {
      setFinalExercise(true);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  function resetSequence() {
    clearPlayback();
    setSequenceIndex(0);
    setSequenceStatus("idle");
  }

  async function startChordSequence() {
    clearPlayback();
    setSequenceIndex(0);
    setSequenceStatus("playing");
    await prepareAudio();

    const beatDuration = 60000 / bpm;
    lesson.steps.forEach((chordStep, index) => {
      const timeoutId = window.setTimeout(() => {
        setSequenceIndex(index);
        playFullChord(chordStep);
      }, index * beatDuration);
      timeoutIds.current.push(timeoutId);
    });

    const finishTimeout = window.setTimeout(() => {
      setSequenceStatus("finished");
    }, lesson.steps.length * beatDuration);
    timeoutIds.current.push(finishTimeout);
  }

  if (complete) {
    return (
      <div className="min-h-screen bg-[#f7f8f3]">
        <TopBar />
        <div className="mx-auto w-full max-w-[560px] px-5 py-16 text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#4fbf9d] text-white shadow-[0_9px_0_#2f8d72]">
            <Icon name="check" className="size-12" />
          </div>
          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-[#e75e3a]">
            Exercício concluído
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#18302d]">
            {lesson.exerciseTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#71817d]">
            Você percorreu todas as formas desta etapa. Faça a revisão todos os dias para manter a
            forma dos exercícios que você já aprendeu.
          </p>
          <div className="mx-auto mt-8 max-w-sm">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#e0e7e3]">
              <p className="text-2xl font-black text-[#ef6a44]">{lesson.steps.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#8b9995]">
                Formas tocadas
              </p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="mt-8 w-full max-w-sm rounded-2xl bg-[#157b67] py-4 text-sm font-black text-white shadow-[0_5px_0_#0b5b4b] transition active:translate-y-1 active:shadow-none"
          >
            VOLTAR À TRILHA
          </button>
        </div>
      </div>
    );
  }

  if (finalExercise) {
    return (
      <div className="min-h-screen bg-[#f7f8f3] text-[#203330]">
        <TopBar />
        <main className="mx-auto max-w-[720px] px-4 py-7 sm:px-8 lg:py-10">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={onExit}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#657570] transition hover:bg-[#edf2ef]"
              aria-label="Voltar à trilha"
            >
              <Icon name="close" className="size-6" />
            </button>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#dfe6e2]">
              <div className="h-full w-full rounded-full bg-[#4fbf9d]" />
            </div>
          </div>

          <div className="mb-5">
            <h1 className="text-2xl font-black tracking-[-0.035em]">{lesson.exerciseTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-[#788884]">
              {lesson.subtitle}. Complete as formas na ordem para memorizar a região.
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-[#dfe7e3] bg-white shadow-[0_6px_0_rgba(24,62,57,0.06)]">
            <div className="border-b border-[#e8edea] px-6 py-4">
              <p className="text-sm font-bold text-[#758580]">Sequência completa</p>
            </div>

            <div className="relative min-h-[460px] overflow-hidden px-5 py-8">
              {lesson.steps.map((chordStep, index) => {
                const offset = index - sequenceIndex;
                const isCurrent = offset === 0;
                const cardPosition =
                  offset < -1
                    ? "past-hidden"
                    : offset === -1
                      ? "played"
                      : isCurrent
                        ? sequenceStatus === "finished"
                          ? "complete"
                          : "current"
                        : offset === 1
                          ? "next"
                          : "future-hidden";
                const isSounding = isCurrent && sequenceStatus === "playing";
                const allNotes = shapeFingerings[chordStep.shape].map((_, noteIndex) => noteIndex);

                return (
                  <div
                    key={`${chordStep.chord}-${index}`}
                    className={`sequence-chord-card sequence-chord-card--${cardPosition} ${
                      isSounding ? "sequence-chord-card--sounding" : ""
                    }`}
                    style={{
                      transitionDuration: `${Math.min((60000 / bpm) * 0.58, 760)}ms`,
                    }}
                  >
                    <p className="text-5xl font-black tracking-[-0.055em] text-[#183e39]">
                      {chordStep.chord}
                    </p>
                    <ChordDiagram
                      step={chordStep}
                      activeNoteIndexes={isSounding ? allNotes : []}
                      activeOpenStrings={isSounding ? shapeOpenStrings[chordStep.shape] : []}
                      showPulse={false}
                    />
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#e8edea] bg-[#fbfcf9] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-2 ring-1 ring-[#e0e7e3] sm:justify-start">
                  <div className="flex items-center gap-2 px-2 text-[#61736e]">
                    <Icon name="metronome" className="size-5" />
                    <span className="text-xs font-black">BPM</span>
                  </div>
                  <button
                    onClick={() => setBpm((value) => Math.max(40, value - 4))}
                    disabled={sequenceStatus === "playing"}
                    className="flex size-8 items-center justify-center rounded-lg bg-[#edf2ef] font-black text-[#52645f] disabled:opacity-40"
                    aria-label="Diminuir BPM"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-black text-[#183e39]">{bpm}</span>
                  <button
                    onClick={() => setBpm((value) => Math.min(180, value + 4))}
                    disabled={sequenceStatus === "playing"}
                    className="flex size-8 items-center justify-center rounded-lg bg-[#edf2ef] font-black text-[#52645f] disabled:opacity-40"
                    aria-label="Aumentar BPM"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      resetSequence();
                      setFinalExercise(false);
                    }}
                    disabled={sequenceStatus === "playing"}
                    className="flex size-12 items-center justify-center rounded-2xl border-2 border-[#dce5e1] text-[#60716c] disabled:opacity-30"
                    aria-label="Voltar aos acordes"
                  >
                    <Icon name="back" className="size-5" />
                  </button>
                  {sequenceStatus === "finished" ? (
                    <>
                      <button
                        onClick={startChordSequence}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#dce5e1] bg-white px-5 py-3.5 text-sm font-black text-[#52645f] sm:flex-none"
                      >
                        <Icon name="replay" className="size-4" /> REPLAY
                      </button>
                      <button
                        onClick={() => setComplete(true)}
                        className="flex flex-1 items-center justify-center rounded-2xl bg-[#157b67] px-6 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#0b5b4b] transition active:translate-y-1 active:shadow-none sm:flex-none"
                      >
                        CONCLUIR
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startChordSequence}
                      disabled={sequenceStatus === "playing"}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ff6b45] px-8 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#ca4728] transition active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-75 sm:flex-none"
                    >
                      <Icon name="play" className="size-5 fill-current" />
                      {sequenceStatus === "playing" ? "TOCANDO" : "INICIAR"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-[#203330]">
      <TopBar />

      <main className="mx-auto max-w-[720px] px-4 py-7 sm:px-8 lg:py-10">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#657570] transition hover:bg-[#edf2ef]"
            aria-label="Voltar à trilha"
          >
            <Icon name="close" className="size-6" />
          </button>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#dfe6e2]">
            <div
              className="h-full rounded-full bg-[#4fbf9d] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <section>
          <div className="mb-5">
            <h1 className="text-2xl font-black tracking-[-0.035em]">{lesson.exerciseTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-[#788884]">
              {lesson.subtitle}. Complete as formas na ordem para memorizar a região.
            </p>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-[#dfe7e3] bg-white shadow-[0_6px_0_rgba(24,62,57,0.06)]">
            <div className="border-b border-[#e8edea] px-6 py-4">
              <p className="mt-1 text-sm font-bold text-[#758580]">
                Forma de {step.shape} • {step.fret === 0 ? "posição 1" : `${step.fret}ª casa`}
              </p>
            </div>

            <div className="flex min-h-[390px] flex-col items-center justify-center px-5 py-8 sm:px-10">
              <p className="text-6xl font-black tracking-[-0.055em] text-[#183e39]">{step.chord}</p>
              <div className="mt-5 rounded-[24px] bg-[#fcfdf9] p-3 ring-1 ring-[#e6ebe8]">
                <ChordDiagram
                  step={step}
                  activeNoteIndexes={activeNoteIndexes}
                  activeOpenStrings={activeOpenStrings}
                />
              </div>
              <p className="mt-6 max-w-md text-center text-base font-bold leading-6 text-[#536560]">
                Monte a forma de {step.chord} e toque corda por corda.
              </p>
            </div>

            <div className="border-t border-[#e8edea] bg-[#fbfcf9] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-2 ring-1 ring-[#e0e7e3] sm:justify-start">
                  <div className="flex items-center gap-2 px-2 text-[#61736e]">
                    <Icon name="metronome" className="size-5" />
                    <span className="text-xs font-black">BPM</span>
                  </div>
                  <button
                    onClick={() => setBpm((value) => Math.max(40, value - 4))}
                    disabled={playbackStatus === "playing"}
                    className="flex size-8 items-center justify-center rounded-lg bg-[#edf2ef] font-black text-[#52645f]"
                    aria-label="Diminuir BPM"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-black text-[#183e39]">{bpm}</span>
                  <button
                    onClick={() => setBpm((value) => Math.min(180, value + 4))}
                    disabled={playbackStatus === "playing"}
                    className="flex size-8 items-center justify-center rounded-lg bg-[#edf2ef] font-black text-[#52645f]"
                    aria-label="Aumentar BPM"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      resetPlayback();
                      setStepIndex((current) => Math.max(0, current - 1));
                    }}
                    disabled={stepIndex === 0 || playbackStatus === "playing"}
                    className="flex size-12 items-center justify-center rounded-2xl border-2 border-[#dce5e1] text-[#60716c] disabled:opacity-30"
                    aria-label="Passo anterior"
                  >
                    <Icon name="back" className="size-5" />
                  </button>
                  {playbackStatus === "finished" ? (
                    <>
                      <button
                        onClick={startPlayback}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#dce5e1] bg-white px-5 py-3.5 text-sm font-black text-[#52645f] transition active:translate-y-0.5 sm:flex-none"
                      >
                        <Icon name="replay" className="size-4" /> REPLAY
                      </button>
                      <button
                        onClick={nextStep}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#157b67] px-7 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#0b5b4b] transition active:translate-y-1 active:shadow-none sm:flex-none"
                      >
                        {stepIndex === lesson.steps.length - 1 ? "EXERCÍCIO FINAL" : "PRÓXIMO"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startPlayback}
                      disabled={playbackStatus === "playing"}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ff6b45] px-8 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#ca4728] transition active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-75 sm:flex-none"
                    >
                      <Icon name="play" className="size-5 fill-current" />
                      {playbackStatus === "playing" ? "TOCANDO" : "TOCAR"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  if (selectedLesson) {
    return (
      <ExercisePage
        key={selectedLesson.id}
        lesson={selectedLesson}
        onExit={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-[#203330]">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
        <div className="mb-8">
          <p className="text-sm font-bold text-[#71817d]">Bom dia, Rafa</p>
          <h1 className="mt-1 text-[34px] font-black leading-tight tracking-[-0.045em] text-[#18302d] sm:text-[40px]">
            Continue no seu ritmo.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#788984]">
            Cada forma nova deixa o braço da guitarra um pouco menor.
          </p>
        </div>
        <PathSection onSelect={setSelectedLesson} />
      </main>
    </div>
  );
}
