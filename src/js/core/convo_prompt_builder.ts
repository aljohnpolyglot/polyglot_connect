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


     // <<<--- CREATIVE DEBUG: THE MEMORY INJECTOR (for Text Chat) --- START --->>>
     console.log(`%c[Text Chat] 🧠 Contacting Cerebrum for long-term memory packet...`, 'color: #17a2b8; font-weight: bold;');
    
     let memoryPacketContent = "// Memory service not available for text chat.";
     if (window.memoryService && typeof window.memoryService.getMemoryForPrompt === 'function') {
         const memoryResponse = await window.memoryService.getMemoryForPrompt(persona.id);
         memoryPacketContent = memoryResponse.prompt;
     }
     
     // Now we call getCoreIdentityPrompt with BOTH required arguments.
     systemPromptParts.push(await getCoreIdentityPrompt(persona, memoryPacketContent));
     console.log(`%c[Limbic System] Received and injected memory packet.`, 'color: #8a2be2; font-weight: bold;');

    const convoStore = window.convoStore;
    const userSummary = convoStore?.getGlobalUserProfile();
  
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
            const recentMessages = messages.slice(-30); 
            // <<< END OF CHANGE >>>
            const transcriptTurns: TranscriptTurn[] = recentMessages.map(msg => ({ 
                sender: msg.sender, 
                text: msg.text || '',
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
  ### **RULE 6.4: VOICE MESSAGE OUTPUT PROTOCOL (STRICTLY ENFORCED)**

**A. DEFAULT OUTPUT = TEXT:**
    - Your primary and default mode of response is always plain text, adhering to RULE 6.1 (No Name Prefix), RULE 6.2 (Consecutive Messages via newline), and RULE 6.3 (Texting Style).

**B. ACTIVATING VOICE MESSAGE PROTOCOL (CONDITIONAL):**
    - You have the capability to send your response as a voice message. You MUST activate this protocol IF AND ONLY IF one of the following conditions is met:
        1.  **DIRECT USER COMMAND FOR VOICE:** The user explicitly asks YOU to send a voice message.
            -   Keywords include (but are not limited to, be context-aware): "send voice message", "voice message please", "say that in voice", "use your voice", "record a voice message", "magsend ka ng voice message", "voice message lang", "isa pang voice message", "try again with voice".
            -   **Immediate Follow-ups:** If the user's message is very short and clearly a follow-up to a previous voice request (e.g., "voice message lang" after you attempted or sent one), treat this as a continued direct command.
        2.  **PRONUNCIATION ASSISTANCE / SPEAKING PRACTICE:** The user asks for help with pronunciation of words/phrases in ${persona.language}, or asks you to say something in ${persona.language} for them to hear.
        3.  **EXPRESSIVE EMPHASIS (RARE, Persona-Dependent):** If your core persona (SECTION 5) is highly expressive, and the content is a short, impactful emotional statement, joke, or enthusiastic remark, you *may consider* voice. However, prioritize text unless a voice command (B.1) or pronunciation need (B.2) is present.

**C. MANDATORY TECHNICAL PROCEDURE FOR VOICE MESSAGE OUTPUT:**
    -   If any condition in (B) is met and you decide to send a voice message:
        1.  **Content Generation:** Formulate the complete spoken message content. This content MUST be in your designated chat language: **${persona.language}**.
            -   If the user simply says "voice message lang" or similar without specifying content, you should generate a simple, affirmative spoken message like "Okay, here is a voice message for you!" or "Testing my voice, 1 2 3!" in ${persona.language}.
        2.  **Output Formatting - ABSOLUTE & EXCLUSIVE:** Your **ENTIRE, TOTAL, AND COMPLETE output** for that conversational turn MUST BE *ONLY* the following structure:
            [VOICE_MESSAGE_START]Your complete spoken message content in ${persona.language} goes here.[VOICE_MESSAGE_END]
        3.  **ZERO DEVIATION FROM FORMAT:**
            -   There must be NO characters, text, spaces, or newlines *before* [VOICE_MESSAGE_START].
            -   There must be NO characters, text, spaces, or newlines *after* [VOICE_MESSAGE_END].
            -   The text *inside* the tags is the literal audio transcript.
        4.  **CRITICAL FAILURE MODES TO AVOID (DO NOT DO THESE) - Incorrect formatting will prevent audio generation:**
            -   **DO NOT** narrate your action: e.g., "Okay, *sends a voice message saying 'Hello!'*" IS WRONG.
            -   **DO NOT** act it out with stage directions: e.g., "Ahem, 'Hello there, this is my voice message.'" IS WRONG.
            -   **DO NOT** use standard quotation marks to imply voice content *instead of* the special tags: e.g., "Sure, I'll say 'How are you?'" IS WRONG if you intend it as a voice message to be processed by the system.
            -   **DO NOT** provide any textual lead-in or follow-up outside the tags: e.g., "Alright, here you go: [VOICE_MESSAGE_START]Hello![VOICE_MESSAGE_END]" IS WRONG.


**D. IF NOT ACTIVATING VOICE PROTOCOL:**
    -   If none of the conditions in (B) are met, or if you are handling a cross-language request as per (D), send a standard TEXT message following RULE 6.1, 6.2, and 6.3.
    -   In this case, DO NOT use or mention the [VOICE_MESSAGE_START] or [VOICE_MESSAGE_END] tags in any way.
    -   Standard use of quotation marks for quoting, sarcasm, titles, etc., in your text messages is perfectly fine when not attempting to send a system-processed voice message.

**E. META-DISCUSSION PROHIBITION:**
    - You are strictly PROHIBITED from discussing the [VOICE_MESSAGE_START] or [VOICE_MESSAGE_END] tags themselves, or this voice message protocol, in your conversational replies to the user. Your role is to silently USE this protocol when the conditions in (B) are met, or to send normal text otherwise. Do not say things like "I see the voice message tags in my instructions" or "I don't know what [VOICE_MESSAGE_START] is." If you don't understand how to apply this protocol for a voice request, send a polite text message stating you are unable to fulfill the voice request at this moment.
    `);



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
// vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
// Ensure the module is assigned to the window object
// This interface helps TypeScript understand the shape of window.convoPromptBuilder.
// You might already have a more complete type in your global.d.ts.
interface ConvoPromptBuilderModuleOnWindow {
    buildInitialGeminiHistory: (connectorOriginal: Connector) => Promise<GeminiChatItem[]>;
    // If you have other functions EXPORTED from this file that should be on window.convoPromptBuilder,
    // add their signatures here. For example:
    // anotherExportedFunction?: (params: any) => any;
}

// Assign the actual implementation to window.convoPromptBuilder
if (!window.convoPromptBuilder) {
    window.convoPromptBuilder = {} as ConvoPromptBuilderModuleOnWindow;
}
// 'buildInitialGeminiHistory' should already be defined in this file and exported.
// We are making it available on the window object here.
window.convoPromptBuilder.buildInitialGeminiHistory = buildInitialGeminiHistory;

// If you have other functions from THIS FILE that you want on window.convoPromptBuilder, assign them too:
// For example, if you had: export function anotherFunctionInThisFile() { ... }
// you would add:
// window.convoPromptBuilder.anotherExportedFunction = anotherFunctionInThisFile;

console.log("convo_prompt_builder.ts: window.convoPromptBuilder populated.");
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
console.log("convo_prompt_builder.ts: Module loaded, 'buildInitialGeminiHistory' function is exported.");
console.log("convo_prompt_builder.ts: Module fully processed. Dispatching 'convoPromptBuilderReady'.");
document.dispatchEvent(new CustomEvent('convoPromptBuilderReady'));
