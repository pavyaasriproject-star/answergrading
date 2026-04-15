export const config = { api: { bodyParser: false } };

import fs from 'fs';
import formidable from 'formidable';
import fetch from 'node-fetch';

const GEMINI_KEY = process.env.GEMINI_KEY;
const VISION_KEY = process.env.VISION_KEY;

async function ocrImage(base64) {
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    })
  });
  const data = await res.json();
  return data.responses[0].fullTextAnnotation.text;
}

async function askGemini(answerKey, studentText) {
  const prompt = `
Compare the student answer with answer key.
Give:
- Accuracy %
- Mistakes
- Marks out of 10
- Feedback

Answer Key:
${answerKey}

Student Answer:
${studentText}
`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

export default async function handler(req, res) {
  const form = formidable();
  form.parse(req, async (err, fields, files) => {
    const ak = fs.readFileSync(files.ak.filepath, 'utf8');
    const shBuffer = fs.readFileSync(files.sh.filepath);
    const shBase64 = shBuffer.toString('base64');

    const studentText = await ocrImage(shBase64);
    const result = await askGemini(ak, studentText);

    res.status(200).send(result);
  });
}