/**
 * SkyNeedle - Cesium Viewer Initialization
 * Handles Cesium viewer setup and configuration
 */

import * as Cesium from 'cesium';

/**
 * Initialize Cesium Viewer with custom settings
 * @param {string} containerId - ID of the container element
 * @param {object} callbacks - Callback functions {updateCamera, createSelectionBracket, initializeAirports, loadRunwaySurfaces}
 * @param {object} app - Application state object
 * @returns {Promise<Cesium.Viewer>} Initialized Cesium viewer
 */
export async function initCesiumViewer(containerId, callbacks, app) {
    console.log('Initializing Cesium viewer...');

    const viewer = new Cesium.Viewer(containerId, {
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

        // Performance - requestRenderMode disabled for smoother animations of moving objects
        requestRenderMode: false,
        maximumRenderTimeChange: Infinity
    });

    // Configure Camera Controller for Smoother, "Heavier" Feel
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableCollisionDetection = true;

    // Increase inertia to add "weight" to camera movements
    controller.inertiaSpin = 0.95;
    controller.inertiaTranslate = 0.95;
    controller.inertiaZoom = 0.95;

    // Smoother zoom responses
    controller.zoomEventTypes = [
        Cesium.CameraEventType.MIDDLE_DRAG,
        Cesium.CameraEventType.WHEEL,
        Cesium.CameraEventType.PINCH
    ];
    controller.zoomFactor = 3.0; // Less jumpy zoom (default is 5.0)
    controller.minimumZoomDistance = 50; // Prevent clipping into ground models
    controller.maximumZoomDistance = 30000000;

    // Ensure animation is enabled for aircraft movement
    viewer.clock.shouldAnimate = true;
    viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;

    // Configure scene
    const scene = viewer.scene;
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0e14');
    scene.backgroundColor = Cesium.Color.fromCssColorString('#000000');
    scene.globe.enableLighting = false; // Disable sun lighting on globe

    // Initialize Geocoder Service
    const geocoder = new Cesium.IonGeocoderService({ scene: scene });

    // FIX LIGHTING: Add a fixed directional light for 3D models (like the aircraft)
    scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(0.0, 0.0, -1.0), // Illuminating straight down
        intensity: 2.0
    });

    // Set initial camera position (over Bodrum, Turkey)
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(27.43, 37.04, 200000),
        orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0.0
        }
    });

    // Hook into the render loop for camera updates
    if (callbacks.updateCamera) {
        viewer.scene.preUpdate.addEventListener(callbacks.updateCamera);
    }

    // Initialize Selection Bracket
    if (callbacks.createSelectionBracket) {
        callbacks.createSelectionBracket();
    }

    // Initialize Airports
    if (callbacks.initializeAirports) {
        callbacks.initializeAirports();
    }

    // Load Runway and Taxiway Details
    if (callbacks.loadRunwaySurfaces) {
        callbacks.loadRunwaySurfaces(viewer, app);
    }

    console.log('Cesium viewer initialized');

    return { viewer, geocoder };
}

/**
 * Get current camera viewport bounds
 * @param {Cesium.Viewer} viewer - Cesium viewer instance
 * @returns {object|null} Bounds {lamin, lamax, lomin, lomax} or null if too far out
 */
export function getCameraViewportBounds(viewer) {
    if (!viewer) return null;

    const camera = viewer.camera;
    const canvas = viewer.scene.canvas;
    const ellipsoid = viewer.scene.globe.ellipsoid;

    // Get corners of the viewport
    const corners = [
        new Cesium.Cartesian2(0, 0), // Top-left
        new Cesium.Cartesian2(canvas.clientWidth, 0), // Top-right
        new Cesium.Cartesian2(0, canvas.clientHeight), // Bottom-left
        new Cesium.Cartesian2(canvas.clientWidth, canvas.clientHeight) // Bottom-right
    ];

    const positions = corners.map(corner => {
        const ray = camera.getPickRay(corner);
        const position = viewer.scene.globe.pick(ray, viewer.scene);
        if (position) {
            return ellipsoid.cartesianToCartographic(position);
        }
        return null;
    }).filter(pos => pos !== null);

    // If we can't see the ground (too far out), return null
    if (positions.length === 0) {
        return null;
    }

    // Calculate bounding box
    const lats = positions.map(pos => Cesium.Math.toDegrees(pos.latitude));
    const lons = positions.map(pos => Cesium.Math.toDegrees(pos.longitude));

    return {
        lamin: Math.min(...lats),
        lamax: Math.max(...lats),
        lomin: Math.min(...lons),
        lomax: Math.max(...lons)
    };
}
