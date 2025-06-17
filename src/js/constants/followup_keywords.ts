// src/js/constants/followup_keywords.ts

/**
 * This file centralizes keyword lists used for detecting conversational context,
 * such as user follow-ups, questions, and direct address.
 *
 * NOTE: All keywords are pre-normalized (lowercase, accents removed if the
 * matching logic also normalizes) to ensure robust matching. The current logic in
 * group_interaction_logic.ts normalizes user input, so these lists must match that format.
 */

export const simpleAffirmations: string[] = [
    // English
    "yes", "yeah", "yep", "yup", "sure", "okay", "ok", "alright", "right", "correct", "exactly", "true", "i agree", "me too", "sounds good", "got it", "understood", "fine", "good", "totally", "for sure", "certainly", "absolutely", "definitely", "you got it", "that's it",
    // Spanish
    "si", "claro", "vale", "bueno", "dale", "de acuerdo", "exacto", "correcto", "verdad", "asi es", "entiendo", "entendido", "ya veo", "perfecto", "cierto", "seguro", "ya", "esta bien", "eso es",
    // French
    "oui", "ouais", "bien sur", "d'accord", "exactement", "c'est ca", "c'est vrai", "entendu", "compris", "parfait", "absolument", "tout a fait", "carrement", "ca marche",
    // German
    "ja", "sicher", "klar", "okay", "ok", "in ordnung", "genau", "richtig", "stimmt", "absolut", "bestimmt", "verstanden", "genau so", "sicherlich", "einverstanden",
    // Italian
    "si", "certo", "va bene", "ok", "d'accordo", "esatto", "giusto", "certo che si", "ho capito", "perfetto", "assolutamente",
    // Portuguese
    "sim", "claro", "ta bom", "esta bem", "certo", "exato", "com certeza", "entendi", "perfeito", "absolutamente", "fechado", "beleza",
    // Dutch
    "ja", "zeker", "tuurlijk", "ok", "oke", "akkoord", "precies", "klopt", "begrepen", "helemaal", "prima",
    // Russian (cyrillic)
    "да", "ага", "конечно", "хорошо", "ладно", "точно", "именно", "правильно", "согласен", "согласна", "понял", "поняла", "понятно", "безусловно",
    // Japanese (hiragana/kanji)
    "はい", "ええ", "うん", "そうです", "そうですね", "その通り", "分かった", "分かりました", "了解", "なるほど", "確かに",
    // Korean (hangul)
    "네", "응", "맞아요", "그럼요", "알았어", "알겠습니다", "이해했어요", "좋아요", "당연하죠",
    // Mandarin Chinese (pinyin/hanzi)
    "shi de", "dui", "hao", "好的", "对", "是的", "没错", "当然", "明白了", "我同意",
    // Arabic
    "نعم", "ايوه", "اكيد", "طبعا", "تمام", "صح", "مضبوط", "بالتاكيد", "موافق", "فهمت",
    // Hindi
    "haan", "theek hai", "sahi hai", "bilkul", "samajh gaya", "samajh gayi", "ji",
    // Indonesian
    "ya", "iya", "tentu", "oke", "baik", "setuju", "paham", "mengerti", "benar", "betul",
    // Polish
    "tak", "pewnie", "oczywiscie", "zgoda", "dobrze", "ok", "racja", "dokladnie", "zrozumialem", "rozumiem",
    // Swedish
    "ja", "visst", "javisst", "okej", "ok", "precis", "exakt", "juste", "jag forstar", "absolut",
    // Thai
    "ใช่", "ค่ะ", "ครับ", "แน่นอน", "โอเค", "เข้าใจแล้ว", "ถูกต้อง",
    // Turkish
    "evet", "tabii", "tamam", "olur", "anlastik", "dogru", "kesinlikle", "anladim",
    // Vietnamese
    "vâng", "dạ", "đúng", "chắc chắn", "được", "ok", "tất nhiên", "hiểu rồi",
    // Tagalog
    "oo", "opo", "sige", "tama", "syempre", "gets ko", "naiintindihan ko",
    // Norwegian
    "ja", "sikkert", "selvfolgelig", "ok", "greit", "riktig", "akkurat", "forstatt",
    "totally" // Universal slang
];

export const simpleNegations: string[] = [
    // English
    "no", "nope", "nah", "not really", "i disagree", "i don't think so", "never", "incorrect", "false", "not at all", "certainly not", "absolutely not", "wrong",
    // Spanish
    "no", "claro que no", "para nada", "no estoy de acuerdo", "nunca", "incorrecto", "falso", "jamas", "en absoluto", "que va", "negativo",
    // French
    "non", "pas vraiment", "je ne suis pas d'accord", "jamais", "incorrect", "faux", "pas du tout", "absolument pas", "pas question",
    // German
    "nein", "nicht wirklich", "stimmt nicht", "falsch", "niemals", "auf keinen fall", "ich stimme nicht zu", "uberhaupt nicht", "keinesfalls",
    // Italian
    "no", "non proprio", "non sono d'accordo", "sbagliato", "assolutamente no", "per niente", "mai",
    // Portuguese
    "nao", "de jeito nenhum", "claro que nao", "discordo", "errado", "nunca", "jamais",
    // Dutch
    "nee", "niet echt", "oneens", "niet akkoord", "fout", "absoluut niet", "nooit",
    // Russian (cyrillic)
    "нет", "неа", "не совсем", "я не согласен", "я не согласна", "никогда", "неправильно", "неверно", "ни в коем случае",
    // Japanese (hiragana/kanji)
    "いいえ", "いや", "ううん", "違う", "そうじゃない", "間違っています", "そんなことない",
    // Korean (hangul)
    "아니요", "아니", "틀렸어요", "그렇지 않아요", "절대 아니에요",
    // Mandarin Chinese (pinyin/hanzi)
    "bu", "bushi", "budui", "不是", "不对", "我不同意", "当然不",
    // Arabic
    "لا", "لاء", "ابدا", "غير صحيح", "خطأ", "بالعكس", "مستحيل",
    // Hindi
    "nahin", "bilkul nahin", "galat", "main sahmat nahin hoon",
    // Indonesian
    "tidak", "bukan", "salah", "saya tidak setuju", "enggak",
    // Polish
    "nie", "skad", "zle", "nie sadze", "nie zgadzam sie", "nigdy",
    // Swedish
    "nej", "na", "inte direkt", "fel", "jag haller inte med", "aldrig",
    // Thai
    "ไม่", "ไม่เลย", "ไม่เห็นด้วย", "ผิด",
    // Turkish
    "hayir", "yanlis", "katilmiyorum", "asla", "hic de degil",
    // Vietnamese
    "không", "sai", "tôi không đồng ý", "đâu có",
    // Tagalog
    "hindi", "hindi po", "mali", "hindi ako sang-ayon",
    // Norwegian
    "nei", "ikke egentlig", "uenig", "feil", "aldri", "absolutt ikke"
];

export const simpleContinuers: string[] = [
    // English
    "uh-huh", "mm-hmm", "mhm", "go on", "i see", "really", "oh", "interesting", "and", "so", "then", "well", "aha", "and then", "tell me more",
    // Spanish
    "aja", "hmm", "sigue", "continua", "ya veo", "ah si", "de verdad", "interesante", "y...", "entonces", "luego", "pues", "vaya", "cuentame mas",
    // French
    "euh-hein", "hmm", "continue", "vas-y", "je vois", "ah bon", "vraiment", "interessant", "et...", "donc", "alors", "puis", "ben", "dis-m'en plus",
    // German
    "aha", "hm", "mhm", "weiter", "ich verstehe", "ach so", "wirklich", "echt", "interessant", "und...", "also", "dann", "nun", "tja", "erzahl mehr",
    // Italian
    "uhm", "mmh", "continua", "davvero", "interessante", "capisco", "allora", "e poi", "dimmi di piu",
    // Portuguese
    "uhum", "hmm", "continue", "sei", "interessante", "e entao", "me diga mais",
    // Dutch
    "hmm", "mhm", "ga door", "ik snap het", "echt", "interessant", "en", "vertel",
    // Russian (cyrillic)
    "угу", "ага", "хм", "продолжай", "понимаю", "ясно", "правда", "интересно", "и...", "так", "ну",
    // Japanese (hiragana/kanji)
    "ふむふむ", "へえ", "ほう", "それで", "なるほど", "本当", "面白い", "続けて",
    // Korean (hangul)
    "음", "아", "어", "네", "계속하세요", "진짜요", "그래요", "그래서요",
    // Mandarin Chinese (pinyin/hanzi)
    "en", "嗯", "然后呢", "有意思", "真的吗", "我明白了", "继续说",
    // Arabic
    "اها", "هممم", "كمل", "كملي", "فاهم", "بجد", "معقول", "وبعدين",
    // Hindi
    "hmm", "acha", "phir", "aur batao", "sach mein",
    // Indonesian
    "hmm", "oh gitu", "terus", "lanjut", "menarik", "begitu ya",
    // Polish
    "aha", "uhm", "kontynuuj", "naprawde", "ciekawe", "rozumiem", "no i",
    // Swedish
    "jaha", "okej", "hmm", "fortsatt", "jag forstar", "verkligen", "intressant", "och sen da",
    // Thai
    "อืม", "อ๋อ", "แล้วไงต่อ", "จริงเหรอ", "น่าสนใจ", "เล่ามาอีก",
    // Turkish
    "himm", "hı-hı", "devam et", "anliyorum", "gercekten mi", "ilginc", "ee", "sonra",
    // Vietnamese
    "uhm", "vậy à", "rồi sao", "thật hả", "thú vị", "kể tiếp đi",
    // Tagalog
    "tapos", "talaga", "ah talaga", "ganun ba", "kwento mo pa",
    // Norwegian
    "aha", "javel", "hmm", "fortsett", "jeg skjonner", "virkelig", "interessant", "og sa"
];

export const questionKeywords: string[] = [
    // English
    "what", "where", "when", "who", "why", "how", "which", "whose", "explain", "question",
    // Spanish
    "que", "cual", "quien", "como", "cuando", "donde", "cuanto", "porque", "por que", "cuyo", "explica", "pregunta",
    // French
    "que", "quoi", "qui", "comment", "quand", "ou", "combien", "pourquoi", "lequel", "laquelle", "explique",
    // German
    "was", "wo", "wann", "wer", "warum", "wieso", "weshalb", "wie", "welche", "wessen", "erklar",
    // Italian
    "cosa", "che", "dove", "quando", "chi", "perche", "come", "quale", "quanto", "spiega",
    // Portuguese
    "o que", "onde", "quando", "quem", "porque", "por que", "como", "qual", "quanto", "explique",
    // Dutch
    "wat", "waar", "wanneer", "wie", "waarom", "hoe", "welke", "wiens", "leg uit",
    // Russian (cyrillic)
    "что", "где", "когда", "кто", "почему", "зачем", "как", "какой", "чей", "объясни",
    // Japanese (hiragana/kanji)
    "何", "どこ", "いつ", "誰", "なぜ", "どうして", "どう", "どの", "誰の", "教えて",
    // Korean (hangul)
    "뭐", "무엇을", "어디", "언제", "누구", "왜", "어떻게", "어떤", "설명해",
    // Mandarin Chinese (pinyin/hanzi)
    "什么", "哪里", "何时", "谁", "为什么", "怎么", "哪个", "解释",
    // Arabic
    "ماذا", "ما", "اين", "متى", "من", "لماذا", "كيف", "اي", "اشرح",
    // Hindi
    "kya", "kahan", "kab", "kaun", "kyon", "kaise", "kaun sa", "samjhao",
    // Indonesian
    "apa", "dimana", "kapan", "siapa", "mengapa", "kenapa", "bagaimana", "yang mana", "jelaskan",
    // Polish
    "co", "gdzie", "kiedy", "kto", "dlaczego", "jak", "ktory", "czyj", "wyjasnij",
    // Swedish
    "vad", "var", "nar", "vem", "varfor", "hur", "vilken", "vilket", "vems", "forklara",
    // Thai
    "อะไร", "ที่ไหน", "เมื่อไหร่", "ใคร", "ทำไม", "อย่างไร", "อันไหน", "อธิบาย",
    // Turkish
    "ne", "nerede", "ne zaman", "kim", "neden", "niye", "nasil", "hangi", "acikla",
    // Vietnamese
    "gì", "đâu", "khi nào", "ai", "tại sao", "sao", "thế nào", "cái nào", "giải thích",
    // Tagalog
    "ano", "saan", "kailan", "sino", "bakit", "paano", "alin", "ipaliwanag",
    // Norwegian
    "hva", "hvor", "nar", "hvem", "hvorfor", "hvordan", "hvilken", "hvis", "forklar"
];

// This list is checked with higher priority. It contains phrases that very strongly
// indicate the user is directly addressing the last speaker.
export const directYouPhrases: string[] = [
    // English
    "you", "and you", "what about you", "how about you", "your turn", "you are", "you're", "do you", "are you", "did you", "can you", "will you", "could you", "would you", "have you", "what do you",
    // Spanish
    "tu", "usted", "vos", "y tu", "y usted", "y vos", "que tal tu", "que hay de ti", "a ti", "y a ti", "eres", "estas", "tienes", "puedes", "sabes", "has", "crees que",
    // French
    "toi", "vous", "et toi", "et vous", "ton avis", "votre avis", "tu es", "vous etes", "as-tu", "avez-vous", "peux-tu", "pouvez-vous", "sais-tu", "savez-vous", "penses-tu",
    // German
    "du", "sie", "und du", "und sie", "und dir", "und ihnen", "was ist mit dir", "was meinst du", "du bist", "sind sie", "bist du", "kannst du", "konnen sie", "hast du", "haben sie", "denkst du",
    // Italian
    "tu", "lei", "e tu", "e lei", "che ne dici di te", "secondo te", "tu sei", "lei e", "hai", "puoi", "sai", "pensi che",
    // Portuguese
    "voce", "e voce", "o que me diz de voce", "e tu", "pra voce", "voce e", "voce esta", "tem", "pode", "sabe", "acha que",
    // Dutch
    "jij", "u", "en jij", "en u", "wat vind jij", "jij bent", "ben jij", "heb jij", "kun jij", "kan je",
    // Russian (cyrillic)
    "ты", "вы", "а ты", "а вы", "как насчет тебя", "а у тебя", "у тебя", "ты можешь", "вы можете", "ты думаешь",
    // Japanese (hiragana/kanji)
    "あなた", "君は", "あなたはどう", "どう思いますか", "できますか", "知っていますか", // Note: "you" is often omitted, but these phrases are direct.
    // Korean (hangul)
    "너는", "당신은", "어때요", "어떠세요", "할 수 있어요", "아세요", "생각해요",
    // Mandarin Chinese (pinyin/hanzi)
    "ni", "nin", "你", "您", "你呢", "你怎么看", "你可以", "你知道吗", "你觉得",
    // Arabic
    "انت", "انتي", "حضرتك", "وانت", "وانتي", "شو رايك", "رايك ايه", "تقدر", "تقدرين", "بتعرف", "هل تعتقد",
    // Hindi
    "aap", "tum", "aur aap", "aur tum", "aapke bare me", "aap kya sochte hain", "kya aap",
    // Indonesian
    "kamu", "anda", "kalau kamu", "bagaimana denganmu", "menurutmu", "apakah kamu", "bisa",
    // Polish
    "ty", "pan", "pani", "a ty", "co ty na to", "twoim zdaniem", "czy mozesz", "czy wiesz",
    // Swedish
    "du", "och du", "du da", "vad tycker du", "kan du", "vet du", "tror du",
    // Thai
    "คุณ", "แล้วคุณล่ะ", "คุณคิดว่าไง", "คุณทำได้ไหม", "คุณรู้ไหม",
    // Turkish
    "sen", "siz", "ya sen", "peki ya siz", "sence", "sen ne dusunuyorsun", "yapabilir misin", "biliyor musun",
    // Vietnamese
    "bạn", "còn bạn", "bạn thì sao", "bạn nghĩ sao", "bạn có thể", "bạn có biết",
    // Tagalog
    "ikaw", "eh ikaw", "para sayo", "sa tingin mo", "kaya mo ba", "alam mo ba",
    // Norwegian
    "du", "og du", "hva med deg", "hva synes du", "kan du", "vet du", "tror du"
];