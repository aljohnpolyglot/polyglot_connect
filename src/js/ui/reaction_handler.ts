// D:\polyglot_connect\src\js\handlers\reaction_handler.ts

// At the top of the file
import type { YourDomElements, ConversationManager, AiTranslationServiceModule } from '../types/global.d.ts';
// ...
// REPLACE THE OLD INTERFACE WITH THIS
interface ReactionHandlerModule {
    initialize: (
        domElements: YourDomElements, 
        conversationManager: ConversationManager, 
        aiTranslationService: AiTranslationServiceModule
    ) => void;
}

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
        
   // REPLACE WITH 
   const initialize = (domElements: YourDomElements, conversationManager: ConversationManager, aiTranslationService: AiTranslationServiceModule): void => { console.log('ReactionHandler: Initializing listeners...');

    const chatLogs = [
        domElements.embeddedChatLog,
        domElements.messageChatLog,
        domElements.groupChatLogDiv
    ].filter(el => el) as HTMLElement[];

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let activeMenu: HTMLElement | null = null;
    let isLongPress = false;

    // VVVVVV THIS FUNCTION IS NOW MOVED *INSIDE* INITIALIZE VVVVVV
    const updateReactionInData = (messageWrapper: HTMLElement, newEmoji: string | null) => {
        const messageId = messageWrapper.dataset.messageId;
        const chatLog = messageWrapper.closest('.chat-log-area');
        const chatContainer = chatLog?.closest<HTMLElement>('[data-current-connector-id]');
        const connectorId = chatContainer?.dataset.currentConnectorId;

        if (!messageId || !connectorId) {
            console.error("ReactionHandler: Cannot save reaction, missing messageId or connectorId.", { messageId, connectorId });
            return;
        }

        // Now this `conversationManager` is correctly scoped from the initialize function's arguments.
        const convo = conversationManager.getConversationById(connectorId);
        if (!convo?.messages) {
            console.error(`ReactionHandler: Could not get conversation for connectorId: ${connectorId}`);
            return;
        }

        const messageToUpdate = convo.messages.find(msg => msg.id === messageId);
        if (!messageToUpdate) {
            console.error(`ReactionHandler: Could not find message with ID ${messageId}.`);
            return;
        }

        if (!messageToUpdate.reactions) {
            messageToUpdate.reactions = {};
        }

        // Remove any old reaction from the player
        Object.keys(messageToUpdate.reactions).forEach(key => {
            const filtered = messageToUpdate.reactions![key].filter(uid => uid !== 'user_player');
            if (filtered.length > 0) {
                messageToUpdate.reactions![key] = filtered;
            } else {
                delete messageToUpdate.reactions![key];
            }
        });

        // Add the new reaction if provided
        if (newEmoji) {
            if (!messageToUpdate.reactions[newEmoji]) {
                messageToUpdate.reactions[newEmoji] = [];
            }
            messageToUpdate.reactions[newEmoji].push('user_player');
        }

        // Trigger the save operation through the conversation manager
        if (conversationManager.saveAllConversationsToStorage) {
            conversationManager.saveAllConversationsToStorage();
             console.log(`Reaction saved for msg ${messageId}:`, messageToUpdate.reactions);
        } else {
             console.warn("ReactionHandler: conversationManager.saveAllConversationsToStorage is not available.")
        }
    };
    // ^^^^^^ END OF MOVED FUNCTION ^^^^^^
let activePicker: HTMLElement | null = null;


const closeActivePicker = () => {
    if (activePicker) {
        activePicker.classList.remove('visible');
        activePicker = null;
    }
    if (activeMenu) { // This part was missing
        activeMenu.classList.remove('visible');
        activeMenu = null;
    }
};

const openPickerForBubble = (bubble: HTMLElement) => {
    closeActivePicker(); 
    
    let picker = bubble.querySelector<HTMLElement>('.reaction-picker');
    
    // Create the picker if it doesn't exist
    if (!picker) {
        const newPicker = document.createElement('div'); // Create as a new const
        newPicker.className = 'reaction-picker';
        ['👍', '❤️', '😂', '😯', '😢', '😡'].forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'reaction-btn';
            button.type = 'button';
            button.setAttribute('aria-label', `React with ${emoji}`);
            button.textContent = emoji;
            // No error: 'newPicker' is guaranteed to be an HTMLElement
            newPicker.appendChild(button); 
        });
        bubble.appendChild(newPicker);
        picker = newPicker; // Assign the newly created element back to the original variable
    }

    const wrapper = bubble.closest<HTMLElement>('.chat-message-wrapper');

    // THIS IS THE FINAL FIX: We check for wrapper and picker together here
    // This guarantees 'picker' is not null for all subsequent operations.
    if (wrapper && picker) {
        // --- THIS IS THE FIX ---
        // 1. First, remove the 'selected' class from ALL buttons in this picker.
        picker.querySelectorAll('.reaction-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });

        // 2. Then, check for the user's current reaction on the wrapper.
        const currentUserReaction = wrapper.dataset.userReaction;
        if (currentUserReaction) {
            // 3. Find the specific button that matches and add the class ONLY to it.
            const selectedBtn = picker.querySelector<HTMLButtonElement>(`button[aria-label="React with ${currentUserReaction}"]`);
            if (selectedBtn) {
                selectedBtn.classList.add('selected');
            }
        }
        // --- END OF FIX ---

        picker.classList.add('visible');
        activePicker = picker;
    }
};
// ADD THIS NEW FUNCTION FOR THE ACTION MENU
const openActionMenu = (bubble: HTMLElement) => {
    closeActivePicker(); // Close other popups first
    const menu = bubble.querySelector<HTMLElement>('.action-menu');
    if (menu) {
        menu.classList.add('visible');
        activeMenu = menu;
    }
};



    // Global click listener to close the picker when clicking away
    addSafeListener(document, 'click', (e) => {
        const target = e.target as HTMLElement;
        if (activePicker && !target.closest('.reaction-picker') && !target.closest('.message-reactions')) {
            closeActivePicker();
        }
    });

 
    chatLogs.forEach(log => {

        // --- Logic to SHOW the picker on Hover (Desktop) ---
        addSafeListener(log, 'mouseover', (e: Event) => {
            const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
            if (!bubble) return;

            // <<< THIS IS THE FIX >>>
            // Do not show the reaction picker if a picker OR an action menu is already active.
            if (activePicker || activeMenu) return; 
            
            openPickerForBubble(bubble);
        });

        // --- Logic to HIDE the picker when the mouse leaves the bubble/picker area ---
              // --- Logic to HIDE the picker when the mouse leaves the "safe zone" ---
                 // --- Logic to HIDE the picker when the mouse leaves the message WRAPPER ---
              // --- Logic to HIDE the picker and menu when the mouse leaves the message WRAPPER ---
                    // --- Logic to HIDE any active popup when the mouse leaves its "safe zone" ---
        addSafeListener(log, 'mouseout', (e: Event) => {
            const mouseEvent = e as MouseEvent;
            const toElement = mouseEvent.relatedTarget as HTMLElement;
            const fromElement = mouseEvent.target as HTMLElement;

            // Find the wrapper of the message we are leaving from
            const messageWrapper = fromElement.closest('.chat-message-wrapper');
            if (!messageWrapper) return;

            // Determine if there's an active menu or picker associated with THIS message
            const hasActivePopup = activePicker?.closest('.chat-message-wrapper') === messageWrapper || 
                                   activeMenu?.closest('.chat-message-wrapper') === messageWrapper;

            if (hasActivePopup) {
                // Check if the element we are moving TO is still within the message wrapper's bounds.
                // This wrapper contains the bubble AND the popups.
                if (!toElement || !messageWrapper.contains(toElement)) {
                    // If we've truly left the wrapper area, close everything.
                    closeActivePicker(); 
                }
            }
        });
        // --- Logic to SHOW the picker (Long Press on Mobile) ---
        addSafeListener(log, 'touchstart', (e: Event) => {
            const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
            if (!bubble) return;
            
            isLongPress = false; // Reset flag
            longPressTimer = setTimeout(() => {
                e.preventDefault(); // Prevent text selection, etc.
                isLongPress = true;
                
                // Open the ACTION MENU on long-press now
                openActionMenu(bubble);

                longPressTimer = null;
            }, 500); // 500ms for a long press
        }, { passive: false });

        const cancelLongPress = () => {
            if (longPressTimer) clearTimeout(longPressTimer);
            longPressTimer = null;
        };
        
        addSafeListener(log, 'touchend', cancelLongPress);
        addSafeListener(log, 'touchmove', cancelLongPress);
               // --- Logic for Right-Click (Desktop) ---
               addSafeListener(log, 'contextmenu', (e: Event) => {
                const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
                if (bubble) {
                    // Prevent the default browser menu and stop other listeners from running.
                    e.preventDefault();
                    e.stopPropagation(); 
    
                    // Close any open reaction picker to ensure the action menu takes precedence.
                    closeActivePicker(); 
                    
                    // Open the action menu.
                    openActionMenu(bubble);
                }
            }, { capture: true }); // <<< THIS IS THE CRUCIAL FIX
           
           
             // =================== REPLACE THE ENTIRE 'click' LISTENER WITH THIS FINAL VERSION ===================
             addSafeListener(log, 'click', async (e: Event) => {

           



                if (isLongPress) {
                    e.preventDefault();
                    isLongPress = false; // Reset the flag
                    return;
                }
                const target = e.target as HTMLElement;


                const actionButton = target.closest<HTMLElement>('.action-btn-item');
                if (actionButton) {
                    e.stopImmediatePropagation(); // <-- THE FIX
                    e.stopPropagation();
                    const bubble = actionButton.closest<HTMLElement>('.chat-message-ui');
                    const messageWrapper = bubble?.closest<HTMLElement>('.chat-message-wrapper');
                    const textElement = messageWrapper?.querySelector<HTMLElement>('.chat-message-text');
    
                    if (!messageWrapper || !textElement) {
                        closeActivePicker();
                        return;
                    }
                
                    const action = actionButton.dataset.action;
                
                    if (action === 'copy') {
                        navigator.clipboard.writeText(textElement.textContent || '');
                        actionButton.querySelector('span')!.textContent = 'Copied!';
                        setTimeout(() => { actionButton.querySelector('span')!.textContent = 'Copy'; }, 1500);
                    } else if (action === 'translate') {
                        console.log('[STEP 1] ✅ "Translate" button clicked. Preparing to call AI service.');
                        const messageId = messageWrapper.dataset.messageId;
                        const chatContainer = messageWrapper.closest<HTMLElement>('[data-current-connector-id]');
                        const connectorId = chatContainer?.dataset.currentConnectorId;
                        
                        if (messageId && connectorId) {
                            const originalText = messageWrapper.dataset.originalText || (messageWrapper.dataset.originalText = textElement.textContent || '');
                            const isTranslated = messageWrapper.dataset.isTranslated === 'true';
                    
                            if (isTranslated) {
                                textElement.textContent = originalText;
                                messageWrapper.dataset.isTranslated = 'false';
                                actionButton.querySelector('span')!.textContent = 'Translate';
                            } else {
                                const originalButtonContent = actionButton.innerHTML;
                                actionButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Translating...</span>`;
                                (actionButton as HTMLButtonElement).disabled = true;
                    
                                try {
                                    const translatedText = await aiTranslationService.generateTranslation(messageId, connectorId);

                                    console.log('[STEP 3] ✅ AI Translation Service responded. Result:', translatedText);
                                    
                                    if (translatedText) {
                                        textElement.textContent = translatedText;
                                        messageWrapper.dataset.isTranslated = 'true';
                                        actionButton.innerHTML = `<i class="fas fa-language"></i><span>Original</span>`;
                                    } else {
                                        textElement.textContent += ' (Translation failed)';
                                        actionButton.innerHTML = originalButtonContent;
                                    }
                                } catch (err) {
                                    textElement.textContent += ' (Translation error)';
                                    actionButton.innerHTML = originalButtonContent;
                                } finally {
                                    (actionButton as HTMLButtonElement).disabled = false;
                                }
                            }
                        }
                    }
                    
                    closeActivePicker(); // Close the menu after an action
                    return; 
                }

                // CASE 1: Clicked on a displayed reaction badge (e.g., "👍 1").
                const reactionBadge = target.closest<HTMLElement>('.reaction-item');
                if (reactionBadge) {
                    const bubble = reactionBadge.closest<HTMLElement>('.chat-message-wrapper')?.querySelector<HTMLElement>('.chat-message-ui');
                    if (!bubble) return;
                    const picker = bubble.querySelector<HTMLElement>('.reaction-picker');
                    if (picker && activePicker === picker) {
                        closeActivePicker();
                    } else {
                        openPickerForBubble(bubble);
                    }
                    e.stopPropagation();
                    return;
                }

                // CASE 2: Clicked a button inside the picker.
              // =================== REPLACE CASE 2 WITH THIS CORRECTED VERSION ===================
// CASE 2: Clicked a button inside the picker.
// =================== REPLACE CASE 2 WITH THIS CORRECTED VERSION ===================
                    // CASE 2: Clicked on a button inside the picker itself.
                  // REPLACE CASE 2 WITH THIS

// CASE 2: Clicked a button inside the picker.
// CASE 2: Clicked a button inside the picker.
const pickerButton = target.closest<HTMLElement>('.reaction-btn');
if (pickerButton) {
    console.log('[RH_DEBUG] CASE 2 triggered by click on:', target);
    console.log('[RH_DEBUG] Found pickerButton:', pickerButton);

    // Stop the event from bubbling up to other listeners IMMEDIATELY.
    e.stopPropagation(); 
    e.preventDefault();

    // Use .closest() to find the wrapper, it's generally more reliable.
    const wrapper = pickerButton.closest<HTMLElement>('.chat-message-wrapper');
    console.log('[RH_DEBUG] Attempting to find wrapper. Found:', wrapper);

    if (wrapper) {
        console.log('[RH_DEBUG] Wrapper found. It has dataset:', JSON.parse(JSON.stringify(wrapper.dataset)));
        const reactionsDisplay = wrapper.querySelector<HTMLElement>('.message-reactions');

        if (reactionsDisplay) {
            const emoji = pickerButton.textContent || '';
            const currentReaction = wrapper.dataset.userReaction;

            const existingEl = reactionsDisplay.querySelector('.reaction-item');
            if (existingEl) existingEl.remove();

            if (currentReaction === emoji) {
                delete wrapper.dataset.userReaction;
                console.log('[RH_DEBUG] Calling updateReactionInData to REMOVE reaction.');
                updateReactionInData(wrapper, null);
            } else {
                wrapper.dataset.userReaction = emoji;
                const newReactionEl = document.createElement('button');
                newReactionEl.className = 'reaction-item';
                newReactionEl.type = 'button';
                newReactionEl.innerHTML = `${emoji} <span class="reaction-count">1</span>`;
                reactionsDisplay.appendChild(newReactionEl);
                console.log('[RH_DEBUG] Calling updateReactionInData to ADD reaction.');
                updateReactionInData(wrapper, emoji);
            }
        } else {
            console.error('[RH_DEBUG] Wrapper was found, but its .message-reactions child was not.');
        }
    } else {
        console.error('[RH_DEBUG] CRITICAL: pickerButton was clicked, but a .chat-message-wrapper parent could not be found.');
    }
    
    closeActivePicker();
    return; // IMPORTANT: Exit the click handler
}
// ==============================================================================
// ==============================================================================

                // CASE 3: Clicked anywhere else.
                // If it's on a bubble, open its picker. If not, close any active picker.
                const bubble = target.closest<HTMLElement>('.chat-message-ui');
                if (bubble) {
                    const isMobile = window.innerWidth <= 768;

                    // --- MOBILE: TAP-TO-REVEAL TIMESTAMP ---
                    if (isMobile) {
                        const wrapper = bubble.closest<HTMLElement>('.chat-message-wrapper');
                        if (wrapper) {
                            // Find any temporary timestamp that might already be visible and remove it.
                            const existingTempTimestamp = document.getElementById('temp-chat-timestamp');
                            const parentOfOldTimestamp = existingTempTimestamp?.parentElement;
                            if (existingTempTimestamp) {
                                existingTempTimestamp.remove();
                            }

                            // If the user tapped the bubble that *was* showing the timestamp, we're done. Just hide it.
                            if (parentOfOldTimestamp === wrapper) {
                                e.stopPropagation();
                                return;
                            }

                            // Create a new, temporary timestamp divider.
                            const timestamp = wrapper.title; // The full timestamp is stored in the 'title' attribute
                            if (timestamp && window.polyglotHelpers) {
                                const date = new Date(timestamp);
                                const now = new Date();
                                let formattedText = '';
                                
                                const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                
                                // Use logic similar to the main UI updater for consistent formatting.
                                if (date.toDateString() === now.toDateString()) {
                                    formattedText = `Today, ${timePart}`;
                                } else {
                                    const yesterday = new Date();
                                    yesterday.setDate(now.getDate() - 1);
                                    if (date.toDateString() === yesterday.toDateString()) {
                                        formattedText = `Yesterday, ${timePart}`;
                                    } else {
                                        formattedText = date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ` at ${timePart}`;
                                    }
                                }

                                const timestampDiv = document.createElement('div');
                                timestampDiv.id = 'temp-chat-timestamp'; // Give it a unique ID for easy removal
                                timestampDiv.className = 'chat-session-timestamp'; // Use the same class as other dividers
                                timestampDiv.textContent = formattedText;
                                
                                // Insert the new timestamp directly before the clicked message's wrapper.
                                wrapper.before(timestampDiv);
                            }
                            
                            // CRITICAL: Stop the event here so it doesn't also try to open the reaction picker.
                            e.stopPropagation();
                            return;
                        }
                    }
                    
                    // --- DESKTOP: OPEN REACTION PICKER (only runs if not mobile) ---
                    openPickerForBubble(bubble);

                } else if (activePicker) {
                    // Clicked on empty space, close any active picker and remove temp timestamp.
                    const existingTempTimestamp = document.getElementById('temp-chat-timestamp');
                    if (existingTempTimestamp) existingTempTimestamp.remove();
                    closeActivePicker();
                } else {
                    // Also handle clicks on empty space when picker is not active
                    const existingTempTimestamp = document.getElementById('temp-chat-timestamp');
                    if (existingTempTimestamp) existingTempTimestamp.remove();
                }
            });
// ============================================================================================
// ===================================================================================
            });
        };

        return { initialize };
    })();

    // Populate the window object and dispatch the ready event
    Object.assign(window.reactionHandler, reactionHandlerMethods);
    document.dispatchEvent(new CustomEvent('reactionHandlerReady'));
    console.log('reaction_handler.ts: Ready event dispatched.');
})();