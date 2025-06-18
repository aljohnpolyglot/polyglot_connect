// src/js/services/gemini_live_api_service.ts

// NO import from "@google/generative-ai" for the main connection.
// We might use its types if helpful for structuring messages, but not the client class itself for connect.

import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { LIVE_API_SETUP_TIMEOUT_MS } from './ai_constants'; 
// At the top of the file, with other imports
import { GEMINI_KEY_NICKNAMES } from './gemini_api_caller.js';
console.log("gemini_live_api_service.ts: Script execution STARTED (Manual WebSocket Approach).");
const SERVICE_VERSION = "ManualWebSocket v0.1";

// Callback interface (remains the same - this is what live_call_handler provides)
interface GeminiLiveApiCallbacks {
    onOpen: () => void;
    onAiAudioChunk: (audioChunk: ArrayBuffer, mimeType: string) => void;
    onAiText: (text: string) => void;
    onUserTranscription: (text: string, isFinal: boolean) => void;
    onModelTranscription: (text: string, isFinal: boolean) => void;
    onAiInterrupted: () => void;
    onError: (error: Error | any) => void;
    onClose: (wasClean: boolean, code: number, reason: string) => void;
}

// Module interface (this is what we provide to live_call_handler)
export interface GeminiLiveApiServiceModule {
    connect: (
        modelName: string, // e.g., "gemini-2.0-flash-live-001"
        sessionSetupConfig: any, // Will be structured as BidiGenerateContentSetup
        facadeCallbacks: GeminiLiveApiCallbacks
    ) => Promise<boolean>; // true if WebSocket connection attempt initiated
    sendClientText: (text: string) => Promise<void>; // Will send BidiGenerateContentClientContent
    sendRealtimeAudio: (audioChunkArrayBuffer: ArrayBuffer) => Promise<void>; // Will send BidiGenerateContentRealtimeInput
    sendAudioStreamEndSignal?: () => Promise<void>; // Will send BidiGenerateContentRealtimeInput with audioStreamEnd
    closeConnection: (reason?: string) => Promise<void>;
}

window.geminiLiveApiService = {} as GeminiLiveApiServiceModule;


// ADD THIS HELPER FUNCTION
// This new version mirrors the logic from gemini_api_caller.ts for consistency and robustness
function getLiveCallApiKey(): { key: string, nickname: string } | null {
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

    const validKeys = potentialKeys.filter(key =>
        key && typeof key === 'string' && !key.includes("YOUR_") && key.length > 20
    ) as string[];

    if (validKeys.length === 0) {
        console.error("Gemini Live API Service: No valid Gemini keys found for live call.");
        return null;
    }

    const randomIndex = Math.floor(Math.random() * validKeys.length);
    const randomKey = validKeys[randomIndex];
    const nickname = GEMINI_KEY_NICKNAMES[randomIndex] || `Rookie #${randomIndex + 1}`;

    console.log(
        `%c📞 Live Call Draft Pick: ${nickname}!`,
        'color: #ff8c00; font-weight: bold; font-size: 14px;'
    );

    return { key: randomKey, nickname: nickname };
}




function initializeActualGeminiLiveApiService(): void {
    console.log("gemini_live_api_service.ts: initializeActualGeminiLiveApiService called (Manual WebSocket Approach).");

    window.geminiLiveApiService = ((): GeminiLiveApiServiceModule => {
        'use strict';
        console.log(`gemini_live_api_service.ts: IIFE (v${SERVICE_VERSION}) STARTING.`);

        let webSocket: WebSocket | null = null;
        let currentFacadeCallbacks: GeminiLiveApiCallbacks | null = null;
        let sdkOnOpenTime: number | null = null; // For measuring time to SetupComplete
        let setupTimeoutId: number | null = null;

        function arrayBufferToBase64(buffer: ArrayBuffer): string {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }

        async function connect(
            modelName: string,
            sessionSetupConfig: any, // Expects structure for BidiGenerateContentSetup
            facadeCallbacks: GeminiLiveApiCallbacks
        ): Promise<boolean> {
            const funcName = "connect (Manual WebSocket)";
            console.log(`GeminiLiveService (${funcName} v${SERVICE_VERSION}): Attempting WebSocket. Model: '${modelName}'`);
            currentFacadeCallbacks = facadeCallbacks;
            sdkOnOpenTime = null;
            if (setupTimeoutId) clearTimeout(setupTimeoutId);
            setupTimeoutId = null;

            if (webSocket && (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING)) {
                console.log(`GeminiLiveService (${funcName}): Existing WebSocket, closing first.`);
                await closeConnection("New connection requested"); 
            }

            const apiKeyData = getLiveCallApiKey();
            if (!apiKeyData || !apiKeyData.key) {
                console.error("Live Call Connect: Failed to get a valid API key. Aborting connection.");
                // ...
                throw new Error("No valid API key available for live call.");
            }
            const { key: apiKey } = apiKeyData; // Destructure to get the key

            const fullModelName = modelName.startsWith("models/") ? modelName : `models/${modelName}`;
            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
       
            console.log(`GeminiLiveService (${funcName}): Connecting to WebSocket: ${wsUrl.split('?')[0]}?key=...`);

            try {
                webSocket = new WebSocket(wsUrl);

                webSocket.onopen = () => {
                    console.log(`GeminiLiveService (${funcName}): WebSocket ONOPEN received.`);
                    const setupMessagePayload = {
                        setup: { 
                            model: fullModelName,
                            systemInstruction: sessionSetupConfig.systemInstruction,
                            generationConfig: sessionSetupConfig.generationConfig,
                            realtimeInputConfig: sessionSetupConfig.realtimeInputConfig,
                            inputAudioTranscription: sessionSetupConfig.inputAudioTranscription || {}, // Send empty object to enable if true in config
                            outputAudioTranscription: sessionSetupConfig.outputAudioTranscription || {},// Send empty object to enable if true in config
                            // tools: sessionSetupConfig.tools, // If you have tools
                        }
                    };
                    console.log(`GeminiLiveService (${funcName}): Sending setup message:`, JSON.stringify(setupMessagePayload).substring(0,500)+"...");
                    webSocket!.send(JSON.stringify(setupMessagePayload));

                    const timeoutDuration = LIVE_API_SETUP_TIMEOUT_MS || 15000;
                    setupTimeoutId = setTimeout(() => {
                        console.warn(`GeminiLiveService (${funcName}): Timeout (${timeoutDuration}ms) waiting for SetupComplete from server.`);
                        if (webSocket && webSocket.readyState === WebSocket.OPEN) webSocket.close(1000, "Setup timeout");
                        else if (webSocket) webSocket.close(); // Close if connecting but not open
                        currentFacadeCallbacks?.onError?.(new Error("Live API setup timeout (no SetupComplete received)."));
                    }, timeoutDuration);
                };

                // In gemini_live_api_service.ts, inside the connect function

webSocket.onmessage = async (event) => {
    const funcNameFromConnect = "connect (Manual WebSocket)"; // To use in logs
    let messageDataString: string | null = null;

    if (typeof event.data === 'string') {
        messageDataString = event.data;
    } else if (event.data instanceof Blob) {
        console.warn(`GeminiLiveService (${funcNameFromConnect}): Received Blob WebSocket message. Size: ${event.data.size}, Type: '${event.data.type}'`);
        try {
            messageDataString = await event.data.text();
            console.log(`GeminiLiveService (${funcNameFromConnect}): Blob content successfully read as text:`, messageDataString.substring(0, 200) + "...");
        } catch (e) {
            console.error(`GeminiLiveService (${funcNameFromConnect}): Error reading Blob data:`, e);
            currentFacadeCallbacks?.onError?.(new Error("Received unreadable Blob from server."));
            if (webSocket && webSocket.readyState === WebSocket.OPEN) {
                webSocket.close(1000, "Unreadable Blob");
            }
            return;
        }
    } else {
        console.warn(`GeminiLiveService (${funcNameFromConnect}): Received unknown WebSocket message type:`, event.data);
        return;
    }

    if (messageDataString) {
        try {
            const message = JSON.parse(messageDataString);
            // console.log(`GeminiLiveService (${funcNameFromConnect}): Parsed message:`, JSON.stringify(message).substring(0, 300) + "...");

            if (message.setupComplete) {
                if (setupTimeoutId) clearTimeout(setupTimeoutId);
                setupTimeoutId = null;
                sdkOnOpenTime = performance.now();
                console.log(`GeminiLiveService (${funcNameFromConnect}): Received SetupComplete from server at ${new Date().toISOString()}.`);
                currentFacadeCallbacks?.onOpen?.();
            } else if (message.serverContent) {
                const sc = message.serverContent;
                // console.log(`GeminiLiveService (${funcNameFromConnect}): Processing serverContent:`, sc);
                if (sc.modelTurn?.parts) {
                    sc.modelTurn.parts.forEach((part: any) => {
                        if (part.text) {
                            // console.log(`GeminiLiveService (${funcNameFromConnect}): AI Text part: "${part.text.substring(0,50)}..."`);
                            currentFacadeCallbacks?.onAiText?.(part.text);
                        }
                        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
                            console.log(`GeminiLiveService (${funcNameFromConnect}): AI Audio part received: ${part.inlineData.mimeType}`);
                            try {
                                const byteString = atob(part.inlineData.data);
                                const byteArray = new Uint8Array(byteString.length);
                                for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
                                currentFacadeCallbacks?.onAiAudioChunk?.(byteArray.buffer, part.inlineData.mimeType);
                            } catch (e: any) { console.error("GeminiLiveService: Error decoding AI audio inlineData:", e.message); }
                        }
                    });
                }
                if (sc.inputTranscription?.text !== undefined) {
                    // console.log(`GeminiLiveService (${funcNameFromConnect}): User Transcription: "${sc.inputTranscription.text}"`);
                    currentFacadeCallbacks?.onUserTranscription?.(sc.inputTranscription.text, sc.inputTranscription.isFinal ?? !!sc.turnComplete ?? !!sc.generationComplete);
                }
                if (sc.outputTranscription?.text !== undefined) {
                     // console.log(`GeminiLiveService (${funcNameFromConnect}): Model Transcription: "${sc.outputTranscription.text}"`);
                    currentFacadeCallbacks?.onModelTranscription?.(sc.outputTranscription.text, sc.outputTranscription.isFinal ?? !!sc.turnComplete ?? !!sc.generationComplete);
                }
                if (sc.interrupted === true) {
                    console.log(`GeminiLiveService (${funcNameFromConnect}): AI Interrupted signal received.`);
                    currentFacadeCallbacks?.onAiInterrupted?.();
                }
                // Handle sc.generationComplete, sc.turnComplete if needed for your logic
            } else if (message.toolCall) {
                console.log(`GeminiLiveService (${funcNameFromConnect}): Received toolCall:`, message.toolCall);
                // TODO: Implement tool call handling
            } else if (message.error) { 
                 console.error(`GeminiLiveService (${funcNameFromConnect}): Server sent an error structure in JSON:`, message.error);
                 currentFacadeCallbacks?.onError?.(new Error(message.error.message || JSON.stringify(message.error)));
            } else {
                console.warn(`GeminiLiveService (${funcNameFromConnect}): Received valid JSON, but unrecognized message structure:`, message);
                // Optionally treat as an error or ignore
                // currentFacadeCallbacks?.onError?.(new Error(`Received unrecognized JSON message structure from server.`));
                // if (webSocket) webSocket.close(1000, "Unrecognized JSON structure");
            }
        } catch (parseError) {
            console.error(`GeminiLiveService (${funcNameFromConnect}): Error parsing WebSocket message string:`, parseError, "Data:", messageDataString);
            currentFacadeCallbacks?.onError?.(new Error("Error parsing message string from server."));
        }
    }
};

                webSocket.onerror = (event) => {
                    if (setupTimeoutId) clearTimeout(setupTimeoutId);
                    setupTimeoutId = null;
                    console.error(`GeminiLiveService (${funcName}): WebSocket ONERROR:`, event);
                    let errorMsg = "WebSocket connection error.";
                    // Modern browsers provide Event, not specific ErrorEvent or CloseEvent here
                    // For more details, you might need to inspect the 'type' or rely on onclose
                    currentFacadeCallbacks?.onError?.(new Error(errorMsg));
                };

                webSocket.onclose = (event) => {
                    if (setupTimeoutId) clearTimeout(setupTimeoutId);
                    setupTimeoutId = null;
                    console.log(`GeminiLiveService (${funcName}): WebSocket ONCLOSE. Clean: ${event.wasClean}, Code: ${event.code}, Reason: "${event.reason}"`);
                    currentFacadeCallbacks?.onClose?.(event.wasClean, event.code, event.reason || "WebSocket closed");
                    webSocket = null;
                };
                
                return true; // WebSocket connection attempt initiated

            } catch (err: any) {
                console.error(`GeminiLiveService (${funcName}): Error setting up WebSocket:`, err.message, err);
                currentFacadeCallbacks?.onError?.(err);
                webSocket = null;
                return false;
            }
        }

        async function sendClientText(text: string): Promise<void> {
            if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
                currentFacadeCallbacks?.onError?.(new Error("Cannot send text - WebSocket not open."));
                return;
            }
            try {
                const clientContentPayload = {
                    clientContent: { // This wrapper is based on the docs: "The JSON object must have exactly one of the fields..."
                        turns: [{ role: "user", parts: [{ text: text }] }],
                        turnComplete: true 
                    }
                };
                console.log(`GeminiLiveService (sendClientText): Sending:`, JSON.stringify(clientContentPayload).substring(0,100)+"...");
                webSocket.send(JSON.stringify(clientContentPayload));
            } catch (err: any) {
                console.error(`GeminiLiveService (sendClientText): Error:`, err.message, err);
                currentFacadeCallbacks?.onError?.(err);
            }
        }

        async function sendRealtimeAudio(audioChunkArrayBuffer: ArrayBuffer): Promise<void> {
            if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
                return;
            }
            if (!audioChunkArrayBuffer?.byteLength) return;
            
            try {
                const base64AudioData = arrayBufferToBase64(audioChunkArrayBuffer);
                const realtimeInputPayload = {
                    realtimeInput: { // This wrapper is based on the docs
                        audio: { 
                            mimeType: "audio/pcm;rate=16000", 
                            data: base64AudioData 
                        }
                    }
                };
                webSocket.send(JSON.stringify(realtimeInputPayload));
            } catch (err: any) { 
                console.error(`GeminiLiveService (sendRealtimeAudio): Error:`, err.message, err);
            }
        }
        
        async function sendAudioStreamEndSignal(): Promise<void> {
             if (!webSocket || webSocket.readyState !== WebSocket.OPEN) return;
            console.log("GeminiLiveService: Sending audioStreamEnd signal via WebSocket.");
            try {
                const realtimeInputPayload = {
                    realtimeInput: {
                        audioStreamEnd: true
                    }
                };
                webSocket.send(JSON.stringify(realtimeInputPayload));
            } catch (err: any) { 
                console.error(`GeminiLiveService (sendAudioStreamEndSignal): Error:`, err); 
                currentFacadeCallbacks?.onError?.(err);
            }
        }

        async function closeConnection(reason: string = "Client request"): Promise<void> {
            const funcName = "closeConnection (Manual WebSocket)";
            console.log(`GeminiLiveService (${funcName}): Closing WebSocket. Reason: ${reason}. State: ${webSocket?.readyState}`);
            if (setupTimeoutId) clearTimeout(setupTimeoutId);
            setupTimeoutId = null;
            
            if (webSocket) {
                if (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING) {
                    webSocket.close(1000, reason); // 1000 is normal closure
                }
            }
            // onclose handler will deal with nullifying webSocket and calling facadeCallback.onClose
            // currentFacadeCallbacks = null; // Don't nullify here, onClose needs it
        }

        console.log(`gemini_live_api_service.ts (v${SERVICE_VERSION}): IIFE FINISHED.`);
        return { connect, sendClientText, sendRealtimeAudio, sendAudioStreamEndSignal, closeConnection };
    })();

    if (window.geminiLiveApiService && typeof window.geminiLiveApiService.connect === 'function') {
        console.log(`gemini_live_api_service.ts: SUCCESSFULLY assigned to window (v${SERVICE_VERSION}).`);
        document.dispatchEvent(new CustomEvent('geminiLiveApiServiceReady'));
    } else {
        console.error(`gemini_live_api_service.ts: CRITICAL ERROR - window.geminiLiveApiService not correctly formed (v${SERVICE_VERSION}).`);
        document.dispatchEvent(new CustomEvent('geminiLiveApiServiceReady')); // Still dispatch
    }
}

initializeActualGeminiLiveApiService();

console.log("gemini_live_api_service.ts: Script execution FINISHED (Manual WebSocket Approach).");