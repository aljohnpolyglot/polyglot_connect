// D:\polyglot_connect\js\types\global.d.ts
import type { AiRecapServiceModule as AiRecapService } from './services/ai_recap_service'; // Adjust path
export type AiRecapService = AiRecapServiceModule; // <<< ADD EXPORT HERE (or export the import directly)
import type { GeminiLiveApiServiceModule } from '../services/gemini_live_api_service'; 
import type { IdentityServiceModule } from '../services/identity_service';
import { GroupInteractionLogicModule } from '../core/group_interaction_logic';// --- SUB-INTERFACES for Persona/Connector ---
// IN global.d.ts - ADD THIS NEW INTERFACE
import type { Auth } from 'firebase/auth';
// D:\polyglot_connect\src\js\types\global.d.ts

// --- START: ADDED FIRESTORE TYPES ---
import type { Timestamp } from 'firebase/firestore';
export interface ChatSessionHandlerModule {
  initialize: () => void;
  openConversationInEmbeddedView: (
      connectorOrId: Connector | string,
      registeredUserNameForPrompt?: string // <<< MAKE SURE THIS IS PRESENT AND OPTIONAL
  ) => Promise<void>;
  handleMessagesTabBecameActive: () => Promise<void>;
  openMessageModalForConnector: (connector: Connector) => Promise<void>;
  endActiveModalMessagingSession: () => void;
}
// Represents the main document in the /conversations/{conversationId} collection
export interface ConversationDocument {
    participants: string[]; // Array of user UIDs
    participantDetails: {
        [uid: string]: {
            displayName: string;
            avatarUrl: string;
        }
    };
    lastActivity: Timestamp; // Firestore Server Timestamp
    lastMessage: {
        text: string;
        senderId: string;
    };
    isGroup: boolean; // false for 1-on-1 chats
    // Any other metadata for the conversation as a whole
    [key: string]: any;
}

// Represents a document in the /conversations/{conversationId}/messages sub-collection
export interface MessageDocument {
  messageId: string; // Your app's UUID
  senderId: string;  // Firebase UID or AI Connector ID
  senderName?: string; // <<< ADD/ENSURE THIS for group messages
  text: string | null; 
  type: 'text' | 'image' | 'voice_memo' | 'system_event' | 'call_event';
  timestamp: Timestamp; 
imageUrl?: string | null; // <<< MODIFIED
  imageSemanticDescription?: string; // <<< ADD THIS LINE if not present
  content_url?: string | null; // <<< ENSURE THIS IS PRESENT AND OPTIONAL
  eventType?: string;
  duration?: string;
  callSessionId?: string;
  connectorIdForButton?: string;
  reactions?: {
    [emoji: string]: string[]; 
  };
}

// --- END: ADDED FIRESTORE TYPES ---



export interface JumpButtonManagerModule {
  initialize: (initialTab: string) => void;
}
export interface Connector {
    id: string;
  liveApiModelName?: string;
    // Properties that might be added dynamically for active chats:
    messages?: Array<{ text?: string | null | undefined; sender?: string; timestamp?: number | string; [key: string]: any }>;
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
export interface KeyLifeEvent { // <<< Make sure 'export' is there
  event: string;
  date: string; 
  description?: string;
}

export type InterestsStructured = Record<string, string[] | string | undefined>; // <<< Make sure 'export' is there
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



export interface ApiKeyHealthStatus {
  nickname: string;
  provider: 'Gemini' | 'Together' | 'Groq' | 'OpenRouter';
  lastStatus: 'success' | 'failure';
  lastChecked: string;
  successCount: number;
  failureCount: number;
  lastError: string;
}

export interface ApiKeyHealthTrackerModule {
  initialize: () => void;
  getHealthData: () => { [nickname: string]: ApiKeyHealthStatus };
  reportStatus: (
      nickname: string,
      provider: 'Gemini' | 'Together' | 'Groq' | 'OpenRouter',
      status: 'success' | 'failure',
      error?: string
  ) => void;
}
export interface DevPanelModule {
  initialize: () => void;
  showToggleButton: () => void;
  toggle: () => void; // <<< ADD THIS LINE
}
export interface AIService {
  initialize: (deps: { // Assuming initialize exists and has its own deps
        aiTextGenerationService: AiTextGenerationServiceModule;
        geminiMultimodalService?: GeminiMultimodalServiceModule;
        // ... other dependencies AIService needs ...
    }) => void;

  cleanAndReconstructTranscriptLLM?: (
      rawTranscript: TranscriptTurn[],
      connector: Connector | null, // <<< FIX: Allow null
      userName?: string
  ) => Promise<string>;

  generateTextMessage: (
      promptOrText: string,
      connector: Connector | null, // <<< FIX: Allow null
      history?: Array<MessageInStore | GroupChatHistoryItem | GeminiChatItem> | null,
      preferredProvider?: string,
      expectJson?: boolean,
      context?: 'group-chat' | 'one-on-one',
      abortSignal?: AbortSignal,
      options?: { isTranslation?: boolean; [key: string]: any }
  ) => Promise<string | null | object>;

  generateTextFromImageAndText: (
      base64Data: string,
      mimeType: string,
      connector: Connector | null, // <<< FIX: Allow null
      history?: Array<MessageInStore | GroupChatHistoryItem | GeminiChatItem> | null, // Use consistent history type
      prompt?: string,
      preferredProvider?: string,
      abortSignal?: AbortSignal
  ) => Promise<string | null | object>;

  getTTSAudio: (
      textToSpeak: string,
      languageCode?: string,
      voiceName?: string,
      stylePrompt?: string | null
  ) => Promise<{ audioBase64: string; mimeType: string } | null >;

  generateTextForCallModal?: (
      userText: string,
      connector: Connector | null, // <<< FIX: Allow null
      modalCallHistory?: Array<MessageInStore | GroupChatHistoryItem | GeminiChatItem> | null // Use consistent history type
  ) => Promise<string | null>;

  generateSessionRecap: (
    cleanedTranscriptText: string,
    connector: Connector | null // <<< FIX: Allow null (if a recap could ever be generated without a specific partner)
                                 // Or keep as Connector if it's always required for recap context.
) => Promise<RecapData>;

  transcribeAudioToText?: (
      base64Audio: string,
      mimeType: string,
      langHint?: string,
      preferredProvider?: string
  ) => Promise<string | null>;

  [key: string]: any;
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
  lastMessage?: {
    text: string | null;
    senderId: string;
    senderName?: string; // <-- FIX: Made optional
    timestamp?: Timestamp | number; // <-- FIX: Made optional
    type?: 'text' | 'image' | 'voice_memo' | 'system_event'; // <-- FIX: Made optional
    imageUrl?: string;
};
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
  speakerId: string; // User ID, AI Connector ID
  text: string | null;
  timestamp: number;
  speakerName?: string;
imageUrl?: string | null; // <<< MODIFIED
audioBlobDataUrl?: string | null;
  imageSemanticDescription?: string; // <<< ENSURE THIS IS PRESENT
  imageMimeType?: string;
  imagePromptText?: string;
  isImageMessage?: boolean;
  base64ImageDataForAI?: string;
  isVoiceMemo?: boolean;
  audioBlobDataUrl?: string | null | undefined; // <<< Explicitly add undefined// <<< This seems to be what you use, ensure it's present
  messageId?: string; // App's UUID, ensure this is consistently used
  type?: 'text' | 'image' | 'voice_memo' | 'system_event' | 'call_event'; // <<< Corrected
  firestoreDocId?: string; // <<< ADD THIS: To store Firestore document ID for easy updates (e.g., reactions)
  imageSemanticDescription?: string;
  reactions?: { 
    [emoji: string]: string[]; 
  };
}

export interface GroupDataManager {
  addMessageToGroup: (
    groupId: string,
    senderId: string,
    text: string | null,
    type: GroupChatHistoryItem['type'],
    options: {
        appMessageId: string;
        timestamp: Date;
        senderName: string;
        imageUrl?: string | null;
        content_url?: string | null; // <<< ENSURE THIS IS PRESENT
        imageSemanticDescription?: string | null;
    }
) => Promise<string | null>;



  saveCurrentGroupChatHistory: (triggerListUpdate?: boolean) => void; // <<< THIS IS THE CORRECTION

  initialize: () => Promise<void>; // <<< MUST return Promise<void>
  getGroupDefinitionById: (groupId: string) => Group | null | undefined;
  getAllGroupDefinitions: (
    languageFilter?: string | null, 
    categoryFilter?: string | null, 
    nameSearch?: string | null
  ) => Array<Group & { isJoined?: boolean }>;
  isGroupJoined: (groupId: string) => boolean;

  // Firestore methods
  // REMOVE: listenToGroupMessages: (groupId: string) => void; // This moves to group_manager.ts
  addMessageToFirestoreGroupChat: (
    groupId: string,
    messageData: {
        appMessageId: string;
        senderId: string;
        senderName: string;
        text: string | null;
        imageUrl?: string;
        content_url?: string;
        imageSemanticDescription?: string; // <<< ENSURE THIS IS PRESENT
        type: 'text' | 'image' | 'voice_memo' | 'system_event';
        reactions?: { [key: string]: string[] };
    }
) => Promise<string | null>;

  getLoadedChatHistory: () => GroupChatHistoryItem[]; // For local cache access

  setCurrentGroupContext: (groupId: string | null, groupData: Group | null) => void;
  getCurrentGroupId: () => string | null | undefined;
  getCurrentGroupData: () => Group | null | undefined;
  getAllGroupDataWithLastActivity: () => ActiveGroupListItem[];

  _updateUserJoinedGroupState?: (groupId: string, isJoining: boolean) => void;
  addMessageToInternalCacheOnly: (message: GroupChatHistoryItem) => void;

  // Keep for local cache persistence if still desired by your implementation
  saveCurrentGroupChatHistory?: (triggerListUpdate?: boolean) => void; 
  
  // REMOVE or ensure it's not present:
  // loadGroupChatHistory?: (groupId: string) => GroupChatHistoryItem[];
  // addMessageToCurrentGroupHistory?: (message: GroupChatHistoryItem, options?: { triggerListUpdate?: boolean }) => void;
}


// D:\polyglot_connect\src\js\types\global.d.ts
// ... (Ensure YourDomElements, UiUpdater, ChatUiManager, ListRenderer, ViewManager,
//      GroupDataManager, Connector, Group, GroupChatHistoryItem are EXPORTED) ...
export interface GroupUiHandler {
  initialize: () => void;
  displayAvailableGroups: (groupsToDisplay: Group[], joinGroupCallback: (groupOrId: string | Group) => void) => void;
  showGroupChatView: (
    groupData: Group,
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
    userType: string, // Consider renaming to speakerId for clarity
    options?: ChatMessageOptions
  ) => HTMLElement | null; // Consistent return type
  clearGroupChatLog: () => void;
  openGroupMembersModal: () => void;
  openGroupInfoModal: (group: Group) => void;
  updateMessageStatus?: (messageId: string, statusKey: string, newUrl?: string | null) => void; // <<< ADD THIS LINE
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
      connector: Connector | null, // <<< ENSURE THIS IS Connector | null
      existingGeminiHistory: GeminiChatItem[],
      preferredProvider?: string, 
      expectJson?: boolean,
      context?: 'group-chat' | 'one-on-one', // <<< ADDED
      abortSignal?: AbortSignal,              // <<< ADDED
      options?: { isTranslation?: boolean; [key: string]: any } // <<< ADD THIS
  ) => Promise<string | null | object>;

  generateTextForCallModal?: (
      userText: string,
      connector: Connector | null, // <<< ENSURE THIS IS Connector | null
      modalCallHistory: GeminiChatItem[]
  ) => Promise<string | null>;

  generateTextFromImageAndTextOpenAI?: (
      base64ImageString: string,
      mimeType: string,
      connector: Connector | null, // <<< ENSURE THIS IS Connector | null
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
  startConversationFlow: (forceImmediateGeneration?: boolean) => void;
  stopConversationFlow: () => void;
  setUserTypingStatus: (isTyping: boolean) => void; // This might be deprecated if GIL's logic changes
  handleUserMessage: (
      text: string | undefined,
      options?: { userSentImage?: boolean; imageBase64Data?: string; imageMimeType?: string; }
  ) => Promise<{
      aiMessagesToPersist: Array<{
          speakerId: string;
          speakerName: string;
          text: string | null; // Text can be null if it's purely an image response part
          type: 'text' | 'image'; // Define what types AI can generate
          messageId: string; // App UUID generated by GIL
          imageSemanticDescription?: string; // If AI provides a description for an image it "sends"
          // Add any other fields you expect AI to provide for a message to be persisted
      }>
  } | null>; // Can be null if GIL decides not to send AI messages or an error/abort occurs
  simulateAiMessageInGroup: (isReplyToUser?: boolean, userMessageText?: string, imageContextForReply?: any) => Promise<void>; // Review if this needs to change based on new flow
  setAwaitingUserFirstIntroduction: (isAwaiting: boolean) => void;
  reset?: () => void;
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
    connector: Partial<Connector>; // <<< The key change is adding Partial<>

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
export interface ConvoStoreModule {
  // Initializes the cache (can be empty)
  initializeStore: () => void;

  // Gets a single conversation from the in-memory cache
  getConversationById: (conversationId: string) => ConversationRecordInStore | null;
  getAllConversationsAsArray: () => ConversationRecordInStore[];

  // Adds or updates a conversation in the cache (called by Firestore listener)
  cacheConversation: (conversationId: string, data: Partial<ConversationRecordInStore>) => void;

  // Adds a new message to a cached conversation (called by Firestore listener)
  cacheMessage: (conversationId: string, message: MessageInStore) => void;

  // Removes a conversation from the cache (e.g., if user is removed)
  removeConversationFromCache: (conversationId: string) => void;

  // Clears the entire cache on logout
  clearCache: () => void;

  // These methods for local-only data can remain
  getGeminiHistoryFromStore: (conversationId: string) => GeminiChatItem[];
  updateGeminiHistoryInStore: (conversationId: string, newHistoryArray: GeminiChatItem[]) => boolean;
  getGlobalUserProfile: (userId?: string) => string;
  updateGlobalUserProfile: (newSummary: string, userId?: string) => void;
  updateUserProfileSummary(conversationId: string, summary: string): void;
  addOptimisticMessage: (conversationId: string, message: MessageInStore) => void;
  // OBSOLETE METHOD: This will be removed from the implementation.
  saveAllConversationsToStorage: () => void;
}
// --- INTERFACE for DomElements (based on dom_elements.js and index.html) ---
export interface YourDomElements { // Ensure EXPORT




// in global.d.ts, inside YourDomElements interface
// Home View (Now a Dashboard)
homeViewGreeting: HTMLElement | null,
homeFindPartnerBtn: HTMLButtonElement | null,
homeJoinGroupBtn: HTMLButtonElement | null,
homeContinueChatBtn: HTMLButtonElement | null,
homeLastChatName: HTMLElement | null,
communityCallsStat: HTMLElement | null,
communityMessagesStat: HTMLElement | null,
communityUsersOnlineStat: HTMLElement | null,

// Account Panel (in Right Sidebar)
accountPanel: HTMLElement | null,
accountPanelAvatar: HTMLImageElement | null,
accountPanelDisplayName: HTMLElement | null,
accountPanelEmail: HTMLElement | null,
accountPanelPlanDetails: HTMLElement | null,
accountPanelSignOutBtn: HTMLButtonElement | null,

   //Image Input Send
   imagePreviewContainerEmbedded: HTMLElement | null;
   embeddedImageCaptionInput: HTMLInputElement | null;
 
   imagePreviewContainerModal: HTMLElement | null;
   modalImageCaptionInput: HTMLInputElement | null;
 
   imagePreviewContainerGroup: HTMLElement | null;
   groupImageCaptionInput: HTMLInputElement | null;
 // === ADD THIS NEW BLOCK FOR THE FREEMIUM MODAL ===
upgradeLimitModal: HTMLElement | null;
closeUpgradeModalBtn: HTMLButtonElement | null;
upgradeModalCtaBtn: HTMLButtonElement | null;
upgradeModalMaybeLaterBtn: HTMLButtonElement | null;
upgradeCallLimitModal: HTMLElement | null;
closeUpgradeCallModalBtn: HTMLButtonElement | null;
upgradeCallModalMaybeLaterBtn: HTMLButtonElement | null;



// === END OF NEW BLOCK ===
  
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
  devPanelToggleButton?: HTMLButtonElement | null; // <<< ADD 
  personaModalViewDossierBtn: HTMLButtonElement | null;
  // =================================================
   

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
  openUpgradeModal(modalType: 'text' | 'call' | 'image', daysUntilReset?: number): void;
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
}export interface MessageInStore {
  id?: string; // This is the Firestore document ID of the message
  messageId?: string; // This is your app's internal message UUID
  sender: string; // 'user', 'connector', 'system'
  text?: string;
  type: string;
  timestamp: number;
  content_url?: string;
  imageUrl?: string;
  eventType?: string;
  duration?: string;
  callSessionId?: string;
  connectorIdForButton?: string;
  connectorNameForDisplay?: string;
  isVoiceMemo?: boolean;
  audioBlobDataUrl?: string | null;
  transcriptText?: string;
  imageSemanticDescription?: string;
  imageInitialDescription?: string;
  reactions?: { // <<< ADD THIS
      [emoji: string]: string[];
  };
  [key: string]: any;
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
  scrollEmbeddedChatToBottom?: (chatLogElement: HTMLElement | null) => void; // <<< ADD ARGUMENT
  scrollMessageModalToBottom?: () => void;
  showLoadingInEmbeddedChatLog: () => void;
  showErrorInEmbeddedChatLog: (errorMessage: string) => void;
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
  imageUrl?: string | null; // <<< MODIFIED
  isThinking?: boolean;
  isError?: boolean;
  avatarUrl?: string;
  isVoiceMemo?: boolean;      // New: Indicates this is a user's voice memo
  audioSrc?: string | null | undefined; // Allow null     // New: Data URL for the audio blob to be played
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
    messages?: Array<{ 
      text?: string | null | undefined; // <<< FIX: Allow null
      sender?: string | undefined;
      speakerId?: string;
      speakerName?: string;
      timestamp?: number | string;
      [key: string]: any;
  }>;
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
  renderGroupMembersList: ( // <<< ADD THIS METHOD
    members: Connector[],
    tutorId: string | null | undefined, // Allow tutorId to be potentially null/undefined
    onMemberClick: (connector: Connector) => void,
    listElement: HTMLUListElement | null,
    searchTerm?: string
  ) => void;
  [key: string]: any;
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

// PASTE THIS REPLACEMENT INTERFACE in global.d.ts

export interface ActiveOneOnOneChatItem {
  id: string; // Connector ID (used as conversation ID for 1-on-1 in some contexts)
  isGroup: false;
  connector: Connector;
  messages: MessageInStore[]; // Array of messages in the conversation
  lastActivity: number;
  lastMessage?: {
    text: string | null;
    senderId: string;
    senderName: string;            // <-- This is required
    timestamp: Timestamp | number; // <-- This is required
    type: 'text' | 'image' | 'voice_memo' | 'system_event'; // <-- This is required
    imageUrl?: string;
};
  lastMessagePreview?: string; // Optimistic UI update
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
    lastMessagePreview?: string; // <<< FIX: Add the optional property
    isGroup: false; // Explicitly mark that this is not a group chat item
    geminiHistory?: GeminiChatItem[]; // Optional: The history formatted for Gemini API
    // Add any other properties that `conversationManager.getActiveConversations()` returns for each item.
}
export interface ConversationManager {
  // This will now set up the Firestore listener
  initialize: () => Promise<void>;

  // This now gets data from the local cache, so it stays synchronous
  getActiveConversations: () => ConversationItem[];
  getConversationById: (conversationId: string) => ConversationRecordInStore | null;

  // This will now write to Firestore, so it's async and its parameters change
  addMessageToConversation: (
    conversationId: string,
    text: string,
    type: 'text' | 'voice_memo' | 'image' | 'system_event' | 'call_event',
    extraData?: Partial<MessageDocument> & { 
        imageFile?: File | null; 
        imageUrl?: string | null; 
        messageIdToUse?: string; // <<< ADD THIS LINE
        mime_type?: string | null; // <<< ADDED HERE
    }
  ) => Promise<string | null>;

  // This now creates a new conversation document in Firestore
  ensureConversationRecord: (
      partnerConnector: Connector
  ) => Promise<string | null>; // Returns the new conversation ID

  // This will also write a special message to Firestore
  addSystemMessageToConversation: (
      conversationId: string,
      text: string,
      eventType?: string
  ) => Promise<string | null>;

  // This is no longer needed as Firestore handles timestamps
  // markConversationActive: (connectorId: string) => boolean;

  // The AI response will also be written to Firestore
  addModelResponseMessage: (
      conversationId: string,
      text: string
  ) => Promise<string | null>;

  // This remains the same, as Gemini history is a client-side concept for now
  getGeminiHistoryForConnector: (conversationId: string) => Promise<GeminiChatItem[]>;

  // This would need to be re-implemented to delete from Firestore
  clearConversationHistory: (conversationId: string) => Promise<void>;

  // This is the new method to set the active conversation and listen to its messages
  setActiveConversationAndListen: (conversationId: string) => Promise<void>;
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
  source_context: 'one_on_one' | 'group' | 'live_call' | 'ai_invention' | 'system_init'; // <<< ADDED 'system_init'
  source_persona_id: string; // The AI who originally learned/created the fact
  // <<< THIS IS THE ELEGANT FIX >>>
  known_by_personas: string[]; // Array of AI IDs who know this fact
}

export interface MemoryBank {
  core: MemoryFact[];
  episodic: MemoryFact[];
  fragile: MemoryFact[];
}

export interface CerebrumMemoryLedger {
  userId: string;
  user_memory: MemoryBank; // A single bank for all facts ABOUT the user
  ai_memory: { // A single place for all facts ABOUT the AIs
      [personaId: string]: MemoryBank;
  };
  last_updated: number;
}
export interface MemoryServiceModule {
  initialize: () => Promise<void>;
  processNewUserMessage: (
    text: string,
    personaIds: string | string[],
    context: 'one_on_one' | 'group' | 'live_call' | 'ai_invention',
    history?: MessageInStore[]
) => Promise<boolean>; // <<< THE FIX: Changed from void to boolean
  getMemoryForPrompt: (personaId: string) => Promise<{ prompt: string, facts: MemoryFact[] }>;
  seedInitialUserFact: ( // <<< ADD THIS WHOLE BLOCK
      personaIdForContext: string,
      factKey: string,
      factValue: string
  ) => Promise<void>;
  // Deprecated
  hasInteractedBefore: (userId: string, personaId: string) => Promise<boolean>;
  markInteraction: (userId: string, personaId: string) => Promise<void>;
  getMemory: (userId: string, personaId: string) => Promise<any>;
  updateMemory: (userId: string, personaId: string, memoryData: any) => Promise<void>;
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

export interface ImgurServiceModule {
  uploadImageToImgur: (imageFile: File) => Promise<string | null>;
}
// === ADD THIS NEW INTERFACE DEFINITION ===
export interface TextMessageHandlerDeps {
  uiUpdater: UiUpdater;
  aiService: AIService;
  conversationManager: ConversationManager;
  domElements: YourDomElements;
  polyglotHelpers: PolyglotHelpersOnWindow;
  chatOrchestrator?: ChatOrchestrator;
  aiApiConstants: AIApiConstants;
  activityManager: ActivityManager;
  modalHandler: ModalHandler; // <<< THE CRITICAL FIX
  getGroupPersonaSummary(connector: Connector, language: string): string;
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
      abortSignal?: AbortSignal,              // <<< 
      options?: { isTranslation?: boolean; [key: string]: any } // <<< ADD THIS
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
    toxicityStrikes: number; // <<< ADD THIS. Default to 0.
    isBlocked: boolean; // <<< ADD THIS. Default to false.
}
// Add these interfaces (or similar) if they are not already defined and exported

export interface ConversationRecordInStore { // << MAKE SURE THIS IS EXPORTED
  id: string; // Conversation ID
  connector?: Connector;
  messages: MessageInStore[];
  lastActivity: number;
  lastMessage?: { // This should mirror ConversationDocument.lastMessage
      text: string;
      senderId: string; // UID of the sender or "system"
      // Potentially add timestamp of this last message if useful for display
  };
  geminiHistory: GeminiChatItem[];
  userProfileSummary?: string;
  lastMessagePreview?: string; // For optimistic UI updates
}
// PASTE STARTS HERE
export interface SessionStateManager {
  initializeBaseSession: (connector: Connector, sessionType: string, callSessionId?: string, skipModalManagement?: boolean) => boolean; // CORRECTED: 4th arg, returns boolean
  markSessionAsStarted: () => Promise<boolean>; // <<< Changed to return a Promise
  addTurnToTranscript: (turn: TranscriptTurn) => void;
  getRawTranscript: () => TranscriptTurn[]; // Ensuring it's here
  getCurrentTranscript: () => TranscriptTurn[]; // Ensuring it's here
  getCurrentSessionDetails?: () => { // Optional method is fine
      connector?: Connector | null;
      sessionType?: string | null;
      sessionId?: string | null;
      startTime?: Date | null;
      transcript?: TranscriptTurn[];
      [key: string]: any;
  } | null;
  finalizeBaseSession: (generateRecap?: boolean, transcriptOverride?: TranscriptTurn[], cleanedTranscriptForRecap?: string | null) => Promise<void>; // Ensuring it's here and required
  resetBaseSessionState: () => void; // CORRECTED: Made required
  isSessionActive: () => boolean;
  recordFailedCallAttempt: (connector: Connector, reason?: string) => void; // CORRECTED: Made required

}
// PASTE ENDS 


// Inside src/js/types/global.d.ts

// Make sure YourDomElements, PolyglotHelpers, and ChatMessageOptions are imported or defined above
// import type { YourDomElements, PolyglotHelpersOnWindow as PolyglotHelpers, ChatMessageOptions } from './your-other-types-path';

export interface ChatUiUpdaterModule {
 
  initialize(deps: { domElements: YourDomElements, polyglotHelpers: PolyglotHelpers }): void;
  
  appendSystemMessage(
    logEl: HTMLElement | null, 
    text: string, 
    isError?: boolean, 
    isTimestamp?: boolean
  ): HTMLElement | null;
  
  appendChatMessage(
    logElement: HTMLElement | null, 
    text: string, 
    senderClass: string, 
    options?: ChatMessageOptions // This already handles images, voice memos, reactions for display
  ): HTMLElement | null;
  
  scrollChatLogToBottom(chatLogElement: HTMLElement | null): void;
  
  clearLogCache(logElement: HTMLElement): void;
  showLoadingInEmbeddedChatLog: () => void;
  showErrorInEmbeddedChatLog: (errorMessage: string) => void;
  // --- NEW METHODS NEEDED BY REACTION_HANDLER ---
  showUnifiedInteractionMenu: (
      triggerBubbleElement: HTMLElement, 
      currentUserReaction?: string // Optional: to pre-select an emoji in the menu
  ) => void;

  hideUnifiedInteractionMenu: () => void;

  // This method updates the small reaction badge (e.g., "👍 1") that appears on/below the message bubble
  updateDisplayedReactionOnBubble: (
      messageWrapperElement: HTMLElement, 
      newEmoji: string | null // null to clear the displayed reaction badge
  ) => void;

  // Helper to determine if a click event originated from within the unified menu
  isEventInsideUnifiedInteractionMenu: (event: Event) => boolean;

  // Optional but highly recommended: Checks if the unified menu is visible FOR A SPECIFIC BUBBLE
  isUnifiedInteractionMenuVisibleForBubble?: (triggerBubbleElement: HTMLElement) => boolean; 
  
  // Optional: A more general check if ANY unified menu is currently visible
  isUnifiedInteractionMenuVisible?: () => boolean; 

  // Optional helpers for updating the state of buttons WITHIN the unified menu
  // (if ChatUiUpdater is responsible for their visual state changes during/after actions)
  showMenuActionFeedback?: (
      menuButtonElement: HTMLElement, 
      feedbackText: string // e.g., "Copied!"
  ) => void;

  updateMenuTranslateButtonText?: (
      menuButtonElement: HTMLElement, 
      newButtonText: string // e.g., "Translate" or "Original"
  ) => void;

  showMenuActionInProgress?: (
      menuButtonElement: HTMLElement, 
      progressText: string // e.g., "Translating..."
  ) => void;

  resetMenuActionInProgress?: (
      menuButtonElement: HTMLElement, 
      defaultTextAfterProgress: string // e.g., "Translate" or "Original"
  ) => void;
  getWrapperForActiveUnifiedMenu?: () => HTMLElement | null; // <<< ADD OR ENSURE THIS LINE
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
// =================== REPLACE WITH THIS IN global.d.ts ===================
export interface ChatEventListenersModule {
  initializeEventListeners: (
      domElements: YourDomElements, 
      conversationManager: ConversationManager
  ) => void;
}
// ADD THIS AT THE BOTTOM of global.d.ts, BEFORE export {};
// ADD THIS AT THE BOTTOM of global.d.ts, BEFORE export {};
// ADD THIS AT THE BOTTOM of global.d.ts, BEFORE export {};

// in global.d.ts

export interface ReactionHandlerModule {
  initialize: (
    domElements: YourDomElements, 
    conversationManager: ConversationManager, 
    aiTranslationService: AiTranslationServiceModule,
    groupDataManager: GroupDataManager // <<< THIS IS THE FIX
  ) => void;
}
// in global.d.ts

// =================== REPLACE WITH THIS BLOCK ===================
export interface AiTranslationServiceModule {
  initialize: (deps: { 
      conversationManager: ConversationManager,
      aiService: AiServiceModule // It now depends on the main AI service.
      groupDataManager: GroupDataManager; // <<< ADD 
    
  }) => void;
  generateTranslation: (messageId: string, connectorId: string) => Promise<string | null>;
}
// ===============================================================
// =======================================================================
export interface GeminiChatServiceModule {
  initialize: () => void;
  generateResponse: (
    history: GeminiChatItem[],
    generationConfig?: { temperature?: number; maxOutputTokens?: number }
  ) => Promise<string | null>;
  // Add any other methods your text chat service has
}



export interface ConversationManagerModule {
  initialize: () => Promise<void>;
  getActiveConversations: () => ConversationItem[];
  getConversationById: (connectorId: string) => ConversationRecordInStore | null;
  addMessageToConversation: (
      connectorId: string,
      sender: string,
      text: string,
      type?: string,
      timestamp?: number,
      extraData?: Record<string, any>
  ) => Promise<MessageInStore | null>;
  ensureConversationRecord: (
      connectorId: string,
      connectorData?: Connector | null,
      options?: { setLastActivity?: boolean }
  ) => Promise<{ conversation: ConversationRecordInStore | null; isNew: boolean }>;
  addSystemMessageToConversation: (connectorId: string, systemMessageObject: Partial<MessageInStore>) => Promise<boolean>;
  markConversationActive: (connectorId: string) => boolean;
  addModelResponseMessage: (
      connectorId: string,
      text: string,
      messageId: string,
      timestamp: number
  ) => Promise<MessageInStore | null>;
  getGeminiHistoryForConnector: (connectorId: string) => Promise<GeminiChatItem[]>;
  clearConversationHistory: (connectorId: string) => Promise<void>;
  saveAllConversationsToStorage: () => void; // <<< ADD THIS LINE
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
    convoPromptBuilder?: ConvoPromptBuilderModule;
    imgurService?: ImgurServiceModule; // <<< ADD THIS LINE
    apiKeyHealthTracker?: ApiKeyHealthTrackerModule;
    devPanel?: DevPanelModule;
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
    auth?: Auth; // <<< ADD THIS LINE
    uiUpdater?: UiUpdater;
    reactionHandler?: ReactionHandlerModule;
aiTranslationService?: AiTranslationServiceModule;
    chatUiUpdater?: ChatUiUpdaterModule; // <<< ADD THIS LINE
    cardRenderer?: CardRenderer;
    polyglotApp?: PolyglotApp; // Uses the exported PolyglotApp interface
    conversationManager?: ConversationManager; // Uses the exported ConversationManager
    groupManager?: GroupManager; // Uses the exported GroupManager
    listRenderer?: ListRenderer;
    shellSetup?: ShellSetup;
    chatSessionHandler?: ChatSessionHandlerModule;
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
  
    memoryBank: MemoryBank;
    personaMemory: PersonaMemory;
    cerebrumMemoryLedger: CerebrumMemoryLedger;
    
  }
}






export {}; // Crucial: This makes the .d.ts file a module, allowing exports.