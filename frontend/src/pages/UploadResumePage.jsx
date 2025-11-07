import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Toast from '../components/Toast';
import { storage } from '../utils/storage';

function UploadResumePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    // Load existing resume if available
    const saved = storage.getResume();
    if (saved) {
      setFile({
        name: saved.name,
        size: saved.size,
      });
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
  
  const handleFileSelect = (selectedFile) => {
    if (validateFile(selectedFile)) {
      const fileData = {
        name: selectedFile.name,
        size: selectedFile.size,
      };
      
      const hadFile = !!file;
      setFile(fileData);
      storage.setResume(fileData);
      
      if (hadFile) {
        setToast({ message: 'Replaced previous file.', type: 'info' });
      } else {
        setToast({ message: 'Resume added.', type: 'success' });
      }
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
    setError('');
    storage.clearResume();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setToast({ message: 'Resume removed.', type: 'info' });
  };
  
  const handleContinue = () => {
    if (file && !error) {
      navigate('/job');
    }
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="min-h-screen">
      <TopBar title="profilo.ai" />
      
      <main className="pt-[160px] pb-[80px] px-5 md:pt-[180px] md:pb-[160px] md:px-6">
        <div className="max-w-[860px] mx-auto">
          <div className="glass-card rounded-card p-6 md:p-[32px] card-shadow spring-transition hover:shadow-xl hover:-translate-y-1">
            <h2 className="text-[32px] font-bold text-ink mb-2">Upload Your Resume</h2>
            <p className="text-ink/70 mb-8">Add a PDF to begin.</p>
            
            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-card h-[240px] flex items-center justify-center
                spring-transition cursor-pointer
                ${isDragging 
                  ? 'border-primary bg-primary/5 ring-2 ring-focus-ring' 
                  : 'border-gray-300 hover:border-primary/40 hover:bg-primary/5'
                }
                ${file ? 'border-primary/40 bg-primary/5' : ''}
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
                  <div className="spring-transition animate-slide-in-from-bottom-2">
                    <div className="bg-white/80 rounded-card p-4 card-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-button flex items-center justify-center flex-shrink-0">
                          <span className="text-red-600 font-bold text-xs">PDF</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink truncate">{file.name}</p>
                          <p className="text-sm text-ink/60">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove();
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 spring-transition-fast text-ink/60 hover:text-ink"
                          aria-label="Remove file"
                        >
                          <span className="text-xl">×</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-ink/50 mt-2 text-center">Stored locally for this session.</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Error message */}
            {error && (
              <div id="dropzone-error" className="mt-4 p-4 bg-red-50 border border-red-200 rounded-card spring-transition animate-slide-in-from-bottom-2" role="alert">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="mt-8">
              <button
                onClick={handleContinue}
                disabled={!file || !!error}
                className={`
                  w-full px-6 py-4 rounded-button font-semibold
                  spring-transition-fast
                  focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
                  ${file && !error
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

export default UploadResumePage;
