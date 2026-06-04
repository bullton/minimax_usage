require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.MINIMAX_API_KEY;
const API_BASE = process.env.MINIMAX_API_BASE;

console.log('Testing API call...');

axios.get(API_BASE + '/v1/token_plan/remains', {
    headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
    }
}).then(r => {
    const d = r.data?.model_remains?.[0];
    if (!d) {
        console.log('No data found');
        return;
    }
    
    const remainsTime = d.remains_time;
    const intervalPct = d.current_interval_remaining_percent;
    const weekRemainsTime = d.weekly_remains_time;
    const weekPct = d.current_weekly_remaining_percent;
    
    console.log('\n=== Raw Data ===');
    console.log('remains_time:', remainsTime);
    console.log('interval %:', intervalPct);
    console.log('week_remains_time:', weekRemainsTime);
    console.log('week %:', weekPct);
    
    const fiveHourTotal = Math.round(remainsTime / (intervalPct / 100));
    const fiveHourUsed = fiveHourTotal - remainsTime;
    const weekTotal = Math.round(weekRemainsTime / (weekPct / 100));
    const weeklyUsed = weekTotal - weekRemainsTime;
    
    console.log('\n=== Calculated Usage ===');
    console.log('5h Window Used:', fiveHourUsed);
    console.log('5h Window Total:', fiveHourTotal);
    console.log('Weekly Used:', weeklyUsed);
    console.log('Weekly Total:', weekTotal);
    console.log('\nDaily (est):', Math.round(fiveHourUsed * 4.8));
    console.log('Monthly (est):', Math.round(weeklyUsed * 4.3));
    
}).catch(e => console.log('Error:', e.message));