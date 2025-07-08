// KaniTime Popup Script - Handles UI interactions and messaging

// DOM elements
let timeDisplay, reviewCountDisplay, apiKeyInput, saveApiKeyBtn, checkReviewsBtn;
let newSiteInput, addSiteBtn, blockedSitesList, statusMessage;
let passwordInput, unlockBtn, blockedSitesControls, lockedMessage;
let timerStatusDiv, timerText;

// State
let isUnlocked = false;
let currentBlockedSites = [];
let isTimerActive = false;
let port = null;
const BLOCK_PASSWORD = 'wanikani';

// Initialize popup when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
	// Get DOM elements
	timeDisplay = document.getElementById('timeRemaining');
	reviewCountDisplay = document.getElementById('reviewCount');
	apiKeyInput = document.getElementById('apiKeyInput');
	saveApiKeyBtn = document.getElementById('saveApiKey');
	checkReviewsBtn = document.getElementById('checkReviews');
	newSiteInput = document.getElementById('newSiteInput');
	addSiteBtn = document.getElementById('addSite');
	blockedSitesList = document.getElementById('blockedSitesList');
	statusMessage = document.getElementById('statusMessage');
	passwordInput = document.getElementById('passwordInput');
	unlockBtn = document.getElementById('unlockBtn');
	blockedSitesControls = document.getElementById('blockedSitesControls');
	lockedMessage = document.getElementById('lockedMessage');
	timerStatusDiv = document.getElementById('timerStatus');
	timerText = document.getElementById('timerText');
	const exportReviewsBtn = document.getElementById('exportReviewsBtn');
	if (exportReviewsBtn) {
		exportReviewsBtn.addEventListener('click', exportReviews);
	}

	// Set up event listeners
	saveApiKeyBtn.addEventListener('click', saveApiKey);
	checkReviewsBtn.addEventListener('click', checkReviews);
	addSiteBtn.addEventListener('click', addBlockedSite);
	unlockBtn.addEventListener('click', toggleLock);

	newSiteInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter' && isUnlocked) addBlockedSite();
	});

	passwordInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') toggleLock();
	});

	// Connect to background script
	connectToBackground();

	// Load initial data
	await loadData();

	// Set initial lock state
	updateLockDisplay();

	// Add debug button
	const debugBtn = document.createElement('button');
	debugBtn.textContent = '🐛 Debug Current Tab';
	debugBtn.className = 'primary-button';
	debugBtn.style.marginTop = '10px';
	debugBtn.style.fontSize = '12px';
	debugBtn.addEventListener('click', showDebugInfo);
	document.querySelector('.container').appendChild(debugBtn);
});

// Connect to background script for real-time updates
function connectToBackground() {
	port = chrome.runtime.connect({ name: 'popup' });

	port.onMessage.addListener((message) => {
		switch (message.type) {
			case 'timerUpdate':
				if (message.isActive) {
					updateTimeDisplay(message.remainingTime);
					updateTimerStatus(true, message.hostname);
				} else {
					updateTimerStatus(false);
				}
				break;

			case 'statusUpdate':
				updateTimerStatus(message.timerActive, message.hostname);
				updateTimeDisplay(message.remainingTime);
				break;

			case 'timeUpdated':
				updateTimeDisplay(message.newTime);
				if (message.earned > 0) {
					showStatus(`🎉 Earned ${formatDuration(message.earned)} from ${message.completedReviews} completed reviews!`, 'success');
				}
				if (message.spent > 0) {
					updateTimerStatus(false);
					showStatus(`⏰ Spent ${formatDuration(message.spent)} browsing ${message.hostname}`, 'info');
				}
				break;
		}
	});

	port.onDisconnect.addListener(() => {
		console.log('Disconnected from background script');
		// Try to reconnect after a short delay
		setTimeout(connectToBackground, 1000);
	});
}

// Toggle lock/unlock for blocked sites
function toggleLock() {
	const password = passwordInput.value.trim();

	if (!isUnlocked && password === BLOCK_PASSWORD) {
		isUnlocked = true;
		blockedSitesControls.classList.remove('controls-hidden');
		lockedMessage.style.display = 'none';
		passwordInput.value = '';
		unlockBtn.textContent = 'Lock';
		passwordInput.value = '';
		passwordInput.placeholder = 'Unlocked ✓';
		updateLockDisplay();
		showStatus('Blocked sites unlocked for modification', 'success');
	} else if (isUnlocked) {
		isUnlocked = false;
		blockedSitesControls.classList.add('controls-hidden');
		lockedMessage.style.display = '';
		unlockBtn.textContent = 'Unlock';
		passwordInput.placeholder = 'Enter wanikani to modify';
		updateLockDisplay();
		showStatus('Blocked sites locked', 'info');
	} else {
		showStatus('Incorrect password', 'error');
	}
}

// Update the display based on lock state
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

// Load data from storage and update UI
async function loadData() {
	try {
		// Get status from background script
		const response = await chrome.runtime.sendMessage({ type: 'getStatus' });

		// Update time display
		updateTimeDisplay(response.internetTime);

		// Update review count display
		updateReviewCount(response.currentReviewCount);

		// Update timer status
		updateTimerStatus(response.timerActive, response.activeTab);

		// Load API key status
		if (response.hasApiKey) {
			apiKeyInput.placeholder = 'API key saved ✓';
			checkReviewsBtn.disabled = false;
		}

		// Store blocked sites for later use
		currentBlockedSites = response.blockedSites || [];

		// Only display if unlocked
		if (isUnlocked) {
			displayBlockedSites(currentBlockedSites);
		}

	} catch (error) {
		console.error('Error loading data:', error);
		showStatus('Error loading extension data', 'error');
	}
}

// Update time display with proper formatting
function updateTimeDisplay(timeInSeconds) {
	if (timeInSeconds === null || timeInSeconds === undefined) return;

	const minutes = Math.floor(timeInSeconds / 60);
	const seconds = timeInSeconds % 60;

	timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

	// Change color based on time remaining
	if (timeInSeconds <= 0) {
		timeDisplay.style.color = '#ff6b6b';
	} else if (timeInSeconds <= 300) { // 5 minutes
		timeDisplay.style.color = '#ffa726';
	} else {
		timeDisplay.style.color = 'white';
	}
}

// Update review count display
function updateReviewCount(count) {
	reviewCountDisplay.textContent = `Reviews Available: ${count || 0}`;
}

// Update timer status display
function updateTimerStatus(active, hostname = null) {
	isTimerActive = active;
	if (active && hostname && hostname !== 'none') {
		timerText.textContent = `⏰ Timer active on ${hostname}`;
		timerStatusDiv.className = 'timer-status active';
	} else {
		timerText.textContent = 'Timer inactive';
		timerStatusDiv.className = 'timer-status inactive';
	}
}

// Save API key
async function saveApiKey() {
	const apiKey = apiKeyInput.value.trim();

	if (!apiKey) {
		showStatus('Please enter a valid API key', 'error');
		return;
	}

	try {
		// Test API key by making a request
		const response = await fetch('https://api.wanikani.com/v2/user', {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Wanikani-Revision': '20170710'
			}
		});

		if (!response.ok) {
			throw new Error('Invalid API key');
		}

		// Save API key
		await chrome.storage.local.set({ apiKey: apiKey });

		// Clear input and update UI
		apiKeyInput.value = '';
		apiKeyInput.placeholder = 'API key saved ✓';
		checkReviewsBtn.disabled = false;

		showStatus('API key saved successfully!', 'success');

	} catch (error) {
		console.error('Error saving API key:', error);
		showStatus('Invalid API key. Please check and try again.', 'error');
	}
}

// Check reviews manually
async function checkReviews() {
	checkReviewsBtn.disabled = true;
	checkReviewsBtn.textContent = '⏳ Checking...';

	try {
		const response = await chrome.runtime.sendMessage({ type: 'checkReviews' });

		if (response.success) {
			if (response.earned > 0) {
				showStatus(`🎉 Completed ${response.completedReviews} reviews! Earned ${formatDuration(response.earned)}`, 'success');
			} else {
				showStatus('Reviews checked! No new completed reviews found.', 'info');
			}
			await loadData(); // Refresh display
		} else {
			throw new Error(response.error);
		}

	} catch (error) {
		console.error('Error checking reviews:', error);
		showStatus(`Error checking reviews: ${error.message}`, 'error');
	} finally {
		checkReviewsBtn.disabled = false;
		checkReviewsBtn.textContent = '📚 Check WaniKani Reviews';
	}
}

// Add blocked site
async function addBlockedSite() {
	if (!isUnlocked) {
		showStatus('Please unlock to modify blocked sites', 'error');
		return;
	}

	const site = newSiteInput.value.trim().toLowerCase();

	if (!site) {
		showStatus('Please enter a website URL', 'error');
		return;
	}

	// Remove protocol and www if present
	const cleanSite = site.replace(/^https?:\/\//, '').replace(/^www\./, '');

	try {
		const data = await chrome.storage.local.get(['blockedSites']);
		const blockedSites = data.blockedSites || [];

		if (blockedSites.includes(cleanSite)) {
			showStatus('Site already in blocked list', 'error');
			return;
		}

		blockedSites.push(cleanSite);
		await chrome.storage.local.set({ blockedSites: blockedSites });

		newSiteInput.value = '';
		currentBlockedSites = blockedSites;
		displayBlockedSites(currentBlockedSites);
		showStatus(`Added ${cleanSite} to blocked list`, 'success');

	} catch (error) {
		console.error('Error adding blocked site:', error);
		showStatus('Error adding site to block list', 'error');
	}
}

// Remove blocked site
async function removeBlockedSite(site) {
	if (!isUnlocked) {
		showStatus('Please unlock to modify blocked sites', 'error');
		return;
	}

	try {
		const data = await chrome.storage.local.get(['blockedSites']);
		const blockedSites = data.blockedSites || [];

		const updatedSites = blockedSites.filter(s => s !== site);
		await chrome.storage.local.set({ blockedSites: updatedSites });

		currentBlockedSites = updatedSites;
		displayBlockedSites(currentBlockedSites);
		showStatus(`Removed ${site} from blocked list`, 'info');

	} catch (error) {
		console.error('Error removing blocked site:', error);
		showStatus('Error removing site from block list', 'error');
	}
}

// Display blocked sites list
function displayBlockedSites(sites) {
	// Only display if unlocked
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

// Debug function to show current tab info
async function showDebugInfo() {
	try {
		const response = await chrome.runtime.sendMessage({ type: 'getCurrentTab' });
		if (response.error) {
			showStatus(`Debug: ${response.error}`, 'info');
		} else {
			const debugMsg = `Current: ${response.hostname}\n` +
				`Blocked: ${response.isBlocked ? 'YES' : 'NO'}\n` +
				`Matched: ${response.matchedSite || 'none'}\n` +
				`Timer: ${response.timerActive ? 'ACTIVE' : 'inactive'}`;
			showStatus(debugMsg, 'info');
		}
	} catch (error) {
		showStatus(`Debug error: ${error.message}`, 'error');
	}
}

// Converts seconds to a human-readable format (e.g., '5 minutes', '1 minute 30 seconds')
function formatDuration(seconds) {
	if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (secs === 0) return `${mins} minute${mins === 1 ? '' : 's'}`;
	return `${mins} minute${mins === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'}`;
}

// Show status message
function showStatus(message, type) {
	statusMessage.textContent = message;
	statusMessage.className = `status-message ${type}`;

	// Auto-hide after 4 seconds
	setTimeout(() => {
		statusMessage.style.display = 'none';
	}, 4000);
}

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
		showStatus('Review history exported!', 'success');
	} catch (error) {
		console.error('Export failed:', error);
		showStatus('Failed to export review history', 'error');
	}
}
