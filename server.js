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

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://192.168.1.8:19006',
    'http://localhost:19006',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
app.get('/', (req, res) => {
  res.send('<h1>Hello Root</h1>');
});


// Serve static files (sign images)
app.use('/signs', express.static(path.join(__dirname, 'signs')));

// Simple user store (in production, use a proper database)
const users = new Map();

// JWT Authentication Middleware
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

// Multer configuration for image uploads
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
  limits: { fileSize: 20 * 1024 * 1024 }, // allow up to 20MB
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

    console.log({ name, email, password });

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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log({ email, password })

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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ===== PREDICTION ENDPOINTS =====

// Text to Sign Images endpoint
app.post('/api/predict/text', authenticateToken, async (req, res) => {
  try {
    const { word } = req.body;

    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required and must be a string' });
    }

    // Convert word to uppercase and split into characters
    const uppercaseWord = word.toUpperCase();
    const letters = uppercaseWord.split('');

    // Generate image URLs for each letter
    const baseUrl = process.env.BASE_URL || `http://${HOST}:${PORT}`;
    const images = letters.map(letter => `${baseUrl}/signs/${letter}.gif`);

    res.json({
      word: uppercaseWord,
      letters,
      images
    });

  } catch (error) {
    console.error('Text prediction error:', error);
    res.status(500).json({ error: 'Internal server error during text prediction' });
  }
});

// Photo prediction endpoint
app.post('/api/predict/photo', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;

    console.log(imagePath);

console.log("NODE: Image path received:", imagePath);
console.log("NODE: Absolute path:", path.resolve(imagePath));
console.log("NODE: File exists:", fs.existsSync(imagePath));


    // Call Python model for prediction
    const pythonResult = await callPythonModel(imagePath);

    console.log("🟥 PYTHON RAW RESULT:", pythonResult);


    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    if (!pythonResult.success) {
      return res.status(500).json({ error: 'Prediction failed', details: pythonResult.error });
    }

    res.json({
      predicted_letters: pythonResult.predictions,
      confidences: pythonResult.confidences
    });

  } catch (error) {
    console.error('Photo prediction error:', error);
    res.status(500).json({ error: 'Internal server error during photo prediction' });
  }
});

// Camera prediction endpoint
app.post('/api/predict/camera', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;

    console.log("camer",imagePath)

    // Call Python model for prediction
    const pythonResult = await callPythonModel(imagePath);

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    if (!pythonResult.success) {
      return res.status(500).json({ error: 'Prediction failed', details: pythonResult.error });
    }

    // Return single letter prediction for camera
    if (pythonResult.predictions.length > 0) {
      res.json({
        letter: pythonResult.predictions[0],
        confidence: pythonResult.confidences[0]
      });
    } else {
      res.json({
        letter: null,
        confidence: 0
      });
    }

  } catch (error) {
    console.error('Camera prediction error:', error);
    res.status(500).json({ error: 'Internal server error during camera prediction' });
  }
});

// ===== UTILITY FUNCTIONS =====

// Function to call Python model
function callPythonModel(imagePath) {
  return new Promise((resolve) => {
    
    const absoluteImagePath = path.resolve(imagePath);
    const pythonPath = path.join(__dirname, "python_predictor.py");
    console.log("PYTHON FILE PATH = ", pythonPath);

    const python = spawn(
      "python3",
      [pythonPath, absoluteImagePath]
    );

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      console.log("📤 PYTHON STDOUT:", data.toString());
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      console.log("🔥 PYTHON STDERR:", data.toString());
      stderr += data.toString();
    });

    python.on("close", (code) => {
      console.log("🔚 PYTHON EXIT CODE:", code);
      console.log("📦 PYTHON FINAL STDOUT:", stdout.trim());
      console.log("📦 PYTHON FINAL STDERR:", stderr.trim());

      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim());
          resolve({
            success: result.success,
            predictions: result.predictions || [],
            confidences: result.confidences || [],
          });
        } catch (err) {
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
          error: stderr,
        });
      }
    });

    setTimeout(() => {
      python.kill();
      resolve({
        success: false,
        predictions: [],
        confidences: [],
        error: "Prediction timeout",
      });
    }, 30000);
  });
}



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }

  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://192.168.1.8:19006'}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET ? 'Configured' : 'Using default (change in production)'}`);
  console.log(`📁 Static files served from: /signs`);

  // Check if sign images exist
  const signsDir = path.join(__dirname, 'signs');
  if (fs.existsSync(signsDir)) {
    const signFiles = fs.readdirSync(signsDir);
    console.log(`🖼️  Available sign images: ${signFiles.length} files`);
  } else {
    console.log('⚠️  Sign images directory not found');
  }

  // Check if Python model exists
  const modelPath = path.join(__dirname, '25-737', 'asl_cnn_clean.h5');
if (fs.existsSync(modelPath)) {
  console.log('✅ Clean Python model found (asl_cnn_clean.h5)');
} else {
  console.log('⚠️ Clean Python model NOT found');
}


});