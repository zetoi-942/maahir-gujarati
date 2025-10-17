import React, { useState } from 'react';
import { QuizQuestion } from '../hooks/useGeminiLive';

interface QuizInterfaceProps {
    currentQuestion: QuizQuestion;
    questionNumber: number;
    totalQuestions: number;
    userScore: number;
    feedback: { message: string, isCorrect: boolean } | null;
    submitAnswer: (selectedIndex: number) => void;
    endQuiz: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({
    currentQuestion,
    questionNumber,
    totalQuestions,
    userScore,
    feedback,
    submitAnswer,
    endQuiz
}) => {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);

    const handleOptionClick = (index: number) => {
        if (feedback) return;
        setSelectedOption(index);
        submitAnswer(index);
    };
    
    React.useEffect(() => {
        // Reset selected option when question changes
        setSelectedOption(null);
    }, [currentQuestion]);

    const getOptionClasses = (index: number) => {
        if (!feedback) {
            return 'bg-gray-700/50 hover:bg-cyan-600/50';
        }

        const isCorrectAnswer = index === currentQuestion.correct_answer_index;
        const isSelectedAnswer = index === selectedOption;

        if (isCorrectAnswer) {
            return 'bg-green-500/80 ring-2 ring-green-300';
        }
        if (isSelectedAnswer && !isCorrectAnswer) {
            return 'bg-red-500/80 ring-2 ring-red-400';
        }
        return 'bg-gray-800/50 opacity-60';
    };

    return (
        <div className="w-full max-w-4xl flex-grow flex flex-col items-center justify-center p-4 animate-slide-in-left">
            <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-700/50">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-600/50">
                    <h2 className="text-3xl sm:text-4xl text-cyan-200">વિદ્યાજ્ઞાન કસોટી</h2>
                    <div className="text-2xl sm:text-3xl text-gray-300">
                        <span>Score: {userScore}</span>
                        <span className="mx-2">|</span>
                        <span>{questionNumber}/{totalQuestions}</span>
                    </div>
                </div>

                {/* Question */}
                <div className="mb-8">
                    <p className="text-4xl sm:text-5xl text-white text-center leading-tight">
                        {currentQuestion.question_text}
                    </p>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleOptionClick(index)}
                            disabled={!!feedback}
                            className={`p-4 rounded-lg text-3xl text-left text-white transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:transform-none ${getOptionClasses(index)}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                
                {/* Feedback */}
                {feedback && (
                    <div className={`mt-6 text-center text-3xl font-sans font-bold animate-pulse ${feedback.isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                        {feedback.message}
                    </div>
                )}
            </div>

            <button onClick={endQuiz} className="mt-8 text-2xl text-gray-400 hover:text-white hover:underline transition-colors duration-300">
                Quit Quiz
            </button>
        </div>
    );
};
