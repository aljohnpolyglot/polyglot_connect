// js/services/gemini_core_api.js
// Core internal functions and constants for Gemini API interactions.
// This module itself does not expose a service to the window object directly,
// but provides utilities for other specific Gemini service modules.

(function() { // IIFE to avoid polluting global scope too much
    'use strict';

    const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

    // Expose constants that other service modules might need
    window._geminiApiConstants = {
        MODEL_TEXT_RESPONSE: "gemini-1.5-flash-latest",
        MODEL_MULTIMODAL: "gemini-1.5-flash-latest",
        MODEL_TTS_SYNTHESIZE: "text-to-speech", // Older TTS endpoint model name
        MODEL_TTS_GENERATE_CONTENT: "gemini-2.5-flash-preview-tts", // New style TTS model
        STANDARD_SAFETY_SETTINGS: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ]
    };

    // Unified internal API caller
    window._geminiInternalApiCaller = async function callGeminiAPIInternal(payload, modelIdentifier, requestType = "generateContent") {
        // requestType can be "generateContent", "synthesizeSpeech", or "generateContentAudio"

        if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_ACTUAL_GEMINI_API_KEY_HERE') {
            const errorMsg = "Gemini API Key is not configured or is still the placeholder.";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        let endpointAction;
        if (requestType === "synthesizeSpeech") {
            endpointAction = ":synthesizeSpeech";
        } else { // Covers "generateContent" and "generateContentAudio"
            endpointAction = ":generateContent";
        }

        const fullApiUrl = `${API_URL_BASE}${modelIdentifier}${endpointAction}?key=${window.GEMINI_API_KEY}`;
        // console.debug(`Calling Gemini (${modelIdentifier}, type: ${requestType}): ${fullApiUrl} with payload:`, JSON.stringify(payload).substring(0, 350) + "...");

        try {
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const responseData = await response.json();
            // console.debug(`Gemini Response (${modelIdentifier}, type: ${requestType}):`, JSON.stringify(responseData).substring(0, 250) + "...");

            if (!response.ok) {
                const errorDetails = responseData.error || { message: `API request failed with status ${response.status}` };
                console.error(`Gemini API Error (${modelIdentifier} - ${response.status}):`, errorDetails);
                throw new Error(errorDetails.message || `Gemini API Error: ${response.status}`);
            }

            // Handle response based on request type
            if (requestType === "synthesizeSpeech" || (requestType === "generateContentAudio" && responseData.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data)) {
                let audioData;
                if (requestType === "synthesizeSpeech") {
                    audioData = responseData.audioContent;
                } else { // generateContentAudio
                    audioData = responseData.candidates[0].content.parts[0].inline_data.data;
                }

                if (audioData) {
                    return { audioBase64: audioData, mimeType: 'audio/mp3' }; // Assuming MP3 for new TTS too, or check response
                }
                console.error(`TTS API (${modelIdentifier}, type: ${requestType}) did not return audioContent/data. Response:`, responseData);
                throw new Error(`TTS API (${modelIdentifier}, type: ${requestType}) did not return audio.`);
            } else if (requestType === "generateContent" || requestType === "generateContentAudio") { // Standard text or failed audio from generateContent
                const candidate = responseData.candidates?.[0];
                if (!candidate) {
                    console.warn(`No candidates in Gemini response for ${modelIdentifier}. Response:`, responseData);
                    if (responseData.promptFeedback?.blockReason) {
                        const blockReason = responseData.promptFeedback.blockReason;
                        const blockMessage = responseData.promptFeedback.blockReasonMessage || "No additional details.";
                        console.warn(`Content blocked by Gemini. Reason: ${blockReason}. Detail: ${blockMessage}`);
                        return `(My response was blocked due to safety settings: ${blockReason})`;
                    }
                    throw new Error(`API call to ${modelIdentifier} returned no candidates and no clear block reason.`);
                }

                // Check if it's an audio response that was expected but failed to extract above
                if (requestType === "generateContentAudio" && !candidate.content?.parts?.[0]?.inline_data?.data) {
                    console.error(`Expected audio from generateContentAudio for ${modelIdentifier} but found no audio data in candidate:`, candidate);
                    throw new Error(`Expected audio from ${modelIdentifier} but received non-audio candidate content.`);
                }

                const textPart = candidate.content?.parts?.find(part => part.text !== undefined)?.text;
                if (textPart !== undefined) return textPart;

                const finishReason = candidate.finishReason;
                if (finishReason === "STOP" && textPart === undefined) return ""; // Valid empty text response

                if (finishReason && finishReason !== "STOP") {
                    console.warn(`Content generation stopped by Gemini. Reason: ${finishReason}. Candidate:`, candidate);
                    return `(My response was altered or stopped. Reason: ${finishReason})`;
                }

                console.error(`API call to ${modelIdentifier} finished unexpectedly or with no text part. Candidate:`, candidate, "Full Response:", responseData);
                throw new Error(`API call to ${modelIdentifier} finished unexpectedly or with no text part. Reason: ${finishReason || 'Unknown'}.`);
            } else {
                console.error("Gemini Core: Unknown requestType in response handling:", requestType);
                throw new Error("Unknown API request type for response processing.");
            }
        } catch (error) {
            console.error(`Error in _geminiInternalApiCaller (${modelIdentifier}, type: ${requestType}):`, error.message, error.stack);
            throw error;
        }
    };

    console.log("services/gemini_core_api.js loaded. Utilities _geminiApiConstants and _geminiInternalApiCaller are available.");

})(); // End IIFE