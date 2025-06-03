// js/core/voice_memo_handler.js
// Handles "Tap-to-Speak" voice memo functionality for chat interfaces.

window.voiceMemoHandler = (() => {
    'use strict';

    const getDeps = () => ({
        domElements: window.domElements,
        uiUpdater: window.uiUpdater,
        aiService: window.aiService,
        conversationManager: window.conversationManager,
        polyglotHelpers: window.polyglotHelpers,
        chatOrchestrator: window.chatOrchestrator,
        aiApiConstants: window._aiApiConstants
    });

    let mediaRecorder = null;
    let audioChunks = [];
    let currentRecordingInterfaceType = null;
    let currentRecordingButtonElement = null;
    let isRecording = false;
    let userMicStreamForMemo = null;
    let isProcessingVoiceMemo = false;
    let currentMemoPlaceholderElement = null;
    let currentTargetIdForMemo = null;

    function initializeVoiceMemoControls() {
        console.log("VoiceMemoHandler: Controls are typically initialized by chatUiManager attaching to handleNewVoiceMemoInteraction.");
    }

    async function handleNewVoiceMemoInteraction(interfaceType, buttonElement, currentChatTargetId) {
        console.log(`VoiceMemoHandler: handleNewVoiceMemoInteraction for ${interfaceType}. Currently recording: ${isRecording}. Target ID: ${currentChatTargetId}`);
        if (!currentChatTargetId) {
            console.error("VoiceMemoHandler: No currentChatTargetId provided for voice memo interaction.");
            alert("Please open a chat to send a voice memo.");
            return;
        }
        if (isRecording) {
            await stopRecording(buttonElement);
        } else {
            currentRecordingInterfaceType = interfaceType;
            currentRecordingButtonElement = buttonElement;
            currentTargetIdForMemo = currentChatTargetId; // Store the target ID
            await startRecording(buttonElement); // No need to pass targetId here, it's stored
        }
    }

    async function startRecording(buttonElement) {
        if (isRecording) {
            console.warn("VoiceMemoHandler: startRecording called while already recording.");
            return;
        }
        if (!currentTargetIdForMemo) {
            console.error("VoiceMemoHandler: startRecording - currentTargetIdForMemo is not set.");
            return;
        }
        console.log("VoiceMemoHandler: Attempting to start voice memo recording for target:", currentTargetIdForMemo);


        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("VoiceMemoHandler: getUserMedia not supported!");
            alert("Your browser doesn't support audio recording.");
            if (buttonElement) { /* Reset button UI if needed */ }
            return;
        }

        try {
            userMicStreamForMemo = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.log("VoiceMemoHandler: Microphone stream obtained for memo.");
            isRecording = true;
            audioChunks = [];

            if (buttonElement) {
                buttonElement.classList.add('recording'); // Add 'recording' class
                buttonElement.innerHTML = '<i class="fas fa-stop"></i>';
                buttonElement.title = "Stop Recording";
            }

            const mimeTypesToTry = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac', 'audio/wav'];
            const supportedMimeType = mimeTypesToTry.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm'; // Default to webm
            console.log("VoiceMemoHandler: Using MIME type for MediaRecorder:", supportedMimeType);

            mediaRecorder = new MediaRecorder(userMicStreamForMemo, { mimeType: supportedMimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                console.log("VoiceMemoHandler: MediaRecorder onstop event.");
                const wasRecording = isRecording;
                isRecording = false;
                
                if (userMicStreamForMemo) {
                    userMicStreamForMemo.getTracks().forEach(track => track.stop());
                    userMicStreamForMemo = null;
                }
                
                if (currentRecordingButtonElement) {
                    currentRecordingButtonElement.classList.remove('recording');
                    currentRecordingButtonElement.innerHTML = '<i class="fas fa-microphone"></i>';
                    currentRecordingButtonElement.title = "Send Voice Message";
                }

                if (!wasRecording || audioChunks.length === 0) {
                    console.warn("VoiceMemoHandler: No audio data recorded or recording was already stopped.");
                    audioChunks = [];
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                audioChunks = [];

                const { uiUpdater, conversationManager } = getDeps();
                const placeholderText = "[Processing your voice message...]";
                let localTargetId = currentTargetIdForMemo;

                const convoRecord = conversationManager.getConversation(localTargetId);
                const connectorForMemo = convoRecord?.connector;

                if (!connectorForMemo) {
                    console.error("VoiceMemoHandler: onstop - Connector not found for stored target ID:", localTargetId);
                    isProcessingVoiceMemo = false;
                    return;
                }

                if (currentRecordingInterfaceType === 'embedded') {
                    currentMemoPlaceholderElement = uiUpdater.appendToEmbeddedChatLog(placeholderText, 'user-thinking');
                } else if (currentRecordingInterfaceType === 'modal') {
                    currentMemoPlaceholderElement = uiUpdater.appendToMessageLogModal(placeholderText, 'user-thinking');
                }

                // Pass audioBlob directly to processAndSend
                await processAndSend(audioBlob, connectorForMemo, currentRecordingInterfaceType, localTargetId);
            };
            mediaRecorder.onerror = (err) => {
                console.error("VoiceMemoHandler: MediaRecorder error:", err.name, err.message);
                isRecording = false; // Ensure recording state is reset
                if (userMicStreamForMemo) userMicStreamForMemo.getTracks().forEach(track => track.stop());
                if (currentRecordingButtonElement) { /* Reset button UI */ }
                alert(`Audio recording error: ${err.name}`);
                isProcessingVoiceMemo = false; // Reset processing flag
            };

            mediaRecorder.start();
            console.log("VoiceMemoHandler: MediaRecorder started for target:", currentTargetIdForMemo);
        } catch (err) {
            console.error("VoiceMemoHandler: Error starting recording:", err);
            isRecording = false; // Ensure recording state is reset
            if (userMicStreamForMemo) userMicStreamForMemo.getTracks().forEach(track => track.stop());
            if (buttonElement) { /* Reset button UI */ }
            alert("Could not start audio recording. Please check microphone permissions.");
            isProcessingVoiceMemo = false; // Reset processing flag
        }
    }

    async function stopRecording(buttonElement) {
        console.log("VoiceMemoHandler: stopRecording called. MediaRecorder state:", mediaRecorder?.state);
        if (mediaRecorder && isRecording && mediaRecorder.state === "recording") {
            mediaRecorder.stop(); // This will trigger the 'onstop' handler where processing happens
        } else {
            console.warn("VoiceMemoHandler: stopRecording called but not actively recording or mediaRecorder issue.");
            isRecording = false; // Ensure state is correct
            if (userMicStreamForMemo) { userMicStreamForMemo.getTracks().forEach(track => track.stop()); userMicStreamForMemo = null; }
            if (buttonElement) { // Reset UI if stop is called unexpectedly
                buttonElement.classList.remove('recording');
                buttonElement.innerHTML = '<i class="fas fa-microphone"></i>';
                buttonElement.title = "Send Voice Message";
            }
        }
    }

    async function processAndSend(audioBlob, connector, interfaceType, targetId) {
        if (isProcessingVoiceMemo) {
            console.warn("VoiceMemoHandler: processAndSend already in progress for target:", targetId);
            return;
        }
        isProcessingVoiceMemo = true;
        console.log("VoiceMemoHandler: processAndSend START for connector:", connector.id, "TargetID:", targetId);

        try {
            const { aiService, conversationManager, chatOrchestrator, uiUpdater, aiApiConstants } = getDeps();
            const languageHint = connector.languageCode || 'en-US';
            
            console.log("VoiceMemoHandler: Calling aiService.transcribeAudioToText. Lang hint:", languageHint);
            const transcribedText = await aiService.transcribeAudioToText(
                audioBlob,
                languageHint,
                aiApiConstants.PROVIDERS.GROQ
            );

            if (currentMemoPlaceholderElement?.remove) {
                currentMemoPlaceholderElement.remove();
                currentMemoPlaceholderElement = null;
            }

            if (!transcribedText || transcribedText.trim() === "") {
                console.warn("VoiceMemoHandler: Transcription was empty for target:", targetId);
                uiUpdater.appendSystemMessage(
                    interfaceType === 'embedded' ? getDeps().domElements.embeddedChatLog : getDeps().domElements.messageChatLog,
                    "Could not understand audio. Please try again."
                );
                isProcessingVoiceMemo = false;
                return;
            }
            console.log("VoiceMemoHandler: Transcription successful for target:", targetId, "Text:", transcribedText.substring(0, 50) + "...");

            const messageType = sender => sender.startsWith('user') ? 'user-audio' : 'connector';
            if (interfaceType === 'embedded') {
                uiUpdater.appendToEmbeddedChatLog(transcribedText, messageType('user-voice-transcript'));
            } else if (interfaceType === 'modal') {
                uiUpdater.appendToMessageLogModal(transcribedText, messageType('user-voice-transcript'));
            }
            conversationManager.addMessageToConversation(targetId, 'user-voice-transcript', transcribedText, 'text');

            const { conversation: convo } = conversationManager.ensureConversationRecord(targetId);
            if (!convo) {
                console.error("VoiceMemoHandler: Conversation record disappeared for target:", targetId);
                isProcessingVoiceMemo = false;
                return;
            }

            let thinkingMsgAI;
            if (interfaceType === 'embedded') {
                thinkingMsgAI = uiUpdater.appendToEmbeddedChatLog(`${connector.profileName.split(' ')[0]} is typing...`, 'connector-thinking');
            } else {
                thinkingMsgAI = uiUpdater.appendToMessageLogModal(`${connector.profileName.split(' ')[0]} is typing...`, 'connector-thinking');
            }

            const aiResponse = await aiService.generateTextMessage(
                transcribedText,
                connector,
                convo.geminiHistory,
                aiApiConstants.PROVIDERS.GROQ
            );

            if (thinkingMsgAI?.remove) thinkingMsgAI.remove();

            if (interfaceType === 'embedded') {
                uiUpdater.appendToEmbeddedChatLog(aiResponse, 'connector');
            } else if (interfaceType === 'modal') {
                uiUpdater.appendToMessageLogModal(aiResponse, 'connector');
            }
            conversationManager.addModelResponseMessage(targetId, aiResponse, convo.geminiHistory);

            if (chatOrchestrator) chatOrchestrator.notifyNewActivityInConversation(targetId);
            console.log("VoiceMemoHandler: Voice memo processed and AI response handled for target:", targetId);

        } catch (error) {
            console.error("VoiceMemoHandler: Error in processAndSend for target:", targetId, error);
            if (currentMemoPlaceholderElement?.remove) currentMemoPlaceholderElement.remove();
            const { uiUpdater, domElements } = getDeps();
            uiUpdater.appendSystemMessage(
                interfaceType === 'embedded' ? domElements.embeddedChatLog : domElements.messageChatLog,
                `Error processing voice: ${error.message.substring(0, 70)}...`,
                true
            );
        } finally {
            isProcessingVoiceMemo = false;
            currentTargetIdForMemo = null;
            currentRecordingInterfaceType = null;
            currentRecordingButtonElement = null;
        }
    }

    console.log("js/core/voice_memo_handler.js loaded and updated for aiService.");
    return {
        // initializeVoiceMemoControls, // Not strictly needed if chatUiManager calls handleNewVoiceMemoInteraction
        handleNewVoiceMemoInteraction
    };
})();