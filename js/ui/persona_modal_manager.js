// js/ui/persona_modal_manager.js
// Manages the detailed persona modal: opening, populating, actions, and cleanup.

window.personaModalManager = (() => {
    const getDeps = () => ({
        domElements: window.domElements,
        modalHandler: window.modalHandler,         // For opening/closing the generic modal
        polyglotHelpers: window.polyglotHelpers,
        activityManager: window.activityManager,   // For checking active status
    });

    function initializePersonaModalControls() {
        const { domElements, modalHandler } = getDeps();
        console.log("personaModalManager: initializePersonaModalControls - Setting up listeners.");

        if (!domElements || !modalHandler) {
            console.warn("personaModalManager: initializePersonaModalControls - domElements or modalHandler not available.");
            return;
        }

        // Close button on the modal itself
        if (domElements.closePersonaModalBtn) {
            domElements.closePersonaModalBtn.addEventListener('click', () => {
                cleanupModalData();
                modalHandler.close(domElements.detailedPersonaModal);
            });
        } else {
            console.warn("personaModalManager: 'closePersonaModalBtn' not found.");
        }

        // Backdrop click to close
        if (domElements.detailedPersonaModal) {
            domElements.detailedPersonaModal.addEventListener('click', (event) => {
                if (event.target === domElements.detailedPersonaModal) { // Click on overlay
                    cleanupModalData();
                    modalHandler.close(domElements.detailedPersonaModal);
                }
            });
        }

        // Action buttons within the modal
        if (domElements.personaModalMessageBtn) {
            domElements.personaModalMessageBtn.addEventListener('click', () => handlePersonaModalAction('message_modal'));
        } else {
            console.warn("personaModalManager: 'personaModalMessageBtn' not found.");
        }

        if (domElements.personaModalDirectCallBtn) {
            domElements.personaModalDirectCallBtn.addEventListener('click', () => handlePersonaModalAction('direct_modal'));
        } else {
            console.warn("personaModalManager: 'personaModalDirectCallBtn' not found.");
        }

        console.log("personaModalManager: Persona modal control listeners attached.");
    }

    function openDetailedPersonaModal(connector) {
        const { domElements, modalHandler, polyglotHelpers, activityManager } = getDeps();
        console.log("personaModalManager: openDetailedPersonaModal - Called for connector:", connector?.id);

        if (!connector?.id || !domElements?.detailedPersonaModal || !modalHandler || !polyglotHelpers || !activityManager) {
            console.error("personaModalManager: openDetailedPersonaModal - Cannot open modal. Missing critical dependencies or connector ID.", {
                connectorId: connector?.id,
                hasModalElement: !!domElements?.detailedPersonaModal,
                hasModalHandler: !!modalHandler,
                hasHelpers: !!polyglotHelpers,
                hasActivityManager: !!activityManager
            });
            return;
        }

        try {
            // Populate Avatar, Name, Location/Age, Status
            domElements.personaModalAvatar.src = connector.avatarModern || 'images/placeholder_avatar.png';
            domElements.personaModalAvatar.onerror = () => { domElements.personaModalAvatar.src = 'images/placeholder_avatar.png'; };
            domElements.personaModalName.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.profileName || connector.name || 'Unknown Persona');

            const ageText = connector.age && connector.age !== "N/A" ? `${connector.age} yrs` : 'Age N/A';
            const locationText = `${polyglotHelpers.sanitizeTextForDisplay(connector.city || 'City N/A')}, ${polyglotHelpers.sanitizeTextForDisplay(connector.country || 'Country N/A')}`;
            domElements.personaModalLocationAge.textContent = `${locationText} | ${ageText}`;

            const isActive = activityManager.isConnectorActive(connector);
            domElements.personaModalActiveStatus.classList.toggle('active', isActive);
            domElements.personaModalActiveStatus.title = isActive ? "This person is currently active" : "This person is currently inactive";

            // Populate Bio
            domElements.personaModalBio.textContent = polyglotHelpers.sanitizeTextForDisplay(connector.bioModern || "This user hasn't written a bio yet.");

            // Populate Languages
            if (modalHandler.renderLanguageSection) {
                modalHandler.renderLanguageSection(connector);
            } else {
                console.warn("personaModalManager: modalHandler.renderLanguageSection not found. Language section will not be rendered.");
                if (domElements.personaModalLanguagesUl) domElements.personaModalLanguagesUl.innerHTML = "<p>Language info unavailable.</p>";
            }

            // Populate Interests
            domElements.personaModalInterestsUl.innerHTML = ''; // Clear previous
            if (connector.interests && connector.interests.length > 0) {
                connector.interests.forEach(interest => {
                    const li = document.createElement('li');
                    li.className = 'interest-tag';
                    li.textContent = polyglotHelpers.sanitizeTextForDisplay(interest.charAt(0).toUpperCase() + interest.slice(1));
                    domElements.personaModalInterestsUl.appendChild(li);
                });
            } else {
                domElements.personaModalInterestsUl.innerHTML = "<li class='interest-tag-none'>No interests listed.</li>";
            }

            // Populate Gallery
            if (connector.galleryImageFiles?.length > 0) {
                domElements.personaModalGallery.innerHTML = `<p>${connector.galleryImageFiles.length} photos (gallery display feature coming soon).</p>`;
            } else {
                domElements.personaModalGallery.innerHTML = `<div class="gallery-placeholder-content"><i class="fas fa-images"></i><p>No photos shared yet.</p></div>`;
            }

            // Store connector ID on the modal for action handlers
            domElements.detailedPersonaModal.dataset.connectorId = connector.id;

            modalHandler.open(domElements.detailedPersonaModal);
            console.log("personaModalManager: Detailed persona modal opened for", connector.id);

        } catch (error) {
            console.error("personaModalManager: Error populating persona modal:", error, "Connector data:", connector);
            modalHandler.close(domElements.detailedPersonaModal); // Ensure modal is closed on error
            cleanupModalData();
        }
    }

    function cleanupModalData() {
        const { domElements } = getDeps();
        if (domElements?.detailedPersonaModal) {
            domElements.detailedPersonaModal.dataset.connectorId = '';
            console.log("personaModalManager: Modal data (connectorId) cleaned up.");
        }
    }

    function handlePersonaModalAction(actionType) {
        const { domElements, modalHandler } = getDeps();
        console.log("personaModalManager: handlePersonaModalAction - Action type:", actionType);

        if (!domElements?.detailedPersonaModal || !modalHandler) {
            console.error("personaModalManager: handlePersonaModalAction - Missing domElements.detailedPersonaModal or modalHandler.");
            return;
        }
        const connectorId = domElements.detailedPersonaModal.dataset.connectorId;
        if (!connectorId) {
            console.error("personaModalManager: handlePersonaModalAction - No connector ID found on persona modal.");
            return;
        }

        const connector = (window.polyglotConnectors || []).find(c => c.id === connectorId);
        if (!connector) {
            console.error(`personaModalManager: handlePersonaModalAction - Connector with ID '${connectorId}' not found.`);
            cleanupModalData();
            modalHandler.close(domElements.detailedPersonaModal);
            return;
        }

        modalHandler.close(domElements.detailedPersonaModal);
        cleanupModalData();

        if (window.polyglotApp?.initiateSession) {
            console.log("personaModalManager: Calling polyglotApp.initiateSession for", connector.id, "type:", actionType);
            window.polyglotApp.initiateSession(connector, actionType);
        } else {
            console.error("personaModalManager: handlePersonaModalAction - window.polyglotApp.initiateSession is not available.");
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePersonaModalControls);
    } else {
        initializePersonaModalControls();
    }

    console.log("js/ui/persona_modal_manager.js loaded.");
    return {
        openDetailedPersonaModal
    };
})();