// D:\polyglot_connect\src\js\ui\persona_modal_manager.ts
import type {
    YourDomElements,
    ModalHandler,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ActivityManager,
    Connector,
    PolyglotApp // Added for window.polyglotApp
} from '../types/global.d.ts';

console.log('persona_modal_manager.ts: Script loaded, waiting for core dependencies.');

interface PersonaModalManagerModule {
    openDetailedPersonaModal: (connector: Connector) => void;
}

window.personaModalManager = {} as PersonaModalManagerModule;
console.log('persona_modal_manager.ts: Placeholder window.personaModalManager assigned.');

// --- START: Guard for initializeActualPersonaModalManager logic ---
let initialPmmActualInitialized = false;
// --- END: Guard ---


function initializeActualPersonaModalManager(): void {
    // --- START: Guard against multiple initializations of this function ---
    if (initialPmmActualInitialized) {
        console.warn("PersonaModalManager: initializeActualPersonaModalManager called again. Skipping.");
        return;
    }
    initialPmmActualInitialized = true;
    // --- END: Guard ---

    console.log('persona_modal_manager.ts: initializeActualPersonaModalManager() called.');

    type VerifiedDeps = {
        domElements: YourDomElements;
        modalHandler: ModalHandler;
        polyglotHelpers: PolyglotHelpers;
        activityManager: ActivityManager;
        polyglotConnectors: Connector[];
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = {
            domElements: window.domElements as YourDomElements | undefined,
            modalHandler: window.modalHandler as ModalHandler | undefined,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers | undefined,
            activityManager: window.activityManager as ActivityManager | undefined,
            polyglotConnectors: window.polyglotConnectors as Connector[] | undefined,
        };
        const missing: string[] = [];
        if (!deps.domElements?.detailedPersonaModal) missing.push("domElements.detailedPersonaModal");
        if (!deps.modalHandler?.open) missing.push("modalHandler.open");
        if (!deps.polyglotHelpers?.sanitizeTextForDisplay) missing.push("polyglotHelpers.sanitizeTextForDisplay");
        if (!deps.activityManager?.isConnectorActive) missing.push("activityManager.isConnectorActive");
        if (!deps.polyglotConnectors || !Array.isArray(deps.polyglotConnectors)) missing.push("polyglotConnectors (array)");

        if (missing.length > 0) {
            console.error("PersonaModalManager: Critical dependencies missing:", missing.join(', '));
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("PersonaModalManager: Halting setup due to missing functional dependencies. Placeholder remains.");
        window.personaModalManager = {
            openDetailedPersonaModal: () => console.error("PMM Dummy: openDetailedPersonaModal called.")
        };
        document.dispatchEvent(new CustomEvent('personaModalManagerReady'));
        console.warn('persona_modal_manager.ts: "personaModalManagerReady" event dispatched (initialization FAILED).');
        initialPmmActualInitialized = false; // Reset guard if init fails here
        return;
    }
    console.log('persona_modal_manager.ts: Core functional dependencies appear ready for IIFE.');

    window.personaModalManager = ((): PersonaModalManagerModule => {
        'use strict';
        console.log("persona_modal_manager.ts: IIFE STARTING.");

        const { domElements, modalHandler, polyglotHelpers, activityManager, polyglotConnectors } = resolvedDeps;

        let isProcessingPMMAction = false;
        let pmmActionPendingPolyglotApp: { connector: Connector; actionType: string; button?: HTMLButtonElement | null } | null = null;

        function openDetailedPersonaModalInternal(connector: Connector): void {
            console.log("personaModalManager.ts: openDetailedPersonaModalInternal - Called for connector:", connector?.id);
            if (!connector?.id) {
                console.error("PMM.openDetailedPersonaModalInternal: Connector ID missing.");
                return;
            }
            (domElements.detailedPersonaModal as HTMLElement).dataset.connectorId = connector.id;

            if (domElements.personaModalAvatar) {
                domElements.personaModalAvatar.src = connector.avatarModern || `${(window as any).POLYGLOT_CONNECT_BASE_URL || '/'}images/placeholder_avatar.png`;
                domElements.personaModalAvatar.onerror = () => {
                    if (domElements.personaModalAvatar) domElements.personaModalAvatar.src = `${(window as any).POLYGLOT_CONNECT_BASE_URL || '/'}images/placeholder_avatar.png`;
                };
            }
            if (domElements.personaModalName) domElements.personaModalName.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Unknown');
            if (domElements.personaModalLocationAge) {
                const age = connector.age && connector.age !== "N/A" ? `${connector.age} yrs` : '';
                const city = polyglotHelpers.sanitizeTextForDisplay(connector.city || '');
                const country = polyglotHelpers.sanitizeTextForDisplay(connector.country || '');
                domElements.personaModalLocationAge.textContent = [city, country, age].filter(Boolean).join(' | ') || 'Details unavailable';
            }
            if (domElements.personaModalActiveStatus) {
                const isActive = activityManager.isConnectorActive(connector);
                domElements.personaModalActiveStatus.className = `status-dot ${isActive ? 'active' : 'inactive'}`;
                domElements.personaModalActiveStatus.title = isActive ? 'Active Now' : 'Inactive';
            }
            if (domElements.personaModalBio) domElements.personaModalBio.innerHTML = polyglotHelpers.sanitizeTextForDisplay(connector.bioModern || 'No bio available.').replace(/\n/g, '<br>');
            
            modalHandler.renderLanguageSection(connector);

            if (domElements.personaModalInterestsUl && connector.interests && connector.interests.length > 0) {
                const MAX_INTERESTS_VISIBLE = 6;
                const interestsToShow = connector.interests.slice(0, MAX_INTERESTS_VISIBLE);
                
                let interestsHtml = interestsToShow.map(interest =>
                    `<li>${polyglotHelpers.sanitizeTextForDisplay(interest)}</li>`
                ).join('');

                if (connector.interests.length > MAX_INTERESTS_VISIBLE) {
                    const remainingCount = connector.interests.length - MAX_INTERESTS_VISIBLE;
                    interestsHtml += `<li class="interest-more-indicator">… and ${remainingCount} more</li>`;
                }
                
                domElements.personaModalInterestsUl.innerHTML = interestsHtml;

            } else if (domElements.personaModalInterestsUl) {
                domElements.personaModalInterestsUl.innerHTML = '<li>No interests listed.</li>';
            }

            if (domElements.personaModalGallery) {
                if (connector.galleryImageFiles && connector.galleryImageFiles.length > 0) {
                    domElements.personaModalGallery.innerHTML = connector.galleryImageFiles.map(imgFile =>
                        `<img src="${(window as any).POLYGLOT_CONNECT_BASE_URL || '/'}images/gallery/${connector.id}/${imgFile}" alt="Gallery image for ${connector.profileName}" class="gallery-image">`
                    ).join('');
                } else {
                    domElements.personaModalGallery.innerHTML = `<div class="gallery-placeholder"><i class="fas fa-images"></i><p>No photos yet.</p></div>`;
                }
            }
            modalHandler.open(domElements.detailedPersonaModal);
            console.log("personaModalManager.ts: Detailed persona modal opened for", connector.id);
        }

        function cleanupModalData(): void {
            if (domElements?.detailedPersonaModal) {
                (domElements.detailedPersonaModal as HTMLElement).dataset.connectorId = '';
            }
            // console.log("PMM: cleanupModalData done.");
        }
        
        // Handler for when polyglotApp becomes ready, if an action was pending
        function pmmPolyglotAppReadyHandler() {
            console.error("PMM_POLYGLOT_APP_READY_HANDLER: 'polyglotAppReady' event received by PMM.");
            if (pmmActionPendingPolyglotApp) {
                const { connector, actionType, button } = pmmActionPendingPolyglotApp;
                console.error(`PMM_POLYGLOT_APP_READY_HANDLER: Found pending action. Retrying for ${connector.id}.`);
                // Clear the pending action *before* trying, to prevent loops if tryInitiate itself re-adds listener
                pmmActionPendingPolyglotApp = null; 
                tryInitiateSessionFromPMM(connector, actionType, button);
            } else {
                console.warn("PMM_POLYGLOT_APP_READY_HANDLER: 'polyglotAppReady' received, but no pending PMM action found.");
                // If no pending action, but the lock was somehow still true, release it as a safeguard.
                if(isProcessingPMMAction) {
                    setTimeout(() => {
                        isProcessingPMMAction = false;
                        console.error(`PMM_ACTION_END: Released isProcessingPMMAction lock (Path: polyglotAppReady, no pending action).`);
                    }, 50);
                }
            }
        }

        // This is the single function that will eventually call initiateSession
      // In persona_modal_manager.ts

function tryInitiateSessionFromPMM(connector: Connector, actionType: string, buttonContext?: HTMLButtonElement | null) {
    const currentPolyglotApp = window.polyglotApp as PolyglotApp | undefined;
    console.error(`PMM_TRY_INITIATE_SESSION: For ${connector.id}, action: ${actionType}. polyglotApp ready? ${!!(currentPolyglotApp && typeof currentPolyglotApp.initiateSession === 'function')}`); // NEW LOG

    if (currentPolyglotApp && typeof currentPolyglotApp.initiateSession === 'function') {
        console.error(`PMM_TRY_INITIATE: polyglotApp IS READY. Calling currentPolyglotApp.initiateSession for ${connector.id}, action: ${actionType}`); // MODIFIED LOG
        
        // ---- CRITICAL CHANGE: Call initiateSession BEFORE releasing the lock ---
        // ---- and make the lock release NOT dependent on a timeout if possible ---
        // ---- For now, just log before and after the call to see timing ---

        console.log(`PMM_BEFORE_APP_INITIATE_SESSION: Lock is ${isProcessingPMMAction}`);
        currentPolyglotApp.initiateSession(connector, actionType);
        console.log(`PMM_AFTER_APP_INITIATE_SESSION: Lock is ${isProcessingPMMAction}`);
        
        pmmActionPendingPolyglotApp = null; 
        document.removeEventListener('polyglotAppReady', pmmPolyglotAppReadyHandler); 
        
        // Consider releasing the lock immediately or with a minimal, non-blocking delay.
        // The 50ms timeout might be just enough for another event to sneak in IF `initiateSession` is synchronous enough.
        // Let's try releasing it more directly for testing.
        isProcessingPMMAction = false;
        console.error(`PMM_ACTION_END: Released isProcessingPMMAction lock for ${actionType} with ${connector.id} (Path: Direct/Retry Success - IMMEDIATE RELEASE).`);
        if (buttonContext) { /* Optional: Re-enable button / reset text */ }

    } else {
        // ... (rest of the else block is fine, it defers if polyglotApp isn't ready)
        console.warn(`PMM_TRY_INITIATE: polyglotApp NOT YET READY for ${connector.id}. Storing action and ensuring 'polyglotAppReady' listener is active.`);
        if (!pmmActionPendingPolyglotApp) { 
            pmmActionPendingPolyglotApp = { connector, actionType, button: buttonContext };
            document.removeEventListener('polyglotAppReady', pmmPolyglotAppReadyHandler); 
            document.addEventListener('polyglotAppReady', pmmPolyglotAppReadyHandler, { once: true });
            console.log("PMM_TRY_INITIATE: Added 'polyglotAppReady' listener.");
        } else {
            console.log("PMM_TRY_INITIATE: Action already pending for polyglotAppReady, listener should be set.");
        }
    }
}

      // In persona_modal_manager.ts

function handlePersonaModalAction(actionType: string, event?: MouseEvent): void {
    console.error(`PMM_ACTION_ATTEMPT: Attempting action: ${actionType}. Current lock (isProcessingPMMAction): ${isProcessingPMMAction}`); // NEW LOG

    if (isProcessingPMMAction) {
        console.warn(`PMM: handlePersonaModalAction - Global lock 'isProcessingPMMAction' is active. IGNORING DUPLICATE ATTEMPT. ActionType: ${actionType}`); // MODIFIED LOG
        return;
    }
    isProcessingPMMAction = true;
    console.error(`PMM_ACTION_START: handlePersonaModalAction - Action type: ${actionType}. Connector ID from modal: ${domElements.detailedPersonaModal?.dataset.connectorId}. Global PMM lock ENGAGED.`); // MODIFIED LOG

    const modalEl = domElements.detailedPersonaModal as HTMLElement;
    const connectorId = modalEl.dataset.connectorId;
    if (!connectorId) {
        console.error("PMM: No connector ID found on modal.");
        isProcessingPMMAction = false;
        console.error("PMM_ACTION_END: Released isProcessingPMMAction lock (no connectorId)."); // NEW LOG
        return;
    }

    const connector = polyglotConnectors.find((c: Connector) => c.id === connectorId);
    if (!connector) {
        console.error(`PMM: Connector ID '${connectorId}' not found.`);
        cleanupModalData();
        modalHandler.close(modalEl);
        isProcessingPMMAction = false;
        console.error(`PMM_ACTION_END: Released isProcessingPMMAction lock (connector not found).`); // NEW LOG
        return;
    }

    let clickedButton: HTMLButtonElement | null = null;
    if (event && event.currentTarget instanceof HTMLButtonElement) clickedButton = event.currentTarget;
    else if (actionType === 'message_modal') clickedButton = domElements.personaModalMessageBtn;
    else if (actionType === 'direct_modal') clickedButton = domElements.personaModalDirectCallBtn;

    modalHandler.close(modalEl);
    cleanupModalData();

    console.log(`PMM: About to call tryInitiateSessionFromPMM for ${connector.id}, action: ${actionType}. Lock is still: ${isProcessingPMMAction}`); // NEW LOG
    tryInitiateSessionFromPMM(connector, actionType, clickedButton);
    // The lock (isProcessingPMMAction) is now released within tryInitiateSessionFromPMM's setTimeout
}
        
        function initializePersonaModalControlsInternal(): void {
            console.log("personaModalManager.ts: initializePersonaModalControlsInternal - Setting up listeners.");
            if (!domElements) {
                console.error("PMM: domElements not available in initializePersonaModalControlsInternal.");
                return;
            }

            if (domElements.closePersonaModalBtn) {
                domElements.closePersonaModalBtn.addEventListener('click', () => {
                    cleanupModalData();
                    modalHandler?.close(domElements.detailedPersonaModal);
                });
            }
            if (domElements.detailedPersonaModal) {
                domElements.detailedPersonaModal.addEventListener('click', (event: MouseEvent) => { 
                    if (event.target === domElements.detailedPersonaModal) {
                        cleanupModalData();
                        modalHandler?.close(domElements.detailedPersonaModal);
                    }
                });
            }
            
            if (domElements.personaModalMessageBtn) {
                console.log("PMM_DEBUG: Attaching 'click' listener to personaModalMessageBtn.");
                domElements.personaModalMessageBtn.addEventListener('click', (event: MouseEvent) => handlePersonaModalAction('message_modal', event)); 
            }
            if (domElements.personaModalDirectCallBtn) {
                console.log("PMM_DEBUG: Attaching 'click' listener to personaModalDirectCallBtn.");
                domElements.personaModalDirectCallBtn.addEventListener('click', (event: MouseEvent) => handlePersonaModalAction('direct_modal', event)); 
            }
            console.log("personaModalManager.ts: Persona modal control listeners attached.");
        }
        
        initializePersonaModalControlsInternal(); 

        console.log("js/ui/persona_modal_manager.ts: IIFE finished, returning exports.");
        return {
            openDetailedPersonaModal: openDetailedPersonaModalInternal
        };
    })(); // End of IIFE

    if (window.personaModalManager && typeof window.personaModalManager.openDetailedPersonaModal === 'function') {
        console.log("persona_modal_manager.ts: SUCCESSFULLY assigned to window.personaModalManager.");
    } else {
        console.error("persona_modal_manager.ts: CRITICAL ERROR - assignment FAILED or method missing.");
    }
    
    document.dispatchEvent(new CustomEvent('personaModalManagerReady'));
    console.log('persona_modal_manager.ts: "personaModalManagerReady" event dispatched.');

} // End of initializeActualPersonaModalManager

const dependenciesForPMM: string[] = [
    'domElementsReady', 
    'polyglotHelpersReady', 
    'modalHandlerReady', 
    'activityManagerReady',
    'polyglotDataReady' 
];
const pmmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForPMM.forEach((dep: string) => pmmMetDependenciesLog[dep] = false);
let pmmDepsMetCount = 0;

function checkAndInitPMM(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`PMM_EVENT: Listener for '${receivedEventName}' was triggered.`);
        let verified = false;
        switch(receivedEventName) {
            case 'domElementsReady': verified = !!window.domElements?.detailedPersonaModal; break;
            case 'polyglotHelpersReady': verified = !!window.polyglotHelpers?.sanitizeTextForDisplay; break;
            case 'modalHandlerReady': verified = !!window.modalHandler?.open; break;
            case 'activityManagerReady': verified = !!window.activityManager?.isConnectorActive; break;
            case 'polyglotDataReady': verified = !!window.polyglotConnectors && Array.isArray(window.polyglotConnectors); break;
            default: console.warn(`PMM_EVENT: Unknown event '${receivedEventName}'`); return;
        }

        if (verified && !pmmMetDependenciesLog[receivedEventName]) {
            pmmMetDependenciesLog[receivedEventName] = true;
            pmmDepsMetCount++;
            console.log(`PMM_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${pmmDepsMetCount}/${dependenciesForPMM.length}`);
        } else if (!verified) {
             console.warn(`PMM_DEPS: Event '${receivedEventName}' received but FAILED verification.`);
        }
    }
    console.log(`PMM_DEPS: Met status:`, JSON.stringify(pmmMetDependenciesLog));

    if (pmmDepsMetCount === dependenciesForPMM.length) {
        console.log('persona_modal_manager.ts: All dependencies met and verified. Initializing actual PersonaModalManager.');
        initializeActualPersonaModalManager();
    }
}

console.log('PMM_SETUP: Starting initial dependency pre-check for PersonaModalManager.');
pmmDepsMetCount = 0; 
Object.keys(pmmMetDependenciesLog).forEach(key => pmmMetDependenciesLog[key] = false);
let pmmAllPreloadedAndVerified = true;

dependenciesForPMM.forEach((eventName: string) => {
    let isReadyNow = false;
    let isVerifiedNow = false; 
    switch(eventName) {
        case 'domElementsReady': 
            isReadyNow = !!window.domElements; 
            isVerifiedNow = !!(isReadyNow && window.domElements?.detailedPersonaModal); 
            break;
        case 'polyglotHelpersReady': 
            isReadyNow = !!window.polyglotHelpers; 
            isVerifiedNow = !!(isReadyNow && window.polyglotHelpers?.sanitizeTextForDisplay); 
            break;
        case 'modalHandlerReady': 
            isReadyNow = !!window.modalHandler; 
            isVerifiedNow = !!(isReadyNow && window.modalHandler?.open); 
            break;
        case 'activityManagerReady': 
            isReadyNow = !!window.activityManager; 
            isVerifiedNow = !!(isReadyNow && window.activityManager?.isConnectorActive); 
            break;
        case 'polyglotDataReady': 
            isReadyNow = !!window.polyglotConnectors; 
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotConnectors)); 
            break;
        default: console.warn(`PMM_PRECHECK: Unknown dependency: ${eventName}`); isVerifiedNow = false; break;
    }

    console.log(`PMM_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        if (!pmmMetDependenciesLog[eventName]) {
            pmmMetDependenciesLog[eventName] = true;
            pmmDepsMetCount++;
        }
    } else {
        pmmAllPreloadedAndVerified = false;
        console.log(`PMM_PRECHECK: Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, function anEventListener() { 
            checkAndInitPMM(eventName); 
        }, { once: true });
    }
});

console.log(`PMM_SETUP: Pre-check done. Met: ${pmmDepsMetCount}/${dependenciesForPMM.length}`, JSON.stringify(pmmMetDependenciesLog));

if (pmmAllPreloadedAndVerified && pmmDepsMetCount === dependenciesForPMM.length) {
    console.log('persona_modal_manager.ts: All dependencies ALREADY MET AND VERIFIED. Initializing directly.');
    initializeActualPersonaModalManager();
} else if (pmmDepsMetCount > 0 && pmmDepsMetCount < dependenciesForPMM.length && !pmmAllPreloadedAndVerified) { 
    console.log(`persona_modal_manager.ts: Some deps pre-verified, waiting for events.`);
} else if (pmmDepsMetCount === 0 && !pmmAllPreloadedAndVerified) {
    console.log(`persona_modal_manager.ts: No deps pre-verified. Waiting for all events.`);
} else if (dependenciesForPMM.length === 0){
    console.log('persona_modal_manager.ts: No dependencies listed. Initializing directly.');
    initializeActualPersonaModalManager();
}

console.log("js/ui/persona_modal_manager.ts: Script execution finished. Initialization is event-driven or direct.");