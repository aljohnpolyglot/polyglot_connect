// D:\polyglot_connect\src\js\ui\modal_handler.ts

import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    FlagLoader,
    Connector, // For renderLanguageSection
    LanguageEntry // For the languagesToShow array in renderLanguageSection
} from '../types/global.d.ts'; // Path from src/js/ui to src/js/types

console.log('modal_handler.ts: Script loaded, waiting for core dependencies.');

// This interface describes the object returned by the IIFE
// It should match the ModalHandler interface in global.d.ts
interface ModalHandlerModule {
    open: (modalElement: HTMLElement | null) => void;
    close: (modalElement: HTMLElement | null) => void;
    isVisible: (modalElement: HTMLElement | null) => boolean;
    renderLanguageSection: (connector: Connector) => void;
}

function initializeActualModalHandler(): void {
    console.log('modal_handler.ts: initializeActualModalHandler() called.');

    if (!window.domElements || !window.polyglotHelpers || !window.flagLoader) {
        console.error("modal_handler.ts: CRITICAL - Core dependencies (domElements, polyglotHelpers, flagLoader) not ready. Halting ModalHandler setup.");
        window.modalHandler = { // Dummy assignment
            open: () => console.error("ModalHandler not initialized."),
            close: () => console.error("ModalHandler not initialized."),
            isVisible: () => { console.error("ModalHandler not initialized."); return false; },
            renderLanguageSection: () => console.error("ModalHandler not initialized.")
        };
        document.dispatchEvent(new CustomEvent('modalHandlerReady')); // Dispatch ready even on failure
        console.warn('modal_handler.ts: "modalHandlerReady" event dispatched (initialization failed).');
        return;
    }
    console.log('modal_handler.ts: Core dependencies appear ready.');

    window.modalHandler = ((): ModalHandlerModule => {
        'use strict';

        const getDeps = () => ({
            domElements: window.domElements as YourDomElements,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers,
            flagLoader: window.flagLoader as FlagLoader
        });

        const getModalElements = (): (HTMLElement | null)[] => {
            const { domElements } = getDeps();
            if (!domElements) return []; // Should be caught by outer check, but good guard
            return [
                domElements.virtualCallingScreen, domElements.directCallInterface, // Removed voiceEnabledChatInterface as it's not in YourDomElements
                domElements.messagingInterface, domElements.sessionRecapScreen,
                domElements.detailedPersonaModal
            ].filter(el => !!el); // Filter out nulls more explicitly
        };

        function open(modalElement: HTMLElement | null): void {
            if (!modalElement) {
                console.warn("modalHandler.open: Attempted to open a null modalElement.");
                return;
            }
            getModalElements().forEach(m => {
                // Ensure m is not null before accessing classList
                if (m && m !== modalElement && m.classList.contains('active')) {
                    close(m);
                }
            });
            modalElement.style.opacity = '0';
            modalElement.style.display = 'flex';
            modalElement.offsetHeight; // Trigger reflow
            modalElement.classList.add('active');
            modalElement.style.opacity = '1';
        }

        function close(modalElement: HTMLElement | null): void {
            if (modalElement?.classList.contains('active')) {
                modalElement.style.opacity = '0';
                setTimeout(() => {
                    modalElement.classList.remove('active');
                    modalElement.style.display = 'none';
                }, 300);
            } else if (modalElement && modalElement.style.display !== 'none') { // Check modalElement exists
                modalElement.style.display = 'none';
            }
        }

        function setupGenericModalOverlayClicksInternal(): void { // Renamed to avoid conflict if original was global
            const { domElements } = getDeps();
            if (!domElements) return;
            [
                domElements.virtualCallingScreen,
                domElements.sessionRecapScreen,
            ].forEach(modal => {
                if (modal) {
                    modal.addEventListener('click', (event: MouseEvent) => { // Typed event
                        if (event.target === modal) close(modal);
                    });
                }
            });
        }

        function renderLanguageSection(connector: Connector): void {
            const { polyglotHelpers, flagLoader, domElements } = getDeps();
            const langContainer = domElements.personaModalLanguagesUl as HTMLElement | null; // Cast

            if (!langContainer || !connector || !polyglotHelpers || !flagLoader) {
                console.warn("modalHandler.renderLanguageSection: Missing dependencies or container.");
                if (langContainer) langContainer.innerHTML = '<p>Language information unavailable.</p>';
                return;
            }
            langContainer.innerHTML = '';

            interface LanguageToShow { // Don't extend LanguageEntry if it causes issues, define props explicitly
                lang: string;
                levelTag: string;
                flagCode?: string; // Make it optional here
                type: 'native' | 'practice' | 'tutor' | string;
            }

            const languagesToShow: LanguageToShow[] = [];
            if (connector.nativeLanguages) {
                connector.nativeLanguages.forEach(lang => languagesToShow.push({...lang, type: 'native'}));
            }
            if (connector.practiceLanguages) {
                connector.practiceLanguages.forEach(lang => languagesToShow.push({...lang, type: 'practice'}));
            }

            if (connector.languageRoles) {
                Object.keys(connector.languageRoles).forEach(langName => {
                    if (!languagesToShow.some(l => l.lang === langName)) {
                        const roleData = connector.languageRoles[langName] as string[]; // Assuming roles are string[]
                        const langSpecific = connector.languageSpecificCodes?.[langName];
                        languagesToShow.push({
                            lang: langName,
                            flagCode: langSpecific?.flagCode, // From languageSpecificCodes
                            levelTag: connector.learningLevels?.[langName] || (roleData.includes('native') ? 'native' : 'fluent'), // Guess levelTag
                            type: roleData.includes('native') ? 'native' : (roleData.includes('tutor') ? 'tutor' : 'practice')
                        });
                    }
                });
            }

            if (languagesToShow.length === 0) {
                langContainer.innerHTML = '<p>No language information specified.</p>';
                return;
            }

            languagesToShow.forEach(lang => {
                if (!lang.lang || !lang.flagCode) return; // Ensure flagCode exists

                const langItemDiv = document.createElement('div');
                langItemDiv.className = `language-item ${lang.type}`;

                const flagDiv = document.createElement('div');
                flagDiv.className = 'flag-section';
                const flagUrl = flagLoader.getFlagUrl(lang.flagCode, null); // Pass null for width
                flagDiv.innerHTML = `<img src="${flagUrl}" alt="${lang.lang} flag" class="lang-flag" onerror="this.onerror=null; this.src='${flagLoader.getFlagUrl('', null)}'">`;

                const nameDiv = document.createElement('div');
                nameDiv.className = 'name-section';
                nameDiv.textContent = polyglotHelpers.sanitizeTextForDisplay(lang.lang);

                const levelDiv = document.createElement('div');
                levelDiv.className = 'level-section';
                let levelText = '';
                if (lang.type === 'native') {
                    levelText = 'Native';
                } else if (lang.type === 'tutor') {
                    levelText = 'Tutor';
                    if (lang.levelTag && lang.levelTag !== 'native') {
                        levelText += ` (${lang.levelTag.charAt(0).toUpperCase() + lang.levelTag.slice(1)})`;
                    }
                } else if (lang.levelTag) {
                    levelText = lang.levelTag.charAt(0).toUpperCase() + lang.levelTag.slice(1);
                }
                levelDiv.textContent = levelText;

                langItemDiv.appendChild(flagDiv);
                langItemDiv.appendChild(nameDiv);
                langItemDiv.appendChild(levelDiv);
                langContainer.appendChild(langItemDiv);
            });
        }

        function isVisible(modalElement: HTMLElement | null): boolean {
            if (!modalElement) return false;
            const style = window.getComputedStyle(modalElement);
            return modalElement.classList.contains('active') && style.display !== 'none' && parseFloat(style.opacity) > 0;
        }
        
        // Call to set up internal listeners after IIFE defines methods
        // This replaces the original DOMContentLoaded listener for setupGenericModalOverlayClicks
        setupGenericModalOverlayClicksInternal();

        console.log("ui/modal_handler.ts: IIFE finished, returning exports.");
        return {
            open,
            close,
            isVisible,
            renderLanguageSection
        };
    })(); // End of IIFE

    if (window.modalHandler && typeof window.modalHandler.open === 'function') {
        console.log("modal_handler.ts: SUCCESSFULLY assigned to window.modalHandler.");
    } else {
        console.error("modal_handler.ts: CRITICAL ERROR - window.modalHandler assignment FAILED or method missing.");
    }

    // Dispatch ready event
    document.dispatchEvent(new CustomEvent('modalHandlerReady'));
    console.log('modal_handler.ts: "modalHandlerReady" event dispatched.');

} // End of initializeActualModalHandler

// Event listening logic
const dependenciesForModalHandler = ['domElementsReady', 'polyglotHelpersReady', 'flagLoaderReady'];
let modalHandlerDepsMet = 0;

function checkAndInitModalHandler() {
    modalHandlerDepsMet++;
    if (modalHandlerDepsMet === dependenciesForModalHandler.length) {
        console.log('modal_handler.ts: All dependencies met. Initializing actual ModalHandler.');
        initializeActualModalHandler();
        dependenciesForModalHandler.forEach(eventName => {
             document.removeEventListener(eventName, checkAndInitModalHandler);
        });
    }
}

if (window.domElements && window.polyglotHelpers && window.flagLoader) {
    console.log('modal_handler.ts: Core dependencies already available. Initializing directly.');
    initializeActualModalHandler();
} else {
    console.log('modal_handler.ts: Waiting for dependency events:', dependenciesForModalHandler);
    dependenciesForModalHandler.forEach(eventName => {
        let alreadySet = false;
        if (eventName === 'domElementsReady' && window.domElements) alreadySet = true;
        else if (eventName === 'polyglotHelpersReady' && window.polyglotHelpers) alreadySet = true;
        else if (eventName === 'flagLoaderReady' && window.flagLoader) alreadySet = true;

        if (alreadySet) {
            console.log(`modal_handler.ts: Dependency for '${eventName}' already met.`);
            checkAndInitModalHandler();
        } else {
            document.addEventListener(eventName, checkAndInitModalHandler, { once: true });
        }
    });
}

console.log("ui/modal_handler.ts: Script execution finished. Initialization is event-driven or direct.");