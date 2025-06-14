// src/js/core/memory_service.ts
import type { MemoryServiceModule, PersonaUserMemory } from '../types/global.d.ts';

console.log("memory_service.ts: Script execution STARTED.");

const MEMORY_STORAGE_PREFIX = "polyglot_user_persona_memory_";

// Ensure a default User ID if none is provided (simple placeholder for now)
// In a real app, this would come from an authentication system.
const getCurrentUserId = (): string => {
    let userId = localStorage.getItem("polyglot_current_user_id");
    if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem("polyglot_current_user_id", userId);
    }
    return userId;
};

window.memoryService = {} as MemoryServiceModule;

function initializeActualMemoryService(): void {
    console.log("memory_service.ts: initializeActualMemoryService called.");

    // No critical external window dependencies for this simple version,
    // but polyglotHelpers could be useful later for more complex storage.
    
    window.memoryService = ((): MemoryServiceModule => {
        'use strict';
        console.log("memory_service.ts: IIFE STARTING.");

        const getMemoryKey = (personaId: string, userId: string): string => {
            return `${MEMORY_STORAGE_PREFIX}${userId}_${personaId}`;
        };

        async function initialize(): Promise<void> {
            console.log("MemoryService: Initialized.");
            // Could pre-load some data or perform checks if needed in the future
        }

        async function getMemory(personaId: string, userId: string): Promise<PersonaUserMemory | null> {
            if (!personaId || !userId) return null;
            const key = getMemoryKey(personaId, userId);
            try {
                const storedMemory = localStorage.getItem(key);
                if (storedMemory) {
                    return JSON.parse(storedMemory) as PersonaUserMemory;
                }
            } catch (e) {
                console.error(`MemoryService.getMemory: Error reading from localStorage for key ${key}`, e);
            }
            return null;
        }

        async function updateMemory(
            personaId: string, 
            userId: string, 
            memoryUpdate: Partial<Omit<PersonaUserMemory, 'userId' | 'personaId'>>
        ): Promise<void> {
            if (!personaId || !userId) return;
            const key = getMemoryKey(personaId, userId);
            try {
                const existingMemory = await getMemory(personaId, userId) || { userId, personaId, hasInteracted: false };
                const updatedMemory: PersonaUserMemory = {
                    ...existingMemory,
                    ...memoryUpdate,
                    lastInteractionTimestamp: Date.now() // Always update timestamp on any memory update
                };
                localStorage.setItem(key, JSON.stringify(updatedMemory));
            } catch (e) {
                console.error(`MemoryService.updateMemory: Error writing to localStorage for key ${key}`, e);
            }
        }

        async function hasInteractedBefore(personaId: string, userId: string): Promise<boolean> {
            const memory = await getMemory(personaId, userId);
            return !!memory?.hasInteracted;
        }

        async function markInteraction(personaId: string, userId: string): Promise<void> {
            console.log(`MemoryService.markInteraction: Marking interaction for user ${userId} with persona ${personaId}`);
            await updateMemory(personaId, userId, { hasInteracted: true });
        }

        console.log("memory_service.ts: IIFE FINISHED.");
        return {
            initialize,
            hasInteractedBefore,
            markInteraction,
            getMemory,
            updateMemory
        };
    })();

    if (window.memoryService && typeof window.memoryService.initialize === 'function') {
        console.log("memory_service.ts: SUCCESSFULLY assigned and populated window.memoryService.");
        window.memoryService.initialize().catch(err => console.error("Error during MemoryService self-initialization:", err));
    } else {
        console.error("memory_service.ts: CRITICAL ERROR - window.memoryService population FAILED.");
    }
    document.dispatchEvent(new CustomEvent('memoryServiceReady'));
    console.log("memory_service.ts: 'memoryServiceReady' event dispatched.");

} // End of initializeActualMemoryService

// This service is self-contained for now regarding window dependencies for its core logic.
// It only needs localStorage.
// So, we can initialize it fairly early, perhaps after polyglotHelpers if we decide to use them.
// For simplicity, let's let it initialize once its script is loaded.
// If it had other dependencies, we'd add the usual event listener logic here.

// Since it has no external window dependencies to wait for via events for its core logic:
initializeActualMemoryService();

console.log("memory_service.ts: Script execution FINISHED.");