import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { URLSearchParams } from 'url';

// Configure environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for frontend requests
app.use(cors());

// Token Management
let tokenCache = {
    token: null,
    expiresAt: 0
};

const OPENSKY_AUTH_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

async function getAuthToken() {
    const now = Date.now();

    // Return cached token if valid (with 60s buffer)
    if (tokenCache.token && now < tokenCache.expiresAt - 60000) {
        return tokenCache.token;
    }

    console.log('[Auth] Refreshing OpenSky API Token...');

    const clientId = process.env.OPENSKY_CLIENT_ID;
    const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing OPENSKY_CLIENT_ID or OPENSKY_CLIENT_SECRET');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(OPENSKY_AUTH_URL, {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.ok) {
        throw new Error(`Auth failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();

    // specific to OpenSky keycloak response
    tokenCache.token = data.access_token;
    // expires_in is in seconds
    tokenCache.expiresAt = now + (data.expires_in * 1000);

    console.log(`[Auth] Token acquired. Expires in ${data.expires_in}s`);
    return tokenCache.token;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy endpoint for OpenSky API
app.get('/api/states/all', async (req, res) => {
    try {
        const { lamin, lomin, lamax, lomax } = req.query;

        // Validate parameters
        if (!lamin || !lomin || !lamax || !lomax) {
            return res.status(400).json({ error: 'Missing bounding box parameters' });
        }

        const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

        // Get fresh token
        let token;
        try {
            token = await getAuthToken();
        } catch (authError) {
            console.error('[Proxy] Auth Error:', authError.message);
            // Fallback to anonymous if auth fails? Or fail hard?
            // Let's fail hard for now so we know it's broken, or maybe proceed without header.
            // Better to log and try anonymous as a backup to keep the map working?
            // The user explicitly wants to fix auth, so reporting error is better.
            return res.status(500).json({ error: 'Authentication failed', details: authError.message });
        }

        console.log(`[Proxy] Fetching aircraft data: ${url}`);

        const headers = {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'SkyNeedle-FlightTracker/1.0'
        };

        const response = await fetch(url, { headers });

        // Forward rate limit headers if present
        const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');
        if (rateLimitRemaining) {
            res.setHeader('X-Rate-Limit-Remaining', rateLimitRemaining);
            console.log(`[Proxy] Rate Limit Remaining: ${rateLimitRemaining}`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Proxy] Upstream API error: ${response.status} ${response.statusText}`, errorText);

            // If 401, maybe token is stale? (Logic handled by expiration check mostly)
            if (response.status === 401) {
                // Invalidate cache immediately
                tokenCache.token = null;
                tokenCache.expiresAt = 0;
            }

            return res.status(response.status).send(errorText);
        }

        const data = await response.json();
        console.log(`[Proxy] Success: fetched ${data.states ? data.states.length : 0} aircraft`);

        res.json(data);
    } catch (error) {
        console.error('[Proxy] Server error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`
✈️  SkyNeedle Proxy Server running on port ${PORT}
Checked for OpenSky Client Credentials: ${process.env.OPENSKY_CLIENT_ID ? '✅ Found' : '❌ Missing'}
    `);
});
