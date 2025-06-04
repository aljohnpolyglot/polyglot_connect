// js/ui/dom_elements.js
// Centralized DOM element selectors for easy access and maintenance.

window.domElements = {
    // App Shell
    appShell: document.getElementById('polyglot-connect-app-shell'),
    leftSidebar: document.getElementById('left-sidebar'),
    mainNavItems: document.querySelectorAll('#left-sidebar .nav-item'),
    mainContainer: document.getElementById('main-container'),
    mainViews: document.querySelectorAll('#main-container .view'),
    rightSidebar: document.getElementById('right-sidebar'),
    rightSidebarPanels: document.querySelectorAll('#right-sidebar .sidebar-panel'),
    themeToggleButton: document.getElementById('toggle-theme-btn'),

    // Home View
    homepageTipsList: document.getElementById('homepage-tips-list'),

    // Find Someone View
    findView: document.getElementById('find-view'),
    connectorHubGrid: document.getElementById('connector-hub'),
    findFiltersPanel: document.getElementById('find-filters'),
    filterLanguageSelect: document.getElementById('filter-language'),
    filterRoleSelect: document.getElementById('filter-role'),
    applyFiltersBtn: document.getElementById('apply-filters-btn'),

    // Groups View
    groupsView: document.getElementById('groups-view'),
    groupListContainer: document.getElementById('group-list-container'),
    availableGroupsUl: document.getElementById('available-groups-ul'),
    groupLoadingMessage: document.getElementById('group-loading-message'),
    groupChatInterfaceDiv: document.getElementById('group-chat-interface'),
    activeGroupNameHeader: document.getElementById('active-group-name'),
    groupChatMembersAvatarsDiv: document.getElementById('group-chat-members-avatars'),
    groupChatLogDiv: document.getElementById('group-chat-log'),
    groupTypingIndicator: document.getElementById('group-typing-indicator'),
    groupChatInput: document.getElementById('group-chat-input'),
    sendGroupMessageBtn: document.getElementById('send-group-message-btn'),
    leaveGroupBtn: document.getElementById('leave-group-btn'),
    groupsFiltersPanel: document.getElementById('groups-filters'),
    filterGroupLanguageSelect: document.getElementById('filter-group-language'),
    applyGroupFiltersBtn: document.getElementById('apply-group-filters-btn'),

    // Messages View (Embedded Chat)
    messagesView: document.getElementById('messages-view'),
    embeddedChatHeaderAvatar: document.getElementById('embedded-chat-header-avatar'), // NEW
    embeddedChatHeaderName: document.getElementById('embedded-chat-header-name'),     // NEW
    embeddedChatHeaderDetails: document.getElementById('embedded-chat-header-details'),// NEW
    embeddedChatCallBtn: document.getElementById('embedded-chat-call-btn'),           // NEW
    embeddedChatInfoBtn: document.getElementById('embedded-chat-info-btn'),           // NEW
    messagesPlaceholder: document.getElementById('messages-placeholder'),
    embeddedChatContainer: document.getElementById('embedded-chat-container'),
    embeddedChatLog: document.getElementById('embedded-chat-log'),
    embeddedMessageAttachBtn: document.getElementById('embedded-message-attach-btn'),
    embeddedMessageImageUpload: document.getElementById('embedded-message-image-upload'),
    embeddedMessageTextInput: document.getElementById('embedded-message-text-input'),
    embeddedMessageSendBtn: document.getElementById('embedded-message-send-btn'),
    embeddedMessageMicBtn: document.getElementById('embedded-message-mic-btn'),

    messagesChatListPanel: document.getElementById('messages-chat-list'),
    chatListUl: document.getElementById('chat-list-ul'),
    emptyChatListMsg: document.getElementById('empty-chat-list-msg'),

    // Messaging Modal
    messagingInterface: document.getElementById('messaging-interface'),
    messageModalHeaderAvatar: document.getElementById('message-modal-header-avatar'), // NEW
    messageModalHeaderName: document.getElementById('message-modal-header-name'),     // NEW
    messageModalHeaderDetails: document.getElementById('message-modal-header-details'),// NEW
    messageModalCallBtn: document.getElementById('message-modal-call-btn'),           // NEW
    messageModalInfoBtn: document.getElementById('message-modal-info-btn'),           // NEW
    messageChatLog: document.getElementById('message-chat-log'),
    messageModalAttachBtn: document.getElementById('message-modal-attach-btn'),       // NEW
    messageModalImageUpload: document.getElementById('message-modal-image-upload'),   // NEW
    messageModalMicBtn: document.getElementById('message-modal-mic-btn'),             // ADDED
    messageTextInput: document.getElementById('message-text-input'),
    messageSendBtn: document.getElementById('message-send-btn'),
    messageModalMicBtn: document.getElementById('message-modal-mic-btn'),
    closeMessagingModalBtn: document.getElementById('close-messaging-modal-btn'),

    // Summary View
    summaryView: document.getElementById('summary-view'),
    summaryViewContent: document.getElementById('summary-view-content'),
    summaryTabHeader: document.getElementById('summary-for-partner-name'),
    summaryPlaceholder: document.getElementById('summary-placeholder'),
    summaryChatListPanel: document.getElementById('summary-chat-list'),
    summaryListUl: document.getElementById('summary-list-ul'),
    emptySummaryListMsg: document.getElementById('empty-summary-list-msg'),

    // Detailed Persona Modal
    detailedPersonaModal: document.getElementById('detailed-persona-modal'),
    closePersonaModalBtn: document.getElementById('close-persona-modal-btn'),
    personaModalAvatar: document.getElementById('persona-modal-avatar'),
    personaModalName: document.getElementById('persona-modal-name'),
    personaModalLocationAge: document.getElementById('persona-modal-location-age'),
    personaModalActiveStatus: document.getElementById('persona-modal-active-status'),
    personaModalBio: document.getElementById('persona-modal-bio'),
    personaModalLanguagesUl: document.getElementById('persona-modal-languages'),
    personaModalInterestsUl: document.getElementById('persona-modal-interests'),
    personaModalGallery: document.getElementById('persona-modal-gallery'),
    personaModalMessageBtn: document.getElementById('persona-modal-start-message-btn'),
    personaModalDirectCallBtn: document.getElementById('persona-modal-start-directcall-btn'),

    // Virtual Calling Screen Modal
    ringtoneAudio: document.getElementById('ringtone-audio'), // <<< ADD THIS LINE
    virtualCallingScreen: document.getElementById('virtual-calling-screen'),
    callingAvatar: document.getElementById('calling-avatar'),
    callingName: document.getElementById('calling-name'),
    callingStatus: document.getElementById('calling-status'),
    cancelCallBtn: document.getElementById('cancel-call-btn'),

    // Direct Call Modal
    directCallInterface: document.getElementById('direct-call-interface'),
    directCallActiveAvatar: document.getElementById('direct-call-active-avatar'),
    directCallActiveName: document.getElementById('direct-call-active-name'),
    directCallStatusIndicator: document.getElementById('direct-call-status-indicator'),
    directCallMuteBtn: document.getElementById('direct-call-mute-btn'),
    directCallEndBtn: document.getElementById('direct-call-end-btn'),
    directCallSpeakerToggleBtn: document.getElementById('direct-call-speaker-toggle-btn'),
    directCallActivityBtn: document.getElementById('direct-call-activity-btn'),
    directCallMainContent: document.querySelector('#direct-call-interface .direct-call-main-content'),

    // Session Recap Modal
    sessionRecapScreen: document.getElementById('session-recap-screen'),
    recapConnectorName: document.getElementById('recap-connector-name'),
    recapDate: document.getElementById('recap-date'),
    recapDuration: document.getElementById('recap-duration'),
    recapTopicsList: document.getElementById('recap-topics'),
    recapVocabularyList: document.getElementById('recap-vocabulary'),
    recapFocusAreasList: document.getElementById('recap-focus-areas'),
    closeRecapBtn: document.getElementById('close-recap-btn'),
    downloadTranscriptBtn: document.getElementById('recap-download-transcript-btn'),

    // Additional Selectors
    groupsViewHeader: document.querySelector('#groups-view > .view-header'), // Selects the header of the Groups view
};

console.log('ui/dom_elements.js loaded and updated for removed elements.');