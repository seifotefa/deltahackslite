import React from 'react';

function QuestionDisplay({ questions, answers, setAnswers, onGetFeedback, loadingFeedback }) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Interview Questions</h2>
      {questions.map((question, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Question {index + 1}
          </h3>
          <p className="text-gray-700 mb-4">{question}</p>
          <textarea
            value={answers[index] || ''}
            onChange={(e) => {
              const newAnswers = [...answers];
              newAnswers[index] = e.target.value;
              setAnswers(newAnswers);
            }}
            placeholder="Type your answer here..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-3"
          />
          <button
            onClick={() => onGetFeedback(index, question, answers[index])}
            disabled={!answers[index] || loadingFeedback === index}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loadingFeedback === index ? 'Analyzing...' : 'Get Feedback'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default QuestionDisplay;

