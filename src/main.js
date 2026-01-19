/**
 * SkyNeedle - Main Application Entry Point
 * 3D Flight Tracking PWA
 */

import { loadRunwaySurfaces } from './airportLoader.js';

// Configuration - Using environment variables
const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3N2VmNjQ5YS00MzNiLTRjODUtYTYwMS1hZjIwOGM3YWFkMDUiLCJpZCI6MzgwMzQwLCJpYXQiOjE3Njg3NDA5ODB9.ILdx02CrRUguqA-msX6n5l9-NRFuF6oHPGtqlgabJB4';
const OPENSKY_USERNAME = import.meta.env.VITE_OPENSKY_USERNAME || '';
const OPENSKY_PASSWORD = import.meta.env.VITE_OPENSKY_PASSWORD || '';
const MAX_AIRCRAFT_DISPLAY = 500; // Maximum number of aircraft to display at once

// common ICAO airline codes for lookup
// Airline Data with IATA Codes
const ICAO_AIRLINES = {
    'THY': { name: 'Turkish Airlines', iata: 'TK' },
    'PGT': { name: 'Pegasus Airlines', iata: 'PC' },
    'BAW': { name: 'British Airways', iata: 'BA' },
    'DLH': { name: 'Lufthansa', iata: 'LH' },
    'AFR': { name: 'Air France', iata: 'AF' },
    'KLM': { name: 'KLM Royal Dutch', iata: 'KL' },
    'UAE': { name: 'Emirates', iata: 'EK' },
    'QTR': { name: 'Qatar Airways', iata: 'QR' },
    'ETD': { name: 'Etihad Airways', iata: 'EY' },
    'DL': { name: 'Delta Air Lines', iata: 'DL' },
    'AAL': { name: 'American Airlines', iata: 'AA' },
    'UAL': { name: 'United Airlines', iata: 'UA' },
    'RYR': { name: 'Ryanair', iata: 'FR' },
    'EZY': { name: 'EasyJet', iata: 'U2' },
    'WZZ': { name: 'Wizz Air', iata: 'W6' },
    'SWR': { name: 'Swiss International', iata: 'LX' },
    'AZA': { name: 'Alitalia', iata: 'AZ' },
    'TAP': { name: 'TAP Air Portugal', iata: 'TP' },
    'LOT': { name: 'LOT Polish Airlines', iata: 'LO' },
    'ELY': { name: 'El Al', iata: 'LY' },
    'FDB': { name: 'FlyDubai', iata: 'FZ' },
    'RJA': { name: 'Royal Jordanian', iata: 'RJ' },
    'MEA': { name: 'Middle East Airlines', iata: 'ME' },
    'MSR': { name: 'EgyptAir', iata: 'MS' },
    'RAM': { name: 'Royal Air Maroc', iata: 'AT' },
    'ETH': { name: 'Ethiopian Airlines', iata: 'ET' },
    'SVA': { name: 'Saudia', iata: 'SV' },
    'QFA': { name: 'Qantas', iata: 'QF' },
    'JAL': { name: 'Japan Airlines', iata: 'JL' },
    'ANA': { name: 'All Nippon Airways', iata: 'NH' },
    'CPA': { name: 'Cathay Pacific', iata: 'CX' },
    'PIA': { name: 'Pakistan International', iata: 'PK' },
    'AIC': { name: 'Air India', iata: 'AI' },
    'CCA': { name: 'Air China', iata: 'CA' },
    'CES': { name: 'China Eastern', iata: 'MU' },
    'CSN': { name: 'China Southern', iata: 'CZ' },
    'MAS': { name: 'Malaysia Airlines', iata: 'MH' },
    'SIA': { name: 'Singapore Airlines', iata: 'SQ' },
    'THA': { name: 'Thai Airways', iata: 'TG' },
    'KAL': { name: 'Korean Air', iata: 'KE' },
    'ANZ': { name: 'Air New Zealand', iata: 'NZ' },
    'ACA': { name: 'Air Canada', iata: 'AC' },
    'AMX': { name: 'Aeromexico', iata: 'AM' },
    'LAN': { name: 'LATAM Airlines', iata: 'LA' },
    'AVA': { name: 'Avianca', iata: 'AV' }
};

const AIRPORTS = [
    { name: 'Istanbul Airport', icao: 'LTFM', lat: 41.275, lon: 28.751, alt: 99 },
    { name: 'Sabiha Gokcen', icao: 'LTFJ', lat: 40.898, lon: 29.309, alt: 93 },
    { name: 'Ankara Esenboga', icao: 'LTAC', lat: 40.128, lon: 32.995, alt: 953 },
    { name: 'Izmir Adnan Menderes', icao: 'LTBJ', lat: 38.292, lon: 27.157, alt: 126 },
    { name: 'Antalya Airport', icao: 'LTAI', lat: 36.899, lon: 30.801, alt: 54 },
    { name: 'Milas-Bodrum', icao: 'LTFE', lat: 37.250, lon: 27.664, alt: 6 },
    { name: 'Dalaman Airport', icao: 'LTBS', lat: 36.716, lon: 28.791, alt: 6 },
    { name: 'Adana Sakirpasa', icao: 'LTAF', lat: 36.982, lon: 35.280, alt: 20 },
    { name: 'Trabzon Airport', icao: 'LTCG', lat: 40.995, lon: 39.789, alt: 31 },
    { name: 'JFK International', icao: 'KJFK', lat: 40.645, lon: -73.785, alt: 10 },
    { name: 'Heathrow Airport', icao: 'EGLL', lat: 51.470, lon: -0.454, alt: 25 },
    { name: 'Frankfurt Airport', icao: 'EDDF', lat: 50.037, lon: 8.562, alt: 111 },
    { name: 'Dubai International', icao: 'OMDB', lat: 25.253, lon: 55.365, alt: 19 }
];

// Set Cesium Ion token
Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

// Application state
const app = {
    viewer: null,
    selectedAircraft: null,
    aircraftEntities: new Map(),
    updateInterval: null,
    lastFetchBounds: null,
    cameraMoveTimeout: null,
    lastAircraftData: [], // Store raw data for re-filtering
    filters: {
        showAirports: true,
        showTraces: false
    },
    searchQuery: '', // Search query string
    trackedEntity: null,
    followMode: 'NONE', // 'NONE', 'TRACK', 'FOLLOW', 'COCKPIT'
    geocoder: null, // Geocoder service
    searchTimeout: null, // Timeout for debouncing search
    // Debug mode for manual alignment
    debugMode: false,
    debugOffsets: {
        x: 0.0,  // Left/Right (meters)
        y: 0.0,  // Forward/Backward (meters)
        z: 0.0   // Up/Down (meters)
    },
    selectionBracket: null // Selection bracket entity
};

/**
 * Initialize Cesium Viewer
 */
async function initCesiumViewer() {
    console.log('Initializing Cesium viewer...');

    // Debug: Check if credentials are loaded
    console.log('Environment check:', {
        hasUsername: !!OPENSKY_USERNAME,
        username: OPENSKY_USERNAME || '(not set)',
        hasPassword: !!OPENSKY_PASSWORD
    });

    app.viewer = new Cesium.Viewer('cesiumContainer', {
        // Terrain and imagery
        terrain: Cesium.Terrain.fromWorldTerrain(),
        baseLayer: (function () {
            const layer = Cesium.ImageryLayer.fromWorldImagery({
                style: Cesium.IonWorldImageryStyle.AERIAL
            });
            layer.brightness = 0.6;
            layer.contrast = 1.2;
            layer.saturation = 0.2;
            return layer;
        })(),

        // Disable default UI
        animation: false,
        timeline: false,
        infoBox: false,
        selectionIndicator: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,

        // Scene settings - remove empty skybox to prevent errors
        skyAtmosphere: false,

        // Performance
        // Performance - requestRenderMode disabled for smoother animations of moving objects
        requestRenderMode: false,
        maximumRenderTimeChange: Infinity
    });

    // Ensure animation is enabled for aircraft movement
    app.viewer.clock.shouldAnimate = true;
    app.viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

    // Configure scene
    const scene = app.viewer.scene;
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0e14');
    scene.backgroundColor = Cesium.Color.fromCssColorString('#000000');
    scene.globe.enableLighting = false; // Disable sun lighting on globe

    // Initialize Geocoder Service (Now with scene reference)
    app.geocoder = new Cesium.IonGeocoderService({ scene: scene });

    // FIX LIGHTING: Add a fixed directional light for 3D models (like the aircraft)
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.0, 0.0, -1.0), // Illuminating straight down
        intensity: 2.0
    });

    // Set initial camera position (over Bodrum, Turkey)
    app.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(27.43, 37.04, 200000),
        orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0.0
        }
    });

    // Hook into the render loop for camera updates
    app.viewer.scene.preUpdate.addEventListener(updateCamera);

    // Initialize Selection Bracket
    createSelectionBracket();

    // Initialize Airports
    initializeAirports();

    // Load Runway and Taxiway Details
    loadRunwaySurfaces(app.viewer, app);

    // REMOVED: Real-time UI updates (per user request to fix inconsistencies)
    // app.viewer.scene.preUpdate.addEventListener(updateSelectedAircraftUI);

    console.log('Cesium viewer initialized');
}

/**
 * Load and render runway/taxiway surfaces
 */
async function loadRunwaySurfaces_OLD() {
    console.log('Loading airport details...');
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}assets/airport_details.json`);
        if (!response.ok) throw new Error('Failed to load airport details');

        const data = await response.json();

        // Create a data source for airport surfaces
        const dataSource = new Cesium.CustomDataSource('airport-surfaces');
        app.viewer.dataSources.add(dataSource);

        Object.entries(data).forEach(([icao, details]) => {
            // Render Runways
            if (details.runways) {
                details.runways.forEach(feature => {
                    const diffCoords = feature.geometry.coordinates;
                    // Flatten coordinates for Cesium
                    const positions = diffCoords.flat();

                    dataSource.entities.add({
                        show: new Cesium.CallbackProperty(() => app.filters.showAirports, false),
                        corridor: {
                            positions: Cesium.Cartesian3.fromDegreesArray(positions),
                            width: 45.0, // 45 meters wide
                            material: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.3), // Cyber Green
                            cornerType: Cesium.CornerType.MITERED,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            // Only show when camera is relatively close
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000)
                        }
                    });
                });
            }

            // Render Taxiways
            if (details.taxiways) {
                details.taxiways.forEach(feature => {
                    const diffCoords = feature.geometry.coordinates;
                    const positions = diffCoords.flat();

                    dataSource.entities.add({
                        corridor: {
                            positions: Cesium.Cartesian3.fromDegreesArray(positions),
                            width: 20.0, // 20 meters wide
                            material: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.15), // Fainter Green
                            cornerType: Cesium.CornerType.ROUNDED,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000)
                        }
                    });
                });
            }
        });

        console.log('✅ Airport surfaces loaded');

    } catch (error) {
        console.error('❌ Error loading airport details:', error);
    }
}

/**
 * Create custom selection bracket entity
 */
function createSelectionBracket() {
    if (!app.viewer) return;

    // Create a canvas for the bracket
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const color = '#00ff41';
    const thickness = 4;
    const len = 16;

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';

    // Top Left
    ctx.beginPath();
    ctx.moveTo(thickness, thickness + len);
    ctx.lineTo(thickness, thickness);
    ctx.lineTo(thickness + len, thickness);
    ctx.stroke();

    // Top Right
    ctx.beginPath();
    ctx.moveTo(size - thickness - len, thickness);
    ctx.lineTo(size - thickness, thickness);
    ctx.lineTo(size - thickness, thickness + len);
    ctx.stroke();

    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(thickness, size - thickness - len);
    ctx.lineTo(thickness, size - thickness);
    ctx.lineTo(thickness + len, size - thickness);
    ctx.stroke();

    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(size - thickness - len, size - thickness);
    ctx.lineTo(size - thickness, size - thickness);
    ctx.lineTo(size - thickness, size - thickness - len);
    ctx.stroke();

    app.selectionBracket = app.viewer.entities.add({
        id: 'selection-bracket',
        show: false,
        billboard: {
            image: canvas,
            scale: 1.0,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always on top
            pixelOffset: new Cesium.Cartesian2(0, 0)
        }
    });
}

/**
 * Initialize Airport Markers
 * @param {Array<string>} hiddenIcaos - List of airport ICAOs to hide (because they have detailed surfaces)
 */
function initializeAirports(hiddenIcaos = []) {
    if (!app.viewer) return;

    const pinBuilder = new Cesium.PinBuilder();

    AIRPORTS.forEach(airport => {
        // Check if this airport has detailed surfaces (should be hidden)
        const shouldHideVisuals = hiddenIcaos.includes(airport.icao);

        const entityOptions = {
            id: `airport-${airport.icao}`,
            position: Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, airport.alt),
            properties: {
                type: 'airport',
                name: airport.name,
                icao: airport.icao
            }
        };

        // Only add visuals if NOT in the hidden list
        if (!shouldHideVisuals) {
            entityOptions.point = {
                pixelSize: 8,
                color: Cesium.Color.WHITE.withAlpha(0.8),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                show: new Cesium.CallbackProperty(() => app.filters.showAirports, false),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000) // Show from further away
            };
            entityOptions.label = {
                text: airport.name,
                font: '12px Inter, sans-serif', // Cleaner font
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -10), // Above the dot
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000), // Hide labels when zoomed out
                show: new Cesium.CallbackProperty(() => app.filters.showAirports, false)
            };
        }

        app.viewer.entities.add(entityOptions);
    });
}

/**
 * Get current camera viewport bounds
 */
function getCameraViewportBounds() {
    if (!app.viewer) return null;

    const camera = app.viewer.camera;
    const canvas = app.viewer.scene.canvas;

    // Get corners of the viewport
    const topLeft = camera.pickEllipsoid(new Cesium.Cartesian2(0, 0), app.viewer.scene.globe.ellipsoid);
    const topRight = camera.pickEllipsoid(new Cesium.Cartesian2(canvas.clientWidth, 0), app.viewer.scene.globe.ellipsoid);
    const bottomLeft = camera.pickEllipsoid(new Cesium.Cartesian2(0, canvas.clientHeight), app.viewer.scene.globe.ellipsoid);
    const bottomRight = camera.pickEllipsoid(new Cesium.Cartesian2(canvas.clientWidth, canvas.clientHeight), app.viewer.scene.globe.ellipsoid);

    // If camera is too far out (space view), return null to fetch all aircraft
    if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
        return null;
    }

    // Convert to geographic coordinates
    const corners = [topLeft, topRight, bottomLeft, bottomRight].map(cartesian => {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        return {
            lat: Cesium.Math.toDegrees(cartographic.latitude),
            lon: Cesium.Math.toDegrees(cartographic.longitude)
        };
    });

    // Calculate bounding box
    const lats = corners.map(c => c.lat);
    const lons = corners.map(c => c.lon);

    return {
        lamin: Math.max(-90, Math.min(...lats)),   // South (clamp to valid range)
        lamax: Math.min(90, Math.max(...lats)),    // North
        lomin: Math.max(-180, Math.min(...lons)),  // West
        lomax: Math.min(180, Math.max(...lons))    // East
    };
}

/**
 * Fetch aircraft data from OpenSky Network
 */
async function fetchAircraftData(bounds = null) {
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
        console.log(`✅ Fetched ${data.states?.length || 0} aircraft in viewport`);

        return data.states || [];
    } catch (error) {
        console.error('❌ Error fetching aircraft data:', error);

        // Check if proxy server is running
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.error('💡 Is the proxy server running? Run "npm run server" in a separate terminal.');
            updateStatus('ERROR: PROXY DISCONNECTED', true);
            return [];
        }

        updateStatus('ERROR: API UNAVAILABLE', true);
        return [];
    }
}

/**
 * Test OpenSky API authentication (Debug utility)
 * Call this from browser console: testOpenSkyAuth()
 */
window.testOpenSkyAuth = async function () {
    console.log('🔍 Testing OpenSky API Authentication...');
    console.log('---');

    const url = 'https://opensky-network.org/api/states/all?lamin=40&lamax=41&lomin=-74&lomax=-73';

    try {
        const response = await fetch(url, {
            headers: OPENSKY_USERNAME ? {
                'Authorization': 'Basic ' + btoa(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`)
            } : {}
        });

        const rateLimitRemaining = response.headers.get('X-Rate-Limit-Remaining');
        const rateLimitReset = response.headers.get('X-Rate-Limit-Reset');

        console.log('✅ API Connection Status:');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Authenticated: ${OPENSKY_USERNAME ? '✅ Yes' : '❌ No (Anonymous)'}`);
        console.log(`   Username: ${OPENSKY_USERNAME || '(none)'}`);
        console.log(`   Rate Limit Remaining: ${rateLimitRemaining || 'Unknown'}`);
        console.log(`   Rate Limit Reset: ${rateLimitReset ? new Date(rateLimitReset * 1000).toLocaleString() : 'Unknown'}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`   Aircraft in test area: ${data.states?.length || 0}`);
            console.log('---');
            console.log('✅ API is working correctly!');
        } else {
            console.log('---');
            console.log(`❌ API Error: ${response.status}`);
            if (response.status === 401) {
                console.log('   → Check your username and password in .env file');
            } else if (response.status === 429) {
                console.log('   → Rate limit exceeded. Wait or reduce request frequency.');
            }
        }
    } catch (error) {
        console.log('---');
        console.log('❌ Connection Error:', error.message);
    }
};


/**
 * Filter and prioritize aircraft for display
 */
function filterAircraftForDisplay(aircraftData) {
    // Filter out aircraft without position or on ground
    const validAircraft = aircraftData.filter(state => {
        const [, , , , , longitude, latitude, baro_altitude, on_ground, , , , , geo_altitude] = state;
        const altitude = baro_altitude || geo_altitude || 0;

        // Basic validity check
        if (!longitude || !latitude || on_ground) return false;

        // Search Filter
        if (app.searchQuery) {
            const query = app.searchQuery;
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
 * Calculate predicted position based on velocity and heading
 * @param {number} longitude - Current longitude in degrees
 * @param {number} latitude - Current latitude in degrees
 * @param {number} altitude - Current altitude in meters
 * @param {number} velocity - Velocity in m/s
 * @param {number} heading - True track heading in degrees
 * @param {number} verticalRate - Vertical rate in m/s (optional)
 * @param {number} seconds - Number of seconds to predict ahead
 * @returns {object} Predicted position {longitude, latitude, altitude}
 */
function predictPosition(longitude, latitude, altitude, velocity, heading, verticalRate, seconds) {
    // If no velocity data, return current position
    if (!velocity || velocity === 0) {
        return { longitude, latitude, altitude };
    }

    // Earth's radius in meters
    const EARTH_RADIUS = 6371000;

    // Convert heading to radians (0° = North, 90° = East)
    const headingRad = Cesium.Math.toRadians(heading);

    // Calculate distance traveled in meters
    const distance = velocity * seconds;

    // Calculate change in latitude and longitude
    // Δlat = distance * cos(heading) / earth_radius (in radians)
    // Δlon = distance * sin(heading) / (earth_radius * cos(lat)) (in radians)
    const latRad = Cesium.Math.toRadians(latitude);
    const deltaLat = (distance * Math.cos(headingRad)) / EARTH_RADIUS;
    const deltaLon = (distance * Math.sin(headingRad)) / (EARTH_RADIUS * Math.cos(latRad));

    // Convert back to degrees
    const newLatitude = latitude + Cesium.Math.toDegrees(deltaLat);
    const newLongitude = longitude + Cesium.Math.toDegrees(deltaLon);

    // Calculate altitude change if vertical rate is available
    const newAltitude = altitude + (verticalRate || 0) * seconds;

    return {
        longitude: newLongitude,
        latitude: newLatitude,
        altitude: Math.max(0, newAltitude) // Ensure altitude doesn't go negative
    };
}

/**
 * Create or update position property with interpolation
 * @param {object} entity - Cesium entity
 * @param {number} longitude - Current longitude
 * @param {number} latitude - Current latitude
 * @param {number} altitude - Current altitude in meters
 * @param {number} velocity - Velocity in m/s
 * @param {number} heading - Heading in degrees
 * @param {number} verticalRate - Vertical rate in m/s
 * @returns {SampledPositionProperty} Position property with interpolation
 */
function createInterpolatedPosition(entity, longitude, latitude, altitude, velocity, heading, verticalRate) {
    // Use viewer clock time to ensure synchronization with the scene
    const currentTime = app.viewer ? app.viewer.clock.currentTime : Cesium.JulianDate.now();
    const futureTime = Cesium.JulianDate.addSeconds(currentTime, 60, new Cesium.JulianDate()); // Predict 60s ahead

    // Create or get existing SampledPositionProperty
    let positionProperty;
    let startPosition;

    if (entity && entity.position instanceof Cesium.SampledPositionProperty) {
        positionProperty = entity.position;

        // VISUAL CONTINUITY: Start from where the aircraft *currently looks like it is*
        // This prevents the "snap" effect when the API position differs from the predicted position
        const visualPosition = entity.position.getValue(currentTime);
        if (visualPosition) {
            startPosition = visualPosition;
        } else {
            // Fallback if no visual position is available (shouldn't happen often for existing entities)
            startPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
        }

        // Cleanup: Remove samples in the overlapping future window to prevent conflicts
        // We are redefining the path from currentTime onwards
        positionProperty.removeSamples(
            new Cesium.TimeInterval({
                start: currentTime,
                stop: Cesium.JulianDate.addSeconds(currentTime, 3600, new Cesium.JulianDate())
            })
        );

        // Cleanup: Remove very old samples to save memory (older than 300s)
        positionProperty.removeSamples(
            new Cesium.TimeInterval({
                start: Cesium.JulianDate.addSeconds(currentTime, -3600, new Cesium.JulianDate()),
                stop: Cesium.JulianDate.addSeconds(currentTime, -300, new Cesium.JulianDate())
            })
        );
    } else {
        positionProperty = new Cesium.SampledPositionProperty();
        // Use Hermite polynomial approximation for smoother curved paths
        positionProperty.setInterpolationOptions({
            interpolationDegree: 2,
            interpolationAlgorithm: Cesium.HermitePolynomialApproximation
        });
        startPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
    }

    // Add the start point (continuity point)
    positionProperty.addSample(currentTime, startPosition);

    // Calculate and add predicted future position
    const predicted = predictPosition(
        longitude, latitude, altitude,
        velocity, heading, verticalRate,
        60 // Predict 60 seconds ahead to ensure overlap
    );
    const futurePosition = Cesium.Cartesian3.fromDegrees(
        predicted.longitude,
        predicted.latitude,
        predicted.altitude
    );
    positionProperty.addSample(futureTime, futurePosition);

    return positionProperty;
}

/**
 * Update aircraft visualization
 */
function updateAircraftDisplay(aircraftData) {
    if (!app.viewer) return;

    // Use cached data if not provided (for filter updates)
    if (!aircraftData) {
        aircraftData = app.lastAircraftData;
    } else {
        app.lastAircraftData = aircraftData;
    }

    const entities = app.viewer.entities;
    const currentIds = new Set();

    // Filter aircraft to display limit
    const displayAircraft = filterAircraftForDisplay(aircraftData);

    displayAircraft.forEach(state => {
        const [
            icao24, callsign, origin_country, time_position, last_contact,
            longitude, latitude, baro_altitude, on_ground, velocity,
            true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source
        ] = state;

        const id = icao24; // Main ID (Visual Model)
        const trackId = `${id}-track`; // Secondary ID (Path/Physics)

        currentIds.add(id);
        currentIds.add(trackId);

        const altitude = (baro_altitude || geo_altitude || 0);
        const velocityMs = (velocity || 0) * 0.51444;
        const verticalRateMs = (vertical_rate || 0); // OpenSky vertical_rate is already in m/s
        const heading = true_track || 0;

        // --- 1. Track Entity (Physics/Path) ---
        // Handles interpolation and the trailing path. Invisible.
        let trackEntity = entities.getById(trackId);
        let visualEntity = entities.getById(id);

        let positionProperty;

        if (!trackEntity) {
            positionProperty = createInterpolatedPosition(
                null, longitude, latitude, altitude, velocityMs, heading, verticalRateMs
            );

            trackEntity = entities.add({
                id: trackId,
                position: positionProperty,
                orientation: new Cesium.VelocityOrientationProperty(positionProperty),
                point: {
                    pixelSize: 1,
                    color: Cesium.Color.RED.withAlpha(0.0),
                    outlineWidth: 0
                },
                // Trail on track entity (has proper SampledPositionProperty)
                path: {
                    leadTime: 0,
                    trailTime: 300,
                    width: 10,
                    material: Cesium.Color.YELLOW.withAlpha(0.25),
                    show: new Cesium.CallbackProperty(() => app.filters.showTraces, false)
                },
                // Drop line to ground for depth perception
                polyline: {
                    positions: new Cesium.CallbackProperty((time, result) => {
                        const pos = trackEntity.position.getValue(time);
                        if (!pos) return result;
                        const carto = Cesium.Cartographic.fromCartesian(pos);
                        const groundPos = Cesium.Cartesian3.fromDegrees(
                            Cesium.Math.toDegrees(carto.longitude),
                            Cesium.Math.toDegrees(carto.latitude),
                            0
                        );
                        return [pos, groundPos];
                    }, false),
                    width: 1,
                    material: new Cesium.PolylineDashMaterialProperty({
                        color: Cesium.Color.WHITE.withAlpha(0.2),
                        dashLength: 16
                    }),
                    show: new Cesium.CallbackProperty(() => {
                        // Show if traces are enabled AND (it's selected OR camera is high up)
                        if (!app.filters.showTraces) return false;
                        if (app.selectedAircraft && (app.selectedAircraft.id === id || app.selectedAircraft.id === trackId)) return true;

                        // Also show in overview mode (height > 50km)
                        return app.viewer.camera.positionCartographic.height > 50000;
                    }, false),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000)
                }
            });
        } else {
            positionProperty = createInterpolatedPosition(
                trackEntity, longitude, latitude, altitude, velocityMs, heading, verticalRateMs
            );
            if (trackEntity.position !== positionProperty) {
                trackEntity.position = positionProperty;
            }
        }

        // --- 2. Visual Entity (Model/Interaction) ---
        // This is the MAIN entity the user clicks and sees.
        // It follows the Track Entity with an offset.

        // OFFSETS REMOVED - Trail should align with aircraft center
        // The visual model and trail now share the same position (no offset)
        // This ensures the trail emanates from the aircraft's actual position
        // FIXED OFFSETS (Aligned via Manual Debug Mode)
        // These are now applied to the MODEL NODES to scale correctly with minimumPixelSize
        const MODEL_OFFSET_X = 55.40;
        const MODEL_OFFSET_Y = -55.00; // Original -114.00 + 59.00 increment
        const MODEL_OFFSET_Z = -10.00;

        if (!visualEntity) {
            // Create Translation Callback for NodeTransformationProperty
            const translationCallback = new Cesium.CallbackProperty((time, result) => {
                const x = MODEL_OFFSET_X + app.debugOffsets.x;
                const y = MODEL_OFFSET_Y + app.debugOffsets.y;
                const z = MODEL_OFFSET_Z + app.debugOffsets.z;

                // Reuse result object if available for performance
                if (!result) {
                    return new Cesium.Cartesian3(x, y, z);
                }
                result.x = x;
                result.y = y;
                result.z = z;
                return result;
            }, false);

            // Create NodeTransformationProperty
            const nodeTransform = new Cesium.NodeTransformationProperty({
                translation: translationCallback
            });

            // Targets based on debug output
            const transformations = {
                'Sketchfab_model': nodeTransform,
                'ba14754abb1947bba7d9b51a2bc63084.fbx': nodeTransform,
                'RootNode': nodeTransform
            };

            visualEntity = entities.add({
                id: id,
                // Direct position reference (No World Offset)
                position: trackEntity.position,
                orientation: trackEntity.orientation,
                // Model Definition
                // Model Definition
                model: {
                    uri: `${import.meta.env.BASE_URL}assets/boeing_767-200er.glb`,
                    minimumPixelSize: 32,
                    maximumScale: 200,
                    runAnimations: false,
                    nodeTransformations: transformations,

                    // Gradual Fading via Scaling (Shrink to zero)
                    scale: new Cesium.CallbackProperty((time, result) => {
                        const cameraPos = app.viewer.camera.positionWC;
                        // fast distance check using entity position
                        const entityPos = trackEntity.position.getValue(time);
                        if (!entityPos) return 1.0;

                        const dist = Cesium.Cartesian3.distance(cameraPos, entityPos);

                        // Fade range: start 50km, end 500km (User requested 500km)
                        const near = 50000.0;
                        const far = 500000.0;

                        if (dist < near) {
                            return 1.0;
                        } else if (dist > far) {
                            return 0.0; // Invisible
                        } else {
                            // Valid range: interpolate 1.0 -> 0.0
                            return 1.0 - ((dist - near) / (far - near));
                        }
                    }, false),

                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000)
                },
                // Label
                label: {
                    text: callsign?.trim() || icao24,
                    font: 'bold 14px "JetBrains Mono", monospace',
                    fillColor: Cesium.Color.fromCssColorString('#00ff41'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
                    // Gradual Fading for Labels provided by Cesium
                    translucencyByDistance: new Cesium.NearFarScalar(50000, 1.0, 500000, 0.0),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                // Properties
                properties: {
                    callsign: callsign?.trim() || 'N/A',
                    altitude: Math.round(baro_altitude || geo_altitude || 0),
                    velocity: Math.round(velocity || 0),
                    heading: Math.round(heading),
                    origin: origin_country,
                    type: 'aircraft'
                }
            });
        } else {
            // Update Properties
            visualEntity.label.text = callsign?.trim() || icao24;
            visualEntity.properties.altitude = Math.round(baro_altitude || geo_altitude || 0);
            visualEntity.properties.velocity = Math.round(velocity || 0);
            visualEntity.properties.heading = Math.round(heading);

            // Ensure orientation matches
            if (visualEntity.orientation !== trackEntity.orientation) {
                visualEntity.orientation = trackEntity.orientation;
            }

            // Sync position if needed (Direct reference)
            if (visualEntity.position !== trackEntity.position) {
                visualEntity.position = trackEntity.position;
            }
        }
    });

    // Remove aircraft that are no longer in the data
    const allEntities = entities.values;
    for (let i = allEntities.length - 1; i >= 0; i--) {
        const entity = allEntities[i];

        // Skip non-aircraft entities (like airports and the selection bracket)
        if (entity.id === 'selection-bracket') {
            continue;
        }

        if (entity.properties && entity.properties.type && entity.properties.type.getValue() === 'airport') {
            continue;
        }

        if (!currentIds.has(entity.id)) {
            entities.remove(entity);
        }
    }

    const totalAvailable = aircraftData.filter(state => {
        const [, , , , , longitude, latitude, , on_ground] = state;
        return longitude && latitude && !on_ground;
    }).length;

    if (totalAvailable > MAX_AIRCRAFT_DISPLAY) {
        updateStatus(`TRACKING ${currentIds.size}/${totalAvailable} AIRCRAFT`);
    } else {
        updateStatus(`TRACKING ${currentIds.size} AIRCRAFT`);
    }

    // Force a frame render
    app.viewer.scene.requestRender();
}

/**
 * Update camera position based on mode
 */
function updateCamera() {
    if (!app.viewer || !app.trackedEntity || app.followMode === 'NONE') return;

    const entity = app.trackedEntity;
    // Check if the entity still exists in the collection
    if (!app.viewer.entities.contains(entity)) {
        stopCameraModes();
        return;
    }

    const position = entity.position.getValue(app.viewer.clock.currentTime);

    // If entity has no position (e.g. lost signal), stop tracking
    if (!position) {
        return;
    }

    if (app.followMode === 'TRACK') {
        // Cesium handles tracking automatically via viewer.trackedEntity
        // We just ensure it's set (it might be unset if user pans away or we switch modes)
        if (app.viewer.trackedEntity !== entity) {
            app.viewer.trackedEntity = entity;
        }
    } else if (app.followMode === 'FOLLOW') {
        // Custom chase camera

        // Get heading
        let heading = 0;
        const orientation = entity.orientation ? entity.orientation.getValue(app.viewer.clock.currentTime) : null;

        if (orientation) {
            heading = Cesium.HeadingPitchRoll.fromQuaternion(orientation).heading;
        } else {
            heading = Cesium.Math.toRadians(entity.properties.heading.getValue() || 0);
        }

        const distance = 500; // meters behind

        if (app.viewer.trackedEntity) {
            app.viewer.trackedEntity = undefined;
        }

        const headingPitchRange = new Cesium.HeadingPitchRange(
            heading,
            Cesium.Math.toRadians(-20), // Slight look down
            distance
        );

        app.viewer.camera.lookAt(position, headingPitchRange);

    } else if (app.followMode === 'GROUND') {
        const targetPos = entity.position.getValue(app.viewer.clock.currentTime);
        if (!targetPos || !app.groundCameraPos) return;

        // Calculate direction from ground to aircraft
        const direction = Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.subtract(targetPos, app.groundCameraPos, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
        );

        // Update camera position and orientation
        app.viewer.camera.setView({
            destination: app.groundCameraPos,
            orientation: {
                direction: direction,
                up: Cesium.Cartesian3.normalize(app.groundCameraPos, new Cesium.Cartesian3())
            }
        });
    }
}

/**
 * Stop active camera modes
 */
function stopCameraModes() {
    app.followMode = 'NONE';
    app.trackedEntity = null;
    app.viewer.trackedEntity = undefined;

    // Release camera from lookAt
    app.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

/**
 * Start tracking an entity (Lock view)
 */
function startTracking(entity) {
    if (!entity) return;

    // If already following, we need to release lookAt first
    if (app.followMode === 'FOLLOW') {
        app.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }

    app.trackedEntity = entity;
    app.followMode = 'TRACK';
    app.viewer.trackedEntity = entity;
    updateStatus(`TRACKING ${entity.properties.callsign || entity.id}`);
    setTraceVisibility(true);
}

/**
 * Start following an entity (Chase view)
 */
function startFollowing(entity) {
    if (!entity) return;
    app.trackedEntity = entity;
    app.followMode = 'FOLLOW';
    // Native tracking disabled in update loop to allow custom lookAt
    updateStatus(`FOLLOWING ${entity.properties.callsign || entity.id}`);
    setTraceVisibility(true);
}

/**
 * Start ground view (Look up from ground)
 */
function startGroundView(entity) {
    if (!entity) return;

    const position = entity.position.getValue(app.viewer.clock.currentTime);
    if (!position) return;

    const cartographic = Cesium.Cartographic.fromCartesian(position);

    // Position camera on ground directly below or slightly offset
    const groundPos = Cesium.Cartesian3.fromDegrees(
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude),
        10 // 10 meters above ground
    );

    app.trackedEntity = entity;
    app.followMode = 'GROUND';
    app.groundCameraPos = groundPos;

    // Release from any existing tracking
    app.viewer.trackedEntity = undefined;
    app.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    // Smoothly fly to ground position first
    app.viewer.camera.flyTo({
        destination: groundPos,
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(45),
            roll: 0.0
        },
        duration: 2
    });

    updateStatus(`GROUND VIEW: ${entity.properties.callsign || entity.id}`);
}

/**
 * Start cockpit view
 */


/**
 * Update status indicator
 */
function updateStatus(text, isError = false) {
    const statusText = document.querySelector('.status-text');
    const statusIndicator = document.querySelector('.status-indicator');

    if (statusText) {
        statusText.textContent = text;
    }

    if (statusIndicator) {
        statusIndicator.style.background = isError ? '#ff4444' : '#00ff41';
    }
}

/**
 * Setup UI event listeners
 */
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('input', handleSearch);

    // Camera controls
    // Overview listener moved to setupEventListeners to consolidate

    // Close details panel
    document.getElementById('closeDetails')?.addEventListener('click', () => {
        document.getElementById('aircraftDetails')?.classList.add('hidden');
        app.selectedAircraft = null;
        if (app.selectionBracket) app.selectionBracket.show = false;
    });

    // Aircraft click handler
    const handler = new Cesium.ScreenSpaceEventHandler(app.viewer.scene.canvas);
    handler.setInputAction((click) => {
        // Use drillPick to get all objects at the click position (handling overlapping bracket/aircraft)
        const pickedObjects = app.viewer.scene.drillPick(click.position);

        if (Cesium.defined(pickedObjects) && pickedObjects.length > 0) {
            // Find the first relevant entity (aircraft or airport)
            // Skip the selection bracket if it's the top item
            let targetEntity = null;

            for (let i = 0; i < pickedObjects.length; i++) {
                const picked = pickedObjects[i];
                const entityId = (typeof picked.id === 'string') ? picked.id : (picked.id ? picked.id.id : null);

                if (entityId === 'selection-bracket') {
                    continue; // Skip the bracket itself
                }

                if (picked.id instanceof Cesium.Entity) {
                    targetEntity = picked.id;
                    break; // Found a valid entity
                }
            }

            if (targetEntity) {
                showAircraftDetails(targetEntity);
            } else {
                // Clicked only on bracket or something irrelevant? Deselect.
                // Or maybe just do nothing if we clicked bracket? 
                // Let's deselect only if we really found nothing relevant in the stack
                // But actually, if we click 'nothing' (sky/ground), drillPick might be empty or contain non-entities.
            }
        } else {
            // Clicked on empty space
            document.getElementById('aircraftDetails')?.classList.add('hidden');
            app.selectedAircraft = null;
            if (app.selectionBracket) app.selectionBracket.show = false;
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Aircraft Detail Action Buttons
    document.getElementById('detailOverview')?.addEventListener('click', () => {
        stopCameraModes();
        setTraceVisibility(false);
        app.viewer.camera.cancelFlight();
        app.viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(27.43, 37.04, 200000),
            orientation: {
                heading: 0.0,
                pitch: -Cesium.Math.PI_OVER_TWO,
                roll: 0.0
            }
        });
    });

    document.getElementById('detailTrack')?.addEventListener('click', () => {
        if (app.selectedAircraft) startTracking(app.selectedAircraft);
    });

    document.getElementById('detailFollow')?.addEventListener('click', () => {
        if (app.selectedAircraft) startFollowing(app.selectedAircraft);
    });

    document.getElementById('detailGround')?.addEventListener('click', () => {
        if (app.selectedAircraft) startGroundView(app.selectedAircraft);
    });









    // Debug Panel - Close Button
    document.getElementById('closeDebug')?.addEventListener('click', () => {
        app.debugMode = false;
        document.getElementById('debugPanel')?.classList.add('hidden');
    });

    // Debug Panel - Reset Offsets
    document.getElementById('resetOffsets')?.addEventListener('click', () => {
        app.debugOffsets.x = 0.0;
        app.debugOffsets.y = 0.0;
        app.debugOffsets.z = 0.0;
        updateDebugUI();
        console.log('🔧 Offsets reset to zero');
    });

    // Debug Panel - Copy Offsets
    document.getElementById('copyOffsets')?.addEventListener('click', () => {
        const offsetText = `// Aircraft Model Offsets\nconst MODEL_OFFSET_X = ${app.debugOffsets.x.toFixed(2)}; // Left/Right\nconst MODEL_OFFSET_Y = ${app.debugOffsets.y.toFixed(2)}; // Forward/Backward\nconst MODEL_OFFSET_Z = ${app.debugOffsets.z.toFixed(2)}; // Up/Down`;

        navigator.clipboard.writeText(offsetText).then(() => {
            console.log('✅ Offset values copied to clipboard!');
            console.log(offsetText);
            alert('Offset values copied to clipboard!');
        }).catch(err => {
            console.error('❌ Failed to copy:', err);
        });
    });

    // Debug Panel - Apply Offsets to All
    document.getElementById('applyOffsets')?.addEventListener('click', () => {
        console.log('✅ Offsets saved and will be applied to all aircraft:', app.debugOffsets);
        alert(`Offsets applied: X=${app.debugOffsets.x.toFixed(2)}m, Y=${app.debugOffsets.y.toFixed(2)}m, Z=${app.debugOffsets.z.toFixed(2)}m`);
        // The offsets are already being used in the position calculation, so just confirm
    });

    // Keyboard Controls for Debug Mode
    document.addEventListener('keydown', (event) => {
        const controlKeys = ['w', 'a', 's', 'd', 'q', 'e', 'W', 'A', 'S', 'D', 'Q', 'E'];

        // Toggle Debug Mode with CTRL+SHIFT+ALT+D
        if (event.ctrlKey && event.shiftKey && event.altKey && event.key.toLowerCase() === 'd') {
            event.preventDefault();
            app.debugMode = !app.debugMode;
            const debugPanel = document.getElementById('debugPanel');
            if (app.debugMode) {
                debugPanel?.classList.remove('hidden');
                console.log('🔧 Debug Mode ENABLED - Use WASDQE keys to adjust aircraft position');
            } else {
                debugPanel?.classList.add('hidden');
                console.log('🔧 Debug Mode DISABLED');
            }
            return;
        }

        if (!app.debugMode || !app.selectedAircraft) return;

        if (controlKeys.includes(event.key)) {
            event.preventDefault();
        }

        // Determine adjustment magnitude
        let step = 1.0; // Default: 1 meter
        if (event.shiftKey) step = 0.1; // Fine: 0.1 meters
        if (event.ctrlKey) step = 10.0; // Coarse: 10 meters

        // Apply adjustments based on key
        switch (event.key.toLowerCase()) {
            case 'a': // Move Left
                app.debugOffsets.x -= step;
                break;
            case 'd': // Move Right
                app.debugOffsets.x += step;
                break;
            case 'w': // Move Forward
                app.debugOffsets.y += step;
                break;
            case 's': // Move Backward
                app.debugOffsets.y -= step;
                break;
            case 'q': // Move Down
                app.debugOffsets.z -= step;
                break;
            case 'e': // Move Up
                app.debugOffsets.z += step;
                break;
            default:
                return; // Not a control key, don't update UI
        }

        updateDebugUI();
        console.log(`🔧 Offset adjusted: X=${app.debugOffsets.x.toFixed(2)}, Y=${app.debugOffsets.y.toFixed(2)}, Z=${app.debugOffsets.z.toFixed(2)}`);
    });

    setupFilterListeners();
}

/**
 * Update Debug UI with current offset values
 */
function updateDebugUI() {
    document.getElementById('debugOffsetX').textContent = `${app.debugOffsets.x.toFixed(2)} m`;
    document.getElementById('debugOffsetY').textContent = `${app.debugOffsets.y.toFixed(2)} m`;
    document.getElementById('debugOffsetZ').textContent = `${app.debugOffsets.z.toFixed(2)} m`;

    setupFilterListeners();

}

/**
 * Set trace visibility
 * @param {boolean} visible 
 */
function setTraceVisibility(visible) {
    app.filters.showTraces = visible;
    const toggleTraces = document.getElementById('toggleTraces');
    if (toggleTraces) {
        toggleTraces.classList.toggle('active', visible);
    }
    app.viewer?.scene?.requestRender();
}

/**
 * Setup Filter UI listeners
 */
function setupFilterListeners() {
    const toggleAirports = document.getElementById('toggleAirports');
    const toggleTraces = document.getElementById('toggleTraces');

    toggleAirports?.addEventListener('click', () => {
        app.filters.showAirports = !app.filters.showAirports;
        toggleAirports.classList.toggle('active', app.filters.showAirports);
        renderAirports();

        // Toggle Runway/Taxiway Overlay
        const runwayDS = app.viewer.dataSources.getByName('airport-surfaces');
        if (runwayDS && runwayDS.length > 0) {
            runwayDS[0].show = app.filters.showAirports;
        }
    });

    toggleTraces?.addEventListener('click', () => {
        app.filters.showTraces = !app.filters.showTraces;
        toggleTraces.classList.toggle('active', app.filters.showTraces);
        // The CallbackProperty in entity.path.show will automatically pick this up
        // but we might need to request a render
        app.viewer.scene.requestRender();
    });
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const query = event.target.value.trim().toUpperCase();
    app.searchQuery = query;

    // Clear existing timeout
    if (app.searchTimeout) {
        clearTimeout(app.searchTimeout);
    }

    if (!query) {
        renderSearchResults([]);
        updateAircraftDisplay();
        return;
    }

    // Debounce search (300ms)
    app.searchTimeout = setTimeout(async () => {
        console.log('Searching for:', query);
        const results = await performSearch(query);
        renderSearchResults(results);
        updateAircraftDisplay();
    }, 300);
}

/**
 * Perform search for cities, airports, and flights
 */
async function performSearch(query) {
    if (!query || query.length < 2) return [];

    const results = [];

    // 1. Search Airports
    const airportMatches = AIRPORTS.filter(a =>
        a.name.toUpperCase().includes(query) ||
        a.icao.toUpperCase().includes(query)
    );
    airportMatches.forEach(a => results.push({
        type: 'AIRPORT',
        label: `${a.icao} - ${a.name}`,
        data: a,
        id: `airport-${a.icao}`
    }));

    // 2. Search Flights (Currently tracked on map)
    const entities = app.viewer.entities.values;
    const aircraftMatches = entities.filter(e =>
        e.properties && e.properties.type && e.properties.type.getValue() === 'aircraft' &&
        (e.properties.callsign.getValue().toUpperCase().includes(query) || e.id.toUpperCase().includes(query))
    );
    aircraftMatches.forEach(e => results.push({
        type: 'FLIGHT',
        label: `${e.properties.callsign.getValue()} (${e.id})`,
        data: e,
        id: e.id
    }));

    // 3. Search Cities/Locations (via Geocoder)
    try {
        const geoResults = await app.geocoder.geocode(query);
        if (geoResults && geoResults.length > 0) {
            geoResults.forEach(res => results.push({
                type: 'CITY',
                label: res.displayName,
                data: res,
                id: `geo-${res.displayName}`
            }));
        }
    } catch (error) {
        console.error('Geocoder error:', error);
    }

    return results;
}

/**
 * Render search results dropdown
 */
function renderSearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    resultsContainer.innerHTML = results.map(res => `
        <div class="search-result-item" data-id="${res.id}">
            <span class="result-type">[${res.type}]</span>
            <span class="result-label">${res.label}</span>
        </div>
    `).join('');

    resultsContainer.style.display = 'block';

    // Add click listeners to results
    resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            selectSearchResult(results[index]);
        });
    });
}

/**
 * Handle selection of a search result
 */
function selectSearchResult(result) {
    const { type, data, id } = result;
    console.log('Selected search result:', result);

    // Clear search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderSearchResults([]);
    app.searchQuery = '';

    if (type === 'CITY') {
        app.viewer.camera.flyTo({
            destination: data.destination,
            duration: 3
        });
        updateStatus(`VIEWING: ${data.displayName.toUpperCase()}`);
    } else if (type === 'AIRPORT') {
        const entity = app.viewer.entities.getById(id);
        if (entity) {
            app.viewer.flyTo(entity, {
                offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 25000),
                duration: 3
            });
            showAircraftDetails(entity);
        } else {
            // Airport might not be in the collection or hidden
            app.viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(data.lon, data.lat, 25000),
                duration: 3
            });
        }
    } else if (type === 'FLIGHT') {
        const entity = app.viewer.entities.getById(id);
        if (entity) {
            app.viewer.camera.flyTo({
                destination: entity.position.getValue(app.viewer.clock.currentTime),
                offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 5000),
                duration: 3
            });
            showAircraftDetails(entity);
        }
    }
}

/**
 * Get airliner name from callsign
 */
/**
 * Get airliner name from callsign
 */
function getAirlinerFromCallsign(callsign) {
    if (!callsign) return 'GENERAL AVIATION';
    const code = callsign.substring(0, 3).trim();
    return ICAO_AIRLINES[code]?.name || 'PRIVATE/CHARTER';
}

/**
 * Get IATA flight number from ICAO callsign
 * e.g., THY123 -> TK 123
 */
function getFlightNumberFromCallsign(callsign) {
    if (!callsign) return '—';

    // Extract 3-letter ICAO code
    const icao = callsign.substring(0, 3).toUpperCase();

    // Check if we have a mapping
    if (ICAO_AIRLINES[icao]) {
        const iata = ICAO_AIRLINES[icao].iata;
        // Extract the flight number part (everything after the first 3 chars)
        // Remove leading zeros for cleaner look (e.g. 009 -> 9)
        let number = callsign.substring(3).trim();
        number = number.replace(/^0+/, '');

        return `${iata} ${number}`;
    }

    // Use fallback regex to separate letters and numbers if unknown airline
    const match = callsign.match(/^([A-Z]+)(\d+.*)$/);
    if (match) {
        return `${match[1]} ${match[2]}`;
    }

    return callsign;
}

/**
 * Show aircraft details panel
 */
function showAircraftDetails(entity) {
    app.selectedAircraft = entity;

    // Show selection bracket
    if (app.selectionBracket) {
        app.selectionBracket.position = entity.position;
        app.selectionBracket.show = true;
    }

    const panel = document.getElementById('aircraftDetails');
    panel?.classList.remove('hidden');

    const isAirport = entity.properties && entity.properties.type && entity.properties.type.getValue() === 'airport';

    // UI Elements
    const titleEl = document.querySelector('.panel-title');
    const labels = document.querySelectorAll('.data-label');
    const values = document.querySelectorAll('.data-value');

    // Mappings for easier access
    const ui = {
        airliner: document.getElementById('detailAirliner'),
        flightNum: document.getElementById('detailFlightNum'),
        callsign: document.getElementById('detailCallsign'),
        altitude: document.getElementById('detailAltitude'),
        velocity: document.getElementById('detailVelocity'),
        heading: document.getElementById('detailHeading'),
        origin: document.getElementById('detailOrigin')
    };

    if (isAirport) {
        // Airport Mode
        titleEl.textContent = 'AIRPORT DATA';

        if (ui.airliner) ui.airliner.parentElement.style.display = 'none';
        if (ui.flightNum) ui.flightNum.parentElement.style.display = 'none';

        labels[1].textContent = 'NAME:';         // Callsign (Index 1) -> NAME
        ui.callsign.textContent = entity.properties.name.getValue();

        labels[3].textContent = 'ALTITUDE:';     // Altitude (Index 3) -> ALTITUDE
        const airportPos = entity.position.getValue(app.viewer.clock.currentTime);
        const cartographic = Cesium.Cartographic.fromCartesian(airportPos);
        ui.altitude.textContent = `${Math.round(cartographic.height)} M`;

        labels[4].textContent = 'ICAO:';         // Velocity (Index 4) -> ICAO
        ui.velocity.textContent = entity.properties.icao.getValue();

        // Get lat/lon from cartographic
        labels[5].textContent = 'LAT:';          // Heading (Index 5) -> LAT
        ui.heading.textContent = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);

        labels[6].textContent = 'LON:';          // Origin (Index 6) -> LON
        ui.origin.textContent = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);

        // Hide Follow/Ground buttons
        document.getElementById('detailFollow').style.display = 'none';
        document.getElementById('detailGround').style.display = 'none';

    } else {
        // Aircraft Mode
        titleEl.textContent = 'AIRCRAFT DATA';

        // Show all rows
        Object.values(ui).forEach(el => {
            if (el) el.parentElement.style.display = 'flex';
        });

        // 1. Clear Fields First (Prevent Stale Data)
        ui.airliner.textContent = '...';
        ui.flightNum.textContent = '...';
        ui.callsign.textContent = '...';
        ui.altitude.textContent = '...';
        ui.velocity.textContent = '...';
        ui.heading.textContent = '...';
        ui.origin.textContent = '...';

        // 2. Populate Fresh Data
        const callsign = entity.properties.callsign.getValue() || 'N/A';
        ui.airliner.textContent = getAirlinerFromCallsign(callsign);
        ui.flightNum.textContent = getFlightNumberFromCallsign(callsign);
        ui.callsign.textContent = callsign;

        labels[1].textContent = 'CALLSIGN:'; // Index 1
        labels[3].textContent = 'ALTITUDE:'; // Index 3
        labels[4].textContent = 'VELOCITY:'; // Index 4
        labels[5].textContent = 'HEADING:';  // Index 5
        labels[6].textContent = 'ORIGIN:';   // Index 6

        // Use precise current values if possible, otherwise fallback to property
        const currentTime = app.viewer.clock.currentTime;

        let altMeters = 0;
        const position = entity.position.getValue(currentTime);
        if (position) {
            const carto = Cesium.Cartographic.fromCartesian(position);
            altMeters = carto.height;
        } else {
            altMeters = entity.properties.altitude.getValue() || 0;
        }

        const altFeet = Math.round(altMeters * 3.28084);
        ui.altitude.textContent = `${altFeet.toLocaleString()} FT`;

        // Velocity
        const vel = entity.properties.velocity.getValue();
        ui.velocity.textContent = `${Math.round(vel)} KTS`;

        // Heading
        // Ideally get current heading from orientation, but property is fine for snapshot
        const hdg = entity.properties.heading.getValue();
        ui.heading.textContent = `${Math.round(hdg)}°`;

        ui.origin.textContent = entity.properties.origin.getValue() || 'N/A';

        // Show action buttons
        document.getElementById('detailFollow').style.display = 'flex';
        document.getElementById('detailGround').style.display = 'flex';
    }
}

// REMOVED: updateSelectedAircraftUI 
// Real-time updates caused flickering and inconsistency. 
// Data is now static snapshots upon selection.



/**
 * Check if bounds have changed significantly
 */
function boundsChangedSignificantly(oldBounds, newBounds) {
    if (!oldBounds || !newBounds) return true;

    // Calculate the change in each dimension (in degrees)
    const latChange = Math.abs(oldBounds.lamin - newBounds.lamin) + Math.abs(oldBounds.lamax - newBounds.lamax);
    const lonChange = Math.abs(oldBounds.lomin - newBounds.lomin) + Math.abs(oldBounds.lomax - newBounds.lomax);

    // Threshold: refresh if bounds changed by more than 20% of the viewport
    const latThreshold = Math.abs(oldBounds.lamax - oldBounds.lamin) * 0.2;
    const lonThreshold = Math.abs(oldBounds.lomax - oldBounds.lomin) * 0.2;

    return latChange > latThreshold || lonChange > lonThreshold;
}

/**
 * Fetch and update aircraft for current view
 */
async function refreshAircraftData() {
    const newBounds = getCameraViewportBounds();

    // Only fetch if bounds changed significantly
    if (boundsChangedSignificantly(app.lastFetchBounds, newBounds)) {
        console.log('📍 Camera moved to new region, refreshing aircraft...');
        app.lastFetchBounds = newBounds;
        const data = await fetchAircraftData(newBounds);
        updateAircraftDisplay(data);
    }
}

/**
 * Setup camera movement listener
 */
function setupCameraListener() {
    if (!app.viewer) return;

    // Listen for camera movement end (debounced)
    app.viewer.camera.moveEnd.addEventListener(() => {
        // Clear existing timeout
        if (app.cameraMoveTimeout) {
            clearTimeout(app.cameraMoveTimeout);
        }

        // Debounce: wait 500ms after camera stops moving
        app.cameraMoveTimeout = setTimeout(() => {
            refreshAircraftData();
        }, 500);
    });
}

/**
 * Start data update loop
 */
function startDataLoop() {
    // Initial fetch
    refreshAircraftData();

    // Update every 30 seconds to stay within OpenSky rate limits
    // With 4000 credits/day: 4000 ÷ 24 hours = ~166 requests/hour = ~2880 requests/day (safe buffer)
    // 30 seconds = 2 requests/minute = 120 requests/hour = 2880 requests/day ✅
    app.updateInterval = setInterval(async () => {
        refreshAircraftData();
    }, 30000); // 30 seconds = 30,000 milliseconds

    // Setup camera movement listener for immediate updates when navigating
    setupCameraListener();
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

/**
 * Render airports based on visibility filter
 */
function renderAirports() {
    if (!app.viewer) return;

    // Clear existing airports first (to avoid duplicates or update style)
    // We'll use a specific ID prefix or manage a collection
    // Simple approach: Use entities with a specific property

    // Actually, improved approach: Create them once, and just toggle 'show'

    const entities = app.viewer.entities.values;
    const airportEntities = entities.filter(e => e.properties && e.properties.type && e.properties.type.getValue() === 'airport');

    if (airportEntities.length === 0 && app.filters.showAirports) {
        // Create airports if they don't exist and we want to show them
        AIRPORTS.forEach(airport => {
            app.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, airport.alt),
                point: {
                    pixelSize: 10,
                    color: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.6),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                label: {
                    text: airport.name, // Display Name
                    font: '10px JetBrains Mono',
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    fillColor: Cesium.Color.fromCssColorString('#00ff41'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    verticalOrigin: Cesium.VerticalOrigin.TOP,
                    pixelOffset: new Cesium.Cartesian2(0, 10),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 100000), // Only show labels when close
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                properties: {
                    type: 'airport',
                    name: airport.name,
                    icao: airport.icao
                }
            });
        });
    } else {
        // Update visibility
        airportEntities.forEach(entity => {
            entity.show = app.filters.showAirports;
        });
    }
}

/**
 * Initialize application
 */
async function init() {
    try {
        updateStatus('INITIALIZING');

        // Initialize Cesium
        await initCesiumViewer();

        // Setup UI
        setupEventListeners();

        // Initial render of airports
        renderAirports();

        // Start data updates
        startDataLoop();

        // Hide loading screen
        setTimeout(hideLoadingScreen, 1000);


        updateStatus('OPERATIONAL');
    } catch (error) {
        console.error('Initialization error:', error);
        updateStatus('INITIALIZATION FAILED', true);
    }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
