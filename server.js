const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path");
const multer = require("multer");
const session = require('express-session');

const app = express(); // ✅ Initialize app first

// Middleware setup
app.use(cors({
  origin: "https://hitaishihealthcare.com", // ✅ Replace with your frontend domain
  credentials: true                         // ✅ Allow cookies
}));


app.use(express.json({ limit: '50mb' }));  
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname))); // Serve static files


const upload = multer({ dest: "uploads/" }); // For file uploads

// Configure session middleware
app.use(session({
  secret: 'hitaishi_secure_key_123', // Replace with a strong, unique secret key
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  rolling: true, // Resets the cookie expiry on every request
  cookie: {
    secure: true, // Must be true for HTTPS
    sameSite: 'none', // Required for cross-site cookies
    maxAge: 24 * 60 * 60 * 1000  // Session expiry: 1 day (in milliseconds)
  }
}));


// Routes Import - Ensure all necessary routes are imported
const appointment_fertilityRoutes = require("./routes/appointment_fertility");
const appointmentsRoutes = require("./routes/appointments");
const bookappointmentRoutes = require("./routes/bookappointment");
const bloodRoutes = require("./routes/blood");
const clinicRoutes = require("./routes/clinicRegister");
const contactRoutes = require("./routes/contact");
const bloodtestRoutes = require("./routes/bloodtest");
const diagnosticstestsRoutes = require("./routes/diagnosticstests");
const doctorRoutes = require("./routes/doctor"); // Doctor routes
const entappointmentRoutes = require("./routes/entappointment");
const entspecialistRoutes = require("./routes/entspecialist");
const eyedoctorsRoutes = require("./routes/eyedoctors");
const eyeformRoutes = require("./routes/eyeform");
const finddoctorRoutes = require("./routes/finddoctor");
const homesample_testRoutes = require("./routes/homesample_test");
const hr_donationsRoutes = require("./routes/hr_donations");
const hr_packagesRoutes = require("./routes/hr_packages");
const packagesRoutes = require("./routes/packages");
// const patientloginRoutes = require("./routes/patientlogin");
const patientRoutes = require("./routes/patient");
const diagnosticsRoutes = require("./routes/diagnostics");
const paymentRoutes = require("./routes/payment")


// Use Routes - Mount imported routes under the /api path
app.use("/api", appointment_fertilityRoutes);
app.use("/api", appointmentsRoutes);
app.use("/api", bookappointmentRoutes);
app.use("/api", bloodRoutes);
app.use("/api", clinicRoutes);
app.use("/api", contactRoutes);
app.use("/api", bloodtestRoutes);
app.use("/api", diagnosticstestsRoutes);
app.use("/api", doctorRoutes); // Doctor related APIs (login, profile, update, session check)
console.log("✅ doctorRoutes loaded at /api/");
app.use("/api" , diagnosticsRoutes)
app.use("/api", entappointmentRoutes);
app.use("/api", entspecialistRoutes);
app.use("/api", eyedoctorsRoutes);
app.use("/api", eyeformRoutes);
app.use("/api", finddoctorRoutes);
app.use("/api", homesample_testRoutes);
app.use("/api", hr_donationsRoutes);
app.use("/api", hr_packagesRoutes);
app.use("/api", packagesRoutes);
// app.use("/api", patientloginRoutes);
app.use("/api", patientRoutes);
app.use("/api", paymentRoutes);


// Start HTTP server for redirection (if not already handled by a reverse proxy like Nginx)
const HTTP_PORT = 80;
const HTTPS_PORT = process.env.PORT || 5000; // Use 5000 for local development, 443 for production HTTPS

// Redirect HTTP to HTTPS
http.createServer((req, res) => {
  res.writeHead(301, { Location: 'https://' + req.headers.host + req.url });
  res.end();
}).listen(HTTP_PORT, () => {
  console.log(`🌐 Redirecting all HTTP to HTTPS on port ${HTTP_PORT}`);
});

// Start HTTPS server
// Ensure these paths are correct for your server environment
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/hitaishihealthcare.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/hitaishihealthcare.com/fullchain.pem')
};

https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`✅ Secure HTTPS server running on port ${HTTPS_PORT}`);
});

// Fallback for local development or if HTTPS setup is not ready
// This block will only run if the HTTPS_PORT is not 443 (e.g., 5000 for local testing)
if (HTTPS_PORT !== 443) {
  app.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`✅ Server is also running on HTTP port ${HTTPS_PORT} (for local testing/development)`);
  });
}

