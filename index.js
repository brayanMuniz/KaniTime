// index.js - KaniTime Stats Page

console.log('index.js loaded');

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