// D:\polyglot_connect\src\js\app.ts
// --- START: FIREBASE AND AUTH GUARD SETUP ---
import { auth } from "./firebase-config"; // <<< ADD THIS
import { onAuthStateChanged, type User } from "firebase/auth"; // <<< KEEP 
// In app.ts, with your other imports
import { initializeAccountPanel } from './ui/accountPanelHandler';
import { handleHomeTabActive } from './ui/homeDashboardHandler';




(window as any).enterScreenshotMode = (secretCode: string) => {
    if (secretCode === "polyglotDev2024") {
        sessionStorage.setItem("dev_override", "true");
        console.log("%cScreenshot mode activated. Reloading app.html...", "color: lime; font-weight: bold; font-size: 16px;");
        window.location.reload();
    } else {
        console.error("Incorrect secret code.");
    }
};
console.log("%cDev Tip: To bypass login for screenshots, type enterScreenshotMode('your_secret_code') in the console on this page.", "color: orange;");
// --- END: FIREBASE AND AUTH GUARD SETUP ---
import type {
    Connector,
    PolyglotApp, // For window.polyglotApp
    PolyglotHelpersOnWindow as PolyglotHelpers,
    FlagLoader,
    PersonaDataSourceItem, // For window.polyglotPersonasDataSource
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
const CORE_MODULES_TO_WAIT_FOR: { eventName: string, windowObjectKey: keyof Window, keyFunction?: string }[] = [
    // We only need to wait for the health tracker data module now.
    // The UI panels will be initialized by dev_panel.ts itself.
    { eventName: 'domElementsReady', windowObjectKey: 'domElements', keyFunction: 'appShell' },
    { eventName: 'devPanelReady', windowObjectKey: 'devPanel', keyFunction: 'initialize' },
    // { eventName: 'apiKeyHealthTrackerReady', windowObjectKey: 'apiKeyHealthTracker', keyFunction: 'initialize' },
    { eventName: 'shellSetupReady', windowObjectKey: 'shellSetup', keyFunction: 'initializeAppCore' },
    { eventName: 'jumpButtonManagerReady', windowObjectKey: 'jumpButtonManager', keyFunction: 'initialize' },
    { eventName: 'tabManagerReady', windowObjectKey: 'tabManager', keyFunction: 'initialize' },
    { eventName: 'sidebarPanelManagerReady', windowObjectKey: 'sidebarPanelManager', keyFunction: 'initialize' },
    { eventName: 'viewActionCoordinatorReady', windowObjectKey: 'viewActionCoordinator', keyFunction: 'initialize' },
    { eventName: 'titleNotifierReady', windowObjectKey: 'titleNotifier', keyFunction: 'initialize' },
    { eventName: 'chatOrchestratorReady', windowObjectKey: 'chatOrchestrator', keyFunction: 'initialize' },
    { eventName: 'groupManagerReady', windowObjectKey: 'groupManager', keyFunction: 'initialize' },
    { eventName: 'sessionManagerReady', windowObjectKey: 'sessionManager', keyFunction: 'initialize' },
    { eventName: 'filterControllerReady', windowObjectKey: 'filterController', keyFunction: 'initializeFilters' },
{ eventName: 'geminiLiveApiServiceReady', windowObjectKey: 'geminiLiveApiService', keyFunction: 'connect' },
{ eventName: 'voiceMemoHandlerReady', windowObjectKey: 'voiceMemoHandler', keyFunction: 'handleNewVoiceMemoInteraction' }
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
   // D:\polyglot_connect\src\js\app.ts

   if (moduleObject) {
    if (moduleInfo.keyFunction) {
        const key = moduleInfo.keyFunction;
        const propertyType = typeof moduleObject[key];
        
        // A module is ready if its key is a function, 
        // OR if its key is an object (like an HTMLElement) that is not null.
        isAlreadyReady = (propertyType === 'function') || (propertyType === 'object' && moduleObject[key] !== null);
    } else {
        // If no keyFunction is specified, the mere existence of the object is enough.
        isAlreadyReady = true;
    }
}

    if (isAlreadyReady) {
        console.log(`APP_CORE_READY_CHECK: Pre-check - Module for '${moduleInfo.eventName}' (window.${String(moduleInfo.windowObjectKey)}) is ALREADY functionally ready.`);
        markModuleAsReady(moduleInfo.eventName);
    } else {
        console.log(`APP_CORE_READY_CHECK: Pre-check - Module for '${moduleInfo.eventName}' not yet ready. Adding listener.`);
        document.addEventListener(moduleInfo.eventName, () => markModuleAsReady(moduleInfo.eventName), { once: true });
     // =================== ADD THIS BLOCK ===================
     if (moduleInfo.eventName === 'jumpButtonManagerReady') {
        document.addEventListener('jumpButtonManagerReady', () => {
            console.log('%c[APP] EVENT HEARD: "jumpButtonManagerReady"!', 'color: white; background: #fd7e14; font-size: 14px; padding: 4px;');
        }, { once: true });
    }
   
   
    }
});

console.log("app.ts: TOP LEVEL - Script executing."); // Changed from .js
console.log("app.ts TOP LEVEL: VITE_TEST_VAR from import.meta.env is:", import.meta.env?.VITE_TEST_VAR);
import * as apiKeysConfig from './config';

import './dev/dev_panel';

console.log("app.ts: Imported apiKeysConfig:", apiKeysConfig);

interface CriticalModuleDef { // Ensure this interface is defined if not already globally
    name: string;
    obj: any;
    isKey?: boolean;
    keyFn?: string;
}

async function initializeAppLogic(): Promise<void> {
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
        { name: 'aiTranslationService', obj: window.aiTranslationService as import('./types/global').AiTranslationServiceModule | undefined, keyFn: 'initialize' },
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
                break;
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
                break;
            }
        }
        console.log(`APP_DEBUG: Module '${mod.name}' check PASSED.`);
    }

    if (!allChecksPassedInternal) {
        console.error("APP_DEBUG: initializeAppLogic - Not all critical module checks passed. Exiting before polyglotApp finalization.");
        return; // Exit initializeAppLogic if any check failed
    }
    console.log('APP_DEBUG: initializeAppLogic - Critical module checks PASSED.'); // This line was here before, keeping it.
    console.log('[APP INIT] Initializing Memory Service (Cerebrum)...');
    const memoryService = window.memoryService as import('./types/global').MemoryServiceModule | undefined;
    if (memoryService) {
        await memoryService.initialize();
        console.log('[APP INIT] Memory Service is ready.');
    } else {
        console.error("[APP INIT] CRITICAL: memoryService not found for final initialization.");
    }
    
    
    console.log('[APP INIT] Initializing real-time services...');

    // Kick off the Firestore listener in the Conversation Manager
   // PASTE THIS NEW CODE BLOCK in app.ts

try {
    const conversationManager = window.conversationManager!;
    // This 'await' is the magic. It pauses the app here until Step 1 is completely finished.
    await conversationManager.initialize();
    console.log('[APP INIT] Conversation Manager is ready (user authenticated).');

} catch (error) {
    console.error("CRITICAL: App initialization failed because Conversation Manager could not start.", error);
    // The app can't continue if this fails, so we stop.
    return; 
}
    const tabManager = window.tabManager as TabManagerModule | undefined;
    const jumpButtonManager = window.jumpButtonManager as JumpButtonManagerModule | undefined;
    const titleNotifier = window.titleNotifier as import('./types/global').TitleNotifierModule | undefined;
    const shellSetup = window.shellSetup as import('./types/global').ShellSetup | undefined;
    
    // --- Initialize Core UI Controllers ---
    console.log('[APP INIT] Initializing core UI controllers...');
    
    if (shellSetup) {
        shellSetup.initializeAppCore();
        console.log('[APP INIT] shellSetup.initializeAppCore() called.');
    } else {
        console.error('[APP INIT] CRITICAL: shellSetup not found.');
    }
    
    if (tabManager) {
        tabManager.initialize();
        console.log('[APP INIT] tabManager.initialize() called.');
    } else {
        console.error('[APP INIT] CRITICAL: tabManager not found.');
    }
    
    if (jumpButtonManager && tabManager) {
        const initialTab = tabManager.getCurrentActiveTab();
        jumpButtonManager.initialize(initialTab);
        console.log(`[APP INIT] jumpButtonManager.initialize('${initialTab}') called.`);
    } else {
        console.error('[APP INIT] FAILED: Could not initialize Jump Button Manager. Dependencies missing.');
    }
    
    if (titleNotifier) {
        titleNotifier.initialize();
        console.log('[APP INIT] titleNotifier.initialize() called.');
    }
    
   
   
    console.log(`app.ts: All critical module checks complete successfully (within initializeAppLogic).`);

    // Assign chatManager alias
    const chatOrchestrator = window.chatOrchestrator as ChatOrchestrator | undefined;
    if (chatOrchestrator) {
        window.chatManager = chatOrchestrator;
        console.log("app.ts (initializeAppLogic): window.chatManager aliased to chatOrchestrator.");
    } else {
        console.error("app.ts (initializeAppLogic): CRITICAL - chatOrchestrator not found! window.chatManager will be undefined.");
    }

    if (window.aiTranslationService?.initialize) {
        console.groupCollapsed('%c[APP_INIT] Wiring up AiTranslationService...', 'font-weight: bold; color: #9c27b0;');
    
        const hasConvoManager = !!(window.conversationManager?.getConversationById);
        const hasAiService = !!(window.aiService?.generateTextMessage);
    
        console.log(`Dependency Check: conversationManager is ready? -> ${hasConvoManager}`);
        console.log(`Dependency Check: aiService is ready? -> ${hasAiService}`);
        
        const hasGroupDataManager = !!(window.groupDataManager && window.groupDataManager.initialize); // <<< ADD THIS CHECK

        if (hasConvoManager && hasAiService && hasGroupDataManager) { // <<< ADD hasGroupDataManager
            console.log('%cAll dependencies MET. Initializing aiTranslationService now.', 'color: green;');
            if (window.aiTranslationService && typeof window.aiTranslationService.initialize === 'function') {
                window.aiTranslationService.initialize({
                    conversationManager: window.conversationManager!,
                    aiService: window.aiService!,
                    groupDataManager: window.groupDataManager! // <<< PASS IT HERE
                });
            } else {
                console.error('Cannot initialize aiTranslationService. Missing dependencies.');
            }
        } else {
            console.error('Cannot initialize aiTranslationService. Missing dependencies.');
        }
        console.groupEnd();
    
    } else {
        console.error('[APP_INIT] FAILED to find window.aiTranslationService.initialize function during wiring.');
    }
    if (titleNotifier) {
        titleNotifier.initialize();
        console.log("app.ts (initializeAppLogic): Title Notifier has been initialized.");
    }
    const filterController = window.filterController as FilterController | undefined;
    if (filterController) {
        filterController.initializeFilters();
        console.log('[APP INIT] filterController.initializeFilters() called.');
    } else {
        console.error('[APP INIT] CRITICAL: filterController not found for final initialization.');
    }

// ==========================================================
// === START: NEW DASHBOARD & ACCOUNT PANEL WIRING        ===
// ==========================================================

console.log('[APP INIT] Setting up Home Dashboard and Account Panel listeners...');

// We listen for the 'tabSwitched' event that our tabManager sends out.
document.addEventListener('tabSwitched', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    
    // When the user clicks on the "Home" tab, we run our home dashboard logic.
    if (detail.newTab === 'home') {
        console.log("Event received: Switched to Home tab. Initializing dashboard content.");
        handleHomeTabActive();
    }
});

// We initialize the Account Panel once, right after login.
// It will attach its own real-time listener to Firestore and stay updated.
try {
    initializeAccountPanel();
    console.log('[APP INIT] initializeAccountPanel() called successfully.');
} catch (error) {
    console.error('[APP INIT] Error calling initializeAccountPanel():', error);
}

// Since the app loads on the 'home' tab by default, we need to trigger
// the handler once manually to populate the content on first load.
const initialTab = window.tabManager?.getCurrentActiveTab();
if (initialTab === 'home') {
    console.log('[APP INIT] App is starting on Home tab. Triggering initial dashboard load.');
    handleHomeTabActive();
}

// ==========================================================
// === END: NEW DASHBOARD & ACCOUNT PANEL WIRING          ===
// ==========================================================




    (window.polyglotApp as PolyglotApp).initiateSession = (connector: Connector, sessionTypeWithContext: string): void => {
        console.log(`APP_TS_DEBUG: polyglotApp.initiateSession for connector ID: ${connector?.id}, type: ${sessionTypeWithContext}`);

        const tabManager = window.tabManager as TabManagerModule | undefined;
        const jumpButtonManager = window.jumpButtonManager as JumpButtonManagerModule | undefined; // <<< ADD THIS
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
     // =================== REPLACE THE JBM INITIALIZATION BLOCK IN app.ts WITH THIS ===================

console.log('%c[APP INIT] Preparing to initialize Jump Button Manager...', 'color: white; background: purple; padding: 2px;');

console.log(`[APP INIT] JBM Check: Is jumpButtonManager object available? ${!!jumpButtonManager}`);
console.log(`[APP INIT] JBM Check: Is tabManager object available? ${!!tabManager}`);

if (jumpButtonManager && tabManager) {
    const initialTab = tabManager.getCurrentActiveTab();
    console.log(`[APP INIT] JBM: Got initial tab: '${initialTab}'. Calling jumpButtonManager.initialize().`);

    try {
        jumpButtonManager.initialize(initialTab);
        console.log('%c[APP INIT] SUCCESS: Jump Button Manager has been initialized.', 'color: white; background: green; padding: 2px;');
    } catch (error) {
        console.error('%c[APP INIT] FATAL ERROR during jumpButtonManager.initialize() call:', 'color: white; background: red; padding: 2px;', error);
    }
    
} else {
    console.error('%c[APP INIT] FAILED: Could not initialize Jump Button Manager. One or more dependencies were missing on the window object.', 'color: white; background: red; padding: 2px;');
    console.error(`[APP INIT] FAILED Details: jumpButtonManager: ${!!jumpButtonManager}, tabManager: ${!!tabManager}`);
}

// =================================== END OF REPLACEMENT BLOCK ===================================
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
            console.log("APP_DEBUG: Close Recap Button CLICKED. (No redirect expected)"); // Updated log

            // const tabManager = window.tabManager as TabManagerModule | undefined; // Not needed for the fix
            if (dom.sessionRecapScreen && mh) { // Ensure mh is available
                mh.close(dom.sessionRecapScreen);
            }
            
            // DO NOT SWITCH TABS. The user should remain on the 'summary' tab
            // if they opened the recap modal from there.
            // tabManager?.switchToTab('messages'); // <<< REMOVED THIS LINE

            // Optional: If closing the recap modal should clear the main view summary display
            // when on the summary tab, you might add logic here.
            // For now, the request is just to prevent the redirect.
            // Example of optional clear:
            // const currentTab = window.tabManager?.getCurrentActiveTab();
            // if (currentTab === 'summary' && window.viewActionCoordinator?.displaySessionSummaryInMainView) {
            //     window.viewActionCoordinator.displaySessionSummaryInMainView(null);
            // }
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
// D:\polyglot_connect\src\js\app.ts (The Correct Final Block)

} // End of initializeAppLogic
// D:\polyglot_connect\src\js\app.ts

let _allCoreModulesReadyFired = false;
let _authStateConfirmed = false; // Flag to check if Firebase auth state is resolved
let _appLogicInitialized = false;

function tryInitializeApp() {
    // We can only initialize the main app logic when BOTH conditions are met:
    // 1. All core JS modules have loaded.
    // 2. Firebase has confirmed an authenticated user (or dev override).
    if (_allCoreModulesReadyFired && _authStateConfirmed && !_appLogicInitialized) {
        console.log("app.ts (tryInitializeApp): 'allCoreModulesReady' AND 'authStateConfirmed' are both true. Initializing final app logic NOW.");
        _appLogicInitialized = true; // Set flag before calling to prevent re-entry
        initializeAppLogic();
    } else if (_appLogicInitialized) {
        // This is normal, it means the app is already running and this function was likely called by the other event.
    } else {
        // This is also normal, it means one of the two prerequisites has not fired yet.
        console.log(`app.ts (tryInitializeApp): Waiting for all conditions. Status: allCoreModulesReady=${_allCoreModulesReadyFired}, authStateConfirmed=${_authStateConfirmed}`);
    }
}

// Listener for the aggregated "all core modules ready" event
document.addEventListener('allCoreModulesReady', () => {
    console.log("app.ts: Event 'allCoreModulesReady' RECEIVED by top-level listener.");
    _allCoreModulesReadyFired = true;
    tryInitializeApp(); // Check if we can initialize
}, { once: true });

// DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    console.log('app.ts: DOMContentLoaded event fired.');
    // This listener is fine as is; it doesn't trigger app initialization.
});

console.log("app.ts: Script parsing finished. Event listeners are set.");


// The main authentication check
onAuthStateChanged(auth, (user: User | null) => {
    // Check for our secret sessionStorage key
    const devOverride = sessionStorage.getItem("dev_override");

    if (user || devOverride === "true") {
        // Access is granted if user is logged in OR dev override is active
        if (devOverride === "true") {
            console.warn("Auth Guard: Bypassed by developer override. Welcome, master.");
        } else {
            console.log("Auth Guard: Access granted for user", user?.uid);
        }
        
        _authStateConfirmed = true; // Set the auth flag to true
        tryInitializeApp(); // Check if we can initialize
    } else {
        // User is not signed in and no dev override is present
        console.log("Auth Guard: Access denied. Redirecting to login page.");
        window.location.href = '/index.html';
    }
});
  // --- END: AUTH GUARD LOGIC ---
// =======================================================================================