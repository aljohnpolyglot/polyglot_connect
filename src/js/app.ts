// D:\polyglot_connect\src\js\app.ts
// Main application entry point and orchestrator.
// D:\polyglot_connect\src\js\app.ts

// ... rest of your app.ts imports and code ...
// Import types for objects that will be on the window
// Path is from src/js/app.ts to src/js/types/global.d.ts
import type {
    Connector,
    PolyglotApp, // For window.polyglotApp
    // Import types for all managers that criticalModules checks or app.js uses
    // These should all be EXPORTED from global.d.ts
    PolyglotHelpersOnWindow as PolyglotHelpers,
    FlagLoader,
    PersonaDataSourceItem, // For window.polyglotPersonasDataSource
    // Connector is already imported (for polyglotConnectors)
    Group, // For window.polyglotGroupsData
    LanguageFilterItem, RoleFilterItem, Minigame, SharedContent,
    AIService, GeminiLiveApiService, ActivityManager, GroupManager,
    ConversationManager, TextMessageHandler, VoiceMemoHandler,
    ChatActiveTargetManager, ChatSessionHandler, ChatOrchestrator,
    SessionStateManager, LiveCallHandler, SessionHistoryManager, SessionManager,
    YourDomElements, ModalHandler, UiUpdater, CardRenderer, ListRenderer,
    ShellSetup,  TabManagerModule,  SidebarPanelManagerModule, ViewActionCoordinatorModule,  FilterController, PersonaModalManager, ChatUiManager,
    ChatEventListeners
} from './types/global.d.ts';


if (!(window as any).polyglotApp) { // Check if it's not already set by another script (unlikely but safe)
    (window as any).polyglotApp = {} as PolyglotApp;
    console.log('app.ts: Placeholder window.polyglotApp assigned.');
    document.dispatchEvent(new CustomEvent('polyglotAppPlaceholderReady'));
    console.log('app.ts: "polyglotAppPlaceholderReady" event dispatched.');
} else {
    console.log('app.ts: window.polyglotApp was already present. Assuming placeholder set elsewhere or functional.');
    // If it's already functional, we might want to dispatch polyglotAppReady immediately.
    // For now, we assume it's a placeholder if it exists.
    if (typeof (window as any).polyglotApp.initiateSession !== 'function') {
        document.dispatchEvent(new CustomEvent('polyglotAppPlaceholderReady'));
        console.log('app.ts: Existing window.polyglotApp seems to be a placeholder, "polyglotAppPlaceholderReady" event dispatched.');
    }
}
// --- Core Module Readiness Aggregator ---
// --- START OF REPLACEMENT for Core Module Readiness Aggregator (APP.3) ---
const CORE_MODULES_TO_WAIT_FOR: { eventName: string, windowObjectKey: keyof Window, keyFunction?: string }[] = [
    { eventName: 'shellSetupReady', windowObjectKey: 'shellSetup', keyFunction: 'initializeAppCore' },
    { eventName: 'shellControllerReady', windowObjectKey: 'shellController', keyFunction: 'initializeAppShell' },
    { eventName: 'tabManagerReady', windowObjectKey: 'tabManager', keyFunction: 'initialize' },
    { eventName: 'sidebarPanelManagerReady', windowObjectKey: 'sidebarPanelManager', keyFunction: 'initialize' },
    { eventName: 'viewActionCoordinatorReady', windowObjectKey: 'viewActionCoordinator', keyFunction: 'initialize' },
    { eventName: 'chatOrchestratorReady', windowObjectKey: 'chatOrchestrator', keyFunction: 'initialize' }, 
    { eventName: 'groupManagerReady', windowObjectKey: 'groupManager', keyFunction: 'initialize' },
    { eventName: 'sessionManagerReady', windowObjectKey: 'sessionManager', keyFunction: 'initialize' },
    // { eventName: 'chatEventListenersReady', windowObjectKey: 'chatEventListeners', keyFunction: 'initializeEventListeners' }, // <<< REMOVED
    { eventName: 'filterControllerReady', windowObjectKey: 'filterController', keyFunction: 'initializeFilters' },
{ eventName: 'geminiLiveApiServiceReady', windowObjectKey: 'geminiLiveApiService', keyFunction: 'connect' }

];

const moduleReadyStatus: { [key: string]: boolean } = {};
CORE_MODULES_TO_WAIT_FOR.forEach(mod => moduleReadyStatus[mod.eventName] = false);
let coreModulesReadyCount = 0;

function markModuleAsReady(moduleName: string) {
    if (moduleReadyStatus[moduleName]) return; // Already counted

    moduleReadyStatus[moduleName] = true;
    coreModulesReadyCount++;
    console.log(`APP_CORE_READY_CHECK: '${moduleName}' is ready. Progress: ${coreModulesReadyCount}/${CORE_MODULES_TO_WAIT_FOR.length}`);

    if (coreModulesReadyCount === CORE_MODULES_TO_WAIT_FOR.length) {
        console.log(`APP_CORE_READY_CHECK: All ${CORE_MODULES_TO_WAIT_FOR.length} core modules are now ready. Dispatching 'allCoreModulesReady'.`);
        document.dispatchEvent(new CustomEvent('allCoreModulesReady'));
    }
}

console.log("APP_CORE_READY_CHECK: Setting up listeners and performing pre-checks for core modules.");
CORE_MODULES_TO_WAIT_FOR.forEach(moduleInfo => {
    const moduleObject = window[moduleInfo.windowObjectKey] as any;
    let isAlreadyReady = false;
    if (moduleObject) {
        if (moduleInfo.keyFunction) {
            isAlreadyReady = typeof moduleObject[moduleInfo.keyFunction] === 'function';
        } else {
            // If no keyFunction, presence of the object is enough for this check
            isAlreadyReady = true; 
        }
    }

    if (isAlreadyReady) {
        console.log(`APP_CORE_READY_CHECK: Pre-check - Module for '${moduleInfo.eventName}' (window.${String(moduleInfo.windowObjectKey)}) is ALREADY functionally ready.`);
        markModuleAsReady(moduleInfo.eventName);
    } else {
        console.log(`APP_CORE_READY_CHECK: Pre-check - Module for '${moduleInfo.eventName}' not yet ready. Adding listener.`);
        document.addEventListener(moduleInfo.eventName, () => markModuleAsReady(moduleInfo.eventName), { once: true });
    }
});
// --- End of Aggregator ---
// --- End of Aggregator ---


console.log("app.ts: TOP LEVEL - Script executing."); // Changed from .js
console.log("app.ts TOP LEVEL: VITE_TEST_VAR from import.meta.env is:", import.meta.env?.VITE_TEST_VAR);
import * as apiKeysConfig from './config';

console.log("app.ts: Imported apiKeysConfig:", apiKeysConfig);
console.log("app.ts (LOCAL DEV TEST): Imported VITE_TEST_VAR_EXPORT:", apiKeysConfig.VITE_TEST_VAR_EXPORT);

// Set API keys on the window object
console.log("app.ts: Attempting to set API keys on window object...");
window.GEMINI_API_KEY = apiKeysConfig.GEMINI_API_KEY || undefined;
console.log("app.ts: window.GEMINI_API_KEY set to:", window.GEMINI_API_KEY);
window.GEMINI_API_KEY_ALT = apiKeysConfig.GEMINI_API_KEY_ALT || undefined;
console.log("app.ts: window.GEMINI_API_KEY_ALT set to:", window.GEMINI_API_KEY_ALT);
window.GEMINI_API_KEY_ALT_2 = apiKeysConfig.GEMINI_API_KEY_ALT_2 || undefined;
console.log("app.ts: window.GEMINI_API_KEY_ALT_2 set to:", window.GEMINI_API_KEY_ALT_2);
window.GROQ_API_KEY = apiKeysConfig.GROQ_API_KEY || 'proxy-handled';
console.log("app.ts: window.GROQ_API_KEY set to:", window.GROQ_API_KEY);
window.TOGETHER_API_KEY = apiKeysConfig.TOGETHER_API_KEY || undefined;
console.log("app.ts: window.TOGETHER_API_KEY set to:", window.TOGETHER_API_KEY);
console.log("app.ts: API keys set on window object.");

if (window.GEMINI_API_KEY) console.log("app.ts: CONFIRMED - window.GEMINI_API_KEY has been set."); else console.warn("app.ts: CONFIRMED - window.GEMINI_API_KEY is UNDEFINED.");
// ... (other API key confirmation logs)

// D:\polyglot_connect\src\js\app.ts

interface CriticalModuleDef { // Ensure this interface is defined if not already globally
    name: string;
    obj: any;
    isKey?: boolean;
    keyFn?: string;
}

function initializeAppLogic(): void {
    console.log('APP_DEBUG: ========== initializeAppLogic - ENTERED ==========');
    console.log('APP_DEBUG: initializeAppLogic - ENTERED. Timestamp:', Date.now());
    
    console.log('app.ts: initializeAppLogic CALLED (after allCoreModulesReady).'); // Changed comment

    if (!window.polyglotApp) {
        window.polyglotApp = {} as PolyglotApp; // Initialize with type
        console.log('app.ts: window.polyglotApp initialized to {} within initializeAppLogic.');
    } else {
        console.log('app.ts: window.polyglotApp was already initialized. Value:', window.polyglotApp);
    }

    console.log('app.ts: Starting critical module checks (within initializeAppLogic)...');
    const criticalModules: CriticalModuleDef[] = [
        { name: 'GEMINI_API_KEY', obj: window.GEMINI_API_KEY, isKey: true },
        // { name: 'GROQ_API_KEY', obj: window.GROQ_API_KEY, isKey: true },
        { name: 'TOGETHER_API_KEY', obj: window.TOGETHER_API_KEY, isKey: true },

        { name: 'polyglotHelpers', obj: window.polyglotHelpers as PolyglotHelpers | undefined, keyFn: 'sanitizeTextForDisplay'},
        { name: 'flagLoader', obj: window.flagLoader as FlagLoader | undefined, keyFn: 'getFlagUrl' },
        { name: 'polyglotPersonasDataSource', obj: window.polyglotPersonasDataSource as PersonaDataSourceItem[] | undefined },
        { name: 'polyglotConnectors', obj: window.polyglotConnectors as Connector[] | undefined },
        { name: 'polyglotGroupsData', obj: window.polyglotGroupsData as Group[] | undefined },
        { name: 'polyglotFilterLanguages', obj: window.polyglotFilterLanguages as LanguageFilterItem[] | undefined },
        { name: 'polyglotFilterRoles', obj: window.polyglotFilterRoles as RoleFilterItem[] | undefined },
        { name: 'polyglotMinigamesData', obj: window.polyglotMinigamesData as Minigame[] | undefined },
        { name: 'polyglotSharedContent', obj: window.polyglotSharedContent as SharedContent | undefined, keyFn: 'homepageTips' },
        { name: 'aiService', obj: window.aiService as AIService | undefined, keyFn: 'generateTextMessage' },
        { name: 'geminiLiveApiService', obj: window.geminiLiveApiService as GeminiLiveApiService | undefined, keyFn: 'connect' },
        { name: 'activityManager', obj: window.activityManager as ActivityManager | undefined, keyFn: 'isConnectorActive' },
        { name: 'groupManager', obj: window.groupManager as GroupManager | undefined, keyFn: 'initialize' },
        { name: 'conversationManager', obj: window.conversationManager as ConversationManager | undefined, keyFn: 'initialize' },
        { name: 'textMessageHandler', obj: window.textMessageHandler as TextMessageHandler | undefined, keyFn: 'sendEmbeddedTextMessage' },
        { name: 'voiceMemoHandler', obj: window.voiceMemoHandler as VoiceMemoHandler | undefined, keyFn: 'handleNewVoiceMemoInteraction' },
        { name: 'chatActiveTargetManager', obj: window.chatActiveTargetManager as ChatActiveTargetManager | undefined, keyFn: 'getEmbeddedChatTargetId' },
        { name: 'chatSessionHandler', obj: window.chatSessionHandler as ChatSessionHandler | undefined /*, keyFn: 'initialize' */ },
        { name: 'chatOrchestrator', obj: window.chatOrchestrator as ChatOrchestrator | undefined, keyFn: 'initialize' },
        { name: 'sessionStateManager', obj: window.sessionStateManager as SessionStateManager | undefined, keyFn: 'initializeBaseSession' },
        { name: 'liveCallHandler', obj: window.liveCallHandler as LiveCallHandler | undefined, keyFn: 'startLiveCall' },
        { name: 'sessionHistoryManager', obj: window.sessionHistoryManager as SessionHistoryManager | undefined /*, keyFn: 'initializeHistory' */ },
        { name: 'sessionManager', obj: window.sessionManager as SessionManager | undefined /*, keyFn: 'initialize' */ },
        { name: 'domElements', obj: window.domElements as YourDomElements | undefined, keyFn: 'appShell' },
        { name: 'modalHandler', obj: window.modalHandler as ModalHandler | undefined, keyFn: 'open' },
        { name: 'uiUpdater', obj: window.uiUpdater as UiUpdater | undefined, keyFn: 'appendToVoiceChatLog' },
        { name: 'cardRenderer', obj: window.cardRenderer as CardRenderer | undefined, keyFn: 'renderCards' },
        { name: 'listRenderer', obj: window.listRenderer as ListRenderer | undefined, keyFn: 'renderActiveChatList' },
        { name: 'shellSetup', obj: window.shellSetup as ShellSetup | undefined, keyFn: 'initializeAppCore' },
        { name: 'tabManager', obj: window.tabManager as TabManagerModule | undefined, keyFn: 'initialize' },
        { name: 'sidebarPanelManager', obj: window.sidebarPanelManager as SidebarPanelManagerModule | undefined, keyFn: 'initialize' },
        { name: 'viewActionCoordinator', obj: window.viewActionCoordinator as ViewActionCoordinatorModule | undefined /*, keyFn: 'initialize' */ },
        { name: 'filterController', obj: window.filterController as FilterController | undefined, keyFn: 'initializeFilters' },
        { name: 'personaModalManager', obj: window.personaModalManager as PersonaModalManager | undefined, keyFn: 'openDetailedPersonaModal' },
        { name: 'chatUiManager', obj: window.chatUiManager as ChatUiManager | undefined, keyFn: 'showEmbeddedChatInterface' },
        // { name: 'chatEventListeners', obj: window.chatEventListeners as ChatEventListeners | undefined /*, keyFn: 'initializeEventListeners' */ },
    ];

    let allChecksPassedInternal = true;
    for (const mod of criticalModules) {
        console.log(`APP_DEBUG: Checking module: '${mod.name}'. Required keyFn: '${mod.keyFn || 'N/A'}'`);
        const currentModuleObject = mod.obj as any;

        if (mod.isKey) {
            if (!mod.obj || String(mod.obj).includes('YOUR_') || String(mod.obj).includes('gsk_YOUR_')) {
                const errorMsg = `APP INIT ERROR (initializeAppLogic): API Key '${mod.name}' is missing or invalid. Halting.`;
                console.error(errorMsg, "Current value for", mod.name, ":", mod.obj);
                document.body.innerHTML = `<p>Application Error: API Key (${mod.name}) invalid.</p>`;
                allChecksPassedInternal = false;
                // return; // Exit initializeAppLogic - We will check allChecksPassedInternal after the loop
                break; // Exit the loop as a critical error occurred
            }
        } else {
            const isPropertyCheck = mod.keyFn === 'appShell' || mod.keyFn === 'homepageTips';
            const isInvalidModule = !currentModuleObject ||
                                    (mod.keyFn && (
                                        (isPropertyCheck && typeof currentModuleObject[mod.keyFn] === 'undefined') || // Property missing
                                        (!isPropertyCheck && typeof currentModuleObject[mod.keyFn] !== 'function')   // Function missing
                                    ));
            
            if (isInvalidModule) {
                const errorMsg = `APP INIT ERROR (initializeAppLogic): Module '${mod.name}' missing/invalid. Halting.`;
                console.error(errorMsg, `Module (window.${mod.name}) is:`, currentModuleObject);
                if (currentModuleObject && mod.keyFn) {
                    console.error(`APP_DEBUG: Detail for '${mod.name}': keyFn '${mod.keyFn}' check failed. typeof is ${typeof currentModuleObject[mod.keyFn]}, expected ${isPropertyCheck ? 'object/property' : 'function'}`);
                } else if (!currentModuleObject) {
                    console.error(`APP_DEBUG: Detail for '${mod.name}': Object itself is missing/falsy.`);
                }
                document.body.innerHTML = `<p>Application Error: Module ${mod.name} invalid. Check console.</p>`;
                allChecksPassedInternal = false;
                // return; // Exit initializeAppLogic - We will check allChecksPassedInternal after the loop
                break; // Exit the loop as a critical error occurred
            }
        }
        console.log(`APP_DEBUG: Module '${mod.name}' check PASSED.`);
    } // End of for...of loop

    if (!allChecksPassedInternal) {
        console.error("APP_DEBUG: initializeAppLogic - Not all critical module checks passed. Exiting before polyglotApp finalization.");
        return; // Exit initializeAppLogic if any check failed
    }
    console.log('APP_DEBUG: initializeAppLogic - Critical module checks PASSED.'); // This line was here before, keeping it.
    console.log(`app.ts: All critical module checks complete successfully (within initializeAppLogic).`);

    // Assign chatManager alias
    const chatOrchestrator = window.chatOrchestrator as ChatOrchestrator | undefined;
    if (chatOrchestrator) {
        window.chatManager = chatOrchestrator;
        console.log("app.ts (initializeAppLogic): window.chatManager aliased to chatOrchestrator.");
    } else {
        console.error("app.ts (initializeAppLogic): CRITICAL - chatOrchestrator not found! window.chatManager will be undefined.");
        // This could be a critical failure point depending on how `chatManager` is used later.
    }
    
    (window.polyglotApp as PolyglotApp).initiateSession = (connector: Connector, sessionTypeWithContext: string): void => {
        console.log(`APP_TS_DEBUG: polyglotApp.initiateSession for connector ID: ${connector?.id}, type: ${sessionTypeWithContext}`);
        
        const tabManager = window.tabManager as TabManagerModule | undefined;
        const chatManagerRef = window.chatManager as ChatOrchestrator | undefined; // Use chatManager alias
        const sessionManagerRef = window.sessionManager as SessionManager | undefined;

        if (!tabManager || !chatManagerRef || !sessionManagerRef || !connector?.id) {
            console.error("app.ts (initiateSession): missing dependencies (tabManager, chatManager, sessionManager) or invalid connector.", {
                tabManager: !!tabManager,
                chatManager: !!chatManagerRef,
                sessionManager: !!sessionManagerRef,
                connector: connector?.id
            });
            return;
        }

        switch (sessionTypeWithContext) {
            case "message":
                console.log("APP_TS_DEBUG: initiateSession - case 'message'. Calling chatManager.openConversation for:", connector?.id);
                chatManagerRef.openConversation?.(connector);
                console.log("APP_TS_DEBUG: initiateSession - case 'message'. Calling tabManager.switchToTab('messages').");
                tabManager.switchToTab('messages');
                break;
            case "message_modal":
                console.log("APP_TS_DEBUG: initiateSession - case 'message_modal'. Calling chatManager.openMessageModal for:", connector?.id);
                chatManagerRef.openMessageModal?.(connector);
                break;
            case "direct_modal":
                console.log("APP_TS_DEBUG: initiateSession - case 'direct_modal'. Calling sessionManager.startModalSession for:", connector?.id);
                sessionManagerRef.startModalSession?.(connector, sessionTypeWithContext);
                break;
            default:
                console.warn("app.ts (initiateSession): Unknown sessionType:", sessionTypeWithContext);
        }
    };
    console.log("app.ts (initializeAppLogic): polyglotApp.initiateSession assignment complete.");
    document.dispatchEvent(new CustomEvent('polyglotAppReady'));
    console.log("app.ts (initializeAppLogic): 'polyglotAppReady' event dispatched.");

    function setupGlobalModalButtonListeners(): void {
        console.log("APP_DEBUG: setupGlobalModalButtonListeners - ENTERED.");
        const dom = window.domElements as YourDomElements | undefined;
        const sm = window.sessionManager as SessionManager | undefined;
        const mh = window.modalHandler as ModalHandler | undefined;
        const csh = window.chatSessionHandler as ChatSessionHandler | undefined;

        if (!dom || !sm || !mh ) {
            console.error("App.ts (setupGlobalModalButtonListeners): Missing core dependencies! dom:", !!dom, "sm:", !!sm, "mh:", !!mh);
            return;
        }
        
        console.log("APP_DEBUG: setupGlobalModalButtonListeners - dom.closeRecapBtn:", dom.closeRecapBtn);
        dom.closeRecapBtn?.addEventListener('click', () => {
            console.log("APP_DEBUG: Close Recap Button CLICKED.");
            
            // --- THIS IS THE FIX ---
            const tabManager = window.tabManager as TabManagerModule | undefined;
            if (dom.sessionRecapScreen) {
                mh.close(dom.sessionRecapScreen);
            }
            // After closing the modal, force a switch to the messages tab.
            // This will trigger the chat view to re-render with the latest history.
            tabManager?.switchToTab('messages');
        });

        console.log("APP_DEBUG: setupGlobalModalButtonListeners - dom.downloadTranscriptBtn:", dom.downloadTranscriptBtn);
        dom.downloadTranscriptBtn?.addEventListener('click', () => {
            console.log("APP_DEBUG: Download Transcript Button CLICKED.");
            const sessionId = (dom.sessionRecapScreen as HTMLElement)?.dataset.sessionIdForDownload;
            if (sessionId) sm.downloadTranscriptForSession?.(sessionId);
        });

        dom.cancelCallBtn?.addEventListener('click', () => sm.cancelModalCallAttempt?.());
        dom.directCallEndBtn?.addEventListener('click', () => sm.endCurrentModalSession?.(true));
        dom.directCallSpeakerToggleBtn?.addEventListener('click', () => sm.toggleDirectCallSpeaker?.());
        dom.directCallMuteBtn?.addEventListener('click', () => sm.handleDirectCallMicToggle?.());
        dom.closeMessagingModalBtn?.addEventListener('click', () => csh?.endActiveModalMessagingSession?.());
        console.log("app.ts (initializeAppLogic): Global modal button listeners setup process finished.");
    }
    setupGlobalModalButtonListeners();

    console.log("app.ts (initializeAppLogic): Core modules have self-initialized via the event system.");
    console.log("app.ts (initializeAppLogic): The main app logic can now proceed with final setup if needed.");
    console.log("Polyglot Connect Application Initialized! (app.ts: initializeAppLogic end)");
    console.log('APP_DEBUG: ========== initializeAppLogic - EXITED SUCCESSFULLY ==========');
} // End of initializeAppLogic
// D:\polyglot_connect\src\js\app.ts
// ... (your existing CORE_MODULES_TO_WAIT_FOR aggregator logic is above this) ...

let _allCoreModulesReadyFired = false;
let _appLogicInitialized = false;

function tryInitializeApp() {
    if (_allCoreModulesReadyFired && !_appLogicInitialized) {
        console.log("app.ts (tryInitializeApp): 'allCoreModulesReady' has fired AND app logic not yet initialized. Initializing final app logic NOW.");
        _appLogicInitialized = true; // Set flag before calling to prevent re-entry
        initializeAppLogic();
    } else if (_appLogicInitialized) {
        console.log("app.ts (tryInitializeApp): App logic already initialized.");
    } else if (!_allCoreModulesReadyFired) {
        console.log("app.ts (tryInitializeApp): Waiting for 'allCoreModulesReady' to fire.");
    }
}

// Listener for the aggregated "all core modules ready" event
// This listener is set up immediately at script parse time.
document.addEventListener('allCoreModulesReady', () => {
    console.log("app.ts: Event 'allCoreModulesReady' RECEIVED by top-level listener.");
    _allCoreModulesReadyFired = true;
    // It's possible DOMContentLoaded hasn't fired yet, or it has.
    // tryInitializeApp will handle it.
    tryInitializeApp();
}, { once: true });

// DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    console.log('app.ts: DOMContentLoaded event fired.');
    // By the time DOMContentLoaded fires, allCoreModulesReady might have already fired
    // (if all modules load very quickly before DOM is fully parsed).
    // Or, we might still be waiting for it.
    // tryInitializeApp will ensure logic runs once both conditions are met.
    tryInitializeApp();
});

console.log("app.ts: Script parsing finished. Event listeners for 'allCoreModulesReady' and 'DOMContentLoaded' are set.");