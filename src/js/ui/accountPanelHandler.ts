// src/js/ui/accountPanelHandler.ts
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase-config";
import type { YourDomElements } from '../types/global.d';

// This function renders the dynamic part of the panel
function renderAccountPanel(userData: Record<string, any>) {
    const dom = window.domElements as YourDomElements;
    const planDetailsEl = dom.accountPanelPlanDetails;
    if (!planDetailsEl) return;

    const plan = userData.plan || 'free';
    const textCount = userData.monthlyTextCount || 0;
    const callCount = userData.monthlyCallCount || 0;
    
    // These limits can come from appConstants later
    const textLimit = 50; 
    const callLimit = 5;

    // Calculate percentages for the progress bars
    const textProgress = Math.min((textCount / textLimit) * 100, 100);
    const callProgress = Math.min((callCount / callLimit) * 100, 100);

    let planHTML = '';
    if (plan === 'free') {
        planHTML = `
            <div class="plan-card">
                <h5>Current Plan</h5>
                <p class="plan-name">Free</p>
            </div>
            <div class="usage-card">
                <h5>Monthly Usage</h5>
                <div class="usage-item">
                    <div class="usage-label"><span>Text Messages</span><span>${textCount} / ${textLimit}</span></div>
                    <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${textProgress}%;"></div></div>
                </div>
                <div class="usage-item">
                    <div class="usage-label"><span>Voice Calls</span><span>${callCount} / ${callLimit}</span></div>
                    <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${callProgress}%;"></div></div>
                </div>
            </div>
            <button onclick="window.location.href='/pricing.html'" class="action-btn primary-btn account-upgrade-btn">Upgrade to Premium</button>
        `;
    } else { // Premium User
         planHTML = `
            <div class="plan-card">
                <h5>Current Plan</h5>
                <p class="plan-name premium"><i class="fas fa-gem"></i> Premium</p>
            </div>
            <div class="usage-card">
                <h5>Lifetime Stats</h5>
                <p>${(userData.totalTextCount || textCount).toLocaleString()} messages sent</p>
                <p>${(userData.totalCallCount || callCount).toLocaleString()} calls made</p>
            </div>
            <button class="action-btn" disabled>You're all set!</button>
        `;
    }

    planDetailsEl.innerHTML = planHTML;
}

// This is the one function we export to be called by app.ts
export function initializeAccountPanel() {
    const user = auth.currentUser;
    const dom = window.domElements as YourDomElements;

    if (!user || !dom) {
        console.error("AccountPanel: Cannot initialize without user or DOM elements.");
        return;
    }
    
    // Populate static info once
    if (dom.accountPanelAvatar) dom.accountPanelAvatar.src = user.photoURL || '/images/placeholder_avatar.png';
    if (dom.accountPanelDisplayName) dom.accountPanelDisplayName.textContent = user.displayName || "New User";
    if (dom.accountPanelEmail) dom.accountPanelEmail.textContent = user.email;

    // Set up sign out button listener
    if(dom.accountPanelSignOutBtn) {
        dom.accountPanelSignOutBtn.onclick = () => {
            signOut(auth).catch(error => console.error("Sign out error", error));
        };
    }

    // This is the magic: Listen for REAL-TIME updates to the user's document
    const userRef = doc(db, "users", user.uid);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            console.log("AccountPanel: Received real-time update for user data.", docSnap.data());
            renderAccountPanel(docSnap.data());
        } else {
            console.error("AccountPanel: User document does not exist in Firestore! This shouldn't happen after login.");
        }
    });

    console.log("Account Panel Initialized with real-time Firestore listener.");
}