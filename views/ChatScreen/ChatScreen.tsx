'use client';

import { useState, useEffect } from 'react';
import { setChatHistoryPanelState } from '@/lib/chat-history-panel-state';
import ChatHistory from '@/components/ChatHistory';
import ChatHeader from '@/components/ChatHeader';
import WelcomeScreen from '@/components/WelcomeScreen';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import LoadingDots from '@/components/LoadingDots';
import { useChat } from '@/hooks/use-chat';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useToast } from '@/hooks/use-toast';

interface ChatScreenProps {
  initialThreadId?: string;
  initialChatHistoryOpen?: boolean;
  initialChatHistory?: import('@/lib/chat-history-manager').ChatHistoryEntry[];
}

export default function ChatScreen({ initialThreadId, initialChatHistoryOpen, initialChatHistory }: ChatScreenProps) {
  const [selectedModel, setSelectedModel] = useState('chat-model');
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(initialChatHistoryOpen || false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const [animationKey, setAnimationKey] = useState(0);

  const { messages, isLoading, isLoadingHistory, sendMessage, stopResponse, clearChat } = useChat(initialThreadId);
  const {
    uploadedFiles,
    fileUploads,
    supportedMimeTypes,
    fileInputRef,
    setSupportedMimeTypes,
    handleFileSelect,
    removeUploadedFile,
    clearFiles
  } = useFileUpload();
  const { toast } = useToast();

  // Set initialized state on client mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Save chat history panel state when it changes
  const handleToggleChatHistory = () => {
    const newState = !isChatHistoryOpen;
    setIsChatHistoryOpen(newState);
    setChatHistoryPanelState(newState);
  };

  // Set currentChatId when we have an initialThreadId
  useEffect(() => {
    if (initialThreadId) {
      setCurrentChatId(initialThreadId);
    }
  }, [initialThreadId]);

  // Fetch supported MIME types on component mount
  useEffect(() => {
    const fetchSupportedTypes = async () => {
      try {
        const response = await fetch('/api/supported-types');
        if (response.ok) {
          const data = await response.json();
          setSupportedMimeTypes(data.supportedTypes || []);
        }
      } catch (error) {
        console.error('Failed to fetch supported MIME types:', error);
      }
    };

    fetchSupportedTypes();
  }, [setSupportedMimeTypes]);

  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion);
  };

  const handleNewChat = () => {
    clearChat();
    clearFiles();
    setCurrentChatId(undefined);
    setAnimationKey(prev => prev + 1);
  };

  const handleSubmit = async (message: string, files: typeof uploadedFiles) => {
    await sendMessage(message, files);
    clearFiles();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Unable to copy to clipboard"
      });
    }
  };

  const handleReport = () => {
    toast({
      variant: "warning",
      title: "Feature coming soon",
      description: "This feature will be added soon. If there is a problem, you can email us.",
      autoClose: true,
      autoCloseDelay: 5000,
    });
  };

  return (
    <div className="flex h-screen">
      {/* Chat History Sidebar */}
      <div className={`${isChatHistoryOpen ? 'w-80' : 'w-0'} absolute top-0 left-0 lg:static transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <ChatHistory
          isOpen={isChatHistoryOpen}
          onClose={handleToggleChatHistory}
          onSelectChat={setCurrentChatId}
          currentChatId={currentChatId}
          initialChatHistory={initialChatHistory}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <ChatHeader
          isChatHistoryOpen={isChatHistoryOpen}
          onToggleChatHistory={handleToggleChatHistory}
          onNewChat={handleNewChat}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        <main className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            {isLoadingHistory ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <LoadingDots className="justify-center mb-4" />
                  <p className="text-muted-foreground">Loading chat history...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <WelcomeScreen
                animationKey={animationKey}
                onSuggestionClick={handleSuggestionClick}
              />
            ) : (
              <ChatMessages
                messages={messages}
                isLoading={isLoading}
                onCopy={copyToClipboard}
                onReport={handleReport}
              />
            )}
          </div>

          <ChatInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onStop={stopResponse}
            uploadedFiles={uploadedFiles}
            fileUploads={fileUploads}
            supportedMimeTypes={supportedMimeTypes}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onRemoveFile={removeUploadedFile}
          />
        </main>
      </div>
    </div>
  );
}