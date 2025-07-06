const PANEL_STATE_KEY = 'nexus_chat_history_panel_open';
const COOKIE_NAME = 'chat_history_panel_open';

/**
 * Get chat history panel state from cookie (server-safe) or localStorage (fallback)
 */
export function getChatHistoryPanelState(): boolean {
  try {
    // First try to read from cookie (works on server)
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const panelCookie = cookies.find(cookie => 
        cookie.trim().startsWith(`${COOKIE_NAME}=`)
      );
      
      if (panelCookie) {
        const value = panelCookie.split('=')[1]?.trim();
        return value === 'true';
      }
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(PANEL_STATE_KEY);
      return stored === 'true';
    }
    
    return false;
  } catch (error) {
    console.error('Error reading chat history panel state:', error);
    return false;
  }
}

/**
 * Save chat history panel state to both cookie and localStorage
 */
export function setChatHistoryPanelState(isOpen: boolean): boolean {
  try {
    const value = isOpen.toString();
    
    // Save to cookie (works on server)
    if (typeof document !== 'undefined') {
      // Set cookie with 1 year expiration
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `${COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }
    
    // Save to localStorage (fallback)
    if (typeof window !== 'undefined') {
      localStorage.setItem(PANEL_STATE_KEY, value);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving chat history panel state:', error);
    return false;
  }
}

/**
 * Get initial panel state for server-side rendering
 */
export function getInitialPanelState(cookieHeader?: string): boolean {
  try {
    if (!cookieHeader) return false;
    
    const cookies = cookieHeader.split(';');
    const panelCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${COOKIE_NAME}=`)
    );
    
    if (panelCookie) {
      const value = panelCookie.split('=')[1]?.trim();
      return value === 'true';
    }
    
    return false;
  } catch (error) {
    console.error('Error parsing cookie for panel state:', error);
    return false;
  }
}