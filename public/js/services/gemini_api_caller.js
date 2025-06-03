// js/services/gemini_api_caller.js
(function() {
    'use strict';

    // Critical dependency check for _aiApiConstants
    if (!window._aiApiConstants) {
        console.error("Gemini API Caller: CRITICAL - _aiApiConstants not found at initial load. Safety settings and other constants might be unavailable. Gemini calls may fail or behave unexpectedly.");
        // Define a dummy caller to prevent further errors if this script is called without its constants dependency.
        window._geminiInternalApiCaller = async (payload, modelIdentifier, requestType) => {
            const errorMsg = `_geminiInternalApiCaller cannot operate: _aiApiConstants was not loaded before gemini_api_caller.js. Call Details: Model='${modelIdentifier}', Type='${requestType}'.`;
            console.error(errorMsg, "Payload:", payload);
            throw new Error(errorMsg);
        };
        // Log API key status separately for debugging, even if constants are missing.
        const tempKeysCheck = [window.GEMINI_API_KEY, window.GEMINI_API_KEY_ALT, window.GEMINI_API_KEY_ALT_2];
        const validTempKeysCheck = tempKeysCheck.filter(k => k && typeof k === 'string' && k.trim() !== '' && !k.includes("YOUR_"));
        if (validTempKeysCheck.length === 0) {
            console.warn("Gemini API Caller: Additionally, no valid Gemini API Keys (GEMINI_API_KEY, _ALT, _ALT_2) found on the window object during initial load.");
        }
        return; // Stop further execution of this IIFE if constants are missing.
    }

    const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    const { STANDARD_SAFETY_SETTINGS_GEMINI } = window._aiApiConstants; // Destructure after ensuring _aiApiConstants exists.
    const GEMINI_API_KEYS = []; // This array will be populated by _populateGeminiApiKeys.

    let currentGeminiKeyIndex = 0;
    let keyFailureCounts = []; // To be initialized after GEMINI_API_KEYS is populated.

    // Function to cache essential constants to avoid repeated lookups on window._aiApiConstants.
    let CACHED_STANDARD_SAFETY_SETTINGS = null;
    function _ensureAiConstantsCache() {
        if (!CACHED_STANDARD_SAFETY_SETTINGS && window._aiApiConstants && window._aiApiConstants.STANDARD_SAFETY_SETTINGS_GEMINI) {
            CACHED_STANDARD_SAFETY_SETTINGS = window._aiApiConstants.STANDARD_SAFETY_SETTINGS_GEMINI;
            // console.debug("Gemini API Caller: Safety settings cached.");
        }
    }

    // Function to populate/re-populate the GEMINI_API_KEYS array from window objects.
    function _populateGeminiApiKeys() {
        // Basic check to see if keys might already be correctly populated and haven't changed on window.
        // This is a simple optimization and might not catch all dynamic changes if keys are altered on window post-initial-load.
        if (GEMINI_API_KEYS.length > 0 &&
            window.GEMINI_API_KEY === GEMINI_API_KEYS[0] &&
            (GEMINI_API_KEYS.length === 1 || (window.GEMINI_API_KEY_ALT || null) === (GEMINI_API_KEYS[1] || null)) &&
            (GEMINI_API_KEYS.length <= 2 || (window.GEMINI_API_KEY_ALT_2 || null) === (GEMINI_API_KEYS[2] || null))
           ) {
            // console.debug("Gemini API Caller: Keys appear to be already populated and unchanged.");
            _ensureAiConstantsCache(); // Still ensure constants are cached
            return;
        }

        GEMINI_API_KEYS.length = 0; // Clear array to repopulate.
        const potentialKeys = [window.GEMINI_API_KEY, window.GEMINI_API_KEY_ALT, window.GEMINI_API_KEY_ALT_2];
        let validKeysFoundCount = 0;

        potentialKeys.forEach((key, index) => {
            const keyName = `window.GEMINI_API_KEY${index === 0 ? '' : '_ALT' + (index > 1 ? '_2' : '')}`;
            if (key && typeof key === 'string' && key.trim() !== '' && !key.includes("YOUR_") && key.length > 20) { // Basic validation.
                GEMINI_API_KEYS.push(key);
                validKeysFoundCount++;
            } else if (key && (key.includes("YOUR_") || key.trim() === '' || key.length <= 20)) {
                console.warn(`Gemini API Caller: Key '${keyName}' from window is present but appears invalid (e.g., placeholder, too short) and will be skipped.`);
            }
        });

        if (validKeysFoundCount > 0) {
            keyFailureCounts = new Array(GEMINI_API_KEYS.length).fill(0); // Reset failure counts for the new set of keys.
            currentGeminiKeyIndex = 0; // Reset rotation index.
            console.log(`Gemini API Caller: API Keys successfully populated/re-checked. Found ${GEMINI_API_KEYS.length} valid key(s).`);
        } else {
            // This log indicates that after an explicit attempt to populate, no valid keys were found.
            // The initial load log (at the end of this IIFE) will cover the state at script parse time.
        }
        _ensureAiConstantsCache(); // Ensure constants like safety settings are cached after key population.
    }

    // Gets the next API key for use, attempting to populate keys if none are currently loaded.
    function getNextGeminiApiKey() {
        if (GEMINI_API_KEYS.length === 0) {
            _populateGeminiApiKeys(); // Attempt to populate if called and keys array is empty.
        }
        if (GEMINI_API_KEYS.length === 0) {
            console.error("Gemini API Caller (getNextGeminiApiKey): No valid Gemini API Keys are configured even after attempting to populate them from window. Cannot select a key.");
            return null; // No keys are available.
        }
        
        const keyToUse = GEMINI_API_KEYS[currentGeminiKeyIndex];
        const keyIndexThatWasUsed = currentGeminiKeyIndex;
        currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_API_KEYS.length; // Rotate to next key for subsequent call.
        // console.debug(`Gemini API Caller: Selecting API Key at index: ${keyIndexThatWasUsed} (Total valid keys: ${GEMINI_API_KEYS.length})`);
        return { key: keyToUse, index: keyIndexThatWasUsed };
    }

    // Increments failure count for a key. Could be used for more advanced rotation logic.
    function reportKeyFailure(keyIndex) {
        if (keyIndex >= 0 && keyIndex < keyFailureCounts.length && keyIndex < GEMINI_API_KEYS.length) { // Added GEMINI_API_KEYS.length check
            keyFailureCounts[keyIndex]++;
            console.warn(`Gemini API Caller: Failure count for key index ${keyIndex} (key ending ...${GEMINI_API_KEYS[keyIndex]?.slice(-4)}) is now ${keyFailureCounts[keyIndex]}.`);
            // Future enhancement: If keyFailureCounts[keyIndex] > MAX_ALLOWED_FAILURES, temporarily skip this key in getNextGeminiApiKey.
        }
    }

    // Main internal API caller function exposed on window.
    window._geminiInternalApiCaller = async function callGeminiAPIInternalWithRotation(payload, modelIdentifier, requestType = "generateContent") {
        _ensureAiConstantsCache(); // Ensure safety settings are cached before the call.

        const apiKeyData = getNextGeminiApiKey();
        if (!apiKeyData) {
            const errorMsg = "_geminiInternalApiCaller (Rotating): No valid Gemini API Keys are currently available to attempt this API call.";
            console.error(errorMsg, "Payload:", payload, "Model:", modelIdentifier, "Type:", requestType);
            throw new Error(errorMsg); // Fail fast if no keys.
        }
        const { key: apiKeyToUse, index: keyIndexUsed } = apiKeyData;

        let endpointAction = (requestType === "synthesizeSpeech") ? ":synthesizeSpeech" : ":generateContent";
        const fullApiUrl = `${API_URL_BASE}${modelIdentifier}${endpointAction}?key=${apiKeyToUse}`;
        
        let finalPayload = { ...payload }; // Clone payload for modification.
        // Apply standard safety settings if this is a content generation request and settings are cached.
        if ((requestType === "generateContent" || requestType === "generateContentAudio") && CACHED_STANDARD_SAFETY_SETTINGS) {
            if (!finalPayload.safetySettings) { // Only add if not already specified in the incoming payload.
                 finalPayload.safetySettings = CACHED_STANDARD_SAFETY_SETTINGS;
            }
        }
        // Ensure generationConfig exists for content generation if not provided.
        if ((requestType === "generateContent" || requestType === "generateContentAudio") && !finalPayload.generationConfig) {
            finalPayload.generationConfig = { temperature: 0.7 }; // Sensible default.
        }

        // console.debug(`Calling Gemini (Model: ${modelIdentifier}, Type: ${requestType}, Key Index: ${keyIndexUsed}): ${fullApiUrl}`);

        try {
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload),
            });
            const responseData = await response.json();

            if (!response.ok) {
                reportKeyFailure(keyIndexUsed); // Log failure for this specific key.
                const errorDetails = responseData.error || { message: `API request failed with status ${response.status}` };
                const keyPreview = apiKeyToUse.slice(-4);
                const errorMessage = errorDetails.message || `Gemini API Error: ${response.status}`;
                console.error(`Gemini API Error (Model: ${modelIdentifier}, Status: ${response.status}, Key ...${keyPreview}, Index: ${keyIndexUsed}):`, errorMessage, errorDetails);
                
                const err = new Error(errorMessage); // Create a new error object.
                err.status = response.status;
                err.providerDetails = errorDetails;
                // Check for common indicators of API key problems.
                err.isApiKeyError = (response.status === 400 || response.status === 403) && 
                                    (errorMessage.toLowerCase().includes('api key') || 
                                     errorMessage.toLowerCase().includes('permission denied') ||
                                     errorMessage.toLowerCase().includes('not valid') ||
                                     errorMessage.toLowerCase().includes('authentication'));
                throw err; // Throw the enhanced error.
            }
            
            // On successful response (response.ok), reset failure count for the used key.
            if (keyIndexUsed >= 0 && keyIndexUsed < keyFailureCounts.length && keyFailureCounts[keyIndexUsed] > 0) {
                console.log(`Gemini API Caller: Failure count for key index ${keyIndexUsed} (key ...${apiKeyToUse.slice(-4)}) reset to 0 after successful call.`);
                keyFailureCounts[keyIndexUsed] = 0;
            }

            // --- Full Response Handling (Restored) ---
            if (requestType === "synthesizeSpeech") { // Legacy TTS
                if (responseData.audioContent) {
                    return { audioBase64: responseData.audioContent, mimeType: 'audio/mp3' }; // synthesizeSpeech typically returns mp3
                }
                console.error(`Legacy TTS API (Model: ${modelIdentifier}) response missing audioContent. Response:`, responseData);
                throw new Error(`Legacy TTS API (Model: ${modelIdentifier}) did not return audio.`);
            } else if (requestType === "generateContentAudio") { // Newer TTS via generateContent
                const audioPart = responseData.candidates?.[0]?.content?.parts?.find(part => part.inline_data && part.inline_data.mimeType.startsWith('audio/'));
                if (audioPart) {
                    return { audioBase64: audioPart.inline_data.data, mimeType: audioPart.inline_data.mimeType };
                }
                console.error(`New TTS API (Model: ${modelIdentifier}) response missing audio part. Response:`, responseData);
                throw new Error(`New TTS API (Model: ${modelIdentifier}) did not return audio part.`);
            } else if (requestType === "generateContent") { // Standard text or multimodal text response
                const candidate = responseData.candidates?.[0];
                if (!candidate) {
                    if (responseData.promptFeedback?.blockReason) {
                        const blockReason = responseData.promptFeedback.blockReason;
                        console.warn(`Gemini API: Content blocked by API. Reason: ${blockReason}.`);
                        // Return the block reason; facade can choose how to present this.
                        return `(My response was blocked: ${blockReason})`; 
                    }
                    console.error(`Gemini API: No candidates in response for ${modelIdentifier}. Full response:`, responseData);
                    throw new Error(`API call to ${modelIdentifier} returned no candidates and no clear block reason.`);
                }

                const textPart = candidate.content?.parts?.find(part => part.text !== undefined)?.text;

                if (textPart !== undefined) { // This includes empty string "" if that's what the model returned.
                    return textPart;
                }

                // Handle cases where there's no text part but a valid finish reason (e.g., STOP with no output means empty string).
                if (candidate.finishReason === "STOP" && textPart === undefined) {
                    return ""; // Valid empty response.
                }

                // Handle other finish reasons that might not produce text.
                if (candidate.finishReason && candidate.finishReason !== "STOP") {
                    console.warn(`Gemini API: Content generation stopped for ${modelIdentifier}. Reason: ${candidate.finishReason}.`);
                    return `(My response was altered or stopped. Reason: ${candidate.finishReason})`;
                }

                // If we reach here, something unexpected happened: a candidate exists, but no text and no clear other finish reason.
                console.error(`Gemini API: Candidate for ${modelIdentifier} has no text part and no clear alternative. Finish Reason: ${candidate.finishReason || 'Unknown'}. Candidate:`, candidate, "Full Response:", responseData);
                throw new Error(`API call to ${modelIdentifier} resulted in candidate with no text part. Reason: ${candidate.finishReason || 'Unknown'}.`);
            } else {
                console.error("Gemini API Caller: Unknown requestType ('" + requestType + "') for response processing.");
                throw new Error("Unknown API request type for Gemini response processing.");
            }
            // --- End Full Response Handling ---

        } catch (error) { // Catches fetch errors and errors thrown from !response.ok or within response handling
            const keyPreview = apiKeyToUse.slice(-4);
            console.error(`Catch Block in _geminiInternalApiCaller (Model: ${modelIdentifier}, Type: ${requestType}, Key ...${keyPreview}, Index: ${keyIndexUsed}):`, error.message);
            // Ensure a proper Error object is thrown upwards.
            if (!(error instanceof Error)) {
                 const newError = new Error(String(error.message || error || "Unknown error in Gemini caller catch block"));
                 // Attempt to preserve any custom properties from the original thrown object if it wasn't an Error.
                 if(typeof error === 'object' && error !== null) {
                    if(error.status) newError.status = error.status;
                    if(error.providerDetails) newError.providerDetails = error.providerDetails;
                    if(error.isApiKeyError !== undefined) newError.isApiKeyError = error.isApiKeyError;
                 }
                 throw newError;
            }
            throw error; // Re-throw the (potentially enhanced) error so the facade can attempt fallbacks.
        }
    };

    // Attempt initial population when the script loads.
    // This is important so that any subsequent scripts loading immediately after
    // and checking for GEMINI_API_KEYS.length might see them if already set on window.
    _populateGeminiApiKeys(); 
    if (GEMINI_API_KEYS.length > 0) {
        console.log(`services/gemini_api_caller.js loaded. Initial check found ${GEMINI_API_KEYS.length} Gemini key(s). Lazy population logic is active for subsequent calls if needed.`);
    } else {
        console.warn("services/gemini_api_caller.js loaded. NO VALID Gemini API Keys were found on initial load from window.GEMINI_API_KEY, _ALT, _ALT_2. Will attempt to populate on first API call. Ensure app.js sets these window variables before any Gemini API usage.");
    }
})();