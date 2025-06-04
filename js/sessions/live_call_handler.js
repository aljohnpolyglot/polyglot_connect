// js/sessions/live_call_handler.js
// FACADE for Live API call logic. Coordinates specialized live call sub-modules.
// Version: Facade Debug v2.1 (ASSUMED CURRENT from your logs)

console.log("live_call_handler.js: Script execution STARTED (Facade Debug v2.1).");

if (window.liveCallHandler) {
    console.warn("live_call_handler.js: window.liveCallHandler ALREADY DEFINED. Possible double load or script issue.");
}

window.liveCallHandler = (() => {
    'use strict';
    const FACADE_VERSION = "Debug v2.1"; // Matches your logs
    console.log(`live_call_handler.js: IIFE (Facade ${FACADE_VERSION}) STARTING.`);

    const getDeps = (functionName = "liveCallHandler internal") => {
        const deps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater,
            polyglotHelpers: window.polyglotHelpers,
            geminiLiveApiService: window.geminiLiveApiService,
            sessionStateManager: window.sessionStateManager,
            modalHandler: window.modalHandler,
            polyglotSharedContent: window.polyglotSharedContent,
            polyglotMinigamesData: window.polyglotMinigamesData,
            conversationManager: window.conversationManager,
            liveApiMicInput: window.liveApiMicInput,
            liveApiAudioOutput: window.liveApiAudioOutput,
            liveApiTextCoordinator: window.liveApiTextCoordinator
        };
        if (!window.domElements) console.error(`LCH Facade (${functionName}): Global window.domElements is MISSING!`);
        return deps;
    };

    let currentConnector = null;
    let currentSessionType = null;
    let isMicEffectivelyMuted = true;
    let isAiSpeakerMuted = false;

    function buildLiveApiSystemInstruction(connector) {
        const functionName = "buildLiveApiSystemInstruction";
        const { conversationManager } = getDeps(functionName);

        if (!connector) {
            console.warn(`LCH Facade (${functionName}): Connector undefined. RETURNING GENERIC PROMPT.`);
            return { parts: [{ text: "You are a helpful assistant. Please be concise and conversational." }] };
        }

        // Robust check for conversationManager and its method
        if (!conversationManager || typeof conversationManager.ensureConversationRecord !== 'function') {
            console.error(`LCH Facade (${functionName}): conversationManager (or .ensureConversationRecord) missing! Building basic fallback for ${connector.id}.`);
            let personaDetails = `You are ${connector.profileName || 'a language partner'}, primarily speaking ${connector.language || 'English'}.`;
            const fullInstruction = `${personaDetails} Keep your responses conversational. Do not mention being an AI.`;
            console.log(`LCH Facade (${functionName}): RETURNING BASIC FALLBACK PROMPT: "${fullInstruction.substring(0,50)}..."`);
            return { parts: [{ text: fullInstruction }] };
        }

        try {
            const { conversation: convo } = conversationManager.ensureConversationRecord(connector.id, connector);
            if (convo?.geminiHistory?.[0]?.parts?.[0]?.text) {
                const promptText = convo.geminiHistory[0].parts[0].text;
                // console.log(`LCH Facade (${functionName}): RETURNING RICH PROMPT from geminiHistory for ${connector.id}: "${promptText.substring(0,50)}..."`);
                return { parts: [{ text: promptText }] };
            }
        } catch (e) {
            console.error(`LCH Facade (${functionName}): Error in ensureConversationRecord or accessing geminiHistory for ${connector.id}:`, e);
        }
        
        console.warn(`LCH Facade (${functionName}): Fallback system instruction (manual build) for connector: ${connector.id}`);
        let personaDets = `You are ${connector.profileName || 'a character'}, a ${connector.modernTitle || 'person'} from ${connector.city || 'a place'}, ${connector.country || 'a country'}. Your main language for this call is ${connector.language || 'English'}.`;
        if (connector.interests?.length > 0) personaDets += ` You enjoy ${connector.interests.slice(0, 2).join(' and ')}.`;
        let langInstructions = ` Engage the user in natural conversation in ${connector.language || 'English'}. Primarily respond in ${connector.language || 'English'}.`;
        const engPractice = connector.practiceLanguages?.find(lang => lang.lang === "English");
        if (engPractice && (engPractice.levelTag === "fluent" || engPractice.levelTag === "learning")) {
            langInstructions += ` You're also ${engPractice.levelTag} in English. If the user uses English, you can reply in English if natural, but guide back to ${connector.language || 'English'} for practice.`;
        }
        const fullIns = `${personaDets}${langInstructions} Keep responses conversational. DO NOT mention being an AI, model, or program. Act human.`;
        // console.log(`LCH Facade (${functionName}): RETURNING MANUALLY BUILT FALLBACK PROMPT for ${connector.id}: "${fullIns.substring(0,50)}..."`);
        return { parts: [{ text: fullIns }] };
    }
    
    function initializeCallUI(connector, sessionType) {
        const functionName = "initializeCallUI";
        const { uiUpdater, domElements, modalHandler } = getDeps(functionName);

        if (!domElements || !uiUpdater || !modalHandler) {
            console.error(`LCH Facade (${functionName}): Missing UI deps. Cannot initialize UI.`);
            return; 
        }

        let modalToOpenId = null;
        let modalElement = null;

        if (sessionType === "direct_modal") {
            modalToOpenId = 'directCallInterface';
            modalElement = domElements.directCallInterface;
            if (!modalElement) { console.error(`LCH Facade (${functionName}): domElements.directCallInterface missing!`); return; }
            uiUpdater.updateDirectCallHeader?.(connector);
            uiUpdater.clearDirectCallActivityArea?.();
            // Initial mute states are set in startLiveCall before this is called from handleLiveApiSessionOpen
            uiUpdater.updateDirectCallStatus?.("Live Call Connected", false); 
            uiUpdater.updateDirectCallMicButtonVisual?.(isMicEffectivelyMuted); 
            uiUpdater.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
        } else if (sessionType === "voiceChat_modal") { 
            // ... (voiceChat_modal UI logic) ...
        }

        if (modalElement && modalHandler.open) {
            modalHandler.open(modalElement);
            console.log(`LCH Facade (${functionName}): Opened modal '${modalToOpenId}'.`);
        } else {
            console.error(`LCH Facade (${functionName}): Modal element for ID '${modalToOpenId}' not found OR modalHandler.open missing.`);
        }
    }

    async function startLiveCall(connector, sessionType) {
        const functionName = "startLiveCall";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): TRYING TO START - Connector: ${connector?.id}, Type: ${sessionType}`);
        const deps = getDeps(functionName);

        const requiredDepNames = ['geminiLiveApiService', 'sessionStateManager', 'conversationManager', 'liveApiMicInput', 'liveApiAudioOutput', 'liveApiTextCoordinator', 'uiUpdater', 'domElements', 'modalHandler', 'polyglotHelpers'];
        for (const depName of requiredDepNames) {
            if (!deps[depName]) {
                console.error(`LCH Facade (${functionName}): ABORT! CRITICAL DEPENDENCY '${depName}' IS MISSING.`);
                alert(`Live call error: Component '${depName}' missing (LCH-S01).`);
                deps.sessionStateManager?.resetBaseSessionState?.();
                // BUG FIX START: Ensure virtual calling screen is closed on early abort
                if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                    deps.modalHandler.close(deps.domElements.virtualCallingScreen);
                }
                // BUG FIX END
                return false;
            }
            if (['liveApiMicInput', 'liveApiAudioOutput', 'liveApiTextCoordinator'].includes(depName) && typeof deps[depName].initialize !== 'function') {
                console.error(`LCH Facade (${functionName}): ABORT! Sub-module '${depName}' MISSING 'initialize' METHOD.`);
                alert(`Live call error: Sub-component '${depName}' broken (LCH-S02).`);
                deps.sessionStateManager?.resetBaseSessionState?.();
                // BUG FIX START: Ensure virtual calling screen is closed on early abort
                if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                    deps.modalHandler.close(deps.domElements.virtualCallingScreen);
                }
                // BUG FIX END
                return false;
            }
        }
        console.log(`LCH Facade (${functionName}): All dependencies appear present.`);

        console.log(`LCH Facade (${functionName}): Initializing sub-modules...`);
        if (!deps.liveApiMicInput.initialize(deps.geminiLiveApiService, () => isMicEffectivelyMuted)) {
             console.error(`LCH Facade (${functionName}): ABORT! liveApiMicInput.initialize FAILED.`);
             deps.sessionStateManager.resetBaseSessionState?.();
             // BUG FIX START: Ensure virtual calling screen is closed on early abort
             if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
             }
             // BUG FIX END
             return false; 
        }
        if (!deps.liveApiAudioOutput.initialize(() => isAiSpeakerMuted)) {
             console.error(`LCH Facade (${functionName}): ABORT! liveApiAudioOutput.initialize FAILED.`);
             deps.sessionStateManager.resetBaseSessionState?.();
             // BUG FIX START: Ensure virtual calling screen is closed on early abort
             if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
             }
             // BUG FIX END
             return false; 
        }
        if (!deps.liveApiTextCoordinator.initialize(deps.sessionStateManager, deps.polyglotHelpers, deps.uiUpdater)) {
             console.error(`LCH Facade (${functionName}): ABORT! liveApiTextCoordinator.initialize FAILED.`);
             deps.sessionStateManager.resetBaseSessionState?.();
             // BUG FIX START: Ensure virtual calling screen is closed on early abort
             if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
             }
             // BUG FIX END
             return false; 
        }
        deps.liveApiTextCoordinator.setCurrentSessionTypeContext(sessionType);
        deps.liveApiTextCoordinator.resetBuffers();
        console.log(`LCH Facade (${functionName}): Sub-modules initialized.`);

        currentConnector = connector;
        currentSessionType = sessionType;
        isMicEffectivelyMuted = false; // Default to open for live API once call starts
        isAiSpeakerMuted = false;     
        console.log(`LCH Facade (${functionName}): Facade state set. MicMuted: ${isMicEffectivelyMuted}, SpeakerMuted: ${isAiSpeakerMuted}`);

        console.log(`LCH Facade (${functionName}): Calling sessionStateManager.initializeBaseSession...`);
        // Assuming sessionStateManager.initializeBaseSession opens the virtual-calling-screen
        if (!deps.sessionStateManager.initializeBaseSession(connector, sessionType)) {
            console.error(`LCH Facade (${functionName}): ABORT! sessionStateManager.initializeBaseSession FAILED.`);
            // BUG FIX START: Ensure virtual calling screen is closed if initializeBaseSession fails (if it was somehow partially opened or needs explicit close)
            // This might be redundant if initializeBaseSession handles its own cleanup on failure, but safe to add.
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            }
            // BUG FIX END
            return false;
        }
        console.log(`LCH Facade (${functionName}): sessionStateManager.initializeBaseSession successful.`);

        const systemInstructionObject = buildLiveApiSystemInstruction(connector);
        if (!systemInstructionObject?.parts?.[0]?.text?.trim()) {
            console.error(`LCH Facade (${functionName}): ABORT! Failed to build valid, non-empty system instruction.`);
            deps.uiUpdater?.updateDirectCallStatus?.("Setup Error (Sys. Prompt)", true);
            // BUG FIX START: Close virtual-calling-screen here too
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            }
            // BUG FIX END
            deps.sessionStateManager.resetBaseSessionState();
            return false;
        }
        console.log(`LCH Facade (${functionName}): System instruction built.`);
        
        const liveApiModelName = connector.liveApiModelName || "gemini-2.0-flash-live-001"; 
        console.log(`LCH Facade (${functionName}): Using Live API Model: '${liveApiModelName}'`);
        
      const liveApiSessionSetupConfig = {
            // Fields from generationConfig moved up
               systemInstruction: systemInstructionObject, // TOP LEVEL
            
            generationConfig: { // TOP LEVEL (contains speechConfig and responseModalities)
                responseModalities: ["AUDIO"], // Only expect audio from AI
                speechConfig: { 
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: connector.liveApiVoiceName || "Puck" } },
                    languageCode: connector.languageCode 
                }
                // temperature: 0.7, // Optional: Add other generation params here
            },

            realtimeInputConfig: { // TOP LEVEL
                activityHandling: "START_OF_ACTIVITY_INTERRUPTS"
            },

            inputAudioTranscription: {}, // TOP LEVEL - Enable user speech transcription
            outputAudioTranscription: {} // TOP LEVEL - Enable AI speech transcription (for logging/recap)
            // tools: [], // If you add tools, they would be top-level too
         };
      console.log(`LCH Facade (${functionName}): Live API Config (Flattened):`, JSON.stringify(liveApiSessionSetupConfig).substring(0, 300) + "...");
        
        const liveApiCallbacks = {
            onOpen: handleLiveApiSessionOpen,
            onAiAudioChunk: deps.liveApiAudioOutput.handleReceivedAiAudioChunk,
            onAiText: deps.liveApiTextCoordinator.handleReceivedAiText,
            onUserTranscription: deps.liveApiTextCoordinator.handleReceivedUserTranscription,
            onModelTranscription: deps.liveApiTextCoordinator.handleReceivedModelTranscription,
            onAiInterrupted: handleAiInterrupted,
            onError: handleLiveApiError,
            onClose: handleLiveApiClose
        };
        console.log(`LCH Facade (${functionName}): Callbacks defined.`);

        try {
            console.log(`LCH Facade (${functionName}): Attempting geminiLiveApiService.connect...`);
            const connectResult = await deps.geminiLiveApiService.connect(liveApiModelName, liveApiSessionSetupConfig, liveApiCallbacks);
            console.log(`LCH Facade (${functionName}): connectResult from service: ${!!connectResult}`); 
            if (connectResult) { 
                console.log(`LCH Facade (${functionName}): Connect process INITIATED by service. Waiting for SDK onOpen/setupComplete.`);
                return true; 
            } else { 
                throw new Error("geminiLiveApiService.connect returned falsy indicating failure to initiate connection process.");
            }
        } catch (error) { 
            console.error(`LCH Facade (${functionName}): ABORT! Error DURING geminiLiveApiService.connect call:`, error.message, error);
            deps.uiUpdater?.updateDirectCallStatus?.("Connection Failed", true);
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            }
            if (deps.sessionStateManager?.recordFailedCallAttempt && connector) { // connector is the param to startLiveCall
                deps.sessionStateManager.recordFailedCallAttempt(connector, "could not connect");
            } else {
                // Fallback to just resetting state if the new method isn't there
               if (deps.sessionStateManager?.recordFailedCallAttempt && connector) {
            let failureReason = "could not connect";
            if (error && error.message) {
                if (error.message.toLowerCase().includes("sdk instance") || error.message.toLowerCase().includes("api key")) {
                    failureReason = "due to an SDK/API key issue";
                } else if (error.message.toLowerCase().includes("returned falsy")) {
                    failureReason = "service indicated failure";
                } else {
                    // Keep a generic reason but log the specific error for devs
                    console.error(`LCH Facade (${functionName}): Specific error for failed call:`, error.message);
                }
            }
            deps.sessionStateManager.recordFailedCallAttempt(connector, failureReason);
        } else {
            // Fallback if the new method isn't available or connector is somehow null
            console.warn(`LCH Facade (${functionName}): Could not record failed call attempt properly. Falling back to resetBaseSessionState.`);
            deps.sessionStateManager?.resetBaseSessionState?.();
        }
            }
            return false;
        }
    }

    function endLiveCall(generateRecap = true) {
        const functionName = "endLiveCall";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): START. GenerateRecap: ${generateRecap}`);
        const deps = getDeps(functionName);

        // BUG FIX START: Attempt to close the virtual calling screen first.
        // This is important if endLiveCall is called due to an error before the main direct call UI was opened.
        if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
            console.log(`LCH Facade (${functionName}): Attempting to close virtual calling screen.`);
            deps.modalHandler.close(deps.domElements.virtualCallingScreen);
        }
        // BUG FIX END

        deps.geminiLiveApiService?.closeConnection?.("User ended call"); 

        deps.liveApiMicInput?.stopCapture?.();
        deps.liveApiAudioOutput?.cleanupAudioContext?.();
        deps.liveApiTextCoordinator?.flushUserTranscription?.(); 
        deps.liveApiTextCoordinator?.flushAiSpokenText?.();
        deps.liveApiTextCoordinator?.resetBuffers?.(); 

        // Then, attempt to close the actual direct call interface if it was ever opened.
        if (currentSessionType === "direct_modal" && deps.domElements?.directCallInterface && deps.modalHandler?.close) {
            console.log(`LCH Facade (${functionName}): Attempting to close direct call interface.`);
            deps.modalHandler.close(deps.domElements.directCallInterface);
        } else if (currentSessionType === "voiceChat_modal" && deps.domElements?.voiceEnabledChatInterface && deps.modalHandler?.close) {
             deps.modalHandler.close(deps.domElements.voiceEnabledChatInterface);
        }
        
        deps.sessionStateManager?.finalizeBaseSession?.(generateRecap); 
        currentConnector = null;
        currentSessionType = null;
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): FINISHED.`);
    }

    function sendTypedTextDuringLiveCall(text) {
        const functionName = "sendTypedTextDuringLiveCall";
        const deps = getDeps(functionName);
        if (!text?.trim() || !deps.geminiLiveApiService?.sendClientText || !deps.liveApiTextCoordinator?.handleUserTypedText) return; 
        if (!deps.sessionStateManager?.isSessionActive()) return; 
        if (currentSessionType === "voiceChat_modal" && deps.uiUpdater?.appendToVoiceChatLog) deps.uiUpdater.appendToVoiceChatLog(text, 'user');
        deps.liveApiTextCoordinator.handleUserTypedText(text);
        deps.geminiLiveApiService.sendClientText(text);
    }

    function toggleMicMuteForLiveCall() {
        const functionName = "toggleMicMuteForLiveCall";
        const deps = getDeps(functionName);
        isMicEffectivelyMuted = !isMicEffectivelyMuted;
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): Mic muted: ${isMicEffectivelyMuted}`);
        if (currentSessionType === "direct_modal") {
            deps.uiUpdater?.updateDirectCallMicButtonVisual?.(isMicEffectivelyMuted);
            deps.uiUpdater?.updateDirectCallStatus?.(isMicEffectivelyMuted ? "Microphone OFF" : "Microphone ON", false);
        }
        if (isMicEffectivelyMuted) {
             deps.geminiLiveApiService?.sendAudioStreamEndSignal?.();
        } else {
            // Mic input module will use its () => isMicEffectivelyMuted to start/stop sending.
        }
    }

    function toggleSpeakerMuteForLiveCall() {
        const functionName = "toggleSpeakerMuteForLiveCall";
        const deps = getDeps(functionName);
        isAiSpeakerMuted = !isAiSpeakerMuted;
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): Speaker muted: ${isAiSpeakerMuted}`);
        if (currentSessionType === "direct_modal") deps.uiUpdater?.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
        if (isAiSpeakerMuted) {
            deps.liveApiAudioOutput?.stopCurrentSound?.(); 
            deps.liveApiAudioOutput?.clearPlaybackQueue?.(); 
        }
    }

    function requestActivityForLiveCall() {
        const functionName = "requestActivityForLiveCall";
        const deps = getDeps(functionName);
        if (!currentConnector || !deps.geminiLiveApiService?.sendClientText) return;
        let isTutor = currentConnector.languageRoles?.[currentConnector.language]?.includes('tutor');
        if (!isTutor || !currentConnector.tutorMinigameImageFiles?.length) { return; }
        const filename = currentConnector.tutorMinigameImageFiles[Math.floor(Math.random() * currentConnector.tutorMinigameImageFiles.length)];
        const imgInfo = deps.polyglotSharedContent?.tutorImages?.find(img => img.file === filename);
        if (!imgInfo) { return; }
        const game = deps.polyglotMinigamesData?.find(mg => imgInfo.suitableGames.includes(mg.id)) || deps.polyglotMinigamesData?.find(g => g.id === "describe_scene") || { title: "Describe", instruction: "Describe this." };
        if(!game) { return; }
        // ... build instruction and send ... (rest of your logic)
         const instructionText = `Let's play a game: ${game.title}. ${game.instruction} Look at this image: ${imgInfo.file}. You can start.`;
         if (deps.uiUpdater?.updateDirectCallActivityImage) { // Check if function exists
             deps.uiUpdater.updateDirectCallActivityImage(imgInfo.path);
         } else {
             console.warn(`LCH Facade (${functionName}): uiUpdater.updateDirectCallActivityImage is not defined.`);
         }
         deps.geminiLiveApiService.sendClientText(instructionText);
         console.log(`LCH Facade (${functionName}): Activity requested - ${game.title} with ${imgInfo.file}`);
    }


    // --- SDK Callback Handlers ---
    function handleLiveApiSessionOpen() { 
        const functionName = "handleLiveApiSessionOpen (Facade's onOpen)";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): Call session FULLY OPEN and ready.`);
        const deps = getDeps(functionName);
        
        // Close the virtual calling screen as the main call UI is about to open
        if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
            deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            console.log(`LCH Facade (${functionName}): Virtual calling screen closed.`);
        } else {
            console.warn(`LCH Facade (${functionName}): Virtual calling screen or modalHandler.close not available.`);
        }

        if (!deps.sessionStateManager?.markSessionAsStarted()) {
             console.error(`LCH Facade (${functionName}): ABORT! sessionStateManager.markSessionAsStarted FAILED!`);
             handleLiveApiError(new Error("Failed to mark session as started in onOpen. Session state issue."));
             return;
        }
        console.log(`LCH Facade (${functionName}): Session marked as started by state manager.`);
        
        initializeCallUI(currentConnector, currentSessionType); 
        console.log(`LCH Facade (${functionName}): Call UI initialized.`);
        
        if (deps.liveApiMicInput?.startCapture) {
            console.log(`LCH Facade (${functionName}): Calling liveApiMicInput.startCapture...`);
            deps.liveApiMicInput.startCapture(handleLiveApiError); 
        } else {
            console.error(`LCH Facade (${functionName}): CRITICAL! liveApiMicInput.startCapture is NOT AVAILABLE!`);
            handleLiveApiError(new Error("Microphone module's 'startCapture' is missing."));
            return;
        }

        if (currentConnector?.greetingCall && deps.geminiLiveApiService?.sendClientText) {
            let greetingText = currentConnector.greetingCall;
            if (deps.polyglotHelpers?.stripEmojis) greetingText = deps.polyglotHelpers.stripEmojis(greetingText);
            deps.sessionStateManager?.addTurnToTranscript?.('connector-greeting-intent', currentConnector.greetingCall);
            if (greetingText.trim()) {
                deps.geminiLiveApiService.sendClientText(greetingText);
            }
        }
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): FINISHED all onOpen tasks.`);
    }

    function handleAiInterrupted() {
        const functionName = "handleAiInterrupted (Facade's onInterrupted)";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): AI speech interrupted by barge-in.`);
        const { liveApiAudioOutput, liveApiTextCoordinator } = getDeps(functionName);
        liveApiAudioOutput?.stopCurrentSound?.(); 
        liveApiAudioOutput?.clearPlaybackQueue?.();
        // TEMPORARILY COMMENT THIS OUT FOR TESTING
        liveApiTextCoordinator?.resetAiSpokenTextBuffer?.(); 
        console.log(`LCH Facade (${functionName}): AI spoken text buffer NOT reset (TESTING).`);
         console.log(`LCH Facade (${functionName}): Barge-in processed (AI text buffer NOT reset this time).`);
    }

    function handleLiveApiError(error) {
        const functionName = "handleLiveApiError (Facade's onError)";
        console.error(`LCH Facade (${functionName} v${FACADE_VERSION}): Error received:`, error?.message || error, error);
        const { uiUpdater, liveApiTextCoordinator } = getDeps(functionName); 
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown Live API error');
        
        if (currentSessionType === "direct_modal" && uiUpdater?.updateDirectCallStatus) {
            uiUpdater.updateDirectCallStatus(`Error: ${errorMessage.substring(0,40)}...`, true);
        }

        liveApiTextCoordinator?.flushUserTranscription?.(); 
        liveApiTextCoordinator?.flushAiSpokenText?.();
        
        console.log(`LCH Facade (${functionName}): Calling endLiveCall(false) due to error.`);
        endLiveCall(false); // This will now also attempt to close virtual-calling-screen
        console.error(`LCH Facade (${functionName} v${FACADE_VERSION}): FINISHED error processing.`);
    }

    function handleLiveApiClose(wasClean, code, reason) {
        const functionName = "handleLiveApiClose (Facade's onClose)";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): Connection closed. Clean: ${wasClean}, Code: ${code}, Reason: "${reason}"`);
        const deps = getDeps(functionName);

        if (deps.sessionStateManager?.isSessionActive()) {
            console.warn(`LCH Facade (${functionName}): Connection closed by server/network while session was active.`);
            const message = `Call ended: ${reason || 'Connection closed'} (Code: ${code || 'N/A'})`;
            if (currentSessionType === "direct_modal" && deps.uiUpdater) deps.uiUpdater.updateDirectCallStatus?.(message, !wasClean);
            
            deps.liveApiTextCoordinator?.flushUserTranscription?.();
            deps.liveApiTextCoordinator?.flushAiSpokenText?.();
            
            console.log(`LCH Facade (${functionName}): Calling endLiveCall due to unexpected close. Recap: ${!!wasClean}`);
            endLiveCall(!!wasClean); // This will now also attempt to close virtual-calling-screen
        } else {
            console.log(`LCH Facade (${functionName}): Close called, but no active session reported by state manager. Performing minimal cleanup.`);
            // BUG FIX START: Also try to close virtual calling screen here just in case it's stuck from a previous failed attempt
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            }
            // BUG FIX END
            deps.liveApiMicInput?.stopCapture?.();
            deps.liveApiAudioOutput?.cleanupAudioContext?.();
            deps.liveApiTextCoordinator?.resetBuffers?.();
        }
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): FINISHED processing close.`);
    }
    
    console.log(`live_call_handler.js (Facade ${FACADE_VERSION}): IIFE FINISHED.`);
    return {
        startLiveCall,
        endLiveCall,
        sendTypedTextDuringLiveCall,
        toggleMicMuteForLiveCall,
        toggleSpeakerMuteForLiveCall,
        requestActivityForLiveCall
    };
})();

if (window.liveCallHandler && typeof window.liveCallHandler.startLiveCall === 'function') {
    console.log(`live_call_handler.js (Facade Debug v2.1): SUCCESSFULLY assigned to window.`);
} else {
    console.error(`live_call_handler.js (Facade Debug v2.1): CRITICAL ERROR - window.liveCallHandler not correctly formed.`);
}
console.log("live_call_handler.js: Script execution FINISHED (Facade Debug v2.1).");