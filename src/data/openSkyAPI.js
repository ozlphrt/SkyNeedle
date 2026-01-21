/**
 * SkyNeedle - OpenSky Network API Module
 * Handles all communication with the OpenSky Network API
 */

/**
 * Maximum number of aircraft to display at once
 */
export const MAX_AIRCRAFT_DISPLAY = 500;

/**
 * Fetch aircraft data from OpenSky Network
 * @param {object} bounds - Bounding box {lamin, lamax, lomin, lomax}
 * @param {function} getCameraViewportBounds - Function to get camera bounds
 * @param {function} updateStatus - Function to update status display
 * @returns {Promise<Array>} Array of aircraft states
 */
export async function fetchAircraftData(bounds, getCameraViewportBounds, updateStatus) {
    try {
        // Use provided bounds, or calculate from camera viewport
        let bbox = bounds;

        if (!bbox) {
            bbox = getCameraViewportBounds();
        }

        // If still no bounds (camera too far out), use a reasonable default
        if (!bbox) {
            console.log('Camera view too wide, fetching limited region');
            bbox = {
                lamin: 35.8,   // South (Turkey region)
                lamax: 42.1,   // North
                lomin: 25.6,   // West
                lomax: 44.8    // East
            };
        }

        console.log('Fetching aircraft for bounds:', bbox);

        // Detect environment - use Render backend in production, local proxy in development
        const isProduction = window.location.hostname === 'ozlphrt.github.io';
        const API_BASE = isProduction
            ? 'https://skyneedle-api.onrender.com'
            : '';

        // Use relative path in development (Vite proxy forwards to localhost:3002)
        // Use absolute URL in production (points to Render backend)
        const url = `${API_BASE}/api/states/all?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;

        console.log(`API Request: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} → ${url}`);

        // No need for client-side headers - the proxy handles authentication
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', {
                status: response.status,
                statusText: response.statusText,
                response: errorText
            });

            if (response.status === 401) {
                console.error('🔒 Authentication failed - check server logs');
            } else if (response.status === 429) {
                console.error('⏱️ Rate limit exceeded - reduce request frequency');
            }

            throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const count = data.states?.length || 0;
        console.log(`✅ Fetched ${count} aircraft in viewport`);

        if (count > 0) {
            updateStatus(`TRACKING ${count} AIRCRAFT`, false);
        } else {
            updateStatus('NO AIRCRAFT IN RANGE', false);
        }

        return data.states || [];
    } catch (error) {
        console.error('❌ Error fetching aircraft data:', error);

        // Check if proxy server is running
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.error('💡 Is the proxy server running? Run "npm run server" in a separate terminal.');
            updateStatus('CONNECTION LOST: Proxy server unreachable. Live aircraft updates functionality is currently unavailable.', true);
            return null;
        }

        updateStatus('API ERROR: OpenSky server is down or unreachable. Aircraft positions may be stale or not displayed.', true);
        return null;
    }
}

/**
 * Filter and prioritize aircraft for display
 * @param {Array} aircraftData - Raw aircraft data from API
 * @param {string} searchQuery - Current search query
 * @returns {Array} Filtered aircraft data
 */
export function filterAircraftForDisplay(aircraftData, searchQuery) {
    // Filter out aircraft without position or on ground
    const validAircraft = aircraftData.filter(state => {
        const [, , , , , longitude, latitude, baro_altitude, on_ground, , , , , geo_altitude] = state;
        const altitude = baro_altitude || geo_altitude || 0;

        // Basic validity check
        if (!longitude || !latitude || on_ground) return false;

        // Search Filter
        if (searchQuery) {
            const query = searchQuery;
            const callsign = state[1]?.trim().toUpperCase() || '';
            const icao = state[0]?.toUpperCase() || '';
            const origin = state[2]?.toUpperCase() || '';

            if (!callsign.includes(query) && !icao.includes(query) && !origin.includes(query)) {
                return false;
            }
        }

        return true;
    });

    // If under the limit, return all
    if (validAircraft.length <= MAX_AIRCRAFT_DISPLAY) {
        return validAircraft;
    }

    // Prioritize by altitude (higher altitude aircraft are more visible and interesting)
    const sorted = validAircraft.sort((a, b) => {
        const altA = a[7] || a[13] || 0; // baro_altitude or geo_altitude
        const altB = b[7] || b[13] || 0;
        return altB - altA; // Higher altitude first
    });

    console.log(`⚠️ Limiting display: ${validAircraft.length} aircraft available, showing top ${MAX_AIRCRAFT_DISPLAY} by altitude`);
    return sorted.slice(0, MAX_AIRCRAFT_DISPLAY);
}

/**
 * Fetch and update aircraft for current view
 * @param {object} app - Application state
 * @param {function} getCameraViewportBounds - Function to get camera bounds
 * @param {function} boundsChangedSignificantly - Function to check if bounds changed
 * @param {function} updateAircraftDisplay - Function to update aircraft display
 * @param {function} updateStatus - Function to update status display
 */
export async function refreshAircraftData(app, getCameraViewportBounds, boundsChangedSignificantly, updateAircraftDisplay, updateStatus) {
    const newBounds = getCameraViewportBounds();

    // Only fetch if bounds changed significantly
    if (boundsChangedSignificantly(app.lastFetchBounds, newBounds)) {
        console.log('📍 Camera moved to new region, refreshing aircraft...');
        app.lastFetchBounds = newBounds;
        const data = await fetchAircraftData(newBounds, getCameraViewportBounds, updateStatus);
        updateAircraftDisplay(data);
    }
}

/**
 * Setup camera movement listener
 * @param {object} app - Application state
 * @param {function} refreshCallback - Callback to refresh aircraft data
 */
export function setupCameraListener(app, refreshCallback) {
    if (!app.viewer) return;

    // Listen for camera movement end (debounced)
    app.viewer.camera.moveEnd.addEventListener(() => {
        // Clear existing timeout
        if (app.cameraMoveTimeout) {
            clearTimeout(app.cameraMoveTimeout);
        }

        // Debounce: wait 500ms after camera stops moving
        app.cameraMoveTimeout = setTimeout(() => {
            refreshCallback();
        }, 500);
    });
}

/**
 * Start data update loop
 * @param {object} app - Application state
 * @param {function} refreshCallback - Callback to refresh aircraft data
 */
export function startDataLoop(app, refreshCallback) {
    // Initial fetch
    refreshCallback();

    // Update every 10 seconds (aggressive for smoother tracking)
    // With 4000 credits/day: 4000 ÷ 24 hours = ~166 requests/hour = ~2880 requests/day (safe buffer)
    // 10 seconds = 6 requests/minute = 360 requests/hour = 8640 requests/day (within limits with registered account)
    const loop = async () => {
        if (!app.viewer || app.viewer.isDestroyed()) return;
        await refreshCallback();
        app.updateInterval = setTimeout(loop, 10000);
    };
    loop();

    // Setup camera movement listener for immediate updates when navigating
    setupCameraListener(app, refreshCallback);
}
