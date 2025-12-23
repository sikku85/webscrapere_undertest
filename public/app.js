const statusBadge = document.getElementById('status-badge');
const lastRunEl = document.getElementById('last-run');
const lastDurationEl = document.getElementById('last-duration');
const itemsFoundEl = document.getElementById('items-found');
const dbStatusEl = document.getElementById('db-status');
const logsContainer = document.getElementById('logs-container');
const triggerBtn = document.getElementById('trigger-btn');

const dailyJobsEl = document.getElementById('daily-jobs');
const dailyAdmitEl = document.getElementById('daily-admit');
const dailyResultsEl = document.getElementById('daily-results');

let isRunning = false;

function formatTime(isoString) {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
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
            dailyJobsEl.textContent = data.dailyStats.latestJobs || 0;
            dailyAdmitEl.textContent = data.dailyStats.admitCards || 0;
            dailyResultsEl.textContent = data.dailyStats.results || 0;
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
