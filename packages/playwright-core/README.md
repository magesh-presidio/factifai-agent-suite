# @factifai/playwright-core

A powerful wrapper around Playwright providing browser automation services with enhanced capabilities for UI testing, element detection, and screenshot capture.

## Installation

```bash
npm install @factifai/playwright-core
# or
yarn add @factifai/playwright-core
# or
pnpm add @factifai/playwright-core
```

## Features

- **Browser Session Management**: Handle browser sessions with unique session IDs
- **Tab Management**: Track and control multiple browser tabs
- **Element Detection**: Find clickable and input elements on the page
- **Visual Element Marking**: Highlight and number elements on the page for visualization
- **Screenshot Capture**: Take screenshots with optional element highlighting
- **Navigation Utilities**: Simplified functions for common browser operations
- **Interaction Utilities**: Streamlined methods for user interactions

## Basic Usage

```typescript
import { BrowserService, navigate, click, type } from '@factifai/playwright-core';

// Example usage
async function runBrowserAutomation() {
  const browser = BrowserService.getInstance();
  const sessionId = `session-${Date.now()}`;
  
  try {
    // Navigate to a website
    await navigate(sessionId, 'https://example.com');
    
    // Take a screenshot
    const screenshot = await browser.takeScreenshot(sessionId);
    console.log('Screenshot taken:', !!screenshot);
    
    // Find and click an element
    await click(sessionId, { x: 150, y: 200 });
    
    // Type into an input field
    await type(sessionId, 'Hello, World!');
    
    // Take a screenshot with element highlighting
    const markedScreenshot = await browser.takeMarkedScreenshot(sessionId, {
      boxColor: 'green',
      removeAfter: true
    });
    
  } finally {
    // Clean up the browser session
    await browser.closePage(sessionId);
  }
}
```

## API Reference

### BrowserService

The main service for managing browser sessions and interactions.

- `getInstance()`: Get the singleton instance of BrowserService
- `getPage(sessionId)`: Get the active page for a session
- `takeScreenshot(sessionId, minWaitMs?)`: Capture a screenshot
- `captureScreenshotAndInfer(sessionId)`: Capture screenshot with page element data
- `getAllPageElements(sessionId)`: Get all clickable and input elements
- `takeMarkedScreenshot(sessionId, options?)`: Take screenshot with marked elements
- `closePage(sessionId)`: Close a session
- `closeAll()`: Close all sessions

### Navigation Functions

- `navigate(sessionId, url, options?)`: Navigate to a URL
- `getCurrentUrl(sessionId)`: Get the current page URL
- `reload(sessionId)`: Reload the current page
- `goBack(sessionId)`: Navigate back in history
- `goForward(sessionId)`: Navigate forward in history
- `wait(sessionId, ms)`: Wait for a specified time

### Interaction Functions

- `click(sessionId, coordinates, options?)`: Click at specific coordinates
- `type(sessionId, text, options?)`: Type text
- `clear(sessionId, coordinates?)`: Clear input field
- `scrollToNextChunk(sessionId)`: Scroll down one viewport
- `scrollToPrevChunk(sessionId)`: Scroll up one viewport

### Element Marking Functions

- `markVisibleElements(sessionId, options?)`: Mark elements with numbered boxes
- `removeElementMarkers(sessionId)`: Remove element markers

## Requirements

- Node.js 16 or higher
- Playwright is a peer dependency

## License

ISC

## Related Projects

This library is part of the factifai automation suite.
