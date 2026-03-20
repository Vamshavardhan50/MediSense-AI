import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  if (!apiKey) {
    console.warn("WARNING: No Gemini API key found in environment variables (GEMINI_API_KEY2, GEMINI_API_KEY, or API_KEY).");
  }
  const genAI = new GoogleGenAI({ apiKey });

  // API Routes
  app.post("/api/ai/analyze-prescription", async (req, res) => {
    try {
      const { image } = req.body; // base64
      
      const prompt = `Extract all medication details from this prescription image. 
      Return ONLY a JSON object with this structure:
      {
        "medications": [{ "name": "string", "dosage": "string", "frequency": "string", "instructions": "string" }],
        "doctor": { "name": "string", "clinic": "string" },
        "date": "string"
      }`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: image } }
          ]
        }],
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to analyze prescription" });
    }
  });

  app.post("/api/ai/triage", async (req, res) => {
    try {
      const { symptoms } = req.body;

      const prompt = `Assess the urgency of these symptoms: "${symptoms}".
      Return ONLY a JSON object with this structure:
      {
        "urgency": "EMERGENCY | URGENT | ROUTINE | MONITOR",
        "likely_conditions": ["string"],
        "immediate_actions": ["string"],
        "reasoning": "string",
        "call_911": boolean
      }`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to triage symptoms" });
    }
  });

  app.post("/api/ai/interactions", async (req, res) => {
    try {
      const medications = Array.isArray(req.body.medications) ? req.body.medications : [];
      if (medications.length === 0) {
        return res.json({ interactions: [], overall_risk: "NONE" });
      }

      const prompt = `Check for drug interactions among these medications: ${medications.join(", ")}.
      Return ONLY a JSON object with this structure:
      {
        "interactions": [{ "drug_1": "string", "drug_2": "string", "severity": "HIGH | MEDIUM | LOW", "risk": "string", "recommendation": "string" }],
        "overall_risk": "HIGH | MEDIUM | LOW | NONE"
      }`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to check interactions" });
    }
  });

  app.post("/api/ai/process-voice-history", async (req, res) => {
    try {
      const { text } = req.body;

      const prompt = `Parse this medical history description into a structured JSON object. 
      Text: "${text}"
      Return ONLY a JSON object with this structure:
      {
        "conditions": ["string"],
        "medications": [{ "name": "string", "dosage": "string", "frequency": "string" }],
        "allergies": ["string"],
        "summary": "string"
      }`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process voice history" });
    }
  });

  app.post("/api/ai/analyze-lab-report", async (req, res) => {
    try {
      const { image } = req.body;
      
      const prompt = `Analyze this lab report image. Explain the results in plain English for a patient. 
      Identify any critical or abnormal values.
      Return ONLY a JSON object with this structure:
      {
        "findings": [{ "test": "string", "value": "string", "status": "NORMAL | BORDERLINE | CRITICAL", "explanation": "string" }],
        "summary": "string",
        "questions_for_doctor": ["string"]
      }`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: image } }
          ]
        }],
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to analyze lab report" });
    }
  });

  app.post("/api/ai/identify-pill", async (req, res) => {
    try {
      const { image } = req.body;
      
      const prompt = `Identify the pill in this image based on its shape, color, and imprints. 
      Return ONLY a JSON object with this structure:
      {
        "name": "string",
        "dosage": "string",
        "purpose": "string",
        "confidence": number,
        "warnings": ["string"]
      }`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: image } }
          ]
        }],
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to identify pill" });
    }
  });

  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, target_language } = req.body;
      
      const prompt = `Translate the following medical text into ${target_language}. 
      Keep the medical accuracy but make it understandable for a patient.
      Text: "${text}"
      Return ONLY a JSON object with this structure:
      {
        "translated_text": "string",
        "original_text": "string",
        "language": "string"
      }`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(result.text || "{}"));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to translate text" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
