export interface ChatHistoryEntry {
  id: string;
  title: string;
  timestamp: string; // ISO date string
  lastMessagePreview: string;
}

const STORAGE_KEY = 'nexus_chat_history';
// Cookie name used for persisting chat history so it can be read during SSR
const COOKIE_NAME = 'nexus_chat_history';
const MAX_TITLE_LENGTH = 50;
const MAX_PREVIEW_LENGTH = 50;

/**
 * Truncate string to specified length with ellipsis
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Extract a cookie value from a raw cookie header / document.cookie string
 */
function getCookieValue(cookieString: string, name: string): string | null {
  if (!cookieString) return null;
  const cookies = cookieString.split(';').map(c => c.trim());
  const match = cookies.find(c => c.startsWith(`${name}=`));
  return match ? match.substring(name.length + 1) : null;
}

/**
 * Get all chat history entries from localStorage
 */
export function getChatHistory(cookieHeader?: string): ChatHistoryEntry[] {
  try {
    // 1) Try to read from cookies (works on both client and server when the header is provided)
    let cookieSource = '';
    if (typeof document !== 'undefined') {
      cookieSource = document.cookie;
    } else if (cookieHeader) {
      cookieSource = cookieHeader;
    }

    const cookieValue = getCookieValue(cookieSource, COOKIE_NAME);
    if (cookieValue) {
      try {
        const decoded = decodeURIComponent(cookieValue);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          return parsed.filter((entry: any) =>
            entry &&
            typeof entry.id === 'string' &&
            typeof entry.title === 'string' &&
            typeof entry.timestamp === 'string' &&
            typeof entry.lastMessagePreview === 'string'
          );
        }
      } catch {
        // fall through to localStorage fallback
      }
    }

    // 2) Fallback to localStorage on the client (legacy behaviour / bigger quota)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }

    return [];
  } catch (error) {
    console.error('Error reading chat history:', error);
    return [];
  }
}

/**
 * Save chat history entries to localStorage
 */
function saveChatHistoryToStorage(entries: ChatHistoryEntry[]): boolean {
  try {
    const encoded = encodeURIComponent(JSON.stringify(entries));

    // Save to cookie for SSR visibility (client-side only)
    if (typeof document !== 'undefined') {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `${COOKIE_NAME}=${encoded}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }

    // Mirror to localStorage to leverage its larger capacity (optional legacy fallback)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    return true;
  } catch (error) {
    console.error('Error saving chat history to cookie:', error);
    return false;
  }
}

/**
 * Add a new chat entry or update existing one
 */
export function saveChat(entry: Omit<ChatHistoryEntry, 'timestamp'> & { timestamp?: string }): boolean {
  try {
    const currentHistory = getChatHistory();

    const chatEntry: ChatHistoryEntry = {
      id: entry.id,
      title: truncateString(entry.title, MAX_TITLE_LENGTH),
      timestamp: entry.timestamp || new Date().toISOString(),
      lastMessagePreview: truncateString(entry.lastMessagePreview, MAX_PREVIEW_LENGTH)
    };

    // Check if entry already exists
    const existingIndex = currentHistory.findIndex(chat => chat.id === entry.id);

    if (existingIndex >= 0) {
      // Update existing entry
      currentHistory[existingIndex] = chatEntry;
    } else {
      // Add new entry
      currentHistory.push(chatEntry);
    }

    // Sort by timestamp (newest first)
    currentHistory.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return saveChatHistoryToStorage(currentHistory);
  } catch (error) {
    console.error('Error saving chat entry:', error);
    return false;
  }
}

/**
 * Update specific fields of an existing chat entry
 */
export function updateChat(id: string, updates: Partial<Omit<ChatHistoryEntry, 'id'>>): boolean {
  try {
    const currentHistory = getChatHistory();
    const existingIndex = currentHistory.findIndex(chat => chat.id === id);

    if (existingIndex === -1) {
      console.warn(`Chat with id ${id} not found for update`);
      return false;
    }

    const existingEntry = currentHistory[existingIndex];

    // Apply updates with truncation
    const updatedEntry: ChatHistoryEntry = {
      ...existingEntry,
      ...updates,
      id, // Ensure ID doesn't change
      timestamp: updates.timestamp || new Date().toISOString()
    };

    // Apply truncation to updated fields
    if (updates.title !== undefined) {
      updatedEntry.title = truncateString(updates.title, MAX_TITLE_LENGTH);
    }
    if (updates.lastMessagePreview !== undefined) {
      updatedEntry.lastMessagePreview = truncateString(updates.lastMessagePreview, MAX_PREVIEW_LENGTH);
    }

    currentHistory[existingIndex] = updatedEntry;

    // Sort by timestamp (newest first)
    currentHistory.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return saveChatHistoryToStorage(currentHistory);
  } catch (error) {
    console.error('Error updating chat entry:', error);
    return false;
  }
}

/**
 * Delete a specific chat entry
 */
export function deleteChat(id: string): boolean {
  try {
    const currentHistory = getChatHistory();
    const filteredHistory = currentHistory.filter(chat => chat.id !== id);

    if (filteredHistory.length === currentHistory.length) {
      console.warn(`Chat with id ${id} not found for deletion`);
      return false;
    }

    return saveChatHistoryToStorage(filteredHistory);
  } catch (error) {
    console.error('Error deleting chat entry:', error);
    return false;
  }
}

/**
 * Update chat title
 */
export function updateChatTitle(id: string, newTitle: string): boolean {
  return updateChat(id, { title: newTitle });
}

/**
 * Clear all chat history (useful for testing or user preference)
 */
export function clearAllChatHistory(): boolean {
  try {
    // Remove cookie
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    }

    // Remove localStorage copy (client only)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  try {
    let raw = '';
    if (typeof document !== 'undefined') {
      const cookieVal = getCookieValue(document.cookie, COOKIE_NAME) || '';
      raw = decodeURIComponent(cookieVal);
    } else {
      return { used: 0, available: 0, percentage: 0 };
    }

    const used = new Blob([raw]).size;
    const estimated = 4000; // Typical per-cookie limit (~4KB)
    const percentage = (used / estimated) * 100;

    return {
      used,
      available: estimated - used,
      percentage: Math.min(percentage, 100)
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
}