# HTML & XML Reports

The Factifai Agent Suite generates structured reports in HTML and XML formats, making it easy to share test results with team members and integrate with CI/CD pipelines.

<video controls autoplay loop muted class="feature-video">
  <source src="../assets/test-report-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## How It Works

When a test completes, Factifai Agent automatically generates:

1. **HTML Reports** - Clean, modern reports with detailed test information
2. **XML Reports** - Structured reports in JUnit-compatible XML format

These reports are saved to disk and can be viewed in a browser or processed by CI/CD tools.

## Benefits of Structured Reports

### Team Collaboration

HTML reports make it easy to share test results with team members, including those who don't have access to the test environment.

### CI/CD Integration

XML reports in JUnit format can be consumed by popular CI/CD tools like Jenkins, GitHub Actions, and GitLab CI, enabling automated test result processing.

### Historical Tracking

Saving reports for each test run allows you to track test results over time and identify trends or regressions.

### Detailed Documentation

The reports serve as detailed documentation of test execution, including detailed step analysis and error information.

## HTML Reports

### Features

The HTML reports include:

- **Test Summary Header** - Report title, execution time, and generation date
- **Test Statistics** - Total tests, passed/failed counts, and pass rate with visual indicator
- **Test Summary** - Narrative description of the test execution and results
- **Critical Issues** - Highlighted blockers that prevented test completion
- **Recommendations** - AI-generated suggestions for addressing test failures
- **Test Cases** - Detailed breakdown of each test step with status and notes

### Report Sections

#### Test Header and Statistics

The report header shows the title and generation information, followed by key statistics:

The statistics section provides a clear overview of test results:

- Total number of tests
- Number of passed tests
- Number of failed tests
- Pass rate percentage with visual progress bar

#### Test Summary

A narrative description of what happened during the test:

```
The browser automation test session targeted the login workflow for saucedemo.com using the credentials 'new_user' and 'new_password'. Test steps for navigation and form entry were successful, but the login and subsequent verification steps failed. The system displayed an error message indicating the provided credentials were invalid, preventing completion of the intended workflow. All browser automation commands executed without technical errors.
```

#### Critical Issues

When tests fail, critical issues are highlighted:

```
Critical failure in logging in due to invalid credentials, blocking completion of the main workflow.
```

#### Recommendations

AI-generated recommendations for addressing test failures:

```
• Review the list of valid usernames and passwords for saucedemo.com and use credentials known to work.
• Implement automated credential verification at test setup to avoid test failures due to invalid data.
• Add logic to detect and report authentication errors earlier, for clearer root cause identification.
• Optionally, include tests for invalid login credentials as negative test cases, but ensure positive flow tests use valid inputs.
```

#### Test Cases

A detailed breakdown of each test step with:

- Step number
- Step name/description
- Status (Passed/Failed)
- Detailed notes explaining what happened

For failed steps, additional details are provided:

```
Step 4 remains failed. Despite successful tool action (the button was clicked), a clear FAILURE verification result takes precedence: after all retry attempts, the login form remained and an error message was displayed indicating invalid credentials. The verification result is the definitive proof that this step failed.
```

## XML Reports

### Features

The XML reports include:

- **JUnit-Compatible Format** - Works with popular CI/CD tools
- **Test Suite Information** - Overall test statistics
- **Test Case Details** - Individual test step results
- **Error Information** - Structured error details
- **Timing Data** - Precise timing for each test step

### Report Structure

The XML report follows the JUnit format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Sauce Demo Login Test" tests="5" failures="0" errors="0" skipped="0" time="12.5">
    <testcase name="Navigate to https://saucedemo.com" classname="Navigation" time="2.3"/>
    <testcase name="Enter username and password" classname="Form Interaction" time="1.1"/>
    <testcase name="Click the login button" classname="Button Interaction" time="0.8"/>
    <testcase name="Add the first product to the cart" classname="Product Interaction" time="1.5"/>
    <testcase name="Verify the cart icon shows '1' item" classname="Verification" time="0.7"/>
  </testsuite>
</testsuites>
```

For failed tests, the XML includes error details:

```xml
<testcase name="Click the login button" classname="Button Interaction" time="2.5">
  <failure message="Element not found: login-button" type="ElementNotFoundError">
    Error: Element not found: login-button
    Selector: #login-button
    
    Attempted Actions:
    - Searched for element with ID "login-button"
    - Waited 2s for element to appear
    - Checked for similar elements: found [#login, .btn-login]
  </failure>
</testcase>
```

## Report File Structure

When you run a test with Factifai Agent, it automatically creates a session directory with the following structure:

```
factifai-session-[timestamp]/
├── factifai.log         # Detailed log file of the test execution
├── screenshots/         # Directory containing all captured screenshots
│   ├── screenshot-[timestamp]-1.jpg
│   ├── screenshot-[timestamp]-2.jpg
│   └── ...
└── test report/         # Directory containing HTML and XML reports
    ├── test-report-[timestamp].html
    └── test-report-[timestamp].xml
```

The session directory name includes a timestamp (e.g., `factifai-session-1747126071386`), making each test run uniquely identifiable.

### Screenshots Directory

The screenshots directory contains all the images captured during test execution, with filenames that include timestamps to show when they were taken. These screenshots provide visual evidence of what happened during each step of the test.

### Test Report Directory

The test report directory contains both HTML and XML versions of the test report:

- **HTML Report**: A user-friendly report that can be opened in any web browser
- **XML Report**: A structured report in JUnit format for CI/CD integration

## CI/CD Integration

### Jenkins Integration

To integrate with Jenkins:

1. Configure your test to run and generate reports:

```bash
factifai-agent run "..."
```

2. Add the JUnit plugin to your Jenkins configuration
3. Configure the plugin to look for your XML reports:

```groovy
// Jenkinsfile
pipeline {
    // ...
    post {
        always {
            junit 'factifai-session-*/test\ report/*.xml'
        }
    }
}
```

### GitHub Actions Integration

To integrate with GitHub Actions:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: factifai-agent run "..."
      - name: Publish Test Report
        uses: mikepenz/action-junit-report@v2
        with:
          report_paths: 'factifai-session-*/test report/*.xml'
```

### GitLab CI Integration

To integrate with GitLab CI:

```yaml
# .gitlab-ci.yml
test:
  script:
    - factifai-agent run "..."
  artifacts:
    paths:
      - factifai-session-*
    reports:
      junit: factifai-session-*/test\ report/*.xml
```

## Report Management

### Finding Reports

Since each test run creates a new session directory with a timestamp, you can find your reports by looking for the most recent directory:

```bash
# List all session directories, sorted by date
ls -lt | grep factifai-session

# Open the most recent HTML report in your default browser
open "$(ls -td factifai-session-* | head -1)/test report/"*.html
```

### Archiving Reports

To keep a history of test reports, you can archive older session directories:

```bash
# Archive session directories older than 30 days
find . -name "factifai-session-*" -type d -mtime +30 -exec tar -czf {}.tar.gz {} \; -exec rm -rf {} \;
```

### Sharing Reports

To share HTML reports with team members:

1. Zip the session directory:
   ```bash
   zip -r factifai-session-1747126071386.zip factifai-session-1747126071386
   ```

2. Share the zip file with team members or upload it to a shared location

## Troubleshooting

If you encounter issues with the reports:

### Missing Screenshots

If screenshots are missing from the HTML report:

1. Check the screenshots directory to see if they were captured
2. Verify that the browser was able to take screenshots during test execution
3. Check the factifai.log file for any errors related to screenshot capture

### XML Parsing Errors

If CI/CD tools have trouble parsing the XML report:

```bash
# Validate the XML report
xmllint --noout "factifai-session-*/test report/"*.xml
```

### Report Generation Failures

If report generation fails:

1. Check the factifai.log file for error messages
2. Ensure you have write permissions in the current directory
3. Verify that there is sufficient disk space available

## Coming Soon

Additional customization options for HTML and XML reports will be available in future releases:

- **Screenshots Gallery** - Visual captures at key points in the test with timestamps
- **Performance Dashboard** - Visual representation of step durations and page load times
- **Custom Templates** - Define your own report templates and styling
- **Report Filtering** - Focus on specific aspects of the report
- **Interactive Elements** - Expandable sections and interactive visualizations
- **Report Comparison** - Compare results across different test runs
- **Custom Metadata** - Add custom metadata to reports for better organization

## Next Steps

Now that you understand how HTML and XML reports work, you might want to explore:

- [CLI Reports](./cli-reports) - Learn about the detailed reports generated in the terminal
- [CI/CD Integration](../guides/ci-cd-integration) - Discover how to integrate Factifai Agent with CI/CD pipelines

<style>
.feature-video {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin: 1rem 0;
}
</style>
