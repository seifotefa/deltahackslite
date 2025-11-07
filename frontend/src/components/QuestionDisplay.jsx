import React from 'react';

function QuestionDisplay({ questions, answers, setAnswers, onGetFeedback, loadingFeedback }) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-[32px] font-bold text-ink mb-6">Interview Questions</h2>
      {questions.map((question, index) => (
        <div 
          key={index} 
          className="glass-card rounded-card p-8 card-shadow spring-transition hover:shadow-xl hover:-translate-y-1"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-button flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">{index + 1}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-[28px] font-semibold text-ink mb-3">
                Question {index + 1}
              </h3>
              <p className="text-ink/80 text-lg leading-relaxed">{question}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <label htmlFor={`answer-${index}`} className="block text-sm font-semibold text-ink mb-2">
              Your Answer
            </label>
            <textarea
              id={`answer-${index}`}
              value={answers[index] || ''}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[index] = e.target.value;
                setAnswers(newAnswers);
              }}
              placeholder="Type your answer here..."
              className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-primary bg-white/80 resize-none spring-transition-fast"
            />
          </div>
          
          <button
            onClick={() => onGetFeedback(index, question, answers[index])}
            disabled={!answers[index] || loadingFeedback === index}
            className={`
              mt-4 px-6 py-3 rounded-button font-semibold
              spring-transition-fast
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${answers[index] && loadingFeedback !== index
                ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400 shadow-lg hover:shadow-xl active:scale-[0.98]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }
            `}
          >
            {loadingFeedback === index ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      ))}
    </div>
  );
}

export default QuestionDisplay;
