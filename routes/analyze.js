const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const docx = require('docx-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const router = express.Router();

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.AI_KEY);


// File Upload Setup
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});


router.post('/report/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded or file too large" });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let textContent = '';

    try {
      if (fileExt === '.txt') {
        textContent = fs.readFileSync(filePath, 'utf-8');
      } else if (fileExt === '.pdf') {
        const data = await pdfParse(fs.readFileSync(filePath));
        textContent = data.text;
      } else if (fileExt === '.docx') {
        textContent = await new Promise((resolve, reject) => {
          docx.parseDocx(filePath, (data, err) => {
            if (err) return reject(err);
            resolve(data);
          });
        });
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const prompt = `Analyze this medical report:\n\n${textContent}`;
      const result = await model.generateContent(prompt);
      const responseText = await result.response.text();

      res.json({ response: responseText });
    } catch (error) {
      console.error("Upload processing error:", error);
      res.status(500).json({ error: "Error analyzing report" });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });
});


module.exports = router;
