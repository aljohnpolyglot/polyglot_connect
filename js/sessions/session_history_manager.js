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
    const functionName = "downloadTranscript";
    console.log(`sessionHistoryManager (${functionName}): Attempting to download transcript for session ID: ${sessionId}`);
    
    // FIX: Use the getSessionById function which accesses the in-memory 'completedSessions'
    const session = getSessionById(sessionId); 

    if (!session) {
        console.error(`sessionHistoryManager (${functionName}): Session with ID ${sessionId} not found for download (from in-memory cache).`);
        alert("Error: Could not find session data to download transcript.");
        return;
    }

    if (!session.rawTranscript || session.rawTranscript.length === 0) {
        console.warn(`sessionHistoryManager (${functionName}): No raw transcript found for session ${sessionId}.`);
        alert("No transcript data available for this session.");
        return;
    }

    // --- Filename Generation ---
    const connectorName = session.connectorName ? session.connectorName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'partner';
    let timestampForFile = 'unknown_date';

    if (session.startTimeISO) {
        try {
            const startDate = new Date(session.startTimeISO);
            // Format: YYYYMMDD_HHMMSS
            const year = startDate.getFullYear();
            const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
            const day = startDate.getDate().toString().padStart(2, '0');
            const hours = startDate.getHours().toString().padStart(2, '0');
            const minutes = startDate.getMinutes().toString().padStart(2, '0');
            const seconds = startDate.getSeconds().toString().padStart(2, '0');
            timestampForFile = `${year}${month}${day}_${hours}${minutes}${seconds}`;
        } catch (e) {
            console.warn(`sessionHistoryManager (${functionName}): Could not parse startTimeISO '${session.startTimeISO}' for filename. Using fallback.`);
            // Fallback if startTimeISO is invalid, use current date/time or just the session ID part
            const now = new Date();
            timestampForFile = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        }
    } else if (session.date) { // Fallback to less precise date if startTimeISO is missing
        timestampForFile = session.date.replace(/[^a-z0-9]/gi, '_');
    }

    const filename = `PolyglotConnect_Transcript_${connectorName}_${timestampForFile}.txt`;
    // --- End Filename Generation ---

    let transcriptContent = `Session with ${session.connectorName || 'Partner'} on ${session.date || 'Unknown Date'}\n`;
    transcriptContent += `Type: ${session.sessionType || 'N/A'}\n`;
    transcriptContent += `Duration: ${session.duration || 'N/A'}\n`;
    if (session.startTimeISO) transcriptContent += `Started: ${new Date(session.startTimeISO).toLocaleString()}\n`;
    if (session.endTimeISO) transcriptContent += `Ended: ${new Date(session.endTimeISO).toLocaleString()}\n`;
    transcriptContent += `\n--- Conversation Transcript ---\n`;

    // Use polyglotHelpers.formatTranscriptForLLM for a nice, readable format
    // or create a simpler one here if preferred for raw download.
    // For consistency, let's assume polyglotHelpers is available or make it a dependency.
    const { polyglotHelpers } = window; // Or getDeps() if you have that structure here

    if (polyglotHelpers && typeof polyglotHelpers.formatTranscriptForLLM === 'function') {
        transcriptContent += polyglotHelpers.formatTranscriptForLLM(session.rawTranscript, session.connectorName, "You");
    } else {
        // Simpler fallback formatting if helper is not available
        session.rawTranscript.forEach(turn => {
            const speaker = turn.sender === 'user-audio-transcript' || turn.sender === 'user-typed' ? 'You' : (session.connectorName || 'Partner');
            transcriptContent += `${speaker}: ${turn.text}\n`;
        });
    }

    // Include AI Debrief if available and non-minimal
    if (session.conversationSummary && !session.conversationSummary.toLowerCase().includes("too short") && !session.conversationSummary.toLowerCase().includes("error")) {
        transcriptContent += "\n\n--- AI Debrief ---\n";
        transcriptContent += `Summary: ${session.conversationSummary}\n`;
        if (session.keyTopicsDiscussed && session.keyTopicsDiscussed.length > 0 && session.keyTopicsDiscussed[0] !== "N/A" && !session.keyTopicsDiscussed[0].toLowerCase().includes("error")) {
            transcriptContent += `\nKey Topics: ${session.keyTopicsDiscussed.join(', ')}\n`;
        }
        if (session.newVocabularyAndPhrases && session.newVocabularyAndPhrases.length > 0) {
            transcriptContent += "\nNew Vocabulary/Phrases:\n";
            session.newVocabularyAndPhrases.forEach(vocab => {
                transcriptContent += `  - ${vocab.term}: ${vocab.translation} (e.g., "${vocab.exampleSentence}")\n`;
            });
        }
        if (session.areasForImprovement && session.areasForImprovement.length > 0) {
            transcriptContent += "\nAreas for Improvement:\n";
            session.areasForImprovement.forEach(area => {
                transcriptContent += `  - ${area.areaType}: ${area.coachSuggestion} (Explanation: ${area.explanation || 'N/A'})\n`;
            });
        }
        // Add other debrief sections as desired
        if(session.overallEncouragement) {
            transcriptContent += `\nCoach's Note: ${session.overallEncouragement}\n`;
        }
    }

    try {
        const blob = new Blob([transcriptContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        console.log(`sessionHistoryManager (${functionName}): Transcript '${filename}' download initiated.`);
    } catch (e) {
        console.error(`sessionHistoryManager (${functionName}): Error creating download link for transcript:`, e);
        alert("Sorry, there was an error preparing the transcript for download.");
    }
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