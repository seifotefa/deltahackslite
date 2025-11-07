import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';
import InlineAlert from '../components/InlineAlert';
import { loadSession, saveSession, ensureStep } from '../lib/session';
import { generateQuestions } from '../lib/api';

function JobDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({ company: '', role: '' });
  const [toast, setToast] = useState(null);
  const [alert, setAlert] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [isCompanyFocused, setIsCompanyFocused] = useState(false);
  const [isRoleFocused, setIsRoleFocused] = useState(false);
  const [generating, setGenerating] = useState(false);
  const companyInputRef = useRef(null);
  const roleInputRef = useRef(null);
  
  useEffect(() => {
    // Check if resume is uploaded (sessionId exists)
    const session = loadSession();
    if (!ensureStep('resume')) {
      setAlert('Complete this step to continue.');
      setTimeout(() => navigate('/'), 1500);
      return;
    }
    
    // Check if user tried to navigate forward without completing previous step
    if (location.state?.from === '/app') {
      setAlert('Complete this step to continue.');
    }
    
    // Load existing job info if available
    if (session.company && session.role) {
      setCompany(session.company);
      setRole(session.role);
    }
  }, [navigate, location]);
  
  const validateField = (field, value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setErrors(prev => ({ ...prev, [field]: 'This field is required.' }));
      return false;
    }
    setErrors(prev => ({ ...prev, [field]: '' }));
    return true;
  };
  
  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setCompany(value);
    if (errors.company) {
      validateField('company', value);
    }
  };
  
  const handleRoleChange = (e) => {
    const value = e.target.value;
    setRole(value);
    if (errors.role) {
      validateField('role', value);
    }
  };
  
  const handleBack = () => {
    navigate('/upload');
  };
  
  const handleContinue = async () => {
    const companyValid = validateField('company', company);
    const roleValid = validateField('role', role);
    
    if (!companyValid || !roleValid) {
      return;
    }

    const session = loadSession();
    if (!session.sessionId) {
      setErrors({ company: '', role: 'Please upload a resume first.' });
      setToast({ message: 'Please upload a resume first.', type: 'error' });
      setTimeout(() => navigate('/'), 1500);
      return;
    }

    setGenerating(true);
    setErrors({ company: '', role: '' });

    try {
      const trimmedCompany = company.trim();
      const trimmedRole = role.trim();
      
      console.log('[Frontend] Generating questions:', { sessionId: session.sessionId, company: trimmedCompany, role: trimmedRole });
      
      // Save company and role to session first
      session.company = trimmedCompany;
      session.role = trimmedRole;
      saveSession(session);
      
      // Generate questions
      const result = await generateQuestions({
        sessionId: session.sessionId,
        company: trimmedCompany,
        role: trimmedRole,
      });
      
      console.log('[Frontend] Questions generated:', result);
      
      // Save questions to session
      session.questions = result.questions;
      session.currentIndex = 0;
      saveSession(session);
      
      setToast({ message: 'Setup complete — let\'s start!', type: 'success' });
      
      // Navigate to main app
      setTimeout(() => {
        navigate('/app');
      }, 500);
    } catch (error) {
      console.error('[Frontend] Generate questions error:', error);
      setErrors({ company: '', role: error.message || 'Failed to generate questions. Please try again.' });
      setToast({ message: error.message || 'Failed to generate questions.', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };
  
  const isFormValid = company.trim() && role.trim() && !errors.company && !errors.role;
  const hasCompanyValue = company.trim().length > 0;
  const hasRoleValue = role.trim().length > 0;
  
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <TopBar title="Job Details" showTitle={false} />
      
      {/* ResuMock in top left */}
      <div className="fixed top-6 left-6 z-[60]">
        <button
          onClick={() => navigate('/')}
          className="text-xl font-bold text-ink hover:text-ink/80 spring-transition-fast cursor-pointer bg-white/90 backdrop-blur-none border-none p-0"
        >
          ResuMock
        </button>
      </div>
      
      <main className="flex-1 overflow-hidden pt-[100px] pb-[100px] px-6 md:px-8">
        <div className="max-w-[700px] mx-auto">
          <div className="mb-8">
            <h2 className="text-[36px] md:text-[42px] font-bold text-ink mb-3">Job Details</h2>
            <p className="text-lg text-ink/60">We'll tailor questions to this role.</p>
          </div>
          
          <div className="space-y-8">
            {/* Company Name */}
            <div>
              <label 
                htmlFor="company" 
                className="block text-sm font-semibold text-ink mb-3"
              >
                Company Name
              </label>
              <input
                ref={companyInputRef}
                id="company"
                type="text"
                value={company}
                onChange={handleCompanyChange}
                onBlur={() => {
                  validateField('company', company);
                  setIsCompanyFocused(false);
                }}
                onFocus={() => {
                  setErrors(prev => ({ ...prev, company: '' }));
                  setIsCompanyFocused(true);
                }}
                placeholder="e.g., Apple, Shopify, RBC"
                className={`
                  w-full px-5 py-4 rounded-button border-2 text-base
                  spring-transition-fast
                  focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                  ${errors.company
                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-ink bg-white'
                  }
                `}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? 'company-error' : undefined}
              />
              {errors.company && (
                <p id="company-error" className="mt-2 text-sm text-red-600">
                  {errors.company}
                </p>
              )}
            </div>
            
            {/* Role Title */}
            <div>
              <label 
                htmlFor="role" 
                className="block text-sm font-semibold text-ink mb-3"
              >
                Role Title
              </label>
              <input
                ref={roleInputRef}
                id="role"
                type="text"
                value={role}
                onChange={handleRoleChange}
                onBlur={() => {
                  validateField('role', role);
                  setIsRoleFocused(false);
                }}
                onFocus={() => {
                  setErrors(prev => ({ ...prev, role: '' }));
                  setIsRoleFocused(true);
                }}
                placeholder="e.g., Software Engineer"
                className={`
                  w-full px-5 py-4 rounded-button border-2 text-base
                  spring-transition-fast
                  focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                  ${errors.role
                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-ink bg-white'
                  }
                `}
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? 'role-error' : undefined}
              />
              {errors.role && (
                <p id="role-error" className="mt-2 text-sm text-red-600">
                  {errors.role}
                </p>
              )}
            </div>
          </div>
          
          {/* Inline Alert */}
          {alert && (
            <div className="mt-6">
              <InlineAlert message={alert} type="error" />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-4 mt-10">
            <button
              onClick={handleBack}
              className="px-8 py-4 bg-transparent text-ink/70 rounded-button font-semibold spring-transition-fast hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
            >
              Back
            </button>
            <button
              onClick={handleContinue}
              disabled={!isFormValid || generating}
              className={`
                flex-1 px-8 py-4 rounded-button font-semibold text-base
                spring-transition-fast
                focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                ${isFormValid && !generating
                  ? 'bg-ink text-white hover:bg-ink/90 shadow-lg hover:shadow-xl active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                }
              `}
            >
              {generating ? (
                <span className="flex items-center gap-3 justify-center">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Questions...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </main>
      
      {/* Footer with ResuMock */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center">
        <p className="text-xs text-ink/40 font-medium">ResuMock</p>
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

export default JobDetailsPage;
