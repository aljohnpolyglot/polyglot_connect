import type { YourDomElements, ModalHandler } from '../types/global.d';

/**
 * Opens the correct upgrade modal based on the action type and populates
 * the dynamic 'days remaining' text.
 * @param type The type of limit that was hit ('text' or 'call').
 * @param daysUntilReset The number of days until the user's limit resets.
 */
export function openUpgradeModal(modalType: 'text' | 'call' | 'image', daysUntilReset?: number): void {
    const modalHandler = window.modalHandler as ModalHandler | undefined;
    const domElements = window.domElements as YourDomElements | undefined;

    if (!modalHandler || !domElements) {
        console.error("ModalUtils: Cannot open upgrade modal, missing core dependencies.");
        alert("You have reached your limit for the month. Please upgrade your plan.");
        return;
    }

    const modalToOpen = modalType === 'text' || modalType === 'image' // Treat 'image' same as 'text' for which modal to open
    ? domElements.upgradeLimitModal 
    : domElements.upgradeCallLimitModal; // This would be for 'call'

    const daysRemainingEl = modalToOpen?.querySelector('.plan-expiry');

    if (daysRemainingEl && daysUntilReset !== undefined && daysUntilReset > 0) {
        const dayText = daysUntilReset === 1 ? 'day' : 'days';
        daysRemainingEl.textContent = `Your free limit resets in ${daysUntilReset} ${dayText}.`;
    } else if (daysRemainingEl) {
        daysRemainingEl.textContent = '';
    }

    if(modalToOpen) {
        modalHandler.open(modalToOpen);
    }
}