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
} = obsidian;

const VIEW_TYPE = "genkan-view";
const RING_MAIN_NOTE = "Pebble Index.md"; // the ring app's "one main note" target

// Icons for the dashboard (fixed SVG source, parsed once at runtime).
const ICONS = {
  list: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  "list-ordered": `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  link: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  clear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
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
    "Quick note": "Note rapide",
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
    "Quick note": "Nota rápida",
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
    "Quick note": "Schnellnotiz",
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
    "Quick note": "クイックメモ",
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
  return us ? text.replace(/favourite/g, "favorite").replace(/Favourite/g, "Favorite") : text;
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
  showQuote: true, // a daily quote
  quoteSource: undefined, // zenquotes | echoes | bundled (unset: ZenQuotes in English, else bundled)
  showFavicons: true, // site icons on web clips (Google's favicon service)
  showRingNotes: false, // Pebble Index ring notes card (off unless enabled)
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
  let on = lines.map((l) => l.trim() !== "");
  if (!on.some(Boolean)) on = lines.map((_, i) => i === 0); // a blank line still gets its marker
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
    let m = /^(#{1,6}) (.*)$/.exec(raw);
    if (m) {
      list = null;
      frag.append(line(`h${m[1].length}`, m[2]));
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

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE"]);

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
  // A trailing <br> is the browser's placeholder for an empty line, not a line break
  const textOf = (nodes) => {
    const list = Array.from(nodes);
    const t = inlineToMarkdown(list);
    const last = list[list.length - 1];
    return last && last.nodeName === "BR" && t.endsWith("\n") ? t.slice(0, -1) : t;
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
    if (/^H[1-6]$/.test(tag)) {
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
  const countRow = (countId, ...extra) =>
    h("div", { cls: "card-header-right" }, h("span", { cls: "badge", id: countId, text: "0" }), ...extra);

  const header = h(
    "header",
    { cls: "header" },
    h(
      "div",
      { cls: "header-top" },
      h("p", { cls: "greeting", id: "greeting", text: "Hello" }),
      h(
        "div",
        { cls: "header-controls" },
        h("button", { cls: "icon-btn", id: "page-refresh", title: T("Refresh"), "aria-label": T("Refresh") }),
        h("button", { cls: "icon-btn", id: "theme-toggle", title: T("Toggle theme"), "aria-label": T("Toggle theme") }),
        h("button", { cls: "icon-btn", id: "settings-btn", title: T("Settings"), "aria-label": T("Open settings") }),
      ),
    ),
    h(
      "div",
      { cls: "clock-wrap" },
      h(
        "div",
        { cls: "clock", id: "clock" },
        h("span", { id: "clock-main", text: "12:00" }),
        h("span", { id: "clock-sec", text: ":00" }),
        " ",
        h("span", { id: "clock-ampm", text: "AM" }),
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
        h("kbd", { cls: "search-kbd", id: "search-kbd", text: "/" }),
      ),
      h("div", { cls: "search-results hidden", id: "search-results", role: "listbox", "aria-label": T("Search results") }),
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

  const favs = h(
    "div",
    { cls: "card favs-card", id: "favs-card" },
    h("div", { cls: "card-header" }, h("span", { cls: "card-label", text: T("Favourites") })),
    h("div", { cls: "favs-list", id: "favs-list" }),
  );

  const left = h(
    "aside",
    { cls: "col col-left" },
    h(
      "div",
      { cls: "card", id: "calendar-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: T("Calendar") }),
        h(
          "div",
          { cls: "cal-nav" },
          h("button", { cls: "cal-btn", id: "cal-prev", title: T("Previous month"), "aria-label": T("Previous month"), text: "‹" }),
          h("span", { id: "cal-month-label" }),
          h("button", { cls: "cal-btn", id: "cal-next", title: T("Next month"), "aria-label": T("Next month"), text: "›" }),
        ),
      ),
      h("div", { cls: "cal-grid", id: "cal-grid", role: "grid", "aria-label": T("Calendar") }),
      h("button", { cls: "today-btn", id: "cal-today", text: T("Today") }),
    ),
    h(
      "div",
      { cls: "card", id: "links-card" },
      h("div", { cls: "card-header" }, h("span", { cls: "card-label", text: T("Quick links") })),
      h("nav", { id: "quick-links", "aria-label": T("Quick links") }),
    ),
  );

  const center = h(
    "main",
    { cls: "col col-center" },
    h(
      "div",
      { cls: "card hidden", id: "ring-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: T("Ring notes") }),
        countRow("ring-count", h("a", { cls: "card-link", id: "ring-open", href: "#", title: T("Open the notes file"), text: T("Open") })),
      ),
      h("div", { id: "ring-body" }),
    ),
    h(
      "div",
      { cls: "card", id: "clips-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: T("Web clips") }),
        countRow("clips-count", refreshBtn("refresh-clips", T("Refresh clips"), T("Refresh web clips"))),
      ),
      h("div", { id: "clips-body" }),
    ),
    h(
      "div",
      { cls: "card", id: "recent-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: T("Recent notes") }),
        countRow("recent-count", refreshBtn("refresh-recent", T("Refresh recent notes"), T("Refresh recent notes"))),
      ),
      h("div", { id: "recent-body" }),
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
  );

  const tab = (filter, label, active) =>
    h("button", { cls: active ? "tab active" : "tab", "data-filter": filter, role: "tab", "aria-selected": active ? "true" : "false", text: label });
  const right = h(
    "aside",
    { cls: "col col-right" },
    h(
      "div",
      { cls: "card", id: "tasks-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: T("Tasks") }),
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
    h(
      "div",
      { cls: "card", id: "note-card" },
      h(
        "div",
        { cls: "card-header" },
        h("span", { cls: "card-label", text: T("Quick note") }),
        h("span", { cls: "autosave-dot", id: "autosave-dot", title: T("Saved"), "aria-label": T("Saved") }),
      ),
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
        "aria-label": T("Quick note"),
        "data-placeholder": T("Jot something down…"),
        spellcheck: "true",
      }),
      h("textarea", { id: "quick-note", cls: "hidden", placeholder: T("Jot something down…"), spellcheck: "true", "aria-label": T("Quick note") }),
      h("div", { cls: "note-hint hidden", id: "note-hint", text: T("This note has formatting the editor can't show, so it appears as plain text.") }),
    ),
  );

  return [h("div", { cls: "bg-glow" }), h("div", { id: "app" }, header, hero, quote, favs, h("div", { cls: "grid" }, left, center, right))];
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
  get notePath() {
    return joinPath(this.settings.dataFolder, "Quick Note.md");
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
    this.root = this.contentEl.createDiv({ cls: "hp-root", attr: { id: "genkan-root" } });
    this.root.append(...buildDashboard());
    if (Platform.isMobile) this.$("search-kbd").classList.add("hidden");

    setIconSvg(this.$("settings-btn"), "settings");
    setIconSvg(this.$("page-refresh"), "refresh");
    setIconSvg(this.$("refresh-clips"), "refresh");
    setIconSvg(this.$("refresh-recent"), "refresh");
    setIconSvg(this.$("hero-refresh"), "refresh");

    this.$("settings-btn").addEventListener("click", () => {
      this.app.setting.open();
      this.app.setting.openTabById(this.plugin.manifest.id);
    });
    this.$("page-refresh").addEventListener("click", () => this.refreshAll(true));
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
        this.loadHero(false);
        this.loadQuote();
      }, 5 * 60 * 1000), // both loaders return early when switched off in settings
    );

    this.refreshAll(false);
  }

  async onClose() {
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
    this.$("hero").classList.toggle("hidden", !this.settings.showHero);
    if (this.settings.showHero) this.loadHero(false);
    this.loadQuote();
  }

  onFileChange(f) {
    const path = f.path;
    if (path === this.tasksPath) this.later("tasks", 150, () => this.loadTasks());
    else if (path === this.notePath) this.later("note", 150, () => this.loadNote());
    else if (path === this.favPath) this.later("favs", 150, () => this.renderFavourites());
    else if (this.isRingFile(path)) this.later("ring", 150, () => this.renderRingNotes());
    else this.scheduleLists();
  }

  scheduleLists() {
    this.later("lists", 1500, () => {
      if (this.ringMode === "files") this.renderRingNotes(); // frontmatter may have changed
      this.renderFavourites();
      this.renderClips();
      this.renderRecent();
      this.renderCalendar();
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
    grid.empty();
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement("div");
      cell.className = "cal-dow";
      // 1 Jan 2023 was a Sunday
      cell.textContent = fmtDate(new Date(2023, 0, 1 + ((ws + i) % 7)), { weekday: "short" }).slice(0, 2);
      grid.appendChild(cell);
    }

    const today = new Date();
    const first = (new Date(year, month, 1).getDay() - ws + 7) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const filler = (n) => {
      const cell = document.createElement("div");
      cell.className = "cal-day other-month";
      cell.textContent = n;
      grid.appendChild(cell);
    };
    for (let i = first - 1; i >= 0; i--) filler(prevDays - i);

    for (let d = 1; d <= days; d++) {
      const cell = document.createElement("div");
      cell.className = "cal-day";
      const date = new Date(year, month, d);
      if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        cell.classList.add("today");
      }
      if (this.app.vault.getAbstractFileByPath(this.dailyPath(date))) {
        cell.classList.add("has-note");
      }
      cell.textContent = d;
      cell.addEventListener("click", (e) => this.openDailyNote(date, e));
      grid.appendChild(cell);
    }

    const filled = first + days;
    const remaining = filled % 7 === 0 ? 0 : 7 - (filled % 7);
    for (let d = 1; d <= remaining; d++) filler(d);
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
      return;
    }
    const text = await this.app.vault.read(f);
    this.tasks = parseTasks(text);
    this.renderTasks();

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
        cls: task.done ? "task-check checked" : "task-check",
        "aria-label": task.done ? T("Mark incomplete") : T("Mark complete"),
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

  // ── Quick Note ──

  initNote() {
    const textarea = this.$("quick-note");
    const rich = this.$("quick-note-rich");
    this.setNoteMd(""); // builds the editor's first (empty) line

    const changed = () => {
      this.noteDirty = true;
      this.$("autosave-dot").className = "autosave-dot unsaved";
      this.syncNoteEmpty();
      this.later("noteSave", 800, () => this.saveNote());
    };
    // Flush on blur so switching tabs right after typing never loses text
    const flush = () => {
      if (this.noteDirty && !this.noteComposing) this.saveNote();
    };
    for (const el of [textarea, rich]) {
      el.addEventListener("input", changed);
      el.addEventListener("blur", flush);
    }
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
    bar.addEventListener("mousedown", (e) => e.preventDefault());
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fmt]");
      if (btn) this.formatNote(btn.dataset.fmt);
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
    this.$("autosave-dot").className = "autosave-dot saved";
  }

  async saveNote() {
    clearTimeout(this.timers.noteSave);
    const value = this.getNoteMd();
    try {
      const file = await this.ensureFile(this.notePath);
      await this.app.vault.process(file, () => value);
      if (this.getNoteMd() === value) {
        this.noteDirty = false;
        this.$("autosave-dot").className = "autosave-dot saved";
      }
    } catch (err) {
      new Notice(T("Could not save quick note: {error}", { error: err.message }));
    }
  }

  // The note as markdown, whichever editor is showing
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
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let node = null;
      let t;
      while ((t = walker.nextNode())) node = t;
      return node ? [node, node.nodeValue.length] : [block, 0];
    };
    const textAt = (block, offset) => {
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
      out.setStart(blocks[first], 0);
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
          h("span", { cls: "ql-icon", text: l.icon ?? "" }),
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

    count.textContent = total;
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
            title: file ? file.path : T("Not found — click to create"),
            role: "button",
            tabindex: "0",
          },
          h("span", { cls: "fav-star", text: "★" }),
          h("span", { cls: "fav-name", text: label }),
          h("button", {
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
    // Keyboard: Enter/Space activate a chip
    list.querySelectorAll(".fav-chip").forEach((chip) =>
      chip.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          chip.click();
        }
      }),
    );
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
      list.append(h("a", { cls: "note-item", href: "#", "data-open": f.path }, h("span", { cls: "note-icon", text: "📄" }), info));
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
          h("span", { cls: "search-result-icon", text: "📄" }),
          body,
        ),
      );
    }
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

  displayHero(photo) {
    const hero = this.$("hero");
    const img = this.$("hero-img");
    const credit = this.$("hero-credit");
    img.alt = photo.alt || T("Photo of the day");
    img.classList.remove("visible");
    img.onload = () => {
      img.classList.add("visible");
      hero.classList.add("loaded");
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
    this.registerView(VIEW_TYPE, (leaf) => new HomepageView(leaf, this));
    this.addRibbonIcon("home", T("Open homepage"), () => this.activateView());
    this.addCommand({
      id: "open-homepage",
      name: T("Open homepage"),
      callback: () => this.activateView(),
    });
    this.addSettingTab(new HomepageSettingTab(this.app, this));

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
    await this.saveData(this.settings);
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

  refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      leaf.view.refreshAll?.(false);
    }
  }
};
