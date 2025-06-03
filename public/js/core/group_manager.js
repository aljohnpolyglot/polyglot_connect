// js/core/group_manager.js
// Facade for group chat functionality.

window.groupManager = (() => {
    'use strict';

    // Dependencies are the new specialized modules and some UI/helpers
    const getDeps = () => ({
        domElements: window.domElements, // Still needed by some direct calls here
        viewManager: window.viewManager,
        chatOrchestrator: window.chatOrchestrator,
        polyglotHelpers: window.polyglotHelpers, // For user typing timeout
        chatUiManager: window.chatUiManager, // For some direct UI state changes not in groupUiHandler

        groupDataManager: window.groupDataManager,
        groupUiHandler: window.groupUiHandler,
        groupInteractionLogic: window.groupInteractionLogic
    });

    // State directly managed by this facade (minimal)
    let currentGroupTutorObject = null;   // Full connector object
    let currentGroupMembersArray = [];  // Array of full connector objects (tutor + learners)
    let isUserTypingInGroup = false;
    let userTypingTimeoutId = null;


    function initialize() {
        const { groupDataManager, groupUiHandler, groupInteractionLogic } = getDeps();
        groupDataManager?.initialize();
        groupUiHandler?.initialize();
        // groupInteractionLogic is initialized when a group is joined.
        console.log("GroupManager (Facade): Initialized. Delegating to specialized managers.");
    }

    function getCurrentGroupData() {
        return getDeps().groupDataManager?.getCurrentGroupData();
    }
    
    function getFullCurrentGroupMembers() { // To pass to UI handlers if needed
        return [...currentGroupMembersArray];
    }

    function loadAvailableGroups(languageFilter = null) {
        const { groupUiHandler } = getDeps();
        // The joinGroupCallback is 'joinGroup' from this facade
        groupUiHandler?.displayAvailableGroups(languageFilter, joinGroup);
    }

    function joinGroup(groupOrGroupId) {
        const { groupDataManager, groupUiHandler, groupInteractionLogic, chatUiManager, viewManager, chatOrchestrator, domElements } = getDeps();
        const groupId = (typeof groupOrGroupId === 'object' && groupOrGroupId !== null) ? groupOrGroupId.id : groupOrGroupId;

        const groupDef = groupDataManager.getGroupDefinitionById(groupId);
        if (!groupDef) {
            console.error("GroupManager Facade: Group definition not found for ID:", groupId);
            return;
        }

        // If already in a group, leave it silently first
        if (groupDataManager.getCurrentGroupId()) {
            leaveCurrentGroup(false, false); // Leave silently, don't trigger UI list reload yet
        }

        console.log(`GroupManager Facade: Joining group "${groupDef.name}" (ID: ${groupId})`);
        console.log("GM JoinGroup: BEFORE setCurrentGroupContext, current dataManager group:", groupDataManager.getCurrentGroupId());
        groupDataManager.setCurrentGroupContext(groupId, groupDef); // Sets current group in dataManager and loads history
        console.log("GM JoinGroup: AFTER setCurrentGroupContext, current dataManager group:", groupDataManager.getCurrentGroupId());

        // Determine Tutor and Members
        currentGroupTutorObject = window.polyglotConnectors.find(c => c.id === groupDef.tutorId && c.languageRoles?.[groupDef.language]?.includes('tutor'));
        if (!currentGroupTutorObject) {
            currentGroupTutorObject = window.polyglotConnectors.find(c => c.languageRoles?.[groupDef.language]?.includes('tutor'));
        }
        if (!currentGroupTutorObject) {
            alert(`Tutor for "${groupDef.name}" (${groupDef.language}) could not be assigned.`);
            resetGroupState(); // Resets facade state
            groupDataManager.setCurrentGroupContext(null, null); // Resets data manager state
            return;
        }
        const learners = window.polyglotConnectors.filter(c => c.id !== currentGroupTutorObject.id && c.languageRoles?.[groupDef.language]?.includes('learner')).sort(() => 0.5 - Math.random());
        currentGroupMembersArray = [currentGroupTutorObject, ...learners.slice(0, groupDef.maxLearners || 3)];

        // Update UI
        const loadedHistory = groupDataManager.getLoadedChatHistory();
        groupUiHandler.showGroupChatView(groupDef, currentGroupMembersArray, loadedHistory);

        if (viewManager?.setActiveRightSidebarPanel) {
            viewManager.setActiveRightSidebarPanel('messagesChatListPanel');
            console.log("GM JoinGroup: BEFORE renderCombinedActiveChatsList");
            chatOrchestrator?.renderCombinedActiveChatsList();
        }

        // Initialize and start AI interaction logic
        groupInteractionLogic.initialize(currentGroupMembersArray, currentGroupTutorObject);
        if (loadedHistory.length === 0) {
            // Send welcome messages (could be moved to interactionLogic or UI handler too)
            sendWelcomeMessagesToGroup(groupDef, currentGroupTutorObject, currentGroupMembersArray);
        }
        groupInteractionLogic.startConversationFlow();
    }

    function sendWelcomeMessagesToGroup(groupDef, tutor, members) { // Now takes tutor/members
        const { groupUiHandler, groupDataManager } = getDeps();
        const welcome = `Welcome to "${groupDef.name}"! I'm ${tutor.profileName}, your tutor. Topic: ${groupDef.tags[0] || 'general chat'}. Introduce yourselves!`;
        groupUiHandler.appendMessageToGroupLog(welcome, tutor.profileName, false, tutor.id);
        groupDataManager.addMessageToCurrentGroupHistory({ speakerId: tutor.id, text: welcome, timestamp: Date.now() });

        members.filter(m => m.id !== tutor.id).slice(0, 2).forEach((learner, i) => {
            setTimeout(() => {
                if (groupDataManager.getCurrentGroupId() !== groupDef.id) return; // Check if still in group
                const msg = i === 0 ? `Hi, I'm ${learner.profileName}! Excited for ${groupDef.language} practice.` : `Hello! ${learner.profileName} here.`;
                groupUiHandler.appendMessageToGroupLog(msg, learner.profileName, false, learner.id);
                groupDataManager.addMessageToCurrentGroupHistory({ speakerId: learner.id, text: msg, timestamp: Date.now() });
                if (i === members.filter(m => m.id !== tutor.id).slice(0, 2).length - 1) {
                    groupDataManager.saveCurrentGroupChatHistory();
                }
            }, 1300 + i * 1700);
        });
        if (members.filter(m => m.id !== tutor.id).slice(0, 2).length === 0) {
            groupDataManager.saveCurrentGroupChatHistory();
        }
    }


    function userIsTypingInGroupSignal() {
        const { groupUiHandler, polyglotHelpers, groupInteractionLogic } = getDeps();
        isUserTypingInGroup = true;
        groupInteractionLogic.setUserTypingStatus(true); // Still inform logic so AI might wait

        // --- REMOVE OR COMMENT OUT THE UI UPDATE FOR "YOU ARE TYPING" ---
        console.log("GroupManager: User is typing (indicator display suppressed).");
        // --- END REMOVAL ---

        clearTimeout(userTypingTimeoutId);
        userTypingTimeoutId = setTimeout(() => {
            isUserTypingInGroup = false;
            groupInteractionLogic.setUserTypingStatus(false);
            // No need to clear the indicator here if we're not setting it for the user
        }, 2500); // Keep timeout to reset internal isUserTypingInGroup flag
    }

    function leaveCurrentGroup(triggerReload = true, updateSidebar = true) {
        console.log("GroupManager Facade: leaveCurrentGroup called.");
        const { groupInteractionLogic, groupUiHandler, groupDataManager, viewManager, chatOrchestrator } = getDeps();

        groupInteractionLogic.stopConversationFlow();

        let needsFinalRender = true;
        
        // Save current group history if exists, but suppress its automatic render
        if (groupDataManager.getCurrentGroupId()) {
            console.log("GroupManager Facade: Performing final save for group:", groupDataManager.getCurrentGroupId());
            groupDataManager.saveCurrentGroupChatHistory(false); // Don't trigger list update from save
        }

        groupUiHandler.hideGroupChatViewAndShowList();
        resetGroupState(); // Resets facade's minimal state
        groupDataManager.setCurrentGroupContext(null, null); // Resets data manager's current group
        groupInteractionLogic.reset(); // Resets interaction logic state

        // Handle sidebar panel updates
        if (updateSidebar && viewManager) {
            const currentTab = viewManager.getCurrentActiveTab?.() || null;
            if (currentTab === 'groups' && !triggerReload) {
                viewManager.setActiveRightSidebarPanel('groupsFiltersPanel');
            }
        }

        // If reloading groups list, that view will handle its own rendering
        if (triggerReload && viewManager?.getCurrentActiveTab?.() === 'groups') {
            loadAvailableGroups(); // Re-renders the main group list
            needsFinalRender = false; // Skip final render since view is changing
        }
        
        // Single, definitive render after all state changes are complete
        if (needsFinalRender) {
            console.log("GroupManager Facade: Performing final render of active chats list");
            chatOrchestrator?.renderCombinedActiveChatsList();
        }
    }

    function resetGroupState() { // Resets only the facade's direct state
        const { groupUiHandler } = getDeps();
        currentGroupTutorObject = null;
        currentGroupMembersArray = [];
        isUserTypingInGroup = false;
        if (userTypingTimeoutId) clearTimeout(userTypingTimeoutId);
        // UI clearing for input/log is handled by groupUiHandler or when joining new group
        groupUiHandler?.updateGroupTypingIndicator(''); // Ensure this is cleared
        groupUiHandler?.clearGroupInput();
    }

    function handleUserMessageInGroup() { // Called by event listener in chatUiManager
        const { domElements, groupInteractionLogic } = getDeps();
        const text = domElements?.groupChatInput?.value.trim();
        groupInteractionLogic?.handleUserMessage(text);
    }
    
    function isCurrentlyJoined(groupId) { // For external checks if needed
        return getDeps().groupDataManager.isGroupJoined(groupId);
    }

    function getAllGroupDataWithLastActivity() { // For chat orchestrator
        return getDeps().groupDataManager.getAllGroupDataWithLastActivity();
    }


    console.log("core/group_manager.js (Facade) loaded.");
    return {
        initialize,
        loadAvailableGroups,
        joinGroup,
        leaveCurrentGroup,
        handleUserMessageInGroup, // This will be called by the event listener (e.g. in chatUiManager)
        userIsTyping: userIsTypingInGroupSignal,
        getCurrentGroupData,
        getAllGroupDataWithLastActivity, // For chat orchestrator
        isGroupJoined: isCurrentlyJoined, // Expose the correct function
        // For debug or direct control if ever needed
        // getFullCurrentGroupMembers 
    };
})();