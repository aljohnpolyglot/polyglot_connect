// in src/js/constants/separate_text_keywords.ts

/**
 * Defines keywords and rules used to intelligently split a single string into multiple chat bubbles.
 * This file is the central "tuning dashboard" for the conversational rhythm of each language.
 * 
 * - initialInterjections: Words that often appear alone in a bubble before the main thought.
 * - twoPartInterjections: Common phrases that should be split into two bubbles (e.g., "no way").
 * - conjunctionSplits: Words that often start a new, contrasting, or sequential thought bubble.
 * - conjunctionProbability: The chance (0.0 to 1.0) that the conjunction rule will be applied.
 * - noSplitPrefixes: CRITICAL. A list of common short words (prepositions, articles) that
 *   should PREVENT a split if they appear before a capitalized word. This fixes the
 *   "con Sofia" bug.
 */
interface SeparationKeywords {
    initialInterjections: string[];
    twoPartInterjections?: string[];
    conjunctionSplits: string[];
    conjunctionProbability?: number;
    noSplitPrefixes?: string[]; // <<< The new, critical property
  }
  
  type KeywordMap = {
    [language: string]: SeparationKeywords;
  };
  
  export const SEPARATION_KEYWORDS: KeywordMap = {
    // --- MAJOR LANGUAGES ---
  
    "english": {
      initialInterjections: ["lol", "lmao", "haha", "omg", "wow", "damn", "bruh", "oof", "yikes", "nice", "cool", "yeah", "yep", "yup", "yes", "true", "right", "no", "nope", "nah", "fr", "ok", "okay", "k", "aight", "hey", "hi", "yo", "sup", "thanks", "ty", "yw", "hmm", "huh", "anyway", "like", "seriously", "honestly", "tbh", "ngl", "wait", "ah", "dude", "bro", "man", "for sure", "i mean"],
      twoPartInterjections: ["no way", "oh my", "for real", "are you", "what the"],
      conjunctionSplits: ["but", "so", "plus", "anyway", "actually", "basically", "then", "also", "or", "because"],
      noSplitPrefixes: ["a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "from", "by", "about", "and"], 
      conjunctionProbability: 0.7
    },
  
    "french": {
      initialInterjections: ["lol", "mdr", "ptdr", "wow", "ah", "ah bon", "oui", "ouais", "nan", "non", "si", "hmm", "euh", "bah", "bon", "attends", "attendez", "ok", "d'accord", "bref", "genre", "sérieux", "putain", "carrément", "grave", "franchement"],
      twoPartInterjections: ["ah bon", "c'est pas", "mon dieu", "n'importe quoi"],
      conjunctionSplits: ["mais", "donc", "et puis", "en fait", "du coup", "par contre", "enfin", "aussi", "puis", "alors", "mon dieu"],
      noSplitPrefixes: ["à", "a", "le", "la", "les", "un", "une", "des", "au", "aux", "du", "en", "de", "d'", "par", "pour", "sur","avec","de","de la" , "du", "et"],
      conjunctionProbability: 0.6
    },
  
    "spanish": {
      initialInterjections: ["jaja", "jajaja", "jeje", "dios", "dios mio", "guau", "órale", "ándale", "che", "boludo", "weon", "hostia", "joder", "sí", "claro", "exacto", "eso", "eso sí", "vale", "dale", "ok", "no", "qué va", "hola", "buenas", "gracias", "de nada", "porfa", "hmm", "bueno", "pues", "a ver", "osea", "espera", "hombre", "tío", "venga"],
      twoPartInterjections: ["no me", "qué va", "en serio", "dios mío"],
      conjunctionSplits: ["pero", "así que", "entonces", "y pues", "o sea", "además", "luego", "porque", "es que", "sino"],
      noSplitPrefixes: ["a", "con", "de", "en", "el", "la", "los", "las", "un", "una", "unos", "unas", "por", "sin", "sobre", "para", "de la", "del", "Real", "y"],
      conjunctionProbability: 0.7
    },
  
    "german": {
      initialInterjections: ["hallo", "moin", "servus", "tach", "tschüß", "ciao", "ja", "nein", "nee", "klar", "sicher", "genau", "echt", "real", "stimmt", "achso", "ups", "oh", "hmm", "also", "gut", "naja", "halt", "eben", "okay", "ok", "wie", "wo", "was", "warum", "quatsch"],
      twoPartInterjections: ["echt jetzt", "mein gott", "auf keinen"],
      conjunctionSplits: ["aber", "sondern", "denn", "also", "deshalb", "trotzdem", "dann", "oder", "weil"],
      noSplitPrefixes: ["der", "die", "das", "dem", "den", "des", "ein", "eine", "einen", "einem", "eines", "in", "an", "auf", "mit", "von", "zu", "für", "bei", "mit", "und", "das", "die ", "der"],
      conjunctionProbability: 0.4
    },
    
    "italian": {
      initialInterjections: ["ahah", "oddio", "cazzo", "dai", "forza", "mamma mia", "wow", "cavolo", "sì", "si", "certo", "esatto", "ok", "va bene", "no", "boh", "ciao", "ciaoo", "grazie", "prego", "tranquillo", "allora", "ecco", "cioè", "praticamente", "aspetta", "guarda", "vero", "giusto"],
      twoPartInterjections: ["ma dai", "mamma mia", "ma che", "non ci"],
      conjunctionSplits: ["ma", "quindi", "però", "infatti", "invece", "allora", "comunque", "anche", "poi"],
      noSplitPrefixes: ["a", "e", "di", "da", "in", "con", "su", "per", "tra", "fra", "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "un", "della","delle","del","dei","degli","della","delle","di","dei","degli","della","delle"],
      conjunctionProbability: 0.3 // <<< Lowered based on our findings
    },
    "portuguese (brazil)": {
      initialInterjections: ["kkk", "mds", "nossa", "eita", "eitaa", "carro", "slk", "aff", "putz", "sim", "exato", "claro", "verdade", "tá", "ta bom", "ok", "não", "nao", "ué", "ata", "opa", "oi", "olá", "boa noite", "valeu", "entendi", "legal", "legalll", "bom", "hum", "hmm", "tipo", "ah", "mano", "cara", "f"],
      twoPartInterjections: [], // Can be added later
      conjunctionSplits: ["mas", "então", "aí", "daí", "só que", "porque", "por que", "e", "ou", "depois", "também", "inclusive", "aliás"],
      noSplitPrefixes: ["a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "em", "no", "na", "por", "para", "com", "dos", "e", "ou", "depois", "também", "inclusive", "aliás"],
      conjunctionProbability: 0.7
    },
  
    "russian": {
      initialInterjections: ["привет", "здравствуй", "пока", "добрый вечер", "да", "нет", "конечно", "точно", "понятно", "ясно", "блин", "черт", "епта", "жиза", "что", "спасибо", "пожалуйста", "пж", "хорошо", "ладно", "ну", "кстати", "слушай", "смотри", "кхм"],
      twoPartInterjections: [],
      conjunctionSplits: ["но", "а", "поэтому", "потому что", "кстати", "и", "или", "тоже", "потом", "зато"],
      noSplitPrefixes: ["в", "на", "с", "о", "у", "к", "по", "из", "за", "для", "от", "и", "или", "тоже", "потом", "зато"],
      conjunctionProbability: 0.6
    },
  
    // --- OTHER LANGUAGES (Can be enriched later) ---
    
    "tagalog": {
      initialInterjections: ["haha", "gago", "tanga", "shet", "tangina", "inaka", "pota", "putangina", "omsim", "weh", "ay", "ayoko", "grabe", "hoy", "oo", "hindi", "hinde", "sige", "ge", "syempre", "legit", "totoo", "ok", "okay", "uy", "pre", "tol", "sis", "bes", "salamat", "ganda", "lupet", "angas", "basta", "kase", "parang"],
      twoPartInterjections: ["talaga ba"],
      conjunctionSplits: ["pero", "kaya", "tapos", "kasi", "kase", "habang", "at", "pati", "tsaka"],
      noSplitPrefixes: ["sa", "ang", "mga", "ng", "nang", "para", "nasa", "kasama si", "si", "kay"],
      conjunctionProbability: 0.8 // Taglish is very fragmented
    },
    
    "swedish": {
      initialInterjections: ["hej", "hejsan", "halloj", "tjena", "tja", "ja", "jo", "nej", "visst", "precis", "exakt", "såklart", "fan", "jävlar", "wow", "ehh", "åh", "oj", "tack", "vsg", "just det", "eller hur", "alltså", "ju", "väl", "liksom", "typ", "okej", "ok", "hmm"],
      twoPartInterjections: ["ja tack"],
      conjunctionSplits: ["men", "så", "fast", "därför", "dessutom", "och", "eller", "också", "sedan", "sen"],
      noSplitPrefixes: ["en", "ett", "i", "på", "av", "för", "till", "med", "om", "från", "och", "eller", "också", "sedan", "sen"],
      conjunctionProbability: 0.4
    },
  
    // ... (Other languages like Japanese, Korean, Indonesian would follow the same pattern) ...
  
    "default": {
      initialInterjections: ["lol", "omg", "hmm", "wait", "ok", "wow"],
      twoPartInterjections: ["no way"],
      conjunctionSplits: ["but", "so", "and", "also"],
      noSplitPrefixes: ["a", "an", "the", "in", "on", "at", "to", "for", "of", "with"],
      conjunctionProbability: 0.6
    }
  };