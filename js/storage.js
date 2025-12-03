window.Storage = {
    getBets: function () {
        const bets = localStorage.getItem('sportsBets');
        return bets ? JSON.parse(bets) : [];
    },

    saveBet: function (bet) {
        const bets = this.getBets();
        bets.push(bet);
        localStorage.setItem('sportsBets', JSON.stringify(bets));
    },

    deleteBet: function (id) {
        let bets = this.getBets();
        bets = bets.filter(bet => bet.id !== id);
        localStorage.setItem('sportsBets', JSON.stringify(bets));
    }
};
