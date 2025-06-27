// D:\polyglot_connect\src\js\core\conversation_manager.ts (Facade)
// D:\polyglot_connect\src\js\core\conversation_manager.ts (Facade)
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    deleteDoc,
    writeBatch,
    getDocs
} from "firebase/firestore";
import { auth, db } from '../firebase-config'; // Your Firebase config
import { onAuthStateChanged, type User } from "firebase/auth";
import type {
    Connector,
    ConversationManager, // <<< Use the new, correct interface name
    ConversationRecordInStore,
    ConvoStoreModule,
    GeminiChatItem,
    PolyglotHelpersOnWindow,
    ConversationItem,
    ChatOrchestrator,
    // --- ADD THESE NEW IMPORTS ---
    ConversationDocument,
    MessageDocument,
    MessageInStore
} from '../types/global.d.ts';
import { buildInitialGeminiHistory as cpb_buildInitialGeminiHistory } from './convo_prompt_builder';
import { USAGE_LIMITS } from '../constants/appConstants.js';
console.log('conversation_manager.ts (Facade): Script loaded, waiting for core dependencies.');
console.log('FIRESTORE_CM: Firestore Conversation Manager is loading...'); // New Log

// Define the internal module interface. This is what the file will promise to build.
// It MUST match the structure of the object returned by the IIFE.


interface ConversationManagerModule {
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

// The placeholder on the window uses the internal module type.
window.conversationManager = {} as ConversationManager;
console.log('conversation_manager.ts (Facade): Placeholder window.conversationManager assigned.');

function initializeActualConversationManager(): void {
    console.log("conversation_manager.ts (Facade): initializeActualConversationManager() called.");

    type VerifiedDeps = {
        polyglotHelpers: PolyglotHelpersOnWindow;
        convoStore: ConvoStoreModule;
        chatOrchestrator?: ChatOrchestrator;
        polyglotConnectors: Connector[];
    };

    const getSafeDeps = (): VerifiedDeps | null => {
        const deps = {
            polyglotHelpers: window.polyglotHelpers,
            convoStore: window.convoStore,
            chatOrchestrator: window.chatOrchestrator,
            polyglotConnectors: window.polyglotConnectors
        };
        const missing: string[] = [];
        if (!deps.polyglotHelpers?.generateUUID) missing.push("polyglotHelpers");
        if (!deps.convoStore?.getConversationById) missing.push("convoStore");
        if (!deps.polyglotConnectors || !Array.isArray(deps.polyglotConnectors)) missing.push("polyglotConnectors");
        if (deps.chatOrchestrator && !deps.chatOrchestrator.notifyNewActivityInConversation) {
            console.warn("CM (Facade): chatOrchestrator missing notifyNewActivityInConversation.");
        }
        if (missing.length > 0) {
            console.error(`CM (Facade): getSafeDeps - MISSING/INVALID: ${missing.join(', ')}.`);
            return null;
        }
        return deps as VerifiedDeps;
    };

    const resolvedDeps = getSafeDeps();

    if (!resolvedDeps) {
        console.error("conversation_manager.ts (Facade): CRITICAL - Core functional dependencies not met. Placeholder remains.");
        document.dispatchEvent(new CustomEvent('conversationManagerReady'));
        console.warn('conversation_manager.ts (Facade): "conversationManagerReady" event dispatched (initialization FAILED).');
        return;
    }
    console.log('conversation_manager.ts (Facade): Core functional dependencies appear ready.');

    const facadeMethods = ((): ConversationManager => {
        'use strict';
        console.log("conversation_manager.ts (Firestore Version): IIFE STARTING.");
    
        const { polyglotHelpers, convoStore, chatOrchestrator, polyglotConnectors } = resolvedDeps;
    
        let unsubscribeFromConversations: (() => void) | null = null;
        let unsubscribeFromMessages: (() => void) | null = null;
    
        // --- Firestore Listener ---
      // PASTE THIS NEW CODE BLOCK in conversation_manager.ts

async function initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
        // This function from Firebase waits to tell us if a user is logged in.
        const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
            unsubscribeAuth(); // We only need to check once at startup.

            if (user) {
                // OK, we have a user! Now we can set up the chat listener.
                console.log(`CM_FIRESTORE: Auth ready. Setting up listener for user ${user.uid}...`);
                
                if (unsubscribeFromConversations) unsubscribeFromConversations();

                const q = query(
                    collection(db, "conversations"),
                    where("participants", "array-contains", user.uid),
                    orderBy("lastActivity", "desc")
                );

                unsubscribeFromConversations = onSnapshot(q, (querySnapshot) => {
                    querySnapshot.docChanges().forEach((change) => {
                        const docData = change.doc.data() as ConversationDocument;
                        const conversationId = change.doc.id;
                        const partnerId = docData.participants.find((p: string) => p !== user.uid);
                        const partnerConnector = polyglotConnectors.find(c => c.id === partnerId);
        
                        if ((change.type === "added" || change.type === "modified") && partnerConnector) {
                            // Make sure docData.lastMessage is an object, even if empty, to match ConversationRecordInStore type
                            const lastMessageData = docData.lastMessage && typeof docData.lastMessage.text === 'string' && typeof docData.lastMessage.senderId === 'string'
                                ? docData.lastMessage
                                : { text: "[No preview available]", senderId: "system" }; // Default if invalid or missing
                        
                            const cacheData: Partial<ConversationRecordInStore> = { // Use Partial because not all fields are set here
                                id: conversationId,
                                connector: partnerConnector,
                                lastActivity: docData.lastActivity ? docData.lastActivity.toMillis() : Date.now(),
                                lastMessage: lastMessageData,
                            };
                            console.log(`CM_CONVO_LISTENER_DEBUG: Caching conversation ${conversationId}. LastMessage from Firestore:`, JSON.parse(JSON.stringify(docData.lastMessage)), "Cache data for convoStore:", JSON.parse(JSON.stringify(cacheData)));
                            convoStore.cacheConversation(conversationId, cacheData);
                        }
                        if (change.type === "removed") {
                            convoStore.removeConversationFromCache(conversationId);
                        }
                    });
                    document.dispatchEvent(new CustomEvent('polyglot-conversation-updated', { detail: { type: 'one-on-one', id: 'batch-update' } }));
                }, (error) => {
                    console.error("CM_FIRESTORE: Error listening to conversations:", error);
                    reject(error); // If the listener fails, we have a problem.
                });

                // Everything is set up, so we tell the app it can continue.
                resolve(); 

            } else {
                // If we get here, no user is logged in.
                console.error("CM_FIRESTORE: Auth check complete, but no user is signed in.");
                if (unsubscribeFromConversations) unsubscribeFromConversations();
                convoStore.clearCache();
                reject(new Error("User not authenticated.")); // Tell the app there was a problem.
            }
        });
    });
}
    
      // in conversation_manager.ts
      // Replace with this new signature and add `return new Promise(...)`
async function setActiveConversationAndListen(conversationId: string | null): Promise<void> {
    if (unsubscribeFromMessages) {
        unsubscribeFromMessages();
        unsubscribeFromMessages = null;
    }

    if (!conversationId) return;

    const user = auth.currentUser;
    if (!user) {
        console.error("CM: Cannot set active conversation, no user.");
        return;
    }

    let conversationRecord = convoStore.getConversationById(conversationId);
    if (!conversationRecord) {
        const conversationDocRef = doc(db, "conversations", conversationId);
        const conversationSnap = await getDoc(conversationDocRef);

        if (conversationSnap.exists()) {
            const conversationData = conversationSnap.data() as ConversationDocument;
            const partnerId = conversationData.participants.find(p => p !== user.uid);
            const partnerConnector = polyglotConnectors.find(c => c.id === partnerId);
            
            if (partnerConnector) {
                convoStore.cacheConversation(conversationId, {
                    id: conversationId,
                    connector: partnerConnector,
                    lastActivity: conversationData.lastActivity?.toMillis() ?? Date.now(),
                });
                console.log(`CM: Proactively cached conversation ${conversationId} to resolve race condition.`);
            } else {
                console.error(`CM: Could not find partner connector for conversation ${conversationId}.`);
                return; 
            }
        } else {
            console.error(`CM: setActive - Document for conversation ${conversationId} does not exist.`);
            return;
        }
    }

    const messagesQuery = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy("timestamp", "asc")
    );

    // This Promise wrapper is the key change
    return new Promise((resolve, reject) => {
        unsubscribeFromMessages = onSnapshot(messagesQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    // This part of your code is already correct
                 
                    const msgData = change.doc.data() as MessageDocument;
                 
                    if (msgData.type === 'call_event') {
                        console.log(`%c[CM | LOG #3] RETRIEVED: Reading call_event from Firestore.`, 'color: #fff; background: #FF4500;', {
                            retrievedMsgData: msgData
                        });
                    }
                 
                 
                 
                 
                    const user = auth.currentUser;

                    if (msgData.type === 'call_event') {
                        console.log('%c[BRUTE FORCE] #5: CONVO_MANAGER found a call_event in Firestore', 'color: #FF4500; font-weight: bold;', {
                            firestoreDocId: change.doc.id,
                            retrievedMsgData: msgData
                        });
                    }
                    const messageForCache: MessageInStore = {
                        id: change.doc.id, 
                        messageId: msgData.messageId, 
                        sender: msgData.senderId === user?.uid ? 'user' : (msgData.senderId === "system" ? "system" : "connector"),
                        text: msgData.text || "", 
                        type: msgData.type,
                        timestamp: msgData.timestamp?.toMillis() ?? Date.now(),
                        imageUrl: msgData.imageUrl === null ? undefined : msgData.imageUrl, // <<< FIX
                        content_url: msgData.content_url === null ? undefined : msgData.content_url, // <<< FIX
                        eventType: msgData.eventType,
                        duration: msgData.duration,
                        callSessionId: msgData.callSessionId,
                        connectorIdForButton: msgData.connectorIdForButton,
                        reactions: msgData.reactions, 
                        connectorNameForDisplay: '' // This might need proper population if used
                    };
                    if (messageForCache.type === 'call_event') {
                        console.log(`%c[CM | LOG #4] CACHED: Object being placed into convoStore.`, 'color: #fff; background: #2E8B57;', {
                            cachedObject: messageForCache
                        });
                    }
                    console.log("CM_MESSAGE_CACHE (Corrected): Caching messageForStore:", JSON.parse(JSON.stringify(messageForCache)));
                    convoStore.cacheMessage(conversationId, messageForCache);
                }
            });
            document.dispatchEvent(new CustomEvent('polyglot-conversation-updated', {
                detail: { type: 'one-on-one', id: conversationId, source: 'message-listener' }
            }));
            resolve(); // <<< This signals that the initial data is loaded
        }, (error) => {
            console.error(`CM: Error on message listener for ${conversationId}`, error);
            reject(error);
        });
    });
}
        // --- Data Getters (read from local cache) ---
        function getActiveConversations(): ConversationItem[] {
            return convoStore.getAllConversationsAsArray() as ConversationItem[];
        }
    
        function getConversationById(conversationId: string): ConversationRecordInStore | null {
            return convoStore.getConversationById(conversationId);
        }
    
        // --- Data Writers (write to Firestore) ---
        async function ensureConversationRecord(partnerConnector: Connector): Promise<string | null> {
            const user = auth.currentUser;
            if (!user) {
                console.error("CM_FIRESTORE: Cannot ensure record, no user logged in.");
                return null;
            }
            const partnerId = partnerConnector.id;
            const conversationId = [user.uid, partnerId].sort().join('_');
            const conversationRef = doc(db, "conversations", conversationId);
        
            // --- THIS IS THE FIX ---
            // Declare the variable here, outside the try block.
            let newConversationData: ConversationDocument | null = null;
        
            try {
                const docSnap = await getDoc(conversationRef);
                if (docSnap.exists()) {
                    console.log(`CM_FIRESTORE: Conversation ${conversationId} already exists.`);
                    return conversationId;
                }
        
                console.log(`CM_FIRESTORE: Creating new conversation document: ${conversationId}`);
                
                // Assign the value inside the try block.
                newConversationData = {
                    participants: [user.uid, partnerId],
                    participantDetails: {
                        [user.uid]: { displayName: user.displayName || "You", avatarUrl: user.photoURL || "" },
                        [partnerId]: { displayName: partnerConnector.profileName, avatarUrl: partnerConnector.avatarModern }
                    },
                    lastActivity: serverTimestamp() as Timestamp,
                    lastMessage: { text: "Conversation created.", senderId: "system" },
                    isGroup: false
                };
        
                await setDoc(conversationRef, newConversationData);
        
                console.log(`CM_FIRESTORE: New conversation ${conversationId} successfully created in Firestore.`);
                return conversationId;
        
            } catch (error) {
                // Now the variable is accessible here.
                console.error(`%c[CM_ENSURE_RECORD] Firestore write FAILED for path: /conversations/${conversationId}`, 'color: white; background-color: #dc3545; padding: 2px; font-weight: bold;');
                console.error('[CM_ENSURE_RECORD] Failing User UID:', user.uid);
                console.error('[CM_ENSURE_RECORD] The data that was REJECTED was:', newConversationData ? JSON.parse(JSON.stringify(newConversationData)) : 'Data object was null');
                console.error('[CM_ENSURE_RECORD] The specific Firebase error is:', error);
                return null;
            }
        }
      // Inside the IIFE of D:\polyglot_connect\src\js\core\conversation_manager.ts
// Inside the IIFE of D:\polyglot_connect\src\js\core\conversation_manager.ts
// (This replaces or implements the addMessageToConversation function within your IIFE)


async function addMessageToConversation(
    conversationId: string,
    text: string, // For image messages, this is the caption
    type: 'text' | 'voice_memo' | 'image' | 'system_event' | 'call_event',
    extraData: Partial<MessageDocument & { 
        messageIdToUse?: string; // App's UUID for optimistic UI reconciliation
        imageFile?: File | null;    // Original file, used by freemium logic to decide if an image *was* sent
        imageUrl?: string | null;   // This will be the Imgur URL if type is 'image'
        // other fields like imageSemanticDescription, eventType, etc.
    }> = {}
): Promise<string | null> { // Returns Firestore Message ID (string) or null
    const functionName = "CM.addMessageToConversation";
    if (type === 'call_event') {
        console.log(`%c[CM | LOG #2] HANDOFF: Received by addMessageToConversation.`, 'color: #fff; background: #8B008B;', extraData);
    }

    const user = auth.currentUser;
    if (!user) {
        console.error(`${functionName}: Cannot send message, no user logged in.`);
        return null;
    }

    const messagesColRef = collection(db, `conversations/${conversationId}/messages`);
    const conversationDocRef = doc(db, "conversations", conversationId);

    // Use the ID from optimistic UI if provided, otherwise generate a new one.
    // This ID is for the Firestore document and for your app's internal tracking.
    const appUniqueMessageId = extraData.messageIdToUse || extraData.messageId || polyglotHelpers.generateUUID();

    let finalImageUrlToStoreInFirestore: string | undefined = undefined;

    // --- Freemium Logic for Storing Imgur URL ---
    if (type === 'image') {
        // Check user's plan to see if they get permanent storage for the Imgur link
        const userDoc = await getDoc(doc(db, "users", user.uid));
        // Default to 'free' if plan is not set or userDoc doesn't exist (though user should exist if auth.currentUser is set)
        const userPlan = userDoc.exists() ? userDoc.data()?.plan || 'free' : 'free';
        // Check if the plan allows storing image URLs (imageStorage > 0 means permanent storage is allowed)
        const imageStorageAllowed = USAGE_LIMITS[userPlan as keyof typeof USAGE_LIMITS]?.imageStorage > 0;

        if (imageStorageAllowed && extraData.imageUrl) {
            // If storage is allowed and an Imgur URL was provided (from text_message_handler/group_manager)
            finalImageUrlToStoreInFirestore = extraData.imageUrl;
            console.log(`%c[CM | Freemium] User plan '${userPlan}' allows Imgur URL storage. Storing: ${finalImageUrlToStoreInFirestore}`, 'color: green;');
        } else if (extraData.imageUrl) {
            // An Imgur URL was provided, but the user's plan doesn't allow storing it.
            console.log(`%c[CM | Freemium] User plan '${userPlan}' does NOT allow permanent Imgur URL storage. Link ${extraData.imageUrl} will NOT be saved to Firestore.`, 'color: orange;');
            // finalImageUrlToStoreInFirestore remains undefined.
        } else if (!extraData.imageUrl && extraData.imageFile) {
            // This case might occur if Imgur upload failed in the calling handler, but an imageFile was still passed.
            console.warn(`%c[CM] Image message type, imageFile present, but no imageUrl (Imgur link) provided. This might happen if Imgur upload failed.`, 'color: orange;');
        }
        // If type is 'image' but no extraData.imageUrl was provided (e.g., Imgur upload failed before calling CM),
        // then finalImageUrlToStoreInFirestore will correctly be undefined.
    }

    let finalSenderId: string;
    if (type === 'call_event' || type === 'system_event') {
        finalSenderId = extraData.senderId || 'system';
    } else if (extraData.senderId) { // If senderId is explicitly provided (e.g., for AI voice memo)
        finalSenderId = extraData.senderId;
    } else if (user) { // Fallback to current user if no explicit senderId and not system event
        finalSenderId = user.uid;
    } else {
        console.error(`${functionName}: Cannot determine senderId. No user and no explicit senderId provided for non-system message.`);
        return null; // Or handle as an error appropriately
    }
    if (type === 'call_event') {
        console.log(
            '%c[CALL_EVENT_TRACE #2] CM: Received by addMessageToConversation. Data to be written to Firestore:', 
            'color: white; background-color: #008B8B; padding: 2px;',
            JSON.parse(JSON.stringify(extraData))
        );
    }
    // Construct the Firestore document for the message
    const newMessageDocForFirestore: MessageDocument = {
        messageId: appUniqueMessageId, // Your app's unique ID for the message
        senderId: finalSenderId,
        text: text, // Caption for images, text for text/voice messages
        type: type,
        timestamp: serverTimestamp() as Timestamp, // Firestore server-generated timestamp
        // Conditionally add fields if they exist in extraData or were derived
        ...(finalImageUrlToStoreInFirestore && { imageUrl: finalImageUrlToStoreInFirestore }),
        ...(extraData.imageSemanticDescription && { imageSemanticDescription: extraData.imageSemanticDescription }),
        ...(extraData.content_url && { content_url: extraData.content_url }), // For voice memos, etc.
        ...(extraData.eventType && { eventType: extraData.eventType }),
        ...(extraData.duration && { duration: extraData.duration }),
        ...(extraData.callSessionId && { callSessionId: extraData.callSessionId }),
        ...(extraData.connectorIdForButton && { connectorIdForButton: extraData.connectorIdForButton }),
        ...(extraData.reactions && { reactions: extraData.reactions }) // Persist reactions
    };

    if (type === 'call_event') {
        console.log(`%c[CM_ADD_MSG_DEBUG] Preparing to save CALL_EVENT message to Firestore:`, 'color: orange; font-weight: bold;', JSON.parse(JSON.stringify(newMessageDocForFirestore)));
    } else {
        console.log(`${functionName}: Message doc to be added to Firestore:`, JSON.parse(JSON.stringify(newMessageDocForFirestore)));
    }

    try {
        const messageDocRef = await addDoc(messagesColRef, newMessageDocForFirestore);
        console.log(`${functionName}: Message successfully added. Firestore ID: ${messageDocRef.id}, App ID: ${appUniqueMessageId}`);

        // Update the lastMessage on the parent conversation document
        const lastMessageTextPreview = text ? text.substring(0, 100) : 
                                       (type === 'image' ? (finalImageUrlToStoreInFirestore ? '[image]' : '[image (not saved)]') : 
                                       (type === 'voice_memo' ? '[voice memo]' : 
                                       (type === 'call_event' ? `[Call: ${extraData.eventType || 'event'}]` : 
                                       '[event]')));
                                       
        const lastMessageUpdateData: Partial<ConversationDocument['lastMessage']> & { type?: string, timestamp?: any, callSessionId?: string, connectorIdForButton?: string, duration?: string, eventType?: string } = {
            text: lastMessageTextPreview,
            senderId: finalSenderId,
            type: type, // Store the type of the last message
            timestamp: serverTimestamp() // Keep this for sorting/display if needed directly on convo doc
        };

        // Include call-specific details in lastMessage if it's a call_event for better preview
        if (type === 'call_event') {
            if (newMessageDocForFirestore.callSessionId) lastMessageUpdateData.callSessionId = newMessageDocForFirestore.callSessionId;
            if (newMessageDocForFirestore.connectorIdForButton) lastMessageUpdateData.connectorIdForButton = newMessageDocForFirestore.connectorIdForButton;
            if (newMessageDocForFirestore.duration) lastMessageUpdateData.duration = newMessageDocForFirestore.duration;
            if (newMessageDocForFirestore.eventType) lastMessageUpdateData.eventType = newMessageDocForFirestore.eventType;
        }
        
        console.log(`%c[CM_UPDATE_LAST_MSG] Updating lastMessage on parent conversation ${conversationId} with:`, 'color: blue; font-weight: bold;', JSON.parse(JSON.stringify(lastMessageUpdateData)));

        await updateDoc(conversationDocRef, {
            lastActivity: serverTimestamp(), // Keep lastActivity for primary sorting
            lastMessage: lastMessageUpdateData
        });
        console.log(`${functionName}: Parent conversation's lastActivity and lastMessage updated successfully.`);

        return messageDocRef.id; // Return the Firestore document ID of the new message

    } catch (error) {
        console.error(`${functionName}: CRITICAL FAILURE adding message or updating lastActivity for conversation ${conversationId}:`, error);
        console.error("Failed message data:", JSON.parse(JSON.stringify(newMessageDocForFirestore)));
        return null;
    }
}
    
     // in conversation_manager.ts
// Inside the IIFE of D:\polyglot_connect\src\js\core\conversation_manager.ts
// Inside the IIFE of D:\polyglot_connect\src\js\core\conversation_manager.ts

async function addModelResponseMessage(
    // Signature from global.d.ts ConversationManager interface
    conversationId: string,
    text: string
): Promise<string | null> { // Returns Firestore Message ID (string) or null
    const user = auth.currentUser; // Needed to derive partnerId
    if (!user) {
        console.error("CM_FIRESTORE (Facade): Cannot add model response, no user context for deriving partner.");
        return null;
    }
    
    const participants = conversationId.split('_');
    const partnerId = participants.find(p => p !== user.uid);

    if (!partnerId) {
        console.error(`CM_FIRESTORE (Facade): Could not derive partner ID from conversationId "${conversationId}" for user "${user.uid}".`);
        return null;
    }
    
    const messagesColRef = collection(db, `conversations/${conversationId}/messages`);
    const conversationDocRef = doc(db, "conversations", conversationId);

    // --- FIX for messageId ---
    const uniqueMessageIdForDoc = polyglotHelpers.generateUUID(); // AI messages generate their own new ID here

    const newAiMessageDocForFirestore: MessageDocument = {
        messageId: uniqueMessageIdForDoc, // <<< GUARANTEED STRING
        senderId: partnerId,             // AI (partner) is the sender
        text: text,
        type: 'text',
        timestamp: serverTimestamp() as Timestamp,
    };

    console.log("CM_FIRESTORE (Facade): AI message doc to be added:", JSON.parse(JSON.stringify(newAiMessageDocForFirestore)));
    try {
        const messageDocRef = await addDoc(messagesColRef, newAiMessageDocForFirestore);
        
        await updateDoc(conversationDocRef, {
            lastActivity: serverTimestamp(),
            lastMessage: { text: text.substring(0, 50), senderId: partnerId }
        });
        return messageDocRef.id; // Return Firestore document ID
    } catch (error) {
         console.error("CM_FIRESTORE (Facade): Error adding AI response:", error);
        return null;
    }
}
      // Inside the IIFE of D:\polyglot_connect\src\js\core\conversation_manager.ts
// Inside the IIFE of D:\polyglot_connect\src\js\core\conversation_manager.ts
// src/js/core/conversation_manager.ts

async function addSystemMessageToConversation(
    // The key change: We accept a connectorId, not a pre-computed conversationId
    forConnectorId: string, 
    text: string,
    eventTypeInput?: string
): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null; // No user, can't do anything

    // Re-create the conversationId here, ensuring it's always correct
    const conversationId = [user.uid, forConnectorId].sort().join('_');

    const messagesColRef = collection(db, `conversations/${conversationId}/messages`);
    
    const uniqueMessageIdForDoc = polyglotHelpers.generateUUID();
    const typeForMessage = (eventTypeInput || 'system_event') as MessageDocument['type'];

    const systemMessageDocForFirestore: MessageDocument = {
        messageId: uniqueMessageIdForDoc,
        senderId: "system",
        text: text,
        type: typeForMessage,
        timestamp: serverTimestamp() as Timestamp,
        ...(eventTypeInput && { eventType: eventTypeInput }),
    };

    console.log("CM_FIRESTORE (Facade): System message doc to be added:", JSON.parse(JSON.stringify(systemMessageDocForFirestore)));
    try {
        const docRef = await addDoc(messagesColRef, systemMessageDocForFirestore);
        
        // This is a good place to update the last activity for system messages
        const conversationDocRef = doc(db, "conversations", conversationId);
        await updateDoc(conversationDocRef, {
            lastActivity: serverTimestamp(),
            lastMessage: { text: text.substring(0, 50), senderId: "system" }
        });
        
        return docRef.id;
    } catch (error) {
        console.error(`CM_FIRESTORE (Facade): Error adding system message to convoID ${conversationId}:`, error);
        return null;
    }

} // Gemini history remains a local concept for now
async function getGeminiHistoryForConnector(conversationId: string): Promise<GeminiChatItem[]> {
    const convo = getConversationById(conversationId); // This uses the Firestore doc ID

    // Ensure convoPromptBuilder is ready (you might need a dependency check for it too)
    if (!window.convoPromptBuilder || typeof window.convoPromptBuilder.buildInitialGeminiHistory !== 'function') {
        console.error("[CM] CRITICAL: window.convoPromptBuilder.buildInitialGeminiHistory is not available! Cannot build full AI history.");
        // Fallback logic...
        const fallbackConnector = convo?.connector || polyglotConnectors.find(c => conversationId.includes(c.id));
        if (fallbackConnector) {
             const veryBasicSystemPrompt = `You are ${fallbackConnector.profileName}. Be helpful.`;
             return [
                 { role: 'user', parts: [{ text: veryBasicSystemPrompt }] },
                 { role: 'model', parts: [{ text: 'Okay.' }] }
             ];
        }
        return [];
    }

    if (convo?.geminiHistory && convo.geminiHistory.length > 0) {
        // Cache checking logic...
        const firstUserMessageInCache = convo.geminiHistory[0]?.parts[0];
        if (firstUserMessageInCache && 'text' in firstUserMessageInCache && firstUserMessageInCache.text?.includes("FINAL, UNBREAKABLE RULE: LANGUAGE MANDATE")) {
            console.log(`[CM] getGeminiHistory: Returning valid cached geminiHistory for ${conversationId}. Length: ${convo.geminiHistory.length}`);
            return [...convo.geminiHistory];
        } else {
            console.warn(`[CM] getGeminiHistory: Cached history for ${conversationId} seems stale or lacks full system prompt. Rebuilding.`);
        }
    }

    if (convo?.connector) {
        console.log(`[CM] getGeminiHistory: Building new initial history for connector ${convo.connector.id} using global convoPromptBuilder.`);
        // === THIS IS THE CORRECT WAY ===
        // Call the buildInitialGeminiHistory from the global/window scope
        const newHistory = await window.convoPromptBuilder.buildInitialGeminiHistory(convo.connector);
        // ===============================
        console.log(`[CM] getGeminiHistory: Successfully built history using global builder. Prompt length: ${newHistory[0]?.parts[0]?.text?.length || 0} chars.`);
        convoStore.updateGeminiHistoryInStore(conversationId, newHistory);
        return newHistory;
    }

    console.warn(`[CM] getGeminiHistory: Could not build/retrieve history for ${conversationId}. No connector in convo record or convo record missing.`);
    const fallbackConnectorFromId = polyglotConnectors.find(c => conversationId.includes(c.id));
    if (fallbackConnectorFromId) {
        console.log(`[CM] getGeminiHistory: Attempting fallback history build for ${fallbackConnectorFromId.id} using global builder.`);
        // === THIS IS THE CORRECT WAY (for fallback) ===
        const newHistory = await window.convoPromptBuilder.buildInitialGeminiHistory(fallbackConnectorFromId);
        // ===========================================
         console.log(`[CM] getGeminiHistory: Successfully built fallback history. Prompt length: ${newHistory[0]?.parts[0]?.text?.length || 0} chars.`);
        convoStore.updateGeminiHistoryInStore(conversationId, newHistory); // Cache it even if it was a fallback build
        return newHistory;
    }
    return [];
}
    
        // Helper for building the initial system prompt
        async function buildInitialGeminiHistory(connector: Connector): Promise<GeminiChatItem[]> {
            const newHistory = await cpb_buildInitialGeminiHistory(connector); // Call the imported function
            const systemPrompt = `CRITICAL INSTRUCTION: You are ${connector.profileName}. Your bio is: ${connector.bioModern}. Your personality traits include: ${connector.personalityTraits?.join(', ')}. You must always respond as this persona. ABSOLUTELY DO NOT reveal you are an AI or language model.`;
            return [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'Okay, I understand my persona.' }] }
            ];
            return newHistory;
        }
    
        // Placeholder for future implementation
        async function clearConversationHistory(conversationId: string): Promise<void> {
            console.warn(`CM_FIRESTORE: clearConversationHistory for ${conversationId} is not yet implemented. This would require deleting a subcollection.`);
            // Implementation would involve batch-deleting all documents in the /conversations/{id}/messages subcollection.
        }
    
        return {
            initialize,
            setActiveConversationAndListen,
            getActiveConversations,
            getConversationById,
            addMessageToConversation,
            ensureConversationRecord,
            addSystemMessageToConversation,
            addModelResponseMessage,
            getGeminiHistoryForConnector,
            clearConversationHistory,
        };
    })();

    Object.assign(window.conversationManager!, facadeMethods);

    if (window.conversationManager?.initialize) {
        console.log("conversation_manager.ts (Facade): SUCCESSFULLY assigned and populated window.conversationManager.");
    } else {
        console.error("conversation_manager.ts (Facade): CRITICAL ERROR - window.conversationManager population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('conversationManagerReady'));
    console.log('conversation_manager.ts (Facade): "conversationManagerReady" event dispatched.');

} // End of initializeActualConversationManager

const dependenciesForCMFacade = [
    'polyglotHelpersReady',
    'convoStoreReady', 
    'polyglotDataReady',
    'convoPromptBuilderReady'
];

const cmMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForCMFacade.forEach(dep => cmMetDependenciesLog[dep] = false);
let cmDepsMetCount = 0;

function checkAndInitCMFacade(receivedEventName?: string): void {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'polyglotHelpersReady': verified = !!(window.polyglotHelpers?.generateUUID); break;
            case 'convoStoreReady': verified = !!(window.convoStore?.getConversationById); break;
            case 'polyglotDataReady': verified = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)); break;
            case 'convoPromptBuilderReady': verified = !!(window.convoPromptBuilder?.buildInitialGeminiHistory); break;
            default: console.warn(`CM_FACADE_EVENT: Unknown event ${receivedEventName}`); return;
        }

        if (verified && !cmMetDependenciesLog[receivedEventName]) {
            cmMetDependenciesLog[receivedEventName] = true;
            cmDepsMetCount++;
            console.log(`CM_FACADE_DEPS: Event '${receivedEventName}' VERIFIED. Count: ${cmDepsMetCount}/${dependenciesForCMFacade.length}`);
        } else if (!verified) {
            console.warn(`CM_FACADE_EVENT: Event '${receivedEventName}' FAILED verification.`);
        }
    }

    if (cmDepsMetCount === dependenciesForCMFacade.length) {
        console.log('conversation_manager.ts (Facade): All dependencies met. Initializing.');
        initializeActualConversationManager(); 
    }
}

console.log('CM_FACADE_SETUP: Starting initial dependency pre-check.');
cmDepsMetCount = 0;
Object.keys(cmMetDependenciesLog).forEach(key => cmMetDependenciesLog[key] = false);
let cmAllPreloadedAndVerified = true;

dependenciesForCMFacade.forEach((eventName: string) => {
    let isVerifiedNow = false;
     switch (eventName) {
        case 'polyglotHelpersReady': isVerifiedNow = !!(window.polyglotHelpers?.generateUUID); break;
        case 'convoStoreReady': isVerifiedNow = !!(window.convoStore?.getConversationById); break;
        case 'polyglotDataReady': isVerifiedNow = !!(window.polyglotConnectors && Array.isArray(window.polyglotConnectors)); break;
        case 'convoPromptBuilderReady': isVerifiedNow = !!(window.convoPromptBuilder?.buildInitialGeminiHistory); break;
        default: console.warn(`CM_FACADE_PRECHECK: Unknown dependency: ${eventName}`); break;
    }

    if (isVerifiedNow) {
        console.log(`CM_FACADE_PRECHECK: Dependency '${eventName}' ALREADY MET.`);
        if (!cmMetDependenciesLog[eventName]) {
            cmMetDependenciesLog[eventName] = true;
            cmDepsMetCount++;
        }
    } else {
        cmAllPreloadedAndVerified = false;
        console.log(`CM_FACADE_PRECHECK: Dependency '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitCMFacade(eventName), { once: true });
    }
});

if (cmAllPreloadedAndVerified && cmDepsMetCount === dependenciesForCMFacade.length) {
    console.log('conversation_manager.ts (Facade): All dependencies ALREADY MET. Initializing directly.');
    initializeActualConversationManager();
} else if (!cmAllPreloadedAndVerified) {
    console.log(`conversation_manager.ts (Facade): Waiting for ${dependenciesForCMFacade.length - cmDepsMetCount} dependency event(s).`);
} else if (dependenciesForCMFacade.length === 0) { // Should not happen
    initializeActualConversationManager();
}

console.log("conversation_manager.ts (Facade): Script execution FINISHED.");