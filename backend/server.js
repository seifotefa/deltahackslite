require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'MockMate Backend server is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Generate interview questions
app.post('/api/generateQuestions', async (req, res) => {
  try {
    const { resumeText, company, role } = req.body;

    if (!resumeText || !company || !role) {
      return res.status(400).json({ error: 'Missing required fields: resumeText, company, role' });
    }

    const prompt = `You are an experienced interviewer. Based on this candidate's resume and the role of ${role} at ${company}, generate exactly 3 behavioral interview questions that test:
1. Communication skills
2. Teamwork and collaboration
3. Problem-solving abilities

Resume:
${resumeText}

Role: ${role} at ${company}

Generate 3 specific, relevant behavioral interview questions. Return only the questions, one per line, without numbering or bullet points.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert interviewer who creates relevant, challenging behavioral interview questions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0].message.content;
    const questions = responseText
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && !q.match(/^\d+[\.\)]/))
      .slice(0, 3);

    // If we don't have exactly 3 questions, try to extract them better
    let finalQuestions = questions;
    if (questions.length !== 3) {
      // Try splitting by common patterns
      const lines = responseText.split(/\n+/).filter((line) => line.trim().length > 10);
      finalQuestions = lines.slice(0, 3);
    }

    res.json({ questions: finalQuestions });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: 'Failed to generate questions', details: error.message });
  }
});

// Analyze answer and provide feedback
app.post('/api/analyzeAnswer', async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Missing required fields: question, answer' });
    }

    const prompt = `You are an interview coach. Evaluate this answer for clarity, confidence, and structure (STAR method: Situation, Task, Action, Result). 

Question: ${question}

Answer: ${answer}

Provide exactly 3 short, actionable bullet points of feedback. Focus on:
1. What the candidate did well
2. Areas for improvement
3. Specific suggestions to strengthen the answer

Format as a simple list, one point per line, without numbering or bullet symbols.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const feedbackText = response.text();

    // Parse feedback into array
    const feedback = feedbackText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.match(/^\d+[\.\)]/))
      .slice(0, 3);

    res.json({ feedback });
  } catch (error) {
    console.error('Error analyzing answer:', error);
    res.status(500).json({ error: 'Failed to analyze answer', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MockMate backend server is running on port ${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set in environment variables');
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not set in environment variables');
  }
});
