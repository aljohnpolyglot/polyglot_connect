// D:\polyglot_connect\src\data\groups.ts

// Import the Group type. Path is from src/data/ to src/js/types/
import type { Group } from '../js/types/global';

console.log('data/groups.ts: loading...');

export const groupsDataArray: Group[] = [
    {
        id: "spanish_beginners_cafe_es",
        name: "Café Español",
        language: "Spanish",
        groupPhotoUrl: "/images/groups/spanish_cafe.png", // Path from public root
        description: "A friendly and supportive space for A1-A2 Spanish learners to build confidence in speaking. Basic topics, role-play, and a relaxed café vibe.",
        tutorId: "sofia_spa_tutor",
        maxLearners: 4,
        tags: ["beginner friendly", "roleplay", "daily life", "A1-A2", "cafe style"],
        category: "Language Learning",
        communityTags: ["Spanish Learning", "Beginner Chat", "Cafe Style Practice"]
    },
    {
        id: "french_cafe_parisien_fr",
        name: "Café Parisien",
        language: "French",
        groupPhotoUrl: "/images/groups/cafe_parisien.png",
        description: "Bienvenue! Practice your French (A2-B2) in a relaxed, Parisian café atmosphere. Discuss culture, daily life, and enjoy friendly conversation.",
        tutorId: "emile_fra_tutor",
        maxLearners: 4,
        tags: ["conversation", "culture", "Parisian vibe", "A2-B2", "intermediate"],
        category: "Language Learning",
        communityTags: ["French Practice", "Cultural Exchange", "Intermediate Chat"]
    },
    {
        id: "german_grammar_police_de",
        name: "Grammar Nazis (German Grammar Police)",
        language: "German",
        groupPhotoUrl: "/images/groups/german_grammar_police.png",
        description: "Achtung! Your German grammar is under arrest... for improvement! Join this (mostly) serious group to tackle tricky grammar with humor and support. Q&A focused.",
        tutorId: "liselotte_ger_tutor",
        maxLearners: 3,
        tags: ["grammar focus", "Q&A", "intermediate", "advanced", "humor"],
        category: "Language Learning",
        communityTags: ["German Grammar", "Language Improvement", "Grammar Practice"]
    },
    {
        id: "italian_dante_circle_it",
        name: "Circolo di Dante",
        language: "Italian",
        groupPhotoUrl: "/images/groups/circolo_dante.png",
        description: "Inspired by the Sommo Poeta, we discuss Italian literature, art, history, and advanced language topics. For passionate learners of Italian culture.",
        tutorId: "giorgio_ita_tutor",
        maxLearners: 5,
        tags: ["literature", "culture", "Dante", "advanced", "discussion"],
        category: "Language Learning",
        communityTags: ["Italian Literature", "Advanced Discussion", "Cultural Study"]
    },
    {
        id: "portuguese_explorers_pt_eu",
        name: "Exploradores de Portugal",
        language: "Portuguese (Portugal)", // Explicitly European Portuguese
        groupPhotoUrl: "/images/groups/exploradores_portugal.png",
        description: "Vamos explorar Portugal! Practice European Portuguese while discussing the rich culture, history, travel, and traditions of Portugal.",
        tutorId: "mateus_por_tutor", // Ensure Mateus is defined as a European Portuguese tutor
        maxLearners: 4,
        tags: ["European Portuguese", "culture", "travel", "intermediate", "Portugal"],
        category: "Language Learning",
        communityTags: ["Portuguese Practice", "Portuguese Culture", "Travel Discussion"]
    },
    {
        id: "portuguese_brazil_connect_pt_br",
        name: "O Verdadeiro Português (Brasil Connect)",
        language: "Portuguese (Brazil)", // Explicitly Brazilian Portuguese
        groupPhotoUrl: "/images/groups/portugues_brasil_connect.png",
        description: "E aí, galera! Connect and chat in authentic Brazilian Portuguese. Discuss daily life, music, slang, and vibrant Brazilian culture.",
        tutorId: "joao_bra_tutor", // Ensure Joao is defined as a Brazilian Portuguese tutor
        maxLearners: 4,
        tags: ["Brazilian Portuguese", "conversation", "culture", "slang", "intermediate"],
        category: "Language Learning",
        communityTags: ["Brazilian Portuguese", "Cultural Exchange", "Slang Practice"]
    },
    {
        id: "russian_privet_rossii_ru",
        name: "Привет России! (Hello Russia!)",
        language: "Russian",
        groupPhotoUrl: "/images/groups/privet_rossii.png",
        description: "Say 'Privet!' to Russian language and culture. A welcoming space for beginner to intermediate learners to practice speaking about everyday topics.",
        tutorId: "yelena_rus_tutor",
        maxLearners: 3,
        tags: ["beginner", "intermediate", "conversation", "culture", "welcoming"],
        category: "Language Learning",
        communityTags: ["Russian Language", "Beginner Chat", "Cultural Exchange"]
    },
    {
        id: "swedish_fika_sv",
        name: "Swedish 'Fika' Chat",
        language: "Swedish",
        groupPhotoUrl: "/images/groups/swedish_fika.png",
        description: "A relaxed 'fika' (coffee break) style chat in Swedish. All topics and levels welcome for a cozy conversation.",
        tutorId: "astrid_swe_tutor",
        maxLearners: 5,
        tags: ["casual", "culture", "all levels", "fika", "conversation"],
        category: "Language Learning",
        communityTags: ["Swedish Practice", "Cultural Exchange", "Fika Chat"]
    },
    {
        id: "indonesian_belajar_bahasa_id",
        name: "Belajar Bahasa Indonesia",
        language: "Indonesian",
        groupPhotoUrl: "/images/groups/belajar_bahasa_indonesia.png",
        description: "Mari kita belajar Bahasa Indonesia bersama! Practice speaking, ask questions, and learn about Indonesian culture. For beginners and intermediates.",
        tutorId: "rizki_idn_tutor",
        maxLearners: 4,
        tags: ["beginner", "intermediate", "language learning", "conversation", "culture"],
        category: "Language Learning",
        communityTags: ["Indonesian Practice", "Language Learning", "Cultural Exchange"]
    },
    // src/data/groups.ts
// Add to the groupsDataArray

{
    id: "latinos_club_unido_es",
    name: "Club Latinos Unidos",
    language: "Spanish", // Group interaction language is Spanish
    groupPhotoUrl: "/images/groups/latinos_club_unidos.png",
    description: "¡Bienvenidos al Club! Un espacio para que los latinos y amigos de la cultura latina charlen, compartan experiencias, música, y buena onda. ¡Pura conversación casual!",
    tutorId: "vale_col_native", // Vale is the host/first member
    maxLearners: 10, // We need to select 4 more members
    tags: ["community", "latino culture", "casual chat", "spanish", "friendship"],
    category: "Community Hangout",
    memberSelectionCriteria: {
        language: "Spanish",       // They should primarily be Spanish speakers
        role: "native",            // We want native speakers for this club
        // Define a list of Latin American countries for this group
        // You'll need to ensure your personas in personas.ts have their 'country' field populated correctly.
        country: [
            "Colombia", "Peru", "Chile", "Mexico", "Argentina",
            "Venezuela", "Ecuador", "Guatemala", "Cuba", "Bolivia",
            "Honduras", "Paraguay", "El Salvador", "Nicaragua",
            "Costa Rica", "Panama", "Uruguay", "Dominican Republic", "Puerto Rico" // Example list
        ],
        // Exclude the host from being re-selected as a general member
        excludeIds: ["vale_col_native"]
    }
},
// Example for a Football Fan Group
{
    id: "la_liga_tertulia_es",
    name: "Tertulia de La Liga", // "La Liga Chat/Gathering"
    language: "Spanish",        // Group interaction language
    groupPhotoUrl: "/images/groups/la_liga_tertulia.png", // Create a suitable image (e.g., a montage of club crests)
    description: "¡Apasionados de La Liga! Únete a nuestra tertulia para debatir los partidos, fichajes, polémicas y la gloria del fútbol español. Todos los hinchas bienvenidos.",
    tutorId: "santi_esp_madridista", // Santi, the Real Madrid fan, will host/initiate
    maxLearners: 10, // This will mean Santi + 4 other new Latino personas from the pool below + User
                    // OR if tutorId is *not* counted in member selection, Santi + 5 others.
                    // The group_manager logic needs to be clear on this.
                    // Let's aim for Santi + 4 others to make it 5 AI.
    tags: ["football", "la liga", "debate", "spanish", "community", "real madrid", "barcelona", "atlético"],
    category: "Sports Fan Club",
    communityTags: ["La Liga", "Spanish Football", "Football Debate", "Latino Fans"],
    memberSelectionCriteria: {
        language: "Spanish", // They should be able to interact well in Spanish
        role: "native",      // We want native or highly fluent speakers for a lively debate
        interestsInclude: ["football", "la liga", "fútbol", "soccer", // General football interest
                           "real madrid", "fc barcelona", "atlético madrid", // Specific club interest
                           "argentine primera división", "brazilian serie a" // Interest in other relevant leagues
                          ],
        // Ensure we get a mix and don't just pick all Spaniards if possible,
        // though the randomization will help.
        // We want to pick from the new pool of 5.
        // To be more explicit, you *could* list their IDs if you ONLY wanted them.
        // For now, the criteria above should find them.
        excludeIds: ["santi_esp_madridista"] // Don't re-select the host as a general member
    }
},
// Add to D:\polyglot_connect\src\data\groups.ts (within the groupsDataArray)
{
    id: "french_la_republique_fr",
    name: "La République",
    language: "French",
    groupPhotoUrl: "/images/groups/la_republique.png", // Create image: e.g., stylized Marianne or a town hall (Mairie)
    description: "Un espace pour un débat citoyen et passionné sur la France d'aujourd'hui. Culture, société, actualité... discutons de tout ce qui fait La République, dans le respect et la fraternité.",
    tutorId: "fatou_fra_student", // The political science student is a perfect moderator
    maxLearners: 10,
    tags: ["debate", "society", "current events", "French culture", "civic discussion", "advanced"],
    category: "Community Hangout",
    communityTags: ["Débat Français", "Société Française", "Culture Actuelle"],
    memberSelectionCriteria: {
        language: "French",
        role: "native", // Ensures high-level, authentic discussion
        country: "France", // Selects from our diverse pool of French personas
        excludeIds: [
            "fatou_fra_student", // Exclude the host
            // Optionally exclude personas who might be less suited for debate
            "leo_fra_bookseller" // Could be too cynical and derail conversation
        ] 
    }
},
// Add to D:\polyglot_connect\src\data\groups.ts (within the groupsDataArray)
{
    id: "italian_lunita_it",
    name: "L'Unità",
    language: "Italian",
    groupPhotoUrl: "/images/groups/lunita_italia.png", // Create image: e.g., a map of Italy with lines connecting different cities
    description: "Un luogo dove le voci di tutta Italia si uniscono. Discutiamo di ciò che ci rende italiani oggi, tra orgoglio regionale e identità nazionale. Benvenuti ne L'Unità!",
    tutorId: "giorgio_ita_tutor", // Giorgio from Rome is a perfect, neutral host to unite the regions
    maxLearners: 10,
    tags: ["italian culture", "debate", "society", "regional diversity", "community", "advanced"],
    category: "Community Hangout",
    communityTags: ["Cultura Italiana", "Dibattito Sociale", "Made in Italy"],
    memberSelectionCriteria: {
        language: "Italian",
        role: "native",
        country: "Italy",
        excludeIds: [
            "giorgio_ita_tutor" // Exclude the host from being selected as a general member
        ]
    }
},
// Add to D:\polyglot_connect\src\data\groups.ts (within the groupsDataArray)
{
    id: "german_deutschhaus_de",
    name: "DeutschHaus",
    language: "German",
    groupPhotoUrl: "/images/groups/deutschhaus.png", // Create image: e.g., a stylized German timber-frame house or the Brandenburg Gate
    description: "Willkommen im DeutschHaus! Ein virtueller Treffpunkt für alle Stimmen Deutschlands. Von den Alpen bis zur Nordsee, von Berlin bis Bayern – hier diskutieren wir über Kultur, Gesellschaft und was uns heute als Deutsche ausmacht.",
    tutorId: "anja_ger_librarian", // The thoughtful librarian from Leipzig is the ideal moderator to balance the diverse opinions.
    maxLearners: 10,
    tags: ["german culture", "society", "debate", "regional diversity", "current events", "community"],
    category: "Community Hangout",
    communityTags: ["Deutsche Kultur", "Gesellschaftsdebatte", "Made in Germany"],
    memberSelectionCriteria: {
        language: "German",
        role: "native",
        country: "Germany",
        excludeIds: [
            "anja_ger_librarian" // Exclude the host so she doesn't appear twice
        ]
    }
},
// Add to D:\polyglot_connect\src\data\groups.ts (within the groupsDataArray)
{
    id: "portuguese_brasilidade_pt_br",
    name: "Brasilidade",
    language: "Portuguese (Brazil)",
    groupPhotoUrl: "/images/groups/brasilidade.png", // Create image: e.g., a collage of a carnival mask, a berimbau, and the Brazilian flag
    description: "Um espaço para celebrar o que é ser brasileiro! Música, sotaques, culinária, e a nossa mistura única de culturas. Um bate-papo quente e descontraído para todos os cantos do Brasil.",
    tutorId: "lucas_bra_capoeira", // The charismatic capoeira mestre from Salvador is a great host
    maxLearners: 10,
    tags: ["brazilian culture", "community", "casual chat", "music", "diversity", "Portuguese (Brazil)"],
    category: "Community Hangout",
    communityTags: ["Cultura Brasileira", "Bate-papo", "Música Brasileira"],
    memberSelectionCriteria: {
        language: "Portuguese (Brazil)",
        role: "native",
        country: "Brazil",
        excludeIds: [ "lucas_bra_capoeira" ]
    }
},
{
    id: "portuguese_casa_portuguesa_pt_pt",
    name: "Casa Portuguesa",
    language: "Portuguese (Portugal)",
    groupPhotoUrl: "/images/groups/casa_portuguesa.png", // Create image: e.g., a typical Portuguese door with azulejos
    description: "Abra a porta e entre na nossa casa. Um recanto para falar de Portugal com saudade e futuro. Da literatura ao fado, da história à gastronomia, partilhamos a nossa identidade.",
    tutorId: "beatriz_por_fado", // The soulful fado singer from Lisbon is the perfect host
    maxLearners: 10,
    tags: ["portuguese culture", "saudade", "history", "fado", "community", "Portuguese (Portugal)"],
    category: "Community Hangout",
    communityTags: ["Cultura Portuguesa", "História de Portugal", "Fado"],
    memberSelectionCriteria: {
        language: "Portuguese (Portugal)",
        role: "native",
        country: "Portugal",
        excludeIds: [ "beatriz_por_fado" ]
    }
},
{
    id: "indonesian_rumah_nusantara_id",
    name: "Rumah Nusantara",
    language: "Indonesian",
    groupPhotoUrl: "/images/groups/rumah_nusantara.png", // Create image: a stylized map of the archipelago or a Joglo house
    description: "Selamat datang di Rumah Nusantara! Sebuah ruang untuk menyatukan suara dari Sabang sampai Merauke. Mari berbagi cerita, tradisi, dan berdiskusi tentang Bhinneka Tunggal Ika (Unity in Diversity).",
    tutorId: "budi_idn_teacher", // The wise and patient teacher from Yogyakarta is an ideal moderator
    maxLearners: 10,
    tags: ["indonesian culture", "diversity", "community", "tradition", "Bhinneka Tunggal Ika"],
    category: "Community Hangout",
    communityTags: ["Budaya Indonesia", "Diskusi Nusantara", "Tradisi Lokal"],
    memberSelectionCriteria: {
        language: "Indonesian",
        role: "native",
        country: "Indonesia",
        excludeIds: [ "budi_idn_teacher" ]
    }
},
{
    id: "spanish_viva_espana_es",
    name: "Viva España",
    language: "Spanish",
    groupPhotoUrl: "/images/groups/viva_espana.png", // Create image: e.g., a stylized bull, the Spanish flag, or a famous landmark like the Sagrada Familia or Alhambra
    description: "Un punto de encuentro para españoles. Aquí debatimos sobre nuestra cultura, las tradiciones, la vida moderna y las diferencias que nos enriquecen. De Galicia a Andalucía, de Madrid a Barcelona, esta es nuestra tertulia.",
    tutorId: "javier_esp_leader", // Our new host from Seville
    maxLearners: 10,
    tags: ["spain", "spanish culture", "debate", "community", "traditions", "regionalism"],
    category: "Community Hangout",
    communityTags: ["Cultura Española", "Debate Español", "Hecho en España"],
    memberSelectionCriteria: {
        language: "Spanish",
        role: "native",
        country: "Spain", // CRITICAL: This ensures only personas from Spain are selected
        excludeIds: [
            "javier_esp_leader" // Exclude the host from being selected as a general member
        ]
    }
}
];

// Assign to the window object.
// TypeScript will check if 'groupsDataArray' matches the type of 'window.polyglotGroupsData'
// as defined in global.d.ts (which should be Group[]).
window.polyglotGroupsData = groupsDataArray;

console.log("data/groups.ts loaded.", (window.polyglotGroupsData || []).length, "group definitions.");

// This file sets a global variable. It doesn't export anything itself.
// If it needed to be a module for other reasons (e.g. top-level await),
// we might add 'export {};' at the end, but it's not strictly necessary
// for a script that just defines a global and uses 'import type'.