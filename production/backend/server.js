const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { createClient } = require('@neondatabase/serverless');
const fileUpload = require('express-fileupload');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

// Database connection
const db = createClient(process.env.DATABASE_URL);

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json(req.user);
  }
  res.status(401).send('Not logged in');
});

// Add all your existing API routes here...

// WebSocket setup
const wss = new WebSocket.Server({ server, path: "/ws" });
const connectedClients = new Map();

wss.on('connection', (ws) => {
  // Your existing WebSocket logic...
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
