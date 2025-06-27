// PASTE THIS ENTIRE BLOCK INTO THE EMPTY memory_service.ts FILE

// REPLACE LANDMARK 1 WITH THIS:
// =================== START: REPLACEMENT ===================
import type {
    MemoryServiceModule,
    CerebrumMemoryLedger,
    MemoryFact,
    Connector,
    MemoryBank,
    MessageInStore // <<< ADD THIS LINE
} from '../types/global.d.ts';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../firebase-config';
// ===================  END: REPLACEMENT  ===================

console.log("memory_service.ts: Script execution STARTED (Cerebrum v1.0).");

// --- CONSTANTS ---
const REINFORCEMENT_BOOST = 0.05; // Boost confidence by 5% on each recall
const CORE_PROMOTION_THRESHOLD = 0.98; // Promote to CORE when confidence exceeds this


const FACT_EXTRACTOR_PROVIDER = "groq"; // Use a fast provider for extraction
// ADD THESE NEW LINES:
// =================== START: ADD NEW CONSTANTS ===================
const RECALL_THRESHOLD = 0.40;

// AI's memory of ITS OWN significant experiences is extremely strong.
const AI_EPISODIC_HALFLIFE_HOURS = 8760; // 1 Year

// AI's memory of ITS OWN minor, fragile inventions should fade reasonably fast.
const AI_FRAGILE_HALFLIFE_HOURS = 168;  // 7 days

// AI's memory of facts THE USER TOLD IT decays at a normal human rate.
const USER_EPISODIC_HALFLIFE_HOURS = 336; // 14 days
const USER_FRAGILE_HALFLIFE_HOURS = 72;   // 3 days
// ===================  END: ADD NEW CONSTANTS  ===================


// --- SERVICE INITIALIZATION ---
window.memoryService = {} as MemoryServiceModule;

function initializeActualMemoryService(): void {
    console.log("memory_service.ts: Initializing Cerebrum...");

    window.memoryService = ((): MemoryServiceModule => {
        'use strict';

        let memoryLedger: CerebrumMemoryLedger | null = null;
        let isLedgerInitialized = false;

        // --- PRIVATE HELPER FUNCTIONS ---
        const _getLedger = async (): Promise<CerebrumMemoryLedger> => {
            const user = auth.currentUser;
            if (!user) {
                console.error("[CEREBRUM_ERROR] Cannot get ledger, no authenticated user.");
                // Return a temporary, empty ledger to prevent crashes
                return { userId: 'guest', user_memory: { core: [], episodic: [], fragile: [] }, ai_memory: {}, last_updated: 0 };
            }
        
            // If we have a cached, initialized ledger, return it to avoid unnecessary reads.
            if (memoryLedger && isLedgerInitialized) return memoryLedger;
        
            const memoryDocRef = doc(db, "users", user.uid, "memory", "main_ledger");
            
            try {
                const docSnap = await getDoc(memoryDocRef);
                if (docSnap.exists()) {
                    memoryLedger = docSnap.data() as CerebrumMemoryLedger;
                    console.log("[CEREBRUM] Successfully loaded memory ledger from Firestore.");
                } else {
                    console.log("[CEREBRUM] No memory ledger found in Firestore. Creating new one.");
                    memoryLedger = {
                        userId: user.uid,
                        user_memory: { core: [], episodic: [], fragile: [] },
                        ai_memory: {},
                        last_updated: Date.now()
                    };
                }
            } catch (e) {
                console.error("[CEREBRUM_ERROR] Failed to fetch memory ledger from Firestore.", e);
                // Create a fallback ledger on error
                memoryLedger = {
                    userId: user.uid,
                    user_memory: { core: [], episodic: [], fragile: [] },
                    ai_memory: {},
                    last_updated: Date.now()
                };
            }
            
            isLedgerInitialized = true;
            return memoryLedger;
        };

        const _saveLedger = async (): Promise<void> => {
            const user = auth.currentUser;
            if (!user) {
                console.error("[CEREBRUM_ERROR] Cannot save ledger, no authenticated user.");
                return;
            }
            if (!memoryLedger) {
                console.error("[CEREBRUM_ERROR] Cannot save, memoryLedger is null.");
                return;
            }
        
            const memoryDocRef = doc(db, "users", user.uid, "memory", "main_ledger");
            
            try {
                // Use 'any' here for the serverTimestamp, which is a sentinel value
                const dataToSave: any = {
                    ...memoryLedger,
                    last_updated_server: serverTimestamp() // Use server-side timestamp for accuracy
                };
                await setDoc(memoryDocRef, dataToSave, { merge: true });
                console.log("[CEREBRUM] Successfully saved memory ledger to Firestore.");
            } catch (e) {
                console.error("[CEREBRUM_ERROR] Failed to save memory ledger to Firestore.", e);
            }
        };


        // =================== START: ADD GARBAGE COLLECTOR ===================
/**
 * Scans the entire memory ledger and removes facts with invalid or "junk" keys.
 * This acts as a self-healing mechanism against a faulty Scribe.
 */

// =================== START: REPLACEMENT ===================
/**
 * Scans the entire memory ledger and removes facts with invalid or "junk" keys.
 * This acts as a self-healing mechanism against a faulty Scribe.
 * Version 3.0 uses precise whole-word and pattern matching to avoid false positives.
 */

async function _collectGarbage(): Promise<void> {
    const ledger = await _getLedger();
    if (!ledger) return;

    // JUNK KEYWORDS: More aggressive list based on the new data
    const JUNK_KEYWORDS_TO_DELETE = [
        'query', 'question', 'statement', 'response', 'claim', 'interaction',
        'inquiry', 'communication', 'capability', 'task', 'selfdescription',
        'personality', 'currentstate', 'mood', 'feeling', 'language', 'style',
        'knowledge', 'background', 'detail', 'information', 'summary', 'context',
        'topic', 'action', 'intent', 'preference', 'greeting', 'expression',
        'utterance', 'request', 'agreement', 'assertion', 'quote' // New junk from your log
    ];

    // META-KEYS to always delete, as they break the persona
    const META_KEYS_TO_DELETE = ['aiName', 'aiProfession'];

    let factsRemoved = 0;
    let factsMerged = 0;

    const cleanAndConsolidateBank = (bank: MemoryBank | undefined) => {
        if (!bank) return;

        for (const key of ['core', 'episodic', 'fragile'] as const) {
            let memoryTier = bank[key];
            const originalCount = memoryTier.length;

            // Step 1: Filter out the obvious junk and meta keys
            memoryTier = memoryTier.filter(fact => {
                const keyLower = fact.key.toLowerCase();
                if (META_KEYS_TO_DELETE.includes(fact.key)) return false;
                if (JUNK_KEYWORDS_TO_DELETE.some(junk => keyLower.includes(junk))) return false;
                return true;
            });

            // Step 2: Consolidate duplicates (e.g., multiple 'aiOpinion' facts)
            const consolidated: MemoryFact[] = [];
            const seen = new Map<string, MemoryFact>();

            for (const fact of memoryTier) {
                const mapKey = `${fact.key}::${String(fact.value).toLowerCase()}`;
                
                if (seen.has(mapKey)) {
                    // We've seen this exact fact before. Reinforce the existing one.
                    const existingFact = seen.get(mapKey)!;
                    existingFact.timestamp = Math.max(existingFact.timestamp, fact.timestamp);
                    existingFact.initialConfidence = Math.min(1.0, existingFact.initialConfidence + 0.01); // Small boost
                    factsMerged++;
                } else {
                    // This is a new, unique fact.
                    seen.set(mapKey, fact);
                    consolidated.push(fact);
                }
            }
            
            // Step 3: Replace the old tier with the cleaned and consolidated one
            bank[key] = consolidated;
            factsRemoved += originalCount - bank[key].length;
        }
    };

    // Clean the main user memory bank
    cleanAndConsolidateBank(ledger.user_memory);

    // Clean every persona's individual AI memory bank
    for (const personaId in ledger.ai_memory) {
        cleanAndConsolidateBank(ledger.ai_memory[personaId]);
    }

    if (factsRemoved > 0 || factsMerged > 0) {
        console.log(`%c[GARBAGE COLLECTOR v5] 🗑️ Removed: ${factsRemoved}, Merged: ${factsMerged}. Saving clean ledger.`, 'color: #fd7e14; font-weight: bold;');
        await _saveLedger();
    } else {
        console.log(`[GARBAGE COLLECTOR v5] 🗑️ Scan complete. No junk or duplicates found.`);
    }
}
// ===================  END: REPLACEMENT  ===================



        
        // --- PUBLIC SERVICE FUNCTIONS ---
        async function initialize(): Promise<void> { // <<< CHANGE: Added async keyword
            await _getLedger();
            await _collectGarbage(); // <<< CHANGE: Added await
            console.log(`[CEREBRUM_INIT] 🧠 Memory service initialized for Firestore.`);
        }

  // PASTE THIS NEW FUNCTION IN PLACE OF THE OLD _extractFactsFromSource
// REPLACE THE ENTIRE _extractFactsFromSource FUNCTION WITH THIS:
// =================== START: REPLACEMENT ===================


async function _extractFactsFromSource(
    textSource: string,
    conversationHistory: MessageInStore[],
    source_context: string,
    source_persona_id: string
): Promise<MemoryFact[]> {

    console.groupCollapsed(`✍️ [THE SCRIBE v6.0] Analyzing text from [${source_context}]...`);

    let extractionPrompt = '';

    // --- PROMPT SELECTION LOGIC ---
    if (source_context === 'live_call') {
        // --- PROMPT 1: The "Transcript Scribe" (for complex dialogues) ---
        console.log(`[Scribe] Using specialist: TRANSCRIPT SCRIBE`);
        extractionPrompt = `You are a highly efficient cognitive analysis AI called "The Scribe". Your purpose is to extract new, concrete facts about the "User" from the provided dialogue transcript.

CRITICAL RULES:
- Read the entire dialogue to understand the full context.
- Extract facts ONLY from the "User"'s lines. The AI's lines are for context only.
- Synthesize facts that may be split across multiple User turns.
- Ignore questions. Only extract facts from declarative statements.
- Your response MUST be a valid JSON array of fact objects. Each object needs a "key", "value", and "type".

TIER DEFINITIONS:
- CORE: Foundational, identity-defining facts (name, profession, a "favorite" thing, a lifelong passion).
- EPISODIC: Significant but non-defining events or opinions.
- FRAGILE: Minor, temporary details.

DIALOGUE TRANSCRIPT TO ANALYZE:
${textSource}
**EXAMPLE OF PERFECT OUTPUT FORMAT:**
[
  {"key": "userName", "value": "Alex", "type": "CORE"},
  {"key": "userFandom", "value": "Real Madrid", "type": "CORE"},
  {"key": "userFavoritePlayer", "value": "Zidane", "type": "EPISODIC"},
  {"key": "aiRecentActivity", "value": "was just reading a book", "type": "FRAGILE"},
  {"key": "aiOpinion", "value": "Zidane is a true legend", "type": "EPISODIC"}
]
Now, generate the JSON array. If no facts about the User are found, return an empty array [].`;
    } else {
        // --- PROMPT 2: The "Chat Scribe" (for single messages) ---
        console.log(`[Scribe] Using specialist: CHAT SCRIBE`);
        const sourceTextDescription = source_context === 'ai_invention'
            ? "This text is from the AI persona themselves. Analyze it for facts ABOUT THE AI's own identity."
            : "This text is from the user. Analyze it for facts ABOUT THE USER.";

            extractionPrompt = `You are a highly efficient cognitive analysis AI called "The Scribe". Your goal is to extract concrete facts from a user's message, even if it's colloquial.

            CONTEXT: ${sourceTextDescription}
            Analyze the following single line of text:
            ${textSource}
            
            --- FACT REINFORCEMENT & EXAMPLES ---
            You MUST interpret the user's intent, not just their literal words.
            - If the user says "idol ko si lebron eh", they are stating their favorite player. You MUST extract: {"key": "userFavoritePlayer", "value": "LeBron James", "type": "CORE"}
            - If the user says "Warriors for life!", they are stating their favorite team. You MUST extract: {"key": "userFavoriteTeam", "value": "Golden State Warriors", "type": "CORE"}
            - If the user says "I work as a code monkey", they are stating their profession. You MUST extract: {"key": "userProfession", "value": "Software Developer", "type": "EPISODIC"}
            - If the user says "Haha that's funny", it is NOT a fact. Return an empty array.
            

Categorize any found facts into one of three tiers:
- CORE: Foundational, identity-defining facts (name, profession, a "favorite" thing).
- EPISODIC: Significant events, opinions, or strong interests.
- FRAGILE: Minor, temporary details.
**EXAMPLE OF PERFECT OUTPUT FORMAT:**
[
  {"key": "userName", "value": "Alex", "type": "CORE"},
  {"key": "userFandom", "value": "Real Madrid", "type": "CORE"},
  {"key": "userFavoritePlayer", "value": "Zidane", "type": "EPISODIC"},
  {"key": "aiRecentActivity", "value": "was just reading a book", "type": "FRAGILE"},
  {"key": "aiOpinion", "value": "Zidane is a true legend", "type": "EPISODIC"}
]
Your response MUST be ONLY a valid JSON array of fact objects, each with a "key", "value", and "type". If no facts are found, return an empty array [].`;
    }

    try {
        const modelToUse = (window.aiApiConstants?.GEMINI_MODELS.RECAP || "gemini-1.5-flash-latest");
        console.log(`[Scribe] Using model: ${modelToUse}`);
        console.log(`[Scribe] Full prompt being sent to AI:`, extractionPrompt);

        const payload = {
            contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
            generationConfig: {
                temperature: 0.0,
                maxOutputTokens: 2048,
                responseMimeType: "application/json",
            },
        };

        const response = await (window as any)._geminiInternalApiCaller(payload, modelToUse, "generateContent");
        
        // =================== FORENSIC INTERCEPTOR v1.0 START ===================
        // We're treating the AI's response as a crime scene.
        // It's supposed to be a clean JSON array, but it might be contaminated.
        
    
        // =================== FORENSIC INTERCEPTOR v3.0 - THE DEEP EXTRACTOR ===================
        console.log(`%c[Scribe Forensics v3.0] 🕵️‍♂️ Raw API Response Object:`, 'color: #fd7e14; font-weight: bold;', response);

        let extractedJsonString: string | null = null;
        
        // Step 1: Check the most likely path for Gemini API responses.
        if (response?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            extractedJsonString = response.response.candidates[0].content.parts[0].text;
            console.log(`%c[Scribe Forensics v3.0] ✅ SUCCESS: Extracted text from deep within the Gemini response object.`, 'color: #20c997; font-weight: bold;');
        } else {
            // Step 2: Fallback to the previous check if the deep path fails.
            if (response && response.response && typeof response.response === 'string') {
                extractedJsonString = response.response.trim();
                console.log(`%c[Scribe Forensics v3.0] ✅ Fallback Success: Extracted text from the top-level 'response' property.`, 'color: #198754;');
            } else {
                console.error(`%c[Scribe Forensics v3.0] ❌ CRITICAL FAILURE: Could not find a processable text string in the response object.`, 'color: #dc3545; font-weight: bold;');
                console.groupEnd();
                return [];
            }
        }

        console.log(`%c[Scribe Forensics v3.0] 🕵️‍♂️ FINAL EVIDENCE STRING:`, 'color: #0d6efd; font-weight: bold;', `"${extractedJsonString}"`);

        let findings: any[] = [];
        // <<<--- JSON PARSER GUARD v1.0 --- START --->>>
        if (extractedJsonString && typeof extractedJsonString === 'string') {
            try {
                // Step 3: Attempt to process the primary evidence.
                findings = JSON.parse(extractedJsonString);
            } catch (e) {
                console.error(`%c[Scribe Forensics v3.0] ❌ PARSE FAILED: The extracted string was not valid JSON.`, 'color: #dc3545; font-weight: bold;', e);
                // No need to return here, 'findings' will remain an empty array.
            }
        } else {
            console.warn(`%c[Scribe Forensics v3.0] 🧐 SKIPPING PARSE: No valid string was extracted to be parsed.`, 'color: #ffc107; font-weight: bold;');
        }
        // <<<--- JSON PARSER GUARD v1.0 --- END --->>>
        // =================== FORENSIC INTERCEPTOR v3.0 END ===================

        if (Array.isArray(findings)) {
            const newFacts: MemoryFact[] = findings.map((fact: any) => ({
                ...fact,
                timestamp: Date.now(),
                initialConfidence: fact.type === 'CORE' ? 1.0 : (fact.type === 'EPISODIC' ? 0.90 : 0.75),
                // <<<--- EVIDENCE TAGGER v1.0 --- START --->>>
                // This ensures every fact is stamped with where it was learned.
                source_context: source_context as 'one_on_one' | 'group' | 'live_call' | 'ai_invention',
                source_persona_id: source_persona_id
                // <<<--- EVIDENCE TAGGER v1.0 ---  END  --->>>
            }));
            console.groupEnd(); 
            
            // <<<--- THE REVEAL v1.0 --- START --->>>
            // This is the important part. Log it outside the collapsed group.
            if (newFacts.length > 0) {
                console.log(`%c[Scribe] ✅ TREASURE UNCOVERED! Extracted ${newFacts.length} fact(s). Saving to memory.`, 'color: white; background: #20c997; padding: 2px 5px; border-radius: 3px;', newFacts);
            } else {
                console.log(`%c[Scribe] 🧐 The treasure chest was empty. No new facts extracted.`, 'color: #6c757d; font-style: italic;');
            }
            // <<<--- THE REVEAL v1.0 ---  END  --->>>

            return newFacts;
        }

        console.warn("[Scribe] Parsed response was not an array.");
        console.groupEnd();
        return [];
    } catch (error) {
        console.error("[Scribe] AI call failed.", error);
        console.groupEnd();
        return [];
    }
}

// ===================  END: REPLACEMENT  ===================
     // REPLACE THE processNewUserMessage FUNCTION WITH THIS:
// =================== START: REPLACEMENT ===================
// REPLACE THE ENTIRE processNewUserMessage FUNCTION WITH THIS:
// =================== START: REPLACEMENT ===================

// REPLACE LANDMARK 3 WITH THIS COMPLETE v6.0 FUNCTION:
// =================== START: REPLACEMENT ===================
/**
 * A helper for simple fuzzy string matching.
 * @returns A similarity score between 0 and 1.
 */
function simpleFuzzyMatch(str1: any, str2: any): number {
    const s1 = String(str1).toLowerCase();
    const s2 = String(str2).toLowerCase();
    // ... rest of the function is the same
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const distance = longer.length - shorter.length;
    return (longer.length - distance) / longer.length;
}

async function processNewUserMessage(
    text: string,
    personaIds: string | string[],
    context: 'one_on_one' | 'group' | 'live_call' | 'ai_invention',
    history: MessageInStore[] = []
): Promise<boolean> { // <<< FIX #1: Return type is now boolean
    const mainPersonaId = Array.isArray(personaIds) ? personaIds[0] : personaIds;
    console.log(`%c[Hippocampus] Received text for analysis. Context: ${context}. Persona(s): ${Array.isArray(personaIds) ? personaIds.join(', ') : personaIds}`, 'color: #6610f2; font-weight: bold;');

    const newFacts = await _extractFactsFromSource(text, history, context, mainPersonaId);
    if (newFacts.length === 0) {
        return false; // <<< FIX #2: Return false if no facts
    }

    const ledger = await _getLedger();
    const audience = Array.isArray(personaIds) ? personaIds : [personaIds];


    // 2. Loop through each new fact found by The Scribe
    for (const newFact of newFacts) {
        
        // 3. This is the new "Targeted Write" logic
        for (const targetId of audience) {
            // For facts ABOUT THE AI, only write to that AI's own memory bank.
            if (context === 'ai_invention' && targetId !== newFact.source_persona_id) {
                continue; // An AI's invention is its own, not the group's.
            }

            // Determine the correct memory bank: AI's personal bank for its own inventions,
            // or the USER bank inside the AI's personal ledger for everything else.
            const isAiInvention = context === 'ai_invention';
            const bank = isAiInvention
                ? (ledger.ai_memory[targetId] || (ledger.ai_memory[targetId] = { core: [], episodic: [], fragile: [] }))
                : ledger.user_memory; // We still target the user_memory bank. The filtering happens on recall.

            // 4. Fuzzy search WITHIN THE TARGET'S memory bank
            let reinforced = false;
            for (const bankType of ['core', 'episodic', 'fragile'] as const) {
                for (const existingFact of bank[bankType]) {
                    // Crucial: Only reinforce if the existing fact was also heard by this target.
                    if (existingFact.key === newFact.key && 
                        (existingFact.source_persona_id === targetId || existingFact.source_context === 'group') && // Refined check
                        simpleFuzzyMatch(String(existingFact.value), String(newFact.value)) > 0.9) {
                        
                        existingFact.timestamp = Date.now();
                        existingFact.initialConfidence = Math.min(1.0, (existingFact.initialConfidence || 0.75) + REINFORCEMENT_BOOST);
                        console.log(`[CEREBRUM_REINFORCE] 💪 Reinforced fact in [${targetId}]'s memory: "${existingFact.key}".`);
                        reinforced = true;
                        break;
                    }
                }
                if (reinforced) break;
            }

            // 5. If it's a brand new fact for this specific AI, add it.
            if (!reinforced) {
                // Stamp the fact with the ID of the AI who is "hearing" it.
                const factForThisListener: MemoryFact = { ...newFact, source_persona_id: targetId };
                
                switch (factForThisListener.type) {
                    case 'CORE': bank.core.push(factForThisListener); break;
                    case 'EPISODIC': bank.episodic.push(factForThisListener); break;
                    case 'FRAGILE': bank.fragile.push(factForThisListener); break;
                }
                console.log(`[CEREBRUM_WRITE] ✍️ Added NEW fact to [${targetId}]'s memory: "${factForThisListener.key}" [${factForThisListener.type}]`);
            }
        }
    }
    await _saveLedger(); // <<< CHANGE: await the save operation
    return true; // <<< FIX #3: Return true because we saved something
}
// ===================  END: REPLACEMENT  ===================
// ===================  END: REPLACEMENT  ===================

    // REPLACE THE ENTIRE getMemoryForPrompt FUNCTION WITH THIS v3.2 VERSION:
// =================== START: REPLACEMENT v3.2 ===================
// REPLACE THE getMemoryForPrompt FUNCTION WITH THIS:
// =================== START: REPLACEMENT v4.0 ===================
// REPLACE THE ENTIRE getMemoryForPrompt FUNCTION WITH THIS v4.1 VERSION:
// =================== START: REPLACEMENT v4.1 ===================
// REPLACE THE ENTIRE getMemoryForPrompt FUNCTION WITH THIS:
// =================== START: REPLACEMENT WITH THALAMUS LOGGING ===================


// REPLACE THE ENTIRE getMemoryForPrompt FUNCTION WITH THIS v4.8 VERSION:
// =================== START: REPLACEMENT v4.8 ===================

// REPLACE THE ENTIRE getMemoryForPrompt FUNCTION WITH THIS v5.2 VERSION:
// =================== START: REPLACEMENT v5.2 ===================
async function getMemoryForPrompt(personaId: string): Promise<{prompt: string, facts: MemoryFact[]}> {
    const ledger = await _getLedger(); // <<< CHANGE: await the ledger
    if (!ledger) {
        return {
            prompt: "// Memory ledger not available.",
            facts: []
        };
    }

    const now = Date.now();
    const recalledFacts: string[] = [];
    const recalledFactObjects: MemoryFact[] = []; // <<< ADD THIS LINE
    let memoryWasModified = false; // To track if we need to save changes

    console.groupCollapsed(`🧠 [THALAMUS v5.2] Filtering memories for [${personaId}]...`);

    const processAndReinforce = (fact: MemoryFact, bank: MemoryBank, type: 'episodic' | 'fragile', halfLife: number, bankName: 'user' | 'ai') => {
        const minutesPassed = (now - fact.timestamp) / (1000 * 60);
        const hoursPassed = minutesPassed / 60;
        const currentConfidence = (fact.initialConfidence || 0.75) * (0.5 ** (hoursPassed / halfLife));

        const isRecent = minutesPassed < 20;

        // Recall Condition: Either it's recent OR its confidence is high enough.
        if (isRecent || currentConfidence >= RECALL_THRESHOLD) {
            const confidenceLabel = isRecent ? "1.0 (Recent)" : currentConfidence.toFixed(2);
            recalledFactObjects.push(fact); // <<< ADD THIS LINE
            
            // --- REINFORCEMENT LOGIC (NOW ALWAYS RUNS ON RECALL) ---
            fact.timestamp = now; // Refresh timestamp
            fact.initialConfidence = Math.min(1.0, (fact.initialConfidence || 0.75) + REINFORCEMENT_BOOST);
            memoryWasModified = true;
            const logLabel = isRecent ? "Reinforced RECENT" : "Reinforced";
            console.log(`%c[REINFORCE] 💪 ${logLabel} ${type.toUpperCase()}: "${fact.key}". New confidence: ${fact.initialConfidence.toFixed(2)}`, 'color: #20c997;');

            if (fact.initialConfidence >= CORE_PROMOTION_THRESHOLD) {
                // Temporarily store for promotion after the loop
                return true; 
            }
        } else {
             console.log(`%c[FORGOTTEN] ${bankName.toUpperCase()}_${type.toUpperCase()}: "${fact.key}" (Confidence: ${currentConfidence.toFixed(2)})`, 'color: #dc3545;');
        }
        return false;
    };

    const promoteMemories = (bank: MemoryBank, promotions: { index: number, type: 'episodic' | 'fragile' }[]) => {
        promotions.sort((a, b) => b.index - a.index).forEach(promo => {
            const [factToMove] = bank[promo.type].splice(promo.index, 1);
            bank.core.push(factToMove);
            console.log(`%c[PROMOTE] 🎓 Promoted "${factToMove.key}" to CORE memory!`, 'color: #ffc107; font-weight: bold;');
        });
    };

    try {
        // --- USER MEMORY BANK ---
        const userMemory = ledger.user_memory;
        const userPromotions: { index: number, type: 'episodic' | 'fragile' }[] = [];
        userMemory.core.forEach(fact => recalledFacts.push(`// USER_CORE // confidence=1.0\n[persona_all] user.${fact.key} = "${fact.value}"`));
        userMemory.episodic.forEach((fact, index) => {
            // A persona can only recall a fact if it was the direct recipient in a 1-on-1/live_call,
            // OR if the fact was learned in a group chat (which is considered public knowledge among participants).
            if ((fact.source_persona_id === personaId || fact.source_context === 'group') && processAndReinforce(fact, userMemory, 'episodic', USER_EPISODIC_HALFLIFE_HOURS, 'user')) {
                userPromotions.push({ index, type: 'episodic' });
            }
        });
        userMemory.fragile.forEach((fact, index) => {
            // Apply the exact same strict logic here.
            if ((fact.source_persona_id === personaId || fact.source_context === 'group') && processAndReinforce(fact, userMemory, 'fragile', USER_FRAGILE_HALFLIFE_HOURS, 'user')) {
                userPromotions.push({ index, type: 'fragile' });
            }
        });
        if (userPromotions.length > 0) promoteMemories(userMemory, userPromotions);

        // --- AI MEMORY BANK ---
        const aiMemory = ledger.ai_memory[personaId];
        if (aiMemory) {
            const aiPromotions: { index: number, type: 'episodic' | 'fragile' }[] = [];
            aiMemory.core.forEach(fact => recalledFacts.push(`// AI_CORE // confidence=1.0\n[${personaId}] self.${fact.key} = "${fact.value}"`));
            aiMemory.episodic.forEach((fact, index) => {
                // --- THIS IS THE FIX ---
                // An AI should only recall its own memories if it was the one who invented them,
                // or if they were invented in a shared context it was part of.
                if ((fact.source_context === 'group' || fact.source_persona_id === personaId) && processAndReinforce(fact, aiMemory, 'episodic', AI_EPISODIC_HALFLIFE_HOURS, 'ai')) {
                    aiPromotions.push({ index, type: 'episodic' });
                }
            });
            aiMemory.fragile.forEach((fact, index) => {
                // --- THIS IS THE FIX ---
                if ((fact.source_context === 'group' || fact.source_persona_id === personaId) && processAndReinforce(fact, aiMemory, 'fragile', AI_FRAGILE_HALFLIFE_HOURS, 'ai')) {
                    aiPromotions.push({ index, type: 'fragile' });
                }
            });
            if (aiPromotions.length > 0) promoteMemories(aiMemory, aiPromotions);
        }
        
        if (memoryWasModified) {
            console.log("[Thalamus] Saving updated memory ledger after reinforcement/promotion.");
            await _saveLedger(); // <<< CHANGE: await the save operation
        }

        console.groupEnd();
        return {
            prompt: recalledFacts.length > 0 ? recalledFacts.join('\n\n') : "// No relevant memories recalled.",
            facts: recalledFactObjects
        };
    } catch (error) {
        console.error("[THALAMUS] An unexpected error occurred during memory filtering.", error);
        console.groupEnd();
        return {
            prompt: "// Error occurred during memory recall.",
            facts: []
        };
    }
}

// ADD THIS NEW FUNCTION HERE
async function seedInitialUserFact(
    personaIdForContext: string, // The ID of the persona interacting with the user
    factKey: string,             // e.g., "user.registeredUsername"
    factValue: string            // The actual username
): Promise<void> {
    const ledger = await _getLedger();
    if (!factValue || !factKey) {
        console.warn("[CEREBRUM_SEED] Attempted to seed an empty fact. Aborting.");
        return;
    }

    const userMemory = ledger.user_memory;

    // Check if this exact fact already exists in core to avoid duplicates from multiple initializations
    const alreadyExists = userMemory.core.some(
        fact => fact.key === factKey && fact.value === factValue
    );

    if (alreadyExists) {
        console.log(`[CEREBRUM_SEED] Fact "${factKey}: ${factValue}" already exists in user core memory. No action taken.`);
        return;
    }
    const newCoreFact: MemoryFact = {
        key: factKey,
        value: factValue,
        type: 'CORE',
        timestamp: Date.now(),
        initialConfidence: 1.0,
        source_context: 'system_init',
        source_persona_id: personaIdForContext,
        // <<< THIS IS THE FIX >>>
        known_by_personas: [personaIdForContext] // A new fact is known by the persona in the current context
    };

    userMemory.core.push(newCoreFact);
    console.log(`%c[CEREBRUM_SEED] 🌱 Successfully seeded initial user fact to CORE: "${factKey}: ${factValue}" for persona context ${personaIdForContext}`, 'color: #17a2b8; font-weight: bold;');
    await _saveLedger();
}



// ===================  END: REPLACEMENT v5.2  ===================
// ===================  END: REPLACEMENT WITH THALAMUS LOGGING  ===================
// ===================  END: REPLACEMENT v4.1  ===================
// ===================  END: REPLACEMENT v4.0  ===================
// ===================  END: REPLACEMENT v3.2  ===================

        // --- Return public API ---
        return {
            initialize,
            processNewUserMessage,
            getMemoryForPrompt,
            seedInitialUserFact,
            // Deprecated functions from old service for compatibility if needed, but we aim to remove them
            hasInteractedBefore: async () => false,
            markInteraction: async () => {},
            getMemory: async () => null,
            updateMemory: async () => {}
        };

    })(); // END OF IIFE

    if (window.memoryService && typeof window.memoryService.initialize === 'function') {
        console.log("memory_service.ts: SUCCESSFULLY assigned and populated window.memoryService (Cerebrum).");
        // DO NOT auto-initialize. The main app.ts will call .initialize() after auth is ready.
    } else {
        console.error("memory_service.ts: CRITICAL ERROR - window.memoryService population FAILED.");
    }

    document.dispatchEvent(new CustomEvent('memoryServiceReady'));
    console.log("memory_service.ts: 'memoryServiceReady' event dispatched.");
}

// --- INITIALIZE THE SERVICE ---
// This service is self-contained for now, so we can initialize it directly.
initializeActualMemoryService();

console.log("memory_service.ts: Script execution FINISHED (Cerebrum v1.0).");