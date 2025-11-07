import React from 'react';

function FeedbackDisplay({ feedback, questionIndex }) {
  if (!feedback || (Array.isArray(feedback) && feedback.length === 0)) {
    return null;
  }

  const feedbackItems = Array.isArray(feedback) ? feedback : [feedback];

  return (
    <div className="glass-card rounded-card p-8 card-shadow spring-transition animate-slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-button flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-[28px] font-semibold text-ink">Feedback for Question {questionIndex + 1}</h3>
      </div>
      
      <div className="space-y-4">
        {feedbackItems.map((item, index) => (
          <div key={index} className="bg-white/60 rounded-card p-6">
            {item.strengths && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-green-700 mb-2">Strengths</h4>
                <p className="text-ink/80 leading-relaxed">{item.strengths}</p>
              </div>
            )}
            {item.areasForImprovement && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-amber-700 mb-2">Areas for Improvement</h4>
                <p className="text-ink/80 leading-relaxed">{item.areasForImprovement}</p>
              </div>
            )}
            {item.suggestions && (
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">Suggestions</h4>
                <p className="text-ink/80 leading-relaxed">{item.suggestions}</p>
              </div>
            )}
            {typeof item === 'string' && (
              <p className="text-ink/80 leading-relaxed">{item}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeedbackDisplay;
