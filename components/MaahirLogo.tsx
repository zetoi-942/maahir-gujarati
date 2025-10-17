import React from 'react';
import { Emotion } from '../hooks/useGeminiLive';

interface MaahirLogoProps {
  isListening: boolean;
  isSpeaking: boolean;
  emotion: Emotion;
}

export const MaahirLogo: React.FC<MaahirLogoProps> = ({ isListening, isSpeaking, emotion }) => {
  const getEmotionStyles = () => {
    if (isSpeaking) {
      switch (emotion) {
        case 'HAPPY':
        case 'EXCITED':
          return 'bg-gradient-to-r from-amber-300 to-orange-400 animate-logo-flare';
        default:
          return 'bg-gradient-to-r from-cyan-300 to-blue-400 animate-logo-flare';
      }
    }
    if (isListening) {
      return 'bg-gradient-to-r from-cyan-300 to-blue-400 animate-logo-pulse';
    }
    return 'bg-gradient-to-r from-cyan-300 to-blue-400 animate-text-glow';
  };

  return (
    <h1 className={`font-great-vibes text-5xl bg-clip-text text-transparent transition-all duration-500 ${getEmotionStyles()}`}>
      માહિર
    </h1>
  );
};