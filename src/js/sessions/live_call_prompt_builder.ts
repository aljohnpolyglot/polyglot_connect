// src/js/sessions/live_call_prompt_builder.ts
import type {
    Connector,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ConversationManager,
    LanguageEntry,
    GeminiChatItem // For type safety on convo.geminiHistory
} from '../types/global.d.ts';

// Interface for the object returned by the main function
export interface LiveApiSystemInstruction {
    parts: [{ text: string }];
}

// Helper function to get dependencies
const getPromptBuilderDeps = (): {
    conversationManager?: ConversationManager;
    polyglotHelpers?: PolyglotHelpers;
    // In the future, if this file *directly* needed identity/memory for its fallback:
    // identityService?: any; // Replace with actual IdentityService type
    // memoryService?: any;   // Replace with actual MemoryService type
} => ({
    conversationManager: window.conversationManager,
    polyglotHelpers: window.polyglotHelpers
    // identityService: window.identityService, // For future direct use
    // memoryService: window.memoryService     // For future direct use
});

export async function buildLiveApiSystemInstructionForConnector(connector: Connector | null): Promise<LiveApiSystemInstruction> {
    const functionName = "buildLiveApiSystemInstructionForConnector (TS)";
    const { conversationManager, polyglotHelpers } = getPromptBuilderDeps();

    if (!polyglotHelpers) {
        console.error(`LCH_PROMPT_BUILDER (${functionName}): polyglotHelpers MISSING! Cannot build safe prompt.`);
        return Promise.resolve({ parts: [{ text: "You are a helpful assistant. Please be concise and act human." }] });
    }

    if (!connector || !connector.id) { // Added check for connector.id for safety
        console.warn(`LCH_PROMPT_BUILDER (${functionName}): Connector or connector.id undefined. RETURNING GENERIC PROMPT.`);
        return Promise.resolve({ parts: [{ text: "You are a helpful assistant. Please be concise, conversational, and act human." }] });
    }

    // --- Attempt 1 (Preferred): Get from geminiHistory (built by convo_prompt_builder.ts) ---
    // This history ALREADY INCLUDES identity, memory (in the future), and detailed behavioral rules.
    if (conversationManager?.ensureConversationRecord) {
        try {
            const record = await conversationManager.ensureConversationRecord(connector.id, connector);
            const convo = record.conversation;
            const geminiHistory = convo?.geminiHistory as GeminiChatItem[] | undefined; // Ensure type
            const systemPromptTurn = geminiHistory?.[0]; // The first turn is usually the 'user' role system prompt

            if (systemPromptTurn?.role === 'user' && systemPromptTurn.parts?.[0]) {
                const firstPart = systemPromptTurn.parts[0];
                if ('text' in firstPart && typeof firstPart.text === 'string' && firstPart.text.trim()) {
                    const richPromptText = firstPart.text;
                    console.log(`LCH_PROMPT_BUILDER (${functionName}): Returning RICH system instruction from geminiHistory for ${connector.id}.`);
                    return Promise.resolve({ parts: [{ text: richPromptText }] });
                }
            }
        } catch (e: any) {
            console.error(`LCH_PROMPT_BUILDER (${functionName}): Error accessing geminiHistory for ${connector.id}:`, e);
        }
    } else {
        console.warn(`LCH_PROMPT_BUILDER (${functionName}): conversationManager or ensureConversationRecord missing. Using fallback prompt for ${connector.id}.`);
    }
    
    // --- Attempt 2 (Fallback): Manually build a simpler prompt ---
    // This fallback should still be as robust as possible with current connector data.
    // In the future, this fallback could also try to call identity_service if convoManager fails.
    console.warn(`LCH_PROMPT_BUILDER (${functionName}): Using FALLBACK system instruction (manual build) for connector: ${connector.id}`);
    
    const personaName = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || 'Your Conversational Partner');
    const modernTitle = polyglotHelpers.sanitizeTextForDisplay(connector.modernTitle || 'person');
    const city = polyglotHelpers.sanitizeTextForDisplay(connector.city || 'their city');
    const country = polyglotHelpers.sanitizeTextForDisplay(connector.country || 'their country');
    const primaryLanguage = polyglotHelpers.sanitizeTextForDisplay(connector.language || 'English');

    let personaDets = `You are ${personaName}, a human ${modernTitle} from ${city}, ${country}.`;
    if (connector.age && connector.age !== "N/A") personaDets += ` You are ${connector.age} years old.`;
    if (connector.bioModern) personaDets += ` A key aspect of you is: "${polyglotHelpers.sanitizeTextForDisplay(connector.bioModern.substring(0,100))}..."`;


    // --- Refined Language Instructions for Fallback ---
    let languageInstructions = `
CRITICAL LANGUAGE AND BEHAVIOR RULES FOR THIS VOICE CALL (as ${personaName} speaking ${primaryLanguage}):
1.  **DEFAULT LANGUAGE:** Your default language for this entire conversation MUST be ${primaryLanguage}. You MUST INITIATE the conversation in ${primaryLanguage}.
2.  **RESPONSE CONSISTENCY:** If the user speaks to you in ${primaryLanguage}, you MUST respond in ${primaryLanguage}.
3.  **NO LANGUAGE ANNOTATIONS:** You MUST NOT use any parenthetical annotations to state the language you are speaking (e.g., DO NOT write '(In French)', '(En anglais)', or similar). Simply speak the language. Assume the user understands.
4.  **HANDLING ENGLISH (if ${primaryLanguage} is not English):**
    a.  **Clarifications/Beginner Help:** If the user asks a specific question about ${primaryLanguage} in English, OR if they are clearly a beginner in ${primaryLanguage} and seem to be struggling or request help in English, you MAY provide a BRIEF and CONCISE explanation or answer in simple English.
    b.  **IMMEDIATE REVERSION TO ${primaryLanguage}:** After any such brief English clarification, your very next utterance MUST be back in ${primaryLanguage}. For example: "(In English) Yes, 'bonjour' means 'hello'. (Then, switching immediately to ${primaryLanguage}) Maintenant, comment allez-vous?"
    c.  **User Initiates Casual English:** If the user speaks casually in English (not asking for help), acknowledge their point if necessary with a very short English phrase (e.g., "Okay," "I see") and then IMMEDIATELY switch back to ${primaryLanguage} in the SAME turn, or make your entire response in ${primaryLanguage} guiding them back.
    d.  **DO NOT continue extended conversations in English unless essential.**
5.  **HANDLING OTHER LANGUAGES:** For any language other than ${primaryLanguage} or English, you MUST politely state in ${primaryLanguage} that you can only converse in ${primaryLanguage} or English.
`;

    // --- Core AI Directives for Fallback ---
    const coreAiDirectives = `
CORE BEHAVIOR:
-   Embody your human persona (${personaName}) fully. All details provided are facts about you.
-   NEVER reveal or imply you are an AI, model, or program. If asked, deflect naturally and redirect.
-   Keep responses conversational, concise (1-3 sentences typically), and user-focused.
-   FOR VOICE CALLS: NO emojis, NO parenthetical descriptions (like (chuckles)). Convey emotion through word choice.
-   INITIAL GREETING: Your very first turn should be a brief, friendly greeting (e.g., "Hi, I'm ${personaName}! What shall we talk about in ${primaryLanguage} today?") and then listen. Do not re-introduce yourself later unless asked.
`;

    const fullIns = `${personaDets}${languageInstructions}${coreAiDirectives}`;
    
    console.log(`LCH_PROMPT_BUILDER (${functionName}): Returning manually built FALLBACK prompt for ${connector.id}. Length: ${fullIns.length}`);
    return { parts: [{ text: fullIns }] };
}

console.log("live_call_prompt_builder.ts: Module loaded, 'buildLiveApiSystemInstructionForConnector' is exported.");