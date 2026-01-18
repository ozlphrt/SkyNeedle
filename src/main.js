/**
 * SkyNeedle - Main Application Entry Point
 * 3D Flight Tracking PWA
 */

import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Configuration
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3N2VmNjQ5YS00MzNiLTRjODUtYTYwMS1hZjIwOGM3YWFkMDUiLCJpZCI6MzgwMzQwLCJpYXQiOjE3Njg3NDA5ODB9.ILdx02CrRUguqA-msX6n5l9-NRFuF6oHPGtqlgabJB4';
const OPENSKY_USERNAME = ''; // Optional: Add OpenSky credentials
const OPENSKY_PASSWORD = ''; // Optional: Add OpenSky credentials

// Set Cesium Ion token
Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

// Application state
const app = {
    viewer: null,
    selectedAircraft: null,
    aircraftEntities: new Map(),
    updateInterval: null
};

/**
 * Initialize Cesium Viewer
 */
function initCesiumViewer() {
    console.log('Initializing Cesium viewer...');

    app.viewer = new Cesium.Viewer('cesiumContainer', {
        // Terrain and imagery
        terrainProvider: Cesium.createWorldTerrain(),
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 3954 }), // Dark imagery

        // Disable default UI
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,

        // Scene settings
        skyBox: new Cesium.SkyBox({
            sources: {
                positiveX: '',
                negativeX: '',
                positiveY: '',
                negativeY: '',
                positiveZ: '',
                negativeZ: ''
            }
        }),
        skyAtmosphere: false,

        // Performance
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity
    });

    // Configure scene
    const scene = app.viewer.scene;
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0e14');
    scene.backgroundColor = Cesium.Color.fromCssColorString('#000000');
    scene.globe.enableLighting = false;

    // Set initial camera position (over North America)
    app.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 5000000),
        orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0.0
        }
    });

    console.log('Cesium viewer initialized');
}

/**
 * Fetch aircraft data from OpenSky Network
 */
async function fetchAircraftData(bounds = null) {
    try {
        // Default to North America if no bounds specified
        const bbox = bounds || {
            lamin: 25.0,  // South
            lamax: 50.0,  // North
            lomin: -125.0, // West
            lomax: -65.0   // East
        };

        const url = `https://opensky-network.org/api/states/all?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;

        const response = await fetch(url, {
            headers: OPENSKY_USERNAME ? {
                'Authorization': 'Basic ' + btoa(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`)
            } : {}
        });

        if (!response.ok) {
            throw new Error(`OpenSky API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Fetched ${data.states?.length || 0} aircraft`);

        return data.states || [];
    } catch (error) {
        console.error('Error fetching aircraft data:', error);
        updateStatus('ERROR: API UNAVAILABLE', true);
        return [];
    }
}

/**
 * Update aircraft visualization
 */
function updateAircraftDisplay(aircraftData) {
    if (!app.viewer) return;

    const entities = app.viewer.entities;
    const currentIds = new Set();

    aircraftData.forEach(state => {
        const [
            icao24, callsign, origin_country, time_position, last_contact,
            longitude, latitude, baro_altitude, on_ground, velocity,
            true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source
        ] = state;

        // Skip aircraft without position data or on ground
        if (!longitude || !latitude || on_ground) return;

        const id = icao24;
        currentIds.add(id);

        const altitude = (baro_altitude || geo_altitude || 0) * 0.3048; // Convert feet to meters

        // Create or update entity
        let entity = entities.getById(id);

        if (!entity) {
            entity = entities.add({
                id: id,
                position: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
                point: {
                    pixelSize: 8,
                    color: Cesium.Color.fromCssColorString('#00ff41'),
                    outlineColor: Cesium.Color.fromCssColorString('#00d4ff'),
                    outlineWidth: 2
                },
                label: {
                    text: callsign?.trim() || icao24,
                    font: '12px JetBrains Mono',
                    fillColor: Cesium.Color.fromCssColorString('#00ff41'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -15),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                properties: {
                    callsign: callsign?.trim() || 'N/A',
                    altitude: Math.round(baro_altitude || geo_altitude || 0),
                    velocity: Math.round(velocity || 0),
                    heading: Math.round(true_track || 0),
                    origin: origin_country
                }
            });
        } else {
            // Update position
            entity.position = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
            entity.label.text = callsign?.trim() || icao24;
            entity.properties.altitude = Math.round(baro_altitude || geo_altitude || 0);
            entity.properties.velocity = Math.round(velocity || 0);
            entity.properties.heading = Math.round(true_track || 0);
        }
    });

    // Remove aircraft that are no longer in the data
    const allEntities = entities.values;
    for (let i = allEntities.length - 1; i >= 0; i--) {
        const entity = allEntities[i];
        if (!currentIds.has(entity.id)) {
            entities.remove(entity);
        }
    }

    updateStatus(`TRACKING ${currentIds.size} AIRCRAFT`);
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
    document.getElementById('cameraOverview')?.addEventListener('click', () => {
        app.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 5000000),
            duration: 2
        });
    });

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
}

/**
 * Handle search input
 */
function handleSearch(event) {
    const query = event.target.value.trim().toUpperCase();
    console.log('Search query:', query);
    // TODO: Implement search functionality
}

/**
 * Show aircraft details panel
 */
function showAircraftDetails(entity) {
    app.selectedAircraft = entity;

    const panel = document.getElementById('aircraftDetails');
    panel?.classList.remove('hidden');

    document.getElementById('detailCallsign').textContent = entity.properties.callsign || 'N/A';
    document.getElementById('detailAltitude').textContent = `${entity.properties.altitude} FT`;
    document.getElementById('detailVelocity').textContent = `${entity.properties.velocity} KTS`;
    document.getElementById('detailHeading').textContent = `${entity.properties.heading}°`;
    document.getElementById('detailOrigin').textContent = entity.properties.origin || 'N/A';
}

/**
 * Start data update loop
 */
function startDataLoop() {
    // Initial fetch
    fetchAircraftData().then(updateAircraftDisplay);

    // Update every 15 seconds
    app.updateInterval = setInterval(async () => {
        const data = await fetchAircraftData();
        updateAircraftDisplay(data);
    }, 15000);
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
 * Initialize application
 */
async function init() {
    try {
        updateStatus('INITIALIZING');

        // Initialize Cesium
        initCesiumViewer();

        // Setup UI
        setupEventListeners();

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
