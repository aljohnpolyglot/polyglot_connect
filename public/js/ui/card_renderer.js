// js/ui/card_renderer.js
// Renders individual connector cards into the hub (Find Someone tab).

window.cardRenderer = (() => {
    // Memoize the grid element lookup, assuming it doesn't change
    let _hubGridElement = null;
    const getHubGridElement = () => {
        if (!_hubGridElement && window.domElements) { // Added check for window.domElements
            _hubGridElement = window.domElements.connectorHubGrid;
        }
        return _hubGridElement;
    };

    function renderSingleCard(connector) {
        if (!connector || !connector.id) {
            console.warn("cardRenderer.renderSingleCard: Invalid connector data provided.", connector);
            return null;
        }
        // Ensure dependencies are available
        if (!window.polyglotHelpers || !window.flagLoader) {
            console.error("cardRenderer.renderSingleCard: Missing polyglotHelpers or flagLoader.");
            return null;
        }

        const card = document.createElement('div');
        card.className = 'connector-card';
        card.dataset.connectorId = connector.id;

        const isActive = connector.isActive !== undefined ? connector.isActive : (window.activityManager ? window.activityManager.isConnectorActive(connector) : false);

        // Generate language display HTML (using your original logic)
        let languageDisplayHtml = '';

        // Prefer languageRoles if available and structured for richer display
        if (connector.languageRoles && connector.language) {
            const primaryLangName = connector.language;
            const primaryRoles = connector.languageRoles[primaryLangName];

            if (primaryRoles && Array.isArray(primaryRoles) && primaryRoles.length > 0) {
                const primaryFlagCode = connector.flagCode || (connector.languageSpecificCodes && connector.languageSpecificCodes[primaryLangName]?.flagCode) || primaryLangName.substring(0,2).toLowerCase();
                const roleText = primaryRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join('/');
                languageDisplayHtml += `
                    <span class="language-tag primary-role">
                        <img src="${window.flagLoader.getFlagUrl(primaryFlagCode)}"
                             alt="${primaryLangName}"
                             class="lang-flag lang-flag-xs"
                             onerror="this.src='${window.flagLoader.getFlagUrl('')}'">
                        ${window.polyglotHelpers.sanitizeTextForDisplay(primaryLangName)} (${window.polyglotHelpers.sanitizeTextForDisplay(roleText)})
                    </span>`;
            }

            let otherLangCount = 0;
            for (const langName in connector.languageRoles) {
                if (langName === primaryLangName || otherLangCount >= 1) continue;
                const otherRoles = connector.languageRoles[langName];
                if (otherRoles && Array.isArray(otherRoles) && otherRoles.length > 0) {
                    const otherFlagCode = (connector.languageSpecificCodes && connector.languageSpecificCodes[langName]?.flagCode) || langName.substring(0,2).toLowerCase();
                     const langDef = (window.polyglotFilterLanguages || []).find(l => l.name === langName || l.value === langName);
                    const displayFlagCode = (langDef && langDef.flagCode) ? langDef.flagCode : otherFlagCode;

                    const roleText = otherRoles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join('/');
                     const significantRole = otherRoles.some(r => ['native', 'tutor', 'learner', 'fluent'].includes(r.toLowerCase()));

                    if(significantRole){
                        languageDisplayHtml += `
                        <span class="language-tag other-role">
                            <img src="${window.flagLoader.getFlagUrl(displayFlagCode)}"
                                 alt="${langName}"
                                 class="lang-flag lang-flag-xs"
                                 onerror="this.src='${window.flagLoader.getFlagUrl('')}'">
                            ${window.polyglotHelpers.sanitizeTextForDisplay(langName)} (${window.polyglotHelpers.sanitizeTextForDisplay(roleText)})
                        </span>`;
                        otherLangCount++;
                    }
                }
            }
        } else { // Fallback to nativeLanguages and practiceLanguages if languageRoles isn't suitable
            if (connector.nativeLanguages && connector.nativeLanguages.length > 0) {
                connector.nativeLanguages.forEach(lang => {
                    if (lang.flagCode && window.flagLoader) {
                        languageDisplayHtml += `
                            <span class="language-tag native">
                                <img src="${window.flagLoader.getFlagUrl(lang.flagCode)}"
                                     alt="${lang.lang}"
                                     class="lang-flag lang-flag-xs"
                                     onerror="this.src='${window.flagLoader.getFlagUrl('')}'">
                                ${window.polyglotHelpers.sanitizeTextForDisplay(lang.lang)} (Native)
                            </span>`;
                    }
                });
            }
            if (connector.practiceLanguages && connector.practiceLanguages.length > 0) {
                connector.practiceLanguages.forEach(lang => {
                    if (lang.flagCode && window.flagLoader) {
                        languageDisplayHtml += `
                            <span class="language-tag practice">
                                <img src="${window.flagLoader.getFlagUrl(lang.flagCode)}"
                                     alt="${lang.lang}"
                                     class="lang-flag lang-flag-xs"
                                     onerror="this.src='${window.flagLoader.getFlagUrl('')}'">
                                ${window.polyglotHelpers.sanitizeTextForDisplay(lang.lang)} (${window.polyglotHelpers.sanitizeTextForDisplay(lang.levelTag || 'Practicing')})
                            </span>`;
                    }
                });
            }
        }


        card.innerHTML = `
            <div class="connector-card-bg"></div>
            <img src="${connector.avatarModern || 'images/placeholder_avatar.png'}"
                 alt="${connector.profileName || connector.name || 'Avatar'}"
                 class="connector-avatar"
                 onerror="this.src='images/placeholder_avatar.png'">
            <div class="connector-status ${isActive ? 'active' : ''}"
                 title="${isActive ? 'Active now' : 'Currently inactive'}"></div>
            <h3 class="connector-name">
                ${window.polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Unnamed Connector')}
            </h3>
            <div class="connector-languages-summary"> <!-- Changed class from connector-languages for consistency -->
                ${languageDisplayHtml || '<span class="language-tag">Languages N/A</span>'}
            </div>
            <p class="connector-bio">
                ${window.polyglotHelpers.sanitizeTextForDisplay((connector.bioModern || 'No bio available.').substring(0, 75))}
                ${(connector.bioModern && connector.bioModern.length > 75) ? '...' : ''}
            </p>
            <div class="connector-actions">
                <button class="view-profile-btn action-btn primary-btn" data-connector-id="${connector.id}">
                    <i class="fas fa-user-circle"></i> View Profile & Connect
                </button>
            </div>
        `;

        const viewProfileButton = card.querySelector('.view-profile-btn');
        if (viewProfileButton) {
            viewProfileButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // MODIFIED TO USE personaModalManager
                if (window.personaModalManager && typeof window.personaModalManager.openDetailedPersonaModal === 'function') {
                    const fullConnector = (window.polyglotConnectors || []).find(c => c.id === connector.id);
                    if (fullConnector) {
                        console.log("CardRenderer: Opening persona modal for", fullConnector.id, "via personaModalManager");
                        window.personaModalManager.openDetailedPersonaModal(fullConnector);
                    } else {
                        console.error("cardRenderer: Could not find full connector data for ID:", connector.id);
                        alert("Error: Could not retrieve full profile details.");
                    }
                } else {
                    console.error("cardRenderer: personaModalManager.openDetailedPersonaModal is not available.");
                    alert("Could not open profile. Please try again later (Code: PMM_NA).");
                }
            });
        }
        return card;
    }

    function renderCards(connectorsToDisplay) {
        const grid = getHubGridElement();
        if (!grid) {
            console.error("cardRenderer.renderCards: Connector hub grid element not found.");
            if (window.domElements && window.domElements.findView) {
                 window.domElements.findView.innerHTML = "<p class='error-message'>Error: UI element for displaying connectors is missing. Please refresh or contact support.</p>";
            }
            return;
        }
        grid.innerHTML = ''; // Clear previous cards

        if (!connectorsToDisplay || connectorsToDisplay.length === 0) {
            grid.innerHTML = "<p class='loading-message'>No AI connectors match your criteria or are available at the moment.</p>";
            return;
        }

        const fragment = document.createDocumentFragment();
        connectorsToDisplay.forEach(connector => {
            if (!connector) {
                console.warn("CardRenderer: renderCards - Skipping undefined connector in connectorsToDisplay array.");
                return;
            }
            const cardElement = renderSingleCard(connector);
            if (cardElement) {
                fragment.appendChild(cardElement);
            }
        });
        grid.appendChild(fragment);
    }

    // console.log("ui/card_renderer.js loaded. window.cardRenderer object:", window.cardRenderer); // From your paste
    return {
        renderCards: renderCards
    };
})();

// The renderFlag function was outside the IIFE and not used by cardRenderer itself.
// If it's needed elsewhere globally, it can remain. If not, it can be removed or moved.
// function renderFlag(countryCode, element) {
//     const img = new Image();
//     img.src = window.flagLoader.getFlagUrl(countryCode);
//     img.classList.add('lang-flag');
//     img.onerror = () => {
//         console.warn(`Flag load failed for ${countryCode}, using fallback`);
//         img.src = 'images/flags/unknown.png';
//     };
//     element.appendChild(img);
// }