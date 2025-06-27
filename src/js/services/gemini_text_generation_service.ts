// src/js/services/gemini_text_generation_service.ts
import type { 
    Connector, 
    GeminiChatItem, 
    AIApiConstants // For _aiApiConstants
    // We don't directly import _geminiInternalApiCaller type, we'll cast window property
} from '../types/global.d.ts';

console.log("gemini_text_generation_service.ts: Script execution STARTED (TS Version).");

// Define the interface for the module this file will create on window
// This should align with GeminiTextGenerationService in global.d.ts

export interface GeminiTextGenerationServiceModule {
    generateTextMessage: (
        userText: string,
        connector: Connector | null, // <<< CORRECTED
        existingGeminiHistory: GeminiChatItem[],
        preferredProvider?: string,
        expectJson?: boolean,
        context?: 'group-chat' | 'one-on-one', // <<< ADDED to match global
        abortSignal?: AbortSignal,              // <<< ADDED to match global
        options?: { isTranslation?: boolean; [key: string]: any } // <<< ADDED to match global
    ) => Promise<string | null | object>; // <<< CORRECTED to match global

    generateTextForCallModal?: (
        userText: string,
        connector: Connector | null, // <<< Correct from your provided code
        modalCallHistory: GeminiChatItem[] // Correct from your provided code
    ) => Promise<string | null>;
}

// Placeholder on window
window.geminiTextGenerationService = {} as GeminiTextGenerationServiceModule;

function initializeActualGeminiTextGenerationService(): void {
    console.log("gemini_text_generation_service.ts: initializeActualGeminiTextGenerationService called.");

    const _geminiInternalApiCaller = (window as any)._geminiInternalApiCaller as (
        payload: any, 
        modelIdentifier: string, 
        requestType?: string
    ) => Promise<any>;
    
    const _aiApiConstants = window.aiApiConstants as AIApiConstants | undefined; // Prefer non-underscored

    if (!_geminiInternalApiCaller || !_aiApiConstants || !_aiApiConstants.GEMINI_MODELS || !_aiApiConstants.STANDARD_SAFETY_SETTINGS_GEMINI) {
        console.error("Gemini Text Generation Service (TS): CRITICAL - Core API utilities (_geminiInternalApiCaller or _aiApiConstants with GEMINI_MODELS/STANDARD_SAFETY_SETTINGS_GEMINI) not found or incomplete. Service will be non-functional.");
        
        // Assign dummy methods to the placeholder
        const dummyMethods: GeminiTextGenerationServiceModule = {
            generateTextMessage: async () => { 
                console.error("GTGS Dummy: generateTextMessage called."); 
                throw new Error("Text Generation Service not initialized (core deps missing)."); 
            },
            generateTextForCallModal: async () => { 
                console.error("GTGS Dummy: generateTextForCallModal called."); 
                throw new Error("Text Generation Service not initialized (core deps missing)."); 
            }
        };
        Object.assign(window.geminiTextGenerationService!, dummyMethods);
        document.dispatchEvent(new CustomEvent('geminiTextGenerationServiceReady'));
        console.warn("gemini_text_generation_service.ts: 'geminiTextGenerationServiceReady' dispatched (INITIALIZATION FAILED - core deps).");
        return;
    }
    console.log("Gemini Text Generation Service (TS): Core API utilities found.");

    const { GEMINI_MODELS, STANDARD_SAFETY_SETTINGS_GEMINI } = _aiApiConstants; // Destructure safely after check

    window.geminiTextGenerationService = ((): GeminiTextGenerationServiceModule => {
        'use strict';

        async function generateTextMessage(
            userText: string,
            connector: Connector | null, // <<< CORRECTED
            existingGeminiHistory: GeminiChatItem[],
            preferredProvider?: string, // Will be ignored if this service is Gemini-only
            expectJson?: boolean,
            context?: 'group-chat' | 'one-on-one', // Parameter received
            abortSignal?: AbortSignal,             // Parameter received
            options?: { isTranslation?: boolean; [key: string]: any } // Parameter received
        ): Promise<string | null | object> { // <<< CORRECTED
            if (!connector) { // This check now correctly handles the allowed null
                console.error("GTGS (TS): generateTextMessage - Connector info missing.");
                throw new Error("Connector info missing for generateTextMessage.");
            }
            if (typeof userText !== 'string') {
                console.error("GTGS (TS): generateTextMessage - User text is not a string.");
                throw new Error("User text is invalid for generateTextMessage.");
            }
        
            let currentHistory: GeminiChatItem[] = [...existingGeminiHistory];
            
            // --- Translation Logic Handling (Conceptual) ---
            let effectiveUserText = userText;
            if (options?.isTranslation) {
                // Example: Modify prompt for translation.
                // This depends on how you want to instruct Gemini for translation.
                // It might involve wrapping userText or adding a system message if the API supports it well here.
                // For simplicity, let's assume the promptOrText in ai_service already contains translation instructions.
                // If not, this is where you'd prepend "Translate the following to [target_language]: "
                // Or, if the connector has target language info, use that.
                console.log("GTGS (TS): Translation requested. Ensure prompt is structured for translation.");
                // effectiveUserText = `Translate to ${connector.language || 'English'}: ${userText}`; // Example
            }
            currentHistory.push({ role: "user", parts: [{ text: effectiveUserText }] });
            // --- End Translation Logic Handling ---
        
        
            const payload = {
                contents: currentHistory,
                safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI,
                generationConfig: { temperature: 0.75, topP: 0.95, topK: 40 }
            };
            const modelToUse = GEMINI_MODELS?.TEXT || "gemini-1.5-flash-latest";
        
            try {
                const responseText = await _geminiInternalApiCaller(payload, modelToUse, "generateContent");
        
                if (typeof responseText !== 'string') return null;
        
                if (expectJson) {
                    try {
                        return JSON.parse(responseText);
                    } catch (e) {
                        console.warn(`GTGS (TS): Expected JSON for connector '${connector.id}', but parsing failed. Returning raw text. Error:`, e);
                        return responseText; // Return raw string if JSON parsing fails
                    }
                }
                return responseText;
            } catch (error: any) {
                console.error(`GTGS (TS): generateTextMessage Error for ${connector.profileName || connector.name}:`, error.message);
                return null;
            }
        }

        async function generateTextForCallModal(
            userText: string,
            connector: Connector | null, // << FIX: Allow null to match the interface
            modalCallHistory: GeminiChatItem[]
        ): Promise<string | null> {
            // Updated null check for connector
            if (!connector || !connector.language || !connector.profileName || !connector.modernTitle) {
                console.error("GTGS (TS): generateTextForCallModal - Connector info missing or incomplete.");
                throw new Error("Connector info missing or incomplete for generateTextForCallModal.");
            }
            if (typeof userText !== 'string' || userText.trim() === "") { // Also check for empty trim
                console.error("GTGS (TS): generateTextForCallModal - User text missing or empty.");
                throw new Error("User text missing or empty for generateTextForCallModal.");
            }

            const systemPrompt = `You are ${connector.profileName}, a ${connector.modernTitle} from ${connector.city || 'their city'}. You are in a voice-enabled chat session with a user practicing ${connector.language}. The user has just TYPED the following text to you. Respond ONLY in ${connector.language}. Your response should be natural, conversational, and concise (1-3 sentences is ideal for a call). Maintain your persona as ${connector.profileName}. ABSOLUTELY DO NOT mention that you are an AI, a language model, or a computer program. If the user's typed text asks about your nature, deflect it or answer as a human would.`;

            let contents: GeminiChatItem[] = [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: `Okay, I am ${connector.profileName}. I'll respond to the user's typed message in ${connector.language}, keeping it brief and natural for our call.` }] }
            ];

            const MAX_MODAL_CALL_HISTORY_TURNS = 6; // Max pairs of user/model turns
            if (Array.isArray(modalCallHistory)) {
                const recentHistory = modalCallHistory.slice(-MAX_MODAL_CALL_HISTORY_TURNS * 2);
                        recentHistory.forEach(turn => {
                if (turn && turn.role && Array.isArray(turn.parts) && turn.parts.length > 0) {
                    const firstPart = turn.parts[0];
                    let textContent = "[interaction segment]"; // Default
                    // Type guard to check if it's a text part
                    if ('text' in firstPart && typeof firstPart.text === 'string') {
                        textContent = firstPart.text;
                    } else {
                        // Optionally log if you encounter an unexpected non-text part here
                        console.warn("GTGS (TS) generateTextForCallModal: History turn part is not text, using placeholder.", firstPart);
                    }
                    contents.push({ role: turn.role, parts: [{ text: textContent }] });
                }
            });
            }
            contents.push({ role: "user", parts: [{ text: userText }] });

            const payload = {
                contents: contents,
                safetySettings: STANDARD_SAFETY_SETTINGS_GEMINI // Use destructured constant
                // generationConfig can be omitted to use model defaults, or set specific ones
            };
            
            const modelToUse = GEMINI_MODELS?.TEXT || "gemini-1.5-flash-latest"; // Fallback model

            try {
                // console.log(`GTGS (TS): Requesting text for call modal for connector '${connector.id}' using model ${modelToUse}`);
                const response = await _geminiInternalApiCaller(payload, modelToUse, "generateContent");
                return typeof response === 'string' ? response : null;
            } catch (error: any) {
                console.error(`GTGS (TS): generateTextForCallModal Error for ${connector.profileName}:`, error.message);
                return null;
            }
        }

        console.log("gemini_text_generation_service.ts: IIFE (TS Version) finished, returning service methods.");
        return {
            generateTextMessage,
            generateTextForCallModal
        };
    })(); // End of IIFE

    if (window.geminiTextGenerationService && 
        typeof window.geminiTextGenerationService.generateTextMessage === 'function' &&
        typeof window.geminiTextGenerationService.generateTextForCallModal === 'function') {
        console.log("gemini_text_generation_service.ts: SUCCESSFULLY assigned and methods verified.");
        document.dispatchEvent(new CustomEvent('geminiTextGenerationServiceReady'));
        console.log("gemini_text_generation_service.ts: 'geminiTextGenerationServiceReady' event dispatched.");
    } else {
        console.error("gemini_text_generation_service.ts: CRITICAL ERROR - window.geminiTextGenerationService not correctly formed or methods missing.");
        document.dispatchEvent(new CustomEvent('geminiTextGenerationServiceReady'));
        console.warn("gemini_text_generation_service.ts: 'geminiTextGenerationServiceReady' dispatched (INITIALIZATION FAILED).");
    }

} // End of initializeActualGeminiTextGenerationService

// This module depends on _geminiInternalApiCaller (from gemini_api_caller.ts) 
// and _aiApiConstants (from ai_constants.ts)
const dependenciesForGTGS = ['geminiApiCallerLogicReady', 'aiApiConstantsReady'];
const gtgsMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForGTGS.forEach(dep => gtgsMetDependenciesLog[dep] = false);
let gtgsDepsMetCount = 0;

function checkAndInitGTGS(receivedEventName?: string) {
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
        if (verified && !gtgsMetDependenciesLog[receivedEventName]) {
            gtgsMetDependenciesLog[receivedEventName] = true;
            gtgsDepsMetCount++;
        }
    }
    if (gtgsDepsMetCount === dependenciesForGTGS.length) {
        initializeActualGeminiTextGenerationService();
    }
}

// Pre-check
let gtgsAllPreloaded = true;
dependenciesForGTGS.forEach(eventName => {
    let isVerified = false;
    if (eventName === 'geminiApiCallerLogicReady' && (window as any)._geminiInternalApiCaller) isVerified = true;
    if (eventName === 'aiApiConstantsReady' && window.aiApiConstants?.GEMINI_MODELS) isVerified = true;

    if (isVerified) {
        if(!gtgsMetDependenciesLog[eventName]) { gtgsMetDependenciesLog[eventName] = true; gtgsDepsMetCount++; }
    } else {
        gtgsAllPreloaded = false;
        document.addEventListener(eventName, () => checkAndInitGTGS(eventName), { once: true });
    }
});

if (gtgsAllPreloaded && gtgsDepsMetCount === dependenciesForGTGS.length) {
    initializeActualGeminiTextGenerationService();
} else if (!gtgsAllPreloaded) {
    console.log(`gemini_text_generation_service.ts: Waiting for ${dependenciesForGTGS.length - gtgsDepsMetCount} core dependencies.`);
}

console.log("gemini_text_generation_service.ts: Script execution FINISHED (TS Version).");