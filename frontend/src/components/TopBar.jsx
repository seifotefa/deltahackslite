import React from 'react';
import StepProgress from './StepProgress';

function TopBar({ title, showTitle = true }) {
  return (
    <header 
      className="
        fixed top-0 left-0 right-0 z-50
        glass-card
        h-[80px] md:h-[80px]
        border-b border-white/20
      "
    >
      <div className="max-w-[860px] mx-auto px-5 md:px-6 h-full flex flex-col justify-center">
        {showTitle && (
          <div className="flex items-center justify-center mb-3 md:mb-4">
            <h1 className="font-bold text-ink text-xl md:text-2xl text-center">
              {title}
            </h1>
          </div>
        )}
        <StepProgress />
      </div>
    </header>
  );
}

export default TopBar;
