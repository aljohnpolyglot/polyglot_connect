// D:\polyglot_connect\src\js\sessions\session_history_manager.ts
// AFTER
import type {
    YourDomElements, // <<< ADD THIS LINE
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ListRenderer,
    SessionManager,
    SessionData,
    TranscriptTurn,
    Connector
} from '../types/global.d.ts';

console.log('session_history_manager.ts: Script loaded, waiting for core dependencies.');

interface SessionHistoryManagerModule {
    initializeHistory: () => void;
    addCompletedSession: (sessionData: SessionData) => void;
    getCompletedSessions: () => SessionData[];
    getSessionById: (sessionId: string) => SessionData | null;
    downloadTranscript: (sessionId: string) => void;
    updateSummaryListUI: () => void;
}

// Placeholder
window.sessionHistoryManager = {} as SessionHistoryManagerModule;
console.log('session_history_manager.ts: Placeholder window.sessionHistoryManager assigned.');

function initializeActualSessionHistoryManager(): void {
    console.log('session_history_manager.ts: initializeActualSessionHistoryManager() called. Performing detailed dependency check...');

 // AFTER
type VerifiedDeps = {
    domElements: YourDomElements; // <<< ADD THIS LINE
    polyglotHelpers: PolyglotHelpers;
    listRenderer: ListRenderer;
    sessionManager: Partial<SessionManager>;
};

const getSafeDeps = (): VerifiedDeps | null => {
    const deps = {
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        listRenderer: window.listRenderer,
        sessionManager: window.sessionManager
    };
    
    const missing: string[] = []; // Declare 'missing' first
    
    // Now, check all dependencies
    if (!deps.domElements) missing.push("domElements");
    if (!deps.polyglotHelpers?.loadFromLocalStorage) missing.push("polyglotHelpers.loadFromLocalStorage");
    if (!deps.listRenderer?.renderSummaryList) missing.push("listRenderer.renderSummaryList");
    if (!deps.sessionManager) missing.push("sessionManager (object existence)");
    
    if (missing.length > 0) {
        console.error("session_history_manager.ts: CRITICAL - Functional deps not ready. Details:", missing.join(', '));
        return null;
    }
    
    return deps as VerifiedDeps;
    };
    
    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("session_history_manager.ts: Halting setup due to missing functional dependencies. Placeholder remains.");
        const dummyMethods: SessionHistoryManagerModule = {
            initializeHistory: () => console.error("SHM Dummy: initializeHistory"),
            addCompletedSession: () => console.error("SHM Dummy: addCompletedSession"),
            getCompletedSessions: () => { console.error("SHM Dummy: getCompletedSessions"); return []; },
            getSessionById: () => { console.error("SHM Dummy: getSessionById"); return null; },
            downloadTranscript: () => console.error("SHM Dummy: downloadTranscript"),
            updateSummaryListUI: () => console.error("SHM Dummy: updateSummaryListUI")
        };
        Object.assign(window.sessionHistoryManager!, dummyMethods);
        document.dispatchEvent(new CustomEvent('sessionHistoryManagerReady'));
        console.warn('session_history_manager.ts: "sessionHistoryManagerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('session_history_manager.ts: Core functional dependencies appear ready for IIFE.');

    const sessionHistoryMethods = ((): SessionHistoryManagerModule => {
        'use strict';
        console.log("session_history_manager.ts: IIFE (module definition) STARTING.");
        const { polyglotHelpers, listRenderer } = resolvedDeps; // sessionManager from resolvedDeps is for updateSummaryListUI's callback

        let completedSessions: Record<string, SessionData> = {};
        const STORAGE_KEY = 'polyglotCompletedSessions';

        function initializeHistory(): void {
            console.log("SHM_DEBUG: initializeHistory() called from within sessionHistoryMethods IIFE.");
            const saved = polyglotHelpers.loadFromLocalStorage(STORAGE_KEY) as Record<string, SessionData> | null;
            if (saved) {
                completedSessions = saved;
                console.log(`SHM_DEBUG: History loaded from storage. Found ${Object.keys(completedSessions).length} sessions. Keys:`, Object.keys(completedSessions));
            } else {
                console.log("SHM_DEBUG: No saved session history found in localStorage. completedSessions is empty.");
                completedSessions = {}; // Ensure it's an empty object if nothing is loaded
            }
            console.log("SHM_DEBUG: initializeHistory() finished within IIFE.");
        }

        function saveToStorage(): void {
            console.log("SHM: saveToStorage() called. Saving completedSessions:", JSON.parse(JSON.stringify(completedSessions)));
            polyglotHelpers.saveToLocalStorage(STORAGE_KEY, completedSessions);
        }

        function addCompletedSession(sessionData: SessionData): void {
            console.log("SHM: addCompletedSession - Attempting to add session:", JSON.parse(JSON.stringify(sessionData || {})));
            if (!sessionData?.sessionId) {
                console.error("SHM: Invalid sessionData in addCompletedSession (missing sessionId)", sessionData);
                return;
            }
            completedSessions[sessionData.sessionId] = sessionData;
            saveToStorage();
            console.log(`SHM: Session '${sessionData.sessionId}' added. Total sessions now: ${Object.keys(completedSessions).length}`);
            
            // Trigger the UI update for the summary list.
            updateSummaryListUI();
        }

        function getCompletedSessions(): SessionData[] {
            const sessionsArray = Object.values(completedSessions).sort((a, b) => {
                const timeA = a.startTimeISO ? new Date(a.startTimeISO).getTime() : 0;
                const timeB = b.startTimeISO ? new Date(b.startTimeISO).getTime() : 0;
                return timeB - timeA; 
            });
            console.log("SHM: getCompletedSessions - Returning sessions array, count:", sessionsArray.length);
            return sessionsArray;
        }

        const getSessionById = (sessionId: string): SessionData | null => {
            console.log(`SHM_DEBUG: getSessionById called for ID: '${sessionId}'.`);
            const session = completedSessions[sessionId] || null;
            console.log(`SHM_DEBUG: Session found for ID '${sessionId}':`, session ? 'Exists' : "NOT FOUND");
            return session;
        }

        function downloadTranscript(sessionId: string): void {
            const session = getSessionById(sessionId);
            if (!session?.rawTranscript || session.rawTranscript.length === 0) {
                alert("No transcript data available for download."); return;
            }
            const connectorName = (session.connectorName || 'partner').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            let timestampForFile = session.startTimeISO ? new Date(session.startTimeISO).toISOString().replace(/[:T.]/g, '-').substring(0, 19) : 'unknown_date';
            const filename = `PolyglotConnect_Transcript_${connectorName}_${timestampForFile}.txt`;
            let transcriptContent = `Session with ${session.connectorName || 'Partner'} on ${session.date || (session.startTimeISO ? new Date(session.startTimeISO).toLocaleDateString() : 'Unknown Date')}\nDuration: ${session.duration || 'N/A'}\n\n--- Transcript ---\n`;
            transcriptContent += polyglotHelpers.formatTranscriptForLLM(session.rawTranscript as TranscriptTurn[], session.connectorName, "You");
            
            const blob = new Blob([transcriptContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }

    // AFTER
function updateSummaryListUI(): void {
    console.log("SHM: updateSummaryListUI() called.");
    if (!resolvedDeps) {
        console.error("SHM: updateSummaryListUI called but resolvedDeps is null. Cannot proceed.");
        return;
    }

    let sessions = getCompletedSessions(); // Get all sessions
    const currentSessionManager = window.sessionManager;
    const safeListRenderer = resolvedDeps.listRenderer;
    
    // Get the search term from the new input field
    // Note: We access domElements through the already-verified 'resolvedDeps'
    const searchTerm = resolvedDeps.domElements?.searchSessionHistoryInput?.value.trim().toLowerCase() || '';

    // If there's a search term, filter the list
    if (searchTerm) {
        sessions = sessions.filter(session => 
            session.connectorName?.toLowerCase().includes(searchTerm)
        );
    }

    if (safeListRenderer && typeof safeListRenderer.renderSummaryList === 'function') {
        if (currentSessionManager && typeof currentSessionManager.showSessionRecapInView === 'function') {
            safeListRenderer.renderSummaryList(sessions, currentSessionManager.showSessionRecapInView);
        } else {
            console.error("SHM: window.sessionManager.showSessionRecapInView not available at runtime for listRenderer callback.");
            safeListRenderer.renderSummaryList(sessions, () => {}); // Fallback with empty function
        }
    } else {
        console.error("SHM: listRenderer or listRenderer.renderSummaryList is not available.");
    }
}
        
        console.log("session_history_manager.ts: IIFE (module definition) FINISHED.");
        return {
            initializeHistory,
            addCompletedSession,
            getCompletedSessions,
            getSessionById,
            downloadTranscript,
            updateSummaryListUI
        };
    })(); 

    Object.assign(window.sessionHistoryManager!, sessionHistoryMethods); 

    if (window.sessionHistoryManager && typeof window.sessionHistoryManager.initializeHistory === 'function') {
        console.log("session_history_manager.ts: SUCCESSFULLY assigned and populated.");
        
        // >>> SELF-INITIALIZE HISTORY LOADING HERE <<<
        try {
            console.log("SHM: Auto-calling initializeHistory() after methods assigned.");
            window.sessionHistoryManager.initializeHistory(); 
            console.log("SHM: Auto-initializeHistory() completed.");
        } catch (e) {
            console.error("SHM: Error during auto-calling initializeHistory():", e);
        }
    } else {
        console.error("session_history_manager.ts: CRITICAL ERROR - assignment FAILED or method missing.");
    }

    document.dispatchEvent(new CustomEvent('sessionHistoryManagerReady'));
    console.log('session_history_manager.ts: "sessionHistoryManagerReady" event dispatched (functional or failure handled inside).');
}

const dependenciesForSHM: string[] = [
    'polyglotHelpersReady', 
    'listRendererReady', 
    'sessionManagerPlaceholderReady'
];
const shmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForSHM.forEach((dep: string) => shmMetDependenciesLog[dep] = false);
let shmDepsMetCount = 0;

function checkAndInitSHM(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`SHM_EVENT: Listener for '${receivedEventName}' was triggered.`);
        let verified = false;
        switch(receivedEventName) {
            case 'polyglotHelpersReady': verified = !!(window.polyglotHelpers?.loadFromLocalStorage); break;
            case 'listRendererReady': verified = !!(window.listRenderer?.renderSummaryList); break;
            case 'sessionManagerPlaceholderReady': verified = !!window.sessionManager; break; // Check for placeholder
            default: console.warn(`SHM_EVENT: Unknown event ${receivedEventName}`); return;
        }
        if (verified && !shmMetDependenciesLog[receivedEventName]) {
            shmMetDependenciesLog[receivedEventName] = true;
            shmDepsMetCount++;
            console.log(`SHM_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${shmDepsMetCount}/${dependenciesForSHM.length}`);
        } else if (!verified) {
             console.warn(`SHM_DEPS: Event '${receivedEventName}' received but FAILED verification.`);
        }
    }
    if (shmDepsMetCount === dependenciesForSHM.length) {
        console.log('session_history_manager.ts: All dependencies met. Initializing actual SessionHistoryManager.');
        initializeActualSessionHistoryManager();
    }
}

console.log('SHM_SETUP: Starting initial dependency pre-check.');
shmDepsMetCount = 0; 
Object.keys(shmMetDependenciesLog).forEach(k=>shmMetDependenciesLog[k]=false);
let shmAllPreloadedAndVerified = true;

dependenciesForSHM.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false;
    switch(eventName) {
        case 'polyglotHelpersReady': 
            isReadyNow = !!window.polyglotHelpers; 
            isVerifiedNow = isReadyNow && !!window.polyglotHelpers?.loadFromLocalStorage; 
            break;
        case 'listRendererReady': 
            isReadyNow = !!window.listRenderer; 
            isVerifiedNow = isReadyNow && !!window.listRenderer?.renderSummaryList; 
            break;
        case 'sessionManagerPlaceholderReady': 
            isReadyNow = !!window.sessionManager; 
            isVerifiedNow = isReadyNow; // Just check for placeholder existence
            break;
        default: 
            console.warn(`SHM_PRECHECK: Unknown dependency: ${eventName}`); 
            isVerifiedNow = false; 
            break;
    }
    console.log(`SHM_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if(!shmMetDependenciesLog[eventName]) { 
            shmMetDependenciesLog[eventName] = true; 
            shmDepsMetCount++; 
        }
    } else {
        shmAllPreloadedAndVerified = false;
        console.log(`SHM_PRECHECK: Dep '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitSHM(eventName), { once: true });
    }
});

if (shmAllPreloadedAndVerified && shmDepsMetCount === dependenciesForSHM.length) {
    console.log('session_history_manager.ts: All deps pre-verified. Initializing directly.');
    initializeActualSessionHistoryManager();
} else if (shmDepsMetCount < dependenciesForSHM.length && !shmAllPreloadedAndVerified) {
    console.log(`session_history_manager.ts: Waiting for ${dependenciesForSHM.length - shmDepsMetCount} SHM dependency event(s).`);
} else if (shmDepsMetCount === dependenciesForSHM.length && !shmAllPreloadedAndVerified){
   console.log('session_history_manager.ts: All SHM deps met by events during pre-check iteration. Initializing if not already done.');
   // checkAndInitSHM would have been called by the last event, leading to initializeActualSessionHistoryManager
} else if (dependenciesForSHM.length === 0) { 
    initializeActualSessionHistoryManager();
}
console.log("session_history_manager.ts: Script execution FINISHED.");