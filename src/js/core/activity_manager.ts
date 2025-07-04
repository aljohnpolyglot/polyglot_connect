// D:\polyglot_connect\src\js\core\activity_manager.ts
import type {
    Connector,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    UiUpdater,
    GroupUiHandler,
    ActivityManager,
    ChatMessageOptions // <<< ADD THIS LINE TO IMPORT THE TYPE
} from '../types/global.d.ts';

console.log('activity_manager.ts: Script loaded, waiting for core dependencies.');

interface ActivityManagerModule {
    isConnectorActive: (connector: Connector | null | undefined) => boolean;
    simulateAiTyping: (connectorId: string, chatType?: string, aiMessageText?: string) => void;
    clearAiTypingIndicator: (connectorId: string, chatType?: string, thinkingMsgElement?: HTMLElement | null) => void;
    getAiReplyDelay: (connector: Connector | null | undefined, messageLength?: number) => number;
}

// Placeholder assignment (optional, but good practice if other modules might pre-check it)
// Placeholder assignment that conforms to the ActivityManager interface
// Placeholder assignment that conforms to the ActivityManager interface
window.activityManager = {
    isConnectorActive: () => true,
    simulateAiTyping: () => {
        console.warn("AM placeholder: simulateAiTyping called.");
        return null;
    },
    clearAiTypingIndicator: () => console.warn("AM placeholder: clearAiTypingIndicator called."),
    getAiReplyDelay: () => 1500,
    isPlaceholder: true // <<< ADD THIS LINE
} as any; // Use 'as any' to allow the extra property
console.log('activity_manager.ts: Placeholder window.activityManager assigned.');


function initializeActualActivityManager(): void {
    console.log('activity_manager.ts: initializeActualActivityManager() called.');

    // This check happens AFTER 'uiUpdaterPlaceholderReady' has been received.
    // Now, we verify if the uiUpdater that is currently on window is the FUNCTIONAL one.
    const helpersReady = !!(window.polyglotHelpers && typeof (window.polyglotHelpers as PolyglotHelpers).isConnectorCurrentlyActive === 'function');
    // CRITICAL: Check for functional uiUpdater here before proceeding
    const functionalUiUpdaterReady = !!(window.uiUpdater && typeof (window.uiUpdater as UiUpdater).appendToEmbeddedChatLog === 'function');
    const connectorsReady = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors));

    console.log(`ACTIVITY_MANAGER_DEBUG (inside initializeActual):`);
    console.log(`  helpersReady:`, helpersReady);
    console.log(`  functionalUiUpdaterReady (checking specific methods):`, functionalUiUpdaterReady, `(window.uiUpdater: ${!!window.uiUpdater})`);
    console.log(`  connectorsReady:`, connectorsReady);

    if (!helpersReady || !functionalUiUpdaterReady || !connectorsReady) {
        console.error("activity_manager.ts: CRITICAL - Detailed FUNCTIONAL dependency check FAILED for initializeActualActivityManager. ActivityManager will be non-functional.");
        console.error(`  Failed functional checks -> helpers: ${helpersReady}, functionalUiUpdater: ${functionalUiUpdaterReady}, connectors: ${connectorsReady}`);
        // Dummy methods were already set on the placeholder if this path is hit due to a race condition.
        // We still dispatch 'activityManagerReady' to not block other modules that might only need the placeholder.
        // However, this indicates a severe problem in the init order if this happens.
        document.dispatchEvent(new CustomEvent('activityManagerReady'));
        console.warn('activity_manager.ts: "activityManagerReady" dispatched (INITIALIZATION FAILED - functional deps not met inside initializeActual).');
        return;
    }
    console.log('activity_manager.ts: Core functional dependencies (including functional UiUpdater) appear ready (detailed check passed).');

    window.activityManager = ((): ActivityManager => {
        'use strict';
        console.log("core/activity_manager.ts: IIFE started for actual methods.");

        // These are now guaranteed by the outer check in initializeActualActivityManager
        const polyglotHelpers = window.polyglotHelpers as PolyglotHelpers;
        const polyglotConnectors = window.polyglotConnectors as Connector[];
        // uiUpdater will be fetched dynamically by methods needing it to ensure functionality

        const TYPING_INDICATOR_BASE_TIMEOUT = 2000;
        const personaTypingTimeouts: { [key: string]: ReturnType<typeof setTimeout> } = {};

        // Helper to get a confirmed functional UiUpdater or null
     // REPLACE WITH THIS
const getFunctionalUiUpdater = (): UiUpdater | null => {
    const currentUiUpdater = window.uiUpdater as UiUpdater | undefined;
    if (currentUiUpdater &&
        typeof currentUiUpdater.appendToEmbeddedChatLog === 'function' &&
        typeof currentUiUpdater.appendToMessageLogModal === 'function' &&
        typeof currentUiUpdater.appendToVoiceChatLog === 'function'
    ) {
        return currentUiUpdater;
    }
    console.warn("ActivityManager: Functional UiUpdater not available at runtime.");
    return null;
};
        function isConnectorActive(connector: Connector | null | undefined): boolean {
            if (!polyglotHelpers.isConnectorCurrentlyActive) {
                console.warn("ActivityManager: polyglotHelpers.isConnectorCurrentlyActive function is missing.");
                return true; // Default to active to avoid blocking if helper is broken
            }
            if (!connector) {
                return true; // No specific connector to check, assume general activity possible
            }
            return polyglotHelpers.isConnectorCurrentlyActive(connector);
        }

       // PASTE THIS ENTIRE CORRECTED FUNCTION
       function simulateAiTyping(connectorId: string, chatType: string = 'embedded'): HTMLElement | null {
        // --- CREATIVE DEBUG: The "Propmaster" ---
        // This function is now the Propmaster. Its only job is to prepare the props (the options) for the UI actor.
        console.log(`%c[AM Propmaster] Preparing props for a 'thinking' bubble. Connector: ${connectorId}, Context: ${chatType}`, 'color: #6610f2');
    
        const currentUiUpdater = getFunctionalUiUpdater();
        const connector = polyglotConnectors.find(c => c.id === connectorId);
        
        if (!connector || !currentUiUpdater) {
            console.warn(`[AM Propmaster] Cannot prepare props. Missing connector or functional UI updater.`);
            return null;
        }
    
        const displayName = connector.profileName?.split(' ')[0] || connector.name || "Partner";
        const thinkingMessage = `${polyglotHelpers.sanitizeTextForDisplay(displayName)} is typing...`;
    
        // --- The "Prop Box" ---
        // This is the complete set of options we're passing to the UI renderer.
        const messageOptions: ChatMessageOptions = {
            isThinking: true, // <<< THE KEY PROP: This identifies it as a "Ghost Bubble".
            avatarUrl: connector.avatarModern,
            senderName: connector.profileName,
            speakerId: connector.id,
            connectorId: connector.id
        };
        
        console.log(`%c[AM Propmaster] Props ready:`, 'color: #6610f2', messageOptions);
    
        let thinkingBubbleElement: HTMLElement | null = null;
        const groupUiHandler = window.groupUiHandler;
    
        // The Propmaster hands the props to the correct stage manager (UI updater).
        if (chatType === 'group' && groupUiHandler?.updateGroupTypingIndicator) {
            thinkingBubbleElement = groupUiHandler.updateGroupTypingIndicator(thinkingMessage);
        } else if (chatType === 'embedded') {
            thinkingBubbleElement = currentUiUpdater.appendToEmbeddedChatLog?.(thinkingMessage, 'connector-thinking', messageOptions);
        } else if (chatType === 'modal_message') {
            thinkingBubbleElement = currentUiUpdater.appendToMessageLogModal?.(thinkingMessage, 'connector-thinking', messageOptions);
        } else if (chatType === 'voiceChat_modal') {
            thinkingBubbleElement = currentUiUpdater.appendToVoiceChatLog?.(thinkingMessage, 'connector-thinking', messageOptions);
        }
    
        return thinkingBubbleElement;
    }
     // PASTE THIS ENTIRE CORRECTED FUNCTION
     function clearAiTypingIndicator(
        connectorId: string,
        chatType: string = 'embedded',
        thinkingMsgElement: HTMLElement | null = null
    ): void {
        const timeoutKey = `${connectorId}_${chatType}`;
        if (personaTypingTimeouts[timeoutKey]) {
            clearTimeout(personaTypingTimeouts[timeoutKey]);
            delete personaTypingTimeouts[timeoutKey];
        }
    
        // This now works universally for all chat types, including groups
        if (thinkingMsgElement?.parentNode) {
            thinkingMsgElement.remove();
        }
    }

        function getAiReplyDelay(connector: Connector | null | undefined, messageLength: number = 0): number {
            if (!connector?.chatPersonality || !polyglotHelpers?.simulateTypingDelay) {
                return 1500;
            }
            return polyglotHelpers.simulateTypingDelay(
                connector.chatPersonality.typingDelayMs || 1500,
                messageLength
            );
        }

        console.log("core/activity_manager.ts: IIFE finished, returning exports.");
        return {
            isConnectorActive,
            simulateAiTyping,
            clearAiTypingIndicator,
            getAiReplyDelay
        };
    })(); // End of IIFE

    if (window.activityManager && typeof window.activityManager.isConnectorActive === 'function') {
        console.log("activity_manager.ts: SUCCESSFULLY assigned to window.activityManager.");
    } else {
        console.error("activity_manager.ts: CRITICAL ERROR - window.activityManager assignment FAILED or method missing.");
    }
    
    document.dispatchEvent(new CustomEvent('activityManagerReady'));
    console.log('activity_manager.ts: "activityManagerReady" event dispatched (functional).');

} // End of initializeActualActivityManager


// --- Dependency Management Logic ---
const dependenciesForActivityManager = ['polyglotHelpersReady', 'uiUpdaterPlaceholderReady', 'polyglotDataReady'];
let activityManagerDepsMetCount = 0;
const metDependenciesLog: { [key: string]: boolean } = {}; // Initialize correctly
dependenciesForActivityManager.forEach(dep => metDependenciesLog[dep] = false);


function checkAndInitActivityManager(receivedEventName?: string) {
    if (receivedEventName) {
        console.log(`ACTIVITY_MANAGER_EVENT: Listener for '${receivedEventName}' was triggered.`);
        
        // Verification for the event that was received
        let eventDependencyVerified = false;
        switch(receivedEventName) {
            case 'polyglotHelpersReady':
                eventDependencyVerified = !!(window.polyglotHelpers && typeof (window.polyglotHelpers as PolyglotHelpers).isConnectorCurrentlyActive === 'function');
                break;
            case 'uiUpdaterPlaceholderReady':
                eventDependencyVerified = !!window.uiUpdater; // Check for placeholder existence
                break;
            case 'polyglotDataReady':
                eventDependencyVerified = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors));
                break;
            default:
                console.warn(`ACTIVITY_MANAGER_EVENT: Unknown event '${receivedEventName}'`);
                return;
        }

        if (eventDependencyVerified) {
            if (!metDependenciesLog[receivedEventName]) {
                metDependenciesLog[receivedEventName] = true;
                activityManagerDepsMetCount++;
                console.log(`ACTIVITY_MANAGER_DEPS: Event '${receivedEventName}' processed. Verified: ${eventDependencyVerified}. Count: ${activityManagerDepsMetCount}/${dependenciesForActivityManager.length}`);
            }
        } else {
            console.warn(`ACTIVITY_MANAGER_DEPS: Event '${receivedEventName}' FAILED verification.`);
            // This is a critical point. If a placeholder event implies the object should exist,
            // and it doesn't, then something is wrong earlier.
        }
    }

    console.log(`ACTIVITY_MANAGER_DEPS: Met status:`, JSON.stringify(metDependenciesLog));

    if (activityManagerDepsMetCount === dependenciesForActivityManager.length) {
        console.log('activity_manager.ts: All placeholder/early dependencies met for ActivityManager. Queuing actual initialization.');
        requestAnimationFrame(() => {
            console.log('activity_manager.ts: RAF triggered - Calling initializeActualActivityManager (which does functional checks).');
            initializeActualActivityManager(); // This function now contains the stricter functional checks
        });
    }
}

console.log('ACTIVITY_MANAGER_SETUP: Starting initial dependency pre-check.');
activityManagerDepsMetCount = 0; 
Object.keys(metDependenciesLog).forEach(key => metDependenciesLog[key] = false); 
let activityManagerAllPreloadedAndVerified = true;

dependenciesForActivityManager.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false; // This verification is for the pre-check

    switch (eventName) {
        case 'polyglotHelpersReady':
            isReadyNow = !!window.polyglotHelpers;
            isVerifiedNow = !!(isReadyNow && typeof (window.polyglotHelpers as PolyglotHelpers)?.isConnectorCurrentlyActive === 'function');
            break;
        case 'uiUpdaterPlaceholderReady':
            isReadyNow = !!window.uiUpdater; // Check for placeholder existence
            isVerifiedNow = isReadyNow; 
            break;
        case 'polyglotDataReady': 
            isReadyNow = !!window.polyglotConnectors;
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotConnectors));
            break;
        default:
            console.warn(`ACTIVITY_MANAGER_PRECHECK: Unknown dependency event name: ${eventName}`);
            isVerifiedNow = false;
    }

    console.log(`ACTIVITY_MANAGER_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified for pre-check? ${isVerifiedNow}`);

    if (isVerifiedNow) {
        console.log(`activity_manager.ts: Pre-check: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!metDependenciesLog[eventName]) {
            metDependenciesLog[eventName] = true;
            activityManagerDepsMetCount++;
        }
    } else {
        activityManagerAllPreloadedAndVerified = false;
        const specificEventNameToListenFor = eventName;
        console.log(`activity_manager.ts: Pre-check: Dependency '${specificEventNameToListenFor}' not ready/verified. Adding listener.`);
        document.addEventListener(specificEventNameToListenFor, function eventHandlerCallback() {
            checkAndInitActivityManager(specificEventNameToListenFor);
        }, { once: true });
    }
});

console.log(`ACTIVITY_MANAGER_SETUP: Initial pre-check dep count: ${activityManagerDepsMetCount} / ${dependenciesForActivityManager.length}. Met:`, JSON.stringify(metDependenciesLog));

if (activityManagerAllPreloadedAndVerified && activityManagerDepsMetCount === dependenciesForActivityManager.length) {
    console.log('activity_manager.ts: All dependencies ALREADY MET AND VERIFIED during pre-check. Initializing directly via RAF.');
    requestAnimationFrame(() => { // Also use RAF for direct init consistency
        console.log('activity_manager.ts: RAF triggered (direct init) - Calling initializeActualActivityManager.');
        initializeActualActivityManager();
    });
} else if (activityManagerDepsMetCount < dependenciesForActivityManager.length && !activityManagerAllPreloadedAndVerified ) {
     console.log(`activity_manager.ts: Waiting for ${dependenciesForActivityManager.length - activityManagerDepsMetCount} dependency event(s).`);
} else if (activityManagerDepsMetCount === dependenciesForActivityManager.length && !activityManagerAllPreloadedAndVerified) {
    console.log('activity_manager.ts: All dependencies met by events during pre-check. RAF queue should have been set.');
}


console.log("core/activity_manager.ts: Script execution finished. Initialization is event-driven or direct.");