// D:\polyglot_connect\src\js\updates-loader.ts

type PatchNote = {
    version: string;
    title: string;
    releaseDate: string;
    notes: string;
};

function convertMarkdown(text: string): string {
    let html = text.split('\n').map(line => {
        line = line.trim();
        if (line.startsWith('* ')) {
            return `<li>${line.substring(2)}</li>`;
        }
        return line ? `<p>${line}</p>` : '';
    }).join('');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return html;
}

async function fetchAndRenderPatchNotes() {
    const feed = document.getElementById('updates-feed');
    const spinner = document.getElementById('loading-spinner');
    if (!feed || !spinner) return;

    try {
        // We now call our own secure API route
        const response = await fetch(`/api/get-updates`);
        if (!response.ok) throw new Error(`API fetch failed: ${response.statusText}`);

        const { data } = await response.json();
        const patchNotes: PatchNote[] = data.patchNoteCollection.items;

        spinner.style.display = 'none';

        patchNotes.forEach((note: PatchNote) => {
            const date = new Date(note.releaseDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
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
                </div>`;
            feed.innerHTML += entryHtml;
        });

    } catch (error) {
        console.error("Error fetching patch notes:", error);
        spinner.innerHTML = 'Could not load updates.';
    }
}

fetchAndRenderPatchNotes();