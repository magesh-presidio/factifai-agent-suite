# Live Test Progress

The Factifai Agent Suite provides real-time visualization of test execution in the CLI, allowing you to monitor your tests as they run. This feature makes debugging easier and provides immediate feedback on test progress.

<video controls autoplay loop muted class="feature-video">
  <source src="../assets/realtime-visualization-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## How It Works

When you run a test with Factifai Agent, the CLI interface displays:

1. **Detailed Log Output** - Shows each action as it happens with timestamps
2. **Element Detection** - Reports on interactive elements found on the page
3. **Browser Actions** - Displays navigation, clicks, and other interactions in real-time
4. **Progress Bar** - Visual indicator of test completion percentage
5. **Step Status** - Color-coded steps showing passed, current, and pending steps
6. **Elapsed Time** - Running timer showing test duration

## Benefits of Live Test Progress

### Immediate Feedback

No need to wait until the end of a test to see if it's working correctly. You get immediate feedback on each step as it executes.

### Easier Debugging

When a test fails, you can see exactly which step failed and why, making it much easier to debug issues.

### Better Understanding of Test Flow

Watching the test execute in real-time helps you understand the flow of the test and identify potential issues or optimizations.

### Confidence in Test Execution

Seeing the test run step-by-step gives you confidence that it's testing what you expect it to test.

## CLI Interface Elements

The live progress display includes several key elements:

### Detailed Log Output

Each action is logged with a timestamp and category:

```
[2:18:42 PM] [INFO] ⚪ Test execution started at 2025-05-13T08:48:42.856Z
[2:18:45 PM] [INFO] 📷 Screenshot captured
[2:18:45 PM] [INFO] 🔍 Found 0 visible marked elements on the page
[2:18:52 PM] [INFO] Navigating to https://www.gloriousgaming.com
```

### Element Detection

The system automatically detects interactive elements on the page:

```
[2:19:02 PM] [INFO] 🔍 Found 17 visible marked elements on the page
```

### Browser Actions

Detailed information about browser actions is displayed:

```
[2:19:53 PM] [INFO] Clicking at coordinates: (1075, 46)
```

### Progress Bar and Step Status

A visual progress bar shows test completion percentage and step status:

```
Test Progress: 25% complete [5 ✓ | 0 ✗ | 1 🔵 | 14 ○] ⏱ Elapsed: 1 minute 35 seconds
[████████░░░░░░░░░░░░░]
✓ Step 1: Enter "gloriousgaming.com" in the browser's address bar
✓ Step 2: Press Enter to navigate to the entered URL
✓ Step 3: Wait for 4 seconds for the page to fully load
✓ Step 4: Verify the homepage displays a hero banner
✓ Step 5: Verify the homepage displays featured products
🔵 Step 6: Click the close icon on the popup offer modal
```

### Step Execution Details

Detailed information about the current step being executed:

```
└─ Currently closing the popup offer modal by clicking the close icon. The clickByCoordinates tool has been called successfully to interact with the close icon (X) in the top right corner of the popup.
```

### Automatic Retry Functionality

The system automatically retries failed actions to improve test reliability:

```
[12:15:13 AM] [WARN] Verification failed. Retrying action: "Clicking the Login button at coordinates (640, 328) to submit the form" (1/3)
[12:15:23 AM] [WARN] Verification failed. Retrying action: "Clicking the Login button at coordinates (640, 328) to submit the form" (2/3)
[12:15:29 AM] [WARN] Verification failed. Retrying action: "Clicking the Login button at coordinates (640, 328) to submit the form" (3/3)

RETRY: Attempt 3/3 for action "Clicking the Login button at coordinates (640, 328) to submit the form"
RETRY PROGRESS: [■ ■ ■]
```

When a step fails after all retry attempts, it's marked as failed with detailed information:

```
Test Progress: 60% complete [3 ✓ | 1 ✗ | 0 🔵 | 1 ○] ⏱ Elapsed: 1 minute 7 seconds
[███████████████░░░░░]
✓ Step 1: Navigate to saucedemo.com
✓ Step 2: Enter 'new_user' into the username field
✓ Step 3: Enter 'new_password' into the password field
✗ Step 4: Click the 'Login' button
  └─ Step 4 is now marked as failed. All retries (3 out of 3) for clicking the Login button have been exhausted without a verification result (success or failure) and without an explicit error. Because maximum retries have been reached and there is no success signal, the step must be considered failed.
○ Step 5: Verify that the user is successfully logged in
```

## Integration with CI/CD

The live progress feature works well in CI/CD environments, providing real-time feedback during automated test runs. The output is designed to be readable in CI/CD logs while still providing detailed information about test execution.

## Coming Soon

Additional customization options for the live progress display will be available in future releases:

- **Verbosity Levels** - Control the amount of detail shown in the output
- **Color Themes** - Customize the colors used in the display
- **Output Formats** - Choose between different output formats for different environments
- **Performance Optimizations** - Options to reduce the performance impact of the live display

## Next Steps

Now that you understand how live test progress works, you might want to explore:

- [CLI Reports](./cli-reports) - Learn about the detailed reports generated after test execution
- [HTML & XML Reports](./html-xml-reports) - Discover how to generate structured reports for documentation and CI/CD integration

<style>
.feature-video {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin: 1rem 0;
}
</style>
