import React, { useState, useEffect } from 'react';
import StepProgress from './StepProgress';

function TopBar({ title }) {
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50
        glass-card
        spring-transition-fast
        ${isScrolled ? 'h-[120px] md:h-[120px] shadow-sm border-b border-white/20' : 'h-[140px] md:h-[160px]'}
      `}
    >
      <div className="max-w-[860px] mx-auto px-5 md:px-6 h-full flex flex-col justify-center">
        <div className="flex items-center justify-center mb-3 md:mb-4">
          <h1 
            className={`
              font-bold text-ink spring-transition-fast text-center
              ${isScrolled 
                ? 'text-xl md:text-2xl' 
                : 'text-[32px] md:text-[48px] leading-[1.1] tracking-[-0.02em]'
              }
            `}
          >
            {title}
          </h1>
        </div>
        <StepProgress />
      </div>
    </header>
  );
}

export default TopBar;
