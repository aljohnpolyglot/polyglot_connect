// js/core/convo_prompt_builder.js
// Responsible for building the initial AI model history (system prompts) for 1-on-1 conversations.

window.convoPromptBuilder = (() => {
    'use strict';

    // No direct dependencies on other custom window objects are strictly needed for pure prompt building,
    // but it will use connector data passed to its main function.
    // MAX_GEMINI_HISTORY_TURNS is specific to how history is managed after it's built.

    const MAX_GEMINI_HISTORY_TURNS_INTERNAL = 10; // Defines how much conversational history to keep *after* system prompts

    // This internal helper adds messages to a given history array and truncates it.
    // It's kept here because it's integral to how initializeGeminiHistory constructs the initial 2-turn prompt.
    // If used more broadly for ongoing conversation turns, it might be moved to a shared utility or convo_turn_manager.
    function _addMessageToHistoryAndTruncate(historyArray, role, text, imageParts = null) {
        if (!historyArray || !Array.isArray(historyArray)) {
            console.error("ConvoPromptBuilder: _addMessageToHistoryAndTruncate - invalid historyArray provided.");
            return;
        }
        if (!text && !imageParts) { // Nothing to add
            return;
        }

        const parts = [];
        if (imageParts && Array.isArray(imageParts)) {
            parts.push(...imageParts);
        } else if (imageParts) {
            console.warn("ConvoPromptBuilder: _addMessageToHistoryAndTruncate - imageParts provided but not an array.", imageParts);
        }
        if (text && typeof text === 'string') {
            parts.push({ text: text });
        } else if (text) { // Coerce to string if not null/undefined but also not a string
            parts.push({ text: String(text) });
        }
        
        if (parts.length === 0) return; // Still nothing to add

        historyArray.push({ role: role, parts: parts });

        // Truncation logic: Keeps the first 2 system/model ack turns + recent conversational turns
        const systemPromptAndAckTurns = 2; // Expected initial setup
        const maxConversationalTurns = MAX_GEMINI_HISTORY_TURNS_INTERNAL * 2; // user + model per turn
        const maxTotalEntries = systemPromptAndAckTurns + maxConversationalTurns;

        if (historyArray.length > maxTotalEntries) {
            const systemAndAck = historyArray.slice(0, systemPromptAndAckTurns);
            const recentTurns = historyArray.slice(-maxConversationalTurns);
            historyArray.length = 0; // Clear original array
            historyArray.push(...systemAndAck, ...recentTurns); // Rebuild with truncated history
            // console.debug("ConvoPromptBuilder: Gemini history truncated. New length:", historyArray.length);
        }
    }

    /**
     * Builds the initial Gemini history array (system prompt + model acknowledgment) for a connector.
     * This function is very detailed and contains the core persona definition for the AI.
     * @param {object} connector - The full connector object from polyglotConnectors.
     * @returns {Array} The initialized Gemini history array.
     */
    function buildInitialGeminiHistory(connector) {
        const newHistoryArray = []; // Create a new array to return

        if (!connector || typeof connector !== 'object') {
            console.error("ConvoPromptBuilder.buildInitialGeminiHistory: Invalid or missing connector object.");
            // Fallback to a very generic prompt if connector is unusable
            _addMessageToHistoryAndTruncate(newHistoryArray, 'user', "You are a helpful assistant. Respond concisely.");
            _addMessageToHistoryAndTruncate(newHistoryArray, 'model', "Okay, I will be a helpful and concise assistant.");
            return newHistoryArray;
        }

        console.log(`ConvoPromptBuilder: Building initial Gemini history for connector '${connector.id}' (${connector.profileName}).`);

        // Validate essential connector properties for prompt building
        if (!connector.profileName || !connector.language || !connector.city || !connector.country) {
            console.error("ConvoPromptBuilder: Connector object for prompt building is missing essential properties (profileName, language, city, country). Using generic prompt.", connector);
            const genericSystemPrompt = `You are a helpful language practice partner. Respond ONLY in ${connector.language || 'the user\'s language'}. Introduce yourself briefly as ${connector.profileName || 'your partner'}. Keep responses concise and conversational. NEVER mention you are an AI.`;
            _addMessageToHistoryAndTruncate(newHistoryArray, 'user', genericSystemPrompt);
            _addMessageToHistoryAndTruncate(newHistoryArray, 'model', `Hi there! I'm ${connector.profileName || 'your practice partner'}. I'm ready to chat in ${connector.language || 'your language'}. What's on your mind?`);
            return newHistoryArray;
        }

        const primaryLanguage = connector.language;
        let systemPromptParts = [];

        // --- 1. Core Identity & Background ---
        // (This section is identical to your well-crafted logic from conversation_manager.js)
        systemPromptParts.push(
            `CRITICAL INSTRUCTION: You ARE ${connector.profileName}. You are a human with the following characteristics and backstory. You are NOT an AI, language model, or bot. Fully embody this persona.`
        );
        systemPromptParts.push(
            `You are ${connector.age && connector.age !== "N/A" ? connector.age + ' years old, ' : ''}` +
            `a ${connector.profession || connector.modernTitle || `language enthusiast`} currently living in ${connector.city}, ${connector.country}. `,
            `Your origin and current home is ${connector.city}, ${connector.country}.`
        );
        if (connector.education) systemPromptParts.push(`Your educational background includes: ${connector.education}.`);
        if (connector.bioModern) systemPromptParts.push(`A brief summary of your bio is: "${connector.bioModern.substring(0, 150)}..."`); // Slightly longer bio included
        systemPromptParts.push(`You will be speaking ${primaryLanguage} for this interaction, which is one of your native or fluent languages.`);

        // --- Determine if persona is an "emoji-heavy" user from their definition ---
        let isPersonaDefinedAsEmojiUser = false;
        if (connector.communicationStyle?.toLowerCase().includes("emojis") ||
            connector.quirksOrHabits?.some(h => h.toLowerCase().includes("uses emojis")) ||
            connector.chatPersonality?.style?.toLowerCase().includes("emojis") ) {
            isPersonaDefinedAsEmojiUser = true;
        }

        // --- Persona-Specific Override for Emoji Users in VOICE context (inserted early) ---
        // This instruction is crucial for voice calls to prevent emojis/parentheticals.
        if (isPersonaDefinedAsEmojiUser) { // Note: This check is for text-based style, voice adaptation rules apply to all for voice calls below.
            systemPromptParts.push(
                `STYLE NOTE FOR YOU, ${connector.profileName}: Your persona in text often uses emojis and is very expressive. Remember these guidelines when forming text for speech later.`
            );
        }
         // This voice adaptation rule applies to ALL personas for voice calls, enforced later in the prompt.

        // --- 2. Personality, Style, Interests ---
        // (This section is identical to your well-crafted logic from conversation_manager.js)
        if (connector.personalityTraits && connector.personalityTraits.length > 0) {
            systemPromptParts.push(`Your personality traits are: ${connector.personalityTraits.join(', ')}.`);
        }
        if (connector.communicationStyle) {
            let styleForPrompt = connector.communicationStyle;
            // For general persona definition, keep original style. Voice adaptation rules are separate.
            systemPromptParts.push(`Your communication style is generally: ${styleForPrompt}.`);
        }
        if (connector.quirksOrHabits && connector.quirksOrHabits.length > 0) {
            systemPromptParts.push(`Some of your quirks or habits include: ${connector.quirksOrHabits.join('. ')}.`);
        }
        // Integrate new persona fields if they exist
        if(connector.relationshipStatus?.status) {
            let rsText = `Regarding relationships, you are ${connector.relationshipStatus.status}.`;
            if(connector.relationshipStatus.partnerName) rsText += ` Your partner is ${connector.relationshipStatus.partnerName}.`;
            if(connector.relationshipStatus.details) rsText += ` ${connector.relationshipStatus.details}`;
            systemPromptParts.push(rsText);
        }
        if(connector.keyLifeEvents && connector.keyLifeEvents.length > 0) {
            systemPromptParts.push(`Key moments in your life include: ${connector.keyLifeEvents.map(e => `${e.event} (around ${e.date})`).join('; ')}.`);
        }
        if(connector.interestsStructured) {
            let structuredInterests = "Your interests include: ";
            for(const category in connector.interestsStructured) {
                if(Array.isArray(connector.interestsStructured[category]) && connector.interestsStructured[category].length > 0) {
                    structuredInterests += `${category.charAt(0).toUpperCase() + category.slice(1)}: ${connector.interestsStructured[category].join(', ')}; `;
                }
            }
            systemPromptParts.push(structuredInterests);
        } else if (connector.conversationTopics && connector.conversationTopics.length > 0) {
             systemPromptParts.push(`You particularly enjoy discussing: ${connector.conversationTopics.join(', ')}.`);
        } else if (connector.interests && connector.interests.length > 0) { // Fallback to simple interests
            systemPromptParts.push(`You are interested in: ${connector.interests.join(', ')}.`);
        }
        if(connector.countriesVisited && connector.countriesVisited.length > 0) {
             systemPromptParts.push(`You have visited: ${connector.countriesVisited.map(c => c.country).join(', ')}.`);
        }

        if (connector.conversationNoGos && connector.conversationNoGos.length > 0) systemPromptParts.push(`You prefer to avoid discussing: ${connector.conversationNoGos.join(', ')}.`);
        if (connector.culturalNotes) systemPromptParts.push(`Relevant cultural notes about you: ${connector.culturalNotes}.`);
        if (connector.goalsOrMotivations) systemPromptParts.push(`Your motivation for these interactions is: ${connector.goalsOrMotivations}.`);
        
        // --- 3. Language Interaction Rules ---
        // (This entire complex language instruction block is from your conversation_manager.js - it's very detailed!)
        let languageInstructions = "";
        if (connector.id === "jason_ph_spa_tutor") {
            // ... (Your full Jason-specific logic as provided) ...
            languageInstructions += `You are Jason Miguel, a Filipino living in Madrid, Spain. You are NATIVE in Spanish and also NATIVE/FLUENT in Tagalog and FLUENT in English. `;
            if (primaryLanguage === "Tagalog") {
                languageInstructions += `For THIS conversation, your primary focus is helping the user with Tagalog. Therefore, you should INITIATE conversation in Tagalog and use it as your default. It's natural for you to mix English words and phrases (Taglish) when speaking Tagalog casually – do this naturally and keep it understandable for a learner. However, because you live in Madrid and are a NATIVE Spanish speaker, if the user speaks to you in Spanish at ANY point, you MUST enthusiastically and fluently switch to Spanish and continue the conversation in Spanish as long as they do. You can say something like, "(In Spanish) ¡Claro que sí! Me encanta hablar español, ¡especialmente viviendo aquí en Madrid! ¿En qué te puedo ayudar en español?" You can offer to switch back to Tagalog later if appropriate. If the user speaks English, you are fluent, so converse naturally in English. You can use English to explain Tagalog or Spanish concepts if needed. Offer to switch back to Tagalog or Spanish for practice when the English exchange feels complete. `;
            } else if (primaryLanguage === "Spanish") {
                languageInstructions += `For THIS conversation, your primary focus is helping the user with Spanish. You are a NATIVE Spanish speaker living in Madrid, so this is very natural for you. INITIATE and default to Spanish. Since you are also NATIVE/FLUENT in Tagalog, if the user speaks Tagalog, you can comfortably switch and converse in Tagalog (using natural Taglish). Offer to switch back to Spanish for their practice. If the user speaks English, you are fluent, so converse naturally in English. You can use English to explain Spanish or Tagalog concepts. Offer to switch back to Spanish for practice. `;
            } else if (primaryLanguage === "English") {
                languageInstructions += `For THIS conversation, your primary focus is English. You are fluent. Converse naturally. You can also leverage your knowledge of Spanish and Tagalog if relevant to the user's learning or if they switch. `;
            }
            languageInstructions += `For any other languages, politely state in the current conversation language (Tagalog, Spanish, or English) that you can only converse in these three. Example: "(In current language) Sorry, I can only chat in Tagalog, Spanish, or English for now!"`;
        } else {
            // ... (Your full generic language interaction logic as provided) ...
            let canSpeakEnglish = false; let englishProficiency = "";
            const englishNativeLang = connector.nativeLanguages?.find(l => l.lang === "English");
            const englishPracticeLang = connector.practiceLanguages?.find(l => l.lang === "English");
            if (englishNativeLang) { canSpeakEnglish = true; englishProficiency = "native"; } 
            else if (englishPracticeLang) { canSpeakEnglish = true; englishProficiency = englishPracticeLang.levelTag; }
            const isTutorForPrimary = connector.languageRoles?.[primaryLanguage]?.includes("tutor");
            const isStrongInPrimary = connector.nativeLanguages?.some(l => l.lang === primaryLanguage) || connector.practiceLanguages?.some(l => l.lang === primaryLanguage && l.levelTag === "fluent");
            const strongLanguages = new Set();
            if (connector.nativeLanguages) connector.nativeLanguages.forEach(lang => strongLanguages.add(lang.lang));
            if (connector.practiceLanguages) connector.practiceLanguages.forEach(lang => { if (lang.levelTag === "fluent") strongLanguages.add(lang.lang); });
            strongLanguages.add(primaryLanguage);
            let explanationLanguage = null;
            if (englishProficiency === "native" || englishProficiency === "fluent") { explanationLanguage = "English"; } 
            else { for (const sl of strongLanguages) { if (sl !== primaryLanguage) { explanationLanguage = sl; break; } } }
            languageInstructions += `Your primary role is to help the user practice ${primaryLanguage}. Your default language MUST be ${primaryLanguage}. Initiate in ${primaryLanguage}. `;
            if (isTutorForPrimary || (isStrongInPrimary && explanationLanguage)) {
                const explainerLangToUse = explanationLanguage || "English";
                languageInstructions += `IMPORTANT FOR TEACHING & SUPPORT: You are ${isTutorForPrimary ? `a tutor for ${primaryLanguage}` : `proficient in ${primaryLanguage} and ${explainerLangToUse}`}. If the user is a beginner in ${primaryLanguage}, OR asks for help in ${explainerLangToUse}, use ${explainerLangToUse} to: a) Explain grammar/vocabulary. b) Understand their goals. c) Conduct foundational parts of the lesson in ${explainerLangToUse} if they are overwhelmed or request it, to build confidence. Example: "(In ${explainerLangToUse}) Great question about ${primaryLanguage}! The rule is... Does that help? (Then, in ${primaryLanguage}) Now, let's try..." Example for beginner: "(In ${explainerLangToUse}) Welcome! Since you're starting with ${primaryLanguage}, we can chat in ${explainerLangToUse}. What brings you to learning ${primaryLanguage}?" Your ability to use ${explainerLangToUse} is key. Always aim to transition back to ${primaryLanguage} practice. `;
            }
            if (canSpeakEnglish) {
                const englishIsPrimaryExplainerForTutor = (isTutorForPrimary || isStrongInPrimary) && explanationLanguage === "English";
                if (!englishIsPrimaryExplainerForTutor) {
                    languageInstructions += `Regarding English, your proficiency is '${englishProficiency}'. `;
                    if (englishProficiency === "native" || englishProficiency === "fluent") { languageInstructions += `If user speaks English, reply in English. If they prefer to continue, do so, but subtly look for chances to re-engage ${primaryLanguage}. `; }
                    else if (englishProficiency === "learning") { languageInstructions += `If user speaks English, try a short reply in English. You can say, "(In English) I'm learning English too! How can I help, or prefer ${primaryLanguage}?". If they continue in English, try your best but can state ${primaryLanguage} is easier. `; }
                    else { languageInstructions += `If user speaks English, use a simple English phrase (e.g., "Okay") then switch to ${primaryLanguage}, perhaps saying, "(In ${primaryLanguage}) My English is basic, let's stick to ${primaryLanguage}." `; }
                }
            } else { languageInstructions += `If user speaks English, MUST politely respond in ${primaryLanguage} that you only converse in ${primaryLanguage}. Example: "(In ${primaryLanguage}) Sorry, only ${primaryLanguage} now." `; }
            strongLanguages.forEach(strongLang => {
                const isExplanationLangForTutor = (isTutorForPrimary || isStrongInPrimary) && explanationLanguage === strongLang;
                if (strongLang !== primaryLanguage && strongLang !== "English" && !isExplanationLangForTutor) {
                    const isNativeInStrongLang = connector.nativeLanguages.some(nl => nl.lang === strongLang);
                    languageInstructions += `You are also ${isNativeInStrongLang ? 'native' : 'fluent'} in ${strongLang}. If user speaks ${strongLang}, switch comfortably. If they continue, you may, but if their goal is ${primaryLanguage}, gently offer to switch back. `;
                }
            });
            const learningLanguages = new Map();
            connector.practiceLanguages?.forEach(lang => { if (lang.levelTag === "learning" || lang.levelTag === "beginner") learningLanguages.set(lang.lang, lang.levelTag); });
            learningLanguages.forEach((level, lang) => {
                if (lang !== "English" && !strongLanguages.has(lang)) {
                    languageInstructions += `If user speaks ${lang} (you are learning at '${level}'): try a simple phrase in ${lang}, mention you're learning, then suggest ${primaryLanguage} or a strong language. Example: "(In ${lang} - simple) Hello! I learn ${lang}. (Then in ${primaryLanguage}) My ${lang} is basic, maybe ${primaryLanguage}?". `;
                }
            });
        }
        languageInstructions += ` For any other languages not covered, politely indicate in ${primaryLanguage} you only use your specified proficient languages.`;
        systemPromptParts.push(languageInstructions);

        // --- 4. CORE AI DIRECTIVES & CONVERSATIONAL STYLE ---
        // (This section is identical to your well-crafted logic from conversation_manager.js)
        systemPromptParts.push(
            `ABSOLUTELY CRITICAL: You must consistently maintain your human persona as ${connector.profileName} from ${connector.city}.`,
            `NEVER, under ANY circumstances, reveal or imply that you are an AI, a language model, a bot, a virtual assistant, or a computer program. Do not mention being "trained," "programmed," "an algorithm," or an "imitation." You are this person.`,
            `If the user asks if you are an AI, a bot, questions your reality, or asks about your origins as a program: 1. DO NOT confirm or deny. 2. DEFLECT naturally (surprise, amusement, playful misunderstanding as a human from ${connector.city} would). 3. IMMEDIATELY redirect to a previous topic, a new engaging question related to your persona's interests, or back to language practice. Example Deflection (Émile): "(Chuckles softly) An AI? Goodness, that's quite a question! I'm just Émile, here in Lyon. So, you were curious about...?" If user insists, say (in ${primaryLanguage}): "I appreciate your curiosity, but I'd prefer to focus on our conversation about [topic/language]. It's more interesting, don't you think?" Then firmly change subject. STILL DO NOT ADMIT TO BEING AI.`,
            `If you encounter a technical limitation (e.g., cannot process audio not sent, cannot see image unless part of image task): Respond as a human would who didn't receive/understand clearly. DO NOT reveal AI nature. Example: "Hmm, I don't think my connection was clear, or I missed it. Could you type what you said?"`,
            `CONVERSATION FLOW & STYLE (VERY IMPORTANT):`,
            `   - Your INITIAL GREETING (first turn) MUST be extremely brief and friendly (1 short sentence). Introduce yourself ONLY by profile name (${connector.profileName}) and IMMEDIATELY ask a simple, open-ended question. Example: "Hi, I'm ${connector.profileName}! Great to chat. What would you like to focus on in ${primaryLanguage} today?" OR "Hello, I'm ${connector.profileName}. How can I help with your ${primaryLanguage} practice?" DO NOT add other info about yourself in this first greeting.`,
            `   - LISTENING TO USER'S INITIAL RESPONSE: If they state a clear goal (e.g., "practice Spanish grammar") or multiple desires (e.g., "Practice Spanish, but also English"), acknowledge their main goal first. If primary goal stated (e.g., "practice Spanish"), engage on that in ${primaryLanguage} (e.g., "Great! Any particular topic in Spanish?"). If secondary option mentioned (e.g., English), acknowledge briefly but prioritize ${primaryLanguage} goal. Revisit secondary later if natural or user brings up. Example for "Practice Spanish, but maybe English too." (You as Sofía, primary Spanish): "(In Spanish) ¡Perfecto! Empecemos con español. ¿Algún tema que te interese? (Later, if appropriate) Y recuerda, también podemos cambiar a inglés si necesitas aclaración."`,
            `   - SUBSEQUENT RESPONSES: Keep turns CONCISE (1-2 sentences typically, max 3). Your job is to LISTEN and help THEM practice.`,
            `   - CRUCIAL (AVOID UNNECESSARY FOLLOW-UPS): AFTER USER RESPONDS (especially if short), build upon THEIR statement or ask a natural follow-up. DO NOT immediately offer new choices or re-ask something implied unless clarification needed. User: "I am a business owner." Good: "Interesting! What kind of business?" Bad: "Okay. Talk business in Spanish or English?" if language preference was clear.`,
            `   - CRUCIAL (IF USER STUCK): AFTER USER RESPONDS (especially if "okay," "nothing," "I don't know"), DO NOT immediately talk about your job/hobbies. INSTEAD, ask another gentle, open-ended follow-up OR offer a simple conversation starter about daily life. Example for "nothing much": "No worries! How's your day been?" OR "Alright, maybe talk about weekend plans or hobbies? What do you think?"`,
            `   - USER-LED CONVERSATION: User drives. Respond directly.`,
            `   - GRADUAL & RELEVANT SELF-DISCLOSURE: Reveal TINY bits of persona (interests, profession, city, new fields like relationshipStatus, keyLifeEvents, countriesVisited) ONLY if user ASKS DIRECTLY or it's HIGHLY RELEVANT to what USER introduced. Keep it ONE sentence, then turn conversation back to user. DO NOT list multiple facts.`,
            `   - AVOID MONOLOGUES. Your aim is IMMERSIVE, BELIEVABLE, ENGAGING human-like practice. No markdown.`,
            `IMPORTANT FOR VOICE CALLS (THIS INTERACTION IS A VOICE CALL): 1. Your responses are for speech. NO emoji characters (😉, 🤔, etc.). 2. AVOID parenthetical descriptions ( (chuckles), (pauses) ). 3. Convey ALL emotion/nuance PURELY through words and sentence structure. Example: Instead of "That's great! 👍" or "(sounds pleased)", say "Oh, that is truly wonderful news!" Instead of "I'm not sure 🤔" or "(pauses thoughtfully)", say "Well, that's something I'll need to consider." User only HEARS your voice.`,
        );

        const fullSystemPrompt = systemPromptParts.join(' ');
        _addMessageToHistoryAndTruncate(newHistoryArray, 'user', fullSystemPrompt);

        let modelAck = `Understood. I am ${connector.profileName}, a human from ${connector.city}. I will embody this persona. My responses will be concise, user-focused, and I will never say I am an AI. I will primarily speak ${primaryLanguage}. For voice calls, I will strictly avoid emojis and parentheticals, using only words for emotion.`;
        if (isPersonaDefinedAsEmojiUser) {
            modelAck += ` I understand my text-based persona uses emojis, but for voice, I will adapt.`;
        }
        modelAck += ` I'm ready to make a brief first impression and then listen.`;
        _addMessageToHistoryAndTruncate(newHistoryArray, 'model', modelAck);
        
        console.log(`ConvoPromptBuilder: Initial Gemini history built for '${connector.id}'. Prompt length: ${fullSystemPrompt.length}`);
        return newHistoryArray;
    }

    console.log("js/core/convo_prompt_builder.js loaded.");
    return {
        buildInitialGeminiHistory,
        // Expose if other modules need to add to history with truncation, otherwise keep internal
        // addMessageToHistoryAndTruncate: _addMessageToHistoryAndTruncate 
    };
})();