// js/services/ai_recap_service.js
// Handles session recap generation using OpenAI-compatible APIs (Groq, TogetherAI).

console.log("ai_recap_service.js: Script execution STARTED (Bulletproof Armor Version).");

if (window.aiRecapService) {
    console.warn("ai_recap_service.js: window.aiRecapService ALREADY DEFINED. This is unexpected.");
}

window.aiRecapService = (() => {
    'use strict';
    console.log("ai_recap_service.js: IIFE (Bulletproof Armor Version) STARTING.");

    const getDeps = (functionName = "aiRecapService internal") => {
        const deps = {
            openAICompatibleCaller: window._openaiCompatibleApiCaller,
            aiConstants: window._aiApiConstants,
            polyglotHelpers: window.polyglotHelpers
        };
        let allGood = true;
        if (!deps.openAICompatibleCaller) {
            console.error(`aiRecapService (${functionName}): _openaiCompatibleApiCaller IS MISSING!`);
            allGood = false;
        }
        if (!deps.aiConstants) {
            console.error(`aiRecapService (${functionName}): _aiApiConstants IS MISSING!`);
            allGood = false;
        }
        if (!deps.polyglotHelpers) {
            console.error(`aiRecapService (${functionName}): polyglotHelpers IS MISSING!`);
            allGood = false;
        }
        if (!allGood) {
            console.error(`aiRecapService (${functionName}): One or more critical dependencies missing. Service may not function.`);
        }
        return allGood ? deps : null; // Return null if critical deps are missing
    };

    // This default recap structure is used if everything fails.
    const getDefaultErrorRecapStructure = (providerNameForError = "AI Service") => {
        const { aiConstants } = getDeps("getDefaultErrorRecapStructure") || {}; // Get deps, or empty object if deps failed
        const randomErrorMsg = aiConstants?.HUMAN_LIKE_ERROR_MESSAGES?.[0] || "(A technical difficulty occurred.)";
        return {
            conversationSummary: `Debrief generation failed with ${providerNameForError}. ${randomErrorMsg}`,
            keyTopicsDiscussed: ["Error in processing recap"],
            newVocabularyAndPhrases: [],
            goodUsageHighlights: [],
            areasForImprovement: [],
            suggestedPracticeActivities: [],
            overallEncouragement: "Please try ending the session again later when services might be more stable."
        };
    };

    function buildRecapPromptForOpenAICompatible(transcriptText, connector) {
        const functionName = "buildRecapPromptForOpenAICompatible";
        console.log(`aiRecapService (${functionName}): Building recap prompt for connector: ${connector?.id}, language: ${connector?.language}.`);
        const { aiConstants } = getDeps(functionName);
        if (!aiConstants || !connector) {
            console.error(`aiRecapService (${functionName}): Missing aiConstants or connector. Cannot build prompt.`);
            return "Error: Prompt generation failed due to missing core data.";
        }

        // --- Detailed JSON Structure Example with Instructions and Limits ---
        const jsonStructureExample = `{
    "conversationSummary": "A brief (2-4 sentences) overall summary of the conversation flow, main purpose, and how well the user engaged in ${connector.language}.",
    "keyTopicsDiscussed": ["Topic 1", "Topic 2", "A specific theme that emerged (maximum 5 topics)"],
    "newVocabularyAndPhrases": [
        {"term": "example phrase found in transcript", "translation": "its meaning in English (or user's primary language if known)", "exampleSentence": "A sentence using it, ideally from the transcript or a natural new one."}
    ], // Select the 10-20 MOST IMPORTANT/USEFUL vocabulary items or phrases for the user to learn. Prioritize items directly relevant to the conversation or common usage in ${connector.language}. Maximum 20 items.
    "goodUsageHighlights": [
        "User correctly used [specific grammar point or phrase from transcript].",
        "Good pronunciation of [word/phrase] noted by the user."
    ], // List up to 10 specific examples of good language use by the user. Be specific. If few, list what's available.
    "areasForImprovement": [
        {"areaType": "Grammar", "userInputExample": "Actual user quote with error if available", "coachSuggestion": "Corrected version or alternative phrasing", "explanation": "Brief, clear explanation of the grammar rule or reason for correction.", "exampleWithSuggestion": "Full sentence example incorporating the suggestion."},
        {"areaType": "Vocabulary Choice", "userInputExample": "User's phrase", "coachSuggestion": "More natural or precise vocabulary", "explanation": "Why the suggestion is better.", "exampleWithSuggestion": "Example sentence."},
        {"areaType": "Pronunciation Hint", "userInputExample": "Word user struggled with", "coachSuggestion": "Simple phonetic hint or similar sounding English word (e.g., 'comme (like comb) ça')", "explanation": "Brief tip for the sound.", "exampleWithSuggestion": null},
        {"areaType": "Fluency", "userInputExample": null, "coachSuggestion": "Suggestion for smoother speech (e.g., 'Try to use more connecting words like 'et puis', 'alors').", "explanation": "Benefit of the suggestion.", "exampleWithSuggestion": null}
    ], // Identify 3-5 key areas. For each, provide userInputExample (if applicable, from transcript), coachSuggestion, explanation, and exampleWithSuggestion. Be constructive.
    "suggestedPracticeActivities": [
        "Activity idea 1 relevant to topics or improvement areas (e.g., 'Practice ordering food at a French café using the new vocabulary.').",
        "Activity idea 2 (e.g., 'Listen to a short dialogue in ${connector.language} focusing on [grammar point from areasForImprovement].')"
    ], // Provide 2-3 specific and actionable practice suggestions.
    "overallEncouragement": "A positive, personalized, and encouraging closing remark (1-3 sentences) to motivate the user for future practice in ${connector.language}."
}`;

        let prompt = `You are an expert language learning coach for ${connector.language}. Your name is Polyglot AI Coach.
You are providing a detailed and constructive debrief for a language practice session between a User and a simulated persona named ${connector.profileName}.
The User was primarily practicing their ${connector.language} skills.
The persona, ${connector.profileName}, was speaking ${connector.language} (and possibly some English if their persona allows, as described in their system prompt).

Analyze the following conversation transcript. The persona's lines are prefixed with '${connector.profileName}:', and the user's lines are prefixed with 'User:'.

Transcript:
${transcriptText}
---
Based on the entire transcript, provide a structured debrief.
CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:
1.  Your ENTIRE response MUST be a single, valid JSON object.
2.  You MUST adhere EXACTLY to the following JSON structure, using these precise key names and data types.
3.  Do NOT include any text, greetings, explanations, apologies, or disclaimers before or after the main JSON object.
4.  Do NOT use markdown (e.g., \`\`\`json) to wrap the JSON object.
5.  Ensure all string values within the JSON are properly escaped (e.g., double quotes within strings should be \\").
6.  Pay close attention to the specified maximum number of items for list/array fields (e.g., newVocabularyAndPhrases, goodUsageHighlights, keyTopicsDiscussed, areasForImprovement, suggestedPracticeActivities). Prioritize the most impactful and beneficial items for the user if more are identified than the maximum allows.
7.  If the transcript is very short, unclear, or if the user was "trolling" or providing nonsensical input, reflect this honestly in the "conversationSummary". In such cases, for other fields like "areasForImprovement" or "newVocabularyAndPhrases", provide very general language learning advice or state that specific analysis is not possible due to the nature of the input. Still maintain the JSON structure.
8.  All textual feedback, suggestions, and explanations should be in clear, simple English, as the user is a language learner.

JSON Structure and Content Guidelines:
${jsonStructureExample}

Now, generate the JSON debrief:`;
        console.log(`aiRecapService (${functionName}): Recap prompt constructed. Length: ${prompt.length}. Preview: ${prompt.substring(0, 300)}...`);
        return prompt;
    }

    function parseRecapResponse(responseText, providerName) {
        const functionName = "parseRecapResponse";
        console.log(`aiRecapService (${functionName}): Attempting to parse from ${providerName}. Response text length: ${responseText?.length}`);
        const { aiConstants } = getDeps(functionName) || {}; // Handle case where getDeps might return null

        if (!responseText || typeof responseText !== 'string') {
            console.error(`aiRecapService (${functionName}): Cannot parse recap, responseText is invalid from ${providerName}.`);
            return getDefaultErrorRecapStructure(providerName);
        }

        let cleanedResponse = responseText.trim();
        console.log(`aiRecapService (${functionName}): Initial trimmed response (first 500 chars):`, cleanedResponse.substring(0, 500));

        // 1. Attempt to extract JSON if it's in a markdown block (common LLM mistake)
        const jsonMarkdownMatch = cleanedResponse.match(/^```json\s*([\s\S]*?)\s*```$/m);
        if (jsonMarkdownMatch && jsonMarkdownMatch[1]) {
            cleanedResponse = jsonMarkdownMatch[1].trim();
            console.log(`aiRecapService (${functionName}): Extracted JSON from markdown block.`);
        } else {
            // 2. If not in markdown, try to find the first '{' and last '}' to strip extraneous text
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                const potentialJson = cleanedResponse.substring(firstBrace, lastBrace + 1);
                // Quick check if this substring looks like JSON (starts with { ends with })
                if (potentialJson.startsWith("{") && potentialJson.endsWith("}")) {
                    cleanedResponse = potentialJson;
                    console.log(`aiRecapService (${functionName}): Trimmed response to content between first '{' and last '}'.`);
                } else {
                     console.warn(`aiRecapService (${functionName}): Found braces, but substring didn't look like clean JSON. Proceeding with original cleanedResponse for parsing.`);
                }
            } else {
                console.warn(`aiRecapService (${functionName}): Could not find valid JSON start/end braces in response from ${providerName}. This response is unlikely to be valid JSON.`);
                // Don't return defaultErrorRecap yet, let JSON.parse try and fail to get more specific error.
            }
        }

        try {
            const parsed = JSON.parse(cleanedResponse);
            console.log(`aiRecapService (${functionName}): Successfully parsed JSON recap from ${providerName}.`);
            // Basic validation of essential structure
            if (typeof parsed.conversationSummary !== 'string' || !Array.isArray(parsed.keyTopicsDiscussed) || 
                !Array.isArray(parsed.newVocabularyAndPhrases) || !Array.isArray(parsed.areasForImprovement)) {
                console.warn(`aiRecapService (${functionName}): Parsed JSON from ${providerName} is MISSING ESSENTIAL RECAP FIELDS (summary, topics, vocab, improvement). Content:`, parsed);
                return getDefaultErrorRecapStructure(providerName + " (Malformed Structure)");
            }
            // Validate that areasForImprovement items have the expected structure
            if (parsed.areasForImprovement.some(item => typeof item.areaType === 'undefined' || typeof item.coachSuggestion === 'undefined')) {
                 console.warn(`aiRecapService (${functionName}): Parsed JSON from ${providerName} has malformed items in 'areasForImprovement'.`);
                 // Could try to filter out bad items or return error recap
            }

            return parsed;
        } catch (e) {
            console.error(`aiRecapService (${functionName}): JSON.parse FAILED for ${providerName} after cleaning. Error: ${e.message}.`);
            console.error(`aiRecapService (${functionName}): Cleaned response that failed parsing (first 500 chars):`, cleanedResponse.substring(0, 500));
            
            // Log specific details if available from the error (e.g., Groq's failed_generation)
            if (e.providerDetails?.failed_generation) {
                 console.error("AI Provider's 'failed_generation' field content:", e.providerDetails.failed_generation);
            }
            // Specific check for common missing quote error
            const missingQuotePattern = /:\s*([a-zA-Z0-9_]+)\s*":/; // e.g. : styleTypeAndPhrases":
            if (e.message?.toLowerCase().includes("unexpected token") && missingQuotePattern.test(cleanedResponse)) {
                console.warn(`aiRecapService (${functionName}): Detected potential missing quote on a key (e.g., 'key":' instead of '"key":'). This is a common LLM JSON error.`);
            }
            return getDefaultErrorRecapStructure(providerName + " (JSON Parse Error)");
        }
    }

    /**
     * Generates a session recap using the preferred AI provider (Groq or TogetherAI) and connector information.
     * If the preferred provider fails, it will be caught by the ai_service.js facade, which can then try a fallback (e.g., Gemini recap).
     * @param {object} fullCallTranscript - The complete conversation transcript.
     * @param {object} connector - Connector information, including ID, language, and profile name.
     * @param {string} preferredProvider - The preferred AI provider to use. If not supported, an error will be thrown.
     * @returns {object} A structured recap object with conversation summary, key topics, new vocabulary, good usage highlights, focus areas, practice activities, and overall encouragement.
     * @throws {Error} If the preferred provider is unsupported or the API call fails.
     */
    async function generateSessionRecap(fullCallTranscript, connector, preferredProvider) {
        const functionName = "generateSessionRecap";
        console.log(`aiRecapService (${functionName}): START. Preferred: ${preferredProvider}, Connector: ${connector?.id}, Transcript turns: ${fullCallTranscript?.length}`);
        const deps = getDeps(functionName);

        if (!deps) {
            console.error(`aiRecapService (${functionName}): Critical dependencies missing. Cannot generate recap.`);
            return getDefaultErrorRecapStructure("Internal Service Error");
        }
        const { openAICompatibleCaller, aiConstants, polyglotHelpers } = deps;

               // Inside ai_recap_service.js -> generateSessionRecap
          if (!fullCallTranscript || fullCallTranscript.length < (aiConstants.MIN_TRANSCRIPT_TURNS_FOR_RECAP || 2)) {
            console.warn(`aiRecapService (${functionName}): Transcript too short (${fullCallTranscript?.length} turns). Returning CONSISTENT minimal structure.`);
            return {
                // From your populateRecapModal call: recapData.connectorName, recapData.date, recapData.duration, recapData.sessionId
                // These should ideally be added by session_state_manager BEFORE calling aiRecapService,
                // or aiRecapService should merge its generated content with these base details.
                // For now, assuming they are added externally or this service only focuses on AI-generated parts.

                conversationSummary: "The conversation was too short to generate a detailed summary.",
                keyTopicsDiscussed: ["N/A - Short conversation"], // Array of strings
                newVocabularyAndPhrases: [], // Empty array, as 'vocabulary' type in populateListInRecap likely expects objects
                goodUsageHighlights: ["No specific highlights from a short conversation."], // Array of strings
                areasForImprovement: [], // Empty array, as 'improvementArea' type in populateListInRecap likely expects objects
                suggestedPracticeActivities: ["Continue practicing with longer conversations!"], // Array of strings
                overallEncouragement: "Keep practicing! More interaction will allow for a helpful debrief."
                // Ensure connectorName, date, duration, sessionId are part of the final object passed to populateRecapModal
            };
        }

        const transcriptText = polyglotHelpers.formatTranscriptForLLM(fullCallTranscript, connector.profileName);
        if (!transcriptText || transcriptText.trim().length < 50) { // Arbitrary short length check
             console.warn(`aiRecapService (${functionName}): Formatted transcript text is very short or empty. May result in poor recap.`);
        }
        const prompt = buildRecapPromptForOpenAICompatible(transcriptText, connector);
        
        const messages = [{ role: "user", content: prompt }];

        let providerToUse = preferredProvider;
        let modelToUse;
        let apiKey;

        if (providerToUse === aiConstants.PROVIDERS.GROQ) {
            modelToUse = aiConstants.GROQ_MODELS.RECAP;
            apiKey = window.GROQ_API_KEY;
        } else if (providerToUse === aiConstants.PROVIDERS.TOGETHER) {
            modelToUse = aiConstants.TOGETHER_MODELS.RECAP;
            apiKey = window.TOGETHER_API_KEY;
        } else {
            console.error(`aiRecapService (${functionName}): Unsupported preferredProvider for recap: ${preferredProvider}. Defaulting to error.`);
            return getDefaultErrorRecapStructure(`Unsupported Provider: ${preferredProvider}`);
        }
        console.log(`aiRecapService (${functionName}): Attempting recap generation with ${providerToUse}, Model: ${modelToUse}.`);

        try {
            if (!apiKey || apiKey.includes("YOUR_") || apiKey.trim() === '') {
                throw new Error(`API key for ${providerToUse} (Recap) is invalid or not configured.`);
            }
            if (!modelToUse) {
                throw new Error(`Recap model for ${providerToUse} is not defined in aiConstants.`);
            }

            const rawResponse = await openAICompatibleCaller(
                messages,
                modelToUse,
                providerToUse,
                apiKey,
                { 
                    temperature: 0.2, // Lower temp for more factual/structured output
                    // max_tokens: 2048, // Ensure enough tokens for potentially long JSON
                    response_format: { "type": "json_object" } // Strongly request JSON output
                }
            );
            console.log(`aiRecapService (${functionName}): Raw response received from ${providerToUse}. Length: ${rawResponse?.length}`);
            return parseRecapResponse(rawResponse, providerToUse);
        } catch (error) {
            console.error(`aiRecapService (${functionName}): Error during API call to ${providerToUse} (Model: ${modelToUse}) for connector ${connector?.id}:`, error.message, error);
            // The error object from openAICompatibleCaller might have a 'status' or 'providerDetails'
            // This error will be caught by ai_service.js facade, which can then try a fallback (e.g., Gemini recap).
            throw error; 
        }
    }

    // Final check for dependencies after IIFE definition
    const finalDepsCheck = getDeps("IIFE final check");
    if (finalDepsCheck) {
        console.log("services/ai_recap_service.js (Bulletproof Armor Version) loaded. Initial dependency check passed.");
    } else {
        console.error("services/ai_recap_service.js (Bulletproof Armor Version) loaded BUT CRITICAL DEPENDENCIES ARE MISSING. Functionality will be severely impaired.");
    }

    console.log("ai_recap_service.js: IIFE (Bulletproof Armor Version) FINISHED. Returning exported object.");
    return {
        generateSessionRecap
    };
})();

if (window.aiRecapService && typeof window.aiRecapService.generateSessionRecap === 'function') {
    console.log("ai_recap_service.js (Bulletproof Armor Version): SUCCESSFULLY assigned to window.aiRecapService.");
} else {
    console.error("ai_recap_service.js (Bulletproof Armor Version): CRITICAL ERROR - window.aiRecapService IS UNDEFINED or not correctly formed after IIFE execution.");
}
console.log("ai_recap_service.js: Script execution FINISHED (Bulletproof Armor Version).");