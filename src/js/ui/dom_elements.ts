// D:\polyglot_connect\src\js\ui\dom_elements.ts
// Centralized DOM element selectors for easy access and maintenance.

// We don't need to 'import type { YourDomElements }' here because this file *defines*
// the object that should match the YourDomElements interface for window.domElements.
// The global.d.ts file handles typing window.domElements.

window.domElements = {
    // App Shell
    appShell: document.getElementById('polyglot-connect-app-shell') as HTMLElement | null,
    leftSidebar: document.getElementById('left-sidebar') as HTMLElement | null,
    mainNavItems: document.querySelectorAll('#left-sidebar .nav-item') as NodeListOf<HTMLElement>,
    mainContainer: document.getElementById('main-container') as HTMLElement | null,
    mainViews: document.querySelectorAll('#main-container .view') as NodeListOf<HTMLElement>,
    rightSidebar: document.getElementById('right-sidebar') as HTMLElement | null,
    rightSidebarPanels: document.querySelectorAll('#right-sidebar .sidebar-panel') as NodeListOf<HTMLElement>,
    themeToggleButton: document.getElementById('toggle-theme-btn') as HTMLButtonElement | null,
    universalJumpButtons: document.getElementById('universal-jump-buttons') as HTMLElement | null,
   
    devPanelToggleButton: document.getElementById('dev-panel-toggle-btn') as HTMLButtonElement | null, // <<< ADD THIS
    personaModalViewDossierBtn: document.getElementById('persona-modal-view-dossier-btn') as HTMLButtonElement | null,
    // Home View
  // in dom_elements.ts
// Home View (Now a Dashboard)
homeViewGreeting: document.getElementById('home-view-greeting') as HTMLElement | null,
homeFindPartnerBtn: document.getElementById('home-find-partner-btn') as HTMLButtonElement | null, // FIX: Use getElementById to get a single element
homeJoinGroupBtn: document.getElementById('home-join-group-btn') as HTMLButtonElement | null,
homeContinueChatBtn: document.getElementById('home-continue-chat-btn') as HTMLButtonElement | null,
homeLastChatName: document.getElementById('home-last-chat-name') as HTMLElement | null,
communityCallsStat: document.getElementById('community-calls-stat') as HTMLElement | null,
communityMessagesStat: document.getElementById('community-messages-stat') as HTMLElement | null,
communityUsersOnlineStat: document.getElementById('community-users-online-stat') as HTMLElement | null,

// Account Panel (in Right Sidebar)
accountPanel: document.getElementById('accountPanel') as HTMLElement | null,
accountPanelAvatar: document.getElementById('account-panel-avatar') as HTMLImageElement | null,
accountPanelDisplayName: document.getElementById('account-panel-display-name') as HTMLElement | null,
accountPanelEmail: document.getElementById('account-panel-email') as HTMLElement | null,
accountPanelPlanDetails: document.getElementById('account-panel-plan-details') as HTMLElement | null,
accountPanelSignOutBtn: document.getElementById('account-panel-sign-out-btn') as HTMLButtonElement | null,

     // Find Someone View (Now "Friends View")
     friendsView: document.getElementById('friends-view') as HTMLElement | null,
     connectorHubGrid: document.getElementById('connector-hub') as HTMLElement | null,
     friendsEmptyPlaceholder: document.getElementById('friends-empty-placeholder') as HTMLElement | null,
 
     // --- Filters for Friends/Discover View ---
     friendsFiltersPanel: document.getElementById('friendsFiltersPanel') as HTMLElement | null,
     filterConnectorNameInput: document.getElementById('filter-connector-name') as HTMLInputElement | null,
     filterLanguageSelect: document.getElementById('filter-language') as HTMLSelectElement | null,
     filterRoleSelect: document.getElementById('filter-role') as HTMLSelectElement | null,
     applyFiltersBtn: document.getElementById('apply-filters-btn') as HTMLButtonElement | null,
  // Groups View
  groupsView: document.getElementById('groups-view') as HTMLElement | null,
  groupListContainer: document.getElementById('group-list-container') as HTMLElement | null,
  availableGroupsUl: document.getElementById('available-groups-ul') as HTMLUListElement | null,
  groupsEmptyPlaceholder: document.getElementById('groups-empty-placeholder') as HTMLElement | null,
  groupLoadingMessage: document.getElementById('group-loading-message') as HTMLElement | null,
  groupChatInterfaceDiv: document.getElementById('group-chat-interface') as HTMLElement | null,
  activeGroupNameHeader: document.getElementById('active-group-name') as HTMLElement | null,
  groupChatMembersAvatarsDiv: document.getElementById('group-chat-members-avatars') as HTMLElement | null,
  groupChatLogDiv: document.getElementById('group-chat-log') as HTMLElement | null,
  groupTypingIndicator: document.getElementById('group-typing-indicator') as HTMLElement | null,
  groupChatInput: document.getElementById('group-chat-input') as HTMLInputElement | null,
  sendGroupMessageBtn: document.getElementById('send-group-message-btn') as HTMLButtonElement | null,
  leaveGroupBtn: document.getElementById('leave-group-btn') as HTMLButtonElement | null,
  filterGroupCategorySelect: document.getElementById('filter-group-category') as HTMLSelectElement | null,
  filterGroupNameInput: document.getElementById('filter-group-name') as HTMLInputElement | null,
  // --- CORRECTED PLACEMENT FOR GROUP IMAGE ELEMENTS ---
  imagePreviewContainerGroup: document.getElementById('image-preview-container-group') as HTMLElement | null,
  groupImageCaptionInput: document.getElementById('group-image-caption-input') as HTMLInputElement | null,
  groupChatAttachBtn: document.getElementById('group-chat-attach-btn') as HTMLButtonElement | null,
  groupChatImageUpload: document.getElementById('group-chat-image-upload') as HTMLInputElement | null,
  groupChatMicBtn: document.getElementById('group-chat-mic-btn') as HTMLButtonElement | null,
  // --- END CORRECTED PLACEMENT ---
  groupsFiltersPanel: document.getElementById('groupsFiltersPanel') as HTMLElement | null,
  filterGroupLanguageSelect: document.getElementById('filter-group-language') as HTMLSelectElement | null,
  applyGroupFiltersBtn: document.getElementById('apply-group-filters-btn') as HTMLButtonElement | null,
  // Group Members Modal (New)
  groupHeaderInfoTrigger: document.getElementById('group-header-info-trigger') as HTMLElement | null,
  groupMembersModal: document.getElementById('group-members-modal') as HTMLElement | null,
 
 
 
  closeGroupMembersModalBtn: document.getElementById('close-group-members-modal-btn') as HTMLButtonElement | null,
  gmmGroupPhoto: document.getElementById('gmm-group-photo') as HTMLImageElement | null,
  gmmGroupName: document.getElementById('gmm-group-name') as HTMLElement | null,
  gmmGroupDescription: document.getElementById('gmm-group-description') as HTMLElement | null,
  gmmMemberCount: document.getElementById('gmm-member-count') as HTMLSpanElement | null,
  gmmMemberSearchInput: document.getElementById('gmm-member-search-input') as HTMLInputElement | null,
  gmmMembersListUl: document.getElementById('gmm-members-list') as HTMLUListElement | null,
  gmmModalFooter: document.querySelector('#group-members-modal .gmm-modal-footer') as HTMLElement | null,
  gmmCtaBtn: document.getElementById('gmm-cta-btn') as HTMLButtonElement | null,

   // Messages View (Embedded Chat)
   messagesView: document.getElementById('messages-view') as HTMLElement | null,
   embeddedChatHeaderAvatar: document.getElementById('embedded-chat-header-avatar') as HTMLImageElement | null,
   embeddedChatHeaderName: document.getElementById('embedded-chat-header-name') as HTMLElement | null,
   embeddedChatHeaderDetails: document.getElementById('embedded-chat-header-details') as HTMLElement | null,
   embeddedChatCallBtn: document.getElementById('embedded-chat-call-btn') as HTMLButtonElement | null,
   embeddedChatInfoBtn: document.getElementById('embedded-chat-info-btn') as HTMLButtonElement | null,
   messagesPlaceholder: document.getElementById('messages-placeholder') as HTMLElement | null,
   embeddedChatContainer: document.getElementById('embedded-chat-container') as HTMLElement | null,
   embeddedChatLog: document.getElementById('embedded-chat-log') as HTMLElement | null,
   embeddedMessageAttachBtn: document.getElementById('embedded-message-attach-btn') as HTMLButtonElement | null,
   embeddedMessageImageUpload: document.getElementById('embedded-message-image-upload') as HTMLInputElement | null,
   embeddedMessageTextInput: document.getElementById('embedded-message-text-input') as HTMLInputElement | null,
   embeddedMessageSendBtn: document.getElementById('embedded-message-send-btn') as HTMLButtonElement | null,
   embeddedMessageMicBtn: document.getElementById('embedded-message-mic-btn') as HTMLButtonElement | null,
   // --- ENSURE THESE ARE DEFINED ONLY ONCE HERE ---
   imagePreviewContainerEmbedded: document.getElementById('image-preview-container-embedded') as HTMLElement | null,
   embeddedImageCaptionInput: document.getElementById('embedded-image-caption-input') as HTMLInputElement | null,
   // --- END ENSURE ---
   messagesChatListPanel: document.getElementById('messagesChatListPanel') as HTMLElement | null,
   chatListUl: document.getElementById('chat-list-ul') as HTMLUListElement | null,
   searchActiveChatsInput: document.getElementById('search-active-chats-input') as HTMLInputElement | null, // <<< ADD THIS
   emptyChatListMsg: document.getElementById('empty-chat-list-msg') as HTMLElement | null,

   // Messaging Modal
   messagingInterface: document.getElementById('messaging-interface') as HTMLElement | null,
   messageModalHeaderAvatar: document.getElementById('message-modal-header-avatar') as HTMLImageElement | null,
   messageModalHeaderName: document.getElementById('message-modal-header-name') as HTMLElement | null,
   messageModalHeaderDetails: document.getElementById('message-modal-header-details') as HTMLElement | null,
   messageModalCallBtn: document.getElementById('message-modal-call-btn') as HTMLButtonElement | null,
   messageModalInfoBtn: document.getElementById('message-modal-info-btn') as HTMLButtonElement | null,
   messageChatLog: document.getElementById('message-chat-log') as HTMLElement | null,
   messageModalAttachBtn: document.getElementById('message-modal-attach-btn') as HTMLButtonElement | null,
   messageModalImageUpload: document.getElementById('message-modal-image-upload') as HTMLInputElement | null,
   // --- ENSURE THESE ARE DEFINED ONLY ONCE HERE ---
   imagePreviewContainerModal: document.getElementById('image-preview-container-modal') as HTMLElement | null,
   modalImageCaptionInput: document.getElementById('modal-image-caption-input') as HTMLInputElement | null,
   // --- END ENSURE ---
   messageTextInput: document.getElementById('message-text-input') as HTMLInputElement | null,
   messageSendBtn: document.getElementById('message-send-btn') as HTMLButtonElement | null,
   messageModalMicBtn: document.getElementById('message-modal-mic-btn') as HTMLButtonElement | null,
   closeMessagingModalBtn: document.getElementById('close-messaging-modal-btn') as HTMLButtonElement | null,
   
    // Summary View
    summaryView: document.getElementById('summary-view') as HTMLElement | null,
    summaryViewContent: document.getElementById('summary-view-content') as HTMLElement | null,
    summaryTabHeader: document.getElementById('summary-for-partner-name') as HTMLElement | null,
    summaryPlaceholder: document.getElementById('summary-placeholder') as HTMLElement | null,
  summaryChatListPanel: document.getElementById('summaryChatListPanel') as HTMLElement | null, // Match HTML id
    summaryListUl: document.getElementById('summary-list-ul') as HTMLUListElement | null,
    searchSessionHistoryInput: document.getElementById('search-session-history-input') as HTMLInputElement | null, // <<< ADD THIS
    emptySummaryListMsg: document.getElementById('empty-summary-list-msg') as HTMLElement | null,

    // Detailed Persona Modal
    detailedPersonaModal: document.getElementById('detailed-persona-modal') as HTMLElement | null,
    closePersonaModalBtn: document.getElementById('close-persona-modal-btn') as HTMLButtonElement | null,
    personaModalAvatar: document.getElementById('persona-modal-avatar') as HTMLImageElement | null,
    personaModalName: document.getElementById('persona-modal-name') as HTMLElement | null,
    personaModalLocationAge: document.getElementById('persona-modal-location-age') as HTMLElement | null,
    personaModalActiveStatus: document.getElementById('persona-modal-active-status') as HTMLElement | null,
    personaModalBio: document.getElementById('persona-modal-bio') as HTMLElement | null,
    personaModalLanguagesUl: document.getElementById('persona-modal-languages') as HTMLElement | null, // This is a div in HTML
    personaModalInterestsUl: document.getElementById('persona-modal-interests') as HTMLUListElement | null,
    personaModalGallery: document.getElementById('persona-modal-gallery') as HTMLElement | null,
    personaModalMessageBtn: document.getElementById('persona-modal-start-message-btn') as HTMLButtonElement | null,
    personaModalDirectCallBtn: document.getElementById('persona-modal-start-directcall-btn') as HTMLButtonElement | null,

    // Virtual Calling Screen Modal
    ringtoneAudio: document.getElementById('ringtone-audio') as HTMLAudioElement | null,
    processingCallModal: document.getElementById('processing-call-modal'),
    
    
    virtualCallingScreen: document.getElementById('virtual-calling-screen') as HTMLElement | null,
    callingAvatar: document.getElementById('calling-avatar') as HTMLImageElement | null,
    callingName: document.getElementById('calling-name') as HTMLElement | null,
    callingStatus: document.getElementById('calling-status') as HTMLElement | null,
    cancelCallBtn: document.getElementById('cancel-call-btn') as HTMLButtonElement | null,

    // Direct Call Modal
    directCallInterface: document.getElementById('direct-call-interface') as HTMLElement | null,
    directCallActiveAvatar: document.getElementById('direct-call-active-avatar') as HTMLImageElement | null,
    directCallActiveName: document.getElementById('direct-call-active-name') as HTMLElement | null,
    directCallStatusIndicator: document.getElementById('direct-call-status-indicator') as HTMLElement | null,
    directCallMuteBtn: document.getElementById('direct-call-mute-btn') as HTMLButtonElement | null,
    directCallEndBtn: document.getElementById('direct-call-end-btn') as HTMLButtonElement | null,
    directCallSpeakerToggleBtn: document.getElementById('direct-call-speaker-toggle-btn') as HTMLButtonElement | null,
    directCallActivityBtn: document.getElementById('direct-call-activity-btn') as HTMLButtonElement | null, // May be null if not in DOM
    directCallMainContent: document.querySelector('#direct-call-interface .direct-call-main-content') as HTMLElement | null,
    directCallActivityArea: document.getElementById('direct-call-activity-area') as HTMLElement | null,
    directCallActivityImageDisplay: document.getElementById('direct-call-activity-image-display') as HTMLImageElement | null,


    // Session Recap Modal
    sessionRecapScreen: document.getElementById('session-recap-screen') as HTMLElement | null,
    recapConnectorName: document.getElementById('recap-connector-name') as HTMLElement | null,
    recapDate: document.getElementById('recap-date') as HTMLSpanElement | null,
    recapDuration: document.getElementById('recap-duration') as HTMLSpanElement | null,
    recapTopicsList: document.getElementById('recap-topics') as HTMLUListElement | null,
    recapVocabularyList: document.getElementById('recap-vocabulary') as HTMLUListElement | null,
    recapFocusAreasList: document.getElementById('recap-focus-areas') as HTMLUListElement | null,
    closeRecapBtn: document.getElementById('close-recap-btn') as HTMLButtonElement | null,
    downloadTranscriptBtn: document.getElementById('recap-download-transcript-btn') as HTMLButtonElement | null, // HTML id is recap-download-transcript-btn
    // New recap elements from HTML
    recapConversationSummaryText: document.getElementById('recap-conversation-summary-text') as HTMLElement | null,
    recapGoodUsageList: document.getElementById('recap-good-usage-list') as HTMLUListElement | null,
    recapPracticeActivitiesList: document.getElementById('recap-practice-activities-list') as HTMLUListElement | null,
    recapOverallEncouragementText: document.getElementById('recap-overall-encouragement-text') as HTMLElement | null,

    // Additional Selectors
    groupsViewHeader: document.querySelector('#groups-view > .view-header') as HTMLElement | null,
    upgradeLimitModal: document.getElementById('upgrade-limit-modal') as HTMLElement | null,
    closeUpgradeModalBtn: document.getElementById('close-upgrade-modal-btn') as HTMLButtonElement | null,
    upgradeModalCtaBtn: document.getElementById('upgrade-modal-cta-btn') as HTMLButtonElement | null,
    upgradeModalMaybeLaterBtn: document.getElementById('upgrade-modal-maybe-later-btn') as HTMLButtonElement | null,
    upgradeCallLimitModal: document.getElementById('upgrade-call-limit-modal') as HTMLElement | null,
    closeUpgradeCallModalBtn: document.getElementById('close-upgrade-call-modal-btn') as HTMLButtonElement | null,
    upgradeCallModalMaybeLaterBtn: document.getElementById('upgrade-call-modal-maybe-later-btn') as HTMLButtonElement | null,
  };

console.log('ui/dom_elements.ts loaded and assigned to window.domElements.');

// Dispatch an event to signal that domElements are ready
// This is crucial if other scripts (classic or module) need to ensure domElements is set
// before they try to access it, especially if their initialization also happens early.
document.dispatchEvent(new CustomEvent('domElementsReady'));
console.log('ui/dom_elements.ts: "domElementsReady" event dispatched.');