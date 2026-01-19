/**
 * Fetch airport details JSON
 */
export async function fetchAirportDetails() {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}assets/airport_details.json`);
        if (!response.ok) throw new Error('Failed to load airport details');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetching airport details:', error);
        return null;
    }
}

/**
 * Load and render runway/taxiway surfaces
 * and upgrade airport labels to 3D blocks on the main runway.
 * @param {Cesium.Viewer} viewer The Cesium viewer instance
//  * @param {Object} app The global app object containing filter state
 * @param {Object} data The airport details data (optional, fetched if not provided)
 */
export async function loadRunwaySurfaces(viewer, app, data = null) {
    console.log('Loading airport surfaces...');
    try {
        if (!data) {
            data = await fetchAirportDetails();
        }

        if (!data) return;

        // Create a data source for airport surfaces
        const dataSource = new Cesium.CustomDataSource('airport-surfaces');
        viewer.dataSources.add(dataSource);

        Object.entries(data).forEach(([icao, details]) => {
            let longestRunway = null;
            let maxLength = 0;

            // Render Runways
            if (details.runways) {
                details.runways.forEach(feature => {
                    const diffCoords = feature.geometry.coordinates;
                    // Flatten coordinates for Cesium
                    const positions = diffCoords.flat();
                    const cartesians = Cesium.Cartesian3.fromDegreesArray(positions);

                    dataSource.entities.add({
                        corridor: {
                            positions: cartesians,
                            width: 45.0, // 45 meters wide
                            material: Cesium.Color.fromCssColorString('#00ff41').withAlpha(0.3), // Cyber Green
                            cornerType: Cesium.CornerType.MITERED,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            // Only show when camera is relatively close (200km)
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 200000)
                        },
                        // Add metadata for click interaction
                        properties: {
                            type: 'airport',
                            icao: icao,
                            name: `Airport ${icao}`
                        }
                    });

                    // Calculate length to find the main runway
                    let length = 0;
                    for (let i = 0; i < cartesians.length - 1; i++) {
                        length += Cesium.Cartesian3.distance(cartesians[i], cartesians[i + 1]);
                    }

                    if (length > maxLength) {
                        maxLength = length;
                        longestRunway = cartesians;
                    }
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
                        },
                        // Add metadata for click interaction
                        properties: {
                            type: 'airport',
                            icao: icao,
                            name: `Airport ${icao}`
                        }
                    });
                });
            }

            // Upgrade the existing airport marker if we found a main runway
            if (longestRunway) {
                const airportEntity = viewer.entities.getById(`airport-${icao}`);
                if (airportEntity) {
                    console.log(`[SkyNeedle] Upgrading airport ${icao} - Hiding generic label/pin`);
                    // Calculate center of the longest runway
                    const p1 = longestRunway[0];
                    const p2 = longestRunway[longestRunway.length - 1];
                    const center = Cesium.Cartesian3.midpoint(p1, p2, new Cesium.Cartesian3());

                    // Move entity
                    airportEntity.position = center;

                    // HIDE VISUALS?
                    // User requested to KEEP the white dot and label even with overlays.
                    // So we removed the lines hiding point and label.
                    if (airportEntity.billboard) airportEntity.billboard.show = false; // Legacy cleanup
                } else {
                    console.warn(`[SkyNeedle] Airport entity 'airport-${icao}' not found in viewer entities`);
                }
            } else {
                console.log(`[SkyNeedle] No main runway found for ${icao}, generic label remains visible`);
            }
        });

        console.log('✅ Airport surfaces loaded and labels updated');

    } catch (error) {
        console.error('❌ Error loading airport details:', error);
    }
}
