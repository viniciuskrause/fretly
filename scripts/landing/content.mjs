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
    title: "Guitar Chord Exercises – CAGED System & Chord Inversions | Guitar Workouts for Nerds",
    description:
      "Free interactive guitar chord exercises with sound and a metronome. Learn the CAGED system and seventh-chord inversions in all 12 keys, right in your browser.",
    nav: { cta: "Start practicing for free", login: "Log in", continue: "Continue practicing", account: "Open the app" },
    hero: {
      h1: "Guitar chord exercises that teach you the whole fretboard",
      sub: "Bite-sized, interactive lessons with sound and a metronome. Play every chord in every key, anywhere on the neck.",
      cta: "Start practicing for free",
      ctaNote: "Free, no credit card",
      checklist: [
        "The CAGED system, shape by shape",
        "Major, minor, dominant 7, half-diminished and diminished chords",
        "Seventh-chord inversions (drop 2 and drop 3)",
        "All 12 keys, in the cycle of fourths",
        "A chord dictionary with every fingering",
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
    how: {
      h2: "How a guitar chord lesson works",
      cards: [
        ["Fret the chord", "Each step shows one chord diagram with fingers, barres and the degree of every string: root, third, fifth and seventh."],
        ["Listen and play along", "The app plays the chord string by string on a nylon-string guitar sound, then strums it, so you can check your fingering by ear."],
        ["Play in time", "The final exercise chains every shape of the lesson to a metronome. Raise the BPM little by little — the app remembers your last tempo."],
      ],
    },
    story: {
      h2: "The fun way to learn guitar chords",
      paragraphs: [
        "Most guitarists know a handful of open chords and a couple of barre shapes, then get stuck. Chord charts with hundreds of diagrams are hard to memorise and even harder to use when a song changes key.",
        "Guitar Workouts for Nerds turns that chart into a training plan. Instead of memorising shapes one by one, you learn the system behind them — five CAGED shapes and four seventh-chord inversions — and practise them in every key until they become automatic.",
      ],
    },
    grid1: [
      ["Guitar practice for busy people", "Each exercise takes a few minutes: one chord, a handful of shapes, one run with the metronome. Do one key a day and you will cover the whole cycle of fourths in under two weeks."],
      ["Learn by playing, not by memorising charts", "You never just look at a diagram. Every shape is fretted, heard and played in sequence, so your hands learn the fretboard and your ears learn the sound of each voicing."],
      ["Track your progress across all 12 keys", "Every lesson has a variation for each of the 12 keys. A ring around the lesson fills in as you finish keys, and your last metronome tempo is saved next to each one."],
      ["Online guitar practice, nothing to install", "Everything runs in the browser, on a computer, tablet or phone. The guitar sound is synthesised live."],
    ],
    ctaBand: {
      h2: "Unlock the fretboard for any style",
      text: "Pop, rock, MPB, bossa nova or jazz: chords in every key and position are what let you accompany a song anywhere on the neck, transpose on the fly and write smoother bass lines.",
      cta: "Start practicing for free",
      note: "Create your free account in less than a minute.",
    },
    grid2: [
      ["CAGED system exercises", "The Basic Chords with CAGED module teaches the CAGED system: the five open-chord shapes — C, A, G, E and D — moved up the neck. You play major, minor, dominant seventh and half-diminished chords in all five shapes, from the lowest to the highest, in all 12 keys."],
      ["Chord inversion exercises for beginners and experts", "The Seventh Chord Inversions module covers seventh-chord inversions: maj7, m7, 7 and m7(♭5) in root position and with the third, fifth and seventh in the bass, on the 4th, 5th and 6th strings — drop 2 voicings, plus drop 3 alternatives."],
      ["Triad inversion exercises", "The Triad Inversions module covers major, minor and diminished triads in root position and with the third and fifth in the bass, on the 3rd, 4th, 5th and 6th strings, in all 12 keys — a short way to play any chord anywhere on the neck."],
      ["Major scale exercises", "The 7 Positions of the Ionian Mode module covers the major scale in seven positions, one shape per lesson, from the nut to the bridge, in all 12 keys."],
      ["Triad arpeggio exercises", "The Triad Arpeggios module plays the major triad note by note — root, third and fifth — in three fingerings starting on the root, the third or the fifth, in all 12 keys."],
    ],
    faq: {
      h2: "Frequently asked questions",
      items: [
        ["Is it free?", "Yes. All lessons, the chord dictionary and the guides are free. You just create a free account to start practicing."],
        ["What is the CAGED system?", "CAGED is a way of mapping the guitar neck with the five open-chord shapes C, A, G, E and D. Moving those shapes up the neck lets you play any chord in any key in five regions of the fretboard."],
        ["What are chord inversions?", "A chord is inverted when a note other than the root is in the bass. A seventh chord has four notes, so it has root position and three inversions: third, fifth or seventh in the bass."],
        ["Do I need to read music?", "No. Every chord is shown as a diagram with fingers and barres, and you can hear it before you play it."],
        ["Does it work on a phone?", "Yes. The app works in any modern browser on phones, tablets and computers. Use headphones or a speaker to hear the low strings well."],
        ["Is it for acoustic or electric guitar?", "Both. The shapes are the same on acoustic, classical and electric guitar in standard tuning (E A D G B E)."],
      ],
    },
    footer: { rights: "All rights reserved", app: "Open the app", dictionary: "Chord Dictionary", language: "Português" },
  },
  pt: {
    htmlLang: "pt-BR",
    ogLocale: "pt_BR",
    path: "pt/",
    title: "Exercícios de Acordes para Violão e Guitarra – CAGED e Inversões | Guitar Workouts for Nerds",
    description:
      "Exercícios interativos e gratuitos de acordes para violão e guitarra, com som e metrônomo. Aprenda o sistema CAGED e as inversões de tétrades nas 12 tonalidades.",
    nav: { cta: "Comece a praticar grátis", login: "Entrar", continue: "Continuar praticando", account: "Abrir o app" },
    hero: {
      h1: "Exercícios de acordes para dominar o braço inteiro do violão e da guitarra",
      sub: "Aulas curtas e interativas, com som e metrônomo. Toque qualquer acorde em qualquer tonalidade, em qualquer lugar do braço.",
      cta: "Comece a praticar grátis",
      ctaNote: "Grátis, sem cartão de crédito",
      checklist: [
        "O sistema CAGED, forma por forma",
        "Acordes maiores, menores, de sétima dominante, meio diminutos e diminutos",
        "Inversões de tétrades (drop 2 e drop 3)",
        "As 12 tonalidades, no ciclo de quartas",
        "Um dicionário com todas as digitações",
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
    how: {
      h2: "Como funciona uma aula de acordes",
      cards: [
        ["Monte o acorde", "Cada passo mostra um diagrama com dedos, pestanas e o grau de cada corda: fundamental, terça, quinta e sétima."],
        ["Ouça e confira", "O app toca o acorde corda por corda com som de violão de nylon e depois o acorde inteiro, para você conferir a digitação de ouvido."],
        ["Toque no tempo", "No exercício final você encadeia todas as formas da aula no metrônomo. Suba o BPM aos poucos: o app guarda o andamento da última execução."],
      ],
    },
    story: {
      h2: "O jeito divertido de aprender acordes",
      paragraphs: [
        "A maioria dos violonistas e guitarristas sabe meia dúzia de acordes abertos e duas ou três pestanas, e para por aí. Dicionários com centenas de diagramas são difíceis de decorar e mais difíceis ainda de usar quando a música muda de tom.",
        "O Guitar Workouts for Nerds transforma esse dicionário num plano de treino. Em vez de decorar desenhos um a um, você aprende o sistema por trás deles — as cinco formas do CAGED e as inversões de tétrades — e pratica em todas as tonalidades até virar automático.",
      ],
    },
    grid1: [
      ["Prática de violão para quem tem pouco tempo", "Cada exercício leva poucos minutos: um acorde, algumas formas e uma execução no metrônomo. Fazendo uma tonalidade por dia, você percorre o ciclo de quartas inteiro em menos de duas semanas."],
      ["Aprenda tocando, não decorando diagramas", "Você nunca só olha um diagrama. Cada forma é montada, ouvida e tocada em sequência, então a mão aprende o braço e o ouvido aprende o som de cada voicing."],
      ["Acompanhe seu progresso nas 12 tonalidades", "Cada aula tem uma variação para cada uma das 12 tonalidades. Um anel em volta da aula vai se completando conforme você conclui as tonalidades, e o último andamento do metrônomo fica salvo."],
      ["Prática online, sem instalar nada", "Tudo funciona no navegador, no computador, tablet ou celular. O som do violão é sintetizado na hora."],
    ],
    ctaBand: {
      h2: "Domine o braço para qualquer estilo",
      text: "Pop, rock, MPB, bossa nova ou jazz: saber os acordes em todas as tonalidades e posições é o que deixa você acompanhar uma música em qualquer região do braço, transpor na hora e criar linhas de baixo mais suaves.",
      cta: "Comece a praticar grátis",
      note: "Crie sua conta grátis em menos de um minuto.",
    },
    grid2: [
      ["Exercícios do sistema CAGED", "O módulo Acordes Básicos no CAGED ensina o sistema CAGED: as cinco formas de acorde aberto — C, A, G, E e D — levadas para cima no braço. Você toca acordes maiores, menores, de sétima dominante e meio diminutos nas cinco formas, da mais grave à mais aguda, nas 12 tonalidades."],
      ["Exercícios de inversões de acordes para iniciantes e avançados", "O módulo Inversões de Tétrades trabalha as inversões de tétrades: 7+, m7, 7 e m7(♭5) na ordem direta e com a terça, a quinta e a sétima no baixo, na 4ª, 5ª e 6ª corda — voicings drop 2, com alternativas em drop 3."],
      ["Exercícios de inversões de tríades", "O módulo Inversões de Tríades trabalha as tríades maiores, menores e diminutas na ordem direta e com a terça e a quinta no baixo, na 3ª, 4ª, 5ª e 6ª corda, nas 12 tonalidades — um jeito curto de tocar qualquer acorde em qualquer região do braço."],
      ["Exercícios de escalas maiores", "O módulo 7 Posições do Modo Jônio trabalha a escala maior em sete posições, um desenho por aula, da pestana até a ponte, nas 12 tonalidades."],
      ["Exercícios de arpejos de tríades", "O módulo Arpejos de Tríades toca a tríade maior nota por nota — tônica, terça e quinta — em três digitações começando na tônica, na terça ou na quinta, nas 12 tonalidades."],
    ],
    faq: {
      h2: "Perguntas frequentes",
      items: [
        ["É grátis?", "Sim. Todas as aulas, o dicionário de acordes e os guias são gratuitos. Basta criar uma conta grátis para começar a praticar."],
        ["O que é o sistema CAGED?", "O CAGED é uma forma de mapear o braço da guitarra com as cinco formas de acorde aberto C, A, G, E e D. Levando essas formas para cima no braço, você toca qualquer acorde em qualquer tonalidade em cinco regiões do braço."],
        ["O que são inversões de acordes?", "Um acorde está invertido quando outra nota que não a fundamental está no baixo. A tétrade tem quatro notas, então tem o estado fundamental e três inversões: terça, quinta ou sétima no baixo."],
        ["Preciso saber ler partitura?", "Não. Todo acorde aparece como diagrama, com dedos e pestanas, e você pode ouvi-lo antes de tocar."],
        ["Funciona no celular?", "Sim. O app funciona em qualquer navegador moderno, no celular, tablet ou computador. Use fone ou caixa de som para ouvir bem as cordas graves."],
        ["Serve para violão ou guitarra?", "Para os dois. As formas são as mesmas no violão de aço, no violão clássico e na guitarra, na afinação padrão (E A D G B E)."],
      ],
    },
    footer: { rights: "Todos os direitos reservados", app: "Abrir o app", dictionary: "Dicionário de Acordes", language: "English" },
  },
};
