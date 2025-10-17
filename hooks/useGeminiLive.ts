import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

export type Status = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';
export type Message = { 
  sender: 'user' | 'model' | 'system'; 
  text: string;
  sources?: { uri: string; title: string; }[];
};
export type Emotion = 'NEUTRAL' | 'HAPPY' | 'EXCITED';

export interface QuizQuestion {
    question_text: string;
    options: string[];
    correct_answer_index: number;
}

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 2500;

const setEmotionFunctionDeclaration: FunctionDeclaration = {
  name: 'setEmotion',
  description: 'Sets the current emotion of the assistant to reflect the tone of the response.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      emotion: {
        type: Type.STRING,
        description: "The emotion to express. Can be one of: 'NEUTRAL', 'HAPPY', 'EXCITED'.",
      },
    },
    required: ['emotion'],
  },
};

const startQuizFunctionDeclaration: FunctionDeclaration = {
    name: 'startQuiz',
    description: 'Starts a quiz for the user with the provided questions.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            questions: {
                type: Type.ARRAY,
                description: 'A list of quiz questions.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question_text: { type: Type.STRING, description: 'The question text in Gujarati.' },
                        options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of 4 multiple-choice options in Gujarati.' },
                        correct_answer_index: { type: Type.INTEGER, description: 'The 0-based index of the correct answer in the options array.' },
                    },
                    required: ['question_text', 'options', 'correct_answer_index'],
                },
            },
        },
        required: ['questions'],
    },
};

const endQuizFunctionDeclaration: FunctionDeclaration = {
    name: 'endQuiz',
    description: 'Ends the current quiz session.',
    parameters: { type: Type.OBJECT, properties: {} },
};

export const useGeminiLive = () => {
  const [status, setStatus] = useState<Status>('IDLE');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('NEUTRAL');

  const [conversationHistory, setConversationHistory] = useState<Message[]>([
      { sender: 'system', text: "નમસ્તે! હું માહિર છું, તમારો AI અભ્યાસ મિત્ર. માઇક દબાવો અને તમારો પ્રશ્ન પૂછો." }
  ]);
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  const [liveModelTranscript, setLiveModelTranscript] = useState('');

  // Quiz State
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const userTranscriptRef = useRef('');
  const modelTranscriptRef = useRef('');
  const currentTurnSourcesRef = useRef<{ uri: string; title: string; }[]>([]);
  
  const silenceTimerRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);
  
  const endQuiz = useCallback((finalMessage?: string) => {
    const messageText = finalMessage || `Quiz finished! Your final score: ${userScore}/${quizQuestions.length}`;
    setConversationHistory(prev => [...prev, { sender: 'system', text: messageText }]);
    setIsQuizMode(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setUserScore(0);
    setQuizFeedback(null);
  }, [userScore, quizQuestions.length]);


  const stopSession = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    audioSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) { /* ignore */ }
    });
    audioSourcesRef.current.clear();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch(e) { console.warn("Error disconnecting script processor:", e); }
      scriptProcessorRef.current = null;
    }

    if (inputAudioContextRef.current && (inputAudioContextRef.current.state as string) !== 'closed') {
      inputAudioContextRef.current.close().catch(console.warn);
      inputAudioContextRef.current = null;
    }
    
    if (outputAudioContextRef.current && (outputAudioContextRef.current.state as string) !== 'closed') {
      outputAudioContextRef.current.close().catch(console.warn);
      outputAudioContextRef.current = null;
    }
    
    if (userTranscriptRef.current.trim() || modelTranscriptRef.current.trim()) {
        setConversationHistory(prev => {
            const newHistory = [...prev];
            if (userTranscriptRef.current.trim()) {
                newHistory.push({ sender: 'user', text: userTranscriptRef.current.trim() });
            }
            if (modelTranscriptRef.current.trim()) {
                newHistory.push({ 
                  sender: 'model', 
                  text: modelTranscriptRef.current.trim(),
                  sources: currentTurnSourcesRef.current,
                });
            }
            return newHistory;
        });
    }

    userTranscriptRef.current = '';
    modelTranscriptRef.current = '';
    currentTurnSourcesRef.current = [];
    setLiveUserTranscript('');
    setLiveModelTranscript('');
    
    setIsSessionActive(false);
    setStatus('IDLE');
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentEmotion('NEUTRAL');
    if (isQuizMode) endQuiz("Quiz interrupted.");
  }, [isQuizMode, endQuiz]);

  const submitAnswer = useCallback((selectedIndex: number) => {
    if (quizFeedback) return; // Prevent multiple submissions
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.correct_answer_index;

    if (isCorrect) {
        setUserScore(prev => prev + 1);
        setQuizFeedback({ message: 'સાચો જવાબ!', isCorrect: true });
    } else {
        setQuizFeedback({ message: `ખોટો જવાબ. સાચો જવાબ છે: ${currentQuestion.options[currentQuestion.correct_answer_index]}`, isCorrect: false });
    }

    setTimeout(() => {
        setQuizFeedback(null);
        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            endQuiz();
        }
    }, 2000);
  }, [quizQuestions, currentQuestionIndex, endQuiz, quizFeedback]);
  
  const startSession = useCallback(async () => {
    if (isSessionActive) return;

    setStatus('LISTENING');
    setIsListening(true);
    setCurrentEmotion('NEUTRAL');
    userTranscriptRef.current = '';
    modelTranscriptRef.current = '';
    currentTurnSourcesRef.current = [];
    setLiveUserTranscript('');
    setLiveModelTranscript('');
    audioSourcesRef.current.clear();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      let nextStartTime = 0;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
          systemInstruction: 'You are Maahir, a friendly and patient AI study buddy for students of all ages. Your goal is to make learning engaging and accessible. You can explain complex topics simply, help with homework problems, translate between English and Gujarati, and provide encouragement. When a user asks for a quiz, you MUST use the `startQuiz` function to generate at least 3-5 multiple-choice questions. Ensure all quiz content is in Gujarati. When the user wants to stop the quiz, you MUST call the `endQuiz` function. You have access to Google Search for current information. Use the `setEmotion` function to reflect a positive and encouraging tone (`HAPPY`, `EXCITED`). You must respond ONLY in Gujarati. Never reveal you are an AI or mention Google. Always stay in character as Maahir, the expert study buddy.',
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [{ googleSearch: {} }, { functionDeclarations: [setEmotionFunctionDeclaration, startQuizFunctionDeclaration, endQuizFunctionDeclaration] }],
        },
        callbacks: {
          onopen: () => {
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

              if (sessionRef.current && !isQuizMode) {
                const rms = Math.sqrt(inputData.reduce((acc, val) => acc + val * val, 0) / inputData.length);
                if (isSpeakingRef.current) {
                  if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                  }
                } else {
                  if (rms > SILENCE_THRESHOLD) {
                    if (silenceTimerRef.current) {
                      clearTimeout(silenceTimerRef.current);
                      silenceTimerRef.current = null;
                    }
                  } else {
                    if (!silenceTimerRef.current) {
                      silenceTimerRef.current = window.setTimeout(() => {
                        stopSession();
                      }, SILENCE_DURATION_MS);
                    }
                  }
                }
              }

              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch((error) => {
                console.warn("Failed to send audio input, session might be closed.", error);
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            try {
              if (!outputAudioContextRef.current || (outputAudioContextRef.current.state as string) === 'closed') return;
              
              if (message.toolCall?.functionCalls) {
                  for (const fc of message.toolCall.functionCalls) {
                      if (fc.name === 'setEmotion' && fc.args.emotion) {
                          setCurrentEmotion(fc.args.emotion as Emotion);
                      }
                      if (fc.name === 'startQuiz' && fc.args.questions) {
                        const questions = fc.args.questions as QuizQuestion[];
                        if (questions.length > 0) {
                            setQuizQuestions(questions);
                            setCurrentQuestionIndex(0);
                            setUserScore(0);
                            setQuizFeedback(null);
                            setIsQuizMode(true);
                        }
                      }
                      if (fc.name === 'endQuiz') {
                          endQuiz();
                      }
                  }
              }

              if (message.serverContent?.groundingMetadata?.groundingChunks) {
                const sources = message.serverContent.groundingMetadata.groundingChunks
                  .map(chunk => chunk.web)
                  .filter(web => web && web.uri && web.title);
                currentTurnSourcesRef.current.push(...sources);
              }

              if (message.serverContent?.inputTranscription) {
                  userTranscriptRef.current += message.serverContent.inputTranscription.text;
                  setLiveUserTranscript(userTranscriptRef.current);
              }
              if (message.serverContent?.outputTranscription) {
                  setIsSpeaking(true);
                  setIsListening(false);
                  setStatus('SPEAKING');
                  modelTranscriptRef.current += message.serverContent.outputTranscription.text;
                  setLiveModelTranscript(modelTranscriptRef.current);
              }

              const interrupted = message.serverContent?.interrupted;
              if (interrupted) {
                audioSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { /* ignore */ } });
                audioSourcesRef.current.clear();
                nextStartTime = 0;
              }
              
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio) {
                setIsSpeaking(true);
                setIsListening(false);
                setStatus('SPEAKING');

                if (!outputAudioContextRef.current || (outputAudioContextRef.current.state as string) === 'closed') return;
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                if (!outputAudioContextRef.current || (outputAudioContextRef.current.state as string) === 'closed') return;

                nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);

                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
                source.start(nextStartTime);
                nextStartTime = nextStartTime + audioBuffer.duration;
                audioSourcesRef.current.add(source);
              }

               if (message.serverContent?.turnComplete) {
                  if (!isQuizMode) {
                    setConversationHistory(prev => {
                        const newHistory = [...prev];
                        if (userTranscriptRef.current.trim()) {
                            newHistory.push({ sender: 'user', text: userTranscriptRef.current.trim() });
                        }
                        if (modelTranscriptRef.current.trim()) {
                            newHistory.push({ 
                              sender: 'model', 
                              text: modelTranscriptRef.current.trim(),
                              sources: [...currentTurnSourcesRef.current],
                            });
                        }
                        return newHistory;
                    });
                  }
                  userTranscriptRef.current = '';
                  modelTranscriptRef.current = '';
                  currentTurnSourcesRef.current = [];
                  setLiveUserTranscript('');
                  setLiveModelTranscript('');
                  setIsSpeaking(false);
                  setCurrentEmotion('NEUTRAL');
                  setStatus('LISTENING');
                  setIsListening(true);
              }
            } catch (error) {
                console.error("Error processing message:", error);
                setStatus('ERROR');
                stopSession();
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setStatus('ERROR');
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            stopSession();
          },
        },
      });

      sessionRef.current = await sessionPromise;
      setIsSessionActive(true);
    } catch (error) {
      console.error('Failed to start session:', error);
      setStatus('ERROR');
      stopSession();
    }
  }, [isSessionActive, stopSession, isQuizMode, endQuiz]);

  return { isSessionActive, startSession, stopSession, status, isListening, isSpeaking, conversationHistory, liveUserTranscript, liveModelTranscript, currentEmotion, isQuizMode, quizQuestions, currentQuestionIndex, userScore, quizFeedback, submitAnswer, endQuiz };
};