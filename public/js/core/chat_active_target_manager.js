// js/core/chat_active_target_manager.js
// Manages the state of the currently active 1-on-1 chat targets for different UI contexts.

window.chatActiveTargetManager = (() => {
    'use strict';

    let currentEmbeddedChatTargetId = null;
    let currentModalMessageTargetConnector = null; // Store the full connector object for modal

    function getEmbeddedChatTargetId() {
        return currentEmbeddedChatTargetId;
    }

    function setEmbeddedChatTargetId(connectorId) {
        // console.log(`ChatActiveTargetManager: Setting embedded chat target ID to: ${connectorId}`);
        currentEmbeddedChatTargetId = connectorId;
    }

    function clearEmbeddedChatTargetId() {
        // console.log(`ChatActiveTargetManager: Clearing embedded chat target ID. Was: ${currentEmbeddedChatTargetId}`);
        currentEmbeddedChatTargetId = null;
    }

    function getModalMessageTargetConnector() {
        return currentModalMessageTargetConnector;
    }

    function setModalMessageTargetConnector(connector) {
        if (connector && (!connector.id || !connector.profileName)) {
            console.warn("ChatActiveTargetManager: Attempted to set invalid modal message target connector.", connector);
            currentModalMessageTargetConnector = null;
            return;
        }
        // console.log(`ChatActiveTargetManager: Setting modal message target connector to: ${connector?.id}`);
        currentModalMessageTargetConnector = connector ? { ...connector } : null; // Store a copy
    }

    function clearModalMessageTargetConnector() {
        // console.log(`ChatActiveTargetManager: Clearing modal message target connector. Was: ${currentModalMessageTargetConnector?.id}`);
        currentModalMessageTargetConnector = null;
    }
    
    // This module doesn't have complex init needs other than setting initial null states.
    console.log("js/core/chat_active_target_manager.js loaded.");

    return {
        getEmbeddedChatTargetId,
        setEmbeddedChatTargetId,
        clearEmbeddedChatTargetId,
        getModalMessageTargetConnector,
        setModalMessageTargetConnector,
        clearModalMessageTargetConnector
    };
})();