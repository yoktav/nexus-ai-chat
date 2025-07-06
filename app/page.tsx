import { headers } from 'next/headers';
import InitialPanelStateProvider from '@/components/InitialPanelStateProvider';
import { getInitialPanelState } from '@/lib/chat-history-panel-state';
import { getChatHistory } from '@/lib/chat-history-manager';
import { useIsMobile } from '@/hooks/server/use-is-mobile';

export default function Home() {
  const isMobile = useIsMobile();

  const headersList = headers();
  const cookieHeader = headersList.get('cookie') || '';
  const initialChatHistoryOpen = isMobile ? false : getInitialPanelState(cookieHeader);
  const initialChatHistory = getChatHistory(cookieHeader);

  return (
    <InitialPanelStateProvider
      initialChatHistoryOpen={initialChatHistoryOpen}
      initialChatHistory={initialChatHistory}
    />
  );
}