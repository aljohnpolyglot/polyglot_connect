// js/app.js
// Main application entry point and orchestrator.

console.log("app.js: TOP LEVEL - Script executing.");
console.log("app.js TOP LEVEL: VITE_TEST_VAR from import.meta.env is:", import.meta.env?.VITE_TEST_VAR);
// Import API keys from the config.js module (which gets them from Vite's import.meta.env)
import * as apiKeysConfig from './config.js';
console.log("app.js: Imported apiKeysConfig:", apiKeysConfig);
console.log("app.js (LOCAL DEV TEST): Imported VITE_TEST_VAR_EXPORT:", apiKeysConfig.VITE_TEST_VAR_EXPORT);

// Set API keys on the window object immediately for other global scripts to access
console.log("app.js: Attempting to set API keys on window object...");
window.GEMINI_API_KEY = apiKeysConfig.GEMINI_API_KEY || undefined;
console.log("app.js: window.GEMINI_API_KEY set to:", window.GEMINI_API_KEY);
window.GEMINI_API_KEY_ALT = apiKeysConfig.GEMINI_API_KEY_ALT || undefined;
console.log("app.js: window.GEMINI_API_KEY_ALT set to:", window.GEMINI_API_KEY_ALT);
window.GEMINI_API_KEY_ALT_2 = apiKeysConfig.GEMINI_API_KEY_ALT_2 || undefined;
console.log("app.js: window.GEMINI_API_KEY_ALT_2 set to:", window.GEMINI_API_KEY_ALT_2);
window.GROQ_API_KEY = apiKeysConfig.GROQ_API_KEY || undefined;
console.log("app.js: window.GROQ_API_KEY set to:", window.GROQ_API_KEY);
window.TOGETHER_API_KEY = apiKeysConfig.TOGETHER_API_KEY || undefined;
console.log("app.js: window.TOGETHER_API_KEY set to:", window.TOGETHER_API_KEY);
console.log("app.js: API keys set on window object.");

// Log to confirm window variables are set (optional, good for debugging)
if (window.GEMINI_API_KEY) console.log("app.js: CONFIRMED - window.GEMINI_API_KEY has been set from config.js."); else console.warn("app.js: CONFIRMED - window.GEMINI_API_KEY is UNDEFINED after import from config.js.");
if (window.GROQ_API_KEY) console.log("app.js: CONFIRMED - window.GROQ_API_KEY has been set from config.js."); else console.warn("app.js: CONFIRMED - window.GROQ_API_KEY is UNDEFINED after import from config.js.");
if (window.TOGETHER_API_KEY) console.log("app.js: CONFIRMED - window.TOGETHER_API_KEY has been set from config.js."); else console.warn("app.js: CONFIRMED - window.TOGETHER_API_KEY is UNDEFINED after import from config.js.");

// Now the rest of your application logic that runs on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('app.js: DOMContentLoaded event fired. Initializing app logic...');
    console.log('app.js: At DOMContentLoaded, before polyglotApp creation, window.polyglotApp is:', window.polyglotApp);
    window.polyglotApp = {}; // Initialize polyglotApp object
    console.log('app.js: window.polyglotApp initialized to {}. Value is now:', window.polyglotApp);

    // Critical module checks including API keys (these now read from window)
    console.log('app.js: Starting critical module checks...');
    const criticalModules = [
        { name: 'GEMINI_API_KEY', obj: window.GEMINI_API_KEY, isKey: true },
        { name: 'GROQ_API_KEY', obj: window.GROQ_API_KEY, isKey: true },
        { name: 'TOGETHER_API_KEY', obj: window.TOGETHER_API_KEY, isKey: true },

        { name: 'polyglotHelpers', obj: window.polyglotHelpers },
        { name: 'flagLoader', obj: window.flagLoader },
        { name: 'polyglotConnectors', obj: window.polyglotConnectors },
        { name: 'polyglotGroupsData', obj: window.polyglotGroupsData },
        { name: 'polyglotFilterLanguages', obj: window.polyglotFilterLanguages },
        { name: 'polyglotFilterRoles', obj: window.polyglotFilterRoles },
        { name: 'polyglotMinigamesData', obj: window.polyglotMinigamesData },
        { name: 'polyglotSharedContent', obj: window.polyglotSharedContent },
        { name: 'aiService', obj: window.aiService, keyFn: 'generateTextMessage' },
        { name: 'geminiLiveApiService', obj: window.geminiLiveApiService, keyFn: 'connect' },

        { name: 'activityManager', obj: window.activityManager, keyFn: 'isConnectorActive' },
        { name: 'groupManager', obj: window.groupManager, keyFn: 'initialize' }, // Check if it's defined

        { name: 'conversationManager', obj: window.conversationManager, keyFn: 'initialize' },
        { name: 'textMessageHandler', obj: window.textMessageHandler, keyFn: 'sendEmbeddedTextMessage' }, // Check if it's defined
        { name: 'voiceMemoHandler', obj: window.voiceMemoHandler, keyFn: 'handleNewVoiceMemoInteraction' }, // Check if it's defined
        { name: 'chatActiveTargetManager', obj: window.chatActiveTargetManager, keyFn: 'getEmbeddedChatTargetId' }, // Check if it's defined
        { name: 'chatSessionHandler', obj: window.chatSessionHandler, keyFn: 'initialize' }, // Check if it's defined
        { name: 'chatOrchestrator', obj: window.chatOrchestrator, keyFn: 'initialize' }, // This should be checked

        { name: 'sessionStateManager', obj: window.sessionStateManager, keyFn: 'initializeBaseSession' },
        { name: 'liveCallHandler', obj: window.liveCallHandler, keyFn: 'startLiveCall' },
        { name: 'sessionHistoryManager', obj: window.sessionHistoryManager, keyFn: 'initializeHistory' },
        { name: 'sessionManager', obj: window.sessionManager, keyFn: 'initialize' },

        { name: 'domElements', obj: window.domElements },
        { name: 'modalHandler', obj: window.modalHandler, keyFn: 'open' },
        { name: 'uiUpdater', obj: window.uiUpdater, keyFn: 'appendToVoiceChatLog' },
        { name: 'cardRenderer', obj: window.cardRenderer, keyFn: 'renderCards' },
        { name: 'listRenderer', obj: window.listRenderer, keyFn: 'renderActiveChatList' },
        { name: 'shellSetup', obj: window.shellSetup, keyFn: 'initializeAppCore' },
        { name: 'viewManager', obj: window.viewManager, keyFn: 'switchView' },
        { name: 'filterController', obj: window.filterController, keyFn: 'initializeFilters' },
        { name: 'personaModalManager', obj: window.personaModalManager, keyFn: 'openDetailedPersonaModal' },
        { name: 'chatUiManager', obj: window.chatUiManager, keyFn: 'showEmbeddedChatInterface' },
        { name: 'chatEventListeners', obj: window.chatEventListeners, keyFn: 'initializeEventListeners' } // Added check for chatEventListeners
    ];

    for (const mod of criticalModules) {
        console.log(`app.js: Checking module: '${mod.name}'. Expected on window: window.${mod.name}`);
        console.log(`app.js: Value of window.${mod.name} is:`, mod.obj);
        if (mod.obj && mod.keyFn) {
            console.log(`app.js: Checking key function '${mod.keyFn}' on window.${mod.name}. Type: ${typeof mod.obj[mod.keyFn]}`);
        }

        if (mod.isKey) {
            if (!mod.obj || mod.obj.includes('YOUR_') || mod.obj.includes('gsk_YOUR_')) {
                const errorMsg = `APP INIT ERROR: API Key '${mod.name}' is missing or invalid (from Vite setup). Halting.`;
                console.error(errorMsg, "Current value for", mod.name, ":", mod.obj);
                document.body.innerHTML = `<p style='padding:20px; text-align:center; color:red;'>
                    Application Error: Required API Key (${mod.name}) is invalid.
                    Check console for details.</p>`;
                return;
            }
        } else {
            const isInvalidModule = !mod.obj || (mod.keyFn && typeof mod.obj[mod.keyFn] !== 'function');
            if (isInvalidModule) {
                const errorMsg = `APP INIT ERROR: Module '${mod.name}' missing/invalid. Halting.`;
                console.error(errorMsg, `Module object (window.${mod.name}) is:`, mod.obj, mod.obj ? `Type: ${typeof mod.obj}` : 'Module object is null/undefined.');
                if (mod.obj && mod.keyFn) {
                    console.error(`app.js: Detail for '${mod.name}': keyFn '${mod.keyFn}' check failed. typeof mod.obj[mod.keyFn] is ${typeof mod.obj[mod.keyFn]}`);
                }
                document.body.innerHTML = `
                    <p style='padding:20px; text-align:center; color:red;'>
                        Application Error: Module ${mod.name} is invalid or missing.
                        Check console for details.
                    </p>`;
                return;
            }
        }
        console.log(`app.js: Module '${mod.name}' check PASSED.`);
    }

    console.log(`app.js: All critical module checks complete successfully.`);

    console.log("app.js: Before assigning chatManager, window.chatOrchestrator is:", window.chatOrchestrator);
    if (window.chatOrchestrator) {
        window.chatManager = window.chatOrchestrator;
        console.log("app.js: window.chatManager is now aliased to window.chatOrchestrator. Value is:", window.chatManager);
    } else {
        console.error("app.js: CRITICAL - chatOrchestrator not found AFTER criticalModules check! This implies it failed the check. Chat functionality will fail.");
        // No need to return here, the criticalModules check should have halted.
    }
    
    console.log("app.js: Defining polyglotApp.initiateSession. Current window.polyglotApp:", window.polyglotApp);
    // polyglotApp was initialized to {} at the start of DOMContentLoaded
    polyglotApp.initiateSession = (connector, sessionTypeWithContext) => {
        console.log(`app.js: polyglotApp.initiateSession CALLED for ${connector?.id || 'UnknownConnector'}, type: ${sessionTypeWithContext}`);
        const viewManager = window.viewManager;
        const chatManager = window.chatManager;
        const sessionManager = window.sessionManager;

        console.log("app.js: initiateSession - Dependencies: viewManager:", !!viewManager, "chatManager:", !!chatManager, "sessionManager:", !!sessionManager);

        if (!viewManager) {
            console.error("app.js: initiateSession - viewManager is not available!");
            return;
        }
        if (!chatManager) { // Check the aliased chatManager
            console.error("app.js: initiateSession - chatManager (chatOrchestrator) is not available!");
            return;
        }
        if (!sessionManager) {
             console.error("app.js: initiateSession - sessionManager is not available!");
            return;
        }

        if (!connector || !connector.id) {
            console.error("app.js: initiateSession - invalid connector object or missing connector.id", connector);
            return;
        }
        console.log("app.js: initiateSession - Connector and sessionTypeWithContext are valid. Proceeding with switch.");

        switch (sessionTypeWithContext) {
            case "message":
                console.log("app.js: initiateSession - Case 'message'");
                if (chatManager.openConversation) { // Method on chatOrchestrator
                    chatManager.openConversation(connector);
                } else {
                    console.error("app.js: initiateSession - chatManager.openConversation is not defined!");
                }
                if (viewManager.switchView) {
                    viewManager.switchView('messages');
                } else {
                    console.error("app.js: initiateSession - viewManager.switchView is not defined!");
                }
                break;
            case "message_modal":
                console.log("app.js: initiateSession - Case 'message_modal'");
                if (chatManager.openMessageModal) { // Method on chatOrchestrator
                    chatManager.openMessageModal(connector);
                } else {
                    console.error("app.js: initiateSession - chatManager.openMessageModal is not defined!");
                }
                break;
            case "direct_modal":
                console.log("app.js: initiateSession - Case 'direct_modal'");
                if (sessionManager.startModalSession) {
                    sessionManager.startModalSession(connector, sessionTypeWithContext);
                } else {
                    console.error("app.js: initiateSession - sessionManager.startModalSession is not defined!");
                }
                break;
            default:
                console.warn("app.js: Unknown sessionType in initiateSession:", sessionTypeWithContext);
        }
        console.log("app.js: initiateSession - Switch statement finished.");
    };
    console.log("app.js: polyglotApp.initiateSession assignment complete. window.polyglotApp is now:", window.polyglotApp);

    function setupGlobalModalButtonListeners() {
        console.log("app.js: setupGlobalModalButtonListeners - STARTING.");
        const domElements = window.domElements;
        const sessionManager = window.sessionManager;
        const chatManager = window.chatManager; // Use aliased chatManager
        const modalHandler = window.modalHandler;

        console.log("app.js: setupGlobalModalButtonListeners - Dependencies: domElements:", !!domElements, "sessionManager:", !!sessionManager, "chatManager:", !!chatManager, "modalHandler:", !!modalHandler);

        if (!domElements || !sessionManager || !chatManager || !modalHandler) {
            console.error("App.js setupGlobalModalButtonListeners: One or more core dependencies MISSING!");
            return;
        }

        // Recap Modal
        if (domElements.closeRecapBtn) {
            console.log("app.js: Adding listener to closeRecapBtn");
            domElements.closeRecapBtn.addEventListener('click', () => {
                console.log("app.js: Close Recap Button CLICKED!");
                modalHandler.close(domElements.sessionRecapScreen);
            });
        } else {
            console.warn("app.js: domElements.closeRecapBtn not found for listener.");
        }

        if (domElements.downloadTranscriptBtn) {
            console.log("app.js: Adding listener to downloadTranscriptBtn");
            domElements.downloadTranscriptBtn.addEventListener('click', () => {
                console.log("app.js: Download Transcript Button (Modal) CLICKED!");
                const sessionId = domElements.sessionRecapScreen?.dataset.sessionIdForDownload;
                console.log("app.js: downloadTranscriptBtn - sessionId:", sessionId);
                if (sessionId && sessionManager.downloadTranscriptForSession) {
                    sessionManager.downloadTranscriptForSession(sessionId);
                } else {
                    console.warn("app.js: No session ID on recap-download-transcript-btn or sessionManager.downloadTranscriptForSession missing. Session ID:", sessionId, "sessionRecapScreen dataset:", domElements.sessionRecapScreen?.dataset);
                }
            });
        } else {
            console.warn("app.js: domElements.downloadTranscriptBtn not found for listener.");
        }

        // Direct Call Modal
        if (domElements.cancelCallBtn) {
            console.log("app.js: Adding listener to cancelCallBtn");
            domElements.cancelCallBtn.addEventListener('click', () => {
                console.log("app.js: Cancel Call Button CLICKED!");
                if (sessionManager.cancelModalCallAttempt) sessionManager.cancelModalCallAttempt();
                else console.error("app.js: sessionManager.cancelModalCallAttempt is not defined!");
            });
        } else console.warn("app.js: domElements.cancelCallBtn not found.");

        if (domElements.directCallEndBtn) {
            console.log("app.js: Adding listener to directCallEndBtn");
            domElements.directCallEndBtn.addEventListener('click', () => {
                console.log("app.js: Direct Call End Button CLICKED!");
                if (sessionManager.endCurrentModalSession) sessionManager.endCurrentModalSession(true);
                else console.error("app.js: sessionManager.endCurrentModalSession is not defined!");
            });
        } else console.warn("app.js: domElements.directCallEndBtn not found.");

        if (domElements.directCallSpeakerToggleBtn) {
            console.log("app.js: Adding listener to directCallSpeakerToggleBtn");
            domElements.directCallSpeakerToggleBtn.addEventListener('click', () => {
                console.log("app.js: Direct Call Speaker Toggle Button CLICKED!");
                if (sessionManager.toggleDirectCallSpeaker) sessionManager.toggleDirectCallSpeaker();
                else console.error("app.js: sessionManager.toggleDirectCallSpeaker is not defined!");
            });
        } else console.warn("app.js: domElements.directCallSpeakerToggleBtn not found.");

        if (domElements.directCallMuteBtn) {
            console.log("app.js: Adding listener to directCallMuteBtn");
            domElements.directCallMuteBtn.addEventListener('click', () => {
                console.log("app.js: Direct Call Mute Button CLICKED!");
                if (sessionManager.handleDirectCallMicToggle) sessionManager.handleDirectCallMicToggle();
                else console.error("app.js: sessionManager.handleDirectCallMicToggle is not defined!");
            });
        } else console.warn("app.js: domElements.directCallMuteBtn not found.");

        if (domElements.directCallActivityBtn) {
            console.log("app.js: Adding listener to directCallActivityBtn");
            domElements.directCallActivityBtn.addEventListener('click', () => {
                console.log("app.js: Direct Call Activity Button CLICKED!");
                if (sessionManager.handleDirectCallActivityRequest) sessionManager.handleDirectCallActivityRequest();
                else console.error("app.js: sessionManager.handleDirectCallActivityRequest is not defined!");
            });
        } else console.warn("app.js: domElements.directCallActivityBtn not found.");


        // Messaging Modal
        if (domElements.closeMessagingModalBtn) {
            console.log("app.js: Adding listener to closeMessagingModalBtn");
            domElements.closeMessagingModalBtn.addEventListener('click', () => {
                console.log("app.js: Close Messaging Modal Button CLICKED!");
                // Delegate to chatSessionHandler as per refactor plan
                if (window.chatSessionHandler?.endActiveModalMessagingSession) {
                    window.chatSessionHandler.endActiveModalMessagingSession();
                } else {
                    console.error("app.js: window.chatSessionHandler.endActiveModalMessagingSession is not defined!");
                }
            });
        } else {
            console.warn("app.js: domElements.closeMessagingModalBtn not found for listener.");
        }

        // Listeners for message modal send button and text input are now set up in chat_event_listeners.js
        // because they depend on chatSessionHandler which in turn might use chatOrchestrator methods.
        // This avoids direct DOM manipulation for these from app.js.
        // If chat_event_listeners.js handles them, this specific block can be removed from app.js
        // For now, I'll keep the log to indicate they were previously here.
        console.log("app.js: Modal message send button/input listeners are now expected to be handled by chat_event_listeners.js or chat_ui_manager.js via chatSessionHandler.");


        console.log("app.js: Global modal button listeners setup process finished.");
    }

    // Initialize core managers in dependency order
    console.log("app.js: Initializing core managers (after critical checks)...");

    if (window.conversationManager?.initialize) {
        console.log("app.js: Initializing conversationManager...");
        window.conversationManager.initialize();
    } else console.warn("app.js: window.conversationManager.initialize not found.");

    if (window.chatOrchestrator?.initialize) {
        console.log("app.js: Initializing chatOrchestrator (which becomes chatManager)...");
        window.chatOrchestrator.initialize();
    } else console.warn("app.js: window.chatOrchestrator.initialize not found. This means chatManager will be a dummy.");

    // Re-affirm chatManager alias after chatOrchestrator.initialize has run.
    // This ensures if chatOrchestrator failed its internal init and returned a dummy,
    // chatManager reflects that, or if it succeeded, chatManager gets the real one.
    if (window.chatOrchestrator) {
        window.chatManager = window.chatOrchestrator;
        console.log("app.js: Re-affirmed window.chatManager alias to window.chatOrchestrator post-initialization. chatManager:", !!window.chatManager);
    }


    if (window.sessionManager?.initialize) {
        console.log("app.js: Initializing sessionManager...");
        window.sessionManager.initialize();
    } else console.warn("app.js: window.sessionManager.initialize not found.");

    if (window.groupManager?.initialize) {
        console.log("app.js: Initializing groupManager...");
        window.groupManager.initialize();
    } else console.warn("app.js: window.groupManager.initialize not found.");

    // Initialize chatSessionHandler, as it sets up its internal state.
    if (window.chatSessionHandler?.initialize) {
        console.log("app.js: Initializing chatSessionHandler...");
        window.chatSessionHandler.initialize();
    } else {
        console.warn("app.js: window.chatSessionHandler.initialize not found.");
    }

    console.log("app.js: Core managers initialization sequence complete.");


    console.log("app.js: Initializing core UI (after manager initializations)...");
    let uiCoreInitialized = false;
    if (window.shellSetup?.initializeAppCore) {
        console.log("app.js: Calling window.shellSetup.initializeAppCore()...");
        uiCoreInitialized = window.shellSetup.initializeAppCore();
        console.log("app.js: window.shellSetup.initializeAppCore() returned:", uiCoreInitialized);
    } else {
        console.error("app.js: window.shellSetup.initializeAppCore is not available!");
    }

    if (!uiCoreInitialized && window.shellSetup) {
        console.error("app.js: Core UI initialization reported failure or shellSetup was missing initializeAppCore.");
    } else if (!window.shellSetup) {
        console.error("app.js: window.shellSetup is itself not available! Cannot initialize core UI.");
    }
    console.log("app.js: Core UI initialization process finished.");

    // Initialize chat event listeners AFTER polyglotApp is defined AND other core UI might be ready
    if (window.chatEventListeners?.initializeEventListeners) {
        console.log("app.js: Calling window.chatEventListeners.initializeEventListeners()...");
        window.chatEventListeners.initializeEventListeners();
    } else {
        console.warn("app.js: window.chatEventListeners.initializeEventListeners not available.");
    }


    if (window.filterController?.initializeFilters) {
         console.log("app.js: Initializing filterController filters...");
         window.filterController.initializeFilters();
    } else {
        console.warn("app.js: filterController.initializeFilters not available.");
    }

    if (window.viewManager?.initializeAndSwitchToInitialView) {
        console.log("app.js: Initializing viewManager and switching to initial view...");
        window.viewManager.initializeAndSwitchToInitialView();
    } else {
        console.warn("app.js: viewManager.initializeAndSwitchToInitialView not available.");
    }

    console.log("app.js: Preparing to setup global modal button listeners...");
    setupGlobalModalButtonListeners();

    console.log("Polyglot Connect Application Initialized! (app.js: DOMContentLoaded end)");
});

console.log("app.js: Script parsing finished. DOMContentLoaded listener is set.");