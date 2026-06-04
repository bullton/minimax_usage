require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.MINIMAX_API_KEY;
const API_BASE = process.env.MINIMAX_API_BASE || 'https://api.minimaxi.com';

async function main() {
    try {
        const response = await axios.get(
            `${API_BASE}/v1/token_plan/remains`,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data?.data?.model_remains?.[0] || {};
        const remainsTime = data.remains_time || 0;
        const intervalPct = data.current_interval_remaining_percent || 0;
        const weekPct = data.current_weekly_remaining_percent || 0;
        const weekRemainsTime = data.weekly_remains_time || 0;

        console.log('\n=== MiniMax Token Plan Usage ===\n');
        console.log(`Remaining Time: ${remainsTime}`);
        console.log(`5h Window Remaining: ${intervalPct}%`);
        console.log(`Weekly Remaining: ${weekPct}%`);
        console.log(`Week Remaining Time: ${weekRemainsTime}`);

        let fiveHourUsed = 0;
        if (intervalPct > 0 && intervalPct < 100) {
            const fiveHourTotal = Math.round(remainsTime / (intervalPct / 100));
            fiveHourUsed = fiveHourTotal - remainsTime;
            console.log(`\n5h Total: ${fiveHourTotal}`);
            console.log(`5h Used: ${fiveHourUsed}`);
        }

        let weeklyUsed = 0;
        if (weekPct > 0 && weekPct < 100) {
            const weekTotal = Math.round(weekRemainsTime / (weekPct / 100));
            weeklyUsed = weekTotal - weekRemainsTime;
            console.log(`\nWeek Total: ${weekTotal}`);
            console.log(`Week Used: ${weeklyUsed}`);
        }

        console.log('\n=== Summary ===');
        console.log(`5h Window Used: ${fiveHourUsed} tokens`);
        console.log(`Daily (est): ${Math.round(fiveHourUsed * 4.8)} tokens`);
        console.log(`Weekly Used: ${weeklyUsed} tokens`);
        console.log(`Monthly (est): ${Math.round(weeklyUsed * 4.3)} tokens`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();