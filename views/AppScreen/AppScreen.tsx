'use client';

import { TooltipProvider } from '@/components/ui/Tooltip';
import ChatScreen from '@/views/ChatScreen';
import { Toaster } from '@/components/ui/Toaster';

interface AppScreenProps {
  initialThreadId?: string;
  initialChatHistoryOpen?: boolean;
  initialChatHistory?: import('@/lib/chat-history-manager').ChatHistoryEntry[];
}

export default function AppScreen({ initialThreadId, initialChatHistoryOpen, initialChatHistory }: AppScreenProps) {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <ChatScreen
          initialThreadId={initialThreadId}
          initialChatHistoryOpen={initialChatHistoryOpen}
          initialChatHistory={initialChatHistory}
        />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}