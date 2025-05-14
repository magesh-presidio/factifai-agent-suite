# Playwright Core

Playwright Core is a powerful wrapper around the Playwright browser automation library, specifically designed for Large Language Models (LLMs) to control web browsers. This package enhances the capabilities of the Factifai Agent Suite by providing an interaction system that's optimized for AI models.

## Overview

Playwright Core offers simplified browser control, intelligent element detection, and rich visual debugging tools that make browser automation more reliable and easier to troubleshoot. It serves as the browser automation engine for Factifai Agent, providing a coordinate-based approach that allows AI models to control browsers without needing complex DOM selectors.

## Key Features

- **Enhanced Browser Control**: Session-based browser management with improved stability
- **Smart Element Detection**: Automatic identification of interactive page elements
- **Visual Debugging Tools**: Visualization of detected elements with numbered overlays
- **Simplified API**: High-level functions that abstract away Playwright complexity
- **LLM-friendly Interface**: Streamlined coordinate-based approach optimized for AI models

## Core Capabilities

### Session Management

Playwright Core uses a session-based approach to manage browser instances, allowing multiple concurrent browser sessions with isolated contexts.

```typescript
// Get a browser session
const sessionId = `test-${Date.now()}`;
const page = await BrowserService.getInstance().getPage(sessionId);

// Close a session when done
await BrowserService.getInstance().closePage(sessionId);
```

### Visual Element Detection

One of the most powerful features is the ability to automatically detect interactive elements on a page and visualize them with numbered overlays.

```typescript
// Mark all interactive elements with numbered boxes
await browser.markVisibleElements(sessionId);

// Take a screenshot with marked elements
const screenshot = await browser.takeMarkedScreenshot(sessionId);
```

### Coordinate-Based Interaction

Instead of relying on complex DOM selectors, Playwright Core uses a coordinate-based approach for interactions, making it ideal for AI models.

```typescript
// Click at specific coordinates
await click(sessionId, { x: 150, y: 200 });

// Type text (after clicking on an input field)
await type(sessionId, 'Hello, World!');
```

### Screenshot Tools

Capture screenshots with optional element highlighting for debugging and documentation.

```typescript
// Take a regular screenshot
const screenshot = await browser.takeScreenshot(sessionId);

// Take a screenshot with marked elements
const markedScreenshot = await browser.takeMarkedScreenshot(sessionId);
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

## Advanced Usage

### Custom Element Marking

You can customize how elements are marked on the page:

```typescript
// Mark interactive elements with custom colors
await browser.markVisibleElements(sessionId, {
  boxColor: 'blue',
  textColor: 'white',
  borderWidth: 2,
  elements: [
    { x: 100, y: 150, width: 200, height: 50, label: 'Search Box' }
  ]
});
```

### Page Element Data

Get detailed information about interactive elements on the page:

```typescript
// Get detailed info about page elements
const elements = await browser.getAllPageElements(sessionId);
console.log(`Found ${elements.length} interactive elements:`);
elements.forEach(el => {
  console.log(`- ${el.tagName} at (${el.x}, ${el.y}), size: ${el.width}x${el.height}`);
});
```

## Integration with Factifai Agent

Playwright Core is the browser automation engine that powers Factifai Agent. When you run a test with Factifai Agent, it:

1. Parses your natural language instructions
2. Converts them into a series of steps
3. Uses Playwright Core to execute those steps in the browser
4. Captures screenshots and generates reports

This separation of concerns allows Factifai Agent to focus on natural language processing and test orchestration, while Playwright Core handles the browser automation details.

## Requirements

- Node.js 18+
- Playwright (peer dependency)
- Browser binaries (Chromium, Firefox, and/or WebKit)

## Installation

```bash
# Install the package
npm install @presidio-dev/playwright-core

# IMPORTANT: Install browser dependencies (required)
npx playwright install --with-deps
```

The `npx playwright install --with-deps` command is crucial as it installs:
- Browser binaries (Chromium, Firefox, WebKit)
- Required system dependencies for proper browser operation
- Font packages and media codecs needed for complete rendering

## Next Steps

- [Installation Guide](/getting-started/installation)
- [Quick Start Guide](/getting-started/quick-start)
- [Factifai Agent](/tools/factifai-agent/)
- [Test Parsing Feature](/features/test-parsing)
- [Live Test Progress](/features/live-progress)
