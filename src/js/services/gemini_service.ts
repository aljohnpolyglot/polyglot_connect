// src/js/services/gemini_service.ts
import type {
    Connector,
    GeminiChatItem,
    TranscriptTurn,
    RecapData, // For return type of generateSessionRecap
    // Import the newly defined sub-service interfaces
    GeminiTtsService,
    GeminiTextGenerationService,
    GeminiMultimodalService,
    GeminiRecapService
} from '../types/global.d.ts';

console.log("gemini_service.ts: Script execution STARTED (TS Facade).");

export interface GeminiServiceModule {
    getTTSAudio: (
        textToSpeak: string,
        languageCode?: string,
        geminiVoiceName?: string,
        stylePrompt?: string | null
    ) => Promise<{ audioBase64: string; mimeType: string } | null >;

    generateTextMessage: (
        userText: string,
        connector: Connector,
        existingGeminiHistory: GeminiChatItem[]
    ) => Promise<string | null>;

    generateTextForCallModal?: ( // This was optional
        userText: string,
        connector: Connector,
        modalCallHistory: GeminiChatItem[]
    ) => Promise<string | null>;

    generateTextFromAudioForCallModal?: ( // This was optional
        base64AudioString: string,
        mimeType: string,
        connector: Connector,
        modalCallHistory: GeminiChatItem[]
    ) => Promise<string | null>;

    generateTextFromImageAndText?: ( // This was optional
        base64ImageString: string,
        mimeType: string,
        connector: Connector,
        existingGeminiHistory: GeminiChatItem[],
        optionalUserText?: string
    ) => Promise<string | null>;

    generateSessionRecap: ( // <<< ENSURE THIS MATCHES
        cleanedTranscriptText: string, // The corrected signature
        connector: Connector
    ) => Promise<RecapData>;

    transcribeAudioToText?: ( // This was optional
        base64Audio: string,
        mimeType: string,
        langHint?: string
    ) => Promise<string | null>;
}

// Placeholder
window.geminiService = {} as GeminiServiceModule;

function initializeActualGeminiService(): void {
    console.log("gemini_service.ts: initializeActualGeminiService called.");

    // Perform checks for the specialized service modules.
    // These checks are important because this facade depends on them.
    // We do this *before* defining the service object.
    let allSubServicesReady = true;
    const missingSubServices: string[] = [];

    if (!window.geminiTtsService || typeof window.geminiTtsService.getTTSAudio !== 'function') {
        console.error("Gemini Facade (TS): geminiTtsService not available or missing getTTSAudio.");
        missingSubServices.push("geminiTtsService.getTTSAudio");
        allSubServicesReady = false;
    }
    if (!window.geminiTextGenerationService || typeof window.geminiTextGenerationService.generateTextMessage !== 'function') {
        console.error("Gemini Facade (TS): geminiTextGenerationService not available or missing generateTextMessage.");
        missingSubServices.push("geminiTextGenerationService.generateTextMessage");
        allSubServicesReady = false;
    }
    if (!window.geminiMultimodalService || 
        (typeof window.geminiMultimodalService.generateTextFromAudioForCallModal !== 'function' && 
         typeof window.geminiMultimodalService.generateTextFromImageAndText !== 'function' &&
         typeof window.geminiMultimodalService.transcribeAudioToText !== 'function') ) { // Check if at least one key method exists
        console.error("Gemini Facade (TS): geminiMultimodalService not available or missing its key methods.");
        missingSubServices.push("geminiMultimodalService methods");
        allSubServicesReady = false;
    }
    if (!window.geminiRecapService || typeof window.geminiRecapService.generateSessionRecap !== 'function') {
        console.error("Gemini Facade (TS): geminiRecapService not available or missing generateSessionRecap.");
        missingSubServices.push("geminiRecapService.generateSessionRecap");
        allSubServicesReady = false;
    }

    if (!allSubServicesReady) {
        console.error(`Gemini Facade (TS): Cannot initialize fully due to missing sub-services: ${missingSubServices.join(', ')}. Assigning a partial/dummy service.`);
        // Assign a dummy or partially functional service to window.geminiService
        // The placeholder is already there, so we might just log and proceed,
        // or populate it with methods that throw errors.
        // For now, let's allow it to proceed and the individual methods will throw errors if their deps are missing.
    } else {
        console.log("Gemini Facade (TS): All required sub-service modules appear to be available.");
    }

    window.geminiService = ((): GeminiServiceModule => {
        'use strict';

        const service: GeminiServiceModule = {
           getTTSAudio: async (textToSpeak, languageCode?: string, geminiVoiceName?: string, stylePrompt = null) => {
            console.log(`GEMINI_SERVICE_FACADE_GETTTSAUDIO (TS): Lang: ${languageCode}, VoiceName: ${geminiVoiceName}, Style: ${stylePrompt}`); // Log to differentiate
            const ttsService = window.geminiTtsService as GeminiTtsService | undefined;
            if (ttsService?.getTTSAudio) {
                const effectiveLanguageCode = languageCode || "en-US"; // Default
                return ttsService.getTTSAudio(textToSpeak, effectiveLanguageCode, geminiVoiceName, stylePrompt);
            }
            console.error("Gemini Service Facade (TS): TTS service unavailable for getTTSAudio.");
            throw new Error("TTS service unavailable.");
        },

            generateTextMessage: async (userText, connector, existingGeminiHistory) => {
                const txtGenService = window.geminiTextGenerationService as GeminiTextGenerationService | undefined;
                if (txtGenService?.generateTextMessage) {
                    return txtGenService.generateTextMessage(userText, connector, existingGeminiHistory);
                }
                console.error("Gemini Facade (TS): Text generation service unavailable for generateTextMessage at call time.");
                return `(Text generation service error. Please try again.)`; // Consistent error return
            },

            generateTextForCallModal: async (userText, connector, modalCallHistory) => {
                const txtGenService = window.geminiTextGenerationService as GeminiTextGenerationService | undefined;
                if (txtGenService?.generateTextForCallModal) {
                    return txtGenService.generateTextForCallModal(userText, connector, modalCallHistory);
                }
                console.error("Gemini Facade (TS): Text generation service unavailable for generateTextForCallModal at call time.");
                return `(Call text input service error. Please try again.)`;
            },

            generateTextFromAudioForCallModal: async (base64AudioString, mimeType, connector, modalCallHistory) => {
                const mmService = window.geminiMultimodalService as GeminiMultimodalService | undefined;
                if (mmService?.generateTextFromAudioForCallModal) {
                    return mmService.generateTextFromAudioForCallModal(base64AudioString, mimeType, connector, modalCallHistory);
                }
                console.error("Gemini Facade (TS): Multimodal service unavailable for generateTextFromAudioForCallModal at call time.");
                return `(Audio processing service error. Please try again.)`;
            },

            generateTextFromImageAndText: async (base64ImageString, mimeType, connector, existingGeminiHistory, optionalUserText) => {
                const mmService = window.geminiMultimodalService as GeminiMultimodalService | undefined;
                if (mmService?.generateTextFromImageAndText) {
                    return mmService.generateTextFromImageAndText(base64ImageString, mimeType, connector, existingGeminiHistory, optionalUserText);
                }
                console.error("Gemini Facade (TS): Multimodal service unavailable for generateTextFromImageAndText at call time.");
                return `(Image processing service error. Please try again.)`;
            },

            generateSessionRecap: async (
                cleanedTranscriptText: string, // <<< CHANGE PARAMETER TYPE
                connector: Connector
            ): Promise<RecapData> => { // <<< Ensure return type is RecapData
                const recapService = window.geminiRecapService as GeminiRecapService | undefined;
                if (recapService?.generateSessionRecap) {
                    // Now this call matches what gemini_recap_service.ts expects
                    return recapService.generateSessionRecap(cleanedTranscriptText, connector);
                }
                console.error("Gemini Service Facade (TS): geminiRecapService unavailable for generateSessionRecap.");
                // Return a valid RecapData error structure
                return {
                    conversationSummary: "Gemini recap sub-service unavailable.",
                    keyTopicsDiscussed: ["Error"], newVocabularyAndPhrases: [], goodUsageHighlights: [],
                    areasForImprovement: [], suggestedPracticeActivities: [], overallEncouragement: "Service error.",
                    sessionId: `error-gs-facade-${Date.now()}`, date: new Date().toLocaleDateString(),
                    duration: "N/A", startTimeISO: null, connectorId: connector?.id, connectorName: connector?.profileName
                };
            },

            transcribeAudioToText: async (base64Audio, mimeType, langHint) => {
                const mmService = window.geminiMultimodalService as GeminiMultimodalService | undefined;
                if (mmService?.transcribeAudioToText) {
                    return mmService.transcribeAudioToText(base64Audio, mimeType, langHint);
                }
                console.error("Gemini Facade (TS): Multimodal service unavailable for transcribeAudioToText at call time.");
                throw new Error("Transcription service unavailable.");
            }
        };

        console.log("gemini_service.ts: Facade IIFE finished, window.geminiService object defined.");
        return service;
    })(); // End of IIFE

    if (window.geminiService && typeof window.geminiService.generateTextMessage === 'function') {
        console.log("gemini_service.ts: SUCCESSFULLY assigned and populated window.geminiService.");
        document.dispatchEvent(new CustomEvent('geminiServiceReady'));
        console.log("gemini_service.ts: 'geminiServiceReady' event dispatched.");
    } else {
        console.error("gemini_service.ts: CRITICAL ERROR - window.geminiService not correctly formed or key method missing.");
        document.dispatchEvent(new CustomEvent('geminiServiceReady')); // Dispatch even on failure to not block dependents
        console.warn("gemini_service.ts: 'geminiServiceReady' dispatched (initialization FAILED).");
    }

} // End of initializeActualGeminiService

// This facade depends on its sub-services being ready.
// It should wait for their 'Ready' events.
const geminiServiceDependencies = [
    'geminiTtsServiceReady',
    'geminiTextGenerationServiceReady',
    'geminiMultimodalServiceReady',
    'geminiRecapServiceReady' 
    // Add other core dependencies if this facade needs them directly, e.g., 'aiApiConstantsReady'
];

const gsMetDependenciesLog: { [key: string]: boolean } = {};
geminiServiceDependencies.forEach(dep => gsMetDependenciesLog[dep] = false);
let gsDepsMetCount = 0;

function checkAndInitGeminiService(receivedEventName?: string) {
    if (receivedEventName) {
        console.log(`GeminiService_EVENT (TS): Listener for '${receivedEventName}' was triggered.`);
        let verified = false;
        // Verify the actual window object upon event
        switch(receivedEventName) {
            case 'geminiTtsServiceReady': 
                verified = !!(window.geminiTtsService && typeof window.geminiTtsService.getTTSAudio === 'function'); 
                break;
            case 'geminiTextGenerationServiceReady': 
                verified = !!(window.geminiTextGenerationService && typeof window.geminiTextGenerationService.generateTextMessage === 'function'); 
                break;
            case 'geminiMultimodalServiceReady': 
                verified = !!(window.geminiMultimodalService && (
                    typeof window.geminiMultimodalService.generateTextFromAudioForCallModal === 'function' ||
                    typeof window.geminiMultimodalService.generateTextFromImageAndText === 'function' ||
                    typeof window.geminiMultimodalService.transcribeAudioToText === 'function'
                )); 
                break;
            case 'geminiRecapServiceReady': 
                verified = !!(window.geminiRecapService && typeof window.geminiRecapService.generateSessionRecap === 'function'); 
                break;
            default: console.warn(`GeminiService_EVENT (TS): Unknown event ${receivedEventName}`); return;
        }

        if (verified && !gsMetDependenciesLog[receivedEventName]) {
            gsMetDependenciesLog[receivedEventName] = true;
            gsDepsMetCount++;
            console.log(`GeminiService_DEPS (TS): Event '${receivedEventName}' processed. Count: ${gsDepsMetCount}/${geminiServiceDependencies.length}`);
        } else if (!verified) {
             console.warn(`GeminiService_DEPS (TS): Event '${receivedEventName}' FAILED verification.`);
        }
    }
    if (gsDepsMetCount === geminiServiceDependencies.length) {
        console.log('GeminiService (TS): All sub-service dependencies met. Initializing actual GeminiService Facade.');
        initializeActualGeminiService();
    }
}

// Pre-check for dependencies
console.log('GeminiService_SETUP (TS): Starting pre-check for sub-service dependencies.');
gsDepsMetCount = 0;
Object.keys(gsMetDependenciesLog).forEach(k => gsMetDependenciesLog[k] = false);
let gsAllPreloaded = true;

geminiServiceDependencies.forEach(eventName => {
    let isVerified = false;
    switch(eventName) {
        case 'geminiTtsServiceReady': 
            isVerified = !!(window.geminiTtsService && typeof window.geminiTtsService.getTTSAudio === 'function'); 
            break;
        case 'geminiTextGenerationServiceReady': 
            isVerified = !!(window.geminiTextGenerationService && typeof window.geminiTextGenerationService.generateTextMessage === 'function'); 
            break;
        case 'geminiMultimodalServiceReady': 
            isVerified = !!(window.geminiMultimodalService && (
                typeof window.geminiMultimodalService.generateTextFromAudioForCallModal === 'function' ||
                typeof window.geminiMultimodalService.generateTextFromImageAndText === 'function' ||
                typeof window.geminiMultimodalService.transcribeAudioToText === 'function'
            )); 
            break;
        case 'geminiRecapServiceReady': 
            isVerified = !!(window.geminiRecapService && typeof window.geminiRecapService.generateSessionRecap === 'function'); 
            break;
    }

    if (isVerified) {
        console.log(`GeminiService_PRECHECK (TS): Dependency '${eventName}' ALREADY MET.`);
        if(!gsMetDependenciesLog[eventName]) { 
            gsMetDependenciesLog[eventName] = true; 
            gsDepsMetCount++; 
        }
    } else {
        gsAllPreloaded = false;
        console.log(`GeminiService_PRECHECK (TS): Dependency '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitGeminiService(eventName), { once: true });
    }
});

if (gsAllPreloaded && gsDepsMetCount === geminiServiceDependencies.length) {
    console.log('GeminiService (TS): All sub-service dependencies pre-verified. Initializing directly.');
    initializeActualGeminiService();
} else if (!gsAllPreloaded) {
    console.log(`GeminiService (TS): Waiting for ${geminiServiceDependencies.length - gsDepsMetCount} sub-service dependency event(s).`);
}

console.log("gemini_service.ts: Script execution FINISHED (TS Facade).");