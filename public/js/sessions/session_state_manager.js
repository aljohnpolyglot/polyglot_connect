// js/sessions/session_state_manager.js
// Manages common state for modal sessions (ID, connector, type, transcript).

window.sessionStateManager = (() => {
    'use strict';

    const getDeps = () => ({
        domElements: window.domElements,
        modalHandler: window.modalHandler,
        uiUpdater: window.uiUpdater,
        polyglotHelpers: window.polyglotHelpers,
        aiService: window.aiService, // CHANGED from geminiService
        sessionHistoryManager: window.sessionHistoryManager,
        aiApiConstants: window._aiApiConstants // For PROVIDERS.GROQ etc.
    });

    let currentSession = {
        connector: null,
        sessionType: null,
        sessionId: null,
        startTime: null,
        transcript: []
    };

    function initializeBaseSession(connector, sessionType) {
        console.log("sessionStateManager: initializeBaseSession for", connector?.id, "Type:", sessionType);
        const { uiUpdater, domElements, modalHandler } = getDeps();

        if (!connector || !sessionType) {
            console.error("sessionStateManager: Connector or sessionType missing for initialization.");
            return false;
        }
        if (currentSession.sessionId) {
            console.warn("sessionStateManager: Attempted to initialize base session while one is active:", currentSession.sessionId);
            return false;
        }

        currentSession.connector = connector;
        currentSession.sessionType = sessionType;
        currentSession.sessionId = `${connector.id}_${sessionType}_${Date.now()}`;
        currentSession.transcript = [];
        currentSession.startTime = null;

        if (uiUpdater && domElements?.virtualCallingScreen && modalHandler) {
            uiUpdater.updateVirtualCallingScreen(connector, sessionType);
            modalHandler.open(domElements.virtualCallingScreen);
        } else {
            console.error("sessionStateManager: Missing UI deps for virtual calling screen.");
            return false;
        }
        return true;
    }

    function markSessionAsStarted() {
        currentSession.startTime = new Date();
        console.log("sessionStateManager: Session marked as started at", currentSession.startTime);
    }

    function addTurnToTranscript(sender, text, type = 'message') {
        if (!currentSession.sessionId) return;
        currentSession.transcript.push({
            sender: sender,
            text: text,
            type: type,
            timestamp: Date.now()
        });
    }

    function getCurrentTranscript() {
        return [...currentSession.transcript];
    }

    function getCurrentSessionDetails() {
        if (!currentSession.sessionId) return null;
        return { ...currentSession };
    }

    async function finalizeBaseSession(generateRecap = true) {
        console.log("sessionStateManager: finalizeBaseSession. Recap:", generateRecap, "SessionID:", currentSession.sessionId);
        const { uiUpdater, domElements, modalHandler, aiService, sessionHistoryManager, aiApiConstants } = getDeps();

        if (!currentSession.connector || !currentSession.sessionId) {
            console.warn("sessionStateManager: No active session to finalize.");
            resetBaseSessionState();
            return;
        }

        // It's important that `currentSession.connector` is the full connector object here
        if (!currentSession.connector.profileName || !currentSession.connector.language) {
             console.error("sessionStateManager: Finalizing session but currentSession.connector is incomplete.", currentSession.connector);
             // Handle this error, perhaps by not generating a recap or using defaults
        }


        if (generateRecap && currentSession.transcript.length > 0 && aiService && uiUpdater && modalHandler && domElements?.sessionRecapScreen && sessionHistoryManager) {
            const callEndTime = new Date();
            const durationMs = currentSession.startTime ? callEndTime.getTime() - currentSession.startTime.getTime() : 0;
            const durationFormatted = `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`;

            const recapDataForStorage = { // Data to be stored, including what AI generates
                sessionId: currentSession.sessionId,
                connectorId: currentSession.connector.id, // Ensure connectorId is stored
                connectorName: currentSession.connector.profileName || "Partner",
                connector: { ...currentSession.connector }, // Store a snapshot of the connector
                date: currentSession.startTime?.toLocaleDateString() || new Date().toLocaleDateString(),
                duration: durationFormatted,
                rawTranscript: [...currentSession.transcript],
                sessionType: currentSession.sessionType,
                // Placeholder for AI generated parts
                conversationSummary: "Generating summary...",
                keyTopicsDiscussed: ["Generating..."],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "Generating feedback..."
            };

            // Show modal with "Generating..." placeholders
            uiUpdater.populateRecapModal(recapDataForStorage);
            modalHandler.open(domElements.sessionRecapScreen);

            try {
                console.log("sessionStateManager: Requesting recap from aiService with Groq provider for session:", currentSession.sessionId);
                // UPDATED to call aiService and specify GROQ provider
                const aiGeneratedRecap = await aiService.generateSessionRecap(
                    currentSession.transcript,
                    currentSession.connector, // Pass the full connector object
                    aiApiConstants.PROVIDERS.GROQ
                );

                // Merge AI generated parts into recapDataForStorage
                const fullRecap = {
                    ...recapDataForStorage, // Keeps sessionId, connectorId, connectorName, etc.
                    ...aiGeneratedRecap     // Overwrites/adds AI generated fields
                };

                sessionHistoryManager.addCompletedSession(fullRecap);
                uiUpdater.populateRecapModal(fullRecap); // Update UI with full recap
            } catch (err) {
                console.error("sessionStateManager: Recap generation error from aiService:", err);
                const errorRecap = {
                    ...recapDataForStorage, // Keep existing details
                    conversationSummary: `Debrief failed: ${err.message?.substring(0, 70) || 'Unknown error'}...`,
                    keyTopicsDiscussed: ["Error"],
                    newVocabularyAndPhrases: [],
                    goodUsageHighlights: [],
                    areasForImprovement: [],
                    suggestedPracticeActivities: [],
                    overallEncouragement: "Could not generate detailed feedback for this session."
                };
                sessionHistoryManager.addCompletedSession(errorRecap);
                uiUpdater.populateRecapModal(errorRecap);
            }
        } else if (generateRecap && currentSession.transcript.length === 0) {
            console.log("sessionStateManager: No transcript to generate recap for session:", currentSession.sessionId);
             const noTranscriptRecap = {
                sessionId: currentSession.sessionId,
                connectorId: currentSession.connector.id,
                connectorName: currentSession.connector.profileName || "Partner",
                connector: { ...currentSession.connector },
                date: currentSession.startTime?.toLocaleDateString() || new Date().toLocaleDateString(),
                duration: "0m 0s",
                rawTranscript: [],
                sessionType: currentSession.sessionType,
                conversationSummary: "No conversation took place in this session.",
                keyTopicsDiscussed: ["N/A"],
                newVocabularyAndPhrases: [],
                goodUsageHighlights: [],
                areasForImprovement: [],
                suggestedPracticeActivities: [],
                overallEncouragement: "Try chatting a bit next time!"
            };
            sessionHistoryManager.addCompletedSession(noTranscriptRecap);
            // Optionally show a simplified recap modal or just skip it
            uiUpdater.populateRecapModal(noTranscriptRecap);
            modalHandler.open(domElements.sessionRecapScreen);
        }
        resetBaseSessionState();
    }

    function resetBaseSessionState() {
        console.log("sessionStateManager: resetBaseSessionState.");
        currentSession.connector = null;
        currentSession.sessionType = null;
        currentSession.sessionId = null;
        currentSession.startTime = null;
        currentSession.transcript = [];
    }

    function isSessionActive() {
        return !!currentSession.sessionId;
    }

    console.log("js/sessions/session_state_manager.js loaded, updated for aiService.");
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