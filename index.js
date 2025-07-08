// index.js - KaniTime Stats Page

console.log('index.js loaded');

// JLPT mapping table (levels 1-60, partial for brevity)
const JLPT_MAPPING = [
  // Level, N5, N4, N3, N2, N1
  [1, 18.99, 1.81, 0.00, 0.00, 0.00],
  [2, 44.30, 6.63, 0.54, 0.54, 0.16],
  [3, 56.96, 13.86, 1.63, 1.09, 0.24],
  [4, 68.35, 21.08, 3.81, 3.54, 0.32],
  [5, 78.48, 33.13, 5.99, 5.18, 0.49],
  [6, 87.34, 43.98, 9.26, 5.99, 0.57],
  [7, 91.14, 52.41, 12.53, 7.63, 0.65],
  [8, 94.94, 59.04, 16.62, 8.45, 0.65],
  [9, 94.94, 68.07, 21.80, 9.54, 0.81],
  [10, 98.73, 77.71, 25.89, 11.17, 0.81],
  [11, 98.73, 81.33, 31.88, 13.35, 0.97],
  [12, 98.73, 86.75, 36.51, 16.62, 1.22],
  [13, 98.73, 90.36, 39.78, 18.80, 1.87],
  [14, 98.73, 90.36, 43.60, 21.53, 2.35],
  [15, 98.73, 94.58, 47.41, 24.52, 2.60],
  [16, 100.00, 96.99, 51.77, 25.89, 3.08],
  [17, null, 97.59, 56.68, 28.34, 3.57],
  [18, null, 98.19, 59.95, 30.25, 3.98],
  [19, null, 98.19, 62.67, 34.33, 4.71],
  [20, null, 98.19, 67.30, 36.51, 5.19],
  [21, null, 98.80, 70.84, 38.42, 5.93],
  [22, null, 98.80, 73.84, 40.60, 7.22],
  [23, null, 98.80, 76.84, 42.78, 8.28],
  [24, null, 99.40, 77.93, 47.96, 8.93],
  [25, null, 99.40, 81.74, 50.68, 9.98],
  [26, null, 99.40, 81.74, 54.22, 11.36],
  [27, null, 100.00, 84.74, 55.59, 12.58],
  [28, null, null, 86.10, 58.58, 14.04],
  [29, null, null, 87.74, 60.49, 15.75],
  [30, null, null, 90.19, 62.40, 16.72],
  [31, null, null, 91.83, 65.67, 18.26],
  [32, null, null, 93.46, 68.66, 19.64],
  [33, null, null, 94.28, 71.93, 20.78],
  [34, null, null, 95.10, 73.84, 22.32],
  [35, null, null, 96.19, 76.29, 23.62],
  [36, null, null, 96.73, 79.56, 25.32],
  [37, null, null, 97.28, 81.74, 27.19],
  [38, null, null, 97.82, 83.11, 29.14],
  [39, null, null, 98.09, 83.92, 31.41],
  [40, null, null, 98.37, 85.29, 33.52],
  [41, null, null, 98.37, 86.38, 35.06],
  [42, null, null, 98.64, 87.74, 37.18],
  [43, null, null, 98.64, 89.65, 39.29],
  [44, null, null, 98.91, 90.46, 40.99],
  [45, null, null, 98.91, 92.10, 43.02],
  [46, null, null, 99.18, 92.92, 45.29],
  [47, null, null, 99.18, 94.01, 47.48],
  [48, null, null, 99.18, 95.91, 49.59],
  [49, null, null, 99.18, 95.91, 52.27],
  [50, null, null, 99.46, 95.91, 54.46],
  [51, null, null, 100.00, 100.00, 55.84],
  [52, null, null, null, null, 58.60],
  [53, null, null, null, null, 61.12],
  [54, null, null, null, null, 63.72],
  [55, null, null, null, null, 66.31],
  [56, null, null, null, null, 68.99],
  [57, null, null, null, null, 71.51],
  [58, null, null, null, null, 74.11],
  [59, null, null, null, null, 76.79],
  [60, null, null, null, null, 79.22],
];

// Converts seconds to a human-readable format (weeks, days, hours, minutes, seconds)
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const units = [
    { label: 'week', value: 604800 },
    { label: 'day', value: 86400 },
    { label: 'hour', value: 3600 },
    { label: 'minute', value: 60 },
    { label: 'second', value: 1 }
  ];
  let remaining = seconds;
  let result = [];
  for (const unit of units) {
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      result.push(`${count} ${unit.label}${count > 1 ? 's' : ''}`);
      remaining -= count * unit.value;
    }
  }
  return result.join(' ');
}

function formatDurationNoSeconds(seconds) {
  // Only show weeks, days, hours, minutes
  const units = [
    { label: 'week', value: 604800 },
    { label: 'day', value: 86400 },
    { label: 'hour', value: 3600 },
    { label: 'minute', value: 60 }
  ];
  let remaining = seconds;
  let result = [];
  for (const unit of units) {
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      result.push(`${count} ${unit.label}${count > 1 ? 's' : ''}`);
      remaining -= count * unit.value;
    }
  }
  return result.length ? result.join(' ') : '0 minutes';
}

// Fetch and display average time to level up (last 10 levels only)
async function fetchAndDisplayLevelUpStats(daysOnly) {
  const statsPanel = document.getElementById('statsPanel');
  if (!statsPanel) return;
  // Get API key
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) {
    // No API key
    const avgTimeDiv = statsPanel.querySelector('.stat-item.avg-levelup .stat-value');
    if (avgTimeDiv) avgTimeDiv.textContent = 'API key required';
    return;
  }
  try {
    const resp = await fetch('https://api.wanikani.com/v2/level_progressions', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Wanikani-Revision': '20170710'
      }
    });
    if (!resp.ok) throw new Error('Failed to fetch level progression');
    const data = await resp.json();
    const levels = (data.data || []).sort((a, b) => new Date(a.data.unlocked_at) - new Date(b.data.unlocked_at));
    if (levels.length < 2) {
      const avgTimeDiv = statsPanel.querySelector('.stat-item.avg-levelup .stat-value');
      if (avgTimeDiv) avgTimeDiv.textContent = 'Not enough data';
      return;
    }
    let totalMs = 0;
    let count = 0;
    // Only use the last 10 levelups
    for (let i = Math.max(1, levels.length - 10); i < levels.length; ++i) {
      const prev = levels[i-1].data.unlocked_at;
      const curr = levels[i].data.unlocked_at;
      if (prev && curr) {
        const diff = new Date(curr) - new Date(prev);
        if (diff > 0) {
          totalMs += diff;
          count++;
        }
      }
    }
    if (count === 0) {
      const avgTimeDiv = statsPanel.querySelector('.stat-item.avg-levelup .stat-value');
      if (avgTimeDiv) avgTimeDiv.textContent = 'Not enough data';
      return;
    }
    const avgSec = Math.round(totalMs / 1000 / count);
    const avgTimeDiv = statsPanel.querySelector('.stat-item.avg-levelup .stat-value');
    if (avgTimeDiv) {
      if (daysOnly) {
        const days = Math.round(avgSec / 86400);
        avgTimeDiv.textContent = days + ' day' + (days === 1 ? '' : 's');
      } else {
        avgTimeDiv.textContent = formatDuration(avgSec);
      }
    }
    // Pass avgSec to JLPT projection
    renderJLPTProjections(avgSec, levels);
  } catch (e) {
    const avgTimeDiv = statsPanel.querySelector('.stat-item.avg-levelup .stat-value');
    if (avgTimeDiv) avgTimeDiv.textContent = 'Error fetching data';
  }
}

function renderJLPTProjections(avgSec, levels) {
  // JLPT level mapping (N1 to N5)
  const JLPT_LEVELS = [
    { label: 'N1', idx: 5, wkLevel: 60 },
    { label: 'N2', idx: 4, wkLevel: 51 },
    { label: 'N3', idx: 3, wkLevel: 27 },
    { label: 'N4', idx: 2, wkLevel: 17 },
    { label: 'N5', idx: 1, wkLevel: 10 }
  ];
  // Get user's current level
  let userLevel = 1;
  if (levels && levels.length > 0) {
    userLevel = levels[levels.length - 1].data.level;
  }
  if (userLevel > 60) userLevel = 60;
  const jlpt = JLPT_MAPPING[userLevel-1] || JLPT_MAPPING[0];
  const jlptPanel = document.getElementById('jlptPanel');
  if (!jlptPanel) return;
  // Find the last unlocked_at date
  let lastUnlocked = null;
  if (levels && levels.length > 0) {
    lastUnlocked = new Date(levels[levels.length - 1].data.unlocked_at);
  } else {
    lastUnlocked = new Date();
  }
  // For each JLPT level, show coverage and date reached (if 85%+), else projected date
  let coverageList = '';
  let projectionsList = '';
  JLPT_LEVELS.forEach(jlptLevel => {
    let val = jlpt[jlptLevel.idx];
    let coverageStr = '100%';
    if (val != null) {
      if (val >= 100) coverageStr = '100%';
      else coverageStr = val.toFixed(2) + '%';
    }
    coverageList += `<div class="jlpt-row"><span class="jlpt-label">${jlptLevel.label}:</span> <span class="jlpt-value">${coverageStr}</span></div>`;
    // Find if user has reached 85% coverage for this level
    let reached = false;
    let reachedDate = null;
    // Look for the first level progression where level >= wkLevel and coverage >= 85%
    if (levels && levels.length > 0) {
      for (let i = 0; i < levels.length; ++i) {
        const lvl = levels[i].data.level;
        if (lvl >= jlptLevel.wkLevel) {
          // Use the JLPT_MAPPING for that level
          const map = JLPT_MAPPING[lvl-1] || JLPT_MAPPING[0];
          const cov = map[jlptLevel.idx];
          if (cov != null && cov >= 85) {
            reached = true;
            reachedDate = new Date(levels[i].data.unlocked_at);
            break;
          }
        }
      }
    }
    if (reached && reachedDate) {
      projectionsList += `<div class="jlpt-row"><span class="jlpt-label">${jlptLevel.label}:</span> <span class="jlpt-value">${reachedDate.toLocaleDateString()}</span></div>`;
    } else {
      // Projected date
      if (userLevel >= jlptLevel.wkLevel) {
        projectionsList += `<div class="jlpt-row"><span class="jlpt-label">${jlptLevel.label}:</span> <span class="jlpt-value">--</span></div>`;
      } else {
        const levelsToGo = jlptLevel.wkLevel - userLevel;
        const projectedDate = new Date(lastUnlocked.getTime() + avgSec * 1000 * levelsToGo);
        projectionsList += `<div class="jlpt-row"><span class="jlpt-label">${jlptLevel.label}:</span> <span class="jlpt-value">${projectedDate.toLocaleDateString()}</span></div>`;
      }
    }
  });
  jlptPanel.innerHTML = `
    <div class="jlpt-split" style="display:flex; gap:32px; align-items:flex-start; justify-content:space-between;">
      <div style="flex:1; min-width:220px;">
        <div class="jlpt-title">JLPT Coverage at Level ${userLevel}</div>
        ${coverageList}
      </div>
      <div style="flex:1; min-width:220px;">
        <div class="jlpt-title">Dates Reached / Projected for Each JLPT Level</div>
        ${projectionsList}
      </div>
    </div>
  `;
}

function renderStatsAndJLPT(history) {
  // Compute stats
  const dates = Object.keys(history).sort();
  let totalReviews = 0;
  let totalTime = 0;
  dates.forEach(date => {
    totalReviews += history[date].completed || 0;
  });
  totalTime = totalReviews * 30; // 30s per review
  const days = dates.length;
  const avgReviews = days > 0 ? (totalReviews / days) : 0;

  // Render stats panel
  const statsPanel = document.getElementById('statsPanel');
  if (statsPanel) {
    statsPanel.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Reviews Done</span>
        <span class="stat-value">${totalReviews}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Time Received</span>
        <span class="stat-value">${formatDurationNoSeconds(totalTime)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Average Reviews/Day</span>
        <span class="stat-value">${Math.floor(avgReviews)}</span>
      </div>
      <div class="stat-item avg-levelup">
        <span class="stat-label">Average Time to Level Up</span>
        <span class="stat-value">Loading...</span>
      </div>
    `;
  }
  fetchAndDisplayLevelUpStats(true);
}

document.addEventListener('DOMContentLoaded', async () => {
	const ctx = document.getElementById('reviewChart').getContext('2d');
	const noDataMsg = document.getElementById('noDataMsg');

	// Get reviewHistory from chrome.storage.local
	chrome.storage.local.get(['reviewHistory'], (result) => {
		const history = result.reviewHistory || {};
		const dates = Object.keys(history).sort();
		const completed = dates.map(date => history[date].completed || 0);
		const baselines = dates.map(date => history[date].baseline || 0);

		console.log('Chart data:', { dates, completed, baselines });

		if (dates.length === 0) {
			noDataMsg.style.display = 'block';
			return;
		}

		noDataMsg.style.display = 'none';

		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: dates,
				datasets: [
					{
						label: 'Reviews Completed',
						data: completed,
						backgroundColor: 'rgba(102, 126, 234, 0.7)',
						barPercentage: 0.5,
						categoryPercentage: 0.5
					},
					{
						label: 'Baseline (Due at Start)',
						data: baselines,
						type: 'line',
						borderColor: 'rgba(118, 75, 162, 0.8)',
						backgroundColor: 'rgba(118, 75, 162, 0.1)',
						borderWidth: 2,
						fill: false,
						pointRadius: 3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: { position: 'top' },
					title: { display: false },
					tooltip: {
						position: 'nearest',
						yAlign: 'top'
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: { display: true, text: 'Reviews' }
					},
					x: {
						title: { display: true, text: 'Date' }
					}
				}
			}
		});
		renderStatsAndJLPT(history);
	});

	// Export/Import buttons
	const exportBtn = document.getElementById('exportReviewsBtn');
	const importBtn = document.getElementById('importReviewsBtn');
	const importInput = document.getElementById('importFileInput');
	const importStatus = document.getElementById('importStatus');

	if (exportBtn) {
		exportBtn.addEventListener('click', exportReviews);
	}
	if (importBtn && importInput) {
		importBtn.addEventListener('click', () => importInput.click());
		importInput.addEventListener('change', handleImportFile);
	}

	// Sidebar tab switching logic
	const tabHistory = document.getElementById('tabHistory');
	const tabSettings = document.getElementById('tabSettings');
	const historySection = document.getElementById('historySection');
	const settingsSection = document.getElementById('settingsSection');

	function showTab(tab) {
		if (tab === 'history') {
			tabHistory.classList.add('active');
			tabSettings.classList.remove('active');
			historySection.style.display = 'flex';
			settingsSection.style.display = 'none';
		} else {
			tabSettings.classList.add('active');
			tabHistory.classList.remove('active');
			historySection.style.display = 'none';
			settingsSection.style.display = 'flex';
		}
	}

	tabHistory?.addEventListener('click', () => showTab('history'));
	tabSettings?.addEventListener('click', () => showTab('settings'));

	// Default to History tab
	showTab('history');

	// Blocked Websites & API Key logic
	let isUnlocked = false;
	let currentBlockedSites = [];
	const BLOCK_PASSWORD = 'wanikani';

	const passwordInput = document.getElementById('passwordInput');
	const unlockBtn = document.getElementById('unlockBtn');
	const blockedSitesControls = document.getElementById('blockedSitesControls');
	const lockedMessage = document.getElementById('lockedMessage');
	const newSiteInput = document.getElementById('newSiteInput');
	const addSiteBtn = document.getElementById('addSite');
	const blockedSitesList = document.getElementById('blockedSitesList');
	const apiKeyInput = document.getElementById('apiKeyInput');
	const saveApiKeyBtn = document.getElementById('saveApiKey');

	unlockBtn?.addEventListener('click', toggleLock);
	passwordInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') toggleLock(); });
	addSiteBtn?.addEventListener('click', addBlockedSite);
	newSiteInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter' && isUnlocked) addBlockedSite(); });
	saveApiKeyBtn?.addEventListener('click', saveApiKey);

	await loadSettingsData();
	updateLockDisplay();

	async function loadSettingsData() {
		try {
			const data = await chrome.storage.local.get(['blockedSites', 'apiKey']);
			currentBlockedSites = data.blockedSites || [];
			if (isUnlocked) displayBlockedSites(currentBlockedSites);
			if (data.apiKey) {
				apiKeyInput.placeholder = 'API key saved ✓';
			}
		} catch (error) {
			console.error('Error loading settings data:', error);
		}
	}

	function toggleLock() {
		const password = passwordInput.value.trim();
		if (!isUnlocked && password === BLOCK_PASSWORD) {
			isUnlocked = true;
			blockedSitesControls.classList.remove('controls-hidden');
			lockedMessage.style.display = 'none';
			passwordInput.value = '';
			unlockBtn.textContent = 'Lock';
			passwordInput.placeholder = 'Unlocked ✓';
			updateLockDisplay();
			showImportStatus('Blocked sites unlocked for modification', true);
		} else if (isUnlocked) {
			isUnlocked = false;
			blockedSitesControls.classList.add('controls-hidden');
			lockedMessage.style.display = '';
			unlockBtn.textContent = 'Unlock';
			passwordInput.placeholder = 'Enter wanikani to modify';
			updateLockDisplay();
			showImportStatus('Blocked sites locked', true);
		} else {
			showImportStatus('Incorrect password', false);
		}
	}

	function updateLockDisplay() {
		if (isUnlocked) {
			blockedSitesControls.className = 'controls-unlocked';
			lockedMessage.style.display = 'none';
			displayBlockedSites(currentBlockedSites);
		} else {
			blockedSitesControls.className = 'controls-hidden';
			lockedMessage.style.display = 'block';
		}
	}

	async function addBlockedSite() {
		if (!isUnlocked) {
			showImportStatus('Please unlock to modify blocked sites', false);
			return;
		}
		const site = newSiteInput.value.trim().toLowerCase();
		if (!site) {
			showImportStatus('Please enter a website URL', false);
			return;
		}
		const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '');
		try {
			const data = await chrome.storage.local.get(['blockedSites']);
			const blockedSites = data.blockedSites || [];
			if (blockedSites.includes(cleanSite)) {
				showImportStatus('Site already in blocked list', false);
				return;
			}
			blockedSites.push(cleanSite);
			await chrome.storage.local.set({ blockedSites });
			newSiteInput.value = '';
			currentBlockedSites = blockedSites;
			displayBlockedSites(currentBlockedSites);
			showImportStatus(`Added ${cleanSite} to blocked list`, true);
		} catch (error) {
			console.error('Error adding blocked site:', error);
			showImportStatus('Error adding site to block list', false);
		}
	}

	async function removeBlockedSite(site) {
		if (!isUnlocked) {
			showImportStatus('Please unlock to modify blocked sites', false);
			return;
		}
		try {
			const data = await chrome.storage.local.get(['blockedSites']);
			const blockedSites = data.blockedSites || [];
			const updatedSites = blockedSites.filter(s => s !== site);
			await chrome.storage.local.set({ blockedSites: updatedSites });
			currentBlockedSites = updatedSites;
			displayBlockedSites(currentBlockedSites);
			showImportStatus(`Removed ${site} from blocked list`, true);
		} catch (error) {
			console.error('Error removing blocked site:', error);
			showImportStatus('Error removing site from block list', false);
		}
	}

	function displayBlockedSites(sites) {
		if (!isUnlocked) return;
		blockedSitesList.innerHTML = '';
		if (!sites || sites.length === 0) {
			const emptyItem = document.createElement('li');
			emptyItem.className = 'site-item';
			emptyItem.innerHTML = '<span style="color: #6c757d; font-style: italic;">No blocked sites</span>';
			blockedSitesList.appendChild(emptyItem);
			return;
		}
		sites.forEach(site => {
			const listItem = document.createElement('li');
			listItem.className = 'site-item';
			const siteSpan = document.createElement('span');
			siteSpan.className = 'site-url';
			siteSpan.textContent = site;
			const removeBtn = document.createElement('button');
			removeBtn.className = 'remove-btn';
			removeBtn.textContent = 'Remove';
			removeBtn.addEventListener('click', () => removeBlockedSite(site));
			listItem.appendChild(siteSpan);
			listItem.appendChild(removeBtn);
			blockedSitesList.appendChild(listItem);
		});
	}

	async function saveApiKey() {
		const apiKey = apiKeyInput.value.trim();
		if (!apiKey) {
			showImportStatus('Please enter a valid API key', false);
			return;
		}
		try {
			const response = await fetch('https://api.wanikani.com/v2/user', {
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Wanikani-Revision': '20170710'
				}
			});
			if (!response.ok) throw new Error('Invalid API key');
			await chrome.storage.local.set({ apiKey });
			apiKeyInput.value = '';
			apiKeyInput.placeholder = 'API key saved ✓';
			showImportStatus('API key saved successfully!', true);
		} catch (error) {
			console.error('Error saving API key:', error);
			showImportStatus('Invalid API key. Please check and try again.', false);
		}
	}

});

// Export review history as a JSON file
async function exportReviews() {
	try {
		const result = await chrome.storage.local.get(['reviewHistory']);
		const reviewHistory = result.reviewHistory || {};
		const json = JSON.stringify(reviewHistory, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const now = new Date();
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, '0');
		const dd = String(now.getDate()).padStart(2, '0');
		const filename = `kanitime-reviews-${yyyy}${mm}${dd}.json`;

		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showImportStatus('Review history exported!', true);
	} catch (error) {
		console.error('Export failed:', error);
		showImportStatus('Failed to export review history', false);
	}
}

// Handle import file selection
async function handleImportFile(event) {
	const file = event.target.files[0];
	if (!file) return;
	try {
		const text = await file.text();
		const imported = JSON.parse(text);
		if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid file format');
		const result = await chrome.storage.local.get(['reviewHistory']);
		const current = result.reviewHistory || {};
		const merged = { ...current };
		for (const [date, data] of Object.entries(imported)) {
			if (!merged[date] || (data.completed > (merged[date].completed || 0))) {
				merged[date] = data;
			}
		}
		await chrome.storage.local.set({ reviewHistory: merged });
		showImportStatus('Review history imported successfully!', true);
		// Optionally, reload the page or chart
		setTimeout(() => window.location.reload(), 1200);
	} catch (error) {
		console.error('Import failed:', error);
		showImportStatus('Failed to import review history: ' + error.message, false);
	}
}

function showImportStatus(msg, success) {
	const el = document.getElementById('importStatus');
	if (el) {
		el.textContent = msg;
		el.style.color = success ? '#28a745' : '#dc3545';
		if (success) {
			setTimeout(() => { el.textContent = ''; }, 2000);
		}
	}
} 