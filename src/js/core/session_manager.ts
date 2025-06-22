// D:\polyglot_connect\src\js\core\session_manager.ts
import type {
    SessionStateManager,
    LiveCallHandler,
    SessionHistoryManager,
    UiUpdater,
    ModalHandler,
    YourDomElements,
    Connector,
    ChatOrchestrator, // For window.chatManager
    SessionData,
 // ViewManager, // Obsolete
      ViewActionCoordinatorModule, // <<< ADD THIS
    RecapData // Needed for the error recap structure
} from '../types/global.d.ts';

console.log('session_manager.ts: Script loaded, waiting for core dependencies (TS Version).');

interface SessionManagerModule {
    initialize: () => void;
    startModalSession: (connector: Connector, sessionTypeWithContext: string) => Promise<void>;
    endCurrentModalSession: (generateRecap?: boolean) => void;
    cancelModalCallAttempt: () => void;
    handleDirectCallMicToggle: () => void;
    toggleDirectCallSpeaker: () => void;
    handleDirectCallActivityRequest?: () => void;
    getCompletedSessions: () => SessionData[] | undefined;
    downloadTranscriptForSession: (sessionId: string) => void;
    showSessionRecapInView: (sessionDataOrId: SessionData | string) => void;
}

// --- START OF REPLACEMENT (SM.1) ---
window.sessionManager = {} as SessionManagerModule;
console.log('session_manager.ts: Placeholder window.sessionManager assigned.');
document.dispatchEvent(new CustomEvent('sessionManagerPlaceholderReady'));
console.log('session_manager.ts: "sessionManagerPlaceholderReady" event dispatched.');
// --- END OF REPLACEMENT (SM.1) ---

function initializeActualSessionManager(): void {
    console.log("session_manager.ts: initializeActualSessionManager() called.");

    // Define VerifiedDeps type for clarity
    type VerifiedDeps = {
        sessionStateManager: SessionStateManager;
        liveCallHandler: LiveCallHandler;
        sessionHistoryManager: SessionHistoryManager;
        uiUpdater: UiUpdater;
        modalHandler: ModalHandler;
        domElements: YourDomElements;
        chatManager?: ChatOrchestrator; // Optional, for message_modal delegation
      viewActionCoordinator: Partial<ViewActionCoordinatorModule>; // Or just `object`
      // viewManager?: ViewManager;     // Obsolete
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = {
            sessionStateManager: window.sessionStateManager,
            liveCallHandler: window.liveCallHandler,
            sessionHistoryManager: window.sessionHistoryManager,
            uiUpdater: window.uiUpdater,
            modalHandler: window.modalHandler,
            domElements: window.domElements,
            chatManager: window.chatManager,
        // viewManager: window.viewManager, // Obsolete
             viewActionCoordinator: window.viewActionCoordinator
        };
        const missing: string[] = [];

        if (!deps.sessionStateManager?.isSessionActive) missing.push("sessionStateManager.isSessionActive");
        if (!deps.liveCallHandler?.startLiveCall) missing.push("liveCallHandler.startLiveCall");
        if (!deps.sessionHistoryManager?.initializeHistory) missing.push("sessionHistoryManager.initializeHistory");
        if (!deps.uiUpdater?.populateRecapModal) missing.push("uiUpdater.populateRecapModal"); // Key for showSessionRecapInView
        if (!deps.modalHandler?.open) missing.push("modalHandler.open"); // Key for showSessionRecapInView
        if (!deps.domElements?.sessionRecapScreen) missing.push("domElements.sessionRecapScreen"); // Key for showSessionRecapInView
        // chatManager and viewManager are less critical for the core of SessionManager if their usage is optional/guarded
        if (deps.chatManager && typeof deps.chatManager.openMessageModal !== 'function') console.warn("SM: chatManager present but openMessageModal missing.");
   if (!deps.viewActionCoordinator) missing.push("viewActionCoordinator (placeholder existence)");
        if (missing.length > 0) {
            console.error(`SessionManager (getSafeDeps): MISSING/INVALID functional dependencies: ${missing.join(', ')}.`);
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();
    if (!resolvedDeps) {
        console.error("session_manager.ts: CRITICAL - Core functional dependencies not met. Placeholder remains.");
        document.dispatchEvent(new CustomEvent('sessionManagerReady'));
        console.warn('session_manager.ts: "sessionManagerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('session_manager.ts: Core functional dependencies appear ready.');

    const serviceMethods = ((): SessionManagerModule => {
        'use strict';
        console.log("session_manager.ts: IIFE (module definition) STARTING.");

        // Destructure all necessary dependencies from the non-null resolvedDeps!
        const {
            sessionStateManager, liveCallHandler, sessionHistoryManager,
            uiUpdater, modalHandler, domElements, chatManager , viewActionCoordinator

            // viewManager is not directly used by the methods below after refactoring showSessionRecapInView
        } = resolvedDeps; // No '!' needed here if resolvedDeps is type VerifiedDeps

        function initialize(): void {
            // sessionHistoryManager.initializeHistory(); // REMOVED - SHM self-initializes its data loading
        
            // It's still the SessionManager's role to ensure the UI related to session history
            // (like the summary list) is updated once SessionManager itself is ready.
            const shm = window.sessionHistoryManager;
            if (shm && typeof shm.updateSummaryListUI === 'function') {
                console.log("SM: initialize() is now triggering shm.updateSummaryListUI()");
                shm.updateSummaryListUI();
            } else {
                console.warn("SM: initialize() - sessionHistoryManager or its updateSummaryListUI method not available.");
            }
            console.log("SessionManager (TS Facade): Initialized.");
        }

    // CORRECTED REPLACEMENT for session_manager.ts
// In src/js/core/session_manager.ts
// In src/js/core/session_manager.ts
// In session_manager.ts

// In session_manager.ts
// Ensure resolvedDeps is in scope from the outer IIFE, providing:
// const {
//     sessionStateManager, liveCallHandler, /*...,*/ modalHandler, domElements
// } = resolvedDeps;

async function startModalSession(connector: Connector, sessionTypeWithContext: string): Promise<void> {
  
    if (sessionStateManager.isSessionActive()) {
        console.warn(`SessionManager: startModalSession called for ${connector.id} (${sessionTypeWithContext}) but a session is ALREADY ACTIVE. Aborting new call attempt.`);
        // Optionally, provide user feedback if this happens due to user action
        // alert("A call is already in progress or being connected.");
        return;
    }
  
    console.log("SessionManager (TS Facade): startModalSession - Type:", sessionTypeWithContext);

    // sessionStateManager is already checked by resolvedDeps, so direct usage is fine
    if (sessionStateManager.isSessionActive()) {
        alert("Another session is already active. Please end it first.");
        return;
    }

    if (sessionTypeWithContext === "message_modal") {
        // chatManager is optional in resolvedDeps, so check it or use optional chaining
        chatManager?.openMessageModal?.(connector);
        return;
    }

    if (sessionTypeWithContext === "direct_modal") {
        // --- CRITICAL FIX AREA ---
        // 1. Await usage check and potential upgrade modal
        const { checkAndIncrementUsage } = await import('../core/usageManager'); // Assuming path
        const { openUpgradeModal } = await import('../ui/modalUtils');       // Only import openUpgradeModal

        const usageResult = await checkAndIncrementUsage('voiceCalls');
        if (!usageResult.allowed) {
            console.log("SessionManager: User has reached voice call limit.");

            // Determine which upgrade modal might be open (based on how openUpgradeModal works)
            // and close it using the generic modalHandler.
            // We assume 'call' type was the last one potentially opened if we are here.
            const potentiallyOpenUpgradeModal = domElements.upgradeCallLimitModal; // From YourDomElements

            if (potentiallyOpenUpgradeModal && modalHandler.close) { // modalHandler is from resolvedDeps
                // Check if it's actually visible before trying to close (optional, but can prevent noise)
                // if (modalHandler.isVisible?.(potentiallyOpenUpgradeModal)) {
                //    modalHandler.close(potentiallyOpenUpgradeModal);
                //    console.log("SessionManager: Closed existing call upgrade modal before showing new/updated one.");
                // }
                // For simplicity, just try to close it if it exists. modalHandler.close should be idempotent.
                modalHandler.close(potentiallyOpenUpgradeModal);
            }
            // Also consider the text limit modal, though less likely in this flow
            if (domElements.upgradeLimitModal && modalHandler.close) { // USES domElements & modalHandler
                modalHandler.close(domElements.upgradeLimitModal);
            }

            openUpgradeModal('call', usageResult.daysUntilReset);
            return; // EXIT EARLY - DO NOT PROCEED TO CALL
        }
        // If we reach here, user is allowed to make the call.

        // 2. NOW, initialize session state (which shows virtualCallingScreen & starts ringtone)
        // sessionStateManager is from resolvedDeps
        const sessionInitialized = sessionStateManager.initializeBaseSession(
            connector,
            sessionTypeWithContext
            // The 4th arg (skipModalManagement) defaults to false, so SSM will try to open virtualCallingScreen
        );

        if (!sessionInitialized) {
            console.error("SM: Failed to initialize base session state (e.g., virtualCallingScreen failed to open).");
            // sessionStateManager.initializeBaseSession should handle its own cleanup if it returns false.
            return;
        }

        // 3. Then, attempt to start the live call (backend connection)
        try {
            // liveCallHandler is from resolvedDeps
            const callStarted = await liveCallHandler.startLiveCall(connector, sessionTypeWithContext);
            if (!callStarted) {
                console.error("SM: liveCallHandler.startLiveCall returned false. Call did not connect.");
                // liveCallHandler.startLiveCall should have cleaned up virtualCallingScreen
                // and called SSM.resetBaseSessionState in its failure paths.
            }
        } catch (error) {
            console.error("SM: An error occurred during liveCallHandler.startLiveCall:", error);
            // sessionStateManager, domElements, modalHandler are from the IIFE's destructured resolvedDeps
            sessionStateManager.resetBaseSessionState();
            if (domElements.virtualCallingScreen && modalHandler.close) { // Check modalHandler.close
                try { modalHandler.close(domElements.virtualCallingScreen); } catch(e){ console.warn("SM: Error closing vcs in catch", e); }
            }
        }
    } else {
        console.error("SessionManager (TS Facade): Unknown session type:", sessionTypeWithContext);
    }
}

      // CORRECTED REPLACEMENT
async function endCurrentModalSession(generateRecap: boolean = true): Promise<void> {
    console.log("SessionManager (TS Facade): endCurrentModalSession called.");

    // Check if a session is active *before* trying to access other modules
    if (!sessionStateManager.isSessionActive()) {
        console.warn("SessionManager (TS Facade): No active session to end.");
        return;
    }

    // --- THIS IS THE FIX ---
    // Safely check if liveCallHandler and the endLiveCall method exist before calling it.
    if (liveCallHandler && typeof liveCallHandler.endLiveCall === 'function') {
        await liveCallHandler.endLiveCall(generateRecap);
    } else {
        console.error("SessionManager: Could not end session. liveCallHandler or its .endLiveCall method is not available.");
        // As a fallback, you might want to reset the state manager directly
        // to prevent the app from getting stuck in an "active" session state.
        if (sessionStateManager && typeof sessionStateManager.resetBaseSessionState === 'function') {
            sessionStateManager.resetBaseSessionState();
            alert("Session ended, but there was an issue cleaning up the call.");
        }
    }
    // --- END OF FIX ---
}

        function cancelModalCallAttempt(): void {
            console.log(`SessionManager (TS Facade - cancelModalCallAttempt): Called.`);
            if (domElements.virtualCallingScreen) modalHandler.close(domElements.virtualCallingScreen);
            liveCallHandler.endLiveCall(false);
            console.log(`SessionManager (TS Facade - cancelModalCallAttempt): Finished.`);
        }

        function handleDirectCallMicToggle(): void {
            liveCallHandler.toggleMicMuteForLiveCall();
        }

        function toggleDirectCallSpeaker(): void {
            liveCallHandler.toggleSpeakerMuteForLiveCall();
        }

        function handleDirectCallActivityRequest(): void { // Make sure this method exists on LiveCallHandler if it's not optional
            liveCallHandler.requestActivityForLiveCall?.();
        }

       function getCompletedSessions(): SessionData[] | undefined {
    // sessionHistoryManager is from resolvedDeps
    if (!sessionHistoryManager || typeof sessionHistoryManager.getCompletedSessions !== 'function') {
        console.error("SM: getCompletedSessions - sessionHistoryManager or its getCompletedSessions method is not available.");
        return undefined;
    }
    const sessions = sessionHistoryManager.getCompletedSessions();
    console.log("SM: getCompletedSessions - Received from SHM, count:", sessions?.length, JSON.parse(JSON.stringify(sessions || [])));
    return sessions;
}
        function downloadTranscriptForSession(sessionId: string): void {
            sessionHistoryManager.downloadTranscript(sessionId);
        }

       function showSessionRecapInView(sessionDataOrId: SessionData | string): void {
    console.log("SM_TS_DEBUG: showSessionRecapInView called with:", JSON.parse(JSON.stringify(sessionDataOrId || {})));
    let sessionDataToDisplay: SessionData | null = null;

    if (typeof sessionDataOrId === 'string') {
        if (!sessionHistoryManager?.getSessionById) { /* ... error ... */ return; }
        sessionDataToDisplay = sessionHistoryManager.getSessionById(sessionDataOrId);
    } else {
        sessionDataToDisplay = sessionDataOrId;
    }

    if (sessionDataToDisplay) {
        // 1. Populate and Open Recap Modal (already doing this)
        console.log("SM_TS_DEBUG: Populating and opening recap modal for session ID:", sessionDataToDisplay.sessionId);
        if (!uiUpdater?.populateRecapModal) { /* ... error ... */ return; }
        uiUpdater.populateRecapModal(sessionDataToDisplay); 
        if (!domElements?.sessionRecapScreen || !modalHandler?.open) { /* ... error ... */ return; }
        modalHandler.open(domElements.sessionRecapScreen);
        console.log("SM_TS_DEBUG: Recap modal should be open.");

        // 2. Update Main Summary View Content using ViewActionCoordinator (NEW)
        console.log("SM_TS_DEBUG: Attempting to call viewActionCoordinator.displaySessionSummaryInMainView for session ID:", sessionDataToDisplay.sessionId);
const currentViewActionCoordinator = window.viewActionCoordinator; // Resolve at runtime
if (currentViewActionCoordinator && typeof currentViewActionCoordinator.displaySessionSummaryInMainView === 'function') {
    currentViewActionCoordinator.displaySessionSummaryInMainView(sessionDataToDisplay);
} else {
    console.error("SM_TS_ERROR: window.viewActionCoordinator or .displaySessionSummaryInMainView not available at runtime for showSessionRecapInView!");
}
    } else {
                console.error("SM_TS_DEBUG: Could not find/resolve session data for recap:", JSON.parse(JSON.stringify(sessionDataOrId || {})));
                // Fallback to show an error recap
                const errorRecap: RecapData = { 
                    connectorName: "Error", date: new Date().toLocaleDateString(), duration: "N/A",
                    conversationSummary: `Could not load details for provided session identifier.`,
                    keyTopicsDiscussed: [], newVocabularyAndPhrases: [], goodUsageHighlights: [], 
                    areasForImprovement: [], suggestedPracticeActivities: [], overallEncouragement: "",
                    sessionId: typeof sessionDataOrId === 'string' ? sessionDataOrId : "N/A"
                };
                uiUpdater.populateRecapModal(errorRecap);
                if (domElements.sessionRecapScreen) modalHandler.open(domElements.sessionRecapScreen);
            }
        }

        console.log("session_manager.ts: IIFE (module definition) FINISHED.");
        return {
            initialize, startModalSession, endCurrentModalSession, cancelModalCallAttempt,
            handleDirectCallMicToggle, toggleDirectCallSpeaker, handleDirectCallActivityRequest,
            getCompletedSessions, downloadTranscriptForSession, showSessionRecapInView
        };
    })(); 

    Object.assign(window.sessionManager!, serviceMethods);

    if (window.sessionManager && typeof (window.sessionManager as SessionManagerModule).initialize === 'function') {
        console.log("session_manager.ts: SUCCESSFULLY assigned and populated window.sessionManager.");
    } else {
        console.error("session_manager.ts: CRITICAL ERROR - window.sessionManager population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('sessionManagerReady'));
    console.log('session_manager.ts: "sessionManagerReady" event dispatched (after full init attempt).');

} // End of initializeActualSessionManager

const dependenciesForSessionManager: string[] = [
    'sessionStateManagerReady', 
    'liveCallHandlerReady',     
    'sessionHistoryManagerReady', // Functional ready for SHM
  'uiUpdaterPlaceholderReady',    
    'modalHandlerReady',
    'domElementsReady',
    'chatManagerReady',
    'viewActionCoordinatorPlaceholderReady' // <<< ENSURE THIS IS PRESENT
];

const smMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForSessionManager.forEach((dep: string) => { // Typed dep
    if (dep) smMetDependenciesLog[dep] = false;
});
let smDepsMetCount = 0;

function checkAndInitSessionManager(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`SM_EVENT: Listener for '${receivedEventName}' was triggered.`);
        let eventDependencyVerified = false;
        switch (receivedEventName) {
            case 'sessionStateManagerReady': eventDependencyVerified = !!window.sessionStateManager?.isSessionActive; break;
            case 'liveCallHandlerReady': eventDependencyVerified = !!window.liveCallHandler?.startLiveCall; break;
            case 'sessionHistoryManagerReady': eventDependencyVerified = !!window.sessionHistoryManager?.initializeHistory; break;
            case 'uiUpdaterPlaceholderReady': // <<< CHANGED event name
            eventDependencyVerified = !!window.uiUpdater; // Placeholder check: just existence
            if (eventDependencyVerified) {
                console.log("SM_DEPS: Event 'uiUpdaterPlaceholderReady' processed. Placeholder VERIFIED.");
            }
            break;// Check a relevant method
            case 'modalHandlerReady': eventDependencyVerified = !!window.modalHandler?.open; break;
            case 'domElementsReady': eventDependencyVerified = !!window.domElements; break;
            case 'chatManagerReady': eventDependencyVerified = !!window.chatManager?.openMessageModal; break;
            case 'viewActionCoordinatorPlaceholderReady': eventDependencyVerified = !!window.viewActionCoordinator; break;
            default: console.warn(`SM_EVENT: Unknown event '${receivedEventName}'`); return;
        }

        if (eventDependencyVerified) {
            if (!smMetDependenciesLog[receivedEventName]) { // receivedEventName is guaranteed string here
                smMetDependenciesLog[receivedEventName] = true;
                smDepsMetCount++;
                console.log(`SM_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${smDepsMetCount}/${dependenciesForSessionManager.length}`);
            }
        } else {
            console.warn(`SM_EVENT: Event '${receivedEventName}' received, but window dependency verification FAILED.`);
        }
    }
    console.log(`SM_DEPS: Met status:`, JSON.stringify(smMetDependenciesLog));

    if (smDepsMetCount === dependenciesForSessionManager.length) {
        console.log('session_manager.ts: All dependencies met and verified. Initializing actual SessionManager.');
        initializeActualSessionManager();
    }
}

console.log('SM_SETUP: Starting initial dependency pre-check for SessionManager.');
smDepsMetCount = 0;
Object.keys(smMetDependenciesLog).forEach(key => smMetDependenciesLog[key] = false);
let smAllPreloadedAndVerified = true;

dependenciesForSessionManager.forEach((eventName: string) => { // Typed eventName
    let isReadyNow = false;
    let isVerifiedNow = false;

    switch (eventName) {
        case 'sessionStateManagerReady': isReadyNow = !!window.sessionStateManager; isVerifiedNow = isReadyNow && !!window.sessionStateManager?.isSessionActive; break;
        case 'liveCallHandlerReady': isReadyNow = !!window.liveCallHandler; isVerifiedNow = isReadyNow && !!window.liveCallHandler?.startLiveCall; break;
        case 'sessionHistoryManagerReady': isReadyNow = !!window.sessionHistoryManager; isVerifiedNow = isReadyNow && !!window.sessionHistoryManager?.initializeHistory; break;
        case 'uiUpdaterPlaceholderReady': // <<< CHANGED event name
        isReadyNow = !!window.uiUpdater; 
        isVerifiedNow = isReadyNow; // Placeholder check: just existence
        break;
        case 'modalHandlerReady': isReadyNow = !!window.modalHandler; isVerifiedNow = isReadyNow && !!window.modalHandler?.open; break;
        case 'domElementsReady': isReadyNow = !!window.domElements; isVerifiedNow = isReadyNow; break;
        case 'chatManagerReady': isReadyNow = !!window.chatManager; isVerifiedNow = isReadyNow && !!window.chatManager?.openMessageModal; break;
        case 'viewActionCoordinatorPlaceholderReady': 
    isReadyNow = !!window.viewActionCoordinator; 
    isVerifiedNow = isReadyNow; // Just check for placeholder existence
    break;
        default: console.warn(`SM_PRECHECK: Unknown dependency: ${eventName}`); isVerifiedNow = false; break;
    }

    console.log(`SM_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        console.log(`SM_PRECHECK: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!smMetDependenciesLog[eventName]) {
            smMetDependenciesLog[eventName] = true;
            smDepsMetCount++;
        }
    } else {
        smAllPreloadedAndVerified = false;
        console.log(`SM_PRECHECK: Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, function anEventListener() {
            checkAndInitSessionManager(eventName);
        }, { once: true });
    }
});

console.log(`SM_SETUP: Pre-check done. Met: ${smDepsMetCount}/${dependenciesForSessionManager.length}`, JSON.stringify(smMetDependenciesLog));

if (smAllPreloadedAndVerified && smDepsMetCount === dependenciesForSessionManager.length) {
    console.log('session_manager.ts: All dependencies ALREADY MET AND VERIFIED. Initializing directly.');
    initializeActualSessionManager();
} else if (smDepsMetCount > 0 && smDepsMetCount < dependenciesForSessionManager.length) {
    console.log(`session_manager.ts: Some deps pre-verified, waiting for events.`);
} else if (smDepsMetCount === 0 && !smAllPreloadedAndVerified) {
    console.log(`session_manager.ts: No deps pre-verified. Waiting for all events.`);
}

console.log("session_manager.ts: Script execution FINISHED (TS Version).");