import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';
import InlineAlert from '../components/InlineAlert';
import { storage } from '../utils/storage';

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
  const companyInputRef = useRef(null);
  const roleInputRef = useRef(null);
  
  useEffect(() => {
    // Check if resume exists, if not redirect to step 1
    const resume = storage.getResume();
    if (!resume) {
      setAlert('Complete this step to continue.');
      setTimeout(() => navigate('/'), 1500);
      return;
    }
    
    // Check if user tried to navigate forward without completing previous step
    if (location.state?.from === '/app') {
      setAlert('Complete this step to continue.');
    }
    
    // Load existing job info if available
    const saved = storage.getJobInfo();
    if (saved) {
      setCompany(saved.company || '');
      setRole(saved.role || '');
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
    navigate('/');
  };
  
  const handleContinue = () => {
    const companyValid = validateField('company', company);
    const roleValid = validateField('role', role);
    
    if (companyValid && roleValid) {
      storage.setJobInfo({ company: company.trim(), role: role.trim() });
      navigate('/app');
    }
  };
  
  const isFormValid = company.trim() && role.trim() && !errors.company && !errors.role;
  const hasCompanyValue = company.trim().length > 0;
  const hasRoleValue = role.trim().length > 0;
  
  return (
    <div className="min-h-screen">
      <TopBar title="Job Details" />
      
      <main className="pt-[160px] pb-[80px] px-5 md:pt-[180px] md:pb-[160px] md:px-6">
        <div className="max-w-[860px] mx-auto">
          <div className="glass-card rounded-card p-6 md:p-[32px] card-shadow spring-transition hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-[32px] font-bold text-ink">Job Details</h2>
              <div className="relative">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={() => setShowTooltip(!showTooltip)}
                  className="w-5 h-5 rounded-full border border-ink/20 flex items-center justify-center text-ink/60 hover:text-ink hover:border-ink/40 spring-transition-fast"
                  aria-label="Why we ask"
                >
                  <span className="text-xs">?</span>
                </button>
                {showTooltip && (
                  <div className="absolute top-6 left-0 w-64 p-3 bg-ink text-white rounded-button text-xs shadow-lg z-10 spring-transition animate-slide-in-from-bottom-2">
                    We use this information to tailor interview questions. No data is uploaded externally—everything stays on your device.
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-ink/70 mb-8">We'll tailor questions to this role.</p>
            
            <div className="space-y-6 mt-8">
              {/* Company Name */}
              <div className="spring-transition animate-slide-in-from-bottom-2" style={{ animationDelay: '40ms' }}>
                <div className="relative">
                  <label 
                    htmlFor="company" 
                    className={`
                      absolute left-4 spring-transition-fast pointer-events-none
                      ${isCompanyFocused || hasCompanyValue
                        ? 'top-2 text-xs text-primary'
                        : 'top-4 text-base text-ink/60'
                      }
                    `}
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
                      w-full px-4 pt-6 pb-2 rounded-button border-2
                      spring-transition-fast
                      focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                      ${errors.company
                        ? 'border-red-300 focus:ring-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-primary bg-white/80'
                      }
                    `}
                    aria-invalid={!!errors.company}
                    aria-describedby={errors.company ? 'company-error' : undefined}
                  />
                </div>
                {errors.company && (
                  <p id="company-error" className="mt-2 text-sm text-red-600 spring-transition animate-slide-in-from-bottom-2">
                    {errors.company}
                  </p>
                )}
              </div>
              
              {/* Role Title */}
              <div className="spring-transition animate-slide-in-from-bottom-2" style={{ animationDelay: '80ms' }}>
                <div className="relative">
                  <label 
                    htmlFor="role" 
                    className={`
                      absolute left-4 spring-transition-fast pointer-events-none
                      ${isRoleFocused || hasRoleValue
                        ? 'top-2 text-xs text-primary'
                        : 'top-4 text-base text-ink/60'
                      }
                    `}
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
                      w-full px-4 pt-6 pb-2 rounded-button border-2
                      spring-transition-fast
                      focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                      ${errors.role
                        ? 'border-red-300 focus:ring-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-primary bg-white/80'
                      }
                    `}
                    aria-invalid={!!errors.role}
                    aria-describedby={errors.role ? 'role-error' : undefined}
                  />
                </div>
                {errors.role && (
                  <p id="role-error" className="mt-2 text-sm text-red-600 spring-transition animate-slide-in-from-bottom-2">
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
            <div className="flex gap-4 mt-8 md:justify-end">
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-transparent text-ink/70 rounded-button font-medium spring-transition-fast hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 md:w-auto w-full"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!isFormValid}
                className={`
                  px-6 py-3 rounded-button font-semibold
                  spring-transition-fast
                  focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                  md:w-auto w-full
                  ${isFormValid
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-lg hover:shadow-xl active:scale-[0.98]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  }
                `}
              >
                Continue
              </button>
            </div>
          </div>
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

export default JobDetailsPage;
