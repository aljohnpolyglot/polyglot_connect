import type {
    UiUpdater,
    AIService,
    ConversationManager,
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ChatOrchestrator,
    AIApiConstants,
    Connector,
    ChatMessageOptions,
    ConversationRecordInStore,
    MessageInStore,
    GeminiChatItem // <<< --- ADD THIS LINE IF MISSING ---
} from '../types/global.d.ts';
console.log('text_message_handler.ts: Script loaded, waiting for core dependencies.');

export interface TextMessageHandlerModule {
    sendEmbeddedTextMessage: (
        textFromInput: string,
        currentEmbeddedChatTargetId: string | null,
        options?: {
            skipUiAppend?: boolean;
            isVoiceMemo?: boolean;
            audioBlobDataUrl?: string | null;
            messageId?: string;
            timestamp?: number;
            imageFile?: File | null;
            captionText?: string | null;
        }
    ) => Promise<void>;
    handleEmbeddedImageUpload: (event: Event, currentEmbeddedChatTargetId: string | null) => Promise<void>;
    sendModalTextMessage: (
        textFromInput: string,
        currentModalMessageTargetConnector: Connector | null,
        options?: {
            skipUiAppend?: boolean;
            isVoiceMemo?: boolean;
            audioBlobDataUrl?: string | null;
            messageId?: string;
            timestamp?: number;
            imageFile?: File | null;
            captionText?: string | null;
        }
    ) => Promise<void>;
    handleModalImageUpload: (event: Event, currentModalMessageTargetConnector: Connector | null) => Promise<void>;
}

window.textMessageHandler = {
    sendEmbeddedTextMessage: async () => { console.warn("TMH structural: sendEmbeddedTextMessage called before full init."); },
    handleEmbeddedImageUpload: async () => { console.warn("TMH structural: handleEmbeddedImageUpload called before full init."); },
    sendModalTextMessage: async () => { console.warn("TMH structural: sendModalTextMessage called before full init."); },
    handleModalImageUpload: async () => { console.warn("TMH structural: handleModalImageUpload called before full init."); }
} as TextMessageHandlerModule;
console.log('text_message_handler.ts: Placeholder window.textMessageHandler assigned.');
document.dispatchEvent(new CustomEvent('textMessageHandlerStructuralReady'));
console.log('text_message_handler.ts: "textMessageHandlerStructuralReady" (Placeholder) event dispatched.');
interface TextMessageHandlerDeps {
    uiUpdater: UiUpdater;
    aiService: AIService;
    conversationManager: ConversationManager;
    domElements: YourDomElements;
    polyglotHelpers: PolyglotHelpers;
    chatOrchestrator?: ChatOrchestrator;
    aiApiConstants: AIApiConstants;
}

function initializeActualTextMessageHandler(): void {
    console.log('text_message_handler.ts: initializeActualTextMessageHandler() for FULL method population called.');

    const getSafeDeps = (functionName: string = "TextMessageHandler internal"): TextMessageHandlerDeps | null => {
        const deps = {
            uiUpdater: window.uiUpdater,
            aiService: window.aiService,
            conversationManager: window.conversationManager,
            domElements: window.domElements,
            polyglotHelpers: window.polyglotHelpers,
            chatOrchestrator: window.chatOrchestrator,
            aiApiConstants: window.aiApiConstants
        };
        const criticalKeys: (keyof Omit<TextMessageHandlerDeps, 'chatOrchestrator'>)[] = ['uiUpdater', 'aiService', 'conversationManager', 'domElements', 'polyglotHelpers', 'aiApiConstants'];
        for (const key of criticalKeys) {
            if (!deps[key]) {
                console.error(`TMH (${functionName}): CRITICAL MISSING window.${key}.`);
                return null;
            }
        }
        if (!deps.chatOrchestrator) {
            console.warn(`TMH (${functionName}): chatOrchestrator not yet available. Methods may need to fetch it dynamically.`);
        }
        return deps as TextMessageHandlerDeps; // This correctly returns deps even if chatOrchestrator is missing (as it's optional)
    };

    const resolvedFunctionalDeps = getSafeDeps("Full TMH Initialization");

    if (!resolvedFunctionalDeps) {
        console.error("text_message_handler.ts: CRITICAL - Functional dependencies not ready for full TMH setup. Methods will remain placeholders.");
        if (!(window.textMessageHandler as any).__functionalReady) {
             document.dispatchEvent(new CustomEvent('textMessageHandlerReady'));
             console.warn('text_message_handler.ts: "textMessageHandlerReady" (DUMMY) event dispatched due to missing deps.');
        }
        return;
    }
    console.log('text_message_handler.ts: Functional dependencies for full method population appear ready.');

    const methods = ((): TextMessageHandlerModule => {
        'use strict';
        console.log("text_message_handler.ts: IIFE for actual methods STARTING.");

        const {
            uiUpdater,
            aiService,
            polyglotHelpers,
            conversationManager,
            aiApiConstants,
            domElements
        } = resolvedFunctionalDeps;



// VVVVV ADD THIS HELPER FUNCTION VVVVV
function getHistoryForAiCall(
    fullConversationHistory: GeminiChatItem[] | undefined | null,
    isImageReplyContext: boolean 
): GeminiChatItem[] {
    if (isImageReplyContext) {
        // For image-specific replies (2-part comment + description),
        // send empty history to force focus on the current image and prompt.
        console.log("TMH_HISTORY_BUILDER: IMAGE_REPLY_CONTEXT - Providing EMPTY history.");
        return []; 
    } else {
        // For regular text-to-text conversational replies,
        // send the actual conversation history (which includes the system prompt).
        const historyToReturn = Array.isArray(fullConversationHistory) ? [...fullConversationHistory] : [];
        console.log(`TMH_HISTORY_BUILDER: TEXT_REPLY_CONTEXT - Providing ${historyToReturn.length} turns of history.`);
        return historyToReturn;
    }
}
// ^^^^^^ HELPER FUNCTION DEFINITION ENDS HERE ^^^^^^
// ^^^^^ ADD THIS HELPER FUNCTION ^^^^^

const getChatOrchestrator = (): ChatOrchestrator | undefined => window.chatOrchestrator;

        async function sendEmbeddedTextMessage(
            textFromInput: string,
            currentEmbeddedChatTargetId: string | null,
            options: {
                skipUiAppend?: boolean;
                isVoiceMemo?: boolean;
                audioBlobDataUrl?: string | null;
                messageId?: string;
                timestamp?: number;
                imageFile?: File | null;
                captionText?: string | null;
            } = {}
        ): Promise<void> {
            const { imageFile, captionText, isVoiceMemo, audioBlobDataUrl: optionsAudioBlobUrl, skipUiAppend, messageId: optionsMessageId, timestamp: optionsTimestamp } = options;
            const functionName = "sendEmbeddedTextMessage";
            const text = textFromInput?.trim() || "";

            const userMessageTimestamp = optionsTimestamp || Date.now();
            const userMessageId = optionsMessageId || polyglotHelpers.generateUUID();

            if (!currentEmbeddedChatTargetId) {
                console.warn(`TMH.${functionName}: Missing targetId.`);
                if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                return;
            }

            if (!isVoiceMemo && !imageFile && !text) {
                console.warn(`TMH.${functionName}: Empty message (not voice memo, no image).`);
                if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                return;
            }

            const record = await conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
            const convo = record.conversation as ConversationRecordInStore | null;

            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or missing connector for ID: ${currentEmbeddedChatTargetId}`);
                if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                return;
            }
            const currentConnector: Connector = convo.connector;

            let imageUrlForDisplay: string | undefined = undefined;
            let imagePartsForGemini: Array<{ inlineData: { mimeType: string; data: string; } }> | undefined = undefined;
            let imageSemanticDescriptionForStore: string | undefined = undefined;

            if (imageFile) {
                console.log(`TMH.${functionName}: Processing image "${imageFile.name}" with caption "${captionText || text}"`);
                let base64StringForStore: string; // Declare here

                try {
                    base64StringForStore = await polyglotHelpers.fileToBase64(imageFile); // Assign here
                    const base64DataForApi = base64StringForStore.split(',')[1];
                    imagePartsForGemini = [{ inlineData: { mimeType: imageFile.type, data: base64DataForApi } }];
                    console.log(`TMH.${functionName}: Image converted to base64 for AI. MimeType: ${imageFile.type}`);
                    
                    // imageUrlForDisplay will now be the base64 string for storage purposes.
                    // If skipUiAppend is true (which it is for images from chat_event_listeners),
                    // TMH doesn't need its own temporary blob for UI.
                    imageUrlForDisplay = base64StringForStore; 
                    const descriptionPromptText = captionText || text || "Describe this image concisely.";
                    if (aiService.generateTextFromImageAndText && convo.connector) {
                        const desc = await aiService.generateTextFromImageAndText(
                            base64DataForApi,
                            imageFile.type,
                            convo.connector,
                            [],
                            `Describe this image concisely in one sentence for context within a chat message, in ${convo.connector.language || 'English'}. Based on the image and the user's text: "${descriptionPromptText}"`,
                            aiApiConstants.PROVIDERS.TOGETHER
                        );
                        if (desc && typeof desc === 'string' && !desc.startsWith("[")) {
                            imageSemanticDescriptionForStore = desc.trim();
                            console.log(`TMH.${functionName}: AI generated image description: "${imageSemanticDescriptionForStore}"`);
                        } else if (desc && typeof desc === 'string' && desc.startsWith("[")){
                            console.warn(`TMH.${functionName}: AI description was a placeholder/error: "${desc}"`);
                        }
                    }
                    console.log(`TMH.${functionName}: Adding 2s delay before main image reply AI call (modal)...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.error(`TMH.${functionName}: Error processing image:`, error);
                    if (!skipUiAppend) {
                         uiUpdater.appendToEmbeddedChatLog?.("Error processing image.", 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                    }
                    if (imageUrlForDisplay) URL.revokeObjectURL(imageUrlForDisplay);
                    if (uiUpdater && !skipUiAppend) uiUpdater.toggleEmbeddedSendButton?.(true);
                    return;
                }
            }

            let textForDisplayAndStore: string;
            let typeForStore: string = 'text';
            const messageExtraData: Partial<MessageInStore> = { // Explicitly typed if MessageInStore is available
                id: userMessageId,
                timestamp: userMessageTimestamp
            };

            if (imageFile) {
                typeForStore = 'image';
                
                let userProvidedTextForImage: string | null = null;
                if (captionText) {
                    userProvidedTextForImage = captionText.trim();
                } else if (text && imageFile) {
                    userProvidedTextForImage = text.trim();
                }
                
                textForDisplayAndStore = userProvidedTextForImage || ""; // <<< FIX: Default to empty string if null
            
                messageExtraData.content_url = imageUrlForDisplay;
                messageExtraData.imagePartsForGemini = imagePartsForGemini;
                if (imageSemanticDescriptionForStore) {
                    messageExtraData.imageInitialDescription = imageSemanticDescriptionForStore;
                }
            } else if (isVoiceMemo) {
                typeForStore = 'voice_memo';
                textForDisplayAndStore = text; // text is already string ("" if empty)
                messageExtraData.isVoiceMemo = true;
                messageExtraData.audioBlobDataUrl = optionsAudioBlobUrl;
            } else { // Plain text message
                textForDisplayAndStore = text; // text is already string ("" if empty)
            }

            if (!skipUiAppend) { // This condition is key
                console.log(`TMH.${functionName}: Appending user message to UI. Text: "${textForDisplayAndStore.substring(0, 30)}", Image: ${!!imageUrlForDisplay}`);
                uiUpdater.appendToEmbeddedChatLog?.(
                    textForDisplayAndStore,
                    'user',
                    {
                        timestamp: userMessageTimestamp,
                        messageId: userMessageId,
                        imageUrl: imageUrlForDisplay // This comes from the image processing block earlier
                    }
                );
            } else {
                console.log(`TMH.${functionName}: Skipping UI append for user message as requested by options.`);
            }

            await conversationManager.addMessageToConversation(
                currentEmbeddedChatTargetId!,
                'user',
                textForDisplayAndStore,
                typeForStore,
                userMessageTimestamp,
                messageExtraData
            );
            
            // This is now the main UI feedback block, triggered for text, voice, and images
            // when the user's message has been handled locally.
            if (!skipUiAppend && uiUpdater) {
                uiUpdater.toggleEmbeddedSendButton?.(false); // Disable send button while AI thinks
            }
            
            const thinkingMsgOptions: ChatMessageOptions = {
                senderName: currentConnector.profileName?.split(' ')[0] || currentConnector.profileName,
                avatarUrl: currentConnector.avatarModern,
                isThinking: true,
                connectorId: currentConnector.id
            };
            
            // Determine the thinking text based on message type
            let thinkingTextIndicator = `${thinkingMsgOptions.senderName || 'Partner'} is typing...`;
            if (imageFile) {
                thinkingTextIndicator = `${thinkingMsgOptions.senderName || 'Partner'} is looking at the image...`;
            }
            
            // Create the thinking message element. We don't need to check skipUiAppend here because
            // the AI's "thinking" state should always be visible to the user.
            const thinkingMsg = uiUpdater.appendToEmbeddedChatLog?.(thinkingTextIndicator, 'connector-thinking', thinkingMsgOptions);
            // <<< END OF REPLACEMENT BLOCK >>>
            
            let aiRespondedSuccessfully = false;
            try {
                let promptForAI: string;
                let aiResponseObject: string | null | object; // Declare response object here

                if (imageFile) { // User sent an image (with or without caption)
                    const userProvidedTextWithImage = captionText || textFromInput?.trim() || "";
                    // Construct promptForAI for the 2-part image reply
                    promptForAI = `The user has shared an image.`;
                    if (userProvidedTextWithImage) {
                      promptForAI += ` They also provided the following text with it: "${userProvidedTextWithImage}".`;
                    } else {
                      promptForAI += ` They did not provide any accompanying text.`;
                    }
                    promptForAI += ` Your response MUST have two distinct parts:\n             Part 1: Your Conversational Comment (as ${currentConnector.profileName}):\n- Start with a natural and engaging observation or question about THE CURRENT IMAGE.\n- If the user provided text/caption ("${userProvidedTextWithImage || 'none'}"), acknowledge it naturally.\n- Your comment should be suitable for a 1-on-1 chat in ${currentConnector.language}.\n- This conversational part comes FIRST.\nSpeak ONLY in ${currentConnector.language}.\n                    Part 2: CRITICAL - After your conversational comment, you MUST include a special section formatted EXACTLY like this:\n                    [IMAGE_DESCRIPTION_START]\n                A concise, factual, and objective description of the visual content of the image itself. If previous images were discussed, IGNORE THEM for this factual description. Describe only what you visually see in THIS SPECIFIC IMAGE. If there are recognizable people, landmarks, or specific types of places or famous person (e.g., "a Parisian cafe," "Times Square," "a basketball court", "Barack Obama"), try to identify them if you are reasonably confident. Do NOT refer to the user's caption or my previous description (if any) within this factual description part.\n                    [IMAGE_DESCRIPTION_END]\n                    Example: "That's a cool picture! What were you doing there? [IMAGE_DESCRIPTION_START]A photo of a person standing on a mountain peak with a blue sky in the background.[IMAGE_DESCRIPTION_END]"\n                    Speak ONLY in ${currentConnector.language}. Your conversational comment (Part 1) MUST come before the [IMAGE_DESCRIPTION_START] tag.`;
                    // (The long prompt string above is taken directly from your file for the image case)

                    if (imagePartsForGemini && imagePartsForGemini[0]?.inlineData?.data) {
                        console.log(`TMH.${functionName}: Calling AI (generateTextFromImageAndText) for IMAGE reply.`);
                        aiResponseObject = await (aiService.generateTextFromImageAndText as any)(
                            imagePartsForGemini[0].inlineData.data,
                            imageFile.type,
                            currentConnector,
                            getHistoryForAiCall(undefined, true),    // EMPTY HISTORY for image reply
                            promptForAI,
                            aiApiConstants.PROVIDERS.TOGETHER 
                        );
                    } else {
                        console.error(`TMH.${functionName}: imageFile present but imagePartsForGemini data missing.`);
                        throw new Error("Missing image data for AI call."); // Or handle gracefully
                    }
                } else { // User sent TEXT-ONLY
                    promptForAI = textForDisplayAndStore; // This is the user's text message
                    console.log(`TMH.${functionName}: Calling AI (generateTextMessage) for TEXT reply.`);
                    aiResponseObject = await (aiService.generateTextMessage as any)(
                        promptForAI,
                        currentConnector,
                        getHistoryForAiCall(convo.geminiHistory || [], false), // FULL CONVO HISTORY for text reply
                        aiApiConstants.PROVIDERS.GROQ,
                        false
                    );
                }
                if (thinkingMsg?.remove) thinkingMsg.remove();

                const aiResponseText = typeof aiResponseObject === 'string'
                ? aiResponseObject
                : (typeof aiResponseObject === 'object' && aiResponseObject !== null
                    ? JSON.stringify(aiResponseObject)
                    : null);
                const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseText || "");
                const isBlockedResponse = typeof aiResponseText === 'string' && aiResponseText.startsWith("(My response was blocked:");

                if (aiResponseText === null) {
                     if (!skipUiAppend) uiUpdater.appendToEmbeddedChatLog?.("Sorry, I couldn't generate a response right now.", 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                } else if (isHumanError || isBlockedResponse) {
                    if (!skipUiAppend) uiUpdater.appendToEmbeddedChatLog?.(aiResponseText, 'connector-error', { isError: true, isSystemLikeMessage: isHumanError, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
              // ...
} else { // This is where AI response is handled
    let conversationalReply = aiResponseText; // Default to full response
    let extractedImageDescriptionForStore: string | undefined = undefined;

    // Check if the AI response was for an image (i.e., imageFile was part of the user's message)
    if (imageFile && typeof aiResponseText === 'string') { // imageFile is from sendEmbeddedTextMessage scope
        const descStartTag = "[IMAGE_DESCRIPTION_START]";
        const descEndTag = "[IMAGE_DESCRIPTION_END]";
        const startIndex = aiResponseText.indexOf(descStartTag);
        const endIndex = aiResponseText.indexOf(descEndTag);

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            extractedImageDescriptionForStore = aiResponseText
                .substring(startIndex + descStartTag.length, endIndex)
                .trim();

            let partBefore = aiResponseText.substring(0, startIndex).trim();
            let partAfter = aiResponseText.substring(endIndex + descEndTag.length).trim();

            conversationalReply = partBefore;
            if (partAfter) conversationalReply += (partBefore ? " " : "") + partAfter;
            conversationalReply = conversationalReply.trim();

            console.log(`TMH.${functionName} (Embedded): Parsed AI image response. Conversational: "${conversationalReply.substring(0, 30)}...", Description: "${extractedImageDescriptionForStore.substring(0, 50)}..."`);
        } else {
            console.warn(`TMH.${functionName} (Embedded): Image description tags not found in AI response for image. Full response treated as conversational: "${aiResponseText.substring(0, 50)}..."`);
            // conversationalReply remains the full aiResponseText - this is the fallback.
        }
    }

    // Now, use the potentially modified conversationalReply for UI and storage
    // The skipUiAppend here is for the USER's message, not the AI's reply.
    // AI's reply should generally always be appended.
    uiUpdater.appendToEmbeddedChatLog?.(
        conversationalReply, 
        'connector', 
        { 
            avatarUrl: currentConnector.avatarModern, 
            senderName: currentConnector.profileName, 
            timestamp: Date.now(), 
            connectorId: currentConnector.id 
        }
    );
    console.log(`TMH.${functionName}: AI message appended to embedded UI. Text: "${conversationalReply.substring(0,30)}"`);
    
    await conversationManager.addModelResponseMessage(
        currentEmbeddedChatTargetId!, 
        conversationalReply // Store the (parsed) conversational part
    );
    aiRespondedSuccessfully = true;

    // Store the extracted factual description on the original user's image message
    if (imageFile && extractedImageDescriptionForStore && userMessageId) { // userMessageId is from options or generated
        console.log(`TMH.${functionName} (Embedded): Attempting to update original user image message (ID: ${userMessageId}) with AI's detailed description.`);
        const convoRecordForUpdate = conversationManager.getConversationById(currentEmbeddedChatTargetId!);
        if (convoRecordForUpdate && convoRecordForUpdate.messages) {
            const originalUserMsgIndex = convoRecordForUpdate.messages.findIndex(m => m.id === userMessageId);
            if (originalUserMsgIndex !== -1) {
                convoRecordForUpdate.messages[originalUserMsgIndex].imageSemanticDescription = extractedImageDescriptionForStore;
                
                if (window.convoStore?.updateConversationProperty && window.convoStore.saveAllConversationsToStorage) {
                     window.convoStore.updateConversationProperty(currentEmbeddedChatTargetId!, 'messages', [...convoRecordForUpdate.messages]);
                     window.convoStore.saveAllConversationsToStorage();
                     console.log(`TMH.${functionName} (Embedded): Updated user image message ${userMessageId} with AI's detailed description in store.`);
                } else {
                    console.warn(`TMH.${functionName} (Embedded): convoStore update methods not available to save AI's detailed image description.`);
                }
            } else {
                console.warn(`TMH.${functionName} (Embedded): Could not find original user image message with ID ${userMessageId} to update.`);
            }
        }
    }
}
// ...
            } catch (e: any) {
                if (thinkingMsg?.remove) thinkingMsg.remove();
                const displayError = polyglotHelpers.sanitizeTextForDisplay(e.message) || "An unexpected error occurred.";
                if (!skipUiAppend) uiUpdater.appendToEmbeddedChatLog?.(displayError, 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
            } finally {
                if (domElements.embeddedMessageSendBtn) {
                    domElements.embeddedMessageSendBtn.disabled = false;
                }

                if (aiRespondedSuccessfully) {
                    const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
                    if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && currentEmbeddedChatTargetId) {
                        try {
                            await window.memoryService.markInteraction(currentEmbeddedChatTargetId, currentUserId);
                        } catch (e) {
                            console.error(`TMH.${functionName}: Error marking interaction for ${currentEmbeddedChatTargetId}:`, e);
                        }
                    }
                }
                getChatOrchestrator()?.notifyNewActivityInConversation?.(currentEmbeddedChatTargetId);
            }
        } // End of sendEmbeddedTextMessage

        async function handleEmbeddedImageUpload(event: Event, currentEmbeddedChatTargetId: string | null): Promise<void> {
            const functionName = "handleEmbeddedImageUpload";
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];

            if (!file) { if (target) target.value = ''; return; }
            if (!currentEmbeddedChatTargetId) { console.error(`TMH.${functionName}: Missing targetId.`); if (target) target.value = ''; return; }

            const record = await conversationManager.ensureConversationRecord(currentEmbeddedChatTargetId);
            const convo = record.conversation as ConversationRecordInStore | null;
            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or connector for ID: ${currentEmbeddedChatTargetId}`);
                if (target) target.value = ''; return;
            }
            const currentConnector: Connector = convo.connector;

            if (file.size > 4 * 1024 * 1024) { alert("Image too large (max 4MB)."); if (target) target.value = ''; return; }

            // Outer scope aiRespondedSuccessfully is not strictly needed here if all logic is within onloadend
            // let aiRespondedSuccessfullyOuter = false; 
            const reader = new FileReader();

            reader.onloadend = async () => {
                const resultString = reader.result as string;
                const base64DataForApi = resultString.split(',')[1];
                const dataUrlForDisplay = resultString;
                const imagePlaceholderTextForStore = "[User sent an image]"; // Or derive a better placeholder

                uiUpdater.appendToEmbeddedChatLog?.("", 'user', { imageUrl: dataUrlForDisplay, timestamp: Date.now() });
                const imageMessageId = polyglotHelpers.generateUUID();
                const imageTimestamp = Date.now();
        
                await conversationManager.addMessageToConversation(
                    currentEmbeddedChatTargetId!,
                    'user',
                    imagePlaceholderTextForStore, 
                    'image',
                    imageTimestamp,
                    {
                        id: imageMessageId, // Ensure 'id' is used if your type expects it directly, or 'messageId' if that's the field.
                                            // Assuming 'id' is the correct field name as per other MessageInStore structures.
                        content_url: dataUrlForDisplay,
                        imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }]
                    }
                );

                uiUpdater.toggleEmbeddedSendButton?.(false);

                const thinkingMsgOptions: ChatMessageOptions = {
                    senderName: currentConnector.profileName?.split(' ')[0],
                    avatarUrl: currentConnector.avatarModern,
                    isThinking: true,
                    connectorId: currentConnector.id
                };
                const thinkingMsg = uiUpdater.appendToEmbeddedChatLog?.(`${thinkingMsgOptions.senderName || 'Partner'} is looking at the image...`, 'connector-thinking', thinkingMsgOptions);
                let aiRespondedSuccessfully = false; // Scoped to onloadend
        
                try {
                  const newPromptForImageAndDescription =
                    `The user has just sent an image. Your response MUST have two parts:
As ${currentConnector.profileName} (their language partner, with interests like [${currentConnector.interests?.slice(0,2).join(', ') || 'various topics'}]), provide a natural, conversational comment or question about the image just sent by the user.
- Make an engaging observation specific to the image.
- Perhaps share a very brief, relevant thought or a quick related personal (persona-consistent) experience.
- Ask an open-ended question that invites the user to share more about the image or their connection to it.
After your conversational comment, include a special section clearly marked like this:
[IMAGE_DESCRIPTION_START]
A concise, factual description of the image, including:
Any prominent text visible in the image (transcribe it accurately).
Key objects, people, or scenes depicted.
The overall style or type of image (e.g., photo, drawing, movie poster).
[IMAGE_DESCRIPTION_END]Example: "That's a really dramatic movie poster! The colors are intense. [IMAGE_DESCRIPTION_START]Movie poster for 'Inferno'. Shows Tom Hanks and another actor. Text 'INFERNO' is prominent at the bottom. Appears to be for an action or thriller film set in a historic European city.[IMAGE_DESCRIPTION_END]"
Speak ONLY in ${currentConnector.language}. Your conversational comment should come first.`;

const relevantHistoryForAi = getHistoryForAiCall(undefined, true);
// ^^^^^^ relevantHistoryForAi DEFINED ^^^^^^

const aiMsgResponse = await (aiService.generateTextFromImageAndText as any)(
    base64DataForApi,                       // 1
    file.type,                              // 2
    currentConnector,                       // 3
    relevantHistoryForAi,                   // 4. history (now correctly using the helper)
    newPromptForImageAndDescription,        // 5. prompt
    aiApiConstants.PROVIDERS.TOGETHER       // 6. preferredProvider
);
                    if (thinkingMsg?.remove) thinkingMsg.remove();
                    let conversationalReply: string | null = null;
                    let extractedImageDescription: string | undefined = undefined;

                    if (typeof aiMsgResponse === 'string') {
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const startIndex = aiMsgResponse.indexOf(descStartTag);
                        const endIndex = aiMsgResponse.indexOf(descEndTag);

                        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                            extractedImageDescription = aiMsgResponse.substring(startIndex + descStartTag.length, endIndex).trim();
                            conversationalReply = aiMsgResponse.substring(0, startIndex).trim();
                            console.log(`TMH.${functionName}: Parsed image response. Conversational: "${(conversationalReply||"").substring(0,30)}...", Description: "${(extractedImageDescription||"").substring(0,50)}..."`);
                        } else {
                            conversationalReply = aiMsgResponse.trim();
                            console.warn(`TMH.${functionName}: Image description tags not found in AI response. Full response treated as conversational.`);
                        }
                    }
                    const aiResponseTextForDisplay = conversationalReply;
                    const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseTextForDisplay || "");
    
                     if (aiResponseTextForDisplay === null) {
                        uiUpdater.appendToEmbeddedChatLog?.("Sorry, I couldn't process the image right now.", 'connector-error', { isError:true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                    } else if (isHumanError) {
                        uiUpdater.appendToEmbeddedChatLog?.(aiResponseTextForDisplay, 'connector-error', { isError:true, isSystemLikeMessage:true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                    } else {
                        uiUpdater.appendToEmbeddedChatLog?.(aiResponseTextForDisplay, 'connector', { avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id, timestamp: Date.now() });
                        await conversationManager.addModelResponseMessage(currentEmbeddedChatTargetId!, aiResponseTextForDisplay);
                        aiRespondedSuccessfully = true;
                    }
    
                    if (extractedImageDescription) {
                        const userImageMessageOriginalId = imageMessageId;
                        console.log(`TMH.${functionName}: Attempting to update original user image message (ID: ${userImageMessageOriginalId}) with description.`);
                        const currentConvoRecord = conversationManager.getConversationById(currentEmbeddedChatTargetId!); // Re-fetch or use existing 'record' if safe
                        if (currentConvoRecord && currentConvoRecord.messages) { // Ensure messages array exists
                            const originalMsgIndex = currentConvoRecord.messages.findIndex(m => m.id === userImageMessageOriginalId);
                            if (originalMsgIndex !== -1) {
                                currentConvoRecord.messages[originalMsgIndex].imageSemanticDescription = extractedImageDescription;
                                if (window.convoStore?.updateConversationProperty && window.convoStore.saveAllConversationsToStorage) {
                                     window.convoStore.updateConversationProperty(currentEmbeddedChatTargetId!, 'messages', [...currentConvoRecord.messages]); // Send a new array to trigger updates if needed
                                     window.convoStore.saveAllConversationsToStorage();
                                     console.log(`TMH.${functionName}: Updated user image message ${userImageMessageOriginalId} with description in store.`);
                                } else {
                                    console.warn(`TMH.${functionName}: convoStore update methods not available to save image description.`);
                                }
                            } else {
                                console.warn(`TMH.${functionName}: Could not find original user image message with ID ${userImageMessageOriginalId} to update description.`);
                            }
                        }
                    }
                } catch (e: any) {
                    if (thinkingMsg?.remove) thinkingMsg.remove();
                    uiUpdater.appendToEmbeddedChatLog?.(`Error with image: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, connectorId: currentConnector.id });
                } finally {
                    if (aiRespondedSuccessfully) {
                        const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
                        if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && currentEmbeddedChatTargetId) {
                            try {
                                console.log(`TMH.${functionName}: Marking interaction (after successful AI image response) for ${currentEmbeddedChatTargetId} with user ${currentUserId}.`);
                                await window.memoryService.markInteraction(currentEmbeddedChatTargetId, currentUserId);
                            } catch (e) {
                                console.error(`TMH.${functionName}: Error marking interaction for ${currentEmbeddedChatTargetId}:`, e);
                            }
                        }
                    }
                    uiUpdater.toggleEmbeddedSendButton?.(true);
                    getChatOrchestrator()?.notifyNewActivityInConversation?.(currentEmbeddedChatTargetId!);
                    if (target) target.value = '';
                }
            }; 
        
            reader.onerror = () => {
                alert("Error reading image.");
                if (target) target.value = '';
                uiUpdater.toggleEmbeddedSendButton?.(true);
            };
        
            reader.readAsDataURL(file);
        }

        async function sendModalTextMessage(
            textFromInput: string,
            currentModalMessageTargetConnector: Connector | null,
            options: {
                skipUiAppend?: boolean;
                isVoiceMemo?: boolean;
                audioBlobDataUrl?: string | null;
                messageId?: string;
                timestamp?: number;
                imageFile?: File | null;
                captionText?: string | null;
            } = {}
        ): Promise<void> {
            const { imageFile, captionText, isVoiceMemo, audioBlobDataUrl: optionsAudioBlobUrl, skipUiAppend } = options;
            const functionName = "sendModalTextMessage";
            const text = textFromInput?.trim() || ""; // Ensure text is always a string
    
            const userMessageTimestamp = options.timestamp || Date.now();
            const userMessageId = options.messageId || polyglotHelpers.generateUUID();
    
            if (!currentModalMessageTargetConnector?.id) {
                console.error(`TMH.${functionName}: Missing targetConnector.id.`);
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                return;
            }
            const targetId = currentModalMessageTargetConnector.id;
        
            if (!isVoiceMemo && !imageFile && !text) {
                console.warn(`TMH.${functionName}: Empty message (not voice memo, no image).`);
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                return;
            }

            const record = await conversationManager.ensureConversationRecord(targetId, currentModalMessageTargetConnector);
            const convo = record.conversation as ConversationRecordInStore | null;
            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or connector for ID: ${targetId}`);
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                return;
            }
            const currentConnector: Connector = convo.connector;
    
            // --- Image processing for Modal ---
            let imageUrlForDisplay_modal: string | undefined = undefined;
            let imagePartsForGemini_modal: Array<{ inlineData: { mimeType: string; data: string; } }> | undefined = undefined;
            let imageSemanticDescriptionForStore_modal: string | undefined = undefined;
  
            if (imageFile) {
                console.log(`TMH.${functionName}: Processing image "${imageFile.name}" with caption "${captionText || ''}" for modal.`);
                let base64StringForStore_modal: string; // Declare here

                try {
                    base64StringForStore_modal = await polyglotHelpers.fileToBase64(imageFile); // Assign here
                    const base64DataForApi = base64StringForStore_modal.split(',')[1];
                    imagePartsForGemini_modal = [{ inlineData: { mimeType: imageFile.type, data: base64DataForApi } }];
                    console.log(`TMH.${functionName}: Modal image converted to base64 for AI. MimeType: ${imageFile.type}`);

                    // imageUrlForDisplay_modal will now be the base64 string for storage.
                    imageUrlForDisplay_modal = base64StringForStore_modal;
                    // Generate description if no caption, similar to embedded version
                    const descriptionPromptText = captionText || text || "Describe this image concisely.";
                    if (aiService.generateTextFromImageAndText && convo.connector) {
                        const desc = await aiService.generateTextFromImageAndText(
                            base64DataForApi, 
                            imageFile.type, 
                            convo.connector, 
                            [], 
                            `Describe this image concisely in one sentence for context. Speak in ${convo.connector.language || 'English'}. Based on the image and the user's text: "${descriptionPromptText}"`,
                            aiApiConstants.PROVIDERS.TOGETHER
                        );
                        if (desc && typeof desc === 'string' && !desc.startsWith("[")) {
                            imageSemanticDescriptionForStore_modal = desc.trim();
                            console.log(`TMH.${functionName}: AI generated image description (modal): "${imageSemanticDescriptionForStore_modal}"`);
                        } else if (desc && typeof desc === 'string' && desc.startsWith("[")){
                           console.warn(`TMH.${functionName}: AI description (modal) was a placeholder/error: "${desc}"`);
                        }
                      
                    }
                    console.log(`TMH.${functionName}: Adding a short delay before main AI reply to avoid rate limits...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2000 ms = 2 seconds

                } catch (error) {
                    console.error(`TMH.${functionName}: Error processing modal image:`, error);
                    uiUpdater.appendToMessageLogModal?.("Error processing image.", 'connector-error', { isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                    if (imageUrlForDisplay_modal) URL.revokeObjectURL(imageUrlForDisplay_modal);
                    if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                    return;
                }
            }
          
            // --- Define final content for UI and Store for Modal ---
            let textForDisplayAndStore: string;
            let typeForStore: string = 'text';
            const finalMessageExtraData: Partial<MessageInStore> = { // Use a single, well-defined extraData object
                id: userMessageId,
                timestamp: userMessageTimestamp
            };

            if (imageFile) {
                typeForStore = 'image';
            
                let userProvidedTextForImage_modal: string | null = null;
                if (captionText) {
                    userProvidedTextForImage_modal = captionText.trim();
                } else if (text && imageFile) {
                    userProvidedTextForImage_modal = text.trim();
                }
                
                textForDisplayAndStore = userProvidedTextForImage_modal || ""; // <<< FIX: Default to empty string if null
            
                finalMessageExtraData.content_url = imageUrlForDisplay_modal;
                finalMessageExtraData.imagePartsForGemini = imagePartsForGemini_modal;
                if (imageSemanticDescriptionForStore_modal) {
                    finalMessageExtraData.imageInitialDescription = imageSemanticDescriptionForStore_modal;
                }
            } else if (isVoiceMemo) {
                typeForStore = 'voice_memo';
                textForDisplayAndStore = text; // text is already string ("" if empty)
                finalMessageExtraData.isVoiceMemo = true;
                finalMessageExtraData.audioBlobDataUrl = optionsAudioBlobUrl;
            } else { // Plain text message
                textForDisplayAndStore = text; // text is already string ("" if empty)
            }
        
            // Append User's Message to Modal UI (if not skipped)
            if (!skipUiAppend) {
                console.log(`TMH.${functionName}: Appending user message to UI (Modal). Text: "${textForDisplayAndStore.substring(0,30)}", Image: ${!!imageUrlForDisplay_modal}`);
                uiUpdater.appendToMessageLogModal?.( // Corrected to appendToMessageLogModal
                    textForDisplayAndStore,
                    'user',
                    {
                        timestamp: userMessageTimestamp,
                        messageId: userMessageId,
                        imageUrl: imageUrlForDisplay_modal // Use modal specific image URL
                    }
                );
            }
    
            // Add User's Message to Conversation Store
            await conversationManager.addMessageToConversation(
                targetId, // Correct target ID for modal
                'user',
                textForDisplayAndStore,
                typeForStore,
                userMessageTimestamp,
                finalMessageExtraData // Use the consolidated extra data
            );
    
            // UI updates for modal input (only if this function initiated the send)
            if (!skipUiAppend) {
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = true;
                uiUpdater.resetMessageModalInput?.();
            }
    
            const thinkingMsgOptions: ChatMessageOptions = {
                senderName: currentConnector.profileName?.split(' ')[0], avatarUrl: currentConnector.avatarModern, isThinking: true
            };
            // Ensure thinking message is appended to modal log
            const thinkingMsg = uiUpdater.appendToMessageLogModal?.(`${thinkingMsgOptions.senderName || 'Partner'} is typing...`, 'connector-thinking', thinkingMsgOptions);
    
            let aiRespondedSuccessfully = false;
            try {
                // Determine prompt for AI, considering potential image context
                let promptForAI_modal: string;
                let aiResponse: string | null | object; // Declare response object here

                if (imageFile) { // User sent an image (with or without caption)
                    const userProvidedTextWithImage_modal = captionText || text || "";
                    // Construct promptForAI_modal for the 2-part image reply
                    promptForAI_modal = `The user has shared an image in our chat.`;
                    if (userProvidedTextWithImage_modal) {
                        promptForAI_modal += ` They also provided the following text with it: "${userProvidedTextWithImage_modal}".`;
                    } else {
                        promptForAI_modal += ` They did not provide any accompanying text.`;
                    }
                    promptForAI_modal += ` Your response MUST have two distinct parts:\n    Part 1: Your Conversational Comment (as ${currentConnector.profileName}):\n- Start with a natural and engaging observation or question about THE CURRENT IMAGE.\n- If the user provided text/caption ("${userProvidedTextWithImage_modal || 'none'}"), acknowledge it naturally.\n- Your comment should be suitable for a 1-on-1 chat in ${currentConnector.language}.\n- This conversational part comes FIRST.\nSpeak ONLY in ${currentConnector.language}.\n        Part 2: CRITICAL - After your conversational comment, you MUST include a special section formatted EXACTLY like this:\n        [IMAGE_DESCRIPTION_START]\n           A concise, factual, and objective description of the visual content of the image itself.Describe only what you visually see in THIS SPECIFIC IMAGE. If previous images were discussed, IGNORE THEM for this factual description. If there are recognizable people, landmarks, or specific types of places or famous person (e.g., "a Parisian cafe," "Times Square," "a basketball court", "Barack Obama"), try to identify them if you are reasonably confident. Do NOT refer to the user's caption or my previous description (if any) within this factual description part.\n        [IMAGE_DESCRIPTION_END]\n        Example: "That's a cool picture! What were you doing there? [IMAGE_DESCRIPTION_START]A photo of a person standing on a mountain peak with a blue sky in the background.[IMAGE_DESCRIPTION_END]"\n        Speak ONLY in ${currentConnector.language}. Your conversational comment (Part 1) MUST come before the [IMAGE_DESCRIPTION_START] tag.`;
                    // (The long prompt string above is taken directly from your file for the image case)

                    if (imagePartsForGemini_modal && imagePartsForGemini_modal[0]?.inlineData?.data) {
                        console.log(`TMH.${functionName}: Calling AI (generateTextFromImageAndText) for IMAGE reply (modal).`);
                        aiResponse = await (aiService.generateTextFromImageAndText as any)(
                            imagePartsForGemini_modal[0].inlineData.data,
                            imageFile.type,
                            currentConnector,
                            getHistoryForAiCall(undefined, true),    // EMPTY HISTORY for image reply
                            promptForAI_modal,
                            aiApiConstants.PROVIDERS.TOGETHER
                        );
                    } else {
                        console.error(`TMH.${functionName}: imageFile present but imagePartsForGemini_modal data missing.`);
                        throw new Error("Missing image data for AI call (modal)."); // Or handle gracefully
                    }
                } else { // User sent TEXT-ONLY
                    promptForAI_modal = textForDisplayAndStore; // This is the user's text message
                    console.log(`TMH.${functionName}: Calling AI (generateTextMessage) for TEXT reply (modal).`);
                    aiResponse = await (aiService.generateTextMessage as any)(
                        promptForAI_modal,
                        currentConnector,
                        getHistoryForAiCall(convo.geminiHistory || [], false), // FULL CONVO HISTORY for text reply
                        aiApiConstants.PROVIDERS.GROQ,
                        false
                    );
                }
                const aiResponseText = typeof aiResponse === 'string' ? aiResponse : null;
    
                if (thinkingMsg?.remove) thinkingMsg.remove();
    
                const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseText || "");
                const isBlockedResponse = typeof aiResponseText === 'string' && aiResponseText.startsWith("(My response was blocked:");
    
                if (aiResponseText === null) {
                     uiUpdater.appendToMessageLogModal?.("Sorry, I couldn't get a response.", 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                } else if (isHumanError || isBlockedResponse) {
                    uiUpdater.appendToMessageLogModal?.(aiResponseText, 'connector-error', { isError: true, isSystemLikeMessage: isHumanError, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                } else {
                    let conversationalReply_modal = aiResponseText;
                    let extractedImageDescription_modal: string | undefined = undefined;
    
                    // Check if the AI response was for an image (i.e., imageFile was part of the user's message)
                    if (imageFile && typeof aiResponseText === 'string') { // imageFile is from the sendModalTextMessage scope
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const startIndex = aiResponseText.indexOf(descStartTag);
                        const endIndex = aiResponseText.indexOf(descEndTag);
    
                        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                            extractedImageDescription_modal = aiResponseText
                                .substring(startIndex + descStartTag.length, endIndex)
                                .trim();
    
                            let partBefore = aiResponseText.substring(0, startIndex).trim();
                            let partAfter = aiResponseText.substring(endIndex + descEndTag.length).trim();
    
                            conversationalReply_modal = partBefore;
                            if (partAfter) conversationalReply_modal += (partBefore ? " " : "") + partAfter; // Ensure space if both parts exist
                            conversationalReply_modal = conversationalReply_modal.trim();
    
                            console.log(`TMH.${functionName} (Modal): Parsed AI image response. Conversational: "${conversationalReply_modal.substring(0, 30)}...", Description: "${extractedImageDescription_modal.substring(0, 50)}..."`);
                        } else {
                            console.warn(`TMH.${functionName} (Modal): Image description tags not found in AI response for image. Full response treated as conversational: "${aiResponseText.substring(0, 50)}..."`);
                            // conversationalReply_modal remains the full aiResponseText, which is the desired fallback.
                        }
                    }
    
                    // Now, use the potentially modified conversationalReply_modal for UI and storage
                    uiUpdater.appendToMessageLogModal?.(
                        conversationalReply_modal, 
                        'connector', 
                        { 
                            avatarUrl: currentConnector.avatarModern, 
                            senderName: currentConnector.profileName, 
                            timestamp: Date.now() 
                        }
                    );
                    await conversationManager.addModelResponseMessage(targetId, conversationalReply_modal); // Store the (parsed) conversational part
                    aiRespondedSuccessfully = true;
    
                    // Store the extracted factual description on the original user's image message
                    if (imageFile && extractedImageDescription_modal && userMessageId) { // userMessageId is from options or generated at the start of sendModalTextMessage
                        console.log(`TMH.${functionName} (Modal): Attempting to update original user image message (ID: ${userMessageId}) with AI's detailed description.`);
                        const convoRecordForUpdate = conversationManager.getConversationById(targetId);
                        if (convoRecordForUpdate && convoRecordForUpdate.messages) {
                            const originalUserMsgIndex = convoRecordForUpdate.messages.findIndex(m => m.id === userMessageId);
                            if (originalUserMsgIndex !== -1) {
                                convoRecordForUpdate.messages[originalUserMsgIndex].imageSemanticDescription = extractedImageDescription_modal;
                                
                                if (window.convoStore?.updateConversationProperty && window.convoStore.saveAllConversationsToStorage) {
                                     window.convoStore.updateConversationProperty(targetId, 'messages', [...convoRecordForUpdate.messages]);
                                     window.convoStore.saveAllConversationsToStorage();
                                     console.log(`TMH.${functionName} (Modal): Updated user image message ${userMessageId} with AI's detailed description in store.`);
                                } else {
                                    console.warn(`TMH.${functionName} (Modal): convoStore update methods not available to save AI's detailed image description to user message.`);
                                }
                            } else {
                                console.warn(`TMH.${functionName} (Modal): Could not find original user image message with ID ${userMessageId} to update with AI's detailed description.`);
                            }
                        }
                     }
                }
            } catch (e: any) {
                if (thinkingMsg?.remove) thinkingMsg.remove();
                uiUpdater.appendToMessageLogModal?.(`Error: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
            } finally {
                if (!skipUiAppend) {
                    if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                }
    
                if (aiRespondedSuccessfully) {
                    const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
                    if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && targetId) {
                        try {
                            await window.memoryService.markInteraction(targetId, currentUserId);
                        } catch (e) { console.error(`TMH.${functionName}: Error marking interaction for ${targetId}:`, e); }
                    }
                }
                getChatOrchestrator()?.notifyNewActivityInConversation?.(targetId);
            }
        } // End of sendModalTextMessage

        async function handleModalImageUpload(event: Event, currentModalMessageTargetConnector: Connector | null): Promise<void> {
            const functionName = "handleModalImageUpload";
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            const targetId = currentModalMessageTargetConnector?.id;

            if (!file) { if (target) target.value = ''; return; }
            if (!targetId || !currentModalMessageTargetConnector) { console.error(`TMH.${functionName}: Missing targetId or connector.`); if (target) target.value = ''; return; }

            const record = await conversationManager.ensureConversationRecord(targetId, currentModalMessageTargetConnector);
            const convo = record.conversation as ConversationRecordInStore | null;
            if (!convo || !convo.connector) {
                console.error(`TMH.${functionName}: Invalid convo or connector for ID: ${targetId}`);
                if (target) target.value = ''; return;
            }
            const currentConnector: Connector = convo.connector;

            if (file.size > 4 * 1024 * 1024) { alert("Image too large (max 4MB)."); if (target) target.value = ''; return; }

            const reader = new FileReader();

            reader.onloadend = async () => {
                const resultString = reader.result as string;
                const base64DataForApi = resultString.split(',')[1];
                const dataUrlForDisplay = resultString;
                const imagePlaceholderTextForStore = "[User sent an image via direct upload]"; // Or similar

                uiUpdater.appendToMessageLogModal?.("", 'user', { imageUrl: dataUrlForDisplay, timestamp: Date.now() });
                
                const imageMessageId = polyglotHelpers.generateUUID(); // ID for the user's image message being processed
                const imageTimestamp = Date.now(); // Timestamp for the user's image message being processed

                await conversationManager.addMessageToConversation(
                    targetId, 'user', imagePlaceholderTextForStore, 'image', imageTimestamp,
                    { 
                        id: imageMessageId, // ensure 'id' field is used
                        content_url: dataUrlForDisplay, 
                        imagePartsForGemini: [{ inlineData: { mimeType: file.type, data: base64DataForApi } }] 
                    }
                );
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = true;
                const thinkingMsgOptions: ChatMessageOptions = {
                    senderName: currentConnector.profileName?.split(' ')[0], avatarUrl: currentConnector.avatarModern, isThinking: true
                };
                const thinkingMsg = uiUpdater.appendToMessageLogModal?.(`${thinkingMsgOptions.senderName || 'Partner'} is looking...`, 'connector-thinking', thinkingMsgOptions);
                let aiRespondedSuccessfully = false; // Scoped to onloadend

                try {
                    // Re-using the detailed prompt from handleEmbeddedImageUpload for consistency and better descriptions
                    const promptForImageAndDescription = // <<< CORRECTED: Was += in your snippet
                    `The user has just sent an image. Your response MUST have two distinct parts:
                    Part 1: A natural, conversational comment or question about the image, suitable for a 1-on-1 chat in ${currentConnector.language}. If the user provided text, acknowledge or incorporate it naturally into your comment. This part comes FIRST.
                    Part 2: CRITICAL - After your conversational comment, you MUST include a special section formatted EXACTLY like this:
                    [IMAGE_DESCRIPTION_START]
                       A concise, factual, and objective description of the visual content of the image itself.Describe only what you visually see in THIS SPECIFIC IMAGE. If previous images were discussed, IGNORE THEM for this factual description. If there are recognizable people, landmarks, or specific types of places or famous person (e.g., "a Parisian cafe," "Times Square," "a basketball court", "Barack Obama"), try to identify them if you are reasonably confident. Do NOT refer to the user's caption or my previous description (if any) within this factual description part.
                    [IMAGE_DESCRIPTION_END]
                    Example: "That's a cool picture! What were you doing there? [IMAGE_DESCRIPTION_START]A photo of a person standing on a mountain peak with a blue sky in the background.[IMAGE_DESCRIPTION_END]"
                    Speak ONLY in ${currentConnector.language}. Your conversational comment (Part 1) MUST come before the [IMAGE_DESCRIPTION_START] tag.`;
                    const relevantHistoryForAi = getHistoryForAiCall(undefined, true); // <<< CORRECTED
                    const aiResponse = await (aiService.generateTextFromImageAndText as any)(
                        base64DataForApi, 
                        file.type, 
                        currentConnector, 
                        relevantHistoryForAi, 
                        promptForImageAndDescription, 
                        aiApiConstants.PROVIDERS.TOGETHER
                    );
                    if (thinkingMsg?.remove) thinkingMsg.remove();

                    let conversationalReply: string | null = null;
                    let extractedImageDescription: string | undefined = undefined;

                    if (typeof aiResponse === 'string') {
                        const descStartTag = "[IMAGE_DESCRIPTION_START]";
                        const descEndTag = "[IMAGE_DESCRIPTION_END]";
                        const startIndex = aiResponse.indexOf(descStartTag);
                        const endIndex = aiResponse.indexOf(descEndTag);

                        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                            extractedImageDescription = aiResponse.substring(startIndex + descStartTag.length, endIndex).trim();
                            conversationalReply = aiResponse.substring(0, startIndex).trim();
                        } else {
                            conversationalReply = aiResponse.trim();
                        }
                    }

                    const aiResponseTextForDisplay = conversationalReply;
                    const isHumanError = (aiApiConstants.HUMAN_LIKE_ERROR_MESSAGES || []).includes(aiResponseTextForDisplay || "");

                     if (aiResponseTextForDisplay === null) {
                        uiUpdater.appendToMessageLogModal?.("Sorry, I couldn't process the image.", 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName});
                    } else if (isHumanError) {
                        uiUpdater.appendToMessageLogModal?.(aiResponseTextForDisplay, 'connector-error', { isError: true, isSystemLikeMessage: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                    } else {
                        uiUpdater.appendToMessageLogModal?.(aiResponseTextForDisplay, 'connector', { avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName, timestamp: Date.now() });
                        await conversationManager.addModelResponseMessage(targetId, aiResponseTextForDisplay);
                        aiRespondedSuccessfully = true;
                    }

                    // Update original user image message with AI description (if extracted)
                    if (extractedImageDescription) {
                        const userImageMessageOriginalId = imageMessageId;
                        const currentConvoRecord = conversationManager.getConversationById(targetId);
                         if (currentConvoRecord && currentConvoRecord.messages) {
                            const originalMsgIndex = currentConvoRecord.messages.findIndex(m => m.id === userImageMessageOriginalId);
                            if (originalMsgIndex !== -1) {
                                currentConvoRecord.messages[originalMsgIndex].imageSemanticDescription = extractedImageDescription;
                                if (window.convoStore?.updateConversationProperty && window.convoStore.saveAllConversationsToStorage) {
                                     window.convoStore.updateConversationProperty(targetId, 'messages', [...currentConvoRecord.messages]);
                                     window.convoStore.saveAllConversationsToStorage();
                                     console.log(`TMH.${functionName}: Updated user image message ${userImageMessageOriginalId} with description in store (modal).`);
                                } else {
                                    console.warn(`TMH.${functionName}: convoStore update methods not available to save image description (modal).`);
                                }
                            } else {
                                 console.warn(`TMH.${functionName}: Could not find original user image message with ID ${userImageMessageOriginalId} to update description (modal).`);
                            }
                        }
                    }

                } catch (e: any) {
                    if (thinkingMsg?.remove) thinkingMsg.remove();
                    uiUpdater.appendToMessageLogModal?.(`Error with image: ${polyglotHelpers.sanitizeTextForDisplay(e.message)}`, 'connector-error', {isError: true, avatarUrl: currentConnector.avatarModern, senderName: currentConnector.profileName });
                } finally {
                    if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
                    if(aiRespondedSuccessfully) {
                        const currentUserId = localStorage.getItem('polyglot_current_user_id') || 'default_user';
                        if (window.memoryService && typeof window.memoryService.markInteraction === 'function' && targetId) {
                             try {
                                console.log(`TMH.${functionName}: Marking interaction (after successful AI image response) for ${targetId} with user ${currentUserId}.`);
                                await window.memoryService.markInteraction(targetId, currentUserId);
                            } catch (e) {
                                console.error(`TMH.${functionName}: Error marking interaction for ${targetId}:`, e);
                            }
                        }
                    }
                    getChatOrchestrator()?.notifyNewActivityInConversation?.(targetId);
                    if (target) target.value = '';
                }
            }; 

            reader.onerror = () => {
                alert("Error reading image.");
                if (target) target.value = '';
                if (domElements.messageSendBtn) (domElements.messageSendBtn as HTMLButtonElement).disabled = false;
            };

            reader.readAsDataURL(file);
        }

        console.log("text_message_handler.ts: IIFE for actual methods FINISHED.");
        return {
            sendEmbeddedTextMessage,
            handleEmbeddedImageUpload,
            sendModalTextMessage,
            handleModalImageUpload
        };
    })(); 

    if (window.textMessageHandler) {
        Object.assign(window.textMessageHandler, methods);
        (window.textMessageHandler as any).__functionalReady = true;
        console.log("text_message_handler.ts: SUCCESSFULLY populated window.textMessageHandler with real methods.");
    } else {
        console.error("text_message_handler.ts: CRITICAL ERROR - window.textMessageHandler placeholder was unexpectedly missing.");
        window.textMessageHandler = methods;
         (window.textMessageHandler as any).__functionalReady = true;
    }
    document.dispatchEvent(new CustomEvent('textMessageHandlerReady'));
    console.log('text_message_handler.ts: "textMessageHandlerReady" (FULLY FUNCTIONAL) event dispatched.');
} // <<< ***** THIS IS THE CRUCIAL FIX: Added closing brace for initializeActualTextMessageHandler *****

// Dependency checking logic remains outside the initializeActualTextMessageHandler function

const dependenciesForTMH_Functional = [
    'uiUpdaterReady',
    'aiServiceReady',
    'conversationManagerReady',
    'domElementsReady',
    'polyglotHelpersReady',
    'aiApiConstantsReady'
];
const tmhMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForTMH_Functional.forEach((dep: string) => tmhMetDependenciesLog[dep] = false);
let tmhDepsMet = 0;

function checkAndInitTMH(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'uiUpdaterReady': 
                verified = !!(window.uiUpdater && typeof window.uiUpdater.appendToEmbeddedChatLog === 'function'); 
                break;
            case 'aiServiceReady': 
                verified = !!(window.aiService && typeof window.aiService.generateTextMessage === 'function'); 
                break;
            case 'conversationManagerReady': 
                verified = !!(window.conversationManager && typeof window.conversationManager.ensureConversationRecord === 'function'); 
                break;
            case 'domElementsReady': 
                verified = !!window.domElements; 
                break;
            case 'polyglotHelpersReady': 
                verified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function'); 
                break;
            case 'aiApiConstantsReady': 
                verified = !!(window.aiApiConstants && window.aiApiConstants.PROVIDERS); 
                break;
            default: 
                console.warn(`TMH_EVENT: Unknown event ${receivedEventName}`); 
                return;
        }

        if (verified && !tmhMetDependenciesLog[receivedEventName]) {
            tmhMetDependenciesLog[receivedEventName] = true;
            tmhDepsMet++;
            console.log(`TMH_DEPS: Event '${receivedEventName}' VERIFIED. Count: ${tmhDepsMet}/${dependenciesForTMH_Functional.length}`);
        } else if(!verified){
            console.warn(`TMH_DEPS: Event '${receivedEventName}' FAILED verification.`);
        }
    }

    if (tmhDepsMet === dependenciesForTMH_Functional.length) {
        console.log('text_message_handler.ts: All core functional dependencies met. Initializing actual TextMessageHandler.');
        initializeActualTextMessageHandler();
    }
}

console.log('TMH_SETUP: Starting initial dependency pre-check for functional TextMessageHandler.');
tmhDepsMet = 0;
Object.keys(tmhMetDependenciesLog).forEach(key => tmhMetDependenciesLog[key] = false);
let tmhAllPreloadedAndVerified = true;

dependenciesForTMH_Functional.forEach((eventName: string) => {
    let isVerifiedNow = false;
    switch (eventName) {
        case 'uiUpdaterReady': 
            isVerifiedNow = !!(window.uiUpdater && typeof window.uiUpdater.appendToEmbeddedChatLog === 'function'); 
            break;
        case 'aiServiceReady': 
            isVerifiedNow = !!(window.aiService && typeof window.aiService.generateTextMessage === 'function'); 
            break;
        case 'conversationManagerReady': 
            isVerifiedNow = !!(window.conversationManager && typeof window.conversationManager.ensureConversationRecord === 'function'); 
            break;
        case 'domElementsReady': 
            isVerifiedNow = !!window.domElements; 
            break;
        case 'polyglotHelpersReady': 
            isVerifiedNow = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function'); 
            break;
        case 'aiApiConstantsReady': 
            isVerifiedNow = !!(window.aiApiConstants && window.aiApiConstants.PROVIDERS); 
            break;
        default: 
            console.warn(`TMH_PRECHECK: Unknown functional dependency: ${eventName}`); 
            break;
    }

    if (isVerifiedNow) {
        console.log(`TMH_PRECHECK: Functional Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!tmhMetDependenciesLog[eventName]) {
            tmhMetDependenciesLog[eventName] = true;
            tmhDepsMet++;
        }
    } else {
        tmhAllPreloadedAndVerified = false;
        console.log(`TMH_PRECHECK: Functional Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitTMH(eventName), { once: true });
    }
});

if (tmhAllPreloadedAndVerified && tmhDepsMet === dependenciesForTMH_Functional.length) {
    console.log('text_message_handler.ts: All functional dependencies ALREADY MET during pre-check. Initializing directly.');
    initializeActualTextMessageHandler();
} else if (!tmhAllPreloadedAndVerified && dependenciesForTMH_Functional.length > 0) {
    console.log(`text_message_handler.ts: Waiting for ${dependenciesForTMH_Functional.length - tmhDepsMet} functional dependency event(s).`);
} else if (dependenciesForTMH_Functional.length === 0) {
    console.log('text_message_handler.ts: No functional dependencies listed. Initializing directly.');
    initializeActualTextMessageHandler();
}

console.log("text_message_handler.ts: Script execution finished. Initialization is event-driven or direct.");