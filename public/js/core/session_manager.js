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
        console.log("SessionManager (Facade): cancelModalCallAttempt called.");
        const { sessionStateManager, liveCallHandler, modalHandler, domElements } = getDeps();

        // Close virtual calling screen if open
        if (domElements?.virtualCallingScreen) modalHandler.close(domElements.virtualCallingScreen);

        liveCallHandler?.endLiveCall(false); // Ensure any partial Live API setup is torn down
        sessionStateManager?.resetBaseSessionState(); // Reset the generic state
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