// D:\polyglot_connect\src\js\ui\title_notifier.ts

console.log('title_notifier.ts: Script loaded.');

interface TitleNotifierModule {
    initialize: () => void;
}

// This is our butler's little brain.
const titleNotifier = ((): TitleNotifierModule => {
    let originalTitle = document.title;
    let unreadMessageCount = 0;
    let isWindowFocused = !document.hidden;

    /**
     * This function runs when the user clicks away from or back to the tab.
     */
    function handleVisibilityChange(): void {
        // Check if the tab is now visible (not hidden)
        if (!document.hidden) {
            isWindowFocused = true;
            // Reset the count and title when the user comes back
            if (unreadMessageCount > 0) {
                unreadMessageCount = 0;
                document.title = originalTitle;
            }
        } else {
            // The user is looking away
            isWindowFocused = false;
        }
    }

    /**
     * This function runs every time a new message arrives anywhere in the app.
     */
    function handleNewMessage(): void {
        // ONLY do something if the user is not looking at the tab.
        if (!isWindowFocused) {
            unreadMessageCount++;
            document.title = `(${unreadMessageCount}) ${originalTitle}`;
        }
    }

    /**
     * Sets everything up.
     */
    function initialize(): void {
        // Store the original title in case it changes dynamically on load.
        originalTitle = document.title;

        console.log('Title Notifier: Initializing. Original title:', originalTitle);

        // Set up the listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('polyglot-conversation-updated', handleNewMessage);
        document.addEventListener('new-message-in-store', handleNewMessage); // For 1v1 chats
    }

    return {
        initialize,
    };
})();

// Make our butler available to the rest of the app
window.titleNotifier = titleNotifier;
document.dispatchEvent(new CustomEvent('titleNotifierReady'));