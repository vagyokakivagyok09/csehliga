window.DataFetcher = {
    // Mock Data Generator for Czech Table Tennis (Liga Pro)
    // Used when real stats are missing or for fallback

    init: function () {
        // No initialization needed
    },

    /**
     * Generates a list of matches. 
     * Tries to fetch from local proxy first.
     * @returns {Array} List of match objects
     */
    getMatches: async function () {
        try {
            const response = await fetch('http://localhost:3000/api/matches');
            const data = await response.json();

            if (data.success && data.matches.length > 0) {
                return data.matches.map((m, index) => {
                    // Generate consistent stats based on player name
                    const statsA = this.generatePlayerStats(m.playerA);
                    const statsB = this.generatePlayerStats(m.playerB);
                    const h2h = this.generateH2H(m.playerA, m.playerB);

                    return {
                        id: index,
                        time: m.time,
                        playerA: {
                            name: m.playerA,
                            ...statsA
                        },
                        playerB: {
                            name: m.playerB,
                            ...statsB
                        },
                        odds: m.odds,
                        h2h: h2h
                    };
                });
            } else {
                console.warn('No matches found from proxy or empty list.');
                return []; // Return empty if no real matches found, don't fallback to random mock data to avoid confusion
            }
        } catch (error) {
            console.error('Proxy fetch failed:', error);
            // Fallback to mock data only if connection fails completely (dev mode)
            return this.getMockMatches();
        }
    },

    getMockMatches: function () {
        const matches = [];
        const mockPlayers = ['Novak', 'Kolar', 'Svoboda', 'Dvorak', 'Cerny', 'Prochazka', 'Kucera', 'Vesely'];

        for (let i = 0; i < 5; i++) {
            const playerA = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
            let playerB = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];
            while (playerA === playerB) playerB = mockPlayers[Math.floor(Math.random() * mockPlayers.length)];

            matches.push({
                id: i,
                time: `${10 + i}:00`,
                playerA: { name: playerA, ...this.generatePlayerStats(playerA) },
                playerB: { name: playerB, ...this.generatePlayerStats(playerB) },
                odds: { H: 1.85, V: 1.85 },
                h2h: this.generateH2H(playerA, playerB)
            });
        }
        return matches;
    },

    // Helper to generate consistent stats from a string seed (name)
    _hash: function (str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    },

    generatePlayerStats: function (name) {
        const seed = this._hash(name);
        const rating = 800 + (seed % 400); // 800 - 1200

        // Use seed to determine form
        const formSeed = seed % 100;
        let dailyWins = 0;
        let dailyLosses = 0;

        if (formSeed < 20) { // Flow
            dailyWins = 2 + (seed % 3);
        } else if (formSeed < 40) { // Tilt
            dailyLosses = 2 + (seed % 3);
        } else {
            dailyWins = seed % 3;
            dailyLosses = (seed >> 2) % 3;
        }

        return { rating, dailyWins, dailyLosses };
    },

    generateH2H: function (nameA, nameB) {
        const seed = this._hash(nameA + nameB);
        const totalMatches = 5 + (seed % 15);
        const aWins = seed % (totalMatches + 1);

        return {
            aWins: aWins,
            bWins: totalMatches - aWins,
            totalMatches: totalMatches
        };
    }
};
