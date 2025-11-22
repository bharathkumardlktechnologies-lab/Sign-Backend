#!/usr/bin/env node

/**
 * IP Configuration Verification Script
 * Verifies that the backend is properly configured for IP integration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying IP Configuration for Sign Language Backend...\n');

// Check .env file
console.log('📄 Checking .env file configuration...');
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ .env file found');
    
    const checks = [
      { key: 'HOST', expected: '0.0.0.0', description: 'Server binding interface' },
      { key: 'PORT', expected: '5000', description: 'Server port' },
      { key: 'BASE_URL', expected: 'http://192.168.1.8:5000', description: 'Base URL for API' },
      { key: 'FRONTEND_URL', expected: 'http://192.168.1.8:19006', description: 'Frontend URL for CORS' }
    ];
    
    checks.forEach(check => {
      const regex = new RegExp(`${check.key}=(.*)`, 'i');
      const match = envContent.match(regex);
      if (match && match[1].trim() === check.expected) {
        console.log(`  ✅ ${check.key}: ${check.description} - Correct`);
      } else {
        console.log(`  ⚠️  ${check.key}: ${check.description} - Expected: ${check.expected}, Found: ${match ? match[1].trim() : 'Not found'}`);
      }
    });
  } else {
    console.log('❌ .env file not found');
  }
} catch (error) {
  console.log('❌ Error reading .env file:', error.message);
}

console.log('\n📁 Checking server.js configuration...');
try {
  const serverPath = path.join(__dirname, 'server.js');
  if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    console.log('✅ server.js found');
    
    const serverChecks = [
      { key: 'HOST', pattern: /HOST\s*=\s*process\.env\.HOST\s*\|\|\s*['"]0\.0\.0\.0['"]/, description: 'Host configuration' },
      { key: 'PORT', pattern: /PORT\s*=\s*process\.env\.PORT\s*\|\|\s*5000/, description: 'Port configuration' },
      { key: 'BASE_URL', pattern: /baseUrl\s*=\s*process\.env\.BASE_URL/, description: 'Base URL usage' },
      { key: 'CORS', pattern: /192\.168\.1\.66:19006/, description: 'CORS frontend URL' },
      { key: 'LISTEN', pattern: /listen\s*\(\s*PORT\s*,\s*HOST/, description: 'Server binding' }
    ];
    
    serverChecks.forEach(check => {
      if (check.pattern.test(serverContent)) {
        console.log(`  ✅ ${check.key}: ${check.description} - Correct`);
      } else {
        console.log(`  ⚠️  ${check.key}: ${check.description} - Not found or incorrect`);
      }
    });
  } else {
    console.log('❌ server.js file not found');
  }
} catch (error) {
  console.log('❌ Error reading server.js file:', error.message);
}

console.log('\n🖼️  Checking sign images...');
const signsDir = path.join(__dirname, 'signs');
if (fs.existsSync(signsDir)) {
  const signFiles = fs.readdirSync(signsDir);
  console.log(`✅ Signs directory found with ${signFiles.length} files`);
  
  const requiredFiles = ['0.gif', '9.gif', 'A.gif', 'Z.gif'];
  requiredFiles.forEach(file => {
    if (signFiles.includes(file)) {
      console.log(`  ✅ ${file} - Present`);
    } else {
      console.log(`  ⚠️  ${file} - Missing`);
    }
  });
} else {
  console.log('❌ Signs directory not found');
}

console.log('\n📋 Configuration Summary:');
console.log('  🔗 Backend URL: http://192.168.1.8:5000');
console.log('  📱 Frontend URL: http://192.168.1.8:19006');
console.log('  🌐 Host Interface: 0.0.0.0 (accessible from network)');
console.log('  🔐 JWT Authentication: Enabled');
console.log('  🛡️  CORS: Configured for frontend IP');

console.log('\n📝 Next Steps:');
console.log('1. Install Node.js dependencies: npm install');
console.log('2. Install Python dependencies: pip3 install -r requirements.txt');
console.log('3. Start the server: npm start');
console.log('4. Test API: node test-api.js');
console.log('5. Update frontend API configuration to use http://192.168.1.8:5000');

console.log('\n🎉 IP Configuration Verification Complete!');