// src/js/core/voice_memo_handler.ts
// D:\polyglot_connect\src\js\core\voice_memo_handler.ts
import type {
    YourDomElements,
    UiUpdater,
    AIService,
    ConversationManager,
    ChatOrchestrator,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    Connector,
    ConversationRecordInStore,
    GeminiChatItem,
    ChatMessageOptions, 
         // <<< ADD THIS IMPORT
    GroupChatHistoryItem     // <<< ADD THIS IMPORT (or ensure it's correctly defined in global.d.ts)
} from '../types/global.d.ts';
import { uploadAudioToSupabase } from '../services/supabaseService'; // <<< ADD THIS LINE
console.log("voice_memo_handler.ts: Script execution STARTED (TS Version).");

export interface VoiceMemoHandlerModule {
    handleNewVoiceMemoInteraction: (
        targetType: string,
        micButtonElement: HTMLButtonElement | null,
        targetId: string | null,
        additionalContext?: any
    ) => void;
}

window.voiceMemoHandler = {} as VoiceMemoHandlerModule; // Assign placeholder
console.log('voice_memo_handler.ts: Placeholder assigned.');
document.dispatchEvent(new CustomEvent('voiceMemoHandlerStructuralReady')); // <<< DISPATCH STRUCTURAL
console.log('voice_memo_handler.ts: "voiceMemoHandlerStructuralReady" dispatched.');

function initializeActualVoiceMemoHandler(): void {
    console.log("voice_memo_handler.ts: initializeActualVoiceMemoHandler called.");

    const getSafeDeps = (): {
        uiUpdater: UiUpdater;
        aiService: AIService;
        conversationManager: ConversationManager;
        chatOrchestrator?: ChatOrchestrator;
        polyglotHelpers: PolyglotHelpers;
        domElements?: YourDomElements;
    } | null => {
        const deps = {
            uiUpdater: window.uiUpdater,
            aiService: window.aiService,
            conversationManager: window.conversationManager,
            chatOrchestrator: window.chatOrchestrator,
            polyglotHelpers: window.polyglotHelpers,
            domElements: window.domElements
        };
        const criticalKeys: (keyof Omit<typeof deps, 'chatOrchestrator' | 'domElements'>)[] = ['uiUpdater', 'aiService', 'conversationManager', 'polyglotHelpers'];
        for (const key of criticalKeys) {
            if (!deps[key]) {
                console.error(`VoiceMemoHandler (TS): Critical functional dependency window.${key} missing.`);
                return null;
            }
        }
        if (!deps.chatOrchestrator) console.warn("VoiceMemoHandler (TS): getSafeDeps - chatOrchestrator not available.");
        if (!deps.domElements) console.warn("VoiceMemoHandler (TS): getSafeDeps - domElements not available.");
        return deps as {
            uiUpdater: UiUpdater; aiService: AIService; conversationManager: ConversationManager;
            chatOrchestrator?: ChatOrchestrator; polyglotHelpers: PolyglotHelpers; domElements?: YourDomElements;
        };
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("VoiceMemoHandler (TS): Failed to resolve critical dependencies. Assigning dummy methods.");
        const dummyErrorFn = () => console.error("VoiceMemoHandler (TS) dummy: Method called on non-initialized module.");
        window.voiceMemoHandler = { handleNewVoiceMemoInteraction: dummyErrorFn };
        document.dispatchEvent(new CustomEvent('voiceMemoHandlerReady'));
        console.warn("voice_memo_handler.ts: 'voiceMemoHandlerReady' dispatched (INITIALIZATION FAILED - deps missing).");
        return;
    }
    console.log("VoiceMemoHandler (TS): Core functional dependencies appear ready for IIFE.");

    window.voiceMemoHandler = ((): VoiceMemoHandlerModule => {
        'use strict';
        console.log("voice_memo_handler.ts: IIFE (TS module definition) STARTING.");

        let mediaRecorder: MediaRecorder | null = null;
        let audioChunks: Blob[] = [];
        let currentRecordingTargetId: string | null = null;
        let currentRecordingUIContext: 'embedded' | 'modal' | 'group' | null = null;
        let currentMicButtonElement: HTMLButtonElement | null = null;
        let isCurrentlyRecording: boolean = false;

        const { uiUpdater, aiService, conversationManager, polyglotHelpers } = resolvedDeps;
        const getRuntimeDomElements = () => window.domElements;
        const getChatOrchestrator = () => window.chatOrchestrator;
        const getGroupDataManager = () => window.groupDataManager;
        const getGroupManager = () => window.groupManager;
        const getGroupInteractionLogic = () => (window as any).groupInteractionLogic as import('../types/global.d.ts').GroupInteractionLogic | undefined;

        const USER_NAME_PLACEHOLDER = "You";
        const USER_ID_PLACEHOLDER = "user_self_001";
        const SYSTEM_SPEAKER_ID_GROUP = "system_group_notifications";

        function updateMicButtonVisuals(state: 'listening' | 'processing' | 'idle' | 'error', text: string = ''): void {
            if (!currentMicButtonElement) return;
            currentMicButtonElement.classList.remove('listening', 'processing', 'error-state');
            currentMicButtonElement.disabled = false;
            let buttonContent = '';
            switch (state) {
                case 'listening':
                    currentMicButtonElement.classList.add('listening');
                    buttonContent = `<i class="fas fa-stop"></i> ${polyglotHelpers.sanitizeTextForDisplay(text) || 'Stop'}`;
                    currentMicButtonElement.title = "Tap to Stop Recording";
                    break;
                case 'processing':
                    currentMicButtonElement.classList.add('processing');
                    buttonContent = `<i class="fas fa-spinner fa-spin"></i> ${polyglotHelpers.sanitizeTextForDisplay(text) || 'Processing...'}`;
                    currentMicButtonElement.disabled = true;
                    currentMicButtonElement.title = "Processing Audio";
                    break;
                case 'error':
                    currentMicButtonElement.classList.add('error-state');
                    buttonContent = '<i class="fas fa-exclamation-triangle"></i> Error';
                    currentMicButtonElement.title = "Error with recording";
                    break;
                default: // idle
                    buttonContent = '<i class="fas fa-microphone"></i>';
                    currentMicButtonElement.title = "Send Voice Message";
                    break;
            }
            currentMicButtonElement.innerHTML = buttonContent;
        }

        // Helper to get the correct appendToLog function based on context
        function getLoggerForContext(context: 'embedded' | 'modal' | 'group' | null) {
            if (context === 'embedded') return uiUpdater.appendToEmbeddedChatLog;
            if (context === 'modal') return uiUpdater.appendToMessageLogModal;
            if (context === 'group') return uiUpdater.appendToGroupChatLog as (
                text: string, senderName: string, isUser: boolean, speakerId: string, options?: import('../types/global.d.ts').ChatMessageOptions
            ) => HTMLElement | null; // Cast for group log
            return null;
        }


      // D:\polyglot_connect\src\js\core\voice_memo_handler.ts
// Inside the IIFE: window.voiceMemoHandler = ((): VoiceMemoHandlerModule => { ... })();
// Ensure all dependencies (uiUpdater, aiService, conversationManager, polyglotHelpers, etc.)
// and helper constants (USER_NAME_PLACEHOLDER, etc.) are correctly defined and accessible in this scope.
async function processAndSendRecording(
    audioBlob: Blob,
    targetId: string,
    uiContext: 'embedded' | 'modal' | 'group'
): Promise<void> {
    const functionName = "VMH.processAndSendRecording";

    if (!resolvedDeps) {
        console.error(`${functionName}: resolvedDeps is null. Cannot proceed.`);
        updateMicButtonVisuals('error', 'Internal Error');
        return;
    }

    const appendToLog = getLoggerForContext(uiContext);
    const { polyglotHelpers: currentPolyglotHelpers, aiService, conversationManager } = resolvedDeps;

    console.log(`[VMH] ${functionName}: Processing for context '${uiContext}', targetId '${targetId}'. Blob size: ${audioBlob.size} bytes.`);

    // Generate messageId first, as it might be used for filename
    const messageId = currentPolyglotHelpers.generateUUID();
    const messageTimestamp = Date.now();
    let supabaseAudioUrl: string | null = null;
    let audioDataURLForSTT: string | null = null; // For STT if needed, can be local base64

    if (!audioBlob || audioBlob.size === 0) {
        console.warn(`[VMH] ${functionName}: audioBlob is invalid or empty. Aborting.`);
        updateMicButtonVisuals('error', 'Empty recording');
        return;
    }

    try {
        updateMicButtonVisuals('processing', 'Uploading...');
        console.log(`[VMH] ${functionName}: Attempting to upload audio to Supabase.`);
        const fileExtension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
        const supabaseFilePath = `${uiContext}/${targetId}/${messageId}.${fileExtension}`;
        
        supabaseAudioUrl = await uploadAudioToSupabase(audioBlob, supabaseFilePath);

        if (!supabaseAudioUrl) {
            console.error(`[VMH] ${functionName}: Supabase upload failed or returned no URL.`);
            throw new Error("Audio upload failed.");
        }
        console.log(`[VMH] ${functionName}: Supabase upload successful. URL: ${supabaseAudioUrl}`);
        
        // For STT, convert blob to base64 (if STT service requires it and can't take blob directly)
        // This local conversion is fine as it doesn't block UI for long
        updateMicButtonVisuals('processing', 'Transcribing...');
        audioDataURLForSTT = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => (typeof reader.result === 'string') ? resolve(reader.result) : reject(new Error("Invalid audio data from FileReader for STT"));
            reader.onerror = (err) => reject(new Error(`FileReader error for STT: ${err?.toString()}`));
            reader.readAsDataURL(audioBlob);
        });
        const base64AudioForSTT = audioDataURLForSTT.split(',')[1];

        if (!aiService?.transcribeAudioToText) {
            throw new Error("Transcription service (aiService.transcribeAudioToText) unavailable.");
        }
        if (!base64AudioForSTT) {
            throw new Error("Failed to get base64 audio data for transcription.");
        }

        let langHintForStt: string | undefined;
        if (uiContext === 'embedded' || uiContext === 'modal') {
            const connector = window.polyglotConnectors?.find(c => c.id === targetId);
            if (!connector) throw new Error(`Could not find connector object for target ID: ${targetId}`);
            await conversationManager.ensureConversationRecord(connector); // Ensure convo record exists
            langHintForStt = connector.language;
        } else if (uiContext === 'group') {
            const groupData = getGroupDataManager()?.getCurrentGroupData?.();
            if (!groupData?.language) throw new Error("Current group data or language not available for transcription hint.");
            langHintForStt = groupData.language;
        }

        const transcript = await aiService.transcribeAudioToText(base64AudioForSTT, audioBlob.type, langHintForStt);
        const actualTranscriptText = transcript?.trim() || "";
        console.log(`[VMH] ${functionName}: Transcription: "${actualTranscriptText.substring(0, 50)}...".`);

        // Log message for successful upload and transcription
        console.log(`[VMH] Voice memo uploaded to Supabase: ${supabaseAudioUrl}, Transcript: "${actualTranscriptText}"`);

        // --- Add to History & (conditionally) Update UI / Pass transcript for AI response ---
        if (uiContext === 'group') {
            const groupDataManager = getGroupDataManager();
            const currentGroupData = groupDataManager?.getCurrentGroupData?.();
            if (groupDataManager && currentGroupData?.id && groupDataManager.addMessageToFirestoreGroupChat) {
                console.log(`[VMH] ${functionName}: Sending voice memo (Supabase URL & transcript) to Firestore for group: ${currentGroupData.id}`);
                await groupDataManager.addMessageToFirestoreGroupChat(currentGroupData.id, {
                    appMessageId: messageId,
                    senderId: USER_ID_PLACEHOLDER,
                    senderName: USER_NAME_PLACEHOLDER,
                    text: actualTranscriptText, // Transcript
                    type: 'voice_memo',
                    content_url: supabaseAudioUrl, // <<< SAVE SUPABASE URL HERE
                });
                console.log(`[VMH] ${functionName}: Voice memo (Supabase URL & transcript) sent to Firestore for group ${currentGroupData.id}.`);
            } else {
                console.warn(`[VMH] ${functionName}: groupDataManager.addMessageToFirestoreGroupChat not available or no current group ID.`);
            }
            // UI update for groups is handled by Firestore listener in group_manager.ts
            // If GIL needs to react to the transcript:
            if (actualTranscriptText) {
                const groupInteractionLogic = getGroupInteractionLogic();
                if (groupInteractionLogic?.handleUserMessage) {
                    console.log(`[VMH] ${functionName}: Passing transcript to groupInteractionLogic.handleUserMessage for group AI/relay.`);
                    // Pass an empty object or specific options if GIL expects it
                    await groupInteractionLogic.handleUserMessage(actualTranscriptText, {});
                }
            }
        } else { // Embedded or Modal (1-on-1)
            // 1. Immediately append the user's voice memo to the UI
            if (appendToLog) { // appendToLog is already defined for the context
                const uiOptions: ChatMessageOptions = {
                    messageId: messageId,
                    timestamp: messageTimestamp,
                    isVoiceMemo: true,
                    audioSrc: supabaseAudioUrl, // The Supabase URL for the player
                    // Add other necessary fields like senderClass: 'user' if not handled by appendToLog
                };
                console.log(`[VMH] Appending user's voice memo (transcript: "${actualTranscriptText.substring(0,30)}...") to UI for context: ${uiContext}`);
                (appendToLog as Function)(actualTranscriptText, 'user', uiOptions);
            } else {
                console.warn(`[VMH] Logger function not found for UI context: ${uiContext}. Cannot append user's voice memo optimistically.`);
            }

            // 2. Now, call TextMessageHandler to get the AI's response
            //    and to save the user's voice memo to Firestore.
            const tmh = getChatOrchestrator()?.getTextMessageHandler?.();
            if (tmh) {
                const textMessageOptionsForTMH = {
                    skipUiAppend: true, // IMPORTANT: TMH should NOT re-append the user's message
                    isVoiceMemo: true,
                    // Pass the necessary data for TMH to save to Firestore via ConversationManager
                    audioSrc: supabaseAudioUrl, // For ConversationManager to put in content_url
                    messageId: messageId,     // For ConversationManager
                    timestamp: messageTimestamp // For ConversationManager
                };
                console.log(`[VMH] Calling TextMessageHandler for AI response. Context: ${uiContext}, Transcript: "${actualTranscriptText.substring(0,30)}..."`);
                
                if (uiContext === 'embedded' && tmh.sendEmbeddedTextMessage) {
                    // Pass `targetId` which is the connectorId for embedded 1-on-1
                    await tmh.sendEmbeddedTextMessage(actualTranscriptText, targetId, textMessageOptionsForTMH);
                } else if (uiContext === 'modal' && tmh.sendModalTextMessage) {
                    // For modal, targetId is also the connectorId. TMH needs the full connector object.
                    const connectorForModal = window.polyglotConnectors?.find(c => c.id === targetId);
                    if (connectorForModal) {
                        await tmh.sendModalTextMessage(actualTranscriptText, connectorForModal, textMessageOptionsForTMH);
                    } else {
                        console.error(`[VMH] Connector not found for modal voice memo (targetId: ${targetId}) to pass to TMH.`);
                        throw new Error(`Connector not found for modal voice memo (targetId: ${targetId}).`);
                    }
                } else {
                     console.error(`[VMH] Appropriate TextMessageHandler method not available for context: ${uiContext}`);
                     throw new Error(`Appropriate TextMessageHandler method not available for context: ${uiContext}`);
                }
            } else {
                console.error(`[VMH] TextMessageHandler not available for 1-on-1 chat context: ${uiContext}`);
                throw new Error(`TextMessageHandler not available for 1-on-1 chat context.`);
            }
        }
    } catch (error: any) {
        console.error(`[VMH] ${functionName}: Error during processing or sending: ${error.message}`, error);
        updateMicButtonVisuals('error', 'Processing failed');
        if (appendToLog) {
            const errorOptions: ChatMessageOptions = { isError: true, timestamp: messageTimestamp, messageId };
            const errorMessage = `Failed to process voice memo: ${error.message || "Unknown error"}`;
            if (uiContext === 'group') (appendToLog as Function)(errorMessage, USER_NAME_PLACEHOLDER, false, SYSTEM_SPEAKER_ID_GROUP, {...errorOptions, isSystemLikeMessage: true });
            else (appendToLog as Function)(errorMessage, 'system-error', errorOptions);
        }
    } finally {
        updateMicButtonVisuals('idle');
    }
}

        async function startRecording(targetId: string, uiContext: 'embedded' | 'modal' | 'group', micButtonElement: HTMLButtonElement): Promise<void> {
            if (isCurrentlyRecording) { console.warn("VMH: Already recording."); return; }
            currentRecordingTargetId = targetId;
            currentRecordingUIContext = uiContext; // Stored for use in onerror
            currentMicButtonElement = micButtonElement;
            audioChunks = [];
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia not supported.");
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
                if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(options.mimeType!)) {
                    delete options.mimeType;
                }
                mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) audioChunks.push(event.data); };
                mediaRecorder.onstop = async () => {
                    isCurrentlyRecording = false;
                    const localTargetId = currentRecordingTargetId;
                    const localUiContext = currentRecordingUIContext; // Use stored context
                    stream.getTracks().forEach(track => track.stop());
                    if (audioChunks.length === 0) { updateMicButtonVisuals('idle'); return; }
                    const audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
                    audioChunks = [];
                    if (localTargetId && localUiContext) {
                        await processAndSendRecording(audioBlob, localTargetId, localUiContext);
                    } else { updateMicButtonVisuals('error'); }
                };
                mediaRecorder.onerror = (event: Event) => { // This is where SYSTEM_SPEAKER_ID_GROUP was problematic
                    console.error("VMH: MediaRecorder onerror:", (event as any).error);
                    isCurrentlyRecording = false;
                    updateMicButtonVisuals('error');
                    stream.getTracks().forEach(track => track.stop());
                    const appendToLogOnError = getLoggerForContext(currentRecordingUIContext); // Use stored context
                    if (currentRecordingUIContext === 'group' && appendToLogOnError) {
                        (appendToLogOnError as Function)(`Recording error: ${(event as any).error?.name || "Unknown recording error"}`, "System", false, SYSTEM_SPEAKER_ID_GROUP, { isError: true });
                    } else if (appendToLogOnError) {
                         (appendToLogOnError as Function)(`Recording error: ${(event as any).error?.name || "Unknown recording error"}`, 'system-message', { isError: true });
                    }
                };
                mediaRecorder.start();
                isCurrentlyRecording = true;
                updateMicButtonVisuals('listening', 'Stop');
            } catch (err: any) {
                console.error("VMH: Error accessing microphone:", err.name, err.message);
                isCurrentlyRecording = false;
                updateMicButtonVisuals('error');
                const appendToLogOnError = getLoggerForContext(uiContext); // uiContext is from parameter here
                let userMessage = "Could not start recording. Check microphone access.";
                if (err.name === "NotFoundError") userMessage = "No microphone found.";
                else if (err.name === "NotAllowedError") userMessage = "Microphone access denied.";

                if (uiContext === 'group' && appendToLogOnError) {
                     (appendToLogOnError as Function)(polyglotHelpers.sanitizeTextForDisplay(userMessage), "System", false, SYSTEM_SPEAKER_ID_GROUP, {isError: true});
                } else if (appendToLogOnError) {
                    (appendToLogOnError as Function)(polyglotHelpers.sanitizeTextForDisplay(userMessage), 'system-message', {isError: true});
                }
            }
        }

        function stopRecording(): void {
            if (mediaRecorder && isCurrentlyRecording && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            } else {
                isCurrentlyRecording = false;
                updateMicButtonVisuals('idle');
            }
        }

        function handleNewVoiceMemoInteraction(
            targetType: string,
            micButtonElement: HTMLButtonElement | null,
            targetId: string | null,
            additionalContext?: any
        ): void {
            if (!targetId || !micButtonElement) {
                if (micButtonElement) updateMicButtonVisuals('error');
                return;
            }
            const uiContext = targetType as 'embedded' | 'modal' | 'group';
            if (uiContext !== 'embedded' && uiContext !== 'modal' && uiContext !== 'group') {
                if (micButtonElement) updateMicButtonVisuals('error'); return;
            }
            if (isCurrentlyRecording) stopRecording();
            else startRecording(targetId, uiContext, micButtonElement);
        }

        console.log("voice_memo_handler.ts: IIFE (TS Version) finished.");
        return { handleNewVoiceMemoInteraction };
    })();

    if (window.voiceMemoHandler && typeof window.voiceMemoHandler.handleNewVoiceMemoInteraction === 'function') {
        console.log("voice_memo_handler.ts: SUCCESSFULLY assigned and method verified.");
    } else {
        console.error("voice_memo_handler.ts: CRITICAL ERROR - window.voiceMemoHandler not correctly formed or handleNewVoiceMemoInteraction method missing.");
    }
    document.dispatchEvent(new CustomEvent('voiceMemoHandlerReady'));
    console.log("voice_memo_handler.ts: 'voiceMemoHandlerReady' event dispatched (status logged above).");
} // Correctly closes initializeActualVoiceMemoHandler

// Dependencies for VoiceMemoHandler (Functional Part)
const dependenciesForVMH_Functional = [
    'uiUpdaterReady',
    'aiServiceReady',
    'conversationManagerReady',
    'polyglotHelpersReady',
    'groupManagerReady',      // Added for groupData language hint and group message handling
    'groupDataManagerReady' // Added for group history
];
const vmhMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForVMH_Functional.forEach((dep: string) => vmhMetDependenciesLog[dep] = false);
let vmhDepsMetCount = 0;

function checkAndInitVMH(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'uiUpdaterReady':
                verified = !!(window.uiUpdater && typeof window.uiUpdater.appendToEmbeddedChatLog === 'function' && typeof window.uiUpdater.appendToGroupChatLog === 'function');
                break;
            case 'aiServiceReady':
                verified = !!(window.aiService && typeof window.aiService.transcribeAudioToText === 'function' && typeof window.aiService.generateTextMessage === 'function');
                break;
            case 'conversationManagerReady':
                verified = !!(window.conversationManager && typeof window.conversationManager.ensureConversationRecord === 'function' && typeof window.conversationManager.addMessageToConversation === 'function');
                break;
            case 'polyglotHelpersReady':
                verified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function');
                break;
            case 'groupManagerReady': // Check a key method
                verified = !!(window.groupManager && typeof window.groupManager.getCurrentGroupData === 'function');
                break;
            case 'groupDataManagerReady': // Check a key method
            verified = !!(window.groupDataManager && typeof window.groupDataManager.addMessageToFirestoreGroupChat === 'function' && typeof window.groupDataManager.getCurrentGroupData === 'function');
                break;
            default:
                console.warn(`VMH_EVENT: Unknown event ${receivedEventName}`);
                return;
        }

        if (verified && !vmhMetDependenciesLog[receivedEventName]) {
            vmhMetDependenciesLog[receivedEventName] = true;
            vmhDepsMetCount++;
            console.log(`VMH_DEPS: Event '${receivedEventName}' VERIFIED. Count: ${vmhDepsMetCount}/${dependenciesForVMH_Functional.length}`);
        } else if(!verified) {
            console.warn(`VMH_DEPS: Event '${receivedEventName}' FAILED verification.`);
        }
    }

    if (vmhDepsMetCount === dependenciesForVMH_Functional.length) {
        console.log('VoiceMemoHandler: All core functional dependencies met. Initializing actual VoiceMemoHandler.');
        initializeActualVoiceMemoHandler();
    }
}

console.log('VMH_SETUP: Starting initial dependency pre-check for functional VoiceMemoHandler.');
vmhDepsMetCount = 0;
Object.keys(vmhMetDependenciesLog).forEach(k => vmhMetDependenciesLog[k] = false);
let vmhAllPreloadedAndVerified = true;

dependenciesForVMH_Functional.forEach((eventName: string) => {
    let isVerified = false;
    switch(eventName) {
        case 'uiUpdaterReady':
            isVerified = !!(window.uiUpdater && typeof window.uiUpdater.appendToEmbeddedChatLog === 'function' && typeof window.uiUpdater.appendToGroupChatLog === 'function');
            break;
        case 'aiServiceReady':
            isVerified = !!(window.aiService && typeof window.aiService.transcribeAudioToText === 'function' && typeof window.aiService.generateTextMessage === 'function');
            break;
        case 'conversationManagerReady':
            isVerified = !!(window.conversationManager && typeof window.conversationManager.ensureConversationRecord === 'function' && typeof window.conversationManager.addMessageToConversation === 'function');
            break;
        case 'polyglotHelpersReady':
            isVerified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function');
            break;
        case 'groupManagerReady':
            isVerified = !!(window.groupManager && typeof window.groupManager.getCurrentGroupData === 'function');
            break;
        case 'groupDataManagerReady':
            isVerified = !!(window.groupDataManager && typeof window.groupDataManager.addMessageToFirestoreGroupChat === 'function' && typeof window.groupDataManager.getCurrentGroupData === 'function');
            break;
        default:
            console.warn(`VMH_PRECHECK: Unknown functional dependency: ${eventName}`);
            break;
    }

    if (isVerified) {
        console.log(`VMH_PRECHECK: Functional Dependency '${eventName}' ALREADY MET and verified.`);
        if(!vmhMetDependenciesLog[eventName]) {
            vmhMetDependenciesLog[eventName] = true;
            vmhDepsMetCount++;
        }
    } else {
        vmhAllPreloadedAndVerified = false;
        console.log(`VMH_PRECHECK: Functional Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitVMH(eventName), { once: true });
    }
});

if (vmhAllPreloadedAndVerified && vmhDepsMetCount === dependenciesForVMH_Functional.length) {
    console.log('VoiceMemoHandler: All functional dependencies pre-verified. Initializing directly.');
    initializeActualVoiceMemoHandler();
} else if (!vmhAllPreloadedAndVerified && dependenciesForVMH_Functional.length > 0) {
    console.log(`voice_memo_handler.ts: Waiting for ${dependenciesForVMH_Functional.length - vmhDepsMetCount} core functional dependencies.`);
} else if (dependenciesForVMH_Functional.length === 0) {
    console.log('VoiceMemoHandler: No functional dependencies listed. Initializing directly.');
    initializeActualVoiceMemoHandler();
}

console.log("voice_memo_handler.ts: Script execution FINISHED (TS Version)."); // This should be line 485.