// /src/js/services/ai_translation_service.ts

import type {
    ConversationManager,
    AIService,
    AiTranslationServiceModule,
    GroupDataManager,
    MessageInStore,         // For 1-on-1 message type
    GroupChatHistoryItem,   // For group message type
    Connector               // For partnerConnectorForPrompt
} from '../types/global.d.ts';
import { auth } from '../firebase-config'; // For checking current user

console.log('ai_translation_service.ts: Script loaded.');

const aiTranslationService: AiTranslationServiceModule = (() => {
    'use strict';

    let conversationManager: ConversationManager | null = null;
    let aiService: AIService | null = null;
    let groupDataManager: GroupDataManager | null = null; // Added

    function initialize(deps: {
        conversationManager: ConversationManager,
        aiService: AIService,
        groupDataManager: GroupDataManager // Added
    }) {
        console.log("AiTranslationService: Initializing with dependencies (aiService, conversationManager, groupDataManager).");
        conversationManager = deps.conversationManager;
        aiService = deps.aiService;
        groupDataManager = deps.groupDataManager; // Store it
    }

    async function generateTranslation(
        messageAppId: string, // This is your application's UUID for the message
        contextId: string     // This is EITHER a 1-on-1 Conversation ID OR a Group ID
    ): Promise<string | null> {

        console.groupCollapsed(`%c[TRANSLATOR] Starting translation process...`, 'font-weight: bold; color: #9c27b0;');
        console.log(`[TRANSLATOR_INPUT] Service called for messageAppId: ${messageAppId}, contextId: ${contextId}`);

        if (!aiService) { // Removed conversationManager & groupDataManager check here, will check specific one later
            console.error("[TRANSLATOR_FAIL] CRITICAL: AiTranslationService not initialized or aiService is missing.");
            console.groupEnd();
            return "Error: Translation service not ready.";
        }

        let textToTranslate: string | null = null;
        let originalMessageSpeakerId: string | null = null;
        let conversationContextForPrompt: string = "No prior context available.";
        let partnerConnectorForPrompt: Connector | null = null;
        let isGroupChatContext = false;

        // Determine if it's a group or 1-on-1 context and fetch message
        // A common way to distinguish group IDs from 1-on-1 conversation IDs is by format.
        // For example, 1-on-1 IDs often contain an underscore. Adjust this check if your ID formats differ.
        // A more robust way would be if reaction_handler could pass a contextType ('group' | 'dm')
        if (groupDataManager && groupDataManager.getGroupDefinitionById(contextId)) {
             isGroupChatContext = true;
        } else if (conversationManager && conversationManager.getConversationById(contextId)) {
             isGroupChatContext = false;
        } else {
            // Could be that the contextId is for a group but groupDataManager isn't ready yet,
            // or it's a 1-on-1 but conversationManager isn't ready, or the ID is just invalid.
            // Let's try to infer based on GDM's current group IF contextId matches.
            if (groupDataManager && groupDataManager.getCurrentGroupId() === contextId) {
                isGroupChatContext = true;
            } else {
                 console.warn(`[TRANSLATOR_CONTEXT] Could not definitively determine context for ID: ${contextId}. Assuming 1-on-1 if no group match.`);
                 // Default to false, subsequent checks will fail if conversationManager is also null or cant find it
            }
        }


        if (isGroupChatContext) {
            console.log(`[TRANSLATOR_CONTEXT] Group context detected. Group ID: ${contextId}`);
            if (!groupDataManager) {
                console.error("[TRANSLATOR_FAIL] GroupDataManager not available for group chat translation.");
                console.groupEnd(); return "(Error: Group data service missing)";
            }

            const currentGroupId = groupDataManager.getCurrentGroupId();
            if (currentGroupId !== contextId) {
                console.warn(`[TRANSLATOR_CONTEXT] Mismatch: contextId for translation is ${contextId}, but GDM's current group is ${currentGroupId}. Attempting to use history for ${contextId} if possible, but this might be an issue if GDM context isn't set for the target group.`);
                // This scenario is tricky. For now, we'll proceed assuming getLoadedChatHistory might work if GDM had context previously.
                // A better solution might involve reaction_handler passing the full group object or ensuring GDM context is set.
            }

            // Try to get history for the *specific* group ID (contextId)
            // This requires a way to load history for a specific group ID if it's not the *current* one.
            // For now, let's assume getLoadedChatHistory reflects the active group, which should be the one with the message.
            const groupHistory = groupDataManager.getLoadedChatHistory(); // This gets history for GDM's currentGroupIdInternal
            
            const messageIndex = groupHistory.findIndex(m => m.messageId === messageAppId || m.firestoreDocId === messageAppId);

            if (messageIndex === -1) {
                console.error(`[TRANSLATOR_FAIL] Group: Could not find message with App/FS ID '${messageAppId}' in GDM's loaded history for group '${groupDataManager.getCurrentGroupId()}'.`);
                console.log('[TRANSLATOR_PREP] Available group message app/firestore IDs in current GDM history:', groupHistory.map(m => ({ app: m.messageId, fs: m.firestoreDocId })));
                console.groupEnd(); return `(Error: Group message not found)`;
            }
            const messageData = groupHistory[messageIndex];
            textToTranslate = messageData?.text || '';
            originalMessageSpeakerId = messageData?.speakerId || null;
            console.log('[TRANSLATOR_PREP] Group: Successfully found message object:', messageData);

            const contextWindow = groupHistory.slice(Math.max(0, messageIndex - 3), Math.min(groupHistory.length, messageIndex + 4));
            conversationContextForPrompt = contextWindow.map(msg => {
                const speakerName = msg.speakerName || (msg.speakerId === auth.currentUser?.uid ? "You" : "Member");
                const prefix = (msg.messageId === messageAppId || msg.firestoreDocId === messageAppId) ? '[TARGET] ' : '';
                return `${prefix}${speakerName}: ${msg.text || ''}`;
            }).join('\n');

            const currentGroupDef = groupDataManager.getGroupDefinitionById(contextId); // Use the actual group ID for the definition
            if (currentGroupDef && window.polyglotConnectors) {
                partnerConnectorForPrompt = window.polyglotConnectors.find(c => c.id === currentGroupDef.tutorId) || null;
            }
        } else { // 1-on-1 Chat Logic
            console.log(`[TRANSLATOR_CONTEXT] 1-on-1 context assumed. Conversation ID: ${contextId}`);
            if (!conversationManager) {
                console.error("[TRANSLATOR_FAIL] ConversationManager not available for 1-on-1 chat translation.");
                console.groupEnd(); return "(Error: Conversation service missing)";
            }
            const conversation = conversationManager.getConversationById(contextId);

            if (!conversation?.messages || !conversation.connector) {
                console.error(`[TRANSLATOR_FAIL] 1-on-1: Conversation, messages, or connector missing for ID: ${contextId}`);
                console.groupEnd(); return "(Error: Cannot find conversation data)";
            }
            partnerConnectorForPrompt = conversation.connector;

            // messageAppId is the app's UUID for 1-on-1 messages
            const messageIndex = conversation.messages.findIndex(m => m.messageId === messageAppId);

            if (messageIndex === -1) {
                console.error(`[TRANSLATOR_FAIL] 1-on-1: Could not find message with App UUID '${messageAppId}' in conversation history for ${contextId}.`);
                console.log('[TRANSLATOR_PREP] Available 1-on-1 message app UUIDs:', conversation.messages.map(m => m.messageId));
                console.groupEnd(); return `(Error: 1-on-1 message not found)`;
            }
            const messageData = conversation.messages[messageIndex];
            textToTranslate = messageData?.text || '';
            originalMessageSpeakerId = messageData?.sender || null;
            console.log('[TRANSLATOR_PREP] 1-on-1: Successfully found message object:', messageData);

            const contextWindow = conversation.messages.slice(Math.max(0, messageIndex - 5), Math.min(conversation.messages.length, messageIndex + 6));
            conversationContextForPrompt = contextWindow.map(msg => {
                const speaker = msg.sender === auth.currentUser?.uid ? 'You' : (conversation.connector?.profileName || 'Partner');
                const prefix = msg.messageId === messageAppId ? '[TARGET] ' : '';
                return `${prefix}${speaker}: ${msg.text || ''}`;
            }).join('\n');
        }

        if (textToTranslate === null || textToTranslate === undefined) { // Check for null explicitly now
            console.error(`[TRANSLATOR_FAIL] Could not extract text to translate for messageAppId: ${messageAppId}`);
            console.groupEnd(); return `(Error: Message text missing)`;
        }
        if (textToTranslate.trim() === "") {
            console.warn(`[TRANSLATOR_WARN] Message text is empty. Nothing to translate. Original Speaker: ${originalMessageSpeakerId}`);
            console.groupEnd(); return "(Message has no text)";
        }

        console.log(`[TRANSLATOR_PREP] Text to translate: "${textToTranslate}" (Original Speaker ID: ${originalMessageSpeakerId})`);
        console.log(`[TRANSLATOR_PREP] Context for prompt:\n${conversationContextForPrompt}`);

        const userLanguage = navigator.language || 'en-US';
        const prompt = `You are an expert translator. A user wants to translate a single message from a conversation.
Use the surrounding CONVERSATION CONTEXT to ensure the translation is accurate (especially for pronouns, slang, and context-specific phrases).
Your task is to translate ONLY the single line marked with '[TARGET]'.
Your entire response MUST be ONLY the translated text for that single line. Do not include the speaker's name or the '[TARGET]' marker in your response.

---
CONVERSATION CONTEXT:
${conversationContextForPrompt}
---

Translate the [TARGET] message (originally spoken by ${originalMessageSpeakerId === auth.currentUser?.uid ? 'the User (You)' : (partnerConnectorForPrompt?.profileName || 'the other participant')}) into the language: ${userLanguage}`;

        const translationProviderSequence = ['together', 'gemini']; // Simplified for now, adjust as needed
        console.log('%c[TRANSLATOR] Provider Plan:', 'color: #9c27b0; font-weight: bold;', translationProviderSequence.join(' ➔ '));

        let finalResult: string | null = null;

        for (const provider of translationProviderSequence) {
            try {
                console.log(`[TRANSLATOR_ATTEMPT] Trying provider [${provider}] with prompt:\n${prompt.substring(0, 300)}...`);

                // Define arguments clearly
                const argPrompt: string = prompt;
                const argConnector: Connector | null = partnerConnectorForPrompt;
                const argHistory: null = null; // Explicitly null as context is in prompt for translation
                const argPreferredProvider: string | undefined = provider;
                const argExpectJson: boolean = false;
                const argContext: 'group-chat' | 'one-on-one' = isGroupChatContext ? 'group-chat' : 'one-on-one';
                const argAbortSignal: AbortSignal | undefined = undefined;
                const argOptions: { isTranslation?: boolean } = { isTranslation: true };

                const result = await aiService.generateTextMessage(
                    argPrompt,
                    argConnector,
                    argHistory,
                    argPreferredProvider,
                    argExpectJson,
                    argContext,
                    argAbortSignal,
                    argOptions // 8th argument
                );

                if (typeof result === 'string' && result.trim()) {
                    finalResult = result.trim();
                    console.log(`[TRANSLATOR_SUCCESS] Provider [${provider}] succeeded. Translation: "${finalResult}"`);
                    break;
                } else {
                    console.warn(`[TRANSLATOR_WARN] Provider [${provider}] returned empty or non-string/non-object result:`, result);
                }
            } catch (error: any) {
                console.warn(`[TRANSLATOR_FAIL] Provider [${provider}] failed. Trying next...`, error.message, error);
            }
        }

        if (!finalResult) {
            console.error("[TRANSLATOR_FAIL] All translation providers in the sequence failed.");
            finalResult = `(Translation Error)`;
        }

        console.groupEnd();
        return finalResult;
    }

    return { initialize, generateTranslation };
})();

window.aiTranslationService = aiTranslationService;
document.dispatchEvent(new CustomEvent('aiTranslationServiceReady'));
console.log('ai_translation_service.ts: "aiTranslationServiceReady" event dispatched.');