/**
 * Session store for managing app session and flow state
 * @typedef {Object} AppSession
 * @property {string|null} sessionId - Session ID from backend
 * @property {string|null} company - Company name
 * @property {string|null} role - Job role/title
 * @property {string[]} questions - Array of questions (length 0..3)
 * @property {number} currentIndex - Current question index (0..2)
 */

const STORAGE_KEY = 'mm_session';

/**
 * Default session state
 * @type {AppSession}
 */
const DEFAULT_SESSION = {
  sessionId: null,
  company: null,
  role: null,
  questions: [],
  currentIndex: 0,
};

/**
 * Load session from localStorage
 * @returns {AppSession}
 */
export function loadSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_SESSION };
    }

    const parsed = JSON.parse(stored);
    
    // Ensure all required fields exist with defaults
    return {
      sessionId: parsed.sessionId ?? null,
      company: parsed.company ?? null,
      role: parsed.role ?? null,
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
    };
  } catch (error) {
    console.error('Failed to load session:', error);
    return { ...DEFAULT_SESSION };
  }
}

/**
 * Save session to localStorage
 * @param {AppSession} session - Session object to save
 */
export function saveSession(session) {
  try {
    // Validate and sanitize session data
    const sanitized = {
      sessionId: session.sessionId ?? null,
      company: session.company ?? null,
      role: session.role ?? null,
      questions: Array.isArray(session.questions) ? session.questions : [],
      currentIndex: typeof session.currentIndex === 'number' 
        ? Math.max(0, Math.min(2, session.currentIndex)) 
        : 0,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Clear session from localStorage
 */
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

/**
 * Ensure step requirements are met
 * @param {'resume'|'job'|'app'} step - Step to check
 * @returns {boolean} - True if step requirements are met
 */
export function ensureStep(step) {
  const session = loadSession();

  switch (step) {
    case 'resume':
      return session.sessionId !== null;

    case 'job':
      return session.sessionId !== null && 
             session.company !== null && 
             session.role !== null;

    case 'app':
      return session.sessionId !== null && 
             session.company !== null && 
             session.role !== null && 
             session.questions.length === 3;

    default:
      return false;
  }
}


