import React, { useState, useEffect, useRef } from 'react';

/**
 * AudioRecorder component for recording audio answers
 * @param {Object} props
 * @param {number} props.maxSeconds - Maximum recording duration in seconds (default: 120)
 * @param {string[]} props.mimeTypeCandidates - Array of MIME types to try (default: ['audio/webm;codecs=opus','audio/webm','audio/mpeg'])
 * @param {Function} props.onRecorded - Callback when recording is complete: (blob: Blob, mimeType: string, durationSec: number) => void
 */
function AudioRecorder({ 
  maxSeconds = 120, 
  mimeTypeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mpeg'],
  onRecorded 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedMimeType, setRecordedMimeType] = useState(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  
  // Find supported MIME type
  const getSupportedMimeType = () => {
    for (const mimeType of mimeTypeCandidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'audio/webm'; // Fallback
  };
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setMicPermissionDenied(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSec = recordedDuration || duration;
        
        setRecordedBlob(blob);
        setRecordedMimeType(mimeType);
        setRecordedDuration(durationSec);
        
        // Create audio URL for playback
        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(blob);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 0.25;
          
          // Auto-stop at maxSeconds
          if (newDuration >= maxSeconds) {
            stopRecording();
            return maxSeconds;
          }
          
          return newDuration;
        });
      }, 250);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionDenied(true);
        setError('Microphone permission denied. Please allow microphone access to record.');
      } else {
        setError('Failed to start recording. Please try again.');
      }
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };
  
  // Retake recording
  const handleRetake = () => {
    setRecordedBlob(null);
    setRecordedMimeType(null);
    setRecordedDuration(0);
    setDuration(0);
    setError(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };
  
  // Submit recording
  const handleSubmit = () => {
    if (recordedBlob && recordedMimeType && onRecorded) {
      onRecorded(recordedBlob, recordedMimeType, recordedDuration);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current && audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);
  
  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      {!recordedBlob && (
        <div className="flex flex-col items-center gap-4">
          {/* Timer */}
          <div className="text-3xl font-mono font-bold text-ink">
            {formatTime(duration)}
          </div>
          
          {/* Start/Stop Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={micPermissionDenied}
            className={`
              w-16 h-16 rounded-full font-semibold
              spring-transition-fast
              focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2
              ${isRecording
                ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
                : micPermissionDenied
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-hover active:scale-95'
              }
            `}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹' : '●'}
          </button>
          
          <p className="text-sm text-ink/60">
            {isRecording ? 'Recording...' : micPermissionDenied ? 'Microphone access denied' : 'Click to start recording'}
          </p>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-card" role="alert">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}
      
      {/* Playback Preview */}
      {recordedBlob && (
        <div className="space-y-4">
          <div className="bg-white/60 rounded-card p-4">
            <p className="text-sm font-medium text-ink mb-2">Recording Preview</p>
            <audio
              ref={audioRef}
              controls
              className="w-full"
            />
            <p className="text-xs text-ink/60 mt-2">Duration: {formatTime(recordedDuration)}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 px-4 py-2 bg-gray-100 text-ink/70 rounded-button font-medium spring-transition-fast hover:bg-gray-200 hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
            >
              Retake
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-button font-semibold spring-transition-fast hover:bg-primary-hover shadow-lg hover:shadow-xl active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
            >
              Submit Answer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioRecorder;


