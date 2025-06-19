// D:\polyglot_connect\src\js\ui\card_renderer.ts

import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    FlagLoader,
    ActivityManager,
    PersonaModalManager,
    Connector,
    LanguageFilterItem // Used for window.polyglotFilterLanguages
} from '../types/global'; // Path from src/js/ui to src/js/types

console.log('card_renderer.ts: Script loaded, waiting for core dependencies.');

// AFTER
interface CardRendererModule {
    renderCards: (connectorsToDisplay: Connector[], activeFriendsView: 'my-friends' | 'discover') => void;
}
// ADD THIS BLOCK FOR STRUCTURAL READY:
window.cardRenderer = {
    renderCards: () => console.warn("CardRenderer structural: renderCards called before full init.")
} as CardRendererModule;
console.log('card_renderer.ts: Placeholder window.cardRenderer assigned.');
document.dispatchEvent(new CustomEvent('cardRendererReady')); // <<< EARLY/STRUCTURAL READY
console.log('card_renderer.ts: "cardRendererReady" (STRUCTURAL) event dispatched.');

function initializeActualCardRenderer(): void {
    console.log('card_renderer.ts: initializeActualCardRenderer() for FULL method population called.');

    const getSafeFunctionalDeps = (): {
        domElements: YourDomElements,
        polyglotHelpers: PolyglotHelpers,
        flagLoader: FlagLoader,
        activityManager: ActivityManager,
        personaModalManager: PersonaModalManager,
        polyglotConnectors: Connector[],
        polyglotFilterLanguages: LanguageFilterItem[] | undefined
    } | null => {
        const deps = {
            domElements: window.domElements as YourDomElements | undefined,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers | undefined,
            flagLoader: window.flagLoader as FlagLoader | undefined,
            activityManager: window.activityManager as ActivityManager | undefined,
            personaModalManager: window.personaModalManager as PersonaModalManager | undefined,
            polyglotConnectors: window.polyglotConnectors as Connector[] | undefined,
            polyglotFilterLanguages: window.polyglotFilterLanguages as LanguageFilterItem[] | undefined
        };
        let allPresent = true;
        const missing: string[] = [];
        for (const key in deps) {
            if (key !== 'polyglotFilterLanguages' && !(deps as any)[key]) {
                missing.push(key);
                allPresent = false;
            } else if (key === 'polyglotConnectors' && !Array.isArray((deps as any)[key])) {
                missing.push(`${key} (not an array)`);
                allPresent = false;
            }
            else if (key === 'activityManager' && typeof (deps.activityManager)?.isConnectorActive !== 'function') {
                 missing.push(`${key} (missing isConnectorActive)`);
                 allPresent = false;
            }
            else if (key === 'personaModalManager' && typeof (deps.personaModalManager)?.openDetailedPersonaModal !== 'function') {
                 missing.push(`${key} (missing openDetailedPersonaModal)`);
                 allPresent = false;
            }
        }
        if (!allPresent) {
            console.error(`CardRenderer (Full Init): getSafeFunctionalDeps - MISSING/INVALID: ${missing.join(', ')}.`);
        }
        return allPresent ? deps as { domElements: YourDomElements, polyglotHelpers: PolyglotHelpers, flagLoader: FlagLoader, activityManager: ActivityManager, personaModalManager: PersonaModalManager, polyglotConnectors: Connector[], polyglotFilterLanguages: LanguageFilterItem[] | undefined } : null;
    };
    
    const functionalDeps = getSafeFunctionalDeps();

    if (!functionalDeps) {
        console.error("card_renderer.ts: CRITICAL - Functional dependencies not ready for full CardRenderer setup. Methods will remain placeholders.");
        return;
    }
    console.log('card_renderer.ts: Functional dependencies for full method population appear ready.');

    const methods = ((): CardRendererModule => {
        'use strict';
        console.log("card_renderer.ts: IIFE for actual methods STARTING.");
        const getDeps = () => functionalDeps;

        let _hubGridElement: HTMLElement | null = null;
        const getHubGridElement = (): HTMLElement | null => {
            if (!_hubGridElement) {
                _hubGridElement = getDeps().domElements.connectorHubGrid;
            }
            return _hubGridElement;
        };

     // AFTER
function renderSingleCard(connector: Connector, activeFriendsView: 'my-friends' | 'discover'): HTMLElement | null {
            const { 
                polyglotHelpers: currentHelpers, flagLoader: currentFlagLoader, 
                activityManager: currentActivityManager, personaModalManager: currentPersonaModalManager, 
                polyglotConnectors: currentConnectors, domElements: currentDomElements,
                polyglotFilterLanguages: currentFilterLanguages
            } = getDeps();

            if (!connector?.id) {
                console.warn("cardRenderer.renderSingleCard: Invalid connector data provided.", connector);
                return null;
            }
             if (!currentHelpers || !currentFlagLoader || !currentActivityManager || !currentPersonaModalManager) {
                console.error("cardRenderer.renderSingleCard: Missing internal dependencies.");
                return null;
            }

            const card = document.createElement('div');
            card.className = 'connector-card';
            card.dataset.connectorId = connector.id;
            
// This is the new part: Add a special class for the taller cards
if (activeFriendsView === 'my-friends') {
    card.classList.add('is-friend-card');
}
            const isActive = connector.isActive !== undefined ? connector.isActive : (currentActivityManager.isConnectorActive ? currentActivityManager.isConnectorActive(connector) : false);
            let languageDisplayHtml = '';

                    // ================== START: UNIFIED LANGUAGE LOGIC (Mirrors Modal Handler) ==================
            // This new logic ensures flags are handled identically on cards and in modals.
            
            interface CardDisplayLanguage {
                lang: string;
                levelTag: string;
                flagCode: string;
                type: string;
            }

            const unifiedLanguages: CardDisplayLanguage[] = [];

            // 1. Prioritize data from nativeLanguages and practiceLanguages arrays, as they contain reliable flag codes.
            if (connector.nativeLanguages) {
                connector.nativeLanguages.forEach(lang => unifiedLanguages.push({ ...lang, type: 'native' }));
            }
            if (connector.practiceLanguages) {
                connector.practiceLanguages.forEach(lang => unifiedLanguages.push({ ...lang, type: 'practice' }));
            }

            // 2. Create a set of already added languages for quick lookup, preventing duplicates.
            const addedLangs = new Set(unifiedLanguages.map(l => l.lang));

            // 3. Use languageRoles as a fallback for any languages not in the primary arrays.
            if (connector.languageRoles) {
                for (const langName in connector.languageRoles) {
                    if (!addedLangs.has(langName)) {
                        // This language was missing from the arrays, so we must find its data.
                        const roles = connector.languageRoles[langName] as string[];
                        const langSpecific = connector.languageSpecificCodes?.[langName];
                        const langDef = (currentFilterLanguages || []).find(l => 
                            (l.name?.toLowerCase() === langName.toLowerCase()) || 
                            (l.value?.toLowerCase() === langName.toLowerCase())
                        );

                        unifiedLanguages.push({
                            lang: langName,
                            levelTag: connector.learningLevels?.[langName] || (roles.includes('native') ? 'native' : 'fluent'),
                            flagCode: langDef?.flagCode || langSpecific?.flagCode || '',
                            type: roles.includes('tutor') ? 'tutor' : 'practice'
                        });
                    }
                }
            }

            // 4. Now, render the HTML from the unified, correct list of languages.
            const primaryLangName = connector.language;
            const primaryLangData = unifiedLanguages.find(l => l.lang === primaryLangName);
            const otherLanguages = unifiedLanguages.filter(l => l.lang !== primaryLangName);

            // Render the primary language
            if (primaryLangData) {
                const roleText = (connector.languageRoles?.[primaryLangData.lang] || [])
                    .map(r => r.charAt(0).toUpperCase() + r.slice(1)).join('/');
                languageDisplayHtml += `
                    <span class="language-tag primary-role">
                        <img src="${currentFlagLoader.getFlagUrl(primaryLangData.flagCode, null)}"
                             alt="${primaryLangData.lang}" class="lang-flag lang-flag-xs"
                             onerror="this.onerror=null; this.src='${currentFlagLoader.getFlagUrl('', null)}'">
                        ${currentHelpers.sanitizeTextForDisplay(primaryLangData.lang)} (${currentHelpers.sanitizeTextForDisplay(roleText)})
                    </span>`;
            }

            // Render the first "other" significant language
            if (otherLanguages.length > 0) {
                const otherLangData = otherLanguages[0];
                const roleText = (connector.languageRoles?.[otherLangData.lang] || [])
                    .map(r => r.charAt(0).toUpperCase() + r.slice(1)).join('/');
                languageDisplayHtml += `
                    <span class="language-tag other-role">
                        <img src="${currentFlagLoader.getFlagUrl(otherLangData.flagCode, null)}"
                             alt="${otherLangData.lang}" class="lang-flag lang-flag-xs"
                             onerror="this.onerror=null; this.src='${currentFlagLoader.getFlagUrl('', null)}'">
                        ${currentHelpers.sanitizeTextForDisplay(otherLangData.lang)} (${currentHelpers.sanitizeTextForDisplay(roleText)})
                    </span>`;
            }
            // ==================  END: UNIFIED LANGUAGE LOGIC  ==================

// --- Button Logic (Defines which buttons to show) ---
let actionsHtml = '';
if (activeFriendsView === 'my-friends') {
    actionsHtml = `
        <button class="group-card-view-chat-btn action-btn-sm" data-connector-id="${connector.id}">
            <i class="fas fa-comment-dots"></i> View Chat
        </button>
        <button class="group-card-info-btn action-btn-sm subtle-btn" data-connector-id="${connector.id}">
            <i class="fas fa-info-circle"></i> Info
        </button>
    `;
} else { 
    // Button for the "Discover" tab
    actionsHtml = `
        <button class="view-profile-btn action-btn primary-btn" data-connector-id="${connector.id}">
            <i class="fas fa-user-circle"></i> View Profile & Connect
        </button>
    `;
}

// --- Card HTML Construction (Uses the buttons defined above) ---
const effectiveBaseUrl = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
const safeBaseUrl = effectiveBaseUrl.endsWith('/') ? effectiveBaseUrl : effectiveBaseUrl + '/';
const placeholderAvatar = `${safeBaseUrl}images/placeholder_avatar.png`;

card.innerHTML = `
    <div class="connector-card-bg"></div>
    <img src="${connector.avatarModern || placeholderAvatar}"
         alt="${currentHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Avatar')}"
         class="connector-avatar"
         onerror="this.onerror=null; this.src='${placeholderAvatar}'">
    <div class="connector-status ${isActive ? 'active' : ''}"
         title="${isActive ? 'Active now' : 'Currently inactive'}"></div>
    <h3 class="connector-name">
        ${currentHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Unnamed Connector')}
    </h3>
    <div class="connector-languages-summary">
        ${languageDisplayHtml || '<span class="language-tag">Languages N/A</span>'}
    </div>
    <p class="connector-bio">
        ${currentHelpers.sanitizeTextForDisplay((connector.bioModern || 'No bio available.').substring(0, 75))}
        ${(connector.bioModern && connector.bioModern.length > 75) ? '...' : ''}
    </p>
    <div class="connector-actions">
        ${actionsHtml}
    </div>
`;

            const viewProfileButton = card.querySelector('.view-profile-btn') as HTMLButtonElement | null;
            if (viewProfileButton) {
                viewProfileButton.addEventListener('click', (e: MouseEvent) => {
                    e.stopPropagation();
                    if (currentPersonaModalManager.openDetailedPersonaModal) {
                        const fullConnector = (currentConnectors || []).find(c => c.id === connector.id);
                        if (fullConnector) {
                            currentPersonaModalManager.openDetailedPersonaModal(fullConnector);
                        } else {
                            console.error("cardRenderer: Could not find full connector data for ID:", connector.id);
                        }
                    } else {
                        console.error("cardRenderer: personaModalManager.openDetailedPersonaModal is not available.");
                    }
                });
            }
            return card;
        }

     // AFTER (The new, simplified version)
     function renderCards(connectorsToDisplay: Connector[], activeFriendsView: 'my-friends' | 'discover'): void {
    const grid = getHubGridElement();
    
    // Safety check for the grid element
    if (!grid) {
        console.error("cardRenderer.renderCards: Connector hub grid element not found. Cannot render cards.");
        return;
    }
    
    // Always clear the grid first
    grid.innerHTML = '';

    // Handle the case where there are no connectors to display
    if (!connectorsToDisplay || connectorsToDisplay.length === 0) {
        // The loading message element is already inside the grid from the HTML.
        const loadingMsg = grid.querySelector('.loading-message') as HTMLElement | null;
        if (loadingMsg) {
            loadingMsg.textContent = "No one matches your criteria.";
            loadingMsg.style.display = 'block';
        }
        return;
    }

    // Hide the loading/empty message if we have cards to render
    const loadingMsg = grid.querySelector('.loading-message') as HTMLElement | null;
    if (loadingMsg) {
        loadingMsg.style.display = 'none';
    }

    // Create and append the cards
    const fragment = document.createDocumentFragment();
    connectorsToDisplay.forEach(connector => {
        if (!connector) {
            console.warn("CardRenderer: renderCards - Skipping undefined connector.");
            return;
        }
        const cardElement = renderSingleCard(connector, activeFriendsView);
        if (cardElement) {
            fragment.appendChild(cardElement);
        }
    });
    grid.appendChild(fragment);
}

        console.log("ui/card_renderer.ts: IIFE for actual methods finished, returning exports.");
        return {
            renderCards
        };
    })(); 

    if (window.cardRenderer) {
        Object.assign(window.cardRenderer, methods);
        console.log("card_renderer.ts: SUCCESSFULLY populated window.cardRenderer with real methods.");
    } else {
        console.error("card_renderer.ts: CRITICAL ERROR - window.cardRenderer placeholder was unexpectedly missing.");
        window.cardRenderer = methods;
    }
} // End of initializeActualCardRenderer

// ======== START: DEPENDENCY MANAGEMENT LOGIC ========
const dependenciesForCardRenderer = [
    'domElementsReady',
    'polyglotHelpersReady',
    'flagLoaderReady',
    'activityManagerReady',
    'personaModalManagerReady',
    'polyglotDataReady'
];

const cardRendererMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForCardRenderer.forEach(dep => cardRendererMetDependenciesLog[dep] = false);
let cardRendererDepsMet = 0;

function checkAndInitCardRenderer(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`CARD_RENDERER_EVENT: Listener for '${receivedEventName}' was triggered.`);
        // Optional: Re-verify actual window property here if needed for super robustness
        if (!cardRendererMetDependenciesLog[receivedEventName]) {
            cardRendererMetDependenciesLog[receivedEventName] = true;
            cardRendererDepsMet++;
            console.log(`CARD_RENDERER_DEPS: Event '${receivedEventName}' processed. Count updated: ${cardRendererDepsMet}/${dependenciesForCardRenderer.length}`);
        }
    }

    console.log(`CARD_RENDERER_DEPS: Current count is ${cardRendererDepsMet} / ${dependenciesForCardRenderer.length}. Met status:`, JSON.stringify(cardRendererMetDependenciesLog));

    if (cardRendererDepsMet === dependenciesForCardRenderer.length) {
        console.log('card_renderer.ts: All dependency events received for CardRenderer. Calling initializeActualCardRenderer directly.');
        initializeActualCardRenderer(); // Direct call, no RAF
    }
}

// --- Initial Pre-Check and Listener Setup for CardRenderer ---
console.log('CARD_RENDERER_SETUP: Starting initial dependency pre-check.');
cardRendererDepsMet = 0; // Reset count for the pre-check phase
Object.keys(cardRendererMetDependenciesLog).forEach(key => cardRendererMetDependenciesLog[key] = false); // Reset log

let cardRendererAllPreloadedAndVerified = true;

dependenciesForCardRenderer.forEach((eventName: string) => { // Added type for eventName
    let isReadyNow = false;
    let isVerifiedNow = false;

    switch (eventName) {
        case 'domElementsReady':
            isReadyNow = !!window.domElements;
            isVerifiedNow = isReadyNow;
            break;
        case 'polyglotHelpersReady':
            isReadyNow = !!window.polyglotHelpers;
            isVerifiedNow = !!(isReadyNow && typeof window.polyglotHelpers?.sanitizeTextForDisplay === 'function');
            break;
        case 'flagLoaderReady':
            isReadyNow = !!window.flagLoader;
            isVerifiedNow = !!(isReadyNow && typeof window.flagLoader?.getFlagUrl === 'function');
            break;
        case 'activityManagerReady':
            isReadyNow = !!window.activityManager;
            isVerifiedNow = !!(isReadyNow && typeof window.activityManager?.isConnectorActive === 'function');
            break;
        case 'personaModalManagerReady':
            isReadyNow = !!window.personaModalManager;
            isVerifiedNow = !!(isReadyNow && typeof window.personaModalManager?.openDetailedPersonaModal === 'function');
            break;
        case 'polyglotDataReady': 
            isReadyNow = !!window.polyglotConnectors && !!window.polyglotFilterLanguages;
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotConnectors) && (window.polyglotFilterLanguages === undefined || Array.isArray(window.polyglotFilterLanguages)) );
            break;
        default:
            console.warn(`CARD_RENDERER_PRECHECK: Unknown dependency event name: ${eventName}`);
    }

    console.log(`CARD_RENDERER_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);

    if (isVerifiedNow) {
        console.log(`card_renderer.ts: Pre-check: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!cardRendererMetDependenciesLog[eventName]) {
            cardRendererMetDependenciesLog[eventName] = true;
            cardRendererDepsMet++;
        }
    } else {
        cardRendererAllPreloadedAndVerified = false;
        const specificEventNameToListenFor = eventName;
        console.log(`card_renderer.ts: Pre-check: Dependency '${specificEventNameToListenFor}' not ready or verified. Adding listener for '${specificEventNameToListenFor}'.`);
        document.addEventListener(specificEventNameToListenFor, function anEventListener(event: Event) {
            checkAndInitCardRenderer(specificEventNameToListenFor);
        }, { once: true });
    }
});

console.log(`CARD_RENDERER_SETUP: Initial pre-check dep count: ${cardRendererDepsMet} / ${dependenciesForCardRenderer.length}. Met:`, JSON.stringify(cardRendererMetDependenciesLog));

if (cardRendererAllPreloadedAndVerified && cardRendererDepsMet === dependenciesForCardRenderer.length) {
    console.log('card_renderer.ts: All dependencies ALREADY MET AND VERIFIED during pre-check. Initializing directly.');
    initializeActualCardRenderer(); // Direct call
} else if (cardRendererDepsMet > 0 && cardRendererDepsMet < dependenciesForCardRenderer.length) {
    console.log(`card_renderer.ts: Some dependencies pre-verified (${cardRendererDepsMet}/${dependenciesForCardRenderer.length}), waiting for remaining events.`);
} else if (cardRendererDepsMet === 0 && !cardRendererAllPreloadedAndVerified) {
    console.log(`card_renderer.ts: No dependencies pre-verified. Waiting for all ${dependenciesForCardRenderer.length} events.`);
} else if (dependenciesForCardRenderer.length === 0) {
    console.log('card_renderer.ts: No dependencies listed. Initializing directly.');
    initializeActualCardRenderer(); // Direct call
}

console.log("ui/card_renderer.ts: Script execution finished. Initialization is event-driven or direct.");
// ======== END: DEPENDENCY MANAGEMENT LOGIC ========