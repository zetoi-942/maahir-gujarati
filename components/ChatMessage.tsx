import React from 'react';

export type Message = {
  sender: 'user' | 'model' | 'system';
  text: string;
  sources?: { uri: string; title: string; }[];
};

interface ChatMessageProps {
  message: Message;
  isLive?: boolean;
}

const renderSources = (sources: { uri: string; title: string; }[]) => {
  return (
    <div className="mt-4 pt-3 border-t border-gray-600/50 font-sans">
      <h4 className="text-lg font-normal text-gray-200 mb-1.5">Sources:</h4>
      <ul className="list-disc list-inside space-y-1">
        {sources.map((source, index) => (
          <li key={index} className="text-lg">
            <a
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 hover:text-cyan-200 hover:underline transition-colors"
              title={source.title}
            >
              {source.title || new URL(source.uri).hostname}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLive }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div className="text-center my-4">
        <p className="text-2xl text-gray-300 italic">{message.text}</p>
      </div>
    );
  }
  
  return (
    <div className={`flex my-3 items-end gap-3 ${isUser ? 'justify-end animate-slide-in-right' : 'justify-start animate-slide-in-left'}`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center font-great-vibes text-2xl shadow-md text-white">
          M
        </div>
      )}
      <div className={`px-4 py-3 rounded-2xl max-w-md sm:max-w-lg md:max-w-xl break-words ${
        isUser
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-none shadow-lg shadow-cyan-900/50'
          : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200 rounded-bl-none shadow-lg shadow-black/50'
      }`}>
        <p className="text-3xl leading-snug">
          {message.text}
          {isLive && <span className="inline-block w-0.5 h-6 bg-cyan-200 ml-1 animate-pulse-fast align-bottom"></span>}
        </p>
        {message.sources && message.sources.length > 0 && renderSources(message.sources)}
      </div>
    </div>
  );
};