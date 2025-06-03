// js/ui/chat_view_manager.js
// Manages the visibility and display state of specific chat UI components
// such as the embedded 1-on-1 chat interface, group chat list vs. group chat view.
// This is distinct from the main view_manager.js which handles top-level app views/tabs.

window.chatViewManager = (() => { // Changed name to chatViewManager to avoid conflict
    'use strict';

    // Helper to get dependencies safely
    const getSafeDeps = () => {
        const deps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater // uiUpdater is used for updating headers within these views
        };
        if (!deps.domElements || !deps.uiUpdater) {
            console.error("ChatViewManager: CRITICAL - domElements or uiUpdater missing. UI section visibility will fail.");
            return null;
        }
        return deps;
    };

    /**
     * Shows the embedded 1-on-1 chat interface and hides the placeholder.
     * Updates the embedded chat header with the connector's information.
     * @param {object} connector - The connector object whose chat is being shown.
     */
    function showEmbeddedChatInterface(connector) {
        const deps = getSafeDeps();
        if (!deps) return;
        const { domElements, uiUpdater } = deps;

        // console.log("ChatViewManager: showEmbeddedChatInterface - Called for connector:", connector?.id);
        if (!domElements.embeddedChatContainer || !domElements.messagesPlaceholder || !connector || !connector.id) {
            console.error("ChatViewManager.showEmbeddedChatInterface: Missing critical DOM elements or valid connector data.", {
                hasEmbCont: !!domElements.embeddedChatContainer,
                hasPlaceholder: !!domElements.messagesPlaceholder,
                connectorId: connector?.id
            });
            return;
        }

        domElements.messagesPlaceholder.style.display = 'none';
        domElements.embeddedChatContainer.style.display = 'flex'; // Assuming flex is the desired display
        
        uiUpdater.updateEmbeddedChatHeader(connector); // This also sets data-current-connector-id
        
        // Clearing log/input and focusing input is now typically handled by
        // chat_session_handler.openConversationInEmbeddedView after calling this function.
        // However, if this function is called directly, focusing might be useful here.
        // if (domElements.embeddedMessageTextInput) domElements.embeddedMessageTextInput.focus();
        
        console.log(`ChatViewManager: Embedded chat interface shown for '${connector.id}'.`);
    }

    /**
     * Hides the embedded 1-on-1 chat interface and shows the placeholder.
     * Resets the embedded chat header.
     */
    function hideEmbeddedChatInterface() {
        const deps = getSafeDeps();
        if (!deps) return;
        const { domElements } = deps;

        // console.log("ChatViewManager: hideEmbeddedChatInterface - Called.");
        if (!domElements.embeddedChatContainer || !domElements.messagesPlaceholder) {
            console.warn("ChatViewManager.hideEmbeddedChatInterface: Missing embeddedChatContainer or messagesPlaceholder DOM elements.");
            return;
        }

        domElements.embeddedChatContainer.style.display = 'none';
        domElements.messagesPlaceholder.style.display = 'block'; // Or 'flex' if that's its default

        // Reset header to a generic state
        if (domElements.embeddedChatHeaderName) {
            domElements.embeddedChatHeaderName.textContent = "Your Conversations";
        }
        if (domElements.embeddedChatHeaderDetails) {
            domElements.embeddedChatHeaderDetails.textContent = "Select a chat or start a new one.";
        }
        if (domElements.embeddedChatHeaderAvatar) {
            domElements.embeddedChatHeaderAvatar.src = "images/placeholder_avatar.png"; // Path from public
        }
        // Clear the connector ID from the dataset
        if (domElements.embeddedChatContainer.dataset.currentConnectorId) {
            delete domElements.embeddedChatContainer.dataset.currentConnectorId;
        }
        console.log("ChatViewManager: Embedded chat interface hidden.");
    }

    /**
     * Shows the group chat interface and hides the group list.
     * Updates the group chat header.
     * @param {string} groupName - The name of the group.
     * @param {Array<object>} members - Array of member connector objects for avatar display.
     */
    function showGroupChatView(groupName, members) {
        const deps = getSafeDeps();
        if (!deps) return;
        const { domElements, uiUpdater } = deps;

        // console.log("ChatViewManager: showGroupChatView for group:", groupName);
        if (!domElements.groupListContainer || !domElements.groupChatInterfaceDiv || !groupName || !members) {
            console.error("ChatViewManager.showGroupChatView: Missing critical DOM elements, groupName, or members.", {
                hasListCont: !!domElements.groupListContainer,
                hasChatInt: !!domElements.groupChatInterfaceDiv,
                groupName, members
            });
            return;
        }

        // Optionally hide the main "Groups" view header if it's different from the chat header
        if (domElements.groupsViewHeader && domElements.groupsViewHeader.style.display !== 'none') {
            // console.debug("ChatViewManager: Hiding general groupsViewHeader.");
            domElements.groupsViewHeader.style.display = 'none';
        }

        domElements.groupListContainer.style.display = 'none';
        domElements.groupChatInterfaceDiv.style.display = 'flex'; // Or 'block', depending on your CSS
        
        uiUpdater.updateGroupChatHeader(groupName, members);
        
        // Clearing log/input is typically done by groupManager.joinGroup or groupUiHandler
        // after calling this function.
        // if (domElements.groupChatInput) domElements.groupChatInput.focus();
        console.log(`ChatViewManager: Group chat view shown for '${groupName}'.`);
    }

    /**
     * Hides the group chat interface and shows the group list.
     * Resets the main "Groups" view header if applicable.
     */
    function hideGroupChatView() {
        const deps = getSafeDeps();
        if (!deps) return;
        const { domElements } = deps;

        // console.log("ChatViewManager: hideGroupChatView called.");
        if (!domElements.groupListContainer || !domElements.groupChatInterfaceDiv) {
            console.warn("ChatViewManager.hideGroupChatView: Missing groupListContainer or groupChatInterfaceDiv.");
            return;
        }

        domElements.groupChatInterfaceDiv.style.display = 'none';
        domElements.groupListContainer.style.display = 'block'; // Or 'flex'

        // Optionally show the main "Groups" view header again
        if (domElements.groupsViewHeader) {
            // console.debug("ChatViewManager: Restoring display for general groupsViewHeader.");
            domElements.groupsViewHeader.style.display = ''; // Resets to CSS default (e.g., block, flex)
        }
        console.log("ChatViewManager: Group chat view hidden, group list shown.");
    }

    // No specific initialization needed for this module other than defining its functions.
    // It's called by other modules (like chatSessionHandler or groupManager).
    if (window.domElements && window.uiUpdater) { // Basic check
        console.log("js/ui/chat_view_manager.js loaded (manages chat UI section visibility).");
    } else {
        console.error("js/ui/chat_view_manager.js loaded, but essential dependencies (domElements, uiUpdater) were MISSING. Functionality will be impaired.");
    }
    
    return {
        showEmbeddedChatInterface,
        hideEmbeddedChatInterface,
        showGroupChatView,
        hideGroupChatView
    };
})();