// src/js/sessions/session_state_manager.ts
import type {
    YourDomElements,
    ModalHandler,
    UiUpdater,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    AIService,
    SessionHistoryManager,
    AIApiConstants,
    ConversationManager,
    Connector,
    TranscriptTurn,
    SessionData,
    RecapData,
    MessageInStore,
    MessageDocument
} from '../types/global.d.ts';// Corrected path assuming types are in 'js/types' relative to 'js/sessions'
import { auth } from '../firebase-config'; // <<< ADD THIS LINE
console.log('session_state_manager.ts: Script loaded (TS Version), waiting for PolyglotHelpers.');

// Define the interface for the module that will be on the window



interface SessionStateManagerModule {
    initializeBaseSession: (connector: Connector, sessionType: string, callSessionId?: string, skipModalManagement?: boolean) => boolean;
    markSessionAsStarted: () => Promise<boolean>; // <<< Changed boolean to Promise<boolean>
    addTurnToTranscript: (turn: TranscriptTurn) => void;
    getRawTranscript: () => TranscriptTurn[]; // <<< ADD THIS LINE
    getCurrentTranscript: () => TranscriptTurn[];
    getCurrentSessionDetails?: () => { 
        connector?: Connector | null;
        sessionType?: string | null;
        sessionId?: string | null;
        startTime?: Date | null;
        transcript?: TranscriptTurn[];
        [key: string]: any;
    } | null;
    finalizeBaseSession: (generateRecap?: boolean) => Promise<void>;
    resetBaseSessionState: () => void;
    isSessionActive: () => boolean;
    recordFailedCallAttempt: (connector: Connector, reason?: string) => void;
}

window.sessionStateManager = {} as SessionStateManagerModule;
console.log('session_state_manager.ts: Placeholder window.sessionStateManager assigned.');

interface CurrentSessionState {
    connector: Connector | null;
    sessionType: string | null;
    sessionId: string | null;
    startTime: Date | null;
    transcript: TranscriptTurn[];
    endTime?: Date | null; 
}

function initializeActualSessionStateManager(): void {
    console.log("session_state_manager.ts: initializeActualSessionStateManager() called.");

    const getSafeDeps = (): {
        domElements?: YourDomElements;
        modalHandler?: ModalHandler;
        uiUpdater?: UiUpdater;
        polyglotHelpers: PolyglotHelpers;
        aiService?: AIService;
        sessionHistoryManager?: SessionHistoryManager;
        aiApiConstants?: AIApiConstants;
        conversationManager?: ConversationManager;
        polyglotConnectors?: Connector[];
    } | null => {
        const deps = {
            domElements: window.domElements,
            modalHandler: window.modalHandler,
            uiUpdater: window.uiUpdater,
            polyglotHelpers: window.polyglotHelpers,
            aiService: window.aiService,
            sessionHistoryManager: window.sessionHistoryManager,
            aiApiConstants: window.aiApiConstants,
            conversationManager: window.conversationManager,
            polyglotConnectors: window.polyglotConnectors
        };

        if (!deps.polyglotHelpers || typeof deps.polyglotHelpers.generateUUID !== 'function') {
            console.error("SessionStateManager (TS): CRITICAL - polyglotHelpers not found or not functional. Initialization will fail.");
            return null;
        }
        if (!deps.uiUpdater) console.warn("SSM (TS): uiUpdater not found. UI updates during session will be affected.");
        if (!deps.conversationManager) console.warn("SSM (TS): conversationManager not found. Call events won't be logged to chat history.");
        if (!deps.sessionHistoryManager) console.warn("SSM (TS): sessionHistoryManager not found. Sessions won't be saved to history.");
        if (!deps.aiService) console.warn("SSM (TS): aiService not found. AI recaps cannot be generated.");
        
        return deps as {
            domElements?: YourDomElements; modalHandler?: ModalHandler; uiUpdater?: UiUpdater;
            polyglotHelpers: PolyglotHelpers;
            aiService?: AIService; sessionHistoryManager?: SessionHistoryManager;
            aiApiConstants?: AIApiConstants; conversationManager?: ConversationManager;
            polyglotConnectors?: Connector[];
        };
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        const errorMsg = "SessionStateManager (TS) not initialized (missing polyglotHelpers).";
      // REPLACE LANDMARK 2 WITH THIS MODIFIED OBJECT:
// =================== START: REPLACEMENT FOR dummyMethods ===================
const dummyMethods: SessionStateManagerModule = {
    initializeBaseSession: () => { console.error(errorMsg); return false; },
    markSessionAsStarted: async () => { console.error(errorMsg); return false; }, // <<< Added async
    addTurnToTranscript: () => console.error(errorMsg),
    getRawTranscript: () => { console.error(errorMsg); return []; }, // <<< ADD THIS LINE
    getCurrentTranscript: () => { console.error(errorMsg); return []; },
    getCurrentSessionDetails: () => { console.error(errorMsg); return null; },
    finalizeBaseSession: async () => console.error(errorMsg),
    resetBaseSessionState: () => console.error(errorMsg),
    isSessionActive: () => { console.error(errorMsg); return false; },
    recordFailedCallAttempt: () => console.error(errorMsg)
};
// ===================  END: REPLACEMENT FOR dummyMethods  ===================
        Object.assign(window.sessionStateManager!, dummyMethods);
        document.dispatchEvent(new CustomEvent('sessionStateManagerReady'));
        console.warn('session_state_manager.ts: "sessionStateManagerReady" (FAILED - polyglotHelpers missing) event dispatched.');
        return;
    }
    console.log("session_state_manager.ts: Core polyglotHelpers dependency met. Proceeding with IIFE.");

    window.sessionStateManager = ((): SessionStateManagerModule => {
        'use strict';
        console.log("session_state_manager.ts: IIFE for actual methods STARTING.");

        const { polyglotHelpers } = resolvedDeps; // Guaranteed to be present

        const getDynamicDeps = () => ({ // For dependencies that might fully initialize later
            domElements: window.domElements as YourDomElements | undefined,
            modalHandler: window.modalHandler as ModalHandler | undefined,
            uiUpdater: window.uiUpdater as UiUpdater | undefined,
            aiService: window.aiService as AIService | undefined,
            sessionHistoryManager: window.sessionHistoryManager as SessionHistoryManager | undefined,
            aiApiConstants: window.aiApiConstants as AIApiConstants | undefined,
            conversationManager: window.conversationManager as ConversationManager | undefined,
            polyglotConnectors: window.polyglotConnectors as Connector[] | undefined
        });

        let currentSession: CurrentSessionState = {
            connector: null,
            sessionType: null,
            sessionId: null,
            startTime: null,
            transcript: []
        };

     // PASTE STARTS HERE
     function playRingtone(): void {
        const { domElements } = getDynamicDeps();
        const ringtoneElement = domElements?.ringtoneAudio;
        if (ringtoneElement && typeof ringtoneElement.play === 'function') {
            // ringtoneElement.loop = true; // REMOVED - No longer looping
            ringtoneElement.currentTime = 0;
            ringtoneElement.play().catch(error => console.warn("SSM (TS): Ringtone play() failed:", error));
            console.log("SSM (TS): Playing ringtone.");
        } else {
            console.warn("SSM (TS): Ringtone audio element not found or not playable.");
        }
    }
// PASTE ENDS HERE

// PASTE STARTS HERE
function stopRingtone(): void {
    const { domElements } = getDynamicDeps();
    const ringtoneElement = domElements?.ringtoneAudio;
    if (ringtoneElement && typeof ringtoneElement.pause === 'function') {
        ringtoneElement.pause();
        ringtoneElement.currentTime = 0;
        // ringtoneElement.loop = false; // REMOVED
        console.log("SSM (TS): Stopped ringtone.");
    }
}
// PASTE ENDS HERE

      // src/js/sessions/session_state_manager.ts
// ... (existing imports) ...
console.log('session_state_manager.ts: Script loaded (TS Version), waiting for PolyglotHelpers.');

// ... (rest of the file up to _logCallEventToChat) ...

     // src/js/sessions/session_state_manager.ts

   // src/js/sessions/session_state_manager.ts

 
   function _logCallEventToChat(
    targetConnectorId: string,
    eventType: string,
    text: string,
    duration: string | null = null,
    callSessionId: string | null = null,
    eventOriginConnectorId?: string,
    eventOriginConnectorName?: string
): void {
    const { conversationManager } = getDynamicDeps();
    if (!conversationManager?.addMessageToConversation) {
        console.warn(`SSM (TS): Cannot log call event - conversationManager.addMessageToConversation is missing.`);
        return;
    }

    // --- THIS IS THE FIX ---
    // We must construct the full conversationId here, just like we do everywhere else.
    const user = auth.currentUser;
    if (!user) {
        console.error("SSM: Cannot log call event, no user is logged in.");
        return;
    }
    const conversationId = [user.uid, targetConnectorId].sort().join('_');
    console.log(`%c[BRUTE FORCE] #1: _logCallEventToChat CREATING PAYLOAD`, 'color: #FFD700; font-weight: bold;', {
        callSessionId: callSessionId,
        connectorIdForButton: eventOriginConnectorId
    });

    const callEventPayload: Partial<MessageDocument> = {
        senderId: 'system',
        text: text,
        type: 'call_event',
        eventType: eventType,
        duration: duration || undefined,
        callSessionId: callSessionId || undefined,
        connectorIdForButton: eventOriginConnectorId, // <<< THIS IS THE KEY
    };
    console.log(`%c[SSM | LOG #1] BORN: Creating call event payload.`, 'color: #fff; background: #00008B;', {
        callSessionId: callSessionId,
        connectorIdForButton: eventOriginConnectorId
    });

    console.log(
        '%c[CALL_EVENT_TRACE #1] SSM: Creating initial call event payload.', 
        'color: white; background-color: #8A2BE2; padding: 2px;',
        JSON.parse(JSON.stringify(callEventPayload))
    );


    // Now we call the function with the *correct, full conversationId*.
    conversationManager.addMessageToConversation(
        conversationId, 
        text, 
        'call_event', 
        callEventPayload
    );
}
        
// ... (rest of session_state_manager.ts) ...
// Inside the IIFE of session_state_manager.ts
// Replace the existing initializeBaseSession function with this:
function initializeBaseSession(connector: Connector, sessionType: string, callSessionId?: string, skipModalManagement: boolean = false): boolean {
    const functionName = "initializeBaseSession (TS)";
    console.log(`${functionName}: Connector '${connector?.id}', Type: '${sessionType}', CallID: '${callSessionId}', SkipModal: ${skipModalManagement}`);
    const { uiUpdater, domElements, modalHandler } = getDynamicDeps(); // getDynamicDeps() is defined in your SSM

    if (!connector?.id || !connector.profileName || !sessionType) {
        console.error(`SSM (${functionName}): Invalid/incomplete connector or sessionType.`, { connector, sessionType });
        return false;
    }

    if (currentSession.sessionId) {
        console.warn(`SSM (${functionName}): Session '${currentSession.sessionId}' is already active. Finalize or reset first. Returning false.`);
        if (!skipModalManagement && domElements?.virtualCallingScreen && modalHandler?.close) {
            console.warn(`SSM (${functionName}): Attempt to UI-managed init while session active. Closing virtualCallingScreen if open.`);
            try { modalHandler.close(domElements.virtualCallingScreen); } catch(e) { console.warn("SSM: Error closing vCS in active session conflict", e); }
            stopRingtone();
        }
        return false;
    }

    currentSession.connector = { ...connector };
    currentSession.sessionType = sessionType;
    currentSession.sessionId = callSessionId || `${connector.id}_${sessionType}_${polyglotHelpers.generateUUID().substring(0, 8)}_${Date.now()}`;
    currentSession.transcript = [];
    currentSession.startTime = null; // Set by markSessionAsStarted

    let ringtonePlayed = false;

    if (!skipModalManagement) {
        console.log(`SSM (${functionName}): Managing virtualCallingScreen UI (skipModalManagement is false).`);
        if (uiUpdater?.updateVirtualCallingScreen && domElements?.virtualCallingScreen && modalHandler?.open) {
            uiUpdater.updateVirtualCallingScreen(currentSession.connector, currentSession.sessionType);
            try {
                modalHandler.open(domElements.virtualCallingScreen);
                playRingtone();
                ringtonePlayed = true;
                console.log(`SSM (${functionName}): virtualCallingScreen opened and ringtone played.`);
            } catch (modalError) {
                console.error(`SSM (${functionName}): Error opening virtualCallingScreen: `, modalError);
                currentSession.sessionId = null; // Rollback
                return false;
            }
        } else {
            console.error(`SSM (${functionName}): Missing UI deps (updater, elements, or handler) for virtual calling screen. Cannot show modal or play ringtone via this path.`);
            currentSession.sessionId = null; // Rollback session ID
            return false;
        }
    } else {
        console.log(`SSM (${functionName}): Skipping modal management as requested by caller (skipModalManagement is true).`);
        // Caller (e.g., LCH) is responsible for UI. SSM just plays ringtone and sets state.
        playRingtone();
        ringtonePlayed = true;
        console.log(`SSM (${functionName}): Ringtone played (modal management skipped).`);
    }
    
    if (!ringtonePlayed) {
         console.warn(`SSM (${functionName}): Ringtone was NOT played. This might be an issue.`);
    }

    console.log(`SSM (${functionName}): Base session '${currentSession.sessionId}' initialized. Current state:`, JSON.parse(JSON.stringify(currentSession)));
    return true;
}

     // src/js/sessions/session_state_manager.ts

     async function markSessionAsStarted(): Promise<boolean> { // <<< Note: Now async
        if (!currentSession.sessionId || !currentSession.connector?.id) {
            console.warn("SSM (TS): Cannot mark session as started, no active session or valid connector.");
            return false;
        }
        if (currentSession.startTime) {
            console.warn(`SSM (TS): Session '${currentSession.sessionId}' already started. Ignoring.`);
            return true;
        }
        
        const { conversationManager } = getDynamicDeps();
        if (!conversationManager) {
            console.error("SSM: Cannot mark session started, conversationManager is missing!");
            return false;
        }

        // --- THIS IS THE FIX ---
        // Ensure the conversation document exists in Firestore BEFORE we try to write to its sub-collection.
        console.log(`SSM: Ensuring conversation record exists for connector ${currentSession.connector.id}...`);
        
        await conversationManager.ensureConversationRecord(currentSession.connector);
        // --- END OF FIX ---

        stopRingtone();
        currentSession.startTime = new Date();
        console.log(`SSM (TS): Session '${currentSession.sessionId}' marked STARTED at ${currentSession.startTime.toISOString()}`);
        
        const connectorName = currentSession.connector.profileName || currentSession.connector.name || "Partner";
        _logCallEventToChat(
            currentSession.connector.id,
            'call_started',
            `You started a call with ${connectorName}.`,
            null,
            currentSession.sessionId,
            currentSession.connector.id,
            connectorName
        );
        return true;
    }

        function addTurnToTranscript(turn: TranscriptTurn): void {
            if (!currentSession.sessionId) {
                console.warn("SSM (TS): No active session to add transcript turn.");
                return;
            }
            if (!turn || typeof turn.sender !== 'string' || typeof turn.text !== 'string') {
                console.error("SSM (TS): Invalid TranscriptTurn object received:", turn);
                return;
            }
            const textForTranscript = typeof turn.text === 'string' ? turn.text : String(turn.text || "[Non-text content]");
            const turnType = turn.type || 'message';
            currentSession.transcript.push({
                sender: turn.sender,
                text: textForTranscript,
                type: turnType,
                timestamp: turn.timestamp || Date.now()
            });
        }

        function getRawTranscript(): TranscriptTurn[] {
            if (!currentSession.sessionId) {
                console.warn("SSM (TS): getRawTranscript called but no active session.");
                return [];
            }
            // Return a copy to prevent external modification
            return [...currentSession.transcript];
        }


        function getCurrentTranscript(): TranscriptTurn[] {
            return currentSession.sessionId ? [...currentSession.transcript] : [];
        }

        function getCurrentSessionDetails(): CurrentSessionState | null {
            return currentSession.sessionId ? { ...currentSession, transcript: [...currentSession.transcript] } : null;
        }

        async function finalizeBaseSession(generateRecap: boolean = true, transcriptOverride?: TranscriptTurn[], cleanedTranscriptForRecap?: string | null): Promise<void> {
            const functionName = "finalizeBaseSession (TS vFinal)";
            console.log(`${functionName}: Called. GenerateRecap: ${generateRecap}`);
            
            if (!currentSession.connector || !currentSession.sessionId) {
                console.warn(`${functionName}: No fully initialized session to finalize.`);
                resetBaseSessionState(); 
                return;
            }
        
            stopRingtone();
            const callEndTime = new Date();
        
            // Create a snapshot of the session data before we reset it
            const cleanConnectorForStorage = {
                id: currentSession.connector.id,
                name: currentSession.connector.name,
                profileName: currentSession.connector.profileName,
                avatarModern: currentSession.connector.avatarModern,
                language: currentSession.connector.language
                // Add any other specific, non-optional fields you need to save.
                // Explicitly DO NOT include `isActive` or other optional fields.
            };
            console.log("[SSM_DEBUG_FINALIZE] currentSession.startTime:", currentSession.startTime);
            const sessionToFinalize: SessionData = {
                sessionId: currentSession.sessionId,
                connectorId: currentSession.connector.id,
                connectorName: currentSession.connector.profileName,
                connector: cleanConnectorForStorage, // Use the clean object
                date: currentSession.startTime 
                ? new Date(currentSession.startTime).toLocaleString([], { 
                    year: 'numeric', month: 'numeric', day: 'numeric', 
                    hour: 'numeric', minute: '2-digit' 
                  }) 
                : new Date().toLocaleDateString(), // Fallback if no startTime
               
                startTimeISO: currentSession.startTime ? currentSession.startTime.toISOString() : null,
                endTimeISO: callEndTime.toISOString(),
                duration: "N/A",
                rawTranscript: transcriptOverride ? [...transcriptOverride] : [...currentSession.transcript],
                sessionType: currentSession.sessionType || 'unknown', // Use a default string instead of undefined
                conversationSummary: generateRecap ? "Generating summary..." : "Recap not generated for this session.",
            };
            
            // Reset the global state immediately
            resetBaseSessionState(); 
            console.log(`${functionName}: Global session state reset. Now processing data for SessionID: '${sessionToFinalize.sessionId}'`);
        
            // Calculate duration
            if (sessionToFinalize.startTimeISO) {
                const durationMs = callEndTime.getTime() - new Date(sessionToFinalize.startTimeISO).getTime();
                const minutes = Math.floor(durationMs / 60000);
                const seconds = Math.round((durationMs % 60000) / 1000);
                sessionToFinalize.duration = `${minutes}m ${seconds}s`;
                console.log("[SSM_DEBUG_FINALIZE] sessionToFinalize immediately after creation:", JSON.parse(JSON.stringify(sessionToFinalize)));
            }
            
            // Log the end-of-call event to chat history
            if (sessionToFinalize.startTimeISO) {
                _logCallEventToChat(
                    sessionToFinalize.connectorId!, 'call_ended', 'The call ended.',
                    sessionToFinalize.duration, sessionToFinalize.sessionId,
                    sessionToFinalize.connectorId, sessionToFinalize.connectorName
                );
            }
            
            const deps = getDynamicDeps();
            
            // Check if we should and can generate a recap
           // REPLACE THE ENTIRE LANDMARK if/else BLOCK WITH THIS:
// =================== START: THE DEFINITIVE REPLACEMENT ===================
// src/js/sessions/session_state_manager.ts

if (generateRecap && deps.aiService && deps.sessionHistoryManager && deps.uiUpdater && deps.modalHandler && deps.domElements) {
    console.log(`${functionName}: Preparing recap for session '${sessionToFinalize.sessionId}'.`);
    
    // Create a variable to hold the final data, whether it's successful or a fallback.
    let finalDataForHistory: SessionData;

    try {
        const stepEl = document.getElementById('processing-call-step');
        if (stepEl) stepEl.textContent = 'Generating your session debrief...';

        const textForRecap = cleanedTranscriptForRecap || polyglotHelpers.formatTranscriptForLLM(sessionToFinalize.rawTranscript || [], sessionToFinalize.connectorName, "User");

        const aiGeneratedRecapObject = await deps.aiService.generateSessionRecap(textForRecap, sessionToFinalize.connector as Connector);
        
        const originalSessionId = sessionToFinalize.sessionId;
        const originalDate = sessionToFinalize.date;         // <<< Store original
        const originalDuration = sessionToFinalize.duration; // <<< Store original

        finalDataForHistory = { 
            ...sessionToFinalize,         // Spread original session data first
            ...aiGeneratedRecapObject,    // Then spread AI recap
            sessionId: originalSessionId, // Explicitly restore the original sessionId
            date: originalDate,           // Explicitly restore the original date
            duration: originalDuration,   // Explicitly restore the original duration
        };
        console.log(`[SSM_DEBUG_FINALIZE] finalDataForHistory after merging AI recap:`, JSON.parse(JSON.stringify(finalDataForHistory)));
        console.log(`${functionName}: Recap successfully generated for '${finalDataForHistory.sessionId}'.`);

    } catch (recapError: any) { 
        console.error(`${functionName}: Error during aiService.generateSessionRecap:`, recapError);
        // On failure, sessionToFinalize already has the correct sessionId, date, and duration.
        finalDataForHistory = {
            ...sessionToFinalize, 
            conversationSummary: "An error occurred while generating the detailed debrief.",
            keyTopicsDiscussed: ["Details unavailable due to error."],
            // Ensure other AI-specific fields are nulled or set to error indicators if needed
            newVocabularyAndPhrases: [],
            goodUsageHighlights: [],
            areasForImprovement: [],
            suggestedPracticeActivities: [],
            overallEncouragement: "Recap generation failed."
        };
        console.log(`[SSM_DEBUG_FINALIZE] finalDataForHistory after AI recap ERROR:`, JSON.parse(JSON.stringify(finalDataForHistory)));
    }
    
    // --- THIS IS THE UNIFIED "SAVE AND DISPLAY" LOGIC ---
    // No matter if the try block succeeded or failed, we now have data in finalDataForHistory.

    // 1. ALWAYS save the result to Firestore.
    deps.sessionHistoryManager.addCompletedSession(finalDataForHistory);

    // 2. ALWAYS close the "processing" modal.
    if (deps.domElements?.processingCallModal) deps.modalHandler.close(deps.domElements.processingCallModal);
    
    // 3. ALWAYS show the user the result in the recap modal.
    deps.uiUpdater.populateRecapModal(finalDataForHistory);
    deps.modalHandler.open(deps.domElements.sessionRecapScreen);

} else { 
    // This 'else' block (for when generateRecap is false) is fine as is.
    if (deps.sessionHistoryManager) {
        console.log(`${functionName}: Recap generation was SKIPPED. Saving base session data.`);
        deps.sessionHistoryManager.addCompletedSession(sessionToFinalize);
    }
    if (deps.domElements?.processingCallModal && deps.modalHandler) {
        deps.modalHandler.close(deps.domElements.processingCallModal);
    }
}
// ===================  END: THE DEFINITIVE REPLACEMENT  ===================
        }

        function resetBaseSessionState(): void {
            stopRingtone(); // Ensure ringtone stops
            console.log(`SSM (TS): Resetting base session state. Previous session ID: '${currentSession.sessionId || 'none'}'`);
            currentSession = {
                connector: null, sessionType: null, sessionId: null,
                startTime: null, transcript: []
            };
        }

        function isSessionActive(): boolean {
            return !!currentSession.sessionId;
        }

        function recordFailedCallAttempt(connector: Connector, reason: string = "could not connect"): void {
            const functionName = "recordFailedCallAttempt (TS)";
            if (!connector?.id) { // Check connector.id specifically
                console.warn(`${functionName}: Invalid connector or connector.id. Cannot record failed call. Connector:`, connector);
                return;
            }
            stopRingtone();
            console.log(`${functionName}: Recording FAILED call attempt with ${connector.profileName || connector.name || connector.id}. Reason: ${reason}`);
            
            const callIdForEvent = (currentSession.sessionId && currentSession.connector?.id === connector.id) ? 
                                   currentSession.sessionId : 
                                   `${connector.id}_${currentSession.sessionType || "direct_modal"}_failed_${Date.now()}`; // Use currentSession.sessionType if available

            _logCallEventToChat(
                connector.id, // Log to this connector's chat log
                'call_failed_user_attempt',
                `Your call to ${connector.profileName || connector.name || 'Partner'} ${reason}.`,
                null, // duration
                callIdForEvent, // callSessionId
                connector.id, // eventOriginConnectorId (for CALL AGAIN button)
                connector.profileName || connector.name // eventOriginConnectorName
            );
            
            if (currentSession.sessionId && currentSession.connector?.id === connector.id) {
                console.log(`${functionName}: Resetting partially initialized session state for failed call to ${connector.id}`);
                resetBaseSessionState();
            }
        }

        console.log("session_state_manager.ts: IIFE (TS Version) finished, returning exports.");
        return {
            initializeBaseSession,
            markSessionAsStarted,
            addTurnToTranscript,
            getRawTranscript, // <<< ADD THIS LINE
            getCurrentTranscript,
            getCurrentSessionDetails,
            finalizeBaseSession,
            resetBaseSessionState,
            isSessionActive,
            recordFailedCallAttempt
        };
    })(); // End of IIFE

    if (window.sessionStateManager && typeof window.sessionStateManager.initializeBaseSession === 'function') {
        console.log("session_state_manager.ts: SUCCESSFULLY assigned and populated window.sessionStateManager (TS Version).");
    } else {
        console.error("session_state_manager.ts: CRITICAL ERROR - window.sessionStateManager population FAILED (TS Version).");
    }
    document.dispatchEvent(new CustomEvent('sessionStateManagerReady'));
    console.log('session_state_manager.ts: "sessionStateManagerReady" event dispatched (TS Version).');

} // End of initializeActualSessionStateManager

const dependenciesForSSM: string[] = [
    'polyglotHelpersReady',
    'uiUpdaterReady',
    'sessionHistoryManagerReady',
    'conversationManagerReady',
    'aiServiceReady' 
];
const ssmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForSSM.forEach(dep => ssmMetDependenciesLog[dep] = false);
let ssmDepsMetCount = 0;
function checkAndInitSSM(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`SSM_EVENT (TS): Listener for '${receivedEventName}' was triggered.`);
        let verified = false;
        switch(receivedEventName) {
            case 'polyglotHelpersReady': 
                verified = !!(window.polyglotHelpers?.generateUUID); 
                break;
            case 'uiUpdaterReady': // <<< ADDED
                verified = !!(window.uiUpdater?.populateRecapModal);
                break;
            case 'sessionHistoryManagerReady': // <<< ADDED
                verified = !!(window.sessionHistoryManager?.addCompletedSession);
                break;
            case 'conversationManagerReady': // <<< ADDED
                verified = !!(window.conversationManager?.addSystemMessageToConversation);
                break;
            case 'aiServiceReady': // <<< ADDED
                verified = !!(window.aiService?.generateSessionRecap);
                break;
            case 'aiApiConstantsReady': // <<< ADDED
                verified = !!(window.aiApiConstants?.PROVIDERS);
                break;
            default: 
                console.warn(`SSM_EVENT (TS): Unknown event ${receivedEventName}`); 
                return;
        }

        if (verified && !ssmMetDependenciesLog[receivedEventName]) {
            ssmMetDependenciesLog[receivedEventName] = true;
            ssmDepsMetCount++;
            console.log(`SSM_DEPS (TS): Event '${receivedEventName}' processed AND VERIFIED. Count: ${ssmDepsMetCount}/${dependenciesForSSM.length}`);
        } else if (!verified) {
             console.warn(`SSM_DEPS (TS): Event '${receivedEventName}' received but FAILED verification.`);
        }
    }
    if (ssmDepsMetCount === dependenciesForSSM.length) {
        console.log('session_state_manager.ts: All critical dependencies met. Initializing actual SessionStateManager.');
        initializeActualSessionStateManager();
    }
}

console.log('SSM_SETUP (TS): Starting initial dependency pre-check.');
ssmDepsMetCount = 0; 
Object.keys(ssmMetDependenciesLog).forEach(k=>ssmMetDependenciesLog[k]=false);
let ssmAllPreloadedAndVerified = true;
dependenciesForSSM.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false;
    switch(eventName) {
        case 'polyglotHelpersReady': 
            isReadyNow = !!window.polyglotHelpers; 
            isVerifiedNow = isReadyNow && !!window.polyglotHelpers?.generateUUID; 
            break;
        case 'uiUpdaterReady': // <<< ADDED
            isReadyNow = !!window.uiUpdater;
            isVerifiedNow = isReadyNow && !!window.uiUpdater?.populateRecapModal;
            break;
        case 'sessionHistoryManagerReady': // <<< ADDED
            isReadyNow = !!window.sessionHistoryManager;
            isVerifiedNow = isReadyNow && !!window.sessionHistoryManager?.addCompletedSession;
            break;
        case 'conversationManagerReady': // <<< ADDED
            isReadyNow = !!window.conversationManager;
            isVerifiedNow = isReadyNow && !!window.conversationManager?.addSystemMessageToConversation;
            break;
        case 'aiServiceReady': // <<< ADDED
            isReadyNow = !!window.aiService;
            isVerifiedNow = isReadyNow && !!window.aiService?.generateSessionRecap;
            break;
        case 'aiApiConstantsReady': // <<< ADDED
            isReadyNow = !!window.aiApiConstants;
            isVerifiedNow = isReadyNow && !!window.aiApiConstants?.PROVIDERS;
            break;
        default: 
            isVerifiedNow = false; 
            break;
    }
    console.log(`SSM_PRECHECK (TS): For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if(!ssmMetDependenciesLog[eventName]) { ssmMetDependenciesLog[eventName] = true; ssmDepsMetCount++; }
    } else {
        ssmAllPreloadedAndVerified = false;
        console.log(`SSM_PRECHECK (TS): Dep '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitSSM(eventName), { once: true });
    }
});

if (ssmAllPreloadedAndVerified && ssmDepsMetCount === dependenciesForSSM.length) {
    console.log('session_state_manager.ts: All critical SSM deps pre-verified. Initializing directly.');
    initializeActualSessionStateManager();
} else if (ssmDepsMetCount < dependenciesForSSM.length && !ssmAllPreloadedAndVerified) {
    console.log(`session_state_manager.ts: Waiting for ${dependenciesForSSM.length - ssmDepsMetCount} SSM dependency event(s).`);
} else if (ssmDepsMetCount === dependenciesForSSM.length && !ssmAllPreloadedAndVerified){ // This case means all met by events during loop
   console.log('session_state_manager.ts: All SSM deps met by events during pre-check iteration. Initializing.');
   initializeActualSessionStateManager(); // Initialize if all deps are met, even if not all were preloaded
} else if (dependenciesForSSM.length === 0) { // No dependencies
    initializeActualSessionStateManager();
}
console.log("session_state_manager.ts: Script execution FINISHED (TS Version).");