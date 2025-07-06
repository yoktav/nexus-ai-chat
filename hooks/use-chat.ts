import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { saveChat, updateChat } from '@/lib/chat-history-manager';

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
}

export interface FileUpload {
  file: File;
  progress: number;
  isUploading: boolean;
}

export function useChat(initialThreadId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(initialThreadId);
  const [isLoadingHistory, setIsLoadingHistory] = useState(!!initialThreadId);
  const [isNewChat, setIsNewChat] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  // Abort controller to cancel in-flight assistant responses
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load message history when initialThreadId is provided
  useEffect(() => {
    if (initialThreadId && messages.length === 0) {
      loadMessageHistory(initialThreadId);
    }
  }, [initialThreadId]);

  const loadMessageHistory = async (threadId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/messages?threadId=${threadId}`);

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setCurrentThreadId(threadId);
      } else if (response.status === 404) {
        // Thread not found, redirect to home
        console.log('Thread not found, redirecting to home');
        toast({
          variant: "destructive",
          title: "Chat not found",
          description: "This chat session could not be found."
        });
        router.push('/');
      } else {
        const errorText = await response.text();
        console.error('Failed to load chat history:', response.status, errorText);
        throw new Error('Failed to load chat history');
      }
    } catch (error) {
      console.error('Error loading message history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load chat history"
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async (content: string, files: UploadedFile[] = []) => {
    const isFirstMessage = messages.length === 0;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      files: files.length > 0 ? [...files] : undefined
    };

    setMessages(prev => [...prev, userMessage]);

    const assistantMessageId = `assistant_${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(true);

    let assistantResponseContent = '';
    let generatedThreadId: string | undefined;

    try {
      const formData = new FormData();
      formData.append('message', content.trim());
      if (currentThreadId) {
        formData.append('threadId', currentThreadId);
      }

      if (files.length > 0) {
        formData.append('fileIds', JSON.stringify(files.map(f => f.id)));
      }

      // Prepare an AbortController so we can cancel if needed
      abortControllerRef.current?.abort(); // Cancel any previous
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            const chunk = decoder.decode(value);
            buffer += chunk;
            const lines = buffer.split('\n');

            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  done = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === 'thread_id') {
                    const newThreadId = parsed.thread_id;
                    generatedThreadId = newThreadId;
                    setCurrentThreadId(newThreadId);

                    // Save new chat to history if this is the first message
                    if (isFirstMessage) {
                      const success = saveChat({
                        id: newThreadId,
                        title: content.trim(),
                        lastMessagePreview: content.trim()
                      });

                      if (!success) {
                        console.warn('Failed to save chat to history');
                      }

                      // Notify other components that chat history has changed
                      // if (typeof window !== 'undefined') {
                      //   window.dispatchEvent(new Event('chat-history-updated'));
                      // }
                    }

                    setIsNewChat(false);
                  } else {
                    const deltaContent = parsed.choices?.[0]?.delta?.content;
                    if (deltaContent) {
                      assistantResponseContent += deltaContent;
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const messageIndex = newMessages.findIndex(msg => msg.id === assistantMessageId);
                        if (messageIndex !== -1) {
                          newMessages[messageIndex] = {
                            ...newMessages[messageIndex],
                            content: newMessages[messageIndex].content + deltaContent
                          };
                        }
                        return newMessages;
                      });
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // Ignore intentional aborts triggered by the user (e.g., starting a new chat)
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Remove the placeholder assistant message quietly
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        return;
      }

      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response"
      });

      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);

      // Clear abort controller when done
      abortControllerRef.current = null;

      // Determine which thread ID to use (may be updated asynchronously)
      const threadIdForHistory = generatedThreadId || currentThreadId;

      // Update chat history with assistant response if we have a thread ID and response content
      if (threadIdForHistory && assistantResponseContent.trim()) {
        const success = updateChat(threadIdForHistory, {
          lastMessagePreview: assistantResponseContent.trim(),
          timestamp: new Date().toISOString()
        });

        if (!success) {
          console.warn('Failed to update chat history');
        }

        // Notify other components that chat history has changed
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('chat-history-updated'));
        }
      }

      // -------------
      // Update URL (silent) after the full assistant response has streamed.
      // -------------
      if (isFirstMessage && pathname === '/' && generatedThreadId) {
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', `/chats/${generatedThreadId}`);
        }
      }
    }
  };

  const clearChat = () => {
    // If a response is in progress, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }

    setMessages([]);
    setCurrentThreadId(undefined);
    setIsNewChat(true);

    // Navigate to home page
    if (pathname !== '/') {
      router.push('/');
    }
  };

  return {
    messages,
    isLoading,
    isLoadingHistory,
    currentThreadId,
    sendMessage,
    stopResponse: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    clearChat,
    loadMessageHistory
  };
}