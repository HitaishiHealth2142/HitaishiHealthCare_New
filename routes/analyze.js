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
const upload = multer({ dest: 'uploads/' });

// Route: POST /upload
router.post('/report/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();

  let textContent = '';

  try {
    // Extract text
    if (fileExt === '.txt') {
      textContent = fs.readFileSync(filePath, 'utf-8');
    } else if (fileExt === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      textContent = data.text;
    } else if (fileExt === '.docx') {
      textContent = await new Promise((resolve, reject) => {
        docx.parseDocx(filePath, (data) => resolve(data));
      });
    } else {
      return res.status(400).send('Unsupported file type');
    }

    // Gemini Analysis
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze this medical report and provide an explanation, health condition overview, and care suggestions:\n\n${textContent}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    res.send({ response });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error analyzing report");
  } finally {
    fs.unlinkSync(filePath); // Delete after use
  }
});

module.exports = router;
