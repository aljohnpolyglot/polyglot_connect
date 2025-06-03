// js/services/gemini_live_api_service.js
// Manages interaction with the Gemini Live API using the @google/genai JS SDK.

window.geminiLiveApiService = (() => {
    'use strict';

    let genAIClient = null; // Instance of GoogleGenAI
    let activeLiveSession = null; // Instance of the SDK's Session object from live.connect

    // Callbacks that will be set by session_manager/live_call_handler
    let onAiAudioChunkCallback = null;
    let onAiTextCallback = null;
    let onUserTranscriptionCallback = null;
    let onModelTranscriptionCallback = null;
    let onErrorCallback = null;
    let onOpenCallback = null;
    let onCloseCallback = null;

    // Helper to get or initialize the GenAI client
    function getGenAIClient(apiKeyFromGlobal) {
        if (!window.GoogleGenerativeAI && !window.GoogleGenAI) { // Check for both new and old SDK names
            const errorMsg = "Gemini Live API Service: @google/genai SDK (GoogleGenerativeAI/GoogleGenAI class) not found on window.";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        const SDK = window.GoogleGenerativeAI || window.GoogleGenAI;


        if (!genAIClient) {
            if (!apiKeyFromGlobal || typeof apiKeyFromGlobal !== 'string' || apiKeyFromGlobal === 'YOUR_ACTUAL_GEMINI_API_KEY_HERE') {
                const errorMsg = `getGenAIClient: Invalid or missing API key: '${apiKeyFromGlobal}'`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            try {
                let clientOptions = { apiKey: apiKeyFromGlobal };
                genAIClient = new SDK(clientOptions);

                // The .live namespace might be directly on the client or require an apiVersion
                if (genAIClient && !genAIClient.live) {
                    console.warn("geminiLiveApiService: '.live' namespace not found on client. Attempting with apiVersion 'v1beta' or 'v1alpha'.");
                    // Try common alpha/beta versions if needed, SDK docs are key here
                    // This might change based on SDK evolution
                    try {
                        clientOptions.apiVersion = 'v1beta'; // Or 'v1alpha'
                        let tempClient = new SDK(clientOptions);
                        if (tempClient && tempClient.live) {
                            genAIClient = tempClient;
                            console.log("geminiLiveApiService: Successfully re-initialized client with apiVersion for .live support.");
                        } else {
                             console.warn("geminiLiveApiService: Retrying with apiVersion did not expose .live namespace.");
                        }
                    } catch (e_version) {
                        console.warn("geminiLiveApiService: Error re-initializing client with specific apiVersion:", e_version);
                    }
                }


                if (!genAIClient) throw new Error("Client initialization failed even after attempts.");
                console.log("geminiLiveApiService: GoogleGenAI client initialized. Has .live namespace:", !!genAIClient.live);
            } catch (e) {
                console.error("CRITICAL: Failed to initialize GoogleGenAI client:", e);
                throw e;
            }
        }
        return genAIClient;
    }

    async function connect(modelName, sessionSetupConfig, callbacks) {
        console.log("geminiLiveApiService: connect() called. Model:", modelName, "Config:", sessionSetupConfig);

        if (activeLiveSession) {
            console.warn("geminiLiveApiService: Active session exists. Closing old one before establishing new.");
            await closeConnection("New connection requested"); // Ensure old session is fully closed
        }

        const apiKeyToUse = window.GEMINI_API_KEY;
        if (!apiKeyToUse || apiKeyToUse === 'YOUR_ACTUAL_GEMINI_API_KEY_HERE') {
            console.error("API Key not configured for geminiLiveApiService.");
            throw new Error("API Key not configured.");
        }

        try {
            const client = getGenAIClient(apiKeyToUse);

            onAiAudioChunkCallback = callbacks.onAiAudioChunk;
            onAiTextCallback = callbacks.onAiText;
            onUserTranscriptionCallback = callbacks.onUserTranscription;
            onModelTranscriptionCallback = callbacks.onModelTranscription;
            onErrorCallback = callbacks.onError;
            onOpenCallback = callbacks.onOpen;
            onCloseCallback = callbacks.onClose;

            if (!client.live || typeof client.live.connect !== 'function') {
                const errorMsg = "SDK method client.live.connect is not available. Check SDK version and initialization.";
                console.error("geminiLiveApiService:", errorMsg, "client.live details:", client.live);
                throw new Error(errorMsg);
            }

            console.log("geminiLiveApiService: Calling client.live.connect...");

            activeLiveSession = await client.live.connect({
                model: modelName,
                callbacks: {
                    onopen: () => {
                        console.log('geminiLiveApiService: SDK onopen - WebSocket connection established.');
                        // Note: The SDK's onopen doesn't mean setup is complete. Wait for `message.setupComplete`.
                    },
                    onmessage: (message) => {
                        // console.debug("geminiLiveApiService: SDK onmessage received:", JSON.stringify(message).substring(0, 300) + "...");
                        if (message.error && onErrorCallback) {
                            console.error("geminiLiveApiService: Error message from stream:", message.error);
                            onErrorCallback(new Error(message.error.message || "Live API error in stream message"));
                        } else if (message.setupComplete) {
                            console.log("geminiLiveApiService: SDK onmessage - SetupComplete received from server. Calling onOpenCallback.");
                            if (onOpenCallback) onOpenCallback(); // Signal our handler that session is truly ready
                        } else if (message.serverContent) {
                            const sc = message.serverContent;
                            if (sc.modelTurn?.parts) {
                                sc.modelTurn.parts.forEach(part => {
                                    if (part.text && onAiTextCallback) {
                                        // console.log("geminiLiveApiService: AI Text Part:", part.text.substring(0, 50) + "...");
                                        onAiTextCallback(part.text); // Pass the text chunk
                                    }
                                    // --- RESTORED AI AUDIO CHUNK HANDLING ---
                                    if (part.inlineData?.data && onAiAudioChunkCallback) {
                                        try {
                                            const byteString = atob(part.inlineData.data);
                                            const byteArray = new Uint8Array(byteString.length);
                                            for (let i = 0; i < byteString.length; i++) {
                                                byteArray[i] = byteString.charCodeAt(i);
                                            }
                                            // console.log("geminiLiveApiService: AI Audio Chunk (inlineData) size:", byteArray.buffer.byteLength);
                                            onAiAudioChunkCallback(byteArray.buffer, part.inlineData.mimeType || "audio/mp3"); // Defaulting to mp3 as per TTS, but Live API might be PCM
                                        } catch (e) {
                                            console.error("Error decoding SDK audio data from inlineData:", e);
                                        }
                                    } else if (part.blob && onAiAudioChunkCallback && typeof part.blob.arrayBuffer === 'function') {
                                        part.blob.arrayBuffer().then(arrayBuffer => {
                                            // console.log("geminiLiveApiService: AI Audio Chunk (blob) size:", arrayBuffer.byteLength);
                                            onAiAudioChunkCallback(arrayBuffer, part.blob.type || "audio/mp3");
                                        }).catch(e => console.error("Error getting ArrayBuffer from Blob:", e));
                                    }
                                    // --- END RESTORED AI AUDIO CHUNK HANDLING ---
                                });
                            }
                            if (sc.inputTranscription?.text && onUserTranscriptionCallback) {
                                const userText = sc.inputTranscription.text;
                                const isFinalUser = sc.inputTranscription.isFinal || false;
                                // console.log(`geminiLiveApiService: User Transcription - Text: "${userText.substring(0,30)}...", IsFinal: ${isFinalUser}`);
                                onUserTranscriptionCallback(userText, isFinalUser);
                            }
                            if (sc.outputTranscription?.text && onModelTranscriptionCallback) {
                                const modelText = sc.outputTranscription.text;
                                const isFinalModel = sc.outputTranscription.isFinal || false;
                                // console.log(`geminiLiveApiService: Model Transcription - Text: "${modelText.substring(0,30)}...", IsFinal: ${isFinalModel}`);
                                onModelTranscriptionCallback(modelText, isFinalModel);
                            }
                        }
                    },
                    onerror: (errorEvent) => {
                        console.error('GEMINI LIVE SDK ONERROR EVENT Raw:', errorEvent);
                        console.error('GEMINI LIVE SDK ONERROR EVENT Stringified:', JSON.stringify(errorEvent, Object.getOwnPropertyNames(errorEvent)));
                        let errorMessage = "Live API WebSocket error.";
                        if (errorEvent && errorEvent.message) {
                            errorMessage = errorEvent.message;
                        } else if (errorEvent && typeof errorEvent.code === 'number') {
                            errorMessage = `WebSocket error. Code: ${errorEvent.code}, Reason: ${errorEvent.reason || 'N/A'}`;
                        } else if (errorEvent && typeof errorEvent.type === 'string') {
                            errorMessage = `WebSocket error event: ${errorEvent.type}`;
                        }
                        console.error('geminiLiveApiService: SDK onerror callback processed:', errorMessage);
                        if (onErrorCallback) onErrorCallback(new Error(errorMessage));
                        activeLiveSession = null;
                    },
                    onclose: (closeEvent) => {
                        console.log('geminiLiveApiService: SDK onclose - WebSocket closed. Reason:', closeEvent?.reason, "Code:", closeEvent?.code, "WasClean:", closeEvent?.wasClean);
                        if (onCloseCallback) onCloseCallback(closeEvent?.wasClean, closeEvent?.code, closeEvent?.reason);
                        activeLiveSession = null;
                    }
                },
                config: sessionSetupConfig // This is the SessionSetupConfig from live_call_handler
            });

            console.log("geminiLiveApiService: client.live.connect call awaited. SDK Session object:", activeLiveSession);
            if (!activeLiveSession) {
                throw new Error("client.live.connect did not return a session object or resolved falsy.");
            }
            // Note: Returning activeLiveSession might not be directly useful to the caller if all interaction is via callbacks and send methods.
            // The main thing is that activeLiveSession is now set for other functions in this service.
            return true; // Indicate connection process was initiated

        } catch (err) {
            console.error("geminiLiveApiService: Error in connect function:", err.message, err.stack);
            activeLiveSession = null;
            if (onErrorCallback) onErrorCallback(err);
            throw err; // Re-throw to be caught by live_call_handler
        }
    }

    async function sendClientText(text) {
        if (!activeLiveSession) {
            console.warn("geminiLiveApiService: sendClientText - No active SDK session.");
            if (onErrorCallback) onErrorCallback(new Error("Live session not active for sending text."));
            return;
        }
        if (typeof activeLiveSession.sendClientContent !== 'function') {
            console.error("geminiLiveApiService: sendClientText - activeLiveSession.sendClientContent is not a function.");
            if (onErrorCallback) onErrorCallback(new Error("Live session misconfigured for sending text."));
            return;
        }
        try {
            console.log("geminiLiveApiService: Sending client text via SDK session:", text.substring(0, 50) + "...");
            await activeLiveSession.sendClientContent({
                turns: [{ role: "user", parts: [{ text: text }] }]
            });
        } catch (err) {
            console.error("geminiLiveApiService: Error sending client text via SDK session:", err);
            if (onErrorCallback) onErrorCallback(err);
        }
    }

    async function sendRealtimeAudio(audioChunkArrayBuffer, mimeType = "audio/pcm;rate=16000") {
        if (!activeLiveSession) {
            // console.warn("geminiLiveApiService: sendRealtimeAudio - No active SDK session.");
            return; // Fail silently if no session, as this is high frequency
        }
        if (typeof activeLiveSession.sendRealtimeInput !== 'function') {
            console.error("geminiLiveApiService: sendRealtimeAudio - activeLiveSession.sendRealtimeInput is not a function.");
            return;
        }
        try {
            // Convert ArrayBuffer to base64 string
            let binary = '';
            const bytes = new Uint8Array(audioChunkArrayBuffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);
            const audioMediaPayload = { data: base64Audio, mimeType: mimeType };
            await activeLiveSession.sendRealtimeInput({ media: audioMediaPayload });
        } catch (err) {
            console.error("geminiLiveApiService: Error sending realtime audio via SDK session:", err);
            // Avoid calling onErrorCallback for every chunk failure to prevent flooding,
            // unless it's a critical error. The main onerror for the session should catch bigger issues.
        }
    }

    async function sendAudioStreamEndSignal() {
        if (!activeLiveSession || typeof activeLiveSession.sendRealtimeInput !== 'function') {
            console.warn("geminiLiveApiService: sendAudioStreamEndSignal - No active session or method unavailable.");
            return;
        }
        try {
            console.log("geminiLiveApiService: Sending audioStreamEnd signal via SDK session.");
            await activeLiveSession.sendRealtimeInput({ audioStreamEnd: true });
        } catch (err) {
            console.error("geminiLiveApiService: Error sending audioStreamEnd signal:", err);
            if (onErrorCallback) onErrorCallback(err);
        }
    }

    function closeConnection(reason = "Client session ended") {
        console.log("geminiLiveApiService: Attempting to close Live API session via SDK. Current session active:", !!activeLiveSession);
        if (activeLiveSession && typeof activeLiveSession.close === 'function') {
            try {
                activeLiveSession.close(); // SDK's close method
                console.log("geminiLiveApiService: SDK session close() called.");
            } catch (err) {
                console.error("geminiLiveApiService: Error during SDK session close():", err);
            }
        } else if (activeLiveSession) {
            console.warn("geminiLiveApiService: activeLiveSession exists but .close is not a function. Forcing null.");
        }
        activeLiveSession = null; // Ensure it's nulled out
    }

    console.log("services/gemini_live_api_service.js loaded and AI audio chunk handling restored.");
    return {
        connect,
        sendClientText,
        sendRealtimeAudio,
        sendAudioStreamEndSignal,
        closeConnection
    };
})();