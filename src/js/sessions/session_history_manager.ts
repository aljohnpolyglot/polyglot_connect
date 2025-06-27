// D:\polyglot_connect\src\js\sessions\session_history_manager.ts
// AFTER
// src/js/sessions/session_history_manager.ts

// --- Firestore/Firebase Imports ---
import {
    collection,
    doc,
    onSnapshot,
    setDoc,
    query,
    orderBy,
    Timestamp
} from "firebase/firestore";
import { auth, db } from '../firebase-config';
import { onAuthStateChanged, type User } from "firebase/auth";
// --- Original Type Imports ---
import type {
    YourDomElements,
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
    getLastSession: () => SessionData | null; // <<< ADD THIS LINE
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
            updateSummaryListUI: () => console.error("SHM Dummy: updateSummaryListUI"),
            getLastSession: function (): SessionData | null {
                throw new Error('Function not implemented.');
            }
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

        let completedSessions: Record<string, SessionData> = {}; // <<< ADD THIS LINE BACK
        let isSessionManagerFunctional = false;
        // Check initial state in case sessionManagerReady fired before this listener was added
        if (window.sessionManager && typeof window.sessionManager.showSessionRecapInView === 'function') {
            isSessionManagerFunctional = true;
            console.log("SHM: SessionManager was already functional on init.");
        }

        document.addEventListener('sessionManagerReady', () => {
            console.log("SHM: Received 'sessionManagerReady' event. SessionManager methods should now be available.");
            if (window.sessionManager && typeof window.sessionManager.showSessionRecapInView === 'function') {
                isSessionManagerFunctional = true;
                // If the list might have been rendered with a dummy callback, refresh it.
                // This ensures clicks work if sessionManager became ready after initial render.
                updateSummaryListUI();
            } else {
                console.error("SHM: 'sessionManagerReady' event received, but showSessionRecapInView is still not available on window.sessionManager.");
            }
        }, { once: true });
       // src/js/sessions/session_history_manager.ts

       let currentUserId: string | null = null;
       let unsubscribeFromSessions: (() => void) | null = null;

       function initializeHistory(): void {
           // This function from Firebase waits to tell us if a user is logged in.
           onAuthStateChanged(auth, (user: User | null) => {
               if (user) {
                   // --- A user is signed in! ---
                   console.log(`SHM: User ${user.uid} is authenticated. Setting up Firestore listener.`);
                   currentUserId = user.uid;

                   // If we were already listening for another user, stop that first.
                   if (unsubscribeFromSessions) unsubscribeFromSessions();

                   // This query gets all session documents for the current user, ordered by newest first.
                   const sessionsQuery = query(
                       collection(db, "users", user.uid, "sessions"),
                       orderBy("startTimeISO", "desc")
                   );

                   // onSnapshot is the real-time listener. It runs once with all initial data,
                   // and then runs again every time the data changes in Firestore.
                   unsubscribeFromSessions = onSnapshot(sessionsQuery, (querySnapshot) => {
                       console.log("SHM: Firestore listener received an update.");
                       querySnapshot.docChanges().forEach((change) => {
                           const sessionDoc = change.doc.data() as SessionData;
                           const sessionId = change.doc.id;

                           if (change.type === "added" || change.type === "modified") {
                               completedSessions[sessionId] = { ...sessionDoc, sessionId: sessionId }; // Add to our local cache
                           }
                           if (change.type === "removed") {
                               delete completedSessions[sessionId]; // Remove from cache
                           }
                       });
                       updateSummaryListUI(); // Update the UI with the fresh data from the cache
                   }, (error) => {
                       console.error("SHM: Error listening to session history:", error);
                   });

               } else {
                   // --- No user is signed in. ---
                   console.log("SHM: No user authenticated. Clearing session history.");
                   currentUserId = null;
                   if (unsubscribeFromSessions) unsubscribeFromSessions(); // Stop any active listener
                   completedSessions = {}; // Clear the local cache
                   updateSummaryListUI(); // Update UI to show empty list
               }
           });
       }
// src/js/sessions/session_history_manager.ts (inside the IIFE)

        /**
         * Recursively removes keys with `undefined` values from an object.
         * Firestore does not support `undefined` and will throw an error.
         * @param obj The object to clean.
         * @returns A new object with all `undefined` values removed.
         */
        function cleanUndefined(obj: any): any {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            if (Array.isArray(obj)) {
                return obj.map(item => cleanUndefined(item));
            }
            const newObj: { [key: string]: any } = {};
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    newObj[key] = cleanUndefined(obj[key]);
                }
            }
            return newObj;
        }
    

        async function addCompletedSession(sessionData: SessionData): Promise<void> {
            if (!currentUserId) {
                console.error("SHM: Cannot save session, no user is logged in.");
                return;
            }
            if (!sessionData?.sessionId) {
                console.error("SHM: Invalid sessionData provided, missing sessionId.");
                return;
            }
    
            const cleanSessionData = cleanUndefined(sessionData);
    
            // --- ADD THIS DEBUG LOG ---
            console.log(`SHM_ADD_COMPLETED_SESSION_DEBUG: Session ID being used for Firestore document: '${cleanSessionData.sessionId}'`);
            // --- END OF DEBUG LOG ---
            
            console.log(`SHM: Saving session '${cleanSessionData.sessionId}' to Firestore for user '${currentUserId}'.`);
            
            const sessionDocRef = doc(db, "users", currentUserId, "sessions", cleanSessionData.sessionId); // This uses the sessionId from the data
    
            try {
                await setDoc(sessionDocRef, cleanSessionData, { merge: true });
                console.log(`SHM: Session '${cleanSessionData.sessionId}' successfully saved to Firestore.`);
            } catch (error) {
                console.error(`SHM: FAILED to save session '${cleanSessionData.sessionId}' to Firestore:`, error);
                console.error("SHM: The data object that Firestore rejected was:", JSON.stringify(cleanSessionData, null, 2));
            }
        }
    
        function getCompletedSessions(): SessionData[] {
            const sessionsArray = Object.values(completedSessions).sort((a: SessionData, b: SessionData) => {
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
        // ADD THIS ENTIRE NEW FUNCTION:
// =================== START: ADD NEW HELPER FUNCTION ===================
/**
 * Returns the most recently added session object from the history.
 * This is useful for getting context immediately after a call ends.
 * @returns {SessionData | null} The most recent session data, or null if history is empty.
 */
// src/js/sessions/session_history_manager.ts

function getLastSession(): SessionData | null {
    const sessionsArray = Object.values(completedSessions).sort((a: SessionData, b: SessionData) => {
        const timeA = a.startTimeISO ? new Date(a.startTimeISO).getTime() : 0;
        const timeB = b.startTimeISO ? new Date(b.startTimeISO).getTime() : 0;
        return timeB - timeA;
    });
    return sessionsArray.length > 0 ? sessionsArray[0] : null;
}
// ===================  END: ADD NEW HELPER FUNCTION  ===================
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
        const safeListRenderer = resolvedDeps.listRenderer;
        
        const searchTerm = resolvedDeps.domElements?.searchSessionHistoryInput?.value.trim().toLowerCase() || '';
    
        if (searchTerm) {
            sessions = sessions.filter(session => 
                session.connectorName?.toLowerCase().includes(searchTerm)
            );
        }
    
        if (safeListRenderer && typeof safeListRenderer.renderSummaryList === 'function') {
            let recapViewCallback: (sessionDataOrId: SessionData | string) => void;
    
            // Check our flag and the actual method on window.sessionManager
            if (isSessionManagerFunctional && window.sessionManager && typeof window.sessionManager.showSessionRecapInView === 'function') {
                console.log("SHM: updateSummaryListUI - SessionManager is functional. Using real showSessionRecapInView callback.");
                recapViewCallback = window.sessionManager.showSessionRecapInView;
            } else {
                console.warn("SHM: updateSummaryListUI - SessionManager.showSessionRecapInView not available (isSessionManagerFunctional: " + isSessionManagerFunctional + "). Using temporary fallback callback.");
                recapViewCallback = (sessionOrId: SessionData | string) => {
                    const sessionId = typeof sessionOrId === 'string' ? sessionOrId : (sessionOrId as SessionData).sessionId; // Ensure proper type handling for sessionId
                    console.warn(`SHM: Clicked session (ID: ${sessionId}), but full SessionManager not ready. Informing user via alert.`);
                    // Fallback to a simple alert if no specific UI notification method is readily available on UiUpdater
                    alert("Session details are still loading. Please try again shortly.");
                };
            }
            safeListRenderer.renderSummaryList(sessions, recapViewCallback);
        } else {
            console.error("SHM: listRenderer or listRenderer.renderSummaryList is not available for updateSummaryListUI.");
        }
    }
        
        console.log("session_history_manager.ts: IIFE (module definition) FINISHED.");
        return {
            initializeHistory,
            addCompletedSession,
            getCompletedSessions,
            getSessionById,
            getLastSession, // <<< ADD THIS LINE
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