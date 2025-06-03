// js/ui/list_renderer.js

window.listRenderer = (() => {
    const getDeps = () => ({
        domElements: window.domElements,
        polyglotHelpers: window.polyglotHelpers,
        activityManager: window.activityManager,
        flagLoader: window.flagLoader,
        viewManager: window.viewManager
    });

    function createListItemHTML(itemData, itemTypeContext) {
        const { polyglotHelpers, activityManager, flagLoader } = getDeps();
        if (!itemData || !polyglotHelpers || !activityManager || !flagLoader) {
            console.warn(`createListItemHTML: Missing itemData or dependencies for context '${itemTypeContext}'. Data:`, itemData);
            return '<div class="list-item-base error-item">Error rendering item (missing deps or data)</div>';
        }

        let name, avatarHtml = '', statusOrActionHtml = '';
        let itemClass = 'list-item-base';
        let dataIdAttr = '';
        let subTextOutput = '';

        try {
            if (itemTypeContext === 'activeChat' && itemData.isGroup) {
                name = itemData.name || "Unnamed Group";
                avatarHtml = `<div class="list-item-avatar group-avatar-icon"><i class="fas fa-users"></i></div>`;
                const lastMsg = itemData.messages?.[0]; // We expect messages to be an array with one item
                let plainPreview = "";
                if (lastMsg && typeof lastMsg.text === 'string' && typeof lastMsg.speakerName === 'string') {
                    let speakerNameForDisplay = lastMsg.speakerName || "System"; // Default if speakerName is empty
                    if (lastMsg.speakerId === "user_player") speakerNameForDisplay = "You";

                    let textPreview = lastMsg.text;
                    plainPreview = `${speakerNameForDisplay}: ${textPreview}`;
                    plainPreview = plainPreview.length > 25 ? `${plainPreview.substring(0, 22)}...` : plainPreview;
                } else {
                    plainPreview = "No messages yet in group.";
                    console.warn("ListRenderer: Group item has no lastMsg or invalid lastMsg structure:", itemData);
                }

                if (itemData.lastActivity) {
                    subTextOutput = `<span class="list-item-subtext-preview">${polyglotHelpers.sanitizeTextForDisplay(plainPreview)}</span> <span class="list-item-timestamp">${polyglotHelpers.formatRelativeTimestamp(itemData.lastActivity)}</span>`;
                } else {
                    subTextOutput = polyglotHelpers.sanitizeTextForDisplay(plainPreview);
                }
                itemClass = 'chat-list-item group-chat-list-item';
                if (itemData.id) dataIdAttr = `data-group-id="${polyglotHelpers.sanitizeTextForDisplay(itemData.id)}"`;


            } else if (itemTypeContext === 'activeChat' && !itemData.isGroup) {
                const connector = itemData.connector || itemData;
                if (!connector || !connector.id) {
                     console.warn(`createListItemHTML: 1-on-1 activeChat item missing connector or connector.id. Data:`, itemData);
                     return '<div class="list-item-base error-item">Error: Chat item data invalid</div>';
                }
                name = connector.profileName || connector.name || "Unknown Contact";
                // CORRECTED PATH: connector.avatarModern is already relative to root.
                // Fallback also relative to root.
                avatarHtml = `<img src="${connector.avatarModern || 'images/placeholder_avatar.png'}" alt="${polyglotHelpers.sanitizeTextForDisplay(name)}" class="list-item-avatar" onerror="this.src='images/placeholder_avatar.png'">`;
                const lastMsg = itemData.messages?.[itemData.messages.length - 1];
                let plainPreview = "";
                if (lastMsg) {
                    let textPreview = lastMsg.text || "[Media message]";
                    plainPreview = lastMsg.sender?.startsWith('user') ? `You: ${textPreview}` : textPreview;
                    plainPreview = plainPreview.length > 25 ? `${plainPreview.substring(0, 22)}...` : plainPreview;
                } else {
                    plainPreview = 'No messages yet';
                }

                if (itemData.lastActivity) {
                    subTextOutput = `<span class="list-item-subtext-preview">${polyglotHelpers.sanitizeTextForDisplay(plainPreview)}</span> <span class="list-item-timestamp">${polyglotHelpers.formatRelativeTimestamp(itemData.lastActivity)}</span>`;
                } else {
                    subTextOutput = polyglotHelpers.sanitizeTextForDisplay(plainPreview);
                }
                const isActive = activityManager.isConnectorActive(connector);
                statusOrActionHtml = `<span class="chat-list-item-status ${isActive ? 'active' : ''}" title="${isActive ? 'Active' : 'Inactive'}"></span>`;
                itemClass = 'chat-list-item';
                dataIdAttr = `data-connector-id="${polyglotHelpers.sanitizeTextForDisplay(connector.id)}"`;

            } else if (itemTypeContext === 'summary') {
                name = itemData.connectorName || "Session";

                let connectorAvatar = 'images/placeholder_avatar.png'; // Default
                // Logic to fetch connector avatar using connectorId
                if (itemData.connectorId && window.polyglotConnectors) {
                    const connector = window.polyglotConnectors.find(c => c.id === itemData.connectorId);
                    if (connector && connector.avatarModern) {
                        connectorAvatar = connector.avatarModern; // Use modern avatar path
                    } else if (connector) {
                        console.warn(`ListRenderer: Connector ${itemData.connectorId} found but missing avatarModern.`);
                    } else {
                        console.warn(`ListRenderer: Connector not found for ID ${itemData.connectorId} in summary list.`);
                    }
                } else if (!itemData.connectorId) {
                    console.warn("ListRenderer: itemData for summary missing connectorId.");
                }

                avatarHtml = `<img src="${connectorAvatar}" alt="${polyglotHelpers.sanitizeTextForDisplay(name)}" class="list-item-avatar" onerror="this.src='images/placeholder_avatar.png'">`;
                let summaryDetails = `Date: ${itemData.date || 'N/A'}`;
                if (itemData.duration) summaryDetails += `, ${itemData.duration}`;
                subTextOutput = polyglotHelpers.sanitizeTextForDisplay(summaryDetails.substring(0, 40) + (summaryDetails.length > 40 ? '...' : ''));
                itemClass = 'summary-list-item';
                if (itemData.sessionId) dataIdAttr = `data-session-id="${polyglotHelpers.sanitizeTextForDisplay(itemData.sessionId)}"`;


            } else if (itemTypeContext === 'groupDiscovery') {
                // ... (paths here 'images/groups/...' and 'images/placeholder_group_avatar.png' need to be correct) ...
                // ... (flagLoader.getFlagUrl() relies on flagcdn.js and 'images/flags/unknown.png') ...
                name = itemData.name || "Unnamed Group";
                if (itemData.groupPhotoUrl) { // e.g., "images/groups/french_club.png"
                    avatarHtml = `<img src="${polyglotHelpers.sanitizeTextForDisplay(itemData.groupPhotoUrl)}" alt="${polyglotHelpers.sanitizeTextForDisplay(name)}" class="list-item-avatar group-photo large-group-photo" onerror="this.src='images/placeholder_group_avatar.png'">`;
                } else if (itemData.language) {
                    const langDef = (window.polyglotFilterLanguages || []).find(l => l.name === itemData.language || l.value === itemData.language);
                    const flagCodeToUse = langDef?.flagCode || itemData.language.substring(0, 2).toLowerCase() || 'xx';
                    if (flagCodeToUse !== 'xx') {
                        // flagLoader.getFlagUrl('globe') should use FALLBACK_FLAG_URL from flagcdn.js which is 'images/flags/unknown.png'
                        avatarHtml = `<img src="${flagLoader.getFlagUrl(flagCodeToUse)}" alt="${polyglotHelpers.sanitizeTextForDisplay(itemData.language)} flag" class="lang-flag lang-flag-lg" onerror="this.src='${flagLoader.getFlagUrl('globe')}'">`;
                    } else {
                        avatarHtml = `<div class="list-item-avatar group-avatar-icon large-group-icon"><i class="fas fa-users"></i></div>`;
                    }
                } else {
                    avatarHtml = `<div class="list-item-avatar group-avatar-icon large-group-icon"><i class="fas fa-users"></i></div>`;
                }

                let plainDescription = `${itemData.language || 'N/A'} - ${itemData.description ? itemData.description.substring(0, 70) + (itemData.description.length > 70 ? '...' : '') : 'Chat about various topics!'}`;
                subTextOutput = polyglotHelpers.sanitizeTextForDisplay(plainDescription);
                itemClass = 'group-discovery-list-item';
                if (itemData.id) dataIdAttr = `data-group-id="${polyglotHelpers.sanitizeTextForDisplay(itemData.id)}"`;

                if (itemData.isJoined) {
                    statusOrActionHtml = `<button class="view-group-chat-btn-list action-btn-sm secondary-btn" data-group-id="${polyglotHelpers.sanitizeTextForDisplay(itemData.id)}"><i class="fas fa-comment-dots"></i> View Chat</button>`;
                } else {
                    statusOrActionHtml = `<button class="join-group-btn-list action-btn-sm primary-btn" data-group-id="${polyglotHelpers.sanitizeTextForDisplay(itemData.id)}"><i class="fas fa-plus-circle"></i> Join Group</button>`;
                }

            } else {
                 console.warn(`createListItemHTML: Unknown itemTypeContext: '${itemTypeContext}'. Data:`, itemData);
                return `<div class="list-item-base error-item">Unknown item type: ${polyglotHelpers.sanitizeTextForDisplay(String(itemTypeContext))}</div>`;
            }
        } catch (error) {
            console.error(`createListItemHTML: Error during HTML creation for context '${itemTypeContext}', item:`, itemData, error);
            return `<div class="list-item-base error-item">Render error: ${polyglotHelpers.sanitizeTextForDisplay(error.message)}</div>`;
        }

        return `
            <div class="${itemClass}" ${dataIdAttr}>
                ${avatarHtml}
                <div class="list-item-info">
                    <span class="list-item-name">${polyglotHelpers.sanitizeTextForDisplay(name)}</span>
                    ${subTextOutput ? `<span class="list-item-subtext">${subTextOutput}</span>` : ''}
                </div>
                ${statusOrActionHtml}
            </div>`;
    }

    // ... (rest of renderList and public methods remain the same as the previous version you approved)
    function renderList(ulElement, emptyMsgElement, items, itemTypeContext, itemClickHandler) {
        const { viewManager } = getDeps();
        if (!ulElement) {
            console.warn(`ListRenderer: renderList - UL element not found for context: ${itemTypeContext}`);
            return;
        }
        if ((itemTypeContext === 'activeChat' || itemTypeContext === 'summary' || itemTypeContext === 'groupDiscovery') && typeof itemClickHandler !== 'function') {
            console.error(`ListRenderer: itemClickHandler is NOT a function for context '${itemTypeContext}'. Items will not be clickable.`);
        }

        ulElement.innerHTML = ''; 

        if (!items || items.length === 0) {
            if (emptyMsgElement) emptyMsgElement.style.display = 'block';
            if (viewManager?.updateEmptyListMessages) viewManager.updateEmptyListMessages();
            return;
        }
        if (emptyMsgElement) emptyMsgElement.style.display = 'none';

        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            if (!item) {
                console.warn("ListRenderer: renderList - Skipping null/undefined item in items array for context:", itemTypeContext);
                return;
            }
            const li = document.createElement('li');
            li.innerHTML = createListItemHTML(item, itemTypeContext);

            const clickableItemContainer = li.firstElementChild;

            if (clickableItemContainer && clickableItemContainer.nodeType === Node.ELEMENT_NODE && !clickableItemContainer.classList.contains('error-item')) {
                if (itemTypeContext === 'groupDiscovery') {
                    const actionButton = clickableItemContainer.querySelector('.join-group-btn-list, .view-group-chat-btn-list');
                    if (actionButton) {
                        actionButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (typeof itemClickHandler === 'function') {
                                itemClickHandler(item);
                            } else {
                                console.error("ListRenderer: itemClickHandler is not a function for groupDiscovery button.");
                            }
                        });
                    } else {
                        clickableItemContainer.addEventListener('click', () => {
                            if (typeof itemClickHandler === 'function') {
                                itemClickHandler(item);
                            }
                        });
                    }
                } else { 
                    clickableItemContainer.addEventListener('click', () => {
                        if (typeof itemClickHandler === 'function') {
                            itemClickHandler(item);
                        } else {
                            console.error(`ListRenderer: itemClickHandler is NOT a function during click for context '${itemTypeContext}'.`);
                        }
                    });
                }
            } else if (clickableItemContainer && clickableItemContainer.classList.contains('error-item')) {
                // console.warn("ListRenderer: Skipping event listener for an error item in context:", itemTypeContext, "Original item data:", item);
            } else {
                // console.warn("ListRenderer: Could not find valid clickable div container for item in context:", itemTypeContext, "Item data:", item, "HTML:", li.innerHTML);
            }
            fragment.appendChild(li);
        });
        ulElement.appendChild(fragment);

        if (viewManager?.updateEmptyListMessages) viewManager.updateEmptyListMessages();
    }

    return {
        renderActiveChatList: (combinedChatsArray, onCombinedItemClick) => {
            const { domElements } = getDeps();
            if (typeof onCombinedItemClick !== 'function') {
                console.error("ListRenderer (renderActiveChatList): onCombinedItemClick is not a function! Chat items will not be clickable.");
            }
            renderList(domElements?.chatListUl, domElements?.emptyChatListMsg, combinedChatsArray, 'activeChat', onCombinedItemClick);
        },
        renderSummaryList: (sessionsArray, onSummaryClick) => {
            const { domElements } = getDeps();
             if (typeof onSummaryClick !== 'function') {
                console.error("ListRenderer (renderSummaryList): onSummaryClick is not a function! Summary items will not be clickable.");
            }
            const validSessionsArray = Array.isArray(sessionsArray) ? sessionsArray : [];
            const sortedSessions = [...validSessionsArray].sort((a, b) => {
                const timeA = a?.rawTranscript?.[0] ? new Date(a.rawTranscript[0].timestamp).getTime() : 0;
                const timeB = b?.rawTranscript?.[0] ? new Date(b.rawTranscript[0].timestamp).getTime() : 0;
                const dateAValid = a && a.date && !isNaN(new Date(a.date));
                const dateBValid = b && b.date && !isNaN(new Date(b.date));
                const dateA = (dateAValid ? new Date(a.date) : new Date("1970-01-01")).setHours(0, 0, 0, 0) + timeA;
                const dateB = (dateBValid ? new Date(b.date) : new Date("1970-01-01")).setHours(0, 0, 0, 0) + timeB;
                return dateB - dateA;
            });
            renderList(domElements?.summaryListUl, domElements?.emptySummaryListMsg, sortedSessions, 'summary', onSummaryClick);
        },
        renderAvailableGroupsList: (groupsArray, onGroupClick) => {
            const { domElements } = getDeps();
            if (typeof onGroupClick !== 'function') {
                console.error("ListRenderer (renderAvailableGroupsList): onGroupClick is not a function! Group items/buttons will not be clickable.");
            }
            const validGroupsArray = Array.isArray(groupsArray) ? groupsArray : [];
            const sortedGroups = [...validGroupsArray].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
            renderList(domElements?.availableGroupsUl, domElements?.groupLoadingMessage, sortedGroups, 'groupDiscovery', onGroupClick);
        }
    };
})();