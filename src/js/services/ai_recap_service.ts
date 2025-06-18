// D:\polyglot_connect\src\js\services\ai_recap_service.ts
import type { 
    PolyglotHelpersOnWindow, 
    AIApiConstants, 
    Connector, 
    TranscriptTurn,
    RecapData // <<< ADD RecapData HERE
} from '../types/global.d.ts';
console.log("ai_recap_service.ts: Script execution STARTED (TS Version).");

interface AiRecapServiceModule {
    generateSessionRecap: (
        cleanedTranscriptText: string, // <<< CHANGED from fullCallTranscript
        connector: Connector,
        preferredProvider: string
    ) => Promise<RecapData>;
    buildRecapPromptForOpenAICompatible: (transcriptText: string, connector: Connector) => string;
    parseRecapResponse: (responseText: string | null, providerName: string) => RecapData;
}
// Placeholder for two-phase initialization (though for this service, it might be okay to populate directly)
window.aiRecapService = {} as AiRecapServiceModule; // Placeholder
console.log('ai_recap_service.ts: Placeholder window.aiRecapService assigned.');
// No structural ready event needed unless other modules depend on its placeholder structurally *before* functional readiness.

function initializeActualAiRecapService(): void {
    console.log("ai_recap_service.ts: initializeActualAiRecapService() called.");

    const getSafeDeps = (functionName = "aiRecapService internal"): {
        openAICompatibleCaller: any; // Replace with actual type if available
        aiConstants: AIApiConstants;
        polyglotHelpers: PolyglotHelpersOnWindow;
    } | null => {
        const deps = {
         openAICompatibleCaller: window.openaiCompatibleApiCaller, // Assuming _ was a typo or old convention
            aiConstants: window.aiApiConstants, // Assuming _ was a typo or old convention
            polyglotHelpers: window.polyglotHelpers
        };
        let allGood = true;
        if (!deps.openAICompatibleCaller || typeof deps.openAICompatibleCaller !== 'function') {
            console.error(`aiRecapService (${functionName}): openaiCompatibleApiCaller IS MISSING or not a function!`);
            allGood = false;
        }
        if (!deps.aiConstants || typeof deps.aiConstants.PROVIDERS !== 'object') {
            console.error(`aiRecapService (${functionName}): aiApiConstants IS MISSING or malformed!`);
            allGood = false;
        }
        if (!deps.polyglotHelpers || typeof deps.polyglotHelpers.formatTranscriptForLLM !== 'function') {
            console.error(`aiRecapService (${functionName}): polyglotHelpers IS MISSING or malformed!`);
            allGood = false;
        }
        if (!allGood) {
            console.error(`aiRecapService (${functionName}): One or more critical dependencies missing. Service cannot initialize fully.`);
            return null;
        }
        return deps as { openAICompatibleCaller: any; aiConstants: AIApiConstants; polyglotHelpers: PolyglotHelpersOnWindow; };
    };


console.log("ARS_DEBUG_DISPATCHING: About to dispatch 'aiRecapServiceReady'. Current window.aiRecapService.generateSessionRecap is " + typeof window.aiRecapService?.generateSessionRecap); 
document.dispatchEvent(new CustomEvent('aiRecapServiceReady'));
console.log('ai_recap_service.ts: "aiRecapServiceReady" event dispatched (after full init attempt).');


    const initialDeps = getSafeDeps("initializeActualAiRecapService - initial check");
    if (!initialDeps) {
        console.error("ai_recap_service.ts: Critical dependencies for actual init not met. Placeholder remains.");
        // Dispatch a ready event even on failure if other modules might be waiting for *some* signal
        document.dispatchEvent(new CustomEvent('aiRecapServiceReady'));
        console.warn('ai_recap_service.ts: "aiRecapServiceReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log("ai_recap_service.ts: Core dependencies for actual init appear ready.");

    const serviceMethods = ((): AiRecapServiceModule => {
        'use strict';
        console.log("ai_recap_service.ts: IIFE STARTING.");

        // Use initialDeps as they were validated, or call getSafeDeps again if preferred for absolute freshness.
        const { openAICompatibleCaller, aiConstants, polyglotHelpers } = initialDeps;
        const getDefaultErrorRecapStructure = (providerNameForError = "AI Recap Service"): RecapData => { // Ensure return type is RecapData
            const randomErrorMsg = aiConstants?.HUMAN_LIKE_ERROR_MESSAGES?.[0] || "(A technical difficulty occurred during recap.)";
            return {
                conversationSummary: `Debrief generation failed via ${providerNameForError}. ${randomErrorMsg}`,
                keyTopicsDiscussed: ["Error in processing recap"],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "Please try again later.",
                // Add missing RecapData fields to ensure full conformity
                sessionId: `error-ars-${Date.now()}`, // ars for AiRecapService
                date: new Date().toLocaleDateString(),
                duration: "N/A",
                startTimeISO: null,
                // connectorId and connectorName can't be known here universally,
                // they should be added when this default is merged or used.
            };
        };

        function buildRecapPromptForOpenAICompatible(transcriptText: string, connector: Connector): string {
            const functionName = "buildRecapPromptForOpenAICompatible";
            console.log(`aiRecapService (${functionName}): Building FULL recap prompt for connector: ${connector?.id}, language: ${connector?.language}.`);

            if (!aiConstants || !connector) {
                console.error(`aiRecapService (${functionName}): Missing aiConstants or connector. Cannot build prompt.`);
                return "Error: Prompt generation failed due to missing core data.";
            }

            // This is the FULL JSON structure example for the prompt
            const jsonStructureExample = `{
                "conversationSummary": "A brief (2-4 sentences) overall summary of the conversation flow, main purpose, and how well the user engaged in ${connector.language}.",
                "keyTopicsDiscussed": ["Topic 1", "Topic 2", "A specific theme that emerged (maximum 3-5 topics). Provide specific examples if possible."],
                "newVocabularyAndPhrases": [
                    {"term": "example phrase found in transcript in ${connector.language}", "translation": "its concise meaning in English", "exampleSentence": "A sentence using the term, ideally from the transcript or a natural new one reflecting its usage."}
                ],
                "goodUsageHighlights": [
                    "User correctly used [specific grammar point or phrase from transcript]. Be specific.",
                    "Good pronunciation of [word/phrase] noted by the user (if discernible from text).",
                    "User demonstrated good [fluency/confidence/initiative] when discussing [topic]."
                ],
                "areasForImprovement": [
                    {"areaType": "Grammar", "userInputExample": "Actual user quote with error if available, otherwise null.", "coachSuggestion": "Corrected version or alternative natural phrasing in ${connector.language}.", "explanation": "Brief, clear explanation of the grammar rule or reason for correction in simple English.", "exampleWithSuggestion": "Full sentence example in ${connector.language} incorporating the suggestion, or null if not applicable."},
                    {"areaType": "Vocabulary Choice", "userInputExample": "User's phrase that could be improved.", "coachSuggestion": "More natural, precise, or contextually appropriate vocabulary in ${connector.language}.", "explanation": "Why the suggestion is better (e.g., 'more common', 'more formal').", "exampleWithSuggestion": "Example sentence in ${connector.language} using the suggested vocabulary."},
                    {"areaType": "Pronunciation Hint (if applicable from text patterns)", "userInputExample": "Word or phrase the user might have struggled with (e.g., repeated misspellings hinting at sound).", "coachSuggestion": "Simple phonetic hint, e.g., 'Sounds like X in English' or 'Focus on the Y sound.'", "explanation": "Brief tip for the sound.", "exampleWithSuggestion": null},
                    {"areaType": "Fluency/Flow", "userInputExample": null, "coachSuggestion": "General suggestion for smoother speech (e.g., 'Try to use more connecting words like 'et puis', 'alors'; 'Consider varying sentence structure for more engaging conversation.').", "explanation": "Benefit of the suggestion (e.g., 'This will make your speech sound more natural.').", "exampleWithSuggestion": null}
                ],
                "suggestedPracticeActivities": [
                    "Specific, actionable activity idea 1 relevant to topics or improvement areas (e.g., 'Practice ordering food at a French café using the new vocabulary: X, Y, Z.').",
                    "Specific, actionable activity idea 2 (e.g., 'Review the use of [grammar point from areasForImprovement] and try to make 3 new sentences.')."
                ],
                "overallEncouragement": "A positive, personalized (mentioning ${connector.language} by name), and encouraging closing remark (1-3 sentences) to motivate the user for future practice. Mention something specific the user did well or a topic they engaged with, if possible."
            }`;

            // Main prompt instructions
            let prompt = `You are an expert language learning coach for a user learning ${connector.language}. Your name is "Polyglot AI Coach".
You are providing a detailed and constructive debrief for a language practice session between a "User" and an AI Partner named "${connector.profileName}".
The User was primarily practicing their ${connector.language} skills. The AI Partner, ${connector.profileName}, was also speaking ${connector.language}.

Below is the cleaned transcript of their conversation:
--- Transcript ---
${transcriptText}
--- End Transcript ---

Based on the entire transcript, your task is to generate a structured debrief.

CRITICAL INSTRUCTIONS:
1.  Your ENTIRE response MUST be a single, valid JSON object.
2.  You MUST adhere EXACTLY to the following JSON structure and include ALL specified top-level keys. Populate each field thoughtfully based on the transcript.
    ${jsonStructureExample}
3.  Do NOT include any text, comments, or markdown (like \`\`\`json) before or after the JSON object.
4.  All string values within the JSON must be properly escaped for valid JSON.
5.  For arrays of objects (like 'newVocabularyAndPhrases', 'areasForImprovement'):
    - Provide 1-3 items if relevant content is found in the transcript.
    - If no relevant items are found for a specific array, provide an empty array [].  // << FIXED
    - For 'userInputExample' in 'areasForImprovement', if no direct quote applies, use null. // << FIXED (backticks around null also unnecessary)
6.  For arrays of strings (like 'keyTopicsDiscussed', 'goodUsageHighlights', 'suggestedPracticeActivities'):
    - Provide 1-3 items if relevant.
    - If no relevant items are found, provide an empty array []. // << FIXED
7.  All feedback and content within the JSON should be in clear, simple English, unless a field specifically asks for a term or example sentence in ${connector.language}.
8.  If the transcript is very short or lacks clear substance for a particular section, it's acceptable for corresponding arrays to be empty or for string fields to state "N/A" or "Not enough information from this short session." but the JSON structure and all keys must still be present.

Generate the JSON debrief now:`;
            
            console.log(`aiRecapService (${functionName}): FULL Recap prompt constructed. Length: ${prompt.length}. Input Transcript Length: ${transcriptText.length}`);
            return prompt;
        }

        function parseRecapResponse(responseText: string | null, providerName: string): any {
            const functionName = "parseRecapResponse";
            console.log(`aiRecapService (${functionName}): Attempting to parse from ${providerName}. Response length: ${responseText?.length}`);

            if (!responseText || typeof responseText !== 'string') {
                console.error(`aiRecapService (${functionName}): Cannot parse recap, responseText is invalid from ${providerName}.`);
                return getDefaultErrorRecapStructure(providerName);
            }
            let cleanedResponse = responseText.trim();
            const jsonMarkdownMatch = cleanedResponse.match(/^```json\s*([\s\S]*?)\s*```$/m);
            if (jsonMarkdownMatch && jsonMarkdownMatch[1]) cleanedResponse = jsonMarkdownMatch[1].trim();
            else {
                const firstBrace = cleanedResponse.indexOf('{');
                const lastBrace = cleanedResponse.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    const potentialJson = cleanedResponse.substring(firstBrace, lastBrace + 1);
                    if (potentialJson.startsWith("{") && potentialJson.endsWith("}")) cleanedResponse = potentialJson;
                } else {
                     console.warn(`aiRecapService (${functionName}): No valid JSON braces. Parsing original.`);
                }
            }
            try {
                const parsed = JSON.parse(cleanedResponse);
                console.log(`aiRecapService (${functionName}): Successfully parsed JSON from ${providerName}. Parsed Object:`, JSON.stringify(parsed, null, 2));
                if (typeof parsed.conversationSummary !== 'string' || !Array.isArray(parsed.keyTopicsDiscussed)) {
                    console.warn(`aiRecapService (${functionName}): Parsed JSON from ${providerName} missing essential fields.`);
                    return getDefaultErrorRecapStructure(providerName + " (Malformed Structure)");
                }
                return parsed;
            } catch (e: any) {
                console.error(`aiRecapService (${functionName}): JSON.parse FAILED for ${providerName}. Error: ${e.message}.`);
                return getDefaultErrorRecapStructure(providerName + " (JSON Parse Error)");
            }
        }

        async function generateSessionRecap(
            cleanedTranscriptText: string,
            connector: Connector,
            provider: string // Now accepts the specific provider to use
        ): Promise<RecapData> {
            const functionName = `AiRecapService.generate[${provider}]`;
            console.log(`${functionName}: START. Connector: ${connector?.id}, Cleaned transcript length: ${cleanedTranscriptText?.length}`);

            if (!initialDeps) {
                throw new Error(`[${functionName}] Critical dependencies (initialDeps) are missing.`);
            }
            const { openAICompatibleCaller, aiConstants } = initialDeps;

            // --- RESTORED: Detailed validation from your original code ---
            if (!connector?.id || !connector.language || !connector.profileName) {
                // This will be caught by the main carousel in ai_service.ts
                throw new Error(`[${functionName}] Connector info incomplete.`);
            }
            if (!cleanedTranscriptText || cleanedTranscriptText.trim().length < 50) {
                // Also caught by the carousel, but good to have a specific error
                throw new Error(`[${functionName}] Cleaned transcript text too short or empty.`);
            }
            // --- END RESTORED VALIDATION ---

            const prompt = buildRecapPromptForOpenAICompatible(cleanedTranscriptText, connector);
            const messages = [{ role: "user" as const, content: prompt }];
            
            let modelToUse: string | undefined;
            let apiKey: string | undefined;

            if (provider === aiConstants.PROVIDERS.GROQ) {
                modelToUse = aiConstants.GROQ_MODELS.RECAP;
                apiKey = 'proxied-by-cloudflare-worker';
            } else if (provider === aiConstants.PROVIDERS.TOGETHER) {
                modelToUse = aiConstants.TOGETHER_MODELS.RECAP;
                apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
            } else {
                throw new Error(`[${functionName}] Unsupported provider: ${provider}`);
            }

            // --- RESTORED: Detailed API Key validation ---
            if ((provider !== aiConstants.PROVIDERS.GROQ && (!apiKey || apiKey.includes("YOUR_"))) || !modelToUse) {
                 const errorMsg = `API key or model for ${provider} (Recap) is invalid/missing.`;
                 console.error(`${functionName}: ${errorMsg}`);
                 throw new Error(errorMsg);
            }
            // --- END RESTORED VALIDATION ---

            const rawResponse = await openAICompatibleCaller(
                messages, modelToUse, provider, apiKey,
                { temperature: 0.2, response_format: { "type": "json_object" } }
            );
            
            const parsedData = parseRecapResponse(rawResponse, provider);
            
            // --- RESTORED: Detailed check on the parsed data itself ---
            // If the parser itself determined the response was a failure, throw an error.
            if (!parsedData || !parsedData.conversationSummary || parsedData.conversationSummary.includes("failed")) {
                const failureDetail = parsedData?.conversationSummary || "malformed response";
                throw new Error(`[${functionName}] Parsing failed or response was invalid for ${provider}. Detail: ${failureDetail}`);
            }
            // --- END RESTORED CHECK ---

            return parsedData as RecapData;
        }

        console.log("ai_recap_service.ts: IIFE FINISHED.");
        return {
            generateSessionRecap,
            buildRecapPromptForOpenAICompatible, // <<< Expose
            parseRecapResponse                 // <<< Expose
        };
    })(); // End of IIFE

    Object.assign(window.aiRecapService!, serviceMethods); // Populate the placeholder

    if (window.aiRecapService && typeof (window.aiRecapService as AiRecapServiceModule).generateSessionRecap === 'function') {
        console.log("ai_recap_service.ts: SUCCESSFULLY assigned and populated window.aiRecapService.");
    } else {
        console.error("ai_recap_service.ts: CRITICAL ERROR - window.aiRecapService population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('aiRecapServiceReady'));
    console.log('ai_recap_service.ts: "aiRecapServiceReady" event dispatched (after full init attempt).');

} // End of initializeActualAiRecapService

// Dependency checking and event listening logic
const dependenciesForAiRecapService = ['polyglotHelpersReady', 'aiApiConstantsReady', 'openaiCompatibleApiCallerReady']; // Added openaiCompatibleApiCallerReady
const arsMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForAiRecapService.forEach(dep => arsMetDependenciesLog[dep] = false);
let arsDepsMetCount = 0;

function checkAndInitAiRecapService(receivedEventName?: string): void {
    if (receivedEventName) {
        // console.log(`ARS_EVENT: Listener for '${receivedEventName}' was triggered.`); // Original log, can be kept or removed
        let verified = false;
        switch(receivedEventName) {
            case 'polyglotHelpersReady': 
                verified = !!window.polyglotHelpers?.generateUUID; 
                break;
            case 'aiApiConstantsReady': 
                verified = !!window.aiApiConstants?.PROVIDERS; 
                break;
            case 'openaiCompatibleApiCallerReady':
                verified = !!(window.openaiCompatibleApiCaller && typeof window.openaiCompatibleApiCaller === 'function'); 
                console.log(`ARS_DEBUG_EVENT_HANDLER: 'openaiCompatibleApiCallerReady' received. window.openaiCompatibleApiCaller IS ${typeof window.openaiCompatibleApiCaller}. Verified: ${verified}`); // <<< DEBUG LOG
                break;
            default: 
                console.warn(`ARS_EVENT: Unknown event '${receivedEventName}' received by checkAndInitAiRecapService.`);
                return; // Do not proceed for unknown events
        }

        if (verified) { // Only increment if actually verified
            if (!arsMetDependenciesLog[receivedEventName]) {
                arsMetDependenciesLog[receivedEventName] = true;
                arsDepsMetCount++;
                console.log(`ARS_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${arsDepsMetCount}/${dependenciesForAiRecapService.length}`);
            }
        } else {
            console.warn(`ARS_DEPS: Event '${receivedEventName}' received but FAILED verification. Dependency not marked as met.`);
        }
    }
    // This log should be outside the if(receivedEventName) if you want to see the status after every call
    // console.log(`ARS_DEPS: Met status (after processing '${receivedEventName}'):`, JSON.stringify(arsMetDependenciesLog));

    if (arsDepsMetCount === dependenciesForAiRecapService.length) {
        console.log('ai_recap_service.ts: All dependencies met. Initializing actual AiRecapService.');
        initializeActualAiRecapService(); 
    }
}
// Initial Pre-Check and Listener Setup
console.log('ARS_SETUP: Starting initial dependency pre-check.');
arsDepsMetCount = 0;
Object.keys(arsMetDependenciesLog).forEach(key => arsMetDependenciesLog[key] = false);
let arsAllPreloadedAndVerified = true;

dependenciesForAiRecapService.forEach(eventName => {
    let isReadyNow = false;
    let isVerifiedNow = false;

    switch (eventName) {
        case 'polyglotHelpersReady':
            isReadyNow = !!window.polyglotHelpers;
            isVerifiedNow = !!(isReadyNow && typeof window.polyglotHelpers?.formatTranscriptForLLM === 'function');
            break;
        case 'aiApiConstantsReady':
            isReadyNow = !!window.aiApiConstants;
            isVerifiedNow = !!(isReadyNow && typeof window.aiApiConstants?.PROVIDERS === 'object');
            break;
        case 'openaiCompatibleApiCallerReady': // Assuming openai_compatible_api_caller.js dispatches this
          isReadyNow = !!window.openaiCompatibleApiCaller;
isVerifiedNow = !!(isReadyNow && typeof window.openaiCompatibleApiCaller === 'function');
            break;
        default:
            console.warn(`ARS_PRECHECK: Unknown dependency: ${eventName}`);
            break;
    }

    console.log(`ARS_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if (!arsMetDependenciesLog[eventName]) {
            arsMetDependenciesLog[eventName] = true;
            arsDepsMetCount++;
        }
    } else {
        arsAllPreloadedAndVerified = false;
        console.log(`ARS_PRECHECK: Dependency '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, function anEventListener() {
            checkAndInitAiRecapService(eventName);
        }, { once: true });
    }
});

console.log(`ARS_SETUP: Pre-check done. Met: ${arsDepsMetCount}/${dependenciesForAiRecapService.length}`, JSON.stringify(arsMetDependenciesLog));
if (arsAllPreloadedAndVerified && arsDepsMetCount === dependenciesForAiRecapService.length) {
    console.log('ai_recap_service.ts: All dependencies ALREADY MET. Initializing directly.');
    initializeActualAiRecapService();
} else if (arsDepsMetCount === 0 && !arsAllPreloadedAndVerified) {
    console.log('ai_recap_service.ts: No dependencies pre-verified. Waiting for events.');
}

console.log("ai_recap_service.ts: Script execution FINISHED (TS Version).");