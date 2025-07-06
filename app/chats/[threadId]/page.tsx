import { headers } from 'next/headers';
import InitialPanelStateProvider from '@/components/InitialPanelStateProvider';
import { getInitialPanelState } from '@/lib/chat-history-panel-state';
import { getChatHistory } from '@/lib/chat-history-manager';

interface ChatPageProps {
  params: {
    threadId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const headersList = headers();
  const cookieHeader = headersList.get('cookie') || '';
  const initialChatHistoryOpen = getInitialPanelState(cookieHeader);
  const initialChatHistory = getChatHistory(cookieHeader);

  return (
    <InitialPanelStateProvider
      initialThreadId={params.threadId}
      initialChatHistoryOpen={initialChatHistoryOpen}
      initialChatHistory={initialChatHistory}
    />
  );
}