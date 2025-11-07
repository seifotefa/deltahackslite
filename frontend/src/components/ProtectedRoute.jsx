import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { storage } from '../utils/storage';

function ProtectedRoute({ children, requiredStep }) {
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectTo, setRedirectTo] = useState(null);
  
  useEffect(() => {
    const status = storage.getStepStatus();
    
    // Step 1: No resume required
    if (requiredStep === 1) {
      // Always allow access to step 1
      return;
    }
    
    // Step 2: Resume required
    if (requiredStep === 2) {
      if (!status.step1Complete) {
        setShouldRedirect(true);
        setRedirectTo('/');
        return;
      }
    }
    
    // Step 3: Resume and job info required
    if (requiredStep === 3) {
      if (!status.step1Complete) {
        setShouldRedirect(true);
        setRedirectTo('/');
        return;
      }
      if (!status.step2Complete) {
        setShouldRedirect(true);
        setRedirectTo('/job');
        return;
      }
    }
  }, [requiredStep, location]);
  
  if (shouldRedirect && redirectTo) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }
  
  return children;
}

export default ProtectedRoute;

