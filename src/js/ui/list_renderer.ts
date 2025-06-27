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
    ActiveGroupListItem, // <<< ADD THIS IMPORT
    PolyglotHelpersOnWindow
} from '../types/global.d.ts'; 
import { auth } from '../firebase-config'; // <<< ADD THIS LINE
import { flagLoader } from '../utils/flagcdn.js';
import { polyglotHelpers } from '../utils/helpers.js';
console.log('list_renderer.ts: Script loaded, waiting for core dependencies.');
interface ListRendererModule {
    initialize: (deps: { // <<< MODIFIED: initialize now takes a deps object
        domElements: YourDomElements,
        polyglotHelpers: PolyglotHelpersOnWindow, // Ensure this type is imported/defined
        activityManager: ActivityManager,       // Ensure this type is imported/defined
        flagLoader: FlagLoader                 // Ensure this type is imported/defined
    }) => void;
    renderActiveChatList: (chats: CombinedChatItem[], clickCallback: (itemData: CombinedChatItem) => void) => void;
    renderSummaryList: (sessions: Array<Partial<SessionData> & { connectorId?: string }>, itemClickCallback: (sessionDataOrId: SessionData | string) => void) => void;
    renderAvailableGroupsList: (groupsArray: Group[], onGroupClick: (groupOrId: Group | string) => void) => void;
    renderGroupMembersList: (
        members: Connector[],
        tutorId: string | null | undefined, // <<< CORRECTED: Allow undefined
        onMemberClick: (connector: Connector) => void,
        listUlElement: HTMLUListElement | null,
        searchFilter?: string
    ) => void;
    renderConnectorCards: ( // Assuming this was also part of your module
        connectorsToDisplay: Connector[],
        filterContext: 'my-friends' | 'discover',
        callbacks: {
            onMessageClick: (connector: Connector) => void,
            onCallClick: (connector: Connector) => void,
            onCardClick: (connector: Connector) => void
        }
    ) => void;
}

// Assign a structural placeholder
window.listRenderer = {
    initialize: () => console.warn("LR placeholder: initialize() called."), // <<< ADDED
    renderActiveChatList: () => console.warn("LR placeholder: renderActiveChatList called."),
    renderSummaryList: () => console.warn("LR placeholder: renderSummaryList called."),
    renderAvailableGroupsList: () => console.warn("LR placeholder: renderAvailableGroupsList called."),
    renderGroupMembersList: (members, tutorId, onMemberClick, listUlElement, searchFilter) => { // <<< Matched signature
        console.error("LR placeholder: renderGroupMembersList called.", { members, tutorId, searchFilter });
    },
    renderConnectorCards: (connectorsToDisplay, filterContext, callbacks) => { // <<< ADDED
        console.warn("LR placeholder: renderConnectorCards called.", { connectorsToDisplay, filterContext });
    }
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
    const actualDependencies = {
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        activityManager: window.activityManager,
        flagLoader: window.flagLoader
    };
    if (!allDepsMet) { // 'allDepsMet' should be defined by your dependency checking logic
        console.error("list_renderer.ts: CRITICAL - Functional dependencies not ready. Halting ListRenderer setup.");
        // Dummy implementation for window.listRenderer
        window.listRenderer = {
            initialize: (deps) => console.error("LR dummy: initialize called on uninitialized module with deps:", deps),
            renderActiveChatList: () => console.error("LR dummy: renderActiveChatList called on uninitialized module."),
            renderSummaryList: () => console.error("LR dummy: renderSummaryList called on uninitialized module."),
            renderAvailableGroupsList: () => console.error("LR dummy: renderAvailableGroupsList called on uninitialized module."),
            renderGroupMembersList: (members, tutorId, onMemberClick, listUlElement, searchFilter) => {
                console.error("LR dummy: renderGroupMembersList called on uninitialized module.");
            },
            renderConnectorCards: (connectorsToDisplay, filterContext, callbacks) => {
                console.error("LR dummy: renderConnectorCards called on uninitialized module.");
            }
        } as ListRendererModule;
        document.dispatchEvent(new CustomEvent('listRendererReady'));
        console.warn('list_renderer.ts: "listRendererReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('list_renderer.ts: Core functional dependencies appear ready for IIFE. Details:', depsCheck);

    window.listRenderer = ((): ListRendererModule => {
        'use strict';
 // Declare module-scoped variables to hold dependencies
 let _domElements: YourDomElements;
 let _polyglotHelpers: PolyglotHelpersOnWindow;
 let _activityManager: ActivityManager;
 let _flagLoader: FlagLoader;

 // The initialize method will receive and store the dependencies
 const initialize = (deps: {
     domElements: YourDomElements,
     polyglotHelpers: PolyglotHelpersOnWindow,
     activityManager: ActivityManager,
     flagLoader: FlagLoader
     
 }): void => {
     console.log("ListRenderer Service: Initializing with dependencies:", deps);
     _domElements = deps.domElements;
     _polyglotHelpers = deps.polyglotHelpers;
     _activityManager = deps.activityManager;
     _flagLoader = deps.flagLoader;
     // Any other setup logic that depends on these
 };

 // Helper to access scoped dependencies (optional, but can be cleaner)
 const getScopedDeps = () => {
     if (!_domElements || !_polyglotHelpers /* || other checks */) {
         // This state should ideally not be reached if initialize is called correctly.
         console.error("ListRenderer: Attempted to use dependencies before they were initialized!");
         // Fallback to window, though this indicates a logic flaw if hit post-initialize
         return {
             domElements: window.domElements,
             polyglotHelpers: window.polyglotHelpers,
             activityManager: window.activityManager,
             flagLoader: window.flagLoader
         };
     }
     return {
         domElements: _domElements,
         polyglotHelpers: _polyglotHelpers,
         activityManager: _activityManager,
         flagLoader: _flagLoader
     };
 };
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

                       // in list_renderer.
                       let plainPreview = "No messages yet.";
                       let speakerPrefix = "";
                       const user = auth.currentUser; // For checking if "You:" prefix is needed

                       if (groupItem.messages && groupItem.messages.length > 0 && groupItem.messages[0]) {
                           const lastMessage = groupItem.messages[0]; // GDM now ensures this is the one to use
                           
                           console.log(`[LR_Sidebar_Debug] Group: ${groupItem.name}, LastMsg from GDM:`, JSON.parse(JSON.stringify(lastMessage)));

                           plainPreview = lastMessage.text || "No text content"; // Fallback for empty text

                           if (lastMessage.speakerId && user && lastMessage.speakerId === user.uid && lastMessage.type !== 'system_event') {
                               speakerPrefix = "You: ";
                           } else if (lastMessage.speakerName && lastMessage.speakerName !== "System" && lastMessage.type !== 'system_event') {
                               // Only add speaker name prefix if it's not "You" and not a system message
                               // And if plainPreview doesn't already start with the speaker's name (e.g. from AI formatting)
                               const nameForPrefix = lastMessage.speakerName.split(' ')[0]; // Just first name
                               if (!plainPreview.toLowerCase().startsWith(nameForPrefix.toLowerCase() + ":")) {
                                    // speakerPrefix = `${nameForPrefix}: `; // We might not need this prefix if GDM gives full text
                               }
                           }
                            // If GDM's finalPreviewMessage.text ALREADY contains "You: " or "Speaker: ", then speakerPrefix should be empty.
                           // The GDM logic for finalPreviewMessage should ideally handle the prefixing.
                           // Here, we just ensure the text is displayed.
                           // If GDM's `finalPreviewMessage.text` already includes prefixes, then `speakerPrefix` might not be needed.
                           // Let's assume GDM provides the fully prefixed text in `lastMessage.text` for now.
                       } else {
                           console.log(`[LR_Sidebar_Debug] Group: ${groupItem.name}, No valid messages array or first message found in groupItem.messages.`);
                       }

                       // Combine prefix and preview, then truncate
                       let fullPreviewText = plainPreview; // speakerPrefix + plainPreview;
                       fullPreviewText = fullPreviewText.length > 25 ? `${fullPreviewText.substring(0, 22)}...` : fullPreviewText;
                       
                       subTextOutput = `<span class="list-item-subtext-preview">${polyglotHelpers.sanitizeTextForDisplay(fullPreviewText)}</span>`;
                       
                       if (groupItem.lastActivity) {
                           const formattedTime = polyglotHelpers.formatRelativeTimestamp(groupItem.lastActivity);
                           if (formattedTime) {
                               subTextOutput += ` <span class="list-item-timestamp">${formattedTime}</span>`;
                           }
                       }
                       console.log(`[LR_Sidebar_Debug] Group: ${groupItem.name}, Final subTextOutput: ${subTextOutput}`);

                   } else {// --- 1-ON-1 CHAT ITEM (Active List in Sidebar) ---
                        const oneOnOneItem = itemData as ActiveOneOnOneChatItem;
                        const connector = oneOnOneItem.connector;

    // --- START: ADD THESE LOGS ---
    console.log(`LR_CREATE_HTML: Rendering 1-on-1 chat for ${connector?.id}.`);
    console.log(`LR_CREATE_HTML: Last Activity Timestamp from data:`, oneOnOneItem.lastActivity);
    const lastMsgForLog = oneOnOneItem.messages && oneOnOneItem.messages.length > 0
        ? oneOnOneItem.messages[oneOnOneItem.messages.length - 1]
        : null;
    console.log(`LR_CREATE_HTML: Last Message from data:`, JSON.parse(JSON.stringify(lastMsgForLog || {})));
    // --- END: ADD THESE LOGS ---
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
                        const user = auth.currentUser;
                        
                        // 1. Prioritize optimistic lastMessagePreview (if you implement it for user-sent messages)
                        if (oneOnOneItem.lastMessagePreview) {
                            plainPreview = oneOnOneItem.lastMessagePreview;
                        }
                        // 2. Use the lastMessage object from the parent ConversationDocument summary
                        else if (oneOnOneItem.lastMessage) { // Simplified check: just see if the object exists
                            const lastMsg = oneOnOneItem.lastMessage;
                            // Use a fallback of empty string '' if lastMsg.text is null
                            const messageText = lastMsg.text || ''; 
                        
                            if (user && lastMsg.senderId === user.uid) {
                                plainPreview = `You: ${messageText}`;
                            } else if (lastMsg.senderId === "system") {
                                plainPreview = `[${messageText}]`;
                            } else {
                                // THIS IS THE FIX: We are now assigning `messageText`, which is guaranteed to be a string.
                                plainPreview = messageText;
                            }
                        }
                        // 3. Fallback (LESS IDEAL FOR LIST PREVIEWS - should be rare if lastMessage is reliable)
                        else if (oneOnOneItem.messages && oneOnOneItem.messages.length > 0) {
                            console.log(`LR_CREATE_HTML: Last Message from data:`, (lastMsgForLog || {})); // Logs the object directly
                            const lastMsgFromArray = oneOnOneItem.messages[oneOnOneItem.messages.length - 1];
                            if (lastMsgFromArray) {
                                plainPreview = lastMsgFromArray.sender?.startsWith('user') ? `You: ${lastMsgFromArray.text || ''}` : (lastMsgFromArray.text || '');
                            }
                        }
                        
                        // Truncate the final result for display
                        plainPreview = plainPreview.length > 25 ? `${plainPreview.substring(0, 22)}...` : plainPreview;
                        subTextOutput = `<span class="list-item-subtext-preview">${polyglotHelpers.sanitizeTextForDisplay(plainPreview)}</span>`;
                        // --- END OF FIX ---
                        
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
    const oldChildrenCountLR = ulElement.children.length; // <<< ADD 
    
    while (ulElement.firstChild) {
        ulElement.removeChild(ulElement.firstChild);
    }
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
    tutorId: string | null | undefined, // <<< CORRECTED: Matches ListRendererModule
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

 // ADD DUMMY/PLACEHOLDER IMPLEMENTATIONS FOR THE MISSING METHODS
        // WITHIN THE SCOPE OF THE IIFE, BEFORE THE RETURN STATEMENT.
        const initializeActual = (deps: { /* Define actual deps based on your ListRendererModule */
            domElements: YourDomElements,
            polyglotHelpers: PolyglotHelpersOnWindow,
            activityManager: ActivityManager,
            flagLoader: FlagLoader
        }) => {
            console.log("ListRenderer: Actual initialize function called with deps:", deps);
            // Assign dependencies to be used by other methods within this IIFE
            _domElements = deps.domElements;
          
            _activityManager = deps.activityManager;
          
            // Your actual initialization logic here
        };

        const renderConnectorCardsActual = (
            connectorsToDisplay: Connector[],
            filterContext: 'my-friends' | 'discover',
            callbacks: {
                onMessageClick: (connector: Connector) => void,
                onCallClick: (connector: Connector) => void,
                onCardClick: (connector: Connector) => void
            }
        ) => {
            console.log("ListRenderer: Actual renderConnectorCards function called.", { connectorsToDisplay, filterContext });
            // Your actual logic for rendering connector cards
            // For example:
            // const { domElements: currentDomElements } = getDeps();
            // if (currentDomElements?.connectorHubGrid) {
            //     currentDomElements.connectorHubGrid.innerHTML = `<p>Rendering ${connectorsToDisplay.length} connector cards.</p>`;
            // }
        };


        console.log("ui/list_renderer.ts: IIFE finished.");
        return {
            initialize,
            renderConnectorCards: function (connectorsToDisplay: Connector[], filterContext: 'my-friends' | 'discover', callbacks: {
                onMessageClick: (connector: Connector) => void;
                onCallClick: (connector: Connector) => void;
                onCardClick: (connector: Connector) => void;
            }): void {
                throw new Error('Function not implemented.');
            },
            renderActiveChatList: (
                combinedChatsArray: CombinedChatItem[], 
                onCombinedItemClick: (itemData: CombinedChatItem) => void
            ) => {
                // This is the logic from my previous answer, now in the correct place.
                const { domElements } = getDeps();
                const ulElement = domElements.chatListUl;
                const emptyMsgElement = domElements.emptyChatListMsg;
            
                if (!ulElement || !emptyMsgElement) {
                    console.error("LR: Cannot render active chat list, ulElement or emptyMsgElement is missing.");
                    return;
                }
            
                // First, clear any previous list items.
                ulElement.innerHTML = '';
                
                // Check if the final list of chats is empty.
                if (!combinedChatsArray || combinedChatsArray.length === 0) {
                    // Data has been fetched, and it's confirmed to be empty.
                    emptyMsgElement.innerHTML = 'No active chats.'; // No spinner
                    emptyMsgElement.style.display = 'block';
                } else {
                    // Data has been fetched, and there are chats to show.
                    emptyMsgElement.style.display = 'none';
            
                    const fragment = document.createDocumentFragment();
                    
                    // Loop directly over the CombinedChatItem array. NO CASTING NEEDED.
                    combinedChatsArray.forEach(item => {
                        const li = document.createElement('li');
            
                        // createListItemHTML is flexible enough to handle this `item`
                        li.innerHTML = createListItemHTML(item, 'activeChat');
            
                        const clickableItem = li.firstElementChild as HTMLElement;
                        if (clickableItem && !clickableItem.classList.contains('error-item')) {
                            // The click handler also expects a `CombinedChatItem`, so the types match perfectly.
                            clickableItem.addEventListener('click', () => {
                                onCombinedItemClick(item);
                            });
                        }
                        fragment.appendChild(li);
                    });
                    ulElement.appendChild(fragment);
                }
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
