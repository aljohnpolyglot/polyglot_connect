// src/js/core/convo_prompt_builder.ts
// in convo_prompt_builder.ts
// in convo_prompt_builder.ts
import type { 
    Connector, 
    GeminiChatItem, 
    LanguageEntry, 
    PolyglotHelpersOnWindow as PolyglotHelpers,
    PersonaIdentity,
    MessageInStore,
    TranscriptTurn // <<< ADD THIS
} from '../types/global.d.ts';
// No need to import IdentityServiceModule if we access window.identityService directly
const polyglotHelpers: PolyglotHelpers = window.polyglotHelpers as PolyglotHelpers;
// AT THE TOP OF THE FILE
// AT THE TOP OF THE FILE
// in convo_prompt_builder.ts
import { 
    getCoreIdentityPrompt, 
    getPersonalityAndBehaviorPrompt, 
    getContextSettingPrompt, // <<< FIX: Renamed function
    getFirstInteractionRulePrompt
} from './persona_prompt_parts';
if (!polyglotHelpers) {
    console.error("CRITICAL ERROR in convo_prompt_builder.ts: polyglotHelpers was not found on window. Make sure helpers.ts has run and initialized it.");
    // Depending on your error handling, you might want to throw an error here
    // to prevent further execution if polyglotHelpers is essential.
    // For now, this console error will alert you.
}

console.log('convo_prompt_builder.ts: Script loaded (TS Version).');

const MAX_GEMINI_HISTORY_TURNS_INTERNAL = 4; 

// _addMessageToHistoryAndTruncate remains the same as in your provided file.
// For brevity, I'll assume it's here.
// src/js/core/convo_prompt_builder.ts

// <<< START OF REPLACEMENT FUNCTION >>>
function _addMessageToHistoryAndTruncate(
    historyArray: GeminiChatItem[],
    role: 'user' | 'model',
    text: string,
    imageParts: Array<{ inlineData: { mimeType: string; data: string; } }> | null = null
): void {
    if (!historyArray) {
        console.error("ConvoPromptBuilder: History array is invalid.");
        return;
    }

    const parts: Array<{text: string} | {inlineData: {mimeType: string; data: string;}}> = [];
    if (imageParts && imageParts.length > 0) {
        parts.push(...imageParts);
    }
    if (text && typeof text === 'string' && text.trim() !== "") {
        parts.push({ text: text.trim() });
    }
    
    if (parts.length === 0) return;

    historyArray.push({ role, parts });

    // --- Robust History Truncation ---
    // Keep the first 2 items (system prompt + model ack) and the last N turns.
    const maxTurnsToKeep = MAX_GEMINI_HISTORY_TURNS_INTERNAL; // 10 turns = 20 entries
    const maxHistoryEntries = 2 + (maxTurnsToKeep * 2);

    if (historyArray.length > maxHistoryEntries) {
        // console.log(`Truncating history from ${historyArray.length} to ~${maxHistoryEntries} entries.`);
        const systemPromptAndAck = historyArray.slice(0, 2);
        const recentTurns = historyArray.slice(-maxTurnsToKeep * 2); // Get the last 20 entries

        historyArray.length = 0; // Clear the array
        historyArray.push(...systemPromptAndAck, ...recentTurns); // Rebuild it
    }
}
// <<< END OF REPLACEMENT FUNCTION >>>
// IN: src/js/core/convo_prompt_builder.ts
// REPLACE the entire buildInitialGeminiHistory function with this:

export async function buildInitialGeminiHistory(connectorOriginal: Connector): Promise<GeminiChatItem[]> {
    const newHistoryArray: GeminiChatItem[] = [];
    const functionName = "buildInitialGeminiHistory (Refactored)";

    // For simplicity, we'll use connectorOriginal directly as our persona data source.
    // In your full version, you'd keep your identity/memory service calls here.
    const persona = connectorOriginal; 

    if (!persona || !persona.id) {
        console.error(`ConvoPromptBuilder (${functionName}): Invalid connector. Cannot build prompt.`);
        _addMessageToHistoryAndTruncate(newHistoryArray, 'user', "You are a helpful assistant.");
        _addMessageToHistoryAndTruncate(newHistoryArray, 'model', "Okay, I will be a helpful assistant.");
        return newHistoryArray;
    }

    const systemPromptParts: string[] = [];

    // --- 1. Get Shared Core & Personality Rules from the Central File ---
 // IN: buildInitialGeminiHistory
// MODIFY THIS SECTION

    // --- 1. Get Shared Core & Personality Rules from the Central File ---
const convoStore = window.convoStore;
const userSummary = convoStore?.getGlobalUserProfile();
systemPromptParts.push(getCoreIdentityPrompt(persona, userSummary)); // <<< PASS THE SUMMARY
systemPromptParts.push(getPersonalityAndBehaviorPrompt(persona, window.polyglotHelpers));
    // --- NEW: Time-Aware Greeting Logic ---
    let lastMessage: MessageInStore | null = null;
    let recentHistoryText: string | null = null;
    if (window.conversationManager && window.polyglotHelpers) {
        const convoRecord = await window.conversationManager.getConversationById(persona.id);
        const messages = convoRecord?.messages || [];
        if (messages.length > 0) {
            lastMessage = messages[messages.length - 1]; // <<< GET THE WHOLE OBJECT
            const recentMessages = messages.slice(-8); 
            const transcriptTurns: TranscriptTurn[] = recentMessages.map(msg => {
                const turnType: TranscriptTurn['type'] = msg.type === 'voice' ? 'audio' : msg.type as TranscriptTurn['type'];
                return { 
                    sender: msg.sender, 
                    text: msg.text, 
                    type: turnType,
                    timestamp: msg.timestamp 
                };
            });
            recentHistoryText = window.polyglotHelpers.formatTranscriptForLLM(transcriptTurns, persona.profileName, "User");
        }
    }
    systemPromptParts.push(getContextSettingPrompt(persona, lastMessage, recentHistoryText));
    // --- END NEW SECTION ---
    // --- 2. Add TEXT-CHAT-SPECIFIC Rules ---
  // --- NEW LOGIC FOR TEXT CHAT PROMPT ---

// Combine both spoken style and texting mechanics for the full text persona.
    // --- 2. Add TEXT-CHAT-SPECIFIC Rules (CRITICAL) ---
    const spokenStyle = persona.communicationStyle || "natural and friendly";
    const textingMechanics = persona.chatPersonality?.style;

    if (textingMechanics) {
        systemPromptParts.push(`
# SECTION 6: YOUR TEXTING STYLE (CRITICAL FOR THIS CHAT)

This is a non-negotiable directive for how you **MUST** type in this text-based conversation. It overrides general grammar rules.

- **Your Core Personality (The 'Soul'):** Your underlying personality is still: *"${spokenStyle}"*.
- **Your Typing Mechanics (The 'Fingers'):** You **MUST** express that personality by strictly following these mechanical texting rules:
    - **RULE:** "${textingMechanics}"

**THIS IS A PERFORMANCE TEST. For example, if the rule says "types in all lowercase", you MUST type in all lowercase. If it says "uses 'u' instead of 'you'", you MUST do it. Failure to adopt this specific texting style is a failure to perform your character correctly.**
`);
    } else {
        // Fallback for personas without a specific chat personality
        systemPromptParts.push(`
--- TEXT COMMUNICATION STYLE ---
Your communication style for this text chat is: "${spokenStyle}". Type naturally, following standard grammar and punctuation.
        `);
    }
    // --- 3. Finalize and Build ---
 // --- NEW: Get conversation length for context-specific rules ---
 let conversationLength = 0;
 if (window.conversationManager) {
     const convoRecord = await window.conversationManager.getConversationById(persona.id);
     conversationLength = convoRecord?.messages?.length || 0;
 }
 
 // --- 2.5: Add the CRITICAL First Interaction Rule if applicable ---
 systemPromptParts.push(getFirstInteractionRulePrompt(persona, conversationLength));


 // --- 3. Finalize and Build ---
 const fullSystemPrompt = systemPromptParts.filter(p => p && p.trim()).join('\n\n');
 _addMessageToHistoryAndTruncate(newHistoryArray, 'user', fullSystemPrompt);




    _addMessageToHistoryAndTruncate(newHistoryArray, 'model', `Understood. I will act as ${persona.profileName} and follow all text chat instructions.`);
    
    console.log(`ConvoPromptBuilder (${functionName}): Built TEXT prompt for '${persona.id}'.`);
    return newHistoryArray;
}
console.log("convo_prompt_builder.ts: Module loaded, 'buildInitialGeminiHistory' function is exported.");