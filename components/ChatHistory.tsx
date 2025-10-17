import React, { useRef, useEffect } from 'react';
import { ChatMessage, Message } from './ChatMessage';

interface ChatHistoryProps {
  messages: Message[];
  liveUserMessage: string;
  liveModelMessage: string;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, liveUserMessage, liveModelMessage }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveUserMessage, liveModelMessage]);

  return (
    <div ref={scrollRef} className="flex-grow w-full max-w-4xl p-4 overflow-y-auto">
      {messages.map((msg, index) => (
        <ChatMessage key={index} message={msg} />
      ))}
      {liveUserMessage && (
        <ChatMessage message={{ sender: 'user', text: liveUserMessage }} isLive />
      )}
      {liveModelMessage && (
        <ChatMessage message={{ sender: 'model', text: liveModelMessage }} isLive />
      )}
    </div>
  );
};