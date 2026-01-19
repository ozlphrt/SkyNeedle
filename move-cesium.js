import fs from 'fs';
import path from 'path';

const distPath = 'dist';
const srcPath = path.join(distPath, 'SkyNeedle', 'cesium');
const destPath = path.join(distPath, 'cesium');

console.log(`Moving Cesium assets from ${srcPath} to ${destPath}...`);

if (fs.existsSync(srcPath)) {
    // Ensure destination doesn't exist or handled?
    // In Node, rename directory works.
    try {
        fs.renameSync(srcPath, destPath);
        console.log('Success: Cesium assets moved.');

        // Clean up empty SkyNeedle folder
        const parentFolder = path.join(distPath, 'SkyNeedle');
        if (fs.readdirSync(parentFolder).length === 0) {
            fs.rmdirSync(parentFolder);
            console.log('Cleaned up empty ' + parentFolder);
        }
    } catch (err) {
        console.error('Error moving files:', err);
        process.exit(1);
    }
} else {
    console.log('Source path does not exist. Skipping move.');
    // Check if it's already in dest?
    if (fs.existsSync(destPath)) {
        console.log('Destination already exists. Assuming correct structure.');
    } else {
        console.warn('WARNING: Cesium assets missing entirely!');
    }
}
