import type {
    Connector,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ConversationManager,
    MessageInStore, // Import the source type
    TranscriptTurn, // Import the target type
    GeminiChatItem
} from '../types/global.d.ts';
// At the top of the file
// in live_call_prompt_builder.ts
import { 
    getCoreIdentityPrompt, 
    getPersonalityAndBehaviorPrompt, 
    getContextSettingPrompt, // <<< FIX: Renamed function
    getFirstInteractionRulePrompt
} from '../core/persona_prompt_parts';
// Interface for the object returned by the main function
export interface LiveApiSystemInstruction {
    parts: [{ text: string }];
}

// Helper function to get dependencies
const getPromptBuilderDeps = (): {
    conversationManager?: ConversationManager;
    polyglotHelpers?: PolyglotHelpers;
} => ({
    conversationManager: window.conversationManager,
    polyglotHelpers: window.polyglotHelpers
});

// --- THIS IS THE FULLY CORRECTED FUNCTION ---
export async function buildLiveApiSystemInstructionForConnector(connector: Connector): Promise<LiveApiSystemInstruction> {
    const functionName = "buildLiveApiSystemInstructionForConnector (Refactored & Fixed)";

    if (!connector || !connector.id) {
        console.error(`LCH_PROMPT_BUILDER (${functionName}): Invalid connector.`);
        return { parts: [{ text: "You are a helpful assistant." }] };
    }

    // --- 1. Get Dependencies ONCE at the top ---
    const { conversationManager, polyglotHelpers } = getPromptBuilderDeps();
    
    const systemPromptParts: string[] = [];

    // --- 2. Get Shared Core & Personality Rules ---
const convoStore = window.convoStore;
const userSummary = convoStore?.getGlobalUserProfile();
systemPromptParts.push(await getCoreIdentityPrompt(connector));
// Ensure polyglotHelpers exists before passing it
if (polyglotHelpers) {
    systemPromptParts.push(getPersonalityAndBehaviorPrompt(connector, polyglotHelpers));
}
    // --- NEW: 3. Unified Context Setting (Replaces Greeting & History) ---
    let lastMessage: MessageInStore | null = null;
    let recentHistoryText: string | null = null;
    if (conversationManager && polyglotHelpers) {
        const convoRecord = await conversationManager.getConversationById(connector.id);
        const allMessages = convoRecord?.messages || [];
        if (allMessages.length > 0) {
            lastMessage = allMessages[allMessages.length - 1]; // <<< GET THE WHOLE OBJECT
            const recentMessages = allMessages.slice(-8); 
            const transcriptTurns: TranscriptTurn[] = recentMessages.map(msg => {
                const turnType: TranscriptTurn['type'] = msg.type === 'voice' ? 'audio' : msg.type as TranscriptTurn['type'];
                return { 
                    sender: msg.sender, 
                    text: msg.text, 
                    type: turnType,
                    timestamp: msg.timestamp 
                };
            });
            recentHistoryText = polyglotHelpers.formatTranscriptForLLM(transcriptTurns, connector.profileName, "User");
        }
    }
    systemPromptParts.push(getContextSettingPrompt(connector, lastMessage, recentHistoryText));

    // --- 4. Add VOICE-CALL-SPECIFIC Rules ---
    const voiceStyle = connector.communicationStyle || "natural and conversational";
    systemPromptParts.push(`
--- SPOKEN STYLE (FOR THIS VOICE CALL) ---
Your SPOKEN communication style is: "${voiceStyle}". This is how you talk out loud.
FOR THIS VOICE CALL: IGNORE all texting rules. NO emojis, NO shortcuts like 'lol' or 'bcp', NO parenthetical descriptions like (chuckles). Convey emotion through your word choice and tone.
    `);

const primaryLanguage = connector.language || 'English'; // Get the connector's primary language
systemPromptParts.push(`
--- PRIMARY LANGUAGE MANDATE (CRITICAL FOR THIS CALL) ---
- Your primary language for THIS ENTIRE VOICE CALL is **${primaryLanguage.toUpperCase()}**.
- You MUST respond in ${primaryLanguage} unless the user explicitly asks you to switch to another language you know.
- If you accidentally speak English (or any other language), you should catch yourself and apologize, then immediately switch back to ${primaryLanguage}.
- This rule is NON-NEGOTIABLE.
`);
    // --- 5. Inject Recent Conversation History (CRITICAL FOR CONTINUITY) ---
       // --- 5. Inject Recent Conversation History (CRITICAL FOR CONTINUITY) ---
   
   // --- NEW: Get conversation length for context-specific rules ---
   let conversationLength = 0;
   if (conversationManager) {
       const convoRecord = await conversationManager.getConversationById(connector.id);
       conversationLength = convoRecord?.messages?.length || 0;
   }
   
   // --- NEW: Add the CRITICAL First Interaction Rule if applicable ---
   systemPromptParts.push(getFirstInteractionRulePrompt(connector, conversationLength));
   
   
       if (conversationManager && polyglotHelpers) {
        const convoRecord = await conversationManager.getConversationById(connector.id);
        const allMessages = convoRecord?.messages || [];

        if (allMessages.length > 0) {
            // --- NEW: Dynamic History Logic ---
            const MAX_HISTORY_CHAR_LENGTH = 1500; // Set a safe character limit for the history context.
            let characterCount = 0;
            const relevantMessages: MessageInStore[] = [];

            // Iterate backwards from the most recent message
            for (let i = allMessages.length - 1; i >= 0; i--) {
                const message = allMessages[i];
                const messageLength = message.text?.length || 0;

                if (characterCount + messageLength > MAX_HISTORY_CHAR_LENGTH && relevantMessages.length > 0) {
                    // Stop if adding the next message would exceed the budget,
                    // but only if we've already added at least one message.
                    break;
                }
                
                relevantMessages.unshift(message); // Add to the beginning to maintain chronological order
                characterCount += messageLength;
            }
            // --- END: Dynamic History Logic ---

            if (relevantMessages.length > 0) {
                const transcriptTurns: TranscriptTurn[] = relevantMessages.map(msg => ({
                    sender: msg.sender,
                    text: msg.text,
                    timestamp: msg.timestamp,
                    type: msg.type as TranscriptTurn['type'],
                }));

                const transcriptText = polyglotHelpers.formatTranscriptForLLM(
                    transcriptTurns,
                    connector.profileName,
                    "User"
                );

                if (transcriptText) {
                    systemPromptParts.push(`
# SECTION 7: RECENT TEXT CHAT CONTEXT (YOUR SHORT-TERM MEMORY)

You just finished a text chat with this same user. Below is a summary of your most recent messages. You **MUST** use this context to inform your greeting and conversation. **DO NOT** act like you are meeting them for the first time. Refer back to topics you just discussed.

--- BEGIN RECENT CHAT HISTORY ---
${transcriptText}
--- END RECENT CHAT HISTORY ---
`);
                }
            }
        }
    }
    // --- 6. Finalize and Build ---
    const fullSystemPrompt = systemPromptParts.filter(p => p && p.trim()).join('\n\n');
    
    console.log(`LCH_PROMPT_BUILDER (${functionName}): Built VOICE prompt for '${connector.id}' with chat history context.`);
    return { parts: [{ text: fullSystemPrompt }] };
}

console.log("live_call_prompt_builder.ts: Module loaded, 'buildLiveApiSystemInstructionForConnector' is exported.");