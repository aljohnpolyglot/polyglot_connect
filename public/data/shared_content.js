// data/shared_content.js
console.log('data/shared_content.js loading...');

window.polyglotSharedContent = {
    // These are filenames. The actual images should be in `images/tutor_games/`
    // Tutors will reference these filenames in their `tutorMinigameImageFiles` array in personas.js
    tutorImages: [
        {
            file: "market_scene.jpg", // Relative to images/tutor_games/
            description: "A bustling outdoor market with various colorful stalls, people shopping, and diverse produce.",
            tags: ["people", "food", "city life", "culture", "colors", "outdoors"],
            suitableGames: ["describe_scene", "vocab_challenge", "make_a_story", "guess_location"]
        },
        {
            file: "travel_landmark_paris.jpg",
            description: "The Eiffel Tower in Paris, possibly at sunset or with a scenic background.",
            tags: ["landmark", "travel", "city", "Europe", "iconic", "architecture"],
            suitableGames: ["guess_location", "describe_scene", "caption_it", "make_a_story"]
        },
        {
            file: "cozy_cafe.jpg",
            description: "Interior of a warm, inviting cafe with tables, chairs, coffee cups, and perhaps some pastries or books.",
            tags: ["indoors", "food", "drinks", "relaxing", "social", "books"],
            suitableGames: ["describe_scene", "make_a_story", "vocab_challenge", "roleplay_order_food"]
        },
        {
            file: "funny_animal_dog.jpg",
            description: "A dog doing something amusing, like wearing sunglasses, a hat, or in a funny pose.",
            tags: ["animals", "pets", "humor", "cute"],
            suitableGames: ["caption_it", "make_a_story", "describe_scene"]
        },
        {
            file: "abstract_art.jpg",
            description: "A colorful abstract painting with various shapes and textures, open to interpretation.",
            tags: ["art", "colors", "abstract", "creative", "modern"],
            suitableGames: ["describe_scene", "make_a_story", "discuss_emotions"]
        },
        {
            file: "busy_street_asia.jpg",
            description: "A busy street scene from an Asian city, with motorbikes, food stalls, and neon signs.",
            tags: ["city life", "Asia", "transportation", "food", "nightlife", "culture"],
            suitableGames: ["describe_scene", "guess_location", "vocab_challenge", "make_a_story"]
        },
        {
            file: "serene_nature_mountains.jpg",
            description: "A breathtaking mountain landscape with snow-capped peaks, a clear lake, or green valleys.",
            tags: ["nature", "mountains", "landscape", "travel", "outdoors", "serene"],
            suitableGames: ["describe_scene", "caption_it", "make_a_story", "discuss_emotions"]
        },
        {
            file: "family_dinner_table.jpg",
            description: "A family or group of friends gathered around a dinner table, sharing a meal and conversation.",
            tags: ["family", "friends", "food", "social", "indoors", "celebration"],
            suitableGames: ["describe_scene", "make_a_story", "vocab_challenge", "roleplay_conversation"]
        },
        {
            file: "old_library_books.jpg",
            description: "Interior of an old, grand library with tall bookshelves filled with antique books.",
            tags: ["books", "library", "knowledge", "history", "indoors", "quiet"],
            suitableGames: ["describe_scene", "make_a_story", "guess_location"]
        },
        {
            file: "beach_sunset.jpg",
            description: "A beautiful beach scene during sunset, with waves, sand, and colorful sky.",
            tags: ["beach", "ocean", "sunset", "nature", "travel", "relaxing"],
            suitableGames: ["describe_scene", "caption_it", "make_a_story", "discuss_emotions"]
        }
        // Add many more diverse images (aim for at least 20-30 to start, 100+ eventually)
        // Ensure the actual image files exist in 'images/tutor_games/'
    ],

    homepageTips: [ // These can be cycled on the homepage
        "Ask your AI Tutor to start a 'Describe the Scene' game with a photo!",
        "Challenge yourself with a 'Vocabulary Challenge' based on an image your tutor shares.",
        "Feeling creative? Ask your tutor for a picture and 'Make a Story' in your target language.",
        "Play 'Guess the Location' with your tutor using a surprise image.",
        "Try the 'Caption It!' game: your tutor sends a photo, you write the perfect social media caption.",
        "Use the 'Find Someone' tab to connect with AI personas from different (simulated) countries.",
        "Join a group chat to see how different AI personalities interact and practice in a social setting.",
        "Don't be afraid to make mistakes! The AI tutors are here to help you learn.",
        "The Summary tab provides feedback on your modal call/voice-chat sessions. Check it out!",
        "You can ask your AI partner about their (simulated) daily routine or interests to make conversation more natural."
    ]
};

console.log("data/shared_content.js loaded.", (window.polyglotSharedContent.tutorImages || []).length, "tutor images defined,", (window.polyglotSharedContent.homepageTips || []).length, "homepage tips.");