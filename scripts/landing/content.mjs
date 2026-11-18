// Content of the marketing homepage, in both languages (Guitar Workouts is bilingual:
// every text exists in pt and en). Rendered to static HTML by build.mjs so
// search engines read it without running JavaScript.
//
// Numbers come from src/lessons.ts (see build.mjs); keep claims factual —
// no invented stats, testimonials or partner logos.

export const SITE_URL = "https://guitarworkouts.app/";
export const BRAND = "Guitar Workouts";

export const content = {
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    path: "",
    // ≤ 60 characters before the brand (what search results show); descriptions ≤ 160.
    title: "Guitar Practice: Chords, Scales & Arpeggios in 12 Keys | Guitar Workouts",
    description:
      "Guitar exercises, not video lessons: chords, inversions, scales and arpeggios in all 12 keys, with sound, metronome and tab. Practice to improvise in any style.",
    nav: { cta: "Start practicing for free", login: "Log in", continue: "Continue practicing", account: "Open the app" },
    hero: {
      // The title is split around the highlighted words.
      h1: ["Guitar practice to ", "break free", " from shapes and keys"],
      sub: "Short exercises, not video lessons: chords, scales and arpeggios to play and improvise in any style, with your progress tracked lesson by lesson.",
      cta: "Start practicing for free",
      checklist: ["CAGED system", "Chord inversions", "Major scale in 7 positions", "Arpeggios", "Diatonic chords", "Practice in all keys"],
      stats: (n) => [
        [`${n.lessons}`, "lessons"],
        [`${n.exercises}`, "exercises"],
        [`${n.voicings}`, "chord voicings"],
      ],
      statsLabel: "In numbers",
    },
    story: {
      h2: "How to break free on the guitar neck without sitting through hours of video lessons",
      paragraphs: [
        "Over the last few years, I built a method to help guitarists who already play a few chords master the whole fretboard, in all 12 keys.",
        "The most interesting thing about this method is that you can master the fretboard without memorising theory, reading music or watching hours of video lessons: it is made of short exercises you see, hear and play right away, with sound and a metronome.",
        "Many guitarists believe that to play freely and improvise in any style you need years of lessons, natural talent or hours of practice every day.",
        "But the truth is that you need none of that to break free from the same old shapes and keys. You only need to practise every chord, scale and arpeggio in every key, a little each day.",
        "If you want to find out how to break free on the guitar neck and would like my help, create your free account and start practicing today.",
      ],
      cta: "Start practicing for free",
    },
    practice: {
      // Names of the modules (structured data featureList).
      modules: ["CAGED system exercises", "Triad inversion exercises", "Seventh chord inversion exercises", "Major scale exercises in 7 positions", "Triad arpeggio exercises", "Seventh chord arpeggio exercises"],
      articles: [
        {
          h: "A complete guitar practice path",
          paragraphs: [
            "Guitar Workouts is a practice path for the whole fretboard, in six modules that build on each other, from chords to melody. You start with the chord shapes you already half know and end up playing every chord tone, in every key, anywhere on the neck.",
            "Practice in all keys to master and forget about it when playing for real, so there is no more avoiding A♭ or F♯: the shapes stop being positions you memorised and become patterns you understand.",
          ],
        },
        {
          h: "Exercises, not video lessons",
          paragraphs: [
            "There is nothing to watch, pause or rewind. Each exercise takes a few minutes: one key, a handful of shapes and one run with the metronome.",
            "You see each shape, hear it with a guitar sound and play it right away, so your practice time goes into your hands and ears instead of into a screen.",
          ],
        },
        {
          h: "CAGED System",
          paragraphs: [
            "The CAGED system maps the whole guitar neck with five shapes you already know from open chords: C, A, G, E and D. Each one covers a region of the fretboard, and together they link up from the nut to the top of the neck without gaps.",
            "Instead of memorising hundreds of chords, you learn a handful of base patterns once and move them: the same shape played higher up the neck gives you the same chord in another key, and the five shapes give you one chord in five regions. Major, minor, dominant seventh and half-diminished chords all follow these patterns.",
          ],
        },
        {
          h: "Scales and Arpeggios",
          paragraphs: [
            "The major scale is learned in seven shapes, three notes per string, that cover the whole fretboard from the nut to the bridge. These seven shapes are the base for the scales you will play: the same patterns give you the major scale, its relative minor and the modes that come from them.",
            "Move them up or down the neck and they work in any key, in any position. Arpeggios then show where each chord tone sits inside those shapes, connecting chords and scales: the base for improvising over chord changes and writing melodies.",
          ],
        },
        {
          h: "Tab, notation and a guide for each module",
          paragraphs: [
            "Melodic exercises are written as tab, with fingers above and bar lines, or as standard notation with the string for each note. Switch with one tap; a built-in guide explains how to read both.",
            "Every module has a guide that explains the theory behind it, and the chord dictionary lets you look up every voicing from the lessons by key and chord quality.",
          ],
        },
        {
          h: "Online guitar practice, nothing to install",
          paragraphs: [
            "Everything runs in the browser, on a computer, tablet or phone.",
            "Finished lessons and tempos are saved in your free account and synced across your devices, so you can pick up right where you left off.",
          ],
        },
      ],
    },
    how: {
      h2: "How a lesson works",
      visuals: {
        see: "Cmaj7 chord diagram, with the finger on each note and the degree of each string",
        hear: "A minor chord playing: the string sounding lights up in orange",
        play: "Play",
        time: "The metronome at 72 BPM, beat by beat; the app remembers the last tempo of each lesson",
        last: "Last: 72 BPM",
        keys: "A lesson with its 12 keys: done keys in blue, the next one in orange",
      },
      cards: [
        ["See it", "Chords appear as diagrams with fingers, barres and the degree of each string; scales and arpeggios as tab or standard notation."],
        ["Hear it", "The app plays every chord and note with a guitar sound, and the sounding note lights up so you can check by ear."],
        ["Play it in time", "Each lesson ends with all its shapes in a row, to a metronome. Raise the tempo little by little: the app remembers your last BPM."],
        ["Repeat in every key", "Each lesson has a version in each of the 12 keys, in the cycle of fourths: the shapes become patterns you use anywhere."],
      ],
    },
    uses: {
      h2: "From practice to music",
      cards: [
        ["Improvise", "Arpeggios, scale positions and inversions are the vocabulary of improvising in rock, blues, jazz or any style. Aim for the chord tones."],
        ["Play", "Know every chord and scale in every key and region of the neck to accompany any song, transpose on the spot and follow other musicians."],
        ["Compose", "Practise the diatonic chords of each key until you hear them, so progressions, riffs and melodies come from your ear, not old shapes."],
        ["Arrange", "Use inversions and arpeggios to choose the bass note, the top note and the region of the neck, for parts that fit and sound like you."],
      ],
    },
    ctaBand: {
      h2: "Find your own sound on the guitar",
      text: "Rock, pop, blues, funk, MPB, bossa nova or jazz: freedom on the fretboard is what lets you improvise, stop copying shapes and start making choices.",
      cta: "Start practicing for free",
      note: "Create your free account in less than a minute.",
    },
    faqPage: {
      title: "Guitar Practice FAQ: Keys, Chords and Arpeggios | Guitar Workouts",
      description: "Answers about Guitar Workouts: price, who it is for, acoustic or electric guitar, reading music, the 12 keys, CAGED, inversions and arpeggios.",
    },
    faq: {
      h2: "Frequently asked questions",
      items: [
        ["Is it free?", "Yes. All lessons, the chord dictionary and the guides are free. You just create a free account to start practicing and save your progress."],
        ["Are there video lessons?", "No, on purpose. Guitar Workouts is made of exercises, not videos: each one shows the shapes as diagrams, tab or notation, plays them with a guitar sound and a metronome, and you play along right away. Less watching, more playing."],
        ["Will it help me improvise?", "Yes, in any style. Improvising means knowing where the notes of each chord and scale are, in any key and anywhere on the neck. The arpeggio, scale and inversion exercises train exactly that, so over a chord progression you can choose the notes instead of repeating memorised licks."],
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
    footer: { rights: "All rights reserved", faq: "FAQ", languageLabel: "Ver em português" },
  },
  pt: {
    htmlLang: "pt-BR",
    ogLocale: "pt_BR",
    path: "pt/",
    title: "Prática de Guitarra: Acordes, Escalas e Arpejos nos 12 Tons | Guitar Workouts",
    description:
      "Exercícios de guitarra sem videoaulas: acordes, inversões, escalas e arpejos nos 12 tons, com som, metrônomo e tablatura. Para improvisar em qualquer estilo.",
    nav: { cta: "Comece a praticar grátis", login: "Entrar", continue: "Continuar praticando", account: "Abrir o app" },
    hero: {
      h1: ["Prática de guitarra para ", "se libertar", " dos desenhos e das tonalidades"],
      sub: "Exercícios curtos, não videoaulas: acordes, escalas e arpejos para tocar e improvisar em qualquer estilo, acompanhando o seu progresso aula a aula.",
      cta: "Comece a praticar grátis",
      checklist: ["Sistema CAGED", "Inversões de acordes", "Escala maior em 7 posições", "Arpejos", "Campo harmônico", "Prática em todos os tons"],
      stats: (n) => [
        [`${n.lessons}`, "aulas"],
        [`${n.exercises}`, "exercícios"],
        [`${n.voicings}`, "voicings de acordes"],
      ],
      statsLabel: "Em números",
    },
    story: {
      h2: "Como se libertar no braço da guitarra sem passar horas assistindo videoaulas",
      paragraphs: [
        "Nos últimos anos, eu construí um método para ajudar guitarristas e violonistas que já tocam alguns acordes a dominar o braço inteiro, nas 12 tonalidades.",
        "O mais interessante desse método é que você pode dominar o braço sem precisar decorar teoria, ler partitura ou assistir a horas de videoaulas: são exercícios curtos, que você vê, ouve e toca na hora, com som e metrônomo.",
        "Muitos guitarristas acreditam que, para tocar com liberdade e improvisar em qualquer estilo, é preciso anos de aulas, talento nato ou estudar horas por dia.",
        "Mas a verdade é que nada disso é preciso para você se libertar dos mesmos desenhos e tonalidades. Basta praticar cada acorde, escala e arpejo em todos os tons, um pouco por dia.",
        "Se você tem interesse em descobrir como se libertar no braço da guitarra e gostaria da minha ajuda, então crie sua conta grátis e comece a praticar hoje.",
      ],
      cta: "Comece a praticar grátis",
    },
    practice: {
      // Names of the modules (structured data featureList).
      modules: ["Exercícios do sistema CAGED", "Exercícios de inversões de tríades", "Exercícios de inversões de tétrades", "Exercícios de escala maior em 7 posições", "Exercícios de arpejos de tríades", "Exercícios de arpejos de tétrades"],
      articles: [
        {
          h: "Um caminho completo de prática de guitarra",
          paragraphs: [
            "O Guitar Workouts é um caminho de prática para o braço inteiro, em seis módulos que se complementam, dos acordes à melodia. Você começa pelos desenhos de acorde que já conhece pela metade e termina tocando cada nota do acorde, em todos os tons, em qualquer lugar do braço.",
            "Pratique em todos os tons até dominar e esqueça disso na hora de tocar de verdade, e nada de fugir de A♭ ou F♯: os desenhos deixam de ser posições decoradas e viram padrões que você entende.",
          ],
        },
        {
          h: "Exercícios, não videoaulas",
          paragraphs: [
            "Não há nada para assistir, pausar ou voltar. Cada exercício leva poucos minutos: uma tonalidade, alguns desenhos e uma execução no metrônomo.",
            "Você vê cada desenho, ouve com som de violão e toca na hora, para o seu tempo de estudo ir para as mãos e o ouvido, e não para a tela.",
          ],
        },
        {
          h: "Sistema CAGED",
          paragraphs: [
            "O sistema CAGED mapeia o braço inteiro da guitarra com cinco formas que você já conhece dos acordes abertos: C, A, G, E e D. Cada uma cobre uma região do braço, e juntas elas se encadeiam da pestana até o fim do braço, sem buracos.",
            "Em vez de decorar centenas de acordes, você aprende alguns padrões básicos uma vez e os desloca: a mesma forma tocada mais acima no braço dá o mesmo acorde em outro tom, e as cinco formas dão um acorde em cinco regiões. Acordes maiores, menores, de sétima dominante e meio diminutos seguem esses padrões.",
          ],
        },
        {
          h: "Escalas e Arpejos",
          paragraphs: [
            "A escala maior é aprendida em sete desenhos de três notas por corda, que cobrem o braço inteiro, da pestana até a ponte. Esses sete desenhos são a base das escalas que você vai tocar: os mesmos padrões dão a escala maior, a sua relativa menor e os modos que nascem delas.",
            "Desloque os desenhos pelo braço e eles funcionam em qualquer tom, em qualquer posição. Os arpejos mostram onde está cada nota do acorde dentro desses desenhos e ligam acordes e escalas: a base para improvisar sobre uma harmonia e para criar melodias.",
          ],
        },
        {
          h: "Tablatura, partitura e um guia para cada módulo",
          paragraphs: [
            "Os exercícios melódicos vêm em tablatura, com os dedos em cima e as barras de compasso, ou em partitura com a corda de cada nota. Troque com um toque; um guia mostra como ler as duas.",
            "Cada módulo tem um guia que explica a teoria por trás dele, e o dicionário de acordes reúne todos os voicings das aulas por tonalidade e tipo de acorde.",
          ],
        },
        {
          h: "Prática de guitarra online, sem instalar nada",
          paragraphs: [
            "Tudo funciona no navegador, no computador, tablet ou celular.",
            "As aulas concluídas e os andamentos ficam salvos na sua conta grátis e sincronizados entre os seus aparelhos, para você continuar de onde parou.",
          ],
        },
      ],
    },
    how: {
      h2: "Como funciona uma aula",
      visuals: {
        see: "Diagrama do acorde C7+, com o dedo de cada nota e o grau de cada corda",
        hear: "Acorde de Lá menor tocando: a corda que está soando acende em laranja",
        play: "Tocar",
        time: "O metrônomo em 72 BPM, tempo a tempo; o app guarda o último andamento de cada aula",
        last: "Último: 72 BPM",
        keys: "Uma aula com as 12 tonalidades: em azul as feitas, em laranja a próxima",
      },
      cards: [
        ["Veja", "Os acordes aparecem em diagramas com dedos, pestanas e o grau de cada corda; escalas e arpejos, em tablatura ou partitura."],
        ["Ouça", "O app toca cada acorde e cada nota com som de violão, e a nota que está soando acende, para você conferir a mão de ouvido."],
        ["Toque no tempo", "Cada aula termina com os desenhos em sequência, no metrônomo. Suba o andamento aos poucos: o app guarda o BPM."],
        ["Repita nos 12 tons", "Cada aula tem uma versão em cada um dos 12 tons, no ciclo de quartas: os desenhos viram padrões para usar em todo o braço."],
      ],
    },
    uses: {
      h2: "Da prática para a música",
      cards: [
        ["Improvisar", "Arpejos, posições de escala e inversões são o vocabulário do improviso no rock, blues, jazz ou qualquer estilo. Mire nas notas do acorde."],
        ["Tocar", "Conheça cada acorde e escala em todos os tons e regiões do braço para acompanhar qualquer música, transpor na hora e seguir outros músicos."],
        ["Compor", "Pratique o campo harmônico de cada tom até ouvi-lo, para que progressões, riffs e melodias venham do ouvido, não de desenhos velhos."],
        ["Arranjar", "Use inversões e arpejos para escolher o baixo, a nota mais aguda e a região do braço, para criar partes que se encaixam e têm a sua cara."],
      ],
    },
    ctaBand: {
      h2: "Encontre o seu som na guitarra",
      text: "Rock, pop, blues, funk, MPB, bossa nova ou jazz: liberdade no braço é o que faz você improvisar, parar de copiar desenhos e começar a fazer escolhas.",
      cta: "Comece a praticar grátis",
      note: "Crie sua conta grátis em menos de um minuto.",
    },
    faqPage: {
      title: "Perguntas Frequentes: Tons, Acordes e Arpejos na Guitarra | Guitar Workouts",
      description: "Respostas sobre o Guitar Workouts: preço, para quem é, violão ou guitarra, partitura, as 12 tonalidades, CAGED, inversões e arpejos.",
    },
    faq: {
      h2: "Perguntas frequentes",
      items: [
        ["É grátis?", "Sim. Todas as aulas, o dicionário de acordes e os guias são gratuitos. Basta criar uma conta grátis para começar a praticar e salvar o seu progresso."],
        ["Tem videoaulas?", "Não, de propósito. O Guitar Workouts é feito de exercícios, não de vídeos: cada um mostra os desenhos em diagrama, tablatura ou partitura, toca com som de violão e metrônomo, e você toca junto na hora. Menos assistir, mais tocar."],
        ["Ajuda a improvisar?", "Sim, em qualquer estilo. Improvisar é saber onde estão as notas de cada acorde e escala, em qualquer tom e em qualquer lugar do braço. Os exercícios de arpejos, escalas e inversões treinam exatamente isso, para você escolher as notas sobre uma harmonia em vez de repetir frases decoradas."],
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
    footer: { rights: "Todos os direitos reservados", faq: "Perguntas frequentes", languageLabel: "View in English" },
  },
};
