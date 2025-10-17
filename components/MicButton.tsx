import React from 'react';

interface MicButtonProps {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({ isActive, isListening, isSpeaking, onClick }) => {
  const getRingClasses = (delay: string) => {
    let classes = `absolute inset-0 rounded-full border-2 opacity-0`;
    if (isSpeaking) {
      return `${classes} border-teal-300 animate-ping-fast ${delay}`;
    }
    if (isListening) {
      return `${classes} border-cyan-400 animate-ping-slow ${delay}`;
    }
    if (isActive) {
      return `${classes} border-cyan-500 animate-ping-slow ${delay}`;
    }
    return classes;
  };

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <div className={getRingClasses('animation-delay-0')}></div>
      <div className={getRingClasses('animation-delay-1000')}></div>

      <button
        onClick={onClick}
        aria-label={isActive ? 'Stop session' : 'Start session'}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-cyan-500/50
          ${isActive 
            ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/40' 
            : 'bg-gradient-to-br from-cyan-400 to-teal-500 hover:from-cyan-500 hover:to-teal-600 shadow-cyan-400/40'
          }
          shadow-lg ${isListening ? 'animate-pulse' : ''}`}
      >
        {isActive ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 text-white transition-transform duration-300 ${isActive && isListening ? 'animate-mic-icon-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
    </div>
  );
};

const keyframes = `
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.75; }
  100% { transform: scale(2); opacity: 0; }
}
@keyframes ping-fast {
  0% { transform: scale(1); opacity: 0.75; }
  100% { transform: scale(2.5); opacity: 0; }
}`;

try {
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
    const animationClasses = `
      .animate-ping-slow { animation: ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      .animate-ping-fast { animation: ping-fast 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      .animation-delay-0 { animation-delay: 0s; }
      .animation-delay-1000 { animation-delay: 1s; }
    `;
    animationClasses.trim().split('}').filter(rule => rule.trim()).forEach(rule => {
        if (rule) styleSheet.insertRule(rule + '}', styleSheet.cssRules.length);
    });
  }
} catch(e) {
    console.error("Could not insert animation rules:", e);
}