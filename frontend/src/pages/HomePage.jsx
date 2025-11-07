import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/upload');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 md:px-6">
      <div className="max-w-[680px] mx-auto text-center">
        {/* App Name */}
        <h1 className="text-[64px] md:text-[80px] font-bold text-ink mb-8 leading-[1.05] tracking-[-0.04em] animate-fade-in">
          ResuMock
        </h1>
        
        {/* Slogan */}
        <p className="text-[22px] md:text-[26px] text-ink/65 mb-16 leading-relaxed font-normal animate-slide-in-from-bottom-4">
          Master your next interview with AI-powered practice
        </p>
        
        {/* Get Started Button */}
        <button
          onClick={handleGetStarted}
          className="
            inline-flex items-center justify-center
            px-12 py-6 md:px-14 md:py-7
            bg-ink text-white
            rounded-button
            font-semibold text-xl md:text-[22px]
            spring-transition-fast
            hover:bg-ink/90
            active:scale-[0.98]
            shadow-xl hover:shadow-2xl
            focus:outline-none focus:ring-2 focus:ring-ink/20 focus:ring-offset-4
            animate-slide-in-from-bottom-4
          "
          style={{ animationDelay: '0.15s' }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

export default HomePage;

