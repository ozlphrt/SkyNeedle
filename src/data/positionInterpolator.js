/**
 * SkyNeedle - Position Interpolation Module
 * Handles aircraft position prediction and smooth interpolation
 */

import * as Cesium from 'cesium';

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
export function predictPosition(longitude, latitude, altitude, velocity, heading, verticalRate, seconds) {
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
 * @param {object} viewer - Cesium viewer instance
 * @returns {SampledPositionProperty} Position property with interpolation
 */
export function createInterpolatedPosition(entity, longitude, latitude, altitude, velocity, heading, verticalRate, viewer) {
    // Use viewer clock time to ensure synchronization with the scene
    const currentTime = viewer ? viewer.clock.currentTime : Cesium.JulianDate.now();
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
