// src/js/services/gemini_api_caller.ts
import type { AIApiConstants } from "../types/global.d.ts";

console.log("gemini_api_caller.ts: Script execution STARTED (TS Version).");

// --- Start of IIFE ---
(() => {
    'use strict';

    // aiConstants will be fetched from window.aiApiConstants (or window._aiApiConstants)
    // The critical check is that it exists when _ensureAiConstantsCache is first called.
    
    const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    let CACHED_STANDARD_SAFETY_SETTINGS: any[] | null = null; 
    
    const GEMINI_API_KEYS: string[] = [];
    let currentGeminiKeyIndex = 0;
    let keyFailureCounts: number[] = [];

    function _ensureAiConstantsCache(): boolean { // Returns true if cache is good
        if (CACHED_STANDARD_SAFETY_SETTINGS) return true;

      const aiConstants = window.aiApiConstants as AIApiConstants | undefined;
        if (aiConstants?.STANDARD_SAFETY_SETTINGS_GEMINI) {
            CACHED_STANDARD_SAFETY_SETTINGS = aiConstants.STANDARD_SAFETY_SETTINGS_GEMINI;
            console.log("Gemini API Caller (TS): Safety settings cached.");
            return true;
        } else {
            console.error("Gemini API Caller (TS): CRITICAL - aiApiConstants or STANDARD_SAFETY_SETTINGS_GEMINI not found. Safety settings NOT cached.");
            return false;
        }
    }

    function _populateGeminiApiKeys(): void {
        const key1 = window.GEMINI_API_KEY;
        const key2 = window.GEMINI_API_KEY_ALT;
        const key3 = window.GEMINI_API_KEY_ALT_2;

        // Prevent unnecessary repopulation if keys haven't changed on window
        // This is a basic check; more robust would involve comparing array contents if order matters.
        const currentWindowKeys = [key1, key2, key3].filter(k => k && typeof k === 'string' && k.trim() !== '' && !k.includes("YOUR_") && k.length > 20);
        if (GEMINI_API_KEYS.length === currentWindowKeys.length && GEMINI_API_KEYS.every((val, index) => val === currentWindowKeys[index])) {
            if (GEMINI_API_KEYS.length > 0 && CACHED_STANDARD_SAFETY_SETTINGS) { // Also ensure constants are cached if keys are already good
                 // console.debug("Gemini API Caller (TS): Keys and safety cache appear up-to-date.");
                return;
            }
        }
        
        GEMINI_API_KEYS.length = 0; 
        const potentialKeys: (string | undefined)[] = [key1, key2, key3];
        
        potentialKeys.forEach((key) => {
            if (key && typeof key === 'string' && key.trim() !== '' && !key.includes("YOUR_") && key.length > 20) {
                GEMINI_API_KEYS.push(key);
            }
        });

        if (GEMINI_API_KEYS.length > 0) {
            keyFailureCounts = new Array(GEMINI_API_KEYS.length).fill(0);
            currentGeminiKeyIndex = 0;
            // console.log(`Gemini API Caller (TS): API Keys populated/re-checked. Found ${GEMINI_API_KEYS.length} valid key(s).`);
        }
        _ensureAiConstantsCache(); // Attempt to cache constants after populating keys
    }

    function getNextGeminiApiKey(): { key: string; index: number } | null {
        _populateGeminiApiKeys(); // Always try to refresh from window, as app.ts might set them late

        if (GEMINI_API_KEYS.length === 0) {
            // This log is critical if no keys are found when an API call is attempted
            console.error("Gemini API Caller (TS - getNextGeminiApiKey): No valid Gemini API Keys are configured. Cannot select a key.");
            return null;
        }
        
        const keyToUse = GEMINI_API_KEYS[currentGeminiKeyIndex];
        const keyIndexThatWasUsed = currentGeminiKeyIndex;
        currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_API_KEYS.length;
        return { key: keyToUse, index: keyIndexThatWasUsed };
    }

    function reportKeyFailure(keyIndex: number): void {
        if (keyIndex >= 0 && keyIndex < keyFailureCounts.length && keyIndex < GEMINI_API_KEYS.length) {
            keyFailureCounts[keyIndex]++;
            console.warn(`Gemini API Caller (TS): Failure count for key index ${keyIndex} (...${GEMINI_API_KEYS[keyIndex]?.slice(-4)}) is now ${keyFailureCounts[keyIndex]}.`);
        }
    }



// <<< START: ADD THIS HELPER FUNCTION >>>
async function callWithRetry<T>(
    apiCallFn: () => Promise<T>,
    maxRetries: number = 2,
    initialDelayMs: number = 1000
): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await apiCallFn();
        } catch (error: any) {
            lastError = error;
            // Only retry on rate limits (429) or server errors (5xx)
            if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
                if (i === maxRetries) {
                    console.error(`Gemini API call failed after ${maxRetries} retries.`, lastError);
                    break;
                }
                const delay = Math.min(initialDelayMs * Math.pow(2, i), 6000) + Math.random() * 500;
                console.warn(`Gemini call failed with status ${error.status}. Retrying in ${delay.toFixed(0)}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Don't retry on other client errors.
                throw error;
            }
        }
    }
    throw lastError;
}

    // Assign the internal caller to window
    (window as any)._geminiInternalApiCaller = async function callGeminiAPIInternalWithRotation(
        payload: any, 
        modelIdentifier: string, 
        requestType: string = "generateContent"
    ): Promise<any> {
        if (!_ensureAiConstantsCache()) {
            // If constants (especially safety settings) couldn't be cached, it's risky to proceed for generateContent
            if (requestType.startsWith("generateContent")) {
                 console.error("_geminiInternalApiCaller (TS): AI Constants (specifically safety settings) not cached. Aborting generateContent call for safety.");
                 throw new Error("Critical AI constants not available for Gemini call.");
            }
            // For synthesizeSpeech, safety settings might not be applied by this client, but the call might still proceed if that's intended.
        }

        const apiKeyData = getNextGeminiApiKey();
        if (!apiKeyData) {
            const errorMsg = "_geminiInternalApiCaller (TS - Rotating): No valid Gemini API Keys. Cannot call API.";
            console.error(errorMsg, { payload, modelIdentifier, requestType });
            throw new Error(errorMsg);
        }
        const { key: apiKeyToUse, index: keyIndexUsed } = apiKeyData;

        let endpointAction = (requestType === "synthesizeSpeech") ? ":synthesizeSpeech" : ":generateContent";
        const fullApiUrl = `${API_URL_BASE}${modelIdentifier}${endpointAction}?key=${apiKeyToUse}`;
        
        let finalPayload = { ...payload };
        if ((requestType === "generateContent" || requestType === "generateContentAudio") && CACHED_STANDARD_SAFETY_SETTINGS) {
            if (!finalPayload.safetySettings) {
                 finalPayload.safetySettings = CACHED_STANDARD_SAFETY_SETTINGS;
            }
        }
        if ((requestType === "generateContent" || requestType === "generateContentAudio") && !finalPayload.generationConfig) {
            finalPayload.generationConfig = { temperature: 0.7 }; 
        }

        try {
            const apiFetchFn = async () => {
                const response = await fetch(fullApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPayload),
                });
                const responseData = await response.json();
        
                if (!response.ok) {
                    reportKeyFailure(keyIndexUsed);
                    const errorDetails = responseData.error || { message: `API request failed with status ${response.status}` };
                    const errorMessage = errorDetails.message || `Gemini API Error: ${response.status}`;
                    console.error(`Gemini API Error (TS - Model: ${modelIdentifier}, Status: ${response.status}, Key ...${apiKeyToUse.slice(-4)}, Index: ${keyIndexUsed}):`, errorMessage, errorDetails);
                    
                    const err = new Error(errorMessage) as any;
                    err.status = response.status;
                    err.providerDetails = errorDetails;
                    throw err;
                }
                return responseData; // Return the parsed JSON data on success
            };
        
            const responseData = await callWithRetry(apiFetchFn);
        
            // Process the successful response data
            if (keyIndexUsed >= 0 && keyIndexUsed < keyFailureCounts.length) {
                keyFailureCounts[keyIndexUsed] = 0;
            }
        
            if (requestType === "generateContent") {
                const candidate = responseData.candidates?.[0];
                if (!candidate) {
                    if (responseData.promptFeedback?.blockReason) {
                        return `(My response was blocked: ${responseData.promptFeedback.blockReason})`; 
                    }
                    throw new Error(`API call to ${modelIdentifier} returned no candidates.`);
                }
                const textPart = candidate.content?.parts?.find((part: any) => part.text !== undefined)?.text;
                if (textPart !== undefined) return textPart;
                if (candidate.finishReason === "STOP" && textPart === undefined) return "";
                if (candidate.finishReason && candidate.finishReason !== "STOP") {
                    return `(My response was altered. Reason: ${candidate.finishReason})`;
                }
                throw new Error(`API call to ${modelIdentifier} candidate with no text. Reason: ${candidate.finishReason || 'Unknown'}.`);
            } else {
                 // Handle other request types like TTS if needed, otherwise this is sufficient for chat
                 throw new Error(`Unknown request type for Gemini response processing: ${requestType}`);
            }
        
        } catch (error: any) {
            console.error(`Catch Block in _geminiInternalApiCaller (TS - Model: ${modelIdentifier}, Key ...${apiKeyToUse?.slice(-4) || 'N/A'}):`, error.message);
            throw error; 
        }
    };

    _populateGeminiApiKeys(); // Initial attempt to populate keys from window when script loads
    if (GEMINI_API_KEYS.length > 0) {
        console.log(`gemini_api_caller.ts: Loaded. Initial check found ${GEMINI_API_KEYS.length} key(s). Will re-check on each call.`);
    } else {
        console.warn("gemini_api_caller.ts: Loaded. NO VALID Gemini API Keys found after initial population. Will attempt to re-populate on first API call if window keys are set later by app.ts.");
    }
    
    document.dispatchEvent(new CustomEvent('geminiApiCallerLogicReady'));
    console.log("gemini_api_caller.ts: 'geminiApiCallerLogicReady' event dispatched.");

})(); // End of IIFE

console.log("gemini_api_caller.ts: Script execution FINISHED (TS Version). _geminiInternalApiCaller should be on window.");