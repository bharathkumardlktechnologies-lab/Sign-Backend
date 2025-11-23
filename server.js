const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// ===== MIDDLEWARE =====

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enhanced CORS for Render deployment
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://192.168.1.8:19006',
      'http://localhost:19006',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    // Be permissive for Render deployment
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in Render
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ===== ROOT ENDPOINT =====

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Sign Language API</title></head>
      <body style="font-family: Arial; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <h1>🤟 Sign Language Learning API</h1>
        <p>Server is running successfully!</p>
        <h3>Available Endpoints:</h3>
        <ul>
          <li>GET /health - Health check</li>
          <li>GET /api/health/python - Python environment check</li>
          <li>GET /api/health/full - Full system check</li>
          <li>POST /api/auth/register - User registration</li>
          <li>POST /api/auth/login - User login</li>
          <li>POST /api/predict/text - Text to sign images</li>
          <li>POST /api/predict/photo - Photo prediction</li>
          <li>POST /api/predict/camera - Camera prediction</li>
        </ul>
        <p>Version: 1.0.0</p>
      </body>
    </html>
  `);
});

// Serve static files (sign images)
app.use('/signs', express.static(path.join(__dirname, 'signs')));

// ===== USER STORE =====
// Simple user store (in production, use a proper database)
const users = new Map();

// ===== JWT AUTHENTICATION MIDDLEWARE =====

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ===== MULTER CONFIGURATION =====

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ===== AUTHENTICATION ENDPOINTS =====

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('📝 Registration attempt:', { name, email });

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.set(email, user);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ User registered successfully:', email);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email });

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful:', email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ===== PREDICTION ENDPOINTS =====

// Text to Sign Images endpoint
app.post('/api/predict/text', authenticateToken, async (req, res) => {
  try {
    const { word } = req.body;

    console.log('📝 Text prediction request:', { word });

    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required and must be a string' });
    }

    // Convert word to uppercase and split into characters
    const uppercaseWord = word.toUpperCase();
    const letters = uppercaseWord.split('');

    // Generate image URLs for each letter
    const baseUrl = process.env.BASE_URL || `http://${HOST}:${PORT}`;
    const images = letters.map(letter => `${baseUrl}/signs/${letter}.gif`);

    console.log('✅ Text prediction successful:', { word: uppercaseWord, letters: letters.length });

    res.json({
      word: uppercaseWord,
      letters,
      images
    });

  } catch (error) {
    console.error('❌ Text prediction error:', error);
    res.status(500).json({ error: 'Internal server error during text prediction' });
  }
});

// Photo prediction endpoint
app.post('/api/predict/photo', authenticateToken, upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📷 Photo prediction request received');
    
    if (!req.file) {
      console.error('❌ No image file uploaded');
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;
    console.log('📁 Image saved to:', imagePath);
    console.log('📏 Image size:', req.file.size, 'bytes');

    // Verify file exists
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image file does not exist at path');
      return res.status(500).json({ error: 'Image file not found after upload' });
    }

    console.log('🐍 Calling Python model...');

    // Call Python model for prediction
    const pythonResult = await callPythonModel(imagePath);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    // Clean up uploaded file
    try {
      fs.unlinkSync(imagePath);
      console.log('🗑️ Cleaned up uploaded file');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup file:', cleanupError.message);
    }

    if (!pythonResult.success) {
      console.error('❌ Python prediction failed:', pythonResult.error);
      return res.status(500).json({ error: 'Prediction failed', details: pythonResult.error });
    }

    console.log('✅ Photo prediction successful');

    res.json({
      predicted_letters: pythonResult.predictions,
      confidences: pythonResult.confidences,
      processingTime: processingTime
    });

  } catch (error) {
    console.error('❌ Photo prediction error:', error);
    res.status(500).json({ error: 'Internal server error during photo prediction' });
  }
});

// Camera prediction endpoint
app.post('/api/predict/camera', authenticateToken, upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🎥 Camera prediction request received');
    console.log('📊 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('📊 Request file:', req.file ? 'Present' : 'Missing');
    
    if (!req.file) {
      console.error('❌ No image file in request');
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;
    console.log('📁 Image saved to:', imagePath);
    console.log('📁 Absolute path:', path.resolve(imagePath));
    console.log('📏 Image size:', req.file.size, 'bytes');
    console.log('📏 Image mimetype:', req.file.mimetype);

    // Verify file exists
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Image file does not exist at path:', imagePath);
      return res.status(500).json({ error: 'Image file not found after upload' });
    }

    console.log('🐍 Calling Python model for camera prediction...');

    // Call Python model for prediction
    const pythonResult = await callPythonModel(imagePath);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Total processing time: ${processingTime}ms`);

    // Clean up uploaded file
    try {
      fs.unlinkSync(imagePath);
      console.log('🗑️ Cleaned up uploaded file');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup file:', cleanupError.message);
    }

    if (!pythonResult.success) {
      console.error('❌ Python prediction failed:', pythonResult.error);
      return res.status(500).json({ 
        error: 'Prediction failed', 
        details: pythonResult.error 
      });
    }

    console.log('✅ Camera prediction successful:', pythonResult);

    // Return single letter prediction for camera
    if (pythonResult.predictions && pythonResult.predictions.length > 0) {
      const response = {
        letter: pythonResult.predictions[0],
        confidence: pythonResult.confidences[0] || 0,
        processingTime: processingTime
      };
      
      console.log('📤 Sending response:', response);
      res.json(response);
    } else {
      console.log('📤 No predictions found, sending null');
      res.json({
        letter: null,
        confidence: 0,
        processingTime: processingTime
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Camera prediction error:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Internal server error during camera prediction',
      details: error.message,
      processingTime: processingTime
    });
  }
});

// ===== UTILITY FUNCTIONS =====

// Function to call Python model
function callPythonModel(imagePath) {
  return new Promise((resolve) => {
    const absoluteImagePath = path.resolve(imagePath);
    const pythonPath = path.join(__dirname, "python_predictor.py");
    
    console.log("🐍 PYTHON FILE PATH:", pythonPath);
    console.log("🖼️ IMAGE PATH:", absoluteImagePath);
    console.log("✅ Python script exists:", fs.existsSync(pythonPath));
    console.log("✅ Image file exists:", fs.existsSync(absoluteImagePath));

    // Use 'python3' or 'python' depending on system
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    const python = spawn(pythonCmd, [pythonPath, absoluteImagePath], {
      timeout: 60000,  // 60 seconds timeout
      maxBuffer: 10 * 1024 * 1024  // 10MB buffer for output
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    python.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("📤 PYTHON STDOUT:", output);
      stdout += output;
    });

    python.stderr.on("data", (data) => {
      const error = data.toString();
      console.log("🔥 PYTHON STDERR:", error);
      stderr += error;
    });

    python.on("error", (err) => {
      console.log("🔴 PYTHON SPAWN ERROR:", err.message);
      resolve({
        success: false,
        predictions: [],
        confidences: [],
        error: `Failed to spawn Python: ${err.message}`,
      });
    });

    python.on("close", (code) => {
      if (timedOut) return; // Already resolved by timeout

      console.log("🔚 PYTHON EXIT CODE:", code);
      console.log("📦 PYTHON FINAL STDOUT:", stdout.trim());
      console.log("📦 PYTHON FINAL STDERR:", stderr.trim());

      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          console.log("✅ Parsed Python result:", result);
          resolve({
            success: result.success,
            predictions: result.predictions || [],
            confidences: result.confidences || [],
          });
        } catch (err) {
          console.error("❌ Failed to parse Python output:", err.message);
          resolve({
            success: false,
            predictions: [],
            confidences: [],
            error: "Failed to parse Python output: " + stdout.trim(),
          });
        }
      } else {
        resolve({
          success: false,
          predictions: [],
          confidences: [],
          error: stderr || `Python exited with code ${code}`,
        });
      }
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      timedOut = true;
      python.kill('SIGTERM');
      
      console.log("⏱️ Python process timeout - killing...");
      
      setTimeout(() => {
        if (!python.killed) {
          python.kill('SIGKILL');
        }
      }, 5000);

      resolve({
        success: false,
        predictions: [],
        confidences: [],
        error: "Prediction timeout (>60s)",
      });
    }, 60000);
  });
}

// ===== HEALTH CHECK ENDPOINTS =====

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Python environment check
app.get('/api/health/python', (req, res) => {
  const { execSync } = require('child_process');
  try {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const version = execSync(`${pythonCmd} --version`, { encoding: 'utf8' });
    res.json({
      status: 'OK',
      pythonVersion: version.trim(),
      platform: process.platform,
      pathToScript: path.join(__dirname, "python_predictor.py"),
      pythonScriptExists: fs.existsSync(path.join(__dirname, "python_predictor.py"))
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'ERROR',
      error: err.message 
    });
  }
});

// Full system check
app.get('/api/health/full', async (req, res) => {
  const checks = {
    server: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    platform: process.platform,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    python: 'CHECKING',
    model: 'CHECKING',
    pythonScript: 'CHECKING',
    uploadsDir: 'CHECKING',
    signsDir: 'CHECKING'
  };

  // Check Python
  try {
    const { execSync } = require('child_process');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const version = execSync(`${pythonCmd} --version`, { encoding: 'utf8' });
    checks.python = version.trim();
  } catch (err) {
    checks.python = 'ERROR: ' + err.message;
  }

  // Check model file
  const modelPath = path.join(__dirname, '25-737', 'asl_cnn_clean.h5');
  checks.model = fs.existsSync(modelPath) ? 'FOUND' : 'NOT FOUND';
  checks.modelPath = modelPath;

  // Check Python script
  const pythonScriptPath = path.join(__dirname, 'python_predictor.py');
  checks.pythonScript = fs.existsSync(pythonScriptPath) ? 'FOUND' : 'NOT FOUND';
  checks.pythonScriptPath = pythonScriptPath;

  // Check uploads directory
  const uploadsDir = path.join(__dirname, 'uploads');
  checks.uploadsDir = fs.existsSync(uploadsDir) ? 'EXISTS' : 'CREATED';
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Check signs directory
  const signsDir = path.join(__dirname, 'signs');
  if (fs.existsSync(signsDir)) {
    const signFiles = fs.readdirSync(signsDir);
    checks.signsDir = `FOUND (${signFiles.length} files)`;
  } else {
    checks.signsDir = 'NOT FOUND';
  }

  res.json(checks);
});

// ===== ERROR HANDLING MIDDLEWARE =====

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 20MB.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ===== 404 HANDLER =====

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ===== KEEP-ALIVE FOR RENDER FREE TIER =====

if (process.env.RENDER) {
  console.log('🏓 Enabling keep-alive pings for Render free tier');
  setInterval(() => {
    const http = require('http');
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    http.get(url + '/health', (res) => {
      console.log('🏓 Keep-alive ping successful:', res.statusCode);
    }).on('error', (err) => {
      console.error('🏓 Keep-alive ping failed:', err.message);
    });
  }, 14 * 60 * 1000); // Ping every 14 minutes
}

// ===== START SERVER =====

app.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log('🚀 Sign Language API Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Server URL: http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET ? 'Configured ✅' : 'Using default ⚠️'}`);
  console.log('='.repeat(50));
  
  // Check Python environment
  const { execSync } = require('child_process');
  try {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const version = execSync(`${pythonCmd} --version`, { encoding: 'utf8' });
    console.log(`🐍 Python: ${version.trim()} ✅`);
  } catch (err) {
    console.log('🐍 Python: Not found ❌');
  }

  // Check model file
  const modelPath = path.join(__dirname, '25-737', 'asl_cnn_clean.h5');
  if (fs.existsSync(modelPath)) {
    console.log('🤖 Model: asl_cnn_clean.h5 found ✅');
  } else {
    console.log('🤖 Model: NOT FOUND ❌');
  }

  // Check Python script
  const pythonScriptPath = path.join(__dirname, 'python_predictor.py');
  if (fs.existsSync(pythonScriptPath)) {
    console.log('📜 Python Script: python_predictor.py found ✅');
  } else {
    console.log('📜 Python Script: NOT FOUND ❌');
  }

  // Check signs directory
  const signsDir = path.join(__dirname, 'signs');
  if (fs.existsSync(signsDir)) {
    const signFiles = fs.readdirSync(signsDir);
    console.log(`🖼️  Sign Images: ${signFiles.length} files found ✅`);
  } else {
    console.log('🖼️  Sign Images: Directory not found ⚠️');
  }

  // Check uploads directory
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Uploads directory created ✅');
  } else {
    console.log('📁 Uploads directory exists ✅');
  }

  console.log('='.repeat(50));
  console.log('✨ Server is ready to accept requests!');
  console.log('='.repeat(50));
});
