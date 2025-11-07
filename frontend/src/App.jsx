import React, { useState } from 'react';
import UploadResume from './components/UploadResume';
import JobInfoForm from './components/JobInfoForm';
import QuestionDisplay from './components/QuestionDisplay';
import FeedbackDisplay from './components/FeedbackDisplay';

function App() {
  const [resumeText, setResumeText] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(null);

  const handleGenerateQuestions = async () => {
    if (!resumeText.trim() || !company.trim() || !role.trim()) {
      alert('Please fill in all fields: Resume, Company, and Role');
      return;
    }

    setLoadingQuestions(true);
    try {
      const response = await fetch('/api/generateQuestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          company,
          role,
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
      alert('Failed to generate questions. Please try again.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleGetFeedback = async (questionIndex, question, answer) => {
    if (!answer.trim()) {
      alert('Please provide an answer before getting feedback');
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
      alert('Failed to analyze answer. Please try again.');
    } finally {
      setLoadingFeedback(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-800">
            MockMate – Your AI Interview Coach
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Step 1: Upload Resume */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Step 1: Upload Your Resume
            </h2>
            <UploadResume resumeText={resumeText} setResumeText={setResumeText} />
          </section>

          {/* Step 2: Job Information */}
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Step 2: Enter Job Information
            </h2>
            <JobInfoForm
              company={company}
              setCompany={setCompany}
              role={role}
              setRole={setRole}
            />
          </section>

          {/* Generate Questions Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateQuestions}
              disabled={loadingQuestions}
              className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {loadingQuestions ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

          {/* Step 3: Questions and Answers */}
          {questions.length > 0 && (
            <section className="bg-white p-6 rounded-lg shadow-md">
              <QuestionDisplay
                questions={questions}
                answers={answers}
                setAnswers={setAnswers}
                onGetFeedback={handleGetFeedback}
                loadingFeedback={loadingFeedback}
              />
            </section>
          )}

          {/* Feedback Display */}
          {Object.keys(feedback).length > 0 && (
            <section className="space-y-4">
              {Object.entries(feedback).map(([index, feedbackItems]) => (
                <FeedbackDisplay
                  key={index}
                  feedback={feedbackItems}
                  questionIndex={parseInt(index)}
                />
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

