/**
 * SkyNeedle - Utility Helper Functions
 * Common utility functions used throughout the application
 */

/**
 * Get airliner name from ICAO callsign
 * @param {string} callsign - Aircraft ICAO callsign
 * @param {object} ICAO_AIRLINES - Airline lookup object
 * @returns {string} Airline name
 */
export function getAirlinerFromCallsign(callsign, ICAO_AIRLINES) {
    if (!callsign) return 'GENERAL AVIATION';
    const code = callsign.substring(0, 3).trim();
    return ICAO_AIRLINES[code]?.name || 'PRIVATE/CHARTER';
}

/**
 * Get IATA flight number from ICAO callsign
 * e.g., THY123 -> TK 123
 * @param {string} callsign - Aircraft ICAO callsign
 * @param {object} ICAO_AIRLINES - Airline lookup object
 * @returns {string} IATA flight number
 */
export function getFlightNumberFromCallsign(callsign, ICAO_AIRLINES) {
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
 * Check if camera viewport bounds have changed significantly
 * @param {object} oldBounds - Previous bounds {lamin, lamax, lomin, lomax}
 * @param {object} newBounds - New bounds {lamin, lamax, lomin, lomax}
 * @returns {boolean} True if bounds changed significantly
 */
export function boundsChangedSignificantly(oldBounds, newBounds) {
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
 * Hide the loading screen with fade-out animation
 */
export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}
