// D:\polyglot_connect\src\js\handlers\reaction_handler.ts

// At the top of the file
// At the top of the file
import type {
    YourDomElements,
    ConversationManager,
    AiTranslationServiceModule,
    GroupDataManager,
    MessageInStore,
    ReactionHandlerModule // <<< THIS IS THE FIX
} from '../types/global.d.ts';
// REPLACE THE OLD INTERFACE WITH THIS


console.log('reaction_handler.ts: Script loaded.');

// Create a placeholder on the window object
window.reactionHandler = {} as ReactionHandlerModule;

(function () {
    'use strict';

    // This is a self-contained helper function. No need to import it.
    const addSafeListener = (
        element: Element | Window | Document | null,
        eventType: string,
        handlerFn: EventListenerOrEventListenerObject,
        options: boolean | AddEventListenerOptions = {}
    ): void => {
        if (element && typeof handlerFn === 'function') {
            element.addEventListener(eventType, handlerFn, options);
        }
    };



       const reactionHandlerMethods = ((): ReactionHandlerModule => {
        
        // This initialize function is the main entry point for the module
        const initialize = (
            domElements: YourDomElements,
            conversationManager: ConversationManager,
            aiTranslationService: AiTranslationServiceModule,
            groupDataManager: GroupDataManager 
        ): void => {
            console.log('ReactionHandler: Initializing listeners with new mobile interaction model...');
            
            const chatLogs = [
                domElements.embeddedChatLog,
                domElements.messageChatLog,
                domElements.groupChatLogDiv
            ].filter(el => el) as HTMLElement[];

            let longPressTimer: ReturnType<typeof setTimeout> | null = null;
            let wasLongPressJustPerformed = false; // << NEW FLAG
            let activeDesktopReactionPicker: HTMLElement | null = null;
            let activeDesktopActionMenu: HTMLElement | null = null;
            let lastTapTime = 0;
            let lastTapBubble: HTMLElement | null = null;
            const DOUBLE_TAP_DELAY = 300; // Milliseconds, adjust as needed
            let wasMobileDoubleTapPerformed = false; // Flag to communicate to the click handler
            // --- Helper for ChatUiUpdater Interaction ---
            const getChatUiUpdater = (): import('../types/global.d.ts').ChatUiUpdaterModule | undefined => {
                return window.chatUiUpdater;
            };

            const requestHideUnifiedInteractionMenu = () => {
                const cuu = getChatUiUpdater(); 
                if (cuu && typeof cuu.hideUnifiedInteractionMenu === 'function') {
                    cuu.hideUnifiedInteractionMenu();
                }
            };

            // --- Data Update Function (remains crucial) ---
            const updateReactionInData = (messageWrapper: HTMLElement, newEmoji: string | null) => {
                const messageId = messageWrapper.dataset.messageId;
                const userId = 'user_player'; 

                const isGroupChat = !!messageWrapper.closest('#group-chat-log');
                console.log(`[RH_SAVE] updateReactionInData for msgId: ${messageId}. Group: ${isGroupChat}. Emoji: ${newEmoji}`);

                if (isGroupChat) {
                    const groupId = groupDataManager.getCurrentGroupId();
                    if (!groupId) {
                        console.error("[RH_SAVE_ERR] Group: No current groupId.");
                        return;
                    }
                    const groupHistory = groupDataManager.getLoadedChatHistory();
                    const messageToUpdate = groupHistory.find(msg => msg.messageId === messageId);
                    if (!messageToUpdate) {
                        console.error(`[RH_SAVE_ERR] Group: Msg ${messageId} not in history for group ${groupId}.`);
                        return;
                    }
                    messageToUpdate.reactions = messageToUpdate.reactions || {};
                    Object.keys(messageToUpdate.reactions).forEach(key => {
                        messageToUpdate.reactions![key] = messageToUpdate.reactions![key].filter(id => id !== userId);
                        if (messageToUpdate.reactions![key].length === 0) delete messageToUpdate.reactions![key];
                    });
                    if (newEmoji) {
                        messageToUpdate.reactions[newEmoji] = messageToUpdate.reactions[newEmoji] || [];
                        if (!messageToUpdate.reactions[newEmoji].includes(userId)) {
                            messageToUpdate.reactions[newEmoji].push(userId);
                        }
                    }
                    groupDataManager.saveCurrentGroupChatHistory(false); // Don't trigger sidebar list update from here
                    console.log(`[RH_SAVE_OK] Group reaction saved. Reactions:`, JSON.parse(JSON.stringify(messageToUpdate.reactions)));
                } else { // 1-on-1 Chat
                    const chatContainer = messageWrapper.closest<HTMLElement>('[data-current-connector-id]');
                    const conversationId = chatContainer?.dataset.currentConnectorId;
                    if (!messageId || !conversationId) {
                        console.error("[RH_SAVE_ERR] 1-on-1: Missing messageId or conversationId.", { messageId, conversationId });
                        return;
                    }
                    const convoRecord = conversationManager.getConversationById(conversationId);
                    if (!convoRecord?.messages) {
                        console.error(`[RH_SAVE_ERR] 1-on-1: No convo record or messages for ${conversationId}.`);
                        return;
                    }
                    const messageToUpdate = convoRecord.messages.find(msg => msg.id === messageId);
                    if (!messageToUpdate) {
                        console.error(`[RH_SAVE_ERR] 1-on-1: Msg ${messageId} not found in convo ${conversationId}.`);
                        return;
                    }
                    messageToUpdate.reactions = messageToUpdate.reactions || {};
                    Object.keys(messageToUpdate.reactions).forEach(key => {
                        messageToUpdate.reactions![key] = messageToUpdate.reactions![key].filter(id => id !== userId);
                        if (messageToUpdate.reactions![key].length === 0) delete messageToUpdate.reactions![key];
                    });
                    if (newEmoji) {
                        messageToUpdate.reactions[newEmoji] = messageToUpdate.reactions[newEmoji] || [];
                        if (!messageToUpdate.reactions[newEmoji].includes(userId)) {
                            messageToUpdate.reactions[newEmoji].push(userId);
                        }
                    }
                    window.convoStore?.updateConversationProperty(conversationId, 'messages', [...convoRecord.messages]);
                    window.convoStore?.saveAllConversationsToStorage();
                    console.log(`[RH_SAVE_OK] 1-on-1 reaction saved. Reactions:`, JSON.parse(JSON.stringify(messageToUpdate.reactions)));
                }
            };

            const closeDesktopPopups = () => {
                if (activeDesktopReactionPicker) {
                    activeDesktopReactionPicker.classList.remove('visible');
                    // Optional: Remove the picker from DOM if it was dynamically created and you don't want to keep it.
                    // if (activeDesktopReactionPicker.parentElement && activeDesktopReactionPicker.dataset.isDynamicallyCreated === 'true') {
                    //    activeDesktopReactionPicker.remove();
                    // }
                    activeDesktopReactionPicker = null;
                }
                if (activeDesktopActionMenu) {
                    activeDesktopActionMenu.classList.remove('visible');
                    // Optional: Remove the menu from DOM if dynamically created.
                    // if (activeDesktopActionMenu.parentElement && activeDesktopActionMenu.dataset.isDynamicallyCreated === 'true') {
                    //    activeDesktopActionMenu.remove();
                    // }
                    activeDesktopActionMenu = null;
                }
                // Remove trigger class from any bubble that might have had it
                document.querySelectorAll('.desktop-popup-trigger').forEach(el => el.classList.remove('desktop-popup-trigger'));
            };

            const openDesktopReactionPicker = (bubble: HTMLElement) => {
                // 1. Close any other active DESKTOP popups (either another reaction picker or an action menu).
                //    Do NOT call requestHideUnifiedInteractionMenu() here, as that's for the mobile system.
                if (activeDesktopActionMenu) { // If a desktop action menu is open, close it.
                    activeDesktopActionMenu.classList.remove('visible');
                    activeDesktopActionMenu.parentElement?.classList.remove('desktop-popup-trigger');
                    activeDesktopActionMenu = null;
                }
                if (activeDesktopReactionPicker && activeDesktopReactionPicker.parentElement !== bubble) { // If a picker on ANOTHER bubble is open
                    activeDesktopReactionPicker.classList.remove('visible');
                    activeDesktopReactionPicker.parentElement?.classList.remove('desktop-popup-trigger');
                    activeDesktopReactionPicker = null;
                }

                // 2. Find or create the .reaction-picker for THIS bubble.
                //    This uses the OLD class names ".reaction-picker" and ".reaction-btn".
                let picker = bubble.querySelector<HTMLElement>('.reaction-picker'); 
                if (!picker) { 
                    console.log("[RH_Desktop] Creating new desktop reaction picker for bubble.");
                    picker = document.createElement('div'); 
                    picker.className = 'reaction-picker'; // Your existing CSS class for the desktop hover picker
                    // picker.dataset.isDynamicallyCreated = 'true'; // Optional: if you want to remove it on close
                    ['👍', '❤️', '😂', '😯', '😢', '😡'].forEach(emoji => {
                        const button = document.createElement('button');
                        button.className = 'reaction-btn'; // Your existing CSS class for buttons in this picker
                        button.type = 'button';
                        button.setAttribute('aria-label', `React with ${emoji}`);
                        button.textContent = emoji;
                        picker!.appendChild(button); 
                    });
                    bubble.appendChild(picker); // Append to the .chat-message-ui (bubble) itself
                }

                // 3. Update selection state and show the picker.
                const wrapper = bubble.closest<HTMLElement>('.chat-message-wrapper');
                if (wrapper && picker) {
                    // Clear previous selections in THIS picker
                    picker.querySelectorAll('.reaction-btn.selected').forEach(btn => btn.classList.remove('selected'));
                    
                    // Set selected based on current wrapper data (user's reaction to this message)
                    const currentUserReaction = wrapper.dataset.userReaction;
                    if (currentUserReaction) {
                        const selectedBtn = picker.querySelector<HTMLButtonElement>(`.reaction-btn[aria-label="React with ${currentUserReaction}"]`);
                        if (selectedBtn) {
                            selectedBtn.classList.add('selected');
                        }
                    }
                    
                    picker.classList.add('visible');
                    activeDesktopReactionPicker = picker; // Set this as the currently active desktop picker
                    bubble.classList.add('desktop-popup-trigger'); // Mark the bubble
                }
            };

            const openDesktopActionMenu = (bubble: HTMLElement) => {
                requestHideUnifiedInteractionMenu(); 
                closeDesktopPopups(); 

                let menu = bubble.querySelector<HTMLElement>('.action-menu'); // OLD Desktop action menu class
                if (!menu) { 
                    menu = document.createElement('div');
                    menu.className = 'action-menu'; 
                    // menu.dataset.isDynamicallyCreated = 'true'; // Mark if you want to remove it later
                    menu.innerHTML = `
                        <button class="action-btn-item" data-action="copy" title="Copy message text"><i class="fas fa-copy"></i><span>Copy</span></button>
                        <button class="action-btn-item" data-action="translate" title="Translate message"><i class="fas fa-language"></i><span>Translate</span></button>
                    `;
                    bubble.appendChild(menu); // Append to the .chat-message-ui (bubble)
                }
                
                if (menu) {
                    menu.classList.add('visible');
                    activeDesktopActionMenu = menu;
                    bubble.classList.add('desktop-popup-trigger'); 
                }
            };


            // --- Global Document Click Listener (for closing menus/timestamps) ---



            addSafeListener(document, 'click', (e: Event) =>
                {
                const target = e.target as HTMLElement;
                const cuu = getChatUiUpdater();
                let clickedInsideMobileMenu = false;

                if (cuu && typeof cuu.isEventInsideUnifiedInteractionMenu === 'function') {
                    clickedInsideMobileMenu = cuu.isEventInsideUnifiedInteractionMenu(e);
                }

                // Close MOBILE unified menu if click is outside it and not on a bubble that might be its trigger
                if (!clickedInsideMobileMenu && !target.closest('.chat-message-ui.mobile-menu-trigger')) {
                    requestHideUnifiedInteractionMenu();
                    document.querySelectorAll('.mobile-menu-trigger').forEach(el => el.classList.remove('mobile-menu-trigger'));
                }

                // Close DESKTOP popups if click is outside them and not on their trigger bubble
                if (!target.closest('.reaction-picker') && 
                    !target.closest('.action-menu') && 
                    !target.closest('.message-reactions') && // message-reactions is part of the bubble display, not a popup itself
                    !target.closest('.chat-message-ui.desktop-popup-trigger')) {
                    closeDesktopPopups(); 
                    // desktop-popup-trigger class is removed by closeDesktopPopups
                }

                // Close temporary timestamp if click is outside any message wrapper
                const existingTempTimestamp = document.getElementById('temp-chat-timestamp');
                if (existingTempTimestamp && !target.closest('.chat-message-wrapper')) {
                    existingTempTimestamp.remove();
                }
            });

            // --- Event Listeners for each Chat Log ---
            chatLogs.forEach(log => {
               
        
        
        addSafeListener(log, 'mouseover', (e: Event) => {
            if (window.innerWidth <= 768) return; // Desktop only

            const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
            if (!bubble) return;
            
            // Don't show if a desktop action menu is already up for this bubble,
            // or if the mobile unified menu is visible.
            const cuu = getChatUiUpdater();
            if ((activeDesktopActionMenu && activeDesktopActionMenu.parentElement === bubble) || 
                (cuu?.isUnifiedInteractionMenuVisible?.())) {
                return;
            }
            openDesktopReactionPicker(bubble);
        });

        addSafeListener(log, 'mouseout', (e: Event) => {
            if (window.innerWidth <= 768) return; // Desktop only

            const mouseEvent = e as MouseEvent;
            const toElement = mouseEvent.relatedTarget as HTMLElement; // Where the mouse is going
            const fromBubble = (mouseEvent.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');

            if (fromBubble) { // If mouseout originated from within a bubble or its popups
                // Check if the mouse is moving to an element outside the current bubble AND its active popups
                const isLeavingDesktopReactionPickerZone = activeDesktopReactionPicker && 
                                                          activeDesktopReactionPicker.parentElement === fromBubble &&
                                                          (!toElement || !fromBubble.contains(toElement) && !activeDesktopReactionPicker.contains(toElement));
                
                const isLeavingDesktopActionMenuZone = activeDesktopActionMenu &&
                                                      activeDesktopActionMenu.parentElement === fromBubble &&
                                                      (!toElement || !fromBubble.contains(toElement) && !activeDesktopActionMenu.contains(toElement));

                if (isLeavingDesktopReactionPickerZone || isLeavingDesktopActionMenuZone) {
                    closeDesktopPopups();
                }
            }
        });
                // --- Mobile Long Press: Show Unified Interaction Menu ---
                              // --- Mobile Long Press: Show Unified Interaction Menu ---
                              addSafeListener(log, 'touchstart', (e: Event) => {
                                const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
                                if (!bubble || window.innerWidth > 768) return; 
                
                                wasLongPressJustPerformed = false; // Reset for new touch sequence
                                // Clear any previous timer
                                if (longPressTimer) clearTimeout(longPressTimer);
                
                                longPressTimer = setTimeout(() => {
                                    e.preventDefault(); 
                                    wasLongPressJustPerformed = true; // Set on successful long press
                                    console.log("[RH] Mobile Long Press successful.");
                
                                    closeDesktopPopups(); // Close any desktop things first
                                    const wrapper = bubble.closest<HTMLElement>('.chat-message-wrapper');
                                    const cuu = getChatUiUpdater();
                                    if (wrapper && cuu && typeof cuu.showUnifiedInteractionMenu === 'function') {
                                        const existingReaction = wrapper.dataset.userReaction;
                                        cuu.showUnifiedInteractionMenu(bubble, existingReaction);
                                        bubble.classList.add('mobile-menu-trigger'); 
                                    }
                                    longPressTimer = null; // Timer has served its purpose
                                }, 500);
                            }, { passive: false });
                
                            // Adjusted cancelLongPressTimer, it will be called by new touchend/touchmove
                            const cancelLongPressTimer = () => {
                                if (longPressTimer) {
                                    clearTimeout(longPressTimer);
                                    longPressTimer = null;
                                    // console.log("[RH] Long press timer cancelled (touch ended before 500ms or moved).");
                                }
                            };
                            
                            // --- Mobile Double Tap & Cancel Long Press on touchend ---
                            addSafeListener(log, 'touchend', (e: Event) => {
                                cancelLongPressTimer(); // Existing functionality: cancel long press if touch ends early
            
                                // <<< START NEW: Double-tap logic >>>
                                if (window.innerWidth > 768) { // Mobile only
                                    wasMobileDoubleTapPerformed = false; // Reset if somehow on desktop
                                    return;
                                }
            
                                const target = e.target as HTMLElement;
                                const bubble = target.closest<HTMLElement>('.chat-message-ui');
                                if (!bubble) {
                                    wasMobileDoubleTapPerformed = false;
                                    lastTapBubble = null; // Reset if tap is outside a bubble
                                    return;
                                }
                                
                                // If a long press was just performed, this touchend is part of that gesture.
                                // Don't treat it as a tap for double-tap purposes.
                                // wasLongPressJustPerformed will be reset by the click handler later.
                                if (wasLongPressJustPerformed) {
                                    console.log("[RH_DBLTAP] Ignoring touchend for double-tap; long press just occurred.");
                                    wasMobileDoubleTapPerformed = false; // Ensure it's false
                                    lastTapTime = 0; // Reset last tap time to prevent next tap from being double
                                    lastTapBubble = null;
                                    return;
                                }
            
                                const currentTime = Date.now();
                                const wrapper = bubble.closest<HTMLElement>('.chat-message-wrapper');
            
                                if (currentTime - lastTapTime < DOUBLE_TAP_DELAY && bubble === lastTapBubble && wrapper) {
                                    console.log("[RH_DBLTAP] Mobile Double-Tap detected on bubble:", wrapper?.dataset.messageId);
                                    e.preventDefault(); // Prevent click event from firing or doing other things like zooming
            
                                    const heartEmoji = '❤️';
                                    const currentReactionOnWrapper = wrapper.dataset.userReaction;
                                    const cuu = getChatUiUpdater(); // Ensure cuu is available
                                    let newEmojiToDisplay: string | null = heartEmoji;
            
                                    if (currentReactionOnWrapper === heartEmoji) {
                                        // Already hearted, so unheart
                                        delete wrapper.dataset.userReaction;
                                        updateReactionInData(wrapper, null);
                                        newEmojiToDisplay = null;
                                        console.log("[RH_DBLTAP] Unhearted message.");
                                    } else {
                                        // Not hearted or different reaction, so heart it
                                        wrapper.dataset.userReaction = heartEmoji;
                                        updateReactionInData(wrapper, heartEmoji);
                                        console.log("[RH_DBLTAP] Hearted message.");
                                    }
            
                                    if (cuu && typeof cuu.updateDisplayedReactionOnBubble === 'function') {
                                        cuu.updateDisplayedReactionOnBubble(wrapper, newEmojiToDisplay);
                                    }
                                    
                                    // Optionally hide unified menu if it was open
                                    // requestHideUnifiedInteractionMenu();
            
                                    // Reset tap tracking to prevent triple tap from acting as another double tap
                                    lastTapTime = 0;
                                    lastTapBubble = null;
                                    wasMobileDoubleTapPerformed = true; // Signal to click handler
                                } else {
                                    // Not a double tap (or first tap of a potential double tap)
                                    lastTapTime = currentTime;
                                    lastTapBubble = bubble;
                                    wasMobileDoubleTapPerformed = false;
                                }
                                // <<< END NEW: Double-tap logic >>>
            
                            }, { passive: false }); // passive: false because we might call e.preventDefault()
            
                            // If finger moves, cancel long press (touchmove remains separate)
                            addSafeListener(log, 'touchmove', cancelLongPressTimer); 
            
            
                          
            
                            // --- Desktop Right-Click: Show Unified Interaction Menu ---
              

                // --- Desktop Right-Click: Show Unified Interaction Menu ---
                addSafeListener(log, 'contextmenu', (e: Event) => {
                    if (window.innerWidth <= 768) return; // Desktop only
        
                    const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
                    if (bubble) {
                        e.preventDefault();
                        e.stopPropagation();
                        requestHideUnifiedInteractionMenu(); // Close mobile menu if somehow open
                        // closeDesktopPopups(); // openDesktopActionMenu will handle this
                        openDesktopActionMenu(bubble); 
                    }
                }, { capture: true });

                // --- Main Click Listener for all interactions on messages ---
                               // --- Main Click Listener for all interactions on messages ---
                               addSafeListener(log, 'click', async (e: Event) => {
                                console.log("[RH_CLICK_HANDLER] --- Click Event Start --- Target:", e.target); // <<< NEW LOG
                                const target = e.target as HTMLElement;
                                const bubble = target.closest<HTMLElement>('.chat-message-ui'); 
                                const wrapper = bubble?.closest<HTMLElement>('.chat-message-wrapper'); 
                                const cuu = getChatUiUpdater(); 
                                const isMobile = window.innerWidth <= 768; // Define isMobile here earlier
            
                                // <<< START NEW: Check if this click was part of a handled double-tap on mobile >>>
                                if (isMobile && wasMobileDoubleTapPerformed) {
                                    console.log("[RH_CLICK_HANDLER] Click corresponds to a mobile double-tap. Action already handled. Preventing further click processing.");
                                    wasMobileDoubleTapPerformed = false; // Reset flag
                                    // e.preventDefault(); // touchend should have already done this
                                    // e.stopPropagation(); // touchend should have already done this
                                    return; // Stop processing this click further
                                }
                                // <<< END NEW >>>

                                // Capture and reset the flag for *this specific click event*
                                const clickIsEndOfLongPress = wasLongPressJustPerformed;
                                if (wasLongPressJustPerformed) {
                                    wasLongPressJustPerformed = false; // Reset for the *next independent* touch/click sequence
                                }
                                console.log("[RH_CLICK_HANDLER] clickIsEndOfLongPress:", clickIsEndOfLongPress); // <<< NEW LOG
                                // --- DESKTOP INTERACTIONS (Old Picker/Menu) ---
                                // (Your existing, now functional, desktop logic for old pickers/menus from the block you sent)
                                // const isMobile = window.innerWidth <= 768; // isMobile already defined above
                                console.log("[RH_CLICK_HANDLER] Bubble:", bubble, "Wrapper:", wrapper, "isMobile:", isMobile); // <<< NEW LOG

                                if (!isMobile) {
                                    console.log("[RH_CLICK_HANDLER] Checking desktop interactions..."); // <<< NEW LOG
                                    const desktopPickerButton = target.closest<HTMLElement>('.reaction-picker .reaction-btn');
                                    if (desktopPickerButton && wrapper && activeDesktopReactionPicker && activeDesktopReactionPicker.contains(desktopPickerButton)) {
                                        console.log("[RH_CLICK_HANDLER] Desktop reaction picker button hit. Returning."); // <<< NEW LOG
                                        e.preventDefault(); e.stopPropagation();
                                        console.log("[RH] Desktop Reaction Picker button clicked.");
                                        const emoji = desktopPickerButton.textContent || '';
                                        const currentReactionOnWrapper = wrapper.dataset.userReaction;
                                        let newEmojiToDisplay: string | null = emoji;
                                        if (currentReactionOnWrapper === emoji) { delete wrapper.dataset.userReaction; updateReactionInData(wrapper, null); newEmojiToDisplay = null; } 
                                        else { wrapper.dataset.userReaction = emoji; updateReactionInData(wrapper, emoji); }
                                        let reactionsDisplayContainer = wrapper.querySelector<HTMLElement>('.message-reactions');
                                        if (!reactionsDisplayContainer) { reactionsDisplayContainer = document.createElement('div'); reactionsDisplayContainer.className = 'message-reactions'; const mUi = wrapper.querySelector('.chat-message-ui'); if (mUi) mUi.insertAdjacentElement('afterend', reactionsDisplayContainer); else wrapper.appendChild(reactionsDisplayContainer); }
                                        reactionsDisplayContainer.innerHTML = ''; 
                                        if (newEmojiToDisplay) { const rEl = document.createElement('button'); rEl.className = 'reaction-item'; rEl.type = 'button'; rEl.innerHTML = `${newEmojiToDisplay} <span class="reaction-count">1</span>`; reactionsDisplayContainer.appendChild(rEl); }
                                        closeDesktopPopups(); 
                                        return;
                                    }
                    
                                    const desktopActionButton = target.closest<HTMLElement>('.action-menu .action-btn-item');
                                    if (desktopActionButton && wrapper && activeDesktopActionMenu && activeDesktopActionMenu.contains(desktopActionButton)) {
                                        console.log("[RH_CLICK_HANDLER] Desktop action menu button hit. Returning."); // <<< NEW LOG
                                        e.preventDefault(); e.stopPropagation();
                                        const action = desktopActionButton.dataset.action;
                                        const textElement = wrapper.querySelector<HTMLElement>('.chat-message-text');
                                        console.log(`[RH] Desktop Action Menu: Action '${action}' clicked.`);
                                        if (action === 'copy' && textElement) { /* Your copy logic */ 
                                            navigator.clipboard.writeText(textElement.textContent || '');
                                            const span = desktopActionButton.querySelector('span');
                                            if(span) { const oldT = span.textContent; span.textContent = "Copied!"; setTimeout(()=> { if(span) span.textContent = oldT; }, 1500); }
                                        }




                                        else if (action === 'translate' && textElement && aiTranslationService) {
                                            console.log("[RH_TRANSLATE_DESKTOP] Desktop: Executing TRANSLATE action."); // Corrected log message
                                            const messageId = wrapper.dataset.messageId;
                                    
                                            // Determine convId (using logic from your file context)
                                            const chatLogElCtx = wrapper.closest<HTMLElement>('.chat-log-area');
                                            let convId: string | undefined;
                                            if (chatLogElCtx?.id === 'group-chat-log') {
                                                if (groupDataManager && typeof groupDataManager.getCurrentGroupId === 'function') {
                                                    const groupIdFromManager = groupDataManager.getCurrentGroupId();
                                                    convId = (groupIdFromManager === null) ? undefined : groupIdFromManager;
                                                } else {
                                                    console.warn("[RH_TRANSLATE_DESKTOP] groupDataManager or getCurrentGroupId method not available for group chat.");
                                                }
                                            } else {
                                                convId = wrapper.closest<HTMLElement>('[data-current-connector-id]')?.dataset.currentConnectorId;
                                            }
                                    
                                            if (messageId && convId) {
                                                // Get original text, store it in dataset.originalText if not already there or if not translated
                                                const originalText = wrapper.dataset.originalText || (wrapper.dataset.originalText = textElement.textContent || '');
                                                const isTranslated = wrapper.dataset.isTranslated === 'true';
                                    
                                                const buttonSpan = desktopActionButton.querySelector('span'); // Get the span for text updates
                                                const originalButtonIconHTML = desktopActionButton.querySelector('i')?.outerHTML || '<i class="fas fa-language"></i>'; // Save original icon
                                    
                                                if (isTranslated) {
                                                    textElement.textContent = originalText;
                                                    wrapper.dataset.isTranslated = 'false';
                                                    if (buttonSpan) buttonSpan.textContent = 'Translate';
                                                    // Ensure the icon is reset to language icon
                                                    desktopActionButton.innerHTML = `${originalButtonIconHTML}<span>Translate</span>`;
                                                } else {
                                                    const preTranslationButtonHTML = desktopActionButton.innerHTML; // Save state before "Translating..."
                                                    if (buttonSpan) {
                                                        desktopActionButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Translating...</span>`;
                                                    } else { // Fallback, though span should exist
                                                        desktopActionButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Translating...</span>`;
                                                    }
                                                    (desktopActionButton as HTMLButtonElement).disabled = true;
                                    
                                                    try {
                                                        const translatedText = await aiTranslationService.generateTranslation(messageId, convId);
                                                        
                                                        if (translatedText) {
                                                            textElement.textContent = translatedText;
                                                            wrapper.dataset.isTranslated = 'true';
                                                            if (buttonSpan) {
                                                                // Ensure icon is language icon for "Original" state
                                                                desktopActionButton.innerHTML = `${originalButtonIconHTML}<span>Original</span>`;
                                                            } else {
                                                                desktopActionButton.innerHTML = `${originalButtonIconHTML}<span>Original</span>`;
                                                            }
                                                        } else {
                                                            console.warn("[RH_TRANSLATE_DESKTOP] Translation returned null or empty. Reverting button.");
                                                            desktopActionButton.innerHTML = preTranslationButtonHTML; // Revert button to its state before "Translating..."
                                                        }
                                                    } catch (err) {
                                                        console.error("[RH_TRANSLATE_DESKTOP] Error during translation:", err);
                                                        desktopActionButton.innerHTML = preTranslationButtonHTML; // Revert button on error
                                                    } finally {
                                                        (desktopActionButton as HTMLButtonElement).disabled = false;
                                                    }
                                                }
                                            } else {
                                                console.warn("[RH_TRANSLATE_DESKTOP] Missing messageId or convId. Cannot translate.", { messageId, convId });
                                                // If button was changed to "Translating..." but IDs were missing, reset it
                                                const buttonSpan = desktopActionButton.querySelector('span');
                                                if (buttonSpan && buttonSpan.textContent === 'Translating...') {
                                                     const originalButtonIconHTML = desktopActionButton.querySelector('i.fa-spinner')?.previousElementSibling?.outerHTML || '<i class="fas fa-language"></i>';
                                                     desktopActionButton.innerHTML = `${originalButtonIconHTML}<span>Translate</span>`;
                                                }
                                            }
                                          }
                                        closeDesktopPopups();
                                        return;
                                    }
                                } // End if (!isMobile) for desktop specific click handling
            
                                // --- START OF MOBILE AND UNIFIED MENU CLICK LOGIC ---
                                console.log("[RH_CLICK_HANDLER] Proceeding to unified menu / mobile logic check..."); // <<< NEW LOG
                                // A.1: Click on an EMOJI inside the Unified Interaction Menu
                                
                                
                                
                                
                                           // A.1 & A.2: Handle clicks INSIDE the Unified Interaction Menu (Mobile or Desktop if unified)
                const unifiedMenuEmojiButton = target.closest<HTMLElement>('[data-unified-menu-emoji]');
                const unifiedMenuActionButton = target.closest<HTMLElement>('[data-unified-menu-action]');
                
                // Check if the click originated from within the currently active unified menu
                let eventIsInsideActiveUnifiedMenu = false;
                if (cuu && typeof cuu.isEventInsideUnifiedInteractionMenu === 'function') {
                    eventIsInsideActiveUnifiedMenu = cuu.isEventInsideUnifiedInteractionMenu(e);
                }

                if (eventIsInsideActiveUnifiedMenu) {
                    // If the click is inside the menu, get the wrapper the menu is for
                    const actualWrapperForMenu = (cuu && typeof cuu.getWrapperForActiveUnifiedMenu === 'function')
                                                  ? cuu.getWrapperForActiveUnifiedMenu()
                                                  : null;

                    if (!actualWrapperForMenu) {
                        console.error("[RH] Click inside active unified menu, but could not get its associated wrapper. Aborting menu action.");
                        requestHideUnifiedInteractionMenu(); // Hide the menu to be safe
                        return;
                    }
                    
                    // The original 'bubble' might be null if the click target was deep in the menu.
                    // We need the bubble associated with 'actualWrapperForMenu' for classList.remove
                    const bubbleForMenu = actualWrapperForMenu.querySelector<HTMLElement>('.chat-message-ui');


                    if (unifiedMenuEmojiButton) { // It's an emoji click
                        e.preventDefault(); e.stopPropagation();
                        console.log("[RH] Unified Menu Emoji clicked. Wrapper ID:", actualWrapperForMenu.dataset.messageId);
                        const emoji = unifiedMenuEmojiButton.dataset.unifiedMenuEmoji || '';
                        const currentReactionOnWrapper = actualWrapperForMenu.dataset.userReaction;
                        let newReactionForData: string | null = emoji;

                        if (currentReactionOnWrapper === emoji) { 
                            delete actualWrapperForMenu.dataset.userReaction; newReactionForData = null; 
                        } else { 
                            actualWrapperForMenu.dataset.userReaction = emoji; 
                        }
                        updateReactionInData(actualWrapperForMenu, newReactionForData);
                        if (cuu && typeof cuu.updateDisplayedReactionOnBubble === 'function') {
                            cuu.updateDisplayedReactionOnBubble(actualWrapperForMenu, newReactionForData);
                        }



                        requestHideUnifiedInteractionMenu(); 
                        bubbleForMenu?.classList.remove('mobile-menu-trigger');
                        return;
                    }

                    if (unifiedMenuActionButton) { // It's an action click
                        e.preventDefault(); e.stopPropagation();
                        const action = unifiedMenuActionButton.dataset.unifiedMenuAction;
                        const textElement = actualWrapperForMenu.querySelector<HTMLElement>('.chat-message-text');
                        console.log(`[RH] Unified Menu Action '${action}' clicked. Wrapper ID:`, actualWrapperForMenu.dataset.messageId);

                       
                        if (action === 'copy' && textElement) {
                            navigator.clipboard.writeText(textElement.textContent || '');
                            if (cuu && typeof cuu.showMenuActionFeedback === 'function') {
                                cuu.showMenuActionFeedback(unifiedMenuActionButton, 'Copied!');
                            }
                        } // CORRECTED: 'if (action === 'copy')' block closes here
                        else if (action === 'translate' && textElement && aiTranslationService) { // CORRECTED: 'else if' is now a sibling to the 'copy' block
                            console.log("[RH_TRANSLATE_UNIFIED] Entered translate logic block."); // LOG 1
                    
                            const messageId = actualWrapperForMenu.dataset.messageId;
                            const chatLogElementContext = actualWrapperForMenu.closest<HTMLElement>('.chat-log-area');
                            let conversationId: string | undefined;
                    
                            if (chatLogElementContext?.id === 'group-chat-log') {
                                if (groupDataManager && typeof groupDataManager.getCurrentGroupId === 'function') {
                                    const groupIdFromManager = groupDataManager.getCurrentGroupId();
                                    conversationId = (groupIdFromManager === null) ? undefined : groupIdFromManager;
                                    console.log("[RH_TRANSLATE_UNIFIED] Group chat context. GroupID:", conversationId); // LOG 2a
                                } else {
                                    console.warn("[RH_TRANSLATE_UNIFIED] Group chat: groupDataManager or getCurrentGroupId not available."); // LOG 2b
                                }
                            } else {
                                conversationId = actualWrapperForMenu.dataset.currentConnectorId ||
                                                 actualWrapperForMenu.dataset.connectorId ||
                                                 actualWrapperForMenu.closest<HTMLElement>('[data-current-connector-id]')?.dataset.currentConnectorId;
                                console.log("[RH_TRANSLATE_UNIFIED] 1-on-1 chat context. ConnectorID:", conversationId); // LOG 2c
                            }
                            
                            console.log("[RH_TRANSLATE_UNIFIED_IDS] Final check. messageId:", messageId, "conversationId:", conversationId); // LOG 3
                    
                            if (messageId && conversationId) {
                                console.log("[RH_TRANSLATE_UNIFIED] IDs valid. Proceeding with translation call."); // LOG 4
                                const currentTextContent = textElement.textContent || ''; 
                    
                                if (actualWrapperForMenu.dataset.isTranslated !== 'true') {
                                    actualWrapperForMenu.dataset.originalText = currentTextContent;
                                }
                                const isTranslated = actualWrapperForMenu.dataset.isTranslated === 'true';
                    
                                if (isTranslated) {
                                    console.log("[RH_TRANSLATE_UNIFIED] Reverting to original text."); // LOG 5a
                                    textElement.textContent = actualWrapperForMenu.dataset.originalText || "";
                                    actualWrapperForMenu.dataset.isTranslated = 'false';
                        
                                    if (cuu && typeof cuu.updateMenuTranslateButtonText === 'function') {
                                        cuu.updateMenuTranslateButtonText(unifiedMenuActionButton, 'Translate');
                                    } else { 
                                        const span = unifiedMenuActionButton.querySelector('span');
                                        if (span) span.textContent = 'Translate';
                                    }
                                } else {
                                    console.log("[RH_TRANSLATE_UNIFIED] Attempting to translate to target language."); // LOG 5b
                                    if (cuu && typeof cuu.showMenuActionInProgress === 'function') {
                                        console.log("[RH_TRANSLATE_UNIFIED] Calling cuu.showMenuActionInProgress."); // LOG 6
                                        cuu.showMenuActionInProgress(unifiedMenuActionButton, 'Translating...');
                                    }
                        
                                    try {
                                        console.log("[RH_TRANSLATE_UNIFIED] Calling aiTranslationService.generateTranslation..."); // LOG 7
                                        const translatedText = await aiTranslationService.generateTranslation(messageId, conversationId);
                                        console.log("[RH_TRANSLATE_UNIFIED] aiTranslationService returned:", translatedText); // LOG 8
                                        if (translatedText) {
                                            textElement.textContent = translatedText;
                                            actualWrapperForMenu.dataset.isTranslated = 'true';
                                        } else {
                                             console.warn("[RH_TRANSLATE_UNIFIED] Translation returned null or empty.");
                                        }
                                    } catch (err) {
                                        console.error(`[RH_TRANSLATE_UNIFIED] Error during translation:`, err);
                                    } finally {
                                        const buttonTextAfterAction = actualWrapperForMenu.dataset.isTranslated === 'true' ? 'Original' : 'Translate';
                                        console.log("[RH_TRANSLATE_UNIFIED] In finally block. Button text should be:", buttonTextAfterAction); // LOG 9
                                        if (cuu && typeof cuu.resetMenuActionInProgress === 'function') {
                                            cuu.resetMenuActionInProgress(unifiedMenuActionButton, buttonTextAfterAction);
                                        } else { 
                                            const span = unifiedMenuActionButton.querySelector('span');
                                            if (span) span.textContent = buttonTextAfterAction;
                                            (unifiedMenuActionButton as HTMLButtonElement).disabled = false;
                                        }
                                    }
                                }
                            } else {
                                console.warn("[RH_TRANSLATE_UNIFIED] ID check FAILED. Missing messageId or conversationId. Button will be reset."); // LOG 10
                                if (cuu && typeof cuu.resetMenuActionInProgress === 'function') {
                                    cuu.resetMenuActionInProgress(unifiedMenuActionButton, 'Translate');
                                } else { 
                                    const span = unifiedMenuActionButton.querySelector('span');
                                    if (span) span.textContent = 'Translate';
                                    (unifiedMenuActionButton as HTMLButtonElement).disabled = false;
                                }
                            }
                        } // End of 'else if (action === 'translate' ...)' - CORRECTLY POSITIONED
                        requestHideUnifiedInteractionMenu();
                        bubbleForMenu?.classList.remove('mobile-menu-trigger');
                        return;
                    }
                 // End if (eventIsInsideActiveUnifiedMenu)
                
                // <<< The next part of your click listener (clickIsEndOfLongPress check, mobile timestamp, etc.) starts here >>>
                // Your log showed: "if (clickIsEndOfLongPress && bubble) { ..."
                // Ensure the `bubble` and `wrapper` variables used from this point onwards are the ones defined 
                // at the very top of the click listener (from target.closest()), NOT `actualWrapperForMenu` or `bubbleForMenu`.
                                // If clickIsEndOfLongPress is true, it means the menu was just opened by this gesture.
                                // We don't want THIS specific click (the one that lifted the finger from the long press)
                                // to also trigger the timestamp display if it landed on the bubble itself.
                                                         // If clickIsEndOfLongPress is true, it means the menu was just opened by this gesture.
                                                         if (clickIsEndOfLongPress && bubble) {
                                                            console.log("[RH_CLICK_HANDLER] Entered clickIsEndOfLongPress block."); // <<< NEW LOG
                                                            // The unifiedMenuEmojiButton and unifiedMenuActionButton were defined earlier in this click handler.
                                                            const clickedOnMenuButtonDirectly = unifiedMenuEmojiButton || unifiedMenuActionButton;
                        
                                                            if (clickedOnMenuButtonDirectly) {
                                                                // The long press ended WITH THE FINGER ALREADY ON a menu button.
                                                                // Let the menu button handlers (which are earlier in this click function) do their job.
                                                                // This console log is just for clarity; the actual processing happens above.
                                                                console.log("[RH_DEBUG] Click was end of long press, AND it landed DIRECTLY on a menu button. Letting menu button handlers proceed.");
                                                                // DO NOT call e.stopPropagation() or return here, as the menu button handlers need the event.
                                                            } else {
                                                                // The long press ended with the finger on the BUBBLE (but not a menu button).
                                                                // We want the menu to REMAIN OPEN.
                                                                // Prevent this specific click from triggering other bubble actions (like timestamp).
                                                                console.log("[RH_DEBUG] Click was end of long press, landed on BUBBLE (not a menu item). Menu STAYS OPEN. Preventing other bubble actions for THIS click.");
                                                                e.stopPropagation(); // Stop this click from, e.g., showing timestamp
                                                                return;              // Prevent further processing OF THIS BUBBLE CLICK
                                                            }
                                                        }
                                                        console.log("[RH_CLICK_HANDLER] Past clickIsEndOfLongPress block. Checking mobile single tap on bubble..."); // <<< NEW LOG
                                // B: MOBILE - Single Tap on Bubble (for Timestamp or closing its own menu)
                                if (isMobile && bubble) { // bubble check is redundant if wrapper is guaranteed, but good for clarity
                                    console.log("[RH_CLICK_HANDLER] Checking mobile single tap on bubble scenarios..."); // <<< NEW LOG
                                    if (cuu?.isUnifiedInteractionMenuVisibleForBubble?.(bubble)) {
                                        console.log("[RH_DEBUG] Mobile tap on BUBBLE while its own unified menu is visible. Closing menu.");
                                        e.stopPropagation();
                                        requestHideUnifiedInteractionMenu();
                                        // The 'mobile-menu-trigger' class should be removed by hideUnifiedInteractionMenu or its callback
                                        return;
                                    }
                                    
                                    const existingTempTimestamp = document.getElementById('temp-chat-timestamp');
                                    const parentOfOldTimestamp = existingTempTimestamp?.parentElement;
                                    if (existingTempTimestamp) existingTempTimestamp.remove();
                                    if (parentOfOldTimestamp === wrapper) { e.stopPropagation(); return; }
            
                                    if (!wrapper) return; // Exit if no wrapper was found for the tap
                                    const timestampStringFromTitle = wrapper.title;
                                    if (timestampStringFromTitle && window.polyglotHelpers) {
                                        const date = new Date(timestampStringFromTitle); let formattedText = "Time unavailable";
                                        if (!isNaN(date.getTime())) { 
                                            const now = new Date(); const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                            if (date.toDateString() === now.toDateString()) formattedText = `Today, ${timePart}`;
                                            else { const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
                                                if (date.toDateString() === yesterday.toDateString()) formattedText = `Yesterday, ${timePart}`;
                                                else formattedText = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ` at ${timePart}`;
                                            }
                                        } else { 
                                            const numericTs = wrapper.dataset.timestamp; 
                                            if (numericTs && !isNaN(Number(numericTs))) { 
                                                const fallbackDate = new Date(Number(numericTs));
                                                if(!isNaN(fallbackDate.getTime())) {
                                                    const timePart = fallbackDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                                    const now = new Date();
                                                    if (fallbackDate.toDateString() === now.toDateString()) formattedText = `Today, ${timePart}`;
                                                    else { const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
                                                        if (fallbackDate.toDateString() === yesterday.toDateString()) formattedText = `Yesterday, ${timePart}`;
                                                        else formattedText = fallbackDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ` at ${timePart}`;
                                                    }
                                                }
                                            }
                                            if (formattedText === "Time unavailable") console.error(`[RH] Mobile Timestamp: Invalid date from title: "${timestampStringFromTitle}" and no valid numeric fallback.`);
                                        }
                                        const timestampDiv = document.createElement('div'); timestampDiv.id = 'temp-chat-timestamp';
                                        timestampDiv.className = 'chat-session-timestamp'; timestampDiv.textContent = formattedText;
                                        wrapper.before(timestampDiv);
                                    }
                                    e.stopPropagation(); 
                                    return;
                                }
                                console.log("[RH_CLICK_HANDLER] Past mobile single tap. Checking desktop bubble click..."); // <<< NEW LOG

                                // C: DESKTOP - Click on bubble (not a picker/menu item already handled)
                                // This also serves as a fallback if something was missed above.
                                if (!isMobile && bubble) {
                                    // This is for desktop clicks directly on a bubble that weren't specific desktop menu items.
                                    // Usually closes any open desktop popups.
                                    console.log("[RH_DEBUG] Desktop click on BUBBLE (not a handled desktop menu/picker item). Closing DESKTOP popups.");
                                    requestHideUnifiedInteractionMenu(); // Close unified menu if somehow open on desktop
                                    closeDesktopPopups();
                                    // Clean up any trigger classes
                                    bubble.classList.remove('mobile-menu-trigger', 'desktop-popup-trigger');
                            
                                    const reactionBadge = target.closest<HTMLElement>('.reaction-item');
                                    if (reactionBadge) {
                                        console.log("[RH_DEBUG] Desktop click on a REACTION BADGE. Re-opening desktop reaction picker.");
                                        openDesktopReactionPicker(bubble); // Assuming this is for desktop hover picker
                                        e.stopPropagation();
                                        return;
                                    }
                                    return;
                                }
            
                                // D. Clicked on empty space in chat log (fallback, should mostly be handled by document click)
                              if (!target.closest('.chat-message-wrapper')) {
        console.log("[RH_DEBUG] Click on EMPTY CHAT LOG SPACE.");
        requestHideUnifiedInteractionMenu();
        closeDesktopPopups();
        const existingTempTimestamp = document.getElementById('temp-chat-timestamp');
        if (existingTempTimestamp) existingTempTimestamp.remove();
        document.querySelectorAll('.mobile-menu-trigger, .desktop-popup-trigger').forEach(el => el.classList.remove('mobile-menu-trigger', 'desktop-popup-trigger'));
    }
             } }); // End main click listener for addSafeListener(log, 'click', ...)
            }); // End chatLogs.forEach
        }; // End initialize function

        return { initialize };
    // This is where the IIFE for reactionHandlerMethods ends  // <<< My comment, NOT actual code
    })(); // <<< THIS CLOSES THE reactionHandlerMethods IIFE

    // Populate the window object and dispatch the ready event
      // Populate the window object and dispatch the ready event
      if (window.reactionHandler) {
        Object.assign(window.reactionHandler, reactionHandlerMethods);
    }
    document.dispatchEvent(new CustomEvent('reactionHandlerReady'));
    console.log('reaction_handler.ts: Ready event dispatched.');
})(); // <<< THIS CLOSES THE OUTERMOST (function () { ... })();