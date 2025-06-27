// src/js/sessions/live_call_handler.ts

import { openUpgradeModal } from '../ui/modalUtils';
import type { GeminiLiveApiServiceModule } from '../services/gemini_live_api_service'; // Adjust path if necessary
import type {
    Connector,
    ConversationManager,
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
    conversationManager?: ConversationManager;
    
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
    temperature?: number; // Kept as optional if you decide to add it later
}

interface LiveApiRealtimeInputConfig {
    activityHandling: string;
    // proactivity?: { proactive_audio: boolean }; // <<< ADD HERE
}
interface LiveApiSessionSetupConfig {
    systemInstruction: LiveApiSystemInstruction;
    generationConfig: LiveApiGenerationConfig;
    realtimeInputConfig: LiveApiRealtimeInputConfig;
    inputAudioTranscription: object; // Keep these if you want transcriptions
    outputAudioTranscription: object;// Keep these if you want transcriptions
    // NO proactivity
    // NO enable_affective_dialog
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
            aiService: window.aiService,     // Add aiService to the dependencies
            conversationManager: window.conversationManager,
        };
        return deps;
    };

    let currentConnector: Connector | null = null;
    let currentSessionType: string | null = null;
    let isMicEffectivelyMuted: boolean = true;
    let isAiSpeakerMuted: boolean = false;

   // Previous imports and interface definitions in live_call_handler.ts remain the same...
// window.liveCallHandler = ((): LiveCallHandlerModule => {
//    'use strict';
//    ...
//    let currentConnector: Connector | null = null;
//    let currentSessionType: string | null = null;
//    let isMicEffectivelyMuted: boolean = true; // Should be set false when call starts
//    let isAiSpeakerMuted: boolean = false;
//
//    function initializeCallInterfaceUI(...) { ... } // Defined earlier
// PASTE STARTS HERE (REPLACE THE ENTIRE startLiveCall FUNCTION)

async function startLiveCall(connector: Connector, sessionType: string): Promise<boolean> {
    const functionName = "startLiveCall (TS - Corrected Structure)";
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Connector: ${connector?.id}, Type: ${sessionType}`);
    const deps = getDeps(functionName);

    // --- 1. VERIFY ALL CRITICAL DEPENDENCIES ---
    const requiredDepNames: (keyof LiveCallHandlerDeps)[] = [
        'geminiLiveApiService', 'sessionStateManager', 'liveApiMicInput',
        'liveApiAudioOutput', 'liveApiTextCoordinator', 'uiUpdater',
        'domElements', 'modalHandler', 'polyglotHelpers', 'aiService', 'conversationManager'
    ];

    for (const depName of requiredDepNames) {
        if (!deps[depName]) {
            console.error(`LCH Facade (${functionName}): ABORT! DEP MISSING: '${depName}'.`);
            alert(`Call error: Component '${depName}' missing (LCH-TS-S01).`);
            deps.sessionStateManager?.resetBaseSessionState?.(); // Attempt to reset
            if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
                try { deps.modalHandler.close(deps.domElements.virtualCallingScreen); } catch (e) { /*ignore*/ }
            }
            return false;
        }
    }

    // Assert non-null for checked dependencies for the rest of this function's scope
    const geminiLiveApiService = deps.geminiLiveApiService!;
    const sessionStateManager = deps.sessionStateManager!;
    const liveApiMicInput = deps.liveApiMicInput!;
    const liveApiAudioOutput = deps.liveApiAudioOutput!;
    const liveApiTextCoordinator = deps.liveApiTextCoordinator!;
    const uiUpdater = deps.uiUpdater!;
    const domElements = deps.domElements!;
    const modalHandler = deps.modalHandler!;
    const polyglotHelpers = deps.polyglotHelpers!;

    console.log(`LCH Facade (${functionName}): Critical direct dependencies verified.`);

    // --- 2. VERIFY AND INITIALIZE SUB-MODULES ---
    console.log(`LCH Facade (${functionName}): Initializing sub-modules...`);

    if (typeof liveApiMicInput.initialize !== 'function' || !liveApiMicInput.initialize(geminiLiveApiService, () => isMicEffectivelyMuted)) {
        console.error("LCH: liveApiMicInput.initialize failed or missing.");
        sessionStateManager.resetBaseSessionState(); // Use asserted version
        if (domElements.virtualCallingScreen && modalHandler.close) { try { modalHandler.close(domElements.virtualCallingScreen); } catch (e) {} }
        return false;
    }

    if (typeof liveApiAudioOutput.initialize !== 'function' || !liveApiAudioOutput.initialize(() => isAiSpeakerMuted)) {
        console.error("LCH: liveApiAudioOutput.initialize failed or missing.");
        sessionStateManager.resetBaseSessionState(); // Use asserted version
        if (domElements.virtualCallingScreen && modalHandler.close) { try { modalHandler.close(domElements.virtualCallingScreen); } catch (e) {} }
        return false;
    }

    if (typeof liveApiTextCoordinator.initialize !== 'function' || !liveApiTextCoordinator.initialize(sessionStateManager, polyglotHelpers, uiUpdater)) {
        console.error("LCH: liveApiTextCoordinator.initialize failed or missing.");
        sessionStateManager.resetBaseSessionState(); // Use asserted version
        if (domElements.virtualCallingScreen && modalHandler.close) { try { modalHandler.close(domElements.virtualCallingScreen); } catch (e) {} }
        return false;
    }
    liveApiTextCoordinator.setCurrentSessionTypeContext(sessionType);
    liveApiTextCoordinator.resetBuffers();
    console.log(`LCH Facade (${functionName}): Sub-modules initialized successfully.`);

    // --- 3. SET LCH STATE ---
    currentConnector = connector;
    currentSessionType = sessionType;
    isMicEffectivelyMuted = false; // Call starting, mic should be unmuted by default
    isAiSpeakerMuted = false;    // AI speaker unmuted by default
    console.log(`LCH Facade (${functionName}): Facade state set. MicMuted: ${isMicEffectivelyMuted}, SpeakerMuted: ${isAiSpeakerMuted}`);

    // --- 4. CONFIRM SESSION STATE MANAGER IS READY ---
    // This part assumes session_manager has ALREADY called sessionStateManager.initializeBaseSession
    // to show the virtualCallingScreen and play the ringtone.
    // LCH now mostly confirms or, in a very specific fallback, might re-init state (but not UI).
    let currentCallSessionId = sessionStateManager.getCurrentSessionDetails?.()?.sessionId;

    if (!sessionStateManager.isSessionActive() || !currentCallSessionId) {
        console.warn(`LCH Facade (${functionName}): SSM session not active or no sessionId when LCH started. This might indicate an issue in session_manager's SSM init. Attempting LCH-side SSM init (skipModalManagement=true).`);
        if (typeof sessionStateManager.initializeBaseSession !== 'function' || !sessionStateManager.initializeBaseSession(connector, sessionType, undefined, true)) { // 4th arg is skipModalManagement
            console.error("LCH: sessionStateManager.initializeBaseSession (called from LCH, skipping modal mgmt) failed or missing.");
            if (domElements.virtualCallingScreen && modalHandler.close) {
                 try { modalHandler.close(domElements.virtualCallingScreen); } catch(e){ console.warn("LCH: Error closing vCS on LCH's SSM init fail", e); }
            }
            return false;
        }
        currentCallSessionId = sessionStateManager.getCurrentSessionDetails?.()?.sessionId;
        if (!currentCallSessionId) {
             console.error("LCH: Critical - Failed to get/set session ID after LCH's SSM init.");
             sessionStateManager.resetBaseSessionState();
             if (domElements.virtualCallingScreen && modalHandler.close) { try { modalHandler.close(domElements.virtualCallingScreen); } catch(e){} }
             return false;
        }
        console.log(`LCH Facade (${functionName}): SSM was re-initialized/confirmed by LCH (skipModal=true). SessionID: ${currentCallSessionId}`);
    } else {
        console.log(`LCH Facade (${functionName}): SSM session confirmed active (likely by session_manager). SessionID: ${currentCallSessionId}. LCH proceeding.`);
    }

    // --- 5. BUILD SYSTEM INSTRUCTION & API CONFIG ---
    let systemInstructionObject: LiveApiSystemInstruction;
    try {
        if (typeof buildLiveApiSystemInstructionForConnector !== 'function') {
            throw new Error("buildLiveApiSystemInstructionForConnector is not a function. Check import.");
        }
        systemInstructionObject = await buildLiveApiSystemInstructionForConnector(connector);
        if (!systemInstructionObject?.parts?.[0]?.text?.trim()) {
            throw new Error("Invalid system instruction: empty text from prompt builder.");
        }
        console.log(`LCH Facade (${functionName}): Dynamic system instruction built.`);
    } catch (promptError: any) {
        console.error(`LCH Facade (${functionName}): Error building system instruction:`, promptError.message, promptError);
        systemInstructionObject = { parts: [{ text: "You are a helpful assistant. Please be concise." }] }; // Fallback
        console.warn(`LCH Facade (${functionName}): Using fallback system instruction.`);
    }

    const primaryConnectorLanguage = connector.language || "English";
    const langInfo = connector.languageSpecificCodes?.[primaryConnectorLanguage];
    // Ensure "models/" prefix if not already in connector.liveApiModelName
    // Target the native audio model for new features.
    const rawModelNameFromConnector = connector.liveApiModelName; // Get from persona/connector
    const defaultModelName ="gemini-live-2.5-flash-preview"; /// <<< REVERT TO THIS (or similar known working one)

    let chosenModelName = connector.liveApiModelName || defaultModelName; // Allow persona to override if they have a compatible live model
    const liveApiModelName = chosenModelName.startsWith("models/") ? chosenModelName : `models/${chosenModelName}`;
    let speechLanguageCodeForApi: string;
    let voiceNameToUseForApi: string;


    
    // Always try to get the voice intended for the persona's primary speaking language first
    voiceNameToUseForApi = langInfo?.liveApiVoiceName || "Puck"; // Default voice for the current primary language
    
    if (langInfo?.liveApiSpeechLanguageCodeOverride) {
        speechLanguageCodeForApi = langInfo.liveApiSpeechLanguageCodeOverride;
        // Voice is already set from the primary language's langInfo.
        // The override is for the *speech recognition input* and *TTS engine*,
        // but the text generated will be in the primary language,
        // so the selected voice for that primary language is still relevant.
        console.log(`LCH Facade (${functionName}): Using speech language override: ${speechLanguageCodeForApi} for original lang ${primaryConnectorLanguage}. Voice: ${voiceNameToUseForApi}`);
    } else {
        speechLanguageCodeForApi = langInfo?.languageCode || connector.languageCode || "en-US";
        // Voice is already set above from langInfo or defaulted to Puck.
    }
    console.log(`LCH Facade (${functionName}): API Model: '${liveApiModelName}', Voice: '${voiceNameToUseForApi}', Speech Lang for API: '${speechLanguageCodeForApi}'`);
    const sessionConfigForService: LiveApiSessionSetupConfig = {
        systemInstruction: systemInstructionObject,
        generationConfig: { // generationConfig no longer contains enable_affective_dialog
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceNameToUseForApi } },
                languageCode: speechLanguageCodeForApi
            }
            // No temperature specified here; API will use its default.
        },
        realtimeInputConfig: { activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
            //  proactivity: { proactive_audio: true } 
            },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        // proactivity: { proactive_audio: true }, // For native audio models
        // enable_affective_dialog: true       // <<< ADDED HERE, at the top level of sessionConfigForService
    };

    // --- 6. DEFINE API CALLBACKS ---
    const liveApiCallbacks: LiveApiCallbacks = {
        onOpen: handleLiveApiSessionOpen, // This will handle UI transition after connection
        onAiAudioChunk: liveApiAudioOutput.handleReceivedAiAudioChunk,
        onAiText: liveApiTextCoordinator.handleReceivedAiText,
        onUserTranscription: liveApiTextCoordinator.handleReceivedUserTranscription,
        onModelTranscription: liveApiTextCoordinator.handleReceivedModelTranscription,
        onAiInterrupted: handleAiInterrupted,
        onError: handleLiveApiError, // Ensure this is async if it calls async endLiveCall
        onClose: handleLiveApiClose  // Ensure this is async if it calls async endLiveCall
    };

    // --- 7. INTRODUCE MINIMAL PERCEIVED RINGING TIME & ATTEMPT CONNECTION ---
    const MINIMUM_RINGING_DURATION_MS = 2500; // 2.5 seconds (adjust as needed for desired "ringing" feel)

    console.log(`LCH Facade (${functionName}): Virtual calling screen should be up. Waiting for ${MINIMUM_RINGING_DURATION_MS}ms to simulate ringing before attempting AI connection.`);

    // This promise introduces the delay. The virtualCallingScreen (ringing modal) is visible during this time.
    await new Promise(resolve => setTimeout(resolve, MINIMUM_RINGING_DURATION_MS));

    console.log(`LCH Facade (${functionName}): Minimum ringing time elapsed. Now attempting geminiLiveApiService.connect...`);

    try {
        if (typeof geminiLiveApiService.connect !== 'function') {
            throw new Error("geminiLiveApiService.connect is not a function.");
        }
        const connectResult = await geminiLiveApiService.connect(liveApiModelName, sessionConfigForService, liveApiCallbacks);

        if (connectResult) {
            console.log(`LCH Facade (${functionName}): Connect process INITIATED successfully by service. onOpen callback will handle UI transition.`);
            // The call doesn't "start" for the user until onOpen is called.
            return true; // Indicates connection attempt was successful
        } else {
            // This case means the service's connect method itself indicated an immediate failure.
            throw new Error("geminiLiveApiService.connect returned falsy, indicating immediate connection failure.");
        }
    } catch (error: any) {
        console.error(`LCH Facade (${functionName}): ABORT! Error DURING geminiLiveApiService.connect call:`, error.message, error);
        
        // Cleanup UI that might have been started by session_manager
        if (domElements.virtualCallingScreen && modalHandler.close) {
            try { modalHandler.close(domElements.virtualCallingScreen); } catch (e) { /*ignore*/ }
        }
        // Ensure session state is reset, which should also stop the ringtone if it was playing.
        sessionStateManager.resetBaseSessionState();

        uiUpdater.updateDirectCallStatus?.("Connection Failed", true);
        let failureReason = "API connection issue";
        if (error?.message) {
            if (error.message.toLowerCase().includes("sdk") || error.message.toLowerCase().includes("key")) failureReason = "API SDK/key issue";
            else if (error.message.toLowerCase().includes("falsy")) failureReason = "API service indicated failure";
            else failureReason = `API error: ${error.message.substring(0,30)}`;
        }
        sessionStateManager.recordFailedCallAttempt(connector, failureReason);
        return false; // Connection failed
    }
} // End of startLiveCall

// PASTE ENDS HERE
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

// PASTE STARTS HERE
function initializeCallUI(connector: Connector | null, sessionType: string | null): void {
    const functionName = "initializeCallUI (TS)";
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Initializing UI for call. Connector: ${connector?.id}, Type: ${sessionType}`);
    const deps = getDeps(functionName);

    if (!deps.uiUpdater || !deps.domElements || !deps.modalHandler) {
        console.error(`LCH Facade (${functionName}): Missing critical UI dependencies (uiUpdater, domElements, modalHandler). Cannot initialize call UI.`);
        // Convert to async if handleLiveApiError becomes async. For now, assume it's still sync or this error is fatal.
         handleLiveApiError(new Error("Critical UI components missing. Cannot show call interface."));
        return;
    }

    if (!connector) {
        console.error(`LCH Facade (${functionName}): Connector is null. Cannot initialize call UI.`);
        handleLiveApiError(new Error("Connector data missing. Cannot show call interface."));
        return;
    }

    // Example: For a 'direct_modal' call type
    if (sessionType === "direct_modal") {
        if (deps.domElements.directCallInterface && deps.modalHandler.open) {
            deps.uiUpdater.updateDirectCallHeader?.(connector);
            deps.uiUpdater.updateDirectCallStatus?.("Connected", false);
            // Access LCH IIFE-scope variables isMicEffectivelyMuted and isAiSpeakerMuted directly
            deps.uiUpdater.updateDirectCallMicButtonVisual?.(isMicEffectivelyMuted);
            deps.uiUpdater.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
            deps.uiUpdater.clearDirectCallActivityArea?.();

            try {
                deps.modalHandler.open(deps.domElements.directCallInterface);
                console.log(`LCH Facade (${functionName}): Direct call interface opened.`);
            } catch (e: any) {
                console.error(`LCH Facade (${functionName}): Error opening direct call interface:`, e.message, e);
                handleLiveApiError(new Error(`Failed to open call interface modal: ${e.message}`));
            }
        } else {
            const missing = [];
            if (!deps.domElements.directCallInterface) missing.push("domElements.directCallInterface");
            if (!deps.modalHandler.open) missing.push("modalHandler.open");
            console.error(`LCH Facade (${functionName}): Required components missing for direct call UI: ${missing.join(', ')}.`);
            handleLiveApiError(new Error("Direct call UI components missing."));
        }
    } else if (sessionType === "voiceChat_modal") {
        // Placeholder: Implement UI initialization for 'voiceChat_modal' if it's a distinct UI.
        // This might involve different domElements or uiUpdater calls.
        console.warn(`LCH Facade (${functionName}): UI initialization for sessionType '${sessionType}' is not fully implemented in this stub. Assuming it might use direct_modal or other UI elements.`);
        // If it uses the same UI as direct_modal, you might call common setup functions or replicate logic.
        // For now, let's assume it should also try to open directCallInterface as a common modal for voice.
         if (deps.domElements.directCallInterface && deps.modalHandler.open) {
            deps.uiUpdater.updateDirectCallHeader?.(connector); // or a specific voiceChatHeaderUpdate
            deps.uiUpdater.updateDirectCallStatus?.("Voice Chat Active", false);
            deps.uiUpdater.updateDirectCallMicButtonVisual?.(isMicEffectivelyMuted);
            deps.uiUpdater.updateDirectCallSpeakerButtonVisual?.(isAiSpeakerMuted);
             try {
                deps.modalHandler.open(deps.domElements.directCallInterface); // Or a specific voiceChatModalElement
                console.log(`LCH Facade (${functionName}): Voice chat (direct_modal style) interface opened.`);
            } catch (e: any) {
                console.error(`LCH Facade (${functionName}): Error opening voice chat (direct_modal style) interface:`, e.message, e);
                handleLiveApiError(new Error(`Failed to open voice chat interface: ${e.message}`));
            }
        } else {
            console.error(`LCH Facade (${functionName}): Required components missing for voice chat UI.`);
            handleLiveApiError(new Error("Voice chat UI components missing."));
        }
    } else {
        console.warn(`LCH Facade (${functionName}): Unknown sessionType '${sessionType}' for UI initialization.`);
        handleLiveApiError(new Error(`Cannot initialize UI for unknown session type: ${sessionType}`));
    }
}
// PASTE ENDS HERE
// PASTE STARTS HERE

// PASTE STARTS HERE
// PASTE STARTS HERE


// src/js/sessions/live_call_handler.ts (The NEW, correct version)

async function handleLiveApiSessionOpen(): Promise<void> {
    const functionName = "handleLiveApiSessionOpen (TS)";
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Live API connection established. Transitioning UI.`);
    // Get dependencies, including the crucial conversationManager
    const { domElements, modalHandler, sessionStateManager, conversationManager } = getDeps(functionName);

    // 1. Close the "Calling..." screen
    if (domElements?.virtualCallingScreen && modalHandler?.close) {
        modalHandler.close(domElements.virtualCallingScreen);
        console.log(`LCH Facade (${functionName}): Virtual calling screen closed.`);
    }

    // --- THIS IS THE FIX: The Correct Order of Operations ---
    // 2A. Ensure the conversation record exists in Firestore FIRST.
    // We use the `currentConnector` which was set when startLiveCall was called.
    if (currentConnector && conversationManager?.ensureConversationRecord) {
        console.log(`LCH: Ensuring conversation record for ${currentConnector.id} before marking session started...`);
        await conversationManager.ensureConversationRecord(currentConnector);
    } else {
        console.error(`LCH: Cannot ensure conversation record, currentConnector or conversationManager is missing!`);
        await handleLiveApiError(new Error("Critical data missing for session setup."));
        return;
    }
    
    // 2B. NOW, mark the session as officially started.
    // This will trigger _logCallEventToChat, which will now succeed because the parent document exists.
    if (!await sessionStateManager?.markSessionAsStarted()) {
         console.error(`LCH Facade (${functionName}): ABORT! sessionStateManager.markSessionAsStarted FAILED!`);
         await handleLiveApiError(new Error("Failed to mark session as started."));
         return;
    }
    console.log(`LCH Facade (${functionName}): Session marked as started (ringtone stopped).`);
    // --- END OF FIX ---

    // 3. Show the actual call interface
    initializeCallUI(currentConnector, currentSessionType);
    console.log(`LCH Facade (${functionName}): Actual call UI initialized and shown.`);

    // 4. Start capturing the user's microphone
    const { liveApiMicInput } = getDeps(functionName);
    if (liveApiMicInput?.startCapture) {
        try {
            await liveApiMicInput.startCapture(async (err) => await handleLiveApiError(err));
        } catch (captureError: any) {
             console.error(`LCH Facade (${functionName}): Error during liveApiMicInput.startCapture call:`, captureError);
             await handleLiveApiError(new Error(captureError.message || "Mic capture failed to start."));
             return;
        }
    } else {
        console.error(`LCH Facade (${functionName}): CRITICAL! liveApiMicInput.startCapture missing.`);
        await handleLiveApiError(new Error("Mic module 'startCapture' missing."));
        return;
    }

    // 5. AI is ready.
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): FINISHED onOpen tasks. AI ready, waiting for user input.`);
}
// PASTE ENDS HERE
// PASTE ENDS HERE
// PASTE ENDS HERE
    function handleAiInterrupted(): void {
        const functionName = "handleAiInterrupted (TS)";
        console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): AI speech interrupted.`);
        const { liveApiAudioOutput, liveApiTextCoordinator } = getDeps(functionName);
        liveApiAudioOutput?.stopCurrentSound?.();
        liveApiAudioOutput?.clearPlaybackQueue?.();
        liveApiTextCoordinator?.resetAiSpokenTextBuffer?.();
        console.log(`LCH Facade (${functionName}): Barge-in processed.`);
    }

 // PASTE STARTS HERE
async function handleLiveApiError(error: Error | any): Promise<void> { // Made async, returns Promise<void>
    const functionName = "handleLiveApiError (TS)";
    console.error(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Error received:`, error?.message || error, error);
    const { uiUpdater, liveApiTextCoordinator } = getDeps(functionName);
    const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown Live API error');

    if (currentSessionType === "direct_modal" && uiUpdater?.updateDirectCallStatus) {
        uiUpdater.updateDirectCallStatus(`Error: ${errorMessage.substring(0,40)}...`, true);
    }
    liveApiTextCoordinator?.flushUserTranscription?.();
    liveApiTextCoordinator?.flushAiSpokenText?.();
    
    console.log(`LCH Facade (${functionName}): Calling endLiveCall(false) due to error. Awaiting completion...`);
    await endLiveCall(false); // Await the async endLiveCall
    
    console.error(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): FINISHED error processing.`);
}
// PASTE ENDS HERE

   // PASTE STARTS HERE
async function handleLiveApiClose(wasClean: boolean, code: number, reason: string): Promise<void> { // Made async
    const functionName = "handleLiveApiClose (TS)";
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): Connection closed. Clean: ${wasClean}, Code: ${code}, Reason: "${reason}"`);
    const deps = getDeps(functionName);

    if (deps.sessionStateManager?.isSessionActive()) {
        console.warn(`LCH Facade (${functionName}): Connection closed unexpectedly while session active.`);
        const message = `Call ended: ${reason || 'Connection closed'} (Code: ${code || 'N/A'})`;
        if (currentSessionType === "direct_modal" && deps.uiUpdater) deps.uiUpdater.updateDirectCallStatus?.(message, !wasClean);

        deps.liveApiTextCoordinator?.flushUserTranscription?.();
        deps.liveApiTextCoordinator?.flushAiSpokenText?.();
        
        console.log(`LCH Facade (${functionName}): Calling endLiveCall. Recap: ${!!wasClean}. Awaiting completion...`);
        await endLiveCall(!!wasClean); // Await the async endLiveCall
    } else {
        console.log(`LCH Facade (${functionName}): Close called, no active session. Minimal cleanup.`);
        if (deps.domElements?.virtualCallingScreen && deps.modalHandler?.close) {
            try { deps.modalHandler.close(deps.domElements.virtualCallingScreen); } catch(e) { /* ignore */ }
        }
        deps.liveApiMicInput?.stopCapture?.();
        deps.liveApiAudioOutput?.cleanupAudioContext?.();
        deps.liveApiTextCoordinator?.resetBuffers?.();
    }
    console.log(`LCH Facade (${functionName} v${LCH_FACADE_VERSION}): FINISHED processing close.`);
}
// PASTE ENDS HERE

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