import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';
import InlineAlert from '../components/InlineAlert';
import ScoreBar from '../components/ScoreBar';
import { loadSession, saveSession, ensureStep } from '../lib/session';
import { generateQuestions, submitAnswer } from '../lib/api';

function MainAppPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobInfo, setJobInfo] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [review, setReview] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [toast, setToast] = useState(null);
  const [alert, setAlert] = useState('');
  
  useEffect(() => {
    // Check if all steps are complete using session store
    const session = loadSession();
    
    if (!ensureStep('resume')) {
      setAlert("Let's add your resume again.");
      setToast({ message: "Let's add your resume again.", type: 'info' });
      setTimeout(() => navigate('/'), 1500);
      return;
    }
    
    if (!ensureStep('job')) {
      setAlert('Complete this step to continue.');
      setToast({ message: 'Complete this step to continue.', type: 'error' });
      setTimeout(() => navigate('/job'), 1500);
      return;
    }
    
    // Check if user tried to navigate forward without completing previous step
    if (location.state?.from) {
      setAlert('Complete this step to continue.');
    }
    
    // Load data from session
    if (session.company && session.role) {
      setJobInfo({ company: session.company, role: session.role });
    }
    
    // Load question if it exists
    if (session.questions && session.questions.length > 0) {
      setQuestion(session.questions[0]);
    }
    
    // Show success toast on first arrival
    if (session.company && session.role && !location.state?.from) {
      setTimeout(() => {
        setToast({ message: "Setup complete — let's start!", type: 'success' });
      }, 500);
    }
  }, [navigate, location]);
  
  const handleEditResume = () => {
    navigate('/');
  };
  
  const handleEditJob = () => {
    navigate('/job');
  };
  
  const handleGenerateQuestion = async () => {
    const session = loadSession();
    
    if (!session.sessionId || !session.company || !session.role) {
      setToast({ message: 'Please complete all steps first.', type: 'error' });
      return;
    }
    
    setLoadingQuestion(true);
    setToast(null);
    
    try {
      const data = await generateQuestions({
        sessionId: session.sessionId,
        company: session.company,
        role: session.role,
      });
      
      const questionText = data.question || data.questions?.[0] || '';
      setQuestion(questionText);
      setAnswer('');
      setReview(null);
      
      // Save question to session
      session.questions = [questionText];
      saveSession(session);
      
      setToast({ message: 'Question generated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error generating question:', error);
      setToast({ message: error.message || 'Failed to generate question. Please try again.', type: 'error' });
    } finally {
      setLoadingQuestion(false);
    }
  };
  
  const handleGetFeedback = async () => {
    if (!answer.trim()) {
      setToast({ message: 'Please provide an answer before getting feedback', type: 'error' });
      return;
    }
    
    if (!question.trim()) {
      setToast({ message: 'No question available', type: 'error' });
      return;
    }
    
    setLoadingFeedback(true);
    setToast(null);
    
    try {
      const session = loadSession();
      if (!session.sessionId) {
        throw new Error('Session expired. Please start over.');
      }
      
      const data = await submitAnswer({
        sessionId: session.sessionId,
        question: question,
        answer: answer,
      });
      
      console.log('[Frontend] Review data received:', data);
      console.log('[Frontend] Score:', data.score);
      console.log('[Frontend] Feedback:', data.feedback);
      console.log('[Frontend] Feedback length:', data.feedback?.length);
      
      setToast({ message: 'Analyzing your answer...', type: 'info' });
      
      // Wait 5 seconds before displaying the review
      setTimeout(() => {
        console.log('[Frontend] Setting review after 5 seconds:', data);
        setReview(data);
        setToast({ message: 'Answer reviewed successfully!', type: 'success' });
        
        // Scroll to review card after a short delay
        setTimeout(() => {
          const reviewCard = document.getElementById('review-card');
          if (reviewCard) {
            reviewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }, 5000);
    } catch (error) {
      console.error('Error submitting answer:', error);
      setToast({ message: error.message || 'Failed to review answer. Please try again.', type: 'error' });
    } finally {
      setLoadingFeedback(false);
    }
  };
  
  const session = loadSession();
  
  if (!session.sessionId || !session.company || !session.role) {
    return null; // Will redirect
  }
  
  // Use session data for job info
  if (!jobInfo && session.company && session.role) {
    setJobInfo({ company: session.company, role: session.role });
  }
  
  const displayJobInfo = jobInfo || { company: session.company, role: session.role };
  
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <TopBar title="profilo.ai" showTitle={false} />
      
      {/* profilo.ai in top left */}
      <div className="fixed top-6 left-6 z-[60]">
        <button
          onClick={() => navigate('/')}
          className="text-xl font-bold text-ink hover:text-ink/80 spring-transition-fast cursor-pointer bg-white/90 backdrop-blur-none border-none p-0"
        >
          profilo.ai
        </button>
      </div>
      
      <main className="flex-1 overflow-hidden pt-[100px] pb-[100px] px-6 md:px-8">
        <div className="max-w-[860px] mx-auto space-y-6">
          {/* Inline Alert */}
          {alert && (
            <div className="mb-6">
              <InlineAlert message={alert} type="error" />
            </div>
          )}
          
          {/* Summary Chips */}
          <div className="glass-card rounded-pill p-4 card-shadow">
            <div className="flex flex-wrap gap-3">
              {/* Resume Chip */}
              <div className="flex items-center gap-2 bg-white/60 rounded-pill px-3 py-2">
                <div className="w-6 h-6 bg-red-100 rounded-button flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 font-bold text-[10px]">PDF</span>
                </div>
                <span className="text-sm font-medium text-ink">Resume uploaded</span>
                <button
                  onClick={handleEditResume}
                  className="text-ink/70 hover:text-ink text-xs font-medium spring-transition-fast ml-1"
                  aria-label="Change resume"
                >
                  Change
                </button>
              </div>
              
              {/* Job Info Chip */}
              <div className="flex items-center gap-2 bg-white/60 rounded-pill px-3 py-2">
                <svg className="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-ink">
                  {displayJobInfo.company} • {displayJobInfo.role}
                </span>
                <button
                  onClick={handleEditJob}
                  className="text-ink/70 hover:text-ink text-xs font-medium spring-transition-fast ml-1"
                  aria-label="Edit job info"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          
          {/* Primary Controls */}
          {!question ? (
            <div className="glass-card rounded-card p-12 md:p-16 card-shadow text-center">
              <div className="spring-transition animate-slide-in-from-bottom-2">
                <div className="w-24 h-24 mx-auto mb-6 bg-ink/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-ink"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h3 className="text-[28px] font-bold text-ink mb-3">Ready to Practice?</h3>
                <p className="text-ink/70 mb-8 max-w-md mx-auto">Generate a personalized interview question based on your resume and job details.</p>
                <button
                  onClick={handleGenerateQuestion}
                  disabled={loadingQuestion}
                  className="px-8 py-4 bg-ink text-white rounded-button font-semibold text-lg spring-transition-fast hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  {loadingQuestion ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Question...
                    </span>
                  ) : (
                    'Generate Question'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-4 md:justify-start justify-stretch">
                <button
                  onClick={handleEditResume}
                  className="px-4 py-2 bg-transparent text-ink/70 rounded-button font-medium spring-transition-fast hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 md:w-auto w-full"
                >
                  Change Resume
                </button>
                <button
                  onClick={handleEditJob}
                  className="px-4 py-2 bg-transparent text-ink/70 rounded-button font-medium spring-transition-fast hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 md:w-auto w-full"
                >
                  Change Job Info
                </button>
              </div>
              
              {/* Question Card */}
              <div className="glass-card rounded-card p-8 card-shadow spring-transition hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-button flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">Q</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[28px] font-semibold text-ink mb-3">Question</h3>
                    <p className="text-ink/80 text-lg leading-relaxed">{question}</p>
                  </div>
                </div>
                
                {/* Answer Textarea */}
                <div className="mt-6">
                  <label htmlFor="answer" className="block text-sm font-semibold text-ink mb-2">
                    Your Answer
                  </label>
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-primary bg-white/80 resize-none spring-transition-fast"
                  />
                </div>
                
                {/* Submit Button */}
                <button
                  onClick={handleGetFeedback}
                  disabled={!answer.trim() || loadingFeedback}
                  className={`
                    mt-6 w-full px-6 py-4 rounded-button font-semibold text-base
                    spring-transition-fast
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${answer.trim() && !loadingFeedback
                      ? 'bg-primary text-white hover:bg-primary-hover focus:ring-focus-ring shadow-lg hover:shadow-xl active:scale-[0.98]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  {loadingFeedback ? (
                    <span className="flex items-center gap-3 justify-center">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    'Get Feedback'
                  )}
                </button>
              </div>
              
              {/* Review Card */}
              {review && (
                <div 
                  id="review-card"
                  className="glass-card rounded-card p-8 card-shadow spring-transition animate-slide-in-from-bottom-4"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-button flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[28px] font-semibold text-ink">Review Complete</h3>
                      <p className="text-sm text-ink/60 mt-1">Your answer has been analyzed</p>
                    </div>
                  </div>
                  
                  {/* Score Display */}
                  <div className="mb-8">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-baseline gap-3 mb-2">
                        <span className="text-6xl font-bold text-ink">{Math.round(review.score)}</span>
                        <span className="text-3xl text-ink/60 font-medium">/ 100</span>
                      </div>
                      <p className="text-lg text-ink/70 font-medium">
                        {review.score >= 80 && "Excellent Performance"}
                        {review.score >= 60 && review.score < 80 && "Good Performance"}
                        {review.score >= 40 && review.score < 60 && "Fair Performance"}
                        {review.score < 40 && "Needs Improvement"}
                      </p>
                    </div>
                    <ScoreBar score={review.score} />
                  </div>
                  
                  {/* Divider */}
                  <div className="h-px bg-ink/10 mb-6"></div>
                  
                  {/* Feedback */}
                  {review.feedback && review.feedback.length > 0 && (
                    <div>
                      <h4 className="text-xl font-semibold text-ink mb-5">Feedback & Suggestions</h4>
                      <ul className="space-y-3">
                        {review.feedback.map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <span className="text-primary font-bold text-xs">•</span>
                            </div>
                            <p className="text-ink/80 leading-relaxed text-base flex-1">{item}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center">
        <p className="text-xs text-ink/40 font-medium">profilo.ai</p>
      </footer>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default MainAppPage;
