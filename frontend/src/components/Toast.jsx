import React, { useEffect } from 'react';

function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-primary',
  }[type] || 'bg-primary';
  
  return (
    <div 
      className={`
        fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50
        ${bgColor} text-white px-6 py-3 rounded-pill
        floating-shadow spring-transition
        animate-slide-in-from-bottom-4
      `}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export default Toast;
