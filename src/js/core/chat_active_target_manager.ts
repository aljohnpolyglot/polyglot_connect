// D:\polyglot_connect\src\js\core\chat_active_target_manager.ts

import type { Connector } from '../types/global.d.ts'; // Path from src/js/core to src/js/types

console.log('chat_active_target_manager.ts: Script loaded.');

interface ChatActiveTargetManagerModule {
    getEmbeddedChatTargetId: () => string | null;
    setEmbeddedChatTargetId: (connectorId: string | null) => void;
    clearEmbeddedChatTargetId: () => void;
    getModalMessageTargetConnector: () => Connector | null; // Assuming Connector is globally available or imported
    setModalMessageTargetConnector: (connector: Connector | null) => void;
    clearModalMessageTargetConnector: () => void;
}

// This module doesn't have complex external dependencies for its own initialization.
// It directly sets its window object.
window.chatActiveTargetManager = ((): ChatActiveTargetManagerModule => {
    'use strict';
    console.log('core/chat_active_target_manager.ts: IIFE started.');

    let currentEmbeddedChatTargetId: string | null = null;
    let currentModalMessageTargetConnector: Connector | null = null; // Assuming Connector is a known type

    // Define the localStorage key INSIDE the IIFE
    const LAST_EMBEDDED_CHAT_ID_KEY = 'polyglotLastEmbeddedChatId'; // <<< DEFINED HERE

    function getEmbeddedChatTargetId(): string | null {
        return currentEmbeddedChatTargetId;
    }

    function setEmbeddedChatTargetId(connectorId: string | null): void {
        currentEmbeddedChatTargetId = connectorId;
        if (connectorId) {
            console.log("CATM: Embedded chat target ID set to:", connectorId);
            try {
                localStorage.setItem(LAST_EMBEDDED_CHAT_ID_KEY, connectorId); // Uses the constant
                console.log("CATM: Saved last embedded chat ID to localStorage:", connectorId);
            } catch (e) {
                console.warn("CATM: Error saving last embedded chat ID to localStorage", e);
            }
        } else {
            console.log("CATM: Embedded chat target ID was cleared.");
            localStorage.removeItem(LAST_EMBEDDED_CHAT_ID_KEY); // Uses the constant
            console.log("CATM: Removed last embedded chat ID from localStorage.");
        }
    }

    function clearEmbeddedChatTargetId(): void {
        setEmbeddedChatTargetId(null); // Calls the modified setter
    }

    function getModalMessageTargetConnector(): Connector | null {
        return currentModalMessageTargetConnector;
    }

    function setModalMessageTargetConnector(connector: Connector | null): void {
        currentModalMessageTargetConnector = connector;
        if (connector) {
            console.log("CATM: Modal message target connector set to:", connector.id);
        } else {
            console.log("CATM: Modal message target connector cleared.");
        }
    }

    function clearModalMessageTargetConnector(): void {
        currentModalMessageTargetConnector = null;
        console.log("CATM: Modal message target connector explicitly cleared.");
    }

    console.log('core/chat_active_target_manager.ts: IIFE finished, returning exports.');
    return {
        getEmbeddedChatTargetId,
        setEmbeddedChatTargetId,
        clearEmbeddedChatTargetId,
        getModalMessageTargetConnector,
        setModalMessageTargetConnector,
        clearModalMessageTargetConnector
    };
})();

if (window.chatActiveTargetManager && typeof window.chatActiveTargetManager.setEmbeddedChatTargetId === 'function') {
    console.log("chat_active_target_manager.ts: SUCCESSFULLY assigned to window.chatActiveTargetManager.");
    document.dispatchEvent(new CustomEvent('chatActiveTargetManagerReady'));
    console.log('chat_active_target_manager.ts: "chatActiveTargetManagerReady" event dispatched.');
} else {
    console.error("chat_active_target_manager.ts: FAILED to assign to window or key method missing.");
}
console.log('chat_active_target_manager.ts: Script execution finished.');

// This module is simple and sets its global immediately.
// It doesn't wait for other events for its own initialization.
// However, other modules waiting for IT should listen for 'chatActiveTargetManagerReady'.
document.dispatchEvent(new CustomEvent('chatActiveTargetManagerReady'));
console.log('chat_active_target_manager.ts: "chatActiveTargetManagerReady" event dispatched.');