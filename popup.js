// KaniTime Popup Script - Handles UI interactions and messaging

// DOM elements
let timeDisplay, reviewCountDisplay, checkReviewsBtn;
let timerStatusDiv, timerText;

// State
let isTimerActive = false;
let port = null;

// Initialize popup when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
	// Get DOM elements
	timeDisplay = document.getElementById('timeRemaining');
	reviewCountDisplay = document.getElementById('reviewCount');
	checkReviewsBtn = document.getElementById('checkReviews');
	timerStatusDiv = document.getElementById('timerStatus');
	timerText = document.getElementById('timerText');
	const exportReviewsBtn = document.getElementById('exportReviewsBtn');
	if (exportReviewsBtn) {
		exportReviewsBtn.addEventListener('click', exportReviews);
	}

	// Set up event listeners
	checkReviewsBtn.addEventListener('click', checkReviews);

	checkReviewsBtn.addEventListener('keypress', (e) => {
		if (e.key === 'Enter' && isTimerActive) checkReviews();
	});

	// Connect to background script
	connectToBackground();

	// Load initial data
	await loadData();

	// Set initial lock state
	updateTimerStatus(false); // No longer relevant

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

// Restore loadData for popup functionality
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

	} catch (error) {
		console.error('Error loading data:', error);
		showStatus('Error loading extension data', 'error');
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
	const statusMessage = document.getElementById('statusMessage');
	if (statusMessage) {
		statusMessage.textContent = message;
		statusMessage.className = `status-message ${type}`;

		// Auto-hide after 4 seconds
		setTimeout(() => {
			statusMessage.style.display = 'none';
		}, 4000);
	}
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
