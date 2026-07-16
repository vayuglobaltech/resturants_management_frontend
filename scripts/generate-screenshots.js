const fs = require('fs');
const path = require('path');

// Create a simple PNG file using Buffer
function createPNG(width, height, color, text) {
    // Simple PNG header
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // Create a simple IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(8, 8); // bit depth
    ihdr.writeUInt8(2, 9); // color type (RGB)
    ihdr.writeUInt8(0, 10); // compression
    ihdr.writeUInt8(0, 11); // filter
    ihdr.writeUInt8(0, 12); // interlace
    
    // Create IDAT chunk with simple colored rectangle
    const dataSize = width * height * 3;
    const idatData = Buffer.alloc(dataSize);
    
    // Fill with color
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    for (let i = 0; i < dataSize; i += 3) {
        idatData[i] = r;
        idatData[i + 1] = g;
        idatData[i + 2] = b;
    }
    
    // Compress would be needed for real PNG, but we'll use a simpler approach
    // For now, let's use sharp which is already installed
    console.log('Please run the sharp-based script instead.');
}

// Use sharp to create screenshots
const sharp = require('sharp');

const screenshotsDir = 'public/screenshots';

// Create desktop screenshot (1280x720)
async function createDesktopScreenshot() {
    const svg = Buffer.from(`
        <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="1280" height="720" fill="#121110"/>
            
            <!-- Dashboard container -->
            <rect x="20" y="20" width="1240" height="680" rx="16" fill="#1C1A18" stroke="#D4A359" stroke-width="1"/>
            
            <!-- Sidebar -->
            <rect x="40" y="40" width="200" height="640" rx="12" fill="#23211F"/>
            <rect x="40" y="40" width="200" height="640" rx="12" fill="none" stroke="#D4A359" stroke-width="1" opacity="0.3"/>
            
            <!-- Title -->
            <text x="128" y="80" font-size="18" text-anchor="middle" fill="#D4A359" font-family="Arial" font-weight="bold">Restaurant</text>
            
            <!-- Sidebar items -->
            <rect x="55" y="110" width="170" height="36" rx="8" fill="#D4A359" opacity="0.1"/>
            <text x="140" y="133" font-size="14" text-anchor="middle" fill="#D4A359" font-family="Arial">Dashboard</text>
            
            <rect x="55" y="156" width="170" height="36" rx="8" fill="transparent"/>
            <text x="140" y="179" font-size="14" text-anchor="middle" fill="#666" font-family="Arial">Orders</text>
            
            <rect x="55" y="202" width="170" height="36" rx="8" fill="transparent"/>
            <text x="140" y="225" font-size="14" text-anchor="middle" fill="#666" font-family="Arial">Menu</text>
            
            <!-- Main content -->
            <rect x="260" y="60" width="980" height="180" rx="12" fill="#1C1A18" stroke="#333" stroke-width="1"/>
            <text x="400" y="110" font-size="24" fill="#D4A359" font-family="Arial" font-weight="bold">Welcome Back!</text>
            <text x="400" y="145" font-size="14" fill="#666" font-family="Arial">You have 5 active orders today</text>
            
            <!-- Stats cards -->
            <rect x="260" y="260" width="230" height="100" rx="12" fill="#1C1A18" stroke="#333" stroke-width="1"/>
            <text x="375" y="300" font-size="28" text-anchor="middle" fill="#D4A359" font-family="Arial" font-weight="bold">$1,234</text>
            <text x="375" y="325" font-size="12" text-anchor="middle" fill="#666" font-family="Arial">Today's Revenue</text>
            
            <rect x="510" y="260" width="230" height="100" rx="12" fill="#1C1A18" stroke="#333" stroke-width="1"/>
            <text x="625" y="300" font-size="28" text-anchor="middle" fill="#D4A359" font-family="Arial" font-weight="bold">42</text>
            <text x="625" y="325" font-size="12" text-anchor="middle" fill="#666" font-family="Arial">Total Orders</text>
            
            <rect x="760" y="260" width="230" height="100" rx="12" fill="#1C1A18" stroke="#333" stroke-width="1"/>
            <text x="875" y="300" font-size="28" text-anchor="middle" fill="#D4A359" font-family="Arial" font-weight="bold">8</text>
            <text x="875" y="325" font-size="12" text-anchor="middle" fill="#666" font-family="Arial">Active Tables</text>
        </svg>
    `);
    
    await sharp(svg)
        .png()
        .toFile(path.join(screenshotsDir, 'desktop-wide.png'));
    console.log('✅ Created desktop-wide.png (1280x720)');
}

// Create mobile screenshot (750x1334)
async function createMobileScreenshot() {
    const svg = Buffer.from(`
        <svg width="750" height="1334" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="750" height="1334" fill="#121110"/>
            
            <!-- Phone frame -->
            <rect x="20" y="20" width="710" height="1294" rx="30" fill="#1C1A18" stroke="#D4A359" stroke-width="1"/>
            
            <!-- Status bar -->
            <rect x="40" y="40" width="670" height="40" rx="20" fill="#23211F"/>
            <text x="375" y="65" font-size="14" text-anchor="middle" fill="#666" font-family="Arial">Restaurant</text>
            <circle cx="680" cy="60" r="10" fill="#D4A359" opacity="0.3"/>
            
            <!-- Header -->
            <text x="70" y="130" font-size="24" fill="#D4A359" font-family="Arial" font-weight="bold">Dashboard</text>
            
            <!-- Stats cards -->
            <rect x="40" y="160" width="670" height="100" rx="16" fill="#23211F" stroke="#333" stroke-width="1"/>
            <text x="375" y="200" font-size="32" text-anchor="middle" fill="#D4A359" font-family="Arial" font-weight="bold">$1,234</text>
            <text x="375" y="230" font-size="14" text-anchor="middle" fill="#666" font-family="Arial">Today's Revenue</text>
            
            <rect x="40" y="280" width="320" height="100" rx="16" fill="#23211F" stroke="#333" stroke-width="1"/>
            <text x="200" y="320" font-size="32" text-anchor="middle" fill="#D4A359" font-family="Arial" font-weight="bold">42</text>
            <text x="200" y="350" font-size="14" text-anchor="middle" fill="#666" font-family="Arial">Orders</text>
            
            <rect x="390" y="280" width="320" height="100" rx="16" fill="#23211F" stroke="#333" stroke-width="1"/>
            <text x="550" y="320" font-size="32" text-anchor="middle" fill="#D4A359" font-family="Arial" font-weight="bold">8</text>
            <text x="550" y="350" font-size="14" text-anchor="middle" fill="#666" font-family="Arial">Tables</text>
            
            <!-- Recent orders -->
            <text x="60" y="430" font-size="18" fill="#D4A359" font-family="Arial" font-weight="bold">Recent Orders</text>
            
            <rect x="40" y="460" width="670" height="60" rx="12" fill="#23211F" stroke="#333" stroke-width="1"/>
            <text x="70" y="490" font-size="14" fill="#fff" font-family="Arial">#ORD-001 - Table 4</text>
            <text x="600" y="490" font-size="14" fill="#D4A359" font-family="Arial">$45.00</text>
            
            <rect x="40" y="530" width="670" height="60" rx="12" fill="#23211F" stroke="#333" stroke-width="1"/>
            <text x="70" y="560" font-size="14" fill="#fff" font-family="Arial">#ORD-002 - Table 2</text>
            <text x="600" y="560" font-size="14" fill="#D4A359" font-family="Arial">$32.50</text>
            
            <rect x="40" y="600" width="670" height="60" rx="12" fill="#23211F" stroke="#333" stroke-width="1"/>
            <text x="70" y="630" font-size="14" fill="#fff" font-family="Arial">#ORD-003 - Table 6</text>
            <text x="600" y="630" font-size="14" fill="#D4A359" font-family="Arial">$78.00</text>
            
            <!-- Bottom navigation -->
            <rect x="40" y="1260" width="670" height="44" rx="22" fill="#23211F"/>
            <circle cx="180" cy="1282" r="8" fill="#D4A359"/>
            <circle cx="375" cy="1282" r="8" fill="#666"/>
            <circle cx="570" cy="1282" r="8" fill="#666"/>
        </svg>
    `);
    
    await sharp(svg)
        .png()
        .toFile(path.join(screenshotsDir, 'mobile-narrow.png'));
    console.log('✅ Created mobile-narrow.png (750x1334)');
}

// Run both functions
async function generateAll() {
    try {
        await createDesktopScreenshot();
        await createMobileScreenshot();
        console.log('✅ All screenshots created successfully!');
    } catch (err) {
        console.error('❌ Error creating screenshots:', err);
    }
}

generateAll();
