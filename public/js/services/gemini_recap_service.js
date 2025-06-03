// js/services/gemini_recap_service.js
// Handles generation of session recaps using Gemini.

window.geminiRecapService = (() => {
    'use strict';

    // --- Robust Dependency Check ---
    // It now checks for the global _aiApiConstants and expects _geminiInternalApiCaller
    if (!window._geminiInternalApiCaller || !window._aiApiConstants) {
        console.error("Gemini Recap Service: CRITICAL - Core API utilities not found. Expected window._geminiInternalApiCaller and window._aiApiConstants. Recap generation will fail.");
        return {
            generateSessionRecap: async () => {
                console.error("Gemini Recap Service called in error state (missing dependencies).");
                return { // Return a structure consistent with expected successful/failed output
                    conversationSummary: "Gemini recap service is not properly initialized. Please check critical dependencies.",
                    keyTopicsDiscussed: ["Initialization Error"], newVocabularyAndPhrases: [],
                    goodUsageHighlights: [], areasForImprovement: [],
                    suggestedPracticeActivities: [], overallEncouragement: "Please report this initialization issue."
                };
            }
        };
    }

    const callGeminiAPIInternal = window._geminiInternalApiCaller;
    // Destructure necessary constants from the global _aiApiConstants
    const { GEMINI_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI } = window._aiApiConstants;
    // Use a more specific model for recaps if defined, otherwise fallback to general text model
    const MODEL_FOR_RECAP = GEMINI_MODELS.RECAP || GEMINI_MODELS.TEXT;


    const defaultErrorRecapStructure = (specificMessage = "Debrief generation encountered an unexpected issue with Gemini.") => ({
        conversationSummary: specificMessage,
        keyTopicsDiscussed: ["N/A - Error"], newVocabularyAndPhrases: [], goodUsageHighlights: [],
        areasForImprovement: [], suggestedPracticeActivities: [],
        overallEncouragement: "An error occurred while generating the debrief with Gemini. Please try again. If the issue persists, the service might be temporarily unavailable."
    });

    // Helper function to clean JSON strings (can be shared or duplicated if not in a common util)
    function cleanJsonStringForRecap(str) {
        if (typeof str !== 'string') return str;
        let cleanedStr = str;
        if (cleanedStr.charCodeAt(0) === 0xFEFF || cleanedStr.charCodeAt(0) === 0xFFFE) cleanedStr = cleanedStr.substring(1);
        cleanedStr = cleanedStr.replace(/^[\s\p{C}]+/u, '').replace(/[\s\p{C}]+$/u, '');
        return cleanedStr;
    }

    async function generateSessionRecap(fullCallTranscript, connector) {
        if (!connector || !connector.id || !connector.language || !connector.profileName) {
            console.warn("GeminiRecapService: Connector info is incomplete or missing.", connector);
            return defaultErrorRecapStructure("Connector information missing for recap generation.");
        }
        if (!fullCallTranscript || !Array.isArray(fullCallTranscript) || fullCallTranscript.length === 0) {
            console.warn(`GeminiRecapService: No transcript provided or invalid format for connector ${connector.id}.`);
            // Return a minimal recap if no transcript, rather than an error structure
            return {
                conversationSummary: "No conversation was recorded, so no debrief could be generated.",
                keyTopicsDiscussed: ["No interaction"], newVocabularyAndPhrases: [],
                goodUsageHighlights: [], areasForImprovement: [],
                suggestedPracticeActivities: ["Try having a chat next time!"],
                overallEncouragement: "Looking forward to your next session!"
            };
        }

        let transcriptText = "Conversation Transcript (User vs. AI Partner):\n";
        fullCallTranscript.forEach(turn => {
            const speaker = turn.sender?.startsWith('user') ? 'User' : (connector.profileName || connector.name || 'AI Partner');
            let textContent = (typeof turn.text === 'string') ? turn.text : `[${turn.type || 'Non-text interaction content'}]`;
            if (turn.sender === 'user-voice-transcript' || turn.sender === 'user-audio') textContent = `(User spoke): ${textContent}`;
            else if (turn.sender?.startsWith('connector-audio') || turn.sender?.startsWith('connector-spoken')) textContent = `(${connector.profileName || 'AI Partner'} spoke): ${textContent}`;
            transcriptText += `${speaker}: ${textContent}\n`;
        });

        // Using your detailed recap prompt instructions
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
        const payload = {
            contents: [{ role: "user", parts: [{ text: recapPromptInstructions }] }],
            generationConfig: { 
                responseMimeType: "application/json", // Crucial for Gemini to return JSON
                temperature: 0.4 // Slightly lower temp for more consistent structured output
            },
            // Safety settings are applied by _geminiInternalApiCaller
        };

        try {
            console.log(`GeminiRecapService: Requesting session recap for connector '${connector.id}', Model: '${MODEL_FOR_RECAP}'.`);
            const jsonStringResponse = await callGeminiAPIInternal(payload, MODEL_FOR_RECAP, "generateContent");

            if (!jsonStringResponse || typeof jsonStringResponse !== 'string' || jsonStringResponse.trim() === "") {
                console.error("GeminiRecapService: Empty or invalid recap response from Gemini API. Response:", jsonStringResponse);
                throw new Error("Gemini API returned an empty or invalid response for recap.");
            }
            
            console.log(`GeminiRecapService: --- START RAW GEMINI RECAP RESPONSE ---`);
            console.log(jsonStringResponse.length > 600 ? jsonStringResponse.substring(0, 300) + "\n...\n" + jsonStringResponse.substring(jsonStringResponse.length - 300) : jsonStringResponse);
            console.log(`GeminiRecapService: --- END RAW GEMINI RECAP RESPONSE ---`);

            let cleanedResponse = cleanJsonStringForRecap(jsonStringResponse);
            let parsed;

            try {
                parsed = JSON.parse(cleanedResponse);
                console.log(`GeminiRecapService: Successfully parsed CLEANED Gemini response directly.`);
            } catch (e) {
                console.warn(`GeminiRecapService: Direct JSON.parse (of cleaned) failed for Gemini recap. Error:`, e.message);
                console.log(`GeminiRecapService: Attempting markdown extraction from ORIGINAL raw Gemini response as fallback.`);
                
                const originalJsonMatch = jsonStringResponse.match(/```json\s*([\s\S]*?)\s*```/s);
                if (originalJsonMatch && originalJsonMatch[1]) {
                    const originalExtractedAndCleanedJson = cleanJsonStringForRecap(originalJsonMatch[1]);
                    try {
                        parsed = JSON.parse(originalExtractedAndCleanedJson);
                        console.log(`GeminiRecapService: Successfully parsed ORIGINAL EXTRACTED & CLEANED Gemini JSON.`);
                    } catch (e2) {
                        console.error(`GeminiRecapService: Failed to parse markdown-extracted & cleaned Gemini JSON. Error:`, e2.message, "Content was:", originalExtractedAndCleanedJson);
                        throw new Error(`Gemini recap response malformed JSON after all parsing attempts.`);
                    }
                } else {
                    console.error(`GeminiRecapService: Gemini recap response not valid JSON and no markdown block found. Cleaned response was:`, cleanedResponse);
                    throw new Error(`Gemini recap response was not valid JSON (no markdown found).`);
                }
            }

            // Validate parsed structure and provide defaults for missing optional keys
            return {
                conversationSummary: typeof parsed.conversationSummary === 'string' ? parsed.conversationSummary : "Summary could not be generated by Gemini.",
                keyTopicsDiscussed: Array.isArray(parsed.keyTopicsDiscussed) ? parsed.keyTopicsDiscussed : ["No specific topics noted by Gemini."],
                newVocabularyAndPhrases: Array.isArray(parsed.newVocabularyAndPhrases) ? parsed.newVocabularyAndPhrases.filter(item => item && typeof item.term === 'string') : [],
                goodUsageHighlights: Array.isArray(parsed.goodUsageHighlights) ? parsed.goodUsageHighlights : [],
                areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement.filter(item => item && typeof item.areaType === 'string') : [],
                suggestedPracticeActivities: Array.isArray(parsed.suggestedPracticeActivities) ? parsed.suggestedPracticeActivities : [],
                overallEncouragement: typeof parsed.overallEncouragement === 'string' ? parsed.overallEncouragement : "Keep up the great work!"
            };

        } catch (error) {
            console.error(`GeminiRecapService.generateSessionRecap Error for ${connector.profileName || connector.name}:`, error.message, error);
            return defaultErrorRecapStructure(`Gemini Recap: ${error.message}`);
        }
    }

    if (window._geminiInternalApiCaller && window._aiApiConstants) {
        console.log("services/gemini_recap_service.js loaded successfully.");
    } else {
        console.error("services/gemini_recap_service.js loaded, but CRITICAL DEPENDENCIES were missing AFTER IIFE execution. This indicates a severe script loading problem.");
    }

    return {
        generateSessionRecap
    };
})();