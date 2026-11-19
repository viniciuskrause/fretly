// Legal pages (build.mjs): terms, privacy policy and imprint (Impressum), in
// English and Portuguese. Guitar Workouts is run from Germany, so German and EU
// consumer and data-protection law apply. Keep these in line with what the site
// really does (src/consent.ts, src/analytics.ts, functions/, firestore.rules).

/** Who runs the site (Impressum, § 5 DDG). Filled in by the operator. */
export const OPERATOR = {
  name: "Vinicius Krause, Guitar Workouts", // full legal name
  street: "Kreith 8a", // street and number
  city: "85664 Hohenlinden", // postal code and city
  country: { en: "Germany", pt: "Alemanha" },
  email: "kr.vinicius@gmail.com", // contact address shown on the site
  vatId: null, // USt-IdNr., if there is one
};

export const UPDATED = { en: "November 19, 2026", pt: "19 de novembro de 2026" };

const o = OPERATOR;
const address = (lang) => [o.name, o.street, o.city, o.country[lang]].join(", ");

export const legal = {
  en: {
    labels: { terms: "Terms", privacy: "Privacy", imprint: "Imprint", cookies: "Cookies", updated: "Last updated" },
    terms: {
      title: "Terms of Service | Guitar Workouts",
      description: "Terms of Service of Guitar Workouts: the free plan, Premium plans, payment, cancellation and the right of withdrawal.",
      h1: "Terms of Service",
      sections: () => [
        ["Who we are", [`Guitar Workouts (guitarworkouts.app) is run by ${address("en")} ("we"). Contact: ${o.email}.`]],
        ["The service", [
          "Guitar Workouts is an online guitar practice app: short exercises with chords, scales and arpeggios, played in the browser with sound and a metronome. Your progress is saved in your account.",
          "The free plan includes the first 20 lessons, the chord dictionary and the module guides. Guitar Workouts Premium unlocks every lesson, including lessons added later. Every Premium plan includes the same content.",
        ]],
        ["Your account", [
          "You need an account to save your progress and to buy Premium. Give accurate details, keep your password to yourself and use the account only for yourself. We may suspend accounts that are used to break these terms or the law.",
          "You can delete your account at any time on the My account page. Cancel an active subscription first: deleting the account deletes your progress, not the subscription.",
        ]],
        ["Premium plans and payment", [
          "Premium is offered as an annual subscription, a monthly subscription, or a one-time payment for lifetime access. The prices are shown on the upgrade page and at checkout, taxes included. A contract is made when you complete the payment at checkout.",
          "Payment is handled by Stripe. We never see or store your card details. You get a receipt or invoice by e-mail.",
          "Subscriptions renew automatically at the end of each period (year or month) at the price then in force, until you cancel. We tell you about a price change by e-mail at least 30 days before it applies to you, and you can cancel before it does.",
          "Lifetime access is a single payment and gives you Premium for as long as we run Guitar Workouts.",
        ]],
        ["Cancelling a subscription", [
          "You can cancel at any time on the My account page, under Subscription (Manage subscription and invoices). You keep Premium until the end of the period you have paid for and the subscription is not renewed. Periods already paid are not refunded, unless the law requires it.",
        ]],
        ["Right of withdrawal (consumers in the EU)", [
          "If you are a consumer in the European Union, you normally have a 14-day right to withdraw from a contract made online, without giving a reason. To withdraw, send us a clear statement by e-mail to the address above within 14 days of the purchase.",
          "Premium gives you immediate access to digital content. At checkout you expressly ask us to start right away and confirm that you know you lose your right of withdrawal once access begins (§ 356(5) of the German Civil Code). Without that consent you cannot complete the purchase. We confirm it in your receipt.",
        ]],
        ["Availability and changes", [
          "We work to keep Guitar Workouts available and to improve it, but short interruptions for maintenance or technical problems can happen. We may update, add or rework lessons as long as Premium keeps its essential content.",
          "We may change these terms for good reason (for example new features or changes in the law). We tell you about changes by e-mail; if you do not object within 30 days, the new terms apply. If you object, you can cancel your subscription.",
        ]],
        ["Liability", [
          "We are liable without limitation for intent and gross negligence and for injury to life, body or health. For slight negligence we are liable only for breach of an essential contractual obligation, limited to the damage that is typical and foreseeable for this kind of contract. Liability under the German Product Liability Act is not affected.",
        ]],
        ["Law and disputes", [
          "German law applies, without the UN Convention on Contracts for the International Sale of Goods. If you are a consumer, you keep the protection of the mandatory rules of the country where you live.",
          "We are not obliged and not willing to take part in dispute resolution before a consumer arbitration board.",
        ]],
      ],
    },
    privacy: {
      title: "Privacy Policy | Guitar Workouts",
      description: "How Guitar Workouts handles your data: your account, progress, payments with Stripe and Google Analytics only with your consent.",
      h1: "Privacy Policy",
      sections: () => [
        ["Controller", [`The controller for the processing of personal data on guitarworkouts.app is ${address("en")}. E-mail: ${o.email}.`]],
        ["Your account and progress", [
          "When you create an account we store your e-mail address, first name, username, preferred language and password (only as a secure hash, managed by Firebase Authentication). While you practise we store your finished lessons, tempos and settings.",
          "We use this to provide the service you signed up for (Art. 6(1)(b) GDPR). The data is kept until you delete your account on the My account page; then it is deleted.",
        ]],
        ["Premium and payments", [
          "Payments are processed by Stripe (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin 2, Ireland). Stripe receives your e-mail address, your billing address and your payment details; we never see your card number. From Stripe we only keep your customer number, your plan, its status and renewal date, to unlock Premium (Art. 6(1)(b) GDPR).",
          "Stripe may calculate taxes from your address and keeps invoices for as long as tax law requires (in Germany, up to 10 years; Art. 6(1)(c) GDPR). Stripe's privacy policy: stripe.com/privacy.",
        ]],
        ["Hosting and infrastructure", [
          "The site and the app run on Google Firebase (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland): Hosting, Authentication, Cloud Firestore and Cloud Functions. Google processes the data on our behalf under a data processing agreement. Data may be processed in the USA; Google is certified under the EU-U.S. Data Privacy Framework.",
          "When you open a page, the servers log technical data such as your IP address, date and time, the page and your browser, to deliver the site and keep it secure (Art. 6(1)(f) GDPR). The server also uses your country, from your IP address, to open the site in Portuguese or English; the result is kept in your browser.",
        ]],
        ["Google Analytics (only with your consent)", [
          "If you accept it in the cookie banner, we use Google Analytics 4 (Google Ireland Limited) to understand how the site is used, for example which lessons are opened. It sets cookies and processes a pseudonymous identifier, your device and browser details and a shortened IP address. We never send your name or e-mail address to Google Analytics. Data may be processed in the USA (EU-U.S. Data Privacy Framework).",
          "The legal basis is your consent (§ 25(1) TDDDG, Art. 6(1)(a) GDPR). Without it, Google Analytics is not loaded. You can withdraw your consent at any time with the Cookies link at the bottom of the homepage. Analytics data is deleted after at most 14 months.",
        ]],
        ["Data in your browser", [
          "The app keeps your login session, language, progress and metronome settings in your browser's local storage, so it works and remembers your choices (§ 25(2) TDDDG). Logging out or clearing your browser data removes them.",
        ]],
        ["Your rights", [
          "You have the right to access your data, to have it corrected or deleted, to restrict its processing, to data portability and to object to processing based on legitimate interests (Art. 15–21 GDPR), and to withdraw consent at any time with effect for the future. Write to the e-mail address above.",
          "You also have the right to lodge a complaint with a data protection supervisory authority, for example the one where you live or the one responsible for us.",
        ]],
      ],
    },
    imprint: {
      title: "Imprint | Guitar Workouts",
      description: "Imprint (Impressum) of Guitar Workouts: who runs the site and how to contact us.",
      h1: "Imprint",
      sections: () => [
        ["Information according to § 5 DDG", [o.name, o.street, `${o.city}, ${o.country.en}`]],
        ["Contact", [`E-mail: ${o.email}`]],
        ...(o.vatId ? [["VAT ID", [`VAT identification number according to § 27a of the German VAT Act: ${o.vatId}`]]] : []),
        ["Responsible for the content (§ 18(2) MStV)", [`${o.name}, address as above.`]],
        ["Consumer dispute resolution", ["We are not obliged and not willing to take part in dispute resolution before a consumer arbitration board."]],
      ],
    },
  },
  pt: {
    labels: { terms: "Termos", privacy: "Privacidade", imprint: "Impressum", cookies: "Cookies", updated: "Atualizado em" },
    terms: {
      title: "Termos de Uso | Guitar Workouts",
      description: "Termos de Uso do Guitar Workouts: o plano grátis, os planos Premium, pagamento, cancelamento e direito de desistência.",
      h1: "Termos de Uso",
      sections: () => [
        ["Quem somos", [`O Guitar Workouts (guitarworkouts.app) é mantido por ${address("pt")} ("nós"). Contato: ${o.email}.`]],
        ["O serviço", [
          "O Guitar Workouts é um app de prática de guitarra on-line: exercícios curtos de acordes, escalas e arpejos, tocados no navegador com som e metrônomo. O seu progresso fica salvo na sua conta.",
          "O plano grátis inclui as primeiras 20 aulas, o dicionário de acordes e os guias dos módulos. O Guitar Workouts Premium libera todas as aulas, inclusive as que forem lançadas depois. Todos os planos Premium incluem o mesmo conteúdo.",
        ]],
        ["Sua conta", [
          "Você precisa de uma conta para salvar o seu progresso e para assinar o Premium. Informe dados corretos, guarde a sua senha e use a conta só para você. Podemos suspender contas usadas para violar estes termos ou a lei.",
          "Você pode excluir a sua conta a qualquer momento na página Minha conta. Cancele antes uma assinatura ativa: excluir a conta apaga o seu progresso, não a assinatura.",
        ]],
        ["Planos Premium e pagamento", [
          "O Premium é oferecido como assinatura anual, assinatura mensal ou pagamento único para acesso vitalício. Os preços aparecem na página de upgrade e no checkout, com impostos incluídos. O contrato é feito quando você conclui o pagamento no checkout.",
          "O pagamento é processado pelo Stripe. Nós nunca vemos nem guardamos os dados do seu cartão. Você recebe o recibo ou a fatura por e-mail.",
          "As assinaturas são renovadas automaticamente no fim de cada período (ano ou mês), pelo preço em vigor, até você cancelar. Avisamos qualquer mudança de preço por e-mail com pelo menos 30 dias de antecedência, e você pode cancelar antes que ela valha para você.",
          "O acesso vitalício é um pagamento único e dá o Premium enquanto mantivermos o Guitar Workouts.",
        ]],
        ["Cancelamento da assinatura", [
          "Você pode cancelar a qualquer momento na página Minha conta, em Assinatura (Gerenciar assinatura e faturas). Você continua com o Premium até o fim do período já pago, e a assinatura não é renovada. Períodos já pagos não são reembolsados, salvo quando a lei exigir.",
        ]],
        ["Direito de desistência (consumidores na UE)", [
          "Se você é consumidor na União Europeia, normalmente tem 14 dias para desistir de um contrato feito pela internet, sem precisar dar motivo. Para desistir, envie uma declaração clara para o e-mail acima dentro de 14 dias da compra.",
          "O Premium dá acesso imediato a conteúdo digital. No checkout você pede expressamente que o acesso comece na hora e confirma que sabe que perde o direito de desistência quando o acesso começa (§ 356(5) do Código Civil alemão). Sem esse consentimento, não é possível concluir a compra. Confirmamos isso no seu recibo.",
        ]],
        ["Disponibilidade e mudanças", [
          "Trabalhamos para manter o Guitar Workouts no ar e melhorá-lo, mas pode haver interrupções curtas para manutenção ou por problemas técnicos. Podemos atualizar, incluir ou refazer aulas, desde que o Premium mantenha o seu conteúdo essencial.",
          "Podemos alterar estes termos por um bom motivo (por exemplo, novos recursos ou mudanças na lei). Avisamos as mudanças por e-mail; se você não se opuser em 30 dias, os novos termos passam a valer. Se você se opuser, pode cancelar a sua assinatura.",
        ]],
        ["Responsabilidade", [
          "Respondemos sem limite por dolo e culpa grave e por danos à vida, ao corpo ou à saúde. Por culpa leve, respondemos só pela violação de uma obrigação contratual essencial, limitada ao dano típico e previsível para este tipo de contrato. A responsabilidade pela Lei alemã de Responsabilidade pelo Produto não é afetada.",
        ]],
        ["Lei aplicável e conflitos", [
          "Vale a lei alemã, sem a Convenção da ONU sobre Contratos de Compra e Venda Internacional de Mercadorias. Se você é consumidor, continua com a proteção das regras obrigatórias do país onde mora.",
          "Não somos obrigados nem estamos dispostos a participar de procedimentos de resolução de conflitos perante uma câmara de arbitragem de consumo.",
        ]],
      ],
    },
    privacy: {
      title: "Política de Privacidade | Guitar Workouts",
      description: "Como o Guitar Workouts trata os seus dados: a sua conta, o progresso, pagamentos com o Stripe e o Google Analytics só com o seu consentimento.",
      h1: "Política de Privacidade",
      sections: () => [
        ["Responsável", [`O responsável pelo tratamento de dados pessoais no guitarworkouts.app é ${address("pt")}. E-mail: ${o.email}.`]],
        ["Sua conta e seu progresso", [
          "Ao criar a conta, guardamos o seu e-mail, nome, nome de usuário, idioma preferido e senha (só como hash seguro, gerenciado pelo Firebase Authentication). Enquanto você pratica, guardamos as aulas concluídas, os andamentos e as configurações.",
          "Usamos esses dados para prestar o serviço que você contratou (art. 6(1)(b) do RGPD). Eles ficam guardados até você excluir a sua conta na página Minha conta, e então são apagados.",
        ]],
        ["Premium e pagamentos", [
          "Os pagamentos são processados pelo Stripe (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin 2, Irlanda). O Stripe recebe o seu e-mail, o endereço de cobrança e os dados de pagamento; nós nunca vemos o número do seu cartão. Do Stripe guardamos só o número de cliente, o plano, o status e a data de renovação, para liberar o Premium (art. 6(1)(b) do RGPD).",
          "O Stripe pode calcular impostos a partir do seu endereço e guarda as faturas pelo prazo exigido pela lei fiscal (na Alemanha, até 10 anos; art. 6(1)(c) do RGPD). Política de privacidade do Stripe: stripe.com/privacy.",
        ]],
        ["Hospedagem e infraestrutura", [
          "O site e o app rodam no Google Firebase (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlanda): Hosting, Authentication, Cloud Firestore e Cloud Functions. O Google trata os dados em nosso nome, com um contrato de tratamento de dados. Os dados podem ser tratados nos EUA; o Google é certificado pelo EU-U.S. Data Privacy Framework.",
          "Quando você abre uma página, os servidores registram dados técnicos como o seu endereço IP, data e hora, a página e o navegador, para entregar o site e mantê-lo seguro (art. 6(1)(f) do RGPD). O servidor também usa o seu país, a partir do IP, para abrir o site em português ou inglês; o resultado fica guardado no seu navegador.",
        ]],
        ["Google Analytics (só com o seu consentimento)", [
          "Se você aceitar no aviso de cookies, usamos o Google Analytics 4 (Google Ireland Limited) para entender como o site é usado, por exemplo quais aulas são abertas. Ele grava cookies e trata um identificador pseudônimo, dados do aparelho e do navegador e o IP encurtado. Nunca enviamos o seu nome ou e-mail ao Google Analytics. Os dados podem ser tratados nos EUA (EU-U.S. Data Privacy Framework).",
          "A base legal é o seu consentimento (§ 25(1) TDDDG, art. 6(1)(a) do RGPD). Sem ele, o Google Analytics não é carregado. Você pode retirar o consentimento a qualquer momento pelo link Cookies no rodapé da página inicial. Os dados de análise são apagados em no máximo 14 meses.",
        ]],
        ["Dados no seu navegador", [
          "O app guarda a sua sessão de login, o idioma, o progresso e as configurações do metrônomo no armazenamento local do navegador, para funcionar e lembrar as suas escolhas (§ 25(2) TDDDG). Sair da conta ou limpar os dados do navegador remove essas informações.",
        ]],
        ["Seus direitos", [
          "Você tem direito de acessar os seus dados, corrigi-los ou apagá-los, limitar o tratamento, à portabilidade e de se opor a tratamentos baseados em interesse legítimo (arts. 15 a 21 do RGPD), além de retirar o consentimento a qualquer momento, com efeito para o futuro. Escreva para o e-mail acima. Se você está no Brasil, também tem os direitos previstos na LGPD (art. 18).",
          "Você também pode reclamar a uma autoridade de proteção de dados, por exemplo a do lugar onde mora ou a responsável por nós (no Brasil, a ANPD).",
        ]],
      ],
    },
    imprint: {
      title: "Impressum | Guitar Workouts",
      description: "Impressum do Guitar Workouts: quem mantém o site e como entrar em contato.",
      h1: "Impressum",
      sections: () => [
        ["Informações segundo o § 5 DDG", [o.name, o.street, `${o.city}, ${o.country.pt}`]],
        ["Contato", [`E-mail: ${o.email}`]],
        ...(o.vatId ? [["Número de IVA", [`Número de identificação de IVA segundo o § 27a da lei alemã do IVA: ${o.vatId}`]]] : []),
        ["Responsável pelo conteúdo (§ 18(2) MStV)", [`${o.name}, endereço acima.`]],
        ["Resolução de conflitos de consumo", ["Não somos obrigados nem estamos dispostos a participar de procedimentos de resolução de conflitos perante uma câmara de arbitragem de consumo."]],
      ],
    },
  },
};
