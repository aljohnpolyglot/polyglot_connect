// D:\polyglot_connect\src\js\ui\list_renderer.ts

// D:\polyglot_connect\src\js\ui\list_renderer.ts

// This file is responsible for rendering various lists within the application, such as active chat lists, summary lists, and available group lists. It manages dependencies and ensures that the necessary modules are ready before initializing the list renderer functionality.





import type {
    YourDomElements,
    PolyglotHelpersOnWindow as PolyglotHelpers,
    ActivityManager,
    FlagLoader,
   
    Connector, 
    Group,     
    SessionData, 
    LanguageFilterItem,
    ListItemData,
    CombinedChatItem,         // <<< ADD COMMA HERE
     ActiveOneOnOneChatItem,
    ActiveGroupListItem // <<< ADD THIS IMPORT
} from '../types/global.d.ts'; 

console.log('list_renderer.ts: Script loaded, waiting for core dependencies.');

interface ListRendererModule {
   renderActiveChatList: (combinedChatsArray: CombinedChatItem[], onCombinedItemClick: (itemData: CombinedChatItem) => void) => void;
    renderSummaryList: (sessionsArray: SessionData[], onSummaryClick: (sessionDataOrId: SessionData | string) => void) => void;
    renderAvailableGroupsList: (groupsArray: Group[], onGroupClick: (groupOrId: Group | string) => void) => void;
    renderGroupMembersList: (
        members: Connector[],
        tutorId: string | null,
        onMemberClick: (connector: Connector) => void,
        listUlElement: HTMLUListElement | null, // Pass the specific UL element
        searchFilter?: string // Optional search term
    ) => void; // New
}

// Assign a structural placeholder
window.listRenderer = {
    renderActiveChatList: () => console.warn("LR structural: renderActiveChatList called before full init."),
    renderSummaryList: () => console.warn("LR structural: renderSummaryList called before full init."),
    renderAvailableGroupsList: () => console.warn("LR structural: renderAvailableGroupsList called before full init."),
    renderGroupMembersList: () => console.error("LR dummy: renderGroupMembersList") // <<< ADD THIS
} as ListRendererModule;
console.log('list_renderer.ts: Structural placeholder for window.listRenderer assigned.');

function initializeActualListRenderer(): void {
    console.log('list_renderer.ts: initializeActualListRenderer() called. Performing detailed dependency check...');

    const depsCheck = {
        domElements: !!window.domElements,
        polyglotHelpers: !!(window.polyglotHelpers && typeof window.polyglotHelpers.sanitizeTextForDisplay === 'function'),
        activityManager: !!(window.activityManager && typeof window.activityManager.isConnectorActive === 'function'),
        flagLoader: !!(window.flagLoader && typeof window.flagLoader.getFlagUrl === 'function'),
        // viewManager: !!(window.viewManager && typeof window.viewManager.updateEmptyListMessages === 'function'), // Or another key method
        polyglotConnectors: !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)),
        polyglotFilterLanguages: !!(window.polyglotFilterLanguages && Array.isArray(window.polyglotFilterLanguages))
        // Add polyglotSharedContent if it's used by populateHomepageTips which was moved out of view_manager
    };

    const allDepsMet = Object.values(depsCheck).every(Boolean);

    if (!allDepsMet) {
        console.error("list_renderer.ts: CRITICAL - Functional dependencies not ready. Halting ListRenderer setup. Check details:", depsCheck);
        window.listRenderer = { /* Dummy methods for ListRendererModule */
            renderActiveChatList: () => console.error("LR dummy: renderActiveChatList"),
            renderSummaryList: () => console.error("LR dummy: renderSummaryList"),
            renderAvailableGroupsList: () => console.error("LR dummy: renderAvailableGroupsList"),
            renderGroupMembersList: () => console.error("LR dummy: renderGroupMembersList") // <<< ADD THIS LINE
        } as ListRendererModule;
        document.dispatchEvent(new CustomEvent('listRendererReady')); // Dispatch even on failure
        console.warn('list_renderer.ts: "listRendererReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('list_renderer.ts: Core functional dependencies appear ready for IIFE. Details:', depsCheck);

    window.listRenderer = ((): ListRendererModule => {
        'use strict';

        const getDeps = () => ({
            domElements: window.domElements as YourDomElements,
            polyglotHelpers: window.polyglotHelpers as PolyglotHelpers,
            activityManager: window.activityManager as ActivityManager,
            flagLoader: window.flagLoader as FlagLoader,
            // viewManager: window.viewManager as ViewManager,
            polyglotFilterLanguages: window.polyglotFilterLanguages as LanguageFilterItem[],
            polyglotConnectors: window.polyglotConnectors as Connector[]
        });

        // Type for itemData passed to createListItemHTML
        type CreateListItemDataType = ListItemData; // Using the more generic ListItemData

           // D:\polyglot_connect\src\js\ui\list_renderer.ts
// Inside function initializeActualListRenderer() -> inside the IIFE for window.listRenderer

        function createListItemHTML(
            itemData: ListItemData, // Using the generic ListItemData type
            itemTypeContext: 'activeChat' | 'summary' | 'groupDiscovery'
        ): string {
            const { polyglotHelpers, activityManager, flagLoader, domElements, polyglotFilterLanguages, polyglotConnectors } = getDeps();

            if (!itemData || !polyglotHelpers || !activityManager || !flagLoader) {
                console.error("LR_ERROR: createListItemHTML - Missing critical core dependencies (polyglotHelpers, activityManager, flagLoader). ItemData:", itemData);
                return '<div class="list-item-base error-item">Error rendering: Core dependencies missing</div>';
            }

            let name: string = "Unknown";
            let avatarHtml: string = '';
            let statusOrActionHtml: string = '';
            let wrapperClasses: string[] = []; // Use an array for classes for sidebar items
            let dataIdAttr: string = '';
            let subTextOutput: string = '';
            
            const effectiveBaseUrl_lr = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
            const safeBaseUrl_lr = effectiveBaseUrl_lr.endsWith('/') ? effectiveBaseUrl_lr : effectiveBaseUrl_lr + '/';
            const placeholderAvatarSrc = `${safeBaseUrl_lr}images/placeholder_avatar.png`;
            const placeholderGroupAvatarSrc = `${safeBaseUrl_lr}images/placeholder_group_avatar.png`;
            const globeFlagFallbackSrc = flagLoader.getFlagUrl('globe', null);

            try {
                if (itemTypeContext === 'activeChat') {
                    wrapperClasses.push('list-item-base', 'chat-list-item-wrapper'); // Base for sidebar, specific for chat items

                    if (itemData.isGroup) { // --- GROUP CHAT ITEM (Active List in Sidebar) ---
                        const groupItem = itemData as ActiveGroupListItem;
                        name = groupItem.name || "Unnamed Group";
                        dataIdAttr = groupItem.id ? `data-group-id="${polyglotHelpers.sanitizeTextForDisplay(groupItem.id)}"` : '';
                        wrapperClasses.push('group-chat-list-item');

                        if (groupItem.groupPhotoUrl) {
                            let photoPath = groupItem.groupPhotoUrl; // Declare photoPath here
                            if (photoPath.startsWith('/')) photoPath = photoPath.substring(1);
                            else if (!photoPath.startsWith('images/')) photoPath = `images/groups/${photoPath}`;
                            const finalPhotoUrl = `${safeBaseUrl_lr}${photoPath}`;
                            avatarHtml = `<img src="${polyglotHelpers.sanitizeTextForDisplay(finalPhotoUrl)}" alt="${polyglotHelpers.sanitizeTextForDisplay(name)}" class="list-item-avatar group-photo" onerror="this.onerror=null; this.src='${placeholderGroupAvatarSrc}'">`;
                        } else if (groupItem.language) {
                            const langDef = (polyglotFilterLanguages || []).find(l => l.name === groupItem.language || l.value === groupItem.language);
                            const langSub = typeof groupItem.language === 'string' ? groupItem.language.substring(0, 2).toLowerCase() : '';
                            const flagCodeToUse = langDef?.flagCode || langSub || 'xx'; // Declare flagCodeToUse here
                            if (flagCodeToUse && flagCodeToUse !== 'xx') {
                                avatarHtml = `<img src="${flagLoader.getFlagUrl(flagCodeToUse, null)}" alt="${polyglotHelpers.sanitizeTextForDisplay(groupItem.language)}" class="list-item-avatar lang-flag" onerror="this.onerror=null; this.src='${globeFlagFallbackSrc}'">`;
                            } else {
                                avatarHtml = `<div class="list-item-avatar icon-avatar"><i class="fas fa-users"></i></div>`;
                            }
                        } else {
                            avatarHtml = `<div class="list-item-avatar icon-avatar"><i class="fas fa-users"></i></div>`;
                        }

                        let plainPreview = "No messages yet.";
                        if (groupItem.messages && groupItem.messages.length > 0) {
                            const lastMsg = groupItem.messages[groupItem.messages.length - 1];
                            if (lastMsg?.text && (typeof (lastMsg as any).speakerName === 'string' || (lastMsg as any).speakerId === "user_player")) {
                                let speakerDisplay = (lastMsg as any).speakerId === "user_player" ? "You" : ((lastMsg as any).speakerName || "System");
                                plainPreview = `${speakerDisplay}: ${lastMsg.text}`;
                            } else if (lastMsg?.text) {
                                plainPreview = lastMsg.text;
                            } else if (lastMsg) {
                                plainPreview = "[Group media/event]";
                            }
                            plainPreview = plainPreview.length > 25 ? `${plainPreview.substring(0, 22)}...` : plainPreview;
                        }
                        subTextOutput = `<span class="list-item-subtext-preview">${polyglotHelpers.sanitizeTextForDisplay(plainPreview)}</span>`;
                        
                        if (groupItem.lastActivity) {
                            const formattedTime = polyglotHelpers.formatRelativeTimestamp(groupItem.lastActivity);
                            if (formattedTime) subTextOutput += ` <span class="list-item-timestamp">${formattedTime}</span>`;
                        }

                    } else { // --- 1-ON-1 CHAT ITEM (Active List in Sidebar) ---
                        const oneOnOneItem = itemData as ActiveOneOnOneChatItem;
                        const connector = oneOnOneItem.connector;

                        if (!connector?.id) {
                            console.warn("LR_ERROR: createListItemHTML (activeChat 1-on-1) - Invalid connector data.", itemData);
                            wrapperClasses.push('error-item'); // Add error class to wrapper
                            return `<div class="${wrapperClasses.join(' ')}">Invalid chat item</div>`;
                        }
                        name = connector.profileName || connector.name || "Unknown Contact";
                        dataIdAttr = `data-connector-id="${polyglotHelpers.sanitizeTextForDisplay(connector.id)}"`;
                        // For 1-on-1 in sidebar, your code used 'sidebar-item-avatar'.
                        // If 'lists.css' now styles '.list-item-avatar' for ALL sidebar avatars, this should be:
                        avatarHtml = `<img src="${connector.avatarModern || placeholderAvatarSrc}" alt="${polyglotHelpers.sanitizeTextForDisplay(name)}" class="list-item-avatar" onerror="this.onerror=null; this.src='${placeholderAvatarSrc}'">`;
                        
                        let plainPreview = "No messages yet.";
                        if (oneOnOneItem.messages && oneOnOneItem.messages.length > 0) {
                            const lastMsg = oneOnOneItem.messages[oneOnOneItem.messages.length - 1];
                            if (lastMsg) {
                                let textPreview = lastMsg.text || "[Media]";
                                plainPreview = lastMsg.sender?.startsWith('user') ? `You: ${textPreview}` : textPreview;
                                plainPreview = plainPreview.length > 25 ? `${plainPreview.substring(0, 22)}...` : plainPreview;
                            }
                        }
                        subTextOutput = `<span class="list-item-subtext-preview">${polyglotHelpers.sanitizeTextForDisplay(plainPreview)}</span>`;
                        
                        if (oneOnOneItem.lastActivity) {
                            const formattedTime = polyglotHelpers.formatRelativeTimestamp(oneOnOneItem.lastActivity);
                            if (formattedTime) subTextOutput += ` <span class="list-item-timestamp">${formattedTime}</span>`;
                        }

                        const isActive = activityManager.isConnectorActive(connector);
                        statusOrActionHtml = `<span class="chat-list-item-status ${isActive ? 'active' : ''}" title="${isActive ? 'Active' : 'Inactive'}"></span>`;
                    }
                } else if (itemTypeContext === 'summary') {
                    wrapperClasses.push('list-item-base', 'summary-list-item-wrapper');
                    const sessionItem = itemData as SessionData;
                    name = sessionItem.connectorName || "Session";
                    dataIdAttr = sessionItem.sessionId ? `data-session-id="${polyglotHelpers.sanitizeTextForDisplay(sessionItem.sessionId)}"` : '';
                    
                    let connectorAvatar = placeholderAvatarSrc;
                    if (sessionItem.connectorId) { 
                        const c = polyglotConnectors.find(conn => conn.id === sessionItem.connectorId);
                        if (c?.avatarModern) connectorAvatar = c.avatarModern;
                    }
                    // For summary in sidebar, your code used 'sidebar-item-avatar'.
                    // If 'lists.css' now styles '.list-item-avatar' for ALL sidebar avatars, this should be:
                    avatarHtml = `<img src="${connectorAvatar}" alt="${polyglotHelpers.sanitizeTextForDisplay(name)}" class="list-item-avatar" onerror="this.onerror=null; this.src='${placeholderAvatarSrc}'">`;
                    
                    let datePart = sessionItem.date || 'N/A';
                    let timePart = '';
                    if (sessionItem.startTimeISO) {
                        try {
                            const d = new Date(sessionItem.startTimeISO);
                            datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric'});
                            timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit'});
                        } catch {}
                    }
                    subTextOutput = `<span class="summary-item-date">${polyglotHelpers.sanitizeTextForDisplay(datePart)}</span>`;
                    if (timePart) subTextOutput += `<span class="summary-item-time">${polyglotHelpers.sanitizeTextForDisplay(timePart)}</span>`;
                    if (sessionItem.duration) subTextOutput += `<span class="summary-item-duration">(${polyglotHelpers.sanitizeTextForDisplay(sessionItem.duration)})</span>`;

                } else if (itemTypeContext === 'groupDiscovery') {
                    // For Main Groups Page Cards - wrapperClasses is NOT used for an outer div.
                    // The class 'group-discovery-list-item' is applied to the <li> in renderList.
                    // This function returns the *inner HTML* of that <li>.
                    const group = itemData as Group;
                    name = group.name || "Unnamed Group";
                    // dataIdAttr for groupDiscovery cards will be set on the <li> in renderList

                    if (group.groupPhotoUrl) {
                        let photoPath = group.groupPhotoUrl; // Declare photoPath here
                        if (photoPath.startsWith('/')) photoPath = photoPath.substring(1);
                        else if (!photoPath.startsWith('images/')) photoPath = `images/groups/${photoPath}`;
                        const finalPhotoUrl = `${safeBaseUrl_lr}${photoPath}`;
                        avatarHtml = `<img src="${polyglotHelpers.sanitizeTextForDisplay(finalPhotoUrl)}" alt="${polyglotHelpers.sanitizeTextForDisplay(name)}" class="group-card-avatar group-photo large-group-photo" onerror="this.onerror=null; this.src='${placeholderGroupAvatarSrc}'">`;
                    } else if (group.language) {
                        const langDef = (polyglotFilterLanguages || []).find(l => l.name === group.language || l.value === group.language);
                        const langSub = typeof group.language === 'string' ? group.language.substring(0, 2).toLowerCase() : '';
                        const flagCodeToUse = langDef?.flagCode || langSub || 'xx'; // Declare flagCodeToUse here
                        if (flagCodeToUse && flagCodeToUse !== 'xx') {
                            avatarHtml = `<img src="${flagLoader.getFlagUrl(flagCodeToUse, null)}" alt="${polyglotHelpers.sanitizeTextForDisplay(group.language)}" class="group-card-avatar lang-flag-lg" onerror="this.onerror=null; this.src='${globeFlagFallbackSrc}'">`;
                        } else {
                            avatarHtml = `<div class="group-card-avatar icon-avatar large-group-icon"><i class="fas fa-users"></i></div>`;
                        }
                    } else {
                        avatarHtml = `<div class="group-card-avatar icon-avatar large-group-icon"><i class="fas fa-users"></i></div>`;
                    }
                    
                    let descPreview = `${group.language || 'N/A'} - ${group.description ? group.description.substring(0, 70) + (group.description.length > 70 ? '...' : '') : 'Chat away!'}`;
                    subTextOutput = `<p class="group-card-subtext">${polyglotHelpers.sanitizeTextForDisplay(descPreview)}</p>`;
                    
                    let ctaButtonHtml: string;
                    if (group.isJoined) {
                        ctaButtonHtml = `<button class="group-card-view-chat-btn action-btn-sm secondary-btn" data-group-id="${polyglotHelpers.sanitizeTextForDisplay(group.id || '')}"><i class="fas fa-comment-dots"></i> View Chat</button>`;
                    } else {
                        ctaButtonHtml = `<button class="group-card-join-btn action-btn-sm primary-btn" data-group-id="${polyglotHelpers.sanitizeTextForDisplay(group.id || '')}"><i class="fas fa-plus-circle"></i> Join Group</button>`;
                    }
    
                    statusOrActionHtml = `
                        ${ctaButtonHtml}
                        <button class="group-card-info-btn action-btn-sm subtle-btn" data-group-id="${polyglotHelpers.sanitizeTextForDisplay(group.id || '')}"><i class="fas fa-info-circle"></i> Info</button>
                    `;
                }
            } catch (error: any) {
                console.error(`LR_ERROR: createListItemHTML for '${itemTypeContext}', ID '${(itemData as any)?.id || 'unknown'}':`, error, "ItemData:", JSON.parse(JSON.stringify(itemData || {})));
                if (itemTypeContext === 'activeChat' || itemTypeContext === 'summary') {
                    return `<div class="list-item-base error-item">Render error: ${polyglotHelpers.sanitizeTextForDisplay(error.message)}</div>`;
                } else {
                    return `<div class="error-item">Render error: ${polyglotHelpers.sanitizeTextForDisplay(error.message)}</div>`;
                }
            }

            // Construct the final HTML string based on context
            if (itemTypeContext === 'groupDiscovery') {
                // Return only inner HTML for the card (<li>)
                return `
                    ${avatarHtml}
                    <div class="group-card-info">
                        <h4 class="group-card-name">${polyglotHelpers.sanitizeTextForDisplay(name)}</h4>
                        ${subTextOutput} <p class="group-card-subtext"> 
                    </div>
                    <div class="group-card-actions">
                        ${statusOrActionHtml}
                    </div>
                `;
            } else {
                // For sidebar items, return the wrapped div
                const finalWrapperClass = wrapperClasses.join(' '); // Construct class string from the array
                return `
                    <div class="${finalWrapperClass}" ${dataIdAttr}>
                        ${avatarHtml}
                        <div class="sidebar-item-info"> 
                            <span class="sidebar-item-name">${polyglotHelpers.sanitizeTextForDisplay(name)}</span>
                            ${subTextOutput ? `<span class="sidebar-item-subtext">${subTextOutput}</span>` : ''}
                        </div>
                        ${statusOrActionHtml}
                    </div>`;
            }
           



        } // End of createListItemHTML
        
   // D:\polyglot_connect\src\js\ui\list_renderer.ts
// Inside the IIFE for window.listRenderer

function renderList(
    ulElement: HTMLUListElement | null,
    emptyMsgElement: HTMLElement | null,
    items: ListItemData[],
    itemTypeContext: 'activeChat' | 'summary' | 'groupDiscovery',
    itemClickHandler: (itemData: ListItemData) => void
): void {
    const { polyglotHelpers } = getDeps(); // polyglotHelpers needed for groupDiscovery data attribute

    console.log(`LR_renderList_DOM_DEBUG: Starting render for ${ulElement?.id}. Current children: ${ulElement?.children.length}. Items to render: ${items?.length || 0}`); // <<< ADD THIS

    if (!ulElement) {
        console.error("LR_renderList: ulElement is null. Cannot render.");
        return;
    }
    if (typeof itemClickHandler !== 'function') {
        console.error(`LR_renderList: itemClickHandler NOT function for context '${itemTypeContext}'.`);
        // Continue rendering, but clicks might not work as expected.
    }
    const oldChildrenCountLR = ulElement.children.length; // <<< ADD THIS
    ulElement.innerHTML = ''; // Clear previous items
    console.log(`LR_renderList_DOM_DEBUG: After innerHTML='', children for ${ulElement.id}: ${ulElement.children.length}. (Was ${oldChildrenCountLR})`); // <<< ADD THIS
    if (ulElement.children.length > 0 && oldChildrenCountLR > 0) { // <<< ADD THIS
        console.warn(`LR_renderList_DOM_WARN: innerHTML='' on ${ulElement.id} did NOT clear children!`); // <<< ADD THIS
    } // <<< ADD THIS
    if (!items || items.length === 0) {
        if (emptyMsgElement) {
            emptyMsgElement.style.display = 'block';
            // Optionally set a default "no items" message if not already handled
            // emptyMsgElement.textContent = "No items to display.";
        }
        return;
    }
    if (emptyMsgElement) {
        emptyMsgElement.style.display = 'none';
    }

    const fragment = document.createDocumentFragment();
    let successfullyCreatedLiCount = 0; // <<< ADD THIS: Declare and initialize
    items.forEach(item => {
        if (!item) {
            console.warn("LR_renderList: Skipping null/undefined item in items array.");
            return;
        }

        const li = document.createElement('li');
        // Call createListItemHTML ONCE to get the HTML string for the item's content
        const generatedItemHtml = createListItemHTML(item, itemTypeContext);

        if (itemTypeContext === 'groupDiscovery') {
            li.className = 'group-discovery-list-item';
            const group = item as Group;
           
           
            li.classList.toggle('state-not-joined', !group.isJoined);
            // ===== END: ADD THIS LINE =====

       

           
            if (group.id) {
                li.dataset.groupId = polyglotHelpers.sanitizeTextForDisplay(group.id);
            }
            li.innerHTML = generatedItemHtml;

            // --- Find all three buttons inside the newly created card ---
            const joinBtn = li.querySelector('.group-card-join-btn') as HTMLButtonElement | null;
            const viewChatBtn = li.querySelector('.group-card-view-chat-btn') as HTMLButtonElement | null;
            const infoBtn = li.querySelector('.group-card-info-btn') as HTMLButtonElement | null;

            // --- Attach listener for "Join Group" button ---
            if (joinBtn) {
                joinBtn.addEventListener('click', (e: MouseEvent) => {
                    e.stopPropagation(); // Prevent the whole card from being clicked
                    console.log(`LR_DEBUG: "Join Group" button clicked for group ID: ${group.id}`);
                    itemClickHandler(group); // This calls groupManager.joinGroup
                });
            }

            // --- Attach listener for "View Chat" button ---
            if (viewChatBtn) {
                viewChatBtn.addEventListener('click', (e: MouseEvent) => {
                    e.stopPropagation();
                    console.log(`LR_DEBUG: "View Chat" button clicked for group ID: ${group.id}`);
                    itemClickHandler(group); // This also calls groupManager.joinGroup
                });
            }

            // --- Attach listener for our NEW "Info" button ---
            if (infoBtn) {
                infoBtn.addEventListener('click', (e: MouseEvent) => {
                    e.stopPropagation();
                    console.log(`LR_DEBUG: "Info" button clicked for group ID: ${group.id}`);
                    const guh = window.groupUiHandler;
                    // This calls the specific function to open the info modal
                    if (guh?.openGroupInfoModal) { 
                        guh.openGroupInfoModal(group);
                    } else {
                        console.error("LR_ERROR: groupUiHandler.openGroupInfoModal is not available.");
                    }
                });
            }
        } else { // Handles 'activeChat' and 'summary' (sidebar list items)
            // For sidebar items, generatedItemHtml is the complete <div class="list-item-base...">
            li.innerHTML = generatedItemHtml;
            const clickableItemContainer = li.firstElementChild as HTMLElement | null;

            if (clickableItemContainer && !clickableItemContainer.classList.contains('error-item')) {
                clickableItemContainer.addEventListener('click', () => {
                    console.log(`LR_DEBUG: Sidebar item CLICKED! Type: '${itemTypeContext}', Data ID: '${(item as any)?.id}'.`);
                    if (typeof itemClickHandler === 'function') {
                        itemClickHandler(item);
                    } else {
                        console.error(`LR_ERROR: itemClickHandler NOT function for context '${itemTypeContext}'.`);
                    }
                });
            } else if (!clickableItemContainer) {
                console.warn(`LR_WARN: No clickableItemContainer found for sidebar item. HTML:`, generatedItemHtml);
            }
        }
        fragment.appendChild(li);
        successfullyCreatedLiCount++; // This should be inside the forEach if you're counting there
    }); // End of items.forEach
    
    // If successfullyCreatedLiCount is not used, use fragment.children.length
    const fragmentChildrenCount = fragment.children.length; // Get count before appending
    console.log(`LR_renderList_DOM_DEBUG: Fragment created for ${ulElement.id} with ${fragmentChildrenCount} li elements.`); // <<< ADD THIS
    
    ulElement.appendChild(fragment);
    
    console.log(`LR_renderList_DOM_DEBUG: After appendChild(fragment) to ${ulElement.id}, children count: ${ulElement.children.length}. (Expected ${fragmentChildrenCount})`); // <<< ADD THIS
    if (ulElement.children.length !== fragmentChildrenCount && fragmentChildrenCount > 0) { // <<< ADD THIS
        console.error(`LR_renderList_DOM_ERROR: Mismatch for ${ulElement.id}! Expected ${fragmentChildrenCount}, got ${ulElement.children.length}.`); // <<< ADD THIS
    } // <<< ADD THIS

    // --- START OF INSERTION (LR.DEBUG.1) ---
    console.log(`LR_DEBUG: renderList for ${itemTypeContext} - Appended fragment to ulElement.id='${ulElement.id}'. Child count: ${ulElement.children.length}`);
    if (ulElement.children.length > 0 && ulElement.children.length === items.length) {
        console.log(`LR_DEBUG: renderList for ${itemTypeContext} - Successfully rendered ${ulElement.children.length} items.`);
    } else if (items.length > 0 && ulElement.children.length === 0) {
        console.warn(`LR_WARN: renderList for ${itemTypeContext} - Appended fragment, but ulElement still has 0 children. items.length was ${items.length}. ulElement.innerHTML:`, ulElement.innerHTML);
    } else if (items.length > 0 && ulElement.children.length !== items.length) {
        console.warn(`LR_WARN: renderList for ${itemTypeContext} - Mismatch. items.length: ${items.length}, ulElement.children.length: ${ulElement.children.length}. ulElement.innerHTML:`, ulElement.innerHTML);
    }
    // --- END OF INSERTION (LR.DEBUG.1) ---
} // End of renderList
function renderGroupMembersListInternal (
    members: Connector[],
    tutorId: string | null,
    onMemberClick: (connector: Connector) => void,
    listUlElement: HTMLUListElement | null,
    searchFilter?: string
): void {
    const { polyglotHelpers } = getDeps(); // Make sure polyglotHelpers is in getDeps
    if (!listUlElement || !polyglotHelpers) {
        console.error("LR.renderGroupMembersList: Missing listUlElement or polyglotHelpers.");
        if (listUlElement) listUlElement.innerHTML = '<li>Error rendering members.</li>';
        return;
    }

    listUlElement.innerHTML = ''; // Clear previous
    let filteredMembers = members;

    if (searchFilter && searchFilter.trim() !== "") {
        const searchTermLower = searchFilter.trim().toLowerCase();
        filteredMembers = members.filter(member =>
            (member.profileName?.toLowerCase().includes(searchTermLower)) ||
            (member.name?.toLowerCase().includes(searchTermLower))
        );
    }

    if (filteredMembers.length === 0) {
        listUlElement.innerHTML = '<li class="empty-list-msg" style="padding: 10px; text-align: center;">No members found.</li>';
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredMembers.forEach(member => {
        if (!member || !member.id) return;

        const li = document.createElement('li');
        li.className = 'gmm-member-list-item'; // From new modal's CSS
        li.dataset.connectorId = member.id;

        const effectiveBaseUrl_lr_gmm = (window as any).POLYGLOT_CONNECT_BASE_URL || '/';
        const safeBaseUrl_lr_gmm = effectiveBaseUrl_lr_gmm.endsWith('/') ? effectiveBaseUrl_lr_gmm : effectiveBaseUrl_lr_gmm + '/';
        const placeholderAvatarSrc_gmm = `${safeBaseUrl_lr_gmm}images/placeholder_avatar.png`;

        let avatarSrc = member.avatarModern || placeholderAvatarSrc_gmm;

        let roleBadgeHtml = '';
        if (tutorId && member.id === tutorId) {
            roleBadgeHtml = '<span class="gmm-member-role-badge tutor">Tutor</span>';
        }

        li.innerHTML = `
            <img src="${polyglotHelpers.sanitizeTextForDisplay(avatarSrc)}" alt="${polyglotHelpers.sanitizeTextForDisplay(member.profileName || member.name)}" class="gmm-member-avatar" onerror="this.onerror=null; this.src='${placeholderAvatarSrc_gmm}'">
            <span class="gmm-member-name">${polyglotHelpers.sanitizeTextForDisplay(member.profileName || member.name)}</span>
            ${roleBadgeHtml}
            <!-- <button class="gmm-member-options-btn control-btn subtle-btn" title="More options"><i class="fas fa-ellipsis-h"></i></button> -->
        `; // Options button commented out for now for simplicity

        li.addEventListener('click', () => onMemberClick(member));
        fragment.appendChild(li);
    });
    listUlElement.appendChild(fragment);
}
        console.log("ui/list_renderer.ts: IIFE finished.");
        return {
           renderActiveChatList: (combinedChatsArray: CombinedChatItem[], onCombinedItemClick: (itemData: CombinedChatItem) => void) => {
                console.log("LR_DEBUG: renderActiveChatList called with combinedChatsArray:", JSON.parse(JSON.stringify(combinedChatsArray || []))); 
                const { domElements,} = getDeps(); // Uses getDeps from list_renderer.ts
                renderList(
                    domElements.chatListUl, 
                    domElements.emptyChatListMsg, 
                    combinedChatsArray as ListItemData[], // Cast if renderList is more generic
                    'activeChat', 
                    onCombinedItemClick as (item: ListItemData) => void // Cast if renderList is more generic
                );
            },
          renderSummaryList: (sessionsArray, onSummaryClick) => {
        console.log("LR: renderSummaryList - Received sessionsArray, count:", sessionsArray?.length, JSON.parse(JSON.stringify(sessionsArray || []))); // <<< LOG DATA
        const { domElements } = getDeps();
        const validSessions = Array.isArray(sessionsArray) ? sessionsArray : [];
        
        const sortedSessions = [...validSessions].sort((a, b) => {
            // ... (your sort logic) ...
            const timeA = a?.startTimeISO ? new Date(a.startTimeISO).getTime() : 0; // More direct access
            const timeB = b?.startTimeISO ? new Date(b.startTimeISO).getTime() : 0;
            return timeB - timeA;
        });
        console.log("LR: renderSummaryList - Sorted sessions, count:", sortedSessions.length);
        renderList(
            domElements.summaryListUl, 
            domElements.emptySummaryListMsg, 
            sortedSessions as ListItemData[], // Cast if renderList is more generic
            'summary', 
            onSummaryClick as (item: ListItemData) => void // Cast
        );
      
    },
    renderAvailableGroupsList: (groupsArray: Group[], onGroupClick: (groupOrId: Group | string) => void) => {
        console.log("LR_DEBUG: renderAvailableGroupsList called with groups count:", groupsArray?.length || 0);
        const { domElements } = getDeps();
    
        if (!domElements?.availableGroupsUl || !domElements.groupsEmptyPlaceholder) {
            console.error("LR_ERROR: Critical elements for rendering groups (availableGroupsUl or groupsEmptyPlaceholder) are missing.");
            return;
        }
    
        const validGroups = Array.isArray(groupsArray) ? groupsArray : [];
        const placeholder = domElements.groupsEmptyPlaceholder;
        const listElement = domElements.availableGroupsUl;
    
        // --- FIX: Clear and explicit empty-state logic at the top ---
        if (validGroups.length === 0) {
            console.log("LR_DEBUG: No groups to render. Activating empty state placeholder.");
            
            // 1. Clear any old list items from a previous render.
            listElement.innerHTML = "";
            
            // 2. Populate the placeholder with the correct "no groups joined" message.
            placeholder.innerHTML = `
                <i class="fas fa-users placeholder-icon"></i>
                <h3>No Groups Joined</h3>
                <p>You haven't joined any groups yet. Check out the "Discover" tab to find one that interests you!</p>
                <button id="empty-groups-discover-btn" class="placeholder-action-btn">
                    <i class="fas fa-compass"></i>
                    Discover Groups
                </button>
            `;
    
            // 3. Make the placeholder visible by adding the '.visible' class.
            placeholder.classList.add('visible');
    
            // 4. Add the event listener for the "Discover Groups" button.
            const discoverBtn = placeholder.querySelector('#empty-groups-discover-btn');
            if (discoverBtn) {
                discoverBtn.addEventListener('click', () => {
                    document.getElementById('discover-groups-tab-btn')?.click();
                }, { once: true });
            }
            
            // 5. Exit the function. We are done.
            return;
        }
    
        // --- If we have groups to display ---
        console.log("LR_DEBUG: Groups found. Hiding placeholder and rendering list.");
        
        // 1. Make sure the placeholder is hidden.
        placeholder.classList.remove('visible');
    
        // 2. Sort the groups and call the generic `renderList` function to build the <li> items.
        const sortedGroups = [...validGroups].sort((a,b) => (a?.name || "").localeCompare(b?.name || ""));
        
        renderList(
            listElement,
            null, // Pass null because this function now handles the main placeholder.
            sortedGroups as ListItemData[],
            'groupDiscovery', 
            onGroupClick as (item: ListItemData) => void
        );
    },



    renderGroupMembersList: renderGroupMembersListInternal // <<< ENSURE THIS LINE IS PRESENT AND CORRECT
                
            };
        })(); // End of IIFE

        if (window.listRenderer && typeof window.listRenderer.renderActiveChatList === 'function') {
            console.log("list_renderer.ts: SUCCESSFULLY assigned to window.listRenderer.");
        } else {
            console.error("list_renderer.ts: CRITICAL ERROR - assignment FAILED or method missing.");
        }
        
        document.dispatchEvent(new CustomEvent('listRendererReady'));
        console.log('list_renderer.ts: "listRendererReady" event dispatched (after full init).');

} // End of initializeActualListRenderer
const depsForListRenderer = ['domElementsReady', 'polyglotHelpersReady', 'activityManagerReady', 'flagLoaderReady', 'polyglotDataReady'];
let listRendererDepsMet = 0;

function checkAndInitListRenderer() {
    listRendererDepsMet++;
    if (listRendererDepsMet === depsForListRenderer.length) {
        console.log('list_renderer.ts: All dependencies met. Initializing actual ListRenderer.');
        initializeActualListRenderer();
        depsForListRenderer.forEach(eventName => document.removeEventListener(eventName, checkAndInitListRenderer));
    }
}

if (window.domElements && window.polyglotHelpers && window.activityManager && window.flagLoader && window.polyglotConnectors && window.polyglotFilterLanguages) {
    console.log('list_renderer.ts: Core dependencies already available. Initializing directly.');
    initializeActualListRenderer();
} else {
    console.log('list_renderer.ts: Waiting for dependency events:', depsForListRenderer);
    depsForListRenderer.forEach(eventName => {
        let alreadySet = false;
        if (eventName === 'domElementsReady' && window.domElements) alreadySet = true;
        else if (eventName === 'polyglotHelpersReady' && window.polyglotHelpers) alreadySet = true;
        else if (eventName === 'activityManagerReady' && window.activityManager) alreadySet = true;
        else if (eventName === 'flagLoaderReady' && window.flagLoader) alreadySet = true;
   
        else if (eventName === 'polyglotDataReady' && window.polyglotConnectors && window.polyglotFilterLanguages) alreadySet = true;


        if (alreadySet) {
            console.log(`list_renderer.ts: Dependency for '${eventName}' already met.`);
            checkAndInitListRenderer();
        } else {
            document.addEventListener(eventName, checkAndInitListRenderer, { once: true });
        }
    });
}
