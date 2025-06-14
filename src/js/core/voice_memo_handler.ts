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
    ChatMessageOptions,      // <<< ADD THIS IMPORT
    GroupChatHistoryItem     // <<< ADD THIS IMPORT (or ensure it's correctly defined in global.d.ts)
} from '../types/global.d.ts';

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

    if (!resolvedDeps) { // <<< ADD THIS CHECK
        console.error(`${functionName}: resolvedDeps is null. Cannot proceed.`);
        // Optionally, update mic button to idle or error state if applicable from this function
        // updateMicButtonVisuals('error', 'Internal Error');
        return;
    }

    const appendToLog = getLoggerForContext(uiContext);
    const { polyglotHelpers: currentPolyglotHelpers, aiService, conversationManager } = resolvedDeps; // Destructure safely now

    console.log(`${functionName}: Processing for context '${uiContext}', targetId '${targetId}'. Blob size: ${audioBlob.size}`);

    let audioDataURL: string | null = null;
    if (audioBlob && audioBlob.size > 0) { // Only create URL if blob is valid
        try {
            audioDataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject(new Error("FileReader did not return a string for audio blob."));
                    }
                };
                reader.onerror = (err) => reject(new Error(`FileReader error for audio blob: ${err?.toString()}`));
                reader.readAsDataURL(audioBlob);
            });
        } catch (e: any) {
            console.error(`${functionName}: Error creating data URL from audio blob: ${e.message}`);
            // audioDataURL will remain null
        }
    } else {
        console.warn(`${functionName}: audioBlob is invalid or empty. Cannot create audioDataURL.`);
    }


    try {
        updateMicButtonVisuals('processing', 'Transcribing...');
        if (!aiService?.transcribeAudioToText) {
            throw new Error("Transcription service (aiService.transcribeAudioToText) unavailable.");
        }

        // Get base64 for STT (can use audioDataURL if available, or re-read blob)
        const base64AudioForSTT = audioDataURL ? audioDataURL.split(',')[1] : await new Promise<string>((resolve, reject) => {
            if (!audioBlob || audioBlob.size === 0) reject(new Error("No audio blob for STT"));
            const reader = new FileReader();
            reader.onloadend = () => (typeof reader.result === 'string') ? resolve(reader.result.split(',')[1]) : reject(new Error("Invalid audio data from FileReader for STT"));
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        if (!base64AudioForSTT) {
            throw new Error("Failed to get base64 audio data for transcription.");
        }

        let transcript: string | null = null;
        let langHintForStt: string | undefined;

        if (uiContext === 'embedded' || uiContext === 'modal') {
            if (!conversationManager?.ensureConversationRecord) throw new Error("ConversationManager not available for 1-on-1 chat context.");
            const record = await conversationManager.ensureConversationRecord(targetId);
            const convo = record.conversation as ConversationRecordInStore | null;
            if (!convo || !convo.connector) throw new Error(`Invalid conversation or connector for target ID: ${targetId}`);
            langHintForStt = convo.connector.language;
        } else if (uiContext === 'group') {
            const groupData = getGroupDataManager()?.getCurrentGroupData?.();
            if (!groupData?.language) throw new Error("Current group data or language not available for transcription hint.");
            langHintForStt = groupData.language;
        }

        transcript = await aiService.transcribeAudioToText(base64AudioForSTT, audioBlob.type, langHintForStt);
        const actualTranscriptText = transcript?.trim() || "";
        const messageTimestamp = Date.now();
        const messageId = currentPolyglotHelpers.generateUUID(); // Use currentPolyglotHelpers from IIFE scope

        if (!actualTranscriptText && !audioDataURL) {
            const message = "Failed to process voice memo: No speech detected and audio player unavailable.";
            console.warn(`${functionName}: ${message}`);
            if (appendToLog) {
                const errorOptions: ChatMessageOptions = { isError: true, timestamp: messageTimestamp, messageId };
                if (uiContext === 'group') (appendToLog as Function)(message, USER_NAME_PLACEHOLDER, false, SYSTEM_SPEAKER_ID_GROUP, {...errorOptions, isSystemLikeMessage: true });
                else (appendToLog as Function)(message, 'system-message', errorOptions);
            }
            updateMicButtonVisuals('idle');
            return;
        }
        console.log(`${functionName}: Transcription: "${actualTranscriptText.substring(0, 50)}...". Audio URL available: ${!!audioDataURL}`);
        
        // --- Add to History & (conditionally) Update UI / Pass transcript for AI response ---
        if (uiContext === 'group') {
            const groupDataManager = getGroupDataManager();
            if (groupDataManager?.addMessageToCurrentGroupHistory) {
                groupDataManager.addMessageToCurrentGroupHistory({
                    speakerId: USER_ID_PLACEHOLDER,
                    speakerName: USER_NAME_PLACEHOLDER,
                    text: actualTranscriptText, // The transcript
                    timestamp: messageTimestamp,
                    isVoiceMemo: !!audioDataURL,
                    audioBlobDataUrl: audioDataURL, // The audio data
                    messageId: messageId
                });
                // This save *should* trigger a UI refresh that renders the new voice memo from history.
                // group_ui_handler.showGroupChatView iterates history and renders voice memos correctly.
                console.log(`${functionName}: Added to group history. Attempting to save and trigger UI refresh for group.`);
                groupDataManager.saveCurrentGroupChatHistory?.(true); // Pass true to signal UI update needed
            
            // VVVVV ADD THIS BLOCK VVVVV
            const currentGroupUiHandler = window.groupUiHandler as import('../types/global.d.ts').GroupUiHandler | undefined;
            const currentGroupData = groupDataManager.getCurrentGroupData?.();
            const currentGroupMembers = window.groupManager?.getFullCurrentGroupMembers?.() || []; // Get members
            const updatedHistory = groupDataManager.getLoadedChatHistory?.() || [];

            if (currentGroupUiHandler?.showGroupChatView && currentGroupData) {
                console.log(`${functionName}: Explicitly calling groupUiHandler.showGroupChatView to refresh main chat log.`);
                currentGroupUiHandler.showGroupChatView(currentGroupData, currentGroupMembers, updatedHistory);
            } else {
                console.warn(`${functionName}: Could not explicitly refresh group chat view (groupUiHandler or groupData missing).`);
            }
            // ^^^^^ ADD THIS BLOCK ^^^^^
            
            
            } else {
                console.warn(`${functionName}: groupDataManager.addMessageToCurrentGroupHistory not available.`);
            }

            if (actualTranscriptText) {
                const groupInteractionLogic = getGroupInteractionLogic();
                if (groupInteractionLogic?.handleUserMessage) {
                    console.log(`${functionName}: Passing transcript to groupInteractionLogic.handleUserMessage for group AI/relay.`);
                    await groupInteractionLogic.handleUserMessage(actualTranscriptText);
                } else {
                    console.warn(`${functionName}: GroupInteractionLogic.handleUserMessage not available.`);
                }
            } else {
                 console.warn(`${functionName}: No transcript obtained for group, AI response will not be triggered through groupInteractionLogic.`);
            }

        } else { // Embedded or Modal (1-on-1)
            // For 1-on-1, we directly append the user's voice memo UI first.
            if (appendToLog) {
                const uiOptions: ChatMessageOptions = {
                    timestamp: messageTimestamp,
                    messageId: messageId,
                    isVoiceMemo: !!audioDataURL,
                    audioSrc: audioDataURL || undefined,
                };
                console.log(`${functionName}: Appending user voice memo directly to UI for context: ${uiContext}`);
                (appendToLog as Function)(actualTranscriptText, 'user', uiOptions);
            }

            // Then, pass to TextMessageHandler to handle history and AI response for 1-on-1.
            const tmh = getChatOrchestrator()?.getTextMessageHandler?.();
            if (tmh) {
                const textMessageOptions = {
                    skipUiAppend: true, // TMH should not re-append the user's message UI
                    isVoiceMemo: !!audioDataURL,
                    audioBlobDataUrl: audioDataURL,
                    messageId: messageId,
                    timestamp: messageTimestamp
                };
                if (uiContext === 'embedded' && tmh.sendEmbeddedTextMessage) {
                    console.log(`${functionName}: Passing to tmh.sendEmbeddedTextMessage for embedded context.`);
                    await tmh.sendEmbeddedTextMessage(actualTranscriptText, targetId, textMessageOptions);
                } else if (uiContext === 'modal' && tmh.sendModalTextMessage) {
                    const connectorForModal = conversationManager.getConversationById(targetId)?.connector;
                    if (connectorForModal) {
                        console.log(`${functionName}: Passing to tmh.sendModalTextMessage for modal context.`);
                        await tmh.sendModalTextMessage(actualTranscriptText, connectorForModal, textMessageOptions);
                    } else {
                        console.error(`${functionName}: Connector not found for modal voice memo to pass to TMH.`);
                        throw new Error("Connector not found for modal voice memo.");
                    }
                } else {
                     console.error(`${functionName}: Appropriate TextMessageHandler method not available for context: ${uiContext}`);
                     throw new Error("Appropriate TextMessageHandler method not available.");
                }
            } else {
                console.error(`${functionName}: TextMessageHandler not available for 1-on-1 chat context: ${uiContext}`);
                throw new Error("TextMessageHandler not available for 1-on-1 chat context.");
            }
        }} catch (error: any) {
            // ... (existing catch block) ...
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
                verified = !!(window.groupDataManager && typeof window.groupDataManager.addMessageToCurrentGroupHistory === 'function');
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
            isVerified = !!(window.groupDataManager && typeof window.groupDataManager.addMessageToCurrentGroupHistory === 'function');
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