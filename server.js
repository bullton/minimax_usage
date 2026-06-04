require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.MINIMAX_API_KEY;
const API_BASE = process.env.MINIMAX_API_BASE || 'https://api.minimaxi.com';

app.use(express.static(path.join(__dirname, 'public')));

async function fetchUsageData() {
    try {
        const now = new Date();

        const response = await axios.get(
            `${API_BASE}/v1/token_plan/remains`,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data?.model_remains?.find(m => m.model_name === 'general') || response.data?.model_remains?.[0] || {};
        const intervalRemainingPercent = data.current_interval_remaining_percent || 0;
        const weeklyRemainingPercent = data.current_weekly_remaining_percent || 0;
        const weekRemainsTime = data.weekly_remains_time || 0;
        const remainsTime = data.remains_time || 0;

        const fiveHourResetTime = new Date(data.end_time);
        const weekResetTime = new Date(data.weekly_end_time);

        const fiveHourTotal = Math.round(remainsTime / (intervalRemainingPercent / 100));
        const fiveHourUsed = fiveHourTotal - remainsTime;
        const weekTotal = Math.round(weekRemainsTime / (weeklyRemainingPercent / 100));
        const weeklyUsed = weekTotal - weekRemainsTime;

        const monthlyTotal = Math.round(weekTotal * 4.3);
        const monthlyUsed = Math.round(weeklyUsed * 4.3);

        return {
            success: true,
            current: {
                fiveHour: fiveHourUsed,
                weekly: weeklyUsed,
                monthly: monthlyUsed
            },
            totals: {
                fiveHour: fiveHourTotal,
                weekly: weekTotal,
                monthly: monthlyTotal
            },
            resets: {
                fiveHour: fiveHourResetTime.toISOString(),
                week: weekResetTime.toISOString()
            },
            raw: {
                remainsTime: remainsTime,
                intervalRemainingPercent: intervalRemainingPercent,
                weeklyRemainingPercent: weeklyRemainingPercent,
                weekRemainsTime: weekRemainsTime,
                model: 'general (M3)'
            },
            timestamp: now.toISOString()
        };
    } catch (error) {
        console.error('Failed to fetch usage data:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

app.get('/api/usage', async (req, res) => {
    const data = await fetchUsageData();
    res.json(data);
});

app.get('/api/usage_detail', async (req, res) => {
    try {
        const allRecords = [];
        const pageSize = 500;
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await axios.get(
                'https://www.minimaxi.com/account/amount',
                {
                    params: { page: page, limit: pageSize, aggregate: false },
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const records = response.data?.charge_records || [];
            allRecords.push(...records);
            
            if (records.length < pageSize || allRecords.length >= response.data?.total_cnt) {
                hasMore = false;
            } else {
                page++;
            }
        }

        const now = new Date();
        const nowTime = now.getTime();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const weekAgo = nowTime - 7 * 24 * 60 * 60 * 1000;

        let weekM3 = 0;
        let monthM3 = 0;
        let weekAll = 0;
        let monthAll = 0;

        let latestDayM3 = 0;
        let latestDayAll = 0;
        let latestDayStart = 0;

        const modelStats = {};
        const groupedByDay = {};
        allRecords.forEach(record => {
            const time = record.created_at * 1000;
            const token = parseInt(record.consume_token) || 0;
            const isM3 = record.model && record.model.includes('M3');
            const modelName = record.model || 'unknown';
            
            if (time >= monthStart) {
                modelStats[modelName] = (modelStats[modelName] || 0) + token;
                
                const dayKey = new Date(time).toISOString().split('T')[0];
                if (!groupedByDay[dayKey]) groupedByDay[dayKey] = { m3: 0, all: 0, time: time };
                if (isM3) groupedByDay[dayKey].m3 += token;
                groupedByDay[dayKey].all += token;
            }
        });

        const dayKeys = Object.keys(groupedByDay).sort().reverse();
        if (dayKeys.length > 0) {
            latestDayStart = groupedByDay[dayKeys[0]].time;
        }

        allRecords.forEach(record => {
            const time = record.created_at * 1000;
            const token = parseInt(record.consume_token) || 0;
            const isM3 = record.model && record.model.includes('M3');

            if (time >= monthStart) {
                if (time >= latestDayStart && time < latestDayStart + 24 * 60 * 60 * 1000) {
                    latestDayAll += token;
                    if (isM3) latestDayM3 += token;
                }
                if (time >= weekAgo) {
                    weekAll += token;
                    if (isM3) weekM3 += token;
                }
                monthAll += token;
                if (isM3) monthM3 += token;
            }
        });

        res.json({
            success: true,
            current: {
                daily: latestDayM3,
                weekly: weekM3,
                monthly: monthM3
            },
            all: {
                daily: latestDayAll,
                weekly: weekAll,
                monthly: monthAll
            },
            latestDay: latestDayStart > 0 ? new Date(latestDayStart).toLocaleDateString('zh-CN') : null,
            monthStart: new Date(monthStart).toLocaleDateString('zh-CN'),
            recordCount: allRecords.length,
            modelBreakdown: modelStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`MiniMax Usage Dashboard running at http://localhost:${PORT}`);
    if (!API_KEY) {
        console.warn('Warning: MINIMAX_API_KEY not set. Please copy .env.example to .env and add your API key.');
    }
});