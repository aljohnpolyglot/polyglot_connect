// /src/js/services/ai_translation_service.ts

// --- VVVVVV FINAL VERSION (WITH SAFETY CHECK) VVVVVV ---

import type { ConversationManager, AIService, AiTranslationServiceModule } from '../types/global.js';

console.log('ai_translation_service.ts: Script loaded.');

const aiTranslationService: AiTranslationServiceModule = (() => {
    'use strict';

    let conversationManager: ConversationManager | null = null;
    let aiService: AIService | null = null;

    function initialize(deps: { 
        conversationManager: ConversationManager,
        aiService: AIService 
    }) {
        console.log("AiTranslationService: Initializing with simplified dependencies (aiService).");
        conversationManager = deps.conversationManager;
        aiService = deps.aiService;
    }

   // in ai_translation_service.ts

// =================== REPLACE THIS ENTIRE FUNCTION ===================
async function generateTranslation(messageId: string, connectorId: string): Promise<string | null> {
    
    console.groupCollapsed(`%c[TRANSLATOR] Starting translation process...`, 'font-weight: bold; color: #9c27b0;');
    console.log(`[STEP 2 - DETAIL] Service called for messageId: ${messageId}, connectorId: ${connectorId}`);

    if (!conversationManager || !aiService) {
        console.error("[TRANSLATOR_FAIL] CRITICAL: Service not initialized. Missing conversationManager or aiService.");
        console.groupEnd();
        return "Error: Service not ready.";
    }

    const conversation = conversationManager.getConversationById(connectorId);
    console.log('[TRANSLATOR_PREP] Found conversation object:', conversation);

    if (!conversation?.connector) {
        console.error(`[TRANSLATOR_FAIL] Connector data missing for conversation ID: ${connectorId}`);
        console.groupEnd();
        return "(Error: Cannot find partner data)";
    }

    // --- THIS IS THE MOST LIKELY POINT OF FAILURE ---
    const messageToTranslate = conversation.messages.find(m => m.id === messageId);

    if (!messageToTranslate) {
        console.error(`[TRANSLATOR_FAIL] Could not find message with ID '${messageId}' in the conversation history.`);
        console.log('[TRANSLATOR_PREP] Available message IDs are:', conversation.messages.map(m => m.id));
        console.groupEnd();
        return `(Error: Message not found)`;
    }
    console.log('[TRANSLATOR_PREP] Successfully found message object:', messageToTranslate);
    
    // Replace it with this line
const textToTranslate = messageToTranslate.text || '';
    if (!textToTranslate) {
        console.error(`[TRANSLATOR_FAIL] Found the message, but it has no text to translate. It might be an image-only message.`);
        console.groupEnd();
        return "(Message has no text)";
    }
    console.log(`[TRANSLATOR_PREP] Text to translate: "${textToTranslate}"`);
// =================== PASTE THIS NEW BLOCK IN ITS PLACE ===================

    // VVVVVV THIS IS THE NEW LOGIC VVVVVV
    
    // 1. Find the index of our target message
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);

    // 2. Create the "slice" of 5 messages up and 5 down.
    // Math.max and Math.min prevent errors if we're near the start or end of the chat.
    const contextWindow = conversation.messages.slice(
        Math.max(0, messageIndex - 5), 
        Math.min(conversation.messages.length, messageIndex + 6) // +6 to include the target and 5 after
    );

    // 3. Format this slice into a readable context for the AI
    const contextString = contextWindow.map(msg => {
        // Use the connector's name for clarity, or a default.
        const speaker = msg.sender === 'user' ? 'User' : (conversation.connector?.profileName || 'Partner');
        // Mark the specific message we need translated.
        const prefix = msg.id === messageId ? '[TARGET] ' : '';
        return `${prefix}${speaker}: ${msg.text}`;
    }).join('\n');

    // 4. Build the new, smarter prompt
    const userLanguage = navigator.language || 'en-US';
    const prompt = `You are an expert translator. A user wants to translate a single message from a conversation.
Use the surrounding CONVERSATION CONTEXT to ensure the translation is accurate (especially for pronouns, slang, and context-specific phrases).
Your task is to translate ONLY the single line marked with '[TARGET]'.
Your entire response MUST be ONLY the translated text for that single line. Do not include the speaker's name or the '[TARGET]' marker in your response.

---
CONVERSATION CONTEXT:
${contextString}
---

Translate the [TARGET] message into the language: ${userLanguage}`;

// ^^^^^^ END OF NEW LOGIC ^^^^^^
// ========================================================================
   // in ai_translation_service.ts, inside generateTranslation

    // =================== PASTE THIS NEW BLOCK IN ITS PLACE ===================

   // THIS IS THE NEW, FULL-POWER BLOCK TO PASTE IN ITS PLACE

   const translationProviderSequence = ['together', 'together', 'together', 'gemini', 'gemini', 'gemini'];
   console.log('%c[TRANSLATOR] Provider Plan:', 'color: #9c27b0; font-weight: bold;', translationProviderSequence.join(' ➔ '));
   
   let finalResult: string | null = null;

   for (const provider of translationProviderSequence) {
       try {
           // This is the important call to our main AI Service "brain"
           const result = await aiService.generateTextMessage(
               prompt,
               conversation.connector,
               null, 
               provider
           );

           if (typeof result === 'string' && result.trim()) {
               // The first successful provider wins, and we exit the loop immediately.
               finalResult = result.trim();
               break; 
           }
           // If we get here, the result was not a usable string.
           // The loop will naturally continue to the next provider.
       } catch (error: any) {
           // This catches major failures from the AI service itself.
           console.warn(`[TRANSLATOR] Provider [${provider}] failed with an error. Trying next...`, error.message);
       }
   }

   // After the loop, check if we ever got a successful result.
   if (!finalResult) {
       console.error("[TRANSLATOR] All translation providers in the sequence failed.");
       finalResult = `(Translation Error)`;
   }
   
   // Close the console group and return whatever we ended up with.
   console.groupEnd();
   return finalResult;
    // ========================================================================
} // <--- This brace ENDS the generateTranslation function

// ======================================================================
    return { initialize, generateTranslation }; // This is now correctly outside
})();

window.aiTranslationService = aiTranslationService;
document.dispatchEvent(new CustomEvent('aiTranslationServiceReady'));
console.log('ai_translation_service.ts: "aiTranslationServiceReady" event dispatched.');

// --- ^^^^^^ END OF FINAL VERSION ^^^^^^ ---