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