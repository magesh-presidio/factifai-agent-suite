import { BrowserService } from './BrowserService';

export class SessionManager {
  private browserService = BrowserService.getInstance();
  
  async createSession(): Promise<string> {
    const sessionId = this.generateSessionId();
    // Initialize a page for this session
    await this.browserService.getPage(sessionId);
    return sessionId;
  }
  
  async closeSession(sessionId: string): Promise<void> {
    try {
      await this.browserService.closePage(sessionId);
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }

  private generateSessionId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 15);
  }
}
