const puppeteer = require('puppeteer');
const fs = require('fs');
const cheerio = require('cheerio');

// Player ID to filter for (1078 is profile ID, 1079 seems to be internal ID in matches)
const PLAYER_IDS = [1078, 1079];

(async () => {
    console.log('Launching browser for Stats Scraper...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    try {
        // Load tournaments list
        if (!fs.existsSync('tournaments_list.json')) {
            console.error('tournaments_list.json not found. Run extract_tournament_ids.js first.');
            return;
        }
        const tournaments = JSON.parse(fs.readFileSync('tournaments_list.json', 'utf8'));

        const allMatches = [];
        const playersData = {}; // Map: ID -> { name, rating, image_url }

        for (const tournament of tournaments) {
            console.log(`Processing tournament: ${tournament.name} (${tournament.id})...`);

            try {
                await page.goto(`https://tt.league-pro.com/en/tournaments/${tournament.id}`, { waitUntil: 'networkidle0', timeout: 60000 });

                const html = await page.content();
                const $ = cheerio.load(html);
                const scriptContent = $('#__NUXT_DATA__').html();

                if (scriptContent) {
                    const data = JSON.parse(scriptContent);

                    const resolve = (index) => {
                        if (typeof index === 'number' && index < data.length) {
                            return data[index];
                        }
                        return index;
                    };

                    // Build Player Map & Extract Ratings
                    const playerMap = {};
                    const sideMap = {}; // SideID -> { name, playerId }

                    // Look for sides (contains player info and ratings for this tournament)
                    let sidesIndex = -1;
                    for (let i = 0; i < data.length; i++) {
                        const obj = data[i];
                        if (obj && typeof obj === 'object' && 'sides' in obj && Array.isArray(resolve(obj.sides))) {
                            sidesIndex = obj.sides;
                            break;
                        }
                    }

                    if (sidesIndex !== -1) {
                        const sidesArray = resolve(sidesIndex);
                        sidesArray.forEach(sIdx => {
                            const sideObj = resolve(sIdx);
                            if (sideObj && typeof sideObj === 'object' && sideObj.player) {
                                const pObj = resolve(sideObj.player);
                                if (pObj && pObj.id) {
                                    const pid = resolve(pObj.id);
                                    const firstName = resolve(pObj.first_name_en);
                                    const surname = resolve(pObj.surname_en);
                                    const name = `${surname} ${firstName}`;

                                    // Rating is on the side object for the tournament
                                    const rating = resolve(sideObj.rating_after_tournament) || resolve(sideObj.rating_before_tournament);
                                    const imageUrl = resolve(pObj.avatar) || resolve(pObj.photo);
                                    const sideId = resolve(sideObj.id);

                                    playerMap[pid] = name;
                                    if (sideId) {
                                        sideMap[sideId] = { name, playerId: pid };
                                    }

                                    // Update playersData
                                    // Only update if we have a valid rating or if it's new
                                    if (!playersData[pid] || (rating && rating > 0)) {
                                        playersData[pid] = {
                                            id: pid,
                                            name: name,
                                            rating: rating,
                                            image_url: imageUrl,
                                            last_updated: new Date().toISOString()
                                        };
                                    }
                                }
                            }
                        });
                    }

                    let matchesIndex = -1;
                    for (let i = 0; i < data.length; i++) {
                        const obj = data[i];
                        if (obj && typeof obj === 'object' && 'matches' in obj && Array.isArray(resolve(obj.matches))) {
                            matchesIndex = obj.matches;
                            break;
                        }
                    }

                    if (matchesIndex !== -1) {
                        const matchesArray = resolve(matchesIndex);
                        console.log(`Found matches array with ${matchesArray.length} items.`);

                        matchesArray.forEach((matchIdx, idx) => {
                            const match = resolve(matchIdx);
                            const sideOneId = resolve(match.side_one_id);
                            const sideTwoId = resolve(match.side_two_id);

                            let playerOneId = null;
                            let playerOneName = "Unknown";
                            let playerTwoId = null;
                            let playerTwoName = "Unknown";

                            // Inspect what Side1 is
                            const sideOneObj = resolve(sideOneId);

                            if (sideOneObj && typeof sideOneObj === 'object' && sideOneObj.player) {
                                const pObj = resolve(sideOneObj.player);
                                if (pObj) {
                                    playerOneId = resolve(pObj.id);
                                    playerOneName = `${resolve(pObj.surname_en)} ${resolve(pObj.first_name_en)}`;
                                }
                            } else if (typeof sideOneObj === 'number') {
                                // Try sideMap first (most likely), then playerMap
                                if (sideMap[sideOneObj]) {
                                    playerOneName = sideMap[sideOneObj].name;
                                    playerOneId = sideMap[sideOneObj].playerId;
                                } else if (playerMap[sideOneObj]) {
                                    playerOneName = playerMap[sideOneObj];
                                    playerOneId = sideOneObj;
                                }
                            }

                            const sideTwoObj = resolve(sideTwoId);
                            if (sideTwoObj && typeof sideTwoObj === 'object' && sideTwoObj.player) {
                                const pObj = resolve(sideTwoObj.player);
                                if (pObj) {
                                    playerTwoId = resolve(pObj.id);
                                    playerTwoName = `${resolve(pObj.surname_en)} ${resolve(pObj.first_name_en)}`;
                                }
                            } else if (typeof sideTwoObj === 'number') {
                                if (sideMap[sideTwoObj]) {
                                    playerTwoName = sideMap[sideTwoObj].name;
                                    playerTwoId = sideMap[sideTwoObj].playerId;
                                } else if (playerMap[sideTwoObj]) {
                                    playerTwoName = playerMap[sideTwoObj];
                                    playerTwoId = sideTwoObj;
                                }
                            }

                            if (PLAYER_IDS.includes(playerOneId) || PLAYER_IDS.includes(playerTwoId)) {
                                const resultsIdx = match.results;
                                const results = resolve(resultsIdx);

                                const scoreOne = resolve(results.score_one);
                                const scoreTwo = resolve(results.score_two);

                                if (scoreOne !== null && scoreTwo !== null) {
                                    console.log(`  -> Match: ${playerOneName} vs ${playerTwoName} (${scoreOne}-${scoreTwo})`);
                                    allMatches.push({
                                        tournamentId: tournament.id,
                                        tournamentName: tournament.name,
                                        date: resolve(match.start_game),
                                        playerOneId,
                                        playerOneName,
                                        playerTwoId,
                                        playerTwoName,
                                        scoreOne,
                                        scoreTwo,
                                        winnerId: scoreOne > scoreTwo ? playerOneId : playerTwoId
                                    });
                                }
                            }
                        });
                    }
                }

            } catch (err) {
                console.error(`Error processing tournament ${tournament.id}:`, err.message);
            }

            // Wait a bit to be nice
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`Total matches found: ${allMatches.length}`);
        fs.writeFileSync('match_history.json', JSON.stringify(allMatches, null, 2));
        console.log('Saved match_history.json');

        console.log(`Total players found: ${Object.keys(playersData).length}`);
        fs.writeFileSync('players.json', JSON.stringify(playersData, null, 2));
        console.log('Saved players.json');

    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
})();
