'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/Input';
import { MessageSquare, Trash2, Edit3, Check, X } from 'lucide-react';
import { getChatHistory, deleteChat, updateChatTitle, type ChatHistoryEntry } from '@/lib/chat-history-manager';

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  currentChatId?: string;
  initialChatHistory?: ChatHistoryEntry[];
}

export default function ChatHistory({ isOpen, onClose, onSelectChat, currentChatId, initialChatHistory = [] }: ChatHistoryProps) {
  const router = useRouter();
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>(initialChatHistory);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Keep track of IDs that were already rendered to detect new entries for animation
  const renderedIdsRef = useRef<Set<string>>(new Set(initialChatHistory.map((c) => c.id)));

  // Load chat history when sidebar opens
  useEffect(() => {
    if (isOpen) {
      refreshChatHistory();
    }
  }, [isOpen]);

  const refreshChatHistory = () => {
    setIsLoading(true);
    try {
      const history = getChatHistory();
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for cross-component chat history updates (same-tab custom event)
  useEffect(() => {
    const handler = () => refreshChatHistory();
    window.addEventListener('chat-history-updated', handler);
    return () => window.removeEventListener('chat-history-updated', handler);
  }, []);

  // After each chatHistory render, record the rendered IDs so animations only fire once
  useEffect(() => {
    chatHistory.forEach((chat) => renderedIdsRef.current.add(chat.id));
  }, [chatHistory]);

  const handleDeleteChat = async (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const success = deleteChat(chatId);
    if (success) {
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));

      // If we're deleting the current chat, redirect to home
      if (currentChatId === chatId) {
        router.push('/');
      }
    } else {
      console.error('Failed to delete chat');
    }
  };

  const handleEditStart = (chat: ChatHistoryEntry, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleEditSave = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (editingId && editingTitle.trim()) {
      const success = updateChatTitle(editingId, editingTitle.trim());
      if (success) {
        setChatHistory(prev =>
          prev.map(chat =>
            chat.id === editingId
              ? { ...chat, title: editingTitle.trim() }
              : chat
          )
        );
      } else {
        console.error('Failed to update chat title');
      }
    }

    setEditingId(null);
    setEditingTitle('');
  };

  const handleEditCancel = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleChatSelect = (chatId: string) => {
    onSelectChat(chatId);
    router.push(`/chats/${chatId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto h-full">
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 lg:hidden"
        onClick={(e) => {
          e.stopPropagation();
          // Only close on mobile when clicking backdrop
          if (window.innerWidth < 1024) {
            onClose();
          }
        }}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border lg:relative lg:w-full z-20">
        <div className="flex items-center justify-between px-4 border-b border-border" style={{ height: 'var(--header-height)' }}>
          <h2 className="text-lg font-semibold">Chat History</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-2 overflow-auto" style={{ height: 'calc(100vh - var(--header-height))' }}>
        {/* <div className="p-2 overflow-auto pb-[calc(var(--header-height)*-1)]"> */}
          <div className="transition-all duration-300 ease-in-out">
          {/* ScrollArea */}
            <div className="h-[calc(100vh-200px)]">
              <div className="space-y-1">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="bg-muted/50 rounded-lg p-4 border border-dashed border-border">
                      <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-pulse" />
                      <p className="text-sm text-muted-foreground">
                        Loading chat history...
                      </p>
                    </div>
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="bg-muted/50 rounded-lg p-4 border border-dashed border-border">
                      <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        No previous messages
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Let&apos;s create one!
                      </p>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((chat) => {
                    const isNew = !renderedIdsRef.current.has(chat.id);
                    return (
                      <div
                        key={chat.id}
                        className={`group relative p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                          currentChatId === chat.id ? 'bg-accent' : ''
                        } ${isNew ? 'animate-fade-in' : ''}`}
                        onClick={() => handleChatSelect(chat.id)}
                      >
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0 overflow-hidden">
                            {editingId === chat.id ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="h-6 text-sm px-2 py-1 flex-1 min-w-0"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditSave(e as any);
                                    } else if (e.key === 'Escape') {
                                      handleEditCancel(e as any);
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 flex-shrink-0"
                                  onClick={handleEditSave}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 flex-shrink-0"
                                  onClick={handleEditCancel}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <h3 className="font-medium text-sm truncate" title={chat.title}>{chat.title}</h3>
                            )}
                            <p className="text-xs text-muted-foreground truncate mt-1" title={chat.lastMessagePreview}>
                              {chat.lastMessagePreview}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(chat.timestamp)}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {editingId !== chat.id && (
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleEditStart(chat, e)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteChat(chat.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}