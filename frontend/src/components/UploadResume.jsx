import React from 'react';

function UploadResume({ resumeText, setResumeText }) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Resume Text
      </label>
      <textarea
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        placeholder="Paste your resume text here or upload a PDF..."
        className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
      <p className="mt-2 text-sm text-gray-500">
        Paste your resume content above. Include your experience, skills, and achievements.
      </p>
    </div>
  );
}

export default UploadResume;

