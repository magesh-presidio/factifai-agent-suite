# CLI Reports

The Factifai Agent Suite provides comprehensive, beautifully formatted test results directly in your terminal. These CLI reports give you immediate insights into your test execution without having to open external files or tools.

<video controls autoplay loop muted class="feature-video">
  <source src="../assets/test-execution-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## How It Works

When a test completes, Factifai Agent automatically generates a detailed report in the terminal that includes:

1. **Test Execution Report** - Analysis of the test run and generation of detailed results
2. **Test Results Summary** - Overall pass rate, summary of what happened, and test status
3. **Detailed Step Analysis** - Comprehensive breakdown of each test step with status and notes
4. **Error Analysis** - In-depth analysis of what went wrong when tests fail
5. **Recommendations** - AI-generated suggestions for fixing test issues
6. **Critical Issues** - Highlighting of blockers that prevented test completion

## Benefits of CLI Reports

### Immediate Feedback

Get instant feedback on test results without having to open external files or tools.

### Comprehensive Information

See detailed information about each step, including what was executed and whether it passed or failed, with explanatory notes.

### Intelligent Error Analysis

When a test fails, the CLI report provides detailed error analysis to help you quickly identify and fix issues, including root cause identification.

### Actionable Recommendations

Receive AI-generated recommendations for addressing test failures, helping you resolve issues faster.

## CLI Report Sections

### Test Execution Report

The report generation process is shown at the beginning:

```
TEST EXECUTION REPORT

Analyzing test execution and generating detailed report

> Analyzing test execution...
> Processing 96 tool calls and 96 tool responses...
> Generating detailed test report...
> Report generation completed successfully
```

### Test Results Summary

The test summary provides a high-level overview of the test execution:

```
Test Results ────────────────────────────────────────────────────────────────────────────────────────

Test Pass Rate: 60%

Summary:
The browser automation test session targeted the login workflow for saucedemo.com using the credentials 'new_user' and 'new_password'. Test
steps for navigation and form entry were successful, but the login and subsequent verification steps failed. The system displayed an error
message indicating the provided credentials were invalid, preventing completion of the intended workflow. All browser automation commands
executed without technical errors.

Test Status:
✓ 3 tests passed
✗ 2 tests failed
○ 0 tests not started
```

For successful tests, the summary is positive:

```
Test Pass Rate: 100%

Summary:
All test steps executed successfully for the browser automation session targeting the text-box functionality on demoqa.com. The form was
filled with valid data, submitted, and the subsequent display of information was verified, indicating a stable process flow. No steps
failed or were blocked.

Test Status:
✓ 7 tests passed
✗ 0 tests failed
○ 0 tests not started
```

### Detailed Step Analysis

Each test step is shown in a table with status and detailed notes:

```
┌─────┬─────────────────────────────────────────────┬─────────┬──────────────────────────┐
│ #   │ Test Step                                   │ Status  │ Notes                    │
├─────┼─────────────────────────────────────────────┼─────────┼──────────────────────────┤
│ 1   │ Navigate to saucedemo.com                   │ ✓ PASSED│ Step 1 remains passed. Th│
│     │                                             │         │e login page was loaded a │
│     │                                             │         │nd all required elements  │
│     │                                             │         │were present, as previous │
│     │                                             │         │ly verified by a definiti │
│     │                                             │         │ve SUCCESS result. No reg │
│     │                                             │         │ression or evidence has e │
│     │                                             │         │merged to alter this stat │
│     │                                             │         │us.                       │
├─────┼─────────────────────────────────────────────┼─────────┼──────────────────────────┤
│ 2   │ Enter 'new_user' into the username field    │ ✓ PASSED│ Step 2 remains passed. Th│
│     │                                             │         │e username, 'new_user', w │
│     │                                             │         │as definitely entered in  │
│     │                                             │         │the username field accord │
│     │                                             │         │ing to prior authoritativ │
│     │                                             │         │e verification. There hav │
│     │                                             │         │e been no changes or issu │
│     │                                             │         │es affecting this input.  │
└─────┴─────────────────────────────────────────────┴─────────┴──────────────────────────┘
```

### Error Analysis

When tests fail, a detailed error analysis is provided:

```
Test Execution Error ────────────────────────────────────────────────────────────────────────────────

Last Error:

Verification failed after 3 retries: The login form is still displayed after clicking the Login button (label 4) at coordinates (640, 328).
Above the login button, there is a visible error message reading: "Epic sadface: Username and password do not match any user in this
service." This is clear proof that the login attempt with username "new_user" and password "new_password" failed, and the system did not
advance to a post-login or inventory page. The test case cannot be completed successfully as described using these credentials.

Error Analysis:
The test failed on the login verification step because the username and password did not match any registered user on saucedemo.com. The
application displayed a clear error message confirming that authentication was unsuccessful with the given credentials. This is a data
issue rather than a technical automation failure—using valid credentials is necessary for successful test execution.
```

### Recommendations

AI-generated recommendations for addressing test failures:

```
Recommendations:

❯ Review the list of valid usernames and passwords for saucedemo.com and use credentials known to work.
❯ Implement automated credential verification at test setup to avoid test failures due to invalid data.
❯ Add logic to detect and report authentication errors earlier, for clearer root cause identification.
❯ Optionally, include tests for invalid login credentials as negative test cases, but ensure positive flow tests use valid inputs.
```

### Critical Issues

Highlighting of critical issues that blocked test completion:

```
Critical Issues:

▲ Critical failure in logging in due to invalid credentials, blocking completion of the main workflow.
```

## Report Control Options

### Skip Report Generation

For performance-critical scenarios or CI/CD pipelines where you only need test execution without detailed reporting, you can skip all report generation:

```bash
# Skip all report generation (CLI and file reports)
factifai-agent run --skip-report "Navigate to example.com and verify the page loads"
```

When `--skip-report` is used, the execution configuration will show:
```
📋 Execution Configuration:
- Provider: bedrock
- Model: us.anthropic.claude-3-7-sonnet-20250219-v1:0
- Report Generation: Disabled (--skip-report)
```

### Report Format Configuration

You can control which report formats are generated using the `--report-format` flag or by setting a default in your configuration:

```bash
# Generate only CLI reports (no file reports)
factifai-agent run --report-format html "test instruction"

# Generate only XML reports for CI/CD integration
factifai-agent run --report-format xml "test instruction"

# Generate both HTML and XML reports (default)
factifai-agent run --report-format both "test instruction"
```

### Configuration Management

Set default report preferences that persist across runs:

```bash
# Set default report format
factifai-agent config --set REPORT_FORMAT=html

# View current configuration including report settings
factifai-agent config --show
```

The configuration display includes report settings:
```
Report Configuration:
- REPORT_FORMAT: html (or xml, both, both (default))
```

### Priority Order

Report settings are resolved in this priority order:
1. `--skip-report` flag (highest priority - disables all reports)
2. `--report-format` CLI flag
3. `REPORT_FORMAT` config setting
4. Default: "both" (CLI + HTML + XML reports)

## Integration with CI/CD

The CLI reports are designed to work well in CI/CD environments. The output is formatted to be readable in CI/CD logs while still providing detailed information about test execution.

### Performance Optimization

For CI/CD pipelines where you only need test execution results without detailed reporting:

```bash
# Fast execution without reports
factifai-agent run --skip-report "test instruction"

# Generate only XML reports for test result integration
factifai-agent run --report-format xml "test instruction"
```

### Environment-Specific Configuration

Configure different report formats for different environments:

```bash
# Development - full reporting
factifai-agent config --set REPORT_FORMAT=both

# CI/CD - XML only for integration
factifai-agent run --report-format xml "test instruction"

# Performance testing - no reports
factifai-agent run --skip-report "test instruction"

# Skip test case analysis for faster parsing
factifai-agent run --skip-analysis "test instruction"

# Maximum performance - skip both analysis and reports
factifai-agent run --skip-analysis --skip-report "test instruction"
```

### Test Case Analysis Control

For scenarios where you want to skip the test case quality analysis and suggestions step, you can use the `--skip-analysis` flag:

```bash
# Skip test case quality analysis for faster execution
factifai-agent run --skip-analysis "Navigate to example.com and verify the page loads"
```

When `--skip-analysis` is used, the execution configuration will show:
```
📋 Execution Configuration:
- Provider: bedrock
- Model: us.anthropic.claude-3-7-sonnet-20250219-v1:0
- Report Format: both
- Test Analysis: Disabled (--skip-analysis)
```

### Analysis Configuration Management

Set default analysis preferences that persist across runs:

```bash
# Skip analysis by default
factifai-agent config --set SKIP_ANALYSIS=true

# Enable analysis by default (default behavior)
factifai-agent config --set SKIP_ANALYSIS=false

# View current configuration including analysis settings
factifai-agent config --show
```

The configuration display includes analysis settings:
```
Report Configuration:
- REPORT_FORMAT: both (default)
- SKIP_ANALYSIS: true
```

### Performance Optimization Priority

Settings are resolved in this priority order:
1. `--skip-report` flag (highest priority - disables all reports)
2. `--report-format` CLI flag
3. `REPORT_FORMAT` config setting
4. `--skip-analysis` CLI flag
5. `SKIP_ANALYSIS` config setting
6. Defaults: "both" reports, analysis enabled

## Coming Soon

Additional customization options for CLI reports will be available in future releases:

- **Verbosity Levels** - Control the amount of detail shown in the report
- **Report Formats** - Choose between different output formats (compact, detailed, JSON)
- **Custom Templates** - Define your own report templates
- **Report Filtering** - Focus on specific aspects of the report (failures only, summary only)
- **Performance Metrics** - Detailed timing information for each step and the overall test
- **Export Options** - Save reports to files in various formats

## Next Steps

Now that you understand how CLI reports work, you might want to explore:

- [HTML & XML Reports](./html-xml-reports) - Learn about generating structured reports for documentation and CI/CD integration
- [Test Parsing](./test-parsing) - Understand how natural language instructions are transformed into executable test steps
- [Live Test Progress](./live-progress) - See how to monitor test execution in real-time

<style>
.feature-video {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin: 1rem 0;
}
</style>
