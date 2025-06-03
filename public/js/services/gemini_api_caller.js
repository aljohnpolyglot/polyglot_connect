// js/services/gemini_api_caller.js
(function() { // IIFE
    'use strict';

    const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
    const GEMINI_API_KEYS = [];

    // Add primary and alternate API keys
    if (window.GEMINI_API_KEY && window.GEMINI_API_KEY !== 'YOUR_ACTUAL_GEMINI_API_KEY_HERE') {
        GEMINI_API_KEYS.push(window.GEMINI_API_KEY);
    }
    if (window.GEMINI_API_KEY_ALT && window.GEMINI_API_KEY_ALT !== 'YOUR_SECOND_GEMINI_KEY_PLACEHOLDER') {
        GEMINI_API_KEYS.push(window.GEMINI_API_KEY_ALT);
    }

    let currentGeminiKeyIndex = 0;

    // Function to get the next API key in a round-robin manner
function getNextGeminiApiKey() {
        if (GEMINI_API_KEYS.length === 0) {
            console.error("No valid Gemini API Keys are configured.");
            return null;
        }
        const key = GEMINI_API_KEYS[currentGeminiKeyIndex];
        currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_API_KEYS.length;
        // console.log("Using Gemini API Key index:", (currentGeminiKeyIndex - 1 + GEMINI_API_KEYS.length) % GEMINI_API_KEYS.length ); // Log which key is used
        return key;
    }

    window._geminiInternalApiCaller = async function callGeminiAPIInternal(payload, modelIdentifier, requestType = "generateContent") {
        const apiKeyToUse = getNextGeminiApiKey();
        if (!apiKeyToUse) {
            const errorMsg = "_geminiInternalApiCaller: No valid Gemini API Keys available.";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        let endpointAction;
        if (requestType === "synthesizeSpeech") { // Older TTS endpoint
            endpointAction = ":synthesizeSpeech";
        } else { // Covers "generateContent" (for text, multimodal, new TTS)
            endpointAction = ":generateContent";
        }

        const fullApiUrl = `${API_URL_BASE}${modelIdentifier}${endpointAction}?key=${apiKeyToUse}`;
        // console.debug(`Calling Gemini (${modelIdentifier}, type: ${requestType}): ${fullApiUrl}`);

        try {
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const responseData = await response.json();

            if (!response.ok) {
                const errorDetails = responseData.error || { message: `API request failed with status ${response.status}` };
                console.error(`Gemini API Error (${modelIdentifier} - ${response.status}):`, errorDetails);
                throw new Error(errorDetails.message || `Gemini API Error: ${response.status}`);
            }

            // Handle response based on request type
            // Note: "generateContentAudio" was for the newer TTS via generateContent
            if (requestType === "synthesizeSpeech" || requestType === "generateContentAudio") {
                let audioData;
                let mimeType = 'audio/mp3'; // Default

                if (requestType === "synthesizeSpeech" && responseData.audioContent) {
                    audioData = responseData.audioContent;
                } else if (requestType === "generateContentAudio" && responseData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
                    audioData = responseData.candidates[0].content.parts[0].inlineData.data;
                    mimeType = responseData.candidates[0].content.parts[0].inlineData.mimeType || 'audio/mp3';
                }

                if (audioData) {
                    return { audioBase64: audioData, mimeType: mimeType };
                }
                console.error(`TTS API (${modelIdentifier}, type: ${requestType}) did not return audio. Response:`, responseData);
                throw new Error(`TTS API (${modelIdentifier}, type: ${requestType}) did not return audio.`);

            } else if (requestType === "generateContent") { // Standard text or multimodal text response
                const candidate = responseData.candidates?.[0];
                if (!candidate) {
                    // ... (your existing no-candidate / safety block handling) ...
                    if (responseData.promptFeedback?.blockReason) {
                        return `(My response was blocked: ${responseData.promptFeedback.blockReason})`;
                    }
                    throw new Error(`API call to ${modelIdentifier} returned no candidates.`);
                }

                // For multimodal, image response part might be different. For text, it's simple.
                const textPart = candidate.content?.parts?.find(part => part.text !== undefined)?.text;
                if (textPart !== undefined) return textPart;

                if (candidate.finishReason === "STOP" && textPart === undefined) return "";

                if (candidate.finishReason && candidate.finishReason !== "STOP") {
                    return `(My response was altered. Reason: ${candidate.finishReason})`;
                }
                throw new Error(`API call to ${modelIdentifier} no text part. Reason: ${candidate.finishReason || 'Unknown'}.`);
            } else {
                throw new Error("Unknown API request type for response processing.");
            }
        } catch (error) {
            console.error(`Error in _geminiInternalApiCaller (${modelIdentifier}, type: ${requestType}):`, error.message, error.stack);
            throw error;
        }
    };

    console.log("services/gemini_api_caller.js loaded with round-robin API key support.");
})();