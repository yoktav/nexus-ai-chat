'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/hooks/use-chat';
import MessageBubble from '@/components/MessageBubble';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onCopy: (text: string) => void;
  onReport: () => void;
}

export default function ChatMessages({ messages, isLoading, onCopy, onReport }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Identify the assistant message currently streaming (if any)
  const currentLoadingAssistantId = isLoading
    ? [...messages].reverse().find((m) => m.role === 'assistant')?.id
    : undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-32" style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onCopy={onCopy}
            onReport={onReport}
            isLoading={isLoading && message.id === currentLoadingAssistantId}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}