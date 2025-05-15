# Playwright Core

[![npm version](https://img.shields.io/npm/v/@presidio-dev/playwright-core.svg)](https://www.npmjs.com/package/@presidio-dev/playwright-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful wrapper around the Playwright browser automation library, specifically designed for Large Language Models (LLMs) to control web browsers. This package enhances the capabilities of the factifai-agent by providing a interaction system that's optimized for AI models. It offers simplified browser control, intelligent element detection, and rich visual debugging tools that make browser automation more reliable and easier to troubleshoot.

## Purpose

This library serves as the browser automation engine for factifai-agent, providing:

- **Enhanced Browser Control**: Session-based browser management with improved stability
- **Smart Element Detection**: Automatic identification of interactive page elements
- **Visual Debugging Tools**: Visualization of detected elements with numbered overlays
- **Simplified API**: High-level functions that abstract away Playwright complexity
- **LLM-friendly Interface**: Streamlined coordinate-based approach optimized for AI models to control browsers without needing complex DOM selectors

## Quick Start

```bash
# Install the package
npm install @presidio-dev/playwright-core

# Create a basic automation script
import { BrowserService, navigate, click, type } from '@presidio-dev/playwright-core';

const run = async () => {
  const sessionId = `test-${Date.now()}`;
  
  // Open a page and navigate
  await navigate(sessionId, 'https://example.com');
  
  // Interact with the page
  await click(sessionId, { x: 150, y: 200 });
  await type(sessionId, 'Hello, World!');
  
  // Capture with highlighted elements
  const screenshot = await BrowserService.getInstance().takeMarkedScreenshot(sessionId);
  
  // Clean up
  await BrowserService.getInstance().closePage(sessionId);
};

run();
```

## Core Features

| Feature | Description |
|---------|-------------|
| **Session Management** | Control browser sessions with unique IDs |
| **Visual Debugging** | Highlight and number elements for visual inspection |
| **Element Detection** | Find interactive elements automatically |
| **Screenshot Tools** | Capture screenshots with optional element highlighting |
| **Simplified API** | Streamlined wrappers for common browser operations |

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

```typescript
// Get detailed info about page elements
const elements = await browser.getAllPageElements(sessionId);
console.log(`Found ${elements.length} interactive elements:`);
elements.forEach(el => {
  console.log(`- ${el.tagName} at (${el.x}, ${el.y}), size: ${el.width}x${el.height}`);
});
```

## Requirements

- Node.js 18+
- Playwright (peer dependency)
- Browser binaries (Chromium, Firefox, and/or WebKit)

## Installation

```bash
# Install the package
npm install @presidio-dev/playwright-core

# yarn
yarn add @presidio-dev/playwright-core

# pnpm
pnpm add @presidio-dev/playwright-core

# IMPORTANT: Install browser dependencies (required)
npx playwright install --with-deps
```

The `npx playwright install --with-deps` command is crucial as it installs:
- Browser binaries (Chromium, Firefox, WebKit)
- Required system dependencies for proper browser operation
- Font packages and media codecs needed for complete rendering

## License

MIT © PRESIDIO®
