import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const wrongDir = path.join(distDir, 'SkyNeedle');
const wrongCesiumDir = path.join(wrongDir, 'cesium');
const targetCesiumDir = path.join(distDir, 'cesium');

console.log('Fixing Cesium build path...');

if (fs.existsSync(wrongCesiumDir)) {
    console.log(`Found Cesium in wrong location: ${wrongCesiumDir}`);

    // Rename/Move
    try {
        if (fs.existsSync(targetCesiumDir)) {
            console.log('Target cesium directory already exists, removing it first.');
            fs.rmSync(targetCesiumDir, { recursive: true, force: true });
        }

        fs.renameSync(wrongCesiumDir, targetCesiumDir);
        console.log(`Moved to: ${targetCesiumDir}`);

        // Clean up empty SkyNeedle dir
        if (fs.readdirSync(wrongDir).length === 0) {
            fs.rmdirSync(wrongDir);
            console.log('Removed empty SkyNeedle directory.');
        } else {
            console.log('SkyNeedle directory not empty, leaving it.');
        }

    } catch (err) {
        console.error('Error moving Cesium files:', err);
        process.exit(1);
    }
} else {
    console.log('Cesium files not found in expected wrong location. Checking correct location...');
    if (fs.existsSync(targetCesiumDir)) {
        console.log('Cesium files already in correct location.');
    } else {
        console.error('Cesium files not found in dist!');
        // Don't fail the build, maybe it's fine? No, it's an error.
        process.exit(1);
    }
}

console.log('Build fix complete.');
