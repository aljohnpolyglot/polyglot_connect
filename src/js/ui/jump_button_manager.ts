// =================== REPLACE THE ENTIRE jump_button_manager.ts FILE WITH THIS ===================

console.log('jump_button_manager.ts: Script loaded. Awaiting initialization call from app controller.');

interface JumpButtonManagerModule {
    initialize: (initialTab: string) => void;
}

// Placeholder on the window object
window.jumpButtonManager = {
    initialize: () => console.warn("JBM structural: initialize called before full init.")
} as JumpButtonManagerModule;

// This function now ONLY defines the module. It does not call itself.
function initializeActualJumpButtonManager(): void {
    console.log('%c[JBM] Defining the actual manager module...', 'color: #0d6efd;');

  // =================== REPLACE THE ENTIRE IIFE BLOCK in jump_button_manager.ts ===================
window.jumpButtonManager = ((): JumpButtonManagerModule => {
    'use strict';
    let hasBeenInitialized = false;
    // --- State variables for dragging ---
    let isDragging = false;
    let offsetX = 0, offsetY = 0;
    let container: HTMLElement | null = null;

    const buttons: { [key: string]: string } = {
        friends: `
            <button class="jump-button" data-target-id="friends-jump-to-top-btn" title="Jump to Top"><i class="fas fa-arrow-up"></i></button>
            <button class="jump-button" data-target-id="friends-jump-to-filters-btn" title="Jump to Filters"><i class="fas fa-filter"></i></button>
        `,
        groups: `
            <button class="jump-button" data-target-id="groups-jump-to-top-btn" title="Jump to Top"><i class="fas fa-arrow-up"></i></button>
            <button class="jump-button" data-target-id="groups-jump-to-filters-btn" title="Jump to Filters"><i class="fas fa-filter"></i></button>
        `,
        messages: `
            <button class="jump-button" data-target-id="messages-jump-to-top-btn" title="Jump to Top"><i class="fas fa-arrow-up"></i></button>
            <button class="jump-button" data-target-id="messages-jump-to-chats-btn" title="Jump to Chat List"><i class="fas fa-inbox"></i></button>
        `
    };

    const actions: { [key: string]: () => void } = {
        'friends-jump-to-top-btn': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        'friends-jump-to-filters-btn': () => document.getElementById('friendsFiltersPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        'groups-jump-to-top-btn': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        'groups-jump-to-filters-btn': () => document.getElementById('groupsFiltersPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        'messages-jump-to-top-btn': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
        'messages-jump-to-chats-btn': () => document.getElementById('messagesChatListPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    };

    function updateButtonsForView(viewName: string): void {
        if (!container) return;
        
        const buttonHtml = buttons[viewName] || '';
        container.innerHTML = buttonHtml;
        
        // --- THIS IS THE FIX ---
        // Instead of setting style.display, we toggle a class.
        // CSS will now be in full control of visibility.
        if (buttonHtml) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    }

    // --- DRAG AND DROP EVENT HANDLERS ---

    function onPointerMove(e: PointerEvent): void {
        if (!isDragging || !container) return;
        e.preventDefault(); // Prevent text selection while dragging
        
        // Calculate new position
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        
        // Constrain to viewport
        const DOCK_MARGIN = 20;
        const maxX = window.innerWidth - container.offsetWidth - DOCK_MARGIN;
        const maxY = window.innerHeight - container.offsetHeight - DOCK_MARGIN;
        newX = Math.max(DOCK_MARGIN, Math.min(newX, maxX));
        newY = Math.max(DOCK_MARGIN, Math.min(newY, maxY));

        // Apply new position
        container.style.left = `${newX}px`;
        container.style.top = `${newY}px`;
        // We nullify bottom/right so top/left takes precedence
        container.style.bottom = 'auto';
        container.style.right = 'auto';
    }

    function onPointerUp(e: PointerEvent): void {
        if (!isDragging || !container) return;
        isDragging = false;
        
        container.classList.remove('dragging'); // Remove dragging class
        container.releasePointerCapture(e.pointerId); // Release the pointer

        // CRUCIAL CLEANUP: Remove listeners from the window
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    }

    function onPointerDown(e: PointerEvent): void {
        // IMPORTANT: Only start drag if the click is on the container itself, not a button inside it.
        if (!container || (e.target as HTMLElement).closest('.jump-button')) return;
        
        isDragging = true;
        container.classList.add('dragging'); // Add dragging class
        
        // Calculate offset from the element's top-left corner
        offsetX = e.clientX - container.offsetLeft;
        offsetY = e.clientY - container.offsetTop;
        
        container.setPointerCapture(e.pointerId); // Capture pointer events

        // CRUCIAL: Add move and up listeners to the whole window
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }
    
    function initialize(initialTab: string): void {
        // --- THIS IS THE FIX ---
        // If we've already run setup, don't do it again.
        if (hasBeenInitialized) {
            console.warn("JBM: initialize() called more than once. Ignoring subsequent calls.");
            return;
        }
        // --- END OF FIX ---
    
        container = window.domElements?.universalJumpButtons ?? null;
        if (!container) {
            console.error('JBM: Universal jump button container not found. Cannot initialize.');
            return;
        }
        
        updateButtonsForView(initialTab);

        // --- SETUP EVENT LISTENERS ---
        // For clicking the buttons inside
        container.addEventListener('click', (event) => {
            if (isDragging) return; // Don't fire button clicks if we just finished a drag
            const button = (event.target as HTMLElement).closest('.jump-button');
            const actionId = button?.getAttribute('data-target-id');
            if (actionId && actions[actionId]) {
                actions[actionId]();
            }
        });
        
        // For starting a drag on the container
        container.addEventListener('pointerdown', onPointerDown);
        
        // For updating buttons when the main tab changes
        document.addEventListener('tabSwitched', (e: Event) => {
            const customEvent = e as CustomEvent<{ newTab: string }>;
            if (customEvent.detail?.newTab) {
                updateButtonsForView(customEvent.detail.newTab);
            }
        });
    }

    return { initialize };
})();

    console.log('%c[JBM] Module defined. Dispatching "jumpButtonManagerReady" event!', 'color: #17a2b8;');
    document.dispatchEvent(new CustomEvent('jumpButtonManagerReady'));
}

// This is the key change: we now rely on an external caller.
// We just need to define the function that the external caller will use.
initializeActualJumpButtonManager();