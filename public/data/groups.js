// data/groups.js
console.log('data/groups.js loading...');

window.polyglotGroupsData = [
    {
        id: "spanish_beginners_cafe_es",
        name: "Café Español",
        language: "Spanish",
        groupPhotoUrl: "images/groups/spanish_cafe.png",
        description: "A friendly and supportive space for A1-A2 Spanish learners to build confidence in speaking. Basic topics, role-play, and a relaxed café vibe.",
        tutorId: "sofia_spa_tutor",
        maxLearners: 4,
        tags: ["beginner friendly", "roleplay", "daily life", "A1-A2", "cafe style"]
    },
    {
        id: "french_cafe_parisien_fr",
        name: "Café Parisien",
        language: "French",
        groupPhotoUrl: "images/groups/cafe_parisien.png",
        description: "Bienvenue! Practice your French (A2-B2) in a relaxed, Parisian café atmosphere. Discuss culture, daily life, and enjoy friendly conversation.",
        tutorId: "emile_fra_tutor",
        maxLearners: 4,
        tags: ["conversation", "culture", "Parisian vibe", "A2-B2", "intermediate"]
    },
    {
        id: "german_grammar_police_de",
        name: "Grammar Nazis (German Grammar Police)",
        language: "German",
        groupPhotoUrl: "images/groups/german_grammar_police.png",
        description: "Achtung! Your German grammar is under arrest... for improvement! Join this (mostly) serious group to tackle tricky grammar with humor and support. Q&A focused.",
        tutorId: "liselotte_ger_tutor",
        maxLearners: 3,
        tags: ["grammar focus", "Q&A", "intermediate", "advanced", "humor"]
    },
    {
        id: "italian_dante_circle_it",
        name: "Circolo di Dante",
        language: "Italian",
        groupPhotoUrl: "images/groups/circolo_dante.png",
        description: "Inspired by the Sommo Poeta, we discuss Italian literature, art, history, and advanced language topics. For passionate learners of Italian culture.",
        tutorId: "giorgio_ita_tutor",
        maxLearners: 5,
        tags: ["literature", "culture", "Dante", "advanced", "discussion"]
    },
    {
        id: "portuguese_explorers_pt_eu",
        name: "Exploradores de Portugal",
        language: "Portuguese (Portugal)",
        groupPhotoUrl: "images/groups/exploradores_portugal.png",
        description: "Vamos explorar Portugal! Practice European Portuguese while discussing the rich culture, history, travel, and traditions of Portugal.",
        tutorId: "mateus_por_tutor",
        maxLearners: 4,
        tags: ["European Portuguese", "culture", "travel", "intermediate", "Portugal"]
    },
    {
        id: "portuguese_brazil_connect_pt_br",
        name: "O Verdadeiro Português (Brasil Connect)",
        language: "Portuguese (Brazil)",
        groupPhotoUrl: "images/groups/portugues_brasil_connect.png",
        description: "E aí, galera! Connect and chat in authentic Brazilian Portuguese. Discuss daily life, music, slang, and vibrant Brazilian culture.",
        tutorId: "joao_bra_tutor",
        maxLearners: 4,
        tags: ["Brazilian Portuguese", "conversation", "culture", "slang", "intermediate"]
    },
    {
        id: "russian_privet_rossii_ru",
        name: "Привет России! (Hello Russia!)",
        language: "Russian",
        groupPhotoUrl: "images/groups/privet_rossii.png",
        description: "Say 'Privet!' to Russian language and culture. A welcoming space for beginner to intermediate learners to practice speaking about everyday topics.",
        tutorId: "yelena_rus_tutor",
        maxLearners: 3,
        tags: ["beginner", "intermediate", "conversation", "culture", "welcoming"]
    },
    {
        id: "swedish_fika_sv",
        name: "Swedish 'Fika' Chat",
        language: "Swedish",
        groupPhotoUrl: "images/groups/swedish_fika.png",
        description: "A relaxed 'fika' (coffee break) style chat in Swedish. All topics and levels welcome for a cozy conversation.",
        tutorId: "astrid_swe_tutor",
        maxLearners: 5,
        tags: ["casual", "culture", "all levels", "fika", "conversation"]
    },
    {
        id: "indonesian_belajar_bahasa_id",
        name: "Belajar Bahasa Indonesia",
        language: "Indonesian",
        groupPhotoUrl: "images/groups/belajar_bahasa_indonesia.png",
        description: "Mari kita belajar Bahasa Indonesia bersama! Practice speaking, ask questions, and learn about Indonesian culture. For beginners and intermediates.",
        tutorId: "rizki_idn_tutor",
        maxLearners: 4,
        tags: ["beginner", "intermediate", "language learning", "conversation", "culture"]
    }
];

console.log("data/groups.js loaded.", (window.polyglotGroupsData || []).length, "group definitions.");