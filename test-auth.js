import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { URLSearchParams } from 'url';

dotenv.config();

// API Configuration
const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const API_URL = 'https://opensky-network.org/api/states/all?lamin=45.83&lomin=5.99&lamax=47.82&lomax=10.52';

const CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;

async function getAccessToken() {
    console.log(`[Auth] Requesting token for client: ${CLIENT_ID}`);

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);

    try {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Token request failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        console.log('[Auth] Token obtained successfully');
        return data.access_token;
    } catch (error) {
        console.error('[Auth] Error getting token:', error.message);
        throw error;
    }
}

async function testApiAccess() {
    try {
        // 1. Get Token
        const token = await getAccessToken();

        // 2. Use Token
        console.log('[API] Fetching aircraft data...');
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'SkyNeedle-FlightTracker/1.0'
            }
        });

        console.log(`[API] Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.log('[API] Error Body:', await response.text());
        } else {
            const data = await response.json();
            console.log(`[API] Success! Retrieved ${data.states?.length || 0} aircraft.`);

            // Check rate limits headers if available
            const limit = response.headers.get('x-rate-limit-remaining');
            if (limit) console.log(`[API] Rate Limit Remaining: ${limit}`);
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: OPENSKY_CLIENT_ID or OPENSKY_CLIENT_SECRET missing in .env');
} else {
    testApiAccess();
}
