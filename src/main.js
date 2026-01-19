/**
 * SkyNeedle - Main Application Entry Point
 * 3D Flight Tracking PWA
 */

import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Configuration - Using environment variables
const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3N2VmNjQ5YS00MzNiLTRjODUtYTYwMS1hZjIwOGM3YWFkMDUiLCJpZCI6MzgwMzQwLCJpYXQiOjE3Njg3NDA5ODB9.ILdx02CrRUguqA-msX6n5l9-NRFuF6oHPGtqlgabJB4';
const OPENSKY_USERNAME = import.meta.env.VITE_OPENSKY_USERNAME || '';
const OPENSKY_PASSWORD = import.meta.env.VITE_OPENSKY_PASSWORD || '';
const MAX_AIRCRAFT_DISPLAY = 500; // Maximum number of aircraft to display at once
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
    { name: 'JFK International', icao: 'KJFK', lat: 40.641, lon: -73.778, alt: 4 },
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
        minAltitude: 0,
        maxAltitude: 50000,
        showAirports: true,
        showTraces: true
    },
    searchQuery: '', // Search query string
    trackedEntity: null,
    followMode: 'NONE' // 'NONE', 'TRACK', 'FOLLOW', 'COCKPIT'
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
        baseLayer: Cesium.ImageryLayer.fromWorldImagery({
            style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
        }),

        // Disable default UI
        animation: false,
        timeline: false,
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

    // Initialize Airports
    initializeAirports();

    console.log('Cesium viewer initialized');
}

/**
 * Initialize Airport Markers
 */
function initializeAirports() {
    if (!app.viewer) return;

    const pinBuilder = new Cesium.PinBuilder();

    AIRPORTS.forEach(airport => {
        app.viewer.entities.add({
            id: `airport-${airport.icao}`,
            position: Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, airport.alt),
            billboard: {
                image: pinBuilder.fromText(airport.icao, Cesium.Color.ROYALBLUE, 48).toDataURL(),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                show: new Cesium.CallbackProperty(() => app.filters.showAirports, false)
            },
            label: {
                text: airport.name,
                font: '14px JetBrains Mono',
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, 5),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000), // Hide when zoomed out
                show: new Cesium.CallbackProperty(() => app.filters.showAirports, false)
            },
            properties: {
                type: 'airport',
                name: airport.name,
                icao: airport.icao
            }
        });
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

        // Altitude filter
        const minAlt = app.filters.minAltitude / 3.28084; // Convert feet to meters
        const maxAlt = app.filters.maxAltitude / 3.28084;

        if (altitude < minAlt || altitude > maxAlt) return false;

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
        const verticalRateMs = (vertical_rate || 0) * 0.00508;
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
                    pixelSize: 1, // Minimize
                    color: Cesium.Color.RED.withAlpha(0.0),
                    outlineWidth: 0
                },
                path: {
                    leadTime: 0,
                    trailTime: 300,
                    width: 2,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.2,
                        color: Cesium.Color.fromCssColorString('#00d4ff')
                    }),
                    show: new Cesium.CallbackProperty(() => app.filters.showTraces, false)
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

        // OFFSETS (Adjusted based on feedback)
        // Coordinate System (Cesium Entity Local Frame after glTF conversion):
        // X = Right/Left (negative = left)
        // Y = Forward/Back (positive = forward)  
        // Z = Up/Down
        const OFFSET_LEFT = -70.0;  // Negative X to move left
        const OFFSET_FORWARD = 50.0; // Positive Y to move forward

        if (!visualEntity) {
            visualEntity = entities.add({
                id: id,
                // Model Definition
                model: {
                    uri: `${import.meta.env.BASE_URL}assets/boeing_767-200er.glb`,
                    minimumPixelSize: 64,
                    maximumScale: 200,
                    scale: 1.0,
                    runAnimations: false
                },
                // Label (Moved from Track)
                label: {
                    text: callsign?.trim() || icao24,
                    font: '12px JetBrains Mono',
                    fillColor: Cesium.Color.fromCssColorString('#00ff41'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                // Properties (Moved from Track)
                properties: {
                    callsign: callsign?.trim() || 'N/A',
                    altitude: Math.round(baro_altitude || geo_altitude || 0),
                    velocity: Math.round(velocity || 0),
                    heading: Math.round(heading),
                    origin: origin_country,
                    type: 'aircraft'
                }
            });

            // Sync Orientation
            visualEntity.orientation = trackEntity.orientation;

            // Position Callback with Offset
            // CRITICAL FIX: Use correct axis mapping (X=Left/Right, Y=Forward/Back, Z=Up)
            visualEntity.position = new Cesium.CallbackProperty((time) => {
                const pos = trackEntity.position.getValue(time);
                const orient = trackEntity.orientation.getValue(time);

                if (!pos || !orient) return pos;

                const matrix = Cesium.Matrix3.fromQuaternion(orient);
                // Corrected: X for lateral, Y for forward/back
                const offset = new Cesium.Cartesian3(OFFSET_LEFT, OFFSET_FORWARD, 0);
                const worldOffset = Cesium.Matrix3.multiplyByVector(matrix, offset, new Cesium.Cartesian3());

                return Cesium.Cartesian3.add(pos, worldOffset, new Cesium.Cartesian3());
            }, false);

        } else {
            // Update Properties
            visualEntity.label.text = callsign?.trim() || icao24;
            visualEntity.properties.altitude = Math.round(baro_altitude || geo_altitude || 0);
            visualEntity.properties.velocity = Math.round(velocity || 0);
            visualEntity.properties.heading = Math.round(heading);

            // Re-bind orientation if needed (usually stays linked)
            if (visualEntity.orientation !== trackEntity.orientation) {
                visualEntity.orientation = trackEntity.orientation;
            }
        }
    });

    // Remove aircraft that are no longer in the data
    const allEntities = entities.values;
    for (let i = allEntities.length - 1; i >= 0; i--) {
        const entity = allEntities[i];

        // Skip non-aircraft entities (like airports)
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

    } else if (app.followMode === 'COCKPIT') {
        // Pilot View
        let heading = 0;
        let pitch = 0;
        let roll = 0;

        const orientation = entity.orientation ? entity.orientation.getValue(app.viewer.clock.currentTime) : null;

        if (orientation) {
            const hpr = Cesium.HeadingPitchRoll.fromQuaternion(orientation);
            heading = hpr.heading;
            pitch = hpr.pitch;
            roll = hpr.roll;
        } else {
            heading = Cesium.Math.toRadians(entity.properties.heading.getValue() || 0);
        }

        // Calculate offset (visualize as if sitting in cockpit)
        // We'll place camera slightly ahead and above center
        // Transform offset to world coordinates
        // Using viewer.camera.setView for strict positioning 

        // Actually, lookAt works relative to center. 
        // For cockpit, we want zero distance, facing forward.
        // lookAt with range 0 works IF we set the correct Heading/Pitch?
        // But lookAt points TO the center. We want to look FROM the center OUT.
        // Better to use a fixed offset in the reference frame.

        // Simplified approach: Camera at position, orientation matched.
        // problem: the model is there. We might clip inside.
        // let's try lookAt with very close range?

        if (app.viewer.trackedEntity) {
            app.viewer.trackedEntity = undefined;
        }

        // Adjust heading to look forward (Cesium camera heading is rotation around up vector)
        // Check if we need offset.

        const headingPitchRange = new Cesium.HeadingPitchRange(
            heading,
            pitch, // Match pitch
            10 // 10 meters back? or 0? 
            // If we use 0, we might be inside. 
            // Using 50 meters looks like a "Third Person Close" or "Over shoulder".
            // Let's try 20 meters.
        );

        // For true cockpit we'd need to calculate World Coordinate of the nose.
        // Let's stick to "Close Chase" as "Cockpit" for safe implementation without complex matrix math in one go.
        // Actually, let's try 0.1 range.
        const closeRange = new Cesium.HeadingPitchRange(
            heading,
            pitch + Cesium.Math.toRadians(-5), // Slight down tilt
            20 // 20m behind (Close Follow)
        );

        app.viewer.camera.lookAt(position, closeRange);
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
}

/**
 * Start cockpit view
 */
function startCockpit(entity) {
    if (!entity) return;
    app.trackedEntity = entity;
    app.followMode = 'COCKPIT';
    updateStatus(`COCKPIT: ${entity.properties.callsign || entity.id}`);
}

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
    });

    // Aircraft click handler
    const handler = new Cesium.ScreenSpaceEventHandler(app.viewer.scene.canvas);
    handler.setInputAction((click) => {
        const pickedObject = app.viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
            showAircraftDetails(pickedObject.id);
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Filter UI Listeners
    // Detail Panel Buttons
    document.getElementById('trackAircraft')?.addEventListener('click', () => {
        if (app.selectedAircraft) startTracking(app.selectedAircraft);
    });

    document.getElementById('followAircraft')?.addEventListener('click', () => {
        if (app.selectedAircraft) startFollowing(app.selectedAircraft);
    });

    // Camera Panel Buttons (Active when mode is running)
    document.getElementById('cameraTrack')?.addEventListener('click', () => {
        if (app.selectedAircraft) startTracking(app.selectedAircraft);
    });

    document.getElementById('cameraFollow')?.addEventListener('click', () => {
        if (app.selectedAircraft) startFollowing(app.selectedAircraft);
    });

    document.getElementById('cameraCockpit')?.addEventListener('click', () => {
        if (app.selectedAircraft) startCockpit(app.selectedAircraft);
    });

    // Overview button resets everything
    document.getElementById('cameraOverview')?.addEventListener('click', () => {
        // Stop all camera modes
        stopCameraModes();

        // Cancel any ongoing camera flights
        app.viewer.camera.cancelFlight();

        // Force immediate camera reset using setView (no animation)
        app.viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(27.43, 37.04, 200000),
            orientation: {
                heading: 0.0,
                pitch: -Cesium.Math.PI_OVER_TWO,
                roll: 0.0
            }
        });
    });

    setupFilterListeners();
}

/**
 * Setup Filter UI listeners
 */
function setupFilterListeners() {
    const minSlider = document.getElementById('altitudeMin');
    const maxSlider = document.getElementById('altitudeMax');
    const showAirports = document.getElementById('showAirports');
    const showTraces = document.getElementById('showTraces');
    const track = document.querySelector('.slider-track');

    function updateSliderTrack() {
        if (!minSlider || !maxSlider || !track) return;

        const minVal = parseInt(minSlider.value);
        const maxVal = parseInt(maxSlider.value);
        const maxLimit = parseInt(maxSlider.max);

        const minPercent = (minVal / maxLimit) * 100;
        const maxPercent = (maxVal / maxLimit) * 100;

        track.style.background = `linear-gradient(to right, 
            rgba(0,0,0,0.5) ${minPercent}%, 
            #00ff41 ${minPercent}%, 
            #00ff41 ${maxPercent}%, 
            rgba(0,0,0,0.5) ${maxPercent}%)`;
    }

    function handleSliderChange(e) {
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);

        // Prevent crossover
        if (minVal > maxVal - 1000) {
            if (e.target === minSlider) {
                minSlider.value = maxVal - 1000;
                minVal = maxVal - 1000;
            } else {
                maxSlider.value = minVal + 1000;
                maxVal = minVal + 1000;
            }
        }

        app.filters.minAltitude = minVal;
        app.filters.maxAltitude = maxVal;

        updateSliderTrack();

        // Debounce updates slightly
        if (app.filterTimeout) clearTimeout(app.filterTimeout);
        app.filterTimeout = setTimeout(() => {
            updateAircraftDisplay(); // Reprocess with new filters
        }, 100);
    }

    minSlider?.addEventListener('input', handleSliderChange);
    maxSlider?.addEventListener('input', handleSliderChange);

    // Initial track update
    updateSliderTrack();

    showAirports?.addEventListener('change', (e) => {
        app.filters.showAirports = e.target.checked;
        renderAirports();
    });

    showTraces?.addEventListener('change', (e) => {
        app.filters.showTraces = e.target.checked;
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
    console.log('Search query:', query);

    // Trigger display update immediately
    updateAircraftDisplay();
}

/**
 * Show aircraft details panel
 */
function showAircraftDetails(entity) {
    app.selectedAircraft = entity;

    const panel = document.getElementById('aircraftDetails');
    panel?.classList.remove('hidden');

    const isAirport = entity.properties && entity.properties.type && entity.properties.type.getValue() === 'airport';

    // UI Elements
    const titleEl = document.querySelector('.panel-title');
    const label1 = document.querySelectorAll('.data-label')[0];
    const value1 = document.getElementById('detailCallsign');
    const label2 = document.querySelectorAll('.data-label')[1];
    const value2 = document.getElementById('detailAltitude');
    const label3 = document.querySelectorAll('.data-label')[2];
    const value3 = document.getElementById('detailVelocity');
    const label4 = document.querySelectorAll('.data-label')[3];
    const value4 = document.getElementById('detailHeading');
    const label5 = document.querySelectorAll('.data-label')[4];
    const value5 = document.getElementById('detailOrigin');
    const followBtn = document.getElementById('followAircraft');

    if (isAirport) {
        // Airport Mode
        titleEl.textContent = 'AIRPORT DATA';

        label1.textContent = 'NAME:';
        value1.textContent = entity.properties.name.getValue();

        label2.textContent = 'ALTITUDE:';
        value2.textContent = `${Math.round(entity.position.getValue(app.viewer.clock.currentTime).z)} M`;

        label3.textContent = 'ICAO:';
        value3.textContent = entity.properties.icao.getValue();

        // Get lat/lon from cartesian
        const cartographic = Cesium.Cartographic.fromCartesian(entity.position.getValue(app.viewer.clock.currentTime));

        label4.textContent = 'LAT:';
        value4.textContent = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);

        label5.textContent = 'LON:';
        value5.textContent = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);

        // Hide Follow button (can't follow static object comfortably/sensibly yet)
        if (followBtn) followBtn.style.display = 'none';

    } else {
        // Aircraft Mode
        titleEl.textContent = 'AIRCRAFT DATA';

        label1.textContent = 'CALLSIGN:';
        value1.textContent = entity.properties.callsign || 'N/A';

        label2.textContent = 'ALTITUDE:';
        value2.textContent = `${entity.properties.altitude} FT`;

        label3.textContent = 'VELOCITY:';
        value3.textContent = `${entity.properties.velocity} KTS`;

        label4.textContent = 'HEADING:';
        value4.textContent = `${entity.properties.heading}°`;

        label5.textContent = 'ORIGIN:';
        value5.textContent = entity.properties.origin || 'N/A';

        // Show Follow button
        if (followBtn) followBtn.style.display = 'inline-block';
    }
}

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
        loadingScreen.classList.add('hidden');
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
