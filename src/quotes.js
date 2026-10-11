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
