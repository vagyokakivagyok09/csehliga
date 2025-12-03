window.UI = {
    init: function () {
        this.renderDashboard();
        this.renderBetList();
        this.setupModal();
    },

    renderDashboard: function () {
        const bets = window.Storage.getBets();
        let totalProfit = 0;
        let wins = 0;
        let totalStaked = 0;

        bets.forEach(bet => {
            if (bet.status === 'won') {
                const profit = (bet.stake * bet.odds) - bet.stake;
                totalProfit += profit;
                wins++;
                totalStaked += bet.stake;
            } else if (bet.status === 'lost') {
                totalProfit -= bet.stake;
                totalStaked += bet.stake;
            }
        });

        const winRate = bets.length > 0 ? ((wins / bets.filter(b => b.status !== 'pending').length) * 100) || 0 : 0;
        const roi = totalStaked > 0 ? ((totalProfit / totalStaked) * 100) : 0;

        document.getElementById('totalProfit').textContent = `${totalProfit.toLocaleString()} Ft`;
        document.getElementById('totalProfit').style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
        document.getElementById('roi').textContent = `${roi.toFixed(1)}%`;
        document.getElementById('winRate').textContent = `${winRate.toFixed(1)}%`;
    },

    renderBetList: function () {
        const bets = window.Storage.getBets();
        const tbody = document.getElementById('fullBetList');
        tbody.innerHTML = '';

        bets.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(bet => {
            const tr = document.createElement('tr');
            let profit = 0;
            if (bet.status === 'won') profit = (bet.stake * bet.odds) - bet.stake;
            if (bet.status === 'lost') profit = -bet.stake;

            tr.innerHTML = `
                <td>${new Date(bet.date).toLocaleDateString()}</td>
                <td>${bet.event}</td>
                <td>${bet.selection}</td>
                <td>${bet.odds}</td>
                <td>${bet.stake}</td>
                <td class="status-${bet.status}">${this.translateStatus(bet.status)}</td>
                <td style="color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${profit}</td>
                <td><button onclick="window.Storage.deleteBet(${bet.id}); window.UI.init();" style="background:none;border:none;cursor:pointer;color:var(--danger)">🗑️</button></td>
            `;
            tbody.appendChild(tr);
        });
    },

    translateStatus: function (status) {
        const map = { 'pending': 'Függőben', 'won': 'Nyertes', 'lost': 'Vesztes', 'void': 'Visszajár' };
        return map[status] || status;
    },

    setupModal: function () {
        const modal = document.getElementById('betModal');
        const btn = document.getElementById('addBetBtn');
        const close = document.querySelector('.close-modal');
        const form = document.getElementById('betForm');

        btn.onclick = () => modal.classList.remove('hidden');
        close.onclick = () => modal.classList.add('hidden');
        window.onclick = (e) => { if (e.target == modal) modal.classList.add('hidden'); };

        form.onsubmit = (e) => {
            e.preventDefault();
            const newBet = {
                id: Date.now(),
                date: new Date().toISOString(),
                event: document.getElementById('betEvent').value,
                selection: document.getElementById('betSelection').value,
                odds: parseFloat(document.getElementById('betOdds').value),
                stake: parseFloat(document.getElementById('betStake').value),
                status: document.getElementById('betStatus').value
            };
            window.Storage.saveBet(newBet);
            modal.classList.add('hidden');
            form.reset();
            this.init();
        };
    }
};
