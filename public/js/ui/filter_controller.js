// js/ui/filter_controller.js
// Manages the UI and logic for filtering connectors and groups.

console.log("filter_controller.js: Script execution STARTED.");
if (window.filterController) {
    console.warn("filter_controller.js: window.filterController ALREADY DEFINED. This is unexpected.");
}

window.filterController = (() => {
    'use strict';
    console.log("filter_controller.js: IIFE (module definition) STARTING.");

    const getDeps = () => {
        console.log("filter_controller.js: getDeps() called.");
        const deps = {
            domElements: window.domElements,
            polyglotHelpers: window.polyglotHelpers,
            chatManager: window.chatManager,     // To apply connector filters (this is chatOrchestrator)
            groupManager: window.groupManager,   // To apply group filters
        };
        console.log("filter_controller.js: getDeps() - domElements:", !!deps.domElements);
        console.log("filter_controller.js: getDeps() - polyglotHelpers:", !!deps.polyglotHelpers);
        console.log("filter_controller.js: getDeps() - chatManager (chatOrchestrator):", !!deps.chatManager);
        if (deps.chatManager) {
            console.log("filter_controller.js: getDeps() - chatManager.filterAndDisplayConnectors type:", typeof deps.chatManager.filterAndDisplayConnectors);
        }
        console.log("filter_controller.js: getDeps() - groupManager:", !!deps.groupManager);
        return deps;
    };

    function initializeFilters() {
        console.log("filterController: initializeFilters() - STARTING.");
        populateFilterDropdowns();
        setupFilterEventListeners();
        console.log("filterController: initializeFilters() - FINISHED.");
    }

    function setupFilterEventListeners() {
        console.log("filterController: setupFilterEventListeners() - START.");
        const { domElements } = getDeps();
        if (!domElements) {
            console.error("filterController: setupFilterEventListeners - domElements not available. Cannot attach listeners.");
            return;
        }

        if (domElements.applyFiltersBtn) {
            domElements.applyFiltersBtn.addEventListener('click', applyFindConnectorsFilters);
            console.log("filterController: 'Apply Find Filters' (applyFiltersBtn) button listener attached.");
        } else {
            console.warn("filterController: 'applyFiltersBtn' (for Find) not found in domElements.");
        }

        if (domElements.applyGroupFiltersBtn) {
            domElements.applyGroupFiltersBtn.addEventListener('click', applyGroupSearchFilters);
            console.log("filterController: 'Apply Group Filters' (applyGroupFiltersBtn) button listener attached.");
        } else {
            console.warn("filterController: 'applyGroupFiltersBtn' (for Groups) not found in domElements.");
        }
        console.log("filterController: setupFilterEventListeners() - FINISHED.");
    }

    function populateFilterDropdowns() {
        console.log("filterController: populateFilterDropdowns() - START.");
        const { domElements, polyglotHelpers } = getDeps();

        if (!domElements || !polyglotHelpers) {
            console.error("filterController: populateFilterDropdowns - Missing domElements or polyglotHelpers. Cannot populate.");
            return;
        }

        const languages = window.polyglotFilterLanguages || [];
        console.log("filterController: populateFilterDropdowns - Languages for dropdowns (from window.polyglotFilterLanguages):", languages.length, languages);

        if (domElements.filterLanguageSelect) {
            populateSelectWithOptions(domElements.filterLanguageSelect, languages, polyglotHelpers, true);
            console.log("filterController: Populated filterLanguageSelect.");
        } else {
            console.warn("filterController: filterLanguageSelect (for Find) not found.");
        }

        if (domElements.filterGroupLanguageSelect) {
            populateSelectWithOptions(domElements.filterGroupLanguageSelect, languages, polyglotHelpers, true);
            console.log("filterController: Populated filterGroupLanguageSelect.");
        } else {
            console.warn("filterController: filterGroupLanguageSelect (for Groups) not found.");
        }

        if (domElements.filterRoleSelect) {
            const roles = window.polyglotFilterRoles || [{ name: "Any Role", value: "all" }];
            console.log("filterController: populateFilterDropdowns - Roles for dropdown (from window.polyglotFilterRoles):", roles.length, roles);
            populateSelectWithOptions(domElements.filterRoleSelect, roles, polyglotHelpers, false);
            console.log("filterController: Populated filterRoleSelect.");
        } else {
            console.warn("filterController: filterRoleSelect (for Find) not found.");
        }
        console.log("filterController: populateFilterDropdowns() - FINISHED.");
    }

    function populateSelectWithOptions(selectElement, optionsArray, helpers, includeFlagEmoji = false) {
        // console.log("filterController: populateSelectWithOptions() for element:", selectElement.id, "with options count:", optionsArray.length);
        selectElement.innerHTML = '';
        optionsArray.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            let textContent = helpers.sanitizeTextForDisplay(opt.name);
            if (includeFlagEmoji && opt.flagCode) {
                const flagEmoji = helpers.getFlagEmoji(opt.flagCode);
                textContent = `${flagEmoji} ${textContent}`.trim();
            }
            option.textContent = textContent;
            selectElement.appendChild(option);
        });
    }

    function applyFindConnectorsFilters() {
        console.log("filterController: applyFindConnectorsFilters() - START.");
        const { domElements, chatManager } = getDeps();

        if (!domElements) {
            console.error("filterController: applyFindConnectorsFilters - domElements not available. Cannot get filter values.");
            return;
        }
        if (!chatManager) {
            console.error("filterController: applyFindConnectorsFilters - chatManager (chatOrchestrator) not available. Cannot apply filters.");
            return;
        }
         if (typeof chatManager.filterAndDisplayConnectors !== 'function') {
            console.error("filterController: applyFindConnectorsFilters - chatManager.filterAndDisplayConnectors IS NOT A FUNCTION. Current chatManager:", chatManager);
            return;
        }


        const filters = {
            language: domElements.filterLanguageSelect?.value || 'all',
            role: domElements.filterRoleSelect?.value || 'all',
        };
        console.log("filterController: applyFindConnectorsFilters - Filters collected:", JSON.stringify(filters));
        
        console.log("filterController: Calling chatManager.filterAndDisplayConnectors with filters.");
        chatManager.filterAndDisplayConnectors(filters);
        console.log("filterController: applyFindConnectorsFilters() - FINISHED.");
    }

    function applyGroupSearchFilters() {
        console.log("filterController: applyGroupSearchFilters() - START.");
        const { domElements, groupManager } = getDeps();

        if (!domElements) {
            console.error("filterController: applyGroupSearchFilters - domElements not available.");
            return;
        }
        if (!groupManager) {
            console.error("filterController: applyGroupSearchFilters - groupManager not available.");
            return;
        }
         if (typeof groupManager.loadAvailableGroups !== 'function') {
            console.error("filterController: applyGroupSearchFilters - groupManager.loadAvailableGroups IS NOT A FUNCTION.");
            return;
        }

        const langFilter = domElements.filterGroupLanguageSelect?.value || 'all';
        console.log("filterController: applyGroupSearchFilters - Language filter:", langFilter);
        groupManager.loadAvailableGroups(langFilter === 'all' ? null : langFilter);
        console.log("filterController: applyGroupSearchFilters() - FINISHED.");
    }

    console.log("filter_controller.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        initializeFilters,
        populateFilterDropdowns,
        applyFindConnectorsFilters,
        applyGroupSearchFilters
    };
})();

if (window.filterController && typeof window.filterController.initializeFilters === 'function') {
    console.log("filter_controller.js: SUCCESSFULLY assigned to window.filterController and initializeFilters is present.");
} else {
    console.error("filter_controller.js: CRITICAL ERROR - window.filterController or its initializeFilters method IS UNDEFINED/INVALID after IIFE execution.");
}
console.log("filter_controller.js: Script execution FINISHED.");