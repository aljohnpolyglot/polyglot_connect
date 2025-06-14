// src/js/services/identity_service.ts
import type {
    Connector, // Not strictly needed here if PersonaIdentity is self-contained
    PersonaDataSourceItem,
    PolyglotHelpersOnWindow,
    LanguageEntry,
    SleepSchedule,
    ChatPersonality,
    RelationshipStatus
    // Add other specific types used by PersonaIdentity if they are complex
} from '../types/global.d.ts';

console.log("identity_service.ts: Script execution STARTED.");

// Define the structure of the core identity data this service will return
export interface PersonaIdentity {
    id: string;
    name: string;
    profileName: string;
    language: string;
    modernTitle?: string;
    age?: number | "N/A";
    profession?: string;
    city?: string;
    country?: string;
    bioModern?: string;
    education?: string;
    interests?: string[];
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
    // Add any other fields from PersonaDataSourceItem you consider static identity
    physicalTimezone?: string;
    activeTimezone?: string;
    dailyRoutineNotes?: string;
    tutorMinigameImageFiles?: string[];
    galleryImageFiles?: string[];
    languageSpecificCodes?: { [key: string]: { languageCode: string; flagCode: string; voiceName: string; liveApiVoiceName: string; } };
    learningLevels?: { [key: string]: string; };
}

export interface IdentityServiceModule {
    initialize: () => Promise<void>;
    getPersonaIdentity: (connectorId: string) => Promise<PersonaIdentity | null>;
}

window.identityService = {} as IdentityServiceModule;

function initializeActualIdentityService(): void {
    console.log("identity_service.ts: initializeActualIdentityService called.");

    const getSafeDeps = (): {
        polyglotPersonasDataSource: PersonaDataSourceItem[] | undefined;
        polyglotHelpers: PolyglotHelpersOnWindow | undefined;
    } => ({
        polyglotPersonasDataSource: window.polyglotPersonasDataSource,
        polyglotHelpers: window.polyglotHelpers,
    });

    const { polyglotPersonasDataSource, polyglotHelpers } = getSafeDeps();

    if (!polyglotPersonasDataSource || !Array.isArray(polyglotPersonasDataSource) || !polyglotHelpers || typeof polyglotHelpers.calculateAge !== 'function') {
        console.error("IdentityService: CRITICAL - polyglotPersonasDataSource or polyglotHelpers (with calculateAge) not found/valid. Service will not function.");
        const dummyMethods: IdentityServiceModule = {
            initialize: async () => { console.error("Dummy IdentityService: initialize called due to missing deps."); },
            getPersonaIdentity: async (connectorId: string) => { 
                console.error(`Dummy IdentityService: getPersonaIdentity called for ${connectorId} due to missing deps.`); 
                return null; 
            }
        };
        window.identityService = dummyMethods; 
        document.dispatchEvent(new CustomEvent('identityServiceReady'));
        console.warn("identity_service.ts: 'identityServiceReady' dispatched (DUMMY SERVICE ASSIGNED - missing core data sources or helpers).");
        return;
    }
    console.log("IdentityService: Core dependencies (polyglotPersonasDataSource, polyglotHelpers) found.");

    window.identityService = ((): IdentityServiceModule => {
        'use strict';
        console.log("identity_service.ts: IIFE STARTING.");

        const personasData: PersonaDataSourceItem[] = polyglotPersonasDataSource; // Already checked
        const helpers: PolyglotHelpersOnWindow = polyglotHelpers; // Already checked

        async function initialize(): Promise<void> {
            if (personasData.length === 0) { // Check if it's empty, not just undefined
                console.warn("IdentityService.initialize: Persona data source is empty at initialization time.");
            }
            console.log(`IdentityService: Initialized. ${personasData.length} personas available in data source.`);
        }

        async function getPersonaIdentity(connectorId: string): Promise<PersonaIdentity | null> {
            const personaRaw = personasData.find(p => p.id === connectorId);

            if (!personaRaw) {
                console.warn(`IdentityService.getPersonaIdentity: Persona with ID '${connectorId}' not found in data source.`);
                return null;
            }

            // Direct mapping - PersonaIdentity is very similar to PersonaDataSourceItem
            // Ensure all fields in PersonaIdentity are present in PersonaDataSourceItem or handled if optional
            const identity: PersonaIdentity = {
                ...personaRaw, // Spread all common fields
                age: helpers.calculateAge(personaRaw.birthday) || "N/A", // Recalculate or use stored if available
                // If PersonaIdentity has fields not in PersonaDataSourceItem, add them here with defaults
            };
            return identity;
        }

        console.log("identity_service.ts: IIFE FINISHED.");
        return {
            initialize,
            getPersonaIdentity
        };
    })();

    if (window.identityService && typeof window.identityService.getPersonaIdentity === 'function') {
        console.log("identity_service.ts: SUCCESSFULLY assigned and populated window.identityService.");
        window.identityService.initialize().catch(err => console.error("Error during IdentityService self-initialization:", err));
    } else {
        console.error("identity_service.ts: CRITICAL ERROR - window.identityService population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('identityServiceReady'));
    console.log("identity_service.ts: 'identityServiceReady' event dispatched.");

}

const dependenciesForIdentityService = ['polyglotDataReady', 'polyglotHelpersReady'];
const isMetDependenciesLog: { [key: string]: boolean } = {};
dependenciesForIdentityService.forEach(dep => isMetDependenciesLog[dep] = false);
let isDepsMetCount = 0;

function checkAndInitIdentityService(receivedEventName?: string) {
    if (receivedEventName) {
        let verified = false;
        switch(receivedEventName) {
            case 'polyglotDataReady': 
                verified = !!window.polyglotPersonasDataSource && Array.isArray(window.polyglotPersonasDataSource); 
                break;
            case 'polyglotHelpersReady': 
                verified = !!window.polyglotHelpers?.calculateAge; 
                break;
            default: console.warn(`IdentityService: Unknown event ${receivedEventName}`); return;
        }
        if (verified && !isMetDependenciesLog[receivedEventName]) {
            isMetDependenciesLog[receivedEventName] = true;
            isDepsMetCount++;
             console.log(`IdentityService_DEPS: Event '${receivedEventName}' VERIFIED. Count: ${isDepsMetCount}/${dependenciesForIdentityService.length}`);
        } else if(!verified) {
            console.warn(`IdentityService_DEPS: Event '${receivedEventName}' FAILED verification.`);
        }
    }
    if (isDepsMetCount === dependenciesForIdentityService.length) {
        console.log('IdentityService: All dependencies met. Initializing.');
        initializeActualIdentityService();
    }
}

console.log('IdentityService_SETUP: Starting pre-check for dependencies.');
isDepsMetCount = 0; 
Object.keys(isMetDependenciesLog).forEach(k => isMetDependenciesLog[k] = false);
let isAllPreloadedAndVerified = true;

dependenciesForIdentityService.forEach(eventName => {
    let isVerified = false;
    switch(eventName) {
        case 'polyglotDataReady': isVerified = !!window.polyglotPersonasDataSource && Array.isArray(window.polyglotPersonasDataSource); break;
        case 'polyglotHelpersReady': isVerified = !!window.polyglotHelpers?.calculateAge; break;
    }
    if (isVerified) {
        console.log(`IdentityService_PRECHECK: Dependency '${eventName}' ALREADY MET.`);
        if(!isMetDependenciesLog[eventName]) { isMetDependenciesLog[eventName] = true; isDepsMetCount++; }
    } else {
        isAllPreloadedAndVerified = false;
        console.log(`IdentityService_PRECHECK: Dependency '${eventName}' not ready. Adding listener.`);
        document.addEventListener(eventName, () => checkAndInitIdentityService(eventName), { once: true });
    }
});

if (isAllPreloadedAndVerified && isDepsMetCount === dependenciesForIdentityService.length) {
    console.log('IdentityService: All dependencies pre-verified. Initializing directly.');
    initializeActualIdentityService();
} else if (!isAllPreloadedAndVerified) {
    console.log(`IdentityService: Waiting for ${dependenciesForIdentityService.length - isDepsMetCount} dependency event(s).`);
} else if (dependenciesForIdentityService.length === 0){ // Should not happen
    initializeActualIdentityService();
}

console.log("identity_service.ts: Script execution FINISHED.");