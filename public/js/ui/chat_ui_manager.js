// js/ui/chat_ui_manager.js
// Manages UI aspects of embedded chat and group chat interfaces.

window.chatUiManager = (() => {
    'use strict';

    const getDeps = () => ({
        domElements: window.domElements,
        uiUpdater: window.uiUpdater,
        personaModalManager: window.personaModalManager,
        chatOrchestrator: window.chatOrchestrator // Main orchestrator for chat logic
    });

    function initializeChatUiControls() {
        const { domElements, personaModalManager, chatOrchestrator } = getDeps();
        console.log("chatUiManager: initializeChatUiControls - Setting up listeners.");

        if (!domElements || !chatOrchestrator) {
            console.error("ChatUIManager: Critical dependencies (domElements or chatOrchestrator) missing.");
            return;
        }

        const textMessageHandler = chatOrchestrator.getTextMessageHandler();
        const voiceMemoHandler = chatOrchestrator.getVoiceMemoHandler();
        const groupManager = window.groupManager;

        // --- Embedded Chat Listeners ---
        if (domElements.embeddedMessageSendBtn && domElements.embeddedMessageTextInput) {
            domElements.embeddedMessageSendBtn.addEventListener('click', () => {
                const targetId = chatOrchestrator.getCurrentEmbeddedChatTargetId();
                const textValue = domElements.embeddedMessageTextInput.value; // Get value once
                if (textMessageHandler?.sendEmbeddedTextMessage && targetId && textValue.trim() !== "") { // ADDED targetId and textValue check
                    textMessageHandler.sendEmbeddedTextMessage(textValue, targetId);
                } else if (!targetId) {
                    console.warn("ChatUIManager: Click - Cannot send embedded message, no currentEmbeddedChatTargetId set.");
                } else if (textValue.trim() === "") {
                    console.warn("ChatUIManager: Click - Cannot send empty embedded message.");
                }
            });
            domElements.embeddedMessageTextInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const targetId = chatOrchestrator.getCurrentEmbeddedChatTargetId();
                    const textValue = domElements.embeddedMessageTextInput.value; // Get value once
                    if (textMessageHandler?.sendEmbeddedTextMessage && targetId && textValue.trim() !== "") { // ADDED targetId and textValue check
                        textMessageHandler.sendEmbeddedTextMessage(textValue, targetId);
                    } else if (!targetId) {
                        console.warn("ChatUIManager: Enter - Cannot send embedded message, no currentEmbeddedChatTargetId set.");
                    } else if (textValue.trim() === "") {
                        console.warn("ChatUIManager: Enter - Cannot send empty embedded message.");
                    }
                }
            });
        } else {
            console.warn("ChatUIManager: embeddedMessageSendBtn or embeddedMessageTextInput not found.");
        }

        if (domElements.embeddedMessageAttachBtn && domElements.embeddedMessageImageUpload) {
            domElements.embeddedMessageAttachBtn.addEventListener('click', () => {
                // Ensure a chat is active before allowing attach click to trigger file input
                const targetId = chatOrchestrator.getCurrentEmbeddedChatTargetId();
                if (targetId) {
                    domElements.embeddedMessageImageUpload.click();
                } else {
                    console.warn("ChatUIManager: Attach button clicked, but no currentEmbeddedChatTargetId set. File input not triggered.");
                    // Optionally alert the user: alert("Please open a chat before attaching an image.");
                }
            });

            domElements.embeddedMessageImageUpload.addEventListener('change', (event) => {
                const targetId = chatOrchestrator.getCurrentEmbeddedChatTargetId();
                if (textMessageHandler?.handleEmbeddedImageUpload && targetId) {
                    textMessageHandler.handleEmbeddedImageUpload(event, targetId);
                } else if (!targetId) {
                    console.warn("ChatUIManager: Cannot upload image, no currentEmbeddedChatTargetId set by orchestrator at the time of file change.");
                } else {
                    console.warn("ChatUIManager: Cannot upload image, textMessageHandler or its handleEmbeddedImageUpload method is missing.");
                }
            });
        } else {
            console.warn("ChatUIManager: embeddedMessageAttachBtn or embeddedMessageImageUpload not found.");
        }

        if (domElements.embeddedMessageMicBtn) {
            domElements.embeddedMessageMicBtn.addEventListener('click', () => {
                const targetId = chatOrchestrator.getCurrentEmbeddedChatTargetId();
                if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetId) {
                    voiceMemoHandler.handleNewVoiceMemoInteraction('embedded', domElements.embeddedMessageMicBtn, targetId);
                } else { console.warn("ChatUIManager: Voice memo handler or targetId missing for embedded mic."); }
            });
        } else { console.warn("ChatUIManager: embeddedMessageMicBtn not found."); }

        // --- Message Modal Listeners ---
        if (domElements.messageSendBtn && domElements.messageTextInput) {
            const doSendModalText = () => {
                const targetConnector = chatOrchestrator.getCurrentModalMessageTarget();
                if (textMessageHandler?.sendModalTextMessage && targetConnector) {
                    textMessageHandler.sendModalTextMessage(domElements.messageTextInput.value, targetConnector);
                }
            };
            domElements.messageSendBtn.addEventListener('click', doSendModalText);
            domElements.messageTextInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSendModalText(); }
            });
        } else { console.warn("ChatUIManager: messageSendBtn or messageTextInput not found."); }

        if (domElements.messageModalMicBtn) {
             domElements.messageModalMicBtn.addEventListener('click', () => {
                const targetConnector = chatOrchestrator.getCurrentModalMessageTarget();
                if (voiceMemoHandler?.handleNewVoiceMemoInteraction && targetConnector?.id) {
                    voiceMemoHandler.handleNewVoiceMemoInteraction('modal', domElements.messageModalMicBtn, targetConnector.id);
                } else { console.warn("ChatUIManager: Voice memo handler or targetConnector missing for modal mic."); }
            });
        } else { console.warn("ChatUIManager: messageModalMicBtn not found."); }

        if (domElements.messageModalAttachBtn && domElements.messageModalImageUpload) {
            domElements.messageModalAttachBtn.addEventListener('click', () => domElements.messageModalImageUpload.click());
            domElements.messageModalImageUpload.addEventListener('change', (event) => {
                const targetConnector = chatOrchestrator.getCurrentModalMessageTarget();
                if (textMessageHandler?.handleModalImageUpload && targetConnector) {
                    textMessageHandler.handleModalImageUpload(event, targetConnector);
                } else { console.warn("ChatUIManager: textMessageHandler.handleModalImageUpload or targetConnector missing.");}
            });
        } else { console.warn("ChatUIManager: messageModalAttachBtn or messageModalImageUpload not found."); }


        // --- Group Chat Listeners ---
        if (domElements.sendGroupMessageBtn && domElements.groupChatInput) {
            // Listener for the send button
            domElements.sendGroupMessageBtn.addEventListener('click', () => {
                if (groupManager?.handleUserMessageInGroup) {
                    groupManager.handleUserMessageInGroup();
                } else {
                    console.warn("ChatUIManager: groupManager.handleUserMessageInGroup is not available.");
                }
            });

            // Listener for the group chat input
            domElements.groupChatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent newline in input
                    if (groupManager?.handleUserMessageInGroup) {
                        groupManager.handleUserMessageInGroup();
                    } else {
                        console.warn("ChatUIManager: groupManager.handleUserMessageInGroup is not available.");
                    }
                }
            });

            domElements.groupChatInput.addEventListener('input', () => {
                if (groupManager?.userIsTyping) {
                    groupManager.userIsTyping();
                } else {
                    console.warn("ChatUIManager: groupManager.userIsTyping is not available.");
                }
            });
        } else {
            console.warn("ChatUIManager: sendGroupMessageBtn or groupChatInput not found.");
        }

        // Listener for the leave group button
        if (domElements.leaveGroupBtn) {
            domElements.leaveGroupBtn.addEventListener('click', () => {
                if (groupManager?.leaveCurrentGroup) {
                    groupManager.leaveCurrentGroup();
                } else {
                    console.warn("ChatUIManager: groupManager.leaveCurrentGroup is not available.");
                }
            });
        } else {
            console.warn("ChatUIManager: leaveGroupBtn not found.");
        }

        // --- Header Button Listeners (Call & Info for Embedded and Modal Chats) ---
        const setupHeaderAction = (button, datasetContainer, actionType) => {
            if (button) {
                button.addEventListener('click', () => {
                    const connectorId = datasetContainer?.dataset.currentConnectorId;
                    if (connectorId && window.polyglotConnectors) {
                        const connector = window.polyglotConnectors.find(c => c.id === connectorId);
                        if (connector) {
                            if (actionType === 'call' && window.polyglotApp?.initiateSession) {
                                console.log(`ChatUIManager: ${interfaceType} chat call btn clicked for ${connectorId}`);
                                window.polyglotApp.initiateSession(connector, 'direct_modal');
                            } else if (actionType === 'info' && personaModalManager?.openDetailedPersonaModal) {
                                console.log(`ChatUIManager: ${interfaceType} chat info btn clicked for ${connectorId}`);
                                personaModalManager.openDetailedPersonaModal(connector);
                            }
                        } else { console.warn(`ChatUIManager: Connector not found for ID ${connectorId}`); }
                    } else { console.warn(`ChatUIManager: Missing connectorId or core components for header action.`);}
                });
            } else { console.warn(`ChatUIManager: Button for header action type '${actionType}' not found.`); }
        };
        
        let interfaceType = 'Embedded'; // For logging
        setupHeaderAction(domElements.embeddedChatCallBtn, domElements.embeddedChatContainer, 'call');
        setupHeaderAction(domElements.embeddedChatInfoBtn, domElements.embeddedChatContainer, 'info');
        interfaceType = 'Message Modal'; // For logging
        setupHeaderAction(domElements.messageModalCallBtn, domElements.messagingInterface, 'call');
        setupHeaderAction(domElements.messageModalInfoBtn, domElements.messagingInterface, 'info');

        console.log("chatUiManager: Chat UI control listeners setup complete.");
    }

    function showEmbeddedChatInterface(connector) {
        const { domElements, uiUpdater } = getDeps();
        console.log("chatUiManager: showEmbeddedChatInterface - Called for connector:", connector?.id);
        if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder || !uiUpdater || !connector) {
            console.error("chatUiManager: showEmbeddedChatInterface - Missing critical elements or connector.");
            return;
        }
        domElements.messagesPlaceholder.style.display = 'none';
        domElements.embeddedChatContainer.style.display = 'flex';
        uiUpdater.updateEmbeddedChatHeader(connector); // uiUpdater handles setting connectorId on dataset
        // Clearing log/input is typically done by chatOrchestrator.openConversation before populating
        if (domElements.embeddedMessageTextInput) domElements.embeddedMessageTextInput.focus();
        console.log("chatUiManager: Embedded chat interface shown for", connector.id);
    }

    function hideEmbeddedChatInterface() {
        const { domElements } = getDeps();
        console.log("chatUiManager: hideEmbeddedChatInterface - Called.");
        if (!domElements?.embeddedChatContainer || !domElements.messagesPlaceholder) {
            console.warn("chatUiManager: hideEmbeddedChatInterface - Missing relevant DOM elements.");
            return;
        }
        domElements.embeddedChatContainer.style.display = 'none';
        domElements.messagesPlaceholder.style.display = 'block';
        if (domElements.embeddedChatHeaderName) domElements.embeddedChatHeaderName.textContent = "Your Conversations"; // Reset generic header part
        if (domElements.embeddedChatHeaderDetails) domElements.embeddedChatHeaderDetails.textContent = "";
    }

    function showGroupChatView(groupName, members) {
        const { domElements, uiUpdater } = getDeps();
        console.log("chatUiManager: showGroupChatView for group:", groupName);

        if (!domElements?.groupListContainer || !domElements.groupChatInterfaceDiv || !uiUpdater) {
            console.error("chatUiManager: showGroupChatView - Missing critical DOM elements or uiUpdater.");
            return;
        }

        if (domElements.groupsViewHeader) {
            // Hide the general groups header
            domElements.groupsViewHeader.style.display = 'none';
        }

        domElements.groupListContainer.style.display = 'none';
        domElements.groupChatInterfaceDiv.style.display = 'flex'; // Adjust based on layout (e.g., 'block' or 'grid')
        uiUpdater.updateGroupChatHeader(groupName, members); // Updates the specific group chat header

        if (domElements.groupChatInput) {
            domElements.groupChatInput.focus();
        }
    }

    function hideGroupChatView() {
        const { domElements } = getDeps();
        console.log("chatUiManager: hideGroupChatView called.");

        if (!domElements?.groupListContainer || !domElements.groupChatInterfaceDiv) {
            console.warn("chatUiManager: hideGroupChatView - Missing relevant DOM elements.");
            return;
        }

        domElements.groupChatInterfaceDiv.style.display = 'none';
        domElements.groupListContainer.style.display = 'block';

        if (domElements.groupsViewHeader) {
            // Show the general groups header again
            domElements.groupsViewHeader.style.display = ''; // Reset to default display (e.g., 'block' or 'flex')
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChatUiControls);
    } else {
        initializeChatUiControls();
    }

    console.log("js/ui/chat_ui_manager.js (listeners updated).");
    return {
        showEmbeddedChatInterface,
        hideEmbeddedChatInterface,
        showGroupChatView,
        hideGroupChatView
        // updateMessageModalHeader is NOT exported; uiUpdater handles that directly.
    };
})();