import"./modulepreload-polyfill-B5Qt9EMX.js";import{initializeApp as c}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";import"./subpage-navbar-Bv3CJG-1.js";import"./preload-helper-D7HrI6pR.js";const d={apiKey:"YOUR_API_KEY",authDomain:"YOUR_AUTH_DOMAIN",projectId:"YOUR_PROJECT_ID",storageBucket:"YOUR_STORAGE_BUCKET",messagingSenderId:"YOUR_SENDER_ID",appId:"YOUR_APP_ID"};c(d);function p(n){let e=n.split(`
`).map(t=>(t=t.trim(),t.startsWith("* ")?`<li>${t.substring(2)}</li>`:t?`<p>${t}</p>`:"")).join("");return e=e.replace(/(<li>.*<\/li>)/gs,"<ul>$1</ul>"),e=e.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>"),e}async function l(){const n=document.getElementById("updates-feed"),e=document.getElementById("loading-spinner");if(!(!n||!e))try{const t=await fetch("/api/get-updates");if(!t.ok)throw new Error(`API fetch failed: ${t.statusText}`);const{data:a}=await t.json(),r=a.patchNoteCollection.items;e.style.display="none",r.forEach(s=>{const o=new Date(s.releaseDate).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),i=`
                <div class="patch-note-entry">
                    <div class="patch-header">
                        <span class="version">${s.version}</span>
                        <span class="release-date">${o}</span>
                    </div>
                    <div class="patch-content">
                        <h2>${s.title}</h2>
                        <div class="notes-body">
                            ${p(s.notes)}
                        </div>
                    </div>
                </div>`;n.innerHTML+=i})}catch(t){console.error("Error fetching patch notes:",t),e.innerHTML="Could not load updates."}}l();
