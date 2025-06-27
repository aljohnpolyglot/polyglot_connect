export interface Achievement {
    id: string;
    category: string; // New field
    name: string;
    description: string;
    icon: string;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Polyglot'; // Standardized tier names
    triggerHint: string;
    points: number; // Standardized points for tiers, can be adjusted
    secret?: boolean;
}

export const ACHIEVEMENTS_LIST: Achievement[] = [

    // Category: Onboarding & Profile
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: 'first_login',
        category: "Onboarding & Profile",
        name: "The Journey Begins",
        tier: 'Bronze',
        points: 10,
        icon: 'fas fa-door-open',
        description: "Successfully logged in for the first time. Welcome aboard!",
        triggerHint: "auth_manager.ts / app.ts: OnAuthStateChanged, if user.metadata.creationTime === user.metadata.lastSignInTime.",
    },
    {
        id: 'profile_complete',
        category: "Onboarding & Profile",
        name: "Identity Unlocked",
        tier: 'Bronze',
        points: 20,
        icon: 'fas fa-id-card',
        description: "Completed your user profile with essential details (name, languages).",
        triggerHint: "profile_editor.ts / user_settings_ui.ts: On profile save, if displayName, nativeLang, targetLang are set.",
    },
    {
        id: 'first_exploration',
        category: "Onboarding & Profile",
        name: "Curious Explorer",
        tier: 'Bronze',
        points: 15,
        icon: 'fas fa-search-location',
        description: "Visited the Chat, Groups, and Summary tabs.",
        triggerHint: "tab_manager.ts / shell_controller.ts: Track unique tabs visited. Award when set contains 'chat', 'groups', 'summary'.",
    },

    // Category: Communication Basics (1-on-1 & Group)
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: 'first_message_sent_any',
        category: "Communication Basics",
        name: "Breaking the Ice",
        tier: 'Bronze',
        points: 20,
        icon: 'fas fa-comment-medical',
        description: "Sent your very first message in any chat (1-on-1 or group).",
        triggerHint: "text_message_handler.ts OR group_manager.ts: After first successful message save to Firestore by user.",
    },
    {
        id: 'used_reaction_any',
        category: "Communication Basics",
        name: "Emoji Enthusiast",
        tier: 'Bronze',
        points: 15,
        icon: 'fas fa-smile-beam',
        description: "Reacted to a message in any chat.",
        triggerHint: "reaction_handler.ts: On successful addReactionToMessage, check 'firstReactionEver' flag.",
    },
    {
        id: 'used_translation_any',
        category: "Communication Basics",
        name: "Bridge Builder",
        tier: 'Bronze',
        points: 20,
        icon: 'fas fa-language',
        description: "Used the translation feature on a message.",
        triggerHint: "ai_translation_service.ts: On successful translateText, check 'firstTranslationUsed' flag.",
    },
    {
        id: 'sent_voice_memo_any',
        category: "Communication Basics",
        name: "Mic Check",
        tier: 'Bronze',
        points: 25,
        icon: 'fas fa-microphone',
        description: "Sent your first voice memo in any chat.",
        triggerHint: "text_message_handler.ts / group_manager.ts: When message with type 'voice_memo' is sent by user.",
    },
    {
        id: 'sent_image_any',
        category: "Communication Basics",
        name: "Shutterbug",
        tier: 'Bronze',
        points: 25,
        icon: 'fas fa-camera',
        description: "Shared your first image in any chat.",
        triggerHint: "text_message_handler.ts / group_manager.ts: When message with type 'image' (and imageFile) is sent by user.",
    },

    // Category: 1-on-1 Chat Mastery
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: 'chat_1v1_streak_3_days',
        category: "1-on-1 Chat Mastery",
        name: "Daily Chatter",
        tier: 'Silver',
        points: 50,
        icon: 'fas fa-calendar-day',
        description: "Chatted 1-on-1 on 3 consecutive days.",
        triggerHint: "user_stats_manager.ts: Track daily 1v1 activity, check streak.",
    },
    {
        id: 'chat_1v1_total_100_msgs',
        category: "1-on-1 Chat Mastery",
        name: "1-on-1 Centurion",
        tier: 'Silver',
        points: 75,
        icon: 'fas fa-comments',
        description: "Sent 100 messages in 1-on-1 chats.",
        triggerHint: "conversation_manager.ts: Increment userStats.messagesSent1v1. Award at 100.",
    },
    {
        id: 'chat_1v1_with_5_connectors',
        category: "1-on-1 Chat Mastery",
        name: "Connector Connoisseur",
        tier: 'Silver',
        points: 100,
        icon: 'fas fa-users',
        description: "Chatted with 5 different AI Connectors.",
        triggerHint: "conversation_manager.ts: Add connectorId to userStats.uniqueConnectorsMessaged. Award at size 5.",
    },
    {
        id: 'chat_1v1_long_convo_30',
        category: "1-on-1 Chat Mastery",
        name: "Deep Conversation",
        tier: 'Gold',
        points: 150,
        icon: 'fas fa-brainstorm', // Placeholder, brainstorming icon
        description: "Had a 1-on-1 conversation with over 30 messages (user & AI).",
        triggerHint: "conversation_manager.ts: Track messages per conversationId. Award if total >= 30.",
    },
    {
        id: 'chat_1v1_all_connectors',
        category: "1-on-1 Chat Mastery",
        name: "Master Networker",
        tier: 'Polyglot',
        points: 500,
        icon: 'fas fa-handshake',
        description: "You've had a 1-on-1 chat with every available AI Polyglot Connector!",
        triggerHint: "user_stats_manager.ts: userStats.uniqueConnectorsMessaged.size === polyglotConnectors.length",
        secret: true,
    },

    // Category: Voice Call Virtuoso
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: 'first_call_complete',
        category: "Voice Call Virtuoso",
        name: "First Contact",
        tier: 'Silver',
        points: 60,
        icon: 'fas fa-phone-volume',
        description: "Completed your first voice call (min. 1 minute).",
        triggerHint: "session_state_manager.ts: finalizeBaseSession, if call type & duration > 1min. Check 'firstCallCompleted' flag.",
    },
    {
        id: 'call_duration_10_min_total', // Changed from single call
        category: "Voice Call Virtuoso",
        name: "Talkative Talent",
        tier: 'Gold',
        points: 100,
        icon: 'fas fa-headset',
        description: "Accumulated 10 minutes of talk time across all voice calls.",
        triggerHint: "session_state_manager.ts: On finalizeBaseSession, add duration to userStats.totalCallTime. Award if >= 600_000 ms.",
    },
    {
        id: 'call_recap_viewer',
        category: "Voice Call Virtuoso",
        name: "Recap Reviewer",
        tier: 'Silver',
        points: 40,
        icon: 'fas fa-clipboard-check',
        description: "Viewed 3 AI-generated call recaps.",
        triggerHint: "ui_updater.ts: populateRecapModal. Increment userStats.recapsViewed. Award at 3.",
    },
    {
        id: 'call_streak_weekly',
        category: "Voice Call Virtuoso",
        name: "Weekly Caller",
        tier: 'Gold',
        points: 120,
        icon: 'fas fa-calendar-alt',
        description: "Made at least one voice call every week for 2 consecutive weeks.",
        triggerHint: "user_stats_manager.ts: Track weekly call activity. Award on 2nd consecutive week with a call.",
    },

    // Category: Group Guru
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: 'group_first_join',
        category: "Group Guru",
        name: "Newcomer",
        tier: 'Bronze',
        points: 30,
        icon: 'fas fa-user-friends',
        description: "Joined your first group.",
        triggerHint: "group_manager.ts: joinGroup success. Check 'firstGroupJoined' flag.",
    },
    {
        id: 'group_first_message',
        category: "Group Guru",
        name: "Icebreaker (Group)",
        tier: 'Silver',
        points: 40,
        icon: 'fas fa-bullhorn',
        description: "Sent your first message in any group chat.",
        triggerHint: "group_manager.ts: handleUserMessageInGroup success. Check 'firstGroupMessageSent' flag.",
    },
    {
        id: 'group_member_of_3',
        category: "Group Guru",
        name: "Community Hopper",
        tier: 'Gold',
        points: 100,
        icon: 'fas fa-project-diagram',
        description: "Became a member of 3 different groups.",
        triggerHint: "group_manager.ts: joinGroup. Increment userStats.uniqueGroupsJoinedSet.size. Award if >= 3.",
    },
    {
        id: 'group_contributor_50_msgs',
        category: "Group Guru",
        name: "Regular Contributor",
        tier: 'Gold',
        points: 150,
        icon: 'fas fa-comments-dollar', // (Dollar for value) - maybe fas fa-comment-alt-edit
        description: "Sent 50+ messages across all group chats.",
        triggerHint: "group_manager.ts: handleUserMessageInGroup. Increment userStats.totalGroupMessagesSent. Award if >= 50.",
    },
    {
        id: 'group_image_sharer',
        category: "Group Guru",
        name: "Group Album Artist",
        tier: 'Silver',
        points: 50,
        icon: 'fas fa-images',
        description: "Shared 5 images in group chats.",
        triggerHint: "group_manager.ts: handleUserMessageInGroup with imageFile. Increment userStats.imagesSentInGroups. Award if >= 5.",
    },

    // Category: AI & Learning Milestones
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: 'ai_memory_initiated',
        category: "AI & Learning Milestones",
        name: "First Impression",
        tier: 'Silver',
        points: 75,
        icon: 'fas fa-brain',
        description: "An AI formed its first long-term memory summary about you.",
        triggerHint: "memory_service.ts: saveMemorySummary success. Check 'firstMemorySavedForUser' flag.",
        secret: true,
    },
    {
        id: 'ai_used_your_memory',
        category: "AI & Learning Milestones",
        name: "I Remember You!",
        tier: 'Gold',
        points: 150,
        icon: 'fas fa-user-astronaut', // AI remembering
        description: "An AI Connector correctly used a piece of information from its long-term memory about you.",
        triggerHint: "ai_service.ts / text_message_handler.ts: AI response contains marker for memory usage OR specific persona interaction count after memory formed.",
        secret: true,
    },
    {
        id: 'language_practice_L1',
        category: "AI & Learning Milestones",
        name: "Language Explorer",
        tier: 'Bronze',
        points: 50,
        icon: 'fas fa-map-signs',
        description: "Completed a 15-minute focused language practice session.",
        triggerHint: "session_state_manager.ts / user_stats_manager.ts: If session is with 'tutor' or in 'Language Learning' group, check session duration >= 15 min.",
    },
    {
        id: 'language_practice_L2',
        category: "AI & Learning Milestones",
        name: "Fluent Voyager",
        tier: 'Silver',
        points: 150,
        icon: 'fas fa-plane-departure',
        description: "Accumulated 3 hours of language practice.",
        triggerHint: "user_stats_manager.ts: userStats.totalLanguagePracticeTimeMs >= 10800000 (3 hours).",
    },
    {
        id: 'ai_correction_accepted',
        category: "AI & Learning Milestones",
        name: "Growth Mindset",
        tier: 'Silver',
        points: 60,
        icon: 'fas fa-lightbulb-on',
        description: "Received and acknowledged (e.g., 'thanks!') an AI language correction.",
        triggerHint: "text_message_handler.ts: If AI response contains correction marker AND user replies positively/neutrally.",
        secret: true,
    },


    // Category: Platform Engagement & Loyalty
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: '7_day_streak_active',
        category: "Platform Engagement & Loyalty",
        name: "Weekly Regular",
        tier: 'Gold',
        points: 150,
        icon: 'fas fa-calendar-star',
        description: "Used the app actively (e.g., sent a message or made a call) on 7 consecutive days.",
        triggerHint: "user_stats_manager.ts: Track daily activity (any significant action). Check for 7-day streak.",
    },
    {
        id: '30_day_veteran',
        category: "Platform Engagement & Loyalty",
        name: "Month-Long Companion",
        tier: 'Gold',
        points: 200,
        icon: 'fas fa-medal',
        description: "Has been an active member for over 30 days.",
        triggerHint: "user_stats_manager.ts: (Date.now() - user.metadata.creationTime > 30 days) AND userStats.activeDays > N (e.g., 15).",
    },
    {
        id: 'polyglot_ambassador',
        category: "Platform Engagement & Loyalty",
        name: "Polyglot Ambassador",
        tier: 'Polyglot',
        points: 400,
        icon: 'fas fa-trophy',
        description: "Mastered multiple features and shown consistent engagement.",
        triggerHint: "achievement_manager.ts: Meta-achievement, unlocks if user has: 'language_practice_L2', 'active_in_group_discussion_20_msgs', 'chat_1v1_all_connectors'.",
    },
    {
        id: 'feedback_provided',
        category: "Platform Engagement & Loyalty",
        name: "Helpful Voice",
        tier: 'Silver',
        points: 50,
        icon: 'fas fa-comment-alt-lines',
        description: "Provided feedback through an in-app mechanism.",
        triggerHint: "feedback_module.ts: On successful feedback submission.",
        secret: true,
    },

    // Category: Special & Hidden
    //----------------------------------------------------------------------------------------------------
    // | ID                         | Category             | Name                      | Tier   | Points | Icon                | Description                                                                 | Trigger Hint (File: Relevant Module - Logic)                                                                                                 |
    // |----------------------------|----------------------|---------------------------|--------|--------|---------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
    {
        id: 'discovered_kawhi_secret', // Renamed from kawhi_fan_detected for consistency
        category: "Special & Hidden",
        name: "The Klaw's Nod",
        tier: 'Silver',
        points: 69,
        icon: 'fas fa-basketball-ball',
        description: "You and your AI found some common ground in basketball. HAHAHAHHA.",
        triggerHint: "ai_service.ts / text_message_handler.ts: AI response contains hidden marker '<!--KAWHI_ACKNOWLEDGED-->'.",
        secret: true,
    },
    {
        id: 'time_traveler',
        category: "Special & Hidden",
        name: "Time Traveler",
        tier: 'Bronze',
        points: 25,
        icon: 'fas fa-clock',
        description: "Sent a message exactly at HH:MM:SS where HH=MM=SS (e.g., 11:11:11).",
        triggerHint: "text_message_handler.ts / group_manager.ts: On message send, check `new Date().getHours() === new Date().getMinutes() === new Date().getSeconds()`.",
        secret: true,
    },
    {
        id: 'the_philosopher',
        category: "Special & Hidden",
        name: "The Philosopher",
        tier: 'Gold',
        points: 100,
        icon: 'fas fa-scroll-old',
        description: "Engaged in a particularly deep or lengthy philosophical discussion with an AI.",
        triggerHint: "ai_service.ts / text_message_handler.ts: If a conversation with a 'philosopher' persona type exceeds X messages OR specific keywords are used AND AI flags it internally.",
        secret: true,
    },
    {
        id: 'bug_hunter_prime', // Renamed from bug_squasher
        category: "Special & Hidden",
        name: "Elite Bug Hunter",
        tier: 'Polyglot',
        points: 250,
        icon: 'fas fa-spider', // More thematic
        description: "Reported a critical, validated bug that significantly improved the platform.",
        triggerHint: "Manual award by admin. This is for truly impactful reports.",
        secret: true,
    }
];

// Function to get an achievement by its ID
export function getAchievementById(id: string): Achievement | undefined {
    return ACHIEVEMENTS_LIST.find(ach => ach.id === id);
}