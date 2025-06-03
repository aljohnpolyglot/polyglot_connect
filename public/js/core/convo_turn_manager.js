// js/core/convo_turn_manager.js
// Responsible for managing individual turns in a 1-on-1 conversation,
// updating both the user-visible message list and the AI's model history.

window.convoTurnManager = (() => {
    'use strict';

    const getDeps = () => ({
        convoDataStore: window.convoDataStore, // To get/update conversation data
        // polyglotHelpers might be needed if complex formatting occurs here, but likely not.
        // _aiApiConstants for MAX_GEMINI_HISTORY_TURNS if not defined locally.
        _aiApiConstants: window._aiApiConstants
    });

    // Maximum conversational turns (user + model) to keep in AI history,
    // separate from the initial system prompt + model ack.
    const MAX_CONVERSATIONAL_HISTORY_TURNS = window._aiApiConstants?.MAX_GEMINI_HISTORY_TURNS || 10;

    /**
     * Internal helper to add a message part to the Gemini-specific history array and manage its size.
     * @param {Array} geminiHistoryArray - The Gemini history array for the conversation.
     * @param {string} role - 'user' or 'model'.
     * @param {string} text - The text content of the message.
     * @param {Array|null} imagePartsForGemini - Optional array of image parts for Gemini.
     */
    function _updateGeminiHistoryWithNewTurn(geminiHistoryArray, role, text, imagePartsForGemini = null) {
        if (!geminiHistoryArray || !Array.isArray(geminiHistoryArray)) {
            console.error("ConvoTurnManager: _updateGeminiHistoryWithNewTurn - invalid geminiHistoryArray provided.");
            return; // Or return the array unchanged
        }
        
        // Basic validation for role
        if (role !== 'user' && role !== 'model') {
            console.error(`ConvoTurnManager: Invalid role '${role}' for Gemini history. Must be 'user' or 'model'.`);
            return;
        }
        if ((!text || typeof text !== 'string' || text.trim() === "") && !imagePartsForGemini) {
            // console.warn("ConvoTurnManager: Attempted to add empty turn to Gemini history (no text and no image parts). Skipping.");
            return;
        }

        const parts = [];
        if (imagePartsForGemini && Array.isArray(imagePartsForGemini)) {
            parts.push(...imagePartsForGemini);
        } else if (imagePartsForGemini) {
            console.warn("ConvoTurnManager: imagePartsForGemini provided but not an array.", imagePartsForGemini);
        }
        if (text && typeof text === 'string') { // Ensure text is a string
            parts.push({ text: text });
        } else if (text) { // Coerce if not string but exists
            parts.push({ text: String(text) });
        }
        
        if (parts.length === 0) return; // Still nothing valid to add

        geminiHistoryArray.push({ role: role, parts: parts });

        // Truncation logic: Keeps the first 2 (system prompt + model ack) + recent conversational turns.
        const systemPromptAndAckTurns = 2; 
        const maxConversationalHistoryEntries = MAX_CONVERSATIONAL_HISTORY_TURNS * 2; // Each turn has user + model
        const maxTotalEntries = systemPromptAndAckTurns + maxConversationalHistoryEntries;

        if (geminiHistoryArray.length > maxTotalEntries) {
            const systemAndAck = geminiHistoryArray.slice(0, systemPromptAndAckTurns);
            const recentTurns = geminiHistoryArray.slice(-maxConversationalHistoryEntries);
            
            // console.debug(`ConvoTurnManager: Truncating Gemini history. Original length: ${geminiHistoryArray.length}. Keeping ${systemAndAck.length} system turns and ${recentTurns.length} recent turns.`);
            
            geminiHistoryArray.length = 0; // Clear the array in place
            geminiHistoryArray.push(...systemAndAck, ...recentTurns); // Rebuild it
        }
        // console.debug(`ConvoTurnManager: Turn added to Gemini history. Role: ${role}. New length: ${geminiHistoryArray.length}`);
    }


    /**
     * Adds a user's message to the specified conversation.
     * Updates both the display message list and the AI's Gemini history.
     * @param {string} connectorId - The ID of the connector/conversation.
     * @param {string} text - The text content of the user's message.
     * @param {string} [type='text'] - The type of message (e.g., 'text', 'image', 'user-voice-transcript').
     * @param {object} [extraData={}] - Any extra data for the message, like imagePartsForGemini.
     * @returns {object|null} The created message object or null if failed.
     */
    function addUserMessage(connectorId, text, type = 'text', extraData = {}) {
        const { convoDataStore } = getDeps();
        if (!convoDataStore) {
            console.error("ConvoTurnManager.addUserMessage: convoDataStore dependency missing.");
            return null;
        }

        const conversation = convoDataStore.getConversationById(connectorId);
        if (!conversation) {
            console.error(`ConvoTurnManager.addUserMessage: Conversation '${connectorId}' not found in store.`);
            return null;
        }
        
        // Ensure text is a string for consistency, especially if type isn't 'text' but it's passed.
        const messageText = (typeof text === 'string') ? text : String(text || `[User ${type} content]`);

        const messageObject = {
            sender: (type === 'user-voice-transcript' || type === 'user-audio') ? 'user-voice-transcript' : 'user',
            text: messageText,
            type: type,
            timestamp: Date.now(),
            ...extraData // Includes content_url, imagePartsForGemini, etc.
        };

        // Add to the display message store
        convoDataStore.addMessageToConversationStore(connectorId, messageObject);

        // Update Gemini history
        // For images, the 'text' might be a placeholder like "[User sent image]", and actual image data is in extraData.imagePartsForGemini
        // For voice transcripts, the 'text' is the actual transcript.
        _updateGeminiHistoryWithNewTurn(
            conversation.geminiHistory,
            'user',
            messageText, // Use the (potentially placeholder) text for the Gemini history text part
            extraData.imagePartsForGemini || null // Pass image parts if they exist
        );
        
        // Persist changes (geminiHistory update and new message + lastActivity in messages array)
        convoDataStore.saveAllConversationsToStorage(); 
        // console.log(`ConvoTurnManager: User message of type '${type}' added to conversation '${connectorId}'.`);
        return messageObject;
    }

    /**
     * Adds an AI model's response message to the specified conversation.
     * Updates both the display message list and the AI's Gemini history.
     * @param {string} connectorId - The ID of the connector/conversation.
     * @param {string} text - The text content of the AI's response.
     * @param {Array} [geminiHistoryRefToUpdate=null] - Optional direct reference to the history array to update (if available from caller).
     * @returns {object|null} The created message object or null if failed.
     */
    function addModelResponse(connectorId, text) {
        const { convoDataStore } = getDeps();
         if (!convoDataStore) {
            console.error("ConvoTurnManager.addModelResponse: convoDataStore dependency missing.");
            return null;
        }

        const conversation = convoDataStore.getConversationById(connectorId);
        if (!conversation) {
            console.error(`ConvoTurnManager.addModelResponse: Conversation '${connectorId}' not found in store.`);
            return null;
        }
         if (typeof text !== 'string') {
            console.warn("ConvoTurnManager.addModelResponse: Received non-string text for model response, converting. Text:", text);
            text = String(text || "(Model response was empty or invalid)");
        }

        const messageObject = {
            sender: 'connector', // Or use a more specific sender if needed, like connector.id
            text: text,
            type: 'text',
            timestamp: Date.now()
        };

        // Add to the display message store
        convoDataStore.addMessageToConversationStore(connectorId, messageObject);
        
        // Update Gemini history
        _updateGeminiHistoryWithNewTurn(conversation.geminiHistory, 'model', text);
        
        // Persist changes
        convoDataStore.saveAllConversationsToStorage();
        // console.log(`ConvoTurnManager: Model response added to conversation '${connectorId}'.`);
        return messageObject;
    }


    // Initial check for dependencies
    if (!window.convoDataStore || !window._aiApiConstants) {
        console.error("ConvoTurnManager: CRITICAL - convoDataStore or _aiApiConstants missing at load time. Turn management will fail.");
    } else {
        console.log("js/core/convo_turn_manager.js loaded.");
    }
    
    return {
        addUserMessage,
        addModelResponse
        // _updateGeminiHistoryWithNewTurn is internal and not exposed.
    };
})();