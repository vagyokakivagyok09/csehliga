const puppeteer = require('puppeteer');
const fs = require('fs');

let browser = null;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

/**
 * Scrape odds from Tippmix
 * @returns {Promise<Array>} List of matches with odds
 */
async function scrapeOdds() {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();

        // Set User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        // Block resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log('Navigating to Tippmix...');
        const targetUrl = 'https://www.tippmix.hu/sportfogadas#?sportid=20&countryid=38014&competitionid=57388&competitiontype=competition&minOdds=1&maxOdds=10';

        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for match list
        try {
            console.log('Waiting for selectors...');
            await page.waitForSelector('td.title > a', { timeout: 5000 });
        } catch (e) {
            console.log('Timeout waiting for selector (likely no matches).');
            // Don't return yet, let's see if we can find anything or save debug
        }

        console.log('Scraping data...');
        const matches = await page.evaluate(() => {
            const results = [];
            // Target the link inside the title cell
            const matchLinks = document.querySelectorAll('td.title > a');
            console.log(`Found ${matchLinks.length} match links.`);

            matchLinks.forEach((link, i) => {
                try {
                    // 1. Extract Time
                    // Structure: span.date
                    const dateSpan = link.querySelector('span.date');
                    const time = dateSpan ? dateSpan.textContent.trim() : 'N/A';

                    // 2. Extract Players
                    // Structure: span.name
                    const nameSpan = link.querySelector('span.name');
                    const nameText = nameSpan ? nameSpan.textContent.trim() : null;

                    if (nameText && time !== 'N/A') {
                        const [playerA, playerB] = nameText.split(' - ').map(s => s.trim());

                        // 3. Extract Odds
                        // Navigate up to td.title, then next sibling td.odds
                        const titleTd = link.closest('td.title');
                        const oddsTd = titleTd ? titleTd.nextElementSibling : null;

                        const odds = {};

                        if (oddsTd && oddsTd.classList.contains('odds')) {
                            const buttons = oddsTd.querySelectorAll('button.btn-odds');

                            buttons.forEach(btn => {
                                const marketDiv = btn.querySelector('div');
                                const valueSpan = btn.querySelector('span');

                                if (marketDiv && valueSpan) {
                                    const market = marketDiv.textContent.trim();
                                    const value = parseFloat(valueSpan.textContent.replace(',', '.'));
                                    odds[market] = value;
                                }
                            });
                        }

                        // 4. Filter by Odds (Min 1.6)
                        const hasHighOdd = Object.values(odds).some(val => val >= 1.6);

                        if (hasHighOdd) {
                            results.push({
                                time,
                                playerA,
                                playerB,
                                odds,
                                raw_date: new Date().toISOString()
                            });
                        }
                    }
                } catch (err) {
                    // console.log('Error parsing match', err);
                }
            });
            return results;
        });

        if (matches.length === 0) {
            console.log('No matches found. Saving debug_odds.html...');
            const html = await page.content();
            fs.writeFileSync('debug_odds.html', html);
        }

        await page.close();
        return matches;

    } catch (error) {
        console.error('Scraping failed:', error);
        throw error;
    }
}

module.exports = { scrapeOdds };
