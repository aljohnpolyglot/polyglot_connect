// src/js/services/gemini_api_caller.ts
import type { AIApiConstants } from "../types/global.d.ts";

console.log("gemini_api_caller.ts: Script execution STARTED (TS Version).");

// --- THIS IS THE NEW, EXPORTED SOURCE OF TRUTH ---
export const GEMINI_KEY_NICKNAMES = [
    'JOKIC', 'LUKA', 'SGA', 'EMBIID', 'TATUM',
    'ANT', 'HALIBURTON', 'BOOKER', 'KYRIE', 'BRUNSON', 'SABONIS'
];
// --- END OF EXPORTED BLOCK ---


// --- Start of IIFE ---
(() => {
    'use strict';

    // ...
    
    const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    // The line defining GEMINI_KEY_NICKNAMES is now removed from here.

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
        GEMINI_API_KEYS.length = 0;
        const potentialKeys: (string | undefined)[] = [
            import.meta.env.VITE_GEMINI_API_KEY,
            import.meta.env.VITE_GEMINI_API_KEY_ALT,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_2,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_3,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_4,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_5,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_6,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_7,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_8,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_9,
            import.meta.env.VITE_GEMINI_API_KEY_ALT_10,
        ];
        
        potentialKeys.forEach((key) => {
            if (key && typeof key === 'string' && key.trim() !== '' && !key.includes("YOUR_") && key.length > 20) {
                GEMINI_API_KEYS.push(key);
            }
        });
    
        if (GEMINI_API_KEYS.length > 0) {
            keyFailureCounts = new Array(GEMINI_API_KEYS.length).fill(0);
            currentGeminiKeyIndex = 0;
            console.log(`Gemini API Caller (TS): API Keys populated. Found ${GEMINI_API_KEYS.length} valid key(s).`);
        }
        _ensureAiConstantsCache();
    }
    function getNextGeminiApiKey(): { key: string; index: number; nickname: string } | null {
        if (GEMINI_API_KEYS.length === 0) {
            _populateGeminiApiKeys();
            if (GEMINI_API_KEYS.length === 0) {
                console.error("Gemini API Caller (TS): No valid Gemini API Keys are configured.");
                return null;
            }
        }
        
        const randomIndex = Math.floor(Math.random() * GEMINI_API_KEYS.length);
        const randomKey = GEMINI_API_KEYS[randomIndex];
        const nickname = GEMINI_KEY_NICKNAMES[randomIndex] || `Rookie #${randomIndex + 1}`;
        
        console.log(`%cDrafting Gemini Key: ${nickname}`, 'color: #4285F4; font-weight: bold;');
        
        return { key: randomKey, index: randomIndex, nickname: nickname };
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
        requestType: string = "generateContent",
        abortSignal?: AbortSignal // <<< ADD THIS
    ): Promise<{ response: any; nickname: string }> {
        const apiKeyData = getNextGeminiApiKey();
        if (!apiKeyData) {
            throw new Error("_geminiInternalApiCaller: No valid Gemini API Keys. Cannot call API.");
        }
        const { key: apiKeyToUse, nickname } = apiKeyData; // Get the nickname here

        const endpointAction = (requestType.startsWith("generateContent")) ? ":generateContent" : `:${requestType}`;
        const fullApiUrl = `${API_URL_BASE}${modelIdentifier}${endpointAction}?key=${apiKeyToUse}`;
        
        let finalPayload = { ...payload };
        if ((requestType.startsWith("generateContent")) && CACHED_STANDARD_SAFETY_SETTINGS) {
            finalPayload.safetySettings = CACHED_STANDARD_SAFETY_SETTINGS;
        }

        const healthTracker = (window as any).apiKeyHealthTracker;
        try {
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload),
                signal: abortSignal
            });

            // --- THIS IS THE CORRECTED BLOCK ---
            let responseDataForReturn: any = null; // Use a different name for the variable we'll build and return
            const responseText = await response.text(); // Get body as text first

            if (!response.ok) {
                // Try to parse error from responseText if it's not OK
                let parsedErrorBody: any;
                try {
                    parsedErrorBody = JSON.parse(responseText);
                } catch (e) {
                    // If parsing error JSON fails, use the raw text
                    parsedErrorBody = { error: { message: `API request failed with status ${response.status}. Body: ${responseText}` }};
                }
                const errorDetails = parsedErrorBody.error || { message: `API request failed with status ${response.status}` };
                const errorMessage = `Status ${response.status}: ${errorDetails.message || 'Unknown Gemini Error'}`;
                healthTracker?.reportStatus(nickname, 'Gemini', 'failure', errorMessage);
                const err = new Error(errorMessage) as any;
                err.status = response.status;
                err.responseBody = parsedErrorBody; // Attach parsed/raw body to error
                throw err;
            }

            // If response.ok (e.g., 200)
            if (responseText.trim() === "") {
                console.warn(`[GeminiAPICaller] Gemini API (Player: ${nickname}, Model: ${modelIdentifier}, Type: ${requestType}) returned HTTP ${response.status} OK but with an EMPTY BODY.`);
                responseDataForReturn = { isEmptyResponse: true, message: "Gemini API returned an empty response body." }; 
            } else {
                try {
                    responseDataForReturn = JSON.parse(responseText); // Parse if not empty
                } catch (parseError: any) {
                    console.error(`[GeminiAPICaller] Failed to parse JSON response from Gemini (Player: ${nickname}, Model: ${modelIdentifier}). Body was:`, responseText);
                    const err = new Error(`Failed to parse JSON response from Gemini. Status: ${response.status}. Error: ${parseError.message}`) as any;
                    err.status = response.status; 
                    err.isParseError = true;
                    err.responseBodyText = responseText; 
                    throw err;
                }
            }
            // --- END OF CORRECTED BLOCK ---
            
            console.log(`%c...and the score from: ${nickname}! (Gemini API HTTP status: ${response.status})`, 'color: #34A853; font-weight: bold;');
            healthTracker?.reportStatus(nickname, 'Gemini', 'success'); 

            return { response: responseDataForReturn, nickname: nickname }; // Return the correctly built responseDataForReturn
    
        } catch (error: any) {
            // ... (rest of the catch block remains the same)
            console.error(`Catch Block in _geminiInternalApiCaller (Player: ${nickname}, Model: ${modelIdentifier})`, error.message);
            if (!error.status || error.status >= 400) { 
                 healthTracker?.reportStatus(nickname, 'Gemini', 'failure', error.message);
            }
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