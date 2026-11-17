// Content of the marketing homepage, in both languages (Fretly is bilingual:
// every text exists in pt and en). Rendered to static HTML by build.mjs so
// search engines read it without running JavaScript.
//
// Numbers come from src/lessons.ts (see build.mjs); keep claims factual —
// no invented stats, testimonials or partner logos.

export const SITE_URL = "https://viniciuskrause.github.io/fretly/";
export const BRAND = "Guitar Workouts for Nerds";

export const content = {
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    path: "",
    // ≤ 60 characters before the brand (what search results show); descriptions ≤ 160.
    title: "Guitar Practice: Chords, Scales & Arpeggios in 12 Keys | Guitar Workouts for Nerds",
    description:
      "Free guitar practice in your browser: chords, inversions, scales and arpeggios in all 12 keys, with sound, metronome and tab. Free yourself on the fretboard.",
    nav: { cta: "Start practicing for free", login: "Log in", continue: "Continue practicing", account: "Open the app" },
    hero: {
      h1: "Guitar practice to break free from shapes and keys",
      sub: "A complete, hands-on practice path for the whole fretboard: chords, inversions, scales and arpeggios in all 12 keys, with sound and a metronome. Level up so you can play, compose and arrange — and find the sound you are after on your own.",
      cta: "Start practicing for free",
      ctaNote: "Free, no credit card",
      checklist: [
        "Chords with the CAGED system, all over the neck",
        "Triad and seventh-chord inversions",
        "The major scale in 7 positions",
        "Triad and seventh-chord arpeggios",
        "Diatonic chords of every key, up and across the neck",
        "All 12 keys, in the cycle of fourths",
      ],
      stats: (n) => [
        [`${n.lessons}`, "lessons"],
        [`${n.exercises}`, "exercises"],
        [`${n.fingerings}+`, "chord fingerings"],
        ["12", "keys"],
      ],
      statsLabel: "In numbers",
      ringLabel: "A lesson with its 12 keys: done keys in blue, the next one in orange",
    },
    story: {
      h2: "Stuck in the same shapes and keys?",
      paragraphs: [
        "Most guitarists learn a few open chords, a couple of barre shapes and one scale box — and then stay there. The songs they play, write and arrange end up sounding the same, because their hands always go back to the same spots on the neck and the same few keys.",
        "Guitar Workouts for Nerds is practice to get out of that box. Every lesson takes one idea — a chord shape, an inversion, a scale position, an arpeggio — and makes you play it in all 12 keys and all over the neck, until you stop thinking about shapes and start hearing music. That is what lets you play any song anywhere, write your own parts and find the sound you hear in your head.",
      ],
    },
    curriculum: {
      h2: "A complete guitar practice path",
      intro: "Six modules that build on each other, from chords to melody. Each lesson has a version for every key.",
      modules: [
        ["CAGED system exercises", "Basic Chords with CAGED: the five open-chord shapes — C, A, G, E and D — moved up the neck. Major, minor, dominant seventh and half-diminished chords in five regions of the fretboard."],
        ["Triad inversion exercises", "Triad Inversions: major, minor and diminished triads in root position and with the third or the fifth in the bass, on the 3rd, 4th, 5th and 6th strings — the smallest, most flexible voicings for comping and arranging."],
        ["Seventh chord inversion exercises", "Seventh Chord Inversions: maj7, m7, 7 and m7(♭5) in root position and with the third, fifth and seventh in the bass, on the 4th, 5th and 6th strings — drop 2 voicings, with drop 3 alternatives."],
        ["Major scale exercises in 7 positions", "7 Positions of the Ionian Mode: the major scale in seven three-notes-per-string shapes, from the nut to the bridge, plus a warm-up for position shifts."],
        ["Triad arpeggio exercises", "Triad Arpeggios: major, minor and diminished triads note by note, starting on the root, third or fifth, in three fingerings — then their inversions and the diatonic triads of each key, across the neck and within each scale position."],
        ["Seventh chord arpeggio exercises", "Seventh Chord Arpeggios: maj7, m7, 7 and m7(♭5) note by note, starting on the root, third, fifth or seventh — then their inversions and the diatonic seventh chords of each key, across the neck and within each scale position."],
      ],
    },
    how: {
      h2: "How a lesson works",
      cards: [
        ["See it", "Chords appear as diagrams with fingers, barres and the degree of every string. Scales and arpeggios appear as fretboard shapes, and melodic exercises as tablature you can switch to standard notation."],
        ["Hear it", "The app plays every chord and every note with a guitar sound, and the note that is sounding lights up, so you can check your hands by ear."],
        ["Play it in time", "Each lesson ends with a run of all its shapes to a metronome. Raise the tempo little by little — the app remembers your last BPM for each lesson."],
      ],
    },
    uses: {
      h2: "From practice to music",
      cards: [
        ["Play", "Know every chord and scale in every key and region of the neck, so you can accompany any song, transpose on the spot and follow other musicians wherever they go."],
        ["Compose", "Practise the diatonic chords of each key until you hear them, so chord progressions, riffs and melodies come from your ear instead of from the same old shapes."],
        ["Arrange", "Use inversions and arpeggios to choose the bass note, the top note and the region of the neck — smoother voice leading, parts that fit around a singer and lines that sound like you."],
      ],
    },
    features: {
      h2: "Built for real, everyday practice",
      cards: [
        ["Short sessions, real progress", "Each exercise takes a few minutes: one key, a handful of shapes, one run with the metronome. One key a day covers a whole lesson in under two weeks."],
        ["All 12 keys, not just the easy ones", "Every lesson has a variation for each key, in the cycle of fourths. A ring around the lesson fills in as you finish keys — no more avoiding A♭ or F♯."],
        ["Tablature and standard notation", "Melodic exercises are written as tab, with fingers above and bar lines, or as standard notation with the string for each note. Switch with one tap; a built-in guide explains how to read both."],
        ["A chord dictionary and a guide for each module", "Look up every voicing from the lessons by key and chord quality, and read the guide that explains the theory behind each module."],
        ["Your progress saved to your account", "Finished lessons and tempos are saved in your free account and synced across your devices."],
        ["Online guitar practice, nothing to install", "Everything runs in the browser, on a computer, tablet or phone, in English or Portuguese. The guitar sound is generated live."],
      ],
    },
    ctaBand: {
      h2: "Find your own sound on the guitar",
      text: "Rock, pop, blues, MPB, bossa nova or jazz: freedom on the fretboard is what lets you stop copying shapes and start making choices.",
      cta: "Start practicing for free",
      note: "Create your free account in less than a minute.",
    },
    faq: {
      h2: "Frequently asked questions",
      items: [
        ["Is it free?", "Yes. All lessons, the chord dictionary and the guides are free. You just create a free account to start practicing and save your progress."],
        ["Who is it for?", "Guitarists who already play a few chords and want to know the whole fretboard: to stop depending on a handful of shapes and keys, and to play, compose and arrange with more freedom. Beginners can start with the CAGED module."],
        ["Is it for acoustic or electric guitar?", "Both. The shapes are the same on acoustic, classical and electric guitar in standard tuning (E A D G B E)."],
        ["Do I need to read music?", "No. Chords are shown as diagrams and scales as fretboard shapes. Melodic exercises are in tablature by default, and standard notation is optional."],
        ["Why practise in all 12 keys?", "Because songs, singers and bands use all of them. Practising every shape in every key turns it into a pattern you understand, not a position you memorised, so changing key stops being a problem."],
        ["What is the CAGED system?", "CAGED maps the guitar neck with the five open-chord shapes C, A, G, E and D. Moving those shapes up the neck lets you play any chord in any key in five regions of the fretboard."],
        ["What are chord inversions?", "A chord is inverted when a note other than the root is in the bass. A triad has root position and two inversions; a seventh chord has root position and three: third, fifth or seventh in the bass."],
        ["What is an arpeggio?", "An arpeggio is a chord played one note at a time. Practising arpeggios connects chords and scales: it shows where each chord tone is on the neck, which is the base for soloing over chord changes and for writing melodies."],
        ["Does it work on a phone?", "Yes. The app works in any modern browser on phones, tablets and computers. Use headphones or a speaker to hear the low strings well."],
      ],
    },
    footer: { rights: "All rights reserved", app: "Open the app", dictionary: "Chord Dictionary", language: "Português" },
  },
  pt: {
    htmlLang: "pt-BR",
    ogLocale: "pt_BR",
    path: "pt/",
    title: "Exercícios de Guitarra e Violão: Acordes, Escalas e Arpejos | Guitar Workouts for Nerds",
    description:
      "Prática de guitarra e violão grátis: acordes, inversões, escalas e arpejos nas 12 tonalidades, com som, metrônomo e tablatura. Liberte-se no braço.",
    nav: { cta: "Comece a praticar grátis", login: "Entrar", continue: "Continuar praticando", account: "Abrir o app" },
    hero: {
      h1: "Exercícios de guitarra e violão para se libertar dos desenhos e das tonalidades",
      sub: "Uma prática completa e direta para o braço inteiro: acordes, inversões, escalas e arpejos nas 12 tonalidades, com som e metrônomo. Suba de nível para tocar, compor e fazer arranjos — e encontrar por conta própria o som que você busca.",
      cta: "Comece a praticar grátis",
      ctaNote: "Grátis, sem cartão de crédito",
      checklist: [
        "Acordes com o sistema CAGED, no braço inteiro",
        "Inversões de tríades e de tétrades",
        "A escala maior em 7 posições",
        "Arpejos de tríades e de tétrades",
        "O campo harmônico de cada tom, na horizontal e na vertical",
        "As 12 tonalidades, no ciclo de quartas",
      ],
      stats: (n) => [
        [`${n.lessons}`, "aulas"],
        [`${n.exercises}`, "exercícios"],
        [`${n.fingerings}+`, "digitações de acordes"],
        ["12", "tonalidades"],
      ],
      statsLabel: "Em números",
      ringLabel: "Uma aula com as 12 tonalidades: em azul as feitas, em laranja a próxima",
    },
    story: {
      h2: "Preso aos mesmos desenhos e tonalidades?",
      paragraphs: [
        "A maioria dos guitarristas e violonistas aprende alguns acordes abertos, duas ou três pestanas e um desenho de escala — e para por aí. O que eles tocam, compõem e arranjam acaba soando igual, porque a mão sempre volta para os mesmos lugares do braço e para os mesmos poucos tons.",
        "O Guitar Workouts for Nerds é uma prática para sair dessa caixa. Cada aula pega uma ideia — um desenho de acorde, uma inversão, uma posição de escala, um arpejo — e faz você tocá-la nas 12 tonalidades e no braço inteiro, até parar de pensar em desenhos e começar a ouvir música. É isso que deixa você tocar qualquer música em qualquer lugar, criar as suas próprias partes e encontrar o som que você ouve na cabeça.",
      ],
    },
    curriculum: {
      h2: "Um caminho completo de prática de guitarra",
      intro: "Seis módulos que se complementam, dos acordes à melodia. Cada aula tem uma versão para cada tonalidade.",
      modules: [
        ["Exercícios do sistema CAGED", "Acordes Básicos no CAGED: as cinco formas de acorde aberto — C, A, G, E e D — levadas para cima no braço. Acordes maiores, menores, de sétima dominante e meio diminutos em cinco regiões do braço."],
        ["Exercícios de inversões de tríades", "Inversões de Tríades: tríades maiores, menores e diminutas na ordem direta e com a terça ou a quinta no baixo, na 3ª, 4ª, 5ª e 6ª corda — os voicings menores e mais versáteis para acompanhar e arranjar."],
        ["Exercícios de inversões de tétrades", "Inversões de Tétrades: 7+, m7, 7 e m7(♭5) na ordem direta e com a terça, a quinta e a sétima no baixo, na 4ª, 5ª e 6ª corda — voicings drop 2, com alternativas em drop 3."],
        ["Exercícios de escala maior em 7 posições", "7 Posições do Modo Jônio: a escala maior em sete desenhos de três notas por corda, da pestana até a ponte, com um aquecimento para as mudanças de posição."],
        ["Exercícios de arpejos de tríades", "Arpejos de Tríades: tríades maiores, menores e diminutas nota por nota, começando na tônica, na terça ou na quinta, em três digitações — depois as inversões e as tríades do campo harmônico de cada tom, ao longo do braço e em cada posição da escala."],
        ["Exercícios de arpejos de tétrades", "Arpejos de Tétrades: 7+, m7, 7 e m7(♭5) nota por nota, começando na tônica, na terça, na quinta ou na sétima — depois as inversões e as tétrades do campo harmônico de cada tom, ao longo do braço e em cada posição da escala."],
      ],
    },
    how: {
      h2: "Como funciona uma aula",
      cards: [
        ["Veja", "Os acordes aparecem em diagramas com dedos, pestanas e o grau de cada corda. Escalas e arpejos aparecem como desenhos no braço, e os exercícios melódicos em tablatura, que pode virar partitura."],
        ["Ouça", "O app toca cada acorde e cada nota com som de violão, e a nota que está soando acende, para você conferir a mão de ouvido."],
        ["Toque no tempo", "Cada aula termina com todos os desenhos em sequência, no metrônomo. Suba o andamento aos poucos: o app guarda o último BPM de cada aula."],
      ],
    },
    uses: {
      h2: "Da prática para a música",
      cards: [
        ["Tocar", "Conheça cada acorde e cada escala em todos os tons e regiões do braço, para acompanhar qualquer música, transpor na hora e seguir outros músicos para onde eles forem."],
        ["Compor", "Pratique o campo harmônico de cada tom até ouvi-lo, para que progressões, riffs e melodias venham do ouvido e não dos mesmos desenhos de sempre."],
        ["Arranjar", "Use inversões e arpejos para escolher a nota do baixo, a nota mais aguda e a região do braço — condução de vozes mais suave, partes que abrem espaço para a voz e linhas com a sua cara."],
      ],
    },
    features: {
      h2: "Feito para a prática de verdade, todo dia",
      cards: [
        ["Sessões curtas, progresso real", "Cada exercício leva poucos minutos: uma tonalidade, alguns desenhos e uma execução no metrônomo. Uma tonalidade por dia completa uma aula em menos de duas semanas."],
        ["As 12 tonalidades, não só as fáceis", "Cada aula tem uma variação para cada tom, no ciclo de quartas. Um anel em volta da aula vai se completando — nada de fugir de A♭ ou F♯."],
        ["Tablatura e partitura", "Os exercícios melódicos vêm em tablatura, com os dedos em cima e as barras de compasso, ou em partitura com a corda de cada nota. Troque com um toque; um guia mostra como ler as duas."],
        ["Dicionário de acordes e um guia para cada módulo", "Consulte todos os voicings das aulas por tonalidade e tipo de acorde, e leia o guia que explica a teoria de cada módulo."],
        ["Progresso salvo na sua conta", "As aulas concluídas e os andamentos ficam salvos na sua conta grátis e sincronizados entre os seus aparelhos."],
        ["Prática online, sem instalar nada", "Tudo funciona no navegador, no computador, tablet ou celular, em português ou inglês. O som do violão é gerado na hora."],
      ],
    },
    ctaBand: {
      h2: "Encontre o seu som na guitarra",
      text: "Rock, pop, blues, MPB, bossa nova ou jazz: liberdade no braço é o que faz você parar de copiar desenhos e começar a fazer escolhas.",
      cta: "Comece a praticar grátis",
      note: "Crie sua conta grátis em menos de um minuto.",
    },
    faq: {
      h2: "Perguntas frequentes",
      items: [
        ["É grátis?", "Sim. Todas as aulas, o dicionário de acordes e os guias são gratuitos. Basta criar uma conta grátis para começar a praticar e salvar o seu progresso."],
        ["Para quem é?", "Para quem já toca alguns acordes e quer conhecer o braço inteiro: parar de depender de poucos desenhos e tonalidades e tocar, compor e arranjar com mais liberdade. Quem está começando pode começar pelo módulo de CAGED."],
        ["Serve para violão ou guitarra?", "Para os dois. Os desenhos são os mesmos no violão de aço, no violão clássico e na guitarra, na afinação padrão (E A D G B E)."],
        ["Preciso saber ler partitura?", "Não. Os acordes aparecem em diagramas e as escalas como desenhos no braço. Os exercícios melódicos vêm em tablatura, e a partitura é opcional."],
        ["Por que praticar nas 12 tonalidades?", "Porque as músicas, os cantores e as bandas usam todas. Praticar cada desenho em cada tom transforma o desenho num padrão que você entende, não numa posição decorada, e mudar de tom deixa de ser um problema."],
        ["O que é o sistema CAGED?", "O CAGED mapeia o braço da guitarra com as cinco formas de acorde aberto C, A, G, E e D. Levando essas formas para cima no braço, você toca qualquer acorde em qualquer tonalidade em cinco regiões do braço."],
        ["O que são inversões de acordes?", "Um acorde está invertido quando outra nota que não a fundamental está no baixo. A tríade tem a ordem direta e duas inversões; a tétrade tem a ordem direta e três: terça, quinta ou sétima no baixo."],
        ["O que é um arpejo?", "Arpejo é o acorde tocado nota por nota. Praticar arpejos liga os acordes às escalas: mostra onde está cada nota do acorde no braço, que é a base para improvisar sobre uma harmonia e para criar melodias."],
        ["Funciona no celular?", "Sim. O app funciona em qualquer navegador moderno, no celular, tablet ou computador. Use fone ou caixa de som para ouvir bem as cordas graves."],
      ],
    },
    footer: { rights: "Todos os direitos reservados", app: "Abrir o app", dictionary: "Dicionário de Acordes", language: "English" },
  },
};
