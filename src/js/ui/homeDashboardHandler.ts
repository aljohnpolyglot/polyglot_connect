// src/js/ui/homeDashboardHandler.ts
import { auth } from '../firebase-config';
import type { YourDomElements, ConversationManager, TabManagerModule, ChatOrchestrator } from '../types/global.d';

function initializeHomeDashboard() {
    // Get all necessary modules from the window
    const dom = window.domElements as YourDomElements;
    const convoManager = window.conversationManager as ConversationManager;
    const tabManager = window.tabManager as TabManagerModule;
    const chatOrchestrator = window.chatOrchestrator as ChatOrchestrator;
    const user = auth.currentUser;

    if (!dom || !user || !convoManager || !tabManager || !chatOrchestrator) {
        console.warn("HomeDashboard: Missing critical dependencies. Cannot initialize.");
        return;
    }

    // 1. Personalize Greeting
    if (dom.homeViewGreeting) {
        const displayName = user.displayName || "User";
        dom.homeViewGreeting.textContent = `Welcome Back, ${displayName}!`;
    }

    // 2. Setup Quick Start Buttons
    dom.homeFindPartnerBtn?.addEventListener('click', () => tabManager.switchToTab('friends'));
    dom.homeJoinGroupBtn?.addEventListener('click', () => tabManager.switchToTab('groups'));

    // 3. Setup "Continue Last Chat" Button
    const activeConversations = convoManager.getActiveConversations();
    if (activeConversations && activeConversations.length > 0) {
        // Sort by lastActivity to find the most recent conversation
        const lastChat = activeConversations.sort((a, b) => (b.lastActivity as number) - (a.lastActivity as number))[0];
        
        if (lastChat && lastChat.connector) {
            const btn = dom.homeContinueChatBtn;
            const nameSpan = dom.homeLastChatName;
            if (btn && nameSpan) {
                nameSpan.textContent = lastChat.connector.profileName || "partner";
                btn.style.display = 'flex';
                // Use a clean, one-time event listener to avoid duplicates
                btn.onclick = () => {
                    chatOrchestrator.openConversation(lastChat.connector);
                };
            }
        }
    }
    
    // 4. Community Stats (dummy data for now, we'll make this real later)
    if(dom.communityCallsStat) dom.communityCallsStat.textContent = "1,204";
    if(dom.communityMessagesStat) dom.communityMessagesStat.textContent = "23,856";
    if(dom.communityUsersOnlineStat) dom.communityUsersOnlineStat.textContent = "78";

    console.log("Home Dashboard Initialized and Populated.");
}

// This is the one function we export to be called by app.ts
export function handleHomeTabActive() {
    // A small delay ensures all DOM elements are settled after a tab switch
    requestAnimationFrame(() => {
        initializeHomeDashboard();
    });
}