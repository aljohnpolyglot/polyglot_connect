// js/core/voice_memo_handler.js
// Handles voice memo recording, sending to STT, and AI response.

console.log("voice_memo_handler.js: Script execution STARTED.");
if (window.voiceMemoHandler) {
    console.warn("voice_memo_handler.js: window.voiceMemoHandler ALREADY DEFINED. This is unexpected.");
}

window.voiceMemoHandler = (() => {
    'use strict';
    console.log("voice_memo_handler.js: IIFE (module definition) STARTING.");

    let mediaRecorder = null;
    let audioChunks = [];
    let currentRecordingTargetId = null;
    let currentRecordingUIContext = null; // 'embedded' or 'modal'
    let currentMicButtonElement = null;
    let isCurrentlyRecording = false;

    const getDeps = () => {
        console.log("voice_memo_handler.js: getDeps() called.");
        const deps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater,
            aiService: window.aiService,
            conversationManager: window.conversationManager,
            chatOrchestrator: window.chatOrchestrator,
            polyglotHelpers: window.polyglotHelpers
        };
        // Log critical dependencies
        console.log("voice_memo_handler.js: getDeps() - uiUpdater:", !!deps.uiUpdater);
        console.log("voice_memo_handler.js: getDeps() - aiService:", !!deps.aiService);
        console.log("voice_memo_handler.js: getDeps() - conversationManager:", !!deps.conversationManager);
        console.log("voice_memo_handler.js: getDeps() - chatOrchestrator:", !!deps.chatOrchestrator);
        return deps;
    };

    function updateMicButtonVisuals(state, text = '') {
        console.log("VoiceMemoHandler: updateMicButtonVisuals - State:", state, "Button Element:", !!currentMicButtonElement, "Text:", text);
        if (!currentMicButtonElement) {
            console.warn("VoiceMemoHandler: Cannot update mic button visuals, currentMicButtonElement is null.");
            return;
        }
        const { polyglotHelpers } = getDeps(); // Get helpers for sanitization

        currentMicButtonElement.classList.remove('listening', 'processing');
        currentMicButtonElement.disabled = false;
        let buttonContent = '';

        switch (state) {
            case 'listening':
                currentMicButtonElement.classList.add('listening');
                buttonContent = `<i class="fas fa-stop"></i> ${polyglotHelpers?.sanitizeTextForDisplay(text) || 'Stop'}`;
                currentMicButtonElement.title = "Tap to Stop Recording";
                break;
            case 'processing':
                currentMicButtonElement.classList.add('processing');
                buttonContent = `<i class="fas fa-spinner fa-spin"></i> ${polyglotHelpers?.sanitizeTextForDisplay(text) || 'Processing...'}`;
                currentMicButtonElement.disabled = true;
                currentMicButtonElement.title = "Processing Audio";
                break;
            case 'error': // Added error state
                buttonContent = '<i class="fas fa-exclamation-triangle"></i> Error';
                currentMicButtonElement.title = "Error with recording";
                break;
            default: // idle
                buttonContent = '<i class="fas fa-microphone"></i>';
                currentMicButtonElement.title = "Send Voice Message";
                break;
        }
        currentMicButtonElement.innerHTML = buttonContent;
        console.log("VoiceMemoHandler: Mic button updated to state:", state);
    }

    async function startRecording(targetId, uiContext, micButtonElement) {
        console.log("VoiceMemoHandler: startRecording - START. TargetID:", targetId, "UIContext:", uiContext);
        if (isCurrentlyRecording) {
            console.warn("VoiceMemoHandler: startRecording - Already recording. Ignoring request.");
            return;
        }

        currentRecordingTargetId = targetId;
        currentRecordingUIContext = uiContext;
        currentMicButtonElement = micButtonElement;
        audioChunks = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("VoiceMemoHandler: Microphone stream obtained for memo.");
            
            const options = { mimeType: 'audio/webm;codecs=opus' }; // Prefer Opus for quality and compatibility
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`VoiceMemoHandler: MIME type ${options.mimeType} not supported. Trying default.`);
                delete options.mimeType; // Fallback to browser default
            }
            console.log("VoiceMemoHandler: Using MIME type for MediaRecorder:", options.mimeType || "browser default");

            mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                    // console.log("VoiceMemoHandler: Audio chunk received, size:", event.data.size);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log("VoiceMemoHandler: MediaRecorder onstop event.");
                isCurrentlyRecording = false;
                updateMicButtonVisuals('processing', 'Processing...');

                if (audioChunks.length === 0) {
                    console.warn("VoiceMemoHandler: No audio data recorded.");
                    updateMicButtonVisuals('idle'); // Reset button
                    stream.getTracks().forEach(track => track.stop()); // Stop stream tracks
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                audioChunks = []; // Clear for next recording
                console.log("VoiceMemoHandler: Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);
                stream.getTracks().forEach(track => track.stop()); // Stop stream tracks after blob creation

                // Get dependencies needed for processing
                const { uiUpdater, aiService, conversationManager, chatOrchestrator, polyglotHelpers } = getDeps();
                if (!uiUpdater || !aiService || !conversationManager || !chatOrchestrator || !polyglotHelpers) {
                    console.error("VoiceMemoHandler: onstop - Missing critical dependencies for processing. Aborting.");
                    updateMicButtonVisuals('error');
                    return;
                }

                const appendToLog = uiContext === 'embedded' ? uiUpdater.appendToEmbeddedChatLog : uiUpdater.appendToMessageLogModal;
                
                try {
                    console.log("VoiceMemoHandler: Transcribing audio...");
                    const transcript = await aiService.transcribeAudioToText(audioBlob);
                    console.log("VoiceMemoHandler: Transcription received:", transcript);

                    if (!transcript || transcript.trim() === "") {
                        console.warn("VoiceMemoHandler: Empty transcript received.");
                        appendToLog("No speech detected in voice message.", 'system-message', { isError: true });
                        updateMicButtonVisuals('idle');
                        return;
                    }

                    appendToLog(`You (voice): ${transcript}`, 'user-audio', { timestamp: Date.now() });
                    // For 1-on-1 chats, add user's transcribed voice message to conversation history
                    // The role for Gemini history needs to be 'user'
                    conversationManager.addMessageToConversation(currentRecordingTargetId, 'user-voice-transcript', transcript, 'text');
                    console.log("VoiceMemoHandler: User voice transcript added to UI and conversation history.");


                    // Prepare for AI response
                    const { conversation: convo } = conversationManager.ensureConversationRecord(currentRecordingTargetId);
                    if (!convo || !convo.connector) {
                        console.error(`VoiceMemoHandler: Invalid conversation or connector for target ID: ${currentRecordingTargetId}`);
                        appendToLog("Error: Could not process AI response.", 'system-message', { isError: true });
                        updateMicButtonVisuals('idle');
                        return;
                    }
                    
                    const thinkingMsgOptions = { 
                        senderName: convo.connector.profileName.split(' ')[0],
                        avatarUrl: convo.connector.avatarModern,
                        isThinking: true 
                    };
                    const thinkingMsg = appendToLog("", 'connector-thinking', thinkingMsgOptions);
                    console.log("VoiceMemoHandler: AI thinking indicator shown for voice response.");

                    const aiResponseText = await aiService.generateTextMessage(
                        transcript, // User's transcribed message
                        convo.connector,
                        convo.geminiHistory // Pass the updated history
                    );
                    console.log("VoiceMemoHandler: AI response to voice memo received:", typeof aiResponseText === 'string' ? aiResponseText.substring(0,50) + "..." : "[Non-string response]");

                    if (thinkingMsg?.remove) thinkingMsg.remove();
                    appendToLog(aiResponseText, 'connector', { avatarUrl: convo.connector.avatarModern, senderName: convo.connector.profileName, timestamp: Date.now() });
                    conversationManager.addModelResponseMessage(currentRecordingTargetId, aiResponseText);
                    console.log("VoiceMemoHandler: AI response to voice memo added to UI and history.");

                    if (chatOrchestrator.notifyNewActivityInConversation) {
                        chatOrchestrator.notifyNewActivityInConversation(currentRecordingTargetId);
                    }

                } catch (error) {
                    console.error("VoiceMemoHandler: Error during transcription or AI response:", error);
                    appendToLog(`Error processing voice: ${polyglotHelpers.sanitizeTextForDisplay(error.message || "Unknown error")}`, 'system-message', { isError: true });
                } finally {
                    updateMicButtonVisuals('idle');
                    console.log("VoiceMemoHandler: onstop processing finished, mic button reset to idle.");
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error("VoiceMemoHandler: MediaRecorder onerror event:", event.error);
                isCurrentlyRecording = false;
                updateMicButtonVisuals('error'); // Show error on button
                stream.getTracks().forEach(track => track.stop()); // Stop stream tracks
                const { uiUpdater } = getDeps();
                 const appendToLog = uiContext === 'embedded' ? uiUpdater?.appendToEmbeddedChatLog : uiUpdater?.appendToMessageLogModal;
                 appendToLog?.(`Recording error: ${event.error.name || "Unknown recording error"}`, 'system-message', { isError: true });

            };

            mediaRecorder.start();
            isCurrentlyRecording = true;
            updateMicButtonVisuals('listening', 'Stop');
            console.log("VoiceMemoHandler: MediaRecorder started for target:", targetId);

        } catch (err) {
            console.error("VoiceMemoHandler: Error accessing microphone or starting MediaRecorder:", err);
            isCurrentlyRecording = false; // Ensure flag is reset
            updateMicButtonVisuals('error'); // Show error on button
            const { uiUpdater, polyglotHelpers } = getDeps();
            const appendToLog = uiContext === 'embedded' ? uiUpdater?.appendToEmbeddedChatLog : uiUpdater?.appendToMessageLogModal;
            let userMessage = "Could not start voice recording. Please ensure microphone access is granted and try again.";
            if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                userMessage = "No microphone found. Please connect a microphone and try again.";
            } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                userMessage = "Microphone access was denied. Please enable it in your browser settings and try again.";
            }
            appendToLog?.(userMessage, 'system-message', {isError: true});
        }
        console.log("VoiceMemoHandler: startRecording - FINISHED.");
    }

    function stopRecording() {
        console.log("VoiceMemoHandler: stopRecording called.");
        if (mediaRecorder && isCurrentlyRecording) { // Check isCurrentlyRecording as well
            console.log("VoiceMemoHandler: Stopping MediaRecorder. Current state:", mediaRecorder.state);
            if (mediaRecorder.state !== "inactive") { // Only stop if not already inactive
                mediaRecorder.stop(); // This will trigger the 'onstop' event
            } else {
                console.warn("VoiceMemoHandler: stopRecording called, but MediaRecorder was already inactive.");
                isCurrentlyRecording = false; // Ensure flag is consistent
                updateMicButtonVisuals('idle'); // Reset UI if somehow stuck
            }
        } else {
            console.warn("VoiceMemoHandler: stopRecording called but no active MediaRecorder or not currently recording.");
            isCurrentlyRecording = false; // Ensure flag is consistent
            updateMicButtonVisuals('idle'); // Reset UI if somehow stuck
        }
    }

    function handleNewVoiceMemoInteraction(uiContext, micButtonElement, targetId) {
        console.log("VoiceMemoHandler: handleNewVoiceMemoInteraction for", uiContext, ". Currently recording:", isCurrentlyRecording, ". Target ID:", targetId);
        if (!targetId) {
            console.error("VoiceMemoHandler: Target ID is missing for voice memo interaction.");
            alert("Cannot start voice message: chat target is not identified.");
            return;
        }
        if (isCurrentlyRecording) {
            stopRecording();
        } else {
            startRecording(targetId, uiContext, micButtonElement);
        }
    }
    
    console.log("voice_memo_handler.js: Initial dependency check for load message.");
    const initialVoiceDeps = getDeps(); // Call to log initial state of dependencies
    if (initialVoiceDeps.uiUpdater && initialVoiceDeps.aiService && initialVoiceDeps.conversationManager && initialVoiceDeps.chatOrchestrator) {
        console.log("voice_memo_handler.js: Loaded successfully and initial core dependencies (uiUpdater, aiService, conversationManager, chatOrchestrator) appear present.");
    } else {
        console.error("voice_memo_handler.js: Loaded, but one or more CRITICAL core dependencies were missing during initial check. Voice memo functionality will be severely impaired.");
    }

    console.log("voice_memo_handler.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        handleNewVoiceMemoInteraction
        // No need to expose start/stop directly if handleNew is the only entry point
    };
})();

if (window.voiceMemoHandler && typeof window.voiceMemoHandler.handleNewVoiceMemoInteraction === 'function') {
    console.log("voice_memo_handler.js: SUCCESSFULLY assigned to window.voiceMemoHandler and core method is present.");
} else {
    console.error("voice_memo_handler.js: CRITICAL ERROR - window.voiceMemoHandler IS UNDEFINED or core method missing after IIFE execution.");
}
console.log("voice_memo_handler.js: Script execution FINISHED.");