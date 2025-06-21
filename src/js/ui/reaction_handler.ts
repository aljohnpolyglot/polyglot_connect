// D:\polyglot_connect\src\js\handlers\reaction_handler.ts

// At the top of the file
import type { YourDomElements, ConversationManager } from '../types/global.d.ts'; // <<< ADD ConversationManager

// ...

interface ReactionHandlerModule {
    initialize: (domElements: YourDomElements, conversationManager: ConversationManager) => void; // <<< ADD ConversationManager
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
   

   const initialize = (domElements: YourDomElements, conversationManager: ConversationManager): void => {
    console.log('ReactionHandler: Initializing listeners...');

    const chatLogs = [
        domElements.embeddedChatLog,
        domElements.messageChatLog,
        domElements.groupChatLogDiv
    ].filter(el => el) as HTMLElement[];

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let activePicker: HTMLElement | null = null;
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

    const closeActivePicker = () => {
        if (activePicker) {
            activePicker.classList.remove('visible');
            activePicker.querySelectorAll('.reaction-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
            activePicker = null;
        }
    };

    const openPickerForBubble = (bubble: HTMLElement) => {
        const picker = bubble.querySelector<HTMLElement>('.reaction-picker');
        const wrapper = bubble.closest<HTMLElement>('.chat-message-wrapper');
        if (!picker || !wrapper) return;

        closeActivePicker(); 

        const currentUserReaction = wrapper.dataset.userReaction;
        if (currentUserReaction) {
            const selectedBtn = picker.querySelector<HTMLButtonElement>(`button[aria-label="React with ${currentUserReaction}"]`);
            if (selectedBtn) selectedBtn.classList.add('selected');
        }

        picker.classList.add('visible');
        activePicker = picker;
    };

    // Global click listener to close the picker when clicking away
    addSafeListener(document, 'click', (e: Event) => {
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
            if (activePicker) return; 
            openPickerForBubble(bubble);
        });

        // --- Logic to HIDE the picker when the mouse leaves the bubble/picker area ---
        addSafeListener(log, 'mouseout', (e: Event) => {
            const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
            if (bubble && activePicker) {
                setTimeout(() => {
                    if (activePicker && !activePicker.matches(':hover')) {
                        closeActivePicker();
                    }
                }, 300);
            }
        });
        
        // --- Logic to SHOW the picker (Long Press on Mobile) ---
        addSafeListener(log, 'touchstart', (e: Event) => {
            const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
            if (!bubble) return;
            
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                e.preventDefault();
                isLongPress = true;
                openPickerForBubble(bubble);
                longPressTimer = null;
            }, 500);
        }, { passive: false });

        const cancelLongPress = () => {
            if (longPressTimer) clearTimeout(longPressTimer);
            longPressTimer = null;
        };
        
        addSafeListener(log, 'touchend', cancelLongPress);
        addSafeListener(log, 'touchmove', cancelLongPress);
        // =======================================================================
           
           
           
             // =================== REPLACE THE ENTIRE 'click' LISTENER WITH THIS FINAL VERSION ===================
             addSafeListener(log, 'click', (e: Event) => {
                if (isLongPress) {
                    e.preventDefault();
                    return;
                }
                const target = e.target as HTMLElement;

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
                    const pickerButton = target.closest<HTMLElement>('.reaction-btn');
                    if (pickerButton && activePicker) {
                        const wrapper = pickerButton.closest<HTMLElement>('.chat-message-wrapper');
                        const reactionsDisplay = wrapper?.querySelector<HTMLElement>('.message-reactions');
                        
                        if (wrapper && reactionsDisplay) {
                           const emoji = pickerButton.textContent || '';
                           const currentReaction = wrapper.dataset.userReaction;
                    
                           const existingEl = reactionsDisplay.querySelector('.reaction-item');
                           if (existingEl) existingEl.remove();
                    
                           if (currentReaction === emoji) {
                               delete wrapper.dataset.userReaction;
                               updateReactionInData(wrapper, null);
                           } else {
                               wrapper.dataset.userReaction = emoji;
                               const newReactionEl = document.createElement('button');
                               newReactionEl.className = 'reaction-item';
                               newReactionEl.type = 'button';
                               newReactionEl.innerHTML = `${emoji} <span class="reaction-count">1</span>`;
                               reactionsDisplay.appendChild(newReactionEl);
                               updateReactionInData(wrapper, emoji);
                           }
                        }
                        
                        // --- THIS IS THE FIX ---
                        // After the user makes a selection, always close the picker.
                        closeActivePicker();
                        // --- END OF FIX ---
                        
                        e.stopPropagation();
                        return;
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