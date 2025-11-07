import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import UploadResumePage from './pages/UploadResumePage';
import JobDetailsPage from './pages/JobDetailsPage';
import MainAppPage from './pages/MainAppPage';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const location = useLocation();
  
  return (
    <div className="page-transition">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <ProtectedRoute requiredStep={1}>
              <UploadResumePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/job" 
          element={
            <ProtectedRoute requiredStep={2}>
              <JobDetailsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/app" 
          element={
            <ProtectedRoute requiredStep={3}>
              <MainAppPage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
