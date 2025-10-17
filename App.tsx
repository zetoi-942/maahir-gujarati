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
    errorMessage,
    clearError,
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

      {errorMessage && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 sm:p-8 rounded-2xl shadow-2xl border border-red-500/50 max-w-md w-full text-center animate-slide-in-left">
                <h2 className="text-4xl sm:text-5xl text-red-400 mb-4">An Error Occurred</h2>
                <p className="font-inter text-lg sm:text-xl text-gray-200 mb-6">{errorMessage}</p>
                <button
                    onClick={clearError}
                    className="font-sans px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
                >
                    Dismiss
                </button>
            </div>
        </div>
      )}
    </main>
  );
}