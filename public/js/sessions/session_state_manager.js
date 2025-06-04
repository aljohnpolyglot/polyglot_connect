// js/sessions/session_state_manager.js
// Manages common state for modal sessions (ID, connector, type, transcript) and triggers recaps.

window.sessionStateManager = (() => {
    'use strict';

    // --- Robust Dependency Check at Load Time ---
    const criticalInitialDeps = {
        polyglotHelpers: window.polyglotHelpers,
    };
    if (!criticalInitialDeps.polyglotHelpers) {
        console.error("SessionStateManager: CRITICAL - polyglotHelpers not found at load time. Initialization and storage will fail.");
        const errorMsg = "SessionStateManager not initialized (missing helpers).";
        return {
            initializeBaseSession: () => { console.error(errorMsg); return false; },
            markSessionAsStarted: () => { console.error(errorMsg); return false; }, // Return false here too
            addTurnToTranscript: () => console.error(errorMsg),
            getCurrentTranscript: () => { console.error(errorMsg); return []; },
            getCurrentSessionDetails: () => { console.error(errorMsg); return null; },
            finalizeBaseSession: async () => console.error(errorMsg),
            resetBaseSessionState: () => console.error(errorMsg),
            isSessionActive: () => { console.error(errorMsg); return false; }
        };
    }
    
    const getDeps = () => ({
        domElements: window.domElements,
        modalHandler: window.modalHandler,
        uiUpdater: window.uiUpdater,
        polyglotHelpers: window.polyglotHelpers,
        aiService: window.aiService,
        sessionHistoryManager: window.sessionHistoryManager,
        aiApiConstants: window._aiApiConstants,
        conversationManager: window.conversationManager // <<< ADDED
    });



    let currentSession = {
        connector: null,
        sessionType: null,
        sessionId: null,
        startTime: null,
        transcript: []
    };
     function playRingtone() {
        const { domElements } = getDeps(); // Get domElements
        const ringtoneElement = domElements?.ringtoneAudio; // Assuming ringtoneAudio is in domElements
         console.log("SSM: Attempting to play ringtone. Element:", ringtoneElement); // <<< ADD THIS
       
         if (ringtoneElement && typeof ringtoneElement.play === 'function') {
            ringtoneElement.currentTime = 0; // Rewind to start
            ringtoneElement.play().catch(error => {
                // Autoplay might be blocked by the browser if user hasn't interacted yet.
                // This is common. You might log it or handle it silently.
                console.warn("Ringtone play() failed, possibly due to autoplay restrictions:", error);
            });
            console.log("SSM: Playing ringtone.");
        } else {
            console.warn("SSM: Ringtone audio element not found or not playable.");
        }
    }

    function stopRingtone() {
        const { domElements } = getDeps(); // Get domElements
        const ringtoneElement = domElements?.ringtoneAudio; // Assuming ringtoneAudio is in domElements

        if (ringtoneElement && typeof ringtoneElement.pause === 'function') {
            ringtoneElement.pause();
            ringtoneElement.currentTime = 0; // Reset for next time
            console.log("SSM: Stopped ringtone.");
        }
    }
    // NEW HELPER FUNCTION to log call events to the chat transcript
    function _logCallEventToChat(connectorId, eventType, text, duration = null, callSessionId = null) {
        const { conversationManager } = getDeps();
        if (!conversationManager || typeof conversationManager.addSystemMessageToConversation !== 'function') {
            console.warn("SSM: Cannot log call event - conversationManager or its addSystemMessageToConversation method is missing for connectorId:", connectorId);
            return;
        }
        if (!connectorId) {
            console.warn("SSM: Cannot log call event - connectorId is missing.");
            return;
        }

        const callEventMessage = {
            sender: 'system-call-event', // Special sender
            type: 'call_event',          // Special type for UI rendering
            eventType: eventType,        // e.g., 'call_started', 'call_ended', 'call_failed_user_attempt'
            text: text,                  // Display text for the event
            timestamp: Date.now(),
            callSessionId: callSessionId || currentSession.sessionId || null // Link to the call session
        };

        if (duration) {
            callEventMessage.duration = duration;
        }
        
        conversationManager.addSystemMessageToConversation(connectorId, callEventMessage);
        // console.log(`SSM: Logged call event '${eventType}' for connector '${connectorId}' to chat history.`);
    }
    function initializeBaseSession(connector, sessionType) {
        console.log(`SessionStateManager: initializeBaseSession for connector '${connector?.id}', Type: '${sessionType}'`);
        const { uiUpdater, domElements, modalHandler } = getDeps();

        if (!connector || !connector.id || !connector.profileName || !sessionType) {
            console.error("SessionStateManager: Invalid or incomplete connector data or sessionType for initialization.", {connector, sessionType});
            return false;
        }
        if (currentSession.sessionId) {
            console.warn(`SessionStateManager: Attempted to initialize new session while session '${currentSession.sessionId}' is already active. Please finalize or reset first.`);
            return false;
        }

        currentSession.connector = { ...connector };
        currentSession.sessionType = sessionType;
        currentSession.sessionId = `${connector.id}_${sessionType}_${Date.now()}`;
        currentSession.transcript = [];
        currentSession.startTime = null;

        if (uiUpdater && domElements?.virtualCallingScreen && modalHandler) {
            uiUpdater.updateVirtualCallingScreen(currentSession.connector, currentSession.sessionType);
            modalHandler.open(domElements.virtualCallingScreen);
            playRingtone(); // <<< ADD THIS LINE
        } else {
            console.error("SessionStateManager: Missing UI dependencies (uiUpdater, domElements.virtualCallingScreen, or modalHandler) for displaying virtual calling screen.");
        }
        console.log(`SessionStateManager: Base session '${currentSession.sessionId}' initialized.`);
        return true;
    }

  function markSessionAsStarted() {
    if (!currentSession.sessionId || !currentSession.connector) {
        console.warn("SSM: Cannot mark session as started, no active session ID or connector.");
        return false;
    }
    if (currentSession.startTime) {
        console.warn(`SSM: Session '${currentSession.sessionId}' was already marked as started. Ignoring duplicate call.`);
        return true; // Already started
    }
    stopRingtone();
    currentSession.startTime = new Date();
    console.log(`SSM: Session '${currentSession.sessionId}' marked STARTED at ${currentSession.startTime.toISOString()}`);
    
    // Log "Call Started" event to chat
    const connectorName = currentSession.connector.profileName || currentSession.connector.name || "Partner";
    _logCallEventToChat(
        currentSession.connector.id,
        'call_started', // eventType
        `You started a call with ${connectorName}.`, // text
        null, // duration
        currentSession.sessionId // callSessionId
    );
    
    return true;
}

    function addTurnToTranscript(sender, text, type = 'message') {
        if (!currentSession.sessionId) {
            return;
        }
        if (typeof text !== 'string') {
            console.warn(`SessionStateManager: Attempted to add non-string text to transcript for session '${currentSession.sessionId}'. Text:`, text);
            text = String(text || "[Non-text content]");
        }
        currentSession.transcript.push({
            sender: String(sender),
            text: text,
            type: String(type),
            timestamp: Date.now()
        });
    }

    function getCurrentTranscript() {
        return currentSession.sessionId ? [...currentSession.transcript] : [];
    }

    function getCurrentSessionDetails() {
        return currentSession.sessionId ? { ...currentSession } : null;
    }

    /**
     * Finalizes the current session by generating a recap (if requested) and storing it in session history.
     * @param {boolean} generateRecap - Whether to generate a recap using the aiService.
     * @returns {Promise<void>} 
     */
    async function finalizeBaseSession(generateRecap = true) {
        const functionName = "finalizeBaseSession";
        console.log(`SSM (${functionName}): Called. GenerateRecap: ${generateRecap}, Current SessionID: '${currentSession.sessionId}'`);
        const deps = getDeps();

        if (!currentSession.connector || !currentSession.sessionId) {
            console.warn(`SSM (${functionName}): No active session to finalize. Current session ID is null. Resetting state just in case.`);
            resetBaseSessionState(); 
            return;
        }
        stopRingtone();
        const callEndTime = new Date(); // Capture end time *before* resetting currentSession

        // Make a stable copy of the session to finalize
        const sessionToFinalize = { 
            ...currentSession, 
            transcript: [...currentSession.transcript], // Deep copy of transcript
            // Ensure startTime is ISO string or null, use Date object for calculations
            startTime: currentSession.startTime ? new Date(currentSession.startTime).toISOString() : null,
            endTime: callEndTime.toISOString() // Add endTime as ISO string
        };
        
        const previousSessionIdForLog = currentSession.sessionId; // For logging after reset
        resetBaseSessionState(); 
        console.log(`SSM (${functionName}): Global currentSession state has been reset. Finalizing session data for: ${sessionToFinalize.sessionId} (was ${previousSessionIdForLog})`);

        // --- Log Call Ended Event to Chat ---
        if (sessionToFinalize.startTime) { 
            const durationMs = new Date(sessionToFinalize.endTime).getTime() - new Date(sessionToFinalize.startTime).getTime();
            let durationFormatted = null;
            if (durationMs >= 1000) {
                 const totalSeconds = Math.round(durationMs / 1000);
                 const minutes = Math.floor(totalSeconds / 60);
                 const seconds = totalSeconds % 60;
                 durationFormatted = `${minutes}m ${seconds}s`;
            } else if (durationMs >= 0) { 
                 durationFormatted = "Less than 1s";
            }
            _logCallEventToChat(
                sessionToFinalize.connector.id,
                'call_ended',
                'The call ended.',
                durationFormatted,
                sessionToFinalize.sessionId
            );
        } else {
            console.warn(`SSM (${functionName}): Finalizing session '${sessionToFinalize.sessionId}' that had no startTime. "call_ended" event not logged to chat.`);
        }
        // --- End Log Call Ended Event ---

        if (generateRecap && (!deps.aiService || !deps.sessionHistoryManager || !deps.uiUpdater || !deps.modalHandler || !deps.domElements?.sessionRecapScreen || !deps.aiApiConstants)) {
            console.error(`SSM (${functionName}): Cannot generate recap (missing deps). Recap for '${sessionToFinalize.sessionId}' skipped.`);
            generateRecap = false; 
        }
        
        if (generateRecap) {
            const durationMs = sessionToFinalize.startTime && sessionToFinalize.endTime ? 
                               new Date(sessionToFinalize.endTime).getTime() - new Date(sessionToFinalize.startTime).getTime() : 0;
            const durationFormattedForRecap = `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;

            const initialRecapDataForUI = {
                sessionId: sessionToFinalize.sessionId,
                connectorId: sessionToFinalize.connector.id,
                connectorName: sessionToFinalize.connector.profileName || sessionToFinalize.connector.name || "Partner",
                connector: { ...sessionToFinalize.connector },
                date: sessionToFinalize.startTime ? new Date(sessionToFinalize.startTime).toLocaleDateString() : new Date().toLocaleDateString(),
                startTimeISO: sessionToFinalize.startTime, 
                endTimeISO: sessionToFinalize.endTime,     
                duration: durationFormattedForRecap,
                rawTranscript: sessionToFinalize.transcript,
                sessionType: sessionToFinalize.sessionType,
                conversationSummary: "Generating summary, please wait...",
                keyTopicsDiscussed: ["Generating..."], 
                newVocabularyAndPhrases: [], // Start with empty arrays
                goodUsageHighlights: [], 
                areasForImprovement: [], 
                suggestedPracticeActivities: [], 
                overallEncouragement: "Analyzing your conversation..."
            };

            console.log(`SSM (${functionName}): Transcript for session '${sessionToFinalize.sessionId}' (${sessionToFinalize.transcript.length} turns) sent for recap:`, JSON.stringify(sessionToFinalize.transcript).substring(0, 200) + "...");

            if (deps.uiUpdater?.populateRecapModal && deps.modalHandler?.open && deps.domElements?.sessionRecapScreen) {
                deps.uiUpdater.populateRecapModal(initialRecapDataForUI);
                deps.modalHandler.open(deps.domElements.sessionRecapScreen);
            } else {
                console.error(`SSM (${functionName}): Cannot display initial recap modal (missing UI components).`);
            }

            try {
                console.log(`SSM (${functionName}): Requesting recap from aiService (Preferred: ${deps.aiApiConstants?.PROVIDERS?.GROQ || 'Default'}) for session: '${sessionToFinalize.sessionId}'`);
                const aiGeneratedRecap = await deps.aiService.generateSessionRecap(
                    sessionToFinalize.transcript,
                    sessionToFinalize.connector,
                    deps.aiApiConstants?.PROVIDERS?.GROQ // Default to Groq if constant available
                );
                
                // Merge AI recap with initial data, AI fields will overwrite placeholders
                const finalRecapForStorageAndUI = { 
                    ...initialRecapDataForUI, 
                    ...aiGeneratedRecap // This will overwrite summary, topics, etc.
                };
                
                deps.sessionHistoryManager?.addCompletedSession?.(finalRecapForStorageAndUI);
                deps.uiUpdater?.populateRecapModal?.(finalRecapForStorageAndUI);
                console.log(`SSM (${functionName}): Recap generated for '${sessionToFinalize.sessionId}'.`);

            } catch (recapError) { 
                console.error(`SSM (${functionName}): Error during aiService.generateSessionRecap for '${sessionToFinalize.sessionId}':`, recapError);
                // Construct a full error fallback recap object based on initialRecapDataForUI
                const errorFallbackRecap = {
                    ...initialRecapDataForUI, // Keep base details like sessionId, connectorName, date, times, duration, rawTranscript
                    conversationSummary: "An error occurred while generating the detailed debrief. Please check the console for more information.",
                    keyTopicsDiscussed: ["Error generating details"], 
                    newVocabularyAndPhrases: [], // Empty arrays for consistency
                    goodUsageHighlights: [], 
                    areasForImprovement: [], 
                    suggestedPracticeActivities: [], 
                    overallEncouragement: "We apologize for the inconvenience. The session transcript should still be available for download."
                };
                deps.sessionHistoryManager?.addCompletedSession?.(errorFallbackRecap); // Save the error state to history
                deps.uiUpdater?.populateRecapModal?.(errorFallbackRecap); // Update UI with error state
            }
        } else { // generateRecap is false (or became false due to missing deps)
            console.log(`SSM (${functionName}): Recap generation SKIPPED for session '${sessionToFinalize.sessionId}'.`);
            // Still save a minimal session object to history if there was a transcript and sessionHistoryManager is available
            if (sessionToFinalize.transcript && sessionToFinalize.transcript.length > 0 && deps.sessionHistoryManager?.addCompletedSession) {
                 const durationMs = sessionToFinalize.startTime && sessionToFinalize.endTime ? 
                                    new Date(sessionToFinalize.endTime).getTime() - new Date(sessionToFinalize.startTime).getTime() : 0;
                 const durationFormattedMinimal = `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;

                 const minimalSessionEntry = {
                    sessionId: sessionToFinalize.sessionId,
                    connectorId: sessionToFinalize.connector.id,
                    connectorName: sessionToFinalize.connector.profileName || "Partner",
                    connector: { ...sessionToFinalize.connector }, // Store full connector object
                    date: sessionToFinalize.startTime ? new Date(sessionToFinalize.startTime).toLocaleDateString() : new Date().toLocaleDateString(),
                    startTimeISO: sessionToFinalize.startTime, // ISO string
                    endTimeISO: sessionToFinalize.endTime,     // ISO string
                    duration: durationFormattedMinimal,
                    rawTranscript: sessionToFinalize.transcript, 
                    sessionType: sessionToFinalize.sessionType,
                    // No AI generated fields, provide clear placeholders
                    conversationSummary: "Recap was not generated for this session.",
                    keyTopicsDiscussed: [], // Empty arrays for consistency
                    newVocabularyAndPhrases: [], 
                    goodUsageHighlights: [], 
                    areasForImprovement: [], 
                    suggestedPracticeActivities: [], 
                    overallEncouragement: ""
                };
                deps.sessionHistoryManager.addCompletedSession(minimalSessionEntry);
            }
        }
    }

    function resetBaseSessionState() {
        stopRingtone(); // <<< ADD THIS LINE
        console.log(`SessionStateManager: Resetting base session state. Previous session ID was: '${currentSession.sessionId || 'none'}'`);
        currentSession = {
            connector: null, sessionType: null, sessionId: null,
            startTime: null, transcript: []
        };
    }

    function isSessionActive() {
        return !!currentSession.sessionId;
    }
    function recordFailedCallAttempt(connector, reason = "could not connect") {
    const functionName = "recordFailedCallAttempt";
    if (!connector || !connector.id) {
        console.warn(`SSM (${functionName}): Invalid connector data. Cannot record failed call.`);
        return;
    }
    stopRingtone(); // <<< ADD THIS LINE
    console.log(`SSM (${functionName}): Recording FAILED call attempt with ${connector.profileName}. Reason: ${reason}`);
    
    // Use the same session ID that might have been partially created if initializeBaseSession was called
    const callIdForEvent = currentSession.sessionId && currentSession.connector?.id === connector.id ? 
                           currentSession.sessionId : 
                           `${connector.id}_direct_modal_failed_${Date.now()}`; // Fallback ID

    _logCallEventToChat(
        connector.id,
        'call_failed_user_attempt', // eventType
        `Your call to ${connector.profileName || 'Partner'} ${reason}.`, // text
        null, // duration
        callIdForEvent // callSessionId
    );
    
    // Ensure any partially initialized session state for THIS failed call is reset.
    // This is important if initializeBaseSession was called but markSessionAsStarted was not.
    // ... (inside recordFailedCallAttempt function) ...
    if (currentSession.sessionId && currentSession.connector?.id === connector.id) {
        console.log(`SSM (${functionName}): Resetting partially initialized session state for failed call to ${connector.id}`);
        resetBaseSessionState();
    }
} // This is the end of recordFailedCallAttempt

// THE EXTRA BRACE WAS HERE AND IS NOW REMOVED

if (window.polyglotHelpers) { 
    console.log("js/sessions/session_state_manager.js loaded successfully, now uses aiService for recaps.");
} else {
    console.error("js/sessions/session_state_manager.js loaded, BUT polyglotHelpers WAS MISSING. Some functionalities might be impaired.");
}

return {
    initializeBaseSession,
    markSessionAsStarted,
    addTurnToTranscript,
    getCurrentTranscript,
    getCurrentSessionDetails,
    finalizeBaseSession,
    resetBaseSessionState,
    isSessionActive,
    recordFailedCallAttempt 
};
})(); // End of IIFE

if (window.sessionStateManager?.initializeBaseSession) {
    console.log("session_state_manager.js (Enhanced Logging): SUCCESSFULLY assigned.");
} else {
    console.error("session_state_manager.js (Enhanced Logging): CRITICAL ERROR - not correctly formed.");
}
console.log("session_state_manager.js: Script execution FINISHED (Enhanced Logging).");


