// js/sessions/live_call_handler.js
// FACADE for Live API call logic. Coordinates specialized live call sub-modules.
// Enhanced debugging for "does not open" issue.

console.log("live_call_handler.js: Script execution STARTED (Facade Debug v2).");

if (window.liveCallHandler) {
    console.warn("live_call_handler.js: window.liveCallHandler ALREADY DEFINED. Possible double load or script issue.");
}

window.liveCallHandler = (() => {
    'use strict';
    const FACADE_VERSION = "Debug v2.1";
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
        // Simple check for critical global objects at the point of use
        if (!window.domElements) console.error(`LCH Facade (${functionName}): Global window.domElements is MISSING!`);
        // ... (add more global checks if needed for things like polyglotHelpers, etc.)
        return deps;
    };

    let currentConnector = null;
    let currentSessionType = null;
    let isMicEffectivelyMuted = true;
    let isAiSpeakerMuted = false;

    function buildLiveApiSystemInstruction(connector) {
        const functionName = "buildLiveApiSystemInstruction";
        // console.log(`LCH Facade (${functionName}): Building for connector ${connector?.id}`);
        const { conversationManager } = getDeps(functionName); // Get deps *inside* if it relies on them

        if (!connector) {
            console.warn(`LCH Facade (${functionName}): Connector undefined. RETURNING GENERIC PROMPT.`);
            return { parts: [{ text: "You are a helpful assistant. Please be concise and conversational." }] };
        }

        if (!conversationManager || typeof conversationManager.ensureConversationRecord !== 'function') {
            console.error(`LCH Facade (${functionName}): conversationManager (or .ensureConversationRecord) missing! Building basic fallback.`);
            let personaDetails = `You are ${connector.profileName || 'a language partner'}, primarily speaking ${connector.language || 'English'}.`;
            const fullInstruction = `${personaDetails} Keep your responses conversational. Do not mention being an AI.`;
            console.log(`LCH Facade (${functionName}): RETURNING BASIC FALLBACK PROMPT: "${fullInstruction.substring(0,50)}..."`);
            return { parts: [{ text: fullInstruction }] };
        }

        try {
            const { conversation: convo } = conversationManager.ensureConversationRecord(connector.id, connector);
            if (convo?.geminiHistory?.[0]?.parts?.[0]?.text) {
                const promptText = convo.geminiHistory[0].parts[0].text;
                console.log(`LCH Facade (${functionName}): RETURNING RICH PROMPT from geminiHistory: "${promptText.substring(0,50)}..."`);
                return { parts: [{ text: promptText }] };
            }
        } catch (e) {
            console.error(`LCH Facade (${functionName}): Error in ensureConversationRecord or accessing geminiHistory:`, e);
            // Fall through to build manual prompt
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
        console.log(`LCH Facade (${functionName}): RETURNING MANUALLY BUILT FALLBACK PROMPT: "${fullIns.substring(0,50)}..."`);
        return { parts: [{ text: fullIns }] };
    }
    
    function initializeCallUI(connector, sessionType) {
        const functionName = "initializeCallUI";
        // console.log(`LCH Facade (${functionName}): Type: ${sessionType}, Connector: ${connector?.id}`);
        const { uiUpdater, domElements, modalHandler } = getDeps(functionName);

        if (!domElements || !uiUpdater || !modalHandler) {
            console.error(`LCH Facade (${functionName}): Missing UI deps. Cannot initialize UI.`);
            return; // Abort UI initialization
        }

        let modalToOpenId = null;
        let modalElement = null;

        if (sessionType === "direct_modal") {
            modalToOpenId = 'directCallInterface';
            modalElement = domElements.directCallInterface;
            if (!modalElement) { console.error(`LCH Facade (${functionName}): domElements.directCallInterface missing!`); return; }
            uiUpdater.updateDirectCallHeader?.(connector);
            uiUpdater.clearDirectCallActivityArea?.();
            uiUpdater.updateDirectCallStatus?.("Live Call Connected", false); 
            uiUpdater.updateDirectCallMicButtonVisual?.(isMicEffectivelyMuted); 
            uiUpdater.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
        } else if (sessionType === "voiceChat_modal") { 
            modalToOpenId = 'voiceEnabledChatInterface';
            modalElement = domElements.voiceEnabledChatInterface;
            if (!modalElement) { console.error(`LCH Facade (${functionName}): domElements.voiceEnabledChatInterface missing!`); return; }
            uiUpdater.updateVoiceChatHeader?.(connector);
            uiUpdater.clearVoiceChatLog?.();
            uiUpdater.resetVoiceChatInput?.();
            if (domElements.toggleVoiceChatTTSBtn) uiUpdater.updateTTSToggleButtonVisual?.(domElements.toggleVoiceChatTTSBtn, isAiSpeakerMuted);
            domElements.voiceChatTextInput?.focus();
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

        // Step 1: Check all critical dependencies upfront
        const requiredDepNames = [
            'geminiLiveApiService', 'sessionStateManager', 'conversationManager', 
            'liveApiMicInput', 'liveApiAudioOutput', 'liveApiTextCoordinator', 
            'uiUpdater', 'domElements', 'modalHandler', 'polyglotHelpers'
        ];
        for (const depName of requiredDepNames) {
            if (!deps[depName]) {
                console.error(`LCH Facade (${functionName}): ABORT! CRITICAL DEPENDENCY '${depName}' IS MISSING.`);
                alert(`Live call error: Core component '${depName}' missing (LCH-S01). Please check console and script loading order.`);
                deps.sessionStateManager?.resetBaseSessionState?.(); // Attempt cleanup
                return false;
            }
            // Check initialize for sub-modules
            if (['liveApiMicInput', 'liveApiAudioOutput', 'liveApiTextCoordinator'].includes(depName)) {
                if (typeof deps[depName].initialize !== 'function') {
                    console.error(`LCH Facade (${functionName}): ABORT! Sub-module '${depName}' MISSING 'initialize' METHOD.`);
                    alert(`Live call error: Sub-component '${depName}' broken (LCH-S02).`);
                    deps.sessionStateManager?.resetBaseSessionState?.();
                    return false;
                }
            }
        }
        console.log(`LCH Facade (${functionName}): All dependencies appear present.`);

        // Step 2: Initialize sub-modules
        console.log(`LCH Facade (${functionName}): Initializing sub-modules...`);
        if (!deps.liveApiMicInput.initialize(deps.geminiLiveApiService, () => isMicEffectivelyMuted)) {
             console.error(`LCH Facade (${functionName}): ABORT! liveApiMicInput.initialize FAILED.`);
             deps.sessionStateManager.resetBaseSessionState?.(); return false; 
        }
        if (!deps.liveApiAudioOutput.initialize(() => isAiSpeakerMuted)) {
             console.error(`LCH Facade (${functionName}): ABORT! liveApiAudioOutput.initialize FAILED.`);
             deps.sessionStateManager.resetBaseSessionState?.(); return false; 
        }
        if (!deps.liveApiTextCoordinator.initialize(deps.sessionStateManager, deps.polyglotHelpers, deps.uiUpdater)) {
             console.error(`LCH Facade (${functionName}): ABORT! liveApiTextCoordinator.initialize FAILED.`);
             deps.sessionStateManager.resetBaseSessionState?.(); return false; 
        }
        deps.liveApiTextCoordinator.setCurrentSessionTypeContext(sessionType); // Essential
        deps.liveApiTextCoordinator.resetBuffers(); // Ensure clean start
        console.log(`LCH Facade (${functionName}): Sub-modules initialized.`);

        // Step 3: Set internal state
        currentConnector = connector;
        currentSessionType = sessionType;
        isMicEffectivelyMuted = false; // Default to open mic for live API
        isAiSpeakerMuted = false;     
        console.log(`LCH Facade (${functionName}): Internal state set. MicMuted: ${isMicEffectivelyMuted}, SpeakerMuted: ${isAiSpeakerMuted}`);

        // Step 4: Initialize base session state (shows virtual calling screen)
        console.log(`LCH Facade (${functionName}): Calling sessionStateManager.initializeBaseSession...`);
        if (!deps.sessionStateManager.initializeBaseSession(connector, sessionType)) {
            console.error(`LCH Facade (${functionName}): ABORT! sessionStateManager.initializeBaseSession FAILED.`);
            // This function should handle its own alerts/UI if session is already active.
            return false;
        }
        console.log(`LCH Facade (${functionName}): sessionStateManager.initializeBaseSession successful.`);

        // Step 5: Build System Instruction
        const systemInstructionObject = buildLiveApiSystemInstruction(connector);
        if (!systemInstructionObject?.parts?.[0]?.text?.trim()) { // Check for empty/whitespace text too
            console.error(`LCH Facade (${functionName}): ABORT! Failed to build a valid, non-empty system instruction.`);
            deps.uiUpdater?.updateDirectCallStatus?.("Setup Error (Sys. Prompt)", true);
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            deps.sessionStateManager.resetBaseSessionState();
            return false;
        }
        console.log(`LCH Facade (${functionName}): System instruction built successfully.`);
        
        // Step 6: Prepare Live API Config
        const liveApiModelName = connector.liveApiModelName || "gemini-2.0-flash-live-001"; // <<< CONFIRM THIS MODEL NAME
        console.log(`LCH Facade (${functionName}): Using Live API Model: '${liveApiModelName}'`);
        const liveApiSessionSetupConfig = { /* ... as in your previous working version ... */ }; // generationConfig, systemInstruction, etc.
        // For brevity, assuming this config is correct from your previous message.
        // Ensure `connector.liveApiVoiceName` and `connector.languageCode` are used.
         liveApiSessionSetupConfig.generationConfig = {
            responseModalities: ["AUDIO"],
            speechConfig: { 
                voiceConfig: { prebuiltVoiceConfig: { voiceName: connector.liveApiVoiceName || "Puck" } },
                languageCode: connector.languageCode
            }
        };
        liveApiSessionSetupConfig.systemInstruction = systemInstructionObject;
        liveApiSessionSetupConfig.realtimeInputConfig = { activityHandling: "START_OF_ACTIVITY_INTERRUPTS" };
        liveApiSessionSetupConfig.inputAudioTranscription = {};
        liveApiSessionSetupConfig.outputAudioTranscription = {};
        console.log(`LCH Facade (${functionName}): Live API Config:`, JSON.stringify(liveApiSessionSetupConfig).substring(0, 300) + "...");
        
        // Step 7: Define Callbacks
        const liveApiCallbacks = { /* ... as in your previous version, including onAiInterrupted ... */ };
         liveApiCallbacks.onOpen = handleLiveApiSessionOpen;
         liveApiCallbacks.onAiAudioChunk = deps.liveApiAudioOutput.handleReceivedAiAudioChunk;
         liveApiCallbacks.onAiText = deps.liveApiTextCoordinator.handleReceivedAiText;
         liveApiCallbacks.onUserTranscription = deps.liveApiTextCoordinator.handleReceivedUserTranscription;
         liveApiCallbacks.onModelTranscription = deps.liveApiTextCoordinator.handleReceivedModelTranscription;
         liveApiCallbacks.onAiInterrupted = handleAiInterrupted;
         liveApiCallbacks.onError = handleLiveApiError;
         liveApiCallbacks.onClose = handleLiveApiClose;
        console.log(`LCH Facade (${functionName}): Callbacks defined.`);

        // Step 8: Connect
        try {
            console.log(`LCH Facade (${functionName}): Attempting geminiLiveApiService.connect...`);
            const connectResult = await deps.geminiLiveApiService.connect(liveApiModelName, liveApiSessionSetupConfig, liveApiCallbacks);
            console.log(`LCH Facade (${functionName}): connectResult from service: ${!!connectResult}`);
            if (connectResult) { 
                console.log(`LCH Facade (${functionName}): Connect process INITIATED by service. Waiting for SDK 'onOpen'.`);
                return true; 
            } else { 
                console.error(`LCH Facade (${functionName}): ABORT! geminiLiveApiService.connect returned falsy.`);
                // This path should ideally be caught by an error throw in geminiLiveApiService if it fails to return a session
                throw new Error("geminiLiveApiService.connect returned falsy without throwing error.");
            }
        } catch (error) { 
            console.error(`LCH Facade (${functionName}): ABORT! Error DURING geminiLiveApiService.connect call:`, error);
            deps.uiUpdater?.updateDirectCallStatus?.("Connection Failed", true);
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            }
            deps.sessionStateManager.resetBaseSessionState();
            return false;
        }
    }

    // --- Other Public Methods (sendTypedText, toggles, requestActivity) ---
    // These should be largely the same as your "Complete Facade" version,
    // ensuring they use `deps.subModuleName?.methodName?.()` for safety.
    function endLiveCall(generateRecap = true) {
        const functionName = "endLiveCall";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): START. GenerateRecap: ${generateRecap}`);
        const deps = getDeps(functionName);

        deps.geminiLiveApiService?.closeConnection?.(); // Triggers SDK onClose eventually

        // Explicitly stop/cleanup sub-modules
        deps.liveApiMicInput?.stopCapture?.();
        deps.liveApiAudioOutput?.cleanupAudioContext?.();
        deps.liveApiTextCoordinator?.flushUserTranscription?.(); 
        deps.liveApiTextCoordinator?.flushAiSpokenText?.();
        // Consider deps.liveApiTextCoordinator?.resetBuffers?.(); if appropriate on every end.

        if (currentSessionType === "direct_modal" && deps.domElements?.directCallInterface && deps.modalHandler?.close) {
            deps.modalHandler.close(deps.domElements.directCallInterface);
        } else if (currentSessionType === "voiceChat_modal" && deps.domElements?.voiceEnabledChatInterface && deps.modalHandler?.close) {
             deps.modalHandler.close(deps.domElements.voiceEnabledChatInterface);
        }
        
        deps.sessionStateManager?.finalizeBaseSession?.(generateRecap); 
        currentConnector = null;
        currentSessionType = null;
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): FINISHED.`);
    }
    // Add other methods (sendTypedText, toggles, requestActivity) here, adapted like endLiveCall

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
        } // Add voiceChat_modal UI update if needed
        if (isMicEffectivelyMuted) deps.geminiLiveApiService?.sendAudioStreamEndSignal?.();
        // liveApiMicInput will pick up state via its () => isMicEffectivelyMuted function
    }

    function toggleSpeakerMuteForLiveCall() {
        const functionName = "toggleSpeakerMuteForLiveCall";
        const deps = getDeps(functionName);
        isAiSpeakerMuted = !isAiSpeakerMuted;
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): Speaker muted: ${isAiSpeakerMuted}`);
        if (currentSessionType === "direct_modal") deps.uiUpdater?.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
        // Add voiceChat_modal UI update if needed
        if (isAiSpeakerMuted) {
            deps.liveApiAudioOutput?.clearPlaybackQueue?.();
            deps.liveApiAudioOutput?.stopCurrentSound?.();
        }
    }
    function requestActivityForLiveCall() { /* Simplified - ensure all deps?.method?.() calls */ }


    // --- SDK Callback Handlers ---
    function handleLiveApiSessionOpen() {
        const functionName = "handleLiveApiSessionOpen (SDK_CB)";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): SDK onOpen FIRED.`);
        const deps = getDeps(functionName);
        
        if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
            deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            console.log(`LCH Facade (${functionName}): Virtual calling screen closed.`);
        } else {
            console.warn(`LCH Facade (${functionName}): Virtual calling screen or modalHandler.close not available.`);
        }

        if (!deps.sessionStateManager?.markSessionAsStarted()) {
             console.error(`LCH Facade (${functionName}): sessionStateManager.markSessionAsStarted FAILED!`);
             // This is a critical failure, likely call should be aborted.
             handleLiveApiError(new Error("Failed to mark session as started in onOpen."));
             return;
        }
        console.log(`LCH Facade (${functionName}): Session marked as started.`);
        
        // isMicEffectivelyMuted and isAiSpeakerMuted should have been set in startLiveCall
        // initializeCallUI depends on these current values.
        initializeCallUI(currentConnector, currentSessionType); 
        console.log(`LCH Facade (${functionName}): Call UI initialized.`);
        
        if (deps.liveApiMicInput?.startCapture) {
            console.log(`LCH Facade (${functionName}): Calling liveApiMicInput.startCapture...`);
            deps.liveApiMicInput.startCapture(handleLiveApiError); // Pass the facade's error handler
        } else {
            console.error(`LCH Facade (${functionName}): CRITICAL! liveApiMicInput.startCapture is NOT AVAILABLE! Mic input will not work.`);
            handleLiveApiError(new Error("Microphone module 'startCapture' is missing.")); // Trigger full error handling
            return;
        }

        if (currentConnector?.greetingCall && deps.geminiLiveApiService?.sendClientText) {
            let greetingText = currentConnector.greetingCall;
            if (deps.polyglotHelpers?.stripEmojis) greetingText = deps.polyglotHelpers.stripEmojis(greetingText);
            deps.sessionStateManager?.addTurnToTranscript?.('connector-greeting-intent', currentConnector.greetingCall);
            if (greetingText.trim()) {
                console.log(`LCH Facade (${functionName}): Sending greeting: "${greetingText.substring(0,30)}..."`);
                deps.geminiLiveApiService.sendClientText(greetingText);
            }
        }
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): FINISHED.`);
    }

    function handleAiInterrupted() {
        const functionName = "handleAiInterrupted (SDK_CB)";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): AI speech interrupted.`);
        const { liveApiAudioOutput, liveApiTextCoordinator } = getDeps(functionName);
        liveApiAudioOutput?.clearPlaybackQueue?.();
        liveApiAudioOutput?.stopCurrentSound?.(); 
        liveApiTextCoordinator?.resetAiSpokenTextBuffer?.();
        console.log(`LCH Facade (${functionName}): Interruption processed.`);
    }

    function handleLiveApiError(error) {
        const functionName = "handleLiveApiError (SDK_CB)";
        console.error(`LCH Facade (${functionName} v${FACADE_VERSION}): Error received:`, error?.message || error, error);
        const { uiUpdater, liveApiTextCoordinator, sessionStateManager } = getDeps(functionName); 
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown Live API error');
        
        if (currentSessionType === "direct_modal" && uiUpdater?.updateDirectCallStatus) {
            uiUpdater.updateDirectCallStatus(`Error: ${errorMessage.substring(0,40)}...`, true);
        } // Add voiceChat_modal error display if needed

        liveApiTextCoordinator?.flushUserTranscription?.(); 
        liveApiTextCoordinator?.flushAiSpokenText?.();
        
        console.log(`LCH Facade (${functionName}): Calling endLiveCall(false) due to error.`);
        endLiveCall(false); // This will also call sessionStateManager.finalizeBaseSession -> resetBaseSessionState
        console.error(`LCH Facade (${functionName} v${FACADE_VERSION}): FINISHED error processing.`);
    }

    function handleLiveApiClose(wasClean, code, reason) {
        const functionName = "handleLiveApiClose (SDK_CB)";
        console.log(`LCH Facade (${functionName} v${FACADE_VERSION}): Connection closed. Clean: ${wasClean}, Code: ${code}, Reason: ${reason}`);
        const deps = getDeps(functionName);

        // Check if the session was genuinely active from this handler's perspective
        if (deps.sessionStateManager?.isSessionActive()) {
            console.warn(`LCH Facade (${functionName}): Connection closed by server/network while session was active according to state manager.`);
            const message = `Call ended: ${reason || 'Connection closed'} (Code: ${code || 'N/A'})`;
            if (currentSessionType === "direct_modal" && deps.uiUpdater) deps.uiUpdater.updateDirectCallStatus?.(message, !wasClean);
            // Add voiceChat_modal UI update if needed
            
            deps.liveApiTextCoordinator?.flushUserTranscription?.();
            deps.liveApiTextCoordinator?.flushAiSpokenText?.();
            
            console.log(`LCH Facade (${functionName}): Calling endLiveCall due to unexpected close. Recap generation: ${!!wasClean}`);
            endLiveCall(!!wasClean); // Generate recap if server closed cleanly, not if it was an abrupt error.
        } else {
            console.log(`LCH Facade (${functionName}): Close called, but sessionStateManager reports no active session (likely already ended by user/error). Performing minimal cleanup.`);
            // Still good to ensure sub-module cleanup if they weren't cleaned by a prior endLiveCall
            deps.liveApiMicInput?.stopCapture?.();
            deps.liveApiAudioOutput?.cleanupAudioContext?.();
            deps.liveApiTextCoordinator?.resetBuffers?.(); // Full reset if session wasn't active
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