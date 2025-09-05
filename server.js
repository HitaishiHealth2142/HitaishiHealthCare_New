const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path");
const multer = require("multer");
const session = require('express-session');
const { Server } = require('socket.io');

require('dotenv').config();

const app = express(); // Initialize app

// Create the HTTP server
const server = http.createServer(app);

// Initialize Socket.IO and attach it to the server
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true
  }
});

// Middleware setup
app.use(cors({
  origin: "*",
  credentials: true
}));

app.set('trust proxy', 1);

// File Upload Setup
const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname))); // Serve static files

// Configure session middleware
app.use(require('express-session')({
  name: 'hh.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// WebSocket implementation ================================================================
const peersInRoom = {};
const doctorRooms = {}; // New: To track doctor's notification rooms

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // New: Doctor joins their personal notification room
  socket.on('join-doctor-room', (doctorUid) => {
    // Each doctor gets a unique room based on their UID
    const roomName = `doctor-notify-${doctorUid}`;
    socket.join(roomName);
    doctorRooms[socket.id] = roomName;
    console.log(`Doctor ${doctorUid} connected to notification room.`);
  });
  
  // New: Handle patient joining a call room and notify the doctor
  socket.on('join-call-room', ({ roomId, doctorUid, patientId, patientName }) => {
    if (!peersInRoom[roomId]) peersInRoom[roomId] = {};

    socket.emit('existing-peers', Object.keys(peersInRoom[roomId]));

    peersInRoom[roomId][socket.id] = true;
    socket.join(roomId);

    socket.to(roomId).emit('new-peer', socket.id);

    // Send a real-time invitation to the doctor's notification room
    const doctorNotificationRoom = `doctor-notify-${doctorUid}`;
    io.to(doctorNotificationRoom).emit('new-call', {
      roomId,
      patientId,
      patientName
    });

    console.log(`${socket.id} joined room ${roomId}. Sent call invitation to doctor ${doctorUid}.`);
  });

  // Old signaling logic remains the same
  socket.on('signal', ({ to, payload }) => {
    io.to(to).emit('signal', { from: socket.id, payload });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up peer connections
    for (const roomId in peersInRoom) {
      if (peersInRoom[roomId][socket.id]) {
        delete peersInRoom[roomId][socket.id];
        io.to(roomId).emit('peer-left', socket.id);
      }
    }
    // Clean up doctor notification room
    const roomName = doctorRooms[socket.id];
    if (roomName) {
      delete doctorRooms[socket.id];
      socket.leave(roomName);
    }
  });
});

// websocket ends=======================================================================================================

// =================================================================
// Pass the 'app' object to the translate routes
// =================================================================
require('./translate')(app);


// Routes Import
const appointment_fertilityRoutes = require("./routes/appointment_fertility");
const appointmentsRoutes = require("./routes/appointments");
const bookappointmentRoutes = require("./routes/bookappointment");
const bloodRoutes = require("./routes/blood");
const clinicRoutes = require("./routes/clinicRegister");
const contactRoutes = require("./routes/contact");
const bloodtestRoutes = require("./routes/bloodtest");
const diagnosticstestsRoutes = require("./routes/diagnosticstests");
const doctorRoutes = require("./routes/doctor");
const entappointmentRoutes = require("./routes/entappointment");
const entspecialistRoutes = require("././routes/entspecialist");
const eyedoctorsRoutes = require("./routes/eyedoctors");
const eyeformRoutes = require("./routes/eyeform");
const finddoctorRoutes = require("./routes/finddoctor");
const homesample_testRoutes = require("./routes/homesample_test");
const hr_donationsRoutes = require("./routes/hr_donations");
const hr_packagesRoutes = require("./routes/hr_packages");
const packagesRoutes = require("./routes/packages");
const patientRoutes = require("./routes/patient");
const paymentRoutes = require("./routes/payment");
const analyzeRoutes = require("./routes/analyze");
const sessionRoutes = require("./routes/session");
const unifiedLoginRoutes = require("./routes/unifiedLogin");
const unifiedPasswordResetRoutes = require("./routes/unifiedPasswordReset");
const diagnosticsRoutes = require("./routes/diagnostics");
const newpaymentRoutes = require("./routes/newpayment");
const testsRoutes = require("./routes/tests");

app.use("/api", diagnosticsRoutes);
app.use("/api", newpaymentRoutes);
app.use("/api", testsRoutes);
app.use("/api", appointment_fertilityRoutes);
app.use("/api", appointmentsRoutes);
app.use("/api", bookappointmentRoutes);
app.use("/api", bloodRoutes);
app.use("/api", clinicRoutes);
app.use("/api", contactRoutes);
app.use("/api", bloodtestRoutes);
app.use("/api", diagnosticstestsRoutes);
app.use("/api", doctorRoutes);
app.use("/api", entappointmentRoutes);
app.use("/api", entspecialistRoutes);
app.use("/api", eyedoctorsRoutes);
app.use("/api", eyeformRoutes);
app.use("/api", finddoctorRoutes);
app.use("/api", homesample_testRoutes);
app.use("/api", hr_donationsRoutes);
app.use("/api", hr_packagesRoutes);
app.use("/api", packagesRoutes);
app.use("/api", patientRoutes);
app.use("/api", paymentRoutes);
app.use("/api", analyzeRoutes);
app.use("/api", sessionRoutes);
app.use("/api", unifiedLoginRoutes);
app.use("/api", unifiedPasswordResetRoutes);


// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
