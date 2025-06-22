// src/js/sessions/live_api_text_coordinator.ts
import type {
    SessionStateManager,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    UiUpdater,
    TranscriptTurn // For addTurnToTranscript if we make it more type-safe here
} from '../types/global.d.ts'; // Adjust path if needed

console.log("live_api_text_coordinator.ts: Script execution STARTED (TS v1.0).");

export interface LiveApiTextCoordinatorModule {
    initialize: (
        sessionStateManager: SessionStateManager,
        polyglotHelpers: PolyglotHelpers,
        uiUpdater: UiUpdater
    ) => boolean;
    resetBuffers: () => void;
    setCurrentSessionTypeContext: (sessionType: string | null) => void;
    handleReceivedAiText: (text: string) => void;
    handleReceivedUserTranscription: (text: string, isFinal?: boolean) => void;
    handleReceivedModelTranscription: (text: string, isFinal?: boolean) => void;
    handleUserTypedText: (text: string) => void;
    flushUserTranscription: () => void;
    flushAiSpokenText: () => void;
    resetAiSpokenTextBuffer: () => void;
}

window.liveApiTextCoordinator = {} as LiveApiTextCoordinatorModule; // Placeholder

function initializeActualLiveApiTextCoordinator(): void {
    console.log("live_api_text_coordinator.ts: initializeActualLiveApiTextCoordinator called.");

    window.liveApiTextCoordinator = ((): LiveApiTextCoordinatorModule => {
        'use strict';
        const MODULE_VERSION = "TS 1.0";
        console.log(`live_api_text_coordinator.ts: IIFE (v${MODULE_VERSION}) STARTING.`);

        let sessionStateManagerRef: SessionStateManager | null = null;
        let polyglotHelpersRef: PolyglotHelpers | null = null;
        let uiUpdaterRef: UiUpdater | null = null;

        let userTranscriptionBuffer: string = "";
        let userTranscriptionTimeoutId: any = null;// Use NodeJS.Timeout for setTimeout/clearTimeout
        const USER_TRANSCRIPTION_FLUSH_DELAY: number = 1500;

        let aiSpokenTextBuffer: string = "";
        let aiSpokenTextTimeoutId: any = null;
        const AI_SPOKEN_TEXT_FLUSH_DELAY: number = 800;

        let currentSessionTypeRef: string | null = null;

        function initialize(
            sessionStateManager: SessionStateManager,
            polyglotHelpers: PolyglotHelpers,
            uiUpdater: UiUpdater
        ): boolean {
            console.log("TextCoordinator (TS): initialize() called.");
            if (!sessionStateManager || typeof sessionStateManager.addTurnToTranscript !== 'function') {
                console.error("TextCoordinator (TS): Init failed - sessionStateManager invalid.");
                return false;
            }
            if (!polyglotHelpers || typeof polyglotHelpers.stripEmojis !== 'function') {
                console.error("TextCoordinator (TS): Init failed - polyglotHelpers invalid.");
                return false;
            }
            // uiUpdater is optional for some core functions of text coordinator, but good to have
            if (!uiUpdater) {
                console.warn("TextCoordinator (TS): uiUpdater not provided during init. Some UI updates might be skipped.");
            }

            sessionStateManagerRef = sessionStateManager;
            polyglotHelpersRef = polyglotHelpers;
            uiUpdaterRef = uiUpdater;
            resetBuffers();
            console.log("TextCoordinator (TS): Initialized successfully.");
            return true;
        }

        function resetBuffers(): void {
            console.log("TextCoordinator (TS): resetBuffers() called.");
            userTranscriptionBuffer = "";
            if (userTranscriptionTimeoutId) {
                clearTimeout(userTranscriptionTimeoutId);
                userTranscriptionTimeoutId = null;
            }
            resetAiSpokenTextBuffer();
            currentSessionTypeRef = null;
        }
        
        function setCurrentSessionTypeContext(sessionType: string | null): void {
            currentSessionTypeRef = sessionType;
        }

        function flushUserTranscription(): void {
            // console.log(`TextCoordinator (TS): flushUserTranscription. Buffer: "${userTranscriptionBuffer.trim()}"`);
            if (userTranscriptionTimeoutId) {
                clearTimeout(userTranscriptionTimeoutId);
                userTranscriptionTimeoutId = null;
            }

            if (!sessionStateManagerRef) { 
                console.warn("TextCoordinator (TS): flushUserTranscription - sessionStateManagerRef not set."); 
                userTranscriptionBuffer = "";
                return; 
            }
            const textToStore = userTranscriptionBuffer.trim();
            if (textToStore) { // Check if not empty
                // console.log(`TextCoordinator (TS): FLUSHING USER transcription: "${textToStore}"`);
                // Assuming SessionStateManager's addTurnToTranscript now expects a TranscriptTurn object
                const turn: TranscriptTurn = { sender: 'user-audio-transcript', text: textToStore, timestamp: Date.now(), type: 'text' };
                sessionStateManagerRef.addTurnToTranscript(turn);
            }
            userTranscriptionBuffer = "";
        }

        function flushAiSpokenText(): void {
            // console.log(`TextCoordinator (TS): flushAiSpokenText. Buffer: "${aiSpokenTextBuffer.trim()}"`);
            if (aiSpokenTextTimeoutId) {
                clearTimeout(aiSpokenTextTimeoutId);
                aiSpokenTextTimeoutId = null;
            }

            if (!sessionStateManagerRef || !polyglotHelpersRef) { 
                console.warn("TextCoordinator (TS): flushAiSpokenText - sessionStateManagerRef or polyglotHelpersRef not set."); 
                aiSpokenTextBuffer = ""; 
                return; 
            }
            
            let textToStore = aiSpokenTextBuffer.trim();
            if (textToStore) { // Check if not empty
                textToStore = polyglotHelpersRef.stripEmojis(textToStore);
                // console.log(`TextCoordinator (TS): FLUSHING AI spoken text: "${textToStore}"`);
                const turn: TranscriptTurn = { sender: 'connector-spoken-output', text: textToStore, timestamp: Date.now(), type: 'text' };
                sessionStateManagerRef.addTurnToTranscript(turn);
            }
            aiSpokenTextBuffer = "";
        }

        function resetAiSpokenTextBuffer(): void {
            // console.log("TextCoordinator (TS): resetAiSpokenTextBuffer() called.");
            aiSpokenTextBuffer = "";
            if (aiSpokenTextTimeoutId) {
                clearTimeout(aiSpokenTextTimeoutId);
                aiSpokenTextTimeoutId = null;
            }
        }

        function handleReceivedAiText(text: string): void {
            // console.log(`TextCoordinator (TS): Received AI Text (modelTurn part.text?): "${text}"`);
            if (currentSessionTypeRef === "voiceChat_modal" && uiUpdaterRef?.appendToVoiceChatLog) {
                // This assumes uiUpdater is available and configured for voiceChat_modal if that's a target
                uiUpdaterRef.appendToVoiceChatLog(text, 'connector');
            }
            aiSpokenTextBuffer += text + " ";
            if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);
            aiSpokenTextTimeoutId = setTimeout(flushAiSpokenText, AI_SPOKEN_TEXT_FLUSH_DELAY);
        }

        function handleReceivedUserTranscription(text: string, isFinal: boolean = false): void {
            // console.log(`TextCoordinator (TS): User RX: "${text}", Final: ${isFinal}`);
            // Example of potential UI update during transcription streaming
            // if (currentSessionTypeRef === "voiceChat_modal" && uiUpdaterRef?.updateVoiceChatInputWithTranscription) {
            //     uiUpdaterRef.updateVoiceChatInputWithTranscription(text, isFinal); 
            // }
            
            userTranscriptionBuffer += text + " "; 
            if (userTranscriptionTimeoutId) clearTimeout(userTranscriptionTimeoutId);

            if (isFinal) {
                flushUserTranscription();
            } else {
                userTranscriptionTimeoutId = setTimeout(flushUserTranscription, USER_TRANSCRIPTION_FLUSH_DELAY);
            }
        }

        function handleReceivedModelTranscription(text: string, isFinal: boolean = false): void {
            let processedText = text;

            // Filter out "(Audio of...)" descriptions
            if (processedText.trim().startsWith("(Audio of") && processedText.trim().endsWith(")")) {
                console.log(`TextCoordinator (TS): Filtering out AI audio description: "${processedText}"`);
                processedText = ""; // Effectively discard this specific transcription part
            }
            
            // Also, filter out explicit language self-annotations if they somehow still slip through
            // (though the main system prompt should prevent the AI from *generating* these)
            if (processedText.match(/\((In|En)\s+(English|French|Spanish|Italian|German|Portuguese|Russian|Swedish|Indonesian|Tagalog)\s*\)/i)) {
                 console.log(`TextCoordinator (TS): Filtering out language annotation: "${processedText}"`);
                 processedText = processedText.replace(/\((In|En)\s+[^\)]+\)\s*:?/gi, '').trim();
            }

            // If, after filtering, the text is empty, we might not want to proceed further with it,
            // especially if it's not a final part, to avoid adding empty spaces or triggering timeouts.
            if (!processedText.trim()) {
                if (isFinal && aiSpokenTextBuffer.trim()) {
                    // If it's final and there was previous buffered text, flush that.
                    flushAiSpokenText();
                } else if (isFinal) {
                    // If it's final and buffer is also empty (e.g. whole utterance was filtered)
                    // ensure any pending timeout for AI speech is cleared.
                    if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);
                    aiSpokenTextTimeoutId = null; 
                }
                // If not final and processedText is empty, just return and wait for more parts.
                return; 
            }

            // Add to buffer with space only if we have valid text
            aiSpokenTextBuffer += processedText + " ";
            if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);

            if (isFinal) {
                flushAiSpokenText(); // Flushes the entire buffer (which now excludes filtered parts)
            } else {
                aiSpokenTextTimeoutId = setTimeout(flushAiSpokenText, AI_SPOKEN_TEXT_FLUSH_DELAY);
            }
        }
        
        function handleUserTypedText(text: string): void {
            if (!sessionStateManagerRef) { 
                console.warn("TextCoordinator (TS): handleUserTypedText - sessionStateManagerRef not set."); 
                return; 
            }
            const trimmedText = text?.trim();
            if (trimmedText) {
                const turn: TranscriptTurn = { sender: 'user-typed', text: trimmedText, timestamp: Date.now(), type: 'text' };
                sessionStateManagerRef.addTurnToTranscript(turn);
            }
        }

        console.log(`live_api_text_coordinator.ts (v${MODULE_VERSION}): IIFE FINISHED.`);
        return {
            initialize,
            resetBuffers,
            setCurrentSessionTypeContext,
            handleReceivedAiText,
            handleReceivedUserTranscription,
            handleReceivedModelTranscription,
            handleUserTypedText,
            flushUserTranscription,
            flushAiSpokenText,
            resetAiSpokenTextBuffer
        };
    })(); // End of IIFE

    if (window.liveApiTextCoordinator && typeof window.liveApiTextCoordinator.initialize === 'function') {
        console.log("live_api_text_coordinator.ts: SUCCESSFULLY assigned and functional.");
        document.dispatchEvent(new CustomEvent('liveApiTextCoordinatorReady'));
        console.log("live_api_text_coordinator.ts: 'liveApiTextCoordinatorReady' event dispatched.");
    } else {
        console.error("live_api_text_coordinator.ts: CRITICAL ERROR - Not correctly assigned or initialize method missing.");
    }
} // End of initializeActualLiveApiTextCoordinator

initializeActualLiveApiTextCoordinator(); // Define window.liveApiTextCoordinator

console.log("live_api_text_coordinator.ts: Script execution FINISHED (TS Version).");