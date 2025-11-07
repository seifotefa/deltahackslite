import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';
import { uploadResume } from '../lib/api';
import { loadSession, saveSession } from '../lib/session';

function UploadResumePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileObject, setFileObject] = useState(null); // Store actual File object
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
    // Load existing session if available
    const session = loadSession();
    if (session.sessionId) {
      // Session exists, but we don't have file metadata stored
      // User can re-upload if needed
    }
  }, []);
  
  const validateFile = (file) => {
    if (!file) {
      setError('');
      return false;
    }
    
    // Check file type
    if (file.type !== 'application/pdf') {
      setError('PDF required.');
      return false;
    }
    
    // Check file size (10 MB max)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      setError('File too large (10 MB max).');
      return false;
    }
    
    setError('');
    return true;
  };
  
  const handleFileSelect = async (selectedFile) => {
    if (!validateFile(selectedFile)) {
      return;
    }

    const fileData = {
      name: selectedFile.name,
      size: selectedFile.size,
    };
    
    const hadFile = !!file;
    setFile(fileData);
    setFileObject(selectedFile); // Store actual File object for upload
    setError('');
    
    if (hadFile) {
      setToast({ message: 'Replaced previous file.', type: 'info' });
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };
  
  const handleRemove = () => {
    setFile(null);
    setFileObject(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setToast({ message: 'Resume removed.', type: 'info' });
  };
  
  const handleContinue = async () => {
    if (!file || !fileObject || error) {
      return;
    }

    setUploading(true);
    setError('');

    try {
      console.log('[Frontend] Uploading resume:', file.name);
      const result = await uploadResume(fileObject);
      console.log('[Frontend] Upload successful:', result);
      
      // Save sessionId to session store
      const session = loadSession();
      session.sessionId = result.sessionId;
      saveSession(session);
      
      setToast({ message: 'Resume uploaded successfully!', type: 'success' });
      
      // Navigate to job details page
      setTimeout(() => {
        navigate('/job');
      }, 500);
    } catch (error) {
      console.error('[Frontend] Upload error:', error);
      setError(error.message || 'Failed to upload resume. Please try again.');
      setToast({ message: error.message || 'Failed to upload resume.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <TopBar title="ResuMock" showTitle={false} />
      
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
          <div className="mb-10">
            <h2 className="text-[36px] md:text-[42px] font-bold text-ink mb-3">Upload Your Resume</h2>
            <p className="text-lg text-ink/60">Add a resume to begin.</p>
          </div>
          
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 rounded-card h-[280px] flex items-center justify-center
              spring-transition cursor-pointer bg-white
              ${isDragging 
                ? 'border-ink bg-ink/5 ring-2 ring-ink/20' 
                : 'border-gray-300 hover:border-ink/40 hover:bg-gray-50'
              }
              ${file ? 'border-ink/40 bg-gray-50' : ''}
            `}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Dropzone for PDF resume upload"
              aria-describedby={error ? 'dropzone-error' : 'dropzone-helper'}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
                className="hidden"
                aria-label="File input for PDF resume"
              />
              
              {!file ? (
                <div className="text-center spring-transition animate-slide-in-from-bottom-2">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-ink font-medium mb-1">Click to browse or drag and drop</p>
                  <p id="dropzone-helper" className="text-sm text-ink/60">PDF only, 10 MB max.</p>
                </div>
              ) : (
                <div className="w-full px-6">
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-button flex items-center justify-center flex-shrink-0">
                      <span className="text-ink font-semibold text-xs">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0 text-center">
                      <p className="font-medium text-ink truncate text-sm">{file.name}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 spring-transition-fast text-ink/50 hover:text-ink"
                      aria-label="Remove file"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          {/* Error message */}
          {error && (
            <div id="dropzone-error" className="mt-6 p-4 bg-red-50 border border-red-200 rounded-button" role="alert">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="mt-10">
            <button
              onClick={handleContinue}
              disabled={!file || !!error || uploading}
              className={`
                w-full px-8 py-4 rounded-button font-semibold text-base
                spring-transition-fast
                focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                ${file && !error && !uploading
                  ? 'bg-ink text-white hover:bg-ink/90 shadow-lg hover:shadow-xl active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                }
              `}
            >
              {uploading ? (
                <span className="flex items-center gap-3 justify-center">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
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

export default UploadResumePage;
