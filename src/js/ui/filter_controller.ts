// D:\polyglot_connect\src\js\ui\filter_controller.ts

// D:\polyglot_connect\src\js\ui\filter_controller.ts

// D:\polyglot_connect\src\js\ui\filter_controller.ts

import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    CardRenderer,
    ActivityManager,
    GroupManager,
    LanguageFilterItem,
    RoleFilterItem,
    Group,
    Connector,
    LanguageEntry // <<< ADD LanguageEntry HERE
} from '../types/global.d.ts';

console.log('filter_controller.ts: Script loaded, waiting for core dependencies.');

interface FilterControllerModule {
    initializeFilters: () => void;
    populateFilterDropdowns: () => void;
    applyFindConnectorsFilters: () => void;
    applyGroupSearchFilters: () => void;
    resetToDefaultFriendsView: () => void; // <<< ADD THIS LINE
}

function initializeActualFilterController(): void {
    console.log('filter_controller.ts: initializeActualFilterController() called.');

    // Check for essential dependencies
       // Perform detailed functional checks for dependencies
   // Perform detailed functional checks for dependencies
   // Perform detailed functional checks for dependencies
    const { domElements, polyglotHelpers, cardRenderer, activityManager, groupManager, polyglotFilterLanguages, polyglotFilterRoles } = window;
    const functionalChecks = {
        domElements: !!domElements,
        polyglotHelpers: !!(polyglotHelpers && typeof polyglotHelpers.sanitizeTextForDisplay === 'function'),
        cardRenderer: !!(cardRenderer && typeof cardRenderer.renderCards === 'function'),
        activityManager: !!(activityManager && typeof activityManager.isConnectorActive === 'function'),
        groupManager: !!(groupManager && typeof groupManager.loadAvailableGroups === 'function'),
        polyglotFilterLanguages: !!(polyglotFilterLanguages && Array.isArray(polyglotFilterLanguages)),
        polyglotFilterRoles: !!(polyglotFilterRoles && Array.isArray(polyglotFilterRoles))
    };
    const allFunctionalChecksPassed = Object.values(functionalChecks).every(Boolean);

    if (!allFunctionalChecksPassed) {
        console.error("filter_controller.ts: CRITICAL - Functional dependency checks FAILED. Halting FilterController setup.", functionalChecks);
        window.filterController = { // Dummy
            initializeFilters: () => console.error("FilterController not initialized (deps failed)."),
            populateFilterDropdowns: () => console.error("FilterController not initialized (deps failed)."),
            applyFindConnectorsFilters: () => console.error("FilterController not initialized (deps failed)."),
            applyGroupSearchFilters: () => console.error("FilterController not initialized (deps failed)."),
        };
        // Dispatch ready event even on failure so modules waiting for it don't hang indefinitely,
        // but they will get a non-functional dummy.
        document.dispatchEvent(new CustomEvent('filterControllerReady'));
        console.warn('filter_controller.ts: "filterControllerReady" event dispatched (initialization FAILED - functional checks).');
        return;
    }
    console.log('filter_controller.ts: Core functional dependencies appear ready.');

    window.filterController = ((): FilterControllerModule => {
        'use strict';
        console.log("filter_controller.ts: IIFE (module definition) STARTING.");

        const getDeps = () => ({
            domElements: window.domElements as YourDomElements,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers,
            cardRenderer: window.cardRenderer as CardRenderer,
            activityManager: window.activityManager as ActivityManager,
            groupManager: window.groupManager as GroupManager,
            polyglotFilterLanguages: window.polyglotFilterLanguages as LanguageFilterItem[],
            polyglotFilterRoles: window.polyglotFilterRoles as RoleFilterItem[],
            polyglotGroupsData: window.polyglotGroupsData as Group[] | undefined // Add this
        });
        let activeGroupView: 'my-groups' | 'discover' = 'my-groups'; // Default to 'my-groups'

        let activeFriendsView: 'my-friends' | 'discover' = 'my-friends'; // Default to 'my-friends'

        


// =================== ADD THIS NEW HELPER FUNCTION ===================
/**
 * Updates the visibility and text of a placeholder message for a list.
 * @param placeholderEl The HTMLElement for the placeholder.
 * @param listLength The number of items in the list after filtering.
 * @param baseEmptyMessage The message to show when the list is empty and no filters are active.
 * @param filteredEmptyMessage The message to show when the list is empty because of active filters.
 * @param areFiltersActive A boolean indicating if any filters are currently applied.
 */
function updateEmptyMessage(
    placeholderEl: HTMLElement | null | undefined, 
    listLength: number, 
    baseEmptyMessage: string, 
    filteredEmptyMessage: string,
    areFiltersActive: boolean = true // Default to true for simplicity in 'my-friends'
) {
    if (!placeholderEl) return;

    if (listLength > 0) {
        placeholderEl.style.display = 'none';
    } else {
        placeholderEl.style.display = 'block'; // Or 'flex' depending on your styling
        // Choose the message based on whether filters were used to get to the empty state.
        placeholderEl.textContent = areFiltersActive ? filteredEmptyMessage : baseEmptyMessage;
    }
}
// =================== REPLACE THE initializeFilters FUNCTION ===================
// =================== REPLACE initializeFilters ===================
function initializeFilters(): void {
    console.log("FilterController: Initializing filters and listeners.");
    populateFilterDropdowns();
    setupFilterEventListeners();

    // Set the initial UI state for the default "My Friends" view
    const { domElements } = getDeps();
    if (domElements.filterLanguageSelect) domElements.filterLanguageSelect.disabled = true;
    if (domElements.filterRoleSelect) domElements.filterRoleSelect.disabled = true;
    if (domElements.filterConnectorNameInput) domElements.filterConnectorNameInput.disabled = false;
}
// =================================================================
// ============================================================================

      // =================== REPLACE THE ENTIRE FUNCTION WITH THIS ===================

// ===================================================================================
// ============================================================================
// =================== REPLACE THE ENTIRE setupFilterEventListeners FUNCTION ===================
// =================== REPLACE setupFilterEventListeners ===================
function setupFilterEventListeners(): void {
    const { domElements, polyglotHelpers } = getDeps();

    // --- SUB-TAB LISTENERS ---
    document.getElementById('my-friends-tab-btn')?.addEventListener('click', () => switchFriendsViewTab('my-friends'));
    document.getElementById('discover-friends-tab-btn')?.addEventListener('click', () => switchFriendsViewTab('discover'));
    document.getElementById('my-groups-tab-btn')?.addEventListener('click', () => switchGroupViewTab('my-groups'));
    document.getElementById('discover-groups-tab-btn')?.addEventListener('click', () => switchGroupViewTab('discover'));

    // --- LIVE FILTERING LISTENERS ---
    const debouncedApplyFriends = polyglotHelpers.debounce(applyFindConnectorsFilters, 400);
    const debouncedApplyGroups = polyglotHelpers.debounce(applyGroupSearchFilters, 400);

    // Friends Filters
    domElements.filterConnectorNameInput?.addEventListener('input', debouncedApplyFriends);
    domElements.filterLanguageSelect?.addEventListener('change', debouncedApplyFriends);
    domElements.filterRoleSelect?.addEventListener('change', debouncedApplyFriends);
    
    // Groups Filters
    domElements.filterGroupNameInput?.addEventListener('input', debouncedApplyGroups);
    domElements.filterGroupLanguageSelect?.addEventListener('change', debouncedApplyGroups);
    domElements.filterGroupCategorySelect?.addEventListener('change', debouncedApplyGroups);
}
// ==================================================================
// =======================================================================================

        function switchGroupViewTab(targetView: 'my-groups' | 'discover') {
            if (activeGroupView === targetView) return; // Do nothing if already on the active tab

            activeGroupView = targetView;
            console.log(`FC: Switched group view tab to: ${activeGroupView}`);

            const myGroupsBtn = document.getElementById('my-groups-tab-btn');
            const discoverBtn = document.getElementById('discover-groups-tab-btn');

            myGroupsBtn?.classList.toggle('active', activeGroupView === 'my-groups');
            discoverBtn?.classList.toggle('active', activeGroupView === 'discover');

            // Trigger a filter refresh for the new view
            applyGroupSearchFilters();
        }

// Add this entire new function
function switchFriendsViewTab(targetView: 'my-friends' | 'discover') {
    if (activeFriendsView === targetView) return; // Do nothing if already active

    activeFriendsView = targetView;
    console.log(`FC: Switched friends view tab to: ${activeFriendsView}`);

    const myFriendsBtn = document.getElementById('my-friends-tab-btn');
    const discoverFriendsBtn = document.getElementById('discover-friends-tab-btn');

    myFriendsBtn?.classList.toggle('active', activeFriendsView === 'my-friends');
    discoverFriendsBtn?.classList.toggle('active', activeFriendsView === 'discover');

    // This is the key: Re-run the filter/display logic for the new tab
    applyFindConnectorsFilters();
}
       function populateFilterDropdowns(): void {
    console.log("FilterController: populateFilterDropdowns - STARTING."); // Existing log good
    const { domElements, polyglotHelpers, polyglotFilterLanguages, polyglotFilterRoles,polyglotGroupsData } = getDeps();
    
    console.log("FilterController: populateFilterDropdowns - domElements.filterLanguageSelect:", domElements.filterLanguageSelect);
    console.log("FilterController: populateFilterDropdowns - domElements.filterGroupLanguageSelect:", domElements.filterGroupLanguageSelect);
    console.log("FilterController: populateFilterDropdowns - domElements.filterRoleSelect:", domElements.filterRoleSelect);
    console.log("FilterController: populateFilterDropdowns - polyglotFilterLanguages:", JSON.parse(JSON.stringify(polyglotFilterLanguages || [])));
    console.log("FilterController: populateFilterDropdowns - polyglotFilterRoles:", JSON.parse(JSON.stringify(polyglotFilterRoles || [])));

    if (domElements.filterLanguageSelect && polyglotFilterLanguages) { // Added check for polyglotFilterLanguages
        console.log("FilterController: populateFilterDropdowns - Populating 'filterLanguageSelect'.");
        populateSelectWithOptions(domElements.filterLanguageSelect, polyglotFilterLanguages, polyglotHelpers, true);
    } else {
        console.warn("FilterController: populateFilterDropdowns - SKIPPING 'filterLanguageSelect'. Element found:", !!domElements.filterLanguageSelect, "Data found:", !!polyglotFilterLanguages);
    }

    if (domElements.filterGroupLanguageSelect && polyglotFilterLanguages) { // Added check for polyglotFilterLanguages
        console.log("FilterController: populateFilterDropdowns - Populating 'filterGroupLanguageSelect'.");
        populateSelectWithOptions(domElements.filterGroupLanguageSelect, polyglotFilterLanguages, polyglotHelpers, true);
    } else {
        console.warn("FilterController: populateFilterDropdowns - SKIPPING 'filterGroupLanguageSelect'. Element found:", !!domElements.filterGroupLanguageSelect, "Data found:", !!polyglotFilterLanguages);
    }

    if (domElements.filterRoleSelect && polyglotFilterRoles) { // Added check for polyglotFilterRoles
        console.log("FilterController: populateFilterDropdowns - Populating 'filterRoleSelect'.");
        populateSelectWithOptions(domElements.filterRoleSelect, polyglotFilterRoles, polyglotHelpers, false);
    } else {
        console.warn("FilterController: populateFilterDropdowns - SKIPPING 'filterRoleSelect'. Element found:", !!domElements.filterRoleSelect, "Data found:", !!polyglotFilterRoles);
    }
    console.log("FilterController: populateFilterDropdowns - FINISHED."); // Existing log good
    if (domElements.filterGroupCategorySelect && polyglotGroupsData) {
        console.log("FilterController: populateFilterDropdowns - Populating 'filterGroupCategorySelect'.");
        
        // Dynamically get unique categories from groupsData, filter, sort, and then map
        const sortedCategories = Array.from(new Set(polyglotGroupsData.map(g => g.category).filter(Boolean) as string[]))
                                      .sort((a, b) => a.localeCompare(b));

        const categories = [
            { name: "All Categories", value: "all" },
            ...sortedCategories.map(cat => ({ name: cat, value: cat }))
        ];

        populateSelectWithOptions(domElements.filterGroupCategorySelect, categories, polyglotHelpers, false);
    } else {
        console.warn("FilterController: populateFilterDropdowns - SKIPPING 'filterGroupCategorySelect'. Element found:", !!domElements.filterGroupCategorySelect, "Data found:", !!polyglotGroupsData);
    }
    console.log("FilterController: populateFilterDropdowns - FINISHED."); // <<< Added for debugging
}


function populateSelectWithOptions(
    selectElement: HTMLSelectElement | null,
    optionsArray: Array<{ value: string; name: string; flagCode?: string | null }>,
    helpers: PolyglotHelpers,
    includeFlagEmoji: boolean = false
): void {
    console.log(`FilterController: populateSelectWithOptions - START for select element:`, selectElement?.id, `with optionsArray length: ${optionsArray?.length || 0}`);
    
    if (!selectElement) {
        console.warn("FilterController: populateSelectWithOptions - selectElement is null. Skipping.");
        return;
    }
    if (!helpers) { // Should be caught by main init check, but good to be safe
        console.error("FilterController: populateSelectWithOptions - helpers object is missing!");
        selectElement.innerHTML = '<option value="">Error: Helpers missing</option>';
        return;
    }
     if (!optionsArray || !Array.isArray(optionsArray)) { // Check if optionsArray is valid
        console.warn(`FilterController: populateSelectWithOptions - optionsArray is invalid or not an array for ${selectElement.id}. Skipping population. OptionsArray:`, optionsArray);
        selectElement.innerHTML = '<option value="">No options</option>'; // Provide a default state
        return;
    }

    // --- Automatic Alphabetical Sorting ---
    let sortedOptions = [...optionsArray]; // Create a mutable copy
    const allOption = sortedOptions.find(opt => opt && opt.value === 'all');
    if (allOption) {
        // If an "all" option exists, separate it, sort the rest, then prepend it.
        const otherOptions = sortedOptions.filter(opt => !opt || opt.value !== 'all');
        otherOptions.sort((a, b) => {
            if (!a || !a.name) return 1;  // push invalid items to the end
            if (!b || !b.name) return -1;
            return a.name.localeCompare(b.name);
        });
        sortedOptions = [allOption, ...otherOptions];
        console.log(`FilterController: Sorted options for ${selectElement.id} while preserving 'all' option at the top.`);
    } else {
        // Otherwise, just sort the whole array.
        sortedOptions.sort((a, b) => {
            if (!a || !a.name) return 1;
            if (!b || !b.name) return -1;
            return a.name.localeCompare(b.name);
        });
        console.log(`FilterController: Sorted all options for ${selectElement.id} alphabetically.`);
    }
    // --- End of Sorting ---

    selectElement.innerHTML = ''; // Clears existing
    console.log(`FilterController: populateSelectWithOptions - Cleared select element ${selectElement.id}. Iterating ${sortedOptions.length} sorted options.`);

    sortedOptions.forEach((opt, index) => {
        if (!opt || typeof opt.value === 'undefined' || typeof opt.name === 'undefined') {
            console.warn(`FilterController: populateSelectWithOptions - Invalid option data at index ${index} for ${selectElement.id}:`, opt);
            return; // Skip this invalid option
        }
        const option = document.createElement('option');
        option.value = opt.value;
        let textContent = helpers.sanitizeTextForDisplay(opt.name);
        if (includeFlagEmoji && opt.flagCode) {
            const flagEmoji = helpers.getFlagEmoji(opt.flagCode); // Assuming getFlagEmoji handles invalid codes gracefully
            textContent = `${flagEmoji} ${textContent}`.trim();
        }
        option.textContent = textContent;
        selectElement.appendChild(option);
    });
    console.log(`FilterController: populateSelectWithOptions - FINISHED for select element: ${selectElement.id}. Child count: ${selectElement.children.length}`);
}
        // This function should go inside your filter_controller.ts IIFE
        // D:\polyglot_connect\src\js\ui\filter_controller.ts
// Inside the IIFE for window.filterController

function filterAndDisplayConnectors(): void {
    const { cardRenderer, activityManager, domElements } = getDeps();
    const liveConnectors = window.polyglotConnectors as Connector[] | undefined; // Ensure Connector is imported

    // console.log("FilterController: filterAndDisplayConnectors - STARTING (Revised Logic for disabled role)."); // You can enable more detailed logs if needed

    if (!liveConnectors || !cardRenderer || !activityManager || !domElements?.connectorHubGrid || !domElements.filterLanguageSelect || !domElements.filterRoleSelect) {
        console.error("FilterController: filterAndDisplayConnectors - Missing critical dependencies.");
        if (domElements?.connectorHubGrid) {
            domElements.connectorHubGrid.innerHTML = "<p class='error-message'>Error: Connector filter components missing.</p>";
        }
        return;
    }

    const selectedLanguageFilter = domElements.filterLanguageSelect.value;
    const selectedRoleFilter = domElements.filterRoleSelect.disabled
                               ? 'all'
                               : domElements.filterRoleSelect.value;
                               const nameSearchTerm = domElements.filterConnectorNameInput?.value.trim().toLowerCase() || "";
    console.log("FilterController: Applying filters - Language:", selectedLanguageFilter, "| Effective Role:", selectedRoleFilter);

    let filteredConnectors: Connector[] = liveConnectors.map(c => ({
        ...c,
        isActive: activityManager.isConnectorActive(c)
    }));

    if (nameSearchTerm) {
        filteredConnectors = filteredConnectors.filter(connector =>
            (connector.name?.toLowerCase().includes(nameSearchTerm)) ||
            (connector.profileName?.toLowerCase().includes(nameSearchTerm))
        );
    }

    // --- Language Filtering ---
    if (selectedLanguageFilter && selectedLanguageFilter !== 'all') {
        const langFilterLower = selectedLanguageFilter.toLowerCase();
        filteredConnectors = filteredConnectors.filter(connector => {
            // Check 1: Persona's primary 'language' field
            if (connector.language?.toLowerCase() === langFilterLower) return true;

            // Check 2: Is the selected language one of their native languages?
            // Ensure LanguageEntry is imported and used correctly in Connector type
            if (connector.nativeLanguages?.some((langEntry: LanguageEntry) => langEntry.lang.toLowerCase() === langFilterLower)) return true;

            // Check 3: Is the selected language one of their practice languages?
            if (connector.practiceLanguages?.some((langEntry: LanguageEntry) => langEntry.lang.toLowerCase() === langFilterLower)) return true;

            // Check 4: Is the selected language a KEY in their languageRoles?
            // This checks if the persona has ANY role defined for the selected language.
            if (connector.languageRoles) {
                if (connector.languageRoles.hasOwnProperty(selectedLanguageFilter)) return true; // Check original case
                if (connector.languageRoles.hasOwnProperty(langFilterLower)) return true;      // Check lower case
            }
            return false;
        });
    }
    // console.log(`FilterController: After language filter ('${selectedLanguageFilter}'), count: ${filteredConnectors.length}`);

    // --- Role Filtering (now considers the selected language if one is chosen) ---
    if (selectedRoleFilter && selectedRoleFilter !== 'all') {
        const roleFilterLower = selectedRoleFilter.toLowerCase();

        filteredConnectors = filteredConnectors.filter(connector => {
            if (!connector.languageRoles) return false; // Must have languageRoles to filter by role

            if (selectedLanguageFilter && selectedLanguageFilter !== 'all') {
                // --- Role filter IS SPECIFIC to the selectedLanguageFilter ---
                let rolesForSelectedLang: string[] | undefined = undefined;
                // Try matching selectedLanguageFilter directly (case-sensitive if keys are)
                if (connector.languageRoles.hasOwnProperty(selectedLanguageFilter)) {
                    rolesForSelectedLang = connector.languageRoles[selectedLanguageFilter];
                }
                // Fallback: try matching lowercase version of selectedLanguageFilter as key
                // (if your languageRoles keys might not match dropdown value casing)
                else if (connector.languageRoles.hasOwnProperty(selectedLanguageFilter.toLowerCase())) {
                    rolesForSelectedLang = connector.languageRoles[selectedLanguageFilter.toLowerCase()];
                }
                
                return Array.isArray(rolesForSelectedLang) && rolesForSelectedLang.includes(roleFilterLower);

            } else {
                // --- Role filter applies to ANY language the connector has that role for ---
                return Object.values(connector.languageRoles).some(rolesInLangArray =>
                    Array.isArray(rolesInLangArray) && rolesInLangArray.includes(roleFilterLower)
                );
            }
            // This return false was incorrect, each path above should return true if a match is found
            // return false; // << REMOVE THIS if it was causing issues, each branch should return true/false
        });
    }
    // console.log(`FilterController: After role filter ('${selectedRoleFilter}' with lang context '${selectedLanguageFilter}'), count: ${filteredConnectors.length}`);

    cardRenderer.renderCards(filteredConnectors, 'discover');
    // console.log("FilterController: filterAndDisplayConnectors - Called cardRenderer.renderCards().");

    if (domElements.connectorHubGrid) {
        const loadingMsgEl = domElements.connectorHubGrid.querySelector('.loading-message') as HTMLElement | null;
        if (loadingMsgEl) {
            const hasCards = filteredConnectors.length > 0; // Check based on final filtered list
            loadingMsgEl.style.display = hasCards ? 'none' : 'block';
            if (!hasCards) {
                loadingMsgEl.textContent = (selectedLanguageFilter !== 'all' || selectedRoleFilter !== 'all' || nameSearchTerm) ?
                    'No partners match your current filters.' :
                    'No partners available at the moment.';
            }
        }
    }
    // console.log("FilterController: filterAndDisplayConnectors - FINISHED (Revised Logic).");
} // End of filterAndDisplayConnectors
    // AFTER (The new, tab-aware function)


    function applyFindConnectorsFilters(): void {
        const { cardRenderer, domElements, polyglotHelpers } = getDeps();
        
        // --- START OF THE GTA CHEAT CODE FIX ---
        const nameSearchInput = domElements.filterConnectorNameInput?.value.trim() || "";
        const searchUpper = nameSearchInput.toUpperCase();
    
        const CHEAT_CODES: { [key: string]: () => void } = {
            'DEVMODE': () => {
                const devPanel = (window as any).devPanel;
                if (devPanel) {
                    // Ensure the button is visible so the user can close the panel
                    devPanel.showToggleButton();
                    // Directly call the new function to toggle the panel's visibility
                    devPanel.toggle(); 
                }
            },
            'HESOYAM': () => alert('+$250,000, Health, & Armor\n...just kidding.'),
            'ROCKETMAN': () => alert('Jetpack Spawned!'),
            'PROFESSIONALSKIT': () => alert('Weapon Set 2 Unlocked.'),
            'FULLCLIP': () => alert('Infinite Ammo Activated!'),
            'AEZAKMI': () => alert('Wanted Level Cleared.'),
            'LEAVEMEALONE': () => alert('Wanted Level Cleared (The boring way).'),
            'PANZER': () => alert('Rhino Tank Spawned!'),
            'BIGBANG': () => alert('All nearby vehicles have exploded.'),
            'WHEELSONLYPLEASE': () => alert('Invisible Car Activated.'),
            'COMEFLYWITHME': () => alert('Cars Can Fly!'),
        };
    
        if (CHEAT_CODES[searchUpper]) {
            console.log(`%cCHEAT CODE ACTIVATED: ${searchUpper}`, 'color: white; background: red; font-size: 20px; font-weight: bold;');
            CHEAT_CODES[searchUpper]();
            if(domElements.filterConnectorNameInput) domElements.filterConnectorNameInput.value = "";
            return; 
        }
        // --- END OF THE GTA CHEAT CODE FIX ---
    
        console.log(`%c[FC] applyFindConnectorsFilters START. Active Friends View: '${activeFriendsView}'`, 'color: #ffc107; font-weight: bold;');
        const allConnectors = window.polyglotConnectors || [];
    
        if (!cardRenderer || !domElements || !polyglotHelpers) {
            console.error("FC: applyFindConnectorsFilters missing critical deps.");
            return;
        }
    
        const langFilter = domElements.filterLanguageSelect?.value || 'all';
        const roleFilter = domElements.filterRoleSelect?.value || 'all';
        const nameSearch = nameSearchInput; // Use the variable we already captured
        const normalizedNameSearch = polyglotHelpers.normalizeText(nameSearch);
    
        // --- UI State Management (Enable/Disable inputs) ---
        if (domElements.filterConnectorNameInput) domElements.filterConnectorNameInput.disabled = false;
        if (domElements.filterLanguageSelect) domElements.filterLanguageSelect.disabled = false;
        if (domElements.filterRoleSelect) domElements.filterRoleSelect.disabled = (langFilter === 'all');
        console.log(`[FC] UI State Updated: Name/Lang enabled. Role enabled: ${!domElements.filterRoleSelect?.disabled}`);
    
        // --- Data Filtering Logic ---
        let sourceConnectors: Connector[];
        let emptyMessage: string;
        let filteredEmptyMessage: string;
    
        if (activeFriendsView === 'my-friends') {
            sourceConnectors = (window.conversationManager?.getActiveConversations() || [])
                .filter(c => !c.isGroup)
                .map(c => c.connector);
            emptyMessage = 'You have no friends yet. Find some in the Discover tab!';
            filteredEmptyMessage = 'None of your friends match your filters.';
        } else { // 'discover' view
            const friendIds = new Set((window.conversationManager?.getActiveConversations() || []).map(c => c.connector.id));
            sourceConnectors = allConnectors.filter(c => !friendIds.has(c.id));
            emptyMessage = 'No new people to discover right now.';
            filteredEmptyMessage = 'No one matches your filters. Try different criteria!';
        }
    
        let filteredResult = [...sourceConnectors];
        const hasActiveFilters = langFilter !== 'all' || roleFilter !== 'all' || nameSearch !== "";
    
        if (nameSearch) {
            filteredResult = filteredResult.filter(c => polyglotHelpers.normalizeText(c.profileName).includes(normalizedNameSearch));
        }
        if (langFilter !== 'all') {
            filteredResult = filteredResult.filter(c =>
                c.nativeLanguages?.some(l => l.lang === langFilter) ||
                c.practiceLanguages?.some(l => l.lang === langFilter)
            );
        }
        if (langFilter !== 'all' && roleFilter !== 'all') {
            filteredResult = filteredResult.filter(c => c.languageRoles?.[langFilter]?.includes(roleFilter));
        }
    
        cardRenderer.renderCards(filteredResult, activeFriendsView);
        updateEmptyMessage(domElements.friendsEmptyPlaceholder, filteredResult.length, emptyMessage, filteredEmptyMessage, hasActiveFilters);
    }
// =========================================================================
// ===================================================================================
// =======================================================================================
// ============================================================================
function resetToDefaultFriendsView(): void {
    const defaultView = 'my-friends';
    console.log(`[FC] Resetting to default friends view ('${defaultView}').`);

    // If we are not already on the default "My Friends" tab, switch to it.
    // This will handle both the UI class toggling and calling the filter function.
    if (activeFriendsView !== defaultView) {
        console.log(`[FC] Currently on '${activeFriendsView}', switching to '${defaultView}'.`);
        switchFriendsViewTab(defaultView);
    } else {
        // If we are already on the correct default tab, just re-apply the filters
        // to ensure the list is fresh for the current state.
        console.log(`[FC] Already on default tab '${defaultView}', just re-applying filters.`);
        applyFindConnectorsFilters();
    }
}





function applyGroupSearchFilters(): void {
    const { domElements, groupManager } = getDeps();
    const langFilter = (domElements.filterGroupLanguageSelect as HTMLSelectElement)?.value || 'all';
    const categoryFilter = (domElements.filterGroupCategorySelect as HTMLSelectElement)?.value || 'all';
    const nameSearchTerm = (domElements.filterGroupNameInput as HTMLInputElement)?.value.trim().toLowerCase() || '';

    // ===== START: REPLACE THE REST OF THE FUNCTION WITH THIS =====
    console.log(`FC_DEBUG: applyGroupSearchFilters - View: ${activeGroupView}, Lang: ${langFilter}, Cat: ${categoryFilter}, Name: ${nameSearchTerm}`);

    if (!groupManager?.loadAvailableGroups) {
        console.error("FilterController: groupManager.loadAvailableGroups is not available.");
        return;
    }

    // Pass an extra option to the group manager
    groupManager.loadAvailableGroups(
        langFilter === 'all' ? null : langFilter,
        categoryFilter === 'all' ? null : categoryFilter,
        nameSearchTerm === '' ? null : nameSearchTerm,
        { viewType: activeGroupView } // Pass the active view type
    );
}

        console.log("filter_controller.ts: IIFE (module definition) FINISHED. Returning exported object.");
        return {
            initializeFilters,
            populateFilterDropdowns,
            applyFindConnectorsFilters,
            applyGroupSearchFilters,
            resetToDefaultFriendsView // <<< ADD THIS LINE
        };
    })(); // End of IIFE

if (window.filterController && 
    typeof window.filterController.initializeFilters === 'function' &&
    typeof window.filterController.applyFindConnectorsFilters === 'function') { 
    console.log("filter_controller.ts: SUCCESSFULLY assigned to window.filterController with all key methods verified.");
    
    console.log("FilterController: About to call self window.filterController.initializeFilters().");
    window.filterController.initializeFilters(); // <<< THIS CALL IS CRUCIAL
    console.log("FilterController: Returned from self window.filterController.initializeFilters().");

    document.dispatchEvent(new CustomEvent('filterControllerReady'));
    console.log('filter_controller.ts: "filterControllerReady" event dispatched (after self-initialization and all key methods verified).');
} else {
    console.error("filter_controller.ts: CRITICAL ERROR - window.filterController assignment FAILED or key methods (initializeFilters, applyFindConnectorsFilters) missing.");
    if (window.filterController) { 
        console.error(`FC_DEBUG: typeof window.filterController.initializeFilters: ${typeof (window.filterController as any).initializeFilters}`);
        console.error(`FC_DEBUG: typeof window.filterController.applyFindConnectorsFilters: ${typeof (window.filterController as any).applyFindConnectorsFilters}`);
    }
    // Dispatch ready anyway so app.ts doesn't hang, but it will have a non-functional (or partially functional) filterController.
    // This case is already handled by the dummy assignment if functionalChecks failed earlier.
    // If it fails here, it means the IIFE didn't return the expected methods.
     document.dispatchEvent(new CustomEvent('filterControllerReady'));
     console.warn('filter_controller.ts: "filterControllerReady" dispatched, BUT INITIALIZATION OR METHOD ASSIGNMENT HAD ISSUES.');
}
    
    document.dispatchEvent(new CustomEvent('filterControllerReady'));
    console.log('filter_controller.ts: "filterControllerReady" event dispatched.');

} // End of initializeActualFilterController
// --- Event listening logic & Initialization ---
const dependenciesForFilterController = [
    'domElementsReady',
    'polyglotHelpersReady',
    'cardRendererReady',      // <<< ADDED
    'activityManagerReady',   // <<< ADDED
    'groupManagerReady',
    'polyglotDataReady'
];

const fcMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForFilterController.forEach(dep => fcMetDependenciesLog[dep] = false);
let fcDepsMetCount = 0;

function checkAndInitFilterController(receivedEventName?: string): void {
    if (receivedEventName) {
        console.log(`FC_EVENT: Listener for '${receivedEventName}' was triggered.`);
        // Re-verify the actual window property upon event, not just trust the event.
        let eventDependencyVerified = false;
      switch (receivedEventName) {
            case 'domElementsReady':
                eventDependencyVerified = !!window.domElements;
                break;
            case 'polyglotHelpersReady':
                eventDependencyVerified = !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function');
                break;
            case 'cardRendererReady': // <<< ADDED
                eventDependencyVerified = !!(window.cardRenderer && typeof window.cardRenderer.renderCards === 'function');
                break;
            case 'activityManagerReady': // <<< ADDED
                eventDependencyVerified = !!(window.activityManager && typeof window.activityManager.isConnectorActive === 'function');
                break;
            case 'groupManagerReady':
                eventDependencyVerified = !!(window.groupManager && typeof window.groupManager.loadAvailableGroups === 'function');
                break;
            case 'polyglotDataReady':
                eventDependencyVerified = !!(window.polyglotFilterLanguages && Array.isArray(window.polyglotFilterLanguages) && window.polyglotFilterRoles && Array.isArray(window.polyglotFilterRoles));
                break;
            default:
                console.warn(`FC_EVENT: Unknown event '${receivedEventName}' received.`);
                return; // Do not proceed for unknown events
        }
        if (eventDependencyVerified) {
            if (!fcMetDependenciesLog[receivedEventName]) {
                fcMetDependenciesLog[receivedEventName] = true;
                fcDepsMetCount++;
                console.log(`FC_DEPS: Event '${receivedEventName}' processed AND VERIFIED. Count: ${fcDepsMetCount}/${dependenciesForFilterController.length}`);
            }
        } else {
            console.warn(`FC_EVENT: Event '${receivedEventName}' received, but window dependency verification FAILED. This is unusual.`);
            // Optionally, do not increment count or log as met if verification fails
        }
    }
    console.log(`FC_DEPS: Met status:`, JSON.stringify(fcMetDependenciesLog));

    if (fcDepsMetCount === dependenciesForFilterController.length) {
        console.log('filter_controller.ts: All dependencies met and verified. Initializing actual FilterController.');
        initializeActualFilterController();
        // Listeners with { once: true } remove themselves.
    }
}

// --- Initial Pre-Check and Listener Setup ---
console.log('FC_SETUP: Starting initial dependency pre-check for FilterController.');
fcDepsMetCount = 0;
Object.keys(fcMetDependenciesLog).forEach(key => fcMetDependenciesLog[key] = false);
let fcAllPreloadedAndVerified = true;

dependenciesForFilterController.forEach(eventName => {
    let isReadyNow = false;
    let isVerifiedNow = false;

    switch (eventName) {
        case 'domElementsReady':
            isReadyNow = !!window.domElements;
            isVerifiedNow = isReadyNow; // Basic existence check
            break;
        case 'polyglotHelpersReady':
            isReadyNow = !!window.polyglotHelpers;
            isVerifiedNow = !!(isReadyNow && typeof window.polyglotHelpers?.sanitizeTextForDisplay === 'function');
            break;
        case 'cardRendererReady': // <<< ADDED
            isReadyNow = !!window.cardRenderer;
            isVerifiedNow = !!(isReadyNow && typeof window.cardRenderer?.renderCards === 'function');
            break;
        case 'activityManagerReady': // <<< ADDED
            isReadyNow = !!window.activityManager;
            isVerifiedNow = !!(isReadyNow && typeof window.activityManager?.isConnectorActive === 'function');
            break;
        case 'groupManagerReady':
            isReadyNow = !!window.groupManager;
            isVerifiedNow = !!(isReadyNow && typeof window.groupManager?.loadAvailableGroups === 'function');
            break;
        case 'polyglotDataReady':
            isReadyNow = !!(window.polyglotFilterLanguages && window.polyglotFilterRoles);
            isVerifiedNow = !!(isReadyNow && Array.isArray(window.polyglotFilterLanguages) && Array.isArray(window.polyglotFilterRoles));
            break;
        default:
            console.warn(`FC_PRECHECK: Unknown dependency in pre-check: ${eventName}`);
            break;
    }
    console.log(`FC_PRECHECK: For '${eventName}': Exists? ${isReadyNow}, Verified? ${isVerifiedNow}`);
    if (isVerifiedNow) {
        console.log(`FC_PRECHECK: Dependency '${eventName}' ALREADY MET AND VERIFIED.`);
        if (!fcMetDependenciesLog[eventName]) {
            fcMetDependenciesLog[eventName] = true;
            fcDepsMetCount++;
        }
    } else {
        fcAllPreloadedAndVerified = false;
        console.log(`FC_PRECHECK: Dependency '${eventName}' not ready/verified. Adding listener.`);
        document.addEventListener(eventName, function anEventListener() { // Give listener a name for clarity
            checkAndInitFilterController(eventName); // Pass eventName to checkAndInit
        }, { once: true });
    }
});

console.log(`FC_SETUP: Pre-check done. Met: ${fcDepsMetCount}/${dependenciesForFilterController.length}`, JSON.stringify(fcMetDependenciesLog));

if (fcAllPreloadedAndVerified && fcDepsMetCount === dependenciesForFilterController.length) {
    console.log('filter_controller.ts: All dependencies ALREADY MET AND VERIFIED during pre-check. Initializing directly.');
    initializeActualFilterController();
} else if (fcDepsMetCount > 0 && fcDepsMetCount < dependenciesForFilterController.length) {
    console.log(`filter_controller.ts: Some dependencies pre-verified (${fcDepsMetCount}/${dependenciesForFilterController.length}), waiting for remaining events.`);
} else if (fcDepsMetCount === 0 && !fcAllPreloadedAndVerified) {
    console.log(`filter_controller.ts: No dependencies pre-verified. Waiting for all ${dependenciesForFilterController.length} events.`);
}

console.log("filter_controller.ts: Script execution FINISHED. Initialization is event-driven or direct.");