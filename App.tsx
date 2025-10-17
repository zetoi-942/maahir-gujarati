import React from 'react';
import { MaahirLogo } from './components/MaahirLogo';
import { MicButton } from './components/MicButton';
import { useGeminiLive } from './hooks/useGeminiLive';
import { ChatHistory } from './components/ChatHistory';
import { QuizInterface } from './components/QuizInterface';

export default function App() {
  const { 
    isSessionActive, 
    startSession, 
    stopSession, 
    isListening,
    isSpeaking,
    conversationHistory,
    liveUserTranscript,
    liveModelTranscript,
    currentEmotion,
    isQuizMode,
    quizQuestions,
    currentQuestionIndex,
    userScore,
    quizFeedback,
    submitAnswer,
    endQuiz,
  } = useGeminiLive();

  const handleMicClick = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  return (
    <main className="relative font-great-vibes bg-gradient-to-br from-indigo-900 via-slate-800 to-purple-900 text-white h-screen w-screen flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 overflow-hidden stars">
      
      <header className="w-full flex justify-center py-4 border-b border-gray-700/50 bg-black/20 backdrop-blur-sm z-10">
        <MaahirLogo isListening={isListening} isSpeaking={isSpeaking} emotion={currentEmotion} />
      </header>
      
      {isQuizMode && quizQuestions.length > 0 ? (
        <QuizInterface
            currentQuestion={quizQuestions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quizQuestions.length}
            userScore={userScore}
            feedback={quizFeedback}
            submitAnswer={submitAnswer}
            endQuiz={() => endQuiz("You have left the quiz.")}
        />
      ) : (
        <ChatHistory 
          messages={conversationHistory}
          liveUserMessage={liveUserTranscript}
          liveModelMessage={liveModelTranscript}
        />
      )}
      
      <footer className="w-full flex flex-col items-center pt-4 bg-black/20 backdrop-blur-sm z-10">
        <MicButton 
          isActive={isSessionActive} 
          isListening={isListening}
          isSpeaking={isSpeaking}
          onClick={handleMicClick} 
        />
        <p className="text-gray-400 text-xl mt-6">Founder: Maahir</p>
      </footer>
    </main>
  );
}