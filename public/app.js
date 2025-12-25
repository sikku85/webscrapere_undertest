const statusBadge = document.getElementById('status-badge');
const lastRunEl = document.getElementById('last-run');
const lastDurationEl = document.getElementById('last-duration');
const itemsFoundEl = document.getElementById('items-found');
const dbStatusEl = document.getElementById('db-status');
const logsContainer = document.getElementById('logs-container');
const triggerBtn = document.getElementById('trigger-btn');

const dailyJobsEl = document.getElementById('daily-jobs');
const dailyAdmitEl = document.getElementById('daily-admit');
const dailyKeysEl = document.getElementById('daily-keys');
const dailyResultsEl = document.getElementById('daily-results');

// Modal Elements
const modal = document.getElementById('details-modal');
const modalTitle = document.getElementById('modal-title');
const modalList = document.getElementById('modal-list');
const closeBtn = document.querySelector('.close-btn');

let currentStats = null; // Store full stats for click handlers
let isRunning = false;

function formatTime(isoString) {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
}

function formatTimeOnly(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function updateBadge(status) {
    statusBadge.textContent = status === 'active' ? 'Active' : 'Offline';
    statusBadge.className = `badge ${status === 'active' ? 'active' : 'offline'}`;
}

async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('Failed to fetch status');
        
        const data = await res.json();
        
        // Update Stats
        updateBadge(data.status);
        lastRunEl.textContent = formatTime(data.stats.lastRun);
        lastDurationEl.textContent = `${data.stats.lastRunDuration} ms`;
        itemsFoundEl.textContent = data.stats.itemsFoundLastRun;
        
        dbStatusEl.textContent = data.stats.dbConnected ? 'Connected' : 'Disconnected';
        dbStatusEl.style.color = data.stats.dbConnected ? 'var(--success-color)' : 'var(--error-color)';

        // Update Daily Stats
        if (data.dailyStats) {
            currentStats = data.dailyStats; // Store globally
            dailyJobsEl.textContent = data.dailyStats.latestJobs.count || 0;
            dailyAdmitEl.textContent = data.dailyStats.admitCards.count || 0;
            dailyKeysEl.textContent = data.dailyStats.answerKeys.count || 0;
            dailyResultsEl.textContent = data.dailyStats.results.count || 0;
        }

        // Update Logs
        renderLogs(data.logs);

    } catch (err) {
        console.error(err);
        updateBadge('offline');
    }
}

function renderLogs(logs) {
    // Current simple implementation: replace all logs
    // In a real app, we might diff it, but logs array is small (50 items)
    
    // Clear current logs
    logsContainer.innerHTML = '';
    
    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.textContent = log;
        logsContainer.appendChild(div);
    });
}

triggerBtn.addEventListener('click', async () => {
    if (isRunning) return;
    
    isRunning = true;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<span class="icon">🔄</span> Running...';
    
    try {
        const res = await fetch('/api/trigger');
        const data = await res.json();
        console.log('Trigger result:', data);
        // Force immediate status update
        fetchStatus();
    } catch (err) {
        alert('Failed to trigger scraper');
    } finally {
        isRunning = false;
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = '<span class="icon">🚀</span> Run Scraper Now';
    }
});

// Initial load
fetchStatus();

// Poll every 2 seconds
setInterval(fetchStatus, 2000);

// Modal Logic
function openModal(title, items) {
    modalTitle.textContent = title;
    modalList.innerHTML = '';
    
    if (!items || items.length === 0) {
        modalList.innerHTML = '<li style="padding: 1.5rem; text-align: center; color: var(--text-secondary);">No items found today.</li>';
    } else {
        items.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.url;
            a.target = '_blank';
            a.target = '_blank';
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'item-time';
            timeSpan.textContent = formatTimeOnly(item.dateFound);
            timeSpan.style.color = 'var(--text-secondary)';
            timeSpan.style.fontSize = '0.85rem';
            timeSpan.style.marginLeft = '10px';
            timeSpan.style.float = 'right';

            a.appendChild(timeSpan);
            a.childNodes[0].textContent = item.text; // Ensure text is separate from span if needed, or just append
            
            // Re-structure to have text and time
            a.innerHTML = `<span class="item-text">${item.text}</span> <span class="item-time" style="float: right; color: var(--text-secondary); font-size: 0.85rem;">${formatTimeOnly(item.dateFound)}</span>`;

            li.appendChild(a);
            modalList.appendChild(li);
        });
    }
    
    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
}

// Click Handlers for Stats
document.querySelector('.daily-card:nth-child(1)').addEventListener('click', () => {
    if (currentStats) openModal('New Jobs (Today)', currentStats.latestJobs.items);
});

document.querySelector('.daily-card:nth-child(2)').addEventListener('click', () => {
    if (currentStats) openModal('Admit Cards (Today)', currentStats.admitCards.items);
});

document.querySelector('.daily-card:nth-child(3)').addEventListener('click', () => {
    if (currentStats) openModal('Answer Keys (Today)', currentStats.answerKeys.items);
});

document.querySelector('.daily-card:nth-child(4)').addEventListener('click', () => {
    if (currentStats) openModal('Results (Today)', currentStats.results.items);
});

closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
