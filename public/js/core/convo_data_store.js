// js/core/convo_data_store.js
// Manages the in-memory store and localStorage persistence for 1-on-1 conversations.

window.convoDataStore = (() => {
    'use strict';

    const getDeps = () => ({
        polyglotHelpers: window.polyglotHelpers
    });

    let activeConversations = {}; // { connectorId: { id, connector, messages: [], lastActivity, geminiHistory: [] } }
    const STORAGE_KEY = 'polyglotActiveConversations';

    function initializeStore() {
        const { polyglotHelpers } = getDeps();
        if (!polyglotHelpers) {
            console.error("ConvoDataStore: CRITICAL - polyglotHelpers missing at init. Cannot load from storage. Store will be empty.");
            activeConversations = {};
            return;
        }
        const savedConversations = polyglotHelpers.loadFromLocalStorage(STORAGE_KEY);
        if (savedConversations && typeof savedConversations === 'object' && Object.keys(savedConversations).length > 0) {
            activeConversations = savedConversations;
            // Perform basic validation and ensure essential arrays exist for each loaded conversation
            Object.keys(activeConversations).forEach(connectorId => {
                const convo = activeConversations[connectorId];
                if (!convo.messages || !Array.isArray(convo.messages)) {
                    // console.warn(`ConvoDataStore: Conversation '${connectorId}' loaded from storage missing 'messages' array, initializing.`);
                    convo.messages = [];
                }
                if (!convo.geminiHistory || !Array.isArray(convo.geminiHistory)) {
                    // console.warn(`ConvoDataStore: Conversation '${connectorId}' loaded from storage missing 'geminiHistory' array, initializing.`);
                    convo.geminiHistory = [];
                }
                if (convo.connector && typeof convo.connector !== 'object') {
                    console.warn(`ConvoDataStore: Conversation '${connectorId}' has invalid connector data type. Resetting connector info.`);
                    convo.connector = null; // Or fetch from live data if possible during a higher-level init
                }
                // Ensure the conversation record itself has the 'id' if it's missing from older stored data
                if (!convo.id && convo.connector?.id) {
                    convo.id = convo.connector.id;
                } else if (!convo.id && connectorId) {
                     convo.id = connectorId;
                }
            });
            console.log(`ConvoDataStore: Initialized. Loaded ${Object.keys(activeConversations).length} conversations from localStorage.`);
        } else {
            activeConversations = {};
            console.log("ConvoDataStore: Initialized. No valid saved conversations found in localStorage, or storage was empty. Starting fresh.");
        }
    }

    function saveAllConversationsToStorage() {
        const { polyglotHelpers } = getDeps();
        if (!polyglotHelpers) {
            console.error("ConvoDataStore: polyglotHelpers missing. Cannot save conversations to storage.");
            return;
        }
        try {
            polyglotHelpers.saveToLocalStorage(STORAGE_KEY, activeConversations);
            // console.debug("ConvoDataStore: All conversations successfully saved to localStorage.");
        } catch (e) {
            console.error("ConvoDataStore: Error saving conversations to localStorage:", e);
        }
    }

    function getConversationById(connectorId) {
        if (!connectorId || typeof connectorId !== 'string') {
            // console.warn("ConvoDataStore.getConversationById: Invalid or missing connectorId.");
            return null;
        }
        return activeConversations[connectorId] || null;
    }
    
    function getAllConversationsAsArray() {
        return Object.values(activeConversations);
    }

    function createNewConversationRecord(connectorId, connectorData) {
        if (!connectorId || typeof connectorId !== 'string' || !connectorData || typeof connectorData !== 'object' || connectorData.id !== connectorId) {
            console.error("ConvoDataStore.createNewConversationRecord: Invalid input. connectorId and connectorData (with matching id) are required.", {connectorId, connectorData});
            return null;
        }
        if (activeConversations[connectorId]) {
            console.warn(`ConvoDataStore: Attempted to create new record for existing conversation ID '${connectorId}'. Returning existing one.`);
            return activeConversations[connectorId];
        }
        activeConversations[connectorId] = {
            id: connectorId,
            connector: { ...connectorData }, // Store a copy of the live connector data
            messages: [],
            lastActivity: Date.now(),
            geminiHistory: [] // This will be initialized by convo_prompt_builder.js via conversation_manager.js
        };
        console.log(`ConvoDataStore: New conversation record CREATED for connector '${connectorId}'.`);
        saveAllConversationsToStorage(); // Save immediately after creation
        return activeConversations[connectorId];
    }

    // More specific update functions are preferred over a generic one.
    // This function can be used to update the 'connector' object if it changes in polyglotConnectors,
    // or to update 'lastActivity'.
    function updateConversationProperty(connectorId, propertyName, value) {
        if (!activeConversations[connectorId]) {
            console.warn(`ConvoDataStore: Cannot update property '${propertyName}'. Conversation '${connectorId}' not found.`);
            return null;
        }
        if (propertyName === 'id') {
            console.error("ConvoDataStore: Updating 'id' property is not allowed directly.");
            return activeConversations[connectorId];
        }
        activeConversations[connectorId][propertyName] = value;
        activeConversations[connectorId].lastActivity = Date.now(); // Always update lastActivity on any modification
        // console.debug(`ConvoDataStore: Property '${propertyName}' updated for '${connectorId}'.`);
        // Defer saving to a more central point or specific actions like adding a message.
        return activeConversations[connectorId];
    }
    
    function addMessageToConversationStore(connectorId, messageObject) {
        if (!connectorId || !activeConversations[connectorId]) {
            console.error(`ConvoDataStore.addMessageToConversationStore: Cannot add message. Conversation '${connectorId}' not found.`);
            return false;
        }
        if (!activeConversations[connectorId].messages) { // Should have been initialized
            activeConversations[connectorId].messages = [];
        }
        activeConversations[connectorId].messages.push(messageObject);
        activeConversations[connectorId].lastActivity = messageObject.timestamp || Date.now();
        // console.debug(`ConvoDataStore: Message added to conversation store for '${connectorId}'. Total messages: ${activeConversations[connectorId].messages.length}`);
        // Saving to storage will be handled by the calling manager (e.g., convo_turn_manager or conversation_manager facade)
        return true;
    }

    function getGeminiHistoryFromStore(connectorId) {
        if (!connectorId || !activeConversations[connectorId]) {
            // console.warn(`ConvoDataStore.getGeminiHistoryFromStore: Conversation '${connectorId}' not found.`);
            return null; // Or an empty array: []
        }
        return activeConversations[connectorId].geminiHistory || []; // Ensure it always returns an array
    }

    function updateGeminiHistoryInStore(connectorId, newHistoryArray) {
        if (!connectorId || !activeConversations[connectorId]) {
            console.error(`ConvoDataStore.updateGeminiHistoryInStore: Cannot update. Conversation '${connectorId}' not found.`);
            return false;
        }
        if (!Array.isArray(newHistoryArray)) {
            console.error(`ConvoDataStore.updateGeminiHistoryInStore: newHistoryArray is not an array for '${connectorId}'.`);
            return false;
        }
        activeConversations[connectorId].geminiHistory = newHistoryArray;
        // console.debug(`ConvoDataStore: Gemini history updated in store for '${connectorId}'. New length: ${newHistoryArray.length}`);
        // Saving to storage will be handled by the calling manager
        return true;
    }

    // Initialize the store when the script loads
    initializeStore();

    if (window.polyglotHelpers) {
        console.log("js/core/convo_data_store.js loaded and initialized.");
    } else {
        console.error("js/core/convo_data_store.js loaded, but polyglotHelpers was missing during initialization. Store may be empty or non-functional.");
    }

    return {
        saveAllConversationsToStorage,
        getConversationById,
        getAllConversationsAsArray,
        createNewConversationRecord,
        updateConversationProperty, // Use with caution, more specific updaters preferred
        addMessageToConversationStore,
        getGeminiHistoryFromStore,
        updateGeminiHistoryInStore
    };
})();