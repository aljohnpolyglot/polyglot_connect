// src/js/core/usageManager.ts
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../firebase-config'; // Your central Firebase config
import { USAGE_LIMITS } from '../constants/appConstants';

export interface UsageCheckResult {
    allowed: boolean;
    plan: string;
}

/**
 * Checks if the current user can perform an action based on their plan and usage,
 * and increments the count if allowed. Also handles monthly usage resets on-the-fly.
 * @param actionType The type of action, e.g., 'textMessages' or 'voiceCalls'.
 * @returns A promise that resolves to a UsageCheckResult object.
 */


// src/js/core/usageManager.ts
// ... (imports are fine) ...

// ... (UsageCheckResult interface is fine) ...

export async function checkAndIncrementUsage(actionType: 'textMessages' | 'voiceCalls'): Promise<UsageCheckResult> {
    const user = auth.currentUser;
    if (!user) {
        console.error("Usage Check: No authenticated user found.");
        return { allowed: false, plan: 'none' };
    }

    const userRef = doc(db, "users", user.uid);

    try {
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.error(`Usage Check: User document for ${user.uid} not found. Denying action.`);
            return { allowed: false, plan: 'none' };
        }

        const userData = userSnap.data();
        
        // --- THIS IS THE FIX ---
        // We explicitly tell TypeScript that 'plan' can only be one of these two strings.
        const plan: 'free' | 'premium' = userData.plan || "free";
        // --- END OF FIX ---

        const now = new Date();
        const lastReset = userData.usageResetTimestamp?.toDate() || new Date(0);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        if (now.getTime() - lastReset.getTime() > thirtyDaysInMs) {
            console.log(`Usage reset triggered for user ${user.uid}.`);
            await updateDoc(userRef, {
                monthlyTextCount: 0,
                monthlyCallCount: 0,
                usageResetTimestamp: serverTimestamp()
            });
            userData.monthlyTextCount = 0;
            userData.monthlyCallCount = 0;
        }

        // Now TypeScript knows 'plan' is a valid key for USAGE_LIMITS
        const limit = USAGE_LIMITS[plan]?.[actionType];
        
        const currentCount = actionType === 'textMessages'
            ? (userData.monthlyTextCount || 0)
            : (userData.monthlyCallCount || 0);

        if (currentCount < limit) {
            const fieldToIncrement = actionType === 'textMessages' ? 'monthlyTextCount' : 'monthlyCallCount';
            await updateDoc(userRef, { [fieldToIncrement]: increment(1) });
            console.log(`Usage allowed for ${user.uid}. New count will be ${currentCount + 1}.`);
            return { allowed: true, plan: plan };
        } else {
            console.warn(`User ${user.uid} has reached their ${actionType} limit for the '${plan}' plan.`);
            return { allowed: false, plan: plan };
        }

    } catch (error) {
        console.error(`Error in checkAndIncrementUsage for user ${user.uid}:`, error);
        return { allowed: false, plan: 'unknown' };
    }
}