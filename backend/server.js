import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/* ---------- Config ---------- */
const app = express();
const PORT = process.env.PORT || 5001;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || 'http://localhost:3000';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('[WARN] GEMINI_API_KEY not set — endpoints will 500.');
}

app.use(helmet());
app.use(cors({ origin: ALLOW_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

/* ---------- Gemini ---------- */
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Fast model for question generation (prioritize flash - better rate limits)
const FAST_MODEL_IDS = [
  'gemini-2.5-flash',          // Fast 2.5 flash (preferred - better rate limits)
  'gemini-2.0-flash',          // 2.0 flash fallback
  'gemini-1.5-flash',          // Legacy 1.5 flash
  process.env.GEMINI_MODEL_ID, // allow env override (but prefer flash)
  'gemini-2.5-pro',            // Fallback to pro if flash unavailable
  'gemini-pro'                 // Legacy fallback
].filter(Boolean);

// Full model list for other operations (pro preferred for analysis)
const DEFAULT_MODEL_IDS = [
  process.env.GEMINI_MODEL_ID, // allow env override first
  'gemini-2.5-pro',            // Preferred: stable 2.5 pro
  'gemini-2.5-flash',          // Fast 2.5 flash
  'gemini-2.0-flash',          // 2.0 flash fallback
  'gemini-2.0-pro-exp',        // 2.0 pro experimental
  'gemini-1.5-pro',            // Legacy 1.5 pro (if available)
  'gemini-1.5-flash',          // Legacy 1.5 flash (if available)
  'gemini-pro'                 // Legacy fallback
].filter(Boolean);

// Retry helper with exponential backoff for rate limits
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = e?.status ?? e?.code ?? '';
      const isRateLimit = status === 429 || e?.message?.includes('429') || e?.message?.includes('quota');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        // Extract retry delay from error if available
        let delay = baseDelay * Math.pow(2, attempt);
        const retryMatch = e?.message?.match(/retry.*?(\d+)s/i);
        if (retryMatch) {
          delay = parseInt(retryMatch[1]) * 1000;
        }
        console.warn(`[Gemini] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw e;
    }
  }
}

async function resolveFirstWorkingModel(genAI, modelList = DEFAULT_MODEL_IDS) {
  // Try candidate IDs until one works for a trivial call.
  for (const id of modelList) {
    try {
      const m = genAI.getGenerativeModel({ model: id });
      const test = await retryWithBackoff(() => 
        m.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] })
      );
      if (test?.response?.text()) {
        console.log('[Gemini] Using model:', id);
        return id;
      }
    } catch (e) {
      const code = e?.status ?? e?.code ?? '';
      const msg = e?.message ?? '';
      console.warn(`[Gemini] Model probe failed for "${id}" → ${code} ${msg}`);
      continue;
    }
  }
  throw new Error('No working Gemini model found for this API key/region.');
}

let _resolvedModelId = null;
let _resolvedFastModelId = null;

async function getModelInstance(useFast = false) {
  if (!genAI) throw new Error('Gemini not configured');
  
  if (useFast) {
    if (!_resolvedFastModelId) {
      _resolvedFastModelId = await resolveFirstWorkingModel(genAI, FAST_MODEL_IDS);
    }
    return genAI.getGenerativeModel({ model: _resolvedFastModelId });
  } else {
    if (!_resolvedModelId) {
      _resolvedModelId = await resolveFirstWorkingModel(genAI, DEFAULT_MODEL_IDS);
    }
    return genAI.getGenerativeModel({ model: _resolvedModelId });
  }
}

/* ---------- Upload handling ---------- */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

/* ---------- Ephemeral in-memory store ---------- */
const sessions = new Map(); // sessionId -> { resumeText, company, role }

/* ---------- Utils ---------- */
const json = (res, code, payload) => res.status(code).json(payload);
const apiOk = (res, payload) => json(res, 200, payload);
const apiBad = (res, message) => json(res, 400, { error: message });
const apiErr = (res, message) => json(res, 500, { error: message });

const b64 = (buf) => Buffer.from(buf).toString('base64');

// Clean JSON response from markdown code blocks and extract JSON
const cleanJsonResponse = (text) => {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();
  
  // Try to extract JSON object/array if wrapped in other text
  // Look for first { or [ and last matching } or ]
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // Remove any leading/trailing non-JSON text
  cleaned = cleaned.replace(/^[^{[]*/, ''); // Remove everything before first { or [
  cleaned = cleaned.replace(/[^}\]]*$/, ''); // Remove everything after last } or ]
  
  return cleaned.trim();
};
const ensureGemini = async (res) => {
  if (!genAI) { apiErr(res, 'Gemini not configured'); return false; }
  try {
    await getModelInstance();
    return true;
  } catch (e) {
    apiErr(res, `Gemini model not available: ${e.message}`);
    return false;
  }
};

/* ---------- Routes ---------- */
app.get('/', (_req, res) => apiOk(res, { message: 'MockMate Backend server is running!' }));

app.get('/api/health', (_req, res) => apiOk(res, { status: 'OK', timestamp: new Date().toISOString() }));

app.get('/api/_debug/models', async (_req, res) => {
  try {
    if (!genAI) return apiBad(res, 'Gemini not configured');
    // The Node SDK doesn't expose a listModels directly; so we probe a shortlist.
    const probes = DEFAULT_MODEL_IDS;
    const results = [];
    for (const id of probes) {
      try {
        const m = genAI.getGenerativeModel({ model: id });
        const r = await m.generateContent({ contents: [{ role: 'user', parts: [{ text: 'model-check' }] }] });
        results.push({ id, ok: true, sample: (r?.response?.text() || '').slice(0, 40) });
      } catch (e) {
        results.push({ id, ok: false, status: e?.status ?? e?.code, message: e?.message });
      }
    }
    return apiOk(res, { probes: results });
  } catch (e) {
    return apiErr(res, 'Model probe failed');
  }
});

/* ---- Step 1: Upload resume (PDF -> text) ---- */
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  if (!(await ensureGemini(res))) return;

  try {
    if (!req.file) return apiBad(res, 'Missing file field: resume');
    if (req.file.mimetype !== 'application/pdf') return apiBad(res, 'PDF required');

    const data = await pdfParse(req.file.buffer);
    const rawText = (data.text || '').trim();
    if (!rawText) return apiBad(res, 'Could not extract text from PDF');

    const sessionId = uuidv4();
    sessions.set(sessionId, { resumeText: rawText, company: null, role: null });

    // send small teaser back to UI
    return apiOk(res, {
      sessionId,
      resumePreview: rawText.slice(0, 600),
      pages: data.numpages ?? null
    });
  } catch (e) {
    console.error(e);
    return apiErr(res, 'Resume parsing failed');
  }
});

/* ---- Step 2: Generate tailored behavioral questions ---- */
const QuestionsSchema = z.object({
  sessionId: z.string().uuid(),
  company: z.string().min(1).max(120),
  role: z.string().min(1).max(120)
});

app.post('/api/generate-questions', async (req, res) => {
  if (!(await ensureGemini(res))) return;

  const parsed = QuestionsSchema.safeParse(req.body);
  if (!parsed.success) return apiBad(res, parsed.error.issues[0].message);

  const { sessionId, company, role } = parsed.data;
  const session = sessions.get(sessionId);
  if (!session) return apiBad(res, 'Invalid sessionId');
  session.company = company;
  session.role = role;

  try {
    // Use fast model for question generation
    const model = await getModelInstance(true);

    // Truncate resume to first 2000 chars for faster processing
    const resumePreview = session.resumeText.slice(0, 2000);

    // Simplified prompt for faster generation
    const prompt = `Generate exactly 3 behavioral interview questions for a ${role} role at ${company}.

Requirements:
- Questions should reflect ${company}'s culture and values
- Tailor to the candidate's experience
- Each question: 1-2 sentences, unique
- Return JSON only: {"questions":["q1","q2","q3"]}

Resume excerpt:
${resumePreview}`;

    const result = await retryWithBackoff(() => 
      model.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500, // Limit response size for speed
        }
      })
    );

    const text = result.response.text().trim();
    console.log('[Gemini] Raw response (first 200 chars):', text.slice(0, 200));
    
    // Try to coerce to JSON
    let payload;
    try { 
      const cleaned = cleanJsonResponse(text);
      console.log('[Gemini] Cleaned JSON (first 200 chars):', cleaned.slice(0, 200));
      payload = JSON.parse(cleaned);
    }
    catch (e) { 
      console.warn('[Gemini] Failed to parse JSON, trying to fix:', e.message);
      console.warn('[Gemini] Original text:', text);
      
      // Ask the model to convert to clean JSON if needed
      const fixer = await retryWithBackoff(() =>
        model.generateContent({ 
          contents: [{ role: 'user', parts: [{ text: `Convert the following into valid JSON only (no markdown, no code blocks, no explanations): {"questions":["q1","q2","q3"]}\n\n${text}` }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        })
      );
      const fixerText = fixer.response.text().trim();
      console.log('[Gemini] Fixer response (first 200 chars):', fixerText.slice(0, 200));
      const cleaned = cleanJsonResponse(fixerText);
      payload = JSON.parse(cleaned);
    }

    if (!Array.isArray(payload.questions) || payload.questions.length !== 3) {
      return apiErr(res, 'Model did not return 3 questions');
    }

    // Cache questions into session
    session.questions = payload.questions;

    return apiOk(res, { questions: payload.questions });
  } catch (e) {
    console.error('[Gemini] generate-questions error:', {
      status: e?.status ?? e?.code,
      message: e?.message,
      details: e?.response?.candidates?.[0]?.content ?? null
    });
    return apiErr(res, `Failed to generate questions: ${e.message || 'Unknown error'}`);
  }
});

/* ---- Step 3: Upload 2-minute audio answer -> transcribe & review ---- */
/* Multipart form fields: sessionId, questionIndex (0..2), question (string). File field: "audio" */
const AnswerFields = z.object({
  sessionId: z.string().uuid(),
  questionIndex: z.coerce.number().int().min(0).max(2),
  question: z.string().min(10)
});

app.post('/api/answer', upload.single('audio'), async (req, res) => {
  if (!(await ensureGemini(res))) return;

  const parsed = AnswerFields.safeParse(req.body);
  if (!parsed.success) return apiBad(res, parsed.error.issues[0].message);

  const { sessionId, questionIndex, question } = parsed.data;
  const session = sessions.get(sessionId);
  if (!session) return apiBad(res, 'Invalid sessionId');

  if (!req.file) return apiBad(res, 'Missing file field: audio');
  const mime = req.file.mimetype; // e.g., audio/webm or audio/mpeg
  if (!mime.startsWith('audio/')) return apiBad(res, 'Audio file required');

  try {
    const model = await getModelInstance();

    // Ask Gemini to a) transcribe b) evaluate
    const prompt = `
You will receive an interview question and a 2-minute spoken answer.

Tasks:
1) Transcribe the audio (concise, punctuation, Canadian English).
2) Evaluate the answer for structure (STAR), clarity, impact, and company/role alignment.
3) Provide 3–5 bullet improvements and a 0–10 score.

Return strict JSON with this schema:
{
  "transcript": "string",
  "score": number,
  "feedback": ["item1","item2","item3","item4","item5"]
}

Question: ${question}
Company: ${session.company}
Role: ${session.role}
Candidate resume (truncated allowed):
${session.resumeText}
`;

    const result = await retryWithBackoff(() =>
      model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mime,
                data: b64(req.file.buffer)
              }
            }
          ]
        }]
      })
    );

    const text = result.response.text().trim();
    let review;
    try { 
      const cleaned = cleanJsonResponse(text);
      review = JSON.parse(cleaned);
    }
    catch (e) {
      console.warn('[Gemini] Failed to parse review JSON, trying to fix:', e.message);
      const fixerModel = await getModelInstance();
      const fixer = await retryWithBackoff(() =>
        fixerModel.generateContent({ contents: [{ role: 'user', parts: [{ text: `Convert to valid JSON only (no markdown, no code blocks) matching {"transcript":"","score":0,"feedback":["..."]}:\n\n${text}` }] }] })
      );
      const fixerText = fixer.response.text().trim();
      const cleaned = cleanJsonResponse(fixerText);
      review = JSON.parse(cleaned);
    }

    if (!review?.transcript || typeof review.score !== 'number' || !Array.isArray(review.feedback)) {
      return apiErr(res, 'Model returned unexpected review format');
    }

    // Optionally store per-question results
    session.answers = session.answers || {};
    session.answers[questionIndex] = review;

    return apiOk(res, review);
  } catch (e) {
    console.error('[Gemini] answer error:', {
      status: e?.status ?? e?.code,
      message: e?.message,
      details: e?.response?.candidates?.[0]?.content ?? null
    });
    return apiErr(res, `Failed to analyze answer: ${e.message || 'Unknown error'}`);
  }
});

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log(`MockMate backend listening on http://localhost:${PORT}`);
});
