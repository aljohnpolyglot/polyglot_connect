// D:\polyglot_connect\src\js\ui\tab_manager.ts
import type {
    YourDomElements,
    PolyglotHelpersOnWindow
} from '../types/global.js';

console.log('tab_manager.ts: Script loaded, waiting for core dependencies.');

export interface TabManagerModule {
    initialize: (initialTab?: string) => void;
    switchToTab: (targetTab: string, isInitialLoad?: boolean) => void;
    getCurrentActiveTab: () => string;
}

// Placeholder (optional, but good if other modules might check for it early)
// window.tabManager = {} as TabManagerModule; 
// console.log('tab_manager.ts: Placeholder window.tabManager assigned.');
// For now, let's assign directly in initializeActualTabManager like other TS modules

function initializeActualTabManager(): void {
    console.log("tab_manager.ts: initializeActualTabManager() called.");

    type VerifiedDeps = {
        domElements: YourDomElements;
        polyglotHelpers: PolyglotHelpersOnWindow;
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = {
            domElements: window.domElements,
            polyglotHelpers: window.polyglotHelpers
        };
        if (!deps.domElements?.mainNavItems || !deps.domElements?.mainViews) {
            console.error("TabManager: domElements.mainNavItems or mainViews missing in getSafeDeps.");
            return null;
        }
        if (!deps.polyglotHelpers?.saveToLocalStorage || !deps.polyglotHelpers?.loadFromLocalStorage) {
            console.error("TabManager: polyglotHelpers localStorage functions missing in getSafeDeps.");
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();
    if (!resolvedDeps) {
        console.error("tab_manager.ts: CRITICAL - Dependencies not met. TabManager will not be functional.");
        // Assign a dummy and dispatch ready to prevent other modules from hanging indefinitely
        window.tabManager = {
            initialize: (initialTab?: string) => console.error("TabManager dummy: initialize called."),
            switchToTab: (targetTab: string, isInitialLoad?: boolean) => console.error("TabManager dummy: switchToTab called."),
            getCurrentActiveTab: () => { console.error("TabManager dummy: getCurrentActiveTab called."); return "home"; }
        } as TabManagerModule;
        document.dispatchEvent(new CustomEvent('tabManagerReady'));
        console.warn('tab_manager.ts: "tabManagerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('tab_manager.ts: Core dependencies appear ready for IIFE.');

    window.tabManager = ((): TabManagerModule => {
        'use strict';
        const { domElements, polyglotHelpers } = resolvedDeps; // resolvedDeps is not null here
        let currentActiveTab = 'home'; 
        const LAST_ACTIVE_TAB_KEY = 'polyglotLastActiveTab';

        function handleTabSwitchEvent(e: Event): void {
            const currentTarget = e.currentTarget as HTMLElement;
            e.preventDefault();
            const targetTab = currentTarget.dataset.tab;
            if (targetTab && targetTab !== currentActiveTab) {
                switchToTab(targetTab);
            }
        }

        function setupNavigationEventListeners(): void {
            if (domElements.mainNavItems && domElements.mainNavItems.length > 0) {
                domElements.mainNavItems.forEach(item => {
                    item.removeEventListener('click', handleTabSwitchEvent as EventListener); 
                    item.addEventListener('click', handleTabSwitchEvent as EventListener);
                });
                console.log("TabManager: Navigation event listeners attached.");
            } else {
                console.warn("TabManager: Main navigation items not found for event listeners.");
            }
        }

              // ----- REPLACE THIS ENTIRE FUNCTION -----
           // PASTE THIS ENTIRE BLOCK INTO tab_manager.ts

        // ----- REPLACE THIS ENTIRE FUNCTION -----
               // ----- REPLACE THIS ENTIRE FUNCTION -----
               function switchToTab(targetTab: string, isInitialLoad: boolean = false): void {
                console.log(`TabManager: Switching to tab '${targetTab}'. Initial load: ${isInitialLoad}`);
                const previousTab = currentActiveTab;
                
                // This prevents the event from firing if the tab was already active.
                if (!isInitialLoad && previousTab === targetTab) {
                    console.log(`TabManager: Already on tab '${targetTab}'. No switch needed.`);
                    return;
                }
    
                currentActiveTab = targetTab;
                polyglotHelpers.saveToLocalStorage(LAST_ACTIVE_TAB_KEY, currentActiveTab);
        
                // Dispatch the event. This is the signal that other modules listen for.
                document.dispatchEvent(new CustomEvent('tabSwitched', { 
                    detail: { 
                        newTab: targetTab, 
                        previousTab: previousTab,
                        isInitialLoad: isInitialLoad 
                    } 
                }));
                console.log(`TabManager: Dispatched 'tabSwitched' event for tab: ${targetTab}`);
            }
        function initialize(initialTabOverride?: string): void {
            console.log("TabManager: initialize() called.");
            const savedTab = polyglotHelpers.loadFromLocalStorage(LAST_ACTIVE_TAB_KEY) as string | null;
            currentActiveTab = initialTabOverride || savedTab || 'home'; 
            
            setupNavigationEventListeners();
            
            console.log(`TabManager: Initial active tab set to '${currentActiveTab}'.`);

            // The old UI update logic was removed from here. The ShellController
            // will handle the initial UI setup when it receives the 'tabSwitched' event below.
            
            document.dispatchEvent(new CustomEvent('tabSwitched', {
                detail: { 
                    newTab: currentActiveTab, 
                    previousTab: null, 
                    isInitialLoad: true 
                } 
            }));
            console.log(`TabManager: Initial 'tabSwitched' event dispatched for tab: ${currentActiveTab}`);
        }

        const getCurrentActiveTab = (): string => currentActiveTab;

        return {
            initialize,
            switchToTab,
            getCurrentActiveTab
        };
    })();

    if (window.tabManager && typeof window.tabManager.initialize === 'function') {
        console.log("tab_manager.ts: SUCCESSFULLY assigned and populated window.tabManager.");
        
        // ======================================================================
        // ==  THE QUICK FIX: Call initialize() immediately after creation.    ==
        // ======================================================================
        window.tabManager.initialize();

    } else {
        console.error("tab_manager.ts: CRITICAL ERROR - window.tabManager population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('tabManagerReady'));
    console.log('tab_manager.ts: "tabManagerReady" event dispatched.');
} 

// Dependency Management for TabManager
const dependenciesForTabManager: string[] = ['domElementsReady', 'polyglotHelpersReady'];
const tmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForTabManager.forEach((dep: string) => tmMetDependenciesLog[dep] = false);
let tmDepsMetCount = 0;

function checkAndInitTabManager(receivedEventName?: string): void {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'domElementsReady': verified = !!(window.domElements?.mainNavItems && window.domElements?.mainViews); break;
           case 'polyglotHelpersReady': 
    verified = !!(window.polyglotHelpers && 
                  typeof window.polyglotHelpers.saveToLocalStorage === 'function' &&
                  typeof window.polyglotHelpers.loadFromLocalStorage === 'function'); 
    break;
            default: console.warn("TabManager: Unknown event in checkAndInit", receivedEventName); return;
        }
        if (verified && !tmMetDependenciesLog[receivedEventName]) {
            tmMetDependenciesLog[receivedEventName] = true;
            tmDepsMetCount++;
            console.log(`TabManager: Dep '${receivedEventName}' met and verified. Count: ${tmDepsMetCount}/${dependenciesForTabManager.length}`);
        } else if (!verified) {
            console.warn(`TabManager: Event '${receivedEventName}' received but verification failed.`);
        }
    }
    if (tmDepsMetCount === dependenciesForTabManager.length) {
        console.log('tab_manager.ts: All dependencies met. Initializing TabManager.');
        initializeActualTabManager();
    }
}

console.log('TAB_MANAGER_SETUP: Starting pre-check.');
tmDepsMetCount = 0; 
Object.keys(tmMetDependenciesLog).forEach(k => tmMetDependenciesLog[k]=false);
let tmAllPreloadedAndVerified = true;
dependenciesForTabManager.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false;
    if (eventName === 'domElementsReady') {
         isReadyNow = !!window.domElements;
         isVerifiedNow = !!(isReadyNow && window.domElements?.mainNavItems && window.domElements?.mainViews);
    } else if (eventName === 'polyglotHelpersReady') {
         isReadyNow = !!window.polyglotHelpers;
      // Inside the pre-check forEach switch for eventName === 'polyglotHelpersReady'
isVerifiedNow = !!(isReadyNow && 
                   window.polyglotHelpers && // Ensure polyglotHelpers itself exists first
                   typeof window.polyglotHelpers.saveToLocalStorage === 'function' &&
                   typeof window.polyglotHelpers.loadFromLocalStorage === 'function');
    }

    console.log(`TabManager PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if(!tmMetDependenciesLog[eventName]) { tmMetDependenciesLog[eventName] = true; tmDepsMetCount++;}
    } else {
        tmAllPreloadedAndVerified = false;
        console.log(`TabManager PRECHECK: Dep '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitTabManager(eventName), { once: true });
    }
});

if (tmAllPreloadedAndVerified && tmDepsMetCount === dependenciesForTabManager.length) {
    console.log('tab_manager.ts: All deps pre-verified. Initializing directly.');
    initializeActualTabManager();
} else if (tmDepsMetCount < dependenciesForTabManager.length && !tmAllPreloadedAndVerified) {
    console.log(`tab_manager.ts: Waiting for ${dependenciesForTabManager.length - tmDepsMetCount} TabManager dependency event(s).`);
} else if (tmDepsMetCount === dependenciesForTabManager.length && !tmAllPreloadedAndVerified){
    // This case means all were met by events firing before pre-check finished iterating.
    // checkAndInitTabManager would have already called initializeActualTabManager.
    console.log('tab_manager.ts: All deps met by events during pre-check iteration.');
} else if (dependenciesForTabManager.length === 0) {
     initializeActualTabManager();
}
console.log('tab_manager.ts: Script execution finished.');