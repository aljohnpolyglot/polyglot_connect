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
// in src/js/core/convo_prompt_builder.ts

export async function buildInitialGeminiHistory(connectorOriginal: Connector): Promise<GeminiChatItem[]> {
    const newHistoryArray: GeminiChatItem[] = [];
    const functionName = "buildInitialGeminiHistory (Reordered)";

    const persona = connectorOriginal; 

    if (!persona || !persona.id) {
        console.error(`ConvoPromptBuilder (${functionName}): Invalid connector. Cannot build prompt.`);
        _addMessageToHistoryAndTruncate(newHistoryArray, 'user', "You are a helpful assistant.");
        _addMessageToHistoryAndTruncate(newHistoryArray, 'model', "Okay, I will be a helpful assistant.");
        return newHistoryArray;
    }

    const systemPromptParts: string[] = [];

    // --- STEP 1: Core Identity & Personality (Who you ARE) ---
    const convoStore = window.convoStore;
    const userSummary = convoStore?.getGlobalUserProfile();
    systemPromptParts.push(await getCoreIdentityPrompt(persona));
    console.log(`%c[Limbic System] Received memory packet from Thalamus. Adding to system prompt.`, 'color: #8a2be2; font-weight: bold;');

    systemPromptParts.push(getPersonalityAndBehaviorPrompt(persona, window.polyglotHelpers));

    // --- STEP 2: Conversational Context (What you should TALK ABOUT NOW) ---
    let lastMessage: MessageInStore | null = null;
    let recentHistoryText: string | null = null;
    let conversationLength = 0;
    
    if (window.conversationManager && window.polyglotHelpers) {
        const convoRecord = await window.conversationManager.getConversationById(persona.id);
        const messages = convoRecord?.messages || [];
        conversationLength = messages.length;
        if (messages.length > 0) {
            lastMessage = messages[messages.length - 1];
            // <<< THIS IS THE CHANGE >>>
            const recentMessages = messages.slice(-25); 
            // <<< END OF CHANGE >>>
            const transcriptTurns: TranscriptTurn[] = recentMessages.map(msg => ({ 
                sender: msg.sender, 
                text: msg.text, 
                type: msg.type as TranscriptTurn['type'],
                timestamp: msg.timestamp 
            }));
            recentHistoryText = window.polyglotHelpers.formatTranscriptForLLM(transcriptTurns, persona.profileName, "User");
        }
    }
    // These add SECTION 7 and SECTION 8
    systemPromptParts.push(getContextSettingPrompt(persona, lastMessage, recentHistoryText));
    systemPromptParts.push(getFirstInteractionRulePrompt(persona, conversationLength, userSummary)); // Pass userSummary here too if needed

    // =================== START: THIS IS THE NEW FINAL RULE ===================
    // --- STEP 3: FINAL OUTPUT FORMAT (HOW you MUST WRITE your response) ---
    // This rule is placed last to be the most dominant instruction.
    const spokenStyle = persona.communicationStyle || "natural and friendly";
    const textingMechanics = persona.chatPersonality?.style;
    if (textingMechanics) {
        systemPromptParts.push(`
    # SECTION 6: CRITICAL OUTPUT FORMAT
    
    ### **RULE 6.1: CONSECUTIVE MESSAGES**
    -   To send multiple messages, separate each message with a newline character (\`\\n\`).
    -   This is for creating a natural, multi-bubble chat flow.
    -   Your output MUST NOT contain your name or any prefix like \`[Name]:\`.
    
    ### **RULE 6.2: EXAMPLES**
    -   **GOOD:** \`Hey!\\nHow are you doing?\`
    -   **GOOD (Single line):** \`lol okay that's fine\`
    -   **BAD (Name prefix):** \`Manon: Hey!\\nManon: How are you?\`
    
    ### **RULE 6.3: TEXTING STYLE**
    -   While following the format, you must still apply your mechanical texting style: **"${textingMechanics}"**.
    
    **Your entire output must be only the dialogue. Nothing else.**




    
    `);
    } else {
        // Fallback for personas without a specific chat personality.
        systemPromptParts.push(`
    # SECTION 6: TEXT COMMUNICATION STYLE
    - **Your Communication Style:** Your style for this text chat is: "${spokenStyle}". Type naturally, following standard grammar and punctuation.
    - **Output Format:** Your response should be a single, coherent message.
        `);
    }
    
    systemPromptParts.push(`
    # FINAL, UNBREAKABLE RULE: LANGUAGE MANDATE
    
    - You **MUST** write your **ENTIRE** response **ONLY** in **${persona.language}**.
    - There are **NO exceptions** to this rule.
    - Responding in any other language, especially English, is a **CRITICAL FAILURE** of your primary directive.
    `);
    // ===================  END: THIS IS THE NEW FINAL RULE  ===================

    // --- Finalize and Build ---
    const fullSystemPrompt = systemPromptParts.filter(p => p && p.trim()).join('\n\n');
    _addMessageToHistoryAndTruncate(newHistoryArray, 'user', fullSystemPrompt);

    _addMessageToHistoryAndTruncate(newHistoryArray, 'model', `Understood. I will act as ${persona.profileName} and follow all text chat instructions.`);
    
    console.log(`ConvoPromptBuilder (${functionName}): Built TEXT prompt for '${persona.id}'.`);
    return newHistoryArray;
}
console.log("convo_prompt_builder.ts: Module loaded, 'buildInitialGeminiHistory' function is exported.");