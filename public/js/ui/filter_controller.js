// js/ui/filter_controller.js
// Manages the UI and logic for filtering connectors and groups.

window.filterController = (() => {
    const getDeps = () => ({
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        chatManager: window.chatManager,     // To apply connector filters
        groupManager: window.groupManager,   // To apply group filters
        // viewManager: window.viewManager, // Not strictly needed here unless filters need to trigger view changes
    });

    // Called by app.js during its initialization sequence
    function initializeFilters() {
        console.log("filterController: initializeFilters - Starting.");
        populateFilterDropdowns();
        setupFilterEventListeners();
        console.log("filterController: initializeFilters - Complete.");
    }

    function setupFilterEventListeners() {
        const { domElements } = getDeps();
        if (!domElements) {
            console.warn("filterController: setupFilterEventListeners - domElements not available.");
            return;
        }

        if (domElements.applyFiltersBtn) {
            domElements.applyFiltersBtn.addEventListener('click', applyFindConnectorsFilters);
            console.log("filterController: 'Apply Find Filters' button listener attached.");
        } else {
            console.warn("filterController: 'applyFiltersBtn' (for Find) not found in domElements.");
        }

        if (domElements.applyGroupFiltersBtn) {
            domElements.applyGroupFiltersBtn.addEventListener('click', applyGroupSearchFilters);
            console.log("filterController: 'Apply Group Filters' button listener attached.");
        } else {
            console.warn("filterController: 'applyGroupFiltersBtn' (for Groups) not found in domElements.");
        }
    }

    function populateFilterDropdowns() {
        const { domElements, polyglotHelpers } = getDeps();
        console.log("filterController: populateFilterDropdowns - Called.");

        if (!domElements || !polyglotHelpers) {
            console.warn("filterController: populateFilterDropdowns - Missing domElements or polyglotHelpers.");
            return;
        }

        // Language Filters (for Find Connectors & Groups)
        const languages = window.polyglotFilterLanguages || []; // Assumes this global is populated by personas.js
        // console.log("filterController: populateFilterDropdowns - Languages for dropdowns:", languages);

        if (domElements.filterLanguageSelect) {
            populateSelectWithOptions(domElements.filterLanguageSelect, languages, polyglotHelpers, true);
        } else {
            console.warn("filterController: filterLanguageSelect (for Find) not found.");
        }

        if (domElements.filterGroupLanguageSelect) {
            populateSelectWithOptions(domElements.filterGroupLanguageSelect, languages, polyglotHelpers, true);
        } else {
            console.warn("filterController: filterGroupLanguageSelect (for Groups) not found.");
        }

        // Role Filter (for Find Connectors only)
        if (domElements.filterRoleSelect) {
            const roles = window.polyglotFilterRoles || [{ name: "Any Role", value: "all" }]; // Assumes global
            // console.log("filterController: populateFilterDropdowns - Roles for dropdown:", roles);
            populateSelectWithOptions(domElements.filterRoleSelect, roles, polyglotHelpers, false);
        } else {
            console.warn("filterController: filterRoleSelect (for Find) not found.");
        }
        console.log("filterController: populateFilterDropdowns - Dropdowns populated.");
    }

    // Helper function to populate a select element
    function populateSelectWithOptions(selectElement, optionsArray, helpers, includeFlagEmoji = false) {
        selectElement.innerHTML = ''; // Clear existing options
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

    // Called when the "Apply Filters" button in the "Find" view's sidebar is clicked
    // Also called by viewManager when switching to the "Find" tab
    function applyFindConnectorsFilters() {
        const { domElements, chatManager } = getDeps();
        console.log("filterController: applyFindConnectorsFilters - Called.");

        if (!domElements || !chatManager) {
            console.warn("filterController: applyFindConnectorsFilters - Missing domElements or chatManager.");
            return;
        }

        const filters = {
            language: domElements.filterLanguageSelect?.value || 'all',
            role: domElements.filterRoleSelect?.value || 'all',
            // levelTag: domElements.filterLevelTagSelect?.value || 'all', // This was removed from HTML
        };
        console.log("filterController: applyFindConnectorsFilters - Filters collected:", filters);
        chatManager.filterAndDisplayConnectors(filters);
    }

    // Called when the "Apply Group Filters" button in the "Groups" view's sidebar is clicked
    // Also called by viewManager when switching to the "Groups" tab (indirectly via groupManager)
    function applyGroupSearchFilters() {
        const { domElements, groupManager } = getDeps();
        console.log("filterController: applyGroupSearchFilters - Called.");

        if (!domElements || !groupManager) {
            console.warn("filterController: applyGroupSearchFilters - Missing domElements or groupManager.");
            return;
        }
        const langFilter = domElements.filterGroupLanguageSelect?.value || 'all';
        console.log("filterController: applyGroupSearchFilters - Language filter:", langFilter);
        groupManager.loadAvailableGroups(langFilter === 'all' ? null : langFilter);
    }

    console.log("js/ui/filter_controller.js loaded.");
    return {
        initializeFilters, // Main entry point called by app.js
        populateFilterDropdowns, // Can be exposed if other modules need to refresh them
        applyFindConnectorsFilters, // Exposed so viewManager can call it when 'find' tab becomes active
        applyGroupSearchFilters // Exposed so viewManager (via groupManager) can use it
    };
})();