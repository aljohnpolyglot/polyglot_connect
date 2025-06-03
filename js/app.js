// js/app.js
// Main application entry point and orchestrator.

// Import API keys from the config.js module (which gets them from Vite's import.meta.env)
import * as apiKeysConfig from './config.js';

// Set API keys on the window object immediately for other global scripts to access
window.GEMINI_API_KEY = apiKeysConfig.GEMINI_API_KEY || undefined;
window.GEMINI_API_KEY_ALT = apiKeysConfig.GEMINI_API_KEY_ALT || undefined;
window.GEMINI_API_KEY_ALT_2 = apiKeysConfig.GEMINI_API_KEY_ALT_2 || undefined;
window.GROQ_API_KEY = apiKeysConfig.GROQ_API_KEY || undefined;
window.TOGETHER_API_KEY = apiKeysConfig.TOGETHER_API_KEY || undefined;

// Log to confirm window variables are set (optional, good for debugging)
if (window.GEMINI_API_KEY) console.log("app.js: window.GEMINI_API_KEY has been set from config.js."); else console.warn("app.js: window.GEMINI_API_KEY is UNDEFINED after import from config.js.");
if (window.GROQ_API_KEY) console.log("app.js: window.GROQ_API_KEY has been set from config.js."); else console.warn("app.js: window.GROQ_API_KEY is UNDEFINED after import from config.js.");
if (window.TOGETHER_API_KEY) console.log("app.js: window.TOGETHER_API_KEY has been set from config.js."); else console.warn("app.js: window.TOGETHER_API_KEY is UNDEFINED after import from config.js.");
// Add similar logs for ALT keys if needed for debugging

// Now the rest of your application logic that runs on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('app.js: DOM fully loaded. Initializing app logic...');
    window.polyglotApp = {};

    // Critical module checks including API keys (these now read from window)
    const criticalModules = [
        { name: 'GEMINI_API_KEY', obj: window.GEMINI_API_KEY, isKey: true },
        { name: 'GROQ_API_KEY', obj: window.GROQ_API_KEY, isKey: true },
        { name: 'TOGETHER_API_KEY', obj: window.TOGETHER_API_KEY, isKey: true },
        // Note: You might also want to check for GEMINI_API_KEY_ALT and _ALT_2 here if they are critical
        // { name: 'GEMINI_API_KEY_ALT', obj: window.GEMINI_API_KEY_ALT, isKey: true }, 
        // { name: 'GEMINI_API_KEY_ALT_2', obj: window.GEMINI_API_KEY_ALT_2, isKey: true },

        // Core Services & Utilities
        { name: 'polyglotHelpers', obj: window.polyglotHelpers },
        { name: 'flagLoader', obj: window.flagLoader },
        { name: 'polyglotConnectors', obj: window.polyglotConnectors }, // This is your personas.js
        { name: 'polyglotGroupsData', obj: window.polyglotGroupsData }, // This is your groups.js
        { name: 'polyglotFilterLanguages', obj: window.polyglotFilterLanguages }, // Check if these are actual objects you define
        { name: 'polyglotFilterRoles', obj: window.polyglotFilterRoles },       // or parts of another module
        { name: 'polyglotMinigamesData', obj: window.polyglotMinigamesData }, // This is your minigames.js
        { name: 'polyglotSharedContent', obj: window.polyglotSharedContent }, // This is your shared_content.js
        { name: 'aiService', obj: window.aiService, keyFn: 'generateTextMessage' },
        { name: 'geminiLiveApiService', obj: window.geminiLiveApiService, keyFn: 'connect' },

        // Core Logic Managers
        { name: 'activityManager', obj: window.activityManager, keyFn: 'isConnectorActive' },
        { name: 'groupManager', obj: window.groupManager, keyFn: 'initialize' },

        // Chatting Sub-Modules
        { name: 'conversationManager', obj: window.conversationManager, keyFn: 'initialize' },
        { name: 'textMessageHandler', obj: window.textMessageHandler, keyFn: 'sendEmbeddedTextMessage' },
        { name: 'voiceMemoHandler', obj: window.voiceMemoHandler, keyFn: 'handleNewVoiceMemoInteraction' },
        { name: 'chatOrchestrator', obj: window.chatOrchestrator, keyFn: 'initialize' },

        // Session Management Modules
        { name: 'sessionStateManager', obj: window.sessionStateManager, keyFn: 'initializeBaseSession' },
        { name: 'liveCallHandler', obj: window.liveCallHandler, keyFn: 'startLiveCall' },
        { name: 'sessionHistoryManager', obj: window.sessionHistoryManager, keyFn: 'initializeHistory' },
        { name: 'sessionManager', obj: window.sessionManager, keyFn: 'initialize' }, // Facade

        // UI Modules
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
    ];

    for (const mod of criticalModules) {
        if (mod.isKey) {
            // Check if the key is undefined (from || undefined in assignments above) 
            // or still contains a placeholder (less likely now with Vite but good to keep)
            if (!mod.obj || mod.obj.includes('YOUR_') || mod.obj.includes('gsk_YOUR_')) {
                const errorMsg = `APP INIT ERROR: API Key '${mod.name}' is missing or invalid (from Vite setup).`;
                console.error(errorMsg, "Current value for", mod.name, ":", mod.obj);
                document.body.innerHTML = `<p style='padding:20px; text-align:center;'>
                    Application Error: Required API Key (${mod.name}) is invalid. 
                    Check console for details.</p>`;
                return; // Halt execution
            }
        } else {
            // Non-key module checks remain strict
            const isInvalidModule = !mod.obj || (mod.keyFn && typeof mod.obj[mod.keyFn] !== 'function');
            if (isInvalidModule) {
                const errorMsg = `APP INIT ERROR: Module '${mod.name}' missing/invalid. Halting.`;
                console.error(errorMsg, mod.obj ? `Type: ${typeof mod.obj}` : 'Module object is null/undefined');
                document.body.innerHTML = `
                    <p style='padding:20px; text-align:center; color:red;'>
                        Application Error: Module ${mod.name} is invalid or missing.
                        Check console for details.
                    </p>`;
                return; // Halt execution
            }
        }
    }

    console.log(`app.js: Module checks complete.`);

    // Assign the orchestrator to the global chatManager name
    if (window.chatOrchestrator) {
        window.chatManager = window.chatOrchestrator; // Facade pattern
        console.log("app.js: window.chatManager is now aliased to window.chatOrchestrator.");
    } else {
        console.error("app.js: CRITICAL - chatOrchestrator not found! Chat functionality will fail.");
        // return; // Consider if you want to halt here too
    }

    // Initialize polyglotApp.initiateSession
    if (!window.polyglotApp) window.polyglotApp = {}; // Ensure polyglotApp exists
    polyglotApp.initiateSession = (connector, sessionTypeWithContext) => {
        console.log(`app.js: polyglotApp.initiateSession CALLED for ${connector?.id || 'UnknownConnector'}, type: ${sessionTypeWithContext}`);
        const viewManager = window.viewManager; // Assuming viewManager is globally available by now

        if (!viewManager) {
            console.error("app.js: initiateSession - viewManager is not available!");
            return;
        }
        if (!window.chatManager) {
            console.error("app.js: initiateSession - chatManager is not available!");
            return;
        }
        if (!window.sessionManager) {
             console.error("app.js: initiateSession - sessionManager is not available!");
            return;
        }


        if (!connector || !connector.id) {
            console.error("app.js: initiateSession - invalid connector object or missing connector.id", connector);
            // Optionally, provide feedback to the user or default behavior
            // alert("Cannot initiate session: Connector information is missing.");
            return;
        }

        switch (sessionTypeWithContext) {
            case "message":
                window.chatManager?.openConversation(connector);
                viewManager?.switchView('messages');
                break;
            case "message_modal":
                window.chatManager?.openMessageModal(connector);
                break;
            case "direct_modal":
                window.sessionManager?.startModalSession(connector, sessionTypeWithContext);
                break;
            default:
                console.warn("app.js: Unknown sessionType:", sessionTypeWithContext);
        }
    };
    console.log("app.js: polyglotApp.initiateSession assignment complete.");

    function setupGlobalModalButtonListeners() {
        console.log("app.js: setupGlobalModalButtonListeners - STARTING.");
        const { domElements, sessionManager, chatManager, modalHandler } = window;

        if (!domElements) {
            console.error("App.js setupGlobalModalButtonListeners: domElements MISSING!");
            return;
        }
        if (!sessionManager) {
            console.error("App.js setupGlobalModalButtonListeners: sessionManager MISSING!");
            return;
        }
        if (!chatManager) {
            console.error("App.js setupGlobalModalButtonListeners: chatManager MISSING!");
            return;
        }
        if (!modalHandler) {
            console.error("App.js setupGlobalModalButtonListeners: modalHandler MISSING!");
            return;
        }


        // Recap Modal
        if (domElements.closeRecapBtn) {
            domElements.closeRecapBtn.addEventListener('click', () => {
                console.log("Close Recap Button CLICKED!");
                modalHandler.close(domElements.sessionRecapScreen);
            });
        } else {
            console.warn("app.js: domElements.closeRecapBtn not found.");
        }

        if (domElements.downloadTranscriptBtn) {
            domElements.downloadTranscriptBtn.addEventListener('click', () => {
                console.log("Download Transcript Button (Modal) CLICKED!");
                const sessionId = domElements.sessionRecapScreen?.dataset.sessionIdForDownload;
                if (sessionId) {
                    sessionManager.downloadTranscriptForSession(sessionId);
                } else {
                    // alert("No session ID found on recap modal for transcript download."); // Consider if alert is too intrusive
                    console.warn("app.js: No session ID on recap-download-transcript-btn for sessionRecapScreen:", domElements.sessionRecapScreen?.dataset);
                }
            });
        } else {
            console.warn("app.js: domElements.downloadTranscriptBtn not found.");
        }

        // Direct Call Modal
        if (domElements.cancelCallBtn) domElements.cancelCallBtn.addEventListener('click', () => sessionManager.cancelModalCallAttempt());
        if (domElements.directCallEndBtn) domElements.directCallEndBtn.addEventListener('click', () => sessionManager.endCurrentModalSession(true));
        if (domElements.directCallSpeakerToggleBtn) domElements.directCallSpeakerToggleBtn.addEventListener('click', () => sessionManager.toggleDirectCallSpeaker());
        if (domElements.directCallMuteBtn) domElements.directCallMuteBtn.addEventListener('click', () => sessionManager.handleDirectCallMicToggle());
        if (domElements.directCallActivityBtn) domElements.directCallActivityBtn.addEventListener('click', () => sessionManager.handleDirectCallActivityRequest());

        // Messaging Modal
        if (domElements.closeMessagingModalBtn) domElements.closeMessagingModalBtn.addEventListener('click', () => chatManager.endModalMessagingSession());
        
        if (domElements.messageSendBtn && domElements.messageTextInput) { // Ensure messageTextInput exists here too
            const sendModalTextMessageFn = () => { // Renamed to avoid conflict if any
                if (domElements.messageTextInput && chatManager.getTextMessageHandler) { // Check getTextMessageHandler
                    const textMessageHandler = chatManager.getTextMessageHandler();
                    if (textMessageHandler && typeof textMessageHandler.sendModalTextMessage === 'function') {
                        textMessageHandler.sendModalTextMessage(domElements.messageTextInput.value, chatManager.getCurrentModalMessageTarget());
                         domElements.messageTextInput.value = ''; // Clear input after sending
                    } else {
                        console.error("textMessageHandler or sendModalTextMessage not available.");
                    }
                } else {
                     console.error("messageTextInput or chatManager.getTextMessageHandler not available.");
                }
            };
            domElements.messageSendBtn.addEventListener('click', sendModalTextMessageFn);
            domElements.messageTextInput.addEventListener('keypress', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendModalTextMessageFn();
                }
            });
        } else {
            if (!domElements.messageSendBtn) console.warn("app.js: domElements.messageSendBtn not found.");
            if (!domElements.messageTextInput) console.warn("app.js: domElements.messageTextInput not found.");
        }

        console.log("app.js: Global modal button listeners setup process finished.");
    }

    // Initialize core managers in dependency order
    // Ensure these are initialized after criticalModules check and window.chatManager assignment
    console.log("app.js: Initializing core managers (after critical checks)...");

    if (window.conversationManager?.initialize) {
        console.log("app.js: Initializing conversationManager...");
        window.conversationManager.initialize();
    }

    if (window.chatManager?.initialize) { // This is actually chatOrchestrator
        console.log("app.js: Initializing chatManager (aliased chatOrchestrator)...");
        window.chatManager.initialize();
    }

    if (window.sessionManager?.initialize) {
        console.log("app.js: Initializing sessionManager...");
        window.sessionManager.initialize();
    }

    if (window.groupManager?.initialize) {
        console.log("app.js: Initializing groupManager...");
        window.groupManager.initialize();
    }
    console.log("app.js: Core managers initialization complete.");


    console.log("app.js: Initializing core UI (after manager initializations)...");
    let uiCoreInitialized = false;
    if (window.shellSetup?.initializeAppCore) {
        uiCoreInitialized = window.shellSetup.initializeAppCore();
    } else {
        console.error("app.js: window.shellSetup.initializeAppCore is not available!");
    }

    if (!uiCoreInitialized && window.shellSetup) { // Added window.shellSetup check
        console.error("app.js: Core UI initialization reported failure or shellSetup was missing initializeAppCore.");
        // return; // Consider if halting is appropriate
    } else if (!window.shellSetup) {
        console.error("app.js: window.shellSetup is itself not available!");
    }
    console.log("app.js: Core UI initialization process finished.");


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

    // Setup listeners after all initializations that might create the DOM elements
    // or attach the manager objects to window.
    setupGlobalModalButtonListeners();

    console.log("Polyglot Connect Application Initialized!");
});