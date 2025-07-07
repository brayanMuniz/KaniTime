// Handles blocking, API calls, and time tracking

const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';
const TIME_PER_REVIEW = 30; // seconds
const CHECK_INTERVAL = 5; // minutes
const TIMER_UPDATE_INTERVAL = 100; // milliseconds (10 times per second for smooth updates)
const BLOCKING_CHECK_INTERVAL = 0.083; // ~5 seconds in minutes

let activeTabData = {
	tabId: null,
	startTime: null,
	isBlocked: false,
	hostname: null,
	totalTimeSpent: 0
};

let timerInterval = null;
let popupPorts = new Set();

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
	console.log('KaniTime installed');

	// Initialize storage with default values
	const data = await chrome.storage.local.get([
		'apiKey', 'blockedSites', 'internetTime', 'lastReviewCount', 'currentReviewCount', 'reviewHistory'
	]);

	if (!data.blockedSites) {
		await chrome.storage.local.set({ blockedSites: [] });
	}
	if (!data.internetTime) {
		await chrome.storage.local.set({ internetTime: 0 });
	}
	if (!data.lastReviewCount) {
		await chrome.storage.local.set({ lastReviewCount: 0 });
	}
	if (!data.currentReviewCount) {
		await chrome.storage.local.set({ currentReviewCount: 0 });
	}
	if (!data.reviewHistory) {
		await chrome.storage.local.set({ reviewHistory: {} });
	}

	// Set up periodic review checks
	chrome.alarms.create('checkReviews', { periodInMinutes: CHECK_INTERVAL });

	// Set up periodic blocking checks
	chrome.alarms.create('blockingCheck', { periodInMinutes: BLOCKING_CHECK_INTERVAL });
});

// Handle popup connections
chrome.runtime.onConnect.addListener((port) => {
	if (port.name === 'popup') {
		popupPorts.add(port);
		console.log('Popup connected');

		port.onDisconnect.addListener(() => {
			popupPorts.delete(port);
			console.log('Popup disconnected');
		});
	}
});

// Send message to all connected popups
function sendToPopup(type, data) {
	popupPorts.forEach(port => {
		try {
			port.postMessage({ type, ...data });
		} catch (error) {
			popupPorts.delete(port);
		}
	});
}

function isHostnameBlocked(hostname, blockedSites) {
	if (!hostname || !blockedSites) return { blocked: false, matchedSite: null, matchType: null };

	const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');

	console.log(`🔍 BLOCKING CHECK: hostname="${hostname}" (clean="${cleanHostname}")`);
	console.log(`📋 Blocked sites:`, blockedSites);

	for (const blockedSite of blockedSites) {
		const cleanBlockedSite = blockedSite.toLowerCase().replace(/^www\./, '');

		// Exact match
		if (cleanHostname === cleanBlockedSite) {
			console.log(`✅ EXACT MATCH: ${cleanHostname} === ${cleanBlockedSite}`);
			return { blocked: true, matchedSite: blockedSite, matchType: 'exact' };
		}

		// Only block simple subdomains (not service subdomains)
		if (cleanHostname.endsWith('.' + cleanBlockedSite)) {
			// Skip known service subdomains
			const serviceSubdomains = ['music', 'tv', 'studio', 'mail', 'drive', 'docs', 'maps'];
			const subdomain = cleanHostname.replace('.' + cleanBlockedSite, '');

			if (!serviceSubdomains.includes(subdomain)) {
				console.log(`✅ SUBDOMAIN MATCH: ${cleanHostname} ends with .${cleanBlockedSite}`);
				return { blocked: true, matchedSite: blockedSite, matchType: 'subdomain' };
			} else {
				console.log(`⏭️ SKIPPED SERVICE SUBDOMAIN: ${subdomain}.${cleanBlockedSite}`);
			}
		}
	}

	console.log(`❌ NO MATCH FOUND for ${hostname}`);
	return { blocked: false, matchedSite: null, matchType: null };
}

// Get STORED time only (for blocking decisions)
async function getStoredRemainingTime() {
	const { internetTime } = await chrome.storage.local.get(['internetTime']);
	const time = internetTime || 0;
	console.log(`💾 STORED TIME: ${time}s`);
	return time;
}

// Get current remaining time with real-time calculation (for display)
async function getCurrentRemainingTime() {
	const { internetTime } = await chrome.storage.local.get(['internetTime']);
	const baseTime = internetTime || 0;

	// If no active timer, just return stored time
	if (!activeTabData.isBlocked || !activeTabData.startTime) {
		return baseTime;
	}

	// If timer is active, subtract current session time
	const currentTime = Date.now();
	const sessionTimeSpent = Math.floor((currentTime - activeTabData.startTime) / 1000);
	const totalTimeSpent = activeTabData.totalTimeSpent + sessionTimeSpent;
	return Math.max(0, baseTime - totalTimeSpent);
}

// Check if a URL should be blocked
async function shouldBlockUrl(url) {
	try {
		const { blockedSites } = await chrome.storage.local.get(['blockedSites']);
		const storedTime = await getStoredRemainingTime();

		const urlObj = new URL(url);
		const hostname = urlObj.hostname;
		const matchResult = isHostnameBlocked(hostname, blockedSites);

		const shouldBlock = matchResult.blocked && storedTime <= 0;

		console.log(`🚦 BLOCK CHECK: ${url}`);
		console.log(`   Hostname: ${hostname}`);
		console.log(`   Blocked: ${matchResult.blocked} (matched: ${matchResult.matchedSite})`);
		console.log(`   Stored time: ${storedTime}s`);
		console.log(`   SHOULD BLOCK: ${shouldBlock}`);

		return shouldBlock;
	} catch (error) {
		console.error('Error in shouldBlockUrl:', error);
		return false;
	}
}

// Check and block current active tab
async function checkAndBlockCurrentTab() {
	try {
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
		if (tabs.length > 0) {
			const tab = tabs[0];
			if (await shouldBlockUrl(tab.url)) {
				const blockedPageUrl = chrome.runtime.getURL('blocked_page.html');
				console.log(`🚫 BLOCKING TAB: ${tab.url} -> ${blockedPageUrl}`);
				chrome.tabs.update(tab.id, { url: blockedPageUrl });
				return true;
			}
		}
		return false;
	} catch (error) {
		console.error('Error checking/blocking tab:', error);
		return false;
	}
}

// Start the real-time timer updates
function startTimerUpdates() {
	if (timerInterval) {
		clearInterval(timerInterval);
	}

	console.log('🟢 Starting real-time timer updates');
	timerInterval = setInterval(async () => {
		if (!activeTabData.isBlocked || !activeTabData.startTime) {
			stopTimerUpdates();
			return;
		}

		const remainingTime = await getCurrentRemainingTime();
		const currentTime = Date.now();
		const sessionTimeSpent = Math.floor((currentTime - activeTabData.startTime) / 1000);

		// Send real-time update to popup
		sendToPopup('timerUpdate', {
			remainingTime: remainingTime,
			timeSpent: sessionTimeSpent,
			hostname: activeTabData.hostname,
			isActive: true
		});

		// If time runs out, stop the timer and redirect
		if (remainingTime <= 0) {
			console.log('⏰ Time expired, stopping timer and redirecting');
			await stopTimer();

			// Force redirect current tab
			await checkAndBlockCurrentTab();
		}
	}, TIMER_UPDATE_INTERVAL);
}

// Stop the real-time timer updates
function stopTimerUpdates() {
	if (timerInterval) {
		console.log('🔴 Stopping real-time timer updates');
		clearInterval(timerInterval);
		timerInterval = null;

		// Send final update to popup
		sendToPopup('timerUpdate', {
			isActive: false
		});
	}
}

// Handle tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
	console.log(`🔄 Tab activated: ${activeInfo.tabId}`);
	await handleTabChange(activeInfo.tabId);
});

// Handle tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	// Check on any URL change or when loading completes
	if ((changeInfo.url || changeInfo.status === 'complete') && tab.active) {
		console.log(`🔄 Tab updated: ${tabId}, URL: ${tab.url}, Status: ${changeInfo.status}`);
		await handleTabChange(tabId);
	}
});

// Handle tab changes and time tracking with AGGRESSIVE BLOCKING
async function handleTabChange(tabId) {
	try {
		// Stop current timer if active and save time
		if (activeTabData.tabId && activeTabData.startTime && activeTabData.isBlocked) {
			console.log(`⏹️ Stopping timer for previous tab`);
			await stopTimer();
		}

		// Get current tab info
		const tab = await chrome.tabs.get(tabId);
		if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
			console.log(`⏭️ Skipping system URL: ${tab.url}`);

			// Reset active tab data
			activeTabData = {
				tabId: null,
				startTime: null,
				isBlocked: false,
				hostname: null,
				totalTimeSpent: 0
			};

			const storedTime = await getStoredRemainingTime();
			sendToPopup('statusUpdate', {
				timerActive: false,
				hostname: 'none',
				remainingTime: storedTime
			});
			return;
		}

		// IMMEDIATE BLOCKING CHECK
		if (await shouldBlockUrl(tab.url)) {
			console.log(`🚫 IMMEDIATE BLOCK: Redirecting ${tab.url}`);
			const blockedPageUrl = chrome.runtime.getURL('blocked_page.html');
			chrome.tabs.update(tabId, { url: blockedPageUrl });
			return;
		}

		const { blockedSites } = await chrome.storage.local.get(['blockedSites']);
		const storedTime = await getStoredRemainingTime();

		const url = new URL(tab.url);
		const hostname = url.hostname;

		console.log(`📍 Current tab: ${hostname}${url.pathname} (Stored time: ${storedTime}s)`);

		const matchResult = isHostnameBlocked(hostname, blockedSites);

		if (matchResult.blocked && storedTime > 0) {
			// Start timer for this blocked site
			activeTabData = {
				tabId: tabId,
				startTime: Date.now(),
				isBlocked: true,
				hostname: hostname,
				totalTimeSpent: 0
			};

			console.log(`▶️ STARTED TIMER for ${hostname} (matched: ${matchResult.matchedSite})`);

			// Send status update to popup
			sendToPopup('statusUpdate', {
				timerActive: true,
				hostname: hostname,
				remainingTime: storedTime
			});

			// Start real-time updates
			startTimerUpdates();
		} else {
			console.log(`✅ ${hostname} is not blocked or no blocking needed`);

			// Reset active tab data for non-blocked sites
			activeTabData = {
				tabId: null,
				startTime: null,
				isBlocked: false,
				hostname: null,
				totalTimeSpent: 0
			};

			sendToPopup('statusUpdate', {
				timerActive: false,
				hostname: hostname,
				remainingTime: storedTime
			});
		}
	} catch (error) {
		console.error('❌ Error handling tab change:', error);
	}
}

// Stop timer and deduct time
async function stopTimer() {
	if (!activeTabData.startTime || !activeTabData.isBlocked) {
		return;
	}

	const sessionTimeSpent = Math.floor((Date.now() - activeTabData.startTime) / 1000);
	const totalTimeSpent = activeTabData.totalTimeSpent + sessionTimeSpent;

	const { internetTime } = await chrome.storage.local.get(['internetTime']);
	const newTime = Math.max(0, internetTime - totalTimeSpent);

	// CRITICAL: Always update stored time
	await chrome.storage.local.set({ internetTime: newTime });

	console.log(`⏱️ TIMER STOPPED: Spent ${totalTimeSpent}s on ${activeTabData.hostname}, NEW STORED TIME: ${newTime}s`);

	// Stop real-time updates
	stopTimerUpdates();

	// Send update to popup
	sendToPopup('timeUpdated', {
		newTime: newTime,
		spent: totalTimeSpent,
		hostname: activeTabData.hostname
	});

	// Reset active tab data
	activeTabData = {
		tabId: null,
		startTime: null,
		isBlocked: false,
		hostname: null,
		totalTimeSpent: 0
	};
}

// Periodic review and blocking checks
chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === 'checkReviews') {
		console.log('⏰ Periodic review check triggered');
		await checkWaniKaniReviews();
	} else if (alarm.name === 'blockingCheck') {
		console.log('🔍 Periodic blocking check triggered');
		await checkAndBlockCurrentTab();
	}
});

// Check WaniKani reviews and award time
async function checkWaniKaniReviews() {
	try {
		const { apiKey, lastReviewCount, reviewHistory } = await chrome.storage.local.get([
			'apiKey', 'lastReviewCount', 'reviewHistory'
		]);

		if (!apiKey) {
			console.log('🔑 No API key set, skipping review check');
			return { success: false, error: 'No API key set' };
		}

		console.log('📚 Checking WaniKani reviews...');

		// Fetch current reviews available
		const response = await fetch(`${WANIKANI_API_BASE}/assignments?immediately_available_for_review`, {
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Wanikani-Revision': '20170710'
			}
		});

		console.log(`📡 API Response status: ${response.status}`);

		if (!response.ok) {
			let errorMessage = `HTTP ${response.status}`;
			try {
				const errorData = await response.json();
				if (errorData.error) {
					errorMessage = errorData.error;
				}
			} catch (e) {
				// If JSON parsing fails, use status text
				errorMessage = response.statusText || errorMessage;
			}

			console.error('❌ API request failed:', response.status, errorMessage);

			// Handle specific error codes
			if (response.status === 422) {
				throw new Error('Invalid API request. Please check your API key.');
			} else if (response.status === 401) {
				throw new Error('Invalid API key. Please update your key.');
			} else {
				throw new Error(`API request failed: ${errorMessage}`);
			}
		}

		const data = await response.json();
		const currentReviewCount = data.total_count;

		console.log(`📊 Reviews: Current=${currentReviewCount}, Last=${lastReviewCount}`);

		// Store current review count for display
		await chrome.storage.local.set({ currentReviewCount: currentReviewCount });

		// --- Daily Review Tracking Logic ---
		const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		let history = reviewHistory || {};
		let baselineSet = false;
		if (!history[today]) {
			// First check of the day: set baseline and reset completed
			console.log(`[reviewHistory] Setting baseline for ${today}: baseline=${currentReviewCount}`);
			history[today] = {
				baseline: currentReviewCount,
				completed: 0
			};
			baselineSet = true;
		}

		// Calculate completed reviews (decrease in available count)
		if (lastReviewCount > 0 && currentReviewCount < lastReviewCount) {
			const completedReviews = lastReviewCount - currentReviewCount;
			const timeEarned = completedReviews * TIME_PER_REVIEW;

			const { internetTime } = await chrome.storage.local.get(['internetTime']);
			const newTime = internetTime + timeEarned;

			// Update daily completed count
			history[today].completed += completedReviews;
			console.log(`[reviewHistory] Incremented completed for ${today}: +${completedReviews}, total now ${history[today].completed}`);

			await chrome.storage.local.set({
				internetTime: newTime,
				lastReviewCount: currentReviewCount,
				reviewHistory: history
			});
			console.log(`[reviewHistory] Wrote to storage:`, history);

			// Send update to popup
			sendToPopup('timeUpdated', {
				newTime: newTime,
				earned: timeEarned,
				completedReviews: completedReviews
			});

			return { success: true, earned: timeEarned, completedReviews: completedReviews };
		} else {
			// Always persist today's baseline/history, even if no reviews completed
			await chrome.storage.local.set({ lastReviewCount: currentReviewCount, reviewHistory: history });
			if (baselineSet) {
				console.log(`[reviewHistory] Baseline set and written for ${today}:`, history[today]);
			} else {
				console.log(`[reviewHistory] No new completed reviews. Baseline/history written:`, history);
			}
			return { success: true, earned: 0, completedReviews: 0 };
		}

	} catch (error) {
		console.error('❌ Error checking WaniKani reviews:', error);
		return { success: false, error: error.message };
	}
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	switch (message.type) {
		case 'checkReviews':
			console.log('📚 Manual review check requested');
			checkWaniKaniReviews().then(result => {
				sendResponse(result);
			}).catch(error => {
				sendResponse({ success: false, error: error.message });
			});
			return true;

		case 'getStatus':
			getCurrentRemainingTime().then(remainingTime => {
				chrome.storage.local.get([
					'blockedSites', 'apiKey', 'currentReviewCount'
				]).then(data => {
					sendResponse({
						internetTime: remainingTime,
						blockedSites: data.blockedSites || [],
						hasApiKey: !!data.apiKey,
						currentReviewCount: data.currentReviewCount || 0,
						activeTab: activeTabData.hostname || 'none',
						timerActive: activeTabData.isBlocked
					});
				});
			});
			return true;

		case 'forceBlock':
			checkAndBlockCurrentTab().then(result => {
				sendResponse({ blocked: result });
			});
			return true;

		case 'getCurrentTab':
			chrome.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
				if (tabs.length > 0) {
					const tab = tabs[0];
					try {
						const url = new URL(tab.url);
						const data = await chrome.storage.local.get(['blockedSites', 'internetTime']);
						const matchResult = isHostnameBlocked(url.hostname, data.blockedSites || []);
						const shouldBlock = await shouldBlockUrl(tab.url);

						sendResponse({
							url: tab.url,
							hostname: url.hostname,
							isBlocked: matchResult.blocked,
							matchedSite: matchResult.matchedSite,
							matchType: matchResult.matchType,
							timerActive: activeTabData.isBlocked && activeTabData.hostname === url.hostname,
							storedTime: data.internetTime || 0,
							shouldBlock: shouldBlock
						});
					} catch (error) {
						sendResponse({ error: error.message });
					}
				} else {
					sendResponse({ error: 'No active tab' });
				}
			});
			return true;

		default:
			sendResponse({ success: false, error: 'Unknown message type' });
	}
});

// Handle window focus changes to pause/resume timer
chrome.windows.onFocusChanged.addListener(async (windowId) => {
	if (windowId === chrome.windows.WINDOW_ID_NONE) {
		console.log('🔄 Browser lost focus, pausing timer');
		if (activeTabData.tabId && activeTabData.startTime && activeTabData.isBlocked) {
			await stopTimer();
		}
	} else {
		console.log('🔄 Browser gained focus, checking for timer restart');
		try {
			const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
			if (tabs.length > 0) {
				await handleTabChange(tabs[0].id);
			}
		} catch (error) {
			console.error('❌ Error handling window focus change:', error);
		}
	}
});
