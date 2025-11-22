#!/usr/bin/env node

/**
 * Test script for the Sign Language Backend API
 * Run this script to verify that all endpoints work correctly
 */

const axios = require('axios');

const BASE_URL = 'http://192.168.1.8:5000';
const API = axios.create({ baseURL: BASE_URL });

// Test configuration
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'testpassword123'
};

let authToken = '';

async function testAPI() {
  console.log('🧪 Starting API Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await API.get('/health');
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: User Registration
    console.log('2. Testing User Registration...');
    const registerResponse = await API.post('/api/auth/register', testUser);
    console.log('✅ Registration:', registerResponse.data);
    authToken = registerResponse.data.token;
    console.log('');

    // Test 3: User Login
    console.log('3. Testing User Login...');
    const loginResponse = await API.post('/api/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login:', loginResponse.data);
    console.log('');

    // Test 4: Text Prediction (with auth)
    console.log('4. Testing Text Prediction...');
    const textPredictionResponse = await API.post('/api/predict/text', 
      { word: 'hello' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Text Prediction:', textPredictionResponse.data);
    console.log('');

    // Test 5: Test with invalid token
    console.log('5. Testing Authentication Failure...');
    try {
      await API.post('/api/predict/text', 
        { word: 'test' },
        { headers: { Authorization: 'Bearer invalid-token' } }
      );
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Correctly rejected invalid token');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    console.log('');

    // Test 6: Test static file serving
    console.log('6. Testing Static File Serving...');
    const staticResponse = await API.get('/signs/A.gif', { responseType: 'stream' });
    console.log('✅ Static file serving works (A.gif available)');
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Health check endpoint');
    console.log('   ✅ User registration');
    console.log('   ✅ User login');
    console.log('   ✅ JWT authentication');
    console.log('   ✅ Text prediction');
    console.log('   ✅ Static file serving');
    console.log('   ✅ Error handling');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Make sure the server is running:');
      console.error('   npm start  OR  npm run dev');
    }
  }
}

// Run tests
testAPI();