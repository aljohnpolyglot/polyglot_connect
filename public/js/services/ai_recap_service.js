// js/services/ai_recap_service.js
// Handles generation of session recaps using Groq/Llama or potentially other OpenAI-compatible providers.

window.aiRecapService = (() => {
    'use strict';

    // --- Robust Dependency Check ---
    if (!window._openaiCompatibleApiCaller || !window._aiApiConstants) {
        console.error("AI Recap Service: CRITICAL - Core API utilities (_openaiCompatibleApiCaller or _aiApiConstants) not found. Recap generation will fail or be non-functional.");
        // Define a dummy function that will return a default error structure
        return {
            generateSessionRecap: async (fullCallTranscript, connector, provider = "UnknownProvider") => {
                console.error("AI Recap Service called in error state (missing dependencies).");
                return { // Return a structure consistent with expected successful/failed output
                    conversationSummary: `Recap service is not properly initialized for ${provider}. Please check critical dependencies like _openaiCompatibleApiCaller and _aiApiConstants.`,
                    keyTopicsDiscussed: ["Initialization Error"],
                    newVocabularyAndPhrases: [],
                    goodUsageHighlights: [],
                    areasForImprovement: [],
                    suggestedPracticeActivities: [],
                    overallEncouragement: "Please report this initialization issue."
                };
            }
        };
    }

    const callOpenAICompatibleAPI = window._openaiCompatibleApiCaller;
    // Destructure necessary constants after ensuring _aiApiConstants exists
    const { PROVIDERS, GROQ_MODELS, TOGETHER_MODELS } = window._aiApiConstants; 
    // API keys are accessed via window object directly in the call

    const MIN_TRANSCRIPT_TURNS_FOR_DETAILED_RECAP = 4; // e.g., 2 user turns and 2 AI turns

    const defaultErrorRecapStructure = (providerName = "AI", specificMessage = "Debrief generation encountered an unexpected issue.") => ({
        conversationSummary: specificMessage.startsWith("Debrief generation failed") ? specificMessage : `Debrief generation failed with ${providerName}. ${specificMessage}`,
        keyTopicsDiscussed: ["N/A - Error"],
        newVocabularyAndPhrases: [],
        goodUsageHighlights: [],
        areasForImprovement: [],
        suggestedPracticeActivities: [],
        overallEncouragement: "An error occurred while generating the debrief. Please try a new session. If the issue persists, it might be a temporary problem with the service."
    });

    // Helper function to clean JSON strings, removing BOM and trimming control/whitespace
    function cleanJsonString(str) {
        if (typeof str !== 'string') {
            console.warn(`aiRecapService cleanJsonString: input was not a string, type: ${typeof str}. Returning as is.`);
            return str;
        }
        let originalLength = str.length;
        let cleanedStr = str;

        // Remove BOM (Byte Order Mark) - common issue from some APIs/encodings
        if (cleanedStr.charCodeAt(0) === 0xFEFF || cleanedStr.charCodeAt(0) === 0xFFFE) {
            cleanedStr = cleanedStr.substring(1);
        }
        // Aggressively trim whitespace and common control characters (like null bytes, etc.) from start and end.
        // \p{C} matches Unicode "Control" characters. The 'u' flag is essential for \p.
        cleanedStr = cleanedStr.replace(/^[\s\p{C}]+/u, '').replace(/[\s\p{C}]+$/u, '');
        
        if (cleanedStr.length !== originalLength) {
            // console.debug(`aiRecapService cleanJsonString: String cleaned. Length change: ${originalLength} -> ${cleanedStr.length}`);
        }
        return cleanedStr;
    }
    
    async function generateSessionRecap(fullCallTranscript, connector, provider = PROVIDERS.GROQ) {
        if (!connector || !connector.id || !connector.language || !connector.profileName) {
            console.warn("aiRecapService.generateSessionRecap: Connector info is incomplete or missing.", connector);
            return defaultErrorRecapStructure(provider, "Connector information missing for recap generation.");
        }
        if (!fullCallTranscript || !Array.isArray(fullCallTranscript)) {
            console.warn(`aiRecapService.generateSessionRecap: No transcript provided or invalid format for connector ${connector.id}.`);
            return defaultErrorRecapStructure(provider, "No conversation recorded (or invalid transcript) for recap.");
        }

        // --- Minimum Transcript Length Check ---
        if (fullCallTranscript.length < MIN_TRANSCRIPT_TURNS_FOR_DETAILED_RECAP) {
            console.log(`aiRecapService: Transcript for ${connector.id} too short (${fullCallTranscript.length} turns, need ${MIN_TRANSCRIPT_TURNS_FOR_DETAILED_RECAP}) for detailed ${provider} recap. Returning minimal feedback.`);
            return {
                conversationSummary: "The conversation was very brief, so a detailed debrief couldn't be generated this time. Try having a more extended chat!",
                keyTopicsDiscussed: ["Brief interaction"],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: ["Engaged in a short practice!"],
                areasForImprovement: [{areaType: "Interaction Length", userInputExample: null, coachSuggestion: "Try to have a longer conversation to get more detailed feedback.", explanation: "More conversation provides more material for analysis.", exampleWithSuggestion: "N/A"}],
                suggestedPracticeActivities: ["Engage in a conversation for at least a few minutes.", "Try to use a variety of phrases and sentences."],
                overallEncouragement: "Every bit of practice helps! Keep going, and aim for longer chats next time."
            };
        }
        // --- End Minimum Transcript Length Check ---

        let transcriptText = "Conversation Transcript (User vs. AI Partner):\n";
        fullCallTranscript.forEach(turn => {
            const speaker = turn.sender?.startsWith('user') ? 'User' : (connector.profileName || connector.name || 'AI Partner');
            let textContent = (typeof turn.text === 'string') ? turn.text : `[${turn.type || 'Non-text interaction content'}]`;
            // Clarify spoken parts in the transcript for the AI
            if (turn.sender === 'user-voice-transcript' || turn.sender === 'user-audio') textContent = `(User spoke): ${textContent}`;
            else if (turn.sender?.startsWith('connector-audio') || turn.sender?.startsWith('connector-spoken')) textContent = `(${connector.profileName || 'AI Partner'} spoke): ${textContent}`;
            transcriptText += `${speaker}: ${textContent}\n`;
        });

        // Your detailed recap prompt instructions, ensuring clarity for the LLM
        const recapPromptInstructions = `
You are an expert, friendly, and encouraging language learning coach for a user learning ${connector.language}.
Analyze the following conversation transcript between the "User" and an "AI Partner" (named ${connector.profileName || connector.name}, who was speaking primarily in ${connector.language}).
Your entire output MUST BE a single, valid JSON object. Do NOT include any text before or after the JSON object itself. Do not use markdown code blocks like \`\`\`json.
The JSON object MUST strictly adhere to the following structure with ALL specified top-level keys:
- "conversationSummary": (string) A brief 2-3 sentence overview of the main flow, purpose, and overall feel of the conversation.
- "keyTopicsDiscussed": (array of strings) List 3-5 main subjects or themes talked about.
- "newVocabularyAndPhrases": (array of objects) Identify 2-4 useful vocabulary items or short phrases in ${connector.language} that the User encountered or that were introduced by the AI Partner. For each, provide: { "term": "the term/phrase in ${connector.language}", "translation": "concise English translation", "exampleSentence": "a short example sentence using the term from the transcript or a new one" }.
- "goodUsageHighlights": (array of strings) Point out 1-3 specific instances or patterns where the User showed good use of ${connector.language} (e.g., "Good use of the phrase '...'").
- "areasForImprovement": (array of objects) Identify 2-3 specific areas for the User's improvement in ${connector.language}. For each, provide: { "areaType": "category (e.g., Grammar - Tense, Vocabulary Choice, Pronunciation Hint, Fluency)", "userInputExample": "The User's phrase that needs improvement, or null if general.", "coachSuggestion": "Corrected or better phrase in ${connector.language}, or a tip.", "explanation": "WHY it's better or the rule.", "exampleWithSuggestion": "Full corrected example sentence." }.
- "suggestedPracticeActivities": (array of strings) 1-2 brief, actionable suggestions for practice related to "areasForImprovement".
- "overallEncouragement": (string) A short, positive, and encouraging closing remark (1-2 sentences).

TRANSCRIPT TO ANALYZE:
${transcriptText}

Remember: ONLY the JSON object. All string values within the JSON must be properly escaped.
`;

        const messages = [
            { role: "system", content: `You are an AI assistant specialized in generating language learning session debriefs. Your output must be a single, valid JSON object matching the detailed structure provided by the user. Adhere strictly to the requested keys and formats.` },
            { role: "user", content: recapPromptInstructions } // The detailed instructions and transcript are now part of the user message
        ];

        let apiKeyToUse;
        let modelToUse;
        let currentProviderForLog = provider; // For logging which provider was attempted

        if (provider === PROVIDERS.GROQ) {
            apiKeyToUse = window.GROQ_API_KEY; // Assumes GROQ_API_KEY is on window from config.js -> app.js
            modelToUse = GROQ_MODELS.RECAP;
        } else if (provider === PROVIDERS.TOGETHER) {
            apiKeyToUse = window.TOGETHER_API_KEY; // Assumes TOGETHER_API_KEY is on window
            modelToUse = TOGETHER_MODELS.RECAP;
        } else {
            console.error(`aiRecapService: Unsupported provider '${provider}' specified for recap generation.`);
            return defaultErrorRecapStructure(provider, `Unsupported provider for recap: ${provider}`);
        }

        if (!apiKeyToUse || apiKeyToUse.includes("YOUR_") || apiKeyToUse.trim() === '') {
            console.error(`aiRecapService: API key for ${provider} is missing, invalid, or a placeholder.`);
            return defaultErrorRecapStructure(provider, `API key for ${provider} is not configured correctly.`);
        }

        try {
            console.log(`aiRecapService (${provider}): Requesting session recap for connector '${connector.id}', Model: '${modelToUse}'.`);
            // Request JSON object mode if the API supports it (OpenAI-compatible APIs often do)
            const apiOptions = { temperature: 0.3, response_format: { type: "json_object" } };
            const jsonStringResponse = await callOpenAICompatibleAPI(messages, modelToUse, provider, apiKeyToUse, apiOptions);

            console.log(`aiRecapService (${provider}): --- START RAW RECAP RESPONSE ---`);
            // Log a manageable portion if it's very long
            console.log(jsonStringResponse.length > 1000 ? jsonStringResponse.substring(0, 500) + "\n...\n" + jsonStringResponse.substring(jsonStringResponse.length - 500) : jsonStringResponse);
            console.log(`aiRecapService (${provider}): --- END RAW RECAP RESPONSE ---`);
            console.log(`aiRecapService (${provider}): Raw Length: ${jsonStringResponse.length}, Start: [${jsonStringResponse.substring(0, 15)}], End: [${jsonStringResponse.substring(jsonStringResponse.length - 15)}]`);

            let cleanedResponse = cleanJsonString(jsonStringResponse);
            let parsed;

            try {
                parsed = JSON.parse(cleanedResponse);
                console.log(`aiRecapService (${provider}): Successfully parsed CLEANED response directly.`);
            } catch (e) {
                console.warn(`aiRecapService (${provider}): Direct JSON.parse (of cleaned) failed for recap. Error:`, e.message);
                console.log(`aiRecapService (${provider}): Attempting markdown extraction from ORIGINAL raw response as fallback.`);
                
                const originalJsonMatch = jsonStringResponse.match(/```json\s*([\s\S]*?)\s*```/s);
                if (originalJsonMatch && originalJsonMatch[1]) {
                    const originalExtractedAndCleanedJson = cleanJsonString(originalJsonMatch[1]);
                    console.log(`aiRecapService (${provider}): Extracted from ORIGINAL markdown (and cleaned): [${originalExtractedAndCleanedJson.substring(0,20)}...${originalExtractedAndCleanedJson.substring(originalExtractedAndCleanedJson.length-20)}]`);
                    try {
                        parsed = JSON.parse(originalExtractedAndCleanedJson);
                        console.log(`aiRecapService (${provider}): Successfully parsed ORIGINAL EXTRACTED & CLEANED JSON.`);
                    } catch (e2) {
                        console.error(`aiRecapService (${provider}): Failed to parse markdown-extracted & cleaned JSON. Error:`, e2.message, "Content was:", originalExtractedAndCleanedJson);
                        throw new Error(`Recap response from ${provider} malformed JSON after all attempts to parse.`);
                    }
                } else {
                    console.error(`aiRecapService (${provider}): Recap response not valid JSON and no markdown block found in original response. Cleaned response was:`, cleanedResponse);
                    throw new Error(`Recap response from ${provider} was not valid JSON (no markdown found).`);
                }
            }

            // Validate parsed structure and provide defaults for missing optional keys
            return {
                conversationSummary: typeof parsed.conversationSummary === 'string' ? parsed.conversationSummary : "Summary could not be generated at this time.",
                keyTopicsDiscussed: Array.isArray(parsed.keyTopicsDiscussed) ? parsed.keyTopicsDiscussed : ["No specific topics noted."],
                newVocabularyAndPhrases: Array.isArray(parsed.newVocabularyAndPhrases) ? parsed.newVocabularyAndPhrases.filter(item => item && typeof item.term === 'string') : [],
                goodUsageHighlights: Array.isArray(parsed.goodUsageHighlights) ? parsed.goodUsageHighlights : [],
                areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement.filter(item => item && typeof item.areaType === 'string') : [],
                suggestedPracticeActivities: Array.isArray(parsed.suggestedPracticeActivities) ? parsed.suggestedPracticeActivities : [],
                overallEncouragement: typeof parsed.overallEncouragement === 'string' ? parsed.overallEncouragement : "Keep up the great work with your practice!"
            };

        } catch (error) { // Catches errors from callOpenAICompatibleAPI or re-thrown errors from parsing
            console.error(`aiRecapService.generateSessionRecap Error for ${connector.profileName || connector.name} with provider ${provider}:`, error.message, error);
            // Return the defaultErrorRecapStructure with the provider name and error message
            return defaultErrorRecapStructure(provider, error.message);
        }
    } // End of generateSessionRecap function

    console.log("services/ai_recap_service.js loaded with min transcript check and improved JSON parsing.");
    return { 
        generateSessionRecap,
        defaultErrorRecap: defaultErrorRecapStructure // Expose if needed by other modules
    };
})();