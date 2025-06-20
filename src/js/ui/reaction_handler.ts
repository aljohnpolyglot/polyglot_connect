// D:\polyglot_connect\src\js\handlers\reaction_handler.ts

import type { YourDomElements } from '../types/global.d.ts';

console.log('reaction_handler.ts: Script loaded.');

interface ReactionHandlerModule {
    initialize: (domElements: YourDomElements) => void;
}

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
        
        const initialize = (domElements: YourDomElements): void => {
            console.log('ReactionHandler: Initializing listeners...');

            const chatLogs = [
                domElements.embeddedChatLog,
                domElements.messageChatLog,
                domElements.groupChatLogDiv
            ].filter(el => el) as HTMLElement[];

            let longPressTimer: ReturnType<typeof setTimeout> | null = null;
            let activePicker: HTMLElement | null = null;
            let isLongPress = false;

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
                // --- Logic to SHOW the picker (Hover on Desktop) ---
                addSafeListener(log, 'mouseover', (e: Event) => {
                    const bubble = (e.target as HTMLElement).closest<HTMLElement>('.chat-message-ui');
                    if (!bubble) return;
                    
                    const wrapper = bubble.closest<HTMLElement>('.chat-message-wrapper');
                    
                    // BUG FIX: Only show picker on hover IF the user has NOT already reacted.
                    if (wrapper && wrapper.dataset.userReaction) {
                        return; // Do nothing on hover if a reaction is set.
                    }

                    const picker = bubble.querySelector<HTMLElement>('.reaction-picker');
                    if (picker && !activePicker) {
                       openPickerForBubble(bubble);
                    }
                });

                // --- Logic to HIDE the picker (when mouse leaves) ---
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

                // --- MASTER CLICK HANDLER ---
                addSafeListener(log, 'click', (e: Event) => {
                    if (isLongPress) {
                        e.preventDefault();
                        return;
                    }
                    const target = e.target as HTMLElement;
                    
                    // CASE 1: Clicked on a displayed reaction to re-open picker
                    const reactionsContainer = target.closest<HTMLElement>('.message-reactions');
                    if (reactionsContainer) {
                        const bubble = reactionsContainer.closest<HTMLElement>('.chat-message-wrapper')?.querySelector<HTMLElement>('.chat-message-ui');
                        if (bubble) openPickerForBubble(bubble);
                        return;
                    }

                    // CASE 2: Clicked a button inside the picker
                    const reactionBtn = target.closest<HTMLElement>('.reaction-btn');
                    if (reactionBtn && activePicker) {
                        const wrapper = reactionBtn.closest<HTMLElement>('.chat-message-wrapper');
                        const reactionsDisplay = wrapper?.querySelector<HTMLElement>('.message-reactions');
                        if (!wrapper || !reactionsDisplay) return;

                        const emoji = reactionBtn.textContent || '';
                        const currentReaction = wrapper.dataset.userReaction;

                        // Remove existing reaction display
                        const existingEl = reactionsDisplay.querySelector('.reaction-item');
                        if (existingEl) existingEl.remove();
                        
                        if (currentReaction === emoji) {
                            delete wrapper.dataset.userReaction;
                        } else {
                            wrapper.dataset.userReaction = emoji;
                            const reactionEl = document.createElement('button');
                            reactionEl.className = 'reaction-item';
                            reactionEl.type = 'button';
                            reactionEl.innerHTML = `${emoji} <span class="reaction-count">1</span>`;
                            reactionsDisplay.appendChild(reactionEl);
                        }
                        
                        closeActivePicker();
                        e.stopPropagation();
                        return;
                    }

                    // CASE 3: A simple click on a message bubble
                    const bubble = target.closest<HTMLElement>('.chat-message-ui');
                    if (bubble && activePicker) {
                        closeActivePicker();
                    }
                });
            });
        };

        return { initialize };
    })();

    // Populate the window object and dispatch the ready event
    Object.assign(window.reactionHandler, reactionHandlerMethods);
    document.dispatchEvent(new CustomEvent('reactionHandlerReady'));
    console.log('reaction_handler.ts: Ready event dispatched.');
})();