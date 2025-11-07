import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../utils/storage';

function StepProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = storage.getStepStatus();
  
  const steps = [
    { path: '/upload', label: '1', name: 'Resume' },
    { path: '/job', label: '2', name: 'Job' },
    { path: '/app', label: '3', name: 'App' },
  ];
  
  const currentStepIndex = steps.findIndex(step => step.path === location.pathname);
  
  const handleStepClick = (step, index) => {
    // Only allow navigation to completed steps or current step
    if (index === 0 && status.step1Complete) {
      navigate(step.path);
    } else if (index === 1 && status.step2Complete) {
      navigate(step.path);
    } else if (index === 2 && status.allComplete) {
      navigate(step.path);
    } else if (index === currentStepIndex) {
      // Already on this step
      return;
    }
  };
  
  const isCompleted = (index) => {
    if (index === 0) return status.step1Complete;
    if (index === 1) return status.step2Complete;
    if (index === 2) return status.allComplete;
    return false;
  };
  
  const isClickable = (index) => {
    return isCompleted(index) || index === currentStepIndex;
  };
  
  return (
    <div className="w-full py-2" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={3}>
      <div className="flex items-center justify-center gap-2 md:gap-3">
        {steps.map((step, index) => {
          const completed = isCompleted(index);
          const active = index === currentStepIndex;
          const clickable = isClickable(index);
          
          return (
            <React.Fragment key={step.path}>
              <button
                onClick={() => handleStepClick(step, index)}
                disabled={!clickable}
                className={`
                  relative flex items-center justify-center
                  w-8 h-8 md:w-9 md:h-9 rounded-full
                  font-semibold text-sm md:text-base
                  focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                  ${active 
                    ? 'bg-ink text-white animate-breathe' 
                    : completed
                    ? 'bg-ink/80 text-white cursor-pointer hover:bg-ink'
                    : 'bg-transparent text-gray-400 border-2 border-gray-300 cursor-not-allowed'
                  }
                `}
                aria-label={`Step ${index + 1}: ${step.name}${completed ? ' (completed)' : ''}${active ? ' (current)' : ''}`}
              >
                {step.label}
              </button>
              {index < steps.length - 1 && (
                <div className={`
                  w-12 md:w-16 h-0.5
                  ${completed ? 'bg-ink' : 'bg-gray-300'}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default StepProgress;
