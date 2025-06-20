// D:\polyglot_connect\js\types\global.d.ts
import type { AiRecapServiceModule as AiRecapService } from './services/ai_recap_service'; // Adjust path
export type AiRecapService = AiRecapServiceModule; // <<< ADD EXPORT HERE (or export the import directly)
import type { GeminiLiveApiServiceModule } from '../services/gemini_live_api_service'; 
import type { IdentityServiceModule } from '../services/identity_service';
import { GroupInteractionLogicModule } from '../core/group_interaction_logic';// --- SUB-INTERFACES for Persona/Connector ---
// IN global.d.ts - ADD THIS NEW INTERFACE
export interface JumpButtonManagerModule {
  initialize: (initialTab: string) => void;
}
export interface Connector {
    id: string;
  liveApiModelName?: string;
    // Properties that might be added dynamically for active chats:
    messages?: Array<{ text?: string; sender?: string; timestamp?: number | string; [key: string]: any }>;
    lastActivity?: number | string;

}
export interface PersonaIdentity {
  id: string;
  name: string;
  profileName: string;
  language: string; // Primary language
  modernTitle?: string;
  age?: number | "N/A";
  profession?: string;
  city?: string;
  country?: string;
  bioModern?: string;
  education?: string;
  interests?: string[];
  dislikes?: string[]; // <<< ADD THIS LINE
  personalityTraits?: string[];
  communicationStyle?: string;
  quirksOrHabits?: string[];
  conversationTopics?: string[];
  conversationNoGos?: string[];
  avatarModern?: string;
  nativeLanguages?: LanguageEntry[];
  practiceLanguages?: LanguageEntry[];
  languageRoles?: { [key: string]: string[] };
  sleepSchedule?: SleepSchedule;
  chatPersonality?: ChatPersonality;
  relationshipStatus?: RelationshipStatus;
  keyLifeEvents?: Array<{ event: string; date: string; description?: string }>;
  interestsStructured?: { [key: string]: string[] | undefined };
  countriesVisited?: Array<{ country: string; year?: string; highlights?: string }>;
  greetingCall?: string;
  greetingMessage?: string;
  culturalNotes?: string;
  goalsOrMotivations?: string;
  physicalTimezone?: string;
  activeTimezone?: string;
  dailyRoutineNotes?: string;
  tutorMinigameImageFiles?: string[];
  galleryImageFiles?: string[];
  languageSpecificCodes?: { [key: string]: { languageCode: string; flagCode: string; voiceName: string; liveApiVoiceName: string; } };
  learningLevels?: { [key: string]: string; };
}
export interface LanguageEntry {
  lang: string;
  levelTag: string;
  flagCode: string;
  
}
// D:\polyglot_connect\js\types\global.d.ts

export interface LanguageSpecificCodeEntry {
  languageCode: string;    // e.g., "sv-SE", "en-US", "tl-PH" (BCP-47)
  flagCode: string;        // e.g., "se", "us", "ph"
  voiceName: string;       // Voice for general TTS (if you have one)
  liveApiVoiceName: string;// Voice for Gemini Live API (if language directly supported for speech)
  liveApiSpeechLanguageCodeOverride?: string; // Optional: e.g., "en-US" to force Live API speech to English
}
export interface AIService {
  // ... other methods ...
  cleanAndReconstructTranscriptLLM?: ( // Make it optional for now during integration
      rawTranscript: TranscriptTurn[],
      connector: Connector,
      userName?: string
  ) => Promise<string>;
  // ...
}
// D:\polyglot_connect\js\types\global.d.ts
export interface AiRecapService { // This is for the OpenAI-compatible one
  generateSessionRecap: (
      cleanedTranscriptText: string, // <<< Ensure this is string
      connector: Connector,
      preferredProvider: string
  ) => Promise<RecapData>;
  buildRecapPromptForOpenAICompatible: (transcriptText: string, connector: Connector) => string;
  parseRecapResponse: (responseText: string | null, providerName: string) => RecapData;
}
export interface LanguageRoleDetail {
  languageCode?: string;
  flagCode?: string;
  voiceName?: string;
  liveApiVoiceName?: string;
  roles: string[];
}

export interface SleepSchedule {
  wake: string;
  sleep: string;
}
// Find this interface
export interface ChatPersonality {
  style: string;
  typingDelayMs: number;
  replyLength: "short" | "medium" | "long" | string;
}

export interface RelationshipStatus {
    status: string;
    partner?: {
        name: string;
        occupation: string;
        interests: string[];
    };
    howTheyMet?: string;
    lengthOfRelationship?: string;
    lookingFor?: string;
    children?: string[];
    interests?: string[];
    details?: string; // <<< ADD THIS LINE
}
// D:\polyglot_connect\js\types\global.d.ts

// Make sure LanguageEntry, SleepSchedule, ChatPersonality, RelationshipStatus are defined correctly if used below
// For this fix, we only care about languageSpecificCodes.
// Assuming other properties of PersonaDataSourceItem are already correctly typed.

export interface PersonaDataSourceItem {
  id: string;
  name: string;
  language: string; // Primary language for interaction logic
  profileName: string;
  birthday?: string;
  city?: string;
  country?: string;
  profession?: string;
  education?: string;
  bioModern: string;
  nativeLanguages: LanguageEntry[]; // Ensure LanguageEntry is simple (lang, levelTag, flagCode)
  practiceLanguages: LanguageEntry[]; // Ensure LanguageEntry is simple
  interests: string[];
  dislikes?: string[]; // <<< ADD THIS LINE
  personalityTraits?: string[];
  communicationStyle?: string;
  conversationTopics?: string[];
  conversationNoGos?: string[];
  quirksOrHabits?: string[];
  goalsOrMotivations?: string;
  culturalNotes?: string;
  avatarModern: string;
  greetingCall?: string;
  greetingMessage?: string;
  physicalTimezone?: string;
  activeTimezone?: string;
  sleepSchedule?: SleepSchedule;
  dailyRoutineNotes?: string;
  chatPersonality?: ChatPersonality;
  tutorMinigameImageFiles?: string[];
  galleryImageFiles?: string[];
  languageRoles: {
      [key: string]: string[];
  };
  learningLevels?: {
      [key: string]: string;
  };
  relationshipStatus?: RelationshipStatus;
  modernTitle?: string;
  samplePhrases?: Record<string, string>;
  keyLifeEvents?: Array<{ event: string; date: string; description?: string }>;
  interestsStructured?: { [key: string]: string[] | undefined };
  countriesVisited?: Array<{ country: string; year?: string; highlights?: string }>;

  // --- THIS IS THE CORRECTED PART ---
  languageSpecificCodes?: {
        [languageNameKey: string]: LanguageSpecificCodeEntry; // The value for "Swedish", "English" etc. is a LanguageSpecificCodeEntry object
        role?: 'tutor' | 'learner' | 'moderator' | 'captain' | 'analyst' | 'rival_fan' | 'fan' | string; // ADD THIS
        proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | string; // ADD THIS
 
      };
  // --- END OF CORRECTED PART ---
}
export interface Connector extends PersonaDataSourceItem { // EXPORTED
  age: number | "N/A";
  languageCode: string; // This is the TOP-LEVEL resolved languageCode for the connector
  flagCode: string;     // This is the TOP-LEVEL resolved flagCode
  voiceName: string;    // This is the TOP-LEVEL resolved voiceName
  liveApiVoiceName: string; // This is the TOP-LEVEL resolved liveApiVoiceName for the primary language
  modernTitle: string;
  isActive?: boolean;
  messages?: Array<{ text?: string; sender?: string; timestamp?: number | string; [key: string]: any }>;
  lastActivity?: number | string;
  liveApiModelName?: string;
  // liveApiVoiceName is already here, which is fine for the resolved primary voice
}
export interface Group { // EXPORTED
  id: string;
  name: string;
  language: string;
  groupPhotoUrl: string;
  description: string;
  tutorId: string;
  maxLearners: number;
  tags: string[];
  members?: Connector[];
  currentMemberCount?: number;
  isJoined?: boolean; // This was added when processing in getAllGroupDefinitions
  category?: string; // e.g., "Language Learning", "Football Fans", "Book Club"
    communityTags?: string[]; // For multiple non-language tags
  creationTime?: number; // <<< ADD THIS LINE (make it optional number)
  memberSelectionCriteria?: GroupMemberCriteria; // This will guide member selection
  type?: 'Language Learning' | 'Community Hangout' | 'Sports Fan Club' | string; // ADD THIS
  topic?: string; // ADD THIS (e.g., "La Liga", "French Culture")
}
export interface GroupMemberCriteria {
  // Language-based (can still be a primary filter)
  language?: string; // The language the member should primarily use or be associated with
  role?: string;     // e.g., "native", "learner", "participant" (can be combined with language)

  // Location-based (for regional/diaspora groups)
  country?: string | string[]; // Can be a single country or an array of allowed countries
  region?: string | string[];  // Broader, e.g., "Latin America", "Scandinavia", "Southeast Asia" (you'd need to map this)
  city?: string | string[];

  // Interest-based
  interestsInclude?: string | string[]; // Member must have at least one of these interests
  interestsAll?: string[];        // Member must have ALL of these interests (less common)

  // Persona tag based (if you add a 'tags' array to PersonaDataSourceItem)
  personaTagsInclude?: string | string[];

  // To exclude specific personas (e.g., the host/tutor of this group)
  excludeIds?: string[];

  // You could even add logic for profession, age range, etc.
  // profession?: string | string[];
}
// --- NEW/REVISED Interfaces for GroupManager and its specific sub-dependencies ---
export interface GroupChatHistoryItem {
  speakerId: string;
  text: string | null; // <<< MODIFIED // For text messages, or a placeholder like "[User sent an image]", or the transcript
  timestamp: number;
  speakerName?: string;
  imageUrl?: string;
  imageMimeType?: string;
  imagePromptText?: string;
  isImageMessage?: boolean;
  base64ImageDataForAI?: string;

  // --- ADD/ENSURE THESE ARE PRESENT ---
  isVoiceMemo?: boolean;
  audioBlobDataUrl?: string | null; // Store the Data URL (can be null if not available)
  messageId?: string; // Optional: if you want to link it to the UI element
  // --- END ADDITIONS ---
  imageSemanticDescription?: string; // <<< ADD THIS LINE (AI-generated description of image content)
}
export interface GroupDataManager {
  initialize: () => void;
  getGroupDefinitionById: (groupId: string) => Group | null | undefined;
  getAllGroupDefinitions: (languageFilter?: string | null, categoryFilter?: string | null, nameSearch?: string | null) => Array<Group & { isJoined?: boolean }>; // <<< ADD nameSearch
  isGroupJoined: (groupId: string) => boolean;
  loadGroupChatHistory: (groupId: string) => GroupChatHistoryItem[];
  getLoadedChatHistory: () => GroupChatHistoryItem[];
  addMessageToCurrentGroupHistory: (message: GroupChatHistoryItem, notify?: boolean) => void;
  saveCurrentGroupChatHistory: (triggerListUpdate?: boolean) => void;
  setCurrentGroupContext: (groupId: string | null, groupData: Group | null) => void;
  getCurrentGroupId: () => string | null | undefined;
  getCurrentGroupData: () => Group | null | undefined;
  // Define a more specific return type for the items in this array if possible
  // This is for the sidebar active chat list
 getAllGroupDataWithLastActivity: () => ActiveGroupListItem[]; // Use ActiveGroupListItem
 
}

// D:\polyglot_connect\src\js\types\global.d.ts
// ... (Ensure YourDomElements, UiUpdater, ChatUiManager, ListRenderer, ViewManager,
//      GroupDataManager, Connector, Group, GroupChatHistoryItem are EXPORTED) ...

export interface GroupUiHandler {
  initialize: () => void;
  displayAvailableGroups: (groupsToDisplay: Group[], joinGroupCallback: (groupOrId: string | Group) => void) => void;
  showGroupChatView: (
    groupData: Group, // Assuming Group type
    groupMembers: Connector[],
    groupHistory: GroupChatHistoryItem[]
  ) => void;
  hideGroupChatViewAndShowList: () => void;
  updateGroupTypingIndicator: (text: string) => HTMLElement | null;
  clearGroupInput: () => void;
  appendMessageToGroupLog: (
    message: string,
    senderLabel: string,
    isUser: boolean,
    userType: string,
    options?: ChatMessageOptions
  ) => void;
  clearGroupChatLog: () => void;
  openGroupMembersModal: () => void; // New method
  openGroupInfoModal: (group: Group) => void; // ===== ADD THIS LINE =====
}
// In global.d.ts
export interface GeminiTtsService {
    getTTSAudio: (
        textToSpeak: string,
        languageCode: string, // Was optional, now required by impl.
        geminiVoiceName?: string,
        stylePrompt?: string | null
    ) => Promise<{ audioBase64: string; mimeType: string } | null>;
}
// For geminiTextGenerationService
// Replace with this in global.d.ts
export interface GeminiTextGenerationService {
  generateTextMessage: (
      userText: string,
      connector: Connector, 
      existingGeminiHistory: GeminiChatItem[],
      preferredProvider?: string, 
      expectJson?: boolean,
      context?: 'group-chat' | 'one-on-one', // <<< ADDED
      abortSignal?: AbortSignal              // <<< ADDED
  ) => Promise<string | null | object>;

  generateTextForCallModal?: (
      userText: string,
      connector: Connector,
      modalCallHistory: GeminiChatItem[]
  ) => Promise<string | null>;

  generateTextFromImageAndTextOpenAI?: (
      base64ImageString: string,
      mimeType: string,
      connector: Connector,
      existingConversationHistory: GeminiChatItem[],
      userTextQuery?: string,
      provider?: string,
      abortSignal?: AbortSignal // <<< ADDED
  ) => Promise<string | null>;
}
// For geminiMultimodalService
// Replace with this in global.d.ts
export interface GeminiMultimodalService {
  generateTextFromAudioForCallModal?: (
      base64AudioString: string, 
      mimeType: string, 
      connector: Connector, 
      modalCallHistory: GeminiChatItem[]
  ) => Promise<string | null>;
  generateTextFromImageAndText?: (
      base64ImageString: string, 
      mimeType: string, 
      connector: Connector, 
      existingGeminiHistory: GeminiChatItem[], 
      optionalUserText?: string,
      preferredProvider?: string, // <<< ADDED
      abortSignal?: AbortSignal   // <<< ADDED
  ) => Promise<string | null>;
  transcribeAudioToText?: (
      base64Audio: string,
      mimeType: string,
      langHint?: string
  ) => Promise<string | null>;
}
// D:\polyglot_connect\js\types\global.d.ts
export interface GeminiRecapService { // Or GeminiRecapServiceModule
  generateSessionRecap: (
      cleanedTranscriptText: string, // <<< CORRECTED first parameter type
      connector: Connector
  ) => Promise<RecapData>;
}
export interface GroupInteractionLogic {
    initialize: (members: Connector[], tutor: Connector) => void;
    startConversationFlow: (forceImmediateGeneration?: boolean) => void; // <<< This is the fix
    stopConversationFlow: () => void; // This is the missing piece
    setUserTypingStatus: (isTyping: boolean) => void;
    handleUserMessage: (text: string | undefined, options?: { userSentImage?: boolean; imageBase64Data?: string; imageMimeType?: string; }) => Promise<void>;
    simulateAiMessageInGroup: (isReplyToUser?: boolean, userMessageText?: string, imageContextForReply?: any) => Promise<void>;
    setAwaitingUserFirstIntroduction: (isAwaiting: boolean) => void;
    
    reset?: () => void; // Optional
    [key: string]: any;
}

export interface GroupManager {
    initialize: () => void;
    loadAvailableGroups: (languageFilter?: string | null, categoryFilter?: string | null, nameSearch?: string | null, options?: { viewType: 'my-groups' | 'discover' }) => void;
    joinGroup: (groupOrGroupId: string | Group) => void; // Group type based on usage
    leaveCurrentGroup: (triggerReload?: boolean, updateSidebar?: boolean) => void;
    handleUserMessageInGroup: (
      textFromInput?: string,
      options?: {
        imageFile?: File | null;
        captionText?: string | null;
      }
    ) => void;
    userIsTyping: () => void; // Renamed from userIsTypingInGroupSignal
    getCurrentGroupData: () => Group | null | undefined;
   
    isGroupJoined: (groupId: string) => boolean;
    getFullCurrentGroupMembers: () => Connector[];
   getAllGroupDataWithLastActivity: () => ActiveGroupListItem[]; // Use ActiveGroupListItem
   getMembersForGroup: (groupDef: Group) => Connector[]; // <-- CORRECT PLACE
}
const getAllGroupDataWithLastActivity = (): ActiveGroupListItem[] => {
    return getDeps().groupDataManager.getAllGroupDataWithLastActivity() || [];
};
export interface LanguageFilterItem { // EXPORTED (if needed by modules)
  name: string;
  value: string;
  flagCode: string | null;
}

export interface RoleFilterItem { // EXPORTED (if needed by modules)
  name: string;
  value: string;
}
export interface RecapDataItem {
    term?: string;
    translation?: string;
    exampleSentence?: string;
    // For improvement areas
    areaType?: string; 
    userInputExample?: string;
    coachSuggestion?: string;
    explanation?: string;
    exampleWithSuggestion?: string;
    [key: string]: any; 
}

export interface RecapData {
    connectorName?: string;
    date?: string;
   startTimeISO?: string | null; // Allows string, null, or undefined
    duration?: string;
    conversationSummary?: string;
    overallEncouragement?: string;
    keyTopicsDiscussed?: string[] | RecapDataItem[]; // Can be simple strings or more complex
    goodUsageHighlights?: string[] | RecapDataItem[];
    newVocabularyAndPhrases?: RecapDataItem[];
    areasForImprovement?: RecapDataItem[];
    suggestedPracticeActivities?: string[] | RecapDataItem[];
    sessionId?: string;
    [key: string]: any; // Allow other properties
}
// --- START OF REPLACEMENT (GLOBAL.UPDATE_SESSIONDATA.1) ---
export interface SessionData extends RecapData {
    // Fields explicitly set in session_state_manager.ts's finalizeBaseSession
    sessionId: string; // Already implicitly part of RecapData if RecapData has it, or add if not.
                      // Let's assume RecapData might not always have sessionId, so make it explicit.
    connectorId?: string; // ID of the connector involved
    connectorName?: string; // Name of the connector
    connector?: Connector;  // The full connector object involved in the session

    startTimeISO: string | null; // Can be null if session didn't formally start
    endTimeISO?: string;         // When the session was finalized
    
    rawTranscript?: TranscriptTurn[]; // The sequence of turns in the session
    sessionType?: string;           // e.g., 'direct_modal', 'message_modal'

    // Inherits from RecapData:
    // date?: string;
    // duration?: string;
    // conversationSummary?: string;
    // overallEncouragement?: string;
    // keyTopicsDiscussed?: string[] | RecapDataItem[];
    // goodUsageHighlights?: string[] | RecapDataItem[];
    // newVocabularyAndPhrases?: RecapDataItem[];
    // areasForImprovement?: RecapDataItem[];
    // suggestedPracticeActivities?: string[] | RecapDataItem[];
    // [key: string]: any; // from RecapData to allow other properties
}
// --- END OF REPLACEMENT (GLOBAL.UPDATE_SESSIONDATA.1) ---
export interface ConvoStoreModule { // << MAKE SURE THIS IS EXPORTED
    initializeStore: () => void;
    saveAllConversationsToStorage: () => void;
    getConversationById: (connectorId: string) => ConversationRecordInStore | null;
    getAllConversationsAsArray: () => ConversationRecordInStore[];
    createNewConversationRecord: (connectorId: string, connectorData: Connector) => ConversationRecordInStore | null;
    updateConversationProperty: ( // <<< THIS SIGNATURE MUST MATCH
        connectorId: string, 
        propertyName: keyof ConversationRecordInStore, // Use keyof
        value: any
    ) => ConversationRecordInStore | null;
    addMessageToConversationStore: (connectorId: string, messageObject: MessageInStore) => boolean;
    getGeminiHistoryFromStore: (connectorId: string) => GeminiChatItem[];
    updateGeminiHistoryInStore: (connectorId: string, newHistoryArray: GeminiChatItem[]) => boolean;
    getGlobalUserProfile: (userId?: string) => string; // <<< ADD THIS
    updateGlobalUserProfile: (newSummary: string, userId?: string) => void; // <<< ADD THIS
    updateUserProfileSummary(groupId: string, summary: string): void;
    
}
// --- INTERFACE for DomElements (based on dom_elements.js and index.html) ---
export interface YourDomElements { // Ensure EXPORT
   //Image Input Send
   imagePreviewContainerEmbedded: HTMLElement | null;
   embeddedImageCaptionInput: HTMLInputElement | null;
 
   imagePreviewContainerModal: HTMLElement | null;
   modalImageCaptionInput: HTMLInputElement | null;
 
   imagePreviewContainerGroup: HTMLElement | null;
   groupImageCaptionInput: HTMLInputElement | null;
  
  
  // App Shell
    appShell: HTMLElement | null;
    leftSidebar: HTMLElement | null;
    mainNavItems: NodeListOf<HTMLElement>; // querySelectorAll returns NodeListOf<Element>
    mainContainer: HTMLElement | null;
    mainViews: NodeListOf<HTMLElement>;
    rightSidebar: HTMLElement | null;
    rightSidebarPanels: NodeListOf<HTMLElement>;
    themeToggleButton: HTMLButtonElement | null;
  // ================= ADD THIS LINE =================
  universalJumpButtons: HTMLElement | null;
  // =================================================
    // Home View
    homepageTipsList: HTMLUListElement | null;

    // Find Someone View
    friendsView: HTMLElement | null;
    connectorHubGrid: HTMLElement | null;
    friendsEmptyPlaceholder?: HTMLElement | null;
    friendsFiltersPanel: HTMLElement | null; // Assuming it's a generic HTMLElement
    filterLanguageSelect: HTMLSelectElement | null;
    filterRoleSelect: HTMLSelectElement | null;
    applyFiltersBtn: HTMLButtonElement | null;
    filterConnectorNameInput?: HTMLInputElement | null; // <<< ADD THIS
    // Groups View
    groupsView: HTMLElement | null;
    groupListContainer: HTMLElement | null;
    availableGroupsUl: HTMLUListElement | null;
    groupsEmptyPlaceholder?: HTMLElement | null;
    groupLoadingMessage: HTMLElement | null; // Likely a <p> or <div>
    groupChatInterfaceDiv: HTMLElement | null;
    activeGroupNameHeader: HTMLElement | null; // Likely <h3>
    groupChatMembersAvatarsDiv: HTMLElement | null;
    groupChatLogDiv: HTMLElement | null;

    groupChatInput: HTMLInputElement | null;
    sendGroupMessageBtn: HTMLButtonElement | null;
    leaveGroupBtn: HTMLButtonElement | null;
    groupChatAttachBtn: HTMLButtonElement | null;
    groupChatImageUpload: HTMLInputElement | null;
    groupChatMicBtn: HTMLButtonElement | null;
    imagePreviewContainerGroup?: HTMLElement | null;          // <<< ADD
    groupImageCaptionInput?: HTMLInputElement | null;         // <<< ADD
    groupsFiltersPanel: HTMLElement | null;
    filterGroupLanguageSelect: HTMLSelectElement | null;
    applyGroupFiltersBtn: HTMLButtonElement | null;
    filterGroupCategorySelect?: HTMLSelectElement | null;
    filterGroupNameInput?: HTMLInputElement | null; // <<< ADD THIS
    groupTypingIndicator: HTMLElement | null;
    
    //Group members modal
    groupHeaderInfoTrigger: HTMLElement | null; // New
    groupMembersModal: HTMLElement | null;      // New
    closeGroupMembersModalBtn: HTMLButtonElement | null; // New
    gmmGroupPhoto: HTMLImageElement | null;     // New
    gmmGroupName: HTMLElement | null;           // New
    gmmGroupDescription: HTMLElement | null;    // New
    gmmMemberCount: HTMLSpanElement | null;     // New
    gmmMemberSearchInput: HTMLInputElement | null; // New
    gmmMembersListUl: HTMLUListElement | null;  // New
    gmmModalFooter: HTMLElement | null;         // New
    gmmCtaBtn: HTMLButtonElement | null;         // New
    processingCallModal?: HTMLElement | null;    // <<< ADD THIS LINE


    // Messages View (Embedded Chat)
    messagesView: HTMLElement | null;
    embeddedChatHeaderAvatar: HTMLImageElement | null;
    embeddedChatHeaderName: HTMLElement | null; // Likely <h1>
    embeddedChatHeaderDetails: HTMLElement | null; // Likely <p>
    embeddedChatCallBtn: HTMLButtonElement | null;
    embeddedChatInfoBtn: HTMLButtonElement | null;
    messagesPlaceholder: HTMLElement | null; // Likely <p>
    embeddedChatContainer: HTMLElement | null;
    embeddedChatLog: HTMLElement | null;
    embeddedMessageAttachBtn: HTMLButtonElement | null;
    embeddedMessageImageUpload: HTMLInputElement | null;
    embeddedMessageTextInput: HTMLInputElement | null;
    embeddedMessageSendBtn: HTMLButtonElement | null;
    embeddedMessageMicBtn: HTMLButtonElement | null;
    imagePreviewContainerEmbedded?: HTMLElement | null;         // <<< ADD (optional or required based on HTML)
    embeddedImageCaptionInput?: HTMLInputElement | null;        // <<< ADD
    messagesChatListPanel: HTMLElement | null;
    chatListUl: HTMLUListElement | null;
    searchActiveChatsInput: HTMLInputElement | null; // <<< ADD THIS
    
    emptyChatListMsg: HTMLElement | null; // Likely <p>

    // Messaging Modal
    messagingInterface: HTMLElement | null;
    messageModalHeaderAvatar: HTMLImageElement | null;
    messageModalHeaderName: HTMLElement | null; // Likely <h3>
    messageModalHeaderDetails: HTMLElement | null; // Likely <p>
    messageModalCallBtn: HTMLButtonElement | null;
    messageModalInfoBtn: HTMLButtonElement | null;
    messageChatLog: HTMLElement | null;
    messageModalAttachBtn: HTMLButtonElement | null;
    messageModalImageUpload: HTMLInputElement | null;
    messageModalMicBtn: HTMLButtonElement | null; // Assuming the second one with this ID is a typo or intended for different context
    messageTextInput: HTMLInputElement | null;
    messageSendBtn: HTMLButtonElement | null;
    // messageModalMicBtn: HTMLButtonElement | null; // Already listed
    closeMessagingModalBtn: HTMLButtonElement | null;
    imagePreviewContainerModal?: HTMLElement | null;          // <<< ADD
    modalImageCaptionInput?: HTMLInputElement | null;         // <<< ADD
    // Summary View
    summaryView: HTMLElement | null;
    summaryViewContent: HTMLElement | null;
    summaryTabHeader: HTMLElement | null; // Likely <h1>
    summaryPlaceholder: HTMLElement | null; // Likely <p>
    summaryChatListPanel: HTMLElement | null;
    summaryListUl: HTMLUListElement | null;
    searchSessionHistoryInput: HTMLInputElement | null; // <<< ADD THIS
    emptySummaryListMsg: HTMLElement | null; // Likely <p>

    // Detailed Persona Modal
    detailedPersonaModal: HTMLElement | null;
    closePersonaModalBtn: HTMLButtonElement | null;
    personaModalAvatar: HTMLImageElement | null;
    personaModalName: HTMLElement | null; // Likely <h2>
    personaModalLocationAge: HTMLElement | null; // Likely <p>
    personaModalActiveStatus: HTMLElement | null; // Likely <span>
    personaModalBio: HTMLElement | null; // Likely <p>
    personaModalLanguagesUl: HTMLElement | null; // Or HTMLDivElement if it's the container
    personaModalInterestsUl: HTMLUListElement | null;
    personaModalGallery: HTMLElement | null;
    personaModalMessageBtn: HTMLButtonElement | null;
    personaModalDirectCallBtn: HTMLButtonElement | null;

    // Virtual Calling Screen Modal
    ringtoneAudio: HTMLAudioElement | null;
    virtualCallingScreen: HTMLElement | null;
    callingAvatar: HTMLImageElement | null;
    callingName: HTMLElement | null; // Likely <h2>
    callingStatus: HTMLElement | null; // Likely <p>
    cancelCallBtn: HTMLButtonElement | null;

    // Direct Call Modal
    directCallInterface: HTMLElement | null;
    directCallActiveAvatar: HTMLImageElement | null;
    directCallActiveName: HTMLElement | null; // Likely <h3>
    directCallStatusIndicator: HTMLElement | null; // Likely <p>
    directCallMuteBtn: HTMLButtonElement | null;
    directCallEndBtn: HTMLButtonElement | null;
    directCallSpeakerToggleBtn: HTMLButtonElement | null;
    directCallActivityBtn: HTMLButtonElement | null; // Could be null if commented out
    directCallMainContent: HTMLElement | null;
    directCallActivityArea: HTMLElement | null; // Optional if it might not exist
    directCallActivityImageDisplay: HTMLImageElement | null; // Optional

    // Session Recap Modal
    sessionRecapScreen: HTMLElement | null;
    recapConnectorName: HTMLElement | null; // Likely <h3>
    recapDate: HTMLSpanElement | null;
    recapDuration: HTMLSpanElement | null;
    recapTopicsList: HTMLUListElement | null; // ID in HTML is 'recap-topics'
    recapVocabularyList: HTMLUListElement | null; // ID in HTML is 'recap-vocabulary'
    recapFocusAreasList: HTMLUListElement | null; // ID in HTML is 'recap-focus-areas'
    closeRecapBtn: HTMLButtonElement | null;
    downloadTranscriptBtn: HTMLButtonElement | null; // ID in HTML is 'recap-download-transcript-btn'
    recapConversationSummaryText?: HTMLElement | null; // Optional if new
    recapGoodUsageList?: HTMLUListElement | null; // Optional if new
    recapPracticeActivitiesList?: HTMLUListElement | null; // Optional if new
    recapOverallEncouragementText?: HTMLElement | null; // Optional if new

    // Additional Selectors
    groupsViewHeader: HTMLElement | null;
}

// --- INTERFACE for PolyglotHelpers ---
// It uses the EXPORTED Connector and TranscriptTurn types.
export interface PolyglotHelpersOnWindow {
  formatRelativeTimestamp(lastActivity: string | number): unknown;
  isConnectorCurrentlyActive: (connector: Partial<Connector> | null | undefined) => boolean;
  calculateAge: (birthdateString?: string | null) => number | null;
  getFlagCdnUrl: (countryCode: string, width?: number | null) => string;
  getFlagEmoji: (countryCode: string) => string;
  saveToLocalStorage: (key: string, data: any) => void;
  loadFromLocalStorage: (key: string) => any | null;
  generateUUID: () => string;
  simulateTypingDelay: (baseDelayMs?: number, messageLength?: number) => number;
  sanitizeTextForDisplay: (text: string) => string;
  debounce: <T extends (...args: any[]) => any>(func: T, delay: number) => (...args: Parameters<T>) => void;
  stripEmojis: (text: string) => string;
  speakText: (text: string, lang?: string, voiceName?: string | null) => void;
  formatTranscriptForLLM: (transcriptArray: TranscriptTurn[], personaName?: string, userName?: string) => string;
  normalizeText: (text: string) => string;
  fileToBase64: (file: File) => Promise<string>;
  getPersonaLocalTimeDetails: (timezone: string) => { 
    localTime: string; 
    localDate: string; 
    dayOfWeek: string; 
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late night' | 'early morning';
  };
 
 
  formatReadableList: (items?: string[], conjunction?: string, defaultText?: string) => string;
  formatStructuredInterestsForPrompt: (interests?: { [key: string]: string[] | string | undefined }) => string;
  formatKeyLifeEventsForPrompt: (events?: Array<{ event: string; description?: string }>) => string;
  formatCountriesVisitedForPrompt: (countries?: Array<{ country: string; highlights?: string }>) => string;
}
export interface ShellSetup {
  initializeAppCore: () => boolean; // Returns true on success, false on failure
}
export interface FlagLoader { // Ensure EXPORT
  getFlagUrl: (countryCode: string | null | undefined, width?: string | number | null) => string;
  preloadFlag: (countryCode: string) => void;
  testFlag: (countryCode: string) => Promise<boolean>;
}


export interface Minigame {
  id: string;
  title: string;
  instruction: string;
  userPromptSuggestion: string;
}

export interface TutorImage {
  file: string;
  description: string;
  tags: string[];
  suitableGames: string[]; // These would be IDs from Minigame interface
}
export interface ModalHandler {
  open: (modalElement: HTMLElement | null) => void;
  close: (modalElement: HTMLElement | null) => void;
  isVisible: (modalElement: HTMLElement | null) => boolean;
  renderLanguageSection: (connector: Connector) => void; // Assuming Connector type
  // Add setupGenericModalOverlayClicks if it were part of the public API, but it's internal.
}
export interface SharedContent {
  tutorImages?: TutorImage[]; // Make it optional in case it's ever empty
  homepageTips?: string[];    // Make it optional
}
export interface TranscriptTurn {
  sender: string;
  text: string;
  timestamp: number | string;
  type?: "text" | "image" | "audio" | "system" | "message" | "call_event"; // Ensure "call_event" is a possibility
  // Fields for call events, especially for UI buttons or specific display logic
  eventType?: string;                 // e.g., 'call_failed_user_attempt'
  connectorIdForButton?: string;      // For "Call Again" button functionality
  connectorNameForDisplay?: string;   // For messages like "X could not be reached"
  callSessionId?: string;             // If relevant to the turn
  duration?: string;                  // If relevant (e.g. for call_ended)
  // Allow other properties for flexibility if needed, but prefer explicit typing
  [key: string]: any; 
}
export interface PolyglotApp { // Ensure 'export' if other modules might import it
  initiateSession?: (connector: Connector, sessionTypeWithContext: string) => void;
  // ... any other properties or methods on polyglotApp
}
// --- START OF ADDITION (GLOBAL.LCH_SUBMODULES.1) ---
export interface LiveApiMicInput {
    initialize: (liveApiService: GeminiLiveApiService, isMutedFn: () => boolean) => boolean;
    startCapture: (onErrorCallback: (error: Error) => void) => Promise<void>;
    stopCapture: () => void;
}

export interface LiveApiAudioOutput {
    initialize: (isMutedCheckFunction: () => boolean) => boolean;
    handleReceivedAiAudioChunk: (audioChunkArrayBuffer: ArrayBuffer, mimeType: string) => void;
    clearPlaybackQueue: () => void;
    stopCurrentSound: () => void;
    cleanupAudioContext: () => void;
}

export interface LiveApiTextCoordinator {
    initialize: (
        sessionStateManager: SessionStateManager, 
        polyglotHelpers: PolyglotHelpersOnWindow, // Use the window type alias if that's what's passed
        uiUpdater: UiUpdater
    ) => boolean;
    resetBuffers: () => void;
    setCurrentSessionTypeContext: (sessionType: string | null) => void;
    handleReceivedAiText: (text: string) => void;
    handleReceivedUserTranscription: (text: string, isFinal?: boolean) => void;
    handleReceivedModelTranscription: (text: string, isFinal?: boolean) => void;
    handleUserTypedText: (text: string) => void;
    flushUserTranscription: () => void;
    flushAiSpokenText: () => void;
    resetAiSpokenTextBuffer: () => void;
}
export interface PersonaModalManager {
 openDetailedPersonaModal: (connector: Connector) => void; // Connector type should already be exported
  [key: string]: any; // Allow other properties for now
}

export interface MessageInStore { // Ensure this is also defined and exported if used by ConversationRecordInStore
    id?: string;
    sender: string;
    text: string;
    type: string; // e.g., 'text', 'call_event'
    timestamp: number;
    content_url?: string;
    imagePartsForGemini?: Array<{ inlineData: { mimeType: string; data: string; } }>;
    // Fields for call events, mirroring TranscriptTurn and ChatMessageOptions
    eventType?: string;
    connectorIdForButton?: string; // << ENSURE THIS IS PRESENT AND OPTIONAL
    connectorNameForDisplay?: string; // << ENSURE THIS IS PRESENT AND OPTIONAL
    duration?: string;
    callSessionId?: string;
    [key: string]: any;
    imageSemanticDescription?: string; // <<< ADD THIS LINE (AI-generated description of image content)
    imageInitialDescription?: string; // <--- NEW: AI's first-pass, quick description
  }
export interface ActiveConversationsStore {
    [connectorId: string]: ConversationRecordInStore;

  }

export interface CardRenderer {
  renderCards: (connectorsToDisplay: Connector[], activeFriendsView: 'my-friends' | 'discover') => void;
}
export interface UiUpdater {
  updateVirtualCallingScreen: (connector: Connector, sessionTypeAttempt: string) => void;
  appendToVoiceChatLog: (text: string, senderClass: string, options?: ChatMessageOptions) => HTMLElement | null;
  showImageInVoiceChat: (imageUrl: string) => void;
  updateVoiceChatHeader: (connector: Connector) => void;
  clearVoiceChatLog: () => void;
  resetVoiceChatInput: () => void;
  updateVoiceChatTapToSpeakButton: (state: 'listening' | 'processing' | 'idle', text?: string) => void;
  updateDirectCallHeader: (connector: Connector) => void;
  updateDirectCallStatus: (statusText: string, isError?: boolean) => void;
  updateDirectCallMicButtonVisual: (isMuted: boolean) => void;
  updateDirectCallSpeakerButtonVisual: (isMuted: boolean) => void;
  showImageInDirectCall: (imageUrl: string) => void;
  clearDirectCallActivityArea: () => void;
  appendToMessageLogModal: (text: string, senderClass: string, options?: ChatMessageOptions) => HTMLElement | null;
  showImageInMessageModal: (imageUrl: string) => void;
  updateMessageModalHeader: (connector: Connector) => void;
  resetMessageModalInput: () => void;
  clearMessageModalLog: () => void;
  appendToEmbeddedChatLog: (text: string, senderClass: string, options?: ChatMessageOptions) => HTMLElement | null;
  showImageInEmbeddedChat: (imageUrl: string) => void;
  updateEmbeddedChatHeader: (connector: Connector) => void;
  clearEmbeddedChatInput: () => void;
  toggleEmbeddedSendButton: (enable: boolean) => void;
  clearEmbeddedChatLog: () => void;
  appendToGroupChatLog: (text: string, senderNameFromArg: string, isUser: boolean, speakerId: string, options?: ChatMessageOptions) => HTMLElement | null;
  updateGroupChatHeader: (groupName: string, members: Connector[]) => void; // Assuming Connector type for members

  clearGroupChatInput: () => void;
  clearGroupChatLog: () => void;
  populateRecapModal: (recapData: RecapData) => void; // Use RecapData type
  displaySummaryInView: (sessionData: SessionData | null) => void; // Use SessionData type
  updateTTSToggleButtonVisual: (buttonElement: HTMLElement | null, isMuted: boolean) => void;
  updateSendPhotoButtonVisibility: (connector: Connector, buttonElement: HTMLElement | null) => void;
  showProcessingSpinner: (logElement: HTMLElement, messageId?: string | null) => HTMLElement | null;
  removeProcessingSpinner: (logElement: HTMLElement, messageId?: string | null) => void;
  appendSystemMessage: (logElement: HTMLElement | null, text: string, isError?: boolean, isTimestamp?: boolean) => HTMLElement | null;
  // Add scroll functions if they need to be part of the public API of uiUpdater
  scrollEmbeddedChatToBottom?: () => void;
  scrollMessageModalToBottom?: () => void;
}
export interface ShellController {
  initializeAppShell: () => void;
  openDetailedPersonaModal: (connector: Connector) => void; // Assuming Connector type
  switchView: (targetTab: string) => void;
  updateEmptyListMessages: () => void;
  // Add other methods exposed by the original shellController if any were missed in its return
  showEmbeddedChat: (connector: Connector) => void;
  hideEmbeddedChat: () => void;
  showGroupChatInterface: (groupName: string, members: Connector[]) => void;
  hideGroupChatInterface: () => void;
}
export interface TitleNotifierModule {
  initialize: () => void;
}

export interface ChatMessageOptions {
  type?: 'call_event' | string; 
  eventType?: 'call_started' | 'call_ended' | 'call_failed_user_attempt' | 'call_missed_connector' | string;
  callSessionId?: string;
   connectorId?: string; // This was for the sender, not the button target
  connectorName?: string; // This was for the sender, not the button target
  duration?: string;
  timestamp?: number | string; 
  senderName?: string;
  imageUrl?: string;
  isThinking?: boolean;
  isError?: boolean;
  avatarUrl?: string;
  isVoiceMemo?: boolean;      // New: Indicates this is a user's voice memo
  audioSrc?: string;          // New: Data URL for the audio blob to be played
  messageId?: string;
  showSenderName?: boolean; 
  isSystemLikeMessage?: boolean;
  
  connectorIdForButton?: string;   // <<< MUST BE PRESENT AND OPTIONAL
  connectorNameForDisplay?: string; // <<< MUST BE PRESENT AND OPTIONAL

  isVoiceMemo?: boolean;      // Indicates this is a voice memo
  audioSrc?: string;          // Data URL for the audio blob to be played in UI
  [key: string]: any; // Allow other dynamic properties if necessary
}
export interface ActivityManager {
  isConnectorActive: (connector: Connector | null | undefined) => boolean;
  simulateAiTyping: (connectorId: string, chatType?: string, aiMessageText?: string) => HTMLElement | null;
  clearAiTypingIndicator: (connectorId: string, chatType?: string, thinkingMsgElement?: HTMLElement | null) => void;
  getAiReplyDelay: (connector: Connector | null | undefined, messageLength?: number) => number;
}
export interface FilterController { // New one for the file you just sent
  initializeFilters: () => void;
  populateFilterDropdowns: () => void;
  applyFindConnectorsFilters: () => void;
  applyGroupSearchFilters: () => void;
  [key: string]: any; // Allow other properties for now
}
export type ListItemData = Partial<Connector & Group & SessionData> & {
    id?: string;
    name?: string;
   isGroup?: boolean;
    connector?: Connector;
    messages?: Array<{ text?: string; sender?: string; speakerId?: string; speakerName?: string; timestamp?: number | string }>;
    lastActivity?: number | string;
    sessionId?: string;
    connectorName?: string;
    connectorId?: string; // From your original ListItemData
    date?: string;
    startTimeISO?: string;
    duration?: string;
    groupPhotoUrl?: string;
    language?: string;
    description?: string;
    isJoined?: boolean;
    // Add any other properties your list items might have
};
export interface ListRenderer {
  renderActiveChatList: (
    combinedChatsArray: CombinedChatItem[], 
    onCombinedItemClick: (itemData: CombinedChatItem) => void
  ) => void;
  renderSummaryList: (
    sessionsArray: SessionData[],  // Or Array<Partial<SessionData> & { connectorId?: string }>
    onSummaryClick: (sessionDataOrId: SessionData | string) => void
  ) => void;
  renderAvailableGroupsList: (
    groupsArray: Group[], 
    onGroupClick: (groupOrId: Group | string) => void
  ) => void;
  // Add any other methods listRenderer exposes
}
// D:\polyglot_connect\src\js\types\global.d.ts
// ... other interfaces ...

export interface ActiveGroupListItem {
  id: string; 
  name: string; 
  language?: string; 
  groupPhotoUrl?: string;
  description?: string; 
  lastActivity: number;
  messages: GroupChatHistoryItem[]; 
  isGroup: true; 
  isJoined?: boolean; // <<< ADD THIS LINE (make it optional boolean)
  // Include other properties from Group that are *always* returned by getAllGroupDataWithLastActivity
}

// ... rest of global.d.ts ...

export interface ActiveOneOnOneChatItem {
    id: string; // Connector ID
    isGroup: false;
    connector: Connector; // The full connector object
     messages: Array<{ text?: string; sender?: string; timestamp?: number | string; [key: string]: any }>; // <<<< USES THIS
    lastActivity: number | string;
    // Add any other properties specific to 1-on-1 chat list items
}

export type CombinedChatItem = ActiveOneOnOneChatItem | ActiveGroupListItem;

export interface ListRenderer {
  renderActiveChatList: (
    chats: CombinedChatItem[], // Use the union type
    clickCallback: (itemData: CombinedChatItem) => void // Use the union type
  ) => void;
  renderSummaryList: (
    sessions: Array<Partial<SessionData> & { connectorId?: string }>,
    itemClickCallback: (sessionDataOrId: SessionData | string) => void
  ) => void;
  renderAvailableGroupsList: (
    groupsArray: Group[], // Or ListItemData[] if that's more accurate
    onGroupClick: (groupOrId: Group | string) => void
  ) => void;
  [key: string]: any; // In case other methods are added later or used internally
}


export interface ConversationItem { // <<< THIS IS THE NEW/COMPLETE DEFINITION
    id: string; // This is likely the Conversation ID (e.g., connectorId or a unique convo ID)
    name?: string; 
    connector: Connector; // The full Connector object associated with this conversation
    messages: Array<{ // Could be a more specific MessageInConversation type later
        text?: string;
        sender?: string; // e.g., 'user', 'model'
        timestamp?: number | string;
        type?: string; // 'text', 'image'
        imageUrl?: string; // if it's an image message from user
        // any other properties a message in the conversation history might have
        [key: string]: any;
    }>;
    lastActivity: number | string; // Timestamp of the last message or interaction
    isGroup: false; // Explicitly mark that this is not a group chat item
    geminiHistory?: GeminiChatItem[]; // Optional: The history formatted for Gemini API
    // Add any other properties that `conversationManager.getActiveConversations()` returns for each item.
}
export interface ConversationManager {
  initialize: () => Promise<void>; // UPDATED
  getActiveConversations: () => ConversationItem[]; // Stays sync
  getConversationById: (connectorId: string) => ConversationRecordInStore | null; // Stays sync
  addMessageToConversation: (
      connectorId: string,
      sender: string,
      text: string,
      type?: string,
      timestamp?: number,
      extraData?: Record<string, any>
  ) => Promise<MessageInStore | null>; // UPDATED
  ensureConversationRecord: (
      connectorId: string,
      connectorData?: Connector | null
  ) => Promise<{ conversation: ConversationRecordInStore | null; isNew: boolean }>; // UPDATED
  addSystemMessageToConversation: (connectorId: string, systemMessageObject: Partial<MessageInStore>) => Promise<boolean>; // UPDATED
  markConversationActive: (connectorId: string) => boolean; // Stays sync
  addModelResponseMessage: ( 
      connectorId: string, 
      text: string, 
      geminiHistoryRefToUpdate?: GeminiChatItem[] // This param might be vestigial now
  ) => Promise<MessageInStore | null>; // UPDATED
  getGeminiHistoryForConnector: (connectorId: string) => Promise<GeminiChatItem[]>; // UPDATED
  clearConversationHistory: (connectorId: string) => Promise<void>; // UPDATED
}
export interface ChatSessionHandler {
  initialize?: () => void; 
  openConversationInEmbeddedView: (connectorOrId: Connector | string) => Promise<void>; // UPDATED
  openMessageModalForConnector: (connector: Connector) => Promise<void>; // UPDATED
  handleMessagesTabBecameActive: () => Promise<void>; // UPDATED
  endActiveModalMessagingSession: () => void; // Stays sync
  [key: string]: any;
}
export interface IdentityServiceModule {
  initialize: () => Promise<void>;
  getPersonaIdentity: (connectorId: string) => Promise<PersonaIdentity | null>; // PersonaIdentity should also be defined
}

// --- NEW MEMORY SERVICE TYPES ---
// PASTE THIS INTO global.d.ts, REPLACING THE OLD MEMORY INTERFACES

// --- NEW MEMORY SERVICE & CEREBRUM TYPES ---
export interface MemoryFact {
  key: string;
  value: any;
  type: 'CORE' | 'EPISODIC' | 'FRAGILE';
  timestamp: number;
  initialConfidence: number;
  source_context: 'one_on_one' | 'group' | 'live_call' | 'manual' | 'ai_invention';
  source_persona_id: string;
  participating_persona_ids?: string[];
  confidenceBoost?: number; // For Scribe's contextual reinforcement
}

export interface MemoryBank {
  core: MemoryFact[];
  episodic: MemoryFact[];
  fragile: MemoryFact[];
}

export interface CerebrumMemoryLedger {
  userId: string;
  user_memory: MemoryBank;
  ai_memory: {
      [personaId: string]: MemoryBank;
  };
  last_updated: number;
}

export interface MemoryServiceModule {
  initialize: () => Promise<void>;
  processNewUserMessage: (text: string, personaIds: string | string[], context: 'one_on_one' | 'group' | 'live_call' | 'ai_invention', history?: MessageInStore[]) => Promise<void>; // <<< 
  getMemoryForPrompt: (personaId: string) => Promise<{prompt: string, facts: MemoryFact[]}>; // <<< THIS IS THE FIX
  
  // --- Deprecated functions for compatibility during transition ---
  hasInteractedBefore: (personaId: string, userId: string) => Promise<boolean>;
  markInteraction: (personaId: string, userId: string) => Promise<void>;
  getMemory: (personaId: string, userId: string) => Promise<any | null>;
  updateMemory: (personaId: string, userId: string, memoryData: any) => Promise<void>;
}
export interface ChatActiveTargetManager {
  getEmbeddedChatTargetId: () => string | null;
  setEmbeddedChatTargetId: (connectorId: string | null) => void; // Allow null to clear
  clearEmbeddedChatTargetId: () => void;
  getModalMessageTargetConnector: () => Connector | null;
  setModalMessageTargetConnector: (connector: Connector | null) => void; // Allow null to clear
  clearModalMessageTargetConnector: () => void;
}

export interface AIApiConstants {
    PROVIDERS: { GROQ: string; TOGETHER: string; [key: string]: string }; // Add other providers
    HUMAN_LIKE_ERROR_MESSAGES?: string[];
    MIN_TRANSCRIPT_TURNS_FOR_RECAP?: number; // <<< ADD THIS LINE
    // ... other constants from ai_constants.js
    [key: string]: any; // For other properties
}

export interface TabManagerModule {
    initialize: (initialTab?: string) => void;
    switchToTab: (targetTab: string, isInitialLoad?: boolean) => void;
    getCurrentActiveTab: () => string;
}
interface TextMessageSendOptions {
  skipUiAppend?: boolean;
  imageFile?: File | null;
  captionText?: string | null;
}

export interface TextMessageHandler {
  sendEmbeddedTextMessage: (
    textFromInput: string,
    currentEmbeddedChatTargetId: string | null,
    options?: {
      skipUiAppend?: boolean;
      isVoiceMemo?: boolean; // New
      audioBlobDataUrl?: string | null; // New
      messageId?: string; // Existing
      timestamp?: number; // Existing
      imageFile?: File | null;       // ✅ Ensure this is present
      captionText?: string | null;   // ✅ Ensure this is present
    }
  ) => Promise<void>;
  handleEmbeddedImageUpload: (event: Event, currentEmbeddedChatTargetId: string | null) => Promise<void>;
  sendModalTextMessage: ( // <<< THIS IS THE MODIFIED PART
    textFromInput: string,
    currentModalMessageTargetConnector: Connector | null,
    options?: { // <<< ADD THIS OPTIONS OBJECT
      skipUiAppend?: boolean;
      isVoiceMemo?: boolean;
      audioBlobDataUrl?: string | null;
      messageId?: string;
      timestamp?: number;
      imageFile?: File | null;       // ✅ Ensure this is present
      captionText?: string | null;   // ✅ Ensure this is present
    }
  ) => Promise<void>; // <<< END OF MODIFIED PART
  handleModalImageUpload: (event: Event, currentModalMessageTargetConnector: Connector | null) => Promise<void>;

}
export interface VoiceMemoHandler {
  handleNewVoiceMemoInteraction: (
      targetType: string, 
      micButtonElement: HTMLButtonElement | null,
      targetId: string | null,
      additionalContext?: any
  ) => void; // Stays void
  [key: string]: any; // If you need this for flexibility
}
export interface ChatOrchestrator {
  initialize: () => void;
  openConversation: (connector: Connector) => void;
  openMessageModal: (connector: Connector) => void;
  handleMessagesTabActive: () => void;
  handleGroupsTabActive: () => void; // <<< ADD THIS LINE
  // filterAndDisplayConnectors is correctly removed from the implementation, so it must be removed here too.
  renderCombinedActiveChatsList: () => void;
  notifyNewActivityInConversation: (connectorId: string) => void;
  getTextMessageHandler: () => TextMessageHandler | undefined;
  getVoiceMemoHandler: () => VoiceMemoHandler | undefined;
  getCurrentEmbeddedChatTargetId: () => string | null | undefined;
  getCurrentModalMessageTarget: () => Connector | null | undefined;
  getCombinedActiveChats?: () => CombinedChatItem[];
  [key: string]: any; // Keep for flexibility
}
// In global.d.ts
export interface ViewActionCoordinatorModule {
    initialize: () => void;
    displaySessionSummaryInMainView: (sessionData: SessionData | null) => void; // <<< ENSURE THIS METHOD IS HERE
}

export interface ChatUiManager {
  showEmbeddedChatInterface: (connector: Connector) => void;
  hideEmbeddedChatInterface: () => void;
  showGroupChatView: (groupName: string, members: Connector[]) => void; // Assuming Connector for members
  hideGroupChatView: () => void;
  // initializeChatUiControls is internal, not part of the public API based on the return object
}

export interface SessionHistoryManager {
  initializeHistory: () => void;
  addCompletedSession: (sessionData: SessionData) => void;
  getCompletedSessions: () => SessionData[];
  getSessionById: (sessionId: string) => SessionData | null;
  getLastSession: () => SessionData | null; // <<< ADD THIS LINE
  downloadTranscript: (sessionId: string) => void;
  updateSummaryListUI: () => void;
}
// --- PLACEHOLDER INTERFACES for other managers/services ---
// These will be fleshed out as we convert the respective files.

// --- START OF MODIFICATION (GLOBAL.SYNC_AISERVICE.1) ---
export interface AIService { 
  generateTextMessage: ( 
      promptOrText: string,
      connector: Connector,
      history: GeminiChatItem[] | null | undefined, 
      preferredProvider?: string, 
      expectJson?: boolean,
      context?: 'group-chat' | 'one-on-one', // <<< ADDED
      abortSignal?: AbortSignal              // <<< ADDED
  ) => Promise<string | null | object>;
    
  generateTextFromImageAndText: ( 
      base64Data: string,
      mimeType: string,
      connector: Connector,
      history: GeminiChatItem[] | null | undefined, 
      prompt?: string,
      preferredProvider?: string,
      abortSignal?: AbortSignal // <<< ADDED
  ) => Promise<string | null | object>;

  getTTSAudio: ( // Added from your JS facade's methods
      textToSpeak: string, 
      languageCode?: string, 
      voiceName?: string, 
      stylePrompt?: string | null
  ) => Promise<{ audioBase64: string; mimeType: string } | null >;
  
  generateTextForCallModal?: ( // Added from your JS facade
      userText: string, 
      connector: Connector, 
      modalCallHistory: GeminiChatItem[] | null | undefined
  ) => Promise<string | null>;
  
  generateSessionRecap: ( 
    cleanedTranscriptText: string, 
    connector: Connector
) => Promise<RecapData>;

  transcribeAudioToText?: ( // Added from your JS facade
      base64Audio: string, // Changed from Blob to match your JS facade usage
      mimeType: string,
      langHint?: string,
      preferredProvider?: string
  ) => Promise<string | null>;
  
  // Add any other methods that window.aiService should publicly expose
  [key: string]: any; // Keep if it was there and needed for some flexibility
}
// --- END OF MODIFICATION (GLOBAL.SYNC_AISERVICE.1) ---

export interface MessageInStore { // Ensure this is also defined and exported if used by ConversationRecordInStore
    id?: string;
    sender: string;
    text: string;
    type: string;
    timestamp: number;
    content_url?: string;
    imagePartsForGemini?: Array<{ inlineData: { mimeType: string; data: string; } }>;
    eventType?: string;
    duration?: string;
    callSessionId?: string;
    [key: string]: any;
    isVoiceMemo?: boolean;      // New
    audioBlobDataUrl?: string | null; // Store the Data URL of the audio blob for history
    transcriptText?: string;    // New: Store the actual transcript separate from main 'text' if 'text' becomes a placeholder
}
// D:\polyglot_connect\src\js\types\global.d.ts
// ... other interface exports ...

// D:\polyglot_connect\js\types\global.d.ts

export interface SidebarPanelManagerModule {
  initialize: () => void;
  updatePanelForCurrentTab: (currentTab: string) => void; // THIS IS THE NEW, CORRECT SIGNATURE
}
export interface GeminiLiveApiService {
    connect: (
        modelName: string, 
        config: any, // Was LiveApiSessionSetupConfig - use any for simplicity in global interface
        callbacks: any  // Was LiveApiCallbacks - use any for simplicity
    ) => Promise<boolean | any>; // Or whatever connect actually returns
    
    sendRealtimeAudio: (audioBuffer: ArrayBuffer) => void; // From live_api_mic_input
    sendClientText: (text: string) => void;
    sendAudioStreamEndSignal?: () => void; // Optional if not always present
    closeConnection: (reason?: string) => void;
    // Add any other methods your gemini_live_api_service.js actually exposes
}

export interface GeminiChatItem {
    role: "user" | "model";
    parts: Array<{text: string} | {inlineData: {mimeType: string; data: string;}}>; // Allow image parts
}
export interface Conversation {
    id: string;
    connectorId: string;
    connector: Connector;
    messages: any[]; // TODO: Define MessageInConversation type
    geminiHistory?: GeminiChatItem[];
    lastActivity: number;
}

export interface ConversationRecord {
    conversation: Conversation;
    isNew: boolean;
}
// Add these interfaces (or similar) if they are not already defined and exported

export interface ConversationRecordInStore { // << MAKE SURE THIS IS EXPORTED
    id: string;
    connector?: Connector; 
    messages: MessageInStore[];
    lastActivity: number;
    geminiHistory: GeminiChatItem[];
    userProfileSummary?: string; // <<< ADD THIS LINE
}
export interface SessionStateManager {
  initializeBaseSession: (connector: Connector, sessionType: string, callSessionId?: string) => any; // Be more specific if possible
  addTurnToTranscript: (turn: TranscriptTurn) => void;
  isSessionActive: () => boolean; // <<< ADD THIS LINE
  getCurrentSessionDetails?: () => { connector?: Connector| null; [key: string]: any } | null; // <<< ADD THIS LINE (optional method)
  recordFailedCallAttempt?: (connector: Connector, reason: string) => void; // <<< ADD THIS LINE (optional method)
  resetBaseSessionState?: () => void; // <<< ADD THIS LINE (optional method)
  // Add other methods from session_state_manager.js that are called by session_manager.ts
  [key: string]: any; // Keep for flexibility if other methods exist
}



export interface LiveCallHandler {
  startLiveCall: (connector: Connector, sessionTypeWithContext: string) => Promise<boolean>; // More specific
  endLiveCall: (generateRecap?: boolean) => void; // <<< ADD THIS LINE
  toggleMicMuteForLiveCall: () => void; // <<< ADD THIS LINE
  toggleSpeakerMuteForLiveCall: () => void; // <<< ADD THIS LINE
  requestActivityForLiveCall?: () => void; // <<< ADD THIS LINE (optional as per original JS check)
  [key: string]: any; // Keep for flexibility
}
export interface SessionManager {
  initialize: () => void;
  startModalSession: (connector: Connector, sessionTypeWithContext: string) => Promise<void>;
  endCurrentModalSession: (generateRecap?: boolean) => void;
  cancelModalCallAttempt: () => void;
  handleDirectCallMicToggle: () => void;
  toggleDirectCallSpeaker: () => void;
  handleDirectCallActivityRequest?: () => void; // Make optional if not always implemented by all future session types
  getCompletedSessions: () => SessionData[] | undefined;
  downloadTranscriptForSession: (sessionId: string) => void;
  showSessionRecapInView: (sessionDataOrId: SessionData | string) => void; // Already there, good.
}
// D:\polyglot_connect\js\types\global.d.ts

export interface GeminiServiceModule {
  getTTSAudio: (
      textToSpeak: string,
      languageCode?: string,
      geminiVoiceName?: string,
      stylePrompt?: string | null
  ) => Promise<{ audioBase64: string; mimeType: string } | null >;

  generateTextMessage: (
    userText: string,
    connector: Connector,
    existingGeminiHistory: GeminiChatItem[]
) => Promise<string | object | null>; // <<< THIS IS THE FIX


  generateTextForCallModal?: ( // This was optional
      userText: string,
      connector: Connector,
      modalCallHistory: GeminiChatItem[]
  ) => Promise<string | null>;

  generateTextFromAudioForCallModal?: ( // This was optional
      base64AudioString: string,
      mimeType: string,
      connector: Connector,
      modalCallHistory: GeminiChatItem[]
  ) => Promise<string | null>;

  generateTextFromImageAndText?: ( // This was optional
      base64ImageString: string,
      mimeType: string,
      connector: Connector,
      existingGeminiHistory: GeminiChatItem[],
      optionalUserText?: string
  ) => Promise<string | null>;

  generateSessionRecap: ( // <<< ENSURE THIS MATCHES
      cleanedTranscriptText: string, // The corrected signature
      connector: Connector
  ) => Promise<RecapData>;

  transcribeAudioToText?: ( // This was optional
      base64Audio: string,
      mimeType: string,
      langHint?: string
  ) => Promise<string | null>;
}

export interface ChatEventListeners { initializeEventListeners: (...args: any[]) => any; /* ... more methods */ }
// ADD THIS NEW INTERFACE
export interface GeminiChatServiceModule {
  initialize: () => void;
  generateResponse: (
    history: GeminiChatItem[],
    generationConfig?: { temperature?: number; maxOutputTokens?: number }
  ) => Promise<string | null>;
  // Add any other methods your text chat service has
}
interface PolyglotConversationUpdatedEventDetail {
  type: 'one-on-one' | 'group';
  id: string;
  source?: string;
}
// --- Google GenAI SDK ---
// Based on your index.html script
// This is a simplified version; a proper @types/google__genai would be better if available
// or if we can find the exact type for the GoogleGenerativeAI class.
// declare class GoogleGenerativeAI {
//     constructor(apiKey: string);
//     getGenerativeModel(params: { model: string; generationConfig?: any; safetySettings?: any[] }): any; // Replace 'any' with a more specific model type
//     // Add other methods if used
// }
type OpenaiCompatibleApiCallerFn = (
    messages: any[], // Use specific OpenAIMessage type if imported
    modelIdentifier: string,
    provider: string,
    apiKey: string,
    options?: any // Use specific OpenAICallOptions type if imported
) => Promise<string | ReadableStream | null>;

// --- GLOBAL WINDOW INTERFACE AUGMENTATION ---
declare global {
  interface Window {
    polyglotPersonasDataSource?: PersonaDataSourceItem[];
    polyglotConnectors?: Connector[]; // Uses exported Connector
    polyglotGroupsData?: Group[];     // Uses exported Group
   polyglotMinigamesData?: Minigame[]; // Ensure this uses the Minigame type
    polyglotSharedContent?: SharedContent; // Uses exported SharedContent
    polyglotFilterLanguages?: LanguageFilterItem[]; // Uses exported LanguageFilterItem
    polyglotFilterRoles?: RoleFilterItem[];         // Uses exported RoleFilterItem
    polyglotApp: PolyglotApp; // Now PolyglotApp is defined
    domElements: YourDomElements; // YourDomElements might use exported types if deeply nested
    polyglotHelpers: PolyglotHelpersOnWindow; // This uses Connector and TranscriptTurn
    flagLoader: FlagLoader; // Uses exported FlagLoader
    aiApiConstants?: AIApiConstants; // <<< ADD THIS
    activityManager?: ActivityManager;
    aiService?: AIService;
   geminiLiveApiService?: GeminiLiveApiServiceModule; 
    groupManager?: GroupManager;
    textMessageHandler?: TextMessageHandler;
  voiceMemoHandler?: VoiceMemoHandler; // <<< USES THE EXPORTED INTERFACE
    chatActiveTargetManager?: ChatActiveTargetManager;
    chatSessionHandler?: ChatSessionHandler;
    chatOrchestrator?: ChatOrchestrator;
    chatManager?: ChatOrchestrator;
    sessionStateManager?: SessionStateManager;
    liveCallHandler?: LiveCallHandler;
    sessionHistoryManager?: SessionHistoryManager;
    sessionManager?: SessionManager;
    modalHandler?: ModalHandler;
    uiUpdater?: UiUpdater;
    cardRenderer?: CardRenderer;
    polyglotApp?: PolyglotApp; // Uses the exported PolyglotApp interface
    conversationManager?: ConversationManager; // Uses the exported ConversationManager
    groupManager?: GroupManager; // Uses the exported GroupManager
    listRenderer?: ListRenderer;
    shellSetup?: ShellSetup;
    reactionHandler?: ReactionHandlerModule; // <<< ADD THIS LINE
   liveApiMicInput?: LiveApiMicInput;
liveApiAudioOutput?: LiveApiAudioOutput;
liveApiTextCoordinator?: LiveApiTextCoordinator;
    shellController?: ShellController;
    filterController?: FilterController;
    personaModalManager?: PersonaModalManager;
    chatUiManager?: ChatUiManager;
    chatEventListeners?: ChatEventListeners;
    geminiTtsService?: GeminiTtsService;
    geminiTextGenerationService?: GeminiTextGenerationService;
    geminiMultimodalService?: GeminiMultimodalService;
    geminiRecapService?: GeminiRecapService;
   convoStore?: ConvoStoreModule;
    GEMINI_API_KEY?: string;
    GEMINI_API_KEY_ALT?: string;
    GEMINI_API_KEY_ALT_2?: string;
    GROQ_API_KEY?: string;
    TOGETHER_API_KEY?: string;
    identityService?: IdentityServiceModule;
    geminiApiCaller?: any;
    openaiCompatibleApiCaller?: any;
    groqSttCaller?: any;
    geminiTtsService?: any;
    geminiMultimodalService?: any;
    geminiRecapService?: any;
    jumpButtonManager?: JumpButtonManagerModule; // <<< ADD THIS LINE
   openaiCompatibleApiCaller?: OpenaiCompatibleApiCallerFn;
   polyglotConversationUpdated: CustomEvent<PolyglotConversationUpdatedEventDetail>;
    aiTextGenerationService?: any;
    convoDataStore?: any;
    convoTurnManager?: any;
   groupDataManager?: GroupDataManager;
    groupUiHandler?: GroupUiHandler;
    groupInteractionLogic?: GroupInteractionLogicModule; 
    liveApiMicInput?: any;
    liveApiAudioOutput?: any;
    liveApiTextCoordinator?: any;
    tabManager?: TabManagerModule;
    titleNotifier: TitleNotifierModule; // <<< ADD THIS LINE
    sidebarPanelManager?: SidebarPanelManagerModule;
      viewActionCoordinator?: ViewActionCoordinatorModule; // <<< ADD THIS
      geminiService?: GeminiServiceModule;
      aiRecapService?: AiRecapService
      memoryService?: MemoryServiceModule;
      identityService?: IdentityServiceModule;
      groupChatAttachBtn: HTMLButtonElement | null;
    groupChatImageUpload: HTMLInputElement | null;
    groupChatMicBtn: HTMLButtonElement | null;
  }
}






export {}; // Crucial: This makes the .d.ts file a module, allowing exports.