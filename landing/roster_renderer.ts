// landing/roster_renderer.ts

import type { Connector, LanguageFilterItem, Group } from '../src/js/types/global.d.ts';
import { personasData } from '../src/data/personas.ts';
import { groupsDataArray as groupsData } from '../src/data/groups.ts';
import { polyglotHelpers } from '../src/js/utils/helpers.ts';
import { flagLoader } from '../src/js/utils/flagcdn.ts';

// We need the language filter data to get the proper names and flag codes.
// This is a simplified version of your data/personas.ts logic.
const filterLangs: LanguageFilterItem[] = [
    { name: "All Languages", value: "all", flagCode: null },
    { name: "Arabic", value: "Arabic", flagCode: "ae" }, { name: "Dutch", value: "Dutch", flagCode: "nl" },
    { name: "English", value: "English", flagCode: "gb" }, { name: "Finnish", value: "Finnish", flagCode: "fi" },
    { name: "French", value: "French", flagCode: "fr" }, { name: "German", value: "German", flagCode: "de" },
    { name: "Hindi", value: "Hindi", flagCode: "in" }, { name: "Indonesian", value: "Indonesian", flagCode: "id" },
    { name: "Italian", value: "Italian", flagCode: "it" }, { name: "Japanese", value: "Japanese", flagCode: "jp" },
    { name: "Korean", value: "Korean", flagCode: "kr" }, { name: "Mandarin Chinese", value: "Mandarin Chinese", flagCode: "cn" },
    { name: "Norwegian", value: "Norwegian", flagCode: "no" }, { name: "Polish", value: "Polish", flagCode: "pl" },
    { name: "Portuguese (Brazil)", value: "Portuguese (Brazil)", flagCode: "br" }, // <<< THIS LINE IS NOW FIXED
    { name: "Portuguese (Portugal)", value: "Portuguese (Portugal)", flagCode: "pt" },
    { name: "Russian", value: "Russian", flagCode: "ru" }, { name: "Spanish", value: "Spanish", flagCode: "es" },
    { name: "Swedish", value: "Swedish", flagCode: "se" }, { name: "Tagalog", value: "Tagalog", flagCode: "ph" },
    { name: "Thai", value: "Thai", flagCode: "th" }, { name: "Turkish", value: "Turkish", flagCode: "tr" },
    { name: "Vietnamese", value: "Vietnamese", flagCode: "vn" },
];


document.addEventListener('DOMContentLoaded', () => {

    // --- Process the Imported Data into Connectors ---
    const allConnectors: Connector[] = personasData.map(persona => {
        if (!persona || !persona.id) return null;
        return {
            ...persona,
            age: polyglotHelpers.calculateAge(persona.birthday) || "N/A",
        } as Connector;
    }).filter((c): c is Connector => c !== null);

    // --- Roster Carousel Logic ---
    const rosterTrack = document.getElementById('roster-track');
    if (rosterTrack) {
        // Shuffle the connectors for variety on each page load
        const shuffledConnectors = [...allConnectors].sort(() => 0.5 - Math.random());
        
        // Function to create a single card
        const createCardHTML = (connector: Connector) => {
            const details = [connector.age !== "N/A" ? `${connector.age} yrs` : null, connector.profession].filter(Boolean).join(' | ');
            const languages = [...(connector.nativeLanguages || []), ...(connector.practiceLanguages || [])]
                .slice(0, 3) // Show max 3 flags
                .map(lang => `<img src="${flagLoader.getFlagUrl(lang.flagCode, null)}" class="lang-flag" title="${lang.lang}">`)
                .join('');

            return `
                <div class="landing-connector-card">
                    <img src="${connector.avatarModern}" alt="${connector.profileName}">
                    <h4>${connector.profileName}</h4>
                    <p class="card-details">${details}</p>
                    <div class="card-languages">${languages}</div>
                </div>
            `;
        };

        // Duplicate the cards to create a seamless infinite loop
        const trackContent = shuffledConnectors.map(createCardHTML).join('');
        rosterTrack.innerHTML = trackContent + trackContent; // Append a copy of itself
    }


    // --- Language Grid Logic ---
    const languageGrid = document.getElementById('language-grid');
    if (languageGrid) {
        // We use our hardcoded filterLangs array which is more reliable
        const languagesToDisplay = filterLangs.filter(lang => lang.value !== 'all');
        
        const langFragment = document.createDocumentFragment();
        languagesToDisplay.forEach(lang => {
            const langItem = document.createElement('div');
            langItem.className = 'language-item';
            langItem.innerHTML = `
                <img src="${flagLoader.getFlagUrl(lang.flagCode, null)}" alt="${lang.name}" class="lang-flag-large">
                <span>${lang.name}</span>
            `;
            langFragment.appendChild(langItem);
        });
        languageGrid.appendChild(langFragment);
    }
});
// Add this inside the DOMContentLoaded listener in roster_renderer.ts

document.addEventListener('DOMContentLoaded', () => {
    // ... all the existing persona roster logic ...


    // --- Groups Carousel Logic ---
    const groupsTrack = document.getElementById('groups-track');
    if (groupsTrack) {
        // Shuffle the groups for variety
        const shuffledGroups = [...groupsData].sort(() => 0.5 - Math.random());

        const createGroupCardHTML = (group: Group) => {
            const tags = (group.tags || [])
                .slice(0, 3) // Show max 3 tags
                .map(tag => `<span class="tag">${tag}</span>`)
                .join('');
            
            // Use placeholder if groupPhotoUrl is missing
            const imageUrl = group.groupPhotoUrl ? group.groupPhotoUrl : '/images/placeholder_group_avatar.png';

            return `
                <div class="landing-group-card">
                    <div class="card-image-container">
                        <img src="${imageUrl}" alt="${group.name}">
                    </div>
                    <div class="card-content">
                        <h4>${group.name}</h4>
                        <p>${group.description}</p>
                     
                    </div>
                </div>
            `;
        };

        // Duplicate for seamless infinite scroll
        const trackContent = shuffledGroups.map(createGroupCardHTML).join('');
        groupsTrack.innerHTML = trackContent + trackContent;
    }
});