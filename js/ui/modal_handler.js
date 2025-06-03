// js/ui/modal_handler.js
// Handles generic opening and closing of all modals.

window.modalHandler = (() => {
    const getDeps = () => ({ // Lazy load dependencies
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        flagLoader: window.flagLoader // Assuming flagLoader is for SVG flags
    });

    const getModalElements = () => {
        const { domElements } = getDeps();
        if (!domElements) return [];
        return [
            domElements.virtualCallingScreen, domElements.voiceEnabledChatInterface,
            domElements.directCallInterface, domElements.messagingInterface,
            domElements.sessionRecapScreen, domElements.detailedPersonaModal
        ].filter(el => el);
    };

    function open(modalElement) {
        if (!modalElement) {
            console.warn("modalHandler.open: Attempted to open a null modalElement.");
            return;
        }
        getModalElements().forEach(m => {
            if (m && m !== modalElement && m.classList.contains('active')) close(m);
        });
        modalElement.style.opacity = '0';
        modalElement.style.display = 'flex';
        modalElement.offsetHeight; // Trigger reflow
        modalElement.classList.add('active');
        modalElement.style.opacity = '1';
    }

    function close(modalElement) {
        if (modalElement?.classList.contains('active')) {
            modalElement.style.opacity = '0';
            setTimeout(() => {
                modalElement.classList.remove('active');
                modalElement.style.display = 'none';
            }, 300); // Match CSS transition
        } else if (modalElement?.style.display !== 'none') {
            modalElement.style.display = 'none';
        }
    }

    function setupGenericModalOverlayClicks() {
        const { domElements } = getDeps();
        if (!domElements) return;
        [
            domElements.virtualCallingScreen,
            domElements.sessionRecapScreen,
            // detailedPersonaModal overlay click handled by shell_controller to include cleanup
        ].forEach(modal => {
            if (modal) modal.addEventListener('click', (event) => {
                if (event.target === modal) close(modal);
            });
        });
    }

    // Renders the language section for the persona modal using the new grid layout.
    function renderLanguageSection(connector) {
        const { polyglotHelpers, flagLoader, domElements } = getDeps();
        const langContainer = domElements?.personaModalLanguagesUl; // Note: HTML changed this ID to persona-modal-languages which is a div

        if (!langContainer || !connector || !polyglotHelpers || !flagLoader) {
            console.warn("renderLanguageSection: Missing dependencies or container.");
            if (langContainer) langContainer.innerHTML = '<p>Language information unavailable.</p>';
            return;
        }
        langContainer.innerHTML = ''; // Clear previous content

        const languagesToShow = [];
        if (connector.nativeLanguages) {
            connector.nativeLanguages.forEach(lang => languagesToShow.push({...lang, type: 'native'}));
        }
        if (connector.practiceLanguages) {
            connector.practiceLanguages.forEach(lang => languagesToShow.push({...lang, type: 'practice'}));
        }
        // If using languageRoles for primary display of all known languages
        if (connector.languageRoles) {
            Object.keys(connector.languageRoles).forEach(langName => {
                // Avoid duplicating if already added from native/practice (simple check by name)
                if (!languagesToShow.some(l => l.lang === langName)) {
                    const roleData = connector.languageRoles[langName];
                    languagesToShow.push({
                        lang: langName,
                        flagCode: roleData.flagCode, // Assuming flagCode is in languageRoles
                        levelTag: roleData.levelTag,
                        type: roleData.roles.includes('native') ? 'native' : (roleData.roles.includes('tutor') ? 'tutor' : 'practice') // Simplified type
                    });
                }
            });
        }


        if (languagesToShow.length === 0) {
            langContainer.innerHTML = '<p>No language information specified.</p>';
            return;
        }

        languagesToShow.forEach(lang => {
            if (!lang.lang) return;

            const langItemDiv = document.createElement('div');
            langItemDiv.className = `language-item ${lang.type}`; // e.g., language-item native

            const flagDiv = document.createElement('div');
            flagDiv.className = 'flag-section';
            const flagUrl = flagLoader.getFlagUrl(lang.flagCode);
            flagDiv.innerHTML = `<img src="${flagUrl}" alt="${lang.lang} flag" class="lang-flag" onerror="this.src='${flagLoader.getFlagUrl('')}'">`; // Fallback via onerror

            const nameDiv = document.createElement('div');
            nameDiv.className = 'name-section';
            nameDiv.textContent = polyglotHelpers.sanitizeTextForDisplay(lang.lang);

            const levelDiv = document.createElement('div');
levelDiv.className = 'level-section';
let levelText = '';
if (lang.type === 'native') {
    levelText = 'Native';
} else if (lang.type === 'tutor') {
    // For tutors, display "Tutor" and then their proficiency if not native
    levelText = 'Tutor';
    if (lang.levelTag && lang.levelTag !== 'native') { // Assuming 'native' implies they are tutoring in their native lang
        levelText += ` (${lang.levelTag.charAt(0).toUpperCase() + lang.levelTag.slice(1)})`;
    }
} else if (lang.levelTag) { // For practice languages
    levelText = lang.levelTag.charAt(0).toUpperCase() + lang.levelTag.slice(1);
}
levelDiv.textContent = levelText;


            langItemDiv.appendChild(flagDiv);
            langItemDiv.appendChild(nameDiv);
            langItemDiv.appendChild(levelDiv);
            langContainer.appendChild(langItemDiv);
        });
    }


    // Initialize overlay clicks
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupGenericModalOverlayClicks);
    } else {
        setupGenericModalOverlayClicks();
    }

    console.log("ui/modal_handler.js loaded.");
    return {
        open,
        close,
        renderLanguageSection // Expose this for shell_controller
    };
})();