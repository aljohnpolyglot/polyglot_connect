// D:\polyglot_connect\src\js\updates-loader.ts

// --- START: Your Contentful API Credentials ---
const SPACE_ID = 'vnn2zeui9056';
const ACCESS_TOKEN = 'GBH5CXKD-DYhAa41bUA1n-pGsfduN6wUkqAROy9d7o4';
// --- END: Your Contentful API Credentials ---
type PatchNote = {
    version: string;
    title: string;
    releaseDate: string; // It comes as a string from the API
    notes: string;
};
function convertMarkdown(text: string): string {
    // This function can be improved, but is fine for now.
    // First, handle list items
    let html = text.split('\n').map(line => {
        line = line.trim();
        if (line.startsWith('* ')) {
            return `<li>${line.substring(2)}</li>`;
        }
        return line; // Return other lines as-is for now
    }).join('');

    // Wrap consecutive list items in <ul>
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Then handle bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    return html;
}

async function fetchAndRenderPatchNotes() {
    const feed = document.getElementById('updates-feed');
    const spinner = document.getElementById('loading-spinner');
    if (!feed || !spinner) return;

    const query = `
        query {
            patchNoteCollection(order: releaseDate_DESC) {
                items {
                    version
                    title
                    releaseDate
                    notes
                }
            }
        }
    `;

    try {
        const response = await fetch(`https://graphql.contentful.com/content/v1/spaces/${SPACE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) throw new Error(`Contentful fetch failed: ${response.statusText}`);

        const { data } = await response.json();
        const patchNotes: PatchNote[] = data.patchNoteCollection.items; // Tell TS this is an array of our new type

        spinner.style.display = 'none';

        // THE FIX: Explicitly type the 'note' parameter
        patchNotes.forEach((note: PatchNote) => {
            const date = new Date(note.releaseDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const entryHtml = `
                <div class="patch-note-entry">
                    <div class="patch-header">
                        <span class="version">${note.version}</span>
                        <span class="release-date">${date}</span>
                    </div>
                    <div class="patch-content">
                        <h2>${note.title}</h2>
                        <div class="notes-body">
                            ${convertMarkdown(note.notes)}
                        </div>
                    </div>
                </div>
            `;
            feed.innerHTML += entryHtml;
        });

    } catch (error) {
        console.error("Error fetching patch notes:", error);
        spinner.innerHTML = 'Could not load updates.';
    }
}

// Run the function when the page loads
fetchAndRenderPatchNotes();