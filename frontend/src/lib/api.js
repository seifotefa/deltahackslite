/**
 * API client for MockMate backend
 * All functions use relative paths (/api/*) to work through Vite proxy
 */

const API_BASE = '/api';

/**
 * Fetch wrapper with error handling and timeout
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If JSON parsing fails, use default error message
      }
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Upload resume PDF and get sessionId
 * @param {File} file - PDF file to upload
 * @returns {Promise<{sessionId: string, resumePreview: string, pages: number|null}>}
 */
export async function uploadResume(file) {
  if (!file) {
    throw new Error('File is required');
  }

  if (file.type !== 'application/pdf') {
    throw new Error('PDF required');
  }

  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetchWithTimeout(
    `${API_BASE}/upload-resume`,
    {
      method: 'POST',
      body: formData,
    },
    60000 // 60s timeout for file uploads
  );

  const data = await response.json();
  return {
    sessionId: data.sessionId,
    resumePreview: data.resumePreview || '',
    pages: data.pages ?? null,
  };
}

/**
 * Generate interview question based on resume, company, and role
 * @param {Object} params - Parameters object
 * @param {string} params.sessionId - Session ID from uploadResume
 * @param {string} params.company - Company name
 * @param {string} params.role - Job role/title
 * @returns {Promise<{question: string, questions: string[]}>}
 */
export async function generateQuestions({ sessionId, company, role }) {
  if (!sessionId || !company || !role) {
    throw new Error('sessionId, company, and role are required');
  }

  const response = await fetchWithTimeout(
    `${API_BASE}/generate-questions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        company,
        role,
      }),
    },
    30000 // 30s timeout for JSON calls
  );

  const data = await response.json();
  return {
    question: data.question || data.questions?.[0] || '',
    questions: data.questions || (data.question ? [data.question] : []),
  };
}

/**
 * Submit text answer and get score + feedback
 * @param {Object} params - Parameters object
 * @param {string} params.sessionId - Session ID
 * @param {string} params.question - The question text
 * @param {string} params.answer - The text answer
 * @returns {Promise<{score: number, feedback: string[]}>}
 */
export async function submitAnswer({ sessionId, question, answer }) {
  if (!sessionId || !question || !answer) {
    throw new Error('sessionId, question, and answer are required');
  }

  const response = await fetchWithTimeout(
    `${API_BASE}/answer`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        question,
        answer,
      }),
    },
    30000 // 30s timeout for JSON calls
  );

  const data = await response.json();
  return {
    score: data.score ?? 0, // Score out of 100
    feedback: data.feedback || [],
  };
}


