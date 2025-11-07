import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../utils/storage';

function StepProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const status = storage.getStepStatus();
  
  const steps = [
    { path: '/', label: '1', name: 'Resume' },
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
    <div className="w-full py-2 md:py-3" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={3}>
      <div className="flex items-center justify-center gap-1 md:gap-2">
        {steps.map((step, index) => {
          const completed = isCompleted(index);
          const active = index === currentStepIndex;
          const clickable = isClickable(index);
          
          return (
            <React.Fragment key={step.path}>
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <button
                  onClick={() => handleStepClick(step, index)}
                  disabled={!clickable}
                  className={`
                    relative flex items-center justify-center
                    w-10 h-10 md:w-12 md:h-12 rounded-full
                    spring-transition-fast
                    focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                    ${active 
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                      : completed
                      ? 'bg-primary text-white cursor-pointer hover:scale-105 hover:bg-primary-hover'
                      : 'bg-transparent text-gray-400 border-2 border-gray-300 cursor-not-allowed'
                    }
                    ${clickable && !active ? 'hover:bg-primary-hover' : ''}
                  `}
                  aria-label={`Step ${index + 1}: ${step.name}${completed ? ' (completed)' : ''}${active ? ' (current)' : ''}`}
                >
                  <span className="text-xs md:text-sm font-semibold">{step.label}</span>
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></span>
                  )}
                </button>
                <span className={`
                  text-[10px] md:text-xs font-medium spring-transition-fast
                  ${active ? 'text-primary' : completed ? 'text-gray-600' : 'text-gray-400'}
                `}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-8 md:w-16 h-0.5 spring-transition-fast
                  ${completed ? 'bg-primary' : 'bg-gray-300'}
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
