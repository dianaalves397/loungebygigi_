// As edições da revista LOUNGE — cada categoria pode ter a sua.
// Tudo o que muda entre a edição feminina e a masculina vive aqui:
// fotografias, títulos, textos das colunas, fragmentos da colagem e arquivo.

export type Crop = [number, number, number, number]; // frações: sx, sy, sw, sh

export type EditionConfig = {
  sources: string[]; // caminhos em /public
  essential: number[]; // índices sem os quais o mundo não é montado
  environment: "court" | "riviera"; // cenografia à volta da revista
  pathStyle: "fly" | "zoomIn"; // percurso: sobrevoo ou zoom-na-capa que se abre
  path?: Array<{ pos: [number, number, number]; look: [number, number, number] }>;
  shopping?: { title: string; note: string }; // página de compras impressa
  // abertura fotográfica: alguém segura a revista; o scroll faz zoom nela
  hold?: { src: string; focus: [number, number]; scale: number };
  accent?: string; // cor de destaque dos títulos (bordeaux Vogue por omissão)
  // blocos editoriais extra da revista vertical (foto/texto, à Vogue)
  stories?: Array<
    | { kind: "interlude"; photo: number; caption: string }
    | { kind: "story"; photo: number; caption: string; title: string; paragraphs: string[]; flip?: boolean }
    | { kind: "duo"; photos: [number, number]; captions: [string, string]; title: string; paragraphs: string[] }
  >;
  chapters: {
    openFallback: string; // usado se a categoria não tiver introText
    spreadQuote: [string, string];
    collage: string;
    closingQuote: [string, string];
  };
  cover: { photo: number; kicker: string; italic: string; footer: string };
  spread: {
    photo: number;
    photoCaption: string;
    headline: [string, string];
    col1: string[];
    col2: string[];
    inset: { photo: number; crop: Crop; caption: string };
  };
  collage: {
    base: number;
    word: string;
    fragments: Array<{
      photo: number;
      crop: Crop;
      w: number;
      pos: [number, number, number];
      tilt: number;
      edges: Array<"top" | "bottom" | "left" | "right">;
    }>;
  };
  triptych: Array<{ photo: number; caption: string; crop: Crop }>;
};

export const EDITIONS: Record<"woman" | "man" | "summer" | "summerMan", EditionConfig> = {
  woman: {
    environment: "court",
    pathStyle: "fly",
    sources: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"].map(
      (n) => `/editorial/sports-${n}.jpg`
    ),
    essential: [0, 2, 3, 4],
    chapters: {
      openFallback: "Peças de desporto pensadas para o court, o green e a cidade.",
      spreadQuote: ["As páginas desta edição", "ganharam profundidade."],
      collage:
        "Recortes da edição, pendurados como provas de impressão — fragmentos que se tornam cenário.",
      closingQuote: ["As peças esperam", "na última página."]
    },
    cover: {
      photo: 4,
      kicker: "Édition Sports — N.º 01",
      italic: "do court para a cidade",
      footer: "Lounge by Gigi — Lisboa"
    },
    spread: {
      photo: 3,
      photoCaption: "No court, ao entardecer",
      headline: ["O intervalo", "também se veste."],
      col1: [
        "Há uma elegância própria em quem trata o desporto como um ritual e não como uma pressa. As peças desta edição foram pensadas para os intervalos: o casaco pousado nos ombros à saída do court, o matcha gelado sobre a raquete, a conversa que se estende até a luz mudar.",
        "O guarda-roupa acompanha sem pedir atenção — algodões lavados, malhas leves, brancos que aguentam o pó de tijolo."
      ],
      col2: [
        "Do court ao clube, do clube à cidade, a linha é a mesma: materiais honestos, cortes limpos e uma paleta que envelhece bem. Jogamos como nos vestimos — sem esforço aparente, com atenção a tudo. O jogo acaba; o gesto fica."
      ],
      inset: { photo: 2, crop: [0.1, 0.2, 0.8, 0.6], caption: "matcha no intervalo" }
    },
    collage: {
      base: 0,
      word: "A colagem — Lounge Édition Sports",
      fragments: [
        { photo: 5, crop: [0.05, 0.35, 0.9, 0.6], w: 2.6, pos: [-2.1, 1.2, -10.15], tilt: -0.09, edges: ["top", "right"] },
        { photo: 1, crop: [0.15, 0.05, 0.7, 0.75], w: 1.9, pos: [2.3, 2.3, -10.0], tilt: 0.11, edges: ["bottom", "left"] },
        { photo: 2, crop: [0, 0, 1, 0.62], w: 2.1, pos: [0.6, 0.9, -9.7], tilt: 0.05, edges: ["top", "left"] },
        { photo: 4, crop: [0.2, 0.1, 0.62, 0.55], w: 1.7, pos: [-1.2, 2.6, -9.9], tilt: -0.06, edges: ["bottom", "right"] },
        { photo: 6, crop: [0.05, 0.12, 0.85, 0.6], w: 2.2, pos: [3.6, 1.1, -9.5], tilt: 0.08, edges: ["top", "left"] },
        { photo: 8, crop: [0.08, 0.28, 0.84, 0.6], w: 2, pos: [-3.5, 1.5, -9.7], tilt: -0.1, edges: ["bottom", "right"] }
      ]
    },
    triptych: [
      { photo: 9, caption: "country club", crop: [0.06, 0.05, 0.88, 0.9] },
      { photo: 8, caption: "tarde de polo", crop: [0.1, 0.02, 0.8, 0.92] },
      { photo: 7, caption: "manhã, mar", crop: [0.08, 0.05, 0.84, 0.9] }
    ]
  },

  man: {
    environment: "court",
    pathStyle: "fly",
    sources: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"].map(
      (n) => `/editorial/msports-${n}.jpg`
    ),
    essential: [0, 3, 5, 7],
    chapters: {
      openFallback: "Peças pensadas para o court, o ringue e o bar do clube.",
      spreadQuote: ["O clube abre", "as portas."],
      collage:
        "Provas de impressão da edição masculina — polo, terra batida e o vestiário do clube, pendurados a secar.",
      closingQuote: ["As peças esperam", "na última página."]
    },
    cover: {
      photo: 3, // guarda no relvado do clube, ao entardecer
      kicker: "Édition Sports Homme — N.º 01",
      italic: "o clube ao fim da tarde",
      footer: "Lounge by Gigi — Lisboa"
    },
    spread: {
      photo: 5, // malha entrançada, raquete e bola em terra batida
      photoCaption: "Terra batida, 18h",
      headline: ["Jogar bem", "é um hábito."],
      col1: [
        "Há uma escola antiga que não se aprende nos manuais: chegar cedo, cumprimentar o adversário, tratar o material como se fosse herdado — porque muitas vezes é. As peças desta edição vêm dessa escola.",
        "Malhas entrançadas, algodões com peso, brancos que não têm medo da terra batida. Roupa que trabalha calada."
      ],
      col2: [
        "Do ringue ao court, do estábulo ao bar do clube, o princípio mantém-se: menos logótipos, mais postura. O resultado do jogo esquece-se; a forma como se jogou, não."
      ],
      inset: { photo: 7, crop: [0.05, 0.25, 0.9, 0.55], caption: "vestiário do clube" }
    },
    collage: {
      base: 0, // as impressões do clube sobre o sofá de couro
      word: "A colagem — Lounge Édition Homme",
      fragments: [
        { photo: 1, crop: [0.05, 0.15, 0.9, 0.62], w: 2.6, pos: [-2.1, 1.2, -10.15], tilt: -0.09, edges: ["top", "right"] },
        { photo: 6, crop: [0.05, 0.15, 0.9, 0.6], w: 1.9, pos: [2.3, 2.3, -10.0], tilt: 0.11, edges: ["bottom", "left"] },
        { photo: 2, crop: [0.02, 0.08, 0.96, 0.46], w: 2.3, pos: [0.6, 0.9, -9.7], tilt: 0.05, edges: ["top", "left"] },
        { photo: 9, crop: [0.08, 0.1, 0.84, 0.6], w: 1.7, pos: [-1.2, 2.6, -9.9], tilt: -0.06, edges: ["bottom", "right"] },
        { photo: 7, crop: [0.06, 0.05, 0.88, 0.55], w: 2.1, pos: [3.6, 1.1, -9.5], tilt: 0.08, edges: ["top", "left"] },
        { photo: 4, crop: [0.1, 0.1, 0.8, 0.75], w: 1.9, pos: [-3.5, 1.5, -9.7], tilt: -0.1, edges: ["bottom", "right"] }
      ]
    },
    triptych: [
      { photo: 4, caption: "sábado à tarde", crop: [0.08, 0.04, 0.84, 0.9] },
      { photo: 8, caption: "o combate", crop: [0.06, 0.04, 0.88, 0.9] },
      { photo: 1, caption: "tacadas cruzadas", crop: [0.1, 0.05, 0.8, 0.88] }
    ]
  },

  summer: {
    environment: "riviera",
    pathStyle: "zoomIn",
    // a leitora no barco (cigarro removido); a revista ocupa o canto inferior esquerdo
    hold: { src: "/editorial/hold-summer.jpg", focus: [36, 82], scale: 7 },
    accent: "#5d1f22",
    // vinheta: revista pousada na toalha → zoom → a capa levanta-se →
    // mergulho nas páginas gigantes, onde os recortes se erguem em pop-up
    path: [
      { pos: [3, 3.6, 7.6], look: [0.5, -1.8, 1] },
      { pos: [1.1, 2, 3.6], look: [0.5, -1.8, 1] },
      { pos: [0.55, 1, 1.6], look: [0.4, -1.6, -2.4] },
      { pos: [-0.4, 1.3, -3], look: [0.2, 0.4, -9.4] },
      { pos: [0.4, 1.5, -8.4], look: [0.6, 0.7, -13.6] },
      { pos: [0, 1.7, -12.4], look: [0, 0.9, -17] },
      { pos: [0, 3.6, -15], look: [0, 3.2, -26] }
    ],
    sources: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"].map(
      (n) => `/editorial/esummer-${n}.jpg`
    ),
    essential: [8, 3, 2],
    chapters: {
      openFallback: "O essencial para a época mais longa do ano — do mar ao fim de tarde.",
      spreadQuote: ["A capa abre-se", "como uma porta."],
      collage:
        "Polaroids, recortes e notícias do mar — o verão colado à parede, a secar ao sol.",
      closingQuote: ["As peças esperam", "na última página."]
    },
    cover: {
      photo: 8, // banhistas da riviera com os iates ao fundo
      kicker: "Édition Été — N.º 01",
      italic: "alma de mar",
      footer: "Lounge by Gigi — Lisboa"
    },
    spread: {
      photo: 3, // malha branca na praia, a preto e branco
      photoCaption: "Areia, 9 da manhã",
      headline: ["O verão", "escreve-se à mão."],
      col1: [
        "Nos anos em que as revistas chegavam com cheiro a tinta, o verão começava sempre numa fotografia: alguém de costas para a câmara, o mar a fazer o resto. Esta edição volta a esse lugar.",
        "Malhas brancas sobre pele salgada, toalhas em turbante, rosé às cinco da tarde."
      ],
      col2: [
        "Os fatos de banho desta coleção foram desenhados para durar mais do que uma estação — como as fotografias que se guardam numa caixa de sapatos. O sal fica; a pressa não."
      ],
      inset: { photo: 4, crop: [0.05, 0.2, 0.9, 0.6], caption: "leitura de piscina" }
    },
    collage: {
      base: 2, // as raparigas no veleiro
      word: "A colagem — Lounge Édition Été",
      fragments: [
        { photo: 0, crop: [0.05, 0.05, 0.9, 0.78], w: 2, pos: [-2.1, 1.2, -10.15], tilt: -0.09, edges: ["top", "right"] },
        { photo: 5, crop: [0.16, 0.24, 0.68, 0.5], w: 1.9, pos: [2.3, 2.3, -10.0], tilt: 0.11, edges: ["bottom", "left"] },
        { photo: 10, crop: [0.1, 0.2, 0.8, 0.6], w: 2, pos: [0.6, 0.9, -9.7], tilt: 0.05, edges: ["top", "left"] },
        { photo: 9, crop: [0.05, 0.1, 0.9, 0.7], w: 1.7, pos: [-1.2, 2.6, -9.9], tilt: -0.06, edges: ["bottom", "right"] },
        { photo: 7, crop: [0.1, 0.22, 0.8, 0.56], w: 2.1, pos: [3.6, 1.1, -9.5], tilt: 0.08, edges: ["top", "left"] },
        { photo: 6, crop: [0.1, 0.08, 0.8, 0.75], w: 1.8, pos: [-3.5, 1.5, -9.7], tilt: -0.1, edges: ["bottom", "right"] }
      ]
    },
    stories: [
      { kind: "interlude", photo: 10, caption: "contraluz — sete e meia da tarde" },
      {
        kind: "story",
        flip: true,
        photo: 6,
        caption: "Positano, ao telefone",
        title: "O verão atende devagar.",
        paragraphs: [
          "Na varanda, o roupão branco faz as vezes de vestido de gala. Alguém liga; ninguém tem pressa de atender. As férias verdadeiras medem-se por isto — pela distância entre o toque e a resposta.",
          "As peças de banho desta página vivem bem nessa espera: alças que não marcam, tecidos que secam entre duas chamadas."
        ]
      },
      {
        kind: "duo",
        photos: [9, 5],
        captions: ["rosé, às cinco", "notícias que podem esperar"],
        title: "Pequenos rituais.",
        paragraphs: [
          "O copo servido devagar, o jornal que se lê dentro de água, a página que seca ao sol e fica ondulada para sempre. Nenhum destes gestos é necessário; todos são essenciais.",
          "A coleção foi desenhada à volta deles — do primeiro mergulho ao último brinde."
        ]
      }
    ],
    shopping: {
      title: "As escolhas da edição",
      note: "Peças reais desta coleção — a lista completa espera na última página."
    },
    triptych: [
      { photo: 6, caption: "positano, 19h", crop: [0.08, 0.06, 0.84, 0.86] },
      { photo: 10, caption: "contraluz", crop: [0.08, 0.12, 0.84, 0.78] },
      { photo: 7, caption: "maré baixa", crop: [0.1, 0.2, 0.8, 0.66] }
    ]
  },

  summerMan: {
    environment: "riviera",
    pathStyle: "zoomIn",
    // o fotógrafo na praia; o zoom entra pela objetiva da câmara
    hold: { src: "/editorial/hold-msummer.jpg", focus: [46, 32], scale: 7.5 },
    accent: "#23303a",
    path: [
      { pos: [3, 3.6, 7.6], look: [0.5, -1.8, 1] },
      { pos: [1.1, 2, 3.6], look: [0.5, -1.8, 1] },
      { pos: [0.55, 1, 1.6], look: [0.4, -1.6, -2.4] },
      { pos: [-0.4, 1.3, -3], look: [0.2, 0.4, -9.4] },
      { pos: [0.4, 1.5, -8.4], look: [0.6, 0.7, -13.6] },
      { pos: [0, 1.7, -12.4], look: [0, 0.9, -17] },
      { pos: [0, 3.6, -15], look: [0, 3.2, -26] }
    ],
    sources: ["01", "02", "03", "04", "05", "06", "07", "08", "09"].map(
      (n) => `/editorial/msummer-${n}.jpg`
    ),
    essential: [1, 2, 4],
    chapters: {
      openFallback: "O verão dele: veleiros, calanques e um Alpine azul à sombra.",
      spreadQuote: ["A capa levanta-se", "com a brisa."],
      collage:
        "Recortes de bordo erguem-se das páginas — o mergulho, o carro azul, a polaroid de agosto.",
      closingQuote: ["As peças esperam", "na última página."]
    },
    cover: {
      photo: 1, // de costas no veleiro
      kicker: "Édition Été Homme — N.º 01",
      italic: "mar de agosto",
      footer: "Lounge by Gigi — Lisboa"
    },
    spread: {
      photo: 2, // silhueta na proa ao entardecer
      photoCaption: "Proa, 20h",
      headline: ["Agosto não", "tem pressa."],
      col1: [
        "O verão dele mede-se em milhas e não em horas: a bolina da manhã, o mergulho antes do almoço, a sesta à sombra da vela. As peças desta edição foram feitas para esse calendário.",
        "Calções que secam ao vento, linho amarrotado com orgulho, nada que aperte."
      ],
      col2: [
        "Do convés às calanques, do porto ao bar — a mesma regra da casa: menos logótipos, mais sal. O bronzeado passa; a maneira de estar, não."
      ],
      inset: { photo: 5, crop: [0.1, 0.3, 0.8, 0.55], caption: "calanques, meio-dia" }
    },
    collage: {
      base: 4, // o mergulho do iate, a preto e branco
      word: "A colagem — Lounge Été Homme",
      fragments: [
        { photo: 0, crop: [0.04, 0.04, 0.92, 0.92], w: 2, pos: [-2.1, 1.2, -10.15], tilt: -0.09, edges: ["bottom", "right"] },
        { photo: 6, crop: [0.08, 0.1, 0.84, 0.75], w: 2.1, pos: [2.3, 2.3, -10.0], tilt: 0.11, edges: ["bottom", "left"] },
        { photo: 3, crop: [0.08, 0.12, 0.84, 0.7], w: 1.9, pos: [0.6, 0.9, -9.7], tilt: 0.05, edges: ["top", "left"] },
        { photo: 7, crop: [0.05, 0.05, 0.9, 0.85], w: 1.7, pos: [-3.5, 1.5, -9.7], tilt: -0.1, edges: ["top", "right"] }
      ]
    },
    stories: [
      { kind: "interlude", photo: 4, caption: "o salto — meio-dia em ponto" },
      {
        kind: "story",
        flip: true,
        photo: 7,
        caption: "Rosa, sem cerimónia",
        title: "A cor que agosto pede.",
        paragraphs: [
          "Há homens que ainda pedem licença para usar rosa. Os desta edição não: vestem-no como quem estaciona o barco — sem olhar duas vezes, com a certeza de quem já o fez mil vezes.",
          "Calções de corte limpo, cós que não aperta, rosa lavado pelo sal. O resto é postura."
        ]
      },
      {
        kind: "duo",
        photos: [6, 3],
        captions: ["o azul de agosto", "a rolleiflex do costume"],
        title: "Pequenos rituais dele.",
        paragraphs: [
          "O carro fica à sombra; a câmara vai a todo o lado. Entre um mergulho e o café da tarde, fotografa-se pouco e vive-se muito — a proporção certa.",
          "As peças desta coleção seguem a mesma aritmética: poucas, certas, para todos os dias de sol."
        ]
      }
    ],
    shopping: {
      title: "As escolhas da edição",
      note: "Peças reais desta coleção — a lista completa espera na última página."
    },
    triptych: [
      { photo: 5, caption: "calanques, meio-dia", crop: [0.1, 0.15, 0.8, 0.7] },
      { photo: 6, caption: "o azul de agosto", crop: [0.06, 0.06, 0.88, 0.86] },
      { photo: 0, caption: "polaroid de bordo", crop: [0.05, 0.05, 0.9, 0.9] }
    ]
  }
};
