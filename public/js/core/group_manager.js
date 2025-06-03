// js/core/group_manager.js
// Facade for group chat functionality.

console.log("group_manager.js: Script execution STARTED.");

window.groupManager = (() => {
    'use strict';
    console.log("group_manager.js: IIFE (module definition) STARTING.");

    const getDeps = () => {
        // console.log("group_manager.js: getDeps() called.");
        const deps = {
            domElements: window.domElements,
            viewManager: window.viewManager,
            chatOrchestrator: window.chatOrchestrator,
            polyglotHelpers: window.polyglotHelpers,
            chatUiManager: window.chatUiManager,
            groupDataManager: window.groupDataManager,
            groupUiHandler: window.groupUiHandler,
            groupInteractionLogic: window.groupInteractionLogic
        };
        // Minimal logging here to reduce noise, focus on function calls
        return deps;
    };

    let currentGroupTutorObject = null;
    let currentGroupMembersArray = [];
    let isUserTypingInGroup = false;
    let userTypingTimeoutId = null;

    function initialize() {
        console.log("group_manager.js: initialize() - START.");
        const { groupDataManager, groupUiHandler } = getDeps();
        if (groupDataManager?.initialize) {
            groupDataManager.initialize();
            console.log("group_manager.js: groupDataManager initialized.");
        } else {
            console.warn("group_manager.js: groupDataManager.initialize not found.");
        }
        if (groupUiHandler?.initialize) {
            groupUiHandler.initialize();
            console.log("group_manager.js: groupUiHandler initialized.");
        } else {
            console.warn("group_manager.js: groupUiHandler.initialize not found.");
        }
        console.log("GroupManager (Facade): Initialized. Delegating to specialized managers.");
        console.log("group_manager.js: initialize() - FINISHED.");
    }

    function getCurrentGroupData() {
        // console.log("group_manager.js: getCurrentGroupData() called.");
        const { groupDataManager } = getDeps();
        return groupDataManager?.getCurrentGroupData();
    }
    
    function getFullCurrentGroupMembers() {
        // console.log("group_manager.js: getFullCurrentGroupMembers() called. Returning count:", currentGroupMembersArray.length);
        return [...currentGroupMembersArray]; // Return a copy
    }

    function loadAvailableGroups(languageFilter = null) {
        console.log("group_manager.js: loadAvailableGroups() - START. Language filter:", languageFilter);
        const { groupUiHandler } = getDeps();
        if (groupUiHandler?.displayAvailableGroups) {
            groupUiHandler.displayAvailableGroups(languageFilter, joinGroup);
        } else {
            console.error("group_manager.js: groupUiHandler.displayAvailableGroups not found.");
        }
        console.log("group_manager.js: loadAvailableGroups() - FINISHED.");
    }

    function joinGroup(groupOrGroupId) {
        console.log("group_manager.js: joinGroup() - START. Input:", groupOrGroupId);
        const { groupDataManager, groupUiHandler, groupInteractionLogic, viewManager, chatOrchestrator } = getDeps();

        if (!groupDataManager || !groupUiHandler || !groupInteractionLogic || !viewManager || !chatOrchestrator) {
            console.error("GroupManager: joinGroup - One or more critical dependencies missing!");
            return;
        }

        const groupId = (typeof groupOrGroupId === 'object' && groupOrGroupId !== null) ? groupOrGroupId.id : groupOrGroupId;
        console.log("GroupManager: joinGroup - Determined groupId:", groupId);

        const groupDef = groupDataManager.getGroupDefinitionById(groupId);
        console.log("GroupManager: joinGroup - Fetched groupDef for ID", groupId, ":", groupDef);

        if (!groupDef || !groupDef.name) { // Added check for groupDef.name
            console.error("GroupManager Facade: Group definition (or its name) not found for ID:", groupId, "groupDef:", groupDef);
            alert(`Error: Could not find details for group ID ${groupId}. Please try another group.`);
            return;
        }

        if (groupDataManager.getCurrentGroupId() && groupDataManager.getCurrentGroupId() !== groupId) {
            console.log("GroupManager: Was in group", groupDataManager.getCurrentGroupId(), "- leaving it silently before joining", groupId);
            leaveCurrentGroup(false, false); // Leave silently, don't trigger UI list reload yet
        } else if (groupDataManager.getCurrentGroupId() === groupId) {
            console.log("GroupManager: Already in group", groupId, ". Ensuring UI is consistent.");
            // Already in this group, ensure UI is correctly shown (e.g., after tab switch)
             const loadedHistory = groupDataManager.getLoadedChatHistory();
            if(groupUiHandler.showGroupChatView){ // check if function exists
                 groupUiHandler.showGroupChatView(groupDef, currentGroupMembersArray, loadedHistory);
                 console.log("GroupManager: Refreshed view for already joined group:", groupId);
            } else {
                console.error("GroupManager: groupUiHandler.showGroupChatView is not a function when trying to refresh view for already joined group.");
            }
            if (viewManager.setActiveRightSidebarPanel) {
                viewManager.setActiveRightSidebarPanel('messagesChatListPanel');
            }
            if (chatOrchestrator.renderCombinedActiveChatsList) {
                 chatOrchestrator.renderCombinedActiveChatsList();
            }
            return; // Don't re-join
        }


        console.log(`GroupManager Facade: Joining group "${groupDef.name}" (ID: ${groupId})`);
        groupDataManager.setCurrentGroupContext(groupId, groupDef);
        console.log("GroupManager: joinGroup - groupDataManager.setCurrentGroupContext called.");


        currentGroupTutorObject = window.polyglotConnectors.find(c => c.id === groupDef.tutorId && c.languageRoles?.[groupDef.language]?.includes('tutor'));
        if (!currentGroupTutorObject) {
            console.warn(`GroupManager: Tutor ID ${groupDef.tutorId} not found or not a tutor for ${groupDef.language}. Trying to find any tutor for the language.`);
            currentGroupTutorObject = window.polyglotConnectors.find(c => c.languageRoles?.[groupDef.language]?.includes('tutor'));
        }
        console.log("GroupManager: joinGroup - Tutor object:", currentGroupTutorObject?.id);

        if (!currentGroupTutorObject) {
            alert(`Critical Error: Tutor for language "${groupDef.language}" in group "${groupDef.name}" could not be assigned. Group cannot be joined.`);
            console.error(`GroupManager: No tutor found for group ${groupId} with language ${groupDef.language}.`);
            resetGroupState();
            groupDataManager.setCurrentGroupContext(null, null);
            return;
        }

        const learners = window.polyglotConnectors.filter(c => c.id !== currentGroupTutorObject.id && c.languageRoles?.[groupDef.language]?.includes('learner')).sort(() => 0.5 - Math.random());
        currentGroupMembersArray = [currentGroupTutorObject, ...learners.slice(0, groupDef.maxLearners || 3)];
        console.log("GroupManager: joinGroup - currentGroupMembersArray populated. Count:", currentGroupMembersArray.length, "Members:", currentGroupMembersArray.map(m=>m.id));

        const loadedHistory = groupDataManager.getLoadedChatHistory();
        console.log("GroupManager: joinGroup - Loaded history count:", loadedHistory.length);

        // CRITICAL: Check groupDef.name and currentGroupMembersArray before passing
        if (groupDef.name && currentGroupMembersArray && currentGroupMembersArray.length > 0) {
            if (groupUiHandler.showGroupChatView) {
                groupUiHandler.showGroupChatView(groupDef, currentGroupMembersArray, loadedHistory);
            } else {
                console.error("GroupManager: groupUiHandler.showGroupChatView is not available!");
            }
        } else {
            console.error("GroupManager: joinGroup - Cannot show group chat view due to missing groupDef.name or empty currentGroupMembersArray.", { name: groupDef.name, members: currentGroupMembersArray });
            // Potentially reset and exit if this is a critical failure state
            resetGroupState();
            groupDataManager.setCurrentGroupContext(null, null);
            return;
        }


        if (viewManager?.setActiveRightSidebarPanel) {
            viewManager.setActiveRightSidebarPanel('messagesChatListPanel');
        }
        if (chatOrchestrator?.renderCombinedActiveChatsList) {
            console.log("GM JoinGroup: Calling renderCombinedActiveChatsList");
            chatOrchestrator.renderCombinedActiveChatsList();
        }


        if (groupInteractionLogic?.initialize && groupInteractionLogic?.startConversationFlow) {
            groupInteractionLogic.initialize(currentGroupMembersArray, currentGroupTutorObject);
            if (loadedHistory.length === 0) {
                sendWelcomeMessagesToGroup(groupDef, currentGroupTutorObject, currentGroupMembersArray);
            }
            groupInteractionLogic.startConversationFlow();
        } else {
            console.error("GroupManager: groupInteractionLogic.initialize or startConversationFlow not available.");
        }
        console.log("group_manager.js: joinGroup() - FINISHED for group:", groupId);
    }

    function sendWelcomeMessagesToGroup(groupDef, tutor, members) {
        console.log("group_manager.js: sendWelcomeMessagesToGroup() - START for group:", groupDef?.name);
        const { groupUiHandler, groupDataManager } = getDeps();

        if (!groupDef || !tutor || !members || !groupUiHandler || !groupDataManager) {
            console.error("sendWelcomeMessagesToGroup: Missing critical parameters or dependencies.");
            return;
        }

        const welcome = `Welcome to "${groupDef.name}"! I'm ${tutor.profileName}, your tutor. Topic: ${groupDef.tags?.[0] || 'general chat'}. Introduce yourselves!`;
        groupUiHandler.appendMessageToGroupLog(welcome, tutor.profileName, false, tutor.id);
        groupDataManager.addMessageToCurrentGroupHistory({ speakerId: tutor.id, text: welcome, timestamp: Date.now() });

        const learnersInWelcome = members.filter(m => m.id !== tutor.id).slice(0, 2);
        learnersInWelcome.forEach((learner, i) => {
            setTimeout(() => {
                if (groupDataManager.getCurrentGroupId() !== groupDef.id) {
                    console.log("sendWelcomeMessagesToGroup: No longer in group", groupDef.id, "Aborting welcome for learner", learner.id);
                    return;
                }
                const msg = i === 0 ? `Hi, I'm ${learner.profileName}! Excited for ${groupDef.language} practice.` : `Hello! ${learner.profileName} here.`;
                groupUiHandler.appendMessageToGroupLog(msg, learner.profileName, false, learner.id);
                groupDataManager.addMessageToCurrentGroupHistory({ speakerId: learner.id, text: msg, timestamp: Date.now() });
                if (i === learnersInWelcome.length - 1) { // Save after the last scheduled learner message
                    groupDataManager.saveCurrentGroupChatHistory();
                }
            }, 1300 + i * 1700);
        });
        if (learnersInWelcome.length === 0) { // If no learners to send welcome for, save immediately
            groupDataManager.saveCurrentGroupChatHistory();
        }
        console.log("group_manager.js: sendWelcomeMessagesToGroup() - FINISHED for group:", groupDef.name);
    }


    function userIsTypingInGroupSignal() {
        // console.log("group_manager.js: userIsTypingInGroupSignal() called.");
        const { groupInteractionLogic } = getDeps(); // polyglotHelpers, groupUiHandler removed for suppression
        isUserTypingInGroup = true;
        if (groupInteractionLogic?.setUserTypingStatus) {
            groupInteractionLogic.setUserTypingStatus(true);
        }

        // UI update for "You are typing" is suppressed as per your comment.
        // console.log("GroupManager: User is typing (indicator display suppressed).");

        clearTimeout(userTypingTimeoutId);
        userTypingTimeoutId = setTimeout(() => {
            isUserTypingInGroup = false;
            if (groupInteractionLogic?.setUserTypingStatus) {
                groupInteractionLogic.setUserTypingStatus(false);
            }
            // No need to clear the UI indicator if it wasn't set for the user.
        }, 2500);
    }

    function leaveCurrentGroup(triggerReload = true, updateSidebar = true) {
        console.log("group_manager.js: leaveCurrentGroup() - START. TriggerReload:", triggerReload, "UpdateSidebar:", updateSidebar);
        const { groupInteractionLogic, groupUiHandler, groupDataManager, viewManager, chatOrchestrator } = getDeps();

        if (!groupInteractionLogic || !groupUiHandler || !groupDataManager || !viewManager || !chatOrchestrator) {
            console.error("GroupManager: leaveCurrentGroup - One or more critical dependencies missing!");
            return;
        }

        groupInteractionLogic.stopConversationFlow?.();

        let needsFinalRenderOfChatList = updateSidebar; // If sidebar update is requested, it usually implies a list re-render
        
        if (groupDataManager.getCurrentGroupId()) {
            console.log("GroupManager Facade: Performing final save for group:", groupDataManager.getCurrentGroupId());
            groupDataManager.saveCurrentGroupChatHistory(false);
        }

        groupUiHandler.hideGroupChatViewAndShowList?.();
        resetGroupState();
        groupDataManager.setCurrentGroupContext(null, null);
        groupInteractionLogic.reset?.();

        if (updateSidebar && viewManager?.setActiveRightSidebarPanel) {
            const currentTab = viewManager.getCurrentActiveTab?.();
            if (currentTab === 'groups') { // Only change sidebar panel if on groups tab
                 console.log("GroupManager: On groups tab, setting right sidebar to groupsFiltersPanel.");
                viewManager.setActiveRightSidebarPanel('groupsFiltersPanel');
            } else {
                console.log("GroupManager: Not on groups tab, sidebar panel not changed by leaveGroup.");
            }
        }

        if (triggerReload && viewManager?.getCurrentActiveTab?.() === 'groups') {
            console.log("GroupManager: Reloading available groups list.");
            loadAvailableGroups();
            needsFinalRenderOfChatList = false; // loadAvailableGroups will update UI, potentially active chats list if sidebar is visible and showing it
        }
        
        if (needsFinalRenderOfChatList && chatOrchestrator?.renderCombinedActiveChatsList) {
            console.log("GroupManager Facade: Calling renderCombinedActiveChatsList after leaving group.");
            chatOrchestrator.renderCombinedActiveChatsList();
        }
        console.log("group_manager.js: leaveCurrentGroup() - FINISHED.");
    }

    function resetGroupState() {
        console.log("group_manager.js: resetGroupState() called.");
        const { groupUiHandler } = getDeps();
        currentGroupTutorObject = null;
        currentGroupMembersArray = [];
        isUserTypingInGroup = false;
        if (userTypingTimeoutId) clearTimeout(userTypingTimeoutId);
        groupUiHandler?.updateGroupTypingIndicator('');
        groupUiHandler?.clearGroupInput();
    }

    function handleUserMessageInGroup() {
        console.log("group_manager.js: handleUserMessageInGroup() called.");
        const { domElements, groupInteractionLogic } = getDeps();
        const text = domElements?.groupChatInput?.value.trim();
        console.log("GroupManager: User message text:", text ? text.substring(0,30) + "..." : "EMPTY");
        if (groupInteractionLogic?.handleUserMessage) {
            groupInteractionLogic.handleUserMessage(text);
        } else {
            console.error("GroupManager: groupInteractionLogic.handleUserMessage not available.");
        }
    }
    
    function isCurrentlyJoined(groupId) {
        // console.log("group_manager.js: isCurrentlyJoined() called for group:", groupId);
        const { groupDataManager } = getDeps();
        return groupDataManager?.isGroupJoined(groupId);
    }

    function getAllGroupDataWithLastActivity() {
        // console.log("group_manager.js: getAllGroupDataWithLastActivity() called.");
        const { groupDataManager } = getDeps();
        return groupDataManager?.getAllGroupDataWithLastActivity();
    }

    console.log("group_manager.js: IIFE (module definition) FINISHED. Returning exported object.");
    return {
        initialize,
        loadAvailableGroups,
        joinGroup,
        leaveCurrentGroup,
        handleUserMessageInGroup,
        userIsTyping: userIsTypingInGroupSignal,
        getCurrentGroupData,
        getAllGroupDataWithLastActivity,
        isGroupJoined: isCurrentlyJoined,
        getFullCurrentGroupMembers // EXPOSED FOR view_manager
    };
})();

if (window.groupManager && typeof window.groupManager.initialize === 'function') {
    console.log("group_manager.js: SUCCESSFULLY assigned to window.groupManager and initialize is present.");
} else {
    console.error("group_manager.js: CRITICAL ERROR - window.groupManager or its initialize method IS UNDEFINED/INVALID after IIFE execution.");
}
console.log("group_manager.js: Script execution FINISHED.");