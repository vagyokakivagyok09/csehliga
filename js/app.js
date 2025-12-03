document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    init: function () {
        this.cacheDOM();
        this.bindEvents();
        this.loadDashboard();
    },

    cacheDOM: function () {
        this.matchesList = document.getElementById('matchesList');
        this.activeMatchesCount = document.getElementById('activeMatchesCount');
        this.strongSignalsCount = document.getElementById('strongSignalsCount');
        this.refreshBtn = document.getElementById('refreshBtn');
    },

    bindEvents: function () {
        this.refreshBtn.addEventListener('click', () => {
            this.loadDashboard();
        });
    },

    loadDashboard: function () {
        // Show loading state
        this.matchesList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Mérkőzések elemzése...</p>
            </div>
        `;

        // Simulate network delay for realism
        setTimeout(() => {
            const matches = window.DataFetcher.getMatches();
            this.renderMatches(matches);
        }, 800);
    },

    renderMatches: function (matches) {
        this.matchesList.innerHTML = '';
        let strongSignals = 0;

        matches.forEach(match => {
            const isValue = match.analysis && match.analysis.isValue;
            if (isValue) strongSignals++;

            const card = document.createElement('div');
            card.className = `match-card glass ${isValue ? 'value-bet' : ''}`;
            if (isValue) {
                card.style.border = '1px solid #10b981';
                card.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.2)';
            }

            // Value Badge
            let badgesHtml = '';
            if (isValue) {
                badgesHtml += `<span class="badge value" style="background: #10b981; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">VALUE BET 💎</span>`;
            }

            // Stats or Placeholder
            let statsHtml = '';
            if (match.stats) {
                statsHtml = `
                    <div class="match-players">
                        <div class="player">
                            <span class="player-name">${match.stats.p1.name}</span>
                            <span class="player-rating" style="color: #94a3b8; font-size: 0.8rem;">Rating: ${match.stats.p1.rating}</span>
                        </div>
                        <span class="vs">VS</span>
                        <div class="player">
                            <span class="player-name">${match.stats.p2.name}</span>
                            <span class="player-rating" style="color: #94a3b8; font-size: 0.8rem;">Rating: ${match.stats.p2.rating}</span>
                        </div>
                    </div>
                `;
            } else {
                statsHtml = `
                    <div class="match-players">
                        <div class="player"><span class="player-name">${match.playerA}</span></div>
                        <span class="vs">VS</span>
                        <div class="player"><span class="player-name">${match.playerB}</span></div>
                    </div>
                `;
            }

            // Reasoning
            let reasonHtml = '';
            if (isValue && match.analysis.reason) {
                reasonHtml = `
                    <div class="analysis-reason" style="margin-top: 10px; padding: 8px; background: rgba(16, 185, 129, 0.1); border-radius: 4px; font-size: 0.85rem; color: #6ee7b7;">
                        ${match.analysis.reason.join('<br>')}
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="match-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <span class="time" style="color: #fff; font-weight: bold;">${match.time}</span>
                        <span class="league" style="color: #64748b; font-size: 0.8rem; margin-left: 5px;">Liga Pro (CZE)</span>
                    </div>
                    ${badgesHtml}
                </div>
                
                ${statsHtml}

                <div class="odds-section" style="margin-top: 1rem; display: flex; gap: 10px; justify-content: center;">
                    ${match.odds ? Object.entries(match.odds).map(([market, value]) => `
                        <div class="odd-box" style="background: #334155; padding: 5px 10px; border-radius: 4px; text-align: center; min-width: 50px;">
                            <div style="font-size: 0.7rem; color: #94a3b8;">${market}</div>
                            <div style="font-weight: bold; color: #fff;">${value.toFixed(2)}</div>
                        </div>
                    `).join('') : '<div style="color: #64748b; font-size: 0.8rem;">Nincs odds adat</div>'}
                </div>
                
                ${reasonHtml}
            `;

            this.matchesList.appendChild(card);
        });

        // Update Stats
        this.activeMatchesCount.textContent = matches.length;
        this.strongSignalsCount.textContent = strongSignals;
    }
};
