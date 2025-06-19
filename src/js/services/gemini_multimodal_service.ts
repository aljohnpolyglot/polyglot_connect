// src/js/services/gemini_multimodal_service.ts
import type {
    Connector,
    GeminiChatItem,
    AIApiConstants
} from '../types/global.js';

console.log("gemini_multimodal_service.ts: Script execution STARTED (TS Version).");

// Interface for the module, should align with GeminiMultimodalService in global.d.ts
export interface GeminiMultimodalServiceModule {
    generateTextFromAudioForCallModal: (
        base64AudioString: string,
        mimeType: string,
        connector: Connector,
        modalCallHistory: GeminiChatItem[] // Assuming it always receives an array
    ) => Promise<string | null>;

    generateTextFromImageAndText: (
        base64ImageString: string,
        mimeType: string,
        connector: Connector,
        existingGeminiHistory: GeminiChatItem[],
        optionalUserText?: string
    ) => Promise<string | null>;

    transcribeAudioToText: (
        base64AudioString: string,
        mimeType: string,
        languageHint?: string
    ) => Promise<string | null>;
}

// Placeholder on window
window.geminiMultimodalService = {} as GeminiMultimodalServiceModule;

function initializeActualGeminiMultimodalService(): void {
    console.log("gemini_multimodal_service.ts: initializeActualGeminiMultimodalService called.");

    const _geminiInternalApiCaller = (window as any)._geminiInternalApiCaller as (
        payload: any,
        modelIdentifier: string,
        requestType?: string
    ) => Promise<any>;

    const aiConstants = window.aiApiConstants as AIApiConstants | undefined;

    if (!_geminiInternalApiCaller || !aiConstants?.GEMINI_MODELS) {
        console.error("Gemini Multimodal Service (TS): CRITICAL - Core API utilities (_geminiInternalApiCaller or aiApiConstants with GEMINI_MODELS) not found. Service non-functional.");
        
        const errorFn = async (errorMessagePrefix: string = "Multimodal Service"): Promise<null> => {
            const errorMsg = `${errorMessagePrefix} not initialized (core deps missing).`;
            console.error("Gemini Multimodal Service (TS) Call Failed:", errorMsg);
            throw new Error(errorMsg); // Throw to match original behavior
        };
        const dummyMethods: GeminiMultimodalServiceModule = {
            generateTextFromAudioForCallModal: () => errorFn("generateTextFromAudioForCallModal"),
            generateTextFromImageAndText: () => errorFn("generateTextFromImageAndText"),
            transcribeAudioToText: () => errorFn("transcribeAudioToText")
        };
        Object.assign(window.geminiMultimodalService!, dummyMethods);
        document.dispatchEvent(new CustomEvent('geminiMultimodalServiceReady'));
        console.warn("gemini_multimodal_service.ts: 'geminiMultimodalServiceReady' dispatched (INITIALIZATION FAILED - core deps).");
        return;
    }
    console.log("Gemini Multimodal Service (TS): Core API utilities found.");

    const { GEMINI_MODELS } = aiConstants; // Destructure after check

    window.geminiMultimodalService = ((): GeminiMultimodalServiceModule => {
        'use strict';

        async function transcribeAudioToText(
            base64AudioString: string,
            mimeType: string,
            languageHint: string = "en-US" // Default language hint
        ): Promise<string | null> {
            // console.log(`GeminiMultimodalService (TS): transcribeAudioToText. Lang: ${languageHint}, Mime: ${mimeType.substring(0,30)}`);
            if (!base64AudioString) throw new Error("Audio data missing for transcription.");
            if (!mimeType) throw new Error("MimeType missing for transcription.");

            const contents: GeminiChatItem[] = [{
                role: "user",
                parts: [
                    { text: `Please transcribe the following audio. The primary language spoken is likely ${languageHint}. Focus on accurate transcription.` },
                    { inlineData: { mimeType: mimeType, data: base64AudioString } }
                ]
            }];

            const payload = {
                contents: contents,
                generationConfig: { temperature: 0.2 }
            };
            
            const modelToUse = GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT || "gemini-1.5-flash-latest";
            
            try {
                // console.log(`GeminiMultimodalService (TS): Calling Gemini for STT with model ${modelToUse}.`);
                const { response: transcription, nickname } = await _geminiInternalApiCaller(payload, modelToUse, "generateContent");
                console.log(`%c...transcription by: ${nickname}!`, 'color: #34A853;');
                if (typeof transcription === 'string') {
                    // console.log("GeminiMultimodalService (TS): Transcription successful. Length:", transcription.length);
                    return transcription;
                }
                console.warn("GeminiMultimodalService (TS): Transcription result was not a string:", transcription);
                if (transcription && typeof transcription === 'object' && (transcription as any).startsWith?.("(My response was blocked")) {
                     throw new Error(transcription as string);
                }
                throw new Error("Transcription result from API was not in expected text format.");
            } catch (error: any) {
                console.error(`GeminiMultimodalService (TS): transcribeAudioToText Error:`, error.message, error);
                throw error; 
            }
        }

        async function generateTextFromAudioForCallModal(
            base64AudioString: string,
            mimeType: string,
            connector: Connector,
            modalCallHistory: GeminiChatItem[]
        ): Promise<string | null> {
            // console.log(`GeminiMultimodalService (TS): generateTextFromAudioForCallModal for ${connector?.id}`);
            if (!connector?.profileName || !connector.language) throw new Error("Connector info missing.");
            if (!base64AudioString) throw new Error("Audio data missing.");

            const turnInstruction = `You are ${connector.profileName}. The user has just spoken. Their audio has been transcribed. Respond naturally in ${connector.language}. Maintain your persona. This is a voice call; avoid emojis and parenthetical remarks.`;
            
            let contents: GeminiChatItem[] = [
                { role: "user", parts: [{ text: turnInstruction }] },
                { role: "model", parts: [{ text: `Okay, I understand. I am ${connector.profileName}. I will respond in ${connector.language}.` }] }
            ];

            const MAX_TEXT_HISTORY_FOR_AUDIO_CONTEXT = 4;
            if (Array.isArray(modalCallHistory)) {
                modalCallHistory.slice(-MAX_TEXT_HISTORY_FOR_AUDIO_CONTEXT).forEach(turn => {
                    if (turn?.role && Array.isArray(turn.parts) && turn.parts.length > 0) {
                        const firstPart = turn.parts[0];
                        let textContent = "[interaction segment]";
                        if ('text' in firstPart && typeof firstPart.text === 'string') textContent = firstPart.text;
                        contents.push({ role: turn.role, parts: [{ text: textContent }] });
                    }
                });
            }
            contents.push({ role: "user", parts: [{ inlineData: { mimeType: mimeType, data: base64AudioString } }] });

            const payload = { 
                contents: contents,
                generationConfig: { temperature: 0.7 }
            };
            
            const modelToUse = GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT || "gemini-1.5-flash-latest";
            try {
                // console.log(`GeminiMultimodalService (TS): Calling Gemini for call modal audio-to-text with model ${modelToUse}.`);
                const { response, nickname } = await _geminiInternalApiCaller(payload, modelToUse, "generateContent");
                console.log(`%c...image analysis by: ${nickname}!`, 'color: #34A853;');
                if (typeof response !== 'string') {
                     throw new Error("Response from audio processing (call modal) was not text.");
                }
                return response;
            } catch (error: any) {
                console.error(`GeminiMultimodalService (TS): generateTextFromAudioForCallModal Error for ${connector.profileName}:`, error.message);
                throw error; 
            }
        }

        async function generateTextFromImageAndText(
            base64ImageString: string,
            mimeType: string,
            connector: Connector,
            existingGeminiHistory: GeminiChatItem[],
            optionalUserText?: string,
            preferredProvider?: string, // <<< ADD THIS (even if unused, to match the call signature)
            abortSignal?: AbortSignal   // <<< ADD THIS
        ): Promise<string | null> {

            const functionName = "GeminiMultimodalService.generateTextFromImageAndText";
            
            if (!connector?.profileName || !connector.language) { /* ... error handling ... */ throw new Error("Connector info missing.");}
            if (!base64ImageString) { /* ... error handling ... */  throw new Error("Image data missing."); }
            if (!mimeType) { /* ... error handling ... */ throw new Error("MimeType missing."); }

            const userProvidedQueryText = (optionalUserText && optionalUserText.trim() !== "") 
                ? optionalUserText.trim() 
                : `The user sent this image. Please describe it or ask a relevant question about it in ${connector.language}.`;

                const currentTurnParts: Array<{text: string} | {inlineData: {mimeType: string, data: string}}> = [
                    { text: userProvidedQueryText } 
                ];
                currentTurnParts.push({ 
                    inlineData: { 
                        mimeType: mimeType,
                        data: base64ImageString 
                    } 
                });
            
                const modelToUse = GEMINI_MODELS.MULTIMODAL || GEMINI_MODELS.TEXT || "gemini-1.5-flash-latest";

                // <<< START OF REPLACEMENT >>>
                const payload = {
                    contents: [{ role: "user", parts: currentTurnParts }], // This correctly sends ONLY the current image and text query.
                    generationConfig: { 
                        temperature: 0.4,
                    }
                    // Safety settings will be applied by the _geminiInternalApiCaller, so not strictly needed here.
                };
            console.log(`${functionName} PAYLOAD for ${connector.id} (Model: ${modelToUse}):`, JSON.stringify(payload, null, 2));
            // ... rest of the try/catch

            try {
                const { response, nickname } = await _geminiInternalApiCaller(payload, modelToUse, "generateContent");
                console.log(`%c...call modal response by: ${nickname}!`, 'color: #34A853;');
                
                if (typeof response === 'string' && response.trim() !== "") {
                    return response;
                } else if (response && typeof response === 'object' && (response as any).error) {
                    console.error(`${functionName}: Gemini API returned an error object:`, (response as any).error);
                    throw new Error(`Gemini API error: ${(response as any).error.message || 'Unknown API error object'}`);
                } else {
                    console.warn(`${functionName}: Response from image processing was not a non-empty string. Response:`, response);
                    throw new Error("Response from image processing was not in the expected text format or was empty.");
                }
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.log(`%c[Interrupt] Gemini vision request for ${connector.profileName} was cancelled.`, 'color: #ff9800;');
                    throw error; // Re-throw so the calling service knows to stop
                }
                console.error(`${functionName} Error for ${connector.profileName}: ${error.message}`, error);
                throw error; 
            }
        }
        console.log("gemini_multimodal_service.ts: IIFE (TS Version) finished.");
        return {
            generateTextFromAudioForCallModal,
            generateTextFromImageAndText,
            transcribeAudioToText
        };
    })(); // End of IIFE

    if (window.geminiMultimodalService && 
        typeof window.geminiMultimodalService.transcribeAudioToText === 'function' &&
        typeof window.geminiMultimodalService.generateTextFromImageAndText === 'function' &&
        typeof window.geminiMultimodalService.generateTextFromAudioForCallModal === 'function'
        ) {
        console.log("gemini_multimodal_service.ts: SUCCESSFULLY assigned and methods verified.");
        document.dispatchEvent(new CustomEvent('geminiMultimodalServiceReady'));
        console.log("gemini_multimodal_service.ts: 'geminiMultimodalServiceReady' event dispatched.");
    } else {
        console.error("gemini_multimodal_service.ts: CRITICAL ERROR - window.geminiMultimodalService not correctly formed.");
        document.dispatchEvent(new CustomEvent('geminiMultimodalServiceReady'));
        console.warn("gemini_multimodal_service.ts: 'geminiMultimodalServiceReady' dispatched (INITIALIZATION FAILED).");
    }

} // End of initializeActualGeminiMultimodalService

const dependenciesForGMMS = ['geminiApiCallerLogicReady', 'aiApiConstantsReady'];
const gmmsMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGMMS.forEach(dep => gmmsMetDependenciesLog[dep] = false);
let gmmsDepsMetCount = 0;

function checkAndInitGMMS(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'geminiApiCallerLogicReady':
                verified = !!(window as any)._geminiInternalApiCaller;
                break;
            case 'aiApiConstantsReady':
                verified = !!(window.aiApiConstants && window.aiApiConstants.GEMINI_MODELS);
                break;
            default: return;
        }
        if (verified && !gmmsMetDependenciesLog[receivedEventName]) {
            gmmsMetDependenciesLog[receivedEventName] = true;
            gmmsDepsMetCount++;
        }
    }
    if (gmmsDepsMetCount === dependenciesForGMMS.length) {
        initializeActualGeminiMultimodalService();
    }
}

let gmmsAllPreloaded = true;
dependenciesForGMMS.forEach(eventName => {
    let isVerified = false;
    if (eventName === 'geminiApiCallerLogicReady' && (window as any)._geminiInternalApiCaller) isVerified = true;
    if (eventName === 'aiApiConstantsReady' && window.aiApiConstants?.GEMINI_MODELS) isVerified = true;

    if (isVerified) {
        if(!gmmsMetDependenciesLog[eventName]) { gmmsMetDependenciesLog[eventName] = true; gmmsDepsMetCount++; }
    } else {
        gmmsAllPreloaded = false;
        document.addEventListener(eventName, () => checkAndInitGMMS(eventName), { once: true });
    }
});

if (gmmsAllPreloaded && gmmsDepsMetCount === dependenciesForGMMS.length) {
    initializeActualGeminiMultimodalService();
} else if (!gmmsAllPreloaded) {
    console.log(`gemini_multimodal_service.ts: Waiting for ${dependenciesForGMMS.length - gmmsDepsMetCount} core dependencies.`);
}

console.log("gemini_multimodal_service.ts: Script execution FINISHED (TS Version).");