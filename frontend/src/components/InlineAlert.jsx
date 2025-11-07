import React from 'react';

function InlineAlert({ message, type = 'info' }) {
  if (!message) return null;
  
  const bgColor = {
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-primary/10 border-primary/20 text-primary',
    success: 'bg-green-50 border-green-200 text-green-700',
  }[type] || 'bg-primary/10 border-primary/20 text-primary';
  
  return (
    <div 
      className={`
        p-4 rounded-card border-2 spring-transition
        animate-slide-in-from-bottom-2
        ${bgColor}
      `}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export default InlineAlert;
