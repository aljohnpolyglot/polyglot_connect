// js/services/ai_recap_service.js
// Handles generation of session recaps using Groq/Llama.

window.aiRecapService = (() => {
    'use strict';

    // Add a default error recap helper
    const defaultErrorRecap = (providerName = "AI") => ({
        conversationSummary: `Debrief generation failed with ${providerName}.`,
        keyTopicsDiscussed: [],
        newVocabularyAndPhrases: [],
        goodUsageHighlights: [],
        areasForImprovement: [],
        suggestedPracticeActivities: [],
        overallEncouragement: "Please try again later."
    });

    if (!window._geminiInternalApiCaller || !window._geminiApiConstants) {
        console.error("Gemini Recap Service: Core API utilities not found.");
        return {
            generateSessionRecap: async () => {
                return { topics: ["Recap service not initialized."], vocabulary: [], focusAreas: [] };
            }
        };
    }

    const callGeminiAPIInternal = window._geminiInternalApiCaller;
    const { MODEL_TEXT_RESPONSE, STANDARD_SAFETY_SETTINGS } = window._geminiApiConstants;

    async function generateSessionRecap(fullCallTranscript, connector) {
        if (!fullCallTranscript || fullCallTranscript.length === 0) {
            console.warn("geminiRecapService.generateSessionRecap: No transcript provided.");
            return {
                conversationSummary: "No conversation recorded.",
                keyTopicsDiscussed: [],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "Keep practicing!"
            };
        }
        if (!connector) {
            console.warn("geminiRecapService.generateSessionRecap: Connector info missing.");
            return {
                conversationSummary: "Connector information was missing for this recap.",
                keyTopicsDiscussed: [],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "Let's try another session!"
            };
        }

        let transcriptText = "Conversation Transcript (User vs. AI Partner):\n";
        fullCallTranscript.forEach(turn => {
            const speaker = turn.sender.startsWith('user') ? 'User' : (connector.profileName || connector.name || 'AI Partner');
            let textContent = typeof turn.text === 'string' ? turn.text : `[${turn.type || 'Non-text entry'}]`;
            transcriptText += `${speaker}: ${textContent}\n`;
        });

        const recapPrompt = `
You are an expert language learning coach tasked with analyzing the following transcript and providing a JSON debrief.
TRANSCRIPT:
${transcriptText}
Return ONLY the valid JSON object. Do not include markdown formatting.
`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: recapPrompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.5 },
            safetySettings: STANDARD_SAFETY_SETTINGS
        };

        try {
            console.log(`geminiRecapService: Requesting session recap for connector '${connector.id}'`);
            const jsonStringResponse = await callGeminiAPIInternal(payload, MODEL_TEXT_RESPONSE, "generateContent");

            let parsed;
            try {
                // Attempt to fix common JSON malformations, such as improperly quoted "null"
                let cleanedJsonString = jsonStringResponse
                    .replace(/: null",/g, ': null,') // Fix improperly quoted null values in arrays
                    .replace(/: null"}/g, ': null}'); // Fix improperly quoted null values at the end of objects

                parsed = JSON.parse(cleanedJsonString);
            } catch (e) {
                console.warn("Recap Service: Direct JSON.parse failed, attempting to extract from markdown block. Error:", e.message);

                const jsonMatch = jsonStringResponse.match(/```json\s*([\s\S]*?)\s*```/s); // Extract JSON from markdown block
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        parsed = JSON.parse(jsonMatch[1]);
                        console.log("Recap Service: Successfully parsed JSON from markdown block.");
                    } catch (e2) {
                        console.error("Recap Service: Failed to parse extracted JSON. Original response:", jsonStringResponse, "Extracted:", jsonMatch[1], "Error:", e2);
                        throw new Error("Recap response contained malformed JSON even after extraction.");
                    }
                } else {
                    console.error("Recap Service: Recap response was not valid JSON and no JSON markdown block found. Response:", jsonStringResponse);
                    throw new Error("Recap response was not valid JSON.");
                }
            }

            return {
                conversationSummary: parsed.conversationSummary || "Summary not available.",
                keyTopicsDiscussed: parsed.keyTopicsDiscussed || [],
                newVocabularyAndPhrases: parsed.newVocabularyAndPhrases || [],
                goodUsageHighlights: parsed.goodUsageHighlights || [],
                areasForImprovement: parsed.areasForImprovement || [],
                suggestedPracticeActivities: parsed.suggestedPracticeActivities || [],
                overallEncouragement: parsed.overallEncouragement || "Keep up the great work!"
            };
        } catch (error) {
            console.error(`geminiRecapService.generateSessionRecap Error for ${connector.profileName || connector.name}:`, error.message);
            return {
                conversationSummary: `Debrief generation failed: ${error.message.substring(0, 70)}...`,
                keyTopicsDiscussed: [],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "An error occurred while generating the session debrief."
            };
        }
    }

    console.log("Gemini Recap Service loaded.");
    return { generateSessionRecap };
})();

// --- AI Recap Service ---
window.aiRecapService = (() => {
    'use strict';

    // Add a default error recap helper
    const defaultErrorRecap = (providerName = "AI") => ({
        conversationSummary: `Debrief generation failed with ${providerName}.`,
        keyTopicsDiscussed: [],
        newVocabularyAndPhrases: [],
        goodUsageHighlights: [],
        areasForImprovement: [],
        suggestedPracticeActivities: [],
        overallEncouragement: "Please try again later."
    });

    if (!window._openaiCompatibleApiCaller || !window._aiApiConstants) {
        console.error("AI Recap Service (for Groq/Llama): Core API utilities (_openaiCompatibleApiCaller or _aiApiConstants) not found.");
        return {
            generateSessionRecap: async () => {
                return { topics: ["Recap service not initialized."], vocabulary: [], focusAreas: [] };
            }
        };
    }

    const callOpenAICompatibleAPI = window._openaiCompatibleApiCaller;
    const { PROVIDERS, GROQ_MODELS } = window._aiApiConstants;

    async function generateSessionRecap(fullCallTranscript, connector, provider = PROVIDERS.GROQ) {
        if (!fullCallTranscript || fullCallTranscript.length === 0) {
            console.warn("aiRecapService.generateSessionRecap: No transcript provided.");
            return {
                conversationSummary: "No conversation recorded to generate a recap.",
                keyTopicsDiscussed: [],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "Keep practicing!"
            };
        }
        if (!connector) {
            console.warn("aiRecapService.generateSessionRecap: Connector info missing.");
            return {
                conversationSummary: "Connector information was missing for this recap.",
                keyTopicsDiscussed: [],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "Let's try another session!"
            };
        }

        let transcriptText = "Conversation Transcript (User vs. AI Partner):\n";
        fullCallTranscript.forEach(turn => {
            const speaker = turn.sender.startsWith('user') ? 'User' : (connector.profileName || connector.name || 'AI Partner');
            let textContent = typeof turn.text === 'string' ? turn.text : `[${turn.type || 'Non-text entry'}]`;
            if (turn.sender === 'user-voice-transcript' || turn.sender === 'user-audio') textContent = `(User spoke): ${textContent}`;
            else if (turn.sender === 'connector-audio-transcript' || turn.sender === 'connector-spoken-output' || turn.sender === 'connector-spoken-text-transcription') textContent = `(${connector.profileName || 'AI Partner'} spoke): ${textContent}`;
            transcriptText += `${speaker}: ${textContent}\n`;
        });

        const recapPromptInstructions = `
You are an expert, friendly, and encouraging language learning coach for a user learning ${connector.language}.
Analyze the following conversation transcript between the "User" and an "AI Partner" (named ${connector.profileName || connector.name}, who was speaking primarily in ${connector.language}).
Output your analysis STRICTLY as a single, valid JSON object.
The JSON object MUST have the following top-level keys:
- "conversationSummary": (string) A brief 2-3 sentence overview of the main flow, purpose, and overall feel of the conversation.
- "keyTopicsDiscussed": (array of strings) List the main subjects and themes that were talked about. Be reasonably comprehensive.
- "newVocabularyAndPhrases": (array of objects) Identify useful vocabulary or short phrases in ${connector.language} that the User encountered, practiced, or that were introduced by the AI Partner and would be beneficial for the User. For each, provide an object: { "term": "the term/phrase in ${connector.language}", "translation": "concise English translation or explanation of its meaning/nuance", "exampleSentence": "a short example sentence using the term, ideally from the transcript or a new relevant one showcasing its usage" }. Include several relevant items.
- "goodUsageHighlights": (array of strings) Point out specific instances or general patterns where the User demonstrated good use of ${connector.language}. Be specific if possible (e.g., "Excellent use of the subjunctive mood in the phrase '...' when discussing...", "Your pronunciation of the word '...' sounded very clear.", "Very natural use of the idiom '...'!"). This is for positive reinforcement and to highlight progress. Include several highlights if applicable.
- "areasForImprovement": (array of objects) This is the most crucial part for learning. Identify specific areas where the User can improve their ${connector.language}. For each area, provide an object with these exact keys:
    {
      "areaType": "category (e.g., Grammar - Tense, Grammar - Agreement, Grammar - Word Order, Vocabulary Choice, Pronunciation (infer where possible), Fluency/Hesitations, Idiom Usage, Sentence Structure, Register/Formality)",
    "userInputExample": "The specific phrase or sentence the User said that contained the error or could be improved. Quote it accurately from the transcript. If the feedback is more general and there's no specific user phrase, use the JSON value null (not the string \"null\").",
      "coachSuggestion": "The corrected version of the user's phrase in ${connector.language}, OR a more natural/idiomatic alternative in ${connector.language}, OR a general tip if no specific phrase was incorrect but improvement is possible.",
      "explanation": "A concise but clear explanation of WHY the suggestion is better or what the grammatical rule is. For example, 'In ${connector.language}, adjectives usually follow the noun,' or 'While your sentence was understandable, a native speaker might more commonly say X because Y.'",
      "exampleWithSuggestion": "A full, correct example sentence in ${connector.language} that clearly demonstrates the coach's suggestion or the corrected grammar/vocabulary."
    }
- "suggestedPracticeActivities": (array of strings, optional) 1-3 brief, actionable, and creative suggestions for how the User could practice the points mentioned in "areasForImprovement".
- "overallEncouragement": (string, optional) A short (1-2 sentences), positive, and encouraging closing remark for the User, perhaps referencing a positive aspect of the conversation or their effort.

TRANSCRIPT:
${transcriptText}

Remember, ONLY return the JSON object. Ensure all string values within the JSON are properly escaped for JSON validity.
`;

        const messages = [
            { role: "system", content: `You are an AI assistant that generates detailed language learning session debriefs in a specific JSON format. The user is learning ${connector.language}. Ensure your output is ONLY the valid JSON object based on the user's transcript and instructions.` },
            { role: "user", content: `Please generate the JSON debrief based on the following transcript and instructions.\n\nTRANSCRIPT:\n${transcriptText}\n\nINSTRUCTIONS FOR JSON (Please adhere strictly to this structure and content guidelines):\n${recapPromptInstructions}` }
        ];

        try {
            console.log(`aiRecapService (${provider}): Requesting session recap for connector '${connector.id}'`);
            const jsonStringResponse = await callOpenAICompatibleAPI(
                messages,
                GROQ_MODELS.RECAP,
                provider,
                window.GROQ_API_KEY,
                { temperature: 0.3 }
            );

            let parsed;
            try {
                parsed = JSON.parse(jsonStringResponse);
            } catch (e) {
                console.warn(`aiRecapService (${provider}): Direct JSON.parse failed for recap, attempting to extract from markdown. Error:`, e.message);
                const jsonMatch = jsonStringResponse.match(/```json\s*([\s\S]*?)\s*```/s);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        parsed = JSON.parse(jsonMatch[1]);
                    } catch (e2) {
                        console.error(`aiRecapService (${provider}): Failed to parse EXTRACTED JSON for recap. Error:`, e2);
                        throw new Error(`Recap response from ${provider} contained malformed JSON even after extraction.`);
                    }
                } else {
                    console.error(`aiRecapService (${provider}): Recap response not valid JSON and no markdown block found. Response:`, jsonStringResponse);
                    throw new Error(`Recap response from ${provider} was not valid JSON.`);
                }
            }

            return {
                conversationSummary: typeof parsed.conversationSummary === 'string' ? parsed.conversationSummary : "Summary not available.",
                keyTopicsDiscussed: Array.isArray(parsed.keyTopicsDiscussed) ? parsed.keyTopicsDiscussed : [],
                newVocabularyAndPhrases: Array.isArray(parsed.newVocabularyAndPhrases) ? parsed.newVocabularyAndPhrases.filter(item => item && typeof item.term === 'string') : [],
                goodUsageHighlights: Array.isArray(parsed.goodUsageHighlights) ? parsed.goodUsageHighlights : [],
                areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement.filter(item => item && typeof item.areaType === 'string') : [],
                suggestedPracticeActivities: Array.isArray(parsed.suggestedPracticeActivities) ? parsed.suggestedPracticeActivities : [],
                overallEncouragement: typeof parsed.overallEncouragement === 'string' ? parsed.overallEncouragement : "Great session!"
            };

        } catch (error) {
            console.error(`aiRecapService.generateSessionRecap Error for ${connector.profileName || connector.name}:`, error.message);
            return {
                conversationSummary: `Debrief generation failed: ${error.message.substring(0, 70)}...`,
                keyTopicsDiscussed: [],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "An error occurred while generating the session debrief."
            };
        }
    }

    console.log("services/ai_recap_service.js loaded.");
    return { generateSessionRecap };
})();