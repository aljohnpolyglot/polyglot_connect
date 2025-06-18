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
    MessageInStore
} from '../types/global.d.ts';// Corrected path assuming types are in 'js/types' relative to 'js/sessions'

console.log('session_state_manager.ts: Script loaded (TS Version), waiting for PolyglotHelpers.');

// Define the interface for the module that will be on the window
interface SessionStateManagerModule {
    initializeBaseSession: (connector: Connector, sessionType: string, callSessionId?: string) => boolean;
    markSessionAsStarted: () => boolean;
    addTurnToTranscript: (turn: TranscriptTurn) => void;
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
        const dummyMethods: SessionStateManagerModule = { /* ... (your dummy methods) ... */ 
            initializeBaseSession: () => { console.error(errorMsg); return false; },
            markSessionAsStarted: () => { console.error(errorMsg); return false; },
            addTurnToTranscript: () => console.error(errorMsg),
            getCurrentTranscript: () => { console.error(errorMsg); return []; },
            getCurrentSessionDetails: () => { console.error(errorMsg); return null; },
            finalizeBaseSession: async () => console.error(errorMsg),
            resetBaseSessionState: () => console.error(errorMsg),
            isSessionActive: () => { console.error(errorMsg); return false; },
            recordFailedCallAttempt: () => console.error(errorMsg)
        };
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

        function playRingtone(): void {
            const { domElements } = getDynamicDeps();
            const ringtoneElement = domElements?.ringtoneAudio;
            if (ringtoneElement && typeof ringtoneElement.play === 'function') {
                ringtoneElement.currentTime = 0;
                ringtoneElement.play().catch(error => console.warn("SSM (TS): Ringtone play() failed:", error));
                console.log("SSM (TS): Playing ringtone.");
            } else {
                console.warn("SSM (TS): Ringtone audio element not found or not playable.");
            }
        }

        function stopRingtone(): void {
            const { domElements } = getDynamicDeps();
            const ringtoneElement = domElements?.ringtoneAudio;
            if (ringtoneElement && typeof ringtoneElement.pause === 'function') {
                ringtoneElement.pause();
                ringtoneElement.currentTime = 0;
                console.log("SSM (TS): Stopped ringtone.");
            }
        }

      // src/js/sessions/session_state_manager.ts
// ... (existing imports) ...
console.log('session_state_manager.ts: Script loaded (TS Version), waiting for PolyglotHelpers.');

// ... (rest of the file up to _logCallEventToChat) ...

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
            if (!conversationManager?.addSystemMessageToConversation) {
                console.warn(`SSM (TS): Cannot log call event - conversationManager or method missing for targetConnectorId: ${targetConnectorId}`);
                return;
            }
            if (!targetConnectorId) {
                console.warn("SSM (TS): Cannot log call event - targetConnectorId is missing.");
                return;
            }

            const callEventMessagePayload: Partial<MessageInStore> & { 
                eventType: string; 
                connectorIdForButton?: string;
                connectorNameForDisplay?: string;
            } = {
                sender: 'system-call-event', 
                type: 'call_event',          
                text: text,
                timestamp: Date.now(),
                eventType: eventType,
                callSessionId: callSessionId || currentSession.sessionId || undefined,
                duration: duration || undefined,
                connectorIdForButton: eventOriginConnectorId, // <<< Key property
                connectorNameForDisplay: eventOriginConnectorName // <<< Key property
            };
            
            // DEBUG LOG (as per your request)
            console.log("SSM_DEBUG _logCallEventToChat: Payload:", JSON.parse(JSON.stringify(callEventMessagePayload)));
            // Existing log (also good for debugging)
            // console.log(`SSM (TS): Logging call event to chat for ${targetConnectorId}. EventType: ${eventType}. ButtonConnectorID: ${eventOriginConnectorId}. Payload:`, JSON.parse(JSON.stringify(callEventMessagePayload)));
            
            conversationManager.addSystemMessageToConversation(targetConnectorId, callEventMessagePayload);
        }

// ... (rest of session_state_manager.ts) ...

        function initializeBaseSession(connector: Connector, sessionType: string, callSessionId?: string): boolean {
            console.log(`SSM (TS): initializeBaseSession for connector '${connector?.id}', Type: '${sessionType}', ProvidedCallSessionId: '${callSessionId}'`);
            const { uiUpdater, domElements, modalHandler } = getDynamicDeps();

            if (!connector?.id || !connector.profileName || !sessionType) {
                console.error("SSM (TS): Invalid/incomplete connector or sessionType for init.", {connector, sessionType});
                return false;
            }
            if (currentSession.sessionId) {
                console.warn(`SSM (TS): Session '${currentSession.sessionId}' is active. Finalize or reset first.`);
                return false;
            }

            currentSession.connector = { ...connector };
            currentSession.sessionType = sessionType;
            currentSession.sessionId = callSessionId || `${connector.id}_${sessionType}_${polyglotHelpers.generateUUID().substring(0,8)}_${Date.now()}`; // Make it more unique
            currentSession.transcript = [];
            currentSession.startTime = null; // Set by markSessionAsStarted

            if (uiUpdater?.updateVirtualCallingScreen && domElements?.virtualCallingScreen && modalHandler?.open) {
                uiUpdater.updateVirtualCallingScreen(currentSession.connector, currentSession.sessionType);
                modalHandler.open(domElements.virtualCallingScreen);
                playRingtone();
            } else {
                console.error("SSM (TS): Missing UI deps for virtual calling screen.");
            }
            console.log(`SSM (TS): Base session '${currentSession.sessionId}' initialized and currentSession populated:`, JSON.parse(JSON.stringify(currentSession)));
            return true;
        }

        function markSessionAsStarted(): boolean {
            if (!currentSession.sessionId || !currentSession.connector?.id) { // Added check for connector.id
                console.warn("SSM (TS): Cannot mark session as started, no active session or valid connector. CurrentSession:", JSON.parse(JSON.stringify(currentSession)));
                return false;
            }
            if (currentSession.startTime) {
                console.warn(`SSM (TS): Session '${currentSession.sessionId}' already started. Ignoring.`);
                return true;
            }
            stopRingtone();
            currentSession.startTime = new Date();
            console.log(`SSM (TS): Session '${currentSession.sessionId}' marked STARTED at ${currentSession.startTime.toISOString()}`);
            
            const connectorName = currentSession.connector.profileName || currentSession.connector.name || "Partner";
            _logCallEventToChat(
                currentSession.connector.id, // Log to this connector's chat
                'call_started',
                `You started a call with ${connectorName}.`,
                null,
                currentSession.sessionId,
                currentSession.connector.id,    // eventOriginConnectorId for CALL BACK
                connectorName                   // eventOriginConnectorName
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

        function getCurrentTranscript(): TranscriptTurn[] {
            return currentSession.sessionId ? [...currentSession.transcript] : [];
        }

        function getCurrentSessionDetails(): CurrentSessionState | null {
            return currentSession.sessionId ? { ...currentSession, transcript: [...currentSession.transcript] } : null;
        }

        async function finalizeBaseSession(generateRecap: boolean = true): Promise<void> {
            const functionName = "finalizeBaseSession (TS)";
            console.log(`${functionName}: Called. GenerateRecap: ${generateRecap}, Current SessionID: '${currentSession.sessionId || 'N/A'}'`);
            
            if (!currentSession.connector || 
                !currentSession.connector.id || 
                !currentSession.sessionId || 
                !currentSession.sessionType) {
                console.warn(`${functionName}: No fully initialized active session (missing connector, connector.id, sessionId, or sessionType) to finalize. Current session details:`, JSON.parse(JSON.stringify(currentSession || {})));
                resetBaseSessionState(); 
                return;
            }

            stopRingtone();
            const callEndTime = new Date();

            const connectorIdForLog = currentSession.connector.id;
            const connectorNameForLog = currentSession.connector.profileName || currentSession.connector.name || "Partner";
            const sessionIdForLog = currentSession.sessionId;
            const sessionTypeForLog = currentSession.sessionType;
            const startTimeForCalc = currentSession.startTime;
            const transcriptForLog = [...currentSession.transcript];
            const connectorObjectForLog = { ...currentSession.connector };

            const sessionToFinalize: SessionData = {
                sessionId: sessionIdForLog,
                connectorId: connectorIdForLog,
                connectorName: connectorNameForLog,
                connector: connectorObjectForLog,
                date: startTimeForCalc ? new Date(startTimeForCalc).toLocaleDateString() : new Date(callEndTime).toLocaleDateString(),
                startTimeISO: startTimeForCalc ? startTimeForCalc.toISOString() : null,
                endTimeISO: callEndTime.toISOString(),
                duration: "Calculating...",
                rawTranscript: transcriptForLog,
                sessionType: sessionTypeForLog,
                conversationSummary: generateRecap ? "Generating summary..." : "Recap not generated for this session.",
                keyTopicsDiscussed: generateRecap ? ["Generating..."] : [],
                newVocabularyAndPhrases: [], goodUsageHighlights: [], areasForImprovement: [],
                suggestedPracticeActivities: [], overallEncouragement: generateRecap ? "Generating..." : "Recap was not generated."
            };
            
            const previousSessionIdForDebug = currentSession.sessionId;
            resetBaseSessionState(); 
            console.log(`${functionName}: Global currentSession state reset. Finalizing data for SessionID: '${sessionToFinalize.sessionId}' (was '${previousSessionIdForDebug}')`);

            if (sessionToFinalize.startTimeISO && sessionToFinalize.endTimeISO) {
                const durationMs = new Date(sessionToFinalize.endTimeISO).getTime() - new Date(sessionToFinalize.startTimeISO).getTime();
                if (!isNaN(durationMs) && durationMs >= 0) {
                    const minutes = Math.floor(durationMs / 60000);
                    const seconds = Math.round((durationMs % 60000) / 1000);
                    sessionToFinalize.duration = `${minutes}m ${seconds}s`;
                } else {
                    console.warn(`${functionName}: Invalid duration calculated for SessionID '${sessionToFinalize.sessionId}'. Start: ${sessionToFinalize.startTimeISO}, End: ${sessionToFinalize.endTimeISO}. Setting duration to 'N/A'.`);
                    sessionToFinalize.duration = "N/A";
                }
            } else {
                console.warn(`${functionName}: Cannot calculate duration for SessionID '${sessionToFinalize.sessionId}' due to missing start time. Setting duration to 'N/A'.`);
                sessionToFinalize.duration = "N/A";
            }

            if (sessionToFinalize.startTimeISO) { // Only log call_ended if session formally started
                _logCallEventToChat(
                    connectorIdForLog, 'call_ended', 'The call ended.',
                    sessionToFinalize.duration, sessionIdForLog,
                    connectorIdForLog, connectorNameForLog
                );
            } else {
                console.log(`SSM (${functionName}): Session '${sessionToFinalize.sessionId}' ended but never formally started. 'call_ended' event not logged to chat.`);
            }
            
            const deps = getDynamicDeps();
            let actualGenerateRecap = generateRecap;

            if (actualGenerateRecap && (!deps.aiService || !deps.sessionHistoryManager || !deps.uiUpdater || !deps.modalHandler || !deps.domElements?.sessionRecapScreen || !deps.aiApiConstants)) {
                console.error(`${functionName}: Cannot generate recap for SessionID '${sessionToFinalize.sessionId}' (missing critical dependencies for recap). Recap generation will be skipped.`);
                sessionToFinalize.conversationSummary = "Recap generation skipped: System components missing.";
                actualGenerateRecap = false; 
            }
            
            if (actualGenerateRecap && deps.aiService && deps.sessionHistoryManager && deps.uiUpdater && deps.modalHandler && deps.domElements?.sessionRecapScreen) {
                console.log(`${functionName}: Transcript for session '${sessionToFinalize.sessionId}' (${sessionToFinalize.rawTranscript?.length} turns) being sent for recap.`);
                deps.uiUpdater.populateRecapModal(sessionToFinalize); 
                deps.modalHandler.open(deps.domElements.sessionRecapScreen);

                try {
                    console.log(`${functionName}: Requesting recap from aiService for session: '${sessionToFinalize.sessionId}'`);
                    const aiGeneratedRecapObject = await deps.aiService.generateSessionRecap(
                        sessionToFinalize.rawTranscript || [],
                        sessionToFinalize.connector!, 
                        deps.aiApiConstants?.PROVIDERS?.GROQ 
                    );
                    
                    const finalSessionDataWithRecap: SessionData = { ...sessionToFinalize, ...(aiGeneratedRecapObject || {}) };
                    // Ensure essential IDs and data are not overwritten by a potentially partial recap object
                    finalSessionDataWithRecap.sessionId = sessionToFinalize.sessionId; 
                    finalSessionDataWithRecap.connectorId = sessionToFinalize.connectorId;
                    finalSessionDataWithRecap.connectorName = sessionToFinalize.connectorName;
                    finalSessionDataWithRecap.connector = sessionToFinalize.connector;
                    finalSessionDataWithRecap.date = sessionToFinalize.date;
                    finalSessionDataWithRecap.duration = sessionToFinalize.duration;
                    finalSessionDataWithRecap.startTimeISO = sessionToFinalize.startTimeISO;
                    finalSessionDataWithRecap.endTimeISO = sessionToFinalize.endTimeISO;
                    finalSessionDataWithRecap.rawTranscript = sessionToFinalize.rawTranscript;
                    finalSessionDataWithRecap.sessionType = sessionToFinalize.sessionType;

                    deps.sessionHistoryManager.addCompletedSession(finalSessionDataWithRecap);
                    deps.uiUpdater.populateRecapModal(finalSessionDataWithRecap);
                    console.log(`${functionName}: Recap generated and UI updated for '${sessionToFinalize.sessionId}'.`);

                } catch (recapError: any) { 
                    console.error(`${functionName}: Error during aiService.generateSessionRecap for '${sessionToFinalize.sessionId}':`, recapError);
                    const errorFallbackRecap: SessionData = {
                        ...sessionToFinalize,
                        conversationSummary: "An error occurred while generating the detailed debrief.",
                        keyTopicsDiscussed: ["Details unavailable due to error"], 
                        overallEncouragement: "Apologies, the AI debrief could not be completed."
                    };
                    deps.sessionHistoryManager.addCompletedSession(errorFallbackRecap);
                    deps.uiUpdater.populateRecapModal(errorFallbackRecap);
                }
            } else { 
                if (deps.sessionHistoryManager?.addCompletedSession) {
                    console.log(`${functionName}: Recap generation was SKIPPED. Saving current session data for '${sessionToFinalize.sessionId}'.`);
                    deps.sessionHistoryManager.addCompletedSession(sessionToFinalize);
                } else {
                    console.warn(`${functionName}: sessionHistoryManager not available. Session record for '${sessionToFinalize.sessionId}' NOT saved.`);
                }
            }
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