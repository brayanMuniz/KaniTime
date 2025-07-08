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
}); 