// js/services/gemini_live_api_service.js
// Manages interaction with the Gemini Live API using @google/genai JS SDK.
// Version: Regen v1.4 - Correct PCM MimeType

console.log("gemini_live_api_service.js: Script execution STARTED (Regen v1.4).");

if (window.geminiLiveApiService) {
    console.warn("gemini_live_api_service.js: window.geminiLiveApiService ALREADY DEFINED.");
}

window.geminiLiveApiService = (() => {
    'use strict';
    const SERVICE_VERSION = "Regen v1.4 - Correct PCM MimeType";
    console.log(`gemini_live_api_service.js: IIFE (v${SERVICE_VERSION}) STARTING.`);

    let genAIClientInstance = null;
    let activeLiveSDKSession = null;
    let setupTimeoutId = null;

    let onOpenCallback = null;
    let onAiAudioChunkCallback = null;
    let onAiTextCallback = null;
    let onUserTranscriptionCallback = null;
    let onModelTranscriptionCallback = null;
    let onAiInterruptedCallback = null;
    let onErrorCallback = null;
    let onCloseCallback = null;

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function getGenAIClientInternal() {
        const funcName = "getGenAIClientInternal";
        if (genAIClientInstance) return genAIClientInstance;
        const SDKClass = window.GoogleGenerativeAI || window.GoogleGenAI;
        if (!SDKClass) {
            const errorMsg = `GeminiLiveService (${funcName}): GoogleGenerativeAI SDK class not found.`;
            console.error(errorMsg); throw new Error(errorMsg);
        }
        const apiKeyFromWindow = window.GEMINI_API_KEY;
        if (!apiKeyFromWindow || typeof apiKeyFromWindow !== 'string' || apiKeyFromWindow.trim() === '' || apiKeyFromWindow.includes('YOUR_ACTUAL')) {
            const errorMsg = `GeminiLiveService (${funcName}): Invalid API key. Value: "${String(apiKeyFromWindow).substring(0,10)}..."`;
            console.error(errorMsg); throw new Error(errorMsg);
        }
        try {
            genAIClientInstance = new SDKClass({ apiKey: apiKeyFromWindow });
            if (!genAIClientInstance?.live) {
                 console.warn(`GeminiLiveService (${funcName}): '.live' namespace NOT FOUND. Client:`, genAIClientInstance);
            }
            return genAIClientInstance;
        } catch (e) {
            console.error(`GeminiLiveService (${funcName}): CRITICAL error during SDK instantiation:`, e.message, e);
            throw e;
        }
    }

    async function connect(modelName, sessionSetupConfig, facadeCallbacks) {
        const funcName = "connect";
        console.log(`GeminiLiveService (${funcName} v${SERVICE_VERSION}): Connect. Model: '${modelName}'`);
        if (activeLiveSDKSession) {
            await closeConnection("New connection requested");
        }
        onOpenCallback = facadeCallbacks.onOpen;
        onAiAudioChunkCallback = facadeCallbacks.onAiAudioChunk;
        onAiTextCallback = facadeCallbacks.onAiText;
        onUserTranscriptionCallback = facadeCallbacks.onUserTranscription;
        onModelTranscriptionCallback = facadeCallbacks.onModelTranscription;
        onAiInterruptedCallback = facadeCallbacks.onAiInterrupted;
        onErrorCallback = facadeCallbacks.onError;
        onCloseCallback = facadeCallbacks.onClose;

        if (!modelName || !sessionSetupConfig || !onOpenCallback || !onErrorCallback || !onCloseCallback) {
            const errorMsg = `GeminiLiveService (${funcName}): Invalid params.`;
            console.error(errorMsg); onErrorCallback?.(new Error(errorMsg)); return false;
        }

        try {
            const client = getGenAIClientInternal();
            if (!client || !client.live?.connect) {
                const errorMsg = `GeminiLiveService (${funcName}): SDK client or 'client.live.connect' UNAVAILABLE.`;
                console.error(errorMsg, "Client:", client); throw new Error(errorMsg);
            }
            activeLiveSDKSession = await client.live.connect({
                model: modelName,
                callbacks: {
                    onopen: () => {
                        console.log(`GeminiLiveService (${funcName}): SDK onopen. Waiting for setupComplete...`);
                        if (setupTimeoutId) clearTimeout(setupTimeoutId);
                        setupTimeoutId = setTimeout(() => {
                            console.warn(`GeminiLiveService (${funcName}): Timeout waiting for setupComplete.`);
                            activeLiveSDKSession?.close?.().catch(err => console.error("Error closing on timeout:", err));
                            if (onErrorCallback) onErrorCallback(new Error("Live API setup timeout."));
                        }, 25000);
                    },
                    onmessage: (message) => {
                        if (message.error) {
                            console.error(`GeminiLiveService (${funcName}): SDK message error:`, message.error);
                            if (setupTimeoutId) { clearTimeout(setupTimeoutId); setupTimeoutId = null; }
                            onErrorCallback?.(new Error(message.error.message || `Live API stream error: ${message.error.code || 'Unknown'}`));
                            return;
                        }
                        if (message.setupComplete) {
                            if (setupTimeoutId) { clearTimeout(setupTimeoutId); setupTimeoutId = null; }
                            console.log(`GeminiLiveService (${funcName}): SDK setupComplete. Triggering onOpenCallback.`);
                            onOpenCallback?.();
                        }
                        if (message.serverContent) {
                            const sc = message.serverContent;
                            if (sc.modelTurn?.parts) {
                                sc.modelTurn.parts.forEach(part => {
                                    if (part.text && onAiTextCallback) {
                                             console.log(`GeminiLiveService (onMessage): Received AI text part: "${part.text.substring(0,50)}..."`); // <<< ADD THIS LOG
                                             onAiTextCallback(part.text);
                                             }
                                    if (part.inlineData?.data && onAiAudioChunkCallback) {
                                        try {
                                            const byteString = atob(part.inlineData.data);
                                            const byteArray = new Uint8Array(byteString.length);
                                            for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
                                            onAiAudioChunkCallback(byteArray.buffer, part.inlineData.mimeType || "audio/mp3");
                                        } catch (e) { console.error("Error decoding AI audio inlineData:", e); }
                                    } else if (part.blob && onAiAudioChunkCallback && typeof part.blob.arrayBuffer === 'function') {
                                        part.blob.arrayBuffer().then(buffer => onAiAudioChunkCallback(buffer, part.blob.type))
                                            .catch(e => console.error("Error getting ArrayBuffer from AI audio Blob:", e));
                                    }
                                });
                            }
                            if (sc.inputTranscription?.text !== undefined && onUserTranscriptionCallback) {
                                onUserTranscriptionCallback(sc.inputTranscription.text, sc.inputTranscription.isFinal || false);
                            }
                            if (sc.outputTranscription?.text !== undefined && onModelTranscriptionCallback) {
                                onModelTranscriptionCallback(sc.outputTranscription.text, sc.outputTranscription.isFinal || false);
                            }
                            if (sc.interrupted === true && onAiInterruptedCallback) {
                                onAiInterruptedCallback();
                            }
                        }
                         console.log(`GeminiLiveService (RAW MESSAGE v1.4_OTF): `, JSON.stringify(message).substring(0, 700) + (JSON.stringify(message).length > 700 ? "..." : ""));

                if (message.error) { /* ... error handling ... */ return; }
                if (message.setupComplete) { /* ... setupComplete handling ... onOpenCallback() ... */ }

                if (message.serverContent) {
                    const sc = message.serverContent;

                    // 1. PRIORITIZE outputTranscription for AI's spoken text
                    if (sc.outputTranscription?.text !== undefined && onModelTranscriptionCallback) {
                        console.log(`GeminiLiveService (onMessage): ----> Calling onModelTranscriptionCallback with (outputTranscription): "${sc.outputTranscription.text.substring(0,50)}...", Final: ${sc.outputTranscription.isFinal}`);
                        onModelTranscriptionCallback(sc.outputTranscription.text, sc.outputTranscription.isFinal || false);
                        // If outputTranscription is the source of AI speech text,
                        // do we still need to process modelTurn.parts for text? Maybe not for this use case.
                    }

                    // 2. Process modelTurn for AUDIO and potentially other non-speech text parts
                    if (sc.modelTurn?.parts) {
                        sc.modelTurn.parts.forEach(part => {
                            // Check for TEXT parts in modelTurn (might be for non-spoken UI text or if outputTranscription isn't used/available)
                            if (part.text && onAiTextCallback) {
                                 console.log(`GeminiLiveService (onMessage): Received AI modelTurn part.text: "${part.text.substring(0,50)}..." -> Calling onAiTextCallback.`);
                                 onAiTextCallback(part.text);
                                 // Note: If outputTranscription is also providing this, you might get duplicates.
                                 // Decide which one is the source of truth for AI *spoken* text.
                            }
                            // Audio processing
                            if (part.inlineData?.data && onAiAudioChunkCallback) { /* ... as before ... */ }
                            else if (part.blob && onAiAudioChunkCallback) { /* ... as before ... */ }
                        });
                    }

                    // 3. User's speech transcription
                    if (sc.inputTranscription?.text !== undefined && onUserTranscriptionCallback) {
                        // console.log(`GeminiLiveService (onMessage): ----> Calling onUserTranscriptionCallback with: "${sc.inputTranscription.text.substring(0,50)}..."`);
                        onUserTranscriptionCallback(sc.inputTranscription.text, sc.inputTranscription.isFinal || false);
                    }

                    // 4. Interruption
                    if (sc.interrupted === true && onAiInterruptedCallback) {
                        console.log("GeminiLiveService (onMessage): AI INTERRUPTED signal. Calling onAiInterruptedCallback.");
                        onAiInterruptedCallback();
                    }
                }
                    },
                    onerror: (errorEvent) => {
                        if (setupTimeoutId) { clearTimeout(setupTimeoutId); setupTimeoutId = null; }
                        console.error(`GeminiLiveService (${funcName}): SDK ONERROR EVENT:`, errorEvent);
                        onErrorCallback?.(new Error(errorEvent.message || `WebSocket error: ${errorEvent.code || 'Unknown'}`));
                        activeLiveSDKSession = null;
                    },
                    onclose: (closeEvent) => {
                        if (setupTimeoutId) { clearTimeout(setupTimeoutId); setupTimeoutId = null; }
                        console.error(`GeminiLiveService (${funcName}): SDK ONCLOSE EVENT. Clean: ${closeEvent?.wasClean}, Code: ${closeEvent?.code}, Reason: "${closeEvent?.reason}"`, closeEvent);
                        onCloseCallback?.(closeEvent?.wasClean, closeEvent?.code, closeEvent?.reason);
                        activeLiveSDKSession = null;
                    }
                },
                config: sessionSetupConfig
            });
            if (!activeLiveSDKSession) throw new Error("client.live.connect returned falsy.");
            console.log(`GeminiLiveService (${funcName}): Connection init with SDK. Waiting setupComplete.`);
            return true;
        } catch (err) {
            if (setupTimeoutId) { clearTimeout(setupTimeoutId); setupTimeoutId = null; }
            console.error(`GeminiLiveService (${funcName}): CRITICAL error in connect try block:`, err.message, err);
            activeLiveSDKSession = null; onErrorCallback?.(err); return false;
        }
    }

    async function sendClientText(text) {
        const funcName = "sendClientText";
        if (!activeLiveSDKSession?.sendClientContent) {
            onErrorCallback?.(new Error("Cannot send text: Session/method unavailable.")); return;
        }
        try {
            await activeLiveSDKSession.sendClientContent({
                turns: [{ role: "user", parts: [{ text: text }] }]
            });
        } catch (err) {
            console.error(`GeminiLiveService (${funcName}): Error sending text:`, err); onErrorCallback?.(err);
        }
    }

    async function sendRealtimeAudio(audioChunkArrayBuffer) {
        const funcName = "sendRealtimeAudio";
        if (!activeLiveSDKSession?.sendRealtimeInput) return;
        if (!audioChunkArrayBuffer?.byteLength) return;

        // ***** CRITICAL FIX based on server error message *****
        const audioMimeType = "audio/pcm;rate=16000";
        // The server message indicated "channels=1" is not part of the supported mime type string here.
        // It expects 'audio/pcm' or 'audio/pcm;rate=xxxxx'.
        // We are sending 16kHz audio from live_api_mic_input.js (resampled).
        // ***** END CRITICAL FIX *****

        try {
            const base64AudioData = arrayBufferToBase64(audioChunkArrayBuffer);
            const audioBlobForSDK = {
                data: base64AudioData,
                mimeType: audioMimeType
            };
            // console.debug(`GeminiLiveService (${funcName}): Sending audio. Mime: ${audioMimeType}, Base64 Length: ${base64AudioData.length}`);
            await activeLiveSDKSession.sendRealtimeInput({
                audio: audioBlobForSDK
            });
        } catch (err) {
            console.error(`GeminiLiveService (${funcName}): Error sending audio:`, err.message, err);
        }
    }

    async function sendAudioStreamEndSignal() {
        const funcName = "sendAudioStreamEndSignal";
        if (!activeLiveSDKSession?.sendRealtimeInput) return;
        try {
            await activeLiveSDKSession.sendRealtimeInput({ audioStreamEnd: true });
        } catch (err) {
            console.error(`GeminiLiveService (${funcName}): Error sending audioStreamEnd:`, err); onErrorCallback?.(err);
        }
    }

    async function closeConnection(reason = "Client request") {
        const funcName = "closeConnection";
        console.log(`GeminiLiveService (${funcName} v${SERVICE_VERSION}): Closing. Reason: ${reason}. Session: ${!!activeLiveSDKSession}`);
        if (setupTimeoutId) { clearTimeout(setupTimeoutId); setupTimeoutId = null; }
        if (activeLiveSDKSession?.close) {
            try {
                await activeLiveSDKSession.close();
            } catch (err) {
                console.error(`GeminiLiveService (${funcName}): Error during SDK session.close():`, err);
                if (activeLiveSDKSession) {
                    onCloseCallback?.(false, err.code || 0, err.message || "Error closing session.");
                    activeLiveSDKSession = null; 
                }
            }
        } else if (activeLiveSDKSession) {
            activeLiveSDKSession = null; 
            onCloseCallback?.(false, 0, "Session lacked .close method.");
        }
        if (!activeLiveSDKSession) {
            onOpenCallback = null; onAiAudioChunkCallback = null; onAiTextCallback = null;
            onUserTranscriptionCallback = null; onModelTranscriptionCallback = null;
            onAiInterruptedCallback = null; onErrorCallback = null; onCloseCallback = null;
        }
    }

    console.log(`gemini_live_api_service.js (v${SERVICE_VERSION}): IIFE FINISHED.`);
    return {
        connect, sendClientText, sendRealtimeAudio, sendAudioStreamEndSignal, closeConnection
    };
})();

if (window.geminiLiveApiService?.connect) {
    console.log(`gemini_live_api_service.js (Regen v1.4): SUCCESSFULLY assigned to window.`);
} else {
    console.error(`gemini_live_api_service.js (Regen v1.4): CRITICAL ERROR - not correctly formed.`);
}
console.log("gemini_live_api_service.js: Script execution FINISHED (Regen v1.4).");