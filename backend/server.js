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
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID;

// Debug: Log environment configuration (without exposing sensitive data)
console.log('[Config] Environment variables loaded:');
console.log(`[Config] PORT: ${PORT}`);
console.log(`[Config] ALLOW_ORIGIN: ${ALLOW_ORIGIN}`);
console.log(`[Config] GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ Set (' + GEMINI_API_KEY.substring(0, 10) + '...)' : '❌ Not set'}`);
console.log(`[Config] GEMINI_MODEL_ID: ${GEMINI_MODEL_ID || 'Not set (using defaults)'}`);

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

// Generate default feedback based on score
const generateDefaultFeedback = (score) => {
  if (score >= 80) {
    return [
      'Excellent use of the STAR method with clear structure',
      'Strong examples that demonstrate relevant experience',
      'Good alignment with the role requirements',
      'Consider adding more quantifiable results if possible',
      'Well-articulated response with good flow'
    ];
  } else if (score >= 60) {
    return [
      'Good structure, but could benefit from more specific examples',
      'Consider using the STAR method more explicitly',
      'Add more details about the impact and results achieved',
      'Try to connect your answer more directly to the role requirements',
      'Practice being more concise while maintaining clarity'
    ];
  } else if (score >= 40) {
    return [
      'Focus on using the STAR method (Situation, Task, Action, Result)',
      'Provide more specific examples from your experience',
      'Include quantifiable results and impact where possible',
      'Better align your answer with the company and role requirements',
      'Practice structuring your response more clearly'
    ];
  } else {
    return [
      'Use the STAR method to structure your answer clearly',
      'Provide concrete examples from your actual experience',
      'Focus on specific actions you took and results achieved',
      'Better align your answer with the job requirements',
      'Practice answering behavioral questions with more detail'
    ];
  }
};

// Clean JSON response from markdown code blocks and extract JSON
const cleanJsonResponse = (text, debugLabel = 'JSON') => {
  if (!text) {
    console.log(`[DEBUG ${debugLabel}] Empty text provided`);
    return '';
  }
  
  console.log(`[DEBUG ${debugLabel}] Original text length: ${text.length}`);
  console.log(`[DEBUG ${debugLabel}] Original text (first 300 chars):`, text.slice(0, 300));
  
  let cleaned = text.trim();
  
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const beforeMarkdown = cleaned;
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();
  
  if (beforeMarkdown !== cleaned) {
    console.log(`[DEBUG ${debugLabel}] Removed markdown code blocks`);
    console.log(`[DEBUG ${debugLabel}] After markdown removal (first 300 chars):`, cleaned.slice(0, 300));
  }
  
  // Try to extract JSON object/array if wrapped in other text
  // Look for first { or [ and last matching } or ]
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    console.log(`[DEBUG ${debugLabel}] Found JSON match in text`);
    cleaned = jsonMatch[0];
  } else {
    console.log(`[DEBUG ${debugLabel}] No JSON match found, using cleaned text as-is`);
  }
  
  // Remove any leading/trailing non-JSON text
  const beforeTrim = cleaned;
  cleaned = cleaned.replace(/^[^{[]*/, ''); // Remove everything before first { or [
  cleaned = cleaned.replace(/[^}\]]*$/, ''); // Remove everything after last } or ]
  
  if (beforeTrim !== cleaned) {
    console.log(`[DEBUG ${debugLabel}] Trimmed leading/trailing non-JSON text`);
  }
  
  cleaned = cleaned.trim();
  
  console.log(`[DEBUG ${debugLabel}] Final cleaned text length: ${cleaned.length}`);
  console.log(`[DEBUG ${debugLabel}] Final cleaned text (first 300 chars):`, cleaned.slice(0, 300));
  console.log(`[DEBUG ${debugLabel}] Final cleaned text (last 100 chars):`, cleaned.slice(-100));
  
  return cleaned;
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
  console.log('[DEBUG Resume] ========== UPLOAD START ==========');
  console.log('[DEBUG Resume] Received upload request');
  
  if (!(await ensureGemini(res))) {
    console.log('[DEBUG Resume] ❌ Gemini not configured');
    return;
  }

  try {
    if (!req.file) {
      console.log('[DEBUG Resume] ❌ Missing file field: resume');
      return apiBad(res, 'Missing file field: resume');
    }
    
    console.log('[DEBUG Resume] File received:');
    console.log(`[DEBUG Resume]   - Filename: ${req.file.originalname}`);
    console.log(`[DEBUG Resume]   - MIME type: ${req.file.mimetype}`);
    console.log(`[DEBUG Resume]   - Size: ${req.file.size} bytes (${(req.file.size / 1024).toFixed(2)} KB)`);
    
    if (req.file.mimetype !== 'application/pdf') {
      console.log('[DEBUG Resume] ❌ Invalid file type (not PDF)');
      return apiBad(res, 'PDF required');
    }

    console.log('[DEBUG Resume] Starting PDF parsing...');
    const parseStartTime = Date.now();
    const data = await pdfParse(req.file.buffer);
    const parseDuration = Date.now() - parseStartTime;
    
    console.log('[DEBUG Resume] ✅ PDF parsing completed:');
    console.log(`[DEBUG Resume]   - Parse duration: ${parseDuration}ms`);
    console.log(`[DEBUG Resume]   - Pages: ${data.numpages ?? 'unknown'}`);
    console.log(`[DEBUG Resume]   - Raw text length: ${(data.text || '').length} characters`);
    
    const rawText = (data.text || '').trim();
    if (!rawText) {
      console.log('[DEBUG Resume] ❌ Could not extract text from PDF (empty result)');
      return apiBad(res, 'Could not extract text from PDF');
    }

    console.log('[DEBUG Resume] Extracted text preview (first 500 chars):');
    console.log('[DEBUG Resume] ' + rawText.slice(0, 500).replace(/\n/g, '\\n'));
    if (rawText.length > 500) {
      console.log(`[DEBUG Resume] ... (${rawText.length - 500} more characters)`);
    }

    const sessionId = uuidv4();
    console.log(`[DEBUG Resume] Creating session: ${sessionId}`);
    sessions.set(sessionId, { resumeText: rawText, company: null, role: null });
    console.log(`[DEBUG Resume] ✅ Session created and stored`);

    // send small teaser back to UI
    const response = {
      sessionId,
      resumePreview: rawText.slice(0, 600),
      pages: data.numpages ?? null
    };
    
    console.log('[DEBUG Resume] Response prepared:');
    console.log(`[DEBUG Resume]   - Session ID: ${sessionId}`);
    console.log(`[DEBUG Resume]   - Preview length: ${response.resumePreview.length} chars`);
    console.log(`[DEBUG Resume]   - Pages: ${response.pages}`);
    console.log('[DEBUG Resume] ========== UPLOAD END ==========');
    
    return apiOk(res, response);
  } catch (e) {
    console.error('[DEBUG Resume] ❌ Error during upload/parsing:', e);
    console.error('[DEBUG Resume] Error stack:', e.stack);
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
  console.log(`[DEBUG Questions] Looking up session: ${sessionId}`);
  console.log(`[DEBUG Questions]   - Total sessions in memory: ${sessions.size}`);
  
  const session = sessions.get(sessionId);
  if (!session) {
    console.log(`[DEBUG Questions] ❌ Session not found`);
    console.log(`[DEBUG Questions]   - Available session IDs:`, Array.from(sessions.keys()));
    console.log(`[DEBUG Questions]   - Note: Sessions are stored in memory and are lost on server restart`);
    return apiBad(res, 'Invalid sessionId - session may have expired. Please upload your resume again.');
  }
  
  console.log(`[DEBUG Questions] ✅ Session found`);
  console.log(`[DEBUG Questions]   - Session has resume: ${!!session.resumeText}`);
  session.company = company;
  session.role = role;

  try {
    // Use fast model for question generation
    const model = await getModelInstance(true);

    // Parse and extract experience section from resume
    const resumeText = session.resumeText;
    const resumeLength = resumeText.length;
    
    console.log(`[DEBUG Questions] Resume text length: ${resumeLength} chars`);
    
    // Extract experience section (look for common patterns)
    let experienceSection = '';
    const experiencePatterns = [
      /(?:experience|work experience|professional experience|employment|work history)[\s\S]*?(?=(?:education|skills|projects|technical|summary|$))/i,
      /(?:experience|work experience)[\s\S]{0,2000}/i,
    ];
    
    for (const pattern of experiencePatterns) {
      const match = resumeText.match(pattern);
      if (match && match[0].length > 100) {
        experienceSection = match[0].trim();
        console.log(`[DEBUG Questions] Found experience section: ${experienceSection.length} chars`);
        break;
      }
    }
    
    // If no experience section found, use the full resume but prioritize middle section (where experience usually is)
    if (!experienceSection || experienceSection.length < 100) {
      console.log(`[DEBUG Questions] No experience section found, using full resume`);
      // Use middle 60% of resume (usually contains experience)
      const start = Math.floor(resumeLength * 0.2);
      const end = Math.floor(resumeLength * 0.8);
      experienceSection = resumeText.slice(start, end);
    }
    
    // Limit to 2500 chars for experience + 500 for context
    const experiencePreview = experienceSection.slice(0, 2500);
    const contextPreview = resumeText.slice(0, 500); // First 500 chars for name, education context
    
    console.log(`[DEBUG Questions] Experience section length: ${experiencePreview.length} chars`);
    console.log(`[DEBUG Questions] Experience preview (first 300 chars):`, experiencePreview.slice(0, 300));

    // Enhanced prompt that focuses on experience section - generate ONE question
    const prompt = `You are an expert interview coach. Generate exactly 1 behavioral interview question for a ${role} position at ${company}.

CRITICAL: Analyze the candidate's WORK EXPERIENCE section below and create ONE SPECIFIC question that references their actual projects, roles, technologies, and achievements mentioned in their resume.

Requirements:
- Question must reflect ${company}'s culture, values, and what they look for in a ${role}
- Question MUST reference specific experiences, projects, or technologies from the candidate's work experience
- Question should ask about a real situation from their resume (e.g., "Tell me about a time when you [specific project/role from resume]")
- Question should be behavioral (STAR method: Situation, Task, Action, Result)
- Question should be 1-2 sentences, professional, and tailored to their experience
- Write a complete, professional interview question - NOT a placeholder like "q1"
- Return ONLY valid JSON in this exact format: {"question":"full question text here"}

Candidate Context:
${contextPreview}

Candidate's Work Experience:
${experiencePreview}

Return ONLY valid JSON with 1 question tailored to their specific experience.`;

    console.log('[DEBUG Questions] Sending prompt to Gemini (length:', prompt.length, 'chars)');
    const result = await retryWithBackoff(() => 
      model.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8, // Slightly higher for more creative questions
          maxOutputTokens: 2000, // Increased to handle thinking tokens + response
          topP: 0.95,
          topK: 40,
        }
      })
    );
    
    // Check if response has content
    if (!result || !result.response) {
      console.error('[DEBUG Questions] ❌ No response object from Gemini');
      console.error('[DEBUG Questions] Result object:', JSON.stringify(result, null, 2));
      throw new Error('No response from Gemini API');
    }

    // Detailed response inspection
    console.log('[DEBUG Questions] ========== PARSING START ==========');
    console.log('[DEBUG Questions] Response object keys:', Object.keys(result.response || {}));
    
    // Check for candidates
    const candidates = result.response.candidates || [];
    console.log('[DEBUG Questions] Number of candidates:', candidates.length);
    
    if (candidates.length > 0) {
      candidates.forEach((candidate, idx) => {
        console.log(`[DEBUG Questions] Candidate ${idx}:`, {
          finishReason: candidate.finishReason,
          safetyRatings: candidate.safetyRatings,
          content: candidate.content ? 'Has content' : 'No content',
        });
        
        if (candidate.finishReason) {
          console.log(`[DEBUG Questions]   Finish reason: ${candidate.finishReason}`);
        }
        
        if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
          console.log(`[DEBUG Questions]   Safety ratings:`, candidate.safetyRatings);
        }
        
        // Check if content is blocked
        if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
          console.error(`[DEBUG Questions] ❌ Content blocked by safety filter (reason: ${candidate.finishReason})`);
        }
      });
    }

    // Try to get text - check multiple ways
    let text = '';
    try {
      // First try the standard text() method
      text = result.response.text()?.trim() || '';
      
      // If empty, try accessing content directly from candidates
      if (!text && candidates.length > 0) {
        const candidate = candidates[0];
        if (candidate.content && candidate.content.parts) {
          text = candidate.content.parts
            .map(part => part.text || '')
            .join('')
            .trim();
        }
      }
      
      // If still empty, try accessing from response directly
      if (!text && result.response.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          text = candidate.content.parts
            .map(part => part.text || '')
            .join('')
            .trim();
        }
      }
    } catch (e) {
      console.error('[DEBUG Questions] ❌ Error calling result.response.text():', e.message);
      console.error('[DEBUG Questions] Response structure:', JSON.stringify(result.response, null, 2));
    }
    
    console.log('[DEBUG Questions] Raw response length:', text.length);
    console.log('[DEBUG Questions] Raw response (full):', text);
    
    // Check for empty response
    if (!text || text.length === 0) {
      console.error('[DEBUG Questions] ❌ Empty response from Gemini API');
      
      // Check finish reason
      if (candidates.length > 0) {
        const finishReason = candidates[0].finishReason;
        console.error('[DEBUG Questions] Finish reason:', finishReason);
        
        if (finishReason === 'MAX_TOKENS') {
          console.error('[DEBUG Questions] Model hit token limit - increasing maxOutputTokens');
          throw new Error('Response too long - model hit token limit. Try a shorter prompt or increase maxOutputTokens.');
        }
        
        if (finishReason === 'SAFETY') {
          throw new Error('Content blocked by Gemini safety filter - try rephrasing the prompt');
        }
        
        if (finishReason === 'RECITATION') {
          throw new Error('Content blocked due to recitation policy');
        }
      }
      
      console.error('[DEBUG Questions] Full response object:', JSON.stringify(result.response, null, 2));
      throw new Error('Empty response from Gemini API - model may be rate limited or unavailable');
    }
    
    // Try to coerce to JSON
    let payload;
    try { 
      const cleaned = cleanJsonResponse(text, 'Questions');
      console.log('[DEBUG Questions] Attempting JSON.parse...');
      payload = JSON.parse(cleaned);
      console.log('[DEBUG Questions] ✅ JSON.parse SUCCESS!');
      console.log('[DEBUG Questions] Parsed payload:', JSON.stringify(payload, null, 2));
    }
    catch (e) { 
      console.error('[DEBUG Questions] ❌ JSON.parse FAILED:', e.message);
      console.error('[DEBUG Questions] Error stack:', e.stack);
      console.warn('[Gemini] Failed to parse JSON, trying to fix:', e.message);
      
      // Ask the model to convert to clean JSON if needed
      console.log('[DEBUG Questions] Calling fixer model...');
      const fixer = await retryWithBackoff(() =>
        model.generateContent({ 
          contents: [{ role: 'user', parts: [{ text: `The following response failed to parse as JSON. Convert it into valid JSON format with 1 actual interview question (NOT placeholders like "q1"). Return ONLY valid JSON: {"question":"full question text here"}\n\nOriginal response:\n${text}` }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          }
        })
      );
      const fixerText = fixer.response.text().trim();
      console.log('[DEBUG Questions] Fixer response length:', fixerText.length);
      console.log('[DEBUG Questions] Fixer response (full):', fixerText);
      const cleaned = cleanJsonResponse(fixerText, 'Questions-Fixer');
      console.log('[DEBUG Questions] Attempting JSON.parse on fixer response...');
      payload = JSON.parse(cleaned);
      console.log('[DEBUG Questions] ✅ JSON.parse on fixer response SUCCESS!');
      console.log('[DEBUG Questions] Parsed payload:', JSON.stringify(payload, null, 2));
    }
    console.log('[DEBUG Questions] ========== PARSING END ==========');

    // Validate question structure
    if (!payload.question || typeof payload.question !== 'string') {
      console.error('[DEBUG Questions] Invalid question structure:', payload);
      return apiErr(res, 'Model did not return a valid question');
    }

    // Validate that question is not a placeholder
    const placeholderPattern = /^(q\d+|question\s*\d+|q1)$/i;
    const trimmed = payload.question.trim();
    
    if (trimmed.length < 10) {
      console.error('[DEBUG Questions] Question too short:', trimmed);
      return apiErr(res, 'Question is too short');
    }
    
    if (placeholderPattern.test(trimmed)) {
      console.error('[DEBUG Questions] Found placeholder question:', trimmed);
      return apiErr(res, 'Model returned placeholder question. Please try again.');
    }

    // Log the actual question for debugging
    console.log('[DEBUG Questions] ✅ Valid question generated:');
    console.log(`[DEBUG Questions]   Question: ${trimmed.substring(0, 150)}${trimmed.length > 150 ? '...' : ''}`);

    // Cache question into session (as array with single question for compatibility)
    session.questions = [trimmed];

    return apiOk(res, { question: trimmed, questions: [trimmed] }); // Return both for compatibility
  } catch (e) {
    console.error('[Gemini] generate-questions error:', {
      status: e?.status ?? e?.code,
      message: e?.message,
      details: e?.response?.candidates?.[0]?.content ?? null
    });
    return apiErr(res, `Failed to generate questions: ${e.message || 'Unknown error'}`);
  }
});

/* ---- Step 3: Review text answer -> score and feedback ---- */
/* JSON body: sessionId, question (string), answer (string) */
const AnswerFields = z.object({
  sessionId: z.string().uuid(),
  question: z.string().min(10),
  answer: z.string().min(10).max(5000) // Text answer, max 5000 chars
});

app.post('/api/answer', async (req, res) => {
  console.log('[DEBUG Answer] ========== REVIEW START ==========');
  console.log('[DEBUG Answer] Received review request');
  
  if (!(await ensureGemini(res))) {
    console.log('[DEBUG Answer] ❌ Gemini not configured');
    return;
  }

  const parsed = AnswerFields.safeParse(req.body);
  if (!parsed.success) {
    console.log('[DEBUG Answer] ❌ Invalid request:', parsed.error.issues[0].message);
    return apiBad(res, parsed.error.issues[0].message);
  }

  const { sessionId, question, answer } = parsed.data;
  console.log('[DEBUG Answer] Reviewing answer:');
  console.log(`[DEBUG Answer]   - Session ID: ${sessionId}`);
  console.log(`[DEBUG Answer]   - Question length: ${question.length} chars`);
  console.log(`[DEBUG Answer]   - Answer length: ${answer.length} chars`);
  console.log(`[DEBUG Answer]   - Answer preview (first 200 chars): ${answer.slice(0, 200)}`);
  
  const session = sessions.get(sessionId);
  if (!session) {
    console.log('[DEBUG Answer] ❌ Invalid sessionId');
    console.log(`[DEBUG Answer]   - Total sessions in memory: ${sessions.size}`);
    console.log(`[DEBUG Answer]   - Available session IDs:`, Array.from(sessions.keys()));
    console.log(`[DEBUG Answer]   - Note: Sessions are stored in memory and are lost on server restart`);
    return apiBad(res, 'Invalid sessionId - session may have expired. Please upload your resume again.');
  }
  
  console.log('[DEBUG Answer] ✅ Session found');
  console.log(`[DEBUG Answer]   - Session has resume: ${!!session.resumeText}`);
  console.log(`[DEBUG Answer]   - Session company: ${session.company || 'not set'}`);
  console.log(`[DEBUG Answer]   - Session role: ${session.role || 'not set'}`);

  try {
    const model = await getModelInstance();

    // Ask Gemini to evaluate the text answer
    const prompt = `
You are an expert interview coach evaluating a candidate's answer to a behavioral interview question.

Evaluate the candidate's written answer below for:
1) Structure (STAR method: Situation, Task, Action, Result)
2) Clarity and conciseness
3) Impact and results achieved
4) Alignment with ${session.company}'s values and ${session.role} role requirements
5) Use of specific examples from their experience

Provide:
- A score out of 100 (0-100, where 100 is excellent)
- 3-5 specific, actionable feedback items for improvement

Return strict JSON with this schema:
{
  "score": number,
  "feedback": ["item1","item2","item3","item4","item5"]
}

Question: ${question}
Company: ${session.company}
Role: ${session.role}

Candidate's Answer:
${answer}

Candidate's Resume Context (for reference):
${session.resumeText.slice(0, 1000)}
`;

    console.log('[DEBUG Answer] Sending review prompt to Gemini (length:', prompt.length, 'chars)');
    const result = await retryWithBackoff(() =>
      model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000, // Increased to handle thinking tokens + response + feedback
        }
      })
    );

    // Check if response has content
    if (!result || !result.response) {
      console.error('[DEBUG Answer] ❌ No response object from Gemini');
      throw new Error('No response from Gemini API');
    }

    // Detailed response inspection
    console.log('[DEBUG Answer] ========== PARSING START ==========');
    const candidates = result.response.candidates || [];
    console.log('[DEBUG Answer] Number of candidates:', candidates.length);
    
    if (candidates.length > 0) {
      candidates.forEach((candidate, idx) => {
        console.log(`[DEBUG Answer] Candidate ${idx}:`, {
          finishReason: candidate.finishReason,
          safetyRatings: candidate.safetyRatings,
          content: candidate.content ? 'Has content' : 'No content',
        });
        
        if (candidate.finishReason) {
          console.log(`[DEBUG Answer]   Finish reason: ${candidate.finishReason}`);
        }
      });
    }

    // Try to get text - check multiple ways
    let text = '';
    try {
      // First try the standard text() method
      text = result.response.text()?.trim() || '';
      
      // If empty, try accessing content directly from candidates
      if (!text && candidates.length > 0) {
        const candidate = candidates[0];
        if (candidate.content && candidate.content.parts) {
          text = candidate.content.parts
            .map(part => part.text || '')
            .join('')
            .trim();
        }
      }
      
      // If still empty, try accessing from response directly
      if (!text && result.response.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          text = candidate.content.parts
            .map(part => part.text || '')
            .join('')
            .trim();
        }
      }
    } catch (e) {
      console.error('[DEBUG Answer] ❌ Error calling result.response.text():', e.message);
      console.error('[DEBUG Answer] Response structure:', JSON.stringify(result.response, null, 2));
    }
    
    console.log('[DEBUG Answer] Raw response length:', text.length);
    console.log('[DEBUG Answer] Raw response (full):', text);
    
    if (!text || text.length === 0) {
      console.error('[DEBUG Answer] ❌ Empty response from Gemini API');
      
      // Check finish reason
      if (candidates.length > 0) {
        const finishReason = candidates[0].finishReason;
        console.error('[DEBUG Answer] Finish reason:', finishReason);
        
        if (finishReason === 'MAX_TOKENS') {
          console.error('[DEBUG Answer] Model hit token limit - increasing maxOutputTokens');
          throw new Error('Response too long - model hit token limit. Try a shorter prompt or increase maxOutputTokens.');
        }
        
        if (finishReason === 'SAFETY') {
          throw new Error('Content blocked by Gemini safety filter - try rephrasing the prompt');
        }
        
        if (finishReason === 'RECITATION') {
          throw new Error('Content blocked due to recitation policy');
        }
      }
      
      console.error('[DEBUG Answer] Full response object:', JSON.stringify(result.response, null, 2));
      throw new Error('Empty response from Gemini API');
    }
    
    let review;
    try { 
      const cleaned = cleanJsonResponse(text, 'Answer');
      console.log('[DEBUG Answer] Attempting JSON.parse...');
      review = JSON.parse(cleaned);
      console.log('[DEBUG Answer] ✅ JSON.parse SUCCESS!');
      console.log('[DEBUG Answer] Parsed review:', JSON.stringify(review, null, 2));
    }
    catch (e) {
      console.error('[DEBUG Answer] ❌ JSON.parse FAILED:', e.message);
      console.error('[DEBUG Answer] Error stack:', e.stack);
      console.warn('[Gemini] Failed to parse review JSON, trying to fix:', e.message);
      
      console.log('[DEBUG Answer] Calling fixer model...');
      const fixerModel = await getModelInstance();
      const fixer = await retryWithBackoff(() =>
        fixerModel.generateContent({ contents: [{ role: 'user', parts: [{ text: `Convert to valid JSON only (no markdown, no code blocks) matching {"score":0,"feedback":["..."]}:\n\n${text}` }] }] })
      );
      const fixerText = fixer.response.text()?.trim() || '';
      console.log('[DEBUG Answer] Fixer response length:', fixerText.length);
      console.log('[DEBUG Answer] Fixer response (full):', fixerText);
      const cleaned = cleanJsonResponse(fixerText, 'Answer-Fixer');
      console.log('[DEBUG Answer] Attempting JSON.parse on fixer response...');
      review = JSON.parse(cleaned);
      console.log('[DEBUG Answer] ✅ JSON.parse on fixer response SUCCESS!');
      console.log('[DEBUG Answer] Parsed review:', JSON.stringify(review, null, 2));
    }
    console.log('[DEBUG Answer] ========== PARSING END ==========');

    // Validate review structure
    if (typeof review.score !== 'number' || review.score < 0 || review.score > 100) {
      console.error('[DEBUG Answer] Invalid score:', review.score);
      return apiErr(res, 'Model returned invalid score (must be 0-100)');
    }

    // Ensure score is 0-100
    review.score = Math.max(0, Math.min(100, Math.round(review.score)));
    
    // Hardcode feedback based on score for now
    console.log('[DEBUG Answer] Using hardcoded feedback based on score');
    review.feedback = generateDefaultFeedback(review.score);

    console.log('[DEBUG Answer] ✅ Review completed:');
    console.log(`[DEBUG Answer]   - Score: ${review.score}/100`);
    console.log(`[DEBUG Answer]   - Feedback items: ${review.feedback.length}`);
    console.log('[DEBUG Answer] ========== REVIEW END ==========');

    // Store review in session
    session.answer = review;

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
