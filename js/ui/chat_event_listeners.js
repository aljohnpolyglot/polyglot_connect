// js/ui/chat_event_listeners.js
// Responsible for setting up all event listeners for chat UI controls.

console.log("chat_event_listeners.js: Script execution STARTED.");

window.chatEventListeners = (() => {
    'use strict';
    console.log("chat_event_listeners.js: IIFE (module definition) STARTING.");

    let listenersInitialized = false; // Flag to prevent multiple initializations

    const getSafeDeps = () => {
        console.log("chat_event_listeners.js: getSafeDeps() called.");
        const deps = {
            domElements: window.domElements,
            personaModalManager: window.personaModalManager,
            chatSessionHandler: window.chatSessionHandler,
            chatActiveTargetManager: window.chatActiveTargetManager,
            voiceMemoHandler: window.voiceMemoHandler,
            groupManager: window.groupManager,
            polyglotApp: window.polyglotApp // For initiateSession
        };
        let allPresent = true;
        console.log("chat_event_listeners.js: getSafeDeps() - domElements:", !!deps.domElements);
        console.log("chat_event_listeners.js: getSafeDeps() - personaModalManager:", !!deps.personaModalManager);
        console.log("chat_event_listeners.js: getSafeDeps() - chatSessionHandler:", !!deps.chatSessionHandler);
        console.log("chat_event_listeners.js: getSafeDeps() - chatActiveTargetManager:", !!deps.chatActiveTargetManager);
        console.log("chat_event_listeners.js: getSafeDeps() - voiceMemoHandler:", !!deps.voiceMemoHandler);
        console.log("chat_event_listeners.js: getSafeDeps() - groupManager:", !!deps.groupManager);
        
        // Critical check for polyglotApp and its initiateSession method
        if (!deps.polyglotApp || typeof deps.polyglotApp.initiateSession !== 'function') {
            console.error("ChatEventListeners: CRITICAL DEPENDENCY MISSING or INCOMPLETE - window.polyglotApp or window.polyglotApp.initiateSession is not ready.", "polyglotApp:", deps.polyglotApp);
            allPresent = false;
        } else {
            console.log("chat_event_listeners.js: getSafeDeps() - polyglotApp.initiateSession is a function.");
        }

        for (const key in deps) {
            if (!deps[key] && key !== 'polyglotApp') { // polyglotApp checked more thoroughly above
                console.error(`ChatEventListeners: CRITICAL DEPENDENCY MISSING - window.${key}.`);
                allPresent = false;
            }
        }
        return allPresent ? deps : null;
    };

    function setupAllChatInteractionListeners() {
        console.log("chat_event_listeners.js: setupAllChatInteractionListeners() - START.");
        const deps = getSafeDeps();
        if (!deps) {
            console.error("ChatEventListeners: Cannot setup listeners due to missing critical dependencies. Aborting setupAllChatInteractionListeners.");
            return;
        }

        const {
            domElements, personaModalManager, chatSessionHandler,
            chatActiveTargetManager, voiceMemoHandler, groupManager, polyglotApp
        } = deps;

        console.log("ChatEventListeners: All dependencies for setupAllChatInteractionListeners seem present. Proceeding to add listeners...");

        const addSafeListener = (element, eventType, handlerFn, options = {}) => {
            if (element && typeof handlerFn === 'function') {
                // console.log(`ChatEventListeners: Attaching '${eventType}' listener to element:`, element.id || element.tagName);
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
            console.log("ChatEventListeners: embeddedMessageSendBtn CLICKED.");
            if (chatSessionHandler?.sendMessageFromEmbeddedUI) chatSessionHandler.sendMessageFromEmbeddedUI();
            else console.error("ChatEventListeners: chatSessionHandler.sendMessageFromEmbeddedUI is not available for embedded send button.");
        });
        addSafeListener(domElements.embeddedMessageTextInput, 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log("ChatEventListeners: embeddedMessageTextInput ENTER pressed.");
                e.preventDefault();
                if (chatSessionHandler?.sendMessageFromEmbeddedUI) chatSessionHandler.sendMessageFromEmbeddedUI();
                else console.error("ChatEventListeners: chatSessionHandler.sendMessageFromEmbeddedUI is not available for embedded text input enter.");
            }
        });

        addSafeListener(domElements.embeddedMessageAttachBtn, 'click', () => {
            console.log("ChatEventListeners: embeddedMessageAttachBtn CLICKED.");
            if (chatActiveTargetManager?.getEmbeddedChatTargetId()) {
                if (domElements.embeddedMessageImageUpload) {
                    console.log("ChatEventListeners: Triggering click on embeddedMessageImageUpload.");
                    domElements.embeddedMessageImageUpload.value = '';
                    domElements.embeddedMessageImageUpload.click();
                } else console.warn("ChatEventListeners: domElements.embeddedMessageImageUpload not found.");
            } else {
                alert("Please open or select a chat to send an image to.");
                console.warn("ChatEventListeners: embeddedMessageAttachBtn - No active embedded chat target.");
            }
        });
        addSafeListener(domElements.embeddedMessageImageUpload, 'change', (event) => {
            console.log("ChatEventListeners: embeddedMessageImageUpload CHANGED.");
            if (chatSessionHandler?.handleImageUploadFromEmbeddedUI) chatSessionHandler.handleImageUploadFromEmbeddedUI(event);
            else console.error("ChatEventListeners: chatSessionHandler.handleImageUploadFromEmbeddedUI is not available.");
        });

        addSafeListener(domElements.embeddedMessageMicBtn, 'click', () => {
            console.log("ChatEventListeners: embeddedMessageMicBtn CLICKED.");
            const targetId = chatActiveTargetManager?.getEmbeddedChatTargetId();
            if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetId && domElements.embeddedMessageMicBtn) {
                console.log("ChatEventListeners: Calling voiceMemoHandler.handleNewVoiceMemoInteraction (embedded) for target:", targetId);
                voiceMemoHandler.handleNewVoiceMemoInteraction('embedded', domElements.embeddedMessageMicBtn, targetId);
            } else {
                 console.warn("ChatEventListeners: Embedded mic clicked, but conditions not met. TargetID:", targetId, "Handler:", !!voiceMemoHandler?.handleNewVoiceMemoInteraction, "Button:", !!domElements.embeddedMessageMicBtn);
            }
        });

        // --- Message Modal (1-on-1) Listeners ---
        console.log("ChatEventListeners: Setting up message modal listeners.");
        const doSendModalText = () => {
            console.log("ChatEventListeners: doSendModalText (modal) called.");
            if (chatSessionHandler?.sendMessageFromModalUI) chatSessionHandler.sendMessageFromModalUI();
            else console.error("ChatEventListeners: chatSessionHandler.sendMessageFromModalUI is not available for modal send.");
        };
        addSafeListener(domElements.messageSendBtn, 'click', doSendModalText);
        addSafeListener(domElements.messageTextInput, 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log("ChatEventListeners: messageTextInput (modal) ENTER pressed.");
                e.preventDefault();
                doSendModalText();
            }
        });

        addSafeListener(domElements.messageModalMicBtn, 'click', () => {
            console.log("ChatEventListeners: messageModalMicBtn CLICKED.");
            const targetConnector = chatActiveTargetManager?.getModalMessageTargetConnector();
            if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetConnector?.id && domElements.messageModalMicBtn) {
                console.log("ChatEventListeners: Calling voiceMemoHandler.handleNewVoiceMemoInteraction (modal) for target:", targetConnector.id);
                voiceMemoHandler.handleNewVoiceMemoInteraction('modal', domElements.messageModalMicBtn, targetConnector.id);
            } else {
                console.warn("ChatEventListeners: Modal mic clicked, but conditions not met. TargetConnectorID:", targetConnector?.id, "Handler:", !!voiceMemoHandler?.handleNewVoiceMemoInteraction, "Button:", !!domElements.messageModalMicBtn);
            }
        });

        addSafeListener(domElements.messageModalAttachBtn, 'click', () => {
            console.log("ChatEventListeners: messageModalAttachBtn CLICKED.");
             if (chatActiveTargetManager?.getModalMessageTargetConnector()) {
                 if (domElements.messageModalImageUpload) {
                    console.log("ChatEventListeners: Triggering click on messageModalImageUpload.");
                    domElements.messageModalImageUpload.value = '';
                    domElements.messageModalImageUpload.click();
                 } else console.warn("ChatEventListeners: domElements.messageModalImageUpload not found.");
             } else {
                 alert("Please open a message modal with a contact to send an image.");
                 console.warn("ChatEventListeners: messageModalAttachBtn - No active modal chat target.");
             }
        });
        addSafeListener(domElements.messageModalImageUpload, 'change', (event) => {
            console.log("ChatEventListeners: messageModalImageUpload CHANGED.");
            if (chatSessionHandler?.handleImageUploadFromModalUI) chatSessionHandler.handleImageUploadFromModalUI(event);
            else console.error("ChatEventListeners: chatSessionHandler.handleImageUploadFromModalUI is not available.");
        });

        // --- Group Chat Listeners ---
        console.log("ChatEventListeners: Setting up group chat listeners.");
        addSafeListener(domElements.sendGroupMessageBtn, 'click', () => {
            console.log("ChatEventListeners: sendGroupMessageBtn CLICKED.");
            if (groupManager?.handleUserMessageInGroup) groupManager.handleUserMessageInGroup();
            else console.error("ChatEventListeners: groupManager.handleUserMessageInGroup is not available.");
        });
        addSafeListener(domElements.groupChatInput, 'keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log("ChatEventListeners: groupChatInput ENTER pressed.");
                e.preventDefault();
                if (groupManager?.handleUserMessageInGroup) groupManager.handleUserMessageInGroup();
                else console.error("ChatEventListeners: groupManager.handleUserMessageInGroup is not available for group input enter.");
            }
        });
        addSafeListener(domElements.groupChatInput, 'input', () => {
            if (groupManager?.userIsTyping) groupManager.userIsTyping();
        });
        addSafeListener(domElements.leaveGroupBtn, 'click', () => {
            console.log("ChatEventListeners: leaveGroupBtn CLICKED.");
            if (groupManager?.leaveCurrentGroup) groupManager.leaveCurrentGroup();
            else console.error("ChatEventListeners: groupManager.leaveCurrentGroup is not available.");
        });

        // --- Chat Header Button Listeners (Call & Info) ---
        console.log("ChatEventListeners: Setting up chat header button listeners.");
        const setupHeaderButtonListener = (buttonElement, actionType, getConnectorFn, interfaceName) => {
            addSafeListener(buttonElement, 'click', () => {
                console.log(`ChatEventListeners: ${interfaceName} Header Button '${actionType}' CLICKED.`);
                const connector = getConnectorFn ? getConnectorFn() : null;
                console.log(`ChatEventListeners: ${interfaceName} Header Button - Connector retrieved:`, connector?.id);
                if (connector?.id) {
                    // Ensure polyglotApp.initiateSession is available *now*
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
        listenersInitialized = true;
    }

    function initializeEventListeners() {
        console.log("chat_event_listeners.js: initializeEventListeners() called.");
        if (listenersInitialized) {
            console.warn("chat_event_listeners.js: Event listeners already initialized. Skipping.");
            return;
        }
        // No longer uses DOMContentLoaded here, relies on explicit call from app.js
        setupAllChatInteractionListeners();
    }

    console.log("chat_event_listeners.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        initializeEventListeners // Expose this for app.js to call
    };
})();

if (window.chatEventListeners && typeof window.chatEventListeners.initializeEventListeners === 'function') {
    console.log("chat_event_listeners.js: SUCCESSFULLY assigned to window.chatEventListeners and initializeEventListeners is present.");
} else {
    console.error("chat_event_listeners.js: CRITICAL ERROR - window.chatEventListeners or its initializeEventListeners method IS UNDEFINED after IIFE execution.");
}
console.log("chat_event_listeners.js: Script execution FINISHED.");