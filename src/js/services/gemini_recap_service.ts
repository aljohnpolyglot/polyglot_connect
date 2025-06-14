// src/js/services/gemini_recap_service.ts
import type {
    Connector,
    TranscriptTurn,
    RecapData,
    RecapDataItem,
    AIApiConstants,
    PolyglotHelpersOnWindow // For fallback formatting
} from '../types/global.d.ts';

console.log("gemini_recap_service.ts: Script execution STARTED (TS Version).");

export interface GeminiRecapServiceModule {
    generateSessionRecap: (
        cleanedTranscriptText: string, // <<< CHANGED from fullCallTranscript
        connector: Connector
    ) => Promise<RecapData>;
}
window.geminiRecapService = {} as GeminiRecapServiceModule;

function initializeActualGeminiRecapService(): void {
    console.log("gemini_recap_service.ts: initializeActualGeminiRecapService called.");

    const getSafeDeps = (): { // Added a local getSafeDeps for clarity
        geminiInternalApiCaller: (payload: any, modelIdentifier: string, requestType?: string) => Promise<any>;
        aiConstants: AIApiConstants;
        polyglotHelpers: PolyglotHelpersOnWindow; // For fallback formatting
        aiService?: any; // To access cleanAndReconstructTranscriptLLM, make optional
    } | null => {
        const deps = {
            geminiInternalApiCaller: (window as any)._geminiInternalApiCaller,
            aiConstants: window.aiApiConstants,
            polyglotHelpers: window.polyglotHelpers,
            aiService: window.aiService // Get a reference to aiService
        };

        if (!deps.geminiInternalApiCaller || typeof deps.geminiInternalApiCaller !== 'function') {
            console.error("GeminiRecapService: _geminiInternalApiCaller missing or not a function.");
            return null;
        }
        if (!deps.aiConstants?.GEMINI_MODELS?.RECAP || !deps.aiConstants?.STANDARD_SAFETY_SETTINGS_GEMINI) {
            console.error("GeminiRecapService: aiConstants (GEMINI_MODELS.RECAP or STANDARD_SAFETY_SETTINGS_GEMINI) missing.");
            return null;
        }
        if (!deps.polyglotHelpers?.formatTranscriptForLLM) { // Still needed for fallback
            console.error("GeminiRecapService: polyglotHelpers.formatTranscriptForLLM missing.");
            return null;
        }
        if (!deps.aiService || typeof deps.aiService.cleanAndReconstructTranscriptLLM !== 'function') {
            console.warn("GeminiRecapService: window.aiService.cleanAndReconstructTranscriptLLM not available. LLM transcript cleaning will be skipped for Gemini recaps; will use basic formatting.");
            // Not returning null here, as the service can still function with basic formatting
        }
        return deps as { 
            geminiInternalApiCaller: (payload: any, modelIdentifier: string, requestType?: string) => Promise<any>;
            aiConstants: AIApiConstants; 
            polyglotHelpers: PolyglotHelpersOnWindow;
            aiService?: { cleanAndReconstructTranscriptLLM: Function }; // Be more specific if AiServiceModule is imported
        };
    };
    
    const initialDeps = getSafeDeps();

    if (!initialDeps || !initialDeps.geminiInternalApiCaller || !initialDeps.aiConstants || !initialDeps.polyglotHelpers) { // Check core non-optional deps
        console.error("Gemini Recap Service (TS): CRITICAL - Core API utilities or constants missing. Service non-functional.");
        
        const defaultErrorStructure = (message: string = "Recap service not initialized."): RecapData => ({
            conversationSummary: message, keyTopicsDiscussed: ["Initialization Error"],
            newVocabularyAndPhrases: [], goodUsageHighlights: [], areasForImprovement: [],
            suggestedPracticeActivities: [], overallEncouragement: "Please report this issue.",
            sessionId: `error-${Date.now()}`, date: new Date().toLocaleDateString(), duration: "N/A", startTimeISO: null
        });

        const dummyMethods: GeminiRecapServiceModule = {
            generateSessionRecap: async () => defaultErrorStructure("Gemini Recap Service not initialized (core deps missing).")
        };
        Object.assign(window.geminiRecapService!, dummyMethods);
        document.dispatchEvent(new CustomEvent('geminiRecapServiceReady'));
        console.warn("gemini_recap_service.ts: 'geminiRecapServiceReady' dispatched (INITIALIZATION FAILED - core deps).");
        return;
    }
    console.log("Gemini Recap Service (TS): Core API utilities and constants found. aiService for cleaning is optional but checked.");

    // Destructure from initialDeps, aiService might be undefined
    const { geminiInternalApiCaller, aiConstants, polyglotHelpers, aiService } = initialDeps;
    const { GEMINI_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI } = aiConstants;

    window.geminiRecapService = ((): GeminiRecapServiceModule => {
        'use strict';

        const MODEL_FOR_RECAP = GEMINI_MODELS.RECAP || GEMINI_MODELS.TEXT || "gemini-1.5-flash-latest";

        const defaultErrorRecapStructure = (specificMessage: string = "Debrief generation encountered an unexpected issue with Gemini."): RecapData => ({
            conversationSummary: specificMessage,
            keyTopicsDiscussed: ["N/A - Error"], newVocabularyAndPhrases: [], goodUsageHighlights: [],
            areasForImprovement: [], suggestedPracticeActivities: [],
            overallEncouragement: "An error occurred while generating the debrief with Gemini.",
            sessionId: `error-recap-${Date.now()}`, date: new Date().toLocaleDateString(),
            duration: "N/A", startTimeISO: null
        });

        function cleanJsonStringForRecap(str: string | any): string {
            if (typeof str !== 'string') return JSON.stringify(str || {});
            let cleanedStr = str;
            if (cleanedStr.charCodeAt(0) === 0xFEFF || cleanedStr.charCodeAt(0) === 0xFFFE) cleanedStr = cleanedStr.substring(1);
            cleanedStr = cleanedStr.replace(/^[\s\p{C}]+/u, '').replace(/[\s\p{C}]+$/u, '');
            return cleanedStr;
        }

        async function generateSessionRecap(
            cleanedTranscriptText: string, // <<< NEW SIGNATURE: Accepts pre-cleaned text
            connector: Connector
        ): Promise<RecapData> {
            const functionName = "GeminiRecapService.generateSessionRecap";
            console.log(`${functionName}: START. Connector: ${connector?.id}. Cleaned transcript length: ${cleanedTranscriptText?.length}`);

            // Dependencies (geminiInternalApiCaller, aiConstants, polyglotHelpers) are from the outer IIFE scope (initialDeps)

            if (!connector?.id || !connector.language || !connector.profileName) {
                console.warn(`${functionName}: Connector info incomplete.`, connector);
                return defaultErrorRecapStructure("Connector information incomplete for Gemini recap."); // Ensure defaultErrorRecapStructure is defined in this file's IIFE
            }

            // The MIN_TRANSCRIPT_TURNS_FOR_RECAP check is now handled by the ai_service.ts facade.
            // This service assumes it receives a transcript deemed sufficient for processing.
            // However, a basic check on cleanedTranscriptText is still good.
            if (!cleanedTranscriptText || cleanedTranscriptText.trim().length < 50) { // Arbitrary short length check for cleaned text
                console.warn(`${functionName}: Cleaned transcript text too short or empty for ${connector.id}.`);
                return {
                    conversationSummary: "The conversation was too short or content insufficient for a detailed Gemini debrief.",
                    keyTopicsDiscussed: ["N/A"], newVocabularyAndPhrases: [], goodUsageHighlights: [],
                    areasForImprovement: [], suggestedPracticeActivities: [], overallEncouragement: "Please try a longer conversation.",
                    sessionId: `gemini-short-${connector.id}-${Date.now()}`, date: new Date().toLocaleDateString(),
                    duration: "N/A", startTimeISO: null, connectorId: connector.id, connectorName: connector.profileName
                };
            }

            // Prompt construction using the pre-cleaned transcriptText
            const recapPromptInstructions = `
You are an expert, friendly, and encouraging language learning coach for a user learning ${connector.language}.
Analyze the following conversation transcript between the "User" and an "AI Partner" (named ${connector.profileName || connector.name}, who was speaking primarily in ${connector.language}).
Your entire output MUST BE a single, valid JSON object. Do NOT include any text before or after the JSON object itself. Do not use markdown code blocks like \`\`\`json.
The JSON object MUST strictly adhere to the following structure with ALL specified top-level keys:
- "conversationSummary": (string) A brief 2-3 sentence overview of the main flow, purpose, and overall feel of the conversation.
- "keyTopicsDiscussed": (array of strings) List 3-5 main subjects or themes talked about.
- "newVocabularyAndPhrases": (array of objects) Identify 1-3 useful vocabulary items or short phrases in ${connector.language} that the User encountered or that were introduced. For each: { "term": "term/phrase in ${connector.language}", "translation": "concise English translation", "exampleSentence": "example from transcript or new one" }.
- "goodUsageHighlights": (array of strings) Point out 1-2 specific instances where the User showed good use of ${connector.language}.
- "areasForImprovement": (array of objects) Identify 1-2 specific areas for User's improvement. For each: { "areaType": "category (e.g., Grammar, Vocabulary, Fluency)", "userInputExample": "User's phrase, or null.", "coachSuggestion": "Corrected/better phrase in ${connector.language}.", "explanation": "Why it's better.", "exampleWithSuggestion": "Full corrected sentence." }.
- "suggestedPracticeActivities": (array of strings) 1-2 brief, actionable suggestions.
- "overallEncouragement": (string) A short, positive, encouraging closing remark (1-2 sentences).

TRANSCRIPT TO ANALYZE:
${cleanedTranscriptText}

Remember: ONLY the JSON object. All string values must be properly escaped.
If a section has no relevant items, provide an empty array [] or null for userInputExample.
`;
            const payload = {
                contents: [{ role: "user" as const, parts: [{ text: recapPromptInstructions }] }],
                generationConfig: {
                    responseMimeType: "application/json", // Request JSON output directly from Gemini
                    temperature: 0.4
                },
                safetySettings: aiConstants.STANDARD_SAFETY_SETTINGS_GEMINI // aiConstants from outer scope
            };

            const modelForRecap = GEMINI_MODELS.RECAP || GEMINI_MODELS.TEXT || "gemini-1.5-flash-latest"; // GEMINI_MODELS from aiConstants

            try {
                console.log(`${functionName}: Requesting recap from Gemini. Model: '${modelForRecap}'. Prompt based on cleaned transcript.`);
                const rawResponse = await geminiInternalApiCaller(payload, modelForRecap, "generateContent"); // geminiInternalApiCaller from outer scope

                if (!rawResponse) throw new Error("Gemini API returned an empty response for recap.");

                let parsedResponse: Partial<RecapData>;
                if (typeof rawResponse === 'string') {
                    // Attempt to clean and parse if Gemini returns a string (though application/json should yield object)
                    let jsonAttempt = rawResponse.trim();
                    const mdMatch = jsonAttempt.match(/```json\s*([\s\S]*?)\s*```/s);
                    if (mdMatch && mdMatch[1]) jsonAttempt = mdMatch[1].trim();
                    
                    try {
                        parsedResponse = JSON.parse(jsonAttempt);
                    } catch (e: any) {
                        console.error(`${functionName}: Failed to parse string response from Gemini as JSON. Error: ${e.message}. Raw: ${rawResponse.substring(0,500)}`);
                        throw new Error("Gemini recap response (string) was not valid JSON.");
                    }
                } else if (typeof rawResponse === 'object' && rawResponse !== null) {
                    parsedResponse = rawResponse as Partial<RecapData>; // Assume it's already the correct object structure
                } else {
                    throw new Error ("Gemini API returned an unexpected response type for recap.");
                }

                // Validate essential fields from parsedResponse
                if (typeof parsedResponse.conversationSummary !== 'string' || !Array.isArray(parsedResponse.keyTopicsDiscussed)) {
                     console.warn(`${functionName}: Parsed Gemini JSON missing essential fields or has incorrect types.`);
                     return defaultErrorRecapStructure("Gemini (Malformed Structure)");
                }

                // Construct a full RecapData object, ensuring all keys are present by merging with defaults
                return {
                    ...defaultErrorRecapStructure("Gemini"), // Base to ensure all keys
                    ...parsedResponse,                       // Override with AI's response
                    sessionId: `gemini-recap-${connector.id}-${Date.now()}`, // Specific session ID for this attempt
                    connectorId: connector.id,
                    connectorName: connector.profileName,
                    date: new Date().toLocaleDateString(),
                    // duration & startTimeISO are usually set by session_state_manager for the SessionData
                };

            } catch (error: any) {
                console.error(`${functionName}: Error for ${connector.profileName}: ${error.message}`, error);
                return defaultErrorRecapStructure(`Gemini Recap API Error: ${error.message}`);
            }
        } // End of generateSessionRecap for Gemini

        console.log("gemini_recap_service.ts: IIFE (TS Version) finished.");
        return {
            generateSessionRecap
        };
    })(); 

    if (window.geminiRecapService && typeof window.geminiRecapService.generateSessionRecap === 'function') {
        console.log("gemini_recap_service.ts: SUCCESSFULLY assigned and method verified.");
    } else {
        console.error("gemini_recap_service.ts: CRITICAL ERROR - window.geminiRecapService not correctly formed.");
    }
    document.dispatchEvent(new CustomEvent('geminiRecapServiceReady'));
    console.log("gemini_recap_service.ts: 'geminiRecapServiceReady' event dispatched (after full init attempt).");

} 

// Dependencies for this service to be fully functional (including optional LLM cleaning)
const dependenciesForGRS = ['geminiApiCallerLogicReady', 'aiApiConstantsReady', 'polyglotHelpersReady', 'aiServiceReady']; // Added aiServiceReady
const grsMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGRS.forEach(dep => grsMetDependenciesLog[dep] = false);
let grsDepsMetCount = 0;

function checkAndInitGRS(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'geminiApiCallerLogicReady':
                verified = !!(window as any)._geminiInternalApiCaller; break;
            case 'aiApiConstantsReady':
                verified = !!(window.aiApiConstants?.GEMINI_MODELS && window.aiApiConstants.STANDARD_SAFETY_SETTINGS_GEMINI); break;
            case 'polyglotHelpersReady':
                verified = !!window.polyglotHelpers?.formatTranscriptForLLM; break;
            case 'aiServiceReady': // For accessing cleanAndReconstructTranscriptLLM
                verified = !!(window.aiService && typeof window.aiService.cleanAndReconstructTranscriptLLM === 'function'); break;
            default: console.warn(`GeminiRecapService: Unknown event ${receivedEventName}`); return;
        }
        if (verified && !grsMetDependenciesLog[receivedEventName]) {
            grsMetDependenciesLog[receivedEventName] = true;
            grsDepsMetCount++;
            console.log(`GeminiRecapService_DEPS: Event '${receivedEventName}' VERIFIED. Count: ${grsDepsMetCount}/${dependenciesForGRS.length}`);
        } else if (!verified) {
            console.warn(`GeminiRecapService_DEPS: Event '${receivedEventName}' FAILED verification.`);
        }
    }
    if (grsDepsMetCount === dependenciesForGRS.length) {
        console.log('GeminiRecapService: All dependencies met. Initializing.');
        initializeActualGeminiRecapService();
    }
}

console.log('GeminiRecapService_SETUP: Starting pre-check for dependencies.');
grsDepsMetCount = 0; 
Object.keys(grsMetDependenciesLog).forEach(k => grsMetDependenciesLog[k] = false);
let grsAllPreloadedAndVerified = true;

dependenciesForGRS.forEach(eventName => {
    let isVerified = false;
    switch(eventName) {
        case 'geminiApiCallerLogicReady': isVerified = !!(window as any)._geminiInternalApiCaller; break;
        case 'aiApiConstantsReady': isVerified = !!(window.aiApiConstants?.GEMINI_MODELS && window.aiApiConstants.STANDARD_SAFETY_SETTINGS_GEMINI); break;
        case 'polyglotHelpersReady': isVerified = !!window.polyglotHelpers?.formatTranscriptForLLM; break;
        case 'aiServiceReady': isVerified = !!(window.aiService && typeof window.aiService.cleanAndReconstructTranscriptLLM === 'function'); break;
    }

    if (isVerified) {
        console.log(`GeminiRecapService_PRECHECK: Dependency '${eventName}' ALREADY MET.`);
        if(!grsMetDependenciesLog[eventName]) { grsMetDependenciesLog[eventName] = true; grsDepsMetCount++; }
    } else {
        grsAllPreloadedAndVerified = false;
        console.log(`GeminiRecapService_PRECHECK: Dependency '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitGRS(eventName), { once: true });
    }
});

if (grsAllPreloadedAndVerified && grsDepsMetCount === dependenciesForGRS.length) {
    console.log('GeminiRecapService: All dependencies pre-verified. Initializing directly.');
    initializeActualGeminiRecapService();
} else if (!grsAllPreloadedAndVerified) {
    console.log(`GeminiRecapService: Waiting for ${dependenciesForGRS.length - grsDepsMetCount} dependency event(s).`);
} else if (dependenciesForGRS.length === 0) {
    initializeActualGeminiRecapService();
}

console.log("gemini_recap_service.ts: Script execution FINISHED (TS Version).");