// js/sessions/live_api_text_coordinator.js
// Handles buffering and processing of text transcriptions (user and AI) for Live API calls.
// Version: Robust Flushing

console.log("live_api_text_coordinator.js: Script execution STARTED (v Robust Flushing).");

window.liveApiTextCoordinator = (() => {
    'use strict';
    const MODULE_VERSION = "1.1.0 (Robust Flushing)";
    console.log(`live_api_text_coordinator.js: IIFE (v${MODULE_VERSION}) STARTING.`);

    let sessionStateManagerRef = null;
    let polyglotHelpersRef = null;
    let uiUpdaterRef = null;

    let userTranscriptionBuffer = "";
    let userTranscriptionTimeoutId = null;
    const USER_TRANSCRIPTION_FLUSH_DELAY = 1500; // ms

    let aiSpokenTextBuffer = "";
    let aiSpokenTextTimeoutId = null;
    const AI_SPOKEN_TEXT_FLUSH_DELAY = 800; // ms

    let currentSessionTypeRef = null;

    function initialize(sessionStateManager, polyglotHelpers, uiUpdater) {
        // console.log("TextCoordinator: initialize() called.");
        if (!sessionStateManager || typeof sessionStateManager.addTurnToTranscript !== 'function') {
            console.error("TextCoordinator: Init failed - sessionStateManager invalid.");
            return false;
        }
        sessionStateManagerRef = sessionStateManager;
        polyglotHelpersRef = polyglotHelpers;
        uiUpdaterRef = uiUpdater;
        resetBuffers(); // Ensure clean state on new call/init
        console.log("TextCoordinator: Initialized successfully.");
        return true;
    }

    // This is the one that will be used due to JS hoisting/definition order
    function resetBuffers() {
        // console.log("TextCoordinator: resetBuffers() called.");
        // Clear user buffer and its timeout
        userTranscriptionBuffer = "";
        if (userTranscriptionTimeoutId) {
            clearTimeout(userTranscriptionTimeoutId);
            userTranscriptionTimeoutId = null;
        }
        // Clear AI buffer and its timeout (also called by resetAiSpokenTextBuffer)
        resetAiSpokenTextBuffer();
        
        currentSessionTypeRef = null;
        // console.log("TextCoordinator: All buffers, timeouts, and session type context reset.");
    }
    
    function setCurrentSessionTypeContext(sessionType){
        // console.log("TextCoordinator: setCurrentSessionTypeContext to:", sessionType);
        currentSessionTypeRef = sessionType;
    }

    function flushUserTranscription() {
        console.log(`TextCoordinator: flushUserTranscription called. Buffer: "${userTranscriptionBuffer.trim()}"`);
        // CRITICAL: Always clear any pending timeout for this flush when called directly
        if (userTranscriptionTimeoutId) {
            clearTimeout(userTranscriptionTimeoutId);
            userTranscriptionTimeoutId = null;
            console.log("TextCoordinator: Cleared pending userTranscriptionTimeoutId during manual flush.");
        }

        if (!sessionStateManagerRef) { 
            console.warn("TextCoordinator: flushUserTranscription - sessionStateManagerRef not set."); 
            userTranscriptionBuffer = ""; // Still clear buffer to prevent re-processing
            return; 
        }
        const textToStore = userTranscriptionBuffer.trim();
        if (textToStore !== "") {
            console.log(`TextCoordinator: FLUSHING USER transcription: "${textToStore}"`);
            sessionStateManagerRef.addTurnToTranscript('user-audio-transcript', textToStore);
        }
        userTranscriptionBuffer = ""; // Clear buffer after processing
        console.log("TextCoordinator: User transcription buffer cleared.");
    }

    function flushAiSpokenText() {
        console.log(`TextCoordinator: flushAiSpokenText called. Buffer before flush: "${aiSpokenTextBuffer.trim()}"`);
        // CRITICAL: Always clear any pending timeout for this flush when called directly
        if (aiSpokenTextTimeoutId) {
            clearTimeout(aiSpokenTextTimeoutId);
            aiSpokenTextTimeoutId = null;
            console.log("TextCoordinator: Cleared pending aiSpokenTextTimeoutId during manual flush.");
        }

        if (!sessionStateManagerRef) { 
            console.warn("TextCoordinator: flushAiSpokenText - sessionStateManagerRef not set."); 
            console.log("TextCoordinator: Cleared aiSpokenTextBuffer due to missing sessionStateManagerRef.");
            aiSpokenTextBuffer = ""; 
            return; 
        }
        
        let textToStore = aiSpokenTextBuffer.trim();
        console.log(`TextCoordinator: trim() result: "${textToStore}"`);
        if (textToStore !== "") {
            if (polyglotHelpersRef?.stripEmojis) {
                textToStore = polyglotHelpersRef.stripEmojis(textToStore);
                console.log(`TextCoordinator: Stripped emojis from text. Result: "${textToStore}"`);
            }
            console.log(`TextCoordinator: FLUSHING AI spoken text: "${textToStore}"`);
            sessionStateManagerRef.addTurnToTranscript('connector-spoken-output', textToStore);
        } else {
            console.log("TextCoordinator: No AI spoken text to flush.");
        }
        aiSpokenTextBuffer = ""; // Clear buffer after processing
        console.log("TextCoordinator: AI spoken text buffer cleared.");
    }

    function resetAiSpokenTextBuffer() { // Called on interruption
        console.log("TextCoordinator: resetAiSpokenTextBuffer() CALLED (e.g., due to interruption).");
        aiSpokenTextBuffer = "";
        console.log("TextCoordinator: Cleared AI spoken text buffer.");
        if (aiSpokenTextTimeoutId) {
            console.log("TextCoordinator: Cleared pending aiSpokenTextTimeoutId during resetAiSpokenTextBuffer.");
            clearTimeout(aiSpokenTextTimeoutId);
            aiSpokenTextTimeoutId = null;
        }
    }

    function handleReceivedAiText(text) {
        // This function might now receive non-spoken text from the AI if responseModalities included TEXT,
    // or it might not be called at all if outputTranscription is the primary source of AI speech text.
    // For now, let's assume it could still be called and buffer it.
    const functionName = "handleReceivedAiText";
    console.log(`TextCoord (${functionName}): Received (modelTurn part.text?): "${text}"`);

    if (currentSessionTypeRef === "voiceChat_modal" && uiUpdaterRef?.appendToVoiceChatLog) {
        uiUpdaterRef.appendToVoiceChatLog(text, 'connector'); // Display in UI if applicable
    }

    aiSpokenTextBuffer += text + " ";
    if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);
    aiSpokenTextTimeoutId = setTimeout(flushAiSpokenText, AI_SPOKEN_TEXT_FLUSH_DELAY);
}

    function handleReceivedUserTranscription(text, isFinal = false) {
        // console.log(`TextCoordinator: User RX: "${text}", Final: ${isFinal}`);
        if (currentSessionTypeRef === "voiceChat_modal" && uiUpdaterRef?.appendToVoiceChatLog) {
            uiUpdaterRef.appendToVoiceChatLog(text, 'user-audio', { isTranscription: true, isStreaming: !isFinal });
        }
        
        userTranscriptionBuffer += text + " "; 
        if (userTranscriptionTimeoutId) clearTimeout(userTranscriptionTimeoutId);

        if (isFinal) {
            flushUserTranscription(); // This will also clear its own timeout if any was pending
        } else {
            userTranscriptionTimeoutId = setTimeout(flushUserTranscription, USER_TRANSCRIPTION_FLUSH_DELAY);
        }
    }

   function handleReceivedModelTranscription(text, isFinal = false) {
    const functionName = "handleReceivedModelTranscription";
    console.log(`TextCoord (${functionName}): AI Spoken Output TX (from outputTranscription): "${text}", Final: ${isFinal}`);

    // Display in voice chat UI if needed (though typically outputTranscription might lag slightly behind audio)
    if (currentSessionTypeRef === "voiceChat_modal" && uiUpdaterRef?.appendToVoiceChatLog && isFinal) {
        // uiUpdaterRef.appendToVoiceChatLog(text, 'connector-stt'); // Or some distinct class
    }
    
    aiSpokenTextBuffer += text + " ";
    if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);

    // If outputTranscription gives `isFinal`, use it to flush.
    // Otherwise, rely on the timeout or the end-of-call flush.
    if (isFinal) {
        flushAiSpokenText(); // This will also clear its own timeout
    } else {
        aiSpokenTextTimeoutId = setTimeout(flushAiSpokenText, AI_SPOKEN_TEXT_FLUSH_DELAY);
    }
}
    
    function handleUserTypedText(text) {
        if (!sessionStateManagerRef) { console.warn("TextCoordinator: handleUserTypedText - sessionStateManagerRef not set."); return; }
        const trimmedText = text?.trim();
        if (trimmedText) {
            // console.log(`TextCoordinator: Handling user typed text: "${trimmedText}"`);
            sessionStateManagerRef.addTurnToTranscript('user-typed', trimmedText);
        }
    }

    console.log(`live_api_text_coordinator.js (v${MODULE_VERSION}): IIFE FINISHED.`);
    return {
        initialize,
        resetBuffers,
        setCurrentSessionTypeContext,
        handleReceivedAiText,
        handleReceivedUserTranscription,
        handleReceivedModelTranscription,
        handleUserTypedText,
        flushUserTranscription, // Explicitly callable
        flushAiSpokenText,     // Explicitly callable
        resetAiSpokenTextBuffer
    };
})();

if (window.liveApiTextCoordinator?.initialize) {
    console.log("live_api_text_coordinator.js (Robust Flushing): SUCCESSFULLY assigned.");
} else {
    console.error("live_api_text_coordinator.js (Robust Flushing): CRITICAL ERROR - not correctly formed.");
}
console.log("live_api_text_coordinator.js: Script execution FINISHED (Robust Flushing).");