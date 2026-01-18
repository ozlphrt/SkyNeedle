import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Configure environment variables
dotenv.config();

const username = process.env.VITE_OPENSKY_USERNAME;
const password = process.env.VITE_OPENSKY_PASSWORD;

console.log('Testing OpenSky API Connection...');
console.log('--------------------------------');

// Test 1: Anonymous
console.log('\n1. Testing Anonymous Access...');
try {
    const response = await fetch('https://opensky-network.org/api/states/all?lamin=25&lomin=-125&lamax=50&lomax=-65');
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
        const data = await response.json();
        console.log(`Success! Retrieved ${data.states ? data.states.length : 0} aircraft.`);
    } else {
        const text = await response.text();
        console.log('Response:', text);
    }
} catch (error) {
    console.error('Anonymous test failed:', error.message);
}

// Test 2: Authenticated (if credentials exist)
if (username && password) {
    console.log(`\n2. Testing Authenticated Access (User: ${username})...`);
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    try {
        const response = await fetch('https://opensky-network.org/api/states/all?lamin=45.8389&lomin=5.9962&lamax=47.8229&lomax=10.5226', {
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`Success! Retrieved ${data.states ? data.states.length : 0} aircraft.`);
        } else {
            const text = await response.text();
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('Authenticated test failed:', error.message);
    }
} else {
    console.log('\n2. Skipping Authenticated Test (No credentials found in .env)');
}
