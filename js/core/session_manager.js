// js/core/session_manager.js (FACADE)
// Acts as a facade for different types of session management.

window.sessionManager = (() => {
    'use strict';

    // These are the specialized handlers/managers
    const getDeps = () => ({
        sessionStateManager: window.sessionStateManager,
        liveCallHandler: window.liveCallHandler,
        sessionHistoryManager: window.sessionHistoryManager,
        uiUpdater: window.uiUpdater, // Still needed for some direct UI updates not tied to a specific session type
        modalHandler: window.modalHandler, // For virtual calling screen & recap modal if not handled by state manager
        domElements: window.domElements, // For virtual calling screen & recap modal
    });

    function initialize() {
        const { sessionHistoryManager } = getDeps();
        sessionHistoryManager?.initializeHistory(); // Initializes completedSessions
        console.log("SessionManager (Facade): Initialized. History manager initialized.");
    }

    // This function decides which specific handler to use
    async function startModalSession(connector, sessionTypeWithContext) {
        console.log("SessionManager (Facade): startModalSession - Type:", sessionTypeWithContext);
        const { liveCallHandler, sessionStateManager, modalHandler, domElements } = getDeps();

        if (sessionStateManager?.isSessionActive()) {
            alert("Another session is already active. Please end it first.");
            return;
        }

        // For "direct_modal", we want to use the Live API
        if (sessionTypeWithContext === "direct_modal" && liveCallHandler?.startLiveCall) {
            const success = await liveCallHandler.startLiveCall(connector, sessionTypeWithContext);
            if (!success) {
                console.error("SessionManager (Facade): Live call failed to start.");
                // Ensure virtual calling screen is closed if it was opened by state manager but call failed early
                if (domElements?.virtualCallingScreen) modalHandler.close(domElements.virtualCallingScreen);
            }
        } else if (sessionTypeWithContext === "message_modal") {
            // This is handled by chatManager.openMessageModal, not sessionManager.
            console.warn("SessionManager (Facade): 'message_modal' should be handled by chatManager.");
            window.chatManager?.openMessageModal(connector);
        } else {
            console.error("SessionManager (Facade): Unknown or unhandled session type:", sessionTypeWithContext);
            alert("Unsupported session type.");
        }
    }

    function endCurrentModalSession(generateRecap = true) {
        console.log("SessionManager (Facade): endCurrentModalSession called.");
        const { liveCallHandler, sessionStateManager } = getDeps();
        if (sessionStateManager?.isSessionActive()) {
            liveCallHandler?.endLiveCall(generateRecap);
        } else {
            console.warn("SessionManager (Facade): No active session to end.");
        }
    }

    function cancelModalCallAttempt() {
    const functionName = "cancelModalCallAttempt";
    console.log(`SessionManager (Facade - ${functionName}): Called.`);
    const { sessionStateManager, liveCallHandler, modalHandler, domElements } = getDeps();

    if (domElements?.virtualCallingScreen && modalHandler?.close) {
        modalHandler.close(domElements.virtualCallingScreen);
    }

    // Get connector details *before* resetting everything, if a session was partially initialized
    const currentSessionDetails = sessionStateManager?.getCurrentSessionDetails?.();
    const connectorForCancelledCall = currentSessionDetails?.connector;

    // Ensure any Live API attempt is fully torn down.
    // endLiveCall will call finalizeBaseSession, which will log "call ended".
    // If we want a more specific "call cancelled" message, we need to prevent that.
    // For now, let's assume endLiveCall is okay, but it means the chat log might get "call started" then "call ended" quickly.

    liveCallHandler?.endLiveCall(false); // This calls finalizeBaseSession -> _logCallEventToChat("call_ended")

    // If we want to be more precise and log "cancelled" instead of "ended" for this scenario:
    if (connectorForCancelledCall && sessionStateManager?.recordFailedCallAttempt) {
        // This will log a "call_failed_user_attempt" with "was cancelled".
        // However, endLiveCall -> finalizeBaseSession might have *already* logged "call_ended"
        // if markSessionAsStarted was hit before cancellation. This can get complex.
        // For simplicity, endLiveCall(false) already handles cleanup and basic logging.
        // If the call *never truly started* (startTime not set in sessionStateManager), 
        // finalizeBaseSession won't log "call_ended" with a duration.
        console.log(`SessionManager (Facade - ${functionName}): Call attempt for ${connectorForCancelledCall.id} cancelled by user.`);
        // If liveCallHandler.endLiveCall already reset the state via finalizeBaseSession,
        // calling recordFailedCallAttempt again might be redundant or log a new event for an already cleared session.
        // A cleaner way might be for liveCallHandler.endLiveCall to accept a "reason"
        // and then sessionStateManager.finalizeBaseSession can use that reason.
    } else {
        // If no connector info was available, just ensure state is reset.
         sessionStateManager?.resetBaseSessionState?.();
    }
     console.log(`SessionManager (Facade - ${functionName}): Finished processing cancellation.`);
}

    function handleDirectCallMicToggle() {
        getDeps().liveCallHandler?.toggleMicMuteForLiveCall();
    }

    function toggleDirectCallSpeaker() {
        getDeps().liveCallHandler?.toggleSpeakerMuteForLiveCall();
    }

    function handleDirectCallActivityRequest() {
        getDeps().liveCallHandler?.requestActivityForLiveCall();
    }

    console.log("js/core/session_manager.js (FACADE) loaded.");
    return {
        initialize,
        startModalSession,
        endCurrentModalSession,
        cancelModalCallAttempt,
        // Methods for UI interaction buttons
        handleDirectCallMicToggle,
        toggleDirectCallSpeaker,
        handleDirectCallActivityRequest,
        // Expose history methods directly from sessionHistoryManager
        getCompletedSessions: () => getDeps().sessionHistoryManager?.getCompletedSessions(),
        downloadTranscriptForSession: (sessionId) => getDeps().sessionHistoryManager?.downloadTranscript(sessionId),
    };
})();