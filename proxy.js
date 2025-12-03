const express = require('express');
const cors = require('cors');
const oddsScraper = require('./odds_scraper');
const valueEngine = require('./value_engine');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('.')); // Serve static files from current directory

app.get('/api/matches', async (req, res) => {
    console.log('Received request for matches...');

    // TIME WINDOW CHECK (07:00 - 20:00)
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 7 || currentHour >= 20) {
        console.log(`Outside active hours (07:00-20:00). Current hour: ${currentHour}`);
        return res.json({ success: true, matches: [], source: 'off-hours' });
    }

    // CACHE CHECK
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    if (global.cachedMatches && (Date.now() - global.lastFetchTime < CACHE_DURATION)) {
        console.log('Serving from cache.');
        return res.json({ success: true, matches: global.cachedMatches, source: 'cache' });
    }



    try {
        console.log('Fetching matches via odds_scraper...');
        const matches = await oddsScraper.scrapeOdds();
        console.log(`Found ${matches.length} matches from Tippmix.`);

        console.log('Analyzing matches...');
        const analyzedMatches = await valueEngine.analyzeMatches(matches);

        // UPDATE CACHE
        global.cachedMatches = analyzedMatches;
        global.lastFetchTime = Date.now();

        res.json({ success: true, matches: analyzedMatches, source: 'live' });

    } catch (error) {
        console.error('Scraping failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
