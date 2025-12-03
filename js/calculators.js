window.Calculators = {
    /**
     * Calculates the winning probability for Player A against Player B
     * based on Rating, H2H history, and Daily Form.
     * 
     * @param {Object} playerA - { name, rating, dailyWins, dailyLosses }
     * @param {Object} playerB - { name, rating, dailyWins, dailyLosses }
     * @param {Object} h2h - { aWins, bWins, totalMatches } (Last 10 matches recommended)
     * @returns {Object} - { probA, probB, factors, isMumus, isFlow }
     */
    calculateProbability: function (playerA, playerB, h2h) {
        let baseProb = 50;
        let factors = [];

        // 1. Rating Difference
        // Rule: +1% for every 10 points difference
        const ratingDiff = playerA.rating - playerB.rating;
        const ratingBonus = Math.round(ratingDiff / 10);
        baseProb += ratingBonus;
        if (ratingBonus !== 0) {
            factors.push({
                name: 'Rating Előny',
                value: ratingBonus > 0 ? `+${ratingBonus}%` : `${ratingBonus}%`,
                desc: `${Math.abs(ratingDiff)} pont különbség`
            });
        }

        // 2. H2H Dominance (Mumus Effect)
        // Rule: If won 7 out of last 10 (70%+), add 10-15%
        let h2hBonus = 0;
        let isMumus = false;

        if (h2h.totalMatches > 0) {
            const winRateA = h2h.aWins / h2h.totalMatches;

            if (winRateA >= 0.7) {
                h2hBonus = 15; // Strong dominance
                isMumus = true; // A is Mumus for B
                factors.push({ name: 'H2H Dominancia', value: '+15%', desc: 'Mumus effektus!' });
            } else if (winRateA >= 0.6) {
                h2hBonus = 8;
                factors.push({ name: 'H2H Fölény', value: '+8%', desc: 'Stabil fölény' });
            } else if (winRateA <= 0.3) {
                h2hBonus = -15; // B is Mumus for A
                factors.push({ name: 'H2H Hátrány', value: '-15%', desc: 'Az ellenfél a Mumus' });
            } else if (winRateA <= 0.4) {
                h2hBonus = -8;
                factors.push({ name: 'H2H Hátrány', value: '-8%', desc: 'Negatív mérleg' });
            }
        }
        baseProb += h2hBonus;

        // 3. Daily Form (Momentum / Flow)
        // Rule: Bonus for wins, penalty for losses today
        let formBonus = 0;
        let isFlow = false;

        // Simple logic: +3% per win, -3% per loss (capped at +/- 15%)
        const netWinsA = playerA.dailyWins - playerA.dailyLosses;
        formBonus += (netWinsA * 3);

        // Check for Flow State (3+ wins, 0 losses)
        if (playerA.dailyWins >= 3 && playerA.dailyLosses === 0) {
            formBonus += 5; // Extra boost for pure streak
            isFlow = true;
            factors.push({ name: 'FLOW Állapot', value: '🔥', desc: 'Napi veretlenség (3+)' });
        }

        // Opponent form (inverse effect)
        const netWinsB = playerB.dailyWins - playerB.dailyLosses;
        formBonus -= (netWinsB * 3);

        baseProb += formBonus;
        if (formBonus !== 0) {
            factors.push({
                name: 'Napi Forma',
                value: formBonus > 0 ? `+${formBonus}%` : `${formBonus}%`,
                desc: `A: ${playerA.dailyWins}W/${playerA.dailyLosses}L vs B: ${playerB.dailyWins}W/${playerB.dailyLosses}L`
            });
        }

        // Clamp probability between 5% and 95%
        baseProb = Math.max(5, Math.min(95, baseProb));

        return {
            probA: baseProb,
            probB: 100 - baseProb,
            factors: factors,
            isMumus: isMumus, // True if Player A dominates H2H
            isFlow: isFlow    // True if Player A is in Flow
        };
    }
};
