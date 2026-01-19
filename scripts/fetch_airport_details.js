
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Airports list with coordinates for efficient spatial querying
const AIRPORTS = [
    { name: 'Istanbul Airport', icao: 'LTFM', lat: 41.275, lon: 28.751 },
    { name: 'Sabiha Gokcen', icao: 'LTFJ', lat: 40.898, lon: 29.309 },
    { name: 'Ankara Esenboga', icao: 'LTAC', lat: 40.128, lon: 32.995 },
    { name: 'Izmir Adnan Menderes', icao: 'LTBJ', lat: 38.292, lon: 27.157 },
    { name: 'Antalya Airport', icao: 'LTAI', lat: 36.899, lon: 30.801 },
    { name: 'Milas-Bodrum', icao: 'LTFE', lat: 37.250, lon: 27.664 },
    { name: 'Dalaman Airport', icao: 'LTBS', lat: 36.716, lon: 28.791 },
    { name: 'Adana Sakirpasa', icao: 'LTAF', lat: 36.982, lon: 35.280 },
    { name: 'Trabzon Airport', icao: 'LTCG', lat: 40.995, lon: 39.789 },
    { name: 'JFK International', icao: 'KJFK', lat: 40.641, lon: -73.778 },
    { name: 'Heathrow Airport', icao: 'EGLL', lat: 51.470, lon: -0.454 },
    { name: 'Frankfurt Airport', icao: 'EDDF', lat: 50.037, lon: 8.562 },
    { name: 'Dubai International', icao: 'OMDB', lat: 25.253, lon: 55.365 }
];

const OUTPUT_FILE = path.join(__dirname, '../public/assets/airport_details.json');

// Overpass API URL
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFromOverpass(query) {
    return new Promise((resolve, reject) => {
        const url = `${OVERPASS_API}?data=${encodeURIComponent(query)}`;

        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status Code: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
    });
}

async function fetchAirportData(airport) {
    console.log(`Fetching data for ${airport.icao} (${airport.lat}, ${airport.lon})...`);

    // Efficient approach:
    // Query for runways and taxiways within a fixed radius (e.g., 5km) of the known center.
    // This looks for ways with aeroway=runway OR aeroway=taxiway.

    // We increase timeout and use a simpler bbox-like around query
    const query = `
        [out:json][timeout:30];
        (
          way(around:5000,${airport.lat},${airport.lon})["aeroway"="runway"];
          way(around:5000,${airport.lat},${airport.lon})["aeroway"="taxiway"];
        );
        (._;>;);
        out body;
    `;

    return fetchFromOverpass(query);
}

// Convert Overpass JSON to a simplified GeoJSON-like structure
function processOverpassData(data) {
    const nodes = new Map();
    data.elements.filter(e => e.type === 'node').forEach(node => {
        nodes.set(node.id, [node.lon, node.lat]);
    });

    const runways = [];
    const taxiways = [];

    data.elements.filter(e => e.type === 'way').forEach(way => {
        if (!way.nodes || way.nodes.length === 0) return;

        const coordinates = way.nodes.map(id => nodes.get(id)).filter(c => c);

        // Skip if not enough points
        if (coordinates.length < 2) return;

        const feature = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: coordinates
            },
            properties: way.tags || {}
        };

        if (way.tags?.aeroway === 'runway') {
            runways.push(feature);
        } else if (way.tags?.aeroway === 'taxiway') {
            taxiways.push(feature);
        }
    });

    return { runways, taxiways };
}

async function main() {
    const allData = {};

    console.log(`Starting fetch for ${AIRPORTS.length} airports...`);

    // Create directory if it doesn't exist
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Keep existing data if file exists, so we don't lose successful fetches if we restart
    // No, let's start fresh to ensure consistency, OR better yet:
    // If we have data, we could just re-fetch missing ones... 
    // But for now, let's just re-fetch all with the BETTER query.

    for (const airport of AIRPORTS) {
        try {
            const rawData = await fetchAirportData(airport);
            if (rawData.elements && rawData.elements.length > 0) {
                const processed = processOverpassData(rawData);
                allData[airport.icao] = processed;
                console.log(`  > ${airport.icao}: Found ${processed.runways.length} runways, ${processed.taxiways.length} taxiways.`);
            } else {
                console.warn(`  ! ${airport.icao}: No data found.`);
            }
        } catch (err) {
            console.error(`  ! ${airport.icao}: Error fetching -`, err.message);
        }

        // Be nice to the API - Increased delay directly to avoid 429s
        await sleep(5000);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allData));
    console.log(`\nWritten data to ${OUTPUT_FILE}`);
}

main();
