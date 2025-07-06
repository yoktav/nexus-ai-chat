"use client";

import { Message } from "@/hooks/use-chat";
import MessageFiles from "@/components/MessageFiles";
import AssistantActions from "@/components/AssistantActions";
import LoadingDots from "@/components/LoadingDots";

interface MessageBubbleProps {
  message: Message;
  onCopy: (text: string) => void;
  onReport: () => void;
  isLoading: boolean;
}

export default function MessageBubble({
  message,
  onCopy,
  onReport,
  isLoading,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  const alignmentClass = isUser ? "justify-end" : "justify-start";
  const widthClass = isUser ? "max-w-[80%]" : "w-full";
  const bubbleClass = isUser
    ? "bg-primary text-primary-foreground"
    : "text-foreground";

  return (
    <>
      <div className={`flex ${alignmentClass}`}>
        <div className={`${widthClass} space-y-2`}>
          {message.content && (
            <div className={`p-4 rounded-2xl ${bubbleClass}`}>
              {message.files && <MessageFiles files={message.files} />}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          )}

          {!isUser && message.content && !isLoading && (
            <AssistantActions
              content={message.content}
              onCopy={onCopy}
              onReport={onReport}
            />
          )}
        </div>
      </div>

      {!isUser && isLoading && !message.content && (
        <div className="flex justify-start">
          <div className="w-full">
            <div className="text-foreground p-4 rounded-2xl">
              <LoadingDots />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
