// ===============================
// server.js – FINAL STABLE VERSION
// ===============================

const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

// -----------------------------------------------------------------------------
// ✅ TRUST PROXY (NGINX / CLOUDflare)
// -----------------------------------------------------------------------------
app.set('trust proxy', 1);

// -----------------------------------------------------------------------------
// ✅ CORS – SAFE & CORRECT (NO WILDCARDS)
// -----------------------------------------------------------------------------
const allowedOrigins = [
  'https://hitaishihealthcare.com',
  'https://www.hitaishihealthcare.com',
  'https://opticbee.in',
  'https://www.opticbee.in',
  'http://localhost:3000',
  
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// -----------------------------------------------------------------------------
// BODY PARSERS & STATIC FILES
// -----------------------------------------------------------------------------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// -----------------------------------------------------------------------------
// FILE UPLOADS
// -----------------------------------------------------------------------------
const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------------------------------------------------------------
// SESSION CONFIG (HTTPS SAFE)
// -----------------------------------------------------------------------------
app.use(session({
  name: 'hh.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// -----------------------------------------------------------------------------
// HTTP SERVER + SOCKET.IO
// -----------------------------------------------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// -----------------------------------------------------------------------------
// SOCKET.IO LOGIC
// -----------------------------------------------------------------------------
const peersInRoom = {};
const doctorRooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-doctor-room', (doctorUid) => {
    const roomName = `doctor-notify-${doctorUid}`;
    socket.join(roomName);
    doctorRooms[socket.id] = roomName;
  });

  socket.on('join-call-room', ({ roomId, doctorUid, patientId, patientName }) => {
    io.to(`doctor-notify-${doctorUid}`).emit('new-call', {
      roomId,
      patientId,
      patientName
    });
  });

  socket.on('join-room', (roomId) => {
    if (!peersInRoom[roomId]) peersInRoom[roomId] = {};
    socket.emit('existing-peers', Object.keys(peersInRoom[roomId]));
    peersInRoom[roomId][socket.id] = true;
    socket.join(roomId);
    socket.to(roomId).emit('new-peer', socket.id);
  });

  socket.on('signal', ({ to, payload }) => {
    io.to(to).emit('signal', { from: socket.id, payload });
  });

  socket.on('disconnect', () => {
    for (const roomId in peersInRoom) {
      if (peersInRoom[roomId][socket.id]) {
        delete peersInRoom[roomId][socket.id];
        io.to(roomId).emit('peer-left', socket.id);
      }
    }
    if (doctorRooms[socket.id]) {
      socket.leave(doctorRooms[socket.id]);
      delete doctorRooms[socket.id];
    }
  });
});

// -----------------------------------------------------------------------------
// TRANSLATION ROUTE
// -----------------------------------------------------------------------------
require('./translate')(app);

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------
app.use('/api', require('./routes/newsletter'));
app.use('/api', require('./routes/opticbeeaffiliate'));
app.use('/api', require('./routes/opticbeeContact'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api', require('./routes/blog'));
app.use('/api', require('./routes/upload_record'));
app.use('/api', require('./routes/diagnostics'));
app.use('/api', require('./routes/newpayment'));
app.use('/api', require('./routes/tests'));
app.use('/api', require('./routes/appointment_fertility'));
app.use('/api', require('./routes/appointments'));
app.use('/api', require('./routes/bookappointment'));
app.use('/api', require('./routes/blood'));
app.use('/api', require('./routes/clinicRegister'));
app.use('/api', require('./routes/contact'));
app.use('/api', require('./routes/bloodtest'));
app.use('/api', require('./routes/diagnosticstests'));
app.use('/api', require('./routes/doctor'));
app.use('/api', require('./routes/entappointment'));
app.use('/api', require('./routes/entspecialist'));
app.use('/api', require('./routes/eyedoctors'));
app.use('/api', require('./routes/eyeform'));
app.use('/api', require('./routes/finddoctor'));
app.use('/api', require('./routes/homesample_test'));
app.use('/api', require('./routes/hr_donations'));
app.use('/api', require('./routes/hr_packages'));
app.use('/api', require('./routes/packages'));
app.use('/api', require('./routes/patient'));
app.use('/api', require('./routes/payment'));
app.use('/api', require('./routes/analyze'));
app.use('/api', require('./routes/session'));
app.use('/api', require('./routes/unifiedLogin'));
app.use('/api', require('./routes/unifiedPasswordReset'));

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});