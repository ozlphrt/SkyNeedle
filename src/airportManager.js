import * as Cesium from 'cesium';

/**
 * Manages airport visualization including markers, labels, and runway surfaces.
 */
export class AirportManager {
    constructor(viewer, appFilters) {
        this.viewer = viewer;
        this.filters = appFilters; // Reference to app.filters (e.g. showAirports)

        // CLEANUP: Remove any existing data source with the same name to prevent duplicates (HMR/Reloads)
        const existingDS = this.viewer.dataSources.getByName('airport-data');
        if (existingDS && existingDS.length > 0) {
            console.log(`AirportManager: Found ${existingDS.length} existing data sources. Cleaning up...`);
            existingDS.forEach(ds => this.viewer.dataSources.remove(ds, true));
        }

        this.dataSource = new Cesium.CustomDataSource('airport-data');
        this.viewer.dataSources.add(this.dataSource);

        // Keep track of entities for updates if needed
        this.airportEntities = new Map();
    }

    /**
     * Clear all airport data
     */
    clear() {
        this.dataSource.entities.removeAll();
        this.airportEntities.clear();
    }

    /**
     * Load airport markers based on tiered data
     * @param {Object} airportsByTier - Data structure with tier1, tier2, tier3 arrays
     * @param {Array} hiddenIcaos - List of ICAOs to hide (optional)
     */
    loadAirports(airportsByTier, hiddenIcaos = []) {
        console.log('AirportManager: Loading airport markers...');

        // Configuration for tiers: [visibilityDist, labelDist]
        const tierConfig = {
            tier1: { markerDist: 50000000, labelDist: 2000000 }, // 50,000km, 2,000km
            tier2: { markerDist: 20000000, labelDist: 1000000 }, // 20,000km, 1,000km
            tier3: { markerDist: 5000000, labelDist: 500000 }    // 5,000km, 500km
        };

        let count = 0;

        Object.entries(airportsByTier).forEach(([tierName, airports]) => {
            const config = tierConfig[tierName];
            if (!config) return;

            airports.forEach(airport => {
                if (hiddenIcaos.includes(airport.icao)) return;

                this.createAirportEntity(airport, config.markerDist, config.labelDist);
                count++;
            });
        });

        console.log(`AirportManager: Loaded ${count} airport markers.`);
    }

    /**
     * Create a single airport entity
     */
    createAirportEntity(airport, markerDist, labelDist) {
        // STRICT 3D POSITIONING: Calculate exact Cartesian position including altitude
        // Adding a small buffer (50m) to ensure it sits slightly above generic terrain level 
        // to prevent z-fighting if terrain data is rough.
        const position = Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, (airport.alt || 0) + 50);

        // CREATE BULLSEYE CANVAS
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const cx = 32, cy = 32;
        const colorMain = '#00ff41'; // Cyber Green
        const colorWhite = '#ffffff';

        // Outer Ring
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.strokeStyle = colorMain;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner Dot
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = colorWhite;
        ctx.fill();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 10, cy);
        ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 10);
        ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy + 10);
        ctx.strokeStyle = colorMain;
        ctx.lineWidth = 1;
        ctx.stroke();

        const entity = this.dataSource.entities.add({
            id: `airport-${airport.icao}`,
            name: airport.name,
            position: position,
            properties: {
                type: 'airport',
                icao: airport.icao,
                name: airport.name
            },
            billboard: {
                image: canvas,
                scale: 0.6, // Smaller base size (was 1.0)
                // Start smaller (0.6), scale to 0.1 at distance
                // Near: 1.0 scale (at 10km)
                // Far: 0.1 scale (at 20,000km) - Tiny dot at global view
                scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.0, 2.0e7, 0.1),
                color: Cesium.Color.WHITE,
                // STRICT 3D POSITIONING: 'NONE' ensures the Billboard is treated as a standard 3D object
                // in the world, which guarantees it will be occluded by the globe (Earth) 
                // when it is on the other side. CLAMP_TO_GROUND can sometimes behave like an overlay.
                heightReference: Cesium.HeightReference.NONE,
                // Ensure the billboard has a defined position in 3D space
                position: Cesium.Cartesian3.fromDegrees(airport.lon, airport.lat, (airport.alt || 0) + 10), // +10m buffer
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, markerDist),
                show: new Cesium.CallbackProperty(() => this.filters.showAirports, false)
            },
            label: {
                text: airport.name,
                font: '12px Inter, sans-serif',
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                // Adjusted offset: Marker is now centered. Radius is ~19px (32 * 0.6). 
                // Need to clear that plus padding.
                pixelOffset: new Cesium.Cartesian2(0, -25),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, labelDist),
                show: new Cesium.CallbackProperty(() => this.filters.showAirports, false)
            }
        });

        this.airportEntities.set(airport.icao, entity);
    }

    /**
     * Load runway and taxiway detailed surfaces
     * @param {Object} detailsData - JSON object with ICAO keys and geometry data
     */
    loadSurfaces(detailsData) {
        console.log('AirportManager: Loading runway surfaces...');
        if (!detailsData) return;

        Object.entries(detailsData).forEach(([icao, details]) => {
            // Render Runways
            if (details.runways) {
                details.runways.forEach(feature => {
                    const positions = Cesium.Cartesian3.fromDegreesArray(feature.geometry.coordinates.flat());

                    this.dataSource.entities.add({
                        corridor: {
                            positions: positions,
                            width: 45.0,
                            material: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.3),
                            cornerType: Cesium.CornerType.MITERED,
                            height: 0,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            // Improve performance by distance culling
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000), // 1000km
                            show: new Cesium.CallbackProperty(() => this.filters.showAirports, false)
                        },
                        properties: {
                            type: 'airport-surface',
                            subtype: 'runway',
                            icao: icao
                        }
                    });
                });
            }

            // Render Taxiways
            if (details.taxiways) {
                details.taxiways.forEach(feature => {
                    const positions = Cesium.Cartesian3.fromDegreesArray(feature.geometry.coordinates.flat());

                    this.dataSource.entities.add({
                        corridor: {
                            positions: positions,
                            width: 20.0,
                            material: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.15),
                            cornerType: Cesium.CornerType.ROUNDED,
                            height: 0,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500000), // 500km capture
                            show: new Cesium.CallbackProperty(() => this.filters.showAirports, false)
                        },
                        properties: {
                            type: 'airport-surface',
                            subtype: 'taxiway',
                            icao: icao
                        }
                    });
                });
            }
        });

        console.log('AirportManager: Surfaces loaded.');
    }
}
