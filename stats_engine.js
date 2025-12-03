const fs = require('fs');

// Load data
let matchHistory = [];
let playersData = {};

try {
    if (fs.existsSync('match_history.json')) {
        matchHistory = JSON.parse(fs.readFileSync('match_history.json', 'utf8'));
    }
    if (fs.existsSync('players.json')) {
        playersData = JSON.parse(fs.readFileSync('players.json', 'utf8'));
    }
} catch (err) {
    console.error('Error loading data:', err);
}

/**
 * Get player details by ID
 * @param {number|string} playerId 
 * @returns {object|null} Player object or null
 */
function getPlayer(playerId) {
    return playersData[playerId] || null;
}

/**
 * Calculate Head-to-Head (H2H) between two players
 * @param {number|string} p1Id 
 * @param {number|string} p2Id 
 * @returns {object} { p1Wins, p2Wins, totalMatches, matches: [] }
 */
function getH2H(p1Id, p2Id) {
    p1Id = Number(p1Id);
    p2Id = Number(p2Id);

    const matches = matchHistory.filter(m =>
        (m.playerOneId === p1Id && m.playerTwoId === p2Id) ||
        (m.playerOneId === p2Id && m.playerTwoId === p1Id)
    );

    let p1Wins = 0;
    let p2Wins = 0;

    matches.forEach(m => {
        if (m.winnerId === p1Id) p1Wins++;
        else if (m.winnerId === p2Id) p2Wins++;
    });

    return {
        p1Wins,
        p2Wins,
        totalMatches: matches.length,
        matches: matches.sort((a, b) => new Date(b.date) - new Date(a.date)) // Newest first
    };
}

/**
 * Get recent form for a player
 * @param {number|string} playerId 
 * @param {number} lastN Number of matches to return
 * @returns {array} List of match results { result: 'W'|'L', opponentId, opponentName, date, score }
 */
function getForm(playerId, lastN = 5) {
    playerId = Number(playerId);

    // Filter matches involving this player
    const playerMatches = matchHistory.filter(m =>
        m.playerOneId === playerId || m.playerTwoId === playerId
    );

    // Sort by date descending
    playerMatches.sort((a, b) => new Date(b.date) - new Date(a.date));

    const recent = playerMatches.slice(0, lastN);

    return recent.map(m => {
        const isP1 = m.playerOneId === playerId;
        const opponentId = isP1 ? m.playerTwoId : m.playerOneId;
        const opponentName = isP1 ? m.playerTwoName : m.playerOneName;
        const isWinner = m.winnerId === playerId;

        return {
            result: isWinner ? 'W' : 'L',
            opponentId,
            opponentName,
            date: m.date,
            score: isP1 ? `${m.scoreOne}-${m.scoreTwo}` : `${m.scoreTwo}-${m.scoreOne}`
        };
    });
}

module.exports = {
    getPlayer,
    getH2H,
    getForm
};
