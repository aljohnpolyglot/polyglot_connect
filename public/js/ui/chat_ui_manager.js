// js/ui/chat_ui_manager.js
// Manages UI aspects of embedded chat and group chat interfaces.

console.log("chat_ui_manager.js: Script execution STARTED.");

if (window.chatUiManager) {
    console.warn("chat_ui_manager.js: window.chatUiManager was ALREADY DEFINED before IIFE assignment. This is unexpected.");
}

window.chatUiManager = (() => {
    'use strict';
    console.log("chat_ui_manager.js: IIFE (module definition) STARTING.");

    const getDeps = () => {
        // console.log("chat_ui_manager.js: getDeps() called."); // Less noisy for this version
        const deps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater,
            personaModalManager: window.personaModalManager,
            chatOrchestrator: window.chatOrchestrator // Main orchestrator for chat logic
        };
        // Quick check for critical deps for this module at time of getDeps call
        if (!deps.domElements) console.error("chat_ui_manager.js: getDeps - domElements is missing!");
        if (!deps.uiUpdater) console.error("chat_ui_manager.js: getDeps - uiUpdater is missing!");
        // chatOrchestrator might be a dummy if its own deps failed, log its state
        // console.log("chat_ui_manager.js: getDeps - chatOrchestrator type:", typeof deps.chatOrchestrator, "Is function (init):", typeof deps.chatOrchestrator?.initialize);
        return deps;
    };

    function initializeChatUiControls() {
        console.log("chat_ui_manager.js: initializeChatUiControls() - START.");
        const deps = getDeps();
        const { domElements, personaModalManager, chatOrchestrator } = deps;

        if (!domElements) {
            console.error("ChatUIManager: initializeChatUiControls - CRITICAL dependency domElements MISSING. Aborting listener setup.");
            return;
        }
        // Note: chatOrchestrator might be a dummy if its own dependencies failed during its load.
        // Functions below should gracefully handle if chatOrchestrator or its methods are not available.
        if (!chatOrchestrator || typeof chatOrchestrator.getTextMessageHandler !== 'function') {
            console.warn("ChatUIManager: initializeChatUiControls - chatOrchestrator or its getTextMessageHandler is not fully available. Some listeners will be impaired.");
        }


        const textMessageHandler = chatOrchestrator?.getTextMessageHandler ? chatOrchestrator.getTextMessageHandler() : null;
        const voiceMemoHandler = chatOrchestrator?.getVoiceMemoHandler ? chatOrchestrator.getVoiceMemoHandler() : null;
        const groupManager = window.groupManager; // Assumed to be globally available by now

        console.log("ChatUIManager: initializeChatUiControls - textMessageHandler obtained:", !!textMessageHandler);
        console.log("ChatUIManager: initializeChatUiControls - voiceMemoHandler obtained:", !!voiceMemoHandler);
        console.log("ChatUIManager: initializeChatUiControls - groupManager obtained:", !!groupManager);


        // --- Embedded Chat Listeners ---
        console.log("ChatUIManager: Setting up embedded chat listeners...");
        if (domElements.embeddedMessageSendBtn && domElements.embeddedMessageTextInput) {
            console.log("ChatUIManager: Found embeddedMessageSendBtn and embeddedMessageTextInput. Adding listeners.");
            domElements.embeddedMessageSendBtn.addEventListener('click', () => {
                console.log("ChatUIManager: embeddedMessageSendBtn CLICKED.");
                const targetId = chatOrchestrator?.getCurrentEmbeddedChatTargetId?.(); // Optional chaining
                const textValue = domElements.embeddedMessageTextInput.value;
                console.log("ChatUIManager: Embedded send - Target ID:", targetId, "Text:", textValue ? textValue.substring(0, 20) + "..." : "EMPTY");
                if (textMessageHandler?.sendEmbeddedTextMessage && targetId && textValue.trim() !== "") {
                    textMessageHandler.sendEmbeddedTextMessage(textValue, targetId);
                } else {
                    if (!textMessageHandler?.sendEmbeddedTextMessage) console.warn("ChatUIManager: textMessageHandler.sendEmbeddedTextMessage not available.");
                    if (!targetId) console.warn("ChatUIManager: Click - Cannot send embedded message, no currentEmbeddedChatTargetId set.");
                    else if (textValue.trim() === "") console.warn("ChatUIManager: Click - Cannot send empty embedded message.");
                }
            });
            domElements.embeddedMessageTextInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    console.log("ChatUIManager: embeddedMessageTextInput ENTER pressed.");
                    e.preventDefault();
                    const targetId = chatOrchestrator?.getCurrentEmbeddedChatTargetId?.();
                    const textValue = domElements.embeddedMessageTextInput.value;
                    console.log("ChatUIManager: Embedded keypress send - Target ID:", targetId, "Text:", textValue ? textValue.substring(0, 20) + "..." : "EMPTY");
                    if (textMessageHandler?.sendEmbeddedTextMessage && targetId && textValue.trim() !== "") {
                        textMessageHandler.sendEmbeddedTextMessage(textValue, targetId);
                    } else {
                        if (!textMessageHandler?.sendEmbeddedTextMessage) console.warn("ChatUIManager: textMessageHandler.sendEmbeddedTextMessage not available for enter key.");
                        if (!targetId) console.warn("ChatUIManager: Enter - Cannot send embedded message, no currentEmbeddedChatTargetId set.");
                        else if (textValue.trim() === "") console.warn("ChatUIManager: Enter - Cannot send empty embedded message.");
                    }
                }
            });
        } else {
            console.warn("ChatUIManager: embeddedMessageSendBtn or embeddedMessageTextInput not found. Listeners NOT added.");
        }

        // Listener for the ATTACH BUTTON (paperclip) to TRIGGER file input click
        if (domElements.embeddedMessageAttachBtn && domElements.embeddedMessageImageUpload) {
            console.log("ChatUIManager: Found embeddedMessageAttachBtn and embeddedMessageImageUpload. Adding ATTACH BTN listener.");
            domElements.embeddedMessageAttachBtn.addEventListener('click', () => {
                console.log("ChatUIManager: embeddedMessageAttachBtn CLICKED.");
                const targetId = chatOrchestrator?.getCurrentEmbeddedChatTargetId?.();
                if (targetId) {
                    console.log("ChatUIManager: Triggering click on embeddedMessageImageUpload for target:", targetId);
                    domElements.embeddedMessageImageUpload.value = ''; // Clear previous selection
                    domElements.embeddedMessageImageUpload.click();
                } else {
                    console.warn("ChatUIManager: Attach button clicked, but no currentEmbeddedChatTargetId set. File input not triggered.");
                    alert("Please open a chat before attaching an image.");
                }
            });
            // **REMOVED**: The 'change' listener for domElements.embeddedMessageImageUpload
            // This will be handled by chat_event_listeners.js
            console.log("ChatUIManager: 'change' listener for embeddedMessageImageUpload is expected to be handled by chat_event_listeners.js.");
        } else {
            console.warn("ChatUIManager: embeddedMessageAttachBtn or embeddedMessageImageUpload not found. ATTACH BTN Listener NOT added.");
        }

        // Listener for Mic Button
        if (domElements.embeddedMessageMicBtn) {
            console.log("ChatUIManager: Found embeddedMessageMicBtn. Adding listener.");
            domElements.embeddedMessageMicBtn.addEventListener('click', () => {
                console.log("ChatUIManager: embeddedMessageMicBtn CLICKED.");
                const targetId = chatOrchestrator?.getCurrentEmbeddedChatTargetId?.();
                if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetId) {
                    console.log("ChatUIManager: Calling handleNewVoiceMemoInteraction (embedded) for target:", targetId);
                    voiceMemoHandler.handleNewVoiceMemoInteraction('embedded', domElements.embeddedMessageMicBtn, targetId);
                } else { 
                    if(!voiceMemoHandler?.handleNewVoiceMemoInteraction) console.warn("ChatUIManager: voiceMemoHandler.handleNewVoiceMemoInteraction not available.");
                    else if(!targetId) console.warn("ChatUIManager: TargetId missing for embedded mic.");
                }
            });
        } else { console.warn("ChatUIManager: embeddedMessageMicBtn not found. Listener NOT added."); }

        // --- Message Modal Listeners ---
        console.log("ChatUIManager: Setting up message modal listeners...");
        if (domElements.messageSendBtn && domElements.messageTextInput) {
            console.log("ChatUIManager: Found messageSendBtn and messageTextInput. Adding listeners.");
            const doSendModalText = () => {
                console.log("ChatUIManager: doSendModalText (modal) called.");
                const targetConnector = chatOrchestrator?.getCurrentModalMessageTarget?.();
                const textValue = domElements.messageTextInput.value;
                 console.log("ChatUIManager: Modal send - Target Connector ID:", targetConnector?.id, "Text:", textValue ? textValue.substring(0,20)+"..." : "EMPTY");
                if (textMessageHandler?.sendModalTextMessage && targetConnector && textValue.trim() !== "") {
                    textMessageHandler.sendModalTextMessage(textValue, targetConnector);
                } else {
                    if(!textMessageHandler?.sendModalTextMessage) console.warn("ChatUIManager: textMessageHandler.sendModalTextMessage not available.");
                    if (!targetConnector) console.warn("ChatUIManager: Modal send - Target connector missing.");
                    else if (textValue.trim() === "") console.warn("ChatUIManager: Modal send - Empty text.");
                }
            };
            domElements.messageSendBtn.addEventListener('click', doSendModalText);
            domElements.messageTextInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    console.log("ChatUIManager: messageTextInput (modal) ENTER pressed.");
                    e.preventDefault();
                    doSendModalText();
                }
            });
        } else { console.warn("ChatUIManager: messageSendBtn or messageTextInput not found for modal. Listeners NOT added."); }

        // Listener for the ATTACH BUTTON (paperclip) for MODAL
        if (domElements.messageModalAttachBtn && domElements.messageModalImageUpload) {
            console.log("ChatUIManager: Found messageModalAttachBtn and messageModalImageUpload. Adding ATTACH BTN listener for modal.");
            domElements.messageModalAttachBtn.addEventListener('click', () => {
                console.log("ChatUIManager: messageModalAttachBtn CLICKED.");
                const targetConnector = chatOrchestrator?.getCurrentModalMessageTarget?.();
                 if (targetConnector) {
                    console.log("ChatUIManager: Triggering click on messageModalImageUpload for target:", targetConnector.id);
                    domElements.messageModalImageUpload.value = ''; // Clear previous selection
                    domElements.messageModalImageUpload.click();
                 } else {
                     console.warn("ChatUIManager: messageModalAttachBtn clicked, but no currentModalMessageTarget set.");
                     alert("Please open a message modal with a contact to send an image.");
                 }
            });
            // **REMOVED**: The 'change' listener for domElements.messageModalImageUpload
            // This will be handled by chat_event_listeners.js
            console.log("ChatUIManager: 'change' listener for messageModalImageUpload is expected to be handled by chat_event_listeners.js.");
        } else { console.warn("ChatUIManager: messageModalAttachBtn or messageModalImageUpload not found. ATTACH BTN Listener for modal NOT added."); }
        
        // Listener for Mic Button (Modal)
        if (domElements.messageModalMicBtn) {
            console.log("ChatUIManager: Found messageModalMicBtn. Adding listener.");
             domElements.messageModalMicBtn.addEventListener('click', () => {
                console.log("ChatUIManager: messageModalMicBtn CLICKED.");
                const targetConnector = chatOrchestrator?.getCurrentModalMessageTarget?.();
                if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetConnector?.id) {
                    console.log("ChatUIManager: Calling handleNewVoiceMemoInteraction (modal) for target:", targetConnector.id);
                    voiceMemoHandler.handleNewVoiceMemoInteraction('modal', domElements.messageModalMicBtn, targetConnector.id);
                } else {
                    if(!voiceMemoHandler?.handleNewVoiceMemoInteraction) console.warn("ChatUIManager: voiceMemoHandler.handleNewVoiceMemoInteraction not available for modal mic.");
                    else if (!targetConnector?.id) console.warn("ChatUIManager: TargetConnector ID missing for modal mic.");
                }
            });
        } else { console.warn("ChatUIManager: messageModalMicBtn not found. Listener NOT added."); }


        // --- Group Chat Listeners ---
        console.log("ChatUIManager: Setting up group chat listeners...");
        if (domElements.sendGroupMessageBtn && domElements.groupChatInput) {
            console.log("ChatUIManager: Found sendGroupMessageBtn and groupChatInput. Adding listeners.");
            domElements.sendGroupMessageBtn.addEventListener('click', () => {
                console.log("ChatUIManager: sendGroupMessageBtn CLICKED.");
                if (groupManager?.handleUserMessageInGroup) {
                    groupManager.handleUserMessageInGroup();
                } else {
                    console.warn("ChatUIManager: groupManager.handleUserMessageInGroup is not available.");
                }
            });
            domElements.groupChatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    console.log("ChatUIManager: groupChatInput ENTER pressed.");
                    e.preventDefault();
                    if (groupManager?.handleUserMessageInGroup) {
                        groupManager.handleUserMessageInGroup();
                    } else {
                        console.warn("ChatUIManager: groupManager.handleUserMessageInGroup is not available for enter key.");
                    }
                }
            });
            domElements.groupChatInput.addEventListener('input', () => {
                // console.log("ChatUIManager: groupChatInput INPUT event."); // Can be very noisy
                if (groupManager?.userIsTyping) {
                    groupManager.userIsTyping();
                } else {
                    // console.warn("ChatUIManager: groupManager.userIsTyping is not available."); // Also noisy
                }
            });
        } else {
            console.warn("ChatUIManager: sendGroupMessageBtn or groupChatInput not found. Listeners NOT added.");
        }

        if (domElements.leaveGroupBtn) {
            console.log("ChatUIManager: Found leaveGroupBtn. Adding listener.");
            domElements.leaveGroupBtn.addEventListener('click', () => {
                console.log("ChatUIManager: leaveGroupBtn CLICKED.");
                if (groupManager?.leaveCurrentGroup) {
                    groupManager.leaveCurrentGroup();
                } else {
                    console.warn("ChatUIManager: groupManager.leaveCurrentGroup is not available.");
                }
            });
        } else {
            console.warn("ChatUIManager: leaveGroupBtn not found. Listener NOT added.");
        }

        // --- Header Button Listeners (Call & Info for Embedded and Modal Chats) ---
        console.log("ChatUIManager: Setting up header button listeners...");
        const setupHeaderAction = (button, datasetContainer, actionType, interfaceTypeForLog) => {
            if (button) {
                console.log(`ChatUIManager: Found button for ${interfaceTypeForLog} - ${actionType}. Adding listener.`);
                button.addEventListener('click', () => {
                    console.log(`ChatUIManager: ${interfaceTypeForLog} - ${actionType} button CLICKED.`);
                    const connectorId = datasetContainer?.dataset.currentConnectorId;
                    console.log(`ChatUIManager: Header action - Connector ID from dataset: ${connectorId}`);
                    // Ensure polyglotApp is available directly via window for these UI interactions
                    if (!window.polyglotApp || typeof window.polyglotApp.initiateSession !== 'function') {
                        console.error(`ChatUIManager: window.polyglotApp.initiateSession not available for ${actionType} action.`);
                        return;
                    }
                    if (connectorId && window.polyglotConnectors) {
                        const connector = window.polyglotConnectors.find(c => c.id === connectorId);
                        console.log(`ChatUIManager: Header action - Found connector from polyglotConnectors:`, !!connector);
                        if (connector) {
                            if (actionType === 'call') {
                                window.polyglotApp.initiateSession(connector, 'direct_modal');
                            } else if (actionType === 'info') {
                                 if (personaModalManager?.openDetailedPersonaModal) { // personaModalManager from closure
                                    personaModalManager.openDetailedPersonaModal(connector);
                                 } else {console.error("ChatUIManager: personaModalManager.openDetailedPersonaModal not available.");}
                            }
                        } else { console.warn(`ChatUIManager: Connector not found for ID ${connectorId} in polyglotConnectors.`); }
                    } else {
                        if (!connectorId) console.warn(`ChatUIManager: Missing connectorId on datasetContainer for ${interfaceTypeForLog} - ${actionType}.`);
                        if (!window.polyglotConnectors) console.warn(`ChatUIManager: window.polyglotConnectors not available for ${interfaceTypeForLog} - ${actionType}.`);
                    }
                });
            } else { console.warn(`ChatUIManager: Button for ${interfaceTypeForLog} - ${actionType} not found. Listener NOT added.`); }
        };
        
        setupHeaderAction(domElements.embeddedChatCallBtn, domElements.embeddedChatContainer, 'call', 'Embedded');
        setupHeaderAction(domElements.embeddedChatInfoBtn, domElements.embeddedChatContainer, 'info', 'Embedded');
        setupHeaderAction(domElements.messageModalCallBtn, domElements.messagingInterface, 'call', 'Message Modal');
        setupHeaderAction(domElements.messageModalInfoBtn, domElements.messagingInterface, 'info', 'Message Modal');

        console.log("chat_ui_manager.js: initializeChatUiControls() - FINISHED.");
    }

    function showEmbeddedChatInterface(connector) {
        console.log("chat_ui_manager.js: showEmbeddedChatInterface() - START for connector:", connector?.id);
        const { domElements, uiUpdater } = getDeps();
        if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder || !uiUpdater || !connector || !connector.id) {
            console.error("chat_ui_manager.js: showEmbeddedChatInterface - Missing critical elements, uiUpdater, or valid connector data.", {
                hasEmbCont: !!domElements?.embeddedChatContainer,
                hasPlaceholder: !!domElements?.messagesPlaceholder,
                hasUiUpdater: !!uiUpdater,
                connectorId: connector?.id
            });
            return;
        }
        domElements.messagesPlaceholder.style.display = 'none';
        domElements.embeddedChatContainer.style.display = 'flex';
        uiUpdater.updateEmbeddedChatHeader(connector);
        if (domElements.embeddedMessageTextInput) {
            console.log("chat_ui_manager.js: Focusing embeddedMessageTextInput.");
            domElements.embeddedMessageTextInput.focus();
        }
        console.log("chat_ui_manager.js: Embedded chat interface shown for", connector.id);
    }

    function hideEmbeddedChatInterface() {
        console.log("chat_ui_manager.js: hideEmbeddedChatInterface() - START.");
        const { domElements } = getDeps();
        if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder) {
            console.warn("chat_ui_manager.js: hideEmbeddedChatInterface - Missing relevant DOM elements (embeddedChatContainer or messagesPlaceholder).");
            return;
        }
        domElements.embeddedChatContainer.style.display = 'none';
        domElements.messagesPlaceholder.style.display = 'block';
        if (domElements.embeddedChatHeaderName) domElements.embeddedChatHeaderName.textContent = "Your Conversations";
        if (domElements.embeddedChatHeaderDetails) domElements.embeddedChatHeaderDetails.textContent = "";
        // Also reset avatar if needed
        if (domElements.embeddedChatHeaderAvatar) domElements.embeddedChatHeaderAvatar.src = "images/placeholder_avatar.png";
        console.log("chat_ui_manager.js: Embedded chat interface hidden.");
    }

    function showGroupChatView(groupName, members) {
        console.log("chat_ui_manager.js: showGroupChatView() - START for group:", groupName);
        const { domElements, uiUpdater } = getDeps();
        if (!domElements?.groupListContainer || !domElements.groupChatInterfaceDiv || !uiUpdater) {
            console.error("chat_ui_manager.js: showGroupChatView - Missing critical DOM elements (groupListContainer, groupChatInterfaceDiv) or uiUpdater.");
            return;
        }
        if (!groupName || !members) {
             console.error("chat_ui_manager.js: showGroupChatView - Missing groupName or members argument. Cannot show view.", {groupName, membersLength: members?.length});
            return;
        }

        if (domElements.groupsViewHeader) {
            console.log("chat_ui_manager.js: Hiding general groupsViewHeader.");
            domElements.groupsViewHeader.style.display = 'none';
        }

        domElements.groupListContainer.style.display = 'none';
        domElements.groupChatInterfaceDiv.style.display = 'flex';
        uiUpdater.updateGroupChatHeader(groupName, members);

        if (domElements.groupChatInput) {
            console.log("chat_ui_manager.js: Focusing groupChatInput.");
            domElements.groupChatInput.focus();
        }
        console.log("chat_ui_manager.js: Group chat view shown for", groupName);
    }

    function hideGroupChatView() {
        console.log("chat_ui_manager.js: hideGroupChatView() - START.");
        const { domElements } = getDeps();
        if (!domElements?.groupListContainer || !domElements.groupChatInterfaceDiv) {
            console.warn("chat_ui_manager.js: hideGroupChatView - Missing relevant DOM elements (groupListContainer or groupChatInterfaceDiv).");
            return;
        }

        domElements.groupChatInterfaceDiv.style.display = 'none';
        domElements.groupListContainer.style.display = 'block';

        if (domElements.groupsViewHeader) {
            console.log("chat_ui_manager.js: Restoring display for general groupsViewHeader.");
            domElements.groupsViewHeader.style.display = '';
        }
        console.log("chat_ui_manager.js: Group chat view hidden, group list shown.");
    }

    console.log("chat_ui_manager.js: Setting up DOMContentLoaded listener for initializeChatUiControls. Current readyState:", document.readyState);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log("chat_ui_manager.js: DOMContentLoaded event fired. Calling initializeChatUiControls().");
            initializeChatUiControls();
        });
    } else {
        console.log("chat_ui_manager.js: DOM already loaded. Calling initializeChatUiControls() directly.");
        initializeChatUiControls();
    }

    console.log("chat_ui_manager.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        showEmbeddedChatInterface,
        hideEmbeddedChatInterface,
        showGroupChatView,
        hideGroupChatView
    };
})();

if (window.chatUiManager && typeof window.chatUiManager.showEmbeddedChatInterface === 'function') {
    console.log("chat_ui_manager.js: SUCCESSFULLY assigned to window.chatUiManager and showEmbeddedChatInterface is present.");
} else {
    console.error("chat_ui_manager.js: CRITICAL ERROR - window.chatUiManager IS UNDEFINED or core methods missing after IIFE execution.");
}
console.log("chat_ui_manager.js: Script execution FINISHED.");