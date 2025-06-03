// js/sessions/live_call_handler.js
// Handles the logic for a Live API-based voice/video call using @google/genai SDK.

window.liveCallHandler = (() => {
    'use strict';

    const getDeps = () => ({
        domElements: window.domElements,
        uiUpdater: window.uiUpdater,
        polyglotHelpers: window.polyglotHelpers,
        geminiLiveApiService: window.geminiLiveApiService,
        sessionStateManager: window.sessionStateManager,
        modalHandler: window.modalHandler,
        polyglotSharedContent: window.polyglotSharedContent,
        polyglotMinigamesData: window.polyglotMinigamesData,
        conversationManager: window.conversationManager // Ensure conversationManager is included
    });

    let currentConnector = null;
    let currentSessionType = null;
    // No longer storing the SDK session object directly here;
    // all interactions will go through geminiLiveApiService.
    // We rely on sessionStateManager.isSessionActive() to know if a call is ongoing.

    // Web Audio API state
    let audioContext = null;
    let userMicrophoneStream = null;
    let microphoneSourceNode = null;
    let scriptProcessorNode = null;
    const TARGET_INPUT_SAMPLE_RATE = 16000;
    const AI_OUTPUT_SAMPLE_RATE = 24000;

    let aiAudioPlaybackQueue = [];
    let isPlayingAiAudio = false;
    let nextAiAudioPlayTime = 0;
    let audioPlayerContext = null;

    let isMicEffectivelyMuted = true; // UI state and controls sending audio
    let isAiSpeakerMuted = false;   // UI state and controls AI audio playback

    // --- NEW: Buffers and Timers for Consolidating Transcriptions ---
    let userTranscriptionBuffer = "";
    let userTranscriptionTimeoutId = null;
    const USER_TRANSCRIPTION_FLUSH_DELAY = 1500; // ms of silence before flushing user's speech

    let aiSpokenTextBuffer = ""; // For AI's own speech if it also comes in chunks
    let aiSpokenTextTimeoutId = null;
    const AI_SPOKEN_TEXT_FLUSH_DELAY = 800; // Shorter delay for AI as it might speak faster

    // Helper to flush buffered transcriptions
    function flushUserTranscription() {
        const { sessionStateManager } = getDeps();
        if (userTranscriptionBuffer.trim() !== "") {
            console.log("liveCallHandler: Flushing USER transcription buffer:", userTranscriptionBuffer);
            sessionStateManager.addTurnToTranscript('user-audio-transcript', userTranscriptionBuffer.trim());
            userTranscriptionBuffer = "";
        }
        if (userTranscriptionTimeoutId) clearTimeout(userTranscriptionTimeoutId);
        userTranscriptionTimeoutId = null;
    }

    function flushAiSpokenText() {
        const { sessionStateManager, polyglotHelpers } = getDeps(); // Add polyglotHelpers
        if (aiSpokenTextBuffer.trim() !== "") {
            let textToStore = aiSpokenTextBuffer.trim();
            if (polyglotHelpers?.stripEmojis) { // Check if helper is available
                textToStore = polyglotHelpers.stripEmojis(textToStore);
                console.log("liveCallHandler: AI Spoken text buffer, EMOJIS STRIPPED for transcript:", textToStore);
            } else {
                console.log("liveCallHandler: Flushing AI SPOKEN text buffer (no emoji stripping helper):", textToStore);
            }
            sessionStateManager.addTurnToTranscript('connector-spoken-output', textToStore); // Use a consistent key
            aiSpokenTextBuffer = "";
        }
        if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);
        aiSpokenTextTimeoutId = null;
    }

    // --- Helper Function to Build System Instruction for Live API ---
    function buildLiveApiSystemInstruction(connector) {
        if (!connector) return { parts: [{ text: "You are a helpful assistant." }] };

        let personaDetails = `You are ${connector.profileName}, a ${connector.modernTitle} living in ${connector.city}, ${connector.country}. Your primary language for this call is ${connector.language}.`;
        if (connector.interests && connector.interests.length > 0) {
            personaDetails += ` You enjoy activities like ${connector.interests.slice(0, 2).join(' and ')}.`;
        }
        // Consider adding a snippet from dailyRoutineNotes if available and concise.

        let languageInstructions = ` Your main goal is to engage the user in natural, human-like conversation in ${connector.language}. Primarily respond in ${connector.language}.`;
        const englishPractice = connector.practiceLanguages?.find(lang => lang.lang === "English");
        if (englishPractice && (englishPractice.levelTag === "fluent" || englishPractice.levelTag === "learning")) {
            languageInstructions += ` You are also ${englishPractice.levelTag} in English. If the user speaks English, you can respond in English if it feels natural for that turn in the call, but generally try to guide the conversation back to ${connector.language} for their practice.`;
        }

        const fullInstruction = `${personaDetails}${languageInstructions} Keep your responses conversational and appropriate for a voice call. ABSOLUTELY DO NOT mention that you are an AI, a language model, or a computer program. If asked directly about your nature, subtly deflect the question or answer as a human from ${connector.city} would, then steer the conversation back to language practice. Maintain your persona throughout the call.`;
        return { parts: [{ text: fullInstruction }] }; // SDK expects Content object structure for systemInstruction
    }

    // --- UI Initialization for the specific call type ---
    function initializeCallUI(connector, sessionType) {
        const { uiUpdater, domElements, modalHandler } = getDeps();
        console.log("liveCallHandler: initializeCallUI for type:", sessionType);
        let modalToOpen;

        if (!domElements || !uiUpdater || !modalHandler) {
            console.error("liveCallHandler: initializeCallUI - Missing essential UI dependencies.");
            return;
        }

        if (sessionType === "direct_modal") {
            modalToOpen = domElements.directCallInterface;
            if (!modalToOpen) { console.error("liveCallHandler: domElements.directCallInterface missing!"); return; }
            uiUpdater.updateDirectCallHeader(connector);
            uiUpdater.clearDirectCallActivityArea();
            uiUpdater.updateDirectCallStatus("Live Call Connected", false);
            isMicEffectivelyMuted = false; // For Live API, mic is "open" for sending by default once session starts
            uiUpdater.updateDirectCallMicButtonVisual(isMicEffectivelyMuted);
            isAiSpeakerMuted = false;
            uiUpdater.updateDirectCallSpeakerButtonVisual(isAiSpeakerMuted);
        } else if (sessionType === "voiceChat_modal") {
            modalToOpen = domElements.voiceEnabledChatInterface;
            if (!modalToOpen) { console.error("liveCallHandler: domElements.voiceEnabledChatInterface missing!"); return; }
            uiUpdater.updateVoiceChatHeader(connector);
            uiUpdater.clearVoiceChatLog();
            uiUpdater.resetVoiceChatInput();
            isAiSpeakerMuted = false;
            if (domElements.toggleVoiceChatTTSBtn) uiUpdater.updateTTSToggleButtonVisual(domElements.toggleVoiceChatTTSBtn, isAiSpeakerMuted);
            if (domElements.voiceChatTextInput) domElements.voiceChatTextInput.focus();
        }

        if (modalToOpen) {
            modalHandler.open(modalToOpen);
            console.log("liveCallHandler: Opened modal for", sessionType);
        } else {
            console.error("liveCallHandler: initializeCallUI - modalToOpen was not determined for sessionType:", sessionType);
        }
    }

    // --- Public API ---
    async function startLiveCall(connector, sessionType) {
        console.log(`liveCallHandler: startLiveCall - Connector: ${connector?.id}, Type: ${sessionType}`);
        const { geminiLiveApiService, sessionStateManager, uiUpdater, domElements, modalHandler, conversationManager } = getDeps();

        if (!connector || !sessionType || !geminiLiveApiService || !sessionStateManager || !uiUpdater || !modalHandler || !domElements || !conversationManager) {
            console.error("liveCallHandler: Missing critical dependencies for starting live call.", {
                connectorId: connector?.id, sessionType, hasLiveService: !!geminiLiveApiService,
                hasStateMgr: !!sessionStateManager, hasUiUpdater: !!uiUpdater, hasModalHandler: !!modalHandler, hasDomElements: !!domElements
            });
            alert("Live call cannot start: missing core components (LCH01).");
            return false;
        }

        currentConnector = connector;
        currentSessionType = sessionType;
        // Set initial mute states for UI. Actual audio sending controlled by connection state and this flag.
        isMicEffectivelyMuted = (sessionType === "direct_modal"); // Direct Call UI button starts as "muted" visually
        isAiSpeakerMuted = false;
        aiAudioPlaybackQueue = [];
        isPlayingAiAudio = false;
        nextAiAudioPlayTime = 0;

        if (!sessionStateManager.initializeBaseSession(connector, sessionType)) {
            console.error("liveCallHandler: Failed to initialize base session state (e.g., virtual calling screen).");
            return false;
        }

        const { conversation: convoForSystemPrompt } = conversationManager.ensureConversationRecord(connector.id, connector);
        if (!convoForSystemPrompt || !convoForSystemPrompt.geminiHistory || convoForSystemPrompt.geminiHistory.length < 1 || !convoForSystemPrompt.geminiHistory[0].parts?.[0]?.text) {
            console.error("liveCallHandler: Could not retrieve a valid system prompt from conversationManager for connector:", connector.id);
            uiUpdater?.updateDirectCallStatus("Live Call Setup Failed (Prompt Error)", true);
            if (domElements?.virtualCallingScreen && modalHandler) modalHandler.close(domElements.virtualCallingScreen);
            sessionStateManager.resetBaseSessionState();
            return false;
        }
        const systemInstructionText = convoForSystemPrompt.geminiHistory[0].parts[0].text;
        const systemInstructionObject = { parts: [{ text: systemInstructionText }] };
        console.log("liveCallHandler: Rich system instruction for Live API retrieved from conversationManager.");

        const liveApiModelName = connector.liveApiModelName || "gemini-2.0-flash-live-001";
        console.log("liveCallHandler: Using Live API Model:", liveApiModelName);

        const liveApiSessionSetupConfig = {
            systemInstruction: systemInstructionObject,
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: connector.liveApiVoiceName || "Puck"
                    }
                },
                languageCode: connector.languageCode
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {}
        };
        console.log("liveCallHandler: Full Live API Session Setup Config:", JSON.stringify(liveApiSessionSetupConfig));

        const liveApiCallbacks = {
            onOpen: handleLiveApiSessionOpen,
            onAiAudioChunk: handleReceivedAiAudioChunk,
            onAiText: handleReceivedAiText,
            onUserTranscription: handleReceivedUserTranscription,
            onModelTranscription: handleReceivedModelTranscription,
            onError: handleLiveApiError,
            onClose: handleLiveApiClose
        };

        try {
            console.log("liveCallHandler: Attempting Live API connection via geminiLiveApiService.connect with model:", liveApiModelName);
            const connectResult = await geminiLiveApiService.connect(liveApiModelName, liveApiSessionSetupConfig, liveApiCallbacks);

            if (connectResult) {
                console.log("liveCallHandler: Live API connection process initiated by service. Waiting for SDK onOpen callback...");
                return true;
            } else {
                throw new Error(`Live API connection attempt did not return a truthy result (e.g., session object).`);
            }
        } catch (error) {
            console.error("liveCallHandler: Error during geminiLiveApiService.connect call in startLiveCall:", error);
            uiUpdater?.updateDirectCallStatus("Live Call Connection Failed", true);
            if (domElements?.virtualCallingScreen && modalHandler) modalHandler.close(domElements.virtualCallingScreen);
            sessionStateManager.resetBaseSessionState();
            return false;
        }
    }

    function endLiveCall(generateRecap = true) {
        console.log("liveCallHandler: endLiveCall called. generateRecap:", generateRecap);
        const { geminiLiveApiService, sessionStateManager, modalHandler, domElements } = getDeps(); // Added modalHandler & domElements

        geminiLiveApiService?.closeConnection(); // This will trigger its onclose, then our handleLiveApiClose

        stopUserMicrophoneCapture();

        aiAudioPlaybackQueue = [];
        isPlayingAiAudio = false;
        nextAiAudioPlayTime = 0;
        if (audioPlayerContext && audioPlayerContext.state !== 'closed') {
            audioPlayerContext.close().catch(e => console.warn("Error closing audioPlayerContext on endLiveCall", e));
            audioPlayerContext = null;
        }
        
        // Close the specific call modal UI
        if (currentSessionType === "direct_modal" && domElements?.directCallInterface) {
            modalHandler.close(domElements.directCallInterface);
        } else if (currentSessionType === "voiceChat_modal" && domElements?.voiceEnabledChatInterface) {
            modalHandler.close(domElements.voiceEnabledChatInterface);
        }

        sessionStateManager.finalizeBaseSession(generateRecap); // Handles recap & resets base state
        currentConnector = null; // Clear local references
        currentSessionType = null;
    }

    function sendTypedTextDuringLiveCall(text) {
        console.log("liveCallHandler: sendTypedTextDuringLiveCall - Text:", text);
        const { geminiLiveApiService, uiUpdater, sessionStateManager } = getDeps();

        if (!text || !geminiLiveApiService?.sendClientText) {
            console.warn("liveCallHandler: Cannot send typed text - no text or Live API service/method missing.");
            return;
        }
        if (!sessionStateManager.isSessionActive()) { // Check if a session is supposed to be active
            console.warn("liveCallHandler: Cannot send typed text - no active session according to state manager.");
            return;
        }


        if (currentSessionType === "voiceChat_modal") {
            uiUpdater.appendToVoiceChatLog(text, 'user');
        }
        sessionStateManager.addTurnToTranscript('user-typed', text);
        geminiLiveApiService.sendClientText(text);
    }

    function toggleMicMuteForLiveCall() {
        const { uiUpdater, geminiLiveApiService } = getDeps();
        isMicEffectivelyMuted = !isMicEffectivelyMuted;
        console.log("liveCallHandler: Mic effectively toggled. Now muted:", isMicEffectivelyMuted);

        if (currentSessionType === "direct_modal") {
            uiUpdater.updateDirectCallMicButtonVisual(isMicEffectivelyMuted);
            uiUpdater.updateDirectCallStatus(isMicEffectivelyMuted ? "Microphone OFF (sending paused)" : "Microphone ON (sending active)", false);
        } else if (currentSessionType === "voiceChat_modal") {
            uiUpdater.updateVoiceChatTapToSpeakButton(isMicEffectivelyMuted ? 'idle' : 'listening', isMicEffectivelyMuted ? 'Mic OFF' : 'Mic ON');
        }
        
        if (isMicEffectivelyMuted) {
            geminiLiveApiService?.sendAudioStreamEndSignal(); // Good practice to signal if mic is off for a while
        } else {
            // If unmuting and mic capture wasn't running (e.g., after an error), restart it.
            // This assumes startUserMicrophoneCapture can be called safely multiple times or handles existing streams.
            if (!userMicrophoneStream?.active && audioContext) {
                 console.log("liveCallHandler: Mic was inactive, attempting to restart capture for unmute.");
                startUserMicrophoneCapture();
            }
            // If using manual VAD with SDK, you might send activityStart here.
        }
    }

    function toggleSpeakerMuteForLiveCall() {
        const { uiUpdater, domElements } = getDeps();
        isAiSpeakerMuted = !isAiSpeakerMuted;
        console.log("liveCallHandler: AI Speaker Muted:", isAiSpeakerMuted);
        if (currentSessionType === "direct_modal") {
            uiUpdater.updateDirectCallSpeakerButtonVisual(isAiSpeakerMuted);
        } else if (currentSessionType === "voiceChat_modal" && domElements?.toggleVoiceChatTTSBtn) {
            uiUpdater.updateTTSToggleButtonVisual(domElements.toggleVoiceChatTTSBtn, isAiSpeakerMuted);
        }
        if (isAiSpeakerMuted) {
            aiAudioPlaybackQueue = []; // Clear pending audio
            // TODO: Stop any currently playing AudioBufferSourceNode if audioPlayerContext and sourceNode exist
        }
    }

    function requestActivityForLiveCall() {
        console.log("liveCallHandler: requestActivityForLiveCall");
        const { uiUpdater, polyglotSharedContent, polyglotMinigamesData, geminiLiveApiService, sessionStateManager, polyglotHelpers } = getDeps();

        if (!currentConnector || !geminiLiveApiService?.sendClientText) {
            console.warn("liveCallHandler: Cannot request activity - missing connector or Live API service.");
            return;
        }

        let isTutor = currentConnector.languageRoles &&
                      currentConnector.languageRoles[currentConnector.language] &&
                      Array.isArray(currentConnector.languageRoles[currentConnector.language]) &&
                      currentConnector.languageRoles[currentConnector.language].includes('tutor');

        if (!isTutor || !currentConnector.tutorMinigameImageFiles?.length) {
            const msg = "No activities available for this partner.";
            if (currentSessionType === "direct_modal") uiUpdater.updateDirectCallStatus(msg, true);
            else if (currentSessionType === "voiceChat_modal") uiUpdater.appendToVoiceChatLog(msg, "connector-error");
            return;
        }

        const filename = currentConnector.tutorMinigameImageFiles[Math.floor(Math.random() * currentConnector.tutorMinigameImageFiles.length)];
        const imgInfo = polyglotSharedContent.tutorImages.find(img => img.file === filename);
        if (!imgInfo) {
            console.error("liveCallHandler: No image info found for filename:", filename);
            return;
        }

        const game = polyglotMinigamesData.find(mg => imgInfo.suitableGames.includes(mg.id)) || polyglotMinigamesData.find(g => g.id === "describe_scene") || { title: "Describe", instruction: "Describe this." };
        let instruction = game.instruction.replace("[target_language]", currentConnector.language) + ` (Regarding the image of ${imgInfo.description.substring(0, 50)}...)`;

        if (polyglotHelpers?.stripEmojis) {
            instruction = polyglotHelpers.stripEmojis(instruction);
        }

        if (currentSessionType === "direct_modal") uiUpdater.updateDirectCallStatus(`Activity: ${game.title}`, false);
        sessionStateManager.addTurnToTranscript('system-activity', `Activity: ${game.title} with image ${imgInfo.file}`);

        if (!isAiSpeakerMuted && instruction.trim()) { // Only send if there's text left
            console.log("liveCallHandler: Sending activity instruction (no emojis) to Live API:", instruction);
            geminiLiveApiService.sendClientText(instruction);
        }
    }

    // --- Live API Callbacks Handled by liveCallHandler ---
    function handleLiveApiSessionOpen() {
        const { sessionStateManager, geminiLiveApiService, polyglotHelpers } = getDeps(); // Ensure polyglotHelpers is in getDeps
        console.log("liveCallHandler: handleLiveApiSessionOpen - Live API session confirmed open and setup.");

        const { domElements, modalHandler } = getDeps();
        if (domElements?.virtualCallingScreen && modalHandler) {
            modalHandler.close(domElements.virtualCallingScreen);
        } else {
            console.warn("liveCallHandler: handleLiveApiSessionOpen - virtualCallingScreen or modalHandler missing.");
        }

        sessionStateManager.markSessionAsStarted();
        initializeCallUI(currentConnector, currentSessionType); // Sets up DirectCall/VoiceChat UI
        startUserMicrophoneCapture(); // Start mic capture FOR Live API

        if (currentConnector.greetingCall) {
            let greetingText = currentConnector.greetingCall;
            if (polyglotHelpers?.stripEmojis) { // Check if helper is available
                greetingText = polyglotHelpers.stripEmojis(greetingText);
            }
            console.log("liveCallHandler: Sending connector greeting (no emojis) via Live API text:", greetingText);
            sessionStateManager.addTurnToTranscript('connector-greeting-intent', currentConnector.greetingCall); // Log original
            if (greetingText.trim()) { // Only send if there's text left after stripping
                geminiLiveApiService.sendClientText(greetingText);
            }
        }
    }

    function handleReceivedAiAudioChunk(audioChunkArrayBuffer, mimeType) {
        if (isAiSpeakerMuted) return;
        if (!audioChunkArrayBuffer || audioChunkArrayBuffer.byteLength === 0) {
            // console.debug("liveCallHandler: Received empty AI audio chunk.");
            return;
        }
        // console.debug("liveCallHandler: Received AI audio chunk. Size:", audioChunkArrayBuffer.byteLength, mimeType);

        if (!audioPlayerContext || audioPlayerContext.state === 'closed') {
            audioPlayerContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: AI_OUTPUT_SAMPLE_RATE });
        }
        if (audioPlayerContext.state === 'suspended') {
            audioPlayerContext.resume().catch(e => console.error("Error resuming audioPlayerContext for AI audio:", e));
        }
        if (audioPlayerContext.state === 'closed') { // Should not happen if just created
             console.error("liveCallHandler: audioPlayerContext is closed, cannot play AI audio.");
             return;
        }


        try {
            // Assuming audioChunkArrayBuffer is Int16 PCM as typically output by speech APIs after base64 decode
            const pcmData = new Int16Array(audioChunkArrayBuffer);
            const float32Pcm = new Float32Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                float32Pcm[i] = pcmData[i] / 32768.0; // Normalize Int16 to Float32 range [-1.0, 1.0]
            }

            const audioBuffer = audioPlayerContext.createBuffer(
                1,                    // numberOfChannels (mono)
                float32Pcm.length,    // length (number of frames)
                AI_OUTPUT_SAMPLE_RATE // sampleRate (e.g., 24000 for Live API output)
            );
            audioBuffer.copyToChannel(float32Pcm, 0);

            aiAudioPlaybackQueue.push(audioBuffer);
            if (!isPlayingAiAudio) {
                playNextAiAudioChunkFromQueue();
            }
        } catch (e) { console.error("liveCallHandler: Error processing/queueing AI audio chunk:", e); }
    }
    
    function playNextAiAudioChunkFromQueue() {
        if (isAiSpeakerMuted || aiAudioPlaybackQueue.length === 0 || !audioPlayerContext || audioPlayerContext.state === 'closed') {
            isPlayingAiAudio = false;
            nextAiAudioPlayTime = (audioPlayerContext && audioPlayerContext.state !== 'closed') ? audioPlayerContext.currentTime : 0;
            return;
        }
        isPlayingAiAudio = true;

        const audioBufferToPlay = aiAudioPlaybackQueue.shift();
        const sourceNode = audioPlayerContext.createBufferSource();
        sourceNode.buffer = audioBufferToPlay;
        sourceNode.connect(audioPlayerContext.destination);

        const currentTime = audioPlayerContext.currentTime;
        // Ensure startTime is not in the past
        const startTime = Math.max(currentTime, (nextAiAudioPlayTime > currentTime) ? nextAiAudioPlayTime : currentTime);
        
        // console.debug(`liveCallHandler: Playing AI audio chunk. Scheduled: ${startTime.toFixed(3)}, Duration: ${audioBufferToPlay.duration.toFixed(3)}`);
        sourceNode.start(startTime);
        // Schedule next chunk with a tiny overlap or immediately after.
        // A small negative value in overlap can help if there are slight delays.
        nextAiAudioPlayTime = startTime + audioBufferToPlay.duration - 0.015; 

        sourceNode.onended = () => {
            // console.debug("liveCallHandler: AI audio chunk finished playing.");
            playNextAiAudioChunkFromQueue();
        };
    }

    function handleReceivedAiText(text) {
        console.log("liveCallHandler: Received AI Text CHUNK (potentially for speech):", text);
        const { uiUpdater, polyglotHelpers } = getDeps(); // Add polyglotHelpers

        // For UI, display raw text with emojis in voice chat log
        if (currentSessionType === "voiceChat_modal") {
            uiUpdater.appendToVoiceChatLog(text, 'connector');
        }

        aiSpokenTextBuffer += text + " ";
        if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);
        aiSpokenTextTimeoutId = setTimeout(flushAiSpokenText, AI_SPOKEN_TEXT_FLUSH_DELAY);
    }

    function handleReceivedUserTranscription(text, isFinal = false) {
        console.log("liveCallHandler: User Transcription CHUNK:", text, "IsFinal:", isFinal);
        const { uiUpdater, sessionStateManager } = getDeps();

        if (currentSessionType === "voiceChat_modal") {
            uiUpdater.appendToVoiceChatLog(text, 'user-audio', { isTranscription: true, isStreaming: !isFinal });
        }

        userTranscriptionBuffer += text + " ";
        if (userTranscriptionTimeoutId) clearTimeout(userTranscriptionTimeoutId);

        if (isFinal) {
            flushUserTranscription();
        } else {
            userTranscriptionTimeoutId = setTimeout(flushUserTranscription, USER_TRANSCRIPTION_FLUSH_DELAY);
        }
    }

    function handleReceivedModelTranscription(text, isFinal = false) {
        console.log("liveCallHandler: AI Spoken Output Transcription CHUNK (from server STT):", text, "IsFinal:", isFinal);
        const { polyglotHelpers } = getDeps(); // Ensure polyglotHelpers available

        // If you decide to use outputTranscription for recap, uncomment the following:
        /*
        aiSpokenTextBuffer += text + " ";
        if (aiSpokenTextTimeoutId) clearTimeout(aiSpokenTextTimeoutId);

        if (isFinal) {
            flushAiSpokenText(); // This will strip emojis before adding to transcript
        } else {
            aiSpokenTextTimeoutId = setTimeout(flushAiSpokenText, AI_SPOKEN_TEXT_FLUSH_DELAY);
        }
        */
    }

    function handleLiveApiError(error) {
        console.error("liveCallHandler: handleLiveApiError received:", error);
        const { uiUpdater } = getDeps();
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown Live API error');
        
        if (currentSessionType === "direct_modal") {
            uiUpdater.updateDirectCallStatus(`Error: ${errorMessage.substring(0,30)}...`, true);
        } else if (currentSessionType === "voiceChat_modal") {
            uiUpdater.appendToVoiceChatLog(`Error: ${errorMessage}`, 'connector-error', { isError: true });
        }
        flushUserTranscription();
        flushAiSpokenText();
        endLiveCall(false);
    }

    function handleLiveApiClose(wasClean, code, reason) {
        console.log("liveCallHandler: handleLiveApiClose. Clean:", wasClean, "Code:", code, "Reason:", reason);
        const { uiUpdater, sessionStateManager } = getDeps();
        // If sessionStateManager still thinks a session is active, it means the close was unexpected
        if (sessionStateManager.isSessionActive()) {
            console.warn("liveCallHandler: Live API connection closed unexpectedly or by server.");
            const message = `Call ended: ${reason || 'Connection closed'} (Code: ${code})`;
             if (currentSessionType === "direct_modal") {
                uiUpdater.updateDirectCallStatus(message, !wasClean);
            } else if (currentSessionType === "voiceChat_modal") {
                uiUpdater.appendToVoiceChatLog(message, wasClean ? 'connector' : 'connector-error', { isError: !wasClean });
            }
            // Call endLiveCall to ensure all local resources are cleaned up and session is finalized
            // Pass false for generateRecap if it was an abrupt/error close not initiated by user clicking "End Call"
            endLiveCall(!wasClean); // Generate recap if it was an unclean close from server side
        }
        // Local resource cleanup is handled by endLiveCall
    }

    // --- Microphone Input Processing for Live API ---
    async function startUserMicrophoneCapture() {
        console.log("liveCallHandler: startUserMicrophoneCapture");
        const { geminiLiveApiService, uiUpdater } = getDeps();

        if (!navigator.mediaDevices?.getUserMedia) {
            console.error("getUserMedia not supported on your browser!");
            handleLiveApiError(new Error("getUserMedia not supported."));
            return;
        }
        if (!audioContext || audioContext.state === 'closed') {
            console.log("liveCallHandler: Creating new AudioContext for input capture.");
            audioContext = new AudioContext({ sampleRate: TARGET_INPUT_SAMPLE_RATE });
        }
        if (audioContext.state === 'suspended') {
            console.log("liveCallHandler: Resuming suspended AudioContext.");
            await audioContext.resume();
        }

        try {
            if (!userMicrophoneStream || !userMicrophoneStream.active) {
                console.log("liveCallHandler: Requesting microphone access with desired sample rate:", TARGET_INPUT_SAMPLE_RATE);
                userMicrophoneStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: TARGET_INPUT_SAMPLE_RATE,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                        // channelCount: 1 // Explicitly mono
                    },
                    video: false
                });
            }
            const actualSampleRate = userMicrophoneStream.getAudioTracks()[0].getSettings().sampleRate;
            console.log("liveCallHandler: Microphone stream obtained. Requested SR:", TARGET_INPUT_SAMPLE_RATE, "Actual SR:", actualSampleRate);
            if (actualSampleRate !== TARGET_INPUT_SAMPLE_RATE) {
                console.warn(`liveCallHandler: Microphone captured at ${actualSampleRate}Hz, not desired ${TARGET_INPUT_SAMPLE_RATE}Hz. Resampling will be needed for optimal quality or if API is strict.`);
                // TODO: Implement resampling if actualSampleRate is significantly different and API requires strict 16kHz.
            }


            microphoneSourceNode = audioContext.createMediaStreamSource(userMicrophoneStream);
            const bufferSize = 4096; // Standard buffer size
            // scriptProcessorNode is deprecated but has wider support. AudioWorklet is preferred for new development.
            if (audioContext.createScriptProcessor) {
                scriptProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1); // (bufferSize, numInputChannels, numOutputChannels)
            } else {
                console.error("liveCallHandler: audioContext.createScriptProcessor is not available. AudioWorklet would be needed.");
                handleLiveApiError(new Error("ScriptProcessorNode not supported."));
                return;
            }


            scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
                if (isMicEffectivelyMuted || !geminiLiveApiService?.sendRealtimeAudio) {
                    return;
                }

                const inputDataFloat32 = audioProcessingEvent.inputBuffer.getChannelData(0);
                
                // If actualSampleRate is different from TARGET_INPUT_SAMPLE_RATE, resample here.
                // This is a complex step omitted for brevity. Assume for now it's close enough or API handles it.
                // Example: let resampledData = resample(inputDataFloat32, actualSampleRate, TARGET_INPUT_SAMPLE_RATE);

                const pcm16Data = new Int16Array(inputDataFloat32.length); // Assuming no resampling for now
                for (let i = 0; i < inputDataFloat32.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputDataFloat32[i]));
                    pcm16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                geminiLiveApiService.sendRealtimeAudio(pcm16Data.buffer); // Send ArrayBuffer of Int16
            };

            microphoneSourceNode.connect(scriptProcessorNode);
            scriptProcessorNode.connect(audioContext.destination); // Required to keep onaudioprocess firing.
            console.log("liveCallHandler: Microphone capture and processing node connected.");

        } catch (err) {
            console.error("liveCallHandler: Error in startUserMicrophoneCapture:", err);
            handleLiveApiError(err);
        }
    }

    function stopUserMicrophoneCapture() {
        console.log("liveCallHandler: stopUserMicrophoneCapture called.");
        if (scriptProcessorNode) {
            scriptProcessorNode.disconnect(); // Disconnect from audio graph
            scriptProcessorNode.onaudioprocess = null; // Remove the event handler
            scriptProcessorNode = null;
        }
        if (microphoneSourceNode) {
            microphoneSourceNode.disconnect();
            microphoneSourceNode = null;
        }
        if (userMicrophoneStream) {
            userMicrophoneStream.getTracks().forEach(track => track.stop()); // Stop the browser's mic access
            userMicrophoneStream = null;
        }
        // Do not close audioContext here, as audioPlayerContext might still need it,
        // or it could be reused for subsequent calls. It's generally better to manage
        // AudioContext lifecycle at a higher application level or per "usage session".
        console.log("liveCallHandler: Microphone capture stopped and resources released.");
    }

    console.log("js/sessions/live_call_handler.js loaded and refactored (variable name fix).");
    return {
        startLiveCall,
        endLiveCall,
        sendTypedTextDuringLiveCall,
        toggleMicMuteForLiveCall,
        toggleSpeakerMuteForLiveCall,
        requestActivityForLiveCall
    };
})();