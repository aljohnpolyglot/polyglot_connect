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


// The new, smarter usageManager function
export interface UsageCheckResult {
    allowed: boolean;
    plan: string;
    daysUntilReset?: number; // <<< NEW: Add this optional property
}

export async function checkAndIncrementUsage(actionType: 'textMessages' | 'voiceCalls' | 'imageMessages'): Promise<UsageCheckResult> {
    const user = auth.currentUser;
    if (!user) {
        return { allowed: false, plan: 'none' };
    }

    const userRef = doc(db, "users", user.uid);

    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            return { allowed: false, plan: 'none' };
        }

        const userData = userSnap.data();
        const plan: 'free' | 'premium' = userData.plan || "free";
        
        const lastReset = userData.usageResetTimestamp?.toDate() || new Date();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const resetDate = new Date(lastReset.getTime() + thirtyDaysInMs);
        const now = new Date();

        // Check if we need to reset the counts on-the-fly
        if (now >= resetDate) {
            await updateDoc(userRef, {
                monthlyTextCount: 0,
                monthlyCallCount: 0,
                usageResetTimestamp: serverTimestamp()
            });
            // If we just reset, the user is definitely allowed
            await updateDoc(userRef, { [actionType === 'textMessages' ? 'monthlyTextCount' : 'monthlyCallCount']: increment(1) });
            return { allowed: true, plan: plan, daysUntilReset: 30 };
        }
        
        const limitActionTypeKey = (actionType === 'imageMessages') ? 'textMessages' : actionType; // Map imageMessages to textMessages for limit lookup
        const limit = USAGE_LIMITS[plan]?.[limitActionTypeKey];
        
        let currentCount: number;
        if (actionType === 'textMessages' || actionType === 'imageMessages') {
            currentCount = userData.monthlyTextCount || 0;
        } else { // voiceCalls
            currentCount = userData.monthlyCallCount || 0;
        }

        if (currentCount < limit) {
            // ALLOWED: Increment and return success
            let fieldToIncrement: string;
            if (actionType === 'textMessages' || actionType === 'imageMessages') { // Image messages count towards text for now
                fieldToIncrement = 'monthlyTextCount';
            } else { // 'voiceCalls'
                fieldToIncrement = 'monthlyCallCount';
            }
            await updateDoc(userRef, { [fieldToIncrement]: increment(1) });
            return { allowed: true, plan: plan };
        } else {
            // DENIED: Calculate remaining days and return that info
            const msUntilReset = resetDate.getTime() - now.getTime();
            const daysUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60 * 24));
            
            return { allowed: false, plan: plan, daysUntilReset: daysUntilReset };
        }
    } catch (error) {
        console.error("Error in checkAndIncrementUsage:", error);
        return { allowed: false, plan: 'unknown' };
    }
}