"use strict";

const obsidian = require("obsidian");
const {
  Plugin,
  ItemView,
  PluginSettingTab,
  Setting,
  TFile,
  Notice,
  Platform,
  Keymap,
  MarkdownView,
  FuzzySuggestModal,
  AbstractInputSuggest,
  TFolder,
  normalizePath,
  requestUrl,
  moment,
  Scope,
  Menu,
} = obsidian;

const VIEW_TYPE = "genkan-view";
const RING_MAIN_NOTE = "Pebble Index.md"; // the ring app's "one main note" target

// Icons for the dashboard (fixed SVG source, parsed once at runtime).
const ICONS = {
  minus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  list: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  "list-ordered": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  link: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  clear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
  export: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
  grip: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>`,
  "arrow-up": `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>`,
  "arrow-down": `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  "arrow-left": `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18"/></svg>`,
  "arrow-right": `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`,
  play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="7,4 20,12 7,20"/></svg>`,
  pause: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`,
  timer: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="9" y1="2" x2="15" y2="2"/></svg>`,
  arrange: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  check: `<svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 3.5 6.5 9 1"/></svg>`,
  trash: `<svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  monitor: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
};

// Built-in daily quotes, used when the ZenQuotes request is off or fails.
const QUOTES = [
  {
    q: "The only way to do great work is to love what you do.",
    a: "Steve Jobs",
  },
  {
    q: "In the middle of every difficulty lies opportunity.",
    a: "Albert Einstein",
  },
  {
    q: "It does not matter how slowly you go as long as you do not stop.",
    a: "Confucius",
  },
  {
    q: "Life is what happens when you’re busy making other plans.",
    a: "John Lennon",
  },
  {
    q: "The future belongs to those who believe in the beauty of their dreams.",
    a: "Eleanor Roosevelt",
  },
  {
    q: "The best time to plant a tree was 20 years ago. The second best time is now.",
    a: "Chinese Proverb",
  },
  { q: "An unexamined life is not worth living.", a: "Socrates" },
  {
    q: "Spread love everywhere you go. Let no one ever come to you without leaving happier.",
    a: "Mother Teresa",
  },
  {
    q: "When you reach the end of your rope, tie a knot in it and hang on.",
    a: "Franklin D. Roosevelt",
  },
  {
    q: "Don’t judge each day by the harvest you reap but by the seeds that you plant.",
    a: "Robert Louis Stevenson",
  },
  {
    q: "The only impossible journey is the one you never begin.",
    a: "Tony Robbins",
  },
  {
    q: "It is during our darkest moments that we must focus to see the light.",
    a: "Aristotle",
  },
  {
    q: "Do not go where the path may lead; go instead where there is no path and leave a trail.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    a: "Nelson Mandela",
  },
  {
    q: "In the end, it’s not the years in your life that count. It’s the life in your years.",
    a: "Abraham Lincoln",
  },
  {
    q: "Life is either a daring adventure or nothing at all.",
    a: "Helen Keller",
  },
  {
    q: "Your time is limited, so don’t waste it living someone else’s life.",
    a: "Steve Jobs",
  },
  {
    q: "The happiness of your life depends upon the quality of your thoughts.",
    a: "Marcus Aurelius",
  },
  {
    q: "Nothing is impossible — the word itself says ‘I’m possible’.",
    a: "Audrey Hepburn",
  },
  {
    q: "Keep your face always toward the sunshine, and shadows will fall behind you.",
    a: "Walt Whitman",
  },
  {
    q: "Whether you think you can or think you can’t, you’re right.",
    a: "Henry Ford",
  },
  {
    q: "The only person you are destined to become is the person you decide to be.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "Go confidently in the direction of your dreams. Live the life you have imagined.",
    a: "Henry David Thoreau",
  },
  { q: "Believe you can and you’re halfway there.", a: "Theodore Roosevelt" },
  {
    q: "Everything you’ve ever wanted is on the other side of fear.",
    a: "George Addair",
  },
  {
    q: "I am not a product of my circumstances. I am a product of my decisions.",
    a: "Stephen Covey",
  },
  {
    q: "Live in the sunshine, swim the sea, drink the wild air.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "Not how long, but how well you have lived is the main thing.",
    a: "Seneca",
  },
  {
    q: "It is never too late to be what you might have been.",
    a: "George Eliot",
  },
  {
    q: "We generate fears while we sit. We overcome them by action.",
    a: "Dr. Henry Link",
  },
  { q: "Turn your wounds into wisdom.", a: "Oprah Winfrey" },
  {
    q: "I would rather die of passion than of boredom.",
    a: "Vincent van Gogh",
  },
  { q: "You become what you believe.", a: "Oprah Winfrey" },
  { q: "Dream big and dare to fail.", a: "Norman Vaughan" },
  {
    q: "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    a: "Goethe",
  },
  {
    q: "Security is mostly a superstition. Life is either a daring adventure or nothing.",
    a: "Helen Keller",
  },
  {
    q: "The whole secret of a successful life is to find out what is one’s destiny to do, and then do it.",
    a: "Henry Ford",
  },
  {
    q: "You will face many defeats in life, but never let yourself be defeated.",
    a: "Maya Angelou",
  },
  {
    q: "We know what we are, but know not what we may be.",
    a: "William Shakespeare",
  },
  {
    q: "What you do speaks so loudly that I cannot hear what you say.",
    a: "Ralph Waldo Emerson",
  },
  {
    q: "You have to be where you are to get where you need to go.",
    a: "Amy Poehler",
  },
  {
    q: "If you want to live a happy life, tie it to a goal, not to people or things.",
    a: "Albert Einstein",
  },
  { q: "Simplicity is the ultimate sophistication.", a: "Leonardo da Vinci" },
  { q: "The mind is everything. What you think you become.", a: "Buddha" },
  {
    q: "Strive not to be a success, but rather to be of value.",
    a: "Albert Einstein",
  },
  {
    q: "Two roads diverged in a wood, and I — I took the one less traveled by.",
    a: "Robert Frost",
  },
  {
    q: "I have not failed. I’ve just found 10,000 ways that won’t work.",
    a: "Thomas Edison",
  },
  {
    q: "A person who never made a mistake never tried anything new.",
    a: "Albert Einstein",
  },
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "It always seems impossible until it is done.", a: "Nelson Mandela" },
  {
    q: "Act as if what you do makes a difference. It does.",
    a: "William James",
  },
  {
    q: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    a: "Winston Churchill",
  },
  {
    q: "Happiness is not something ready-made. It comes from your own actions.",
    a: "Dalai Lama",
  },
  { q: "If you’re going through hell, keep going.", a: "Winston Churchill" },
  {
    q: "We must accept finite disappointment, but never lose infinite hope.",
    a: "Martin Luther King Jr.",
  },
  {
    q: "Do what you can, with what you have, where you are.",
    a: "Theodore Roosevelt",
  },
  {
    q: "Start where you are. Use what you have. Do what you can.",
    a: "Arthur Ashe",
  },
  { q: "When one door of happiness closes, another opens.", a: "Helen Keller" },
  {
    q: "The only way out of the labyrinth of suffering is to forgive.",
    a: "John Green",
  },
  {
    q: "Give every day the chance to become the most beautiful day of your life.",
    a: "Mark Twain",
  },
  {
    q: "If you tell the truth, you don’t have to remember anything.",
    a: "Mark Twain",
  },
  {
    q: "A friend is someone who knows all about you and still loves you.",
    a: "Elbert Hubbard",
  },
  {
    q: "To the world you may be one person, but to one person you may be the world.",
    a: "Dr. Seuss",
  },
  {
    q: "In three words I can sum up everything I’ve learned about life: it goes on.",
    a: "Robert Frost",
  },
  {
    q: "If you want to go fast, go alone. If you want to go far, go together.",
    a: "African Proverb",
  },
  {
    q: "Darkness cannot drive out darkness; only light can do that.",
    a: "Martin Luther King Jr.",
  },
  {
    q: "Learn as if you will live forever, live like you will die tomorrow.",
    a: "Mahatma Gandhi",
  },
  { q: "Be the change you wish to see in the world.", a: "Mahatma Gandhi" },
  {
    q: "Spread love everywhere you go; let no one ever come to you without leaving happier.",
    a: "Mother Teresa",
  },
  { q: "You miss 100% of the shots you don’t take.", a: "Wayne Gretzky" },
  { q: "Every moment is a fresh beginning.", a: "T.S. Eliot" },
  { q: "Never regret anything that made you smile.", a: "Mark Twain" },
  { q: "Die with memories, not dreams.", a: "Unknown" },
  { q: "Aspire to inspire before we expire.", a: "Unknown" },
  { q: "Be yourself; everyone else is already taken.", a: "Oscar Wilde" },
  {
    q: "You only live once, but if you do it right, once is enough.",
    a: "Mae West",
  },
  {
    q: "In the beginning was the Word, and the Word was with God, and the Word was God.",
    a: "John 1:1",
  },
  {
    q: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
    a: "Ralph Waldo Emerson",
  },
];

// Built-in quotes in the other interface languages: quotations in their original language,
// plus a few proverbs. Used when the quote source is the bundled list, or when a request fails.
const QUOTES_I18N = {
  fr: [
    { q: "Je pense, donc je suis.", a: "René Descartes" },
    { q: "Le cœur a ses raisons que la raison ne connaît point.", a: "Blaise Pascal" },
    { q: "Cultivons notre jardin.", a: "Voltaire" },
    { q: "Le doute n’est pas un état agréable, mais l’assurance est un état ridicule.", a: "Voltaire" },
    { q: "On résiste à l’invasion des armées ; on ne résiste pas à l’invasion des idées.", a: "Victor Hugo" },
    { q: "Il n’y a qu’un bonheur dans la vie, c’est d’aimer et d’être aimé.", a: "George Sand" },
    { q: "On ne voit bien qu’avec le cœur. L’essentiel est invisible pour les yeux.", a: "Antoine de Saint-Exupéry" },
    { q: "Ce qui embellit le désert, c’est qu’il cache un puits quelque part.", a: "Antoine de Saint-Exupéry" },
    { q: "Il faut imaginer Sisyphe heureux.", a: "Albert Camus" },
    { q: "Au milieu de l’hiver, j’apprenais enfin qu’il y avait en moi un été invincible.", a: "Albert Camus" },
    { q: "Rien ne sert de courir ; il faut partir à point.", a: "Jean de La Fontaine" },
    { q: "Patience et longueur de temps font plus que force ni que rage.", a: "Jean de La Fontaine" },
    { q: "Le bonheur n’est pas chose aisée : il est très difficile de le trouver en nous, et impossible de le trouver ailleurs.", a: "Chamfort" },
    { q: "Le temps est un grand maître, dit-on ; le malheur est qu’il tue ses élèves.", a: "Hector Berlioz" },
  ],
  es: [
    { q: "El que lee mucho y anda mucho, ve mucho y sabe mucho.", a: "Miguel de Cervantes" },
    { q: "La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.", a: "Miguel de Cervantes" },
    { q: "Caminante, no hay camino, se hace camino al andar.", a: "Antonio Machado" },
    { q: "Yo soy yo y mi circunstancia, y si no la salvo a ella no me salvo yo.", a: "José Ortega y Gasset" },
    { q: "Confieso que he vivido.", a: "Pablo Neruda" },
    { q: "La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.", a: "Gabriel García Márquez" },
    { q: "Los sueños, sueños son.", a: "Pedro Calderón de la Barca" },
    { q: "A quien madruga, Dios le ayuda.", a: "Proverbio español" },
    { q: "Poco a poco se va lejos.", a: "Proverbio español" },
    { q: "No hay mal que por bien no venga.", a: "Proverbio español" },
    { q: "Más vale tarde que nunca.", a: "Proverbio español" },
    { q: "Quien canta, su mal espanta.", a: "Proverbio español" },
    { q: "Del dicho al hecho hay mucho trecho.", a: "Proverbio español" },
  ],
  de: [
    { q: "Es irrt der Mensch, solang er strebt.", a: "Johann Wolfgang von Goethe" },
    { q: "Wer immer strebend sich bemüht, den können wir erlösen.", a: "Johann Wolfgang von Goethe" },
    { q: "Was du ererbt von deinen Vätern hast, erwirb es, um es zu besitzen.", a: "Johann Wolfgang von Goethe" },
    { q: "Der Mensch ist nur da ganz Mensch, wo er spielt.", a: "Friedrich Schiller" },
    { q: "Habe Mut, dich deines eigenen Verstandes zu bedienen!", a: "Immanuel Kant" },
    { q: "Der bestirnte Himmel über mir und das moralische Gesetz in mir.", a: "Immanuel Kant" },
    { q: "Wer ein Warum zu leben hat, erträgt fast jedes Wie.", a: "Friedrich Nietzsche" },
    { q: "Ohne Musik wäre das Leben ein Irrtum.", a: "Friedrich Nietzsche" },
    { q: "Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.", a: "Ludwig Wittgenstein" },
    { q: "Jedem Anfang wohnt ein Zauber inne.", a: "Hermann Hesse" },
    { q: "Es gibt nichts Gutes, außer: Man tut es.", a: "Erich Kästner" },
    { q: "Die Gedanken sind frei.", a: "Volkslied" },
  ],
  ja: [
    { q: "一期一会", a: "茶道の言葉" },
    { q: "初心忘るべからず", a: "世阿弥" },
    { q: "月日は百代の過客にして、行きかふ年もまた旅人なり。", a: "松尾芭蕉" },
    { q: "古池や蛙飛びこむ水の音", a: "松尾芭蕉" },
    { q: "春はあけぼの。やうやう白くなりゆく山ぎは、少しあかりて、紫だちたる雲のほそくたなびきたる。", a: "清少納言" },
    { q: "天は人の上に人を造らず、人の下に人を造らずと云えり。", a: "福澤諭吉" },
    { q: "雨にも負けず 風にも負けず", a: "宮沢賢治" },
    { q: "千里の道も一歩から", a: "老子" },
    { q: "知るを知るとなし、知らざるを知らずとせよ。これ知るなり。", a: "孔子" },
    { q: "継続は力なり", a: "ことわざ" },
    { q: "七転び八起き", a: "ことわざ" },
    { q: "急がば回れ", a: "ことわざ" },
    { q: "雨降って地固まる", a: "ことわざ" },
    { q: "石の上にも三年", a: "ことわざ" },
  ],
};

// Translations, keyed by the English source text (see T() in main.template.js).
// {name} marks a value filled in at run time and must be kept as written.
// "name suffix" is appended after the name in the greeting (Japanese "さん").
const I18N = {
  en: {},

  fr: {
    "Add a note to your homepage favourites…": "Ajouter une note aux favoris de la page d’accueil…",
    "Refresh": "Actualiser",
    "Toggle theme": "Changer de thème",
    "Settings": "Réglages",
    "Open settings": "Ouvrir les réglages",
    "Search your vault…": "Rechercher dans votre coffre…",
    "Search your vault": "Rechercher dans votre coffre",
    "Clear search": "Effacer la recherche",
    "Search results": "Résultats de la recherche",
    "Photo of the day": "Photo du jour",
    "Clock and search over the photo": "Horloge et recherche sur la photo",
    "Lays the greeting, clock, date and search box over the photo of the day instead of above it, which saves vertical space. The photo is darkened a little so the text stays readable, so very bright photos look duller. Needs the photo of the day.": "Place le message d'accueil, l'horloge, la date et la recherche sur la photo du jour au lieu de les mettre au-dessus, ce qui économise de la place en hauteur. La photo est un peu assombrie pour que le texte reste lisible ; les photos très claires paraissent donc plus ternes. Nécessite la photo du jour.",
    "Load a new photo": "Charger une nouvelle photo",
    "Load new photo": "Charger une nouvelle photo",
    "Inspirational quotes provided by": "Citations inspirantes fournies par",
    "Favourites": "Favoris",
    "Calendar": "Calendrier",
    "Previous month": "Mois précédent",
    "Next month": "Mois suivant",
    "Today": "Aujourd’hui",
    "Quick links": "Liens rapides",
    "Ring notes": "Notes de la bague",
    "Open the notes file": "Ouvrir le fichier de notes",
    "Open": "Ouvrir",
    "Web clips": "Clips web",
    "Refresh clips": "Actualiser les clips",
    "Refresh web clips": "Actualiser les clips web",
    "Recent notes": "Notes récentes",
    "Refresh recent notes": "Actualiser les notes récentes",
    "Tasks": "Tâches",
    "Add a task and press Enter…": "Ajouter une tâche…",
    "New task": "Nouvelle tâche",
    "Filter tasks": "Filtrer les tâches",
    "All": "Toutes",
    "Active": "En cours",
    "Done": "Terminées",
    "Clear completed": "Effacer les tâches terminées",
    "Saved": "Enregistré",
    "Jot something down…": "Notez quelque chose…",
    "Homepage": "Page d’accueil",
    "Note not found: {path}": "Note introuvable : {path}",
    "Dark": "Sombre",
    "Light": "Clair",
    "System ({mode})": "Système ({mode})",
    "Appearance: {label} — click to change": "Apparence : {label} — cliquer pour changer",
    "Good morning": "Bonjour",
    "Good afternoon": "Bon après-midi",
    "Good evening": "Bonsoir",
    "Good night": "Bonne nuit",
    "Could not create daily note: {error}": "Impossible de créer la note quotidienne : {error}",
    "Could not update tasks: {error}": "Impossible de mettre à jour les tâches : {error}",
    "No completed tasks yet.": "Aucune tâche terminée pour l’instant.",
    "Nothing left to do!": "Il ne reste rien à faire !",
    "No tasks yet — add one above.": "Aucune tâche — ajoutez-en une ci-dessus.",
    "Mark incomplete": "Marquer comme non terminée",
    "Mark complete": "Marquer comme terminée",
    "Delete": "Supprimer",
    "Delete: {task}": "Supprimer : {task}",
    "Could not save quick note: {error}": "Impossible d’enregistrer la note rapide : {error}",
    "No quick links configured.": "Aucun lien rapide configuré.",
    "Command not found: {id}": "Commande introuvable : {id}",
    "Unknown quick link action: {action}": "Action de lien rapide inconnue : {action}",
    "Yesterday": "Hier",
    "Choose the folder your ring saves notes to in Genkan's settings.": "Choisissez dans les réglages de Genkan le dossier où votre bague enregistre les notes.",
    "No notes found in “{folder}”.": "Aucune note trouvée dans « {folder} ».",
    "No ring notes yet. Looking for “{path}”.": "Aucune note de la bague pour l’instant. Recherche de « {path} ».",
    "No timestamped entries found in “{path}”.": "Aucune entrée horodatée trouvée dans « {path} ».",
    "Not found — click to create": "Introuvable — cliquer pour créer",
    "Remove from favourites": "Retirer des favoris",
    "Remove {label} from favourites": "Retirer {label} des favoris",
    "Add a favourite": "Ajouter un favori",
    "+ Add": "+ Ajouter",
    "Pin the notes you open most. You can also right-click any note → “Add to homepage favourites”.": "Épinglez les notes que vous ouvrez le plus. Vous pouvez aussi faire un clic droit sur une note → « Ajouter aux favoris de la page d’accueil ».",
    "No clips found in “{folder}”.": "Aucun clip trouvé dans « {folder} ».",
    "(no folder set)": "(aucun dossier défini)",
    "No notes found.": "Aucune note trouvée.",
    "↻ Searching…": "↻ Recherche en cours…",
    "No results for “{query}”": "Aucun résultat pour « {query} »",
    "Nature photo": "Photo de nature",
    "Landscape photo of the day": "Photo de paysage du jour",
    "Photo by {photographer} on {site}": "Photo de {photographer} sur {site}",
    "Photo from {site}": "Photo de {site}",
    "Your name": "Votre prénom",
    "Shown in the greeting.": "Affiché dans le message d’accueil.",
    "e.g. Alex": "p. ex. Alex",
    "Open on startup": "Ouvrir au démarrage",
    "Open the homepage when Obsidian starts.": "Ouvrir la page d’accueil au démarrage d’Obsidian.",
    "Appearance": "Apparence",
    "System follows Obsidian's light/dark theme.": "« Système » suit le thème clair ou sombre d’Obsidian.",
    "System": "Système",
    "Clock format": "Format de l’heure",
    "12-hour (AM/PM)": "12 heures (AM/PM)",
    "24-hour": "24 heures",
    "Language": "Langue",
    "Automatic follows Obsidian's language setting.": "« Automatique » suit la langue d’Obsidian.",
    "Automatic": "Automatique",
    "Spelling": "Orthographe",
    "Automatic follows your device's region. Command names change after you restart Obsidian.": "« Automatique » suit la région de votre appareil. Les noms des commandes changent après le redémarrage d’Obsidian.",
    "American (favorite)": "Américaine (favorite)",
    "British (favourite)": "Britannique (favourite)",
    "First day of the week": "Premier jour de la semaine",
    "Automatic follows your device's region.": "« Automatique » suit la région de votre appareil.",
    "Sunday": "Dimanche",
    "Monday": "Lundi",
    "Saturday": "Samedi",
    "Custom clock font": "Police personnalisée de l’horloge",
    "The name of a font installed on this device, such as Courier New or Avenir Next. A device without it uses the dashboard font.": "Le nom d’une police installée sur cet appareil, comme Courier New ou Avenir Next. Un appareil qui ne l’a pas utilise la police du tableau de bord.",
    "Font name": "Nom de la police",
    "Clock font": "Police de l’horloge",
    "Uses fonts already on your device. Your Obsidian theme's fonts are available too.": "Utilise les polices déjà présentes sur votre appareil. Les polices de votre thème Obsidian sont aussi disponibles.",
    "Folders": "Dossiers",
    "Web Clipper folder": "Dossier du Web Clipper",
    "Where the Web Clipper saves notes.": "L’endroit où le Web Clipper enregistre les notes.",
    "Daily notes folder": "Dossier des notes quotidiennes",
    "Leave blank to use your Daily Notes / Periodic Notes settings.": "Laissez vide pour utiliser les réglages de Notes quotidiennes / Periodic Notes.",
    "Data folder": "Dossier des données",
    "Tasks.md and Quick Note.md are stored here, so Obsidian Sync shares them across devices.": "Tasks.md et Quick Note.md sont stockés ici, afin qu’Obsidian Sync les partage entre vos appareils.",
    "Content": "Contenu",
    "Max web clips": "Nombre max. de clips web",
    "Max recent notes": "Nombre max. de notes récentes",
    "Pebble ring notes": "Notes de la bague Pebble",
    "Show the latest voice notes from your Pebble Index ring.": "Afficher les dernières notes vocales de votre bague Pebble Index.",
    "Ring note": "Note de la bague",
    "The note the ring adds your voice notes to, with entries under headings like “## 2026-10-05 21:55”.": "La note à laquelle la bague ajoute vos notes vocales, avec des entrées sous des titres comme « ## 2026-10-05 21:55 ».",
    "Ring notes folder": "Dossier des notes de la bague",
    "The folder the ring saves each voice note into, one file per note.": "Le dossier où la bague enregistre chaque note vocale, un fichier par note.",
    "Where does the ring save notes?": "Où la bague enregistre-t-elle les notes ?",
    "Match the Obsidian setting in the Pebble app.": "Choisissez le même réglage Obsidian que dans l’application Pebble.",
    "One main note (Pebble Index.md)": "Une note principale (Pebble Index.md)",
    "An existing note I choose": "Une note existante que je choisis",
    "A separate file for each note": "Un fichier distinct pour chaque note",
    "Max ring notes": "Nombre max. de notes de la bague",
    "Shows a landscape photo from Picsum, or from Unsplash if you add a key below. Off means no photo is requested.": "Affiche une photo de paysage de Picsum, ou d’Unsplash si vous ajoutez une clé ci-dessous. Désactivé : aucune photo n’est demandée.",
    "Unsplash access key": "Clé d’accès Unsplash",
    "Optional. Enables nature photos from Unsplash with attribution. The key is stored in this plugin's settings file in your vault.": "Facultatif. Active les photos de nature d’Unsplash avec attribution. La clé est stockée dans le fichier de réglages de ce plugin, dans votre coffre.",
    "Daily quote": "Citation du jour",
    "Site icons on web clips": "Icônes de site sur les clips web",
    "Uses Google's favicon service, which receives the domain of each clipped page. Off means no icon requests.": "Utilise le service de favicons de Google, qui reçoit le domaine de chaque page clippée. Désactivé : aucune icône n’est demandée.",
    "One per line: icon | label | action. Actions: command:<command id>, open:<note path>, daily, random, or an https:// URL.": "Un par ligne : icône | libellé | action. Actions : command:<id de la commande>, open:<chemin de la note>, daily, random ou une URL https://.",
    "Open homepage": "Ouvrir la page d’accueil",
    "Add or remove current note from homepage favourites": "Ajouter ou retirer la note actuelle des favoris de la page d’accueil",
    "Add a note to homepage favourites…": "Ajouter une note aux favoris de la page d’accueil…",
    "Remove from homepage favourites": "Retirer des favoris de la page d’accueil",
    "Add to homepage favourites": "Ajouter aux favoris de la page d’accueil",
    "Add or remove from homepage favourites": "Ajouter ou retirer des favoris de la page d’accueil",
    "{name} is already a favourite": "{name} est déjà un favori",
    "Added {name} to favourites": "{name} ajouté aux favoris",
    "Could not add favourite: {error}": "Impossible d’ajouter le favori : {error}",
    "Removed {name} from favourites": "{name} retiré des favoris",
    "Dashboard default": "Par défaut du tableau de bord",
    "Obsidian interface font": "Police d’interface d’Obsidian",
    "Obsidian text font": "Police de texte d’Obsidian",
    "Obsidian monospace font": "Police à chasse fixe d’Obsidian",
    "System serif": "Police à empattements du système",
    "Custom (a font installed on this device)": "Personnalisée (une police installée sur cet appareil)",
    "New Note": "Nouvelle note",
    "Today's Note": "Note du jour",
    "Search Vault": "Rechercher dans le coffre",
    "Graph View": "Vue graphique",
    "Random Note": "Note aléatoire",
    "Shows a quote each day. Off means no quote is shown and none is requested.": "Affiche une citation chaque jour. Désactivé : aucune citation n’est affichée ni demandée.",
    "Quote source": "Source des citations",
    "ZenQuotes and Echoes are fetched once a day over the network, and ZenQuotes is English only. The bundled list works offline.": "ZenQuotes et Echoes sont récupérées une fois par jour via le réseau, et ZenQuotes est uniquement en anglais. La liste intégrée fonctionne hors ligne.",
    "ZenQuotes (English)": "ZenQuotes (anglais)",
    "Echoes (your language)": "Echoes (votre langue)",
    "Bundled list (your language)": "Liste intégrée (votre langue)",
    "Formatting": "Mise en forme",
    "Bold": "Gras",
    "Italic": "Italique",
    "Underline": "Souligné",
    "Strikethrough": "Barré",
    "Heading": "Titre",
    "Bulleted list": "Liste à puces",
    "Numbered list": "Liste numérotée",
    "Link": "Lien",
    "Link address": "Adresse du lien",
    "Apply": "Appliquer",
    "Cancel": "Annuler",
    "That kind of link isn't supported.": "Ce type de lien n’est pas pris en charge.",
    "This note has formatting the editor can't show, so it appears as plain text.": "Cette note contient une mise en forme que l’éditeur ne peut pas afficher ; elle apparaît donc en texte brut.",
    "Quick notes": "Notes rapides",
    "Just now": "À l’instant",
    "{n} line": "{n} ligne",
    "{n} lines": "{n} lignes",
    "{n} word": "{n} mot",
    "{n} words": "{n} mots",
    "{n} character": "{n} caractère",
    "{n} characters": "{n} caractères",
    "Note {n}, has text": "Note {n}, avec du texte",
    "Note {n}, empty": "Note {n}, vide",
    "Unsaved changes": "Modifications non enregistrées",
    "Quick note {n}": "Note rapide {n}",
    "Collapse {name}": "Réduire {name}",
    "xkcd comic of the day": "Bande dessinée xkcd du jour",
    "Shows one xkcd comic a day, the same one on all your devices, with buttons to browse others. Today's comic loads from xkcd.com once a day and its image whenever the dashboard opens; browsing loads more. Off means nothing is requested.": "Affiche une bande dessinée xkcd par jour, la même sur tous vos appareils, avec des boutons pour en parcourir d'autres. Celle du jour est chargée depuis xkcd.com une fois par jour et son image à chaque ouverture du tableau de bord ; parcourir en charge d'autres. Désactivé, rien n'est demandé.",
    "Loading the comic…": "Chargement de la bande dessinée…",
    "Couldn't load today's comic.": "Impossible de charger la bande dessinée du jour.",
    "Try again": "Réessayer",
    "By Randall Munroe": "Par Randall Munroe",
    "Explain this comic": "Expliquer cette bande dessinée",
    "Vault stats": "Statistiques du coffre",
    "A summary of your vault: a 12-week heatmap of the days you wrote, your streak, counts of notes, orphan notes, unresolved links and open tasks, and your top tags. Worked out on your device from file dates and links; nothing is sent anywhere.": "Un résumé de votre coffre : une carte de chaleur sur 12 semaines des jours où vous avez écrit, votre série, le nombre de notes, de notes orphelines, de liens non résolus et de tâches ouvertes, et vos principaux tags. Calculé sur votre appareil à partir des dates des fichiers et des liens ; rien n'est envoyé.",
    "Notes created or edited each day over the last 12 weeks. {streak}": "Notes créées ou modifiées chaque jour au cours des 12 dernières semaines. {streak}",
    "{n}-day streak": "Série de {n} jours",
    "No current streak": "Aucune série en cours",
    "Notes on {date}: {n}": "Notes le {date} : {n}",
    "Less": "Moins",
    "More": "Plus",
    "day streak": "jours d'affilée",
    "created in 12 weeks": "créées en 12 semaines",
    "Notes": "Notes",
    "Orphan notes": "Notes orphelines",
    "Unresolved links": "Liens non résolus",
    "Open tasks": "Tâches ouvertes",
    "Show the {n} orphan notes": "Afficher les {n} notes orphelines",
    "Show the {n} unresolved links": "Afficher les {n} liens non résolus",
    "Top tags": "Tags principaux",
    "Search for {tag}": "Rechercher {tag}",
    "Based on file dates": "D'après les dates des fichiers",
    "Updated {time}": "Mis à jour à {time}",
    "Back": "Retour",
    "No orphan notes.": "Aucune note orpheline.",
    "No unresolved links.": "Aucun lien non résolu.",
    "in {note}": "dans {note}",
    "Archived ({n})": "Archivés ({n})",
    "Archived": "Archivés",
    "Archive project": "Archiver le projet",
    "Unarchive project": "Désarchiver le projet",
    "Archived project {name}": "Projet {name} archivé",
    "Unarchived project {name}": "Projet {name} désarchivé",
    "No active projects. Add one above, or open Archived below.": "Aucun projet actif. Ajoutez-en un ci-dessus, ou ouvrez Archivés ci-dessous.",
    "No tasks.": "Aucune tâche.",
    "This project is archived. Unarchive it from Edit project to add tasks or start timers.": "Ce projet est archivé. Désarchivez-le depuis Modifier le projet pour ajouter des tâches ou lancer des minuteurs.",
    "Archived project: timers are off": "Projet archivé : minuteurs désactivés",
    "Archived: its time still counts in reports and the weekly summary. Unarchive it to add tasks or start timers.": "Archivé : son temps compte toujours dans les rapports et le résumé hebdomadaire. Désarchivez-le pour ajouter des tâches ou lancer des minuteurs.",
    "Archive a finished project to tuck it away. Its time still counts in reports and the weekly summary, but you can't start timers or add tasks until you unarchive it.": "Archivez un projet terminé pour le ranger. Son temps compte toujours dans les rapports et le résumé hebdomadaire, mais vous ne pouvez plus lancer de minuteurs ni ajouter de tâches tant qu'il n'est pas désarchivé.",
    "Previous comic": "Bande dessinée précédente",
    "Next comic": "Bande dessinée suivante",
    "Random comic": "Bande dessinée au hasard",
    "Random": "Au hasard",
    "Back to today's comic": "Revenir à la bande dessinée du jour",
    "Couldn't load that comic.": "Impossible de charger cette bande dessinée.",
    "xkcd {num}: {title}": "xkcd {num} : {title}",
    "Open in Obsidian (Surfing)": "Ouvrir dans Obsidian (Surfing)",
    "Open in the default browser": "Ouvrir dans le navigateur par défaut",
    "Copy link": "Copier le lien",
    "Link copied.": "Lien copié.",
    "Could not copy the link.": "Impossible de copier le lien.",
    "Running timer": "Minuteur en cours",
    "Open {task}": "Ouvrir {task}",
    "Running timer display": "Affichage du minuteur en cours",
    "Show the running timer where you can always see it: in Obsidian's status bar on desktop, or at the top of the dashboard on phones and tablets. Click it to open the task. Needs the Time tracker.": "Affiche le minuteur en cours là où vous le voyez toujours : dans la barre d’état d’Obsidian sur ordinateur, ou en haut du tableau de bord sur téléphone et tablette. Cliquez dessus pour ouvrir la tâche. Nécessite le suivi du temps.",
    "Pause or resume the time tracker timer": "Mettre en pause ou reprendre le minuteur du suivi du temps",
    "Stop the time tracker timer": "Arrêter le minuteur du suivi du temps",
    "Timer running: {task}. Open it in the time tracker.": "Minuteur en cours : {task}. L’ouvrir dans le suivi du temps.",
    "No timer to resume. Start one from the Time tracker card.": "Aucun minuteur à reprendre. Démarrez-en un depuis la carte Suivi du temps.",
    "No timer is running.": "Aucun minuteur en cours.",
    "Start date": "Date de début",
    "Start time": "Heure de début",
    "End date": "Date de fin",
    "End time": "Heure de fin",
    "Choose a start and an end, each with a day and a time.": "Choisissez un début et une fin, chacun avec un jour et une heure.",
    "The end must be after the start. Check the end date.": "La fin doit être postérieure au début. Vérifiez la date de fin.",
    "This adds {time}": "Ajoute {time}",
    "Add time": "Ajouter du temps",
    "Add time manually": "Ajouter du temps manuellement",
    "That time is in the future.": "Cette heure est dans le futur.",
    "Added {time} to {task}": "{time} ajouté à {task}",
    "Could not save the time tracker's data.": "Impossible d’enregistrer les données du suivi du temps.",
    "Budget, all time": "Budget, tout le temps",
    "Add a task and press Enter": "Ajoutez une tâche et appuyez sur Entrée",
    "Added project {name}": "Projet {name} ajouté",
    "Added task {name}": "Tâche {name} ajoutée",
    "All projects": "Tous les projets",
    "All today": "Tout aujourd’hui",
    "Allocated": "Alloué",
    "Allocated (hours)": "Alloué (heures)",
    "Allocated hours": "Heures allouées",
    "Allocated minutes": "Minutes allouées",
    "Allocated time": "Temps alloué",
    "Allocated time for the whole project": "Temps alloué pour l’ensemble du projet",
    "Blue": "Bleu",
    "Choose a start date that is not after the end date.": "Choisissez une date de début qui ne soit pas postérieure à la date de fin.",
    "Click again to confirm": "Cliquez à nouveau pour confirmer",
    "Colour": "Couleur",
    "Confirm: {action}": "Confirmer : {action}",
    "Could not export the time report.": "Impossible d’exporter le rapport de temps.",
    "Custom range": "Période personnalisée",
    "Date": "Date",
    "Delete project and its tasks": "Supprimer le projet et ses tâches",
    "Delete session {when}": "Supprimer la session {when}",
    "Delete task": "Supprimer la tâche",
    "Deleted project {name}": "Projet {name} supprimé",
    "Deleted task {name}": "Tâche {name} supprimée",
    "Deleted the session {when}": "Session {when} supprimée",
    "Duration": "Durée",
    "Edit project": "Modifier le projet",
    "End": "Fin",
    "Export": "Exporter",
    "Export {format}": "Exporter en {format}",
    "From": "Du",
    "Generated {date}": "Généré le {date}",
    "Gold": "Or",
    "Green": "Vert",
    "High": "Haute",
    "Hours": "Heures",
    "Last month": "Le mois dernier",
    "Last week": "La semaine dernière",
    "Leave this blank to add up the time allocated to each task instead.": "Laissez vide pour additionner le temps alloué à chaque tâche.",
    "Low": "Basse",
    "Marked done": "Terminée",
    "Medium": "Moyenne",
    "Name": "Nom",
    "New project or company": "Nouveau projet ou entreprise",
    "New project or company…": "Nouveau projet ou entreprise…",
    "Next week": "Semaine suivante",
    "No projects yet. Add a client or project to start tracking time.": "Aucun projet pour l’instant. Ajoutez un client ou un projet pour suivre votre temps.",
    "No sessions": "Aucune session",
    "No tasks yet. Add one above.": "Aucune tâche pour l’instant. Ajoutez-en une ci-dessus.",
    "No time limit": "Aucune limite de temps",
    "No time was tracked in this period.": "Aucun temps n’a été enregistré sur cette période.",
    "No time was tracked this week.": "Aucun temps n’a été enregistré cette semaine.",
    "None": "Aucune",
    "Orange": "Orange",
    "Pause": "Pause",
    "Pause timer: {task}": "Mettre le minuteur en pause : {task}",
    "Paused": "En pause",
    "Paused {task} at {time}": "{task} mis en pause à {time}",
    "Paused {task}: Obsidian was closed or the computer was asleep. The timer stopped at {time}.": "{task} mis en pause : Obsidian était fermé ou l’ordinateur en veille. Le minuteur s’est arrêté à {time}.",
    "Period": "Période",
    "Pink": "Rose",
    "Previous week": "Semaine précédente",
    "Priority": "Priorité",
    "Project": "Projet",
    "Project / task": "Projet / tâche",
    "Projects": "Projets",
    "Red": "Rouge",
    "Remaining": "Restant",
    "Remaining (hours)": "Restant (heures)",
    "Report": "Rapport",
    "Resume": "Reprendre",
    "Resume timer: {task}": "Reprendre le minuteur : {task}",
    "Running": "En cours",
    "Running: {task}": "En cours : {task}",
    "Sessions": "Sessions",
    "Start": "Début",
    "Start timer: {task}": "Démarrer le minuteur : {task}",
    "Started the timer for {task}": "Minuteur démarré pour {task}",
    "Stop": "Arrêter",
    "Stop timer: {task}": "Arrêter le minuteur : {task}",
    "Stopped {task} at {time}": "{task} arrêté à {time}",
    "Summary": "Résumé",
    "Task": "Tâche",
    "Teal": "Turquoise",
    "There is no tracked time in this period to export.": "Aucun temps enregistré à exporter sur cette période.",
    "This month": "Ce mois-ci",
    "This session {time}": "Cette session {time}",
    "This week": "Cette semaine",
    "Time": "Heure",
    "Time by project": "Temps par projet",
    "Time report": "Rapport de temps",
    "Time tracker": "Suivi du temps",
    "Time tracker views": "Vues du suivi du temps",
    "To": "Au",
    "Total": "Total",
    "Total time on this task": "Temps total sur cette tâche",
    "Tracked": "Suivi",
    "Tracked all time (hours)": "Suivi au total (heures)",
    "Tracked in range (hours)": "Suivi sur la période (heures)",
    "Untitled project": "Projet sans titre",
    "Violet": "Violet",
    "Week": "Semaine",
    "Weekly summary": "Résumé hebdomadaire",
    "hours": "heures",
    "now": "en cours",
    "priority": "priorité",
    "to": "au",
    "{n} session": "{n} session",
    "{n} sessions": "{n} sessions",
    "{n} task": "{n} tâche",
    "{n} tasks": "{n} tâches",
    "{time} left": "{time} restant",
    "{time} over": "{time} de dépassement",
    "{today} today · {week} this week": "{today} aujourd’hui · {week} cette semaine",
    "{used} of {total}": "{used} sur {total}",
    "Track time on projects and tasks with timers, set time allocations, see a weekly summary and export reports as CSV, Excel or PDF. Stored in its own note, Time Tracking.md, in the Genkan data folder.": "Suivez le temps passé sur vos projets et tâches avec des minuteurs, définissez des temps alloués, consultez un résumé hebdomadaire et exportez des rapports en CSV, Excel ou PDF. Stocké dans sa propre note, Time Tracking.md, dans le dossier de données de Genkan.",
    "Expand {name}": "Développer {name}",
    "On this day": "Ce jour-là",
    "A week ago": "Il y a une semaine",
    "A month ago": "Il y a un mois",
    "A year ago": "Il y a un an",
    "Nothing from this date": "Rien à cette date",
    "+ {n} more": "+ {n} de plus",
    "Export note as Markdown…": "Exporter la note en Markdown…",
    "This note is empty, so there is nothing to export.": "Cette note est vide, il n’y a rien à exporter.",
    "Exported to {path}": "Exportée vers {path}",
    "Saved a copy in your vault as {name}": "Copie enregistrée dans votre coffre sous le nom {name}",
    "Could not export the note.": "Impossible d’exporter la note.",
    "Arrange cards": "Organiser les cartes",
    "Drag a card by its handle, or use the arrow buttons. Press Done when you are finished.": "Faites glisser une carte par sa poignée, ou utilisez les boutons fléchés. Appuyez sur Terminé quand vous avez fini.",
    "Reset layout": "Rétablir la disposition",
    "Move {name}": "Déplacer {name}",
    "Move {name} up": "Monter {name}",
    "Move {name} down": "Descendre {name}",
    "Move {name} left": "Déplacer {name} vers la gauche",
    "Move {name} right": "Déplacer {name} vers la droite",
    "Arranging cards": "Organisation des cartes",
    "Done arranging": "Organisation terminée",
    "{name} picked up. Use the arrow keys to move it, Space to drop it and Escape to cancel.": "{name} saisie. Utilisez les flèches pour la déplacer, Espace pour la déposer et Échap pour annuler.",
    "Dropped. {position}": "Déposée. {position}",
    "{name}: {zone}, position {n} of {total}": "{name} : {zone}, position {n} sur {total}",
    "{name} can't move any further that way.": "{name} ne peut pas aller plus loin dans cette direction.",
    "Move cancelled.": "Déplacement annulé.",
    "Layout reset.": "Disposition rétablie.",
    "Top row": "Rangée du haut",
    "Left column": "Colonne de gauche",
    "Centre column": "Colonne du centre",
    "Right column": "Colonne de droite",
    "Use on all my devices": "Utiliser sur tous mes appareils",
    "Layout saved for all your devices. Other devices pick it up when they next sync.": "Disposition enregistrée pour tous vos appareils. Les autres appareils la récupèrent à leur prochaine synchronisation.",
    "Layout updated from another device.": "Disposition mise à jour depuis un autre appareil.",
    "Could not save the layout for your other devices.": "Impossible d’enregistrer la disposition pour vos autres appareils.",
    "Local layout: only on this device. Use on all my devices shares it.": "Disposition locale : uniquement sur cet appareil. « Utiliser sur tous mes appareils » la partage.",
    "Synced layout: the same on all your devices.": "Disposition synchronisée : la même sur tous vos appareils.",
    "Local layout: this device differs from the shared layout.": "Disposition locale : cet appareil diffère de la disposition partagée.",
    "Use the shared layout": "Utiliser la disposition partagée",
    "Switched to the shared layout.": "Disposition partagée appliquée.",
    "{date}, has a note": "{date}, a une note",
    "Use the arrow keys to move between days.": "Utilisez les flèches pour passer d’un jour à l’autre.",
    "{n} result": "{n} résultat",
    "{n} results": "{n} résultats",
    "View all {n} notes": "Afficher les {n} notes",
    "Open the file explorer and look in “{folder}”.": "Ouvrez l’explorateur de fichiers et cherchez dans « {folder} ».",
    "Shows notes from this date a week, a month and a year ago, found from their created date. Nothing leaves your device.": "Affiche les notes de cette date il y a une semaine, un mois et un an, d’après leur date de création. Rien ne quitte votre appareil.",
  },

  es: {
    "Add a note to your homepage favourites…": "Añadir una nota a los favoritos de la página de inicio…",
    "Refresh": "Actualizar",
    "Toggle theme": "Cambiar de tema",
    "Settings": "Ajustes",
    "Open settings": "Abrir ajustes",
    "Search your vault…": "Buscar en tu bóveda…",
    "Search your vault": "Buscar en tu bóveda",
    "Clear search": "Borrar búsqueda",
    "Search results": "Resultados de la búsqueda",
    "Photo of the day": "Foto del día",
    "Clock and search over the photo": "Reloj y búsqueda sobre la foto",
    "Lays the greeting, clock, date and search box over the photo of the day instead of above it, which saves vertical space. The photo is darkened a little so the text stays readable, so very bright photos look duller. Needs the photo of the day.": "Coloca el saludo, el reloj, la fecha y la búsqueda sobre la foto del día en lugar de encima, lo que ahorra espacio vertical. La foto se oscurece un poco para que el texto se lea bien, así que las fotos muy claras se ven más apagadas. Requiere la foto del día.",
    "Load a new photo": "Cargar una foto nueva",
    "Load new photo": "Cargar una foto nueva",
    "Inspirational quotes provided by": "Citas inspiradoras proporcionadas por",
    "Favourites": "Favoritos",
    "Calendar": "Calendario",
    "Previous month": "Mes anterior",
    "Next month": "Mes siguiente",
    "Today": "Hoy",
    "Quick links": "Enlaces rápidos",
    "Ring notes": "Notas del anillo",
    "Open the notes file": "Abrir el archivo de notas",
    "Open": "Abrir",
    "Web clips": "Recortes web",
    "Refresh clips": "Actualizar recortes",
    "Refresh web clips": "Actualizar recortes web",
    "Recent notes": "Notas recientes",
    "Refresh recent notes": "Actualizar notas recientes",
    "Tasks": "Tareas",
    "Add a task and press Enter…": "Añade una tarea y pulsa Intro…",
    "New task": "Tarea nueva",
    "Filter tasks": "Filtrar tareas",
    "All": "Todas",
    "Active": "Activas",
    "Done": "Hechas",
    "Clear completed": "Borrar completadas",
    "Saved": "Guardado",
    "Jot something down…": "Anota algo…",
    "Homepage": "Página de inicio",
    "Note not found: {path}": "Nota no encontrada: {path}",
    "Dark": "Oscuro",
    "Light": "Claro",
    "System ({mode})": "Sistema ({mode})",
    "Appearance: {label} — click to change": "Apariencia: {label} — haz clic para cambiar",
    "Good morning": "Buenos días",
    "Good afternoon": "Buenas tardes",
    "Good evening": "Buenas tardes",
    "Good night": "Buenas noches",
    "Could not create daily note: {error}": "No se pudo crear la nota diaria: {error}",
    "Could not update tasks: {error}": "No se pudieron actualizar las tareas: {error}",
    "No completed tasks yet.": "Aún no hay tareas completadas.",
    "Nothing left to do!": "¡No queda nada por hacer!",
    "No tasks yet — add one above.": "Aún no hay tareas: añade una arriba.",
    "Mark incomplete": "Marcar como pendiente",
    "Mark complete": "Marcar como completada",
    "Delete": "Eliminar",
    "Delete: {task}": "Eliminar: {task}",
    "Could not save quick note: {error}": "No se pudo guardar la nota rápida: {error}",
    "No quick links configured.": "No hay enlaces rápidos configurados.",
    "Command not found: {id}": "Comando no encontrado: {id}",
    "Unknown quick link action: {action}": "Acción de enlace rápido desconocida: {action}",
    "Yesterday": "Ayer",
    "Choose the folder your ring saves notes to in Genkan's settings.": "Elige en los ajustes de Genkan la carpeta donde tu anillo guarda las notas.",
    "No notes found in “{folder}”.": "No se encontraron notas en «{folder}».",
    "No ring notes yet. Looking for “{path}”.": "Aún no hay notas del anillo. Buscando «{path}».",
    "No timestamped entries found in “{path}”.": "No se encontraron entradas con fecha y hora en «{path}».",
    "Not found — click to create": "No encontrada: haz clic para crearla",
    "Remove from favourites": "Quitar de favoritos",
    "Remove {label} from favourites": "Quitar {label} de favoritos",
    "Add a favourite": "Añadir un favorito",
    "+ Add": "+ Añadir",
    "Pin the notes you open most. You can also right-click any note → “Add to homepage favourites”.": "Fija las notas que más abres. También puedes hacer clic derecho en cualquier nota → «Añadir a los favoritos de la página de inicio».",
    "No clips found in “{folder}”.": "No se encontraron recortes en «{folder}».",
    "(no folder set)": "(sin carpeta definida)",
    "No notes found.": "No se encontraron notas.",
    "↻ Searching…": "↻ Buscando…",
    "No results for “{query}”": "Sin resultados para «{query}»",
    "Nature photo": "Foto de la naturaleza",
    "Landscape photo of the day": "Foto de paisaje del día",
    "Photo by {photographer} on {site}": "Foto de {photographer} en {site}",
    "Photo from {site}": "Foto de {site}",
    "Your name": "Tu nombre",
    "Shown in the greeting.": "Se muestra en el saludo.",
    "e.g. Alex": "p. ej., Alex",
    "Open on startup": "Abrir al iniciar",
    "Open the homepage when Obsidian starts.": "Abre la página de inicio cuando se inicia Obsidian.",
    "Appearance": "Apariencia",
    "System follows Obsidian's light/dark theme.": "«Sistema» sigue el tema claro u oscuro de Obsidian.",
    "System": "Sistema",
    "Clock format": "Formato de hora",
    "12-hour (AM/PM)": "12 horas (AM/PM)",
    "24-hour": "24 horas",
    "Language": "Idioma",
    "Automatic follows Obsidian's language setting.": "«Automático» sigue el idioma de Obsidian.",
    "Automatic": "Automático",
    "Spelling": "Ortografía",
    "Automatic follows your device's region. Command names change after you restart Obsidian.": "«Automático» sigue la región de tu dispositivo. Los nombres de los comandos cambian al reiniciar Obsidian.",
    "American (favorite)": "Estadounidense (favorite)",
    "British (favourite)": "Británica (favourite)",
    "First day of the week": "Primer día de la semana",
    "Automatic follows your device's region.": "«Automático» sigue la región de tu dispositivo.",
    "Sunday": "Domingo",
    "Monday": "Lunes",
    "Saturday": "Sábado",
    "Custom clock font": "Fuente personalizada del reloj",
    "The name of a font installed on this device, such as Courier New or Avenir Next. A device without it uses the dashboard font.": "El nombre de una fuente instalada en este dispositivo, como Courier New o Avenir Next. Un dispositivo que no la tenga usa la fuente del panel.",
    "Font name": "Nombre de la fuente",
    "Clock font": "Fuente del reloj",
    "Uses fonts already on your device. Your Obsidian theme's fonts are available too.": "Usa fuentes que ya están en tu dispositivo. Las fuentes de tu tema de Obsidian también están disponibles.",
    "Folders": "Carpetas",
    "Web Clipper folder": "Carpeta del Web Clipper",
    "Where the Web Clipper saves notes.": "Dónde guarda las notas el Web Clipper.",
    "Daily notes folder": "Carpeta de notas diarias",
    "Leave blank to use your Daily Notes / Periodic Notes settings.": "Déjala vacía para usar los ajustes de Notas diarias / Periodic Notes.",
    "Data folder": "Carpeta de datos",
    "Tasks.md and Quick Note.md are stored here, so Obsidian Sync shares them across devices.": "Tasks.md y Quick Note.md se guardan aquí, de modo que Obsidian Sync los comparte entre tus dispositivos.",
    "Content": "Contenido",
    "Max web clips": "Máx. de recortes web",
    "Max recent notes": "Máx. de notas recientes",
    "Pebble ring notes": "Notas del anillo Pebble",
    "Show the latest voice notes from your Pebble Index ring.": "Muestra las últimas notas de voz de tu anillo Pebble Index.",
    "Ring note": "Nota del anillo",
    "The note the ring adds your voice notes to, with entries under headings like “## 2026-10-05 21:55”.": "La nota a la que el anillo añade tus notas de voz, con entradas bajo encabezados como «## 2026-10-05 21:55».",
    "Ring notes folder": "Carpeta de notas del anillo",
    "The folder the ring saves each voice note into, one file per note.": "La carpeta donde el anillo guarda cada nota de voz, un archivo por nota.",
    "Where does the ring save notes?": "¿Dónde guarda las notas el anillo?",
    "Match the Obsidian setting in the Pebble app.": "Elige el mismo ajuste de Obsidian que en la app de Pebble.",
    "One main note (Pebble Index.md)": "Una nota principal (Pebble Index.md)",
    "An existing note I choose": "Una nota existente que elijo",
    "A separate file for each note": "Un archivo distinto para cada nota",
    "Max ring notes": "Máx. de notas del anillo",
    "Shows a landscape photo from Picsum, or from Unsplash if you add a key below. Off means no photo is requested.": "Muestra una foto de paisaje de Picsum, o de Unsplash si añades una clave abajo. Desactivado: no se solicita ninguna foto.",
    "Unsplash access key": "Clave de acceso de Unsplash",
    "Optional. Enables nature photos from Unsplash with attribution. The key is stored in this plugin's settings file in your vault.": "Opcional. Activa fotos de naturaleza de Unsplash con atribución. La clave se guarda en el archivo de ajustes de este complemento, dentro de tu bóveda.",
    "Daily quote": "Cita del día",
    "Site icons on web clips": "Iconos de sitio en los recortes web",
    "Uses Google's favicon service, which receives the domain of each clipped page. Off means no icon requests.": "Usa el servicio de favicons de Google, que recibe el dominio de cada página recortada. Desactivado: no se solicita ningún icono.",
    "One per line: icon | label | action. Actions: command:<command id>, open:<note path>, daily, random, or an https:// URL.": "Uno por línea: icono | etiqueta | acción. Acciones: command:<id del comando>, open:<ruta de la nota>, daily, random o una URL https://.",
    "Open homepage": "Abrir la página de inicio",
    "Add or remove current note from homepage favourites": "Añadir o quitar la nota actual de los favoritos de la página de inicio",
    "Add a note to homepage favourites…": "Añadir una nota a los favoritos de la página de inicio…",
    "Remove from homepage favourites": "Quitar de los favoritos de la página de inicio",
    "Add to homepage favourites": "Añadir a los favoritos de la página de inicio",
    "Add or remove from homepage favourites": "Añadir o quitar de los favoritos de la página de inicio",
    "{name} is already a favourite": "{name} ya es un favorito",
    "Added {name} to favourites": "{name} añadido a favoritos",
    "Could not add favourite: {error}": "No se pudo añadir el favorito: {error}",
    "Removed {name} from favourites": "{name} quitado de favoritos",
    "Dashboard default": "Predeterminada del panel",
    "Obsidian interface font": "Fuente de interfaz de Obsidian",
    "Obsidian text font": "Fuente de texto de Obsidian",
    "Obsidian monospace font": "Fuente monoespaciada de Obsidian",
    "System serif": "Fuente con serifa del sistema",
    "Custom (a font installed on this device)": "Personalizada (una fuente instalada en este dispositivo)",
    "New Note": "Nota nueva",
    "Today's Note": "Nota de hoy",
    "Search Vault": "Buscar en la bóveda",
    "Graph View": "Vista de grafo",
    "Random Note": "Nota aleatoria",
    "Shows a quote each day. Off means no quote is shown and none is requested.": "Muestra una cita cada día. Desactivado: no se muestra ninguna cita ni se solicita.",
    "Quote source": "Fuente de las citas",
    "ZenQuotes and Echoes are fetched once a day over the network, and ZenQuotes is English only. The bundled list works offline.": "ZenQuotes y Echoes se obtienen una vez al día por la red, y ZenQuotes solo está en inglés. La lista incluida funciona sin conexión.",
    "ZenQuotes (English)": "ZenQuotes (inglés)",
    "Echoes (your language)": "Echoes (tu idioma)",
    "Bundled list (your language)": "Lista incluida (tu idioma)",
    "Formatting": "Formato",
    "Bold": "Negrita",
    "Italic": "Cursiva",
    "Underline": "Subrayado",
    "Strikethrough": "Tachado",
    "Heading": "Encabezado",
    "Bulleted list": "Lista con viñetas",
    "Numbered list": "Lista numerada",
    "Link": "Enlace",
    "Link address": "Dirección del enlace",
    "Apply": "Aplicar",
    "Cancel": "Cancelar",
    "That kind of link isn't supported.": "Este tipo de enlace no es compatible.",
    "This note has formatting the editor can't show, so it appears as plain text.": "Esta nota tiene un formato que el editor no puede mostrar, así que aparece como texto sin formato.",
    "Quick notes": "Notas rápidas",
    "Just now": "Ahora mismo",
    "{n} line": "{n} línea",
    "{n} lines": "{n} líneas",
    "{n} word": "{n} palabra",
    "{n} words": "{n} palabras",
    "{n} character": "{n} carácter",
    "{n} characters": "{n} caracteres",
    "Note {n}, has text": "Nota {n}, con texto",
    "Note {n}, empty": "Nota {n}, vacía",
    "Unsaved changes": "Cambios sin guardar",
    "Quick note {n}": "Nota rápida {n}",
    "Collapse {name}": "Contraer {name}",
    "xkcd comic of the day": "Cómic xkcd del día",
    "Shows one xkcd comic a day, the same one on all your devices, with buttons to browse others. Today's comic loads from xkcd.com once a day and its image whenever the dashboard opens; browsing loads more. Off means nothing is requested.": "Muestra un cómic de xkcd al día, el mismo en todos tus dispositivos, con botones para explorar otros. El de hoy se carga desde xkcd.com una vez al día y su imagen cada vez que se abre el panel; al explorar se cargan más. Si está desactivado, no se solicita nada.",
    "Loading the comic…": "Cargando el cómic…",
    "Couldn't load today's comic.": "No se pudo cargar el cómic de hoy.",
    "Try again": "Reintentar",
    "By Randall Munroe": "De Randall Munroe",
    "Explain this comic": "Explicar este cómic",
    "Vault stats": "Estadísticas de la bóveda",
    "A summary of your vault: a 12-week heatmap of the days you wrote, your streak, counts of notes, orphan notes, unresolved links and open tasks, and your top tags. Worked out on your device from file dates and links; nothing is sent anywhere.": "Un resumen de tu bóveda: un mapa de calor de 12 semanas con los días en que escribiste, tu racha, el número de notas, notas huérfanas, enlaces sin resolver y tareas abiertas, y tus etiquetas principales. Se calcula en tu dispositivo a partir de las fechas de los archivos y los enlaces; no se envía nada.",
    "Notes created or edited each day over the last 12 weeks. {streak}": "Notas creadas o editadas cada día durante las últimas 12 semanas. {streak}",
    "{n}-day streak": "Racha de {n} días",
    "No current streak": "Sin racha actual",
    "Notes on {date}: {n}": "Notas el {date}: {n}",
    "Less": "Menos",
    "More": "Más",
    "day streak": "días seguidos",
    "created in 12 weeks": "creadas en 12 semanas",
    "Notes": "Notas",
    "Orphan notes": "Notas huérfanas",
    "Unresolved links": "Enlaces sin resolver",
    "Open tasks": "Tareas abiertas",
    "Show the {n} orphan notes": "Mostrar las {n} notas huérfanas",
    "Show the {n} unresolved links": "Mostrar los {n} enlaces sin resolver",
    "Top tags": "Etiquetas principales",
    "Search for {tag}": "Buscar {tag}",
    "Based on file dates": "Según las fechas de los archivos",
    "Updated {time}": "Actualizado a las {time}",
    "Back": "Volver",
    "No orphan notes.": "No hay notas huérfanas.",
    "No unresolved links.": "No hay enlaces sin resolver.",
    "in {note}": "en {note}",
    "Archived ({n})": "Archivados ({n})",
    "Archived": "Archivados",
    "Archive project": "Archivar proyecto",
    "Unarchive project": "Desarchivar proyecto",
    "Archived project {name}": "Proyecto {name} archivado",
    "Unarchived project {name}": "Proyecto {name} desarchivado",
    "No active projects. Add one above, or open Archived below.": "No hay proyectos activos. Añade uno arriba o abre Archivados más abajo.",
    "No tasks.": "Sin tareas.",
    "This project is archived. Unarchive it from Edit project to add tasks or start timers.": "Este proyecto está archivado. Desarchívalo desde Editar proyecto para añadir tareas o iniciar temporizadores.",
    "Archived project: timers are off": "Proyecto archivado: temporizadores desactivados",
    "Archived: its time still counts in reports and the weekly summary. Unarchive it to add tasks or start timers.": "Archivado: su tiempo sigue contando en los informes y el resumen semanal. Desarchívalo para añadir tareas o iniciar temporizadores.",
    "Archive a finished project to tuck it away. Its time still counts in reports and the weekly summary, but you can't start timers or add tasks until you unarchive it.": "Archiva un proyecto terminado para guardarlo. Su tiempo sigue contando en los informes y el resumen semanal, pero no podrás iniciar temporizadores ni añadir tareas hasta que lo desarchives.",
    "Previous comic": "Cómic anterior",
    "Next comic": "Cómic siguiente",
    "Random comic": "Cómic aleatorio",
    "Random": "Aleatorio",
    "Back to today's comic": "Volver al cómic de hoy",
    "Couldn't load that comic.": "No se pudo cargar ese cómic.",
    "xkcd {num}: {title}": "xkcd {num}: {title}",
    "Open in Obsidian (Surfing)": "Abrir en Obsidian (Surfing)",
    "Open in the default browser": "Abrir en el navegador predeterminado",
    "Copy link": "Copiar enlace",
    "Link copied.": "Enlace copiado.",
    "Could not copy the link.": "No se pudo copiar el enlace.",
    "Running timer": "Temporizador en marcha",
    "Open {task}": "Abrir {task}",
    "Running timer display": "Visualización del temporizador en marcha",
    "Show the running timer where you can always see it: in Obsidian's status bar on desktop, or at the top of the dashboard on phones and tablets. Click it to open the task. Needs the Time tracker.": "Muestra el temporizador en marcha donde siempre lo veas: en la barra de estado de Obsidian en el escritorio, o en la parte superior del panel en teléfonos y tabletas. Haz clic para abrir la tarea. Requiere el control de tiempo.",
    "Pause or resume the time tracker timer": "Pausar o reanudar el temporizador del control de tiempo",
    "Stop the time tracker timer": "Detener el temporizador del control de tiempo",
    "Timer running: {task}. Open it in the time tracker.": "Temporizador en marcha: {task}. Abrir en el control de tiempo.",
    "No timer to resume. Start one from the Time tracker card.": "No hay temporizador que reanudar. Inicia uno desde la tarjeta Control de tiempo.",
    "No timer is running.": "No hay ningún temporizador en marcha.",
    "Start date": "Fecha de inicio",
    "Start time": "Hora de inicio",
    "End date": "Fecha de fin",
    "End time": "Hora de fin",
    "Choose a start and an end, each with a day and a time.": "Elige un inicio y un fin, cada uno con día y hora.",
    "The end must be after the start. Check the end date.": "El fin debe ser posterior al inicio. Revisa la fecha de fin.",
    "This adds {time}": "Añade {time}",
    "Add time": "Añadir tiempo",
    "Add time manually": "Añadir tiempo manualmente",
    "That time is in the future.": "Esa hora está en el futuro.",
    "Added {time} to {task}": "{time} añadido a {task}",
    "Could not save the time tracker's data.": "No se pudieron guardar los datos del control de tiempo.",
    "Budget, all time": "Presupuesto, total acumulado",
    "Add a task and press Enter": "Añade una tarea y pulsa Intro",
    "Added project {name}": "Proyecto {name} añadido",
    "Added task {name}": "Tarea {name} añadida",
    "All projects": "Todos los proyectos",
    "All today": "Todo hoy",
    "Allocated": "Asignado",
    "Allocated (hours)": "Asignado (horas)",
    "Allocated hours": "Horas asignadas",
    "Allocated minutes": "Minutos asignados",
    "Allocated time": "Tiempo asignado",
    "Allocated time for the whole project": "Tiempo asignado a todo el proyecto",
    "Blue": "Azul",
    "Choose a start date that is not after the end date.": "Elige una fecha de inicio que no sea posterior a la de fin.",
    "Click again to confirm": "Haz clic otra vez para confirmar",
    "Colour": "Color",
    "Confirm: {action}": "Confirmar: {action}",
    "Could not export the time report.": "No se pudo exportar el informe de tiempo.",
    "Custom range": "Intervalo personalizado",
    "Date": "Fecha",
    "Delete project and its tasks": "Eliminar el proyecto y sus tareas",
    "Delete session {when}": "Eliminar la sesión {when}",
    "Delete task": "Eliminar tarea",
    "Deleted project {name}": "Proyecto {name} eliminado",
    "Deleted task {name}": "Tarea {name} eliminada",
    "Deleted the session {when}": "Sesión {when} eliminada",
    "Duration": "Duración",
    "Edit project": "Editar proyecto",
    "End": "Fin",
    "Export": "Exportar",
    "Export {format}": "Exportar a {format}",
    "From": "Desde",
    "Generated {date}": "Generado el {date}",
    "Gold": "Dorado",
    "Green": "Verde",
    "High": "Alta",
    "Hours": "Horas",
    "Last month": "El mes pasado",
    "Last week": "La semana pasada",
    "Leave this blank to add up the time allocated to each task instead.": "Déjalo en blanco para sumar el tiempo asignado a cada tarea.",
    "Low": "Baja",
    "Marked done": "Marcada como hecha",
    "Medium": "Media",
    "Name": "Nombre",
    "New project or company": "Nuevo proyecto o empresa",
    "New project or company…": "Nuevo proyecto o empresa…",
    "Next week": "Semana siguiente",
    "No projects yet. Add a client or project to start tracking time.": "Aún no hay proyectos. Añade un cliente o proyecto para empezar a registrar tiempo.",
    "No sessions": "Sin sesiones",
    "No tasks yet. Add one above.": "Aún no hay tareas. Añade una arriba.",
    "No time limit": "Sin límite de tiempo",
    "No time was tracked in this period.": "No se registró tiempo en este período.",
    "No time was tracked this week.": "No se registró tiempo esta semana.",
    "None": "Ninguna",
    "Orange": "Naranja",
    "Pause": "Pausa",
    "Pause timer: {task}": "Pausar el temporizador: {task}",
    "Paused": "En pausa",
    "Paused {task} at {time}": "{task} en pausa a las {time}",
    "Paused {task}: Obsidian was closed or the computer was asleep. The timer stopped at {time}.": "{task} en pausa: Obsidian estaba cerrado o el equipo estaba en reposo. El temporizador se detuvo a las {time}.",
    "Period": "Período",
    "Pink": "Rosa",
    "Previous week": "Semana anterior",
    "Priority": "Prioridad",
    "Project": "Proyecto",
    "Project / task": "Proyecto / tarea",
    "Projects": "Proyectos",
    "Red": "Rojo",
    "Remaining": "Restante",
    "Remaining (hours)": "Restante (horas)",
    "Report": "Informe",
    "Resume": "Reanudar",
    "Resume timer: {task}": "Reanudar el temporizador: {task}",
    "Running": "En marcha",
    "Running: {task}": "En marcha: {task}",
    "Sessions": "Sesiones",
    "Start": "Inicio",
    "Start timer: {task}": "Iniciar el temporizador: {task}",
    "Started the timer for {task}": "Temporizador iniciado para {task}",
    "Stop": "Detener",
    "Stop timer: {task}": "Detener el temporizador: {task}",
    "Stopped {task} at {time}": "{task} detenido a las {time}",
    "Summary": "Resumen",
    "Task": "Tarea",
    "Teal": "Turquesa",
    "There is no tracked time in this period to export.": "No hay tiempo registrado que exportar en este período.",
    "This month": "Este mes",
    "This session {time}": "Esta sesión {time}",
    "This week": "Esta semana",
    "Time": "Hora",
    "Time by project": "Tiempo por proyecto",
    "Time report": "Informe de tiempo",
    "Time tracker": "Control de tiempo",
    "Time tracker views": "Vistas del control de tiempo",
    "To": "Hasta",
    "Total": "Total",
    "Total time on this task": "Tiempo total en esta tarea",
    "Tracked": "Registrado",
    "Tracked all time (hours)": "Registrado en total (horas)",
    "Tracked in range (hours)": "Registrado en el intervalo (horas)",
    "Untitled project": "Proyecto sin título",
    "Violet": "Violeta",
    "Week": "Semana",
    "Weekly summary": "Resumen semanal",
    "hours": "horas",
    "now": "ahora",
    "priority": "prioridad",
    "to": "al",
    "{n} session": "{n} sesión",
    "{n} sessions": "{n} sesiones",
    "{n} task": "{n} tarea",
    "{n} tasks": "{n} tareas",
    "{time} left": "{time} restante",
    "{time} over": "{time} de más",
    "{today} today · {week} this week": "{today} hoy · {week} esta semana",
    "{used} of {total}": "{used} de {total}",
    "Track time on projects and tasks with timers, set time allocations, see a weekly summary and export reports as CSV, Excel or PDF. Stored in its own note, Time Tracking.md, in the Genkan data folder.": "Registra el tiempo de proyectos y tareas con temporizadores, asigna tiempo, consulta un resumen semanal y exporta informes en CSV, Excel o PDF. Se guarda en su propia nota, Time Tracking.md, en la carpeta de datos de Genkan.",
    "Expand {name}": "Expandir {name}",
    "On this day": "Un día como hoy",
    "A week ago": "Hace una semana",
    "A month ago": "Hace un mes",
    "A year ago": "Hace un año",
    "Nothing from this date": "Nada de esta fecha",
    "+ {n} more": "+ {n} más",
    "Export note as Markdown…": "Exportar la nota como Markdown…",
    "This note is empty, so there is nothing to export.": "Esta nota está vacía, no hay nada que exportar.",
    "Exported to {path}": "Exportada a {path}",
    "Saved a copy in your vault as {name}": "Copia guardada en tu bóveda como {name}",
    "Could not export the note.": "No se pudo exportar la nota.",
    "Arrange cards": "Organizar tarjetas",
    "Drag a card by its handle, or use the arrow buttons. Press Done when you are finished.": "Arrastra una tarjeta por su asa o usa los botones de flecha. Pulsa Hecho cuando termines.",
    "Reset layout": "Restablecer diseño",
    "Move {name}": "Mover {name}",
    "Move {name} up": "Subir {name}",
    "Move {name} down": "Bajar {name}",
    "Move {name} left": "Mover {name} a la izquierda",
    "Move {name} right": "Mover {name} a la derecha",
    "Arranging cards": "Organizando tarjetas",
    "Done arranging": "Organización terminada",
    "{name} picked up. Use the arrow keys to move it, Space to drop it and Escape to cancel.": "{name} recogida. Usa las flechas para moverla, Espacio para soltarla y Escape para cancelar.",
    "Dropped. {position}": "Soltada. {position}",
    "{name}: {zone}, position {n} of {total}": "{name}: {zone}, posición {n} de {total}",
    "{name} can't move any further that way.": "{name} no puede moverse más en esa dirección.",
    "Move cancelled.": "Movimiento cancelado.",
    "Layout reset.": "Diseño restablecido.",
    "Top row": "Fila superior",
    "Left column": "Columna izquierda",
    "Centre column": "Columna central",
    "Right column": "Columna derecha",
    "Use on all my devices": "Usar en todos mis dispositivos",
    "Layout saved for all your devices. Other devices pick it up when they next sync.": "Diseño guardado para todos tus dispositivos. Los demás dispositivos lo recibirán en su próxima sincronización.",
    "Layout updated from another device.": "Diseño actualizado desde otro dispositivo.",
    "Could not save the layout for your other devices.": "No se pudo guardar el diseño para tus otros dispositivos.",
    "Local layout: only on this device. Use on all my devices shares it.": "Diseño local: solo en este dispositivo. «Usar en todos mis dispositivos» lo comparte.",
    "Synced layout: the same on all your devices.": "Diseño sincronizado: el mismo en todos tus dispositivos.",
    "Local layout: this device differs from the shared layout.": "Diseño local: este dispositivo difiere del diseño compartido.",
    "Use the shared layout": "Usar el diseño compartido",
    "Switched to the shared layout.": "Se cambió al diseño compartido.",
    "{date}, has a note": "{date}, tiene una nota",
    "Use the arrow keys to move between days.": "Usa las flechas para moverte entre los días.",
    "{n} result": "{n} resultado",
    "{n} results": "{n} resultados",
    "View all {n} notes": "Ver las {n} notas",
    "Open the file explorer and look in “{folder}”.": "Abre el explorador de archivos y busca en «{folder}».",
    "Shows notes from this date a week, a month and a year ago, found from their created date. Nothing leaves your device.": "Muestra las notas de esta fecha de hace una semana, un mes y un año, según su fecha de creación. Nada sale de tu dispositivo.",
  },

  de: {
    "Add a note to your homepage favourites…": "Notiz zu den Favoriten der Startseite hinzufügen …",
    "Refresh": "Aktualisieren",
    "Toggle theme": "Design wechseln",
    "Settings": "Einstellungen",
    "Open settings": "Einstellungen öffnen",
    "Search your vault…": "Im Tresor suchen …",
    "Search your vault": "Im Tresor suchen",
    "Clear search": "Suche löschen",
    "Search results": "Suchergebnisse",
    "Photo of the day": "Foto des Tages",
    "Clock and search over the photo": "Uhr und Suche über dem Foto",
    "Lays the greeting, clock, date and search box over the photo of the day instead of above it, which saves vertical space. The photo is darkened a little so the text stays readable, so very bright photos look duller. Needs the photo of the day.": "Legt Begrüßung, Uhr, Datum und Suche über das Foto des Tages statt darüber, was Platz in der Höhe spart. Das Foto wird leicht abgedunkelt, damit der Text lesbar bleibt; sehr helle Fotos wirken dadurch matter. Benötigt das Foto des Tages.",
    "Load a new photo": "Neues Foto laden",
    "Load new photo": "Neues Foto laden",
    "Inspirational quotes provided by": "Inspirierende Zitate von",
    "Favourites": "Favoriten",
    "Calendar": "Kalender",
    "Previous month": "Vorheriger Monat",
    "Next month": "Nächster Monat",
    "Today": "Heute",
    "Quick links": "Schnellzugriff",
    "Ring notes": "Ring-Notizen",
    "Open the notes file": "Notizdatei öffnen",
    "Open": "Öffnen",
    "Web clips": "Web-Clips",
    "Refresh clips": "Clips aktualisieren",
    "Refresh web clips": "Web-Clips aktualisieren",
    "Recent notes": "Zuletzt bearbeitet",
    "Refresh recent notes": "Zuletzt bearbeitete Notizen aktualisieren",
    "Tasks": "Aufgaben",
    "Add a task and press Enter…": "Aufgabe hinzufügen …",
    "New task": "Neue Aufgabe",
    "Filter tasks": "Aufgaben filtern",
    "All": "Alle",
    "Active": "Offen",
    "Done": "Erledigt",
    "Clear completed": "Erledigte entfernen",
    "Saved": "Gespeichert",
    "Jot something down…": "Etwas notieren …",
    "Homepage": "Startseite",
    "Note not found: {path}": "Notiz nicht gefunden: {path}",
    "Dark": "Dunkel",
    "Light": "Hell",
    "System ({mode})": "System ({mode})",
    "Appearance: {label} — click to change": "Erscheinungsbild: {label} – zum Ändern klicken",
    "Good morning": "Guten Morgen",
    "Good afternoon": "Guten Tag",
    "Good evening": "Guten Abend",
    "Good night": "Gute Nacht",
    "Could not create daily note: {error}": "Tagesnotiz konnte nicht erstellt werden: {error}",
    "Could not update tasks: {error}": "Aufgaben konnten nicht aktualisiert werden: {error}",
    "No completed tasks yet.": "Noch keine erledigten Aufgaben.",
    "Nothing left to do!": "Nichts mehr zu tun!",
    "No tasks yet — add one above.": "Noch keine Aufgaben – oben eine hinzufügen.",
    "Mark incomplete": "Als offen markieren",
    "Mark complete": "Als erledigt markieren",
    "Delete": "Löschen",
    "Delete: {task}": "Löschen: {task}",
    "Could not save quick note: {error}": "Schnellnotiz konnte nicht gespeichert werden: {error}",
    "No quick links configured.": "Keine Schnellzugriffe eingerichtet.",
    "Command not found: {id}": "Befehl nicht gefunden: {id}",
    "Unknown quick link action: {action}": "Unbekannte Schnellzugriff-Aktion: {action}",
    "Yesterday": "Gestern",
    "Choose the folder your ring saves notes to in Genkan's settings.": "Wähle in den Genkan-Einstellungen den Ordner, in dem dein Ring Notizen speichert.",
    "No notes found in “{folder}”.": "Keine Notizen in „{folder}“ gefunden.",
    "No ring notes yet. Looking for “{path}”.": "Noch keine Ring-Notizen. Gesucht wird „{path}“.",
    "No timestamped entries found in “{path}”.": "Keine Einträge mit Zeitstempel in „{path}“ gefunden.",
    "Not found — click to create": "Nicht gefunden – zum Erstellen klicken",
    "Remove from favourites": "Aus Favoriten entfernen",
    "Remove {label} from favourites": "{label} aus Favoriten entfernen",
    "Add a favourite": "Favorit hinzufügen",
    "+ Add": "+ Hinzufügen",
    "Pin the notes you open most. You can also right-click any note → “Add to homepage favourites”.": "Hefte die Notizen an, die du am häufigsten öffnest. Du kannst auch eine Notiz mit der rechten Maustaste anklicken → „Zu Favoriten der Startseite hinzufügen“.",
    "No clips found in “{folder}”.": "Keine Clips in „{folder}“ gefunden.",
    "(no folder set)": "(kein Ordner festgelegt)",
    "No notes found.": "Keine Notizen gefunden.",
    "↻ Searching…": "↻ Suche läuft …",
    "No results for “{query}”": "Keine Ergebnisse für „{query}“",
    "Nature photo": "Naturfoto",
    "Landscape photo of the day": "Landschaftsfoto des Tages",
    "Photo by {photographer} on {site}": "Foto von {photographer} auf {site}",
    "Photo from {site}": "Foto von {site}",
    "Your name": "Dein Name",
    "Shown in the greeting.": "Wird in der Begrüßung angezeigt.",
    "e.g. Alex": "z. B. Alex",
    "Open on startup": "Beim Start öffnen",
    "Open the homepage when Obsidian starts.": "Öffnet die Startseite, wenn Obsidian startet.",
    "Appearance": "Erscheinungsbild",
    "System follows Obsidian's light/dark theme.": "„System“ folgt dem hellen oder dunklen Design von Obsidian.",
    "System": "System",
    "Clock format": "Uhrzeitformat",
    "12-hour (AM/PM)": "12-Stunden (AM/PM)",
    "24-hour": "24-Stunden",
    "Language": "Sprache",
    "Automatic follows Obsidian's language setting.": "„Automatisch“ folgt der Sprache von Obsidian.",
    "Automatic": "Automatisch",
    "Spelling": "Rechtschreibung",
    "Automatic follows your device's region. Command names change after you restart Obsidian.": "„Automatisch“ folgt der Region deines Geräts. Befehlsnamen ändern sich nach einem Neustart von Obsidian.",
    "American (favorite)": "Amerikanisch (favorite)",
    "British (favourite)": "Britisch (favourite)",
    "First day of the week": "Erster Tag der Woche",
    "Automatic follows your device's region.": "„Automatisch“ folgt der Region deines Geräts.",
    "Sunday": "Sonntag",
    "Monday": "Montag",
    "Saturday": "Samstag",
    "Custom clock font": "Eigene Uhrschrift",
    "The name of a font installed on this device, such as Courier New or Avenir Next. A device without it uses the dashboard font.": "Der Name einer auf diesem Gerät installierten Schrift, z. B. Courier New oder Avenir Next. Ein Gerät ohne diese Schrift verwendet die Schrift des Dashboards.",
    "Font name": "Schriftname",
    "Clock font": "Uhrschrift",
    "Uses fonts already on your device. Your Obsidian theme's fonts are available too.": "Verwendet Schriften, die bereits auf deinem Gerät vorhanden sind. Auch die Schriften deines Obsidian-Designs stehen zur Verfügung.",
    "Folders": "Ordner",
    "Web Clipper folder": "Web-Clipper-Ordner",
    "Where the Web Clipper saves notes.": "Wo der Web Clipper Notizen speichert.",
    "Daily notes folder": "Ordner für Tagesnotizen",
    "Leave blank to use your Daily Notes / Periodic Notes settings.": "Leer lassen, um die Einstellungen von Tägliche Notizen / Periodic Notes zu verwenden.",
    "Data folder": "Datenordner",
    "Tasks.md and Quick Note.md are stored here, so Obsidian Sync shares them across devices.": "Tasks.md und Quick Note.md werden hier gespeichert, damit Obsidian Sync sie auf all deinen Geräten teilt.",
    "Content": "Inhalt",
    "Max web clips": "Max. Web-Clips",
    "Max recent notes": "Max. zuletzt bearbeitete Notizen",
    "Pebble ring notes": "Pebble-Ring-Notizen",
    "Show the latest voice notes from your Pebble Index ring.": "Zeigt die neuesten Sprachnotizen deines Pebble-Index-Rings.",
    "Ring note": "Ring-Notiz",
    "The note the ring adds your voice notes to, with entries under headings like “## 2026-10-05 21:55”.": "Die Notiz, der der Ring deine Sprachnotizen hinzufügt, mit Einträgen unter Überschriften wie „## 2026-10-05 21:55“.",
    "Ring notes folder": "Ordner für Ring-Notizen",
    "The folder the ring saves each voice note into, one file per note.": "Der Ordner, in dem der Ring jede Sprachnotiz speichert, eine Datei pro Notiz.",
    "Where does the ring save notes?": "Wo speichert der Ring Notizen?",
    "Match the Obsidian setting in the Pebble app.": "Wähle dieselbe Obsidian-Einstellung wie in der Pebble-App.",
    "One main note (Pebble Index.md)": "Eine Hauptnotiz (Pebble Index.md)",
    "An existing note I choose": "Eine vorhandene Notiz, die ich auswähle",
    "A separate file for each note": "Eine eigene Datei pro Notiz",
    "Max ring notes": "Max. Ring-Notizen",
    "Shows a landscape photo from Picsum, or from Unsplash if you add a key below. Off means no photo is requested.": "Zeigt ein Landschaftsfoto von Picsum oder, wenn du unten einen Schlüssel einträgst, von Unsplash. Aus bedeutet: Es wird kein Foto angefordert.",
    "Unsplash access key": "Unsplash-Zugangsschlüssel",
    "Optional. Enables nature photos from Unsplash with attribution. The key is stored in this plugin's settings file in your vault.": "Optional. Aktiviert Naturfotos von Unsplash mit Quellenangabe. Der Schlüssel wird in der Einstellungsdatei dieses Plugins in deinem Tresor gespeichert.",
    "Daily quote": "Zitat des Tages",
    "Site icons on web clips": "Website-Symbole bei Web-Clips",
    "Uses Google's favicon service, which receives the domain of each clipped page. Off means no icon requests.": "Verwendet den Favicon-Dienst von Google, der die Domain jeder geclippten Seite erhält. Aus bedeutet: Es werden keine Symbole angefordert.",
    "One per line: icon | label | action. Actions: command:<command id>, open:<note path>, daily, random, or an https:// URL.": "Eins pro Zeile: Symbol | Beschriftung | Aktion. Aktionen: command:<Befehls-ID>, open:<Notizpfad>, daily, random oder eine https://-URL.",
    "Open homepage": "Startseite öffnen",
    "Add or remove current note from homepage favourites": "Aktuelle Notiz zu den Favoriten der Startseite hinzufügen oder daraus entfernen",
    "Add a note to homepage favourites…": "Notiz zu den Favoriten der Startseite hinzufügen …",
    "Remove from homepage favourites": "Aus den Favoriten der Startseite entfernen",
    "Add to homepage favourites": "Zu den Favoriten der Startseite hinzufügen",
    "Add or remove from homepage favourites": "Zu den Favoriten der Startseite hinzufügen oder daraus entfernen",
    "{name} is already a favourite": "{name} ist bereits ein Favorit",
    "Added {name} to favourites": "{name} zu den Favoriten hinzugefügt",
    "Could not add favourite: {error}": "Favorit konnte nicht hinzugefügt werden: {error}",
    "Removed {name} from favourites": "{name} aus den Favoriten entfernt",
    "Dashboard default": "Standard des Dashboards",
    "Obsidian interface font": "Obsidian-Oberflächenschrift",
    "Obsidian text font": "Obsidian-Textschrift",
    "Obsidian monospace font": "Obsidian-Festbreitenschrift",
    "System serif": "System-Serifenschrift",
    "Custom (a font installed on this device)": "Eigene (eine auf diesem Gerät installierte Schrift)",
    "New Note": "Neue Notiz",
    "Today's Note": "Heutige Notiz",
    "Search Vault": "Tresor durchsuchen",
    "Graph View": "Graphansicht",
    "Random Note": "Zufällige Notiz",
    "Shows a quote each day. Off means no quote is shown and none is requested.": "Zeigt jeden Tag ein Zitat. Aus bedeutet: Es wird kein Zitat angezeigt oder angefordert.",
    "Quote source": "Zitatquelle",
    "ZenQuotes and Echoes are fetched once a day over the network, and ZenQuotes is English only. The bundled list works offline.": "ZenQuotes und Echoes werden einmal täglich über das Netzwerk abgerufen, ZenQuotes gibt es nur auf Englisch. Die integrierte Liste funktioniert offline.",
    "ZenQuotes (English)": "ZenQuotes (Englisch)",
    "Echoes (your language)": "Echoes (deine Sprache)",
    "Bundled list (your language)": "Integrierte Liste (deine Sprache)",
    "Formatting": "Formatierung",
    "Bold": "Fett",
    "Italic": "Kursiv",
    "Underline": "Unterstrichen",
    "Strikethrough": "Durchgestrichen",
    "Heading": "Überschrift",
    "Bulleted list": "Aufzählung",
    "Numbered list": "Nummerierte Liste",
    "Link": "Link",
    "Link address": "Link-Adresse",
    "Apply": "Übernehmen",
    "Cancel": "Abbrechen",
    "That kind of link isn't supported.": "Diese Art von Link wird nicht unterstützt.",
    "This note has formatting the editor can't show, so it appears as plain text.": "Diese Notiz enthält Formatierungen, die der Editor nicht darstellen kann, daher wird sie als reiner Text angezeigt.",
    "Quick notes": "Schnellnotizen",
    "Just now": "Gerade eben",
    "{n} line": "{n} Zeile",
    "{n} lines": "{n} Zeilen",
    "{n} word": "{n} Wort",
    "{n} words": "{n} Wörter",
    "{n} character": "{n} Zeichen",
    "{n} characters": "{n} Zeichen",
    "Note {n}, has text": "Notiz {n}, mit Text",
    "Note {n}, empty": "Notiz {n}, leer",
    "Unsaved changes": "Ungespeicherte Änderungen",
    "Quick note {n}": "Schnellnotiz {n}",
    "Collapse {name}": "{name} einklappen",
    "xkcd comic of the day": "xkcd-Comic des Tages",
    "Shows one xkcd comic a day, the same one on all your devices, with buttons to browse others. Today's comic loads from xkcd.com once a day and its image whenever the dashboard opens; browsing loads more. Off means nothing is requested.": "Zeigt täglich einen xkcd-Comic, auf allen Geräten denselben, mit Schaltflächen zum Blättern. Der heutige wird einmal täglich von xkcd.com geladen, sein Bild bei jedem Öffnen des Dashboards; beim Blättern werden weitere geladen. Ist die Option aus, wird nichts angefragt.",
    "Loading the comic…": "Comic wird geladen …",
    "Couldn't load today's comic.": "Der heutige Comic konnte nicht geladen werden.",
    "Try again": "Erneut versuchen",
    "By Randall Munroe": "Von Randall Munroe",
    "Explain this comic": "Diesen Comic erklären",
    "Vault stats": "Vault-Statistik",
    "A summary of your vault: a 12-week heatmap of the days you wrote, your streak, counts of notes, orphan notes, unresolved links and open tasks, and your top tags. Worked out on your device from file dates and links; nothing is sent anywhere.": "Eine Übersicht über deinen Vault: eine Heatmap der letzten 12 Wochen mit den Tagen, an denen du geschrieben hast, deine Serie, die Anzahl der Notizen, verwaisten Notizen, ungelösten Links und offenen Aufgaben sowie deine häufigsten Tags. Wird auf deinem Gerät aus Dateidaten und Links berechnet; nichts wird gesendet.",
    "Notes created or edited each day over the last 12 weeks. {streak}": "An jedem Tag der letzten 12 Wochen erstellte oder bearbeitete Notizen. {streak}",
    "{n}-day streak": "Serie von {n} Tagen",
    "No current streak": "Keine aktuelle Serie",
    "Notes on {date}: {n}": "Notizen am {date}: {n}",
    "Less": "Weniger",
    "More": "Mehr",
    "day streak": "Tage in Folge",
    "created in 12 weeks": "in 12 Wochen erstellt",
    "Notes": "Notizen",
    "Orphan notes": "Verwaiste Notizen",
    "Unresolved links": "Ungelöste Links",
    "Open tasks": "Offene Aufgaben",
    "Show the {n} orphan notes": "Die {n} verwaisten Notizen anzeigen",
    "Show the {n} unresolved links": "Die {n} ungelösten Links anzeigen",
    "Top tags": "Häufigste Tags",
    "Search for {tag}": "Nach {tag} suchen",
    "Based on file dates": "Nach Dateidaten",
    "Updated {time}": "Aktualisiert um {time}",
    "Back": "Zurück",
    "No orphan notes.": "Keine verwaisten Notizen.",
    "No unresolved links.": "Keine ungelösten Links.",
    "in {note}": "in {note}",
    "Archived ({n})": "Archiviert ({n})",
    "Archived": "Archiviert",
    "Archive project": "Projekt archivieren",
    "Unarchive project": "Projekt wiederherstellen",
    "Archived project {name}": "Projekt {name} archiviert",
    "Unarchived project {name}": "Projekt {name} wiederhergestellt",
    "No active projects. Add one above, or open Archived below.": "Keine aktiven Projekte. Füge oben eines hinzu oder öffne unten Archiviert.",
    "No tasks.": "Keine Aufgaben.",
    "This project is archived. Unarchive it from Edit project to add tasks or start timers.": "Dieses Projekt ist archiviert. Stelle es unter Projekt bearbeiten wieder her, um Aufgaben hinzuzufügen oder Timer zu starten.",
    "Archived project: timers are off": "Archiviertes Projekt: Timer sind aus",
    "Archived: its time still counts in reports and the weekly summary. Unarchive it to add tasks or start timers.": "Archiviert: Die Zeit zählt weiterhin in Berichten und der Wochenübersicht. Stelle das Projekt wieder her, um Aufgaben hinzuzufügen oder Timer zu starten.",
    "Archive a finished project to tuck it away. Its time still counts in reports and the weekly summary, but you can't start timers or add tasks until you unarchive it.": "Archiviere ein abgeschlossenes Projekt, um es wegzuräumen. Seine Zeit zählt weiterhin in Berichten und der Wochenübersicht, aber Timer und neue Aufgaben gibt es erst, wenn du es wiederherstellst.",
    "Previous comic": "Vorheriger Comic",
    "Next comic": "Nächster Comic",
    "Random comic": "Zufälliger Comic",
    "Random": "Zufall",
    "Back to today's comic": "Zurück zum heutigen Comic",
    "Couldn't load that comic.": "Dieser Comic konnte nicht geladen werden.",
    "xkcd {num}: {title}": "xkcd {num}: {title}",
    "Open in Obsidian (Surfing)": "In Obsidian (Surfing) öffnen",
    "Open in the default browser": "Im Standardbrowser öffnen",
    "Copy link": "Link kopieren",
    "Link copied.": "Link kopiert.",
    "Could not copy the link.": "Der Link konnte nicht kopiert werden.",
    "Running timer": "Laufender Timer",
    "Open {task}": "{task} öffnen",
    "Running timer display": "Anzeige des laufenden Timers",
    "Show the running timer where you can always see it: in Obsidian's status bar on desktop, or at the top of the dashboard on phones and tablets. Click it to open the task. Needs the Time tracker.": "Zeigt den laufenden Timer dort an, wo Sie ihn immer sehen: in der Statusleiste von Obsidian am Desktop oder oben im Dashboard auf Smartphones und Tablets. Ein Klick öffnet die Aufgabe. Erfordert die Zeiterfassung.",
    "Pause or resume the time tracker timer": "Timer der Zeiterfassung anhalten oder fortsetzen",
    "Stop the time tracker timer": "Timer der Zeiterfassung stoppen",
    "Timer running: {task}. Open it in the time tracker.": "Timer läuft: {task}. In der Zeiterfassung öffnen.",
    "No timer to resume. Start one from the Time tracker card.": "Kein Timer zum Fortsetzen. Starten Sie einen über die Karte Zeiterfassung.",
    "No timer is running.": "Es läuft kein Timer.",
    "Start date": "Startdatum",
    "Start time": "Startzeit",
    "End date": "Enddatum",
    "End time": "Endzeit",
    "Choose a start and an end, each with a day and a time.": "Wählen Sie Start und Ende, jeweils mit Tag und Uhrzeit.",
    "The end must be after the start. Check the end date.": "Das Ende muss nach dem Start liegen. Prüfen Sie das Enddatum.",
    "This adds {time}": "Fügt {time} hinzu",
    "Add time": "Zeit hinzufügen",
    "Add time manually": "Zeit manuell hinzufügen",
    "That time is in the future.": "Diese Zeit liegt in der Zukunft.",
    "Added {time} to {task}": "{time} zu {task} hinzugefügt",
    "Could not save the time tracker's data.": "Die Daten der Zeiterfassung konnten nicht gespeichert werden.",
    "Budget, all time": "Budget, gesamte Zeit",
    "Add a task and press Enter": "Aufgabe hinzufügen und Eingabetaste drücken",
    "Added project {name}": "Projekt {name} hinzugefügt",
    "Added task {name}": "Aufgabe {name} hinzugefügt",
    "All projects": "Alle Projekte",
    "All today": "Alle heute",
    "Allocated": "Zugewiesen",
    "Allocated (hours)": "Zugewiesen (Stunden)",
    "Allocated hours": "Zugewiesene Stunden",
    "Allocated minutes": "Zugewiesene Minuten",
    "Allocated time": "Zugewiesene Zeit",
    "Allocated time for the whole project": "Zugewiesene Zeit für das ganze Projekt",
    "Blue": "Blau",
    "Choose a start date that is not after the end date.": "Wählen Sie ein Startdatum, das nicht nach dem Enddatum liegt.",
    "Click again to confirm": "Zum Bestätigen erneut klicken",
    "Colour": "Farbe",
    "Confirm: {action}": "Bestätigen: {action}",
    "Could not export the time report.": "Der Zeitbericht konnte nicht exportiert werden.",
    "Custom range": "Benutzerdefinierter Zeitraum",
    "Date": "Datum",
    "Delete project and its tasks": "Projekt und seine Aufgaben löschen",
    "Delete session {when}": "Sitzung {when} löschen",
    "Delete task": "Aufgabe löschen",
    "Deleted project {name}": "Projekt {name} gelöscht",
    "Deleted task {name}": "Aufgabe {name} gelöscht",
    "Deleted the session {when}": "Sitzung {when} gelöscht",
    "Duration": "Dauer",
    "Edit project": "Projekt bearbeiten",
    "End": "Ende",
    "Export": "Exportieren",
    "Export {format}": "Als {format} exportieren",
    "From": "Von",
    "Generated {date}": "Erstellt am {date}",
    "Gold": "Gold",
    "Green": "Grün",
    "High": "Hoch",
    "Hours": "Stunden",
    "Last month": "Letzter Monat",
    "Last week": "Letzte Woche",
    "Leave this blank to add up the time allocated to each task instead.": "Leer lassen, um stattdessen die Zeiten der einzelnen Aufgaben zu addieren.",
    "Low": "Niedrig",
    "Marked done": "Als erledigt markiert",
    "Medium": "Mittel",
    "Name": "Name",
    "New project or company": "Neues Projekt oder Unternehmen",
    "New project or company…": "Neues Projekt oder Unternehmen …",
    "Next week": "Nächste Woche",
    "No projects yet. Add a client or project to start tracking time.": "Noch keine Projekte. Fügen Sie einen Kunden oder ein Projekt hinzu, um die Zeit zu erfassen.",
    "No sessions": "Keine Sitzungen",
    "No tasks yet. Add one above.": "Noch keine Aufgaben. Fügen Sie oben eine hinzu.",
    "No time limit": "Kein Zeitlimit",
    "No time was tracked in this period.": "In diesem Zeitraum wurde keine Zeit erfasst.",
    "No time was tracked this week.": "In dieser Woche wurde keine Zeit erfasst.",
    "None": "Keine",
    "Orange": "Orange",
    "Pause": "Pause",
    "Pause timer: {task}": "Timer anhalten: {task}",
    "Paused": "Pausiert",
    "Paused {task} at {time}": "{task} bei {time} pausiert",
    "Paused {task}: Obsidian was closed or the computer was asleep. The timer stopped at {time}.": "{task} pausiert: Obsidian war geschlossen oder der Computer im Ruhezustand. Der Timer wurde bei {time} angehalten.",
    "Period": "Zeitraum",
    "Pink": "Rosa",
    "Previous week": "Vorherige Woche",
    "Priority": "Priorität",
    "Project": "Projekt",
    "Project / task": "Projekt / Aufgabe",
    "Projects": "Projekte",
    "Red": "Rot",
    "Remaining": "Verbleibend",
    "Remaining (hours)": "Verbleibend (Stunden)",
    "Report": "Bericht",
    "Resume": "Fortsetzen",
    "Resume timer: {task}": "Timer fortsetzen: {task}",
    "Running": "Läuft",
    "Running: {task}": "Läuft: {task}",
    "Sessions": "Sitzungen",
    "Start": "Start",
    "Start timer: {task}": "Timer starten: {task}",
    "Started the timer for {task}": "Timer für {task} gestartet",
    "Stop": "Stoppen",
    "Stop timer: {task}": "Timer stoppen: {task}",
    "Stopped {task} at {time}": "{task} bei {time} gestoppt",
    "Summary": "Zusammenfassung",
    "Task": "Aufgabe",
    "Teal": "Petrol",
    "There is no tracked time in this period to export.": "In diesem Zeitraum gibt es keine erfasste Zeit zum Exportieren.",
    "This month": "Dieser Monat",
    "This session {time}": "Diese Sitzung {time}",
    "This week": "Diese Woche",
    "Time": "Zeit",
    "Time by project": "Zeit nach Projekt",
    "Time report": "Zeitbericht",
    "Time tracker": "Zeiterfassung",
    "Time tracker views": "Ansichten der Zeiterfassung",
    "To": "Bis",
    "Total": "Gesamt",
    "Total time on this task": "Gesamtzeit für diese Aufgabe",
    "Tracked": "Erfasst",
    "Tracked all time (hours)": "Insgesamt erfasst (Stunden)",
    "Tracked in range (hours)": "Im Zeitraum erfasst (Stunden)",
    "Untitled project": "Projekt ohne Titel",
    "Violet": "Violett",
    "Week": "Woche",
    "Weekly summary": "Wochenübersicht",
    "hours": "Stunden",
    "now": "jetzt",
    "priority": "Priorität",
    "to": "bis",
    "{n} session": "{n} Sitzung",
    "{n} sessions": "{n} Sitzungen",
    "{n} task": "{n} Aufgabe",
    "{n} tasks": "{n} Aufgaben",
    "{time} left": "{time} übrig",
    "{time} over": "{time} überschritten",
    "{today} today · {week} this week": "{today} heute · {week} diese Woche",
    "{used} of {total}": "{used} von {total}",
    "Track time on projects and tasks with timers, set time allocations, see a weekly summary and export reports as CSV, Excel or PDF. Stored in its own note, Time Tracking.md, in the Genkan data folder.": "Erfassen Sie die Zeit für Projekte und Aufgaben mit Timern, legen Sie Zeitbudgets fest, sehen Sie eine Wochenübersicht und exportieren Sie Berichte als CSV, Excel oder PDF. Gespeichert in einer eigenen Notiz, Time Tracking.md, im Genkan-Datenordner.",
    "Expand {name}": "{name} ausklappen",
    "On this day": "An diesem Tag",
    "A week ago": "Vor einer Woche",
    "A month ago": "Vor einem Monat",
    "A year ago": "Vor einem Jahr",
    "Nothing from this date": "Nichts von diesem Datum",
    "+ {n} more": "+ {n} weitere",
    "Export note as Markdown…": "Notiz als Markdown exportieren …",
    "This note is empty, so there is nothing to export.": "Diese Notiz ist leer, es gibt nichts zu exportieren.",
    "Exported to {path}": "Exportiert nach {path}",
    "Saved a copy in your vault as {name}": "Kopie im Tresor gespeichert als {name}",
    "Could not export the note.": "Die Notiz konnte nicht exportiert werden.",
    "Arrange cards": "Karten anordnen",
    "Drag a card by its handle, or use the arrow buttons. Press Done when you are finished.": "Ziehe eine Karte am Griff oder nutze die Pfeiltasten. Tippe auf Fertig, wenn du fertig bist.",
    "Reset layout": "Anordnung zurücksetzen",
    "Move {name}": "{name} verschieben",
    "Move {name} up": "{name} nach oben",
    "Move {name} down": "{name} nach unten",
    "Move {name} left": "{name} nach links",
    "Move {name} right": "{name} nach rechts",
    "Arranging cards": "Karten werden angeordnet",
    "Done arranging": "Anordnen beendet",
    "{name} picked up. Use the arrow keys to move it, Space to drop it and Escape to cancel.": "{name} aufgenommen. Mit den Pfeiltasten verschieben, mit der Leertaste ablegen, mit Esc abbrechen.",
    "Dropped. {position}": "Abgelegt. {position}",
    "{name}: {zone}, position {n} of {total}": "{name}: {zone}, Position {n} von {total}",
    "{name} can't move any further that way.": "{name} kann in diese Richtung nicht weiter verschoben werden.",
    "Move cancelled.": "Verschieben abgebrochen.",
    "Layout reset.": "Anordnung zurückgesetzt.",
    "Top row": "Obere Reihe",
    "Left column": "Linke Spalte",
    "Centre column": "Mittlere Spalte",
    "Right column": "Rechte Spalte",
    "Use on all my devices": "Auf allen meinen Geräten verwenden",
    "Layout saved for all your devices. Other devices pick it up when they next sync.": "Anordnung für alle deine Geräte gespeichert. Die anderen Geräte übernehmen sie bei der nächsten Synchronisierung.",
    "Layout updated from another device.": "Anordnung von einem anderen Gerät aktualisiert.",
    "Could not save the layout for your other devices.": "Die Anordnung konnte nicht für deine anderen Geräte gespeichert werden.",
    "Local layout: only on this device. Use on all my devices shares it.": "Lokale Anordnung: nur auf diesem Gerät. „Auf allen meinen Geräten verwenden“ teilt sie.",
    "Synced layout: the same on all your devices.": "Synchronisierte Anordnung: auf allen deinen Geräten gleich.",
    "Local layout: this device differs from the shared layout.": "Lokale Anordnung: dieses Gerät weicht von der geteilten Anordnung ab.",
    "Use the shared layout": "Geteilte Anordnung verwenden",
    "Switched to the shared layout.": "Zur geteilten Anordnung gewechselt.",
    "{date}, has a note": "{date}, hat eine Notiz",
    "Use the arrow keys to move between days.": "Mit den Pfeiltasten wechselst du zwischen den Tagen.",
    "{n} result": "{n} Ergebnis",
    "{n} results": "{n} Ergebnisse",
    "View all {n} notes": "Alle {n} Notizen anzeigen",
    "Open the file explorer and look in “{folder}”.": "Öffne den Dateiexplorer und sieh in „{folder}“ nach.",
    "Shows notes from this date a week, a month and a year ago, found from their created date. Nothing leaves your device.": "Zeigt Notizen von diesem Datum vor einer Woche, einem Monat und einem Jahr, anhand ihres Erstellungsdatums. Nichts verlässt dein Gerät.",
  },

  ja: {
    "Add a note to your homepage favourites…": "ホームページのお気に入りにノートを追加…",
    "Refresh": "更新",
    "Toggle theme": "テーマを切り替え",
    "Settings": "設定",
    "Open settings": "設定を開く",
    "Search your vault…": "保管庫を検索…",
    "Search your vault": "保管庫を検索",
    "Clear search": "検索をクリア",
    "Search results": "検索結果",
    "Photo of the day": "今日の写真",
    "Clock and search over the photo": "時計と検索を写真の上に表示",
    "Lays the greeting, clock, date and search box over the photo of the day instead of above it, which saves vertical space. The photo is darkened a little so the text stays readable, so very bright photos look duller. Needs the photo of the day.": "あいさつ、時計、日付、検索ボックスを今日の写真の上に重ねて表示し、縦のスペースを節約します。文字が読みやすいよう写真を少し暗くするため、とても明るい写真はやや地味に見えます。今日の写真が必要です。",
    "Load a new photo": "新しい写真を読み込む",
    "Load new photo": "新しい写真を読み込む",
    "Inspirational quotes provided by": "名言の提供元:",
    "Favourites": "お気に入り",
    "Calendar": "カレンダー",
    "Previous month": "前の月",
    "Next month": "次の月",
    "Today": "今日",
    "Quick links": "クイックリンク",
    "Ring notes": "リングのメモ",
    "Open the notes file": "メモのファイルを開く",
    "Open": "開く",
    "Web clips": "ウェブクリップ",
    "Refresh clips": "クリップを更新",
    "Refresh web clips": "ウェブクリップを更新",
    "Recent notes": "最近のノート",
    "Refresh recent notes": "最近のノートを更新",
    "Tasks": "タスク",
    "Add a task and press Enter…": "タスクを入力して Enter キーを押す…",
    "New task": "新しいタスク",
    "Filter tasks": "タスクを絞り込む",
    "All": "すべて",
    "Active": "未完了",
    "Done": "完了",
    "Clear completed": "完了したタスクを削除",
    "Saved": "保存済み",
    "Jot something down…": "メモを書く…",
    "Homepage": "ホームページ",
    "Note not found: {path}": "ノートが見つかりません: {path}",
    "Dark": "ダーク",
    "Light": "ライト",
    "System ({mode})": "システム（{mode}）",
    "Appearance: {label} — click to change": "外観: {label} — クリックで変更",
    "Good morning": "おはようございます",
    "Good afternoon": "こんにちは",
    "Good evening": "こんばんは",
    "Good night": "おやすみなさい",
    "{greeting}, ": "{greeting}、",
    "name suffix": "さん",
    "Could not create daily note: {error}": "デイリーノートを作成できませんでした: {error}",
    "Could not update tasks: {error}": "タスクを更新できませんでした: {error}",
    "No completed tasks yet.": "完了したタスクはまだありません。",
    "Nothing left to do!": "やることはありません！",
    "No tasks yet — add one above.": "タスクはまだありません。上から追加してください。",
    "Mark incomplete": "未完了にする",
    "Mark complete": "完了にする",
    "Delete": "削除",
    "Delete: {task}": "削除: {task}",
    "Could not save quick note: {error}": "クイックメモを保存できませんでした: {error}",
    "No quick links configured.": "クイックリンクが設定されていません。",
    "Command not found: {id}": "コマンドが見つかりません: {id}",
    "Unknown quick link action: {action}": "不明なクイックリンクの動作: {action}",
    "Yesterday": "昨日",
    "Choose the folder your ring saves notes to in Genkan's settings.": "Genkan の設定で、リングがメモを保存するフォルダを選んでください。",
    "No notes found in “{folder}”.": "「{folder}」にノートが見つかりません。",
    "No ring notes yet. Looking for “{path}”.": "リングのメモはまだありません。「{path}」を探しています。",
    "No timestamped entries found in “{path}”.": "「{path}」に日時付きの項目が見つかりません。",
    "Not found — click to create": "見つかりません — クリックして作成",
    "Remove from favourites": "お気に入りから削除",
    "Remove {label} from favourites": "{label} をお気に入りから削除",
    "Add a favourite": "お気に入りを追加",
    "+ Add": "+ 追加",
    "Pin the notes you open most. You can also right-click any note → “Add to homepage favourites”.": "よく開くノートをピン留めできます。ノートを右クリックして「ホームページのお気に入りに追加」を選ぶこともできます。",
    "No clips found in “{folder}”.": "「{folder}」にクリップが見つかりません。",
    "(no folder set)": "（フォルダ未設定）",
    "No notes found.": "ノートが見つかりません。",
    "↻ Searching…": "↻ 検索中…",
    "No results for “{query}”": "「{query}」の検索結果はありません",
    "Nature photo": "自然の写真",
    "Landscape photo of the day": "今日の風景写真",
    "Photo by {photographer} on {site}": "写真: {photographer}（{site}）",
    "Photo from {site}": "写真: {site}",
    "Your name": "あなたの名前",
    "Shown in the greeting.": "あいさつに表示されます。",
    "e.g. Alex": "例: Alex",
    "Open on startup": "起動時に開く",
    "Open the homepage when Obsidian starts.": "Obsidian の起動時にホームページを開きます。",
    "Appearance": "外観",
    "System follows Obsidian's light/dark theme.": "「システム」は Obsidian のライト/ダークテーマに従います。",
    "System": "システム",
    "Clock format": "時刻の形式",
    "12-hour (AM/PM)": "12時間制（午前/午後）",
    "24-hour": "24時間制",
    "Language": "言語",
    "Automatic follows Obsidian's language setting.": "「自動」は Obsidian の言語設定に従います。",
    "Automatic": "自動",
    "Spelling": "スペル",
    "Automatic follows your device's region. Command names change after you restart Obsidian.": "「自動」はデバイスの地域設定に従います。コマンド名は Obsidian を再起動すると変わります。",
    "American (favorite)": "アメリカ英語 (favorite)",
    "British (favourite)": "イギリス英語 (favourite)",
    "First day of the week": "週の開始日",
    "Automatic follows your device's region.": "「自動」はデバイスの地域設定に従います。",
    "Sunday": "日曜日",
    "Monday": "月曜日",
    "Saturday": "土曜日",
    "Custom clock font": "時計のカスタムフォント",
    "The name of a font installed on this device, such as Courier New or Avenir Next. A device without it uses the dashboard font.": "このデバイスにインストールされているフォント名（Courier New や Avenir Next など）。そのフォントがないデバイスでは、ダッシュボードのフォントが使われます。",
    "Font name": "フォント名",
    "Clock font": "時計のフォント",
    "Uses fonts already on your device. Your Obsidian theme's fonts are available too.": "デバイスにあるフォントを使います。Obsidian のテーマのフォントも使えます。",
    "Folders": "フォルダ",
    "Web Clipper folder": "Web Clipper のフォルダ",
    "Where the Web Clipper saves notes.": "Web Clipper がノートを保存する場所です。",
    "Daily notes folder": "デイリーノートのフォルダ",
    "Leave blank to use your Daily Notes / Periodic Notes settings.": "空欄にすると、デイリーノート / Periodic Notes の設定を使います。",
    "Data folder": "データフォルダ",
    "Tasks.md and Quick Note.md are stored here, so Obsidian Sync shares them across devices.": "Tasks.md と Quick Note.md がここに保存され、Obsidian Sync でデバイス間で共有されます。",
    "Content": "表示内容",
    "Max web clips": "ウェブクリップの最大数",
    "Max recent notes": "最近のノートの最大数",
    "Pebble ring notes": "Pebble リングのメモ",
    "Show the latest voice notes from your Pebble Index ring.": "Pebble Index リングの最新の音声メモを表示します。",
    "Ring note": "リングのノート",
    "The note the ring adds your voice notes to, with entries under headings like “## 2026-10-05 21:55”.": "リングが音声メモを追記するノートです。「## 2026-10-05 21:55」のような見出しの下に項目が追加されます。",
    "Ring notes folder": "リングのメモのフォルダ",
    "The folder the ring saves each voice note into, one file per note.": "リングが音声メモを1件ごとに別のファイルとして保存するフォルダです。",
    "Where does the ring save notes?": "リングはメモをどこに保存しますか？",
    "Match the Obsidian setting in the Pebble app.": "Pebble アプリの Obsidian 設定と同じものを選んでください。",
    "One main note (Pebble Index.md)": "1つのメインノート（Pebble Index.md）",
    "An existing note I choose": "自分で選んだ既存のノート",
    "A separate file for each note": "メモごとに別のファイル",
    "Max ring notes": "リングのメモの最大数",
    "Shows a landscape photo from Picsum, or from Unsplash if you add a key below. Off means no photo is requested.": "Picsum の風景写真を表示します。下にキーを入力すると Unsplash の写真になります。オフにすると写真は取得されません。",
    "Unsplash access key": "Unsplash アクセスキー",
    "Optional. Enables nature photos from Unsplash with attribution. The key is stored in this plugin's settings file in your vault.": "任意です。出典を明記して Unsplash の自然の写真を表示できます。キーは保管庫内のこのプラグインの設定ファイルに保存されます。",
    "Daily quote": "今日の名言",
    "Site icons on web clips": "ウェブクリップのサイトアイコン",
    "Uses Google's favicon service, which receives the domain of each clipped page. Off means no icon requests.": "Google のファビコンサービスを使い、クリップしたページのドメインが送信されます。オフにするとアイコンは取得されません。",
    "One per line: icon | label | action. Actions: command:<command id>, open:<note path>, daily, random, or an https:// URL.": "1行に1つ: アイコン | ラベル | 動作。動作: command:<コマンドID>、open:<ノートのパス>、daily、random、または https:// の URL。",
    "Open homepage": "ホームページを開く",
    "Add or remove current note from homepage favourites": "現在のノートをホームページのお気に入りに追加または削除",
    "Add a note to homepage favourites…": "ホームページのお気に入りにノートを追加…",
    "Remove from homepage favourites": "ホームページのお気に入りから削除",
    "Add to homepage favourites": "ホームページのお気に入りに追加",
    "Add or remove from homepage favourites": "ホームページのお気に入りに追加または削除",
    "{name} is already a favourite": "{name} はすでにお気に入りです",
    "Added {name} to favourites": "{name} をお気に入りに追加しました",
    "Could not add favourite: {error}": "お気に入りを追加できませんでした: {error}",
    "Removed {name} from favourites": "{name} をお気に入りから削除しました",
    "Dashboard default": "ダッシュボードの標準",
    "Obsidian interface font": "Obsidian のインターフェースフォント",
    "Obsidian text font": "Obsidian のテキストフォント",
    "Obsidian monospace font": "Obsidian の等幅フォント",
    "System serif": "システムの明朝体",
    "Custom (a font installed on this device)": "カスタム（このデバイスにあるフォント）",
    "New Note": "新規ノート",
    "Today's Note": "今日のノート",
    "Search Vault": "保管庫を検索",
    "Graph View": "グラフビュー",
    "Random Note": "ランダムノート",
    "Shows a quote each day. Off means no quote is shown and none is requested.": "毎日1つ名言を表示します。オフにすると名言は表示も取得もされません。",
    "Quote source": "名言の取得元",
    "ZenQuotes and Echoes are fetched once a day over the network, and ZenQuotes is English only. The bundled list works offline.": "ZenQuotes と Echoes は1日1回ネットワーク経由で取得します（ZenQuotes は英語のみ）。内蔵リストはオフラインで使えます。",
    "ZenQuotes (English)": "ZenQuotes（英語）",
    "Echoes (your language)": "Echoes（あなたの言語）",
    "Bundled list (your language)": "内蔵リスト（あなたの言語）",
    "Formatting": "書式",
    "Bold": "太字",
    "Italic": "斜体",
    "Underline": "下線",
    "Strikethrough": "取り消し線",
    "Heading": "見出し",
    "Bulleted list": "箇条書き",
    "Numbered list": "番号付きリスト",
    "Link": "リンク",
    "Link address": "リンク先",
    "Apply": "適用",
    "Cancel": "キャンセル",
    "That kind of link isn't supported.": "この種類のリンクには対応していません。",
    "This note has formatting the editor can't show, so it appears as plain text.": "このメモにはエディタで表示できない書式が含まれているため、プレーンテキストで表示しています。",
    "Quick notes": "クイックメモ",
    "Just now": "たった今",
    "{n} line": "{n} 行",
    "{n} lines": "{n} 行",
    "{n} word": "{n} 語",
    "{n} words": "{n} 語",
    "{n} character": "{n} 文字",
    "{n} characters": "{n} 文字",
    "Note {n}, has text": "メモ {n}、入力あり",
    "Note {n}, empty": "メモ {n}、空",
    "Unsaved changes": "未保存の変更",
    "Quick note {n}": "クイックメモ {n}",
    "Collapse {name}": "{name} を折りたたむ",
    "xkcd comic of the day": "今日のxkcdコミック",
    "Shows one xkcd comic a day, the same one on all your devices, with buttons to browse others. Today's comic loads from xkcd.com once a day and its image whenever the dashboard opens; browsing loads more. Off means nothing is requested.": "xkcdのコミックを1日1本、すべてのデバイスで同じものを表示し、ボタンで他のコミックも見られます。今日のコミックは1日に1回xkcd.comから、画像はダッシュボードを開くたびに読み込み、閲覧すると追加で読み込みます。オフにすると何も取得しません。",
    "Loading the comic…": "コミックを読み込んでいます…",
    "Couldn't load today's comic.": "今日のコミックを読み込めませんでした。",
    "Try again": "もう一度試す",
    "By Randall Munroe": "作者: Randall Munroe",
    "Explain this comic": "このコミックを解説",
    "Vault stats": "保管庫の統計",
    "A summary of your vault: a 12-week heatmap of the days you wrote, your streak, counts of notes, orphan notes, unresolved links and open tasks, and your top tags. Worked out on your device from file dates and links; nothing is sent anywhere.": "保管庫の概要です。書いた日の12週間ヒートマップ、連続日数、ノート数、孤立ノート、未解決リンク、未完了タスクの数、よく使うタグを表示します。ファイルの日付とリンクからお使いの端末で計算し、何も送信しません。",
    "Notes created or edited each day over the last 12 weeks. {streak}": "過去12週間に毎日作成または編集したノート。{streak}",
    "{n}-day streak": "{n}日連続",
    "No current streak": "連続記録なし",
    "Notes on {date}: {n}": "{date}のノート: {n}",
    "Less": "少ない",
    "More": "多い",
    "day streak": "日連続",
    "created in 12 weeks": "12週間で作成",
    "Notes": "ノート",
    "Orphan notes": "孤立ノート",
    "Unresolved links": "未解決リンク",
    "Open tasks": "未完了タスク",
    "Show the {n} orphan notes": "{n}件の孤立ノートを表示",
    "Show the {n} unresolved links": "{n}件の未解決リンクを表示",
    "Top tags": "よく使うタグ",
    "Search for {tag}": "{tag}を検索",
    "Based on file dates": "ファイルの日付に基づく",
    "Updated {time}": "{time}に更新",
    "Back": "戻る",
    "No orphan notes.": "孤立ノートはありません。",
    "No unresolved links.": "未解決リンクはありません。",
    "in {note}": "{note}内",
    "Archived ({n})": "アーカイブ済み（{n}）",
    "Archived": "アーカイブ済み",
    "Archive project": "プロジェクトをアーカイブ",
    "Unarchive project": "アーカイブを解除",
    "Archived project {name}": "プロジェクト {name} をアーカイブしました",
    "Unarchived project {name}": "プロジェクト {name} のアーカイブを解除しました",
    "No active projects. Add one above, or open Archived below.": "アクティブなプロジェクトはありません。上で追加するか、下の「アーカイブ済み」を開いてください。",
    "No tasks.": "タスクはありません。",
    "This project is archived. Unarchive it from Edit project to add tasks or start timers.": "このプロジェクトはアーカイブされています。タスクの追加やタイマーの開始は、「プロジェクトを編集」でアーカイブを解除してから行ってください。",
    "Archived project: timers are off": "アーカイブ済みのプロジェクト：タイマーは使えません",
    "Archived: its time still counts in reports and the weekly summary. Unarchive it to add tasks or start timers.": "アーカイブ済み：記録した時間はレポートと週のまとめに引き続き含まれます。タスクの追加やタイマーの開始は、解除してから行えます。",
    "Archive a finished project to tuck it away. Its time still counts in reports and the weekly summary, but you can't start timers or add tasks until you unarchive it.": "完了したプロジェクトはアーカイブして片付けられます。記録した時間はレポートと週のまとめに引き続き含まれますが、解除するまでタイマーの開始やタスクの追加はできません。",
    "Previous comic": "前のコミック",
    "Next comic": "次のコミック",
    "Random comic": "ランダムなコミック",
    "Random": "ランダム",
    "Back to today's comic": "今日のコミックに戻る",
    "Couldn't load that comic.": "そのコミックを読み込めませんでした。",
    "xkcd {num}: {title}": "xkcd {num}: {title}",
    "Open in Obsidian (Surfing)": "Obsidian (Surfing) で開く",
    "Open in the default browser": "既定のブラウザで開く",
    "Copy link": "リンクをコピー",
    "Link copied.": "リンクをコピーしました。",
    "Could not copy the link.": "リンクをコピーできませんでした。",
    "Running timer": "実行中のタイマー",
    "Open {task}": "{task} を開く",
    "Running timer display": "実行中タイマーの表示",
    "Show the running timer where you can always see it: in Obsidian's status bar on desktop, or at the top of the dashboard on phones and tablets. Click it to open the task. Needs the Time tracker.": "実行中のタイマーを常に見える場所に表示します。デスクトップ版では Obsidian のステータスバー、スマートフォンやタブレットではダッシュボードの上部です。クリックするとタスクが開きます。タイムトラッカーが必要です。",
    "Pause or resume the time tracker timer": "タイムトラッカーのタイマーを一時停止または再開",
    "Stop the time tracker timer": "タイムトラッカーのタイマーを停止",
    "Timer running: {task}. Open it in the time tracker.": "タイマー実行中: {task}。タイムトラッカーで開く。",
    "No timer to resume. Start one from the Time tracker card.": "再開するタイマーがありません。タイムトラッカーのカードから開始してください。",
    "No timer is running.": "実行中のタイマーはありません。",
    "Start date": "開始日",
    "Start time": "開始時刻",
    "End date": "終了日",
    "End time": "終了時刻",
    "Choose a start and an end, each with a day and a time.": "開始と終了の日付と時刻をそれぞれ指定してください。",
    "The end must be after the start. Check the end date.": "終了は開始より後にしてください。終了日を確認してください。",
    "This adds {time}": "{time} が追加されます",
    "Add time": "時間を追加",
    "Add time manually": "手動で時間を追加",
    "That time is in the future.": "その時刻は未来です。",
    "Added {time} to {task}": "{task} に {time} を追加しました",
    "Could not save the time tracker's data.": "タイムトラッカーのデータを保存できませんでした。",
    "Budget, all time": "予算 (累計)",
    "Add a task and press Enter": "タスクを追加して Enter を押す",
    "Added project {name}": "プロジェクト {name} を追加しました",
    "Added task {name}": "タスク {name} を追加しました",
    "All projects": "すべてのプロジェクト",
    "All today": "今日の合計",
    "Allocated": "割り当て",
    "Allocated (hours)": "割り当て (時間)",
    "Allocated hours": "割り当て時間 (時)",
    "Allocated minutes": "割り当て時間 (分)",
    "Allocated time": "割り当て時間",
    "Allocated time for the whole project": "プロジェクト全体の割り当て時間",
    "Blue": "青",
    "Choose a start date that is not after the end date.": "開始日は終了日以前の日付にしてください。",
    "Click again to confirm": "もう一度クリックして確定",
    "Colour": "色",
    "Confirm: {action}": "確認: {action}",
    "Could not export the time report.": "時間レポートを書き出せませんでした。",
    "Custom range": "期間を指定",
    "Date": "日付",
    "Delete project and its tasks": "プロジェクトとそのタスクを削除",
    "Delete session {when}": "セッション {when} を削除",
    "Delete task": "タスクを削除",
    "Deleted project {name}": "プロジェクト {name} を削除しました",
    "Deleted task {name}": "タスク {name} を削除しました",
    "Deleted the session {when}": "セッション {when} を削除しました",
    "Duration": "所要時間",
    "Edit project": "プロジェクトを編集",
    "End": "終了",
    "Export": "書き出し",
    "Export {format}": "{format} で書き出す",
    "From": "開始",
    "Generated {date}": "作成日 {date}",
    "Gold": "金",
    "Green": "緑",
    "High": "高",
    "Hours": "時間",
    "Last month": "先月",
    "Last week": "先週",
    "Leave this blank to add up the time allocated to each task instead.": "空欄にすると、各タスクの割り当て時間の合計が使われます。",
    "Low": "低",
    "Marked done": "完了済み",
    "Medium": "中",
    "Name": "名前",
    "New project or company": "新しいプロジェクトまたは会社",
    "New project or company…": "新しいプロジェクトまたは会社…",
    "Next week": "翌週",
    "No projects yet. Add a client or project to start tracking time.": "プロジェクトはまだありません。クライアントまたはプロジェクトを追加して時間の記録を始めましょう。",
    "No sessions": "セッションなし",
    "No tasks yet. Add one above.": "タスクはまだありません。上で追加してください。",
    "No time limit": "時間の上限なし",
    "No time was tracked in this period.": "この期間に記録された時間はありません。",
    "No time was tracked this week.": "今週記録された時間はありません。",
    "None": "なし",
    "Orange": "オレンジ",
    "Pause": "一時停止",
    "Pause timer: {task}": "タイマーを一時停止: {task}",
    "Paused": "一時停止中",
    "Paused {task} at {time}": "{task} を {time} で一時停止しました",
    "Paused {task}: Obsidian was closed or the computer was asleep. The timer stopped at {time}.": "{task} を一時停止しました: Obsidian が閉じていたか、コンピュータがスリープしていました。タイマーは {time} に停止しました。",
    "Period": "期間",
    "Pink": "ピンク",
    "Previous week": "前週",
    "Priority": "優先度",
    "Project": "プロジェクト",
    "Project / task": "プロジェクト / タスク",
    "Projects": "プロジェクト",
    "Red": "赤",
    "Remaining": "残り",
    "Remaining (hours)": "残り (時間)",
    "Report": "レポート",
    "Resume": "再開",
    "Resume timer: {task}": "タイマーを再開: {task}",
    "Running": "実行中",
    "Running: {task}": "実行中: {task}",
    "Sessions": "セッション",
    "Start": "開始",
    "Start timer: {task}": "タイマーを開始: {task}",
    "Started the timer for {task}": "{task} のタイマーを開始しました",
    "Stop": "停止",
    "Stop timer: {task}": "タイマーを停止: {task}",
    "Stopped {task} at {time}": "{task} を {time} で停止しました",
    "Summary": "サマリー",
    "Task": "タスク",
    "Teal": "ティール",
    "There is no tracked time in this period to export.": "この期間には書き出せる記録時間がありません。",
    "This month": "今月",
    "This session {time}": "このセッション {time}",
    "This week": "今週",
    "Time": "時刻",
    "Time by project": "プロジェクト別の時間",
    "Time report": "時間レポート",
    "Time tracker": "タイムトラッカー",
    "Time tracker views": "タイムトラッカーの表示",
    "To": "終了",
    "Total": "合計",
    "Total time on this task": "このタスクの合計時間",
    "Tracked": "記録",
    "Tracked all time (hours)": "累計記録 (時間)",
    "Tracked in range (hours)": "期間内の記録 (時間)",
    "Untitled project": "無題のプロジェクト",
    "Violet": "紫",
    "Week": "週",
    "Weekly summary": "週間サマリー",
    "hours": "時間",
    "now": "進行中",
    "priority": "優先度",
    "to": "〜",
    "{n} session": "{n} セッション",
    "{n} sessions": "{n} セッション",
    "{n} task": "{n} タスク",
    "{n} tasks": "{n} タスク",
    "{time} left": "残り {time}",
    "{time} over": "{time} 超過",
    "{today} today · {week} this week": "今日 {today} · 今週 {week}",
    "{used} of {total}": "{total} 中 {used}",
    "Track time on projects and tasks with timers, set time allocations, see a weekly summary and export reports as CSV, Excel or PDF. Stored in its own note, Time Tracking.md, in the Genkan data folder.": "タイマーでプロジェクトやタスクの時間を記録し、割り当て時間を設定し、週間サマリーを確認し、レポートを CSV、Excel、PDF で書き出せます。専用のノート Time Tracking.md として Genkan のデータフォルダに保存されます。",
    "Expand {name}": "{name} を展開",
    "On this day": "この日",
    "A week ago": "1週間前",
    "A month ago": "1か月前",
    "A year ago": "1年前",
    "Nothing from this date": "この日のノートはありません",
    "+ {n} more": "ほか {n} 件",
    "Export note as Markdown…": "ノートを Markdown として書き出す…",
    "This note is empty, so there is nothing to export.": "このノートは空のため、書き出すものがありません。",
    "Exported to {path}": "{path} に書き出しました",
    "Saved a copy in your vault as {name}": "コピーを Vault に {name} として保存しました",
    "Could not export the note.": "ノートを書き出せませんでした。",
    "Arrange cards": "カードを並べ替える",
    "Drag a card by its handle, or use the arrow buttons. Press Done when you are finished.": "ハンドルでカードをドラッグするか、矢印ボタンを使います。終わったら「完了」を押してください。",
    "Reset layout": "配置をリセット",
    "Move {name}": "{name} を移動",
    "Move {name} up": "{name} を上へ",
    "Move {name} down": "{name} を下へ",
    "Move {name} left": "{name} を左へ",
    "Move {name} right": "{name} を右へ",
    "Arranging cards": "カードを並べ替え中",
    "Done arranging": "並べ替えを終了しました",
    "{name} picked up. Use the arrow keys to move it, Space to drop it and Escape to cancel.": "{name} を持ち上げました。矢印キーで移動、スペースキーで置く、Escで取り消し。",
    "Dropped. {position}": "置きました。{position}",
    "{name}: {zone}, position {n} of {total}": "{name}：{zone}、{total} 件中 {n} 番目",
    "{name} can't move any further that way.": "{name} はこれ以上その方向へ動かせません。",
    "Move cancelled.": "移動を取り消しました。",
    "Layout reset.": "配置をリセットしました。",
    "Top row": "上の行",
    "Left column": "左の列",
    "Centre column": "中央の列",
    "Right column": "右の列",
    "Use on all my devices": "すべてのデバイスで使う",
    "Layout saved for all your devices. Other devices pick it up when they next sync.": "すべてのデバイス用に配置を保存しました。ほかのデバイスは次回の同期で反映されます。",
    "Layout updated from another device.": "別のデバイスから配置を更新しました。",
    "Could not save the layout for your other devices.": "ほかのデバイス用に配置を保存できませんでした。",
    "Local layout: only on this device. Use on all my devices shares it.": "ローカルの配置：このデバイスのみ。「すべてのデバイスで使う」で共有できます。",
    "Synced layout: the same on all your devices.": "同期済みの配置：すべてのデバイスで同じです。",
    "Local layout: this device differs from the shared layout.": "ローカルの配置：このデバイスは共有された配置と異なります。",
    "Use the shared layout": "共有された配置を使う",
    "Switched to the shared layout.": "共有された配置に切り替えました。",
    "{date}, has a note": "{date}、ノートあり",
    "Use the arrow keys to move between days.": "矢印キーで日付を移動できます。",
    "{n} result": "{n} 件の結果",
    "{n} results": "{n} 件の結果",
    "View all {n} notes": "{n} 件のノートをすべて表示",
    "Open the file explorer and look in “{folder}”.": "ファイルエクスプローラーを開いて「{folder}」を確認してください。",
    "Shows notes from this date a week, a month and a year ago, found from their created date. Nothing leaves your device.": "1週間前、1か月前、1年前のこの日付のノートを、作成日をもとに表示します。データがデバイスの外に出ることはありません。",
  },
};

const DEFAULT_QUICK_LINKS = [
  { icon: "📝", label: "New Note", action: "command:file-explorer:new-file" },
  { icon: "📅", label: "Today's Note", action: "daily" },
  { icon: "🔍", label: "Search Vault", action: "command:global-search:open" },
  { icon: "🕸️", label: "Graph View", action: "command:graph:open" },
  { icon: "🎲", label: "Random Note", action: "random" },
];

// ─── Language and locale ──────────────────────────────────────────────────────
// The interface language follows Obsidian's own language setting (or the plugin's Language
// setting). Dates, times and the first day of the week follow the matching region from the
// device. English spelling is British unless the region is American ("favourites" -> "favorites").

const LANGUAGES = { en: "English", fr: "Français", es: "Español", de: "Deutsch", ja: "日本語" };

let LANG = "en";
let LOCALE = "en-US";
let US_DETECTED = false; // an unknown or invalid locale keeps British spelling
let spellingChoice = "auto"; // auto | us | uk (the setting)

function obsidianLanguage() {
  try {
    if (typeof obsidian.getLanguage === "function") return obsidian.getLanguage();
  } catch {
    // older Obsidian
  }
  try {
    return moment.locale();
  } catch {
    return "en";
  }
}

// Obsidian's Electron shell reports en-US in navigator.language for any English region it has
// no translation for (Canada, say) and lists the OS preferences after it in navigator.languages.
function deviceLocaleFor(lang) {
  const list = [...(navigator.languages || []), navigator.language].filter(Boolean);
  const first = navigator.language || "";
  if (lang === "en") {
    if (/^en-US$/i.test(first)) {
      const other = list.find((l) => /^en-[A-Za-z]{2}$/.test(l) && !/^en-US$/i.test(l));
      if (other) return other;
    }
    return list.find((l) => /^en(-|$)/i.test(l)) || "en";
  }
  return list.find((l) => new RegExp(`^${lang}-`, "i").test(l)) || lang;
}

function applyLanguage(choice) {
  const wanted = !choice || choice === "auto" ? obsidianLanguage() : choice;
  const base = String(wanted || "en").toLowerCase().split(/[-_]/)[0];
  LANG = LANGUAGES[base] ? base : "en";
  LOCALE = "en-US";
  US_DETECTED = false;
  try {
    const l = deviceLocaleFor(LANG);
    new Intl.DateTimeFormat(l);
    LOCALE = l;
    US_DETECTED = LANG === "en" && /^en-(US|PR|GU|VI|AS|MP)\b/i.test(l);
  } catch {
    // keep the defaults
  }
}

// Source strings are written in British English; this converts them for American English
function S(text) {
  const us = spellingChoice === "us" || (spellingChoice === "auto" && US_DETECTED);
  return us ? text.replace(/favourite/g, "favorite").replace(/Favourite/g, "Favorite").replace(/centre/g, "center").replace(/Centre/g, "Center").replace(/colour/g, "color").replace(/Colour/g, "Color") : text;
}

// Translate a source string. Tables are keyed by the English text; {name} marks a value.
function T(key, vars) {
  let out = (LANG !== "en" && I18N[LANG]?.[key]) || I18N.en?.[key] || key;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return LANG === "en" ? S(out) : out;
}

// Fill {name} slots in a translated sentence with DOM nodes (links), keeping the word order
function appendTemplate(parent, template, nodes) {
  for (const part of template.split(/(\{\w+\})/)) {
    const key = part.slice(1, -1);
    if (part.startsWith("{") && nodes[key]) parent.append(nodes[key]);
    else if (part) parent.append(part);
  }
}

// AM/PM in the current language ("午前" in Japanese); English keeps AM and PM
function dayPeriod(date) {
  if (LANG === "en") return date.getHours() < 12 ? "AM" : "PM";
  const part = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", hour12: true })
    .formatToParts(date)
    .find((p) => p.type === "dayPeriod");
  return part ? part.value : date.getHours() < 12 ? "AM" : "PM";
}

function locale12h() {
  return !!new Intl.DateTimeFormat(LOCALE, { hour: "numeric" }).resolvedOptions().hour12;
}

// Regions whose week starts on Sunday, for engines without Intl.Locale week info
const SUNDAY_REGIONS = new Set(["US", "CA", "MX", "BR", "JP", "IL", "KR", "PH", "TW", "TH", "ZA", "IN", "PR", "SG", "HK"]);

// 0 = Sunday ... 6 = Saturday
function localeWeekStart() {
  try {
    const loc = new Intl.Locale(LOCALE);
    const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
    if (info && info.firstDay) return info.firstDay % 7;
    const region = loc.maximize().region;
    return SUNDAY_REGIONS.has(region) ? 0 : 1;
  } catch {
    return 0;
  }
}

function fmtNum(n) {
  return Number(n).toLocaleString(LOCALE);
}

const DEFAULT_SETTINGS = {
  userName: "",
  sharedLayout: null, // a card layout pushed to all devices: { layout, version } (see "Use on all my devices")
  clipsFolder: "Clippings",
  dailyNotesFolder: "", // blank = use the Daily Notes / Periodic Notes setting
  dataFolder: "genkan/data", // where Tasks.md and Quick Note.md live
  maxClips: 12,
  maxRecent: 8,
  theme: "system", // system | dark | light
  language: "auto", // auto (follow Obsidian) | en | fr | es | de | ja
  spelling: "auto", // auto | us | uk
  weekStart: "auto", // auto | 0 (Sunday) | 1 (Monday) | 6 (Saturday)
  clockFont: "default", // see CLOCK_FONTS
  clockFontCustom: "", // font name(s) typed in settings when clockFont is "custom"
  showHero: true,
  heroOverlay: false, // lay the greeting, clock and search over the photo instead of above it
  showQuote: true, // a daily quote
  quoteSource: undefined, // zenquotes | echoes | bundled (unset: ZenQuotes in English, else bundled)
  showFavicons: true, // site icons on web clips (Google's favicon service)
  showRingNotes: false, // Pebble Index ring notes card (off unless enabled)
  showOnThisDay: false, // notes from this date a week, a month and a year ago (off unless enabled)
  showTimerStatus: true, // the running timer in the status bar (desktop; needs the Time tracker)
  showXkcd: false, // an xkcd comic of the day (off unless enabled)
  showVaultStats: false, // a heatmap, streak, counts and top tags worked out from the vault (off unless enabled)
  showTimeTracker: false, // projects, tasks and timers (off unless enabled); the time lives in its own note
  // Where the ring saves notes: "main" = Pebble Index.md, "chosen" = a note you pick,
  // "files" = a separate file per note in a folder
  ringMode: "main",
  ringNotesFile: "Pebble Index.md", // used in "chosen" mode
  ringNotesFolder: "Pebble Index", // used in "files" mode (the Pebble app's default folder)
  maxRingNotes: 5,
  unsplashKey: "",
  openOnStartup: false,
  quickLinks: DEFAULT_QUICK_LINKS,
};

const HERO_TOPICS = "nature,landscape,mountains,forest,ocean,wilderness";

// ─── Utilities ────────────────────────────────────────────────────────────────

function newId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function joinPath(folder, name) {
  const f = (folder || "").replace(/^\/+|\/+$/g, "");
  return normalizePath(f ? `${f}/${name}` : name);
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function fmtDate(d, opts) {
  return d.toLocaleDateString(
    LOCALE,
    opts ?? { month: "short", day: "numeric", year: "numeric" },
  );
}

function dateFromFilename(title) {
  const m = title.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T00:00:00`);
  return isNaN(d.getTime()) ? null : fmtDate(d);
}

// Frontmatter values may be strings, arrays or Dates — reduce to one string
function fmString(v) {
  if (Array.isArray(v)) v = v[0];
  if (v == null) return "";
  return String(v);
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────
// Everything on the dashboard is built with DOM calls, never HTML strings, so note
// titles, task text and other vault content can't be interpreted as markup.

// h("div", { cls: "card", id: "x" }, child, "text", ...) -> element
function h(tag, props = {}, ...children) {
  const { cls, text, ...attr } = props;
  const classes = typeof cls === "string" ? cls.split(/\s+/).filter(Boolean) : cls;
  const el = createEl(tag, { cls: classes, text, attr });
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

const SEARCH_ICON =
  '<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

// Icons are fixed SVG source defined in this file; parse once, clone per use
const iconCache = {};
function iconNode(name) {
  if (!iconCache[name]) {
    const src = name === "search" ? SEARCH_ICON : ICONS[name];
    // Parsed as HTML so <svg> gets its SVG namespace without needing an xmlns attribute
    iconCache[name] = new DOMParser().parseFromString(src, "text/html").body.firstElementChild;
  }
  return iconCache[name].cloneNode(true);
}

// Put an icon (or nothing, if name is falsy) inside an element
function setIconSvg(el, name) {
  el.empty();
  if (name) el.append(iconNode(name));
}

// Only ever link to https URLs returned by remote services
const safeUrl = (u) => (/^https:\/\//.test(u || "") ? u : "");

// Fonts the clock can use. All come from the device (no web fonts, so no network
// request); the CSS for each lives in styles.extra.css under [data-clock-font].
const CLOCK_FONTS = {
  default: "Dashboard default",
  interface: "Obsidian interface font",
  text: "Obsidian text font",
  monospace: "Obsidian monospace font",
  serif: "System serif",
  custom: "Custom (a font installed on this device)",
};

// Turn what someone typed ("Courier New, Avenir Next") into a safe CSS font-family
// list. Only plain font names are kept; anything with other characters is dropped.
function cssFontFamily(input) {
  const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded"]);
  return String(input ?? "")
    .split(",")
    .map((n) => n.trim().replace(/^["']+|["']+$/g, "").trim())
    .filter((n) => /^[\p{L}\p{N} .&+-]{1,60}$/u.test(n))
    .map((n) => (generic.has(n.toLowerCase()) ? n.toLowerCase() : `"${n}"`))
    .join(", ");
}

function formatClipDate(str) {
  if (!str) return "";
  const d = new Date(str.length === 10 ? `${str}T00:00:00` : str);
  if (isNaN(d.getTime())) return str;
  return fmtDate(d, { month: "long", day: "numeric", year: "numeric" });
}

// ─── Tasks.md format ──────────────────────────────────────────────────────────
//   - [ ] text ➕ 2026-10-10 ^block-id
// Compatible with the Obsidian Tasks plugin; the ^id is a native block id.

const TASK_RE =
  /^(\s*)[-*+] \[([ xX])\]\s+(.*?)(?:\s+➕ (\d{4}-\d{2}-\d{2}))?(?:\s+\^([A-Za-z0-9-]+))?\s*$/;

function parseTasks(markdown) {
  const tasks = [];
  for (const line of (markdown || "").split("\n")) {
    const m = line.match(TASK_RE);
    if (!m || !m[3]) continue;
    tasks.push({
      id: m[5] || null,
      text: m[3],
      done: m[2] !== " ",
    });
  }
  return tasks;
}

// First line after any YAML frontmatter
function bodyStart(text) {
  if (text.startsWith("---\n")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const nl = text.indexOf("\n", end + 1);
      return nl === -1 ? text.length : nl + 1;
    }
  }
  return 0;
}

function mapTaskLines(text, fn) {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(TASK_RE);
      return m && m[3] ? fn(line, m) : line;
    })
    .filter((line) => line !== null)
    .join("\n");
}

// ─── View ─────────────────────────────────────────────────────────────────────

// Create a file (and its folders) if missing; tolerate a racing create from Sync
async function ensureFileIn(app, path, initial = "") {
  const vault = app.vault;
  let f = vault.getAbstractFileByPath(path);
  if (f instanceof TFile) return f;
  let folder = "";
  for (const part of path.split("/").slice(0, -1)) {
    folder = folder ? `${folder}/${part}` : part;
    if (vault.getAbstractFileByPath(folder)) continue;
    try {
      await vault.createFolder(folder);
    } catch {
      /* created by Sync or another view in the meantime */
    }
  }
  try {
    return await vault.create(path, initial);
  } catch (err) {
    f = vault.getAbstractFileByPath(path);
    if (f instanceof TFile) return f;
    throw err;
  }
}

// ─── Favourites.md format ─────────────────────────────────────────────────────
//   - [[Note name]]            (optionally [[Note#Heading|Label]])
// Plain wikilinks, so Obsidian keeps them correct when notes are renamed.

const FAV_RE = /^\s*[-*+]\s*\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/;

function parseFavourites(text) {
  const out = [];
  for (const line of (text || "").split("\n")) {
    const m = line.match(FAV_RE);
    if (m) out.push({ target: m[1].trim(), alias: (m[2] || "").trim() });
  }
  return out;
}

// ─── Quick note formatting ────────────────────────────────────────────────────
// Pure text edits for the toolbar and shortcuts. formatEdit(text, start, end, action) says
// what to replace ({ from, to, insert }) and where the selection goes afterwards.
// Underline has no markdown form, so it is written as <u>…</u>, which Obsidian renders.

const WRAPS = { bold: ["**", "**"], italic: ["*", "*"], underline: ["<u>", "</u>"], strike: ["~~", "~~"] };
const WORD_CHAR = /[\p{L}\p{N}_]/u;

function formatEdit(text, start, end, action) {
  if (WRAPS[action]) return wrapEdit(text, start, end, WRAPS[action][0], WRAPS[action][1]);
  if (action === "link") return linkEdit(text, start, end);
  if (action === "bullet" || action === "numbered" || action === "heading") return lineEdit(text, start, end, action);
  return null;
}

// A lone * is italic; ** belongs to bold, so italic must not treat it as its own marker
function isSingleStar(open, text, a, b) {
  return open !== "*" || (text[a - 2] !== "*" && text[b + 1] !== "*");
}

function wrapEdit(text, s, e, open, close) {
  if (s === e) {
    // No selection: format the word at the caret
    while (s > 0 && WORD_CHAR.test(text[s - 1])) s--;
    while (e < text.length && WORD_CHAR.test(text[e])) e++;
    if (s === e) {
      const at = s;
      return { from: at, to: at, insert: open + close, selStart: at + open.length, selEnd: at + open.length };
    }
  }
  const sel = text.slice(s, e);
  if (sel.includes("\n")) {
    // Markers cannot span lines in markdown, so format each line on its own
    const lines = sel.split("\n");
    const filled = lines.filter((l) => l.trim());
    const wrapped = (l) => l.trim().startsWith(open) && l.trim().endsWith(close) && l.trim().length > open.length + close.length;
    const allWrapped = filled.length > 0 && filled.every(wrapped);
    const out = lines.map((l) => {
      if (!l.trim()) return l;
      const lead = l.length - l.trimStart().length;
      const trail = l.length - l.trimEnd().length;
      const core = l.trim();
      const next = allWrapped ? core.slice(open.length, core.length - close.length) : wrapped(core) ? core : open + core + close;
      return l.slice(0, lead) + next + l.slice(l.length - trail);
    });
    const insert = out.join("\n");
    return { from: s, to: e, insert, selStart: s, selEnd: s + insert.length };
  }
  // Keep leading/trailing spaces outside the markers (markdown needs the marker beside the text)
  const lead = sel.length - sel.trimStart().length;
  const trail = sel.length - sel.trimEnd().length;
  const a = s + lead;
  const b = e - trail;
  if (a >= b) return { from: s, to: e, insert: open + sel + close, selStart: s + open.length, selEnd: s + open.length + sel.length };
  const inner = text.slice(a, b);
  // Markers just outside the selection: remove them
  if (text.slice(a - open.length, a) === open && text.slice(b, b + close.length) === close && isSingleStar(open, text, a, b)) {
    const from = a - open.length;
    return { from, to: b + close.length, insert: inner, selStart: from, selEnd: from + inner.length };
  }
  // Markers inside the selection: remove them
  if (
    inner.length >= open.length + close.length &&
    inner.startsWith(open) &&
    inner.endsWith(close) &&
    (open !== "*" || (inner[1] !== "*" && inner[inner.length - 2] !== "*"))
  ) {
    const plain = inner.slice(open.length, inner.length - close.length);
    return { from: a, to: b, insert: plain, selStart: a, selEnd: a + plain.length };
  }
  const selStart = a + open.length;
  return { from: a, to: b, insert: open + inner + close, selStart, selEnd: selStart + inner.length };
}

function linkEdit(text, s, e) {
  const sel = text.slice(s, e);
  if (/^https?:\/\/\S+$/.test(sel)) {
    // A pasted address: leave the cursor in the brackets to type the label
    return { from: s, to: e, insert: `[](${sel})`, selStart: s + 1, selEnd: s + 1 };
  }
  if (!sel) return { from: s, to: e, insert: "[](url)", selStart: s + 1, selEnd: s + 1 };
  const urlStart = s + sel.length + 3;
  return { from: s, to: e, insert: `[${sel}](url)`, selStart: urlStart, selEnd: urlStart + 3 };
}

// Bullets, numbering and headings apply to every line the selection touches
function lineEdit(text, s, e, action) {
  const from = s === 0 ? 0 : text.lastIndexOf("\n", s - 1) + 1;
  const last = e > s && text[e - 1] === "\n" ? e - 1 : e;
  const nl = text.indexOf("\n", last);
  const to = nl === -1 ? text.length : nl;
  const lines = text.slice(from, to).split("\n");
  // Blank lines and horizontal rules (---) are left alone
  let on = lines.map((l) => l.trim() !== "" && l !== "---");
  if (!on.some(Boolean)) {
    if (lines.length !== 1 || lines[0].trim() !== "") return null; // only rules: nothing to do
    on = [true]; // a lone blank line still gets its marker
  }
  const indent = (l) => l.match(/^\s*/)[0];
  const stripList = (l) => l.replace(/^(\s*)(?:[-*+]|\d+\.)\s+/, "$1");
  const stripHead = (l) => l.replace(/^(\s*)#{1,6}\s+/, "$1");
  let out;
  if (action === "bullet") {
    const all = lines.every((l, i) => !on[i] || /^\s*[-*+]\s+/.test(l));
    out = lines.map((l, i) => (!on[i] ? l : all ? stripList(l) : `${indent(l)}- ${stripList(stripHead(l)).trimStart()}`));
  } else if (action === "numbered") {
    const all = lines.every((l, i) => !on[i] || /^\s*\d+\.\s+/.test(l));
    let n = 0;
    out = lines.map((l, i) => (!on[i] ? l : all ? stripList(l) : `${indent(l)}${++n}. ${stripList(stripHead(l)).trimStart()}`));
  } else {
    // heading: none -> # -> ## -> ### -> none, based on the first line
    const m = lines[on.indexOf(true)].match(/^\s*(#{1,6})\s/);
    const level = m ? m[1].length : 0;
    const next = level >= 3 ? 0 : level + 1;
    out = lines.map((l, i) => (!on[i] ? l : `${indent(l)}${next ? "#".repeat(next) + " " : ""}${stripHead(l).trimStart()}`));
  }
  const insert = out.join("\n");
  if (s !== e) return { from, to, insert, selStart: from, selEnd: from + insert.length };
  const caret = Math.min(from + out[0].length, Math.max(from, s + (out[0].length - lines[0].length)));
  return { from, to, insert, selStart: caret, selEnd: caret };
}

// ─── Quick note rich editor ───────────────────────────────────────────────────
// The note file stays plain markdown. These convert between markdown and the editor's DOM for
// the subset the toolbar writes: **bold**, *italic*, <u>underline</u>, ~~strike~~, [links](url),
// "# " headings, "- " bullets and "1. " numbering. Every other line is kept as literal text, and
// noteRoundTrips() lets the editor refuse any note it could not write back unchanged.

const SAFE_HREF = /^(https?:\/\/|mailto:|obsidian:\/\/)\S+$/i;
const NOT_SPACE = (ch) => ch !== undefined && !/\s/.test(ch);

function markdownToInline(s) {
  const frag = document.createDocumentFragment();
  let buf = "";
  const flush = () => {
    if (buf) {
      frag.append(buf);
      buf = "";
    }
  };
  const wrap = (tag, inner, attrs) => {
    flush();
    const el = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
    el.append(markdownToInline(inner));
    frag.append(el);
  };
  let i = 0;
  while (i < s.length) {
    const two = s.substr(i, 2);
    if (two === "**" || two === "~~") {
      const j = s.indexOf(two, i + 2);
      if (j > i + 2 && NOT_SPACE(s[i + 2]) && NOT_SPACE(s[j - 1])) {
        wrap(two === "**" ? "strong" : "s", s.slice(i + 2, j));
        i = j + 2;
        continue;
      }
    } else if (s[i] === "*" && NOT_SPACE(s[i + 1]) && s[i + 1] !== "*") {
      let j = i + 1;
      while ((j = s.indexOf("*", j)) !== -1) {
        if (s[j + 1] === "*") {
          j += 2;
          continue;
        }
        if (NOT_SPACE(s[j - 1])) break;
        j++;
      }
      if (j !== -1) {
        wrap("em", s.slice(i + 1, j));
        i = j + 1;
        continue;
      }
    } else if (s.startsWith("<u>", i)) {
      const j = s.indexOf("</u>", i + 3);
      if (j > i + 3) {
        wrap("u", s.slice(i + 3, j));
        i = j + 4;
        continue;
      }
    } else if (s[i] === "[") {
      const m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(s.slice(i));
      if (m && SAFE_HREF.test(m[2])) {
        wrap("a", m[1], { href: m[2] });
        i += m[0].length;
        continue;
      }
    }
    buf += s[i++];
  }
  flush();
  return frag;
}

// One block per line, so the editor and the file always agree on where lines are
function markdownToBlocks(md) {
  const frag = document.createDocumentFragment();
  let list = null; // the open <ul>/<ol>
  let n = 0; // last number in the open <ol>
  const line = (tag, text) => {
    const el = document.createElement(tag);
    el.append(markdownToInline(text));
    if (!text) el.append(document.createElement("br"));
    return el;
  };
  for (const raw of md.split("\n")) {
    if (raw === "---") {
      list = null;
      frag.append(document.createElement("hr"));
      continue;
    }
    let m = /^(#{1,6}) (.*)$/.exec(raw);
    if (m) {
      list = null;
      const heading = line(`h${m[1].length}`, m[2]);
      // Inside a card whose title is an h2, a note's own headings start at level 3
      heading.setAttribute("aria-level", String(Math.min(6, m[1].length + 2)));
      frag.append(heading);
      continue;
    }
    m = /^- (.*)$/.exec(raw);
    if (m) {
      if (!list || list.kind !== "ul") {
        list = { kind: "ul", el: document.createElement("ul") };
        frag.append(list.el);
      }
      list.el.append(line("li", m[1]));
      continue;
    }
    m = /^(\d+)\. (.*)$/.exec(raw);
    if (m) {
      // Only a list that counts 1, 2, 3 is rebuilt as one; anything else stays literal text
      const expected = list && list.kind === "ol" ? n + 1 : 1;
      if (m[1] === String(expected)) {
        if (!list || list.kind !== "ol") {
          list = { kind: "ol", el: document.createElement("ol") };
          frag.append(list.el);
        }
        n = expected;
        list.el.append(line("li", m[2]));
        continue;
      }
    }
    list = null;
    frag.append(line("div", raw));
  }
  return frag;
}

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "HR"]);

// Wrap an element's text in the markdown for its styling (b, i, u, s, links, styled spans)
function styledToMarkdown(el, inner) {
  const tag = el.tagName;
  let bold = tag === "B" || tag === "STRONG";
  let italic = tag === "I" || tag === "EM";
  let under = tag === "U";
  let strike = tag === "S" || tag === "STRIKE" || tag === "DEL";
  if (tag === "SPAN" || tag === "FONT") {
    const st = el.style;
    bold = st.fontWeight === "bold" || Number(st.fontWeight) >= 600;
    italic = st.fontStyle === "italic";
    const deco = st.textDecorationLine || st.textDecoration || "";
    under = deco.includes("underline");
    strike = deco.includes("line-through");
  }
  let out = inner;
  // Markers go against the text, with any spaces outside them, and never span a line break
  const mark = (open, close) =>
    out
      .split("\n")
      .map((l) => {
        const core = l.trim();
        if (!core) return l;
        return l.slice(0, l.length - l.trimStart().length) + open + core + close + l.slice(l.trimEnd().length);
      })
      .join("\n");
  if (strike) out = mark("~~", "~~");
  if (under) out = mark("<u>", "</u>");
  if (italic) out = mark("*", "*");
  if (bold) out = mark("**", "**");
  if (tag === "A") {
    const href = el.getAttribute("href");
    if (href && out.trim()) out = `[${out}](${href})`;
  }
  return out;
}

function inlineToMarkdown(nodes) {
  let out = "";
  for (const c of nodes) {
    if (c.nodeType === 3) {
      out += c.nodeValue.replace(/ /g, " ").replace(/​/g, "");
    } else if (c.nodeType === 1) {
      out += c.tagName === "BR" ? "\n" : styledToMarkdown(c, inlineToMarkdown(c.childNodes));
    }
  }
  return out;
}

// Read the editor back into markdown, whatever structure the browser built while typing
function noteToMarkdown(root) {
  const lines = [];
  const pushLines = (text) => {
    for (const l of text.split("\n")) lines.push(l);
  };
  // A trailing <br> is the browser's placeholder for an empty line, not a line break. It can sit
  // inside styling too: Enter after bold text leaves <div><b><br></b></div>.
  const textOf = (nodes) => {
    const list = Array.from(nodes);
    const t = inlineToMarkdown(list);
    let leaf = list[list.length - 1];
    while (leaf && leaf.lastChild) leaf = leaf.lastChild;
    return leaf && leaf.nodeName === "BR" && t.endsWith("\n") ? t.slice(0, -1) : t;
  };
  const listItem = (li, marker, indent) => {
    const inline = [];
    const nested = [];
    for (const ch of li.childNodes) (ch.nodeType === 1 && (ch.tagName === "UL" || ch.tagName === "OL") ? nested : inline).push(ch);
    lines.push(indent + marker + textOf(inline).replace(/\n/g, " "));
    for (const sub of nested) {
      let k = 0;
      for (const subLi of sub.children) listItem(subLi, sub.tagName === "OL" ? `${++k}. ` : "- ", indent + "  ");
    }
  };
  let run = [];
  const flushRun = () => {
    if (run.length) pushLines(textOf(run));
    run = [];
  };
  const block = (el) => {
    const tag = el.tagName;
    if (tag === "HR") {
      lines.push("---");
    } else if (/^H[1-6]$/.test(tag)) {
      lines.push(`${"#".repeat(Number(tag[1]))} ${textOf(el.childNodes).replace(/\n/g, " ")}`);
    } else if (tag === "UL" || tag === "OL") {
      let k = 0;
      for (const li of el.children) listItem(li, tag === "OL" ? `${++k}. ` : "- ", "");
    } else if (tag === "LI") {
      listItem(el, "- ", "");
    } else if (Array.from(el.children).some((ch) => BLOCK_TAGS.has(ch.tagName))) {
      walk(el);
    } else {
      pushLines(textOf(el.childNodes));
    }
  };
  const walk = (parent) => {
    for (const c of parent.childNodes) {
      if (c.nodeType === 1 && BLOCK_TAGS.has(c.tagName)) {
        flushRun();
        block(c);
      } else {
        run.push(c);
      }
    }
    flushRun();
  };
  walk(root);
  return lines.join("\n");
}

// True when the editor can show this note and write it back byte for byte
function noteRoundTrips(md) {
  const probe = document.createElement("div");
  probe.append(markdownToBlocks(md));
  return noteToMarkdown(probe) === md;
}

// ─── Quick notes: seven of them, like Tot ─────────────────────────────────────
// Note 1 is the original "Quick Note.md"; the rest are "Quick Note 2.md" … "Quick Note 7.md".

const NOTE_COUNT = 7;

// Plain text of a note's markdown, for the footer counts
function notePlainText(md) {
  return md
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => {
      if (line === "---") return "";
      return line
        .replace(/^#{1,6} /, "")
        .replace(/^- /, "")
        .replace(/^\d+\. /, "")
        .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
        .replace(/<\/?u>/g, "")
        .replace(/\*\*|~~/g, "")
        .replace(/\*(\S(?:[^*]*\S)?)\*/g, "$1");
    })
    .join("\n");
}

function noteStats(md) {
  const text = notePlainText(md);
  const lines = text === "" ? 0 : text.replace(/\n$/, "").split("\n").length;
  const chars = text.replace(/\n/g, "").length;
  let words = 0;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    for (const part of new Intl.Segmenter(LOCALE, { granularity: "word" }).segment(text)) if (part.isWordLike) words++;
  } else {
    words = (text.match(/\S+/g) || []).length;
  }
  return { lines, words, chars };
}

function plural(n, one, other) {
  try {
    return T(new Intl.PluralRules(LOCALE).select(n) === "one" ? one : other, { n: fmtNum(n) });
  } catch {
    return T(n === 1 ? one : other, { n: fmtNum(n) });
  }
}

// "Just now", "5 min. ago", "yesterday", then a date
function savedAgo(ms) {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return T("Just now");
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto", style: "short" });
  if (mins < 60) return rtf.format(-mins, "minute");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return fmtDate(new Date(ms), { month: "short", day: "numeric", year: "numeric" });
}

// ─── On this day ──────────────────────────────────────────────────────────────
// Notes from today's date a week, a month and a year ago. A note belongs to a day by its
// created/clipped/date property, else by a date in its name (daily notes), else by the file's
// own created time, which is ignored on days when a flood of files share it (an import or a
// first sync stamps hundreds of notes with one day).

const FLOOD = 20;
const DAY_RE = /(\d{4})-(\d{2})-(\d{2})/;
// Whether dark text reads better than white over a photo, once the overlay scrim is laid on it.
// px is RGBA pixel data of the part of the photo behind the header. Scores each pixel's WCAG contrast
// for both choices (capped at 7, so one extreme pixel cannot dominate) and keeps white unless dark wins.
function heroPrefersDarkText(px) {
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const SCRIM = 0.4; // matches the gradient in styles.extra.css (a black scrim for white text, a white one for dark text)
  let white = 0;
  let dark = 0;
  let n = 0;
  for (let i = 0; i + 3 < px.length; i += 4) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    const lw = lum(r * (1 - SCRIM), g * (1 - SCRIM), b * (1 - SCRIM));
    const ld = lum(r * (1 - SCRIM) + 255 * SCRIM, g * (1 - SCRIM) + 255 * SCRIM, b * (1 - SCRIM) + 255 * SCRIM);
    white += Math.min(7, 1.05 / (lw + 0.05));
    dark += Math.min(7, (ld + 0.05) / 0.0575); // text #111 has luminance about 0.0056
    n++;
  }
  return n > 0 && dark / n > white / n + 0.5;
}

const VS_WEEKS = 12; // weeks shown in the Vault stats heatmap
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function onThisDayDates(today) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  // a 31st or 29 February lands on the last day that exists in the earlier month or year
  const clamp = (yy, mm) => new Date(yy, mm, Math.min(d, new Date(yy, mm + 1, 0).getDate()));
  return [
    { key: "week", date: new Date(y, m, d - 7) },
    { key: "month", date: clamp(m === 0 ? y - 1 : y, (m + 11) % 12) },
    { key: "year", date: clamp(y - 1, m) },
  ];
}

function noteDay(file, fm) {
  for (const k of ["created", "clipped", "date"]) {
    const m = fm && fmString(fm[k]).match(DAY_RE);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const m = file.basename.match(DAY_RE);
  return m ? m[0] : null;
}

// The first line of text, without markdown markers, for a one-line preview (a first line that
// only repeats the note's title is skipped)
function noteExcerpt(text, title) {
  for (const raw of text.slice(bodyStart(text)).split("\n")) {
    const line = raw
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, "")
      .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/<\/?u>|[*_~`]/g, "")
      .trim();
    if (line && line !== "---" && line.toLowerCase() !== (title || "").toLowerCase()) return line.slice(0, 160);
  }
  return "";
}

// A safe file name for an exported note: its first line of text, or "Quick Note N"
// Save a file: the browser's save dialog where it works (it remembers the folder you used last), else
// the share sheet, else a copy in the vault. Node's file and shell access are deliberately not used.
// Returns quietly when you close the dialog; throws only when nothing worked.
async function saveExportFile(app, name, data, mime, label) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const ext = name.slice(name.lastIndexOf(".") + 1);
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({ id: "genkan-export", suggestedName: name, types: [{ description: label, accept: { [mime]: [`.${ext}`] } }] });
      const out = await handle.createWritable();
      await out.write(bytes);
      await out.close();
      new Notice(T("Exported to {path}", { path: handle.name }));
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return; // the dialog was closed
      console.warn("Genkan: the save dialog is not available here, trying another way", err);
    }
  }
  // Phones and tablets: the share sheet lets you pick Files, Mail and so on
  try {
    const file = new File([bytes], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return; // the share sheet was closed
  }
  // Last resort: a copy in the vault, under a name that is not taken
  let target = name;
  for (let n = 2; app.vault.getAbstractFileByPath(normalizePath(target)); n++) target = name.replace(/(\.\w+)$/, ` ${n}$1`);
  await app.vault.createBinary(normalizePath(target), bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  new Notice(T("Saved a copy in your vault as {name}", { name: target }));
}

function exportFileName(md, index) {
  const title = noteExcerpt(md, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 60)
    .trim();
  return `${title || `Quick Note ${index === 1 ? "" : index}`.trim()}.md`;
}

// ─── Arranging cards ──────────────────────────────────────────────────────────
// The dashboard's cards live in four zones: a full-width row on top and three columns. A layout is
// the list of card ids in each zone; it is saved per device and always repaired against this list.
const ARRANGE_ZONES = ["top", "left", "center", "right"];
const DEFAULT_LAYOUT = {
  top: ["favs-card"],
  left: ["calendar-card", "links-card"],
  center: ["ring-card", "clips-card", "recent-card", "otd-card", "tt-card", "xkcd-card", "stats-card"],
  right: ["tasks-card", "note-card"],
};
const CARD_NAMES = {
  "favs-card": "Favourites",
  "calendar-card": "Calendar",
  "links-card": "Quick links",
  "ring-card": "Ring notes",
  "clips-card": "Web clips",
  "recent-card": "Recent notes",
  "otd-card": "On this day",
  "tt-card": "Time tracker",
  "xkcd-card": "xkcd",
  "stats-card": "Vault stats",
  "tasks-card": "Tasks",
  "note-card": "Quick notes",
};

// Drop unknown, duplicate and malformed entries, and put missing cards back in their default zone
function normaliseLayout(saved) {
  const known = new Set(Object.values(DEFAULT_LAYOUT).flat());
  const out = { top: [], left: [], center: [], right: [] };
  const seen = new Set();
  if (saved && typeof saved === "object") {
    for (const z of ARRANGE_ZONES) {
      if (!Array.isArray(saved[z])) continue;
      for (const id of saved[z]) {
        if (known.has(id) && !seen.has(id)) {
          seen.add(id);
          out[z].push(id);
        }
      }
    }
  }
  for (const z of ARRANGE_ZONES) {
    for (const id of DEFAULT_LAYOUT[z]) {
      if (!seen.has(id)) {
        seen.add(id);
        out[z].push(id);
      }
    }
  }
  return out;
}

function layoutsEqual(a, b) {
  return ARRANGE_ZONES.every((z) => (a[z] || []).join("|") === (b[z] || []).join("|"));
}

// One step for a card: up/down within its zone (past the end it crosses to the top row or the
// first column), left/right between the columns. Returns a new layout, or null when it can't move.
// Hidden cards (a switched-off card) are skipped over so a step always shows.
function moveInLayout(layout, id, dir, isVisible = () => true) {
  const next = {};
  for (const z of ARRANGE_ZONES) next[z] = layout[z].slice();
  const zone = ARRANGE_ZONES.find((z) => next[z].includes(id));
  if (!zone) return null;
  const list = next[zone];
  const i = list.indexOf(id);
  if (dir === "up") {
    let j = i - 1;
    while (j >= 0 && !isVisible(list[j])) j--;
    if (j >= 0) {
      list.splice(i, 1);
      list.splice(j, 0, id);
      return next;
    }
    if (zone === "top") return null;
    list.splice(i, 1);
    next.top.push(id);
    return next;
  }
  if (dir === "down") {
    let j = i + 1;
    while (j < list.length && !isVisible(list[j])) j++;
    if (j < list.length) {
      list.splice(i, 1);
      list.splice(j, 0, id);
      return next;
    }
    if (zone !== "top") return null;
    list.splice(i, 1);
    next.left.unshift(id);
    return next;
  }
  const cols = ["left", "center", "right"];
  const k = cols.indexOf(zone);
  const to = k < 0 ? null : cols[k + (dir === "left" ? -1 : 1)];
  if (!to) return null;
  list.splice(i, 1);
  next[to].splice(Math.min(i, next[to].length), 0, id);
  return next;
}

// ─── Ring notes (Pebble Index) ────────────────────────────────────────────────
// The ring's app appends entries to a note under timestamp headings:
//   ## 2026-10-05 21:55
//   Take note: ...

const RING_HEADING_RE = /^#{1,6}\s+(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?\s*$/;
const ANY_HEADING_RE = /^#{1,6}\s/;

function parseRingNotes(markdown) {
  const lines = (markdown || "").split("\n");
  const entries = [];
  let cur = null;
  lines.forEach((line, i) => {
    const m = line.match(RING_HEADING_RE);
    if (m) {
      const hasTime = m[4] !== undefined;
      cur = {
        line: i,
        hasTime,
        when: new Date(+m[1], +m[2] - 1, +m[3], hasTime ? +m[4] : 0, hasTime ? +m[5] : 0),
        body: [],
      };
      entries.push(cur);
    } else if (ANY_HEADING_RE.test(line)) {
      cur = null; // some other section — not ring content
    } else if (cur) {
      cur.body.push(line);
    }
  });
  entries.forEach((e) => (e.text = e.body.join("\n").trim()));
  // Newest first; entries that share a timestamp keep "later in the file = newer"
  return entries
    .filter((e) => e.text)
    .reverse()
    .sort((a, b) => b.when - a.when);
}

// ── "A separate file for each note" mode ──
// One file per voice note. Pebble's exact file format isn't documented, so be
// tolerant: timestamp from frontmatter, else the file name, else creation time.

const RING_FM_KEYS = ["created", "date", "timestamp", "time", "datetime", "recorded", "recorded_at", "created_at", "createdat"];
const RING_NAME_RES = [
  // 2026-10-11 0021 / 2026-10-11 002130 — the style the Pebble app uses (date, then HHmm)
  /(\d{4})-(\d{2})-(\d{2})[ T_-]+(\d{2})(\d{2})(\d{2})?(?!\d)/,
  // 2026-10-11 09-15 / 2026-10-11T09:15:30 / 2026-10-11_09.15 / 2026-10-11 (date only)
  /(\d{4})-(\d{2})-(\d{2})(?:[ T_.-]+(\d{1,2})[.:h-](\d{2})(?:[.:-](\d{2}))?)?/,
  // 20261011-0915 / 20261011_091530
  /(\d{4})(\d{2})(\d{2})[ T_-](\d{2})(\d{2})(\d{2})?/,
];

function ringDate(y, mo, d, hr, mi, sec) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const hasTime = hr !== undefined && hr <= 23 && mi <= 59;
  return {
    hasTime,
    when: new Date(y, mo - 1, d, hasTime ? hr : 0, hasTime ? mi : 0, hasTime && sec ? sec : 0),
  };
}

function ringDateFromString(str) {
  for (const re of RING_NAME_RES) {
    const m = String(str).match(re);
    if (!m) continue;
    const r = ringDate(+m[1], +m[2], +m[3], m[4] === undefined ? undefined : +m[4], m[5] === undefined ? undefined : +m[5], m[6] === undefined ? 0 : +m[6]);
    if (r) return r;
  }
  return null;
}

function ringFileTimestamp(file, frontmatter) {
  const fm = {};
  for (const [k, v] of Object.entries(frontmatter || {})) fm[k.toLowerCase()] = v;
  for (const key of RING_FM_KEYS) {
    if (fm[key] == null) continue;
    const r = ringDateFromString(fmString(fm[key]));
    if (r) return r;
    const d = new Date(fmString(fm[key]));
    if (!isNaN(d.getTime())) return { when: d, hasTime: true };
  }
  const fromName = ringDateFromString(file.basename);
  if (fromName) return fromName;
  return { when: new Date(file.stat.ctime), hasTime: true };
}

// The note's text: body without frontmatter, minus a leading heading that is just a timestamp
function ringFileText(raw) {
  const body = (raw || "").replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, "");
  const lines = body.split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  if (lines.length && /^#{1,6}\s/.test(lines[0])) {
    const title = lines[0].replace(/^#{1,6}\s+/, "").trim();
    if (/^\d{4}-\d{2}-\d{2}([ T_.-]+\d{1,2}[.:h-]\d{2}([.:-]\d{2})?)?$/.test(title)) lines.shift();
    else lines[0] = title;
  }
  return lines.join("\n").trim();
}

// Autocomplete for the note / folder fields in settings (Obsidian 1.4.10+)
const PathSuggest = AbstractInputSuggest
  ? class extends AbstractInputSuggest {
      constructor(app, inputEl, kind) {
        super(app, inputEl);
        this.kind = kind;
        this.field = inputEl;
      }
      getSuggestions(query) {
        const q = (query || "").toLowerCase();
        const items =
          this.kind === "folder"
            ? this.app.vault.getAllLoadedFiles().filter((f) => f instanceof TFolder && f.path !== "/")
            : this.app.vault.getMarkdownFiles();
        return items.filter((f) => f.path.toLowerCase().includes(q)).slice(0, 50);
      }
      renderSuggestion(item, el) {
        el.setText(item.path);
      }
      selectSuggestion(item) {
        this.field.value = item.path;
        this.field.dispatchEvent(new Event("input"));
        this.close();
      }
    }
  : null;

class FavouritePicker extends FuzzySuggestModal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.setPlaceholder(T("Add a note to your homepage favourites…"));
  }
  getItems() {
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => !this.plugin.isDataFile(f))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
  }
  getItemText(f) {
    return f.path.replace(/\.md$/, "");
  }
  onChooseItem(f) {
    this.plugin.addFavourite(f);
  }
}

// The dashboard markup (ids are how the rest of the code finds things)
function buildDashboard() {
  const refreshBtn = (id, title, aria) => h("button", { cls: "icon-btn sm", id, title, "aria-label": aria });
  // The centre cards fold away: a -/+ button sits left of the title (see initCards)
  const cardTitle = (cardId, bodyId, label) =>
    h(
      "div",
      { cls: "card-title" },
      h("button", { type: "button", cls: "card-toggle", "data-card": cardId, "data-body": bodyId, "data-label": label, "aria-controls": bodyId, "aria-expanded": "true" }),
      h("h2", { cls: "card-label", id: `${cardId}-title`, text: label }),
    );
  const countRow = (countId, ...extra) =>
    h("div", { cls: "card-header-right" }, h("span", { cls: "badge", id: countId, text: "0" }), ...extra);

  const header = h(
    "header",
    { cls: "header" },
    h(
      "div",
      { cls: "header-top" },
      h("h1", { cls: "greeting", id: "greeting", text: "Hello" }),
      h(
        "div",
        { cls: "header-controls" },
        h("button", { cls: "icon-btn", id: "page-refresh", title: T("Refresh"), "aria-label": T("Refresh") }),
        h("button", { cls: "icon-btn", id: "theme-toggle", title: T("Toggle theme"), "aria-label": T("Toggle theme") }),
        h("button", { cls: "icon-btn", id: "arrange-btn", title: T("Arrange cards"), "aria-label": T("Arrange cards"), "aria-pressed": "false" }),
        h("button", { cls: "icon-btn", id: "settings-btn", title: T("Settings"), "aria-label": T("Open settings") }),
      ),
    ),
    h(
      "div",
      { cls: "clock-wrap" },
      h(
        "div",
        { cls: "clock", id: "clock" },
        h("span", { id: "clock-main", "aria-hidden": "true", text: "12:00" }),
        h("span", { id: "clock-sec", "aria-hidden": "true", text: ":00" }),
        " ",
        h("span", { id: "clock-ampm", "aria-hidden": "true", text: "AM" }),
        h("span", { cls: "sr-only", id: "clock-sr" }),
      ),
      h("div", { cls: "clock-date", id: "clock-date" }),
    ),
    h(
      "div",
      { cls: "search-container" },
      h(
        "form",
        { cls: "search-wrap", id: "search-form", role: "search", autocomplete: "off" },
        iconNode("search"),
        h("input", { type: "search", id: "search-input", placeholder: T("Search your vault…"), spellcheck: "false", "aria-label": T("Search your vault") }),
        h("button", { type: "button", cls: "search-clear hidden", id: "search-clear", title: T("Clear search"), "aria-label": T("Clear search") }, iconNode("clear")),
        h("kbd", { cls: "search-kbd", id: "search-kbd", "aria-hidden": "true", text: "/" }),
      ),
      h("div", { cls: "search-results hidden", id: "search-results" }),
      h("div", { cls: "sr-only", id: "search-live", role: "status", "aria-live": "polite" }),
    ),
  );

  const hero = h(
    "div",
    { cls: "hero", id: "hero", role: "img", "aria-label": T("Photo of the day") },
    h("img", { cls: "hero-img", id: "hero-img", alt: T("Photo of the day") }),
    h("div", { cls: "hero-overlay", "aria-hidden": "true" }),
    h(
      "div",
      { cls: "hero-footer" },
      h("span", { cls: "hero-credit", id: "hero-credit" }),
      h("button", { cls: "icon-btn", id: "hero-refresh", title: T("Load a new photo"), "aria-label": T("Load new photo") }),
    ),
  );

  const quote = h(
    "div",
    { cls: "quote-bar", id: "quote-bar" },
    h(
      "blockquote",
      { cls: "quote-content" },
      h("p", { cls: "quote-text", id: "quote-text" }),
      h("footer", { cls: "quote-author", id: "quote-author" }),
    ),
    // ZenQuotes' free API requires a visible credit linking back to zenquotes.io (built in displayQuote)
    h("div", { cls: "quote-credit hidden", id: "quote-credit" }),
  );

  const favs = h("section", { cls: "card favs-card", id: "favs-card", "aria-labelledby": "favs-card-title" },
    h("div", { cls: "card-header" }, h("h2", { cls: "card-label", id: "favs-card-title", text: T("Favourites") })),
    h("div", { cls: "favs-list", id: "favs-list" }),
  );

  const left = h(
    "div",
    { cls: "col col-left zone", "data-zone": "left" },
    h("section", { cls: "card", id: "calendar-card", "aria-labelledby": "calendar-card-title" },
      h(
        "div",
        { cls: "card-header" },
        h("h2", { cls: "card-label", id: "calendar-card-title", text: T("Calendar") }),
        h(
          "div",
          { cls: "cal-nav" },
          h("button", { cls: "cal-btn", id: "cal-prev", title: T("Previous month"), "aria-label": T("Previous month"), text: "‹" }),
          h("span", { id: "cal-month-label" }),
          h("button", { cls: "cal-btn", id: "cal-next", title: T("Next month"), "aria-label": T("Next month"), text: "›" }),
        ),
      ),
      h("div", { cls: "cal-grid", id: "cal-grid", role: "grid", "aria-label": T("Calendar"), "aria-describedby": "cal-hint" }),
      h("span", { cls: "sr-only", id: "cal-hint", text: T("Use the arrow keys to move between days.") }),
      h("button", { cls: "today-btn", id: "cal-today", text: T("Today") }),
    ),
    h("section", { cls: "card", id: "links-card", "aria-labelledby": "links-card-title" },
      h("div", { cls: "card-header" }, h("h2", { cls: "card-label", id: "links-card-title", text: T("Quick links") })),
      h("nav", { id: "quick-links", "aria-label": T("Quick links") }),
    ),
  );

  const center = h(
    "div",
    { cls: "col col-center zone", "data-zone": "center" },
    h("section", { cls: "card hidden", id: "ring-card", "aria-labelledby": "ring-card-title" },
      h(
        "div",
        { cls: "card-header" },
        cardTitle("ring-card", "ring-body", T("Ring notes")),
        countRow("ring-count", h("a", { cls: "card-link", id: "ring-open", href: "#", title: T("Open the notes file"), text: T("Open") })),
      ),
      h("div", { id: "ring-body" }),
    ),
    h("section", { cls: "card", id: "clips-card", "aria-labelledby": "clips-card-title" },
      h(
        "div",
        { cls: "card-header" },
        cardTitle("clips-card", "clips-body", T("Web clips")),
        countRow("clips-count", refreshBtn("refresh-clips", T("Refresh clips"), T("Refresh web clips"))),
      ),
      h("div", { id: "clips-body" }),
    ),
    h("section", { cls: "card", id: "recent-card", "aria-labelledby": "recent-card-title" },
      h(
        "div",
        { cls: "card-header" },
        cardTitle("recent-card", "recent-body", T("Recent notes")),
        countRow("recent-count", refreshBtn("refresh-recent", T("Refresh recent notes"), T("Refresh recent notes"))),
      ),
      h("div", { id: "recent-body" }),
    ),
    h("section", { cls: "card hidden", id: "otd-card", "aria-labelledby": "otd-card-title" },
      h("div", { cls: "card-header" }, cardTitle("otd-card", "otd-body", T("On this day")), countRow("otd-count")),
      h("div", { id: "otd-body" }),
    ),
    h("section", { cls: "card hidden", id: "tt-card", "aria-labelledby": "tt-card-title" },
      h("div", { cls: "card-header" }, cardTitle("tt-card", "tt-body", T("Time tracker"))),
      h("div", { id: "tt-body" }),
      h("div", { cls: "sr-only", id: "tt-live", role: "status", "aria-live": "polite" }),
    ),
    h("section", { cls: "card hidden", id: "xkcd-card", "aria-labelledby": "xkcd-card-title" },
      h("div", { cls: "card-header" }, cardTitle("xkcd-card", "xkcd-body", T("xkcd")), countRow("xkcd-count")),
      h("div", { id: "xkcd-body" }),
      h("div", { cls: "sr-only", id: "xkcd-live", role: "status", "aria-live": "polite" }),
    ),
    h("section", { cls: "card hidden", id: "stats-card", "aria-labelledby": "stats-card-title" },
      h("div", { cls: "card-header" }, cardTitle("stats-card", "stats-body", T("Vault stats")), countRow("stats-count")),
      h("div", { id: "stats-body" }),
    ),
  );

  // Formatting toolbar for the quick note (inserts markdown; see formatEdit)
  const modKey = Platform.isMacOS ? "⌘" : "Ctrl+";
  const shiftKey = Platform.isMacOS ? "⇧" : "Shift+";
  const fmtBtn = (action, label, shortcut, content) =>
    h(
      "button",
      {
        type: "button",
        cls: `fmt-btn fmt-${action}`,
        "data-fmt": action,
        title: shortcut ? `${label} (${modKey}${shortcut})` : label,
        "aria-label": label,
      },
      content,
    );
  const glyph = (t) => h("span", { cls: "fmt-glyph", text: t });
  const noteToolbar = h(
    "div",
    { cls: "note-toolbar", role: "toolbar", "aria-label": T("Formatting") },
    fmtBtn("bold", T("Bold"), "B", glyph("B")),
    fmtBtn("italic", T("Italic"), "I", glyph("I")),
    fmtBtn("underline", T("Underline"), "U", glyph("U")),
    fmtBtn("strike", T("Strikethrough"), `${shiftKey}X`, glyph("S")),
    fmtBtn("heading", T("Heading"), "", glyph("H")),
    fmtBtn("bullet", T("Bulleted list"), "", iconNode("list")),
    fmtBtn("numbered", T("Numbered list"), "", iconNode("list-ordered")),
    fmtBtn("link", T("Link"), "K", iconNode("link")),
    h("button", { type: "button", cls: "fmt-btn fmt-export", "data-export": "1", title: T("Export note as Markdown…"), "aria-label": T("Export note as Markdown…") }, iconNode("export")),
  );

  const tab = (filter, label, active) =>
    h("button", { cls: active ? "tab active" : "tab", "data-filter": filter, role: "tab", "aria-selected": active ? "true" : "false", text: label });
  const right = h(
    "div",
    { cls: "col col-right zone", "data-zone": "right" },
    h("section", { cls: "card", id: "tasks-card", "aria-labelledby": "tasks-card-title" },
      h(
        "div",
        { cls: "card-header" },
        h("h2", { cls: "card-label", id: "tasks-card-title", text: T("Tasks") }),
        h("span", { cls: "tasks-stats", id: "tasks-stats", "aria-live": "polite", text: "0 / 0" }),
      ),
      h("input", { type: "text", cls: "task-input", id: "task-input", placeholder: T("Add a task and press Enter…"), "aria-label": T("New task") }),
      h(
        "div",
        { cls: "tab-row", role: "tablist", "aria-label": T("Filter tasks") },
        tab("all", T("All"), true),
        tab("active", T("Active"), false),
        tab("done", T("Done"), false),
      ),
      h("div", { id: "tasks-list", role: "list" }),
      h("button", { cls: "clear-btn", id: "clear-done", text: T("Clear completed") }),
    ),
    h("section", { cls: "card", id: "note-card", "aria-labelledby": "note-card-title" },
      h(
        "div",
        { cls: "card-header" },
        h("h2", { cls: "card-label", id: "note-card-title", text: T("Quick notes") }),
        h("span", { cls: "autosave-dot", id: "autosave-dot", title: T("Saved"), "aria-label": T("Saved") }),
      ),
      h(
        "div",
        { cls: "note-tabs", id: "note-tabs", role: "tablist", "aria-label": T("Quick notes") },
        ...Array.from({ length: NOTE_COUNT }, (_, i) =>
          h(
            "button",
            {
              type: "button",
              cls: "note-dot",
              id: `note-tab-${i + 1}`,
              role: "tab",
              "data-note": String(i + 1),
              "aria-label": T("Note {n}, empty", { n: i + 1 }),
              "aria-controls": "note-panel",
              "aria-selected": "false",
              tabindex: "-1",
            },
            h("span", { cls: "note-dot-num", text: String(i + 1) }),
          ),
        ),
      ),
      h(
        "div",
        { id: "note-panel", role: "tabpanel", "aria-labelledby": "note-tab-1" },
        noteToolbar,
        h(
          "div",
          { cls: "note-link-row hidden" },
          h("input", { type: "text", id: "note-link-input", inputmode: "url", placeholder: "https://…", "aria-label": T("Link address"), autocomplete: "off", spellcheck: "false" }),
          h("button", { type: "button", cls: "fmt-text-btn", id: "note-link-apply", text: T("Apply") }),
          h("button", { type: "button", cls: "fmt-text-btn", id: "note-link-cancel", text: T("Cancel") }),
        ),
        h("div", {
          id: "quick-note-rich",
          cls: "note-editor is-empty",
          contenteditable: "true",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": T("Quick note {n}", { n: 1 }),
          "data-placeholder": T("Jot something down…"),
          spellcheck: "true",
        }),
        h("textarea", { id: "quick-note", cls: "hidden", placeholder: T("Jot something down…"), spellcheck: "true", "aria-label": T("Quick note {n}", { n: 1 }) }),
        h("div", { cls: "note-hint hidden", id: "note-hint", text: T("This note has formatting the editor can't show, so it appears as plain text.") }),
        h("div", { cls: "note-footer" }, h("span", { cls: "note-stats", id: "note-stats" }), h("span", { cls: "note-saved", id: "note-saved" })),
        h("div", { cls: "sr-only", id: "note-live", role: "status", "aria-live": "polite" }),
      ),
    ),
  );

  const banner = h(
    "div",
    { cls: "arrange-banner", id: "arrange-banner", hidden: "" },
    h(
      "div",
      { cls: "arrange-text" },
      h("span", { cls: "arrange-help", text: T("Drag a card by its handle, or use the arrow buttons. Press Done when you are finished.") }),
      h("span", { cls: "arrange-status", id: "arrange-status", role: "status", "aria-live": "polite" }),
    ),
    h("div", { cls: "arrange-actions" }, h("button", { type: "button", cls: "btn-secondary", id: "arrange-use-shared", hidden: "", text: T("Use the shared layout") }), h("button", { type: "button", cls: "btn-secondary", id: "arrange-push", text: T("Use on all my devices") }), h("button", { type: "button", cls: "btn-secondary", id: "arrange-reset", text: T("Reset layout") }), h("button", { type: "button", cls: "btn-secondary", id: "arrange-done", text: T("Done") })),
  );
  const topZone = h("div", { cls: "zone zone-top", "data-zone": "top" }, favs);
  // On phones and tablets there is no status bar, so a running timer shows here instead
  const running = h("div", { cls: "tt-running hidden", id: "tt-running", role: "region", "aria-label": T("Running timer") });
  return [h("div", { cls: "bg-glow" }), h("div", { id: "app" }, header, running, hero, quote, banner, topZone, h("main", { cls: "grid" }, left, center, right)), h("div", { cls: "sr-only", id: "arrange-live", role: "status", "aria-live": "polite" })];
}

// ─── Time tracker ─────────────────────────────────────────────────────────────
// Projects hold tasks, and a task's time is a list of sessions (start, end). Everything is derived
// from the sessions, so a total can never drift from them. The data lives in its own file,
// `Time Tracking.md` in the Genkan data folder, apart from the plugin settings; each record carries
// an `u` (updated) stamp and is deleted with a flag, so two devices merge by record instead of one
// overwriting the other.

const TT_COLOURS = ["#7c3aed", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777"];
const TT_PRIORITIES = ["None", "Low", "Medium", "High"];
const TT_WARN = 0.8; // from here a budget turns amber
const TT_STALE_MS = 15 * 60 * 1000; // a running timer unseen for this long is taken as stopped
const TT_BEAT_SAVE_MS = 5 * 60 * 1000;
const TT_TOMBSTONE_MS = 90 * 24 * 3600 * 1000;

function ttEmpty() {
  return { projects: [], tasks: [], sessions: [], hb: 0 };
}

// The file is a Markdown note, because Obsidian Sync carries notes on every setup (it leaves other
// file types out unless a setting is on). One record per line, so Sync can merge two devices' edits
// line by line and a damaged line costs one record, not everything.
const TT_HEADER = [
  "---",
  "genkan: time-tracking",
  "---",
  "# Genkan time tracking",
  "",
  "This note holds the data behind Genkan's Time tracker. Each line is one project, task or session, so that Obsidian Sync can merge changes from different devices. Please don't edit it by hand.",
  "",
].join("\n");

function ttSerialize(data) {
  const d = ttNormalise(data);
  const line = (t, r) => JSON.stringify({ t, ...r });
  const lines = [
    ...d.projects.slice().sort((a, b) => a.id.localeCompare(b.id)).map((r) => line("project", r)),
    ...d.tasks.slice().sort((a, b) => a.pid.localeCompare(b.pid) || a.id.localeCompare(b.id)).map((r) => line("task", r)),
    ...d.sessions.slice().sort((a, b) => a.s - b.s || a.id.localeCompare(b.id)).map((r) => line("session", r)),
    JSON.stringify({ t: "hb", v: d.hb }),
  ];
  return `${TT_HEADER}\n\`\`\`text\n${lines.join("\n")}\n\`\`\`\n`;
}

// The note's text (or the older whole-file JSON) as data; anything unreadable counts as empty
function ttParse(text) {
  const raw = { projects: [], tasks: [], sessions: [], hb: 0 };
  const src = String(text || "");
  if (/^\s*\{\s*"projects"/.test(src)) {
    try {
      return ttNormalise(JSON.parse(src));
    } catch {
      return ttEmpty();
    }
  }
  const best = { project: new Map(), task: new Map(), session: new Map() };
  for (const l of src.split("\n")) {
    const row = l.trim();
    if (row[0] !== "{") continue;
    let r;
    try {
      r = JSON.parse(row);
    } catch {
      continue; // a line damaged by a merge: skip just that record
    }
    if (!r || typeof r !== "object") continue;
    if (r.t === "hb") raw.hb = Math.max(raw.hb, Number(r.v) || 0);
    else if (best[r.t] && typeof r.id === "string") {
      const old = best[r.t].get(r.id);
      if (!old || (Number(r.u) || 0) >= (Number(old.u) || 0)) best[r.t].set(r.id, r); // a doubled line keeps the newer
    }
  }
  raw.projects = [...best.project.values()];
  raw.tasks = [...best.task.values()];
  raw.sessions = [...best.session.values()];
  return ttNormalise(raw);
}

// Accept anything from disk, keep only well-formed records
function ttNormalise(raw) {
  const out = ttEmpty();
  if (!raw || typeof raw !== "object") return out;
  const str = (v, n) => String(v == null ? "" : v).slice(0, n);
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const int = (v, max) => Math.min(max, Math.max(0, Math.round(num(v))));
  const list = (v) => (Array.isArray(v) ? v : []);
  const seen = { projects: new Set(), tasks: new Set(), sessions: new Set() };
  const ok = (kind, r) => {
    if (!r || typeof r.id !== "string" || !r.id || seen[kind].has(r.id)) return false;
    seen[kind].add(r.id);
    return true;
  };
  for (const p of list(raw.projects)) {
    if (!ok("projects", p)) continue;
    out.projects.push({ id: p.id, name: str(p.name, 120), color: TT_COLOURS.includes(p.color) ? p.color : TT_COLOURS[0], alloc: int(p.alloc, 600000), arch: p.arch ? 1 : 0, u: num(p.u), del: p.del ? 1 : 0 });
  }
  for (const t of list(raw.tasks)) {
    if (!ok("tasks", t) || typeof t.pid !== "string") continue;
    out.tasks.push({ id: t.id, pid: t.pid, name: str(t.name, 200), notes: str(t.notes, 4000), pri: int(t.pri, 3), alloc: int(t.alloc, 600000), done: !!t.done, paused: !!t.paused, u: num(t.u), del: t.del ? 1 : 0 });
  }
  for (const s of list(raw.sessions)) {
    if (!ok("sessions", s) || typeof s.tid !== "string" || !Number.isFinite(Number(s.s))) continue;
    out.sessions.push({ id: s.id, tid: s.tid, s: Number(s.s), e: s.e == null ? null : num(s.e), u: num(s.u), del: s.del ? 1 : 0, ...(typeof s.d === "string" && s.d ? { d: s.d.slice(0, 24) } : {}) });
  }
  out.hb = num(raw.hb);
  return out;
}

// Union by id; the newer record wins (ties go to `mine`). Old deletions are dropped.
function ttMerge(disk, mine, now = Date.now()) {
  const a = ttNormalise(disk);
  const b = ttNormalise(mine);
  const out = ttEmpty();
  for (const kind of ["projects", "tasks", "sessions"]) {
    const byId = new Map(a[kind].map((r) => [r.id, r]));
    for (const r of b[kind]) {
      const other = byId.get(r.id);
      if (!other || r.u >= other.u) byId.set(r.id, r);
    }
    out[kind] = [...byId.values()].filter((r) => !(r.del && r.u < now - TT_TOMBSTONE_MS));
  }
  out.hb = Math.max(a.hb, b.hb);
  return out;
}

// ─── Time arithmetic ──────────────────────────────────────────────────────────

const ttDayStart = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const ttAddDays = (ms, n) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
};
const ttWeekStart = (ms, firstDay) => {
  const day = new Date(ms).getDay();
  return ttAddDays(ttDayStart(ms), -((day - firstDay + 7) % 7));
};
// "2026-10-25" -> local midnight, or null
function ttParseDay(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}
const ttIso = (ms) => isoDay(new Date(ms));

// Seconds of a session that fall inside [from, to)
function ttOverlap(s, from, to, now) {
  const a = Math.max(s.s, from);
  const b = Math.min(s.e == null ? now : s.e, to);
  return b > a ? (b - a) / 1000 : 0;
}

const ttPad = (n) => String(n).padStart(2, "0");
function ttClock(secs) {
  const t = Math.max(0, Math.floor(secs));
  return `${Math.floor(t / 3600)}:${ttPad(Math.floor((t % 3600) / 60))}:${ttPad(t % 60)}`;
}
// "2h 05m", "45m", "<1m"
function ttHM(secs) {
  const t = Math.max(0, Math.round(secs / 60));
  if (!t) return secs > 0 ? "<1m" : "0m";
  const h = Math.floor(t / 60);
  return h ? `${h}h ${ttPad(t % 60)}m` : `${t}m`;
}
const ttHours = (secs) => Math.round((secs / 3600) * 100) / 100;
const ttHoursText = (secs) => fmtNum(ttHours(secs));
const ttClockOfDay = (ms) => `${ttPad(new Date(ms).getHours())}:${ttPad(new Date(ms).getMinutes())}`;

// Where a budget stands: used and allocated (minutes). null when nothing is allocated.
function ttBudget(usedSecs, allocMin) {
  if (!allocMin) return null;
  const total = allocMin * 60;
  const pct = usedSecs / total;
  return { pct, left: total - usedSecs, state: pct > 1 ? "over" : pct >= TT_WARN ? "warn" : "ok" };
}

function ttBudgetText(b) {
  return b.left >= 0 ? T("{time} left", { time: ttHM(b.left) }) : T("{time} over", { time: ttHM(-b.left) });
}

// ─── Data and operations ──────────────────────────────────────────────────────

class TimeStore {
  constructor(plugin) {
    this.plugin = plugin;
    this.data = ttEmpty();
    this.loaded = false;
    this.listeners = new Set();
    this.lastBeat = Date.now();
    this.saveTimer = null;
    this.writing = Promise.resolve();
  }

  // The time data has a file of its own in the Genkan data folder, apart from the plugin settings
  get path() {
    return joinPath(this.plugin.settings.dataFolder, "Time Tracking.md");
  }

  // A random id for this device (kept in its local storage), stamped on the timers it starts
  deviceId() {
    const app = this.plugin.app;
    try {
      let id = app.loadLocalStorage("genkan-device");
      if (!id) {
        id = newId().slice(0, 12);
        app.saveLocalStorage("genkan-device", id);
      }
      return id;
    } catch {
      return "";
    }
  }

  // Where the data was kept before it moved into a note
  get legacyPath() {
    return joinPath(this.plugin.settings.dataFolder, "Time Tracking.json");
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(origin) {
    for (const fn of [...this.listeners]) fn(origin);
  }

  // Changed in this window: tell the other views, and save soon
  commit(origin) {
    this.notify(origin);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 400);
  }

  // Write now if a change is waiting
  flush() {
    if (this.saveTimer) return this.save();
  }

  // Merge into whatever is in the file (it may have been changed by another device) and write it
  // back in one step, so nothing another device saved is overwritten
  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.writing = this.writing.then(async () => {
      try {
        const file = await ensureFileIn(this.plugin.app, this.path);
        let merged = this.data;
        await this.plugin.app.vault.process(file, (text) => {
          merged = ttMerge(ttParse(text), this.data);
          const out = ttSerialize(merged);
          return out === text ? text : out;
        });
        this.take(merged);
        this.warned = false;
        await this.retireLegacy();
      } catch (err) {
        console.error("Genkan: could not save time tracking", err);
        if (!this.warned) new Notice(T("Could not save the time tracker's data."));
        this.warned = true; // say so once per failure, not on every retry
      }
    });
    return this.writing;
  }

  // Once the note holds everything, set the old .json file aside so it is not read again
  async retireLegacy() {
    const vault = this.plugin.app.vault;
    const old = vault.getAbstractFileByPath(this.legacyPath);
    if (!(old instanceof TFile) || !this.loaded) return;
    try {
      await vault.rename(old, `${this.legacyPath}.old`);
    } catch {
      // it stays where it is and is merged again next time, which does no harm
    }
  }

  // Use merged data, telling the views only when it differs from what they show
  take(merged) {
    if (JSON.stringify(merged) === JSON.stringify(this.data)) return false;
    this.data = merged;
    this.notify(null);
    return true;
  }

  // Take in what is in the file (on start, and when it changes from another device)
  async load() {
    try {
      const vault = this.plugin.app.vault;
      for (const path of [this.legacyPath, this.path]) {
        const file = vault.getAbstractFileByPath(path);
        if (file instanceof TFile) this.take(ttMerge(ttParse(await vault.read(file)), this.data));
      }
      this.legacy = vault.getAbstractFileByPath(this.legacyPath) instanceof TFile;
    } catch (err) {
      console.error("Genkan: could not read time tracking", err);
    }
    if (!this.loaded) {
      this.loaded = true;
      this.recover();
    }
    this.notify(null);
    // Memory can hold records the note lacks (another device's copy just replaced the file, say):
    // write the merged result back so nothing exists only in this window
    if (this.legacy || (await this.noteDiffers())) this.save();
  }

  async noteDiffers() {
    try {
      const vault = this.plugin.app.vault;
      const file = vault.getAbstractFileByPath(this.path);
      if (!(file instanceof TFile)) return this.data.projects.length + this.data.tasks.length + this.data.sessions.length > 0;
      return ttSerialize(this.data) !== (await vault.read(file));
    } catch {
      return false;
    }
  }

  reload() {
    return this.load();
  }

  stamp(rec) {
    rec.u = Math.max(Date.now(), (rec.u || 0) + 1);
    return rec;
  }

  // ── Reading ──
  projects() {
    return this.data.projects.filter((p) => !p.del);
  }
  project(id) {
    return this.data.projects.find((p) => p.id === id && !p.del) || null;
  }
  // Archived projects keep their time (reports and the weekly summary count it) but take no new work
  archivedProject(id) {
    return !!this.project(id)?.arch;
  }
  tasks(pid) {
    return this.data.tasks.filter((t) => t.pid === pid && !t.del);
  }
  task(id) {
    return this.data.tasks.find((t) => t.id === id && !t.del) || null;
  }
  sessions(tid) {
    return this.data.sessions.filter((s) => s.tid === tid && !s.del);
  }
  running() {
    return this.data.sessions.find((s) => s.e == null && !s.del && this.task(s.tid)) || null;
  }
  runningTask() {
    const s = this.running();
    return s ? this.task(s.tid) : null;
  }

  // The task paused most recently, for a "resume" shortcut
  lastPaused() {
    let best = null;
    let at = -1;
    for (const task of this.data.tasks) {
      if (task.del || !task.paused || task.done || this.archivedProject(task.pid)) continue;
      const end = this.sessions(task.id).reduce((n, x) => Math.max(n, x.e || 0), 0);
      if (end > at) {
        at = end;
        best = task;
      }
    }
    return best;
  }

  // Seconds per task id in [from, to)
  secsByTask(from = 0, to = Infinity, now = Date.now()) {
    const live = new Set(this.data.tasks.filter((t) => !t.del).map((t) => t.id));
    const map = new Map();
    for (const s of this.data.sessions) {
      if (s.del || !live.has(s.tid)) continue;
      const secs = ttOverlap(s, from, to, now);
      if (secs) map.set(s.tid, (map.get(s.tid) || 0) + secs);
    }
    return map;
  }

  taskSecs(tid, from = 0, to = Infinity, now = Date.now()) {
    let t = 0;
    for (const s of this.sessions(tid)) t += ttOverlap(s, from, to, now);
    return t;
  }

  projectSecs(pid, from = 0, to = Infinity, now = Date.now()) {
    const map = this.secsByTask(from, to, now);
    let t = 0;
    for (const task of this.tasks(pid)) t += map.get(task.id) || 0;
    return t;
  }

  // A project's own allocation, or failing that the tasks' allocations added up
  projectAlloc(p) {
    if (p.alloc) return p.alloc;
    return this.tasks(p.id).reduce((n, t) => n + (t.alloc || 0), 0);
  }

  // ── Changing ──
  addProject(name, origin) {
    const p = this.stamp({ id: newId(), name: name.trim().slice(0, 120), color: TT_COLOURS[this.data.projects.length % TT_COLOURS.length], alloc: 0, arch: 0, u: 0, del: 0 });
    this.data.projects.push(p);
    this.commit(origin);
    return p;
  }

  addTask(pid, name, origin) {
    const t = this.stamp({ id: newId(), pid, name: name.trim().slice(0, 200), notes: "", pri: 0, alloc: 0, done: false, paused: false, u: 0, del: 0 });
    this.data.tasks.push(t);
    this.commit(origin);
    return t;
  }

  update(rec, fields, origin) {
    Object.assign(rec, fields);
    this.stamp(rec);
    this.commit(origin);
  }

  setArchived(p, on, origin) {
    const run = this.runningTask();
    if (on && run && run.pid === p.id) this.stop(run.id, origin);
    this.update(p, { arch: on ? 1 : 0 }, origin);
  }

  removeProject(id, origin) {
    const p = this.project(id);
    if (!p) return;
    for (const t of this.tasks(id)) this.removeTask(t.id, origin, true);
    p.del = 1;
    this.stamp(p);
    this.commit(origin);
  }

  removeTask(id, origin, quiet) {
    const t = this.task(id);
    if (!t) return;
    for (const s of this.sessions(id)) {
      if (s.e == null) s.e = Date.now();
      s.del = 1;
      this.stamp(s);
    }
    t.del = 1;
    this.stamp(t);
    if (!quiet) this.commit(origin);
  }

  removeSession(id, origin) {
    const s = this.data.sessions.find((x) => x.id === id && !x.del);
    if (!s) return;
    if (s.e == null) s.e = Date.now();
    s.del = 1;
    this.stamp(s);
    this.commit(origin);
  }

  // Time entered by hand for a timer that was never started
  addSession(tid, from, to, origin) {
    const t = this.task(tid);
    if (!t || !(to > from)) return null;
    const s = this.stamp({ id: newId(), tid, s: from, e: to, u: 0, del: 0 });
    this.data.sessions.push(s);
    this.commit(origin);
    return s;
  }

  closeSession(s, at) {
    s.e = Math.max(s.s, at);
    this.stamp(s);
  }

  // Only one timer runs at a time: starting one pauses the other
  start(tid, origin) {
    const t = this.task(tid);
    if (!t || this.archivedProject(t.pid)) return;
    const run = this.running();
    if (run && run.tid === tid) return;
    if (run) this.pause(run.tid, origin, true);
    const now = Date.now();
    const d = this.deviceId();
    this.data.sessions.push(this.stamp({ id: newId(), tid, s: now, e: null, u: 0, del: 0, ...(d ? { d } : {}) }));
    t.paused = false;
    this.stamp(t);
    this.data.hb = now;
    this.lastBeat = now;
    this.commit(origin);
  }

  pause(tid, origin, quiet) {
    const t = this.task(tid);
    if (!t) return;
    for (const s of this.sessions(tid)) if (s.e == null) this.closeSession(s, Date.now());
    t.paused = true;
    this.stamp(t);
    if (!quiet) this.commit(origin);
  }

  stop(tid, origin) {
    const t = this.task(tid);
    if (!t) return;
    for (const s of this.sessions(tid)) if (s.e == null) this.closeSession(s, Date.now());
    t.paused = false;
    this.stamp(t);
    this.commit(origin);
  }

  // A timer left running while Obsidian was closed or the computer slept would count the whole
  // gap. Close it at the last moment we know it was running, and say so.
  recover(now = Date.now()) {
    const run = this.running();
    if (!run) return;
    // A timer another device started is that device's to watch: this one may simply not have heard
    // from it yet (Sync is not instant), and closing it here would cut the other device's time short
    if (run.d && run.d !== this.deviceId()) return;
    const seen = Math.max(this.data.hb || 0, run.s, this.localBeat(run.id), this.lastBeat < now - TT_STALE_MS ? this.lastBeat : 0);
    if (now - seen <= TT_STALE_MS) return;
    const task = this.task(run.tid);
    this.closeSession(run, seen);
    if (task) {
      task.paused = true;
      this.stamp(task);
      new Notice(T("Paused {task}: Obsidian was closed or the computer was asleep. The timer stopped at {time}.", { task: task.name, time: ttClockOfDay(seen) }), 10000);
    }
    this.commit(null);
  }

  // The last minute this device saw the session running (kept on this device only, so it costs no sync)
  localBeat(sid, set) {
    const app = this.plugin.app;
    try {
      if (set) app.saveLocalStorage("genkan-beat", { sid, t: set });
      else {
        const v = app.loadLocalStorage("genkan-beat");
        return v && v.sid === sid ? Number(v.t) || 0 : 0;
      }
    } catch {
      // no local storage here
    }
    return 0;
  }

  // Once a minute from the plugin, whether or not a dashboard is open
  beat(now = Date.now()) {
    const run = this.running();
    if (run) {
      if (now - this.lastBeat > TT_STALE_MS) {
        // The clock jumped: the computer slept. Count up to the last beat, not the whole gap.
        this.recover(now);
        this.lastBeat = now;
        return;
      }
      this.localBeat(run.id, now);
      if (now - (this.data.hb || 0) >= TT_BEAT_SAVE_MS) {
        this.data.hb = now;
        this.save();
      }
    }
    this.lastBeat = now;
  }
}

// ─── Reports and files ────────────────────────────────────────────────────────

// Time per project and task in [from, to), and the sessions behind it split at midnight
function ttReport(store, { pid = "", from, to, now = Date.now() }) {
  const inRange = store.secsByTask(from, to, now);
  const all = store.secsByTask(0, Infinity, now);
  const projects = [];
  for (const p of store.projects()) {
    if (pid && p.id !== pid) continue;
    const tasks = store
      .tasks(p.id)
      .map((t) => ({ t, secs: inRange.get(t.id) || 0, usedAll: all.get(t.id) || 0 }))
      .filter((x) => x.secs > 0);
    const secs = tasks.reduce((n, x) => n + x.secs, 0);
    if (!pid && !secs) continue;
    projects.push({ p, tasks, secs, alloc: store.projectAlloc(p), usedAll: store.projectSecs(p.id, 0, Infinity, now) });
  }
  const names = new Map();
  for (const x of projects) for (const y of x.tasks) names.set(y.t.id, { p: x.p, t: y.t });
  const rows = [];
  for (const s of store.data.sessions) {
    const own = names.get(s.tid);
    if (s.del || !own) continue;
    let a = Math.max(s.s, from);
    const b = Math.min(s.e == null ? now : s.e, to);
    while (a < b) {
      const next = Math.min(b, ttAddDays(a, 1));
      rows.push({ p: own.p, t: own.t, day: ttDayStart(a), s: a, e: next, secs: (next - a) / 1000 });
      a = next;
    }
  }
  rows.sort((x, y) => x.s - y.s);
  return { from, to, projects, rows, total: projects.reduce((n, x) => n + x.secs, 0) };
}

const ttFileLabel = (rep, pid, store) => {
  const who = pid ? store.project(pid)?.name || "" : T("All projects");
  const last = ttIso(rep.to - 1);
  return `${T("Time report")} - ${who} - ${ttIso(rep.from)} ${T("to")} ${last}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
};

// A cell that opens in a spreadsheet as a formula would run; the apostrophe keeps it text
function csvCell(v) {
  if (typeof v === "number") return String(v);
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ttCsv(rep) {
  const head = [T("Project"), T("Task"), T("Date"), T("Start"), T("End"), T("Duration"), T("Hours")];
  const lines = [head.map(csvCell).join(",")];
  for (const r of rep.rows) {
    lines.push([r.p.name, r.t.name, ttIso(r.day), ttClockOfDay(r.s), r.e >= ttAddDays(r.day, 1) ? "24:00" : ttClockOfDay(r.e), ttClock(r.secs), ttHours(r.secs)].map(csvCell).join(","));
  }
  lines.push(["", T("Total"), "", "", "", ttClock(rep.total), ttHours(rep.total)].map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`; // the BOM makes Excel read it as UTF-8
}

// ── ZIP (stored, no compression) and the .xlsx written on top of it ──

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files, when = new Date()) {
  const enc = new TextEncoder();
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((Math.max(1980, when.getFullYear()) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // names are UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, time, true);
    c.setUint16(14, date, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const xmlEsc = (s) =>
  String(s == null ? "" : s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const xlsxCol = (i) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// Cell styles: 0 plain, 1 bold header, 2 [h]:mm:ss, 3 0.00, 4 date, 5 bold 0.00, 6 bold
// A cell is a string, a number, or { v, s } to pick a style; null leaves it empty.
function xlsxSheet(rows, widths) {
  const out = [`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>`];
  widths.forEach((w, i) => out.push(`<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`));
  out.push("</cols><sheetData>");
  rows.forEach((row, r) => {
    out.push(`<row r="${r + 1}">`);
    row.forEach((cell, c) => {
      if (cell == null || cell === "") return;
      const ref = `${xlsxCol(c)}${r + 1}`;
      const v = typeof cell === "object" ? cell.v : cell;
      const s = typeof cell === "object" && cell.s ? ` s="${cell.s}"` : "";
      if (typeof v === "number") out.push(`<c r="${ref}"${s}><v>${v}</v></c>`);
      else out.push(`<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`);
    });
    out.push("</row>");
  });
  out.push("</sheetData></worksheet>");
  return out.join("");
}

const xlsxSerial = (ms) => {
  const d = new Date(ms);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
};

function ttXlsx(rep) {
  const H = (v) => ({ v, s: 1 });
  const sessions = [[H(T("Project")), H(T("Task")), H(T("Date")), H(T("Start")), H(T("End")), H(T("Duration")), H(T("Hours"))]];
  for (const r of rep.rows) {
    sessions.push([r.p.name, r.t.name, { v: xlsxSerial(r.day), s: 4 }, ttClockOfDay(r.s), r.e >= ttAddDays(r.day, 1) ? "24:00" : ttClockOfDay(r.e), { v: r.secs / 86400, s: 2 }, { v: ttHours(r.secs), s: 3 }]);
  }
  sessions.push([null, { v: T("Total"), s: 6 }, null, null, null, { v: rep.total / 86400, s: 7 }, { v: ttHours(rep.total), s: 5 }]);

  const summary = [[H(T("Project")), H(T("Task")), H(T("Allocated (hours)")), H(T("Tracked in range (hours)")), H(T("Tracked all time (hours)")), H(T("Remaining (hours)"))]];
  for (const x of rep.projects) {
    const left = x.alloc ? ttHours(x.alloc * 60 - x.usedAll) : null;
    summary.push([{ v: x.p.name, s: 6 }, null, x.alloc ? { v: ttHours(x.alloc * 60), s: 5 } : null, { v: ttHours(x.secs), s: 5 }, { v: ttHours(x.usedAll), s: 5 }, left == null ? null : { v: left, s: 5 }]);
    for (const y of x.tasks) {
      const tl = y.t.alloc ? ttHours(y.t.alloc * 60 - y.usedAll) : null;
      summary.push([null, y.t.name, y.t.alloc ? { v: ttHours(y.t.alloc * 60), s: 3 } : null, { v: ttHours(y.secs), s: 3 }, { v: ttHours(y.usedAll), s: 3 }, tl == null ? null : { v: tl, s: 3 }]);
    }
  }
  summary.push([{ v: T("Total"), s: 6 }, null, null, { v: ttHours(rep.total), s: 5 }]);

  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const sheetNames = [T("Sessions"), T("Summary")].map((n) => n.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet");
  if (sheetNames[0] === sheetNames[1]) sheetNames[1] += " 2";
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipStore([
    { name: "[Content_Types].xml", data: `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", data: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `${xml}<workbook ${NS} xmlns:r="${REL}"><sheets><sheet name="${xmlEsc(sheetNames[0])}" sheetId="1" r:id="rId1"/><sheet name="${xmlEsc(sheetNames[1])}" sheetId="2" r:id="rId2"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${REL}/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `${xml}<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="164" formatCode="[h]:mm:ss"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="2" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", data: xlsxSheet(sessions, [24, 30, 12, 8, 8, 12, 9]) },
    { name: "xl/worksheets/sheet2.xml", data: xlsxSheet(summary, [24, 30, 16, 22, 22, 18]) },
  ]);
}

// ── PDF: Helvetica from the standard set, so nothing is embedded ──

// Widths of the printable ASCII characters (32..126) in Helvetica, per 1000 units
const PDF_W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
// Typographic characters that exist in the PDF's WinAnsi encoding but are not Latin-1
const PDF_WIN = { "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97, "•": 0x95, "›": 0x9b, "…": 0x85, "€": 0x80 };

// Each character as one byte (a "binary string"); what the font can't show becomes "?"
function pdfBytes(s) {
  let out = "";
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c < 127) out += ch;
    else if (c >= 160 && c <= 255) out += ch;
    else if (PDF_WIN[ch]) out += String.fromCharCode(PDF_WIN[ch]);
    else out += "?";
  }
  return out;
}
const pdfEsc = (s) => pdfBytes(s).replace(/[\\()]/g, (c) => `\\${c}`);
const pdfWidth = (s, size, bold) => {
  let w = 0;
  for (const ch of pdfBytes(s)) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c < 127 ? PDF_W[c - 32] : 556;
  }
  return ((w * size) / 1000) * (bold ? 1.06 : 1);
};
function pdfFit(s, size, max, bold) {
  s = String(s);
  if (pdfWidth(s, size, bold) <= max) return s;
  while (s.length > 1 && pdfWidth(`${s}…`, size, bold) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}
const pdfRgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(" ");

function ttPdf(rep, store, pid) {
  const letter = /^(US|CA|MX)$/.test(String(LOCALE).split(/[-_]/)[1] || "");
  const W = letter ? 612 : 595;
  const Hgt = letter ? 792 : 842;
  const M = 48;
  const pages = [];
  let ops = [];
  let y = 0;
  const newPage = () => {
    if (ops.length) pages.push(ops.join("\n"));
    ops = [];
    y = Hgt - M;
  };
  const text = (s, x, size, { bold = false, grey = false, right = false, width = 0 } = {}) => {
    let str = width ? pdfFit(s, size, width, bold) : String(s);
    const px = right ? x - pdfWidth(str, size, bold) : x;
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${grey ? "0.35 0.35 0.4" : "0 0 0"} rg ${px.toFixed(1)} ${y.toFixed(1)} Td (${pdfEsc(str)}) Tj ET`);
  };
  const rect = (x, yy, w, hh, rgb) => ops.push(`${rgb} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${hh.toFixed(1)} re f`);
  const rule = () => ops.push(`0.8 0.8 0.84 RG 0.5 w ${M} ${(y - 4).toFixed(1)} m ${W - M} ${(y - 4).toFixed(1)} l S`);
  const room = (n) => {
    if (y - n < M) newPage();
  };

  newPage();
  const who = pid ? store.project(pid)?.name || "" : T("All projects");
  text(T("Time report"), M, 20, { bold: true });
  y -= 22;
  text(who, M, 12, { bold: true, width: W - 2 * M });
  y -= 15;
  text(`${fmtDate(new Date(rep.from))} – ${fmtDate(new Date(rep.to - 1))}`, M, 10, { grey: true });
  y -= 13;
  text(T("Generated {date}", { date: fmtDate(new Date()) }), M, 9, { grey: true });
  y -= 26;

  // Summary: each project with its budget bar, then its tasks
  const cols = { alloc: W - M - 230, used: W - M - 150, left: W - M };
  text(T("Summary"), M, 13, { bold: true });
  y -= 18;
  text(T("Project / task"), M, 9, { bold: true, grey: true });
  text(T("Allocated"), cols.alloc, 9, { bold: true, grey: true, right: true });
  text(T("Tracked"), cols.used, 9, { bold: true, grey: true, right: true });
  text(T("Remaining"), cols.left, 9, { bold: true, grey: true, right: true });
  rule();
  y -= 16;
  if (!rep.projects.length) {
    text(T("No time was tracked in this period."), M, 10, { grey: true });
    y -= 16;
  }
  for (const x of rep.projects) {
    room(48 + x.tasks.length * 14);
    const b = ttBudget(x.usedAll, x.alloc);
    rect(M, y - 1, 8, 8, pdfRgb(x.p.color));
    text(x.p.name, M + 14, 11, { bold: true, width: cols.alloc - M - 90 });
    text(x.alloc ? ttHM(x.alloc * 60) : "–", cols.alloc, 10, { right: true });
    text(ttHM(x.secs), cols.used, 10, { right: true, bold: true });
    text(b ? (b.left >= 0 ? ttHM(b.left) : `-${ttHM(-b.left)}`) : "–", cols.left, 10, { right: true });
    y -= 14;
    if (b) {
      const bw = W - 2 * M - 14;
      rect(M + 14, y, bw, 5, "0.88 0.88 0.9");
      rect(M + 14, y, Math.max(1, Math.min(1, b.pct) * bw), 5, b.state === "over" ? "0.86 0.15 0.15" : b.state === "warn" ? "0.85 0.55 0.05" : "0.13 0.65 0.30");
      y -= 11;
      text(`${Math.round(b.pct * 100)}%  ${ttBudgetText(b)}`, M + 14, 8, { grey: true });
      y -= 14;
    }
    for (const t of x.tasks) {
      room(14);
      const tb = ttBudget(t.usedAll, t.t.alloc);
      text(t.t.name, M + 14, 10, { width: cols.alloc - M - 90 });
      text(t.t.alloc ? ttHM(t.t.alloc * 60) : "–", cols.alloc, 10, { right: true });
      text(ttHM(t.secs), cols.used, 10, { right: true });
      text(tb ? (tb.left >= 0 ? ttHM(tb.left) : `-${ttHM(-tb.left)}`) : "–", cols.left, 10, { right: true });
      y -= 14;
    }
    y -= 6;
  }
  room(24);
  rule();
  y -= 14;
  text(T("Total"), M, 11, { bold: true });
  text(ttHM(rep.total), cols.used, 11, { bold: true, right: true });
  text(`${ttHoursText(rep.total)} ${T("hours")}`, cols.left, 10, { right: true, grey: true });
  y -= 30;

  // Sessions
  if (rep.rows.length) {
    room(60);
    text(T("Sessions"), M, 13, { bold: true });
    y -= 18;
    const head = () => {
      text(T("Date"), M, 9, { bold: true, grey: true });
      text(T("Project / task"), M + 80, 9, { bold: true, grey: true });
      text(T("Time"), W - M - 70, 9, { bold: true, grey: true, right: true });
      text(T("Duration"), W - M, 9, { bold: true, grey: true, right: true });
      rule();
      y -= 15;
    };
    head();
    for (const r of rep.rows) {
      if (y - 14 < M) {
        newPage();
        head();
      }
      text(ttIso(r.day), M, 9);
      text(`${r.p.name} › ${r.t.name}`, M + 80, 9, { width: W - 2 * M - 80 - 150 });
      text(`${ttClockOfDay(r.s)}–${r.e >= ttAddDays(r.day, 1) ? "24:00" : ttClockOfDay(r.e)}`, W - M - 70, 9, { right: true });
      text(ttClock(r.secs), W - M, 9, { right: true });
      y -= 13;
    }
  }
  pages.push(ops.join("\n"));

  // Assemble the objects: 1 catalog, 2 page tree, 3 and 4 fonts, 5 info, then a page and its stream each
  const objs = [];
  const kids = [];
  pages.forEach((_, i) => kids.push(`${6 + i * 2} 0 R`));
  objs[1] = "<< /Type /Catalog /Pages 2 0 R /Lang (en) >>";
  objs[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  const d = new Date();
  const stamp = `D:${d.getFullYear()}${ttPad(d.getMonth() + 1)}${ttPad(d.getDate())}${ttPad(d.getHours())}${ttPad(d.getMinutes())}${ttPad(d.getSeconds())}`;
  objs[5] = `<< /Title (${pdfEsc(`${T("Time report")} - ${who}`)}) /Producer (Genkan) /CreationDate (${stamp}) >>`;
  pages.forEach((content, i) => {
    const n = 6 + i * 2;
    objs[n] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${Hgt}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${n + 1} 0 R >>`;
    objs[n + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  let out = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return bytes;
}

// Save a report with the shared export routine (see saveExportFile)
async function ttSaveFile(app, name, data, mime, label) {
  try {
    await saveExportFile(app, name, data, mime, label);
  } catch (err) {
    console.error("Genkan: time report export failed", err);
    new Notice(T("Could not export the time report."));
  }
}

// ─── The card ─────────────────────────────────────────────────────────────────

class TimeTrackerUI {
  constructor(view) {
    this.view = view;
    this.store = view.plugin.time;
    this.screen = { name: "projects" };
    this.live = [];
    this.report = { pid: "", preset: "week", from: "", to: "" };
    this.weekOffset = 0;
    this.unsub = this.store.subscribe((origin) => {
      if (origin !== this) this.render();
    });
  }

  destroy() {
    this.unsub?.();
  }

  get body() {
    return this.view.$("tt-body");
  }

  get firstDay() {
    const s = this.view.settings.weekStart;
    return s === "auto" ? localeWeekStart() : Number(s);
  }

  now() {
    return Date.now();
  }

  go(screen, focus = true) {
    this.screen = screen;
    this.manualOpen = false;
    this.focusHeading = focus;
    this.render();
  }

  say(msg) {
    this.view.announce(msg, "tt-live");
  }

  // Run a change, redraw, and put the focus back on the control that caused it
  act(key, fn) {
    fn();
    this.refocus = key;
    this.render();
  }

  tick() {
    for (const fn of this.live) fn();
  }

  refreshLive() {
    this.tick();
  }

  // Called every second by the dashboard; only a running timer changes anything
  tickRunning() {
    if (!this.store.running()) return;
    this.updateRunning();
    this.tick();
  }

  // A running timer across the top of the dashboard, on phones and tablets (no status bar there)
  updateRunning() {
    const el = this.view.$("tt-running");
    if (!el) return;
    const set = this.view.settings;
    const task = Platform.isMobile && set.showTimeTracker && set.showTimerStatus ? this.store.runningTask() : null;
    el.classList.toggle("hidden", !task);
    if (!task) {
      this.runId = null;
      return;
    }
    if (this.runId !== task.id) {
      this.runId = task.id;
      el.empty();
      const open = h("button", { type: "button", cls: "tt-run-open", "aria-label": T("Open {task}", { task: task.name }) }, h("span", { cls: "tt-run-dot", "aria-hidden": "true" }), h("span", { cls: "tt-run-name", text: task.name }));
      open.addEventListener("click", () => {
        this.go({ name: "task", pid: task.pid, tid: task.id });
        this.view.$("tt-card")?.scrollIntoView?.({ block: "start" });
      });
      this.runTime = h("span", { cls: "tt-run-time", "aria-hidden": "true" });
      el.append(
        open,
        this.runTime,
        this.btn(T("Pause timer: {task}", { task: task.name }), "run-pause", () => this.pauseTask(task), { cls: "tt-ctl", icon: "pause" }),
        this.btn(T("Stop timer: {task}", { task: task.name }), "run-stop", () => this.stopTask(task), { cls: "tt-ctl", icon: "stop" }),
      );
    }
    this.runTime.textContent = ttClock(this.store.taskSecs(task.id, 0, Infinity, this.now()));
  }

  render() {
    this.updateRunning();
    const card = this.view.$("tt-card");
    if (!card) return;
    const enabled = !!this.view.settings.showTimeTracker;
    card.classList.toggle("hidden", !enabled);
    const body = this.body;
    if (!enabled || !body) return;
    const s = this.screen;
    // A screen whose project or task has gone (deleted here or on another device) steps back
    if ((s.name === "project" || s.name === "edit-project") && !this.store.project(s.pid)) this.screen = { name: "projects" };
    if (s.name === "task" && !this.store.task(s.tid)) this.screen = this.store.project(s.pid) ? { name: "project", pid: s.pid } : { name: "projects" };
    const keep = body.contains(document.activeElement) ? document.activeElement.dataset?.k : null;
    const typing = document.activeElement && document.activeElement.matches?.("input, textarea, select") && body.contains(document.activeElement);
    if (typing && !this.refocus && !this.focusHeading) return; // a remote change must not pull the text out from under the cursor
    this.live = [];
    body.empty();
    const name = this.screen.name;
    const draw = { projects: this.drawProjects, project: this.drawProject, task: this.drawTask, "edit-project": this.drawEditProject, week: this.drawWeek, report: this.drawReport }[name];
    draw.call(this, body);
    this.tick();
    const want = this.refocus || keep;
    this.refocus = null;
    if (this.focusHeading) {
      this.focusHeading = false;
      body.querySelector(".tt-title")?.focus();
    } else if (want) {
      body.querySelector(`[data-k="${want}"]`)?.focus();
    }
  }

  // ── Pieces ──

  btn(label, key, fn, { cls = "tt-btn", icon, title, pressed } = {}) {
    const b = h("button", { type: "button", cls, "data-k": key, title: title || label, "aria-label": title || label });
    if (icon) {
      b.append(iconNode(icon));
      if (cls.includes("tt-text")) b.append(h("span", { text: label }));
    } else b.textContent = label;
    if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", fn);
    return b;
  }

  // Heading row: back button, title, and anything on the right
  head(title, back, ...right) {
    return h(
      "div",
      { cls: "tt-head" },
      back ? this.btn(T("Back"), "back", back, { cls: "tt-icon", icon: "arrow-left" }) : h("span"),
      h("h3", { cls: "tt-title", tabindex: "-1", text: title }),
      h("div", { cls: "tt-head-right" }, ...right),
    );
  }

  // A budget bar and the words that say the same thing (colour is never the only cue)
  budget(used, alloc, { label = true } = {}) {
    const wrap = h("span", { cls: "tt-budget" });
    const bar = h("span", { cls: "tt-bar-track", "aria-hidden": "true" }, h("span", { cls: "tt-bar-fill" }));
    const txt = h("span", { cls: "tt-budget-text" }, h("span", { cls: "tt-used" }), h("span", { cls: "tt-left" }));
    const set = () => {
      const u = typeof used === "function" ? used() : used;
      const a = typeof alloc === "function" ? alloc() : alloc;
      const b = ttBudget(u, a);
      wrap.dataset.state = b ? b.state : "none";
      wrap.classList.toggle("is-empty", !b);
      bar.firstChild.style.width = `${b ? Math.min(100, Math.round(b.pct * 100)) : 0}%`;
      txt.firstChild.textContent = b ? T("{used} of {total}", { used: ttHM(u), total: ttHM(a * 60) }) : ttHM(u);
      txt.lastChild.textContent = b ? ttBudgetText(b) : T("No time limit");
    };
    wrap.append(bar);
    if (label) wrap.append(txt);
    this.live.push(set);
    return wrap;
  }

  // Today and this week, for the footer (a project, or everything when pid is empty)
  footer(pid) {
    const el = h("div", { cls: "tt-foot" });
    this.live.push(() => {
      const now = this.now();
      const day = ttDayStart(now);
      const week = ttWeekStart(now, this.firstDay);
      const sum = (from) => {
        const map = this.store.secsByTask(from, Infinity, now);
        let t = 0;
        for (const task of this.store.data.tasks) if (!task.del && (!pid || task.pid === pid)) t += map.get(task.id) || 0;
        return t;
      };
      el.textContent = T("{today} today · {week} this week", { today: ttHM(sum(day)), week: ttHM(sum(week)) });
    });
    return el;
  }

  addBox(placeholder, label, onAdd) {
    const input = h("input", { type: "text", cls: "tt-input", placeholder, "aria-label": label, "data-k": "add", maxlength: "200", autocomplete: "off" });
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing) return;
      const v = input.value.replace(/\s+/g, " ").trim();
      if (!v) return;
      input.value = "";
      onAdd(v);
    });
    return h("div", { cls: "tt-add" }, input);
  }

  nav(active) {
    const link = (key, label, fn) => this.btn(label, key, fn, { cls: "tt-chip", pressed: active === key });
    return h(
      "div",
      { cls: "tt-nav", role: "group", "aria-label": T("Time tracker views") },
      link("projects", T("Projects"), () => this.go({ name: "projects" })),
      link("week", T("Week"), () => this.go({ name: "week" })),
      link("report", T("Report"), () => this.go({ name: "report" })),
    );
  }

  // ── Projects ──

  drawProjects(body) {
    const st = this.store;
    body.append(this.nav("projects"));
    body.append(h("h3", { cls: "tt-title", tabindex: "-1", text: T("Projects") }));
    body.append(this.addBox(T("New project or company…"), T("New project or company"), (name) => {
      const p = st.addProject(name, this);
      this.say(T("Added project {name}", { name: p.name }));
      this.act("add", () => {});
    }));
    const byName = (a, b) => a.name.localeCompare(b.name, LOCALE);
    const projects = st.projects().filter((p) => !p.arch).sort(byName);
    const archived = st.projects().filter((p) => p.arch).sort(byName);
    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Projects") });
    if (!projects.length) {
      list.append(h("div", { cls: "hp-empty", text: archived.length ? T("No active projects. Add one above, or open Archived below.") : T("No projects yet. Add a client or project to start tracking time.") }));
    }
    for (const p of projects) list.append(this.projectRow(p));
    body.append(list);
    if (archived.length) {
      const open = !!this.showArchived;
      const toggle = h("button", { type: "button", cls: "tt-archive-toggle", "aria-expanded": String(open), "aria-controls": "tt-archived", "data-k": "archived" }, iconNode("chevron"), h("span", { text: T("Archived ({n})", { n: archived.length }) }));
      toggle.addEventListener("click", () => this.act("archived", () => (this.showArchived = !open)));
      body.append(toggle);
      if (open) {
        const alist = h("div", { cls: "tt-list", id: "tt-archived", role: "list", "aria-label": T("Archived") });
        for (const p of archived) alist.append(this.projectRow(p));
        body.append(alist);
      }
    }
    body.append(this.footer(""));
  }

  projectRow(p) {
    const st = this.store;
    const run = () => st.runningTask();
    const row = h("button", { type: "button", cls: p.arch ? "tt-row is-archived" : "tt-row", "data-k": `p-${p.id}` });
    row.style.setProperty("--tt-c", p.color);
    const sub = h("span", { cls: "tt-sub" });
    const total = h("span", { cls: "tt-time" });
    this.live.push(() => {
      const n = st.tasks(p.id).length;
      const r = run();
      const running = r && r.pid === p.id;
      sub.textContent = running ? T("Running: {task}", { task: r.name }) : plural(n, "{n} task", "{n} tasks");
      sub.classList.toggle("is-running", !!running);
      total.textContent = ttHM(st.projectSecs(p.id, 0, Infinity, this.now()));
    });
    row.append(
      h("span", { cls: "tt-swatch", "aria-hidden": "true" }),
      h("span", { cls: "tt-main" }, h("span", { cls: "tt-name", text: p.name || T("Untitled project") }), sub),
      total,
      iconNode("chevron"),
    );
    row.append(this.budget(() => st.projectSecs(p.id, 0, Infinity, this.now()), () => st.projectAlloc(p)));
    row.addEventListener("click", () => this.go({ name: "project", pid: p.id }));
    return h("div", { role: "listitem" }, row);
  }

  // ── One project ──

  drawProject(body) {
    const st = this.store;
    const p = st.project(this.screen.pid);
    body.append(
      this.head(p.name || T("Untitled project"), () => this.go({ name: "projects" }), this.btn(T("Edit project"), "edit", () => this.go({ name: "edit-project", pid: p.id }), { cls: "tt-icon", icon: "settings" })),
    );
    const summary = h("div", { cls: "tt-summary" });
    summary.append(this.budget(() => st.projectSecs(p.id, 0, Infinity, this.now()), () => st.projectAlloc(p)));
    body.append(summary);
    if (p.arch) body.append(h("p", { cls: "tt-sub tt-archived-note", text: T("This project is archived. Unarchive it from Edit project to add tasks or start timers.") }));
    else {
      body.append(this.addBox(T("Add a task and press Enter"), T("New task"), (name) => {
        const t = st.addTask(p.id, name, this);
        this.say(T("Added task {name}", { name: t.name }));
        this.act("add", () => {});
      }));
    }
    const tasks = st.tasks(p.id).sort((a, b) => Number(a.done) - Number(b.done) || b.pri - a.pri || a.name.localeCompare(b.name, LOCALE));
    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Tasks") });
    if (!tasks.length) list.append(h("div", { cls: "hp-empty", text: p.arch ? T("No tasks.") : T("No tasks yet. Add one above.") }));
    for (const t of tasks) list.append(this.taskRow(t));
    body.append(list, this.footer(p.id));
  }

  taskRow(t) {
    const st = this.store;
    const row = h("div", { cls: t.done ? "tt-task done" : "tt-task", role: "listitem" });
    if (t.pri) row.dataset.pri = String(t.pri);
    const check = h("button", { type: "button", cls: t.done ? "task-check checked" : "task-check", role: "checkbox", "aria-checked": String(t.done), "aria-label": t.name, title: t.done ? T("Mark incomplete") : T("Mark complete"), "data-k": `c-${t.id}` });
    setIconSvg(check, t.done ? "check" : null);
    check.addEventListener("click", () => {
      if (!t.done && st.running()?.tid === t.id) st.stop(t.id, this);
      this.act(`c-${t.id}`, () => st.update(t, { done: !t.done }, this));
    });
    const sub = h("span", { cls: "tt-sub" });
    const open = h("button", { type: "button", cls: "tt-open", "data-k": `t-${t.id}` }, h("span", { cls: "tt-name", text: t.name }), sub);
    open.addEventListener("click", () => this.go({ name: "task", pid: t.pid, tid: t.id }));
    const time = h("span", { cls: "tt-badge" });
    const controls = h("span", { cls: "tt-controls" });
    const paint = () => {
      const running = st.running()?.tid === t.id;
      const secs = st.taskSecs(t.id, 0, Infinity, this.now());
      time.textContent = ttClock(secs);
      time.classList.toggle("is-running", running);
      const pri = t.pri ? `${T(TT_PRIORITIES[t.pri])} ${T("priority")} · ` : "";
      const n = st.sessions(t.id).length;
      sub.textContent = pri + (running ? T("Running") : t.paused ? T("Paused") : n ? plural(n, "{n} session", "{n} sessions") : T("No sessions"));
    };
    this.live.push(paint);
    const running = st.running()?.tid === t.id;
    if (!t.done && !st.archivedProject(t.pid)) {
      if (running) {
        controls.append(this.btn(T("Pause timer: {task}", { task: t.name }), `pause-${t.id}`, () => this.pauseTask(t), { cls: "tt-ctl", icon: "pause" }));
        controls.append(this.btn(T("Stop timer: {task}", { task: t.name }), `stop-${t.id}`, () => this.stopTask(t), { cls: "tt-ctl", icon: "stop" }));
      } else {
        controls.append(this.btn(t.paused ? T("Resume timer: {task}", { task: t.name }) : T("Start timer: {task}", { task: t.name }), `play-${t.id}`, () => this.startTask(t), { cls: "tt-ctl", icon: "play" }));
        if (t.paused) controls.append(this.btn(T("Stop timer: {task}", { task: t.name }), `stop-${t.id}`, () => this.stopTask(t), { cls: "tt-ctl", icon: "stop" }));
      }
    }
    row.append(check, open, time, controls);
    return row;
  }

  startTask(t) {
    this.act(`pause-${t.id}`, () => this.store.start(t.id, this));
    this.say(T("Started the timer for {task}", { task: t.name }));
  }
  pauseTask(t) {
    const secs = this.store.taskSecs(t.id, 0, Infinity, this.now());
    this.act(`play-${t.id}`, () => this.store.pause(t.id, this));
    this.say(T("Paused {task} at {time}", { task: t.name, time: ttClock(secs) }));
  }
  stopTask(t) {
    const secs = this.store.taskSecs(t.id, 0, Infinity, this.now());
    this.act(`play-${t.id}`, () => this.store.stop(t.id, this));
    this.say(T("Stopped {task} at {time}", { task: t.name, time: ttClock(secs) }));
  }

  // ── One task ──

  drawTask(body) {
    const st = this.store;
    const t = st.task(this.screen.tid);
    const p = st.project(t.pid);
    body.append(this.head(t.name, () => this.go({ name: "project", pid: t.pid })));
    body.append(h("div", { cls: "tt-crumb", text: p ? p.name : "" }));

    const clock = h("div", { cls: "tt-clock", role: "timer", "aria-label": T("Total time on this task") });
    const session = h("div", { cls: "tt-session" });
    const stats = h("div", { cls: "tt-stats" });
    const stat = (label) => {
      const v = h("span", { cls: "tt-stat-v" });
      stats.append(h("div", { cls: "tt-stat" }, h("span", { cls: "tt-stat-l", text: label }), v));
      return v;
    };
    const today = stat(T("Today"));
    const total = stat(T("Total"));
    const all = stat(T("All today"));
    this.live.push(() => {
      const now = this.now();
      const day = ttDayStart(now);
      clock.textContent = ttClock(st.taskSecs(t.id, 0, Infinity, now));
      const run = st.running();
      session.textContent = run && run.tid === t.id ? T("This session {time}", { time: ttClock((now - run.s) / 1000) }) : t.paused ? T("Paused") : "";
      today.textContent = ttHM(st.taskSecs(t.id, day, Infinity, now));
      total.textContent = ttHM(st.taskSecs(t.id, 0, Infinity, now));
      let a = 0;
      for (const v of st.secsByTask(day, Infinity, now).values()) a += v;
      all.textContent = ttHM(a);
    });
    body.append(h("div", { cls: "tt-clock-box" }, clock, session), stats);

    const running = st.running()?.tid === t.id;
    const ctl = h("div", { cls: "tt-big-controls" });
    if (st.archivedProject(t.pid)) ctl.append(h("span", { cls: "tt-sub", text: T("Archived project: timers are off") }));
    else if (!t.done) {
      if (running) ctl.append(this.btn(T("Pause"), `pause-${t.id}`, () => this.pauseTask(t), { cls: "tt-btn tt-text", icon: "pause" }));
      else ctl.append(this.btn(t.paused ? T("Resume") : T("Start"), `play-${t.id}`, () => this.startTask(t), { cls: "tt-btn tt-text tt-primary", icon: "play" }));
      if (running || t.paused) ctl.append(this.btn(T("Stop"), `stop-${t.id}`, () => this.stopTask(t), { cls: "tt-btn tt-text", icon: "stop" }));
    } else ctl.append(h("span", { cls: "tt-sub", text: T("Marked done") }));
    body.append(ctl);
    body.append(this.budget(() => st.taskSecs(t.id, 0, Infinity, this.now()), () => t.alloc));

    // Details
    const field = (label, control, id) => h("div", { cls: "tt-field" }, h("label", { for: id, text: label }), control);
    const name = h("input", { type: "text", cls: "tt-input", id: "tt-name", maxlength: "200", "data-k": "name" });
    name.value = t.name;
    name.addEventListener("change", () => {
      const v = name.value.trim();
      if (v) st.update(t, { name: v.slice(0, 200) }, this);
      else name.value = t.name;
    });
    const notes = h("textarea", { cls: "tt-input tt-notes", id: "tt-notes", rows: "3", maxlength: "4000", "data-k": "notes" });
    notes.value = t.notes;
    notes.addEventListener("change", () => st.update(t, { notes: notes.value }, this));
    const pri = h("select", { cls: "tt-input", id: "tt-pri", "data-k": "pri" }, TT_PRIORITIES.map((n, i) => h("option", { value: String(i), text: T(n) })));
    pri.value = String(t.pri);
    pri.addEventListener("change", () => st.update(t, { pri: Number(pri.value) }, this));
    body.append(
      h("div", { cls: "tt-form" }, field(T("Name"), name, "tt-name"), field(T("Notes"), notes, "tt-notes"), field(T("Priority"), pri, "tt-pri"), this.allocField(T("Allocated time"), t.alloc, (mins) => {
        st.update(t, { alloc: mins }, this);
        this.refreshLive();
      })),
    );

    // Sessions
    const sessions = st.sessions(t.id).sort((a, b) => b.s - a.s);
    body.append(h("h4", { cls: "tt-sub-head", text: T("Sessions") }), this.manualForm(t));
    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Sessions") });
    if (!sessions.length) list.append(h("div", { cls: "hp-empty", text: T("No sessions") }));
    for (const s of sessions.slice(0, 50)) {
      const short = { month: "short", day: "numeric" };
      const end = s.e == null ? T("now") : ttDayStart(s.e) === ttDayStart(s.s) ? ttClockOfDay(s.e) : `${fmtDate(new Date(s.e), short)}, ${ttClockOfDay(s.e)}`; // a session past midnight names its end day
      const when = `${fmtDate(new Date(s.s), short)}, ${ttClockOfDay(s.s)}–${end}`;
      const dur = h("span", { cls: "tt-time" });
      this.live.push(() => (dur.textContent = ttClock(((s.e == null ? this.now() : s.e) - s.s) / 1000)));
      const del = this.confirmButton(T("Delete session {when}", { when }), `del-${s.id}`, () => {
        this.act("back", () => st.removeSession(s.id, this));
        this.say(T("Deleted the session {when}", { when }));
      });
      list.append(h("div", { cls: "tt-session-row", role: "listitem" }, h("span", { cls: "tt-name", text: when }), dur, del));
    }
    if (sessions.length > 50) list.append(h("div", { cls: "tt-sub", text: T("+ {n} more", { n: fmtNum(sessions.length - 50) }) }));
    body.append(list);
    body.append(h("div", { cls: "tt-danger" }, this.confirmButton(T("Delete task"), "delete", () => {
      st.removeTask(t.id, this);
      this.say(T("Deleted task {name}", { name: t.name }));
      this.go({ name: "project", pid: t.pid });
    }, true)));
  }

  // For a forgotten timer: a day, a start and an end
  manualForm(t) {
    const day = ttIso(this.now());
    const input = (type, id, k, extra = {}) => h("input", { type, cls: "tt-input", id, "data-k": k, ...extra });
    const fromDate = input("date", "tt-msd", "msd", { max: day });
    const fromTime = input("time", "tt-mst", "mst");
    const toDate = input("date", "tt-med", "med", { max: day });
    const toTime = input("time", "tt-met", "met");
    fromDate.value = toDate.value = day;
    let endTouched = false; // until you pick an end date it follows the start date
    const msg = h("div", { cls: "tt-sub tt-msg", role: "alert" });
    const total = h("div", { cls: "tt-sub", "aria-live": "polite" });
    const when = (d, v) => {
      const base = ttParseDay(d);
      const m = /^(\d{2}):(\d{2})$/.exec(v || "");
      if (base == null || !m) return null;
      const b = new Date(base);
      return new Date(b.getFullYear(), b.getMonth(), b.getDate(), Number(m[1]), Number(m[2])).getTime();
    };
    const range = () => [when(fromDate.value, fromTime.value), when(toDate.value, toTime.value)];
    const preview = () => {
      const [a, b] = range();
      total.textContent = a != null && b != null && b > a ? T("This adds {time}", { time: ttHM((b - a) / 1000) }) : "";
    };
    fromDate.addEventListener("change", () => {
      if (!endTouched) toDate.value = fromDate.value;
    });
    toDate.addEventListener("change", () => (endTouched = true));
    for (const el of [fromDate, fromTime, toDate, toTime]) el.addEventListener("input", preview);
    for (const el of [fromDate, fromTime, toDate, toTime]) el.addEventListener("change", preview);
    const add = this.btn(T("Add time"), "madd", () => {
      const [a, b] = range();
      msg.textContent = "";
      if (a == null || b == null) msg.textContent = T("Choose a start and an end, each with a day and a time.");
      else if (b <= a) msg.textContent = T("The end must be after the start. Check the end date.");
      else if (b > this.now()) msg.textContent = T("That time is in the future.");
      else {
        this.store.addSession(t.id, a, b, this);
        this.say(T("Added {time} to {task}", { time: ttHM((b - a) / 1000), task: t.name }));
        this.act("madd", () => {});
      }
    }, { cls: "tt-btn tt-text" });
    const field = (label, control, id) => h("div", { cls: "tt-field" }, h("label", { for: id, text: label }), control);
    const box = h(
      "details",
      { cls: "tt-manual" },
      h("summary", { text: T("Add time manually"), "data-k": "manual" }),
      h("div", { cls: "tt-manual-body" },
        h("div", { cls: "tt-dates" }, field(T("Start date"), fromDate, "tt-msd"), field(T("Start time"), fromTime, "tt-mst")),
        h("div", { cls: "tt-dates" }, field(T("End date"), toDate, "tt-med"), field(T("End time"), toTime, "tt-met")),
        total, msg, add),
    );
    box.open = !!this.manualOpen; // stays open while you add several
    box.addEventListener("toggle", () => (this.manualOpen = box.open));
    return box;
  }

  // A button that asks once more before it acts
  confirmButton(label, key, fn, text = false) {
    const b = h("button", { type: "button", cls: text ? "tt-btn tt-text tt-warn" : "tt-icon tt-warn", "data-k": key, title: label, "aria-label": label });
    const reset = () => {
      b.classList.remove("armed");
      if (text) b.textContent = label;
      else setIconSvg(b, "trash");
      b.setAttribute("aria-label", label);
    };
    reset();
    let timer = null;
    b.addEventListener("click", () => {
      if (b.classList.contains("armed")) {
        clearTimeout(timer);
        fn();
        return;
      }
      b.classList.add("armed");
      const sure = T("Confirm: {action}", { action: label });
      if (text) b.textContent = T("Click again to confirm");
      b.setAttribute("aria-label", sure);
      this.say(sure);
      timer = setTimeout(reset, 4000);
    });
    return b;
  }

  // Hours and minutes boxes holding a number of minutes
  allocField(label, minutes, onChange) {
    const hrs = h("input", { type: "number", cls: "tt-input tt-num", min: "0", max: "9999", step: "1", id: "tt-ah", "aria-label": T("Allocated hours"), "data-k": "ah", inputmode: "numeric" });
    const mins = h("input", { type: "number", cls: "tt-input tt-num", min: "0", max: "59", step: "1", id: "tt-am", "aria-label": T("Allocated minutes"), "data-k": "am", inputmode: "numeric" });
    if (minutes) {
      hrs.value = String(Math.floor(minutes / 60));
      mins.value = String(minutes % 60);
    }
    const commit = () => {
      const total = Math.min(600000, Math.max(0, Math.floor(Number(hrs.value) || 0)) * 60 + Math.min(59, Math.max(0, Math.floor(Number(mins.value) || 0))));
      onChange(total);
    };
    hrs.addEventListener("change", commit);
    mins.addEventListener("change", commit);
    return h("div", { cls: "tt-field" }, h("span", { cls: "tt-label", id: "tt-alloc-l", text: label }), h("div", { cls: "tt-alloc", role: "group", "aria-labelledby": "tt-alloc-l" }, hrs, h("span", { cls: "tt-unit", "aria-hidden": "true", text: "h" }), mins, h("span", { cls: "tt-unit", "aria-hidden": "true", text: "m" })));
  }

  // ── Editing a project ──

  drawEditProject(body) {
    const st = this.store;
    const p = st.project(this.screen.pid);
    body.append(this.head(T("Edit project"), () => this.go({ name: "project", pid: p.id })));
    const name = h("input", { type: "text", cls: "tt-input", id: "tt-pname", maxlength: "120", "data-k": "pname" });
    name.value = p.name;
    name.addEventListener("change", () => {
      const v = name.value.trim();
      if (v) st.update(p, { name: v.slice(0, 120) }, this);
      else name.value = p.name;
    });
    const swatches = h("div", { cls: "tt-swatches", role: "radiogroup", "aria-label": T("Colour") });
    const names = [T("Violet"), T("Blue"), T("Teal"), T("Green"), T("Gold"), T("Orange"), T("Red"), T("Pink")];
    TT_COLOURS.forEach((c, i) => {
      const b = h("button", { type: "button", cls: "tt-swatch-btn", role: "radio", "aria-checked": String(p.color === c), "aria-label": names[i], title: names[i], "data-k": `col-${i}` });
      b.style.setProperty("--tt-c", c);
      b.addEventListener("click", () => {
        st.update(p, { color: c }, this);
        swatches.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      });
      swatches.append(b);
    });
    body.append(
      h("div", { cls: "tt-form" }, h("div", { cls: "tt-field" }, h("label", { for: "tt-pname", text: T("Name") }), name), h("div", { cls: "tt-field" }, h("span", { cls: "tt-label", text: T("Colour") }), swatches), this.allocField(T("Allocated time for the whole project"), p.alloc, (mins) => {
        st.update(p, { alloc: mins }, this);
        this.refreshLive();
      })),
      h("p", { cls: "tt-sub", text: T("Leave this blank to add up the time allocated to each task instead.") }),
      this.budget(() => st.projectSecs(p.id, 0, Infinity, this.now()), () => st.projectAlloc(p)),
      h(
        "div",
        { cls: "tt-archive" },
        this.btn(p.arch ? T("Unarchive project") : T("Archive project"), "archive", () => {
          if (p.arch) {
            this.act("archive", () => st.setArchived(p, false, this));
            this.say(T("Unarchived project {name}", { name: p.name }));
          } else {
            st.setArchived(p, true, this);
            this.say(T("Archived project {name}", { name: p.name }));
            this.go({ name: "projects" });
          }
        }),
        h("p", { cls: "tt-sub", text: p.arch ? T("Archived: its time still counts in reports and the weekly summary. Unarchive it to add tasks or start timers.") : T("Archive a finished project to tuck it away. Its time still counts in reports and the weekly summary, but you can't start timers or add tasks until you unarchive it.") }),
      ),
      h("div", { cls: "tt-danger" }, this.confirmButton(T("Delete project and its tasks"), "delete", () => {
        st.removeProject(p.id, this);
        this.say(T("Deleted project {name}", { name: p.name }));
        this.go({ name: "projects" });
      }, true)),
    );
  }

  // ── Weekly summary ──

  drawWeek(body) {
    const st = this.store;
    body.append(this.nav("week"));
    const start = ttAddDays(ttWeekStart(this.now(), this.firstDay), this.weekOffset * 7);
    const end = ttAddDays(start, 7);
    const label = `${fmtDate(new Date(start), { month: "short", day: "numeric" })} – ${fmtDate(new Date(end - 1), { month: "short", day: "numeric", year: "numeric" })}`;
    const move = (n) => {
      this.weekOffset = n === 0 ? 0 : this.weekOffset + n;
      this.refocus = n === 0 ? "this" : n < 0 ? "prev" : "next";
      this.render();
    };
    body.append(
      h("h3", { cls: "tt-title", tabindex: "-1", text: T("Weekly summary") }),
      h("div", { cls: "tt-range" },
        this.btn(T("Previous week"), "prev", () => move(-1), { cls: "tt-icon", icon: "arrow-left" }),
        h("span", { cls: "tt-range-label", "aria-live": "polite", text: label }),
        this.btn(T("Next week"), "next", () => move(1), { cls: "tt-icon", icon: "arrow-right" }),
      ),
    );
    if (this.weekOffset) body.append(this.btn(T("This week"), "this", () => move(0), { cls: "tt-chip" }));

    const days = Array.from({ length: 7 }, (_, i) => ttAddDays(start, i));
    const rep = ttReport(st, { from: start, to: end, now: this.now() });
    const perDay = days.map((d) => rep.rows.filter((r) => r.day === d).reduce((n, r) => n + r.secs, 0));
    const max = Math.max(...perDay, 1);
    const chart = h("div", { cls: "tt-week", role: "img", "aria-label": days.map((d, i) => `${fmtDate(new Date(d), { weekday: "long" })} ${ttHM(perDay[i])}`).join(", ") });
    days.forEach((d, i) => {
      const bar = h("div", { cls: "tt-day-bar" });
      bar.style.height = `${Math.max(perDay[i] ? 4 : 0, Math.round((perDay[i] / max) * 100))}%`;
      chart.append(h("div", { cls: "tt-day" }, h("span", { cls: "tt-day-v", text: perDay[i] ? ttHM(perDay[i]) : "" }), h("div", { cls: "tt-day-col" }, bar), h("span", { cls: "tt-day-l", text: fmtDate(new Date(d), { weekday: "short" }) })));
    });
    body.append(chart);

    const list = h("div", { cls: "tt-list", role: "list", "aria-label": T("Time by project") });
    if (!rep.projects.length) list.append(h("div", { cls: "hp-empty", text: T("No time was tracked this week.") }));
    for (const x of rep.projects.sort((a, b) => b.secs - a.secs)) {
      const share = rep.total ? Math.round((x.secs / rep.total) * 100) : 0;
      const row = h("div", { cls: "tt-week-row", role: "listitem" });
      row.style.setProperty("--tt-c", x.p.color);
      const bar = h("div", { cls: "tt-bar-track", "aria-hidden": "true" }, h("div", { cls: "tt-bar-fill" }));
      bar.firstChild.style.width = `${share}%`;
      row.append(h("span", { cls: "tt-swatch", "aria-hidden": "true" }), h("span", { cls: "tt-name", text: x.p.name }), h("span", { cls: "tt-time", text: ttHM(x.secs) }), h("span", { cls: "tt-share", text: `${share}%` }), bar);
      list.append(row);
    }
    body.append(list);
    body.append(h("div", { cls: "tt-total" }, h("span", { text: T("Total") }), h("strong", { text: `${ttHM(rep.total)} (${ttHoursText(rep.total)} ${T("hours")})` })));
    body.append(this.footer(""));
  }

  // ── Report and export ──

  rangeFor(preset) {
    const now = this.now();
    const wk = ttWeekStart(now, this.firstDay);
    const d = new Date(now);
    if (preset === "week") return [wk, ttAddDays(wk, 7)];
    if (preset === "lastweek") return [ttAddDays(wk, -7), wk];
    if (preset === "month") return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()];
    if (preset === "lastmonth") return [new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), new Date(d.getFullYear(), d.getMonth(), 1).getTime()];
    const a = ttParseDay(this.report.from);
    const b = ttParseDay(this.report.to);
    if (a == null || b == null || b < a) return null;
    return [a, ttAddDays(b, 1)];
  }

  currentReport() {
    const r = this.report;
    const range = this.rangeFor(r.preset);
    if (!range) return null;
    return ttReport(this.store, { pid: r.pid, from: range[0], to: range[1], now: this.now() });
  }

  drawReport(body) {
    const st = this.store;
    const r = this.report;
    body.append(this.nav("report"));
    body.append(h("h3", { cls: "tt-title", tabindex: "-1", text: T("Time report") }));
    if (r.pid && !st.project(r.pid)) r.pid = "";
    if (!r.from) {
      const [a, b] = this.rangeFor("week");
      r.from = ttIso(a);
      r.to = ttIso(b - 1);
    }
    const proj = h("select", { cls: "tt-input", id: "tt-rp", "data-k": "rp" }, h("option", { value: "", text: T("All projects") }), st.projects().filter((p) => !p.arch).sort((a, b) => a.name.localeCompare(b.name, LOCALE)).map((p) => h("option", { value: p.id, text: p.name })));
    const archivedProjects = st.projects().filter((p) => p.arch).sort((a, b) => a.name.localeCompare(b.name, LOCALE));
    if (archivedProjects.length) proj.append(h("optgroup", { label: T("Archived") }, archivedProjects.map((p) => h("option", { value: p.id, text: p.name }))));
    proj.value = r.pid;
    const presets = { week: T("This week"), lastweek: T("Last week"), month: T("This month"), lastmonth: T("Last month"), custom: T("Custom range") };
    const pre = h("select", { cls: "tt-input", id: "tt-rr", "data-k": "rr" }, Object.entries(presets).map(([k, v]) => h("option", { value: k, text: v })));
    pre.value = r.preset;
    const from = h("input", { type: "date", cls: "tt-input", id: "tt-rf", "data-k": "rf" });
    const to = h("input", { type: "date", cls: "tt-input", id: "tt-rt", "data-k": "rt" });
    from.value = r.from;
    to.value = r.to;
    const dates = h("div", { cls: "tt-dates" }, h("div", { cls: "tt-field" }, h("label", { for: "tt-rf", text: T("From") }), from), h("div", { cls: "tt-field" }, h("label", { for: "tt-rt", text: T("To") }), to));
    dates.classList.toggle("hidden", r.preset !== "custom");
    const result = h("div", { cls: "tt-result", "aria-live": "polite" });
    const exports = h("div", { cls: "tt-exports", role: "group", "aria-label": T("Export") });

    const foot = this.footer("");
    const base = this.live.length;
    const paint = () => {
      this.live.length = base; // the budgets of the last result are gone
      result.empty();
      const rep = this.currentReport();
      for (const b of exports.querySelectorAll("button")) b.disabled = !rep || !rep.rows.length;
      if (!rep) {
        result.append(h("div", { cls: "tt-sub", text: T("Choose a start date that is not after the end date.") }));
        return;
      }
      result.append(h("div", { cls: "tt-total" }, h("span", { text: `${fmtDate(new Date(rep.from))} – ${fmtDate(new Date(rep.to - 1))}` }), h("strong", { text: `${ttHM(rep.total)} (${ttHoursText(rep.total)} ${T("hours")})` })));
      if (!rep.projects.length) result.append(h("div", { cls: "hp-empty", text: T("No time was tracked in this period.") }));
      for (const x of rep.projects) {
        const block = h("div", { cls: "tt-rep-proj" });
        block.style.setProperty("--tt-c", x.p.color);
        block.append(h("div", { cls: "tt-week-row" }, h("span", { cls: "tt-swatch", "aria-hidden": "true" }), h("span", { cls: "tt-name", text: x.p.name }), h("span", { cls: "tt-time", text: ttHM(x.secs) })));
        if (x.alloc) block.append(h("div", { cls: "tt-sub tt-cap", text: T("Budget, all time") }), this.budget(x.usedAll, x.alloc));
        for (const y of x.tasks) block.append(h("div", { cls: "tt-rep-task" }, h("span", { cls: "tt-name", text: y.t.name }), h("span", { cls: "tt-time", text: ttHM(y.secs) })));
        result.append(block);
      }
      this.tick();
    };
    const changed = () => {
      r.pid = proj.value;
      r.preset = pre.value;
      r.from = from.value;
      r.to = to.value;
      dates.classList.toggle("hidden", r.preset !== "custom");
      paint();
    };
    for (const el of [proj, pre, from, to]) el.addEventListener("change", changed);

    const files = [
      ["csv", "CSV", "text/csv"],
      ["xlsx", "Excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["pdf", "PDF", "application/pdf"],
    ];
    for (const [kind, label, mime] of files) {
      exports.append(this.btn(T("Export {format}", { format: label }), `x-${kind}`, () => this.exportReport(kind, mime, label), { cls: "tt-btn tt-text", icon: "export" }));
    }
    body.append(h("div", { cls: "tt-form" }, h("div", { cls: "tt-field" }, h("label", { for: "tt-rp", text: T("Project") }), proj), h("div", { cls: "tt-field" }, h("label", { for: "tt-rr", text: T("Period") }), pre), dates), result, exports);
    paint();
    body.append(foot);
  }

  async exportReport(kind, mime, label) {
    const rep = this.currentReport();
    if (!rep || !rep.rows.length) {
      new Notice(T("There is no tracked time in this period to export."));
      return;
    }
    const base = ttFileLabel(rep, this.report.pid, this.store);
    const data = kind === "csv" ? ttCsv(rep) : kind === "xlsx" ? ttXlsx(rep) : ttPdf(rep, this.store, this.report.pid);
    await ttSaveFile(this.view.app, `${base}.${kind}`, data, mime, label);
  }
}

class HomepageView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tasks = [];
    this.taskFilter = "all";
    this.calYear = new Date().getFullYear();
    this.calMonth = new Date().getMonth();
    this.searchToken = 0;
    this.noteDirty = false;
    this.noteIndex = 1; // which of the seven notes is showing
    this.noteHasText = Array(NOTE_COUNT).fill(false);
    this.noteMode = "rich"; // "plain" when the note holds markdown the rich editor cannot reproduce
    this.noteComposing = false; // an IME (Japanese, say) is mid-composition
    this.fixingIds = false;
    this.timers = {};
  }

  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return T("Homepage");
  }
  getIcon() {
    return "home";
  }

  get settings() {
    return this.plugin.settings;
  }
  $(id) {
    return this.root.querySelector(`#${id}`);
  }
  get tasksPath() {
    return joinPath(this.settings.dataFolder, "Tasks.md");
  }
  notePathFor(i) {
    return joinPath(this.settings.dataFolder, i === 1 ? "Quick Note.md" : `Quick Note ${i}.md`);
  }
  get notePath() {
    return this.notePathFor(this.noteIndex);
  }
  noteIndexOfPath(path) {
    for (let i = 1; i <= NOTE_COUNT; i++) if (path === this.notePathFor(i)) return i;
    return 0;
  }
  get favPath() {
    return this.plugin.favPath;
  }
  get ringMode() {
    const m = this.settings.ringMode;
    return m === "chosen" || m === "files" ? m : "main";
  }
  // The note read in "main" / "chosen" mode
  get ringPath() {
    if (this.ringMode !== "chosen") return RING_MAIN_NOTE;
    const p = normalizePath(this.settings.ringNotesFile || RING_MAIN_NOTE);
    return /\.md$/i.test(p) ? p : `${p}.md`;
  }
  // The folder read in "files" mode
  get ringFolder() {
    return (this.settings.ringNotesFolder || "").replace(/^\/+|\/+$/g, "");
  }
  isRingFile(path) {
    if (this.ringMode === "files") return !!this.ringFolder && path.startsWith(`${this.ringFolder}/`);
    return path === this.ringPath;
  }
  // Run fn after ms; later calls with the same key replace the pending one
  later(key, ms, fn) {
    clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(fn, ms);
  }

  // Builds the dashboard DOM and wires its elements. Called again when the language changes,
  // so nothing here may register listeners outside this.root.
  buildUi() {
    this.root?.remove();
    // The id lets our control resets win over Obsidian's button/input styles without !important
    this.root = this.contentEl.createDiv({ cls: "hp-root", attr: { id: "genkan-root", lang: LANG } });
    this.root.append(...buildDashboard());
    if (Platform.isMobile) this.$("search-kbd").classList.add("hidden");

    setIconSvg(this.$("settings-btn"), "settings");
    setIconSvg(this.$("arrange-btn"), "arrange");
    setIconSvg(this.$("page-refresh"), "refresh");
    setIconSvg(this.$("refresh-clips"), "refresh");
    setIconSvg(this.$("refresh-recent"), "refresh");
    setIconSvg(this.$("hero-refresh"), "refresh");

    this.$("settings-btn").addEventListener("click", () => {
      this.app.setting.open();
      this.app.setting.openTabById(this.plugin.manifest.id);
    });
    this.$("page-refresh").addEventListener("click", () => {
      this.plugin.time?.reload();
      this.refreshAll(true);
      this.syncSharedLayout(true);
    });
    this.$("refresh-clips").addEventListener("click", () => this.renderClips());
    this.$("refresh-recent").addEventListener("click", () => this.renderRecent());
    this.$("hero-refresh").addEventListener("click", () => this.loadHero(true));
    // The cards already update live, so a refresh changes nothing you can see: spin the icon instead
    for (const id of ["page-refresh", "refresh-clips", "refresh-recent", "hero-refresh"]) {
      const btn = this.$(id);
      btn.addEventListener("click", () => {
        btn.classList.remove("spinning");
        void btn.offsetWidth; // restart the animation on a quick second click
        btn.classList.add("spinning");
        window.setTimeout(() => btn.classList.remove("spinning"), 700);
      });
    }

    this.initTheme();
    this.initCalendar();
    this.initTasks();
    this.initNote();
    this.initLinks();
    this.initSearch();
    this.initCards();
    this.initArrange();
    this.tt?.destroy();
    this.tt = new TimeTrackerUI(this);
  }

  // Labels are built once, so a language change rebuilds the dashboard in place
  rebuild() {
    this.greetKey = null;
    this.buildUi();
    this.applyClockFont();
    this.refreshAll(false);
  }

  async onOpen() {
    this.contentEl.addClass("hp-view");
    this.buildUi();

    // "/" focuses search while this view is the active tab, unless you are typing somewhere
    this.registerDomEvent(document, "keydown", (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      if (this.app.workspace.getActiveViewOfType(HomepageView) !== this) return;
      const t = e.target;
      if (t instanceof HTMLElement) {
        if (t.closest("input, textarea, select, [contenteditable='true']")) return;
        if (t.closest(".modal-container, .menu, .suggestion-container")) return;
      }
      e.preventDefault();
      this.$("search-input")?.focus();
    });

    this.registerDomEvent(document, "selectionchange", () => this.updateFormatState());
    // Coming back to Obsidian is when a layout pushed from another device has usually just synced
    this.registerDomEvent(window, "focus", () => this.syncSharedLayout(true));

    // Obsidian claims Cmd/Ctrl+B, I and K (and Shift+X) for its own editor before a page element
    // sees them. A view's scope sits ahead of those global hotkeys while this tab is active, so
    // register the note's shortcuts there. They only act while the note itself has focus.
    const inNote = () => {
      const a = document.activeElement;
      return !!a && (a.id === "quick-note-rich" || a.id === "quick-note");
    };
    // (a view only gets a scope if it makes one; Obsidian's own editor views do)
    if (!this.scope && Scope) this.scope = new Scope(this.app.scope);
    // Cmd/Ctrl+1 to 7 jump between the seven notes (Obsidian uses these for tabs, so only in the note)
    for (let n = 1; n <= NOTE_COUNT; n++) {
      this.scope?.register(["Mod"], String(n), () => {
        if (!inNote()) return true;
        this.switchNote(n, true);
        return false;
      });
    }
    for (const [modifiers, key, action] of [
      [["Mod"], "b", "bold"],
      [["Mod"], "i", "italic"],
      [["Mod"], "u", "underline"],
      [["Mod"], "k", "link"],
      [["Mod", "Shift"], "x", "strike"],
    ]) {
      this.scope?.register(modifiers, key, () => {
        if (!inNote()) return true; // not ours: let Obsidian handle it
        this.formatNote(action);
        return false;
      });
    }

    // Live updates: Obsidian Sync writes land here as vault events
    const v = this.app.vault;
    const onFile = (f) => this.onFileChange(f);
    this.registerEvent(v.on("modify", onFile));
    this.registerEvent(v.on("create", onFile));
    this.registerEvent(v.on("delete", onFile));
    this.registerEvent(v.on("rename", onFile));
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => this.scheduleLists()),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => this.scheduleLists()),
    );
    this.registerEvent(this.app.workspace.on("css-change", () => this.applyTheme()));

    this.registerInterval(window.setInterval(() => this.tickClock(), 1000));
    // Day rollover: refresh date-dependent content every 5 minutes
    this.registerInterval(
      window.setInterval(() => {
        this.renderCalendar();
        this.renderOnThisDay();
        this.renderVaultStats(true);
        this.loadHero(false);
        this.loadQuote();
        this.syncSharedLayout(true);
      }, 5 * 60 * 1000), // both loaders return early when switched off in settings
    );

    this.refreshAll(false);
  }

  async onClose() {
    this.tt?.destroy();
    Object.values(this.timers).forEach(clearTimeout);
    this.searchToken++;
  }

  // Re-render everything (also called after settings change)
  applyClockFont() {
    const mode = Object.keys(CLOCK_FONTS).includes(this.settings.clockFont) ? this.settings.clockFont : "default";
    this.root.setAttribute("data-clock-font", mode);
    const family = mode === "custom" ? cssFontFamily(this.settings.clockFontCustom) : "";
    if (family) this.root.style.setProperty("--clock-font-custom", family);
    else this.root.style.removeProperty("--clock-font-custom");
  }

  refreshAll(force) {
    this.applyClockFont();
    this.tickClock(true);
    this.applyTheme();
    this.renderCalendar();
    this.renderLinks();
    this.renderFavourites();
    this.renderRingNotes();
    this.loadTasks();
    this.loadNote();
    this.renderClips();
    this.renderRecent();
    this.renderOnThisDay();
    this.renderXkcd();
    this.renderVaultStats(true);
    this.tt?.render();
    this.$("hero").classList.toggle("hidden", !this.settings.showHero);
    this.$("app").classList.toggle("hero-over", !!this.settings.showHero && !!this.settings.heroOverlay);
    this.applyHeroTone();
    if (this.settings.showHero) this.loadHero(false);
    this.measureHeroTone();
    this.loadQuote();
  }

  onFileChange(f) {
    const path = f.path;
    if (path === this.tasksPath) this.later("tasks", 150, () => this.loadTasks());
    else if (this.noteIndexOfPath(path)) {
      if (path === this.notePath) this.later("note", 150, () => this.loadNote());
      else this.later("noteTabs", 300, () => this.refreshNoteTexts());
    }
    else if (path === this.favPath) this.later("favs", 150, () => this.renderFavourites());
    else if (this.isRingFile(path)) this.later("ring", 150, () => this.renderRingNotes());
    else this.scheduleLists();
  }

  // ── On this day ──

  async renderOnThisDay() {
    const card = this.$("otd-card");
    const enabled = !!this.settings.showOnThisDay;
    card.classList.toggle("hidden", !enabled);
    if (!enabled) return;

    const body = this.$("otd-body");
    const token = (this.otdToken = (this.otdToken || 0) + 1);
    const periods = onThisDayDates(new Date());
    const wanted = new Set(periods.map((p) => isoDay(p.date)));
    const dated = new Map(); // day -> notes dated by a property or their name
    const undated = new Map(); // day -> notes known only by the file's created time
    const undatedPerDay = new Map();
    const push = (map, key, file) => (map.has(key) ? map.get(key).push(file) : map.set(key, [file]));
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (this.isDataFile(f)) continue;
      const day = noteDay(f, this.app.metadataCache.getFileCache(f)?.frontmatter);
      if (day) {
        if (wanted.has(day)) push(dated, day, f);
        continue;
      }
      const created = isoDay(new Date(f.stat.ctime));
      undatedPerDay.set(created, (undatedPerDay.get(created) || 0) + 1);
      if (wanted.has(created)) push(undated, created, f);
    }

    const max = 3;
    const sections = [];
    let total = 0;
    for (const { key, date } of periods) {
      const day = isoDay(date);
      let list = dated.get(day) ?? [];
      if ((undatedPerDay.get(day) || 0) < FLOOD) list = list.concat(undated.get(day) ?? []);
      // daily notes (named for the day) first, then the rest in the order they were made
      list.sort((a, b) => Number(b.basename.includes(day)) - Number(a.basename.includes(day)) || a.stat.ctime - b.stat.ctime);
      total += list.length;
      sections.push({ key, date, list });
    }
    this.$("otd-count").textContent = fmtNum(total);
    // Read only the few notes that will show, for their one-line previews
    for (const s of sections) {
      s.shown = await Promise.all(s.list.slice(0, max).map(async (f) => ({ f, text: noteExcerpt(await this.app.vault.cachedRead(f), f.basename) })));
    }
    if (token !== this.otdToken) return; // a newer render has started

    const now = new Date();
    const label = { week: "A week ago", month: "A month ago", year: "A year ago" };
    body.empty();
    sections.forEach((s, i) => {
      const withYear = s.key === "year" || s.date.getFullYear() !== now.getFullYear();
      const when = fmtDate(s.date, { weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
      body.append(h("div", { cls: i ? "otd-when" : "otd-when first" }, h("h3", { cls: "otd-period", text: T(label[s.key]) }), h("span", { cls: "otd-date", text: when })));
      if (!s.list.length) {
        body.append(h("div", { cls: "otd-none", text: T("Nothing from this date") }));
        return;
      }
      const list = body.createDiv({ cls: "notes-list" });
      for (const { f, text } of s.shown) {
        const folder = f.parent && f.parent.path !== "/" ? f.parent.path : "";
        list.append(
          h(
            "a",
            { cls: "note-item", href: "#", "data-open": f.path },
            h("span", { cls: "note-icon", "aria-hidden": "true", text: "📄" }),
            h("div", { cls: "note-info" }, h("div", { cls: "note-title-row" }, h("span", { cls: "note-title", text: f.basename })), h("span", { cls: "note-path", text: text || folder })),
          ),
        );
      }
      if (s.list.length > max) body.append(h("div", { cls: "otd-more", text: T("+ {n} more", { n: fmtNum(s.list.length - max) }) }));
    });
  }

  // ── Vault stats ──

  // One pass over the vault, kept for 30 seconds so a refresh or a task change doesn't repeat it
  vaultStatsData(force) {
    const now = Date.now();
    if (!force && this.vsData && now - this.vsData.at < 30_000) return this.vsData;
    const mc = this.app.metadataCache;
    const files = this.app.vault.getMarkdownFiles().filter((f) => !this.isDataFile(f));
    const paths = new Set(files.map((f) => f.path));
    const days = new Map(); // day -> notes created or edited that day
    const since = now - VS_WEEKS * 7 * 86_400_000;
    let created = 0;
    for (const f of files) {
      const c = isoDay(new Date(f.stat.ctime));
      const m = isoDay(new Date(f.stat.mtime));
      days.set(c, (days.get(c) || 0) + 1);
      if (m !== c) days.set(m, (days.get(m) || 0) + 1);
      if (f.stat.ctime >= since) created++;
    }
    // A note is an orphan when it links to no other note and no other note links to it
    const linked = new Set();
    for (const [src, dests] of Object.entries(mc.resolvedLinks || {})) {
      if (!paths.has(src)) continue;
      for (const dest of Object.keys(dests)) {
        if (dest !== src && paths.has(dest)) {
          linked.add(src);
          linked.add(dest);
        }
      }
    }
    const orphans = files.filter((f) => !linked.has(f.path)).sort((a, b) => a.basename.localeCompare(b.basename));
    const unresolved = new Map(); // a note that is linked but doesn't exist -> the first note linking to it
    for (const [src, targets] of Object.entries(mc.unresolvedLinks || {})) {
      if (!paths.has(src)) continue;
      for (const name of Object.keys(targets)) if (!unresolved.has(name)) unresolved.set(name, src);
    }
    const tags = Object.entries(mc.getTags?.() || {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);
    // Days in a row with a note created or edited, counting back from today (or from yesterday if today is still empty)
    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (!days.has(isoDay(d))) d.setDate(d.getDate() - 1);
    while (days.has(isoDay(d)) && streak < 3650) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return (this.vsData = { at: now, total: files.length, days, created, orphans, unresolved: [...unresolved], tags, streak });
  }

  searchTag(tag) {
    const search = this.app.internalPlugins?.getPluginById?.("global-search")?.instance;
    if (search?.openGlobalSearch) search.openGlobalSearch(`tag:${tag}`);
    else this.app.commands.executeCommandById("global-search:open");
  }

  renderVaultStats(force) {
    const card = this.$("stats-card");
    const enabled = !!this.settings.showVaultStats;
    card.classList.toggle("hidden", !enabled);
    if (!enabled) {
      this.vsData = null;
      return;
    }
    const body = this.$("stats-body");
    if (!body.dataset.wired) {
      body.dataset.wired = "1";
      body.addEventListener("click", (e) => {
        const tag = e.target.closest("[data-tag]");
        if (tag) return this.searchTag(tag.dataset.tag);
        const go = e.target.closest("[data-vs]");
        if (!go) return;
        this.vsFocus = go.dataset.vsFocus === "back" ? this.vsView : "back"; // focus goes to the control that replaces this one
        this.vsView = go.dataset.vs || null;
        this.renderVaultStats();
      });
    }
    const d = this.vaultStatsData(force);
    this.$("stats-count").textContent = "";
    body.empty();
    if (this.vsView) this.drawVaultList(body, d);
    else this.drawVaultStats(body, d);
    const want = this.vsFocus;
    this.vsFocus = null;
    if (want) body.querySelector(`[data-vs-focus="${want}"]`)?.focus();
  }

  drawVaultStats(body, d) {
    const ws = this.settings.weekStart === "auto" ? localeWeekStart() : Number(this.settings.weekStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - ((today.getDay() - ws + 7) % 7) - 7 * (VS_WEEKS - 1));
    const cells = [];
    let max = 0;
    for (let i = 0; i < VS_WEEKS * 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const future = day > today;
      const n = future ? 0 : d.days.get(isoDay(day)) || 0;
      max = Math.max(max, n);
      cells.push({ day, n, future });
    }
    const level = (n) => (n ? Math.min(4, Math.ceil((4 * n) / max)) : 0);
    const heat = h(
      "div",
      { cls: "vs-heat", role: "img", "aria-label": T("Notes created or edited each day over the last 12 weeks. {streak}", { streak: d.streak ? T("{n}-day streak", { n: fmtNum(d.streak) }) : T("No current streak") }) },
      ...cells.map(({ day, n, future }) =>
        h("i", {
          cls: `vs-cell l${level(n)}${future ? " future" : ""}`,
          ...(future ? {} : { title: T("Notes on {date}: {n}", { date: fmtDate(day, { weekday: "short", month: "short", day: "numeric" }), n: fmtNum(n) }) }),
        }),
      ),
    );
    const tile = (n, label, view, aria) =>
      view
        ? h("button", { type: "button", cls: "vs-tile", "data-vs": view, "data-vs-focus": view, "aria-label": aria }, h("span", { cls: "vs-n", text: fmtNum(n) }), h("span", { cls: "vs-k", text: label }))
        : h("div", { cls: "vs-tile static" }, h("span", { cls: "vs-n", text: fmtNum(n) }), h("span", { cls: "vs-k", text: label }));
    const open = this.tasks.filter((t) => t.id && !t.done).length;
    body.append(
      heat,
      h("div", { cls: "vs-legend", "aria-hidden": "true" }, T("Less"), ...[0, 1, 2, 3, 4].map((l) => h("i", { cls: `vs-cell l${l}` })), T("More")),
      h(
        "div",
        { cls: "vs-sum" },
        h("span", {}, h("b", { text: fmtNum(d.streak) }), " ", T("day streak")),
        h("span", {}, h("b", { text: fmtNum(d.created) }), " ", T("created in 12 weeks")),
      ),
      h(
        "div",
        { cls: "vs-tiles" },
        tile(d.total, T("Notes")),
        tile(d.orphans.length, T("Orphan notes"), d.orphans.length ? "orphans" : null, T("Show the {n} orphan notes", { n: fmtNum(d.orphans.length) })),
        tile(d.unresolved.length, T("Unresolved links"), d.unresolved.length ? "unresolved" : null, T("Show the {n} unresolved links", { n: fmtNum(d.unresolved.length) })),
        tile(open, T("Open tasks")),
      ),
    );
    if (d.tags.length) {
      body.append(
        h("h3", { cls: "vs-sub", text: T("Top tags") }),
        h("div", { cls: "vs-tags" }, ...d.tags.map(([tag, n]) => h("button", { type: "button", cls: "vs-tag", "data-tag": tag, title: T("Search for {tag}", { tag }) }, tag, h("em", { text: fmtNum(n) })))),
      );
    }
    body.append(
      h("div", { cls: "vs-foot" }, h("span", { text: T("Based on file dates") }), h("span", { text: T("Updated {time}", { time: new Date(d.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }) })),
    );
  }

  // The notes behind the Orphan notes and Unresolved links tiles
  drawVaultList(body, d) {
    const orphans = this.vsView === "orphans";
    const items = orphans ? d.orphans : d.unresolved;
    const max = 50;
    body.append(
      h(
        "div",
        { cls: "vs-listhead" },
        h("button", { type: "button", cls: "vs-back", "data-vs": "", "data-vs-focus": "back" }, "← ", T("Back")),
        h("h3", { cls: "vs-sub", text: orphans ? T("Orphan notes") : T("Unresolved links") }),
      ),
    );
    if (!items.length) {
      body.append(h("p", { cls: "vs-empty", text: orphans ? T("No orphan notes.") : T("No unresolved links.") }));
      return;
    }
    const list = body.createDiv({ cls: "notes-list" });
    for (const it of items.slice(0, max)) {
      const [path, title, sub] = orphans
        ? [it.path, it.basename, it.parent && it.parent.path !== "/" ? it.parent.path : ""]
        : [it[1], it[0], T("in {note}", { note: it[1].replace(/^.*\//, "").replace(/\.md$/, "") })];
      list.append(
        h(
          "a",
          { cls: "note-item", href: "#", "data-open": path },
          h("span", { cls: "note-icon", "aria-hidden": "true", text: orphans ? "📄" : "🔗" }),
          h("div", { cls: "note-info" }, h("div", { cls: "note-title-row" }, h("span", { cls: "note-title", text: title })), sub ? h("span", { cls: "note-path", text: sub }) : null),
        ),
      );
    }
    if (items.length > max) body.append(h("div", { cls: "otd-more", text: T("+ {n} more", { n: fmtNum(items.length - max) }) }));
  }

  scheduleLists() {
    this.later("lists", 1500, () => {
      if (this.ringMode === "files") this.renderRingNotes(); // frontmatter may have changed
      this.renderFavourites();
      this.renderClips();
      this.renderRecent();
      this.renderOnThisDay();
      this.renderCalendar();
      this.later("vaultStats", 5000, () => this.renderVaultStats(true)); // a full pass over the vault, so less often
    });
  }

  // ── Files ──

  ensureFile(path, initial = "") {
    return ensureFileIn(this.app, path, initial);
  }

  openFile(path, evt) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) {
      new Notice(T("Note not found: {path}", { path }));
      return;
    }
    const mod = evt ? Keymap.isModEvent(evt) : false;
    this.app.workspace.getLeaf(mod || "tab").openFile(f);
  }

  // ── Theme ──

  applyTheme() {
    if (this.scrubNoteStyles) this.scrubNoteStyles();
    const t = this.settings.theme;
    const dark =
      t === "system" ? document.body.classList.contains("theme-dark") : t === "dark";
    this.root.setAttribute("data-theme", dark ? "dark" : "light");
    const btn = this.$("theme-toggle");
    setIconSvg(btn, t === "system" ? "monitor" : dark ? "moon" : "sun");
    const mode = dark ? T("Dark") : T("Light");
    const label = t === "system" ? T("System ({mode})", { mode }) : mode;
    btn.title = T("Appearance: {label} — click to change", { label });
  }

  initTheme() {
    const cycle = { system: "dark", dark: "light", light: "system" };
    this.$("theme-toggle").addEventListener("click", async () => {
      this.settings.theme = cycle[this.settings.theme] ?? "system";
      await this.plugin.saveSettings();
      this.applyTheme();
    });
  }

  // ── Clock ──

  tickClock(force) {
    this.tt?.tickRunning();
    const now = new Date();
    const hour = now.getHours();
    const pad = (n) => String(n).padStart(2, "0");

    const phrase =
      hour < 12 ? T("Good morning") : hour < 17 ? T("Good afternoon") : hour < 21 ? T("Good evening") : T("Good night");
    const name = this.settings.userName;
    // Rebuild only when the words change (this runs every second)
    const greetKey = `${phrase}|${name}`;
    if (this.greetKey !== greetKey) {
      this.greetKey = greetKey;
      const greeting = this.$("greeting");
      greeting.empty();
      greeting.append(name ? T("{greeting}, ", { greeting: phrase }) : phrase);
      if (name) {
        greeting.append(h("span", { cls: "gname", text: name }));
        const suffix = T("name suffix");
        if (suffix !== "name suffix") greeting.append(suffix);
      }
    }

    const main = this.$("clock-main");
    const ampm = this.$("clock-ampm");
    if (this.settings.clockFormat === "12h") {
      main.textContent = `${hour % 12 || 12}:${pad(now.getMinutes())}`;
      ampm.textContent = dayPeriod(now);
      ampm.classList.remove("hidden");
    } else {
      main.textContent = `${pad(hour)}:${pad(now.getMinutes())}`;
      ampm.classList.add("hidden");
    }
    this.$("clock-sec").textContent = `:${pad(now.getSeconds())}`;
    // The visible digits are hidden from screen readers; they get the time once a minute instead
    const spoken = ampm.classList.contains("hidden") ? main.textContent : `${main.textContent} ${ampm.textContent}`;
    const sr = this.$("clock-sr");
    if (sr.textContent !== spoken) sr.textContent = spoken;

    if (now.getSeconds() === 0 && this.noteIndex) this.updateNoteSaved();
    if (force || now.getSeconds() === 0 || !this.$("clock-date").textContent) {
      this.$("clock-date").textContent = fmtDate(now, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  // ── Calendar ──

  dailyNoteConfig() {
    const dn = this.app.internalPlugins?.getPluginById?.("daily-notes")?.instance?.options ?? {};
    const pn = this.app.plugins?.plugins?.["periodic-notes"]?.settings?.daily;
    const periodic = pn?.enabled ? pn : null;
    let folder = this.settings.dailyNotesFolder || periodic?.folder || dn.folder || "";
    // An auto-detected folder that doesn't exist (stale core setting) would make
    // clicks create notes in a bogus place — fall back to the vault root instead
    if (
      !this.settings.dailyNotesFolder &&
      folder &&
      !this.app.vault.getAbstractFileByPath(normalizePath(folder))
    ) {
      folder = "";
    }
    return {
      format: periodic?.format || dn.format || "YYYY-MM-DD",
      folder,
      template: periodic?.template || dn.template || "",
    };
  }

  dailyPath(date) {
    const { format, folder } = this.dailyNoteConfig();
    return joinPath(folder, `${moment(date).format(format)}.md`);
  }

  async openDailyNote(date, evt) {
    const path = this.dailyPath(date);
    let f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) {
      let content = "";
      const { template } = this.dailyNoteConfig();
      if (template) {
        const tf = this.app.vault.getAbstractFileByPath(normalizePath(`${template.replace(/\.md$/, "")}.md`));
        if (tf instanceof TFile) content = await this.app.vault.cachedRead(tf);
      }
      try {
        f = await this.ensureFile(path, content);
      } catch (err) {
        new Notice(T("Could not create daily note: {error}", { error: err.message }));
        return;
      }
    }
    this.app.workspace.getLeaf((evt && Keymap.isModEvent(evt)) || "tab").openFile(f);
  }

  initCalendar() {
    this.$("cal-prev").addEventListener("click", () => {
      if (--this.calMonth < 0) {
        this.calMonth = 11;
        this.calYear--;
      }
      this.renderCalendar();
    });
    this.$("cal-next").addEventListener("click", () => {
      if (++this.calMonth > 11) {
        this.calMonth = 0;
        this.calYear++;
      }
      this.renderCalendar();
    });
    this.$("cal-grid").addEventListener("keydown", (e) => {
      const btn = e.target.closest?.("button.cal-day");
      if (!btn || e.altKey || e.ctrlKey || e.metaKey) return;
      const days = [...this.$("cal-grid").querySelectorAll("button.cal-day")];
      const i = days.indexOf(btn);
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      const to = e.key === "Home" ? 0 : e.key === "End" ? days.length - 1 : step == null ? null : Math.max(0, Math.min(days.length - 1, i + step));
      if (to == null) return;
      e.preventDefault();
      days.forEach((b, n) => (b.tabIndex = n === to ? 0 : -1));
      days[to].focus();
    });
    this.$("cal-grid").addEventListener("focusin", (e) => {
      const btn = e.target.closest?.("button.cal-day");
      if (!btn) return;
      for (const b of this.$("cal-grid").querySelectorAll("button.cal-day")) b.tabIndex = b === btn ? 0 : -1;
    });
    this.$("cal-today").addEventListener("click", () => {
      const now = new Date();
      this.calYear = now.getFullYear();
      this.calMonth = now.getMonth();
      this.renderCalendar();
    });
  }

  renderCalendar() {
    const year = this.calYear;
    const month = this.calMonth;
    // Spanish writes "octubre de 2026"; the short form fits the narrow card
    const monthLabel = fmtDate(new Date(year, month, 1), { month: "long", year: "numeric" });
    this.$("cal-month-label").textContent = LANG === "es" ? monthLabel.replace(" de ", " ") : monthLabel;

    const ws = this.settings.weekStart === "auto" ? localeWeekStart() : Number(this.settings.weekStart);
    const grid = this.$("cal-grid");
    // Keep keyboard focus on the same day across a redraw (opening a new daily note redraws)
    const focusedDay = grid.contains(document.activeElement) ? document.activeElement.dataset.day : null;
    grid.empty();
    grid.setAttribute("aria-label", this.$("cal-month-label").textContent);
    const full = (date) => fmtDate(date, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    let current = null;
    const header = grid.appendChild(h("div", { cls: "cal-row", role: "row" }));
    for (let i = 0; i < 7; i++) {
      const dow = new Date(2023, 0, 1 + ((ws + i) % 7)); // 1 Jan 2023 was a Sunday
      header.appendChild(h("div", { cls: "cal-dow", role: "columnheader", "aria-label": fmtDate(dow, { weekday: "long" }), text: fmtDate(dow, { weekday: "short" }).slice(0, 2) }));
    }

    const today = new Date();
    const first = (new Date(year, month, 1).getDay() - ws + 7) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    let placed = 0;
    const place = (el) => {
      if (placed++ % 7 === 0) current = grid.appendChild(h("div", { cls: "cal-row", role: "row" }));
      current.appendChild(el);
    };
    // Days outside the month are shown for context but are not controls
    const filler = (n, date) => place(h("div", { cls: "cal-day other-month", role: "gridcell", "aria-label": full(date), text: String(n) }));
    for (let i = first - 1; i >= 0; i--) filler(prevDays - i, new Date(year, month - 1, prevDays - i));

    const buttons = [];
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const hasNote = !!this.app.vault.getAbstractFileByPath(this.dailyPath(date));
      const cell = h("button", {
        type: "button",
        cls: `cal-day${isToday ? " today" : ""}${hasNote ? " has-note" : ""}`,
        "data-day": String(d),
        "aria-label": hasNote ? T("{date}, has a note", { date: full(date) }) : full(date),
        tabindex: "-1",
        text: String(d),
      });
      if (isToday) cell.setAttribute("aria-current", "date");
      cell.addEventListener("click", (e) => this.openDailyNote(date, e));
      buttons.push(cell);
      place(h("div", { role: "gridcell", cls: "cal-cell" }, cell));
    }

    const filled = first + days;
    const remaining = filled % 7 === 0 ? 0 : 7 - (filled % 7);
    for (let d = 1; d <= remaining; d++) filler(d, new Date(year, month + 1, d));

    // One Tab stop for the whole month (today, or the 1st); the arrow keys move between days
    const isThisMonth = month === today.getMonth() && year === today.getFullYear();
    const stop = buttons[focusedDay ? Number(focusedDay) - 1 : isThisMonth ? today.getDate() - 1 : 0] || buttons[0];
    stop.tabIndex = 0;
    if (focusedDay) stop.focus();
  }

  // ── Tasks ──

  initTasks() {
    this.$("task-input").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const val = e.currentTarget.value.replace(/\s*\n\s*/g, " ").trim();
      if (!val) return;
      e.currentTarget.value = "";
      this.addTask(val);
    });

    this.root.querySelectorAll(".tab[data-filter]").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.taskFilter = tab.dataset.filter;
        this.root.querySelectorAll(".tab[data-filter]").forEach((t) => {
          t.classList.toggle("active", t === tab);
          t.setAttribute("aria-selected", String(t === tab));
        });
        this.renderTasks();
      });
    });

    this.$("clear-done").addEventListener("click", () =>
      this.mutateTasks((text) =>
        mapTaskLines(text, (line, m) => (m[2] !== " " ? null : line)),
      ),
    );
  }

  // Read-modify-write on the file itself, so edits made on another device (or
  // by hand in Obsidian) are never overwritten by a stale in-memory list.
  async mutateTasks(fn) {
    try {
      const file = await this.ensureFile(this.tasksPath);
      await this.app.vault.process(file, fn);
    } catch (err) {
      new Notice(T("Could not update tasks: {error}", { error: err.message }));
    }
    await this.loadTasks();
  }

  addTask(text) {
    const line = `- [ ] ${text} ➕ ${moment().format("YYYY-MM-DD")} ^${newId()}`;
    return this.mutateTasks((t) => {
      const i = bodyStart(t);
      const lead = i === t.length && t && !t.endsWith("\n") ? "\n" : "";
      return `${t.slice(0, i)}${lead}${line}\n${t.slice(i)}`;
    });
  }

  toggleTask(id) {
    return this.mutateTasks((text) =>
      mapTaskLines(text, (line, m) =>
        m[5] === id
          ? line.replace(/\[([ xX])\]/, m[2] === " " ? "[x]" : "[ ]")
          : line,
      ),
    );
  }

  deleteTask(id) {
    return this.mutateTasks((text) =>
      mapTaskLines(text, (line, m) => (m[5] === id ? null : line)),
    );
  }

  async loadTasks() {
    const f = this.app.vault.getAbstractFileByPath(this.tasksPath);
    if (!(f instanceof TFile)) {
      this.tasks = [];
      this.renderTasks();
      this.renderVaultStats();
      return;
    }
    const text = await this.app.vault.read(f);
    this.tasks = parseTasks(text);
    this.renderTasks();
    this.renderVaultStats();

    // Tasks typed by hand in Obsidian have no ^id yet — add one so they can be toggled
    if (this.tasks.some((t) => !t.id) && !this.fixingIds) {
      this.fixingIds = true;
      try {
        await this.app.vault.process(f, (t) =>
          mapTaskLines(t, (line, m) => (m[5] ? line : `${line.trimEnd()} ^${newId()}`)),
        );
      } finally {
        this.fixingIds = false;
      }
    }
  }

  renderTasks() {
    const tasks = this.tasks.filter((t) => t.id);
    const done = tasks.filter((t) => t.done).length;
    this.$("tasks-stats").textContent = `${fmtNum(done)} / ${fmtNum(tasks.length)}`;

    const filtered =
      this.taskFilter === "active"
        ? tasks.filter((t) => !t.done)
        : this.taskFilter === "done"
          ? tasks.filter((t) => t.done)
          : tasks;

    const list = this.$("tasks-list");
    if (!filtered.length) {
      const msg =
        this.taskFilter === "done"
          ? T("No completed tasks yet.")
          : this.taskFilter === "active"
            ? T("Nothing left to do!")
            : T("No tasks yet — add one above.");
      this.showEmpty(list, msg);
      return;
    }

    list.empty();
    for (const task of filtered) {
      const check = h("button", {
        type: "button",
        cls: task.done ? "task-check checked" : "task-check",
        role: "checkbox",
        "aria-checked": String(!!task.done),
        "aria-label": task.text,
        title: task.done ? T("Mark incomplete") : T("Mark complete"),
      });
      setIconSvg(check, task.done ? "check" : null);
      check.addEventListener("click", () => this.toggleTask(task.id));

      const del = h("button", { cls: "task-del", title: T("Delete"), "aria-label": T("Delete: {task}", { task: task.text }) });
      setIconSvg(del, "trash");
      del.addEventListener("click", () => this.deleteTask(task.id));

      list.append(
        h(
          "div",
          { cls: task.done ? "task-item done" : "task-item", role: "listitem" },
          check,
          h("span", { cls: "task-text", text: task.text }),
          del,
        ),
      );
    }
  }

  // ── Arranging cards ──

  cardName(id) {
    return T(CARD_NAMES[id]);
  }

  isCardShown(id) {
    const el = this.$(id);
    return !!el && !el.classList.contains("hidden");
  }

  zoneName(zone) {
    return T({ top: "Top row", left: "Left column", center: "Centre column", right: "Right column" }[zone]);
  }

  // Remembered per device where Obsidian allows it: a phone and a laptop want different layouts
  restoreLayout() {
    let v = null;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = this.app.loadLocalStorage("genkan-layout");
    } catch {
      // fall through to the plugin data
    }
    if (!v || typeof v !== "object") v = this.plugin.settings.cache?.layout;
    return normaliseLayout(v);
  }

  rememberLayout(layout) {
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-layout", layout);
    } catch {
      // fall through to the plugin data
    }
    const st = this.plugin.settings;
    st.cache = { ...(st.cache ?? {}), layout };
    this.plugin.saveSettings().catch(() => {});
  }

  // Which pushed layout this device last took, so a layout is only adopted once and a device
  // can be rearranged afterwards
  restoreSharedVersion() {
    let v = NaN;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = Number(this.app.loadLocalStorage("genkan-layout-version"));
    } catch {
      // fall through to the plugin data
    }
    if (!Number.isFinite(v)) v = Number(this.plugin.settings.cache?.layoutVersion);
    return Number.isFinite(v) ? v : 0;
  }

  rememberSharedVersion(version) {
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-layout-version", version);
    } catch {
      // fall through to the plugin data
    }
    const st = this.plugin.settings;
    st.cache = { ...(st.cache ?? {}), layoutVersion: version };
    this.plugin.saveSettings().catch(() => {});
  }

  // Adopt a layout another device has pushed. Never moves cards while you are arranging them.
  async syncSharedLayout(notify) {
    try {
      this.plugin.adoptSharedLayout((await this.plugin.loadData())?.sharedLayout);
    } catch {
      // the file can't be read: use what is loaded
    }
    const shared = this.plugin.settings.sharedLayout;
    this.updateLayoutStatus();
    if (!shared || shared.version <= this.restoreSharedVersion()) return;
    if (this.arranging || this.drag || this.pick) return;
    const layout = normaliseLayout(shared.layout);
    this.applyLayout(layout);
    this.rememberLayout(layout);
    this.rememberSharedVersion(shared.version);
    if (notify) new Notice(T("Layout updated from another device."));
  }

  // Save the current layout as the shared one; other devices take it the next time they look
  async pushLayout() {
    const st = this.plugin.settings;
    const version = Math.max(Date.now(), (st.sharedLayout?.version || 0) + 1);
    st.sharedLayout = { layout: this.layout, version };
    try {
      await this.plugin.saveSettings();
      this.rememberSharedVersion(version);
      this.updateLayoutStatus();
      const msg = T("Layout saved for all your devices. Other devices pick it up when they next sync.");
      new Notice(msg);
      this.announce(msg);
    } catch {
      new Notice(T("Could not save the layout for your other devices."));
    }
  }

  // Put each card in its zone, touching only the cards that are out of place (moving a node
  // restarts its animation and drops focus)
  applyLayout(layout) {
    this.layout = layout;
    this.updateLayoutStatus();
    for (const z of ARRANGE_ZONES) {
      const zone = this.root.querySelector(`.zone[data-zone="${z}"]`);
      layout[z].forEach((id, i) => {
        const el = this.$(id);
        if (el && zone.children[i] !== el) zone.insertBefore(el, zone.children[i] || null);
      });
    }
  }

  // Say whether this device is on the shared layout or has one of its own
  updateLayoutStatus() {
    const status = this.$("arrange-status");
    const useShared = this.$("arrange-use-shared");
    if (!status || !useShared) return;
    const shared = this.plugin.settings.sharedLayout;
    let text;
    let differs = false;
    if (!shared) text = T("Local layout: only on this device. Use on all my devices shares it.");
    else if (layoutsEqual(this.layout, normaliseLayout(shared.layout))) text = T("Synced layout: the same on all your devices.");
    else {
      text = T("Local layout: this device differs from the shared layout.");
      differs = true;
    }
    status.textContent = text;
    useShared.hidden = !differs;
  }

  adoptShared() {
    const shared = this.plugin.settings.sharedLayout;
    if (!shared) return;
    const layout = normaliseLayout(shared.layout);
    this.applyLayout(layout);
    this.rememberLayout(layout);
    this.rememberSharedVersion(shared.version);
    this.announce(T("Switched to the shared layout."));
  }

  announce(msg, id = "arrange-live") {
    const el = this.$(id);
    if (!el) return;
    el.textContent = "";
    window.setTimeout(() => (el.textContent = msg), 30);
  }

  positionText(id) {
    const zone = ARRANGE_ZONES.find((z) => this.layout[z].includes(id));
    const shown = this.layout[zone].filter((x) => this.isCardShown(x));
    return T("{name}: {zone}, position {n} of {total}", { name: this.cardName(id), zone: this.zoneName(zone), n: shown.indexOf(id) + 1, total: shown.length });
  }

  initArrange() {
    this.arranging = false;
    this.pick = null;
    this.drag = null;
    for (const id of Object.keys(CARD_NAMES)) {
      const card = this.$(id);
      if (!card) continue;
      const name = this.cardName(id);
      const move = (dir, icon, key) => {
        const label = T(key, { name });
        return h("button", { type: "button", cls: "arrange-move", "data-move": dir, title: label, "aria-label": label }, iconNode(icon));
      };
      const handleLabel = T("Move {name}", { name });
      card.prepend(
        h(
          "div",
          { cls: "arrange-bar", hidden: "" },
          h("button", { type: "button", cls: "arrange-handle", "data-id": id, title: handleLabel, "aria-label": handleLabel, "aria-pressed": "false" }, iconNode("grip")),
          h("span", { cls: "arrange-name", text: name }),
          h("div", { cls: "arrange-moves" }, move("up", "arrow-up", "Move {name} up"), move("down", "arrow-down", "Move {name} down"), move("left", "arrow-left", "Move {name} left"), move("right", "arrow-right", "Move {name} right")),
        ),
      );
    }
    this.applyLayout(this.restoreLayout());
    this.syncSharedLayout(false);

    this.$("arrange-btn").addEventListener("click", () => this.setArranging(!this.arranging));
    this.$("arrange-done").addEventListener("click", () => this.setArranging(false));
    this.$("arrange-reset").addEventListener("click", () => this.resetLayout());
    this.$("arrange-push").addEventListener("click", () => this.pushLayout());
    this.$("arrange-use-shared").addEventListener("click", () => this.adoptShared());

    this.root.addEventListener("click", (e) => {
      const btn = e.target.closest?.(".arrange-move");
      if (btn) this.moveCard(btn.closest(".card").id, btn.dataset.move, btn);
    });
    this.root.addEventListener("keydown", (e) => this.arrangeKey(e));
    this.root.addEventListener("focusout", (e) => {
      // Tabbing away from a picked-up card drops it where it is
      if (this.pick && !this.moving && e.target.classList?.contains("arrange-handle") && e.target.dataset.id === this.pick.id) this.dropPick(e.target, true);
    });
    this.root.addEventListener("pointerdown", (e) => this.dragDown(e));
    this.root.addEventListener("pointermove", (e) => this.dragMove(e));
    this.root.addEventListener("pointerup", (e) => this.dragUp(e, false));
    this.root.addEventListener("pointercancel", (e) => this.dragUp(e, true));
  }

  setArranging(on) {
    this.cancelDrag();
    this.pick = null;
    this.arranging = on;
    this.root.classList.toggle("arranging", on);
    this.$("arrange-btn").setAttribute("aria-pressed", String(on));
    this.$("arrange-banner").hidden = !on;
    for (const id of Object.keys(CARD_NAMES)) {
      const card = this.$(id);
      if (!card) continue;
      for (const child of card.children) {
        if (child.classList.contains("arrange-bar")) child.hidden = !on;
        else child.inert = on;
      }
    }
    this.announce(T(on ? "Arranging cards" : "Done arranging"));
    if (on) {
      const first = Array.from(this.root.querySelectorAll(".arrange-handle")).find((b) => this.isCardShown(b.dataset.id));
      first?.focus();
    } else {
      this.$("arrange-btn").focus();
    }
  }

  resetLayout() {
    this.applyLayout(normaliseLayout(null));
    this.rememberLayout(null);
    this.announce(T("Layout reset."));
  }

  moveCard(id, dir, focusEl) {
    const next = moveInLayout(this.layout, id, dir, (x) => this.isCardShown(x));
    if (!next) {
      this.announce(T("{name} can't move any further that way.", { name: this.cardName(id) }));
      return false;
    }
    this.moving = true; // moving the node blurs it; refocus without treating that as a drop
    this.applyLayout(next);
    this.rememberLayout(next);
    focusEl?.focus();
    this.moving = false;
    this.announce(this.positionText(id));
    return true;
  }

  // Keyboard: Space or Enter picks a card up, the arrow keys move it, Space drops it, Escape cancels
  arrangeKey(e) {
    if (e.key === "Escape" && this.drag) {
      e.preventDefault();
      this.cancelDrag();
      return;
    }
    const handle = e.target.closest?.(".arrange-handle");
    if (!handle || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
    const id = handle.dataset.id;
    const arrows = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const holding = this.pick && this.pick.id === id;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (holding) this.dropPick(handle);
      else {
        this.pick = { id, before: this.layout };
        handle.setAttribute("aria-pressed", "true");
        this.announce(T("{name} picked up. Use the arrow keys to move it, Space to drop it and Escape to cancel.", { name: this.cardName(id) }));
      }
    } else if (holding && arrows[e.key]) {
      e.preventDefault();
      this.moveCard(id, arrows[e.key], handle);
    } else if (holding && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.moving = true;
      this.applyLayout(this.pick.before);
      this.rememberLayout(this.pick.before);
      handle.focus();
      this.moving = false;
      handle.setAttribute("aria-pressed", "false");
      this.pick = null;
      this.announce(T("Move cancelled."));
    }
  }

  dropPick(handle, quiet) {
    handle.setAttribute("aria-pressed", "false");
    const id = this.pick.id;
    this.pick = null;
    if (!quiet) this.announce(T("Dropped. {position}", { position: this.positionText(id) }));
  }

  // Pointer dragging, by the handle. A small ghost follows the pointer, a slot shows where the card
  // will land, and the page scrolls itself near its top and bottom edges.
  dragDown(e) {
    const handle = e.target.closest?.(".arrange-handle");
    if (!handle || !this.arranging || (e.pointerType === "mouse" && e.button !== 0)) return;
    const card = handle.closest(".card");
    this.drag = { id: card.id, card, handle, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false };
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // the drag still works without capture
    }
    e.preventDefault();
  }

  dragMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.started) {
      if (Math.hypot(d.x - d.x0, d.y - d.y0) < 5) return;
      d.started = true;
      const rect = d.card.getBoundingClientRect();
      d.slot = h("div", { cls: "drop-slot", "aria-hidden": "true" });
      d.slot.style.height = `${rect.height}px`;
      d.card.before(d.slot);
      d.card.classList.add("is-dragging");
      d.ghost = h("div", { cls: "drag-ghost", text: this.cardName(d.id) });
      this.root.append(d.ghost);
      this.root.classList.add("is-dragging-card");
      this.dragFrame();
    }
    this.dragUpdate();
  }

  dragUpdate() {
    const d = this.drag;
    if (!d || !d.started) return;
    const root = this.root.getBoundingClientRect();
    d.ghost.style.left = `${d.x - root.left + this.root.scrollLeft}px`;
    d.ghost.style.top = `${d.y - root.top + this.root.scrollTop}px`;
    // the zone under the pointer, or the nearest one
    let best = null;
    let bestDist = Infinity;
    for (const zone of this.root.querySelectorAll(".zone")) {
      if (getComputedStyle(zone).display === "none") continue;
      const r = zone.getBoundingClientRect();
      const dx = Math.max(r.left - d.x, 0, d.x - r.right);
      const dy = Math.max(r.top - d.y, 0, d.y - r.bottom);
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = zone;
      }
    }
    if (!best) return;
    const row = getComputedStyle(best).flexDirection === "row";
    const kids = Array.from(best.children).filter((c) => c !== d.card && c !== d.slot && !c.classList.contains("hidden"));
    let before = null;
    for (const c of kids) {
      const r = c.getBoundingClientRect();
      if (d.y < r.top || (d.y <= r.bottom && (row ? d.x < r.left + r.width / 2 : d.y < r.top + r.height / 2))) {
        before = c;
        break;
      }
    }
    if (before) {
      if (d.slot.nextSibling !== before) best.insertBefore(d.slot, before);
    } else if (best.lastChild !== d.slot) best.append(d.slot);
  }

  dragFrame() {
    const d = this.drag;
    if (!d || !d.started) return;
    const r = this.root.getBoundingClientRect();
    const edge = 56;
    const dy = d.y < r.top + edge ? -(r.top + edge - d.y) : d.y > r.bottom - edge ? d.y - (r.bottom - edge) : 0;
    if (dy) {
      this.root.scrollTop += Math.max(-18, Math.min(18, dy / 3));
      this.dragUpdate();
    }
    window.requestAnimationFrame(() => this.dragFrame());
  }

  dragUp(e, cancelled) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.started) {
      this.drag = null;
      return;
    }
    if (cancelled) return this.cancelDrag();
    // The new order is whatever the zones now hold, with the slot standing for the card
    const next = { top: [], left: [], center: [], right: [] };
    for (const z of ARRANGE_ZONES) {
      const zone = this.root.querySelector(`.zone[data-zone="${z}"]`);
      next[z] = Array.from(zone.children)
        .map((c) => (c === d.slot ? d.id : c === d.card ? null : c.id))
        .filter(Boolean);
    }
    const { card, handle, id } = d;
    this.endDrag();
    const layout = normaliseLayout(next);
    this.moving = true;
    this.applyLayout(layout);
    this.rememberLayout(layout);
    handle.focus();
    this.moving = false;
    this.announce(T("Dropped. {position}", { position: this.positionText(id) }));
    card.classList.remove("is-dragging");
  }

  cancelDrag() {
    if (!this.drag) return;
    const wasStarted = this.drag.started;
    const handle = this.drag.handle;
    this.endDrag();
    if (wasStarted) {
      handle.focus();
      this.announce(T("Move cancelled."));
    }
  }

  endDrag() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    d.slot?.remove();
    d.ghost?.remove();
    d.card.classList.remove("is-dragging");
    this.root.classList.remove("is-dragging-card");
    try {
      d.handle.releasePointerCapture(d.pointerId);
    } catch {
      // already released
    }
  }

  // ── Collapsible cards ──

  restoreCollapsed() {
    let v = null;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = this.app.loadLocalStorage("genkan-collapsed");
    } catch {
      // fall through to the plugin data
    }
    if (!Array.isArray(v)) v = this.plugin.settings.cache?.collapsed;
    return Array.isArray(v) ? v.filter((id) => typeof id === "string") : [];
  }

  // Remembered per device where Obsidian allows it: a phone and a laptop want different layouts
  rememberCollapsed() {
    const ids = Array.from(this.root.querySelectorAll(".card-toggle"))
      .filter((b) => b.getAttribute("aria-expanded") === "false")
      .map((b) => b.dataset.card);
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-collapsed", ids);
    } catch {
      // fall through to the plugin data
    }
    const s = this.plugin.settings;
    s.cache = { ...(s.cache ?? {}), collapsed: ids };
    this.plugin.saveSettings().catch(() => {});
  }

  setCollapsed(btn, collapsed) {
    this.$(btn.dataset.card).classList.toggle("is-collapsed", collapsed);
    this.$(btn.dataset.body).classList.toggle("hidden", collapsed);
    const label = T(collapsed ? "Expand {name}" : "Collapse {name}", { name: btn.dataset.label });
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.setAttribute("aria-label", label);
    btn.title = label;
    setIconSvg(btn, collapsed ? "plus" : "minus");
  }

  initCards() {
    const saved = this.restoreCollapsed();
    for (const btn of this.root.querySelectorAll(".card-toggle")) {
      this.setCollapsed(btn, saved.includes(btn.dataset.card));
      btn.addEventListener("click", () => {
        this.setCollapsed(btn, btn.getAttribute("aria-expanded") === "true");
        this.rememberCollapsed();
      });
    }
  }

  // ── Quick Note ──

  initNote() {
    const textarea = this.$("quick-note");
    const rich = this.$("quick-note-rich");
    this.setNoteMd(""); // builds the editor's first (empty) line

    this.noteIndex = this.restoreNoteIndex();
    this.renderNoteTabs();
    const tabs = this.$("note-tabs");
    tabs.addEventListener("mousedown", (e) => e.preventDefault()); // keep the cursor in the note
    tabs.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-note]");
      if (dot) this.switchNote(Number(dot.dataset.note), !Platform.isMobile);
    });
    tabs.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      const to = e.key === "Home" ? 1 : e.key === "End" ? NOTE_COUNT : step ? ((this.noteIndex - 1 + step + NOTE_COUNT) % NOTE_COUNT) + 1 : 0;
      if (!to) return;
      e.preventDefault();
      this.switchNote(to).then(() => this.root.querySelector(`.note-dot[data-note="${to}"]`)?.focus());
    });

    // Joining or splitting lines makes the browser copy the current text colour onto the text as
    // an inline style; it would stay put after a light/dark switch, so strip it as it appears
    const scrubStyles = () => {
      for (const el of rich.querySelectorAll("[style]")) el.removeAttribute("style");
      for (const el of rich.querySelectorAll("font")) el.replaceWith(...el.childNodes);
    };
    this.scrubNoteStyles = scrubStyles;
    rich.addEventListener("input", scrubStyles);

    const changed = () => {
      this.noteDirty = true;
      this.setSaveState(false);
      this.syncNoteEmpty();
      this.later("noteStats", 150, () => this.updateNoteStats());
      this.later("noteSave", 800, () => this.saveNote());
    };
    // Flush on blur so switching tabs right after typing never loses text
    const flush = () => {
      if (this.noteDirty && !this.noteComposing) this.saveNote().then(() => this.announce(T("Saved"), "note-live"));
    };
    for (const el of [textarea, rich]) {
      el.addEventListener("input", changed);
      el.addEventListener("blur", flush);
    }
    this.initNoteLinks(rich);
    rich.addEventListener("compositionstart", () => (this.noteComposing = true));
    rich.addEventListener("compositionend", () => (this.noteComposing = false));
    // Paste and drop as plain text, so no foreign styling ever enters the note
    const insertPlain = (text) => {
      if (text) document.execCommand("insertText", false, text);
    };
    rich.addEventListener("paste", (e) => {
      e.preventDefault();
      insertPlain((e.clipboardData || window.clipboardData).getData("text/plain"));
    });
    rich.addEventListener("drop", (e) => {
      e.preventDefault();
      insertPlain(e.dataTransfer && e.dataTransfer.getData("text/plain"));
    });
    // "---" then Enter becomes a horizontal rule, as in markdown
    rich.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
      let block = sel.anchorNode;
      while (block && block.parentNode !== rich) block = block.parentNode;
      if (!block || block.tagName !== "DIV" || block.textContent !== "---") return;
      e.preventDefault();
      const next = document.createElement("div");
      next.append(document.createElement("br"));
      block.replaceWith(document.createElement("hr"), next);
      const caret = document.createRange();
      caret.setStart(next, 0);
      caret.collapse(true);
      sel.removeAllRanges();
      sel.addRange(caret);
      rich.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Links are plain text to click in; Cmd/Ctrl-click follows one
    rich.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (a && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.open(a.getAttribute("href"));
      }
    });

    // Formatting toolbar. mousedown is cancelled so the click does not take focus (and the
    // selection) away from the note.
    const bar = this.root.querySelector(".note-toolbar");
    const barButtons = () => Array.from(bar.querySelectorAll("button"));
    const rove = (btn) => barButtons().forEach((b) => (b.tabIndex = b === btn ? 0 : -1));
    rove(barButtons()[0]);
    bar.addEventListener("focusin", (e) => {
      const b = e.target.closest("button");
      if (b) rove(b);
    });
    bar.addEventListener("keydown", (e) => {
      const list = barButtons();
      const i = list.indexOf(document.activeElement);
      if (i < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
      const to = e.key === "ArrowRight" ? (i + 1) % list.length : e.key === "ArrowLeft" ? (i - 1 + list.length) % list.length : e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : null;
      if (to == null) return;
      e.preventDefault();
      list[to].focus();
    });
    bar.addEventListener("mousedown", (e) => e.preventDefault());
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fmt]");
      if (btn) this.formatNote(btn.dataset.fmt);
      else if (e.target.closest("[data-export]")) this.exportNote();
    });
    const shortcuts = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.isComposing) return;
      const k = e.key.toLowerCase();
      const action = e.shiftKey ? (k === "x" ? "strike" : null) : { b: "bold", i: "italic", u: "underline", k: "link" }[k];
      if (!action) return;
      e.preventDefault();
      this.formatNote(action);
    };
    textarea.addEventListener("keydown", shortcuts);
    rich.addEventListener("keydown", shortcuts);

    // The link address row
    const input = this.$("note-link-input");
    this.$("note-link-apply").addEventListener("click", () => this.applyLink());
    this.$("note-link-cancel").addEventListener("click", () => this.closeLinkRow());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.applyLink();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.closeLinkRow();
      }
    });
    this.setSaveState(true);
  }

  async saveNote() {
    clearTimeout(this.timers.noteSave);
    const value = this.getNoteMd();
    const index = this.noteIndex;
    try {
      const file = await this.ensureFile(this.notePathFor(index));
      await this.app.vault.process(file, () => value);
      if (index === this.noteIndex && this.getNoteMd() === value) {
        this.noteDirty = false;
        this.setSaveState(true);
      }
    } catch (err) {
      new Notice(T("Could not save quick note: {error}", { error: err.message }));
    }
  }

  // The note as markdown, whichever editor is showing
  // Save the open note as a Markdown file wherever the user chooses, starting in the vault's folder
  async exportNote() {
    if (this.noteDirty && !this.noteComposing) await this.saveNote();
    const md = this.getNoteMd();
    if (!md.trim()) {
      new Notice(T("This note is empty, so there is nothing to export."));
      return;
    }
    const name = exportFileName(md, this.noteIndex);
    try {
      await saveExportFile(this.app, name, md, "text/markdown", "Markdown");
    } catch (err) {
      console.error("Genkan: export failed", err);
      new Notice(T("Could not export the note."));
    }
  }

  getNoteMd() {
    return this.noteMode === "rich" ? noteToMarkdown(this.$("quick-note-rich")) : this.$("quick-note").value;
  }

  // Show markdown in the rich editor, unless it could not be written back unchanged
  setNoteMd(md) {
    const textarea = this.$("quick-note");
    const rich = this.$("quick-note-rich");
    const ok = noteRoundTrips(md);
    this.noteMode = ok ? "rich" : "plain";
    rich.classList.toggle("hidden", !ok);
    textarea.classList.toggle("hidden", ok);
    this.$("note-hint").classList.toggle("hidden", ok);
    if (ok) rich.replaceChildren(markdownToBlocks(md));
    else textarea.value = md;
    this.syncNoteEmpty();
    this.updateFormatState();
  }

  // The placeholder shows while the note is empty (a contenteditable has none of its own)
  syncNoteEmpty() {
    const rich = this.$("quick-note-rich");
    rich.classList.toggle("is-empty", this.noteMode === "rich" && noteToMarkdown(rich) === "");
  }

  currentHeadingLevel() {
    const rich = this.$("quick-note-rich");
    let n = window.getSelection() && window.getSelection().anchorNode;
    while (n && n !== rich) {
      if (n.nodeType === 1 && /^H[1-6]$/.test(n.tagName)) return Number(n.tagName[1]);
      n = n.parentNode;
    }
    return 0;
  }

  // Light the toolbar buttons that match the text under the cursor
  updateFormatState() {
    if (!this.root) return;
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    const inside = this.noteMode === "rich" && sel && sel.anchorNode && rich.contains(sel.anchorNode);
    const q = (c) => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    const states = inside
      ? {
          bold: q("bold"),
          italic: q("italic"),
          underline: q("underline"),
          strike: q("strikeThrough"),
          bullet: q("insertUnorderedList"),
          numbered: q("insertOrderedList"),
          heading: this.currentHeadingLevel() > 0,
        }
      : {};
    for (const btn of this.root.querySelectorAll(".note-toolbar [data-fmt]")) {
      const on = !!states[btn.dataset.fmt];
      btn.classList.toggle("is-active", on);
      if (btn.dataset.fmt !== "link") btn.setAttribute("aria-pressed", String(on));
    }
  }

  // ── Link address row (rich editor) ──
  openLinkRow() {
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    this.noteRange = sel && sel.rangeCount && rich.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    let node = sel && sel.anchorNode;
    while (node && node !== rich && !(node.nodeType === 1 && node.tagName === "A")) node = node.parentNode;
    const existing = node && node !== rich ? node.getAttribute("href") : "";
    const selected = this.noteRange ? this.noteRange.toString() : "";
    const input = this.$("note-link-input");
    input.value = existing || (/^https?:\/\/\S+$/.test(selected) ? selected : "https://");
    this.root.querySelector(".note-link-row").classList.remove("hidden");
    input.focus();
    input.select();
  }

  closeLinkRow() {
    this.root.querySelector(".note-link-row").classList.add("hidden");
    const rich = this.$("quick-note-rich");
    rich.focus();
    const sel = window.getSelection();
    if (this.noteRange && sel) {
      sel.removeAllRanges();
      sel.addRange(this.noteRange);
    }
  }

  applyLink() {
    let url = this.$("note-link-input").value.trim();
    this.closeLinkRow();
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    if (!url || url === "https://") {
      document.execCommand("unlink");
      return;
    }
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
    if (!SAFE_HREF.test(url)) {
      new Notice(T("That kind of link isn't supported."));
      return;
    }
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    if (range && range.collapsed) {
      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.textContent = url;
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      rich.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      document.execCommand("createLink", false, url);
    }
  }

  // ── Links in the quick note ──
  // A link in an editable area does nothing when clicked, so Genkan opens it: in Surfing when that
  // plugin is on, otherwise in the default browser. Right-click offers other places to open it.

  initNoteLinks(rich) {
    const linkAt = (target) => {
      const a = target instanceof Element ? target.closest("a[href]") : null;
      const href = a && a.getAttribute("href");
      return href && SAFE_HREF.test(href) ? href : null;
    };
    rich.addEventListener("click", (e) => {
      const href = linkAt(e.target);
      const sel = window.getSelection();
      if (!href || e.button !== 0 || (sel && !sel.isCollapsed)) return; // dragging a selection over a link is editing
      e.preventDefault();
      this.openNoteLink(href);
    });
    rich.addEventListener("contextmenu", (e) => {
      const href = linkAt(e.target);
      if (!href) return;
      e.preventDefault();
      this.noteLinkMenu(href).showAtMouseEvent(e);
    });
    // From the keyboard: Ctrl/Cmd+Enter opens the link the cursor is in
    rich.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey) || e.isComposing) return;
      const sel = window.getSelection();
      const href = sel && sel.anchorNode ? linkAt(sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
      if (!href) return;
      e.preventDefault();
      this.openNoteLink(href);
    });
  }

  surfingOn() {
    return !!this.app.plugins?.plugins?.surfing;
  }

  async openInSurfing(url) {
    try {
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: "surfing-view", active: true, state: { url } });
      this.app.workspace.revealLeaf(leaf);
    } catch {
      this.openExternally(url);
    }
  }

  // The system's default browser (the "external" hint stops Surfing taking it over)
  openExternally(url) {
    window.open(url, "_blank", "external");
  }

  openNoteLink(url) {
    if (/^https?:/i.test(url) && this.surfingOn() && !Platform.isMobile) this.openInSurfing(url);
    else this.openExternally(url);
  }

  noteLinkMenu(url) {
    const menu = new Menu();
    const web = /^https?:/i.test(url);
    if (web && this.surfingOn() && !Platform.isMobile) menu.addItem((i) => i.setTitle(T("Open in Obsidian (Surfing)")).setIcon("globe").onClick(() => this.openInSurfing(url)));
    menu.addItem((i) => i.setTitle(T("Open in the default browser")).setIcon("external-link").onClick(() => this.openExternally(url)));
    menu.addSeparator();
    menu.addItem((i) =>
      i.setTitle(T("Copy link")).setIcon("copy").onClick(async () => {
        try {
          await navigator.clipboard.writeText(url);
          new Notice(T("Link copied."));
        } catch {
          new Notice(T("Could not copy the link."));
        }
      }),
    );
    return menu;
  }

  // Which line (counting like the markdown does) a point in the editor falls on, and how far
  // into that line's text it is. Works whatever structure the browser built while typing.
  noteLineAt(node, offset) {
    const rich = this.$("quick-note-rich");
    const r = document.createRange();
    r.setStart(rich, 0);
    r.setEnd(node, offset);
    const holder = document.createElement("div");
    holder.append(r.cloneContents());
    const lines = noteToMarkdown(holder).split("\n");
    // The text typed on this line so far, without its markers
    const plain = document.createElement("div");
    plain.append(r.cloneContents());
    const last = Array.from(plain.querySelectorAll("div, p, li, h1, h2, h3, h4, h5, h6")).pop() || plain;
    return { line: lines.length - 1, offset: last.textContent.length };
  }

  // The editor's lines as separate blocks (list items count individually), once it has been
  // redrawn from markdown
  noteLines() {
    const lines = [];
    for (const c of this.$("quick-note-rich").children) {
      if (c.tagName === "UL" || c.tagName === "OL") lines.push(...c.children);
      else lines.push(c);
    }
    return lines;
  }

  // Headings and lists change whole lines, which Chrome's own commands do unreliably (they merge
  // lines and drop the selection). Edit the markdown lines instead, redraw, and reselect them.
  formatNoteLines(action) {
    const rich = this.$("quick-note-rich");
    const sel = window.getSelection();
    let range = sel && sel.rangeCount && rich.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(rich);
      range.collapse(false);
    }
    // A Range is live and collapses when its nodes are replaced below, so read it first
    const wasCollapsed = range.collapsed;
    const startPoint = this.noteLineAt(range.startContainer, range.startOffset);
    let endPoint = wasCollapsed ? startPoint : this.noteLineAt(range.endContainer, range.endOffset);
    // A selection that ends at the very start of a line does not include that line
    if (endPoint.line > startPoint.line && endPoint.offset === 0) endPoint = { line: endPoint.line - 1, offset: Infinity };
    const md = this.getNoteMd();
    const lines = md.split("\n");
    const first = Math.min(startPoint.line, lines.length - 1);
    const last = Math.min(Math.max(endPoint.line, first), lines.length - 1);
    const from = lines.slice(0, first).join("\n").length + (first > 0 ? 1 : 0);
    const to = from + lines.slice(first, last + 1).join("\n").length;
    const edit = formatEdit(md, from, to, action);
    if (!edit) return;
    const next = md.slice(0, edit.from) + edit.insert + md.slice(edit.to);
    rich.replaceChildren(markdownToBlocks(next));
    rich.dispatchEvent(new Event("input", { bubbles: true }));

    // Put the cursor (or the selected lines) back
    const blocks = this.noteLines();
    const textEnd = (block) => {
      if (block.tagName === "HR") return [block.parentNode, Array.from(block.parentNode.childNodes).indexOf(block) + 1];
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let node = null;
      let t;
      while ((t = walker.nextNode())) node = t;
      return node ? [node, node.nodeValue.length] : [block, 0];
    };
    const textAt = (block, offset) => {
      if (block.tagName === "HR") return textEnd(block);
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let left = offset;
      let t;
      while ((t = walker.nextNode())) {
        if (left <= t.nodeValue.length) return [t, left];
        left -= t.nodeValue.length;
      }
      return textEnd(block);
    };
    const out = document.createRange();
    if (wasCollapsed) {
      const [n, o] = textAt(blocks[first], startPoint.offset);
      out.setStart(n, o);
      out.collapse(true);
    } else {
      if (blocks[first].tagName === "HR") out.setStartBefore(blocks[first]);
      else out.setStart(blocks[first], 0);
      const [n, o] = textEnd(blocks[last]);
      out.setEnd(n, o);
    }
    rich.focus();
    sel.removeAllRanges();
    sel.addRange(out);
    this.updateFormatState();
  }

  formatRich(action) {
    if (action === "link") return this.openLinkRow();
    if (action === "heading" || action === "bullet" || action === "numbered") return this.formatNoteLines(action);
    const rich = this.$("quick-note-rich");
    rich.focus();
    document.execCommand("styleWithCSS", false, false);
    document.execCommand({ bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough" }[action]);
    this.updateFormatState();
  }

  // Apply a toolbar action to the quick note, through the browser's own text insertion where
  // possible so undo (Cmd/Ctrl+Z) still steps back through it
  formatNote(action) {
    if (this.noteMode === "rich") return this.formatRich(action);
    const ta = this.$("quick-note");
    const r = formatEdit(ta.value, ta.selectionStart, ta.selectionEnd, action);
    if (!r || !r.insert) return;
    const expected = ta.value.slice(0, r.from) + r.insert + ta.value.slice(r.to);
    ta.focus();
    ta.setSelectionRange(r.from, r.to);
    let done = false;
    try {
      done = document.execCommand("insertText", false, r.insert);
    } catch {
      done = false;
    }
    if (!done || ta.value !== expected) {
      ta.value = expected;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
    ta.setSelectionRange(r.selStart, r.selEnd);
  }

  async loadNote() {
    // Never replace text the user is in the middle of editing
    if (this.noteDirty || this.noteComposing) return;
    const f = this.app.vault.getAbstractFileByPath(this.notePath);
    const text = f instanceof TFile ? await this.app.vault.read(f) : "";
    if (!this.noteDirty && !this.noteComposing && this.getNoteMd() !== text) this.setNoteMd(text);
    this.updateNoteMeta();
  }

  // ── The seven notes ──

  restoreNoteIndex() {
    let v = NaN;
    try {
      if (typeof this.app.loadLocalStorage === "function") v = Number(this.app.loadLocalStorage("genkan-note-index"));
    } catch {
      // fall through to the plugin data
    }
    if (!Number.isInteger(v)) v = Number(this.plugin.settings.cache?.noteIndex);
    return v >= 1 && v <= NOTE_COUNT ? v : 1;
  }

  // Remembered per device where Obsidian allows it, so your phone and laptop can each keep their place
  rememberNoteIndex() {
    try {
      if (typeof this.app.saveLocalStorage === "function") return this.app.saveLocalStorage("genkan-note-index", this.noteIndex);
    } catch {
      // fall through to the plugin data
    }
    const s = this.plugin.settings;
    s.cache = { ...(s.cache ?? {}), noteIndex: this.noteIndex };
    this.plugin.saveSettings().catch(() => {});
  }

  focusNote() {
    if (this.noteMode === "rich") {
      const rich = this.$("quick-note-rich");
      rich.focus();
      const r = document.createRange();
      r.selectNodeContents(rich);
      r.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      const ta = this.$("quick-note");
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }

  async switchNote(i, focus = false) {
    if (i < 1 || i > NOTE_COUNT) return;
    if (i === this.noteIndex) {
      if (focus) this.focusNote();
      return;
    }
    if (this.noteDirty && !this.noteComposing) await this.saveNote(); // keep what you typed in the note you are leaving
    this.noteIndex = i;
    this.rememberNoteIndex();
    this.noteDirty = false;
    this.setSaveState(true);
    this.root.querySelector(".note-link-row")?.classList.add("hidden");
    this.renderNoteTabs();
    await this.loadNote();
    if (focus) {
      this.focusNote();
      // Focus is already in the editor when the shortcut is used, so say which note it now holds
      this.announce(this.noteDotLabel(i, !!this.getNoteMd().trim()), "note-live");
    }
  }

  // The dot beside the title: green when saved, amber while there are unsaved changes. Its label
  // follows, so a screen reader hears the real state.
  setSaveState(saved) {
    const dot = this.$("autosave-dot");
    const label = saved ? T("Saved") : T("Unsaved changes");
    dot.className = saved ? "autosave-dot saved" : "autosave-dot unsaved";
    dot.title = label;
    dot.setAttribute("aria-label", label);
  }

  noteDotLabel(i, hasText) {
    return T(hasText ? "Note {n}, has text" : "Note {n}, empty", { n: i });
  }

  // The dots: the open note is filled and numbered, notes with text have a small centre dot
  renderNoteTabs() {
    const card = this.$("note-card");
    card.setAttribute("data-note", String(this.noteIndex));
    for (const dot of this.root.querySelectorAll(".note-dot")) {
      const i = Number(dot.dataset.note);
      const on = i === this.noteIndex;
      dot.setAttribute("aria-selected", String(on));
      dot.setAttribute("tabindex", on ? "0" : "-1");
      dot.classList.toggle("has-text", !!this.noteHasText[i - 1]);
      dot.setAttribute("aria-label", this.noteDotLabel(i, !!this.noteHasText[i - 1]));
    }
    // The panel and the editor are named for the open note
    this.$("note-panel").setAttribute("aria-labelledby", `note-tab-${this.noteIndex}`);
    const name = T("Quick note {n}", { n: this.noteIndex });
    this.$("quick-note-rich").setAttribute("aria-label", name);
    this.$("quick-note").setAttribute("aria-label", name);
  }

  async refreshNoteTexts() {
    for (let i = 1; i <= NOTE_COUNT; i++) {
      if (i === this.noteIndex) continue;
      const f = this.app.vault.getAbstractFileByPath(this.notePathFor(i));
      this.noteHasText[i - 1] = f instanceof TFile ? (await this.app.vault.cachedRead(f)).trim() !== "" : false;
    }
    this.renderNoteTabs();
  }

  // Footer: counts for the open note and when it was last saved
  updateNoteStats() {
    const md = this.getNoteMd();
    const { lines, words, chars } = noteStats(md);
    this.noteHasText[this.noteIndex - 1] = md.trim() !== "";
    this.$("note-stats").textContent = [plural(lines, "{n} line", "{n} lines"), plural(words, "{n} word", "{n} words"), plural(chars, "{n} character", "{n} characters")].join(" · ");
    const dot = this.root.querySelector(`.note-dot[data-note="${this.noteIndex}"]`);
    dot?.classList.toggle("has-text", this.noteHasText[this.noteIndex - 1]);
    dot?.setAttribute("aria-label", this.noteDotLabel(this.noteIndex, this.noteHasText[this.noteIndex - 1]));
  }

  updateNoteSaved() {
    const f = this.app.vault.getAbstractFileByPath(this.notePath);
    this.$("note-saved").textContent = f instanceof TFile ? savedAgo(f.stat.mtime) : "";
  }

  updateNoteMeta() {
    this.updateNoteStats();
    this.updateNoteSaved();
    this.refreshNoteTexts();
  }

  // ── Quick Links ──

  renderLinks() {
    const nav = this.$("quick-links");
    const links = this.settings.quickLinks ?? [];
    nav.empty();
    if (!links.length) {
      nav.createSpan({ cls: "hp-empty", text: T("No quick links configured.") });
      return;
    }
    links.forEach((l, i) =>
      nav.append(
        h(
          "a",
          { cls: "quick-link", href: "#", "data-ql": String(i) },
          h("span", { cls: "ql-icon", "aria-hidden": "true", text: l.icon ?? "" }),
          h("span", { text: quickLinkLabel(l) }),
        ),
      ),
    );
  }

  initLinks() {
    // One delegated handler covers quick links, clip cards, notes and search results
    this.root.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-fav-remove]");
      if (rm) {
        e.preventDefault();
        e.stopPropagation();
        this.plugin.removeFavourite(rm.dataset.favRemove);
        return;
      }
      if (e.target.closest("#fav-add")) {
        e.preventDefault();
        new FavouritePicker(this.app, this.plugin).open();
        return;
      }
      if (e.target.closest("[data-ring-all]")) {
        e.preventDefault();
        this.openRingFolder();
        return;
      }
      const ring = e.target.closest("[data-ring-line]");
      if (ring) {
        e.preventDefault();
        this.openRingNote(ring.dataset.ringPath, Number(ring.dataset.ringLine), e);
        return;
      }
      const fav = e.target.closest("[data-fav]");
      if (fav) {
        e.preventDefault();
        this.app.workspace.openLinkText(fav.dataset.fav, "", Keymap.isModEvent(e) || "tab");
        return;
      }
      const el = e.target.closest("[data-ql], [data-open]");
      if (!el) return;
      e.preventDefault();
      if (el.dataset.open != null) {
        this.openFile(el.dataset.open, e);
        return;
      }
      const link = this.settings.quickLinks?.[Number(el.dataset.ql)];
      if (link) this.runAction(link.action, e);
    });
  }

  async runAction(action, evt) {
    const a = (action || "").trim();
    if (a === "daily") return this.openDailyNote(new Date(), evt);
    if (a === "random") {
      const files = this.app.vault.getMarkdownFiles();
      if (!files.length) return;
      const f = files[Math.floor(Math.random() * files.length)];
      return this.openFile(f.path, evt);
    }
    if (a.startsWith("command:")) {
      const id = a.slice(8);
      if (!this.app.commands.executeCommandById(id)) new Notice(T("Command not found: {id}", { id }));
      return;
    }
    if (a.startsWith("open:")) return this.openFile(normalizePath(a.slice(5)), evt);
    if (/^(https?|obsidian):\/\//.test(a)) return window.open(a);
    new Notice(T("Unknown quick link action: {action}", { action: a }));
  }

  // ── Ring notes ──

  formatRingWhen(e) {
    const d = e.when;
    const now = new Date();
    const dayDiff = Math.round(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
        new Date(d.getFullYear(), d.getMonth(), d.getDate())) /
        86_400_000,
    );
    const day =
      dayDiff === 0
        ? T("Today")
        : dayDiff === 1
          ? T("Yesterday")
          : fmtDate(d, { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
    if (!e.hasTime) return day;
    const time = d.toLocaleTimeString(LOCALE, {
      hour: "numeric",
      minute: "2-digit",
      hour12: this.settings.clockFormat === "12h",
    });
    return `${day} · ${time}`;
  }

  async renderRingNotes() {
    const card = this.$("ring-card");
    const enabled = !!this.settings.showRingNotes;
    card.classList.toggle("hidden", !enabled);
    if (!enabled) return;

    const body = this.$("ring-body");
    const count = this.$("ring-count");
    const openLink = this.$("ring-open");
    const max = this.settings.maxRingNotes;
    let entries;
    let total;

    if (this.ringMode === "files") {
      // A separate file per note: newest first by timestamp, then read only the ones shown
      openLink.classList.add("hidden");
      const folder = this.ringFolder;
      if (!folder) {
        count.textContent = "0";
        this.showEmpty(body, T("Choose the folder your ring saves notes to in Genkan's settings."));
        return;
      }
      const stamped = this.app.vault
        .getMarkdownFiles()
        .filter((f) => f.path.startsWith(`${folder}/`) && !this.isDataFile(f))
        .map((f) => ({ f, ...ringFileTimestamp(f, this.app.metadataCache.getFileCache(f)?.frontmatter) }))
        .sort((a, b) => b.when - a.when);
      total = stamped.length;
      if (!total) {
        count.textContent = "0";
        this.showEmpty(body, T("No notes found in “{folder}”.", { folder }));
        return;
      }
      entries = await Promise.all(
        stamped.slice(0, max).map(async ({ f, when, hasTime }) => ({
          when,
          hasTime,
          path: f.path,
          line: 0,
          text: ringFileText(await this.readText(f)) || f.basename,
        })),
      );
    } else {
      // One note with timestamped entries appended under headings
      const path = this.ringPath;
      openLink.classList.remove("hidden");
      openLink.dataset.open = path;
      const f = this.app.vault.getAbstractFileByPath(path);
      if (!(f instanceof TFile)) {
        count.textContent = "0";
        this.showEmpty(body, T("No ring notes yet. Looking for “{path}”.", { path }));
        return;
      }
      const parsed = parseRingNotes(await this.app.vault.read(f));
      total = parsed.length;
      if (!total) {
        count.textContent = "0";
        this.showEmpty(body, T("No timestamped entries found in “{path}”.", { path }));
        return;
      }
      entries = parsed.slice(0, max).map((e) => ({ ...e, path }));
    }

    count.textContent = entries.length;
    body.empty();
    const list = body.createDiv({ cls: "ring-list" });
    for (const e of entries) {
      list.append(
        h(
          "a",
          { cls: "ring-item", href: "#", "data-ring-path": e.path, "data-ring-line": String(e.line) },
          h("span", { cls: "ring-when", text: this.formatRingWhen(e) }),
          h("span", { cls: "ring-text", text: e.text }),
        ),
      );
    }
    if (total > entries.length) {
      const more = h("a", { cls: "ring-more", href: "#", text: T("View all {n} notes", { n: fmtNum(total) }) });
      if (this.ringMode === "files") more.dataset.ringAll = "1";
      else more.dataset.open = this.ringPath;
      body.append(more);
    }
  }

  // Show the ring's notes folder in the file explorer, so the notes beyond the few listed are reachable
  async openRingFolder() {
    const folder = this.app.vault.getAbstractFileByPath(this.ringFolder);
    if (!folder) return;
    try {
      const ws = this.app.workspace;
      let leaf = ws.getLeavesOfType("file-explorer")[0];
      if (!leaf) {
        leaf = ws.getLeftLeaf(false);
        await leaf.setViewState({ type: "file-explorer" });
      }
      ws.revealLeaf(leaf);
      const view = leaf.view;
      if (typeof view?.revealInFolder !== "function") throw new Error("no file explorer");
      // Revealing a note inside the folder opens the folder; revealing the folder alone only
      // highlights it. Then make sure it is expanded.
      const inside = (folder.children || []).find((c) => c instanceof TFile);
      view.revealInFolder(inside || folder);
      view.fileItems?.[folder.path]?.setCollapsed?.(false);
    } catch {
      new Notice(T("Open the file explorer and look in “{folder}”.", { folder: this.ringFolder }));
    }
  }

  // Open the note (scrolled to the entry's heading when it's one of many in a note)
  openRingNote(path, line, evt) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) return;
    const mod = evt ? Keymap.isModEvent(evt) : false;
    this.app.workspace.getLeaf(mod || "tab").openFile(f, line ? { eState: { line } } : undefined);
  }

  // ── Favourites ──

  async renderFavourites() {
    const list = this.$("favs-list");
    const favs = await this.plugin.readFavourites();
    list.empty();
    for (const f of favs) {
      const file = this.app.metadataCache.getFirstLinkpathDest(f.target.split("#")[0], "");
      const label = f.alias || (file ? file.basename : f.target);
      list.append(
        h(
          "span",
          {
            cls: file ? "fav-chip" : "fav-chip missing",
            "data-fav": f.target,
          },
          h(
            "button",
            { type: "button", cls: "fav-open", title: file ? file.path : T("Not found — click to create") },
            h("span", { cls: "fav-star", "aria-hidden": "true", text: "★" }),
            h("span", { cls: "fav-name", text: label }),
          ),
          h("button", {
            type: "button",
            cls: "fav-x",
            "data-fav-remove": f.target,
            title: T("Remove from favourites"),
            "aria-label": T("Remove {label} from favourites", { label }),
            text: "×",
          }),
        ),
      );
    }
    list.append(h("button", { cls: "fav-add", id: "fav-add", title: T("Add a favourite"), text: T("+ Add") }));
    if (!favs.length) {
      list.append(
        h("span", {
          cls: "hp-empty fav-hint",
          text: T("Pin the notes you open most. You can also right-click any note → “Add to homepage favourites”."),
        }),
      );
    }
  }

  // ── Web Clips & Recent Notes ──

  // Cached read that treats an unreadable file as empty instead of failing the whole list
  async readText(file) {
    try {
      return await this.app.vault.cachedRead(file);
    } catch {
      return "";
    }
  }

  // Replace an area's contents with a dim one-line message
  showEmpty(el, text) {
    el.empty();
    el.createDiv({ cls: "hp-empty", text });
  }

  isDataFile(f) {
    const dir = (this.settings.dataFolder || "").replace(/^\/+|\/+$/g, "");
    return !!dir && f.path.startsWith(`${dir}/`);
  }

  renderClips() {
    const folder = (this.settings.clipsFolder || "").replace(/^\/+|\/+$/g, "");
    const body = this.$("clips-body");
    const clips = this.app.vault
      .getMarkdownFiles()
      .filter((f) => folder && f.path.startsWith(`${folder}/`))
      .map((f) => {
        const fm = this.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
        return {
          path: f.path,
          title: fmString(fm.title) || f.basename,
          source: fmString(fm.source || fm.url),
          date: fmString(fm.clipped || fm.created || fm.date),
          mtime: f.stat.mtime,
        };
      })
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() || a.mtime : a.mtime;
        const tb = b.date ? new Date(b.date).getTime() || b.mtime : b.mtime;
        return tb - ta;
      })
      .slice(0, this.settings.maxClips);

    this.$("clips-count").textContent = fmtNum(clips.length);
    if (!clips.length) {
      this.showEmpty(body, T("No clips found in “{folder}”.", { folder: folder || T("(no folder set)") }));
      return;
    }
    body.empty();
    const grid = body.createDiv({ cls: "clips-grid" });
    for (const c of clips) {
      const domain = c.source ? getDomain(c.source) : "";
      const header = h("div", { cls: "clip-header" });
      if (domain && this.settings.showFavicons) {
        const icon = h("img", {
          cls: "clip-favicon",
          src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`,
          alt: "",
        });
        icon.addEventListener("error", () => icon.addClass("hidden"));
        header.append(icon);
      }
      header.append(h("span", { cls: "clip-domain", text: domain }));
      grid.append(
        h(
          "a",
          { cls: "clip-card", href: "#", "data-open": c.path },
          header,
          h("div", { cls: "clip-title", text: c.title }),
          h("div", { cls: "clip-date", text: formatClipDate(c.date) }),
        ),
      );
    }
  }

  renderRecent() {
    const body = this.$("recent-body");
    const notes = this.app.vault
      .getMarkdownFiles()
      .filter((f) => !this.isDataFile(f))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, this.settings.maxRecent);

    this.$("recent-count").textContent = fmtNum(notes.length);
    if (!notes.length) {
      this.showEmpty(body, T("No notes found."));
      return;
    }
    body.empty();
    const list = body.createDiv({ cls: "notes-list" });
    for (const f of notes) {
      const date = dateFromFilename(f.basename) ?? fmtDate(new Date(f.stat.mtime));
      const folder = f.parent && f.parent.path !== "/" ? f.parent.path : "";
      const info = h(
        "div",
        { cls: "note-info" },
        h("div", { cls: "note-title-row" }, h("span", { cls: "note-title", text: f.basename }), h("span", { cls: "note-date", text: date })),
      );
      if (folder) info.append(h("span", { cls: "note-path", text: folder }));
      list.append(h("a", { cls: "note-item", href: "#", "data-open": f.path }, h("span", { cls: "note-icon", "aria-hidden": "true", text: "📄" }), info));
    }
  }

  // ── Search ──

  initSearch() {
    const input = this.$("search-input");
    const form = this.$("search-form");
    const results = this.$("search-results");

    // Hide the "/" hint while the box is focused or has text (CSS: .kbd-hidden)
    input.addEventListener("focus", () => form.addClass("kbd-hidden"));
    input.addEventListener("blur", () => {
      if (!input.value) form.removeClass("kbd-hidden");
    });
    const clear = this.$("search-clear");
    const syncClear = () => clear.classList.toggle("hidden", !input.value);
    // Bring the dropdown back when you return to a box that still has a query
    const reopen = () => {
      const q = input.value.trim();
      if (q && results.classList.contains("hidden")) this.runSearch(q);
    };
    input.addEventListener("focus", reopen);
    input.addEventListener("click", reopen);
    input.addEventListener("input", () => {
      syncClear();
      const q = input.value.trim();
      if (!q) return this.closeSearch();
      this.later("search", 300, () => this.runSearch(q));
    });
    clear.addEventListener("click", () => {
      input.value = "";
      syncClear();
      form.removeClass("kbd-hidden");
      this.closeSearch();
      input.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) this.runSearch(q);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeSearch();
        input.blur();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        results.querySelector(".search-result-item")?.focus();
      }
    });
    results.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeSearch();
        input.focus();
        return;
      }
      const items = [...results.querySelectorAll(".search-result-item")];
      const idx = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && idx < items.length - 1) {
        e.preventDefault();
        items[idx + 1].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idx > 0 ? items[idx - 1].focus() : input.focus();
      } else if (e.key === "Enter" && idx >= 0) {
        e.preventDefault();
        this.openFile(items[idx].dataset.open, e);
        this.closeSearch();
      }
    });
    this.root.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) this.closeSearch();
      else if (e.target.closest(".search-result-item")) this.closeSearch();
    });
  }

  closeSearch() {
    this.searchToken++;
    clearTimeout(this.timers.search);
    const results = this.$("search-results");
    results.classList.add("hidden");
    results.empty();
    this.$("search-live").textContent = "";
  }

  async runSearch(query) {
    const token = ++this.searchToken;
    const results = this.$("search-results");
    results.classList.remove("hidden");
    results.empty();
    results.createDiv({ cls: "search-status", text: T("↻ Searching…") });

    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((f) => !this.isDataFile(f))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, 4000);

    const hits = [];
    const LIMIT = 15;
    for (let i = 0; i < files.length && hits.length < LIMIT; i += 30) {
      const chunk = files.slice(i, i + 30);
      const texts = await Promise.all(chunk.map((f) => this.readText(f)));
      if (token !== this.searchToken) return; // superseded or closed
      chunk.forEach((f, j) => {
        if (hits.length >= LIMIT) return;
        const text = texts[j];
        const lower = text.toLowerCase();
        const hay = `${f.path.toLowerCase()}\n${lower}`;
        if (!words.every((w) => hay.includes(w))) return;
        const titleHit = words.every((w) => f.path.toLowerCase().includes(w));
        const at = lower.indexOf(words[0]);
        let snippet = null;
        if (at >= 0) {
          const s = Math.max(0, at - 40);
          const raw = text.slice(s, at + words[0].length + 80).replace(/\s+/g, " ");
          // Whitespace was just collapsed, so find the match again rather than
          // reusing its offset in the original text
          const rel = Math.max(0, raw.toLowerCase().indexOf(words[0]));
          snippet = {
            before: raw.slice(0, rel),
            match: raw.slice(rel, rel + words[0].length),
            after: raw.slice(rel + words[0].length),
          };
        }
        hits.push({ f, snippet, titleHit });
      });
      await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
    }
    if (token !== this.searchToken) return;

    if (!hits.length) {
      results.empty();
      results.createDiv({ cls: "search-status", text: T("No results for “{query}”", { query }) });
      this.$("search-live").textContent = T("No results for “{query}”", { query });
      return;
    }
    hits.sort((a, b) => Number(b.titleHit) - Number(a.titleHit));
    results.empty();
    for (const { f, snippet } of hits) {
      const folder = f.parent && f.parent.path !== "/" ? f.parent.path : "";
      const body = h("div", { cls: "search-result-body" }, h("div", { cls: "search-result-title", text: f.basename }));
      if (folder) body.append(h("div", { cls: "search-result-path", text: folder }));
      if (snippet) {
        body.append(
          h("div", { cls: "search-result-snippet" }, snippet.before, h("mark", { text: snippet.match }), snippet.after),
        );
      }
      results.append(
        h(
          "a",
          { cls: "search-result-item", href: "#", "data-open": f.path, tabindex: "0" },
          h("span", { cls: "search-result-icon", "aria-hidden": "true", text: "📄" }),
          body,
        ),
      );
    }
    this.$("search-live").textContent = plural(hits.length, "{n} result", "{n} results");
  }

  // ── Hero photo & quote ──

  // Today's photo and quote are cached in the plugin's data file, not browser storage
  cacheGet(key) {
    return this.plugin.settings.cache?.[key] ?? null;
  }
  cacheSet(key, value) {
    const s = this.plugin.settings;
    s.cache = { ...(s.cache ?? {}), [key]: value };
    this.plugin.saveSettings().catch(() => {});
  }

  async loadHero(forceNew) {
    if (!this.settings.showHero) return; // hidden: no photo, no network request
    const today = new Date().toISOString().slice(0, 10);
    if (!forceNew) {
      const cached = this.cacheGet("hero");
      if (cached?.date === today) return this.displayHero(cached);
    }
    const key = this.settings.unsplashKey;
    if (key) {
      try {
        const res = await requestUrl({
          url: `https://api.unsplash.com/photos/random?query=${HERO_TOPICS}&orientation=landscape&client_id=${encodeURIComponent(key)}`,
        });
        const data = res.json;
        const photo = {
          date: today,
          src: data.urls.regular,
          alt: data.alt_description || data.description || T("Nature photo"),
          photographer: data.user.name,
          photographerUrl: `${data.user.links.html}?utm_source=genkan&utm_medium=referral`,
          photoUrl: `${data.links.html}?utm_source=genkan&utm_medium=referral`,
        };
        this.cacheSet("hero", photo);
        return this.displayHero(photo);
      } catch {
        /* fall through to Picsum */
      }
    }
    const photo = {
      date: today,
      src: `https://picsum.photos/seed/${today}/1600/500`,
      alt: T("Landscape photo of the day"),
      photographer: null,
      photoUrl: "https://picsum.photos",
    };
    this.cacheSet("hero", photo);
    this.displayHero(photo);
  }

  // Over-the-photo header: dark text on a pale scrim when the photo is bright, white on a dark one otherwise
  applyHeroTone() {
    const over = !!this.settings.showHero && !!this.settings.heroOverlay;
    this.$("app").classList.toggle("hero-light", over && !!this.heroLight);
  }

  async measureHeroTone() {
    const img = this.$("hero-img");
    const src = img.currentSrc || img.src;
    if (!this.settings.showHero || !this.settings.heroOverlay || !src || !img.complete || !img.naturalWidth) return;
    if (this.heroToneSrc === src) return;
    this.heroToneSrc = src;
    this.heroLight = false;
    try {
      // A separate CORS request, so a host that refuses it cannot stop the visible photo from loading
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      await new Promise((ok, no) => {
        probe.onload = ok;
        probe.onerror = no;
        probe.src = src;
      });
      if (this.heroToneSrc !== src) return;
      const hero = this.$("hero");
      const boxW = hero.clientWidth || 1600;
      const boxH = hero.clientHeight || 500;
      // The part of the photo that shows: object-fit cover, object-position center 60%
      const scale = Math.max(boxW / probe.naturalWidth, boxH / probe.naturalHeight);
      const sw = boxW / scale;
      const sh = boxH / scale;
      const sx = (probe.naturalWidth - sw) / 2;
      const sy = (probe.naturalHeight - sh) * 0.6;
      const w = 48;
      const hgt = Math.max(1, Math.round((w * boxH) / boxW));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = hgt;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(probe, sx, sy, sw, sh, 0, 0, w, hgt);
      this.heroLight = heroPrefersDarkText(ctx.getImageData(0, 0, w, hgt).data);
    } catch {
      this.heroLight = false; // tainted canvas or a failed request: keep white text
    }
    this.applyHeroTone();
  }

  displayHero(photo) {
    const hero = this.$("hero");
    const img = this.$("hero-img");
    const credit = this.$("hero-credit");
    img.alt = photo.alt || T("Photo of the day");
    img.classList.remove("visible");
    this.heroToneSrc = null;
    this.heroLight = false;
    this.applyHeroTone();
    img.onload = () => {
      img.classList.add("visible");
      hero.classList.add("loaded");
      this.measureHeroTone();
    };
    img.onerror = () => {
      hero.classList.add("loaded");
      credit.textContent = "";
    };
    img.src = photo.src;
    credit.empty();
    if (photo.photographer) {
      appendTemplate(credit, T("Photo by {photographer} on {site}"), {
        photographer: h("a", { href: safeUrl(photo.photographerUrl), text: photo.photographer }),
        site: h("a", { href: safeUrl(photo.photoUrl), text: "Unsplash" }),
      });
    } else {
      appendTemplate(credit, T("Photo from {site}"), {
        site: h("a", { href: safeUrl(photo.photoUrl), text: "Picsum Photos" }),
      });
    }
  }

  fallbackQuote() {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86_400_000);
    const list = QUOTES_I18N[LANG] ?? QUOTES;
    return list[dayOfYear % list.length];
  }

  // ZenQuotes needs a credit; Echoes is credited too. Bundled quotes need none.
  displayQuote({ q, a, src }) {
    this.$("quote-text").textContent = q;
    this.$("quote-author").textContent = `— ${a}`;
    const credit = this.$("quote-credit");
    const site = { zenquotes: ["https://zenquotes.io/", "ZenQuotes API"], echoes: ["https://echoes.soferity.com/", "Echoes API"] }[src];
    credit.classList.toggle("hidden", !site);
    credit.empty();
    if (site) credit.append(T("Inspirational quotes provided by") + " ", h("a", { href: site[0], text: site[1] }));
  }

  // Existing English installs keep ZenQuotes; other languages start on the bundled list
  get quoteSource() {
    const v = this.settings.quoteSource;
    return ["zenquotes", "echoes", "bundled"].includes(v) ? v : LANG === "en" ? "zenquotes" : "bundled";
  }

  async fetchZenQuotes() {
    const res = await requestUrl({ url: "https://zenquotes.io/api/today" });
    const d = res.json?.[0];
    return d?.q ? { q: d.q, a: d.a, src: "zenquotes" } : null;
  }

  async fetchEchoes() {
    const res = await requestUrl({ url: `https://echoes.soferity.com/api/quotes/random?lang=${LANG}` });
    const raw = res.json?.data ?? res.json;
    const d = Array.isArray(raw) ? raw[0] : raw;
    const q = d?.quote ?? d?.content;
    return q && d.author ? { q: String(q), a: String(d.author), src: "echoes" } : null;
  }

  async loadQuote() {
    const bar = this.$("quote-bar");
    bar.classList.toggle("hidden", !this.settings.showQuote);
    if (!this.settings.showQuote) return; // no quote, no network request

    const source = this.quoteSource;
    if (source === "bundled") return this.displayQuote({ ...this.fallbackQuote(), src: "builtin" }); // no request

    const today = new Date().toISOString().slice(0, 10);
    const cached = this.cacheGet("quote");
    if (cached?.date === today && cached.source === source && cached.lang === LANG && cached.src) {
      return this.displayQuote(cached);
    }

    this.displayQuote({ ...this.fallbackQuote(), src: "builtin" });
    try {
      const fetched = source === "echoes" ? await this.fetchEchoes() : await this.fetchZenQuotes();
      if (fetched) {
        const quote = { date: today, source, lang: LANG, ...fetched };
        this.cacheSet("quote", quote);
        return this.displayQuote(quote);
      }
    } catch {
      /* use the built-in quote */
    }
    this.cacheSet("quote", { date: today, source, lang: LANG, ...this.fallbackQuote(), src: "builtin" });
  }

  // ── xkcd comic of the day ──

  // The comic is picked from the date alone, so every device shows the same one with nothing to sync
  xkcdPick(latest, day) {
    let x = Number(day.replace(/-/g, "")) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
    x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
    x = (x ^ (x >>> 15)) >>> 0;
    const n = (x % latest) + 1;
    return n === 404 ? 403 : n; // there is no comic 404 (that is the joke)
  }

  async fetchXkcdLatest() {
    const n = Number((await requestUrl({ url: "https://xkcd.com/info.0.json" })).json?.num);
    return n > 0 ? n : 0;
  }

  // One comic's details, or null when the response is not what we expect
  async fetchXkcdComic(n) {
    const d = (await requestUrl({ url: `https://xkcd.com/${n}/info.0.json` })).json;
    const img = String(d?.img ?? "");
    // The image must come from xkcd's own image server, whatever the response says
    if (Number(d?.num) !== n || !/^https:\/\/imgs\.xkcd\.com\/comics\/[\w%.\-]+$/.test(img)) return null;
    const tidy = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
    const transcript = tidy(String(d.transcript ?? "").replace(/\{\{[\s\S]*?\}\}/g, "").replace(/\[\[|\]\]/g, ""));
    return { num: n, title: tidy(d.safe_title || d.title), alt: tidy(d.alt), transcript: transcript.length <= 1000 ? transcript : "", img };
  }

  async fetchXkcd(day) {
    const latest = await this.fetchXkcdLatest();
    if (!latest) return null;
    const comic = await this.fetchXkcdComic(this.xkcdPick(latest, day));
    return comic && { ...comic, latest };
  }

  async renderXkcd() {
    const card = this.$("xkcd-card");
    card.classList.toggle("hidden", !this.settings.showXkcd);
    if (!this.settings.showXkcd) return; // off: no request, no image

    const day = isoDay(new Date());
    const cached = this.cacheGet("xkcd");
    if (cached?.img) {
      this.xkcdToday = cached; // yesterday's comic stays up until today's arrives
      // Leave a comic you have browsed to alone when the dashboard refreshes
      if (!this.xkcdAway && this.$("xkcd-body").dataset.num !== String(cached.num)) this.displayXkcd(cached);
    } else this.xkcdMessage(T("Loading the comic…"));
    if (cached?.date === day && cached.img) return;
    if (this.xkcdLoading) return;
    this.xkcdLoading = true;
    try {
      const comic = await this.fetchXkcd(day);
      if (comic) {
        const today = { date: day, ...comic };
        this.cacheSet("xkcd", today);
        this.xkcdToday = today;
        this.xkcdAway = false;
        return this.displayXkcd(today);
      }
    } catch {
      /* offline or xkcd is down */
    } finally {
      this.xkcdLoading = false;
    }
    if (!cached?.img) this.xkcdMessage(T("Couldn't load today's comic."), true);
  }

  xkcdMessage(text, retry) {
    const body = this.$("xkcd-body");
    delete body.dataset.num;
    this.$("xkcd-count").textContent = "";
    body.empty();
    body.append(h("p", { cls: "xkcd-msg", text }));
    if (retry) {
      const again = h("button", { type: "button", cls: "xkcd-btn", text: T("Try again") });
      again.addEventListener("click", () => this.renderXkcd());
      body.append(again);
    }
  }

  // Step to another comic: a number, "random", or "today"
  async browseXkcd(target) {
    const today = this.xkcdToday;
    if (!today || this.xkcdBusy) return;
    if (target === "today") {
      this.xkcdAway = false;
      return this.displayXkcd(today);
    }
    const body = this.$("xkcd-body");
    const shown = Number(body.dataset.num) || today.num;
    this.xkcdBusy = true;
    body.setAttribute("aria-busy", "true");
    try {
      const latest = today.latest || (await this.fetchXkcdLatest()) || today.num;
      let n = target === "random" ? 1 + Math.floor(Math.random() * latest) : target;
      if (n === 404) n += n > shown ? 1 : -1; // there is no comic 404
      n = Math.max(1, Math.min(latest, n));
      this.xkcdSeen ??= new Map();
      let comic = this.xkcdSeen.get(n);
      if (!comic) {
        comic = await this.fetchXkcdComic(n);
        if (!comic) throw new Error("bad comic");
        this.xkcdSeen.set(n, { ...comic, latest });
      }
      this.xkcdAway = n !== today.num;
      this.displayXkcd({ latest, ...comic });
      this.$("xkcd-live").textContent = T("xkcd {num}: {title}", { num: comic.num, title: comic.title });
    } catch {
      this.displayXkcd(this.xkcdSeen?.get(shown) ?? today, T("Couldn't load that comic."));
    } finally {
      this.xkcdBusy = false;
      body.removeAttribute("aria-busy");
    }
  }

  displayXkcd(c, note) {
    const body = this.$("xkcd-body");
    this.$("xkcd-count").textContent = `#${c.num}`;
    body.dataset.num = String(c.num);
    const latest = c.latest || this.xkcdToday?.latest || c.num;
    const link = (href, text) => h("a", { href, text });
    const nav = (key, label, content, go, disabled, cls) => {
      const b = h("button", { type: "button", cls, "data-nav": key, title: label, "aria-label": label, ...(disabled ? { disabled: "" } : {}) }, content);
      b.addEventListener("click", () => {
        this.xkcdFocus = key;
        go();
      });
      return b;
    };
    // With a transcript the image is described by it; otherwise by the hover text, which is also
    // shown as a caption so touch and keyboard users can read it (hidden from screen readers then)
    const img = h("img", { cls: "xkcd-img", src: c.img, alt: c.transcript || c.alt || c.title, title: c.alt, referrerpolicy: "no-referrer" });
    body.empty();
    body.append(
      ...[
      h(
        "div",
        { cls: "xkcd-head" },
        h("h3", { cls: "xkcd-name" }, link(`https://xkcd.com/${c.num}/`, c.title)),
        h(
          "div",
          { cls: "xkcd-nav" },
          nav("prev", T("Previous comic"), iconNode("arrow-left"), () => this.browseXkcd(c.num - 1), c.num <= 1, "icon-btn sm"),
          nav("next", T("Next comic"), iconNode("arrow-right"), () => this.browseXkcd(c.num + 1), c.num >= latest, "icon-btn sm"),
          nav("random", T("Random comic"), T("Random"), () => this.browseXkcd("random"), false, "xkcd-btn"),
          this.xkcdAway ? nav("today", T("Back to today's comic"), T("Today"), () => this.browseXkcd("today"), false, "xkcd-btn") : null,
        ),
      ),
      note ? h("p", { cls: "xkcd-msg", role: "status", text: note }) : null,
      h("div", { cls: "xkcd-panel" }, img),
      c.alt ? h("p", c.transcript ? { cls: "xkcd-alt", text: c.alt } : { cls: "xkcd-alt", text: c.alt, "aria-hidden": "true" }) : null,
      h(
        "p",
        { cls: "xkcd-credit" },
        T("By Randall Munroe") + " · ",
        link("https://creativecommons.org/licenses/by-nc/2.5/", "CC BY-NC 2.5"),
        " · ",
        link(`https://www.explainxkcd.com/wiki/index.php/${c.num}`, T("Explain this comic")),
      ),
    ].filter(Boolean));
    const want = this.xkcdFocus === "today" ? "random" : this.xkcdFocus; // Today's button is gone by now
    this.xkcdFocus = null;
    if (want) (body.querySelector(`[data-nav="${want}"]:not(:disabled)`) ?? body.querySelector("[data-nav]:not(:disabled)"))?.focus();
  }
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

// The built-in links are stored in English; show them in the current language
function quickLinkLabel(l) {
  const builtin = DEFAULT_QUICK_LINKS.find((d) => d.action === l.action && d.label === l.label);
  return builtin ? T(builtin.label) : l.label;
}

const quickLinksToText = (links) =>
  (links ?? []).map((l) => `${l.icon ?? ""} | ${quickLinkLabel(l)} | ${l.action}`).join("\n");

function textToQuickLinks(text) {
  return text
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter((p) => p.length >= 3 && p[1] && p[2])
    .map(([icon, label, ...rest]) => ({ icon, label, action: rest.join("|") }));
}

class HomepageSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();

    // Obsidian 1.11+ draws each SettingGroup as one card; older versions get a flat list
    const Group = obsidian.SettingGroup;
    let group = null;
    const startGroup = (heading) => {
      group = null;
      if (Group) {
        group = new Group(containerEl);
        if (heading) group.setHeading(heading);
      } else if (heading) {
        new Setting(containerEl).setName(heading).setHeading();
      }
    };
    const add = () => {
      if (!group) return new Setting(containerEl);
      let created;
      group.addSetting((st) => {
        created = st;
      });
      return created;
    };
    startGroup();

    const save = async (key, value) => {
      s[key] = value;
      await this.plugin.saveSettings();
      this.plugin.refreshViews();
    };
    const text = (name, desc, key, opts = {}) =>
      add()
        .setName(name)
        .setDesc(desc)
        .addText((t) => {
          t.setPlaceholder(opts.placeholder ?? "")
            .setValue(String(s[key] ?? ""))
            .onChange((v) => save(key, opts.number ? Math.max(1, Number(v) || 1) : v.trim()));
          if (opts.password) t.inputEl.type = "password";
          if (opts.suggest && PathSuggest) new PathSuggest(this.app, t.inputEl, opts.suggest);
        });

    text(T("Your name"), T("Shown in the greeting."), "userName", { placeholder: T("e.g. Alex") });

    add()
      .setName(T("Open on startup"))
      .setDesc(T("Open the homepage when Obsidian starts."))
      .addToggle((t) => t.setValue(s.openOnStartup).onChange((v) => save("openOnStartup", v)));

    add()
      .setName(T("Appearance"))
      .setDesc(T("System follows Obsidian's light/dark theme."))
      .addDropdown((d) =>
        d
          .addOptions({ system: T("System"), dark: T("Dark"), light: T("Light") })
          .setValue(s.theme)
          .onChange((v) => save("theme", v)),
      );

    add()
      .setName(T("Clock format"))
      .addDropdown((d) =>
        d
          .addOptions({ "12h": T("12-hour (AM/PM)"), "24h": T("24-hour") })
          .setValue(s.clockFormat)
          .onChange((v) => save("clockFormat", v)),
      );

    add()
      .setName(T("Language"))
      .setDesc(T("Automatic follows Obsidian's language setting."))
      .addDropdown((d) =>
        d
          .addOptions({ auto: T("Automatic"), ...LANGUAGES })
          .setValue(s.language)
          .onChange(async (v) => {
            s.language = v;
            applyLanguage(v);
            await this.plugin.saveSettings();
            this.display();
            try {
              this.plugin.rebuildViews();
            } catch (err) {
              console.error("Genkan: could not rebuild the dashboard", err);
            }
          }),
      );

    add()
      .setName(T("Spelling"))
      .setDesc(T("Automatic follows your device's region. Command names change after you restart Obsidian."))
      .addDropdown((d) =>
        d
          .addOptions({ auto: T("Automatic"), us: T("American (favorite)"), uk: T("British (favourite)") })
          .setValue(s.spelling)
          .onChange((v) => {
            spellingChoice = v;
            save("spelling", v);
          }),
      );

    add()
      .setName(T("First day of the week"))
      .setDesc(T("Automatic follows your device's region."))
      .addDropdown((d) =>
        d
          .addOptions({ auto: T("Automatic"), "0": T("Sunday"), "1": T("Monday"), "6": T("Saturday") })
          .setValue(String(s.weekStart))
          .onChange((v) => save("weekStart", v)),
      );

    const customFont = text(
      T("Custom clock font"), T("The name of a font installed on this device, such as Courier New or Avenir Next. A device without it uses the dashboard font."),
      "clockFontCustom",
      { placeholder: T("Font name") },
    );
    // The custom-font row is last in its card, so take it out of the page when unused
    // (a merely hidden last row would leave the card without its bottom edge)
    const showCustomFont = () => {
      if (s.clockFont === "custom") fontSetting.settingEl.after(customFont.settingEl);
      else customFont.settingEl.remove();
    };
    const fontSetting = add()
      .setName(T("Clock font"))
      .setDesc(T("Uses fonts already on your device. Your Obsidian theme's fonts are available too."))
      .addDropdown((d) =>
        d
          .addOptions(Object.fromEntries(Object.entries(CLOCK_FONTS).map(([k, v]) => [k, T(v)])))
          .setValue(Object.keys(CLOCK_FONTS).includes(s.clockFont) ? s.clockFont : "default")
          .onChange(async (v) => {
            s.clockFont = v;
            await save("clockFont", v);
            showCustomFont();
          }),
      );
    showCustomFont();

    startGroup(T("Folders"));
    text(T("Web Clipper folder"), T("Where the Web Clipper saves notes."), "clipsFolder", {
      placeholder: "Clippings",
    });
    text(
      T("Daily notes folder"), T("Leave blank to use your Daily Notes / Periodic Notes settings."),
      "dailyNotesFolder",
    );
    text(
      T("Data folder"), T("Tasks.md and Quick Note.md are stored here, so Obsidian Sync shares them across devices."),
      "dataFolder",
      { placeholder: "genkan/data" },
    );

    startGroup(T("Content"));
    text(T("Max web clips"), "", "maxClips", { number: true });
    text(T("Max recent notes"), "", "maxRecent", { number: true });

    add()
      .setName(T("On this day"))
      .setDesc(T("Shows notes from this date a week, a month and a year ago, found from their created date. Nothing leaves your device."))
      .addToggle((t) => t.setValue(s.showOnThisDay).onChange((v) => save("showOnThisDay", v)));

    add()
      .setName(T("Time tracker"))
      .setDesc(T("Track time on projects and tasks with timers, set time allocations, see a weekly summary and export reports as CSV, Excel or PDF. Stored in its own note, Time Tracking.md, in the Genkan data folder."))
      .addToggle((t) => t.setValue(s.showTimeTracker).onChange((v) => save("showTimeTracker", v)));

    add()
      .setName(T("Running timer display"))
      .setDesc(T("Show the running timer where you can always see it: in Obsidian's status bar on desktop, or at the top of the dashboard on phones and tablets. Click it to open the task. Needs the Time tracker."))
      .addToggle((t) => t.setValue(s.showTimerStatus).onChange((v) => save("showTimerStatus", v)));

    add()
      .setName(T("xkcd comic of the day"))
      .setDesc(T("Shows one xkcd comic a day, the same one on all your devices, with buttons to browse others. Today's comic loads from xkcd.com once a day and its image whenever the dashboard opens; browsing loads more. Off means nothing is requested."))
      .addToggle((t) => t.setValue(s.showXkcd).onChange((v) => save("showXkcd", v)));

    add()
      .setName(T("Vault stats"))
      .setDesc(T("A summary of your vault: a 12-week heatmap of the days you wrote, your streak, counts of notes, orphan notes, unresolved links and open tasks, and your top tags. Worked out on your device from file dates and links; nothing is sent anywhere."))
      .addToggle((t) => t.setValue(s.showVaultStats).onChange((v) => save("showVaultStats", v)));

    add()
      .setName(T("Pebble ring notes"))
      .setDesc(T("Show the latest voice notes from your Pebble Index ring."))
      .addToggle((t) => t.setValue(s.showRingNotes).onChange((v) => save("showRingNotes", v)));

    // These mirror the three Obsidian choices in the Pebble app
    const noteSetting = text(
      T("Ring note"), T("The note the ring adds your voice notes to, with entries under headings like “## 2026-10-05 21:55”."),
      "ringNotesFile",
      { placeholder: "Pebble Index.md", suggest: "file" },
    );
    const folderSetting = text(
      T("Ring notes folder"), T("The folder the ring saves each voice note into, one file per note."),
      "ringNotesFolder",
      { placeholder: "Pebble Index", suggest: "folder" },
    );
    const showRingFields = () => {
      noteSetting.settingEl.toggleClass("genkan-hidden", s.ringMode !== "chosen");
      folderSetting.settingEl.toggleClass("genkan-hidden", s.ringMode !== "files");
    };
    const modeSetting = add()
      .setName(T("Where does the ring save notes?"))
      .setDesc(T("Match the Obsidian setting in the Pebble app."))
      .addDropdown((d) =>
        d
          .addOptions({
            main: T("One main note (Pebble Index.md)"),
            chosen: T("An existing note I choose"),
            files: T("A separate file for each note"),
          })
          .setValue(["chosen", "files"].includes(s.ringMode) ? s.ringMode : "main")
          .onChange(async (v) => {
            s.ringMode = v;
            await save("ringMode", v);
            showRingFields();
          }),
      );
    // Keep the mode picker above the field it controls
    noteSetting.settingEl.before(modeSetting.settingEl);
    showRingFields();
    text(T("Max ring notes"), "", "maxRingNotes", { number: true });

    add()
      .setName(T("Photo of the day"))
      .setDesc(T("Shows a landscape photo from Picsum, or from Unsplash if you add a key below. Off means no photo is requested."))
      .addToggle((t) => t.setValue(s.showHero).onChange((v) => save("showHero", v)));
    add()
      .setName(T("Clock and search over the photo"))
      .setDesc(T("Lays the greeting, clock, date and search box over the photo of the day instead of above it, which saves vertical space. The photo is darkened a little so the text stays readable, so very bright photos look duller. Needs the photo of the day."))
      .addToggle((t) => t.setValue(s.heroOverlay).onChange((v) => save("heroOverlay", v)));
    text(
      T("Unsplash access key"), T("Optional. Enables nature photos from Unsplash with attribution. The key is stored in this plugin's settings file in your vault."),
      "unsplashKey",
      { password: true },
    );
    add()
      .setName(T("Daily quote"))
      .setDesc(T("Shows a quote each day. Off means no quote is shown and none is requested."))
      .addToggle((t) => t.setValue(s.showQuote).onChange((v) => save("showQuote", v)));
    add()
      .setName(T("Quote source"))
      .setDesc(T("ZenQuotes and Echoes are fetched once a day over the network, and ZenQuotes is English only. The bundled list works offline."))
      .addDropdown((d) =>
        d
          .addOptions({
            zenquotes: T("ZenQuotes (English)"),
            echoes: T("Echoes (your language)"),
            bundled: T("Bundled list (your language)"),
          })
          .setValue(["zenquotes", "echoes", "bundled"].includes(s.quoteSource) ? s.quoteSource : LANG === "en" ? "zenquotes" : "bundled")
          .onChange((v) => save("quoteSource", v)),
      );
    add()
      .setName(T("Site icons on web clips"))
      .setDesc(T("Uses Google's favicon service, which receives the domain of each clipped page. Off means no icon requests."))
      .addToggle((t) => t.setValue(s.showFavicons).onChange((v) => save("showFavicons", v)));

    add()
      .setName(T("Quick links"))
      .setDesc(T("One per line: icon | label | action. Actions: command:<command id>, open:<note path>, daily, random, or an https:// URL."))
      .addTextArea((t) => {
        t.setValue(quickLinksToText(s.quickLinks)).onChange((v) =>
          save("quickLinks", textToQuickLinks(v)),
        );
        t.inputEl.rows = 7;
        t.inputEl.addClass("genkan-wide-input");
      });
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

module.exports = class HomepagePlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.time = new TimeStore(this);
    // The time data is read once the vault is ready; a minute's beat catches a computer that slept
    this.app.workspace.onLayoutReady(() => this.time.load());
    this.registerInterval(window.setInterval(() => this.time.beat(), 60 * 1000));
    const onTime = (f) => {
      if (f.path !== this.time.path) return;
      clearTimeout(this.timeLoadTimer);
      this.timeLoadTimer = setTimeout(() => this.time.load(), 300); // another device saved it
    };
    this.registerEvent(this.app.vault.on("modify", onTime));
    this.registerEvent(this.app.vault.on("create", onTime));
    this.registerView(VIEW_TYPE, (leaf) => new HomepageView(leaf, this));
    this.addRibbonIcon("home", T("Open homepage"), () => this.activateView());
    this.addCommand({
      id: "open-homepage",
      name: T("Open homepage"),
      callback: () => this.activateView(),
    });
    this.addSettingTab(new HomepageSettingTab(this.app, this));
    this.initTimerStatus();

    this.favPaths = new Set();
    const onVault = (f) => {
      if (f.path === this.favPath) this.scheduleFavCache();
    };
    this.registerEvent(this.app.vault.on("modify", onVault));
    this.registerEvent(this.app.vault.on("create", onVault));
    this.registerEvent(this.app.vault.on("delete", onVault));
    this.registerEvent(this.app.vault.on("rename", onVault));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.scheduleFavCache()));
    this.app.workspace.onLayoutReady(() => this.refreshFavCache());

    this.addCommand({
      id: "toggle-favourite",
      name: T("Add or remove current note from homepage favourites"),
      checkCallback: (checking) => {
        const f = this.app.workspace.getActiveFile();
        if (!f || f.extension !== "md" || this.isDataFile(f)) return false;
        if (!checking) this.toggleFavourite(f);
        return true;
      },
    });
    this.addCommand({
      id: "add-favourite",
      name: T("Add a note to homepage favourites…"),
      callback: () => new FavouritePicker(this.app, this).open(),
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => this.addFavouriteMenuItem(menu, file)),
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) =>
        this.addFavouriteMenuItem(menu, view?.file),
      ),
    );

    this.stars = new Map();
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => this.decorateLeaf(leaf)));
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.app.workspace.iterateAllLeaves((l) => this.decorateLeaf(l));
        this.updateStars();
      }),
    );
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.iterateAllLeaves((l) => this.decorateLeaf(l));
    });

    this.app.workspace.onLayoutReady(() => {
      if (
        this.settings.openOnStartup &&
        !this.app.workspace.getLeavesOfType(VIEW_TYPE).length
      ) {
        this.activateView();
      }
    });
  }

  // Add/remove entry for Obsidian's own menus (tab, ⋮ menu, editor right-click)
  addFavouriteMenuItem(menu, file) {
    if (!(file instanceof TFile) || file.extension !== "md" || this.isDataFile(file)) return;
    // The menu is built synchronously, so read the cached set
    const fav = this.favPaths.has(file.path);
    menu.addItem((item) =>
      item
        .setTitle(fav ? T("Remove from homepage favourites") : T("Add to homepage favourites"))
        .setIcon("star")
        .onClick(() => this.toggleFavourite(file)),
    );
  }

  // A ★ button in each note's header: toggles the favourite, lit when it is one
  decorateLeaf(leaf) {
    const view = leaf?.view;
    if (!(view instanceof MarkdownView) || this.stars.has(view)) return;
    const el = view.addAction("star", T("Add or remove from homepage favourites"), () => {
      if (view.file && !this.isDataFile(view.file)) this.toggleFavourite(view.file);
    });
    el.addClass("hp-fav-star");
    this.stars.set(view, el);
    this.updateStars();
  }

  updateStars() {
    for (const [view, el] of this.stars ?? []) {
      if (!view.containerEl?.isConnected) {
        el.remove();
        this.stars.delete(view);
        continue;
      }
      const f = view.file;
      const on = !!f && this.favPaths.has(f.path);
      el.toggleClass("is-active", on);
      el.setAttribute("aria-label", on ? T("Remove from homepage favourites") : T("Add to homepage favourites"));
    }
  }

  onunload() {
    this.time?.flush();
    for (const el of this.stars?.values() ?? []) el.remove();
    this.stars?.clear();
    clearTimeout(this.favCacheTimer);
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    spellingChoice = this.settings.spelling;
    applyLanguage(this.settings.language);
    // New installs follow the region's 12/24-hour preference
    if (!saved?.clockFormat) this.settings.clockFormat = locale12h() ? "12h" : "24h";
    // Before ring modes existed, a custom note path meant "a note I choose"
    if (!saved?.ringMode) {
      const custom = saved?.ringNotesFile && saved.ringNotesFile !== RING_MAIN_NOTE;
      this.settings.ringMode = custom ? "chosen" : "main";
    }
  }

  // ── Favourites (stored in <dataFolder>/Favourites.md) ──

  get favPath() {
    return joinPath(this.settings.dataFolder, "Favourites.md");
  }

  isDataFile(f) {
    const dir = (this.settings.dataFolder || "").replace(/^\/+|\/+$/g, "");
    return !!dir && f.path.startsWith(`${dir}/`);
  }

  async readFavourites() {
    const f = this.app.vault.getAbstractFileByPath(this.favPath);
    if (!(f instanceof TFile)) return [];
    return parseFavourites(await this.app.vault.read(f));
  }

  favouriteFile(fav) {
    return this.app.metadataCache.getFirstLinkpathDest(fav.target.split("#")[0], "");
  }

  // Cached set of favourite file paths, for the synchronous right-click menu
  async refreshFavCache() {
    const favs = await this.readFavourites();
    this.favPaths = new Set(favs.map((f) => this.favouriteFile(f)?.path).filter(Boolean));
    this.updateStars();
  }

  scheduleFavCache() {
    clearTimeout(this.favCacheTimer);
    this.favCacheTimer = setTimeout(() => this.refreshFavCache(), 300);
  }

  async isFavourite(file) {
    return (await this.readFavourites()).some((f) => this.favouriteFile(f)?.path === file.path);
  }

  async addFavourite(file) {
    try {
      if (await this.isFavourite(file)) {
        new Notice(T("{name} is already a favourite", { name: file.basename }));
        return;
      }
      const link = this.app.metadataCache.fileToLinktext(file, "", true);
      const f = await ensureFileIn(this.app, this.favPath);
      await this.app.vault.process(f, (t) => `${t}${t && !t.endsWith("\n") ? "\n" : ""}- [[${link}]]\n`);
      new Notice(T("Added {name} to favourites", { name: file.basename }));
    } catch (err) {
      new Notice(T("Could not add favourite: {error}", { error: err.message }));
    }
  }

  async removeFavourite(target) {
    const f = this.app.vault.getAbstractFileByPath(this.favPath);
    if (!(f instanceof TFile)) return;
    let removed = false;
    await this.app.vault.process(f, (text) =>
      text
        .split("\n")
        .filter((line) => {
          const m = !removed && line.match(FAV_RE);
          if (m && m[1].trim() === target) {
            removed = true;
            return false;
          }
          return true;
        })
        .join("\n"),
    );
  }

  async toggleFavourite(file) {
    if (!(await this.isFavourite(file))) return this.addFavourite(file);
    const fav = (await this.readFavourites()).find((x) => this.favouriteFile(x)?.path === file.path);
    await this.removeFavourite(fav.target);
    new Notice(T("Removed {name} from favourites", { name: file.basename }));
  }

  async saveSettings() {
    // Another device may have pushed a newer shared layout since this one loaded its settings;
    // keep it rather than writing over it
    try {
      const disk = await this.loadData();
      this.adoptSharedLayout(disk && disk.sharedLayout);
    } catch {
      // the file can't be read: save as we are
    }
    await this.saveData(this.settings);
  }

  // Take a shared layout if it is newer than the one held; true when it was
  adoptSharedLayout(incoming) {
    if (!incoming || typeof incoming.version !== "number" || !incoming.layout || typeof incoming.layout !== "object") return false;
    const cur = this.settings.sharedLayout;
    if (cur && incoming.version <= cur.version) return false;
    this.settings.sharedLayout = { layout: normaliseLayout(incoming.layout), version: incoming.version };
    return true;
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  // Labels are built once per view, so a language change rebuilds each open dashboard
  rebuildViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view.rebuild?.();
  }

  // ── The running timer in the status bar ──

  initTimerStatus() {
    this.addCommand({ id: "toggle-timer", name: T("Pause or resume the time tracker timer"), callback: () => this.toggleTimer() });
    this.addCommand({ id: "stop-timer", name: T("Stop the time tracker timer"), callback: () => this.stopTimer() });
    // Phones and tablets have no status bar
    if (Platform.isMobile) return;
    const el = this.addStatusBarItem();
    el.addClass("genkan-status-timer");
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    this.statusDot = el.createSpan({ cls: "genkan-status-dot", attr: { "aria-hidden": "true" } });
    this.statusName = el.createSpan({ cls: "genkan-status-name" });
    this.statusTime = el.createSpan({ cls: "genkan-status-time", attr: { "aria-hidden": "true" } });
    el.addEventListener("click", () => this.openRunningTask());
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.openRunningTask();
      }
    });
    this.statusEl = el;
    this.time.subscribe(() => this.updateTimerStatus());
    this.registerInterval(window.setInterval(() => this.updateTimerStatus(), 1000));
    this.updateTimerStatus();
  }

  updateTimerStatus() {
    const el = this.statusEl;
    if (!el) return;
    const task = this.settings.showTimeTracker && this.settings.showTimerStatus ? this.time.runningTask() : null;
    el.style.display = task ? "" : "none";
    if (!task) return;
    if (this.statusTask !== task.name) {
      this.statusTask = task.name;
      this.statusName.textContent = task.name;
      const label = T("Timer running: {task}. Open it in the time tracker.", { task: task.name });
      el.setAttribute("aria-label", label);
      el.setAttribute("title", label);
    }
    this.statusTime.textContent = ttClock(this.time.taskSecs(task.id));
  }

  async openRunningTask() {
    const task = this.time.runningTask();
    await this.activateView();
    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view;
    if (!view) return;
    if (task) view.tt?.go({ name: "task", pid: task.pid, tid: task.id });
    view.$("tt-card")?.scrollIntoView?.({ block: "nearest" });
  }

  // For a hotkey: pause what is running, or resume what was paused last
  toggleTimer() {
    const st = this.time;
    const run = st.runningTask();
    if (run) {
      const secs = st.taskSecs(run.id);
      st.pause(run.id, null);
      new Notice(T("Paused {task} at {time}", { task: run.name, time: ttClock(secs) }));
      return;
    }
    const back = st.lastPaused();
    if (!back) {
      new Notice(T("No timer to resume. Start one from the Time tracker card."));
      return;
    }
    st.start(back.id, null);
    new Notice(T("Started the timer for {task}", { task: back.name }));
  }

  stopTimer() {
    const st = this.time;
    const run = st.runningTask() || st.lastPaused();
    if (!run) {
      new Notice(T("No timer is running."));
      return;
    }
    const secs = st.taskSecs(run.id);
    st.stop(run.id, null);
    new Notice(T("Stopped {task} at {time}", { task: run.name, time: ttClock(secs) }));
  }

  refreshViews() {
    this.updateTimerStatus();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.refreshAll?.(false);
    }
  }
};
