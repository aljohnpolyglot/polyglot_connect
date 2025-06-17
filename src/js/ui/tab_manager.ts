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

        function switchToTab(targetTab: string, isInitialLoad: boolean = false): void {
            console.log(`TabManager: Switching to tab '${targetTab}'. Initial load: ${isInitialLoad}`);
            const previousTab = currentActiveTab;
            
            if (previousTab === targetTab && !isInitialLoad) {
                console.log("TabManager: Already on the target tab. No switch needed.");
                return;
            }
    
            currentActiveTab = targetTab;
            polyglotHelpers.saveToLocalStorage(LAST_ACTIVE_TAB_KEY, currentActiveTab);
    
            // --- THIS IS THE FIX ---
            // Let ShellController handle all view and panel switching logic.
            // It's the central authority for what is visible.
            const shellController = window.shellController as import('../types/global').ShellController | undefined;
            if (shellController && typeof shellController.switchView === 'function') {
                shellController.switchView(targetTab);
            } else {
                // Fallback to old method if shellController isn't ready
                // This maintains basic functionality during startup race conditions.
                console.warn("TabManager: shellController not ready, falling back to direct UI update.");
                domElements.mainNavItems.forEach(i => i.classList.toggle('active', i.dataset.tab === targetTab));
                domElements.mainViews.forEach(view => {
                    view.classList.toggle('active-view', view.id === `${targetTab}-view`);
                });
            }
    
            // The event dispatch is still useful for any other modules that might care about tab changes.
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
            
            console.log(`TabManager: Initial active tab set to '${currentActiveTab}'. Performing initial UI update.`);
            domElements.mainNavItems.forEach(i => i.classList.toggle('active', i.dataset.tab === currentActiveTab));
            domElements.mainViews.forEach(view => {
                view.classList.toggle('active-view', view.id === `${currentActiveTab}-view`);
            });
            
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