import React from 'react';

function FeedbackDisplay({ feedback, questionIndex }) {
  if (!feedback || feedback.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-4">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">
          Feedback for Question {questionIndex + 1}
        </h3>
        <div className="space-y-2">
          {feedback.map((item, index) => (
            <p key={index} className="text-gray-700 flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>{item}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FeedbackDisplay;

