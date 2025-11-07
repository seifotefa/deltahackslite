import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';
import InlineAlert from '../components/InlineAlert';
import { storage } from '../utils/storage';
import QuestionDisplay from '../components/QuestionDisplay';
import FeedbackDisplay from '../components/FeedbackDisplay';

function MainAppPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [resume, setResume] = useState(null);
  const [jobInfo, setJobInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(null);
  const [toast, setToast] = useState(null);
  const [alert, setAlert] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  useEffect(() => {
    // Check if all steps are complete
    const status = storage.getStepStatus();
    if (!status.step1Complete) {
      setAlert("Let's add your resume again.");
      setToast({ message: "Let's add your resume again.", type: 'info' });
      setTimeout(() => navigate('/upload'), 1500);
      return;
    }
    if (!status.step2Complete) {
      setAlert('Complete this step to continue.');
      setToast({ message: 'Complete this step to continue.', type: 'error' });
      setTimeout(() => navigate('/job'), 1500);
      return;
    }
    
    // Check if user tried to navigate forward without completing previous step
    if (location.state?.from) {
      setAlert('Complete this step to continue.');
    }
    
    // Load data
    const savedResume = storage.getResume();
    const savedJobInfo = storage.getJobInfo();
    setResume(savedResume);
    setJobInfo(savedJobInfo);
    
    // Show success toast on first arrival
    if (savedResume && savedJobInfo && !location.state?.from) {
      setTimeout(() => {
        setShowSuccessToast(true);
        setToast({ message: "Setup complete — let's start!", type: 'success' });
      }, 500);
    }
  }, [navigate, location]);
  
  const handleEditResume = () => {
    navigate('/upload');
  };
  
  const handleEditJob = () => {
    navigate('/job');
  };
  
  const handleChangeResume = () => {
    navigate('/upload');
  };
  
  const handleChangeJobInfo = () => {
    navigate('/job');
  };
  
  const handleGenerateQuestions = async () => {
    if (!resume || !jobInfo) {
      setToast({ message: 'Please complete all steps first.', type: 'error' });
      return;
    }
    
    setLoadingQuestions(true);
    try {
      // For now, we'll need to extract text from the resume
      // Since we only store metadata, we'll need to handle this differently
      // For now, let's use a placeholder approach
      const response = await fetch('/api/generateQuestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: `Resume: ${resume.name}`, // Placeholder - in real app, extract PDF text
          company: jobInfo.company,
          role: jobInfo.role,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(''));
      setFeedback({});
    } catch (error) {
      console.error('Error generating questions:', error);
      setToast({ message: 'Failed to generate questions. Please try again.', type: 'error' });
    } finally {
      setLoadingQuestions(false);
    }
  };
  
  const handleGetFeedback = async (questionIndex, question, answer) => {
    if (!answer.trim()) {
      setToast({ message: 'Please provide an answer before getting feedback', type: 'error' });
      return;
    }
    
    setLoadingFeedback(questionIndex);
    try {
      const response = await fetch('/api/analyzeAnswer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          answer,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze answer');
      }
      
      const data = await response.json();
      setFeedback((prev) => ({
        ...prev,
        [questionIndex]: data.feedback,
      }));
    } catch (error) {
      console.error('Error analyzing answer:', error);
      setToast({ message: 'Failed to analyze answer. Please try again.', type: 'error' });
    } finally {
      setLoadingFeedback(null);
    }
  };
  
  if (!resume || !jobInfo) {
    return null; // Will redirect
  }
  
  return (
    <div className="min-h-screen">
      <TopBar title="MockMate" />
      
      <main className="pt-[160px] pb-[80px] px-5 md:pt-[180px] md:pb-[160px] md:px-6">
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
                <span className="text-sm font-medium text-ink">{resume.name}</span>
                <button
                  onClick={handleEditResume}
                  className="text-primary hover:text-primary-hover text-xs font-medium spring-transition-fast ml-1"
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
                  {jobInfo.company} • {jobInfo.role}
                </span>
                <button
                  onClick={handleEditJob}
                  className="text-primary hover:text-primary-hover text-xs font-medium spring-transition-fast ml-1"
                  aria-label="Edit job info"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          
          {/* Primary Controls */}
          {questions.length === 0 ? (
            <div className="glass-card rounded-card p-12 md:p-16 card-shadow text-center">
              <div className="spring-transition animate-slide-in-from-bottom-2">
                <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-primary"
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
                <p className="text-ink/70 mb-8 max-w-md mx-auto">Generate personalized interview questions based on your resume and job details.</p>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={loadingQuestions}
                  className="px-8 py-4 bg-primary text-white rounded-button font-semibold text-lg spring-transition-fast hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  {loadingQuestions ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Questions...
                    </span>
                  ) : (
                    'Generate Questions'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-4 md:justify-start justify-stretch">
                <button
                  onClick={handleChangeResume}
                  className="px-4 py-2 bg-transparent text-ink/70 rounded-button font-medium spring-transition-fast hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 md:w-auto w-full"
                >
                  Change Resume
                </button>
                <button
                  onClick={handleChangeJobInfo}
                  className="px-4 py-2 bg-transparent text-ink/70 rounded-button font-medium spring-transition-fast hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 md:w-auto w-full"
                >
                  Change Job Info
                </button>
              </div>
              
              <QuestionDisplay
                questions={questions}
                answers={answers}
                setAnswers={setAnswers}
                onGetFeedback={handleGetFeedback}
                loadingFeedback={loadingFeedback}
              />
              
              {Object.keys(feedback).length > 0 && (
                <div className="space-y-4">
                  {Object.entries(feedback).map(([index, feedbackItems]) => (
                    <FeedbackDisplay
                      key={index}
                      feedback={feedbackItems}
                      questionIndex={parseInt(index)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
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
