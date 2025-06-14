// D:\polyglot_connect\src\js\core\convo_turn_manager.ts
import type { GeminiChatItem, AIApiConstants } from '../types/global.d.ts'; // Path from core to types

console.log('convo_turn_manager.ts: Script loaded (TS Version).');

// Fetch MAX_GEMINI_HISTORY_TURNS from window.aiApiConstants if available, else use a default.
// This assumes ai_constants.js runs and sets window.aiApiConstants before this module is heavily used.
const getAiConstants = (): AIApiConstants | undefined => window.aiApiConstants;

/**
 * Adds a new turn (user or model message) to an existing Gemini history array and manages its size.
 * @param {GeminiChatItem[]} geminiHistoryArray - The Gemini history array for the conversation.
 * @param {'user' | 'model'} role - The role of the sender.
 * @param {string} text - The text content of the message.
 * @param {Array<{inlineData: {mimeType: string; data: string;}}> | null} [imageParts=null] - Optional image parts.
 */
export function addTurnToGeminiHistory(
    geminiHistoryArray: GeminiChatItem[],
    role: 'user' | 'model',
    text: string,
    imageParts: Array<{ inlineData: { mimeType: string; data: string; } }> | null = null
): void {
    if (!geminiHistoryArray || !Array.isArray(geminiHistoryArray)) {
        console.error("ConvoTurnManager: addTurnToGeminiHistory - invalid geminiHistoryArray.");
        return;
    }
    if ((!text || typeof text !== 'string' || text.trim() === "") && !imageParts) {
        return; // Nothing to add
    }

    const aiConstants = getAiConstants();
    const MAX_CONVERSATIONAL_HISTORY_TURNS = aiConstants?.MAX_GEMINI_HISTORY_TURNS || 10;

    const parts: Array<{text: string} | {inlineData: {mimeType: string; data: string;}}> = [];
    if (imageParts) {
        parts.push(...imageParts);
    }
    if (text && typeof text === 'string') {
        parts.push({ text: text });
    } else if (text) {
        parts.push({ text: String(text) });
    }

    if (parts.length === 0) return;

    geminiHistoryArray.push({ role: role, parts: parts });

    // Truncation logic: Keeps the first 2 (system prompt + model ack) + recent conversational turns.
    const systemPromptAndAckTurns = 2; 
    const maxConversationalHistoryEntries = MAX_CONVERSATIONAL_HISTORY_TURNS * 2; 
    const maxTotalEntries = systemPromptAndAckTurns + maxConversationalHistoryEntries;

    if (geminiHistoryArray.length > maxTotalEntries) {
        const systemAndAck = geminiHistoryArray.slice(0, systemPromptAndAckTurns);
        const recentTurns = geminiHistoryArray.slice(-maxConversationalHistoryEntries);
        
        geminiHistoryArray.length = 0; 
        geminiHistoryArray.push(...systemAndAck, ...recentTurns);
    }
    // console.debug(`ConvoTurnManager: Turn added/history updated. Role: ${role}. New length: ${geminiHistoryArray.length}`);
}

console.log("convo_turn_manager.ts: Module loaded, 'addTurnToGeminiHistory' function is exported.");
// No window assignment or ready event needed if imported as a utility.