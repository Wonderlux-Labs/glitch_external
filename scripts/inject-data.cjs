#!/usr/bin/env node

/**
 * Data Injection Script for Static GlitchCube Map
 * 
 * Safely injects JSON data into HTML template, replacing the problematic sed commands.
 * Handles special characters, escaping, and error cases gracefully.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEMPLATE_FILE = 'static-template.html';
const OUTPUT_FILE = 'index.html';
const LOCATION_FILE = 'location.json';
const LANDMARKS_FILE = 'landmarks.json';
const INJECTION_MARKER = '<!--DATA_INJECTION_POINT-->';

/**
 * Safely escape JSON for embedding in JavaScript
 */
function escapeJsonForJs(jsonData) {
  return JSON.stringify(jsonData)
    .replace(/\\/g, '\\\\')   // Escape backslashes
    .replace(/'/g, "\\'")     // Escape single quotes
    .replace(/"/g, '\\"')     // Escape double quotes
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '\\r')    // Escape carriage returns
    .replace(/\t/g, '\\t');   // Escape tabs
}

/**
 * Read and parse JSON file with error handling
 */
function readJsonFile(filename) {
  try {
    const content = fs.readFileSync(filename, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading ${filename}:`, error.message);
    return null;
  }
}

/**
 * Generate the data injection script
 */
function generateInjectionScript(locationData, landmarksData) {
  const timestamp = new Date().toISOString();
  
  return `<script>
// Static data injected at build time: ${timestamp}
window.CUBE_LOCATION = ${escapeJsonForJs(locationData)};
window.LANDMARKS_DATA = ${escapeJsonForJs(landmarksData)};
window.LAST_UPDATE = "${timestamp}";
window.STATIC_MODE = true;
window.BUILD_TIMESTAMP = "${timestamp}";

// Validate injected data
try {
  if (window.CUBE_LOCATION && typeof window.CUBE_LOCATION === 'object') {
    console.log('✅ Static location data loaded successfully');
  } else {
    console.warn('⚠️ Invalid location data format');
  }
  
  if (window.LANDMARKS_DATA && Array.isArray(window.LANDMARKS_DATA.landmarks)) {
    console.log(\`✅ Static landmarks data loaded (\${window.LANDMARKS_DATA.landmarks.length} landmarks)\`);
  } else {
    console.warn('⚠️ Invalid landmarks data format');
  }
} catch (error) {
  console.error('❌ Error validating injected data:', error);
}
</script>`;
}

/**
 * Create fallback data when real data is unavailable
 */
function createFallbackData() {
  const fallbackLocation = {
    lat: 40.7864,
    lng: -119.2065,
    timestamp: new Date().toISOString(),
    source: "fallback",
    zone: "center_camp", 
    address: "Center Camp (Demo Mode)",
    intersection: {
      radial: "6:00",
      arc: "Esplanade",
      radial_distance: 0,
      arc_distance: 0
    },
    landmarks: [
      {
        name: "Center Camp",
        type: "center_camp",
        distance_meters: 0.0
      }
    ],
    within_fence: true,
    distance_from_man: "2400 feet",
    lat_lng: {
      lat: 40.7864,
      lng: -119.2065
    },
    error: "Using fallback data - API unavailable at build time"
  };

  const fallbackLandmarks = {
    source: "Fallback demo data",
    generated_at: new Date().toISOString(),
    count: 3,
    landmarks: [
      {
        name: "The Man",
        lat: 40.78696344894566,
        lng: -119.20300709606865,
        type: "center",
        icon: "🔥",
        radius: 20,
        context: "Near The Man 🔥"
      },
      {
        name: "The Temple", 
        lat: 40.79181515231499,
        lng: -119.19662192527863,
        type: "sacred",
        icon: "🏛️",
        radius: 20,
        context: "Approaching The Temple 🏛️"
      },
      {
        name: "Center Camp",
        lat: 40.78108859485657,
        lng: -119.21073542116683,
        type: "gathering",
        icon: "🏕️", 
        radius: 50,
        context: "At Center Camp 🏕️"
      }
    ]
  };

  return { fallbackLocation, fallbackLandmarks };
}

/**
 * Main execution
 */
function main() {
  console.log('🎲 GlitchCube Static Data Injection');
  console.log('====================================');

  // Read input files
  console.log('📖 Reading input files...');
  
  let locationData = readJsonFile(LOCATION_FILE);
  let landmarksData = readJsonFile(LANDMARKS_FILE);
  
  // Create fallback data if needed
  if (!locationData || !landmarksData) {
    console.log('⚠️ Missing data files, using fallback data');
    const { fallbackLocation, fallbackLandmarks } = createFallbackData();
    
    if (!locationData) {
      locationData = fallbackLocation;
    }
    if (!landmarksData) {
      landmarksData = fallbackLandmarks;
    }
  }
  
  // Read template
  console.log('📄 Reading template file...');
  let template;
  try {
    template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading template file ${TEMPLATE_FILE}:`, error.message);
    process.exit(1);
  }
  
  // Generate injection script
  console.log('⚡ Generating data injection script...');
  const injectionScript = generateInjectionScript(locationData, landmarksData);
  
  // Inject data into template
  console.log('💉 Injecting data into template...');
  const outputHtml = template.replace(INJECTION_MARKER, injectionScript);
  
  // Verify injection worked
  if (outputHtml === template) {
    console.error(`❌ Error: Injection marker "${INJECTION_MARKER}" not found in template`);
    process.exit(1);
  }
  
  // Write output file
  console.log('💾 Writing output file...');
  try {
    fs.writeFileSync(OUTPUT_FILE, outputHtml, 'utf8');
  } catch (error) {
    console.error(`❌ Error writing output file ${OUTPUT_FILE}:`, error.message);
    process.exit(1);
  }
  
  // Success!
  console.log('✅ Data injection completed successfully!');
  console.log(`📊 Location: ${locationData.address || 'Unknown'} (${locationData.lat}, ${locationData.lng})`);
  console.log(`🗺️ Landmarks: ${landmarksData.count || landmarksData.landmarks?.length || 0} items`);
  console.log(`📦 Output: ${OUTPUT_FILE} (${fs.statSync(OUTPUT_FILE).size} bytes)`);
  
  // Log data sources
  const sources = [];
  if (locationData.source) sources.push(`Location: ${locationData.source}`);
  if (landmarksData.source) sources.push(`Landmarks: ${landmarksData.source}`);
  if (sources.length > 0) {
    console.log(`📡 Data sources: ${sources.join(', ')}`);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, escapeJsonForJs, createFallbackData };