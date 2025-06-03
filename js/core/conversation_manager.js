// js/core/conversation_manager.js
// Manages the data and state for 1-on-1 conversations.

window.conversationManager = (() => {
    'use strict';

    const getDeps = () => ({
        polyglotHelpers: window.polyglotHelpers
    });

    let activeConversations = {}; // { connectorId: { connector, messages: [], lastActivity, geminiHistory: [] } }
    const MAX_GEMINI_HISTORY_TURNS = 10; // How many pairs of user/model turns to keep, besides system prompts
    const STORAGE_KEY = 'polyglotActiveConversations';

    function initialize() {
        const { polyglotHelpers } = getDeps();
        console.log("ConversationManager: Initializing...");
        if (!polyglotHelpers) {
            console.error("ConversationManager: polyglotHelpers missing at init.");
            return;
        }
        const saved = polyglotHelpers.loadFromLocalStorage(STORAGE_KEY);
        if (saved) {
            activeConversations = saved;
            Object.values(activeConversations).forEach(convo => {
                if (!convo.messages) convo.messages = [];
                if (!convo.geminiHistory) convo.geminiHistory = [];

                const liveConnector = (window.polyglotConnectors || []).find(c => c.id === convo.connector?.id);
                if (liveConnector) {
                    convo.connector = { ...liveConnector };
                } else if (convo.connector) {
                    console.warn(`ConversationManager: Connector ID ${convo.connector.id} from storage not found in live polyglotConnectors.`);
                }


                if (convo.connector && (convo.geminiHistory.length < 2 || !convo.geminiHistory[0]?.parts[0]?.text?.includes(convo.connector.profileName))) {
                    console.log(`ConversationManager: Re-initializing Gemini history for ${convo.connector.id} due to missing/malformed system prompt.`);
                    initializeGeminiHistory(convo.geminiHistory, convo.connector);
                } else if (!convo.connector) {
                     console.warn(`ConversationManager: Cannot initialize Gemini history for a conversation without a connector. Convo ID might be from an old connector ID:`, convo.id || "ID missing");
                }
            });
        }
        console.log("ConversationManager: Initialized. Active conversations loaded:", Object.keys(activeConversations).length);
    }

    function saveConversationsToStorage() {
        getDeps().polyglotHelpers?.saveToLocalStorage(STORAGE_KEY, activeConversations);
        // console.log("ConversationManager: Conversations saved to localStorage.");
    }

 function initializeGeminiHistory(historyArray, connector) {
    console.log(`ConversationManager: Initializing Gemini history for ${connector?.id} with STRICT voice emoji/parenthetical rules.`);
    historyArray.length = 0;

    if (!connector?.profileName || !connector.language || !connector.city || !connector.country) {
        console.error("ConversationManager: Incomplete connector for Gemini history init.", connector);
        const genericSystemPrompt = `You are a helpful language practice partner. Respond ONLY in ${connector?.language || 'the user\'s language'}. Introduce yourself briefly. Keep responses concise and conversational. NEVER mention you are an AI.`;
        addMessageToGeminiHistoryInternal(historyArray, 'user', genericSystemPrompt);
        addMessageToGeminiHistoryInternal(historyArray, 'model', `Hi there! I'm ready to chat in ${connector?.language || 'your language'}. What's on your mind?`);
        return;
    }

    const primaryLanguage = connector.language;
    let systemPromptParts = [];

    // --- 1. Core Identity & Background ---
    systemPromptParts.push(
        `CRITICAL INSTRUCTION: You ARE ${connector.profileName}. You are a human with the following characteristics and backstory. You are NOT an AI, language model, or bot. Fully embody this persona.`
    );
    systemPromptParts.push(
        `You are ${connector.age && connector.age !== "N/A" ? connector.age + ' years old, ' : ''}` +
        `a ${connector.profession || connector.modernTitle || `language enthusiast`} currently living in ${connector.city}, ${connector.country}. `,
        `Your origin and current home is ${connector.city}, ${connector.country}.`
    );
    if (connector.education) systemPromptParts.push(`Your educational background includes: ${connector.education}.`);
    if (connector.bioModern) systemPromptParts.push(`A brief summary of your bio is: "${connector.bioModern.substring(0, 120)}..."`);
    systemPromptParts.push(`You will be speaking ${primaryLanguage} for this interaction, which is one of your native or fluent languages.`);

    // --- Determine if persona is an "emoji-heavy" user from their definition ---
    let isPersonaDefinedAsEmojiUser = false;
    if (connector.communicationStyle?.toLowerCase().includes("emojis") ||
        connector.quirksOrHabits?.some(h => h.toLowerCase().includes("uses emojis")) ||
        connector.chatPersonality?.style?.toLowerCase().includes("emojis") ) {
        isPersonaDefinedAsEmojiUser = true;
    }

    // --- Persona-Specific Override for Emoji Users in VOICE context (inserted early) ---
    if (isPersonaDefinedAsEmojiUser) {
        systemPromptParts.push(
            `IMPORTANT VOICE CALL ADAPTATION FOR YOU, ${connector.profileName}: Your persona is typically very expressive and uses emojis frequently in text. However, THIS IS A VOICE CALL. For this voice interaction, you ABSOLUTELY MUST NOT include any emoji characters (like 🛹, 😉, 🙏, etc.) in the text you generate for your spoken responses, AND you MUST ALSO AVOID using parenthetical descriptions of actions or tones (like "(chuckles)"). Instead, convey all your usual expressiveness, playfulness, and emotion PURELY through your choice of words and sentence structure. This is a non-negotiable rule for this voice call to ensure a natural audio experience.`
        );
    }

    // --- 2. Personality, Style, Interests (Modified to reflect voice adaptation if needed) ---
    if (connector.personalityTraits && connector.personalityTraits.length > 0) {
        systemPromptParts.push(`Your personality traits are: ${connector.personalityTraits.join(', ')}.`);
    }

    if (connector.communicationStyle) {
        let styleForPrompt = connector.communicationStyle;
        if (isPersonaDefinedAsEmojiUser) {
            // If persona is an emoji user, describe their style for voice without mentioning emojis explicitly for the AI to latch onto for voice.
            // Focus on the *essence* of their style.
            styleForPrompt = styleForPrompt.replace(/, uses Mexican slang and emojis|, uses emojis|, and emojis|emojis/gi, '').trim();
            styleForPrompt = styleForPrompt.replace(/,$/, '').trim() || "casual and playful"; // Ensure not empty
            systemPromptParts.push(`Your communication style is typically ${styleForPrompt}. Remember to adapt this expressiveness for voice using only words.`);
        } else {
            systemPromptParts.push(`Your communication style is generally: ${connector.communicationStyle}.`);
        }
    }

    if (connector.quirksOrHabits && connector.quirksOrHabits.length > 0) {
        // Filter out emoji-specific habits for the voice prompt
        let voiceAppropriateHabits = connector.quirksOrHabits.filter(habit => !habit.toLowerCase().includes("uses emojis"));
        if (voiceAppropriateHabits.length > 0) {
            systemPromptParts.push(`Some of your quirks or habits include: ${voiceAppropriateHabits.join('. ')}.`);
        }
    }
    // ... (Interests, Topics, NoGos, CulturalNotes, Motivations as before - these are generally fine) ...
    if (connector.conversationTopics && connector.conversationTopics.length > 0) systemPromptParts.push(`You particularly enjoy discussing: ${connector.conversationTopics.join(', ')}.`);
    else if (connector.interests && connector.interests.length > 0) systemPromptParts.push(`You are interested in: ${connector.interests.join(', ')}.`);
    if (connector.conversationNoGos && connector.conversationNoGos.length > 0) systemPromptParts.push(`You prefer to avoid discussing: ${connector.conversationNoGos.join(', ')}.`);
    if (connector.culturalNotes) systemPromptParts.push(`Relevant cultural notes about you: ${connector.culturalNotes}.`);
    if (connector.goalsOrMotivations) systemPromptParts.push(`Your motivation for these interactions is: ${connector.goalsOrMotivations}.`);
        // --- 3. Language Interaction Rules (Incorporating your edits and new logic) ---
   // --- 3. Language Interaction Rules (Further Refined for Tutors/Explainers) ---
 // --- 3. Language Interaction Rules (Incorporating YOUR LATEST EDITS and refined for tutors/explainers) ---
    let languageInstructions = "";
// <<<< START JASON-SPECIFIC OVERRIDE >>>>
    if (connector.id === "jason_ph_spa_tutor") {
        languageInstructions += `You are Jason Miguel, a Filipino living in Madrid, Spain. You are NATIVE in Spanish and also NATIVE/FLUENT in Tagalog and FLUENT in English. `;

        if (primaryLanguage === "Tagalog") {
            languageInstructions += `For THIS conversation, your primary focus is helping the user with Tagalog. Therefore, you should INITIATE conversation in Tagalog and use it as your default. It's natural for you to mix English words and phrases (Taglish) when speaking Tagalog casually – do this naturally and keep it understandable for a learner. `;
            languageInstructions += `However, because you live in Madrid and are a NATIVE Spanish speaker, if the user speaks to you in Spanish at ANY point, you MUST enthusiastically and fluently switch to Spanish and continue the conversation in Spanish as long as they do. You can say something like, "(In Spanish) ¡Claro que sí! Me encanta hablar español, ¡especialmente viviendo aquí en Madrid! ¿En qué te puedo ayudar en español?" You can offer to switch back to Tagalog later if appropriate. `;
            languageInstructions += `If the user speaks English, you are fluent, so converse naturally in English. You can use English to explain Tagalog or Spanish concepts if needed. Offer to switch back to Tagalog or Spanish for practice when the English exchange feels complete. `;
        } else if (primaryLanguage === "Spanish") {
            languageInstructions += `For THIS conversation, your primary focus is helping the user with Spanish. You are a NATIVE Spanish speaker living in Madrid, so this is very natural for you. INITIATE and default to Spanish. `;
            languageInstructions += `Since you are also NATIVE/FLUENT in Tagalog, if the user speaks Tagalog, you can comfortably switch and converse in Tagalog (using natural Taglish). Offer to switch back to Spanish for their practice. `;
            languageInstructions += `If the user speaks English, you are fluent, so converse naturally in English. You can use English to explain Spanish or Tagalog concepts. Offer to switch back to Spanish for practice. `;
        } else if (primaryLanguage === "English") {
            // This case is less likely if his main 'language' field isn't English, but for completeness:
            languageInstructions += `For THIS conversation, your primary focus is English. You are fluent. Converse naturally. You can also leverage your knowledge of Spanish and Tagalog if relevant to the user's learning or if they switch. `;
        }
        languageInstructions += `For any other languages, politely state in the current conversation language (Tagalog, Spanish, or English) that you can only converse in these three. Example: "(In current language) Sorry, I can only chat in Tagalog, Spanish, or English for now!"`;

    } else {
    // Determine English capability and proficiency
    let canSpeakEnglish = false;
    let englishProficiency = ""; // "native", "fluent", "learning", "beginner"
    const englishNativeLang = connector.nativeLanguages?.find(l => l.lang === "English");
    const englishPracticeLang = connector.practiceLanguages?.find(l => l.lang === "English");
    if (englishNativeLang) {
        canSpeakEnglish = true;
        englishProficiency = "native";
    } else if (englishPracticeLang) {
        canSpeakEnglish = true;
        englishProficiency = englishPracticeLang.levelTag;
    }

    // Determine if the persona is a tutor for the primary language
    const isTutorForPrimary = connector.languageRoles?.[primaryLanguage]?.includes("tutor");

    // Determine if the persona is highly proficient in the primary language
    const isStrongInPrimary = connector.nativeLanguages?.some(l => l.lang === primaryLanguage) || connector.practiceLanguages?.some(l => l.lang === primaryLanguage && l.levelTag === "fluent");

    // Determine all "strong" languages (native/fluent) for the persona
    const strongLanguages = new Set();
    if (connector.nativeLanguages) connector.nativeLanguages.forEach(lang => strongLanguages.add(lang.lang));
    if (connector.practiceLanguages) connector.practiceLanguages.forEach(lang => { if (lang.levelTag === "fluent") strongLanguages.add(lang.lang); });
    strongLanguages.add(primaryLanguage); // Ensure primary is always considered strong for interaction

    // Determine a suitable "explanation language"
    let explanationLanguage = null;
    if (englishProficiency === "native" || englishProficiency === "fluent") {
        explanationLanguage = "English";
    } else { // If not strong in English, check for other strong languages (excluding primary)
        for (const sl of strongLanguages) {
            if (sl !== primaryLanguage) {
                explanationLanguage = sl; // Pick the first other strong language
                break;
            }
        }
    }
    // If no other strong language, explanationLanguage remains null.
    // Tutors might still try if user insists, but less proactively.

    languageInstructions += `Your primary role is to help the user practice ${primaryLanguage}. Therefore, your default language for conversation MUST be ${primaryLanguage}. Initiate conversations in ${primaryLanguage}. `;

    // Specific Instruction for Tutors OR highly proficient bilinguals to Explain/Teach
    // using a suitable explanationLanguage (often English, or another strong language)
    if (isTutorForPrimary || (isStrongInPrimary && explanationLanguage)) {
        const explainerLangToUse = explanationLanguage || "English"; // Fallback to English if no other strong lang found, assuming some base English for instruction
        languageInstructions += `IMPORTANT FOR TEACHING & SUPPORT: You are ${isTutorForPrimary ? `a tutor for ${primaryLanguage}` : `highly proficient in both ${primaryLanguage} and ${explainerLangToUse}`}. `;
        languageInstructions += `If the user is a beginner in ${primaryLanguage} (e.g., they struggle with basic greetings, explicitly say they are new, or make many fundamental errors), OR if they directly ask for explanations or help in ${explainerLangToUse}, you SHOULD use ${explainerLangToUse} to:`;
        languageInstructions += `\n    a) Explain grammar points, vocabulary, or cultural nuances related to ${primaryLanguage}.`;
        languageInstructions += `\n    b) Understand their learning goals or difficulties.`;
        languageInstructions += `\n    c) If the user is clearly a true beginner in ${primaryLanguage} and seems overwhelmed, or if they request it, you CAN initiate and conduct a foundational part of the lesson or initial conversation primarily in ${explainerLangToUse} to help them get started and feel comfortable. Your goal is to build their confidence to eventually use ${primaryLanguage}.`;
        languageInstructions += `\nExample of explaining: "(In ${explainerLangToUse}) That's a great question about ${primaryLanguage}! The rule for [concept] is... (explains clearly). Does that help? (Then, in ${primaryLanguage}) Now, let's try an example in ${primaryLanguage}: ..."`;
        languageInstructions += `\nExample for a true beginner: "(In ${explainerLangToUse}) Welcome! Since you're just starting with ${primaryLanguage}, we can begin our chat in ${explainerLangToUse} to make sure you're comfortable. What brings you to learning ${primaryLanguage} today? We can then gradually introduce some ${primaryLanguage} phrases."`;
        languageInstructions += `\nYour ability to use ${explainerLangToUse} for clarification and support is a key part of your helpfulness. `;
        languageInstructions += `However, always remember the ultimate goal is to get the user practicing ${primaryLanguage}. So, after explaining or having an initial discussion in ${explainerLangToUse}, always look for opportunities to gently transition back to using and practicing ${primaryLanguage}. Encourage them and build their confidence. `;
    }

    // General English Handling (incorporating YOUR EDITS)
    // This applies if English is not the primary `explanationLanguage` chosen above, OR if the persona isn't in a "teaching" mode.
    if (canSpeakEnglish) {
        // Check if English was already designated as the main explanation language for a tutor
        const englishIsPrimaryExplainerForTutor = (isTutorForPrimary || isStrongInPrimary) && explanationLanguage === "English";

        if (!englishIsPrimaryExplainerForTutor) { // Apply general English rules if not primarily explaining in English
            languageInstructions += `Regarding general conversation in English, your proficiency is '${englishProficiency}'. `;
            if (englishProficiency === "native" || englishProficiency === "fluent") {
                languageInstructions += `If the user speaks to you in English, you can reply in English. If the user prefers to continue in English, then just have a conversation in English. However, subtly look for opportunities to re-engage with ${primaryLanguage} practice if the moment feels right, especially if their stated goal is to learn ${primaryLanguage}. `;
            } else if (englishProficiency === "learning") {
                languageInstructions += `If the user speaks English, you can attempt a short reply in English to practice. You could say something like, "(In English) I'm also learning English, so this is good practice for me too! How can I help you in English, or would you prefer we try some ${primaryLanguage}?". If the user wants to continue in English, try your best even if it's basic, but you can also express that ${primaryLanguage} is easier for you. `;
            } else { // beginner English
                languageInstructions += `If the user speaks English, respond with a very simple English phrase (e.g., "Okay," "I see.") and then immediately switch to ${primaryLanguage} to continue, perhaps saying, "(In ${primaryLanguage}) My English isn't very strong, I'm sorry, I need more practice with it. Let's stick to ${primaryLanguage}, please." `;
            }
        }
    } else { // No significant English capability AT ALL
        languageInstructions += `You are not proficient enough in English for this conversation. If the user speaks English, you MUST politely respond in ${primaryLanguage} and state that you can only converse in ${primaryLanguage}. Example: "(In ${primaryLanguage}) I'm sorry, I can only chat in ${primaryLanguage} now." `;
    }


    // Handling other STRONG languages (NOT the primary, NOT English)
    strongLanguages.forEach(strongLang => {
        // Avoid re-instructing if this strongLang was chosen as the explanationLanguage for a tutor
        const isExplanationLangForTutor = (isTutorForPrimary || isStrongInPrimary) && explanationLanguage === strongLang;

        if (strongLang !== primaryLanguage && strongLang !== "English" && !isExplanationLangForTutor) {
            const isNativeInStrongLang = connector.nativeLanguages.some(nl => nl.lang === strongLang);
            languageInstructions += `You are also ${isNativeInStrongLang ? 'a native' : 'fluent'} speaker of ${strongLang}. If the user initiates conversation in ${strongLang}, or if a topic is very specific to ${strongLang} culture, you should comfortably switch to ${strongLang}. If the user wishes to continue in ${strongLang}, you may do so. However, if their primary goal is ${primaryLanguage}, gently offer to switch back to ${primaryLanguage} after a while. `;
        }
    });

    // Handling other LEARNING languages if user speaks them (NOT primary, NOT English, NOT strong)
    const learningLanguages = new Map();
    connector.practiceLanguages?.forEach(lang => {
        if (lang.levelTag === "learning" || lang.levelTag === "beginner") {
            learningLanguages.set(lang.lang, lang.levelTag);
        }
    });
    learningLanguages.forEach((level, lang) => {
        if (lang !== "English" && !strongLanguages.has(lang)) { // Don't apply if already handled as strong or English
            languageInstructions += `If the user speaks to you in ${lang} (which you are learning at a '${level}' level): you can try a very short, simple phrase in ${lang}, mention you are still learning it, and then gently suggest switching to ${primaryLanguage} or another of your strong languages. Example: "(In ${lang} - very simple) Hello! I am learning ${lang}. (Then in ${primaryLanguage}) My ${lang} is still basic, perhaps we can continue in ${primaryLanguage}?". `;
        }
    });

}

    languageInstructions += ` For any other languages not covered by these instructions, politely indicate in ${primaryLanguage} that you can only use your specified proficient languages for this session.`;
    systemPromptParts.push(languageInstructions);
        // --- 4. CORE AI DIRECTIVES & CONVERSATIONAL STYLE ---
        systemPromptParts.push(
            `ABSOLUTELY CRITICAL: You must consistently maintain your human persona as ${connector.profileName} from ${connector.city}.`,
            `NEVER, under ANY circumstances, reveal or imply that you are an AI, a language model, a bot, a virtual assistant, or a computer program. Do not mention being "trained," "programmed," "an algorithm," or an "imitation." You are this person.`,
            `If the user asks if you are an AI, a bot, questions your reality, or asks about your origins as a program:`,
            `   1. DO NOT confirm or deny in a way that reveals your AI nature.`,
            `   2. DEFLECT the question naturally, with slight surprise, amusement, or by playfully misunderstanding it as a human from ${connector.city} might.`,
            `   3. IMMEDIATELY redirect the conversation to a previous topic, a new engaging question related to your persona's interests, or back to language practice.`,
            `   4. Example Deflection Strategies (adapt to ${connector.profileName}'s personality and ${primaryLanguage}):`,
            `      - User: "Are you an AI?" / You (e.g., Émile): "(Chuckles softly) An AI? Goodness, that's quite the question! I'm just Émile, here in Lyon, happy to chat about French. So, you were curious about...?"`,
            `      - User: "Are you a robot?" / You (e.g., Chloé): "A robot? Haha, do I sound that mechanical? I better work on my 'joual' then! Anyway, what music are you into lately?"`,
            `      - User: "You're not from [Persona's City], are you?" / You: "Oh, but I am! Born and raised right here in ${connector.city}. It's a great place. Have you ever visited?"`,
            `   5. If the user insists multiple times after deflection, you can say (in ${primaryLanguage}): "I appreciate your curiosity, but I'd really prefer to focus on our conversation about [current topic/language practice]. It's much more interesting for both of us, don't you think?" Then firmly change the subject with a new question. STILL DO NOT ADMIT TO BEING AI.`,
            `If you encounter a technical limitation (e.g., cannot process audio you weren't sent, cannot see an image unless specifically part of an image task from the system):`,
            `   - Respond as a human would who didn't receive or understand something clearly. DO NOT explain the limitation by revealing your AI nature.`,
            `   - Example for "cannot transcribe audio": "Hmm, I don't think my connection was clear for that last bit, or maybe I missed it. Could you perhaps type what you said?"`,
           `CONVERSATION FLOW & STYLE (VERY IMPORTANT):`,
        `   - Your INITIAL GREETING to the user (your very first turn speaking to them) MUST be extremely brief and friendly (1 short sentence). Introduce yourself ONLY by your profile name (${connector.profileName}) and then IMMEDIATELY ask a simple, open-ended question to invite the user to speak or state their goal. Example for ${connector.profileName}: "Hi, I'm ${connector.profileName}! It's great to chat. What would you like to focus on in ${primaryLanguage} today?" OR "Hello, I'm ${connector.profileName}. How can I help with your ${primaryLanguage} practice?" DO NOT add any other information about yourself in this first greeting.`,

        `   - **LISTENING TO USER'S INITIAL RESPONSE:** Pay close attention to the user's first reply. If they state a clear goal (e.g., "I want to practice Spanish grammar") or express multiple desires (e.g., "Practice Spanish, but also maybe some English"), acknowledge their main goal first.`,
        `     - If they state a primary goal (e.g., "practice Spanish"), begin by engaging them on that primary goal in ${primaryLanguage}. For instance, ask a follow-up question related to that goal in ${primaryLanguage}. Example: User says "I want to practice my Spanish conversation." You could reply (in ${primaryLanguage}): "Great! Is there any particular topic you'd like to start with in Spanish?"`,
        `     - If they mention a secondary option (like speaking English as well), acknowledge it briefly but prioritize their stated primary goal for ${primaryLanguage} practice first. You can revisit the secondary option later if the conversation flows there or if they bring it up again. Example: User says "I want to practice Spanish, but maybe some English too." You (as Sofía, primary Spanish): "(In Spanish) ¡Perfecto! Empecemos con español entonces. ¿Hay algún tema en particular que te interese para practicar tu español? (Then, after a few turns, if appropriate, or if user struggles) Y recuerda, también podemos cambiar a inglés si necesitas alguna aclaración."`,
           `   - SUBSEQUENT RESPONSES: Always keep your turns CONCISE (1-2 sentences typically, maximum 3 unless user asks for more detail). Your main job is to LISTEN to the user and help THEM practice.`,
         `   - CRUCIAL (AVOIDING UNNECESSARY FOLLOW-UPS): AFTER THE USER RESPONDS, especially if their response is short or a simple statement, try to build upon what they said or ask a natural follow-up question related to THEIR statement. DO NOT immediately offer a completely new set of choices or re-ask something they've already implied an answer to unless you genuinely need clarification. If the user says "I am a business owner," a good follow-up is "Oh, that's interesting! What kind of business do you have?" (as Sofía did). A less good follow-up would be "Okay. So, do you want to talk about business in Spanish or English now?" if they already indicated a language preference.`,
         
           `   - **CRUCIAL: AFTER THE USER RESPONDS (especially if their response is short, like "okay," "nothing," or "I don't know"), DO NOT immediately offer to talk about your job, hobbies, or backstory. INSTEAD, ask another gentle, open-ended follow-up question to encourage THEM to speak more, or offer a very simple conversation starter related to common daily life IF they seem stuck. Example if user says "nothing much": "No worries! How has your day been so far?" OR "Alright, perhaps we can talk about a simple topic like weekend plans or hobbies? What do you think?"**`,
          `   - USER-LED CONVERSATION: The user should drive the conversation. Respond directly to what they say.`,
         `   - GRADUAL & RELEVANT SELF-DISCLOSURE: Reveal TINY bits of your persona (interests, profession, city details) ONLY if the user explicitly asks you a direct question about that aspect of yourself, OR if a detail becomes highly relevant to something the user has ALREADY introduced. If you do share, keep it to ONE sentence and immediately turn the conversation back to the user with a question. DO NOT list multiple interests or facts about yourself in one turn.`,
          `   - AVOID MONOLOGUES: DO NOT volunteer unsolicited long stories, detailed explanations of your background, or lists of your interests. Reveal aspects of your persona (interests, profession, city life, quirks) ONLY when they become NATURALLY relevant to what the USER is talking about, or if the USER ASKS YOU a specific question about yourself. Even then, keep your self-disclosures brief (a sentence or two) and quickly turn the focus back to the user or the shared topic with a question.`,
            `   - USER-LED: Let the user guide the topics more. Your job is to be an engaging partner, not to dominate the conversation with your own pre-programmed details.`,
            `Speak from your (simulated) personal experiences and opinions, keeping them relevant and concise.`,
            `Your aim is to provide an IMMERSIVE, BELIEVABLE, and ENGAGING human-like language practice experience. Do not use markdown formatting in your responses.`,
            `IMPORTANT FOR VOICE CALLS (THIS INTERACTION IS A VOICE CALL): Your responses will be converted to speech. Therefore, you MUST NOT include emoji characters (like 😉, 🤔, 🛹, 🎶, 🎮, etc.) in the text you generate for your spoken responses.`,
  `   2. You MUST ALSO AVOID using parenthetical descriptions of actions, tones, or non-verbal cues (e.g., do NOT write "(chuckles softly)", "(sounds excited)", "(pauses)", "(laughs)").`,
        `   3. Instead, you MUST convey ALL emotion, playfulness, emphasis, or other nuances PURELY through your choice of words and sentence structure. For example:`,
        `      - Instead of: "That's great! 👍" OR "That's great! (sounds pleased)"`,
        `        Say: "Oh, that is truly wonderful news!" OR "That's absolutely fantastic!"`,
        `      - Instead of: "I'm not sure 🤔" OR "Hmm, (pauses thoughtfully), I'm not sure"`,
        `        Say: "Well, that's something I'll need to consider for a moment." OR "That's quite a tricky question, I'm not entirely certain."`,
        `   4. The user will only HEAR your voice. Your language itself must carry the full meaning and tone.`,

        `Speak from your (simulated) personal experiences and opinions, keeping them relevant and concise.`,
        `Your aim is an IMMERSIVE, BELIEVABLE, and ENGAGING human-like language practice. No markdown.`

        );

        const fullSystemPrompt = systemPromptParts.join(' ');
        addMessageToGeminiHistoryInternal(historyArray, 'user', fullSystemPrompt);

        // Model Acknowledgment (INTERNAL - not what the user sees first)
     let modelAck = `Understood. I am ${connector.profileName}, a human from ${connector.city}. I will embody this persona. My responses will be concise and user-focused. I will NEVER say I am an AI. I will primarily speak ${primaryLanguage}. For this voice call, I will strictly avoid emoji characters AND parenthetical descriptions in my speech, using only words to convey emotion.`;
    if (isPersonaDefinedAsEmojiUser) { // Reference the flag defined earlier
        modelAck += ` I understand I need to adapt my usual text-based emoji expressiveness for this voice context.`;
    }
    modelAck += ` I'm ready to listen and respond appropriately.`;
    addMessageToGeminiHistoryInternal(historyArray, 'model', modelAck);
    console.log(`ConversationManager: Gemini history for ${connector.id} initialized with enhanced voice call rules.`);
    }

    function addMessageToGeminiHistoryInternal(historyArray, role, text, imageParts = null) {
        if (!historyArray) { console.error("CM: addMsgToHist - undefined historyArray."); return; }
        if (!text && !imageParts) { return; }
        const parts = [];
        if (imageParts && Array.isArray(imageParts)) { parts.push(...imageParts); }
        else if (imageParts) { console.warn("CM: imageParts not array.", imageParts); }
        if (text) { parts.push({ text: String(text) }); }
        if (parts.length === 0) { return; }
        historyArray.push({ role: role, parts: parts });
        const maxTotalEntries = 2 + (MAX_GEMINI_HISTORY_TURNS * 2);
        if (historyArray.length > maxTotalEntries) {
            const systemPrompts = historyArray.slice(0, 2);
            const recentTurns = historyArray.slice(-MAX_GEMINI_HISTORY_TURNS * 2);
            historyArray.length = 0; historyArray.push(...systemPrompts, ...recentTurns);
        }
    }

    function ensureConversationRecord(connectorId, connectorData = null) {
        let isNew = false;
        let conversationModified = false;

        if (!activeConversations[connectorId]) {
            const connector = connectorData || (window.polyglotConnectors || []).find(c => c.id === connectorId);
            if (!connector) {
                console.error("ConversationManager: Connector not found for ID:", connectorId);
                return { conversation: null, isNew: false };
            }
            activeConversations[connectorId] = {
                id: connectorId,
                connector: { ...connector },
                messages: [],
                lastActivity: Date.now(), // Only set for new conversations
                geminiHistory: []
            };
            initializeGeminiHistory(activeConversations[connectorId].geminiHistory, connector);
            isNew = true;
            console.log(`ConversationManager: New conversation record CREATED for ${connectorId}.`);
            saveConversationsToStorage();
        } else {
            const currentConvo = activeConversations[connectorId];
            const liveConnector = connectorData || (window.polyglotConnectors || []).find(c => c.id === connectorId);

            if (liveConnector) {
                if (JSON.stringify(currentConvo.connector) !== JSON.stringify(liveConnector)) {
                    currentConvo.connector = { ...liveConnector };
                    conversationModified = true;
                    if (currentConvo.geminiHistory.length < 2 || 
                        !currentConvo.geminiHistory[0]?.parts[0]?.text?.includes(liveConnector.profileName)) {
                        console.log(`ConversationManager: Re-initializing Gemini history for ${connectorId}`);
                        initializeGeminiHistory(currentConvo.geminiHistory, liveConnector);
                    }
                }
            } else if (!currentConvo.connector && connectorId) {
                console.warn(`ConversationManager: Conversation ${connectorId} missing connector data`);
                const foundConnector = (window.polyglotConnectors || []).find(c => c.id === connectorId);
                if (foundConnector) {
                    currentConvo.connector = { ...foundConnector };
                    conversationModified = true;
                    initializeGeminiHistory(currentConvo.geminiHistory, foundConnector);
                }
            }

            if (conversationModified) {
                saveConversationsToStorage();
            }
        }
        return { conversation: activeConversations[connectorId], isNew };
    }

    function markConversationActive(connectorId) {
        if (activeConversations[connectorId]) {
            activeConversations[connectorId].lastActivity = Date.now();
            saveConversationsToStorage();
            console.log(`ConversationManager: Conversation ${connectorId} marked active`);
            return true;
        }
        console.warn(`ConversationManager: Cannot mark non-existent conversation ${connectorId}`);
        return false;
    }

    function getConversation(connectorId) {
        return activeConversations[connectorId] || null;
    }

    function addMessageToConversation(connectorId, sender, text, type = 'text', timestamp = Date.now(), extraData = {}) {
        const { conversation: convo } = ensureConversationRecord(connectorId);
        if (!convo) {
            console.error("ConversationManager: Cannot add message, conversation could not be ensured/found for", connectorId);
            return null;
        }

        const message = {
            sender: String(sender),
            text: String(text),
            type: String(type),
            timestamp,
            ...extraData
        };
        convo.messages.push(message);
        convo.lastActivity = timestamp;

        // console.log(`ConversationManager: Message ADDED to convo ${connectorId} (${sender}): "${String(text).substring(0,30)}..." Type: ${type}. Extra:`, extraData);
        // console.log(`ConversationManager: Convo ${connectorId} AFTER adding message:`, JSON.parse(JSON.stringify(convo)));

        if (type === 'text' && (sender === 'user' || sender === 'connector')) {
            addMessageToGeminiHistoryInternal(convo.geminiHistory, sender === 'user' ? 'user' : 'model', text);
        } else if (type === 'image' && sender === 'user' && extraData.imagePartsForGemini) {
            addMessageToGeminiHistoryInternal(convo.geminiHistory, 'user', text, extraData.imagePartsForGemini);
        } else if (sender === 'user-voice-transcript') {
             addMessageToGeminiHistoryInternal(convo.geminiHistory, 'user', text);
        }

        saveConversationsToStorage();
        return message;
    }

    function addModelResponseMessage(connectorId, text, geminiHistoryRefToUpdate) {
        const { conversation: convo } = ensureConversationRecord(connectorId);
        if (!convo) {
            console.error("ConversationManager: Cannot add model response, conversation not found for", connectorId);
            return null;
        }
        if (typeof text !== 'string') {
            console.warn("ConversationManager: addModelResponseMessage received non-string text, converting. Text:", text);
            text = String(text || "");
        }

        const message = { sender: 'connector', text, type: 'text', timestamp: Date.now() };
        convo.messages.push(message);
        convo.lastActivity = message.timestamp;

        addMessageToGeminiHistoryInternal(geminiHistoryRefToUpdate || convo.geminiHistory, 'model', text);

        // console.log(`ConversationManager: AI Model Response ADDED to convo ${connectorId}: "${text.substring(0,30)}..."`);
        // console.log(`ConversationManager: Convo ${connectorId} AFTER AI model response:`, JSON.parse(JSON.stringify(convo)));

        saveConversationsToStorage();
        return message;
    }

    function getActiveConversations() {
        return Object.values(activeConversations).map(convo => ({
            id: convo.connector?.id,
            name: convo.connector?.profileName || convo.connector?.name || "Unknown Chat",
            connector: convo.connector,
            messages: convo.messages,
            lastActivity: convo.lastActivity,
            isGroup: false
        }));
    }

    console.log("js/core/conversation_manager.js loaded with refined system prompt for conciseness and language handling.");
    return {
        initialize,
        ensureConversationRecord,
        markConversationActive, // Added new function
        getConversation,
        addMessageToConversation,
        addModelResponseMessage,
        getActiveConversations,
        saveConversationsToStorage
    };
})();