// landing/persona_modal_renderer.ts

import type { Connector, LanguageEntry } from '../src/js/types/global';
import { personasData } from '../src/data/personas'; 
import { polyglotHelpers } from '../src/js/utils/helpers';
import { flagLoader } from '../src/js/utils/flagcdn';

export function initializePersonaModal() {
    
    // --- Get DOM Elements ---
    const modal = document.getElementById('persona-browser-modal') as HTMLElement | null;
    const openBtn = document.getElementById('browse-all-members-btn') as HTMLButtonElement | null;
    const closeBtn = document.getElementById('close-persona-modal-btn') as HTMLButtonElement | null;
    const grid = document.getElementById('persona-modal-grid') as HTMLElement | null;
    const langFilter = document.getElementById('lang-filter-select') as HTMLSelectElement | null;

    if (!modal || !openBtn || !closeBtn || !grid || !langFilter) {
        console.error("Persona Modal Renderer: One or more essential DOM elements are missing.");
        return;
    }

    // --- Process Personas into Connectors ---
    const allConnectors: Connector[] = personasData.map(persona => {
        if (!persona || !persona.id) return null;
        return {
            ...persona,
            age: polyglotHelpers.calculateAge(persona.birthday) || "N/A",
        } as Connector;
    }).filter((c): c is Connector => c !== null); // Type guard to filter out nulls

    if (allConnectors.length === 0) {
        console.error("No connector data was processed for the modal.");
        return;
    }

    // --- Render Function ---
    const renderPersonaCards = (connectorsToRender: Connector[]) => {
        grid.innerHTML = ''; 
        const fragment = document.createDocumentFragment();
        connectorsToRender.forEach(connector => {
            const card = document.createElement('div');
            card.className = 'modal-persona-card';

            const nativeLangs = (connector.nativeLanguages || []).map((lang: LanguageEntry) => 
                `<img src="${flagLoader.getFlagUrl(lang.flagCode, null)}" alt="${lang.lang}" class="lang-flag" title="${lang.lang} (Native)">`
            ).join(' ');

            const practiceLangs = (connector.practiceLanguages || []).map((lang: LanguageEntry) => 
                `<img src="${flagLoader.getFlagUrl(lang.flagCode, null)}" alt="${lang.lang}" class="lang-flag" title="${lang.lang} (Practice)">`
            ).join(' ');

            card.innerHTML = `
                <img src="${connector.avatarModern}" alt="${connector.profileName}">
                <h4>${connector.profileName}</h4>
                <div class="language-list">
                    ${nativeLangs} ${practiceLangs}
                </div>
            `;
            fragment.appendChild(card);
        });
        grid.appendChild(fragment);
    };

    // --- Populate Language Filter ---
    const languages = new Set<string>();
    allConnectors.forEach(c => {
        (c.nativeLanguages || []).forEach(l => languages.add(l.lang));
        (c.practiceLanguages || []).forEach(l => languages.add(l.lang));
    });
    
    langFilter.innerHTML = '<option value="all">All Languages</option>';
    Array.from(languages).sort().forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        langFilter.appendChild(option);
    });

    // --- Event Listeners ---
    openBtn.addEventListener('click', () => {
        modal.classList.add('visible');
        renderPersonaCards(allConnectors); // Render all cards on open
    });
    closeBtn.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('visible');
    });
    langFilter.addEventListener('change', () => {
        const selectedLang = langFilter.value;
        const filteredConnectors = selectedLang === 'all'
            ? allConnectors
            : allConnectors.filter(c => 
                (c.nativeLanguages || []).some(l => l.lang === selectedLang) ||
                (c.practiceLanguages || []).some(l => l.lang === selectedLang)
            );
        renderPersonaCards(filteredConnectors);
    });

    console.log("Persona Browser Modal is now fully functional.");
}