const statsEngine = require('./stats_engine');
const oddsScraper = require('./odds_scraper');

/**
 * Normalize name for comparison
 * e.g. "J. Medek" -> "medek", "Medek Josef" -> "medek josef"
 */
function normalizeName(name) {
    return name.toLowerCase()
        .replace(/\./g, '') // Remove dots
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}

/**
 * Fuzzy match Tippmix name to Stats name
 * @param {string} tippmixName 
 * @param {Array} allPlayers List of player objects from stats
 */
function matchPlayer(tippmixName, allPlayers) {
    const normTippmix = normalizeName(tippmixName);
    const parts = normTippmix.split(' ').filter(p => p.length > 1); // Ignore single chars like "J"

    let bestMatch = null;
    let maxScore = 0;

    Object.values(allPlayers).forEach(player => {
        const normStats = normalizeName(player.name);
        let score = 0;

        // Check if parts of Tippmix name exist in Stats name
        parts.forEach(part => {
            if (normStats.includes(part)) {
                score += part.length;
            }
        });

        if (score > maxScore) {
            maxScore = score;
            bestMatch = player;
        }
    });

    // Threshold: at least 3 chars matched (to avoid random 2-letter matches)
    if (maxScore >= 3) {
        return bestMatch;
    }
    return null;
}

/**
 * Calculate Value Score
 * @param {Object} p1Stats 
 * @param {Object} p2Stats 
 * @param {Object} odds 
 */
function calculateValue(p1Stats, p2Stats, odds) {
    const analysis = {
        isValue: false,
        reason: [],
        score: 0
    };

    if (!p1Stats || !p2Stats || !odds) return analysis;

    // 1. Rating Difference
    const ratingDiff = p1Stats.rating - p2Stats.rating;

    // 2. H2H
    const h2h = statsEngine.getH2H(p1Stats.id, p2Stats.id);
    const p1H2HWins = h2h.p1Wins;
    const p2H2HWins = h2h.p2Wins;

    // Logic:
    // If P1 is favorite by Rating AND H2H, check if Odds on P1 are good

    // Scenario A: P1 is better
    if (ratingDiff > 50 && p1H2HWins >= p2H2HWins) {
        if (odds.H >= 1.5) { // Tippmix H is usually first player
            analysis.isValue = true;
            analysis.reason.push(`P1 Stronger (Rating +${ratingDiff}, H2H ${p1H2HWins}-${p2H2HWins}) & Odds ${odds.H} >= 1.5`);
            analysis.score += 10;
        }
    }

    // Scenario B: P2 is better
    if (ratingDiff < -50 && p2H2HWins >= p1H2HWins) {
        if (odds.V >= 1.5) { // Tippmix V is usually second player
            analysis.isValue = true;
            analysis.reason.push(`P2 Stronger (Rating ${-ratingDiff}, H2H ${p2H2HWins}-${p1H2HWins}) & Odds ${odds.V} >= 1.5`);
            analysis.score += 10;
        }
    }

    return analysis;
}

/**
 * Analyze a list of matches and attach stats/value info
 * @param {Array} matches List of matches from odds_scraper
 */
async function analyzeMatches(matches) {
    // Load players data
    const fs = require('fs');
    let playersData = {};
    if (fs.existsSync('players.json')) {
        playersData = JSON.parse(fs.readFileSync('players.json', 'utf8'));
    }

    const analyzedMatches = [];

    for (const match of matches) {
        // Clone match
        const analyzedMatch = { ...match };

        // Match Players
        const p1 = matchPlayer(match.playerA, playersData);
        const p2 = matchPlayer(match.playerB, playersData);

        if (p1 && p2) {
            // Calculate Value
            const analysis = calculateValue(p1, p2, match.odds);

            analyzedMatch.analysis = analysis;
            analyzedMatch.stats = {
                p1: { name: p1.name, rating: p1.rating, id: p1.id },
                p2: { name: p2.name, rating: p2.rating, id: p2.id }
            };
        } else {
            analyzedMatch.analysis = { isValue: false, reason: [], score: 0 };
        }

        analyzedMatches.push(analyzedMatch);
    }

    return analyzedMatches;
}

async function findValueBets() {
    console.log('Starting Value Analysis...');

    // 1. Get Live Odds
    const liveMatches = await oddsScraper.scrapeOdds();
    console.log(`Scraped ${liveMatches.length} matches from Tippmix.`);

    // 2. Analyze
    const analyzed = await analyzeMatches(liveMatches);

    // 3. Filter for Value Bets
    return analyzed.filter(m => m.analysis.isValue).map(m => ({
        match: `${m.playerA} vs ${m.playerB}`,
        time: m.time,
        odds: m.odds,
        analysis: m.analysis,
        stats: m.stats
    }));
}

module.exports = { findValueBets, analyzeMatches, matchPlayer };
