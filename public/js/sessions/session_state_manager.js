// js/sessions/session_state_manager.js
// Manages common state for modal sessions (ID, connector, type, transcript) and triggers recaps.

window.sessionStateManager = (() => {
    'use strict';

    // --- Robust Dependency Check at Load Time ---
    const criticalInitialDeps = {
        polyglotHelpers: window.polyglotHelpers,
        // aiService and sessionHistoryManager are often used in methods,
        // but polyglotHelpers is used in initialize().
        // A full check can also be done in initialize().
    };
    if (!criticalInitialDeps.polyglotHelpers) {
        console.error("SessionStateManager: CRITICAL - polyglotHelpers not found at load time. Initialization and storage will fail.");
        // Return a non-functional dummy object if critical initial deps are missing
        const errorMsg = "SessionStateManager not initialized (missing helpers).";
        return {
            initializeBaseSession: () => { console.error(errorMsg); return false; },
            markSessionAsStarted: () => console.error(errorMsg),
            addTurnToTranscript: () => console.error(errorMsg),
            getCurrentTranscript: () => { console.error(errorMsg); return []; },
            getCurrentSessionDetails: () => { console.error(errorMsg); return null; },
            finalizeBaseSession: async () => console.error(errorMsg),
            resetBaseSessionState: () => console.error(errorMsg),
            isSessionActive: () => { console.error(errorMsg); return false; }
        };
    }
    
    // getDeps will be called by methods, allowing for later script loads if structured carefully,
    // but it's safer if all are available by the time methods are first called.
    const getDeps = () => ({
        domElements: window.domElements,
        modalHandler: window.modalHandler,
        uiUpdater: window.uiUpdater,
        polyglotHelpers: window.polyglotHelpers,
        aiService: window.aiService,
        sessionHistoryManager: window.sessionHistoryManager,
        aiApiConstants: window._aiApiConstants // For PROVIDERS constants
    });

    let currentSession = {
        connector: null,
        sessionType: null,
        sessionId: null,
        startTime: null,
        transcript: [] // Array of { sender, text, type, timestamp }
    };

    function initializeBaseSession(connector, sessionType) {
        console.log(`SessionStateManager: initializeBaseSession for connector '${connector?.id}', Type: '${sessionType}'`);
        const { uiUpdater, domElements, modalHandler } = getDeps();

        if (!connector || !connector.id || !connector.profileName || !sessionType) {
            console.error("SessionStateManager: Invalid or incomplete connector data or sessionType for initialization.", {connector, sessionType});
            return false;
        }
        if (currentSession.sessionId) {
            console.warn(`SessionStateManager: Attempted to initialize new session while session '${currentSession.sessionId}' is already active. Please finalize or reset first.`);
            // Optionally, auto-finalize previous or prevent new one. For now, prevent.
            return false;
        }

        currentSession.connector = { ...connector }; // Store a copy of the connector data
        currentSession.sessionType = sessionType;
        currentSession.sessionId = `${connector.id}_${sessionType}_${Date.now()}`;
        currentSession.transcript = [];
        currentSession.startTime = null; // Will be set by markSessionAsStarted

        if (uiUpdater && domElements?.virtualCallingScreen && modalHandler) {
            uiUpdater.updateVirtualCallingScreen(currentSession.connector, currentSession.sessionType); // Pass currentSession's connector
            modalHandler.open(domElements.virtualCallingScreen);
        } else {
            console.error("SessionStateManager: Missing UI dependencies (uiUpdater, domElements.virtualCallingScreen, or modalHandler) for displaying virtual calling screen.");
            // Proceed with session logic but UI might not update.
        }
        console.log(`SessionStateManager: Base session '${currentSession.sessionId}' initialized.`);
        return true;
    }

    function markSessionAsStarted() {
        if (!currentSession.sessionId) {
            console.warn("SessionStateManager: Cannot mark session as started, no active session ID.");
            return;
        }
        currentSession.startTime = new Date();
        console.log(`SessionStateManager: Session '${currentSession.sessionId}' marked as started at ${currentSession.startTime.toISOString()}`);
    }

    function addTurnToTranscript(sender, text, type = 'message') {
        if (!currentSession.sessionId) {
            // console.warn("SessionStateManager: No active session to add transcript to. Sender:", sender);
            return;
        }
        if (typeof text !== 'string') {
            console.warn(`SessionStateManager: Attempted to add non-string text to transcript for session '${currentSession.sessionId}'. Text:`, text);
            text = String(text || "[Non-text content]"); // Coerce to string or provide placeholder
        }
        currentSession.transcript.push({
            sender: String(sender),
            text: text,
            type: String(type),
            timestamp: Date.now()
        });
        // console.debug(`SessionStateManager: Turn added to transcript for session '${currentSession.sessionId}'. Sender: ${sender}, Type: ${type}, Text: "${text.substring(0,30)}..."`);
    }

    function getCurrentTranscript() {
        return currentSession.sessionId ? [...currentSession.transcript] : [];
    }

    function getCurrentSessionDetails() {
        return currentSession.sessionId ? { ...currentSession } : null;
    }

    async function finalizeBaseSession(generateRecap = true) {
        console.log(`SessionStateManager: finalizeBaseSession called. Generate Recap: ${generateRecap}, SessionID: '${currentSession.sessionId}'`);
        const { uiUpdater, domElements, modalHandler, aiService, sessionHistoryManager, aiApiConstants } = getDeps();

        if (!currentSession.connector || !currentSession.sessionId) {
            console.warn("SessionStateManager: No active session to finalize. State already reset or never initialized.");
            resetBaseSessionState(); // Ensure clean state
            return;
        }
        
        // Ensure dependencies for recap are present if generateRecap is true
        if (generateRecap && (!aiService || !sessionHistoryManager || !uiUpdater || !modalHandler || !domElements?.sessionRecapScreen || !aiApiConstants)) {
            console.error("SessionStateManager: Cannot generate recap due to missing critical dependencies (aiService, sessionHistoryManager, UI elements, or aiApiConstants).");
            generateRecap = false; // Force recap off if dependencies are missing
        }
        
        const sessionToFinalize = { ...currentSession }; // Work with a snapshot
        resetBaseSessionState(); // Reset global state immediately so new sessions can start

        if (generateRecap && sessionToFinalize.transcript.length > 0) {
            const callEndTime = new Date();
            const durationMs = sessionToFinalize.startTime ? callEndTime.getTime() - new Date(sessionToFinalize.startTime).getTime() : 0;
            const durationFormatted = `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;

            const initialRecapDataForUI = {
                sessionId: sessionToFinalize.sessionId,
                connectorId: sessionToFinalize.connector.id,
                connectorName: sessionToFinalize.connector.profileName || sessionToFinalize.connector.name || "Partner",
                connector: { ...sessionToFinalize.connector },
                date: sessionToFinalize.startTime ? new Date(sessionToFinalize.startTime).toLocaleDateString() : new Date().toLocaleDateString(),
                duration: durationFormatted,
                rawTranscript: [...sessionToFinalize.transcript],
                sessionType: sessionToFinalize.sessionType,
                conversationSummary: "Generating summary, please wait...",
                keyTopicsDiscussed: ["Generating..."],
                newVocabularyAndPhrases: [], goodUsageHighlights: [], areasForImprovement: [],
                suggestedPracticeActivities: [], overallEncouragement: "Analyzing your conversation..."
            };

            uiUpdater.populateRecapModal(initialRecapDataForUI);
            modalHandler.open(domElements.sessionRecapScreen);

            try {
                console.log(`SessionStateManager: Requesting recap from aiService (preferred: Groq) for session: '${sessionToFinalize.sessionId}'`);
                const aiGeneratedRecap = await aiService.generateSessionRecap(
                    sessionToFinalize.transcript,
                    sessionToFinalize.connector,
                    aiApiConstants.PROVIDERS.GROQ // Prefer Groq for recaps, aiService handles fallback
                );

                // aiService should return a structured recap, even if it's an error structure
                const finalRecapForStorageAndUI = {
                    ...initialRecapDataForUI, // Base details
                    ...aiGeneratedRecap         // Overwrite/add AI generated fields (or error fields from aiService)
                };

                sessionHistoryManager.addCompletedSession(finalRecapForStorageAndUI);
                uiUpdater.populateRecapModal(finalRecapForStorageAndUI);
                console.log(`SessionStateManager: Recap generated and UI updated for session '${sessionToFinalize.sessionId}'. Summary starts: "${finalRecapForStorageAndUI.conversationSummary.substring(0,50)}..."`);

            } catch (unexpectedErrorFromAIService) { // Should ideally not happen if aiService catches its own errors
                console.error("SessionStateManager: UNEXPECTED error during aiService.generateSessionRecap call:", unexpectedErrorFromAIService);
                const errorFallbackRecap = {
                    ...initialRecapDataForUI,
                    conversationSummary: "A critical error occurred while generating the debrief. Please try again later.",
                    keyTopicsDiscussed: ["Error"], // Keep other fields as empty arrays or defaults
                    newVocabularyAndPhrases: [], goodUsageHighlights: [], areasForImprovement: [],
                    suggestedPracticeActivities: [], overallEncouragement: "We apologize for the inconvenience."
                };
                sessionHistoryManager.addCompletedSession(errorFallbackRecap);
                uiUpdater.populateRecapModal(errorFallbackRecap);
            }
        } else if (generateRecap && sessionToFinalize.transcript.length === 0) {
            console.log(`SessionStateManager: No transcript to generate recap for session: '${sessionToFinalize.sessionId}'. Displaying minimal recap.`);
             const noTranscriptRecap = {
                sessionId: sessionToFinalize.sessionId,
                connectorId: sessionToFinalize.connector.id,
                connectorName: sessionToFinalize.connector.profileName || "Partner",
                connector: { ...sessionToFinalize.connector },
                date: sessionToFinalize.startTime ? new Date(sessionToFinalize.startTime).toLocaleDateString() : new Date().toLocaleDateString(),
                duration: "0m 0s", rawTranscript: [], sessionType: sessionToFinalize.sessionType,
                conversationSummary: "No conversation took place in this session.",
                keyTopicsDiscussed: ["N/A"], newVocabularyAndPhrases: [], goodUsageHighlights: [],
                areasForImprovement: [], suggestedPracticeActivities: [],
                overallEncouragement: "Try chatting a bit next time to get a full debrief!"
            };
            sessionHistoryManager.addCompletedSession(noTranscriptRecap);
            if (uiUpdater && modalHandler && domElements?.sessionRecapScreen) {
                uiUpdater.populateRecapModal(noTranscriptRecap);
                modalHandler.open(domElements.sessionRecapScreen);
            }
        } else {
            console.log(`SessionStateManager: Recap not generated for session '${sessionToFinalize.sessionId}' (recap disabled or no transcript).`);
        }
    }

    function resetBaseSessionState() {
        console.log(`SessionStateManager: Resetting base session state. Previous session ID was: '${currentSession.sessionId || 'none'}'`);
        currentSession = {
            connector: null, sessionType: null, sessionId: null,
            startTime: null, transcript: []
        };
    }

    function isSessionActive() {
        return !!currentSession.sessionId;
    }

    if (window.polyglotHelpers) { // Check if polyglotHelpers was indeed available as per initial check
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
        isSessionActive
    };
})();