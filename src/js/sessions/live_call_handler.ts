// src/js/sessions/live_call_handler.ts


import type { GeminiLiveApiServiceModule } from '../services/gemini_live_api_service'; // Adjust path if necessary
import type {
    Connector,
    YourDomElements,
    UiUpdater,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    GeminiLiveApiService,
    SessionStateManager,
    ModalHandler,
    SharedContent,
    Minigame,
    LiveApiMicInput,
    LiveApiAudioOutput,
    LiveApiTextCoordinator,
    TutorImage,
    TranscriptTurn,
    AIService // <<< ADD THIS LINE
} from '../types/global.d.ts';

import { buildLiveApiSystemInstructionForConnector, LiveApiSystemInstruction } from './live_call_prompt_builder';

console.log("live_call_handler.ts: Script execution STARTED (TS Facade - Test 8 setup).");
const LCH_FACADE_VERSION = "TS v0.2 - Test 8 setup";

if ((window as any).liveCallHandler) {
    console.warn("live_call_handler.ts: window.liveCallHandler ALREADY DEFINED.");
}

export interface LiveCallHandlerModule {
    startLiveCall: (connector: Connector, sessionType: string) => Promise<boolean>;
    endLiveCall: (generateRecap?: boolean) => void;
    sendTypedTextDuringLiveCall?: (text: string) => void;
    toggleMicMuteForLiveCall: () => void;
    toggleSpeakerMuteForLiveCall: () => void;
    requestActivityForLiveCall?: () => void;
}
interface LiveCallHandlerDeps {
    domElements?: YourDomElements;
    uiUpdater?: UiUpdater;
    polyglotHelpers?: PolyglotHelpers;
    geminiLiveApiService?: GeminiLiveApiServiceModule;
    sessionStateManager?: SessionStateManager;
    modalHandler?: ModalHandler;
    polyglotSharedContent?: SharedContent;
    polyglotMinigamesData?: Minigame[];
    liveApiMicInput?: LiveApiMicInput;
    liveApiAudioOutput?: LiveApiAudioOutput;
    liveApiTextCoordinator?: LiveApiTextCoordinator;
    aiService?: AIService; // <<< ADD THIS LINE
}
// --- INTERFACE DEFINITIONS FOR Test 8 ---
// These match the structure that worked with your old JS version

interface LiveApiSpeechConfig {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
    languageCode: string;
}

interface LiveApiGenerationConfig { // This is the nested config
    responseModalities: string[];
    speechConfig: LiveApiSpeechConfig;
    temperature?: number;
}

interface LiveApiRealtimeInputConfig {
    activityHandling: string;
}

// This is the main config object live_call_handler creates
interface LiveApiSessionSetupConfig { // Object LCH creates
    systemInstruction: LiveApiSystemInstruction;
    generationConfig: LiveApiGenerationConfig; // <<< NESTED
    realtimeInputConfig: LiveApiRealtimeInputConfig;
    inputAudioTranscription: object;
    outputAudioTranscription: object;
    // NO tools property for this test
}


// Callbacks passed to gemini_live_api_service
interface LiveApiCallbacks {
    onOpen: () => void;
    onAiAudioChunk: (audioChunk: ArrayBuffer, mimeType: string) => void;
    onAiText: (text: string) => void;
    onUserTranscription: (text: string, isFinal: boolean) => void;
    onModelTranscription: (text: string, isFinal: boolean) => void;
    onAiInterrupted: () => void;
    onError: (error: Error | any) => void;
    onClose: (wasClean: boolean, code: number, reason: string) => void;
}
// --- END OF INTERFACE DEFINITIONS FOR Test 8 ---


window.liveCallHandler = ((): LiveCallHandlerModule => {
    'use strict';
    let isClosingCall: boolean = false;
    console.log(`live_call_handler.ts: IIFE (TS Facade ${LCH_FACADE_VERSION}) STARTING.`);

    const getDeps = (functionName: string = "liveCallHandler internal"): LiveCallHandlerDeps => {
        const deps: LiveCallHandlerDeps = {
            domElements: window.domElements,
            uiUpdater: window.uiUpdater,
            polyglotHelpers: window.polyglotHelpers,
            geminiLiveApiService: window.geminiLiveApiService,
            sessionStateManager: window.sessionStateManager,
            modalHandler: window.modalHandler,
            polyglotSharedContent: window.polyglotSharedContent,
            polyglotMinigamesData: window.polyglotMinigamesData,
            liveApiMicInput: window.liveApiMicInput,
            liveApiAudioOutput: window.liveApiAudioOutput,
            liveApiTextCoordinator: window.liveApiTextCoordinator,
            aiService: window.aiService // Add aiService to the dependencies
        };
        return deps;
    };

    let currentConnector: Connector | null = null;
    let currentSessionType: string | null = null;
    let isMicEffectivelyMuted: boolean = true;
    let isAiSpeakerMuted: boolean = false;

    function initializeCallUI(connector: Connector | null, sessionType: string | null): void {
        const functionName = "initializeCallUI (TS)";
        const { uiUpdater, domElements, modalHandler } = getDeps(functionName);

        if (!connector || !sessionType || !domElements || !uiUpdater || !modalHandler) {
            console.error(`LCH Facade (${functionName}): Missing critical args or UI deps. Cannot initialize UI.`);
            return;
        }
        let modalToOpenId: keyof YourDomElements | null = null;
        let modalElement: HTMLElement | null = null;

        if (sessionType === "direct_modal") {
            modalToOpenId = 'directCallInterface';
            modalElement = domElements.directCallInterface;
            if (!modalElement) { console.error(`LCH Facade (${functionName}): domElements.directCallInterface missing!`); return; }

            uiUpdater.updateDirectCallHeader?.(connector);
            uiUpdater.clearDirectCallActivityArea?.();
            uiUpdater.updateDirectCallStatus?.("Live Call Connected", false);
            uiUpdater.updateDirectCallMicButtonVisual?.(isMicEffectivelyMuted);
            uiUpdater.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
        } else if (sessionType === "voiceChat_modal") {
            console.warn(`LCH Facade (${functionName}): UI Initialization for "voiceChat_modal" not fully implemented yet.`);
        }

        if (modalElement && modalHandler.open) {
            modalHandler.open(modalElement);
            console.log(`LCH Facade (${functionName}): Opened modal for key '${String(modalToOpenId)}'.`);
        } else if (modalToOpenId) {
            console.error(`LCH Facade (${functionName}): Modal element for key '${String(modalToOpenId)}' not found OR modalHandler.open missing.`);
        }
    }
// D:\polyglot_connect\src\js\sessions\live_call_handler.ts

// Ensure 'LiveApiSystemInstruction' and 'buildLiveApiSystemInstructionForConnector' are correctly imported
// Ensure 'Connector' and other types from global.d.ts are imported at the top of this file.
// Ensure 'LiveCallHandlerDeps', 'LiveApiCallbacks', and 'LiveCallHandlerModule' interfaces are defined correctly in this file.

// Inside window.liveCallHandler = ((): LiveCallHandlerModule => { ... })();

async function startLiveCall(connector: Connector, sessionType: string): Promise<boolean> {
    const functionName = "startLiveCall (TS)";
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): TRYING TO START - Connector: ${connector?.id}, Type: ${sessionType}`);
    const deps = getDeps(functionName);

    // Dependency checks
    const requiredDepNames: (keyof LiveCallHandlerDeps)[] = ['geminiLiveApiService', 'sessionStateManager', 'liveApiMicInput', 'liveApiAudioOutput', 'liveApiTextCoordinator', 'uiUpdater', 'domElements', 'modalHandler', 'polyglotHelpers'];
    for (const depName of requiredDepNames) {
        if (!deps[depName]) {
            console.error(`LCH Facade (${functionName}): ABORT! CRITICAL DEPENDENCY '${depName}' IS MISSING.`);
            alert(`Live call error: Component '${depName}' missing (LCH-TS-S01).`);
            // Ensure sessionStateManager and resetBaseSessionState are callable before using them
            if (deps.sessionStateManager && typeof deps.sessionStateManager.resetBaseSessionState === 'function') {
                deps.sessionStateManager.resetBaseSessionState();
            }
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            }
            return false; // Must return boolean
        }
        if (['liveApiMicInput', 'liveApiAudioOutput', 'liveApiTextCoordinator'].includes(depName)) {
            const subModule = deps[depName as 'liveApiMicInput' | 'liveApiAudioOutput' | 'liveApiTextCoordinator'];
            if (typeof subModule?.initialize !== 'function') {
                 console.error(`LCH Facade (${functionName}): ABORT! Sub-module '${depName}' MISSING 'initialize' METHOD.`);
                 alert(`Live call error: Sub-component '${depName}' broken (LCH-TS-S02).`);
                 if (deps.sessionStateManager && typeof deps.sessionStateManager.resetBaseSessionState === 'function') {
                     deps.sessionStateManager.resetBaseSessionState();
                 }
                 if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                     deps.modalHandler.close(deps.domElements.virtualCallingScreen);
                 }
                 return false; // Must return boolean
            }
        }
    }
    console.log(`LCH Facade (${functionName}): All critical dependencies appear present.`);

    // Non-null assertions because we checked them above
    const liveApiMicInput = deps.liveApiMicInput!;
    const liveApiAudioOutput = deps.liveApiAudioOutput!;
    const liveApiTextCoordinator = deps.liveApiTextCoordinator!;
    const sessionStateManager = deps.sessionStateManager!;
    const geminiLiveApiService = deps.geminiLiveApiService!;

    console.log(`LCH Facade (${functionName}): Initializing sub-modules...`);
    if (!liveApiMicInput.initialize(geminiLiveApiService, () => isMicEffectivelyMuted)) {
        console.error("LCH: liveApiMicInput.initialize failed"); return false;
    }
    if (!liveApiAudioOutput.initialize(() => isAiSpeakerMuted)) {
        console.error("LCH: liveApiAudioOutput.initialize failed"); return false;
    }
    if (!liveApiTextCoordinator.initialize(sessionStateManager, deps.polyglotHelpers!, deps.uiUpdater!)) {
        console.error("LCH: liveApiTextCoordinator.initialize failed"); return false;
    }
    liveApiTextCoordinator.setCurrentSessionTypeContext(sessionType);
    liveApiTextCoordinator.resetBuffers();
    console.log(`LCH Facade (${functionName}): Sub-modules initialized.`);

    currentConnector = connector;
    currentSessionType = sessionType;
    isMicEffectivelyMuted = false; // Default to unmuted for new call
    isAiSpeakerMuted = false;    // Default to unmuted for new call
    console.log(`LCH Facade (${functionName}): Facade state set. MicMuted: ${isMicEffectivelyMuted}, SpeakerMuted: ${isAiSpeakerMuted}`);

    if (!sessionStateManager.initializeBaseSession(connector, sessionType)) {
        console.error("LCH: sessionStateManager.initializeBaseSession failed");
        // Potentially close virtual calling screen if opened by initializeBaseSession
         if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
            deps.modalHandler.close(deps.domElements.virtualCallingScreen);
        }
        return false; // Must return boolean
    }
    console.log(`LCH Facade (${functionName}): sessionStateManager.initializeBaseSession successful.`);

    let systemInstructionObject: LiveApiSystemInstruction;
    try {
        systemInstructionObject = await buildLiveApiSystemInstructionForConnector(connector);
        if (!systemInstructionObject?.parts?.[0]?.text?.trim()) {
            throw new Error("Invalid system instruction: empty or whitespace text from prompt builder.");
        }
        console.log(`LCH Facade (${functionName}): Using DYNAMIC system instruction.`);
    } catch (promptError: any) {
        console.error(`LCH Facade (${functionName}): Error building system instruction:`, promptError.message, promptError);
        systemInstructionObject = { parts: [{ text: "You are a helpful assistant. Please be concise." }] };
        console.warn(`LCH Facade (${functionName}): Using fallback system instruction due to error.`);
    }

    const primaryConnectorLanguage = connector.language || "English";
    const langInfo = connector.languageSpecificCodes?.[primaryConnectorLanguage];
    let liveApiModelName = connector.liveApiModelName || "gemini-2.0-flash-live-001"; // Corrected from your snippet's re-declaration

    let speechLanguageCodeForApi: string;
    let voiceNameToUseForApi: string;

    if (langInfo?.liveApiSpeechLanguageCodeOverride) {
        speechLanguageCodeForApi = langInfo.liveApiSpeechLanguageCodeOverride;
        console.log(`LCH Facade (${functionName}): Using SPEECH LANGUAGE OVERRIDE: '${speechLanguageCodeForApi}' for connector ${connector.id} (primary lang: '${primaryConnectorLanguage}').`);

        // Determine voice for the override language
        const overrideLangKey = speechLanguageCodeForApi.startsWith("en") ? "English" : speechLanguageCodeForApi; // Simple mapping for English
        const overrideVoiceInfo = connector.languageSpecificCodes?.[overrideLangKey];

        if (overrideVoiceInfo?.liveApiVoiceName) {
            voiceNameToUseForApi = overrideVoiceInfo.liveApiVoiceName;
        } else if (speechLanguageCodeForApi.startsWith("en") && connector.languageSpecificCodes?.["English"]?.liveApiVoiceName) { // More specific check for "English" key
            voiceNameToUseForApi = connector.languageSpecificCodes["English"].liveApiVoiceName;
        }
         else {
            voiceNameToUseForApi = "Puck"; // Fallback voice
            console.warn(`LCH Facade (${functionName}): No specific voice found for override language '${speechLanguageCodeForApi}'. Defaulting to '${voiceNameToUseForApi}'.`);
        }
        console.log(`LCH Facade (${functionName}): Voice for overridden speech language ('${speechLanguageCodeForApi}') set to '${voiceNameToUseForApi}'.`);
    } else {
        speechLanguageCodeForApi = langInfo?.languageCode || connector.languageCode || "en-US";
        voiceNameToUseForApi = langInfo?.liveApiVoiceName || "Puck";
        if (!langInfo?.languageCode || !langInfo?.liveApiVoiceName) {
            console.warn(`LCH Facade (${functionName}): Connector ${connector.id} (lang: '${primaryConnectorLanguage}') might be missing 'languageCode' or 'liveApiVoiceName' in its primary languageSpecificCodes entry. Using fallbacks: API Speech Lang='${speechLanguageCodeForApi}', API Voice='${voiceNameToUseForApi}'. This might lead to 'Unsupported language' if '${speechLanguageCodeForApi}' is not supported by the live model.`);
        }
    }

    console.log(`LCH Facade (${functionName}): Final System Instruction (AI to respond textually in ${primaryConnectorLanguage}): "${systemInstructionObject.parts[0].text.substring(0, 70)}..."`);
    console.log(`LCH Facade (${functionName}): Final Live API Model: '${liveApiModelName}'`);
    console.log(`LCH Facade (${functionName}): Final Voice Name SENT TO API: '${voiceNameToUseForApi}', Speech Language Code SENT TO API: '${speechLanguageCodeForApi}'`);

    const sessionConfigForService: any = {
        systemInstruction: systemInstructionObject,
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceNameToUseForApi } },
                languageCode: speechLanguageCodeForApi
            },
        },
        realtimeInputConfig: { activityHandling: "START_OF_ACTIVITY_INTERRUPTS" },
        inputAudioTranscription: {},
        outputAudioTranscription: {}
    };
    console.log(`LCH Facade (${functionName}): Session Config being sent to service:`, JSON.stringify(sessionConfigForService).substring(0, 400) + "...");

    const liveApiCallbacks: LiveApiCallbacks = {
        onOpen: handleLiveApiSessionOpen,
        onAiAudioChunk: liveApiAudioOutput.handleReceivedAiAudioChunk,
        onAiText: liveApiTextCoordinator.handleReceivedAiText,
        onUserTranscription: liveApiTextCoordinator.handleReceivedUserTranscription,
        onModelTranscription: liveApiTextCoordinator.handleReceivedModelTranscription,
        onAiInterrupted: handleAiInterrupted,
        onError: handleLiveApiError,
        onClose: handleLiveApiClose
    };
    console.log(`LCH Facade (${functionName}): Callbacks defined.`);
    console.log(`LCH Facade (${functionName}): CONFIG PASSED TO SERVICE Connect: Model='${liveApiModelName}', sessionConfigForService=`, JSON.stringify(sessionConfigForService));

    try {
        console.log(`LCH Facade (${functionName}): Attempting geminiLiveApiService.connect...`);
        const connectResult = await geminiLiveApiService.connect(liveApiModelName, sessionConfigForService, liveApiCallbacks);
        console.log(`LCH Facade (${functionName}): connectResult from service: ${!!connectResult}`);
        if (connectResult) { // Assuming connectResult is boolean or truthy/falsy
            console.log(`LCH Facade (${functionName}): Connect process INITIATED by service.`);
            return true; // Must return boolean
        } else {
            throw new Error("geminiLiveApiService.connect returned falsy or failed.");
        }
    } catch (error: any) {
        console.error(`LCH Facade (${functionName}): ABORT! Error DURING geminiLiveApiService.connect call:`, error.message, error);
        // Ensure uiUpdater and updateDirectCallStatus are callable
        if (deps.uiUpdater && typeof deps.uiUpdater.updateDirectCallStatus === 'function') {
            deps.uiUpdater.updateDirectCallStatus("Connection Failed", true);
        }
        if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
            deps.modalHandler.close(deps.domElements.virtualCallingScreen);
        }
        // Ensure sessionStateManager and recordFailedCallAttempt are callable
        if (sessionStateManager && typeof sessionStateManager.recordFailedCallAttempt === 'function' && connector) {
            let failureReason = "could not connect";
            if (error?.message) {
                if (error.message.toLowerCase().includes("sdk instance") || error.message.toLowerCase().includes("api key")) failureReason = "due to an SDK/API key issue";
                else if (error.message.toLowerCase().includes("returned falsy")) failureReason = "service indicated failure";
            }
            sessionStateManager.recordFailedCallAttempt(connector, failureReason);
        } else if (sessionStateManager && typeof sessionStateManager.resetBaseSessionState === 'function') {
            sessionStateManager.resetBaseSessionState();
        }
        return false; // Must return boolean
    }
} // End of startLiveCall
   // REPLACE LANDMARK 2 WITH THIS NEW ASYNC VERSION:
// =================== START: REPLACEMENT FOR endLiveCall ===================
// REPLACE LANDMARK 4 WITH THIS NEW ASYNC VERSION:
// =================== START: REPLACEMENT FOR endLiveCall ===================
// IN live_call_handler.ts
// REPLACE THE ENTIRE endLiveCall FUNCTION WITH THIS:
// =================== START: REPLACEMENT ===================
async function endLiveCall(generateRecap: boolean = true): Promise<void> {
    const functionName = "endLiveCall (TS Synchronous)";
    if (isClosingCall) return;
    isClosingCall = true;
    const deps = getDeps(functionName);

    // --- STEP 1: IMMEDIATE UI/CONNECTION CLEANUP ---
    console.log(`LCH Facade (${functionName}): Prioritizing immediate UI close.`);
    if (deps.domElements?.directCallInterface) deps.modalHandler?.close(deps.domElements.directCallInterface);
   
    if (deps.domElements?.processingCallModal) deps.modalHandler?.open(deps.domElements.processingCallModal);

    const stepEl = document.getElementById('processing-call-step');
if (stepEl) stepEl.textContent = 'Cleaning up transcript...';
    
    console.log(`LCH Facade (${functionName}): "Processing" modal opened.`);
   
   
   
    deps.geminiLiveApiService?.closeConnection?.("User ended call");






    deps.liveApiMicInput?.stopCapture?.();
    deps.liveApiAudioOutput?.cleanupAudioContext?.();

    // --- STEP 2: GET RAW DATA & PREPARE FOR PROCESSING ---
    const rawTranscript = deps.sessionStateManager?.getRawTranscript?.();
    const connectorForProcessing = currentConnector;

    // --- STEP 3: CLEAN TRANSCRIPT **ONCE** AND STORE IT ---
    let cleanedTranscript: string | null = null;
    if (rawTranscript && rawTranscript.length > 0 && connectorForProcessing && deps.aiService?.cleanAndReconstructTranscriptLLM) {
        try {
            console.log(`LCH (${functionName}): Cleaning transcript...`);
            cleanedTranscript = await deps.aiService.cleanAndReconstructTranscriptLLM(rawTranscript, connectorForProcessing, "User");
            console.log(`%c[LCH -> Scribe Handoff] Preparing to send cleaned transcript to Cerebrum.`, 'color: #fd7e14; font-weight: bold;');
            console.log(`[LCH -> Scribe Handoff] Data being sent:`, cleanedTranscript);
          
          
            console.log(`LCH (${functionName}): Transcript cleaned successfully.`);
        } catch (e) {
            console.error(`LCH (${functionName}): Transcript cleaning failed.`, e);
        }
    }

    // --- STEP 4: FINALIZE SESSION (Passes cleaned transcript to recap service) ---
    // This clears the session state and starts the recap process.
    deps.sessionStateManager?.finalizeBaseSession?.(generateRecap, rawTranscript, cleanedTranscript);

    // --- STEP 5: PROCESS MEMORY (Passes cleaned transcript to The Scribe) ---
    if (cleanedTranscript && connectorForProcessing && window.memoryService?.processNewUserMessage) {
        console.log(`[CEREBRUM_CALL_SAVE] Starting memory processing. Awaiting completion...`);
        // We now AWAIT this call to ensure memory is saved before anything else happens.
        await window.memoryService.processNewUserMessage(
            cleanedTranscript,
            connectorForProcessing.id,
            'live_call'
        );
        console.log(`[CEREBRUM_CALL_SAVE] ✅ Memory processing complete.`);
    } else {
        console.log(`[CEREBRUM_CALL_SAVE] Skipping memory processing: no cleaned transcript.`);
    }

    // --- STEP 6: RESET LOCAL STATE ---
    currentConnector = null;
    currentSessionType = null;
    isClosingCall = false;
    console.log(`LCH Facade (${functionName}): FINISHED.`);
}
// ===================  END: REPLACEMENT  ===================
// ===================  END: REPLACEMENT FOR endLiveCall  ===================

    function sendTypedTextDuringLiveCall(text: string): void {
        const functionName = "sendTypedTextDuringLiveCall (TS)";
        const deps = getDeps(functionName);
        if (!text?.trim() || !deps.geminiLiveApiService?.sendClientText || !deps.liveApiTextCoordinator?.handleUserTypedText) return;
        if (!deps.sessionStateManager?.isSessionActive()) return;

        if ((currentSessionType === "direct_modal" || currentSessionType === "voiceChat_modal") && deps.uiUpdater?.appendToVoiceChatLog) {
            deps.uiUpdater.appendToVoiceChatLog(text, 'user');
        }
        deps.liveApiTextCoordinator.handleUserTypedText(text);
        deps.geminiLiveApiService.sendClientText(text);
    }

    function toggleMicMuteForLiveCall(): void {
        const functionName = "toggleMicMuteForLiveCall (TS)";
        const deps = getDeps(functionName);
        isMicEffectivelyMuted = !isMicEffectivelyMuted;
        console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Mic muted: ${isMicEffectivelyMuted}`);
        if (currentSessionType === "direct_modal") {
            deps.uiUpdater?.updateDirectCallMicButtonVisual?.(isMicEffectivelyMuted);
            deps.uiUpdater?.updateDirectCallStatus?.(isMicEffectivelyMuted ? "Microphone OFF" : "Microphone ON", false);
        }
               if (isMicEffectivelyMuted) {
             // deps.geminiLiveApiService?.sendAudioStreamEndSignal?.(); // No direct equivalent in startChat model
        }
    }

    function toggleSpeakerMuteForLiveCall(): void {
        const functionName = "toggleSpeakerMuteForLiveCall (TS)";
        const deps = getDeps(functionName);
        isAiSpeakerMuted = !isAiSpeakerMuted;
        console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Speaker muted: ${isAiSpeakerMuted}`);
        if (currentSessionType === "direct_modal") deps.uiUpdater?.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
        if (isAiSpeakerMuted) {
            deps.liveApiAudioOutput?.stopCurrentSound?.();
            deps.liveApiAudioOutput?.clearPlaybackQueue?.();
        }
    }

    function requestActivityForLiveCall(): void {
        const functionName = "requestActivityForLiveCall (TS)";
        const deps = getDeps(functionName);

        if (!currentConnector || !deps.geminiLiveApiService?.sendClientText || !deps.polyglotSharedContent?.tutorImages || !deps.polyglotMinigamesData) {
            console.warn(`LCH Facade (${functionName}): Missing currentConnector or critical dependencies for activity.`);
            return;
        }
        const currentLanguage = currentConnector.language;
        if (!currentLanguage) { /* ... */ return; }
        const isTutor = currentConnector.languageRoles?.[currentLanguage]?.includes('tutor');
        if (!isTutor || !currentConnector.tutorMinigameImageFiles?.length) { /* ... */ return; }
        const filename = currentConnector.tutorMinigameImageFiles[Math.floor(Math.random() * currentConnector.tutorMinigameImageFiles.length)];
        const imgInfo = deps.polyglotSharedContent.tutorImages.find(img => img.file === filename);
        if (!imgInfo) { /* ... */ return; }
        const game = deps.polyglotMinigamesData.find(mg => imgInfo.suitableGames.includes(mg.id)) ||
                     deps.polyglotMinigamesData.find(g => g.id === "describe_scene") ||
                     { id: "describe_scene", title: "Describe Scene", instruction: "Please describe what you see in this image.", userPromptSuggestion: "I see..." };
        const instructionText = `Let's play a game: ${game.title}. ${game.instruction} Look at this image: ${imgInfo.file}. You can start.`;
        const imagePathForDisplay = (imgInfo as TutorImage & { path?: string }).path || `images/tutor_minigames/${imgInfo.file}`;

        if (deps.uiUpdater?.showImageInDirectCall) {
             deps.uiUpdater.showImageInDirectCall(imagePathForDisplay);
         } else {
             console.warn(`LCH Facade (${functionName}): uiUpdater.showImageInDirectCall is not defined.`);
         }
         deps.geminiLiveApiService.sendClientText(instructionText);
         console.log(`LCH Facade (${functionName}): Activity requested - ${game.title} with ${imgInfo.file}`);
    }

   
function handleLiveApiSessionOpen(): void {
    const functionName = "handleLiveApiSessionOpen (TS)";
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Call session FULLY OPEN.`);
    const deps = getDeps(functionName);

    // 1. Close the "Calling..." screen
    if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
        deps.modalHandler.close(deps.domElements.virtualCallingScreen);
        console.log(`LCH Facade (${functionName}): Virtual calling screen closed.`);
    }

    // 2. Mark the session as officially started (for timers, etc.)
    if (!deps.sessionStateManager?.markSessionAsStarted()) {
         console.error(`LCH Facade (${functionName}): ABORT! sessionStateManager.markSessionAsStarted FAILED!`);
         handleLiveApiError(new Error("Failed to mark session as started."));
         return;
    }
    console.log(`LCH Facade (${functionName}): Session marked as started.`);

    // 3. Show the actual call interface
    initializeCallUI(currentConnector, currentSessionType);
    console.log(`LCH Facade (${functionName}): Call UI initialized.`);

    // 4. Start capturing the user's microphone
    if (deps.liveApiMicInput?.startCapture) {
        deps.liveApiMicInput.startCapture(handleLiveApiError);
    } else {
        console.error(`LCH Facade (${functionName}): CRITICAL! liveApiMicInput.startCapture missing.`);
        handleLiveApiError(new Error("Mic module 'startCapture' missing."));
        return;
    }

    // 5. DO NOTHING ELSE. Wait for the user to speak.
    // The following comment from your own code confirms this is the correct design:
    // REMOVED: Proactive greeting logic. The AI should wait for the user to speak first.
    // This prevents the AI's own greeting from polluting the chat history and causing confusion.

    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): FINISHED onOpen tasks.`);
}

    function handleAiInterrupted(): void {
        const functionName = "handleAiInterrupted (TS)";
        console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): AI speech interrupted.`);
        const { liveApiAudioOutput, liveApiTextCoordinator } = getDeps(functionName);
        liveApiAudioOutput?.stopCurrentSound?.();
        liveApiAudioOutput?.clearPlaybackQueue?.();
        liveApiTextCoordinator?.resetAiSpokenTextBuffer?.();
        console.log(`LCH Facade (${functionName}): Barge-in processed.`);
    }

    function handleLiveApiError(error: Error | any): void {
        const functionName = "handleLiveApiError (TS)";
        console.error(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Error received:`, error?.message || error, error);
        const { uiUpdater, liveApiTextCoordinator } = getDeps(functionName);
        const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown Live API error');

        if (currentSessionType === "direct_modal" && uiUpdater?.updateDirectCallStatus) {
            uiUpdater.updateDirectCallStatus(`Error: ${errorMessage.substring(0,40)}...`, true);
        }
        liveApiTextCoordinator?.flushUserTranscription?.();
        liveApiTextCoordinator?.flushAiSpokenText?.();
        console.log(`LCH Facade (${functionName}): Calling endLiveCall(false) due to error.`);
        endLiveCall(false);
        console.error(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): FINISHED error processing.`);
    }

    function handleLiveApiClose(wasClean: boolean, code: number, reason: string): void {
        const functionName = "handleLiveApiClose (TS)";
        console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Connection closed. Clean: ${wasClean}, Code: ${code}, Reason: "${reason}"`);
        const deps = getDeps(functionName);

        if (deps.sessionStateManager?.isSessionActive()) {
            console.warn(`LCH Facade (${functionName}): Connection closed unexpectedly while session active.`);
            const message = `Call ended: ${reason || 'Connection closed'} (Code: ${code || 'N/A'})`;
            if (currentSessionType === "direct_modal" && deps.uiUpdater) deps.uiUpdater.updateDirectCallStatus?.(message, !wasClean);

            deps.liveApiTextCoordinator?.flushUserTranscription?.();
            deps.liveApiTextCoordinator?.flushAiSpokenText?.();
            console.log(`LCH Facade (${functionName}): Calling endLiveCall. Recap: ${!!wasClean}`);
            endLiveCall(!!wasClean);
        } else {
            console.log(`LCH Facade (${functionName}): Close called, no active session. Minimal cleanup.`);
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                deps.modalHandler.close(deps.domElements.virtualCallingScreen);
            }
            deps.liveApiMicInput?.stopCapture?.();
            deps.liveApiAudioOutput?.cleanupAudioContext?.();
            deps.liveApiTextCoordinator?.resetBuffers?.();
        }
        console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): FINISHED processing close.`);
    }

    console.log(`live_call_handler.ts (TS Facade ${LCH_FACADE_VERSION}): IIFE FINISHED.`);
    return {
        startLiveCall,
        endLiveCall,
        sendTypedTextDuringLiveCall,
        toggleMicMuteForLiveCall,
        toggleSpeakerMuteForLiveCall,
        requestActivityForLiveCall
    };
})();

if (window.liveCallHandler && typeof window.liveCallHandler.startLiveCall === 'function') {
    console.log(`live_call_handler.ts (TS Facade): SUCCESSFULLY assigned to window.`);
    document.dispatchEvent(new CustomEvent('liveCallHandlerReady'));
    console.log('live_call_handler.ts: "liveCallHandlerReady" event dispatched.');
} else {
    console.error(`live_call_handler.ts (TS Facade): CRITICAL ERROR - window.liveCallHandler not correctly formed or startLiveCall missing.`);
    document.dispatchEvent(new CustomEvent('liveCallHandlerReady'));
    console.warn('live_call_handler.ts: "liveCallHandlerReady" dispatched (initialization FAILED).');
}
console.log("live_call_handler.ts: Script execution FINISHED (TS Facade).");