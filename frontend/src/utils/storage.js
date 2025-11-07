// LocalStorage utilities for persistence
const STORAGE_KEYS = {
  RESUME: 'mockmate_resume',
  JOB_INFO: 'mockmate_job_info',
};

export const storage = {
  // Resume data (file metadata only)
  getResume: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESUME);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  setResume: (resumeData) => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESUME, JSON.stringify(resumeData));
    } catch (e) {
      console.error('Failed to save resume:', e);
    }
  },
  
  clearResume: () => {
    localStorage.removeItem(STORAGE_KEYS.RESUME);
  },
  
  // Job info
  getJobInfo: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.JOB_INFO);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  
  setJobInfo: (jobInfo) => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOB_INFO, JSON.stringify(jobInfo));
    } catch (e) {
      console.error('Failed to save job info:', e);
    }
  },
  
  clearJobInfo: () => {
    localStorage.removeItem(STORAGE_KEYS.JOB_INFO);
  },
  
  // Clear all
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.RESUME);
    localStorage.removeItem(STORAGE_KEYS.JOB_INFO);
  },
  
  // Check completion status
  getStepStatus: () => {
    const resume = storage.getResume();
    const jobInfo = storage.getJobInfo();
    
    return {
      step1Complete: !!resume,
      step2Complete: !!jobInfo?.company && !!jobInfo?.role,
      allComplete: !!resume && !!jobInfo?.company && !!jobInfo?.role,
    };
  },
};

