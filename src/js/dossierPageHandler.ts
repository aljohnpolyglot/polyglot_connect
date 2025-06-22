// src/js/dossierPageHandler.ts
import type { Connector, PersonaIdentity, KeyLifeEvent, LanguageEntry, InterestsStructured } from './types/global'; 
// Helper to safely set text content
const setText = (id: string, text?: string | number | null) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ? String(text) : 'N/A';
};

// Helper to create pill elements
const createPills = (containerId: string, items?: string[]) => {
    const container = document.getElementById(containerId);
    if (container && items && items.length > 0) {
        container.innerHTML = ''; // Clear previous
        items.forEach(item => {
            const pill = document.createElement('span');
            pill.className = 'pill';
            pill.textContent = item;
            container.appendChild(pill);
        });
    } else if (container) {
        container.innerHTML = '<span class="pill muted">None listed</span>';
    }
};

// Helper for structured interests
const renderStructuredInterests = (containerId: string, interests?: InterestsStructured) => {
    const container = document.getElementById(containerId);
    if (!container || !interests || Object.keys(interests).length === 0) {
        if (container) container.innerHTML = '<p>No specific interests detailed.</p>';
        return;
    }
    container.innerHTML = '';
    for (const category in interests) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'interest-category-item';
        const categoryTitle = document.createElement('h4');
        categoryTitle.innerHTML = `<i class="fas fa-tag"></i> ${category}`;
        categoryDiv.appendChild(categoryTitle);

        const items = interests[category];
        const itemsPillContainer = document.createElement('div');
        itemsPillContainer.className = 'pill-container';
        (Array.isArray(items) ? items : [items]).forEach(item => {
            if (item) {
                const pill = document.createElement('span');
                pill.className = 'pill';
                pill.textContent = String(item);
                itemsPillContainer.appendChild(pill);
            }
        });
        categoryDiv.appendChild(itemsPillContainer);
        container.appendChild(categoryDiv);
    }
};

// Helper for key life events
const renderKeyLifeEvents = (containerId: string, events?: KeyLifeEvent[]) => {
    const container = document.getElementById(containerId);
    if (!container || !events || events.length === 0) {
        if (container) container.innerHTML = '<p>No significant life events detailed.</p>';
        return;
    }
    container.innerHTML = '';
    events.forEach(event => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'event-item';
        itemDiv.innerHTML = `
            <span class="event-date">${event.date}</span>
            <strong>${event.event}</strong>
            ${event.description ? `<p>${event.description}</p>` : ''}
        `;
        container.appendChild(itemDiv);
    });
};

// Helper for language profile
const renderLanguageProfile = (containerId: string, native?: LanguageEntry[], practice?: LanguageEntry[]) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Clear previous

    const renderLangList = (title: string, langs?: LanguageEntry[]) => {
        if (langs && langs.length > 0) {
            const titleEl = document.createElement('h4');
            titleEl.textContent = title;
            container.appendChild(titleEl);
            const ul = document.createElement('ul');
            langs.forEach(lang => {
                const li = document.createElement('li');
                // Basic flag placeholder, can be improved with actual flag images/emojis later
                li.innerHTML = `<i class="fas fa-flag"></i> ${lang.lang} <span class="pill muted">${lang.levelTag}</span>`;
                ul.appendChild(li);
            });
            container.appendChild(ul);
        }
    };
    renderLangList('Native Languages', native);
    renderLangList('Practicing / Fluent', practice);
};

// Helper to get a readable activity status (simplified)
function getPersonaActivityStatus(persona: PersonaIdentity): string {
    // This is a very simplified version. A more robust one would use moment-timezone or similar
    // and properly compare against the sleepSchedule.
    if (!persona.activeTimezone || !persona.sleepSchedule) return "Activity status unknown";
    
    try {
        // Attempt to get a rough idea. This isn't perfectly accurate without timezone libraries.
        const now = new Date();
        const formatter = new Intl.DateTimeFormat([], { timeZone: persona.activeTimezone, hour: 'numeric', minute: 'numeric', hour12: false });
        const parts = formatter.formatToParts(now);
        const hourPart = parts.find(p => p.type === 'hour');
        
        if (hourPart) {
            const currentHour = parseInt(hourPart.value, 10);
            const wakeHour = parseInt(persona.sleepSchedule.wake.split(':')[0], 10);
            const sleepHour = parseInt(persona.sleepSchedule.sleep.split(':')[0], 10);

            if (sleepHour < wakeHour) { // Sleeps past midnight
                if (currentHour >= wakeHour || currentHour < sleepHour) {
                    return "Likely Awake";
                } else {
                    return "Likely Sleeping";
                }
            } else { // Sleeps before midnight
                if (currentHour >= wakeHour && currentHour < sleepHour) {
                    return "Likely Awake";
                } else {
                    return "Likely Sleeping";
                }
            }
        }
        return "Likely Active (Timezone: " + persona.activeTimezone + ")";
    } catch (e) {
        return "Activity status unknown (Timezone: " + persona.activeTimezone + ")";
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const personaId = params.get('id');

    if (!personaId) {
        document.body.innerHTML = '<h1>Error: Persona ID not provided.</h1><a href="/app.html">Back to App</a>';
        return;
    }

    // Attempt to get polyglotConnectors from the window object
    // This assumes that your main app.js has loaded and populated this.
    // For a standalone page, a better approach would be to fetch personas.json directly
    // or have app.js provide a function to get persona data.
    const personas = (window.opener || window.parent || window).polyglotConnectors as Connector[] | undefined;
    
    if (!personas) {
        // Fallback if not opened from main app or data not ready
        // Try to load from localStorage if app.js saves it there
        const storedPersonas = localStorage.getItem('polyglotConnectors'); // Assuming app.js might save this
        if (storedPersonas) {
            try {
                const parsedPersonas = JSON.parse(storedPersonas) as Connector[];
                const persona = parsedPersonas.find(p => p.id === personaId);
                if (persona) populateDossier(persona);
                else document.body.innerHTML = `<h1>Error: Persona with ID '${personaId}' not found (from storage).</h1>`;
            } catch (e) {
                document.body.innerHTML = '<h1>Error: Could not load persona data. Please open from the main app.</h1>';
            }
        } else {
             document.body.innerHTML = '<h1>Error: Persona data not available. Please ensure the main app is loaded or open this from within the app.</h1>';
        }
        return;
    }

    const persona = personas.find(p => p.id === personaId);

    if (!persona) {
        document.body.innerHTML = `<h1>Error: Persona with ID '${personaId}' not found.</h1><a href="/app.html">Back to App</a>`;
        return;
    }

    populateDossier(persona);
});

function populateDossier(persona: PersonaIdentity) { // Use PersonaIdentity as it has all fields
    console.log("Populating Dossier for:", persona);

    const avatarEl = document.getElementById('dossier-avatar') as HTMLImageElement;
    if (avatarEl) {
        avatarEl.src = persona.avatarModern || '/images/placeholder_avatar.png';
        avatarEl.alt = persona.profileName;
    }

    setText('dossier-profile-name', persona.profileName);
    setText('dossier-full-name', `(${persona.name})`);
    setText('dossier-profession', persona.profession);
    setText('dossier-location', `${persona.city}, ${persona.country}`);
    
    setText('dossier-bio', persona.bioModern);
    setText('dossier-education', persona.education);

    createPills('dossier-personality-traits', persona.personalityTraits);
    setText('dossier-communication-style', persona.communicationStyle);
    setText('dossier-chat-style', persona.chatPersonality?.style);
    setText('dossier-quirks', persona.quirksOrHabits?.join(', '));

    renderStructuredInterests('dossier-interests-structured', persona.interestsStructured);
    createPills('dossier-interests-general', persona.interests);
    createPills('dossier-dislikes', persona.dislikes);
    
    renderKeyLifeEvents('dossier-key-life-events', persona.keyLifeEvents);
    renderLanguageProfile('dossier-language-profile', persona.nativeLanguages, persona.practiceLanguages);

    setText('dossier-relationship-status', persona.relationshipStatus?.status);
    const relDetailsEl = document.getElementById('dossier-relationship-details');
    if (relDetailsEl && persona.relationshipStatus) {
        relDetailsEl.innerHTML = ''; // Clear
        if (persona.relationshipStatus.partner) {
            relDetailsEl.innerHTML += `<p><strong>Partner:</strong> ${persona.relationshipStatus.partner.name} (${persona.relationshipStatus.partner.occupation})</p>`;
            if(persona.relationshipStatus.partner.interests) relDetailsEl.innerHTML += `<p><em>Interests: ${persona.relationshipStatus.partner.interests.join(', ')}</em></p>`;
        }
        if(persona.relationshipStatus.howTheyMet) relDetailsEl.innerHTML += `<p><em>Met: ${persona.relationshipStatus.howTheyMet}</em></p>`;
        if(persona.relationshipStatus.lookingFor) relDetailsEl.innerHTML += `<p><em>Seeking: ${persona.relationshipStatus.lookingFor}</em></p>`;
        if(persona.relationshipStatus.details) relDetailsEl.innerHTML += `<p><em>Notes: ${persona.relationshipStatus.details}</em></p>`;
    }


    setText('dossier-active-timezone', persona.activeTimezone);
    setText('dossier-daily-routine', persona.dailyRoutineNotes);
    setText('dossier-current-activity-status', getPersonaActivityStatus(persona));
}