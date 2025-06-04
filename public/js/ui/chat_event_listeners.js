// js/ui/chat_event_listeners.js
// Responsible for setting up all event listeners for chat UI controls.

console.log("chat_event_listeners.js: Script execution STARTED.");

window.chatEventListeners = (() => {
    'use strict';
    console.log("chat_event_listeners.js: IIFE (module definition) STARTING.");

    let listenersInitialized = false; // Flag to prevent multiple initializations

    const getSafeDeps = () => {
        // console.log("chat_event_listeners.js: getSafeDeps() called.");
        const deps = {
            domElements: window.domElements,
            personaModalManager: window.personaModalManager,
            chatSessionHandler: window.chatSessionHandler,
            chatActiveTargetManager: window.chatActiveTargetManager,
            voiceMemoHandler: window.voiceMemoHandler,
            groupManager: window.groupManager,
            polyglotApp: window.polyglotApp,
            // Dependencies needed for handleCallEventButtonClick
            sessionHistoryManager: window.sessionHistoryManager,
            uiUpdater: window.uiUpdater,
            modalHandler: window.modalHandler,
            viewManager: window.viewManager 
        };
        let allPresent = true;

        // Perform your original detailed checks or a simplified one
        if (!deps.polyglotApp || typeof deps.polyglotApp.initiateSession !== 'function') {
            console.error("ChatEventListeners: CRITICAL DEPENDENCY MISSING - window.polyglotApp or window.polyglotApp.initiateSession is not ready.", "polyglotApp:", deps.polyglotApp);
            allPresent = false;
        }
        for (const key in deps) { // Simple check for existence
            if (!deps[key] && key !== 'polyglotApp') { // polyglotApp is checked above
                // Log more selectively if some are optional for certain operations
                console.warn(`ChatEventListeners: Dependency window.${key} is MISSING.`);
                 // Decide if all are truly critical for the module to load or just for specific functions
                // For now, let's assume they should generally be present for full functionality.
                // allPresent = false; // Uncomment if any missing basic dep should halt everything.
            }
        }
        return deps; // Return deps anyway, functions should check for what they need
    };

    // --- Main handler for call event buttons ---
    // THIS FUNCTION IS DEFINED AT THE IIFE SCOPE
    function handleCallEventButtonClick(event) {
        const button = event.target.closest('.call-event-action-btn');
        if (!button) return; 

        const action = button.dataset.action;
        const targetConnectorId = button.dataset.connectorId; 
        const sessionId = button.dataset.sessionId;     

        const deps = getSafeDeps(); 
        if (!deps) {
            console.error("ChatEventListeners (handleCallEventButtonClick): Could not get dependencies. Aborting.");
            return;
        }
        
        const { 
            polyglotApp, 
            domElements, 
            modalHandler, 
            sessionHistoryManager, 
            uiUpdater 
        } = deps;

        // Critical check for polyglotApp for any action here
        if (!polyglotApp) {
            console.error("ChatEventListeners (handleCallEventButtonClick): polyglotApp is missing.");
            return;
        }

        console.log(`ChatEventListeners: Call event button clicked. Action: '${action}', ConnectorID: '${targetConnectorId}', SessionID: '${sessionId}'`);

        if (action === 'call_back' || action === 'call_again') {
            if (!targetConnectorId) {
                console.error("ChatEventListeners: No connectorId found on call_back/call_again button.");
                alert("Partner information missing for call back.");
                return;
            }
            if (typeof polyglotApp.initiateSession !== 'function') {
                console.error("ChatEventListeners: polyglotApp.initiateSession is not available for call action.");
                return;
            }
            const connector = window.polyglotConnectors?.find(c => c.id === targetConnectorId);
            if (!connector) {
                console.error(`ChatEventListeners: Connector with ID ${targetConnectorId} not found.`);
                alert("Could not find partner information to call.");
                return;
            }

            // Check for modalHandler and isVisible specifically
            if (domElements.messagingInterface && modalHandler && typeof modalHandler.isVisible === 'function') {
                if (modalHandler.isVisible(domElements.messagingInterface)) {
                     window.chatSessionHandler?.endActiveModalMessagingSession?.(false); 
                }
            } else if (domElements.messagingInterface && modalHandler && typeof modalHandler.isVisible !== 'function') {
                console.warn("ChatEventListeners: modalHandler.isVisible is not a function. Cannot check if message modal is open before initiating call.");
                // Proceed with call, but be aware modal might stay open if it was.
            } else if (domElements.messagingInterface && !modalHandler) {
                console.warn("ChatEventListeners: modalHandler is not available. Cannot check if message modal is open.");
            }

            polyglotApp.initiateSession(connector, 'direct_modal');

        } else if (action === 'view_summary') {
            if (!sessionId) {
                console.error("ChatEventListeners: No sessionId found on view_summary button.");
                alert("Session information missing for summary.");
                return;
            }
            // Check all dependencies for this specific action path
            if (!sessionHistoryManager || typeof sessionHistoryManager.getSessionById !== 'function' ||
                !uiUpdater || typeof uiUpdater.populateRecapModal !== 'function' ||
                !modalHandler || typeof modalHandler.open !== 'function' || 
                !domElements || !domElements.sessionRecapScreen) {
                
                console.error("ChatEventListeners (view_summary): Missing one or more critical dependencies for displaying summary.");
                alert("Cannot display session summary due to an internal error. (Missing components)");
                return;
            }

            const sessionData = sessionHistoryManager.getSessionById(sessionId);
            if (sessionData) {
                uiUpdater.populateRecapModal(sessionData);
                modalHandler.open(domElements.sessionRecapScreen);
            } else {
                console.error(`ChatEventListeners: Session data not found for ID ${sessionId}.`);
                uiUpdater.populateRecapModal({ 
                    connectorName: "Error", 
                    date: new Date().toLocaleDateString(),
                    duration: "N/A",
                    conversationSummary: `Could not load details for session ID: ${sessionId}. The session might not be in history.`,
                    keyTopicsDiscussed: [], newVocabularyAndPhrases: [], goodUsageHighlights: [], areasForImprovement: [], suggestedPracticeActivities: [], overallEncouragement: ""
                });
                modalHandler.open(domElements.sessionRecapScreen);
            }
        }
    }

    // --- YOUR ORIGINAL setupAllChatInteractionListeners RESTORED ---
    function setupAllChatInteractionListeners() {
        console.log("chat_event_listeners.js: setupAllChatInteractionListeners() - START.");
        const depsForSetup = getSafeDeps(); 
        if (!depsForSetup) { 
            console.error("ChatEventListeners: Cannot setup general listeners due to missing critical dependencies (getSafeDeps returned null). Aborting setupAllChatInteractionListeners.");
            return;
        }

        const {
            domElements, personaModalManager, chatSessionHandler,
            chatActiveTargetManager, voiceMemoHandler, groupManager, polyglotApp
        } = depsForSetup;

        // Add specific checks for dependencies directly used by this function
        if (!domElements || !personaModalManager || !chatSessionHandler || 
            !chatActiveTargetManager || !voiceMemoHandler || !groupManager || 
            !polyglotApp || typeof polyglotApp.initiateSession !== 'function') {
            console.error("ChatEventListeners (setupAllChatInteractionListeners): One or more core dependencies are missing. Aborting setup.");
            return;
        }

        console.log("ChatEventListeners: All dependencies for setupAllChatInteractionListeners seem present. Proceeding to add listeners...");

        const addSafeListener = (element, eventType, handlerFn, options = {}) => {
            if (element && typeof handlerFn === 'function') {
                element.removeEventListener(eventType, handlerFn, options);
                element.addEventListener(eventType, handlerFn, options);
            } else {
                if (!element) console.warn(`ChatEventListeners: Element for listener type '${eventType}' not found.`);
                if (typeof handlerFn !== 'function') console.warn(`ChatEventListeners: Handler for listener type '${eventType}' is not a function for element:`, element?.id || element?.tagName);
            }
        };

        // --- Embedded 1-on-1 Chat Listeners ---
        console.log("ChatEventListeners: Setting up embedded 1-on-1 chat listeners.");
        addSafeListener(domElements.embeddedMessageSendBtn, 'click', () => {
            // console.log("ChatEventListeners: embeddedMessageSendBtn CLICKED.");
            if (chatSessionHandler?.sendMessageFromEmbeddedUI) chatSessionHandler.sendMessageFromEmbeddedUI();
            else console.error("ChatEventListeners: chatSessionHandler.sendMessageFromEmbeddedUI is not available for embedded send button.");
        });
        addSafeListener(domElements.embeddedMessageTextInput, 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // console.log("ChatEventListeners: embeddedMessageTextInput ENTER pressed.");
                e.preventDefault();
                if (chatSessionHandler?.sendMessageFromEmbeddedUI) chatSessionHandler.sendMessageFromEmbeddedUI();
                else console.error("ChatEventListeners: chatSessionHandler.sendMessageFromEmbeddedUI is not available for embedded text input enter.");
            }
        });
        addSafeListener(domElements.embeddedMessageAttachBtn, 'click', () => {
            // console.log("ChatEventListeners: embeddedMessageAttachBtn CLICKED.");
            if (chatActiveTargetManager?.getEmbeddedChatTargetId()) {
                if (domElements.embeddedMessageImageUpload) {
                    // console.log("ChatEventListeners: Triggering click on embeddedMessageImageUpload.");
                    domElements.embeddedMessageImageUpload.value = '';
                    domElements.embeddedMessageImageUpload.click();
                } else console.warn("ChatEventListeners: domElements.embeddedMessageImageUpload not found.");
            } else {
                alert("Please open or select a chat to send an image to.");
                console.warn("ChatEventListeners: embeddedMessageAttachBtn - No active embedded chat target.");
            }
        });
        addSafeListener(domElements.embeddedMessageImageUpload, 'change', (event) => {
            // console.log("ChatEventListeners: embeddedMessageImageUpload CHANGED.");
            if (chatSessionHandler?.handleImageUploadFromEmbeddedUI) chatSessionHandler.handleImageUploadFromEmbeddedUI(event);
            else console.error("ChatEventListeners: chatSessionHandler.handleImageUploadFromEmbeddedUI is not available.");
        });
        addSafeListener(domElements.embeddedMessageMicBtn, 'click', () => {
            // console.log("ChatEventListeners: embeddedMessageMicBtn CLICKED.");
            const targetId = chatActiveTargetManager?.getEmbeddedChatTargetId();
            if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetId && domElements.embeddedMessageMicBtn) {
                // console.log("ChatEventListeners: Calling voiceMemoHandler.handleNewVoiceMemoInteraction (embedded) for target:", targetId);
                voiceMemoHandler.handleNewVoiceMemoInteraction('embedded', domElements.embeddedMessageMicBtn, targetId);
            } else {
                 console.warn("ChatEventListeners: Embedded mic clicked, but conditions not met. TargetID:", targetId, "Handler:", !!voiceMemoHandler?.handleNewVoiceMemoInteraction, "Button:", !!domElements.embeddedMessageMicBtn);
            }
        });

        // --- Message Modal (1-on-1) Listeners ---
        console.log("ChatEventListeners: Setting up message modal listeners.");
        const doSendModalText = () => {
            // console.log("ChatEventListeners: doSendModalText (modal) called.");
            if (chatSessionHandler?.sendMessageFromModalUI) chatSessionHandler.sendMessageFromModalUI();
            else console.error("ChatEventListeners: chatSessionHandler.sendMessageFromModalUI is not available for modal send.");
        };
        addSafeListener(domElements.messageSendBtn, 'click', doSendModalText);
        addSafeListener(domElements.messageTextInput, 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // console.log("ChatEventListeners: messageTextInput (modal) ENTER pressed.");
                e.preventDefault();
                doSendModalText();
            }
        });
        addSafeListener(domElements.messageModalMicBtn, 'click', () => {
            // console.log("ChatEventListeners: messageModalMicBtn CLICKED.");
            const targetConnector = chatActiveTargetManager?.getModalMessageTargetConnector();
            if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetConnector?.id && domElements.messageModalMicBtn) {
                // console.log("ChatEventListeners: Calling voiceMemoHandler.handleNewVoiceMemoInteraction (modal) for target:", targetConnector.id);
                voiceMemoHandler.handleNewVoiceMemoInteraction('modal', domElements.messageModalMicBtn, targetConnector.id);
            } else {
                console.warn("ChatEventListeners: Modal mic clicked, but conditions not met. TargetConnectorID:", targetConnector?.id, "Handler:", !!voiceMemoHandler?.handleNewVoiceMemoInteraction, "Button:", !!domElements.messageModalMicBtn);
            }
        });
        addSafeListener(domElements.messageModalAttachBtn, 'click', () => {
            // console.log("ChatEventListeners: messageModalAttachBtn CLICKED.");
             if (chatActiveTargetManager?.getModalMessageTargetConnector()) {
                 if (domElements.messageModalImageUpload) {
                    // console.log("ChatEventListeners: Triggering click on messageModalImageUpload.");
                    domElements.messageModalImageUpload.value = '';
                    domElements.messageModalImageUpload.click();
                 } else console.warn("ChatEventListeners: domElements.messageModalImageUpload not found.");
             } else {
                 alert("Please open a message modal with a contact to send an image.");
                 console.warn("ChatEventListeners: messageModalAttachBtn - No active modal chat target.");
             }
        });
        addSafeListener(domElements.messageModalImageUpload, 'change', (event) => {
            // console.log("ChatEventListeners: messageModalImageUpload CHANGED.");
            if (chatSessionHandler?.handleImageUploadFromModalUI) chatSessionHandler.handleImageUploadFromModalUI(event);
            else console.error("ChatEventListeners: chatSessionHandler.handleImageUploadFromModalUI is not available.");
        });

        // --- Group Chat Listeners ---
        console.log("ChatEventListeners: Setting up group chat listeners.");
        addSafeListener(domElements.sendGroupMessageBtn, 'click', () => {
            // console.log("ChatEventListeners: sendGroupMessageBtn CLICKED.");
            if (groupManager?.handleUserMessageInGroup) groupManager.handleUserMessageInGroup();
            else console.error("ChatEventListeners: groupManager.handleUserMessageInGroup is not available.");
        });
        addSafeListener(domElements.groupChatInput, 'keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // console.log("ChatEventListeners: groupChatInput ENTER pressed.");
                e.preventDefault();
                if (groupManager?.handleUserMessageInGroup) groupManager.handleUserMessageInGroup();
                else console.error("ChatEventListeners: groupManager.handleUserMessageInGroup is not available for group input enter.");
            }
        });
        addSafeListener(domElements.groupChatInput, 'input', () => {
            if (groupManager?.userIsTyping) groupManager.userIsTyping();
        });
        addSafeListener(domElements.leaveGroupBtn, 'click', () => {
            // console.log("ChatEventListeners: leaveGroupBtn CLICKED.");
            if (groupManager?.leaveCurrentGroup) groupManager.leaveCurrentGroup();
            else console.error("ChatEventListeners: groupManager.leaveCurrentGroup is not available.");
        });

        // --- Chat Header Button Listeners (Call & Info) ---
        console.log("ChatEventListeners: Setting up chat header button listeners.");
        const setupHeaderButtonListener = (buttonElement, actionType, getConnectorFn, interfaceName) => {
            addSafeListener(buttonElement, 'click', () => {
                // console.log(`ChatEventListeners: ${interfaceName} Header Button '${actionType}' CLICKED.`);
                const connector = getConnectorFn ? getConnectorFn() : null;
                // console.log(`ChatEventListeners: ${interfaceName} Header Button - Connector retrieved:`, connector?.id);
                if (connector?.id) {
                    if (!polyglotApp || typeof polyglotApp.initiateSession !== 'function') {
                        console.error(`ChatEventListeners: polyglotApp.initiateSession is not available at time of ${interfaceName} ${actionType} button click!`);
                        return;
                    }
                    if (actionType === 'call') {
                        polyglotApp.initiateSession(connector, 'direct_modal');
                    } else if (actionType === 'info') {
                        if (personaModalManager?.openDetailedPersonaModal) {
                            personaModalManager.openDetailedPersonaModal(connector);
                        } else console.error(`ChatEventListeners: personaModalManager.openDetailedPersonaModal not available for ${interfaceName} info.`);
                    } else {
                         console.warn(`ChatEventListeners: Unknown actionType '${actionType}' for ${interfaceName} header button for ${connector.id}.`);
                    }
                } else {
                    console.warn(`ChatEventListeners: Could not determine connector for ${interfaceName} header action '${actionType}'.`);
                }
            });
        };

        setupHeaderButtonListener(domElements.embeddedChatCallBtn, 'call', () => {
            const targetId = chatActiveTargetManager?.getEmbeddedChatTargetId();
            return targetId && window.polyglotConnectors ? window.polyglotConnectors.find(c => c.id === targetId) : null;
        }, 'Embedded Chat');
        setupHeaderButtonListener(domElements.embeddedChatInfoBtn, 'info', () => {
            const targetId = chatActiveTargetManager?.getEmbeddedChatTargetId();
            return targetId && window.polyglotConnectors ? window.polyglotConnectors.find(c => c.id === targetId) : null;
        }, 'Embedded Chat');

        setupHeaderButtonListener(domElements.messageModalCallBtn, 'call', () => chatActiveTargetManager?.getModalMessageTargetConnector(), 'Message Modal');
        setupHeaderButtonListener(domElements.messageModalInfoBtn, 'info', () => chatActiveTargetManager?.getModalMessageTargetConnector(), 'Message Modal');

        console.log("chat_event_listeners.js: setupAllChatInteractionListeners() - FINISHED.");
    }
    
    // --- Main initialization function for all listeners in this module ---
    function initializeEventListeners() {
        console.log("chat_event_listeners.js: initializeEventListeners() called.");
        if (listenersInitialized) {
            console.warn("chat_event_listeners.js: Event listeners already initialized. Skipping.");
            return;
        }
        
        setupAllChatInteractionListeners(); // Sets up general chat UI listeners

        // Setup delegated listeners for call event buttons
        const currentDeps = getSafeDeps(); 

        if (currentDeps?.domElements?.embeddedChatLog) {
            currentDeps.domElements.embeddedChatLog.removeEventListener('click', handleCallEventButtonClick); 
            currentDeps.domElements.embeddedChatLog.addEventListener('click', handleCallEventButtonClick);
            console.log("ChatEventListeners: Delegated click listener for call event buttons added to embeddedChatLog.");
        } else {
            console.warn("ChatEventListeners: domElements.embeddedChatLog not found for call event button listener.");
        }

        if (currentDeps?.domElements?.messageChatLog) { 
            currentDeps.domElements.messageChatLog.removeEventListener('click', handleCallEventButtonClick);
            currentDeps.domElements.messageChatLog.addEventListener('click', handleCallEventButtonClick);
            console.log("ChatEventListeners: Delegated click listener for call event buttons added to messageChatLog.");
        } else {
            console.warn("ChatEventListeners: domElements.messageChatLog not found for call event button listener.");
        }
        
        listenersInitialized = true; 
    }
    
    console.log("chat_event_listeners.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        initializeEventListeners 
    };
})();

if (window.chatEventListeners && typeof window.chatEventListeners.initializeEventListeners === 'function') {
    console.log("chat_event_listeners.js: SUCCESSFULLY assigned to window.chatEventListeners and initializeEventListeners is present.");
} else {
    console.error("chat_event_listeners.js: CRITICAL ERROR - window.chatEventListeners or its initializeEventListeners method IS UNDEFINED after IIFE execution.");
}
console.log("chat_event_listeners.js: Script execution FINISHED.");