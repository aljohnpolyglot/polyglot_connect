// js/sessions/session_history_manager.js
// Manages completed sessions: storage, retrieval, download.

window.sessionHistoryManager = (() => {
    'use strict';

    const getDeps = () => ({
        polyglotHelpers: window.polyglotHelpers,
        listRenderer: window.listRenderer,
        viewManager: window.viewManager // Added viewManager to get its callback
    });

    let completedSessions = {}; // In-memory cache { sessionId: sessionDataObject, ... }
    const STORAGE_KEY = 'polyglotCompletedSessions';

    function initializeHistory() {
        const { polyglotHelpers } = getDeps();
        console.log("sessionHistoryManager: Initializing history...");
        if (!polyglotHelpers) {
            console.error("sessionHistoryManager: polyglotHelpers not available at initialization.");
            return;
        }
        const saved = polyglotHelpers.loadFromLocalStorage(STORAGE_KEY);
        if (saved) {
            completedSessions = saved;
            console.log("sessionHistoryManager: Loaded sessions from storage:", Object.keys(completedSessions).length);
        } else {
            console.log("sessionHistoryManager: No sessions found in local storage.");
        }
        updateSummaryListUI(); // Initial UI render
    }

    function saveToStorage() {
        console.log("sessionHistoryManager: Saving sessions to local storage...");
        getDeps().polyglotHelpers?.saveToLocalStorage(STORAGE_KEY, completedSessions);
    }

    function addCompletedSession(sessionData) {
        if (!sessionData || !sessionData.sessionId) {
            console.error("sessionHistoryManager: Invalid sessionData, cannot add to history.", sessionData);
            return;
        }
        console.log("sessionHistoryManager: Adding completed session:", sessionData.sessionId, sessionData); // Log sessionData
        completedSessions[sessionData.sessionId] = sessionData;
        saveToStorage();
        updateSummaryListUI();
    }

    function getCompletedSessions() { // Returns array, sorted by date descending
        const sessions = Object.values(completedSessions).sort((a, b) => {
            const timeA = a.rawTranscript?.[0]?.timestamp ? new Date(a.rawTranscript[0].timestamp).getTime() : 0;
            const timeB = b.rawTranscript?.[0]?.timestamp ? new Date(b.rawTranscript[0].timestamp).getTime() : 0;
            const dateAValid = a.date && !isNaN(new Date(a.date).getTime());
            const dateBValid = b.date && !isNaN(new Date(b.date).getTime());
            const fullDateA = dateAValid ? new Date(a.date).setHours(0, 0, 0, 0) + timeA : timeA;
            const fullDateB = dateBValid ? new Date(b.date).setHours(0, 0, 0, 0) + timeB : timeB;
            return fullDateB - fullDateA;
        });
        console.log("sessionHistoryManager: Retrieved completed sessions:", sessions.length);
        return sessions;
    }

    function getSessionById(sessionId) {
        const session = completedSessions[sessionId] || null;
        console.log("sessionHistoryManager: Retrieved session by ID:", sessionId, session);
        return session;
    }

    function downloadTranscript(sessionId) {
        const { polyglotHelpers } = getDeps();
        const sessionData = getSessionById(sessionId);
        if (!sessionData?.rawTranscript || !polyglotHelpers) {
            alert("No transcript data available for this session or helper utilities missing.");
            console.warn("sessionHistoryManager: Transcript download failed for session:", sessionId);
            return;
        }

        let transcriptText = `Session with ${polyglotHelpers.sanitizeTextForDisplay(sessionData.connectorName)} on ${polyglotHelpers.sanitizeTextForDisplay(sessionData.date)}\n`;
        transcriptText += `Type: ${polyglotHelpers.sanitizeTextForDisplay(sessionData.sessionType || 'N/A')}\n`;
        transcriptText += `Duration: ${polyglotHelpers.sanitizeTextForDisplay(sessionData.duration)}\n\n`;
        transcriptText += "--- Conversation Transcript ---\n";
        sessionData.rawTranscript.forEach(msg => {
            const speaker = msg.sender.includes('user') ? 'You' : polyglotHelpers.sanitizeTextForDisplay(sessionData.connectorName.split(' ')[0]);
            const textContent = typeof msg.text === 'string' ? polyglotHelpers.sanitizeTextForDisplay(msg.text) : `[${polyglotHelpers.sanitizeTextForDisplay(msg.type || 'Non-text')}]`;
            transcriptText += `${speaker}: ${textContent}\n`;
        });
        transcriptText += `\n--- AI Debrief ---\n`;
        transcriptText += `Topics: ${polyglotHelpers.sanitizeTextForDisplay(sessionData.topics?.join('; ') || 'N/A')}\n`;
        transcriptText += `Vocabulary: ${polyglotHelpers.sanitizeTextForDisplay(sessionData.vocabulary?.join('; ') || 'N/A')}\n`;
        transcriptText += `Focus Areas: ${polyglotHelpers.sanitizeTextForDisplay(sessionData.focusAreas?.join('; ') || 'N/A')}\n`;

        const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const safeConnectorName = polyglotHelpers.sanitizeTextForDisplay(sessionData.connectorName).replace(/\s+/g, '_');
        const safeDate = polyglotHelpers.sanitizeTextForDisplay(sessionData.date).replace(/\//g, '-');
        a.download = `PolyglotDebrief_${safeConnectorName}_${safeDate}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        console.log("sessionHistoryManager: Transcript downloaded for session:", sessionId);
    }

    function updateSummaryListUI() {
        const { listRenderer, viewManager } = getDeps();
        const sessions = getCompletedSessions(); // This already sorts and returns an array
        console.log("sessionHistoryManager: updateSummaryListUI - Rendering sessions:", sessions.length);

        if (listRenderer && viewManager && typeof viewManager.displaySessionSummaryInView === 'function') {
            // Prepare data for listRenderer:
            const sessionsForList = sessions.map(session => ({
                ...session, // Spread all existing session properties
                connectorId: session.connector?.id, // Add connectorId at the top level
            }));

            listRenderer.renderSummaryList(sessionsForList, viewManager.displaySessionSummaryInView);
            console.log("sessionHistoryManager: Summary list rendered with viewManager.displaySessionSummaryInView callback.");
        } else if (listRenderer) {
            // Fallback if viewManager.displaySessionSummaryInView is not available
            const sessionsForList = sessions.map(session => ({
                ...session,
                connectorId: session.connector?.id,
            }));
            console.warn("sessionHistoryManager: viewManager.displaySessionSummaryInView not found. Summary list clicks may use fallback.");
            listRenderer.renderSummaryList(sessionsForList, (session) => {
                console.log("sessionHistoryManager: Fallback summary item clicked:", session?.sessionId);
            });
        } else {
            console.warn("sessionHistoryManager: listRenderer not available to update summary list UI.");
        }
    }

    // Ensure initialization and export
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeHistory);
    } else {
        initializeHistory();
    }

    console.log("js/sessions/session_history_manager.js loaded.");
    return {
        initializeHistory,
        addCompletedSession,
        getCompletedSessions, // Expose for sessionManager facade
        getSessionById,       // Expose for sessionManager facade / viewManager
        downloadTranscript,   // Expose for sessionManager facade
        updateSummaryListUI   // Expose if needed to be called externally (e.g., after deleting history)
    };
})();