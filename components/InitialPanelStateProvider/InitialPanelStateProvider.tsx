import AppScreen from '@/views/AppScreen';

interface InitialPanelStateProviderProps {
  initialThreadId?: string;
  initialChatHistoryOpen?: boolean;
  initialChatHistory?: import('@/lib/chat-history-manager').ChatHistoryEntry[];
}

export default function InitialPanelStateProvider({
  initialThreadId,
  initialChatHistoryOpen,
  initialChatHistory
}: InitialPanelStateProviderProps) {
  return (
    <AppScreen
      initialThreadId={initialThreadId}
      initialChatHistoryOpen={initialChatHistoryOpen}
      initialChatHistory={initialChatHistory}
    />
  );
}