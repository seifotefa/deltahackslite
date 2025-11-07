import React from 'react';

/**
 * ScoreBar component - displays score as a progress bar
 * @param {Object} props
 * @param {number} props.score - Score from 0 to 100
 * @param {string} [props.className] - Additional CSS classes
 */
function ScoreBar({ score, className = '' }) {
  const percentage = Math.min(100, Math.max(0, score));
  const scoreLabel = `${Math.round(score)}/100`;
  
  // Determine color based on score
  const getColorClass = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-ink">Score</span>
        <span className="text-sm font-bold text-ink">{scoreLabel}</span>
      </div>
      <div 
        className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score: ${scoreLabel}`}
      >
        <div
          className={`h-full ${getColorClass()} spring-transition-fast`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ScoreBar;


