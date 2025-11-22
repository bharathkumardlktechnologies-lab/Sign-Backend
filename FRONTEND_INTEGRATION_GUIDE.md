# Frontend Integration Guide - IP Configuration

## Overview
This guide shows how to properly integrate the Sign Language ASL Recognition Backend (running at `http://192.168.1.8:5000`) with your React Native frontend.

## 🚀 Quick Setup

### 1. Backend Configuration (Already Done ✅)

The backend is configured to:
- **Host**: `0.0.0.0` (accessible from network)
- **Port**: `5000`
- **Backend URL**: `http://192.168.1.8:5000`
- **Frontend URL**: `http://192.168.1.8:19006`
- **CORS**: Configured for the frontend IP

### 2. Frontend API Configuration

Update your React Native frontend to use the correct backend URL:

#### Option A: Create API Configuration File

Create `config/api.js`:

```javascript
// config/api.js
import { Platform } from 'react-native';

const BASE_URL = Platform.select({
  ios: 'http://192.168.1.8:5000',
  android: 'http://192.168.1.8:5000', // Android emulator
  web: 'http://192.168.1.8:5000'
});

export const API_BASE_URL = BASE_URL;

// Auth configuration
export const AUTH_CONFIG = {
  tokenKey: 'auth_token',
  refreshTokenKey: 'refresh_token'
};

// API endpoints
export const ENDPOINTS = {
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  PREDICT_TEXT: '/api/predict/text',
  PREDICT_PHOTO: '/api/predict/photo',
  PREDICT_CAMERA: '/api/predict/camera',
  HEALTH: '/health'
};
```

#### Option B: Direct Configuration in Services

Update your authentication service:

```javascript
// services/authService.js
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth functions
export const register = async (userData) => {
  const response = await api.post(ENDPOINTS.REGISTER, userData);
  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post(ENDPOINTS.LOGIN, credentials);
  return response.data;
};

// Helper function to get stored token
const getAuthToken = () => {
  // Implement your token storage logic (AsyncStorage, SecureStore, etc.)
  return null; // Replace with actual token retrieval
};

export default api;
```

#### Option C: Environment-based Configuration

Create `.env` file in your React Native project:

```
API_BASE_URL=http://192.168.1.8:5000
```

Then use it in your code:

```javascript
// config/api.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BASE_URL = Platform.select({
  ios: process.env.API_BASE_URL || 'http://192.168.1.8:5000',
  android: process.env.API_BASE_URL || 'http://192.168.1.8:5000',
  web: process.env.API_BASE_URL || 'http://192.168.1.8:5000'
});

export const API_BASE_URL = BASE_URL;
```

### 3. Sign Language Services

Update your prediction services:

```javascript
// services/signLanguageService.js
import api from './authService';
import { ENDPOINTS } from '../config/api';

// Text to Sign Images
export const predictText = async (word) => {
  const response = await api.post(ENDPOINTS.PREDICT_TEXT, { word });
  return response.data; // { word, letters, images }
};

// Photo Prediction
export const predictPhoto = async (imageUri) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg'
  });
  
  const response = await api.post(ENDPOINTS.PREDICT_PHOTO, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data; // { predicted_letters, confidences }
};

// Camera Prediction (similar to photo)
export const predictCamera = async (imageUri) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'camera.jpg'
  });
  
  const response = await api.post(ENDPOINTS.PREDICT_CAMERA, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data; // { letter, confidence }
};
```

### 4. Component Usage Examples

#### Login Screen Example

```javascript
// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { login } from '../services/authService';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await login({ email, password });
      
      // Store token
      await AsyncStorage.setItem('auth_token', response.token);
      
      Alert.alert('Success', 'Login successful!');
      // Navigate to main app
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

export default LoginScreen;
```

#### Text Prediction Example

```javascript
// screens/TextPredictionScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, FlatList } from 'react-native';
import { predictText } from '../services/signLanguageService';

const TextPredictionScreen = () => {
  const [word, setWord] = useState('');
  const [prediction, setPrediction] = useState(null);

  const handlePredict = async () => {
    try {
      const result = await predictText(word);
      setPrediction(result);
    } catch (error) {
      console.error('Prediction error:', error);
    }
  };

  const renderSignImage = ({ item, index }) => (
    <View style={{ alignItems: 'center', margin: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{prediction.letters[index]}</Text>
      <Image 
        source={{ uri: item }} 
        style={{ width: 100, height: 100, resizeMode: 'contain' }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TextInput
        placeholder="Enter word to convert to sign images"
        value={word}
        onChangeText={setWord}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      <Button title="Convert to Signs" onPress={handlePredict} />
      
      {prediction && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Sign Images for "{prediction.word}":
          </Text>
          <FlatList
            data={prediction.images}
            renderItem={renderSignImage}
            keyExtractor={(item, index) => index.toString()}
            horizontal
          />
        </View>
      )}
    </View>
  );
};

export default TextPredictionScreen;
```

## 🔧 Troubleshooting

### Common Issues and Solutions

1. **Network Connection Error**
   - Ensure both frontend and backend are on the same network
   - Check that `192.168.1.8` is accessible from your device
   - Verify firewall settings allow traffic on port 5000

2. **CORS Errors**
   - Backend is pre-configured for `http://192.168.1.8:19006`
   - If using different ports, update the `FRONTEND_URL` in backend `.env`

3. **Authentication Token Issues**
   - Ensure token is stored properly (AsyncStorage, SecureStore, etc.)
   - Check token expiration (24-hour default)

4. **Image Upload Problems**
   - Ensure image size is under 5MB
   - Use supported formats: JPEG, PNG, GIF
   - Check file permissions for React Native ImagePicker

### Testing the Integration

#### Backend Health Check
```bash
curl http://192.168.1.8:5000/health
```

#### Frontend API Test
Run the provided test script:
```bash
node test-api.js
```

## 📋 API Endpoint Reference

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Prediction Endpoints
- `POST /api/predict/text` - Text to sign images
- `POST /api/predict/photo` - Photo to sign prediction  
- `POST /api/predict/camera` - Camera frame to sign prediction

### Utility Endpoints
- `GET /health` - Server health check
- `GET /signs/:filename` - Sign image files

## ✅ Integration Checklist

- [ ] Backend configured for IP `192.168.1.8:5000`
- [ ] Frontend API URL updated to `http://192.168.1.8:5000`
- [ ] CORS configured for frontend URL
- [ ] Authentication service integrated
- [ ] Prediction services integrated
- [ ] Error handling implemented
- [ ] Network connectivity tested
- [ ] Image upload functionality tested

The backend is now fully configured and ready for seamless integration with your React Native frontend using the IP address `http://192.168.1.8:5000`. 🎉