import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import chalk from "chalk";
import figures from "figures";
import boxen from "boxen";
import * as fs from "fs";
import * as path from "path";
import { enhancedLogger } from "../../../common/services/console-display-service";
import { GraphStateType } from "../../graph/graph";
import { getModel } from "../../models/models";
import { TEST_STATUS } from "./schemas";
import { displayComponents } from "./display-components";
import { logger } from "../../../common/utils/logger";
import { formatDuration } from "../../../common/utils/time-utils";

export const reportOutputSchema = z.object({
  summary: z.string().describe("Overall test execution summary"),
  passRate: z.number().describe("Percentage of test steps that passed (0-100)"),
  executionTime: z
    .string()
    .nullable()
    .describe("Estimated test execution time; null if unavailable"),
  recommendations: z
    .array(z.string())
    .nullable()
    .describe("Recommendations for improving the test; null if unavailable"),
  criticalIssues: z
    .array(z.string())
    .nullable()
    .describe("Critical issues found during testing; null if none"),
  errorAnalysis: z
    .string()
    .nullable()
    .describe("Analysis of the last error, or null"),
});

// Helper functions
/**
 * Extract test execution history from messages
 */
function extractTestExecutionHistory(messages: any[]) {
  const toolCalls = messages
    .filter((msg: any) => msg.tool_calls?.length > 0)
    .flatMap((msg: any) => msg.tool_calls || []);

  const toolResponses = messages
    .filter(
      (msg: any) =>
        msg.name &&
        (msg.name.includes("navigate") ||
          msg.name.includes("click") ||
          msg.name.includes("type"))
    )
    .map((msg: any) => ({ tool: msg.name, content: msg.content }));

  return {
    toolCalls,
    toolResponses,
  };
}

/**
 * Create a summary of test actions for the LLM
 */
function createActionsSummary(toolCalls: any[], toolResponses: any[]) {
  return [
    ...toolCalls.map((tc: any) => {
      try {
        const args = JSON.parse(tc.args);
        return `Tool called: ${tc.name} with args: ${JSON.stringify(args)}`;
      } catch {
        return `Tool called: ${tc.name}`;
      }
    }),
    ...toolResponses.map(
      (tr: any) =>
        `Tool response: ${tr.tool} - ${tr.content.substring(0, 50)}...`
    ),
  ].join("\n");
}

/**
 * Create a description of test steps
 */
function createStepsDescription(testSteps: any[]) {
  return testSteps
    .map(
      (step) =>
        `Step ${step.id}: "${step.instruction}" (Currently: ${step.status})`
    )
    .join("\n");
}

/**
 * Calculate pass rate from test steps
 */
function calculatePassRate(testSteps: any[]) {
  if (!testSteps || testSteps.length === 0) return 0;

  const passedSteps = testSteps.filter(
    (step) => step.status === TEST_STATUS.PASSED
  );
  return Math.round((passedSteps.length / testSteps.length) * 100);
}

/**
 * Generate a test report using an LLM model
 */
async function generateTestReport(
  systemPrompt: SystemMessage,
  userMessage: HumanMessage
) {
  // Get the model with structured output
  const model = getModel(false, 16000).withStructuredOutput(reportOutputSchema);

  // Generate the report
  return await model.invoke([systemPrompt, userMessage]);
}

/**
 * Generate JUnit XML report from test steps
 */
function generateJUnitXmlReport(
  testSteps: any[],
  testSummary: string,
  executionTime: string | null,
  lastError: string | null,
  recommendations: string[] | null = null,
  criticalIssues: string[] | null = null
): string {
  // Count test statistics
  const totalTests = testSteps.length;
  const failures = testSteps.filter(
    (step) => step.status === TEST_STATUS.FAILED
  ).length;
  const skipped = testSteps.filter(
    (step) =>
      step.status === TEST_STATUS.NOT_STARTED ||
      step.status === TEST_STATUS.IN_PROGRESS
  ).length;

  // Parse execution time if available, default to 0
  let timeValue = "0";
  if (executionTime) {
    // Try to extract numeric value from time string (e.g. "5.2 seconds" -> "5.2")
    const timeMatch = executionTime.match(/(\d+(\.\d+)?)/);
    if (timeMatch && timeMatch[1]) {
      timeValue = timeMatch[1];
    }
  }

  // Start building XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += "<testsuites>\n";
  xml += `  <testsuite name="Factifai Test Suite" tests="${totalTests}" failures="${failures}" errors="0" skipped="${skipped}" time="${timeValue}">\n`;

  // Calculate pass rate percentage
  const passRate =
    totalTests > 0
      ? Math.round(((totalTests - failures - skipped) / totalTests) * 100)
      : 0;

  // Add test summary and recommendations as properties
  xml += "    <properties>\n";
  xml += `      <property name="summary" value="${escapeXml(testSummary)}"/>\n`;
  xml += `      <property name="passRate" value="${passRate}%"/>\n`;

  // Add recommendations as properties
  if (recommendations && recommendations.length > 0) {
    recommendations.forEach((recommendation, index) => {
      xml += `      <property name="recommendation.${
        index + 1
      }" value="${escapeXml(recommendation)}"/>\n`;
    });
  }

  // Add critical issues as properties
  if (criticalIssues && criticalIssues.length > 0) {
    criticalIssues.forEach((issue, index) => {
      xml += `      <property name="criticalIssue.${
        index + 1
      }" value="${escapeXml(issue)}"/>\n`;
    });
  }

  xml += "    </properties>\n";

  // Add each test step as a test case
  testSteps.forEach((step) => {
    const testName = `Step ${step.id}: ${step.instruction}`;

    xml += `    <testcase classname="factifai.tests" name="${escapeXml(
      testName
    )}" time="0">\n`;

    // Add failure information if the test failed
    if (step.status === TEST_STATUS.FAILED) {
      const message = step.notes || "Test step failed";
      xml += `      <failure message="${escapeXml(
        message
      )}" type="AssertionError">${escapeXml(message)}</failure>\n`;
    }

    // Add skipped tag if the test was not started or is in progress
    if (
      step.status === TEST_STATUS.NOT_STARTED ||
      step.status === TEST_STATUS.IN_PROGRESS
    ) {
      xml += "      <skipped/>\n";
    }

    // Add notes for all test steps that have them (regardless of status)
    if (step.notes) {
      xml += "      <system-out>\n";
      xml += `        ${escapeXml(step.notes)}\n`;
      xml += "      </system-out>\n";
    }

    xml += "    </testcase>\n";
  });

  // Add system-out with any error information
  if (lastError) {
    xml += "    <system-out>\n";
    xml += `      ${escapeXml(lastError)}\n`;
    xml += "    </system-out>\n";
  }

  // Close the testsuite and testsuites tags
  xml += "  </testsuite>\n";
  xml += "</testsuites>";

  return xml;
}

/**
 * Escape special characters for XML
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Write JUnit XML report to file
 */
function writeJUnitXmlReport(xml: string, sessionId: string): string {
  try {
    // Create sessionId directory if it doesn't exist
    const sessionDir = path.join(process.cwd(), sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    // Create test report directory within sessionId directory
    const reportDir = path.join(sessionDir, "test report");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    const filename = `test-report-${timestamp}.xml`;
    const filePath = path.join(reportDir, filename);

    // Write the XML to file
    fs.writeFileSync(filePath, xml);

    return filePath;
  } catch (error) {
    logger.error(
      `Failed to write JUnit XML report: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

/**
 * Generate HTML report from test steps
 */
function generateHtmlReport(
  testSteps: any[],
  testSummary: string,
  passRate: number,
  executionTime: string | null,
  lastError: string | null,
  recommendations: string[] | null = null,
  criticalIssues: string[] | null = null,
  testDuration: number | null = null
): string {
  // Format the current date
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Format execution time for display
  const formattedExecutionTime = testDuration ? formatDuration(testDuration) : (executionTime || "Unknown");
  
  // Count test statistics
  const totalTests = testSteps.length;
  const passed = testSteps.filter(
    (step) => step.status === TEST_STATUS.PASSED
  ).length;
  const failed = testSteps.filter(
    (step) => step.status === TEST_STATUS.FAILED
  ).length;
  
  // Convert recommendations and critical issues to HTML if they exist
  let recommendationsHtml = '';
  if (recommendations && recommendations.length > 0) {
    recommendationsHtml = recommendations.map(rec => `
      <li class="recommendation-item">
        <span class="recommendation-icon">💡</span>
        <div>
          <strong>${rec.split(':')[0] || 'Recommendation'}</strong>
          <p>${rec.split(':').slice(1).join(':') || rec}</p>
        </div>
      </li>
    `).join('');
  }

  let criticalIssuesHtml = '';
  if (criticalIssues && criticalIssues.length > 0) {
    criticalIssuesHtml = criticalIssues.map(issue => `
      <li class="critical-issue-item">
        <span class="critical-icon">⚠️</span>
        <div>
          <strong>${issue.split(':')[0] || 'Critical Issue'}</strong>
          <p>${issue.split(':').slice(1).join(':') || issue}</p>
        </div>
      </li>
    `).join('');
  }
  
  // Generate the HTML structure
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factifai Test Report</title>
    <style>
        :root {
            --primary: #4a6fd0;
            --primary-dark: #3a5cb0;
            --success: #2ecc71;
            --warning: #f39c12;
            --danger: #e74c3c;
            --light: #f8f9fa;
            --dark: #343a40;
            --border: #dee2e6;
            --border-radius: 8px;
            --shadow: 0 4px 6px rgba(0,0,0,0.1);
            --spacing: 1.5rem;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
            padding: 0;
            margin: 0;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        header {
            background-color: white;
            padding: var(--spacing);
            border-radius: var(--border-radius);
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
        }
        
        .report-title {
            font-size: 2rem;
            color: var(--dark);
            margin-bottom: 0.5rem;
        }
        
        .report-meta {
            color: #6c757d;
            font-size: 0.9rem;
            display: flex;
            justify-content: space-between;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background-color: white;
            border-radius: var(--border-radius);
            padding: 1.5rem;
            box-shadow: var(--shadow);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .card {
            background-color: white;
            border-radius: var(--border-radius);
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
            overflow: hidden;
        }
        
        .card-header {
            background-color: var(--light);
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .card-body {
            padding: 1.5rem;
        }
        
        .card-title {
            margin-bottom: 1rem;
            font-size: 1.25rem;
            color: var(--dark);
        }
        
        .summary {
            background-color: white;
            border-radius: var(--border-radius);
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
        }
        
        .recommendation-list {
            list-style-type: none;
            margin-bottom: 1rem;
        }
        
        .recommendation-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }
        
        .recommendation-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        
        .recommendation-icon {
            color: var(--primary);
            margin-right: 1rem;
            font-size: 1.25rem;
        }
        
        .test-cases {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1rem;
        }
        
        .test-cases th,
        .test-cases td {
            text-align: left;
            padding: 1rem;
            border-bottom: 1px solid var(--border);
        }
        
        .test-cases th {
            background-color: var(--light);
            font-weight: 600;
            color: var(--dark);
        }
        
        .test-cases tr:last-child td {
            border-bottom: none;
        }
        
        .test-cases tr:hover {
            background-color: #f8f9fa;
        }
        
        .badge {
            display: inline-block;
            padding: 0.35em 0.65em;
            font-size: 0.75em;
            font-weight: 700;
            line-height: 1;
            text-align: center;
            white-space: nowrap;
            vertical-align: baseline;
            border-radius: 0.25rem;
        }
        
        .badge-success {
            background-color: var(--success);
            color: white;
        }
        
        .badge-danger {
            background-color: var(--danger);
            color: white;
        }
        
        .status-icon {
            display: inline-block;
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 50%;
            text-align: center;
            line-height: 1.5rem;
            color: white;
            font-weight: bold;
            margin-right: 0.5rem;
        }
        
        .status-success {
            background-color: var(--success);
        }
        
        .status-failure {
            background-color: var(--danger);
        }
        
        .test-log {
            background-color: #f8f9fa;
            border-radius: 0.25rem;
            padding: 1rem;
            margin-top: 0.5rem;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 0.875rem;
            color: #212529;
            border: 1px solid #eee;
        }
        
        .test-details {
            margin-top: 1rem;
            display: none;
        }
        
        .clickable-row {
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
        }
        
        .clickable-row:hover {
            background-color: rgba(74, 111, 208, 0.05) !important;
        }

        .expandable {
            cursor: pointer;
        }
        
        .expandable:after {
            content: "▼";
            float: right;
            color: #6c757d;
            font-size: 0.75rem;
        }
        
        .critical-issues {
            list-style-type: none;
        }
        
        .critical-issue-item {
            display: flex;
            align-items: flex-start;
            padding: 1rem;
            background-color: rgba(231, 76, 60, 0.1);
            border-left: 4px solid var(--danger);
            border-radius: 4px;
            margin-bottom: 1rem;
        }
        
        .critical-icon {
            color: var(--danger);
            margin-right: 1rem;
            font-size: 1.25rem;
        }
        
        .progress {
            background-color: #e9ecef;
            border-radius: 0.25rem;
            height: 8px;
            overflow: hidden;
        }
        
        .progress-bar {
            background-color: var(--primary);
            height: 100%;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .test-cases th,
            .test-cases td {
                padding: 0.75rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1 class="report-title">Factifai Test Report</h1>
            <div class="report-meta">
                <span>Execution Time: ${formattedExecutionTime}</span>
                <span>Generated on: ${date}</span>
            </div>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--success);">${passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--danger);">${failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${passRate}%</div>
                <div class="stat-label">Pass Rate</div>
                <div class="progress" style="width: 80%; margin-top: 0.5rem;">
                    <div class="progress-bar" style="width: ${passRate}%;"></div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                Test Summary
            </div>
            <div class="card-body">
                <p>${testSummary}</p>
            </div>
        </div>
        
        ${criticalIssues && criticalIssues.length > 0 ? `
        <div class="card">
            <div class="card-header">
                Critical Issues
            </div>
            <div class="card-body">
                <ul class="critical-issues">
                    ${criticalIssuesHtml}
                </ul>
            </div>
        </div>
        ` : ''}
        
        ${recommendations && recommendations.length > 0 ? `
        <div class="card">
            <div class="card-header">
                Recommendations
            </div>
            <div class="card-body">
                <ul class="recommendation-list">
                    ${recommendationsHtml}
                </ul>
            </div>
        </div>
        ` : ''}
        
        <div class="card">
            <div class="card-header">
                Test Cases
            </div>
            <div class="card-body">
                <table class="test-cases">
                    <thead>
                        <tr>
                            <th>Step</th>
                            <th>Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="testCasesBody">
                        <!-- Test cases will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Test case data
        const testCases = ${JSON.stringify(testSteps.map(step => ({
          id: step.id,
          name: `Step ${step.id}: ${step.instruction}`,
          status: step.status,
          log: step.notes || `No additional log information for step ${step.id}.`,
          error: step.status === TEST_STATUS.FAILED ? (step.notes || `Step ${step.id} failed.`) : null
        })))};

        // Populate test cases
        const testCasesBody = document.getElementById("testCasesBody");
        
        testCases.forEach(testCase => {
            const row = document.createElement("tr");
            
            const statusIcon = testCase.status === "passed" 
                ? '<span class="status-icon status-success">✓</span>' 
                : '<span class="status-icon status-failure">✗</span>';
            
            const statusBadge = testCase.status === "passed" 
                ? '<span class="badge badge-success">Passed</span>' 
                : '<span class="badge badge-danger">Failed</span>';
            
            row.classList.add('clickable-row');
            row.onclick = function() { toggleDetails(testCase.id); };
            
            row.innerHTML = \`
                <td>\${testCase.id}</td>
                <td>
                    <div class="expandable">
                        \${statusIcon} \${testCase.name}
                    </div>
                    <div class="test-details" id="details-\${testCase.id}">
                        <div class="test-log">\${testCase.log}</div>
                        \${testCase.error ? \`<div class="test-log" style="border-left: 4px solid var(--danger); margin-top: 0.5rem;">\${testCase.error}</div>\` : ''}
                    </div>
                </td>
                <td>\${statusBadge}</td>
            \`;
            
            testCasesBody.appendChild(row);
        });

        // Toggle test details
        function toggleDetails(id) {
            const details = document.getElementById(\`details-\${id}\`);
            if (details.style.display === "block") {
                details.style.display = "none";
            } else {
                details.style.display = "block";
            }
        }
    </script>
</body>
</html>`;
}

/**
 * Write HTML report to file
 */
function writeHtmlReport(html: string, sessionId: string): string {
  try {
    // Create sessionId directory if it doesn't exist
    const sessionDir = path.join(process.cwd(), sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    // Create test report directory within sessionId directory
    const reportDir = path.join(sessionDir, "test report");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    const filename = `test-report-${timestamp}.html`;
    const filePath = path.join(reportDir, filename);

    // Write the HTML to file
    fs.writeFileSync(filePath, html);

    return filePath;
  } catch (error) {
    logger.error(
      `Failed to write HTML report: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}


// Main node function
export const generateReportNode = async ({
  testSteps,
  messages,
  lastError,
  sessionId,
  testStartTime,
  testEndTime,
  testDuration
}: GraphStateType) => {
  // Log test timing information if available
  if (testStartTime && testEndTime && testDuration) {
    logger.info(chalk.cyan(`🕒 Total test execution time: ${formatDuration(testDuration)}`));
  } else {
    logger.warn("Complete test timing information not available");
  }

  // Generate a sessionId if not provided
  const testSessionId = sessionId || `session-${new Date().getTime()}`;
  if (!testSteps || testSteps.length === 0) {
    enhancedLogger.warn("No test steps to analyze for report");
    return {};
  }

  // Display the report header
  displayComponents.displayReportHeader();

  try {
    // Show a spinning loader while generating the report
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Analyzing test execution...`
    );

    // Extract conversation context for analysis
    const { toolCalls, toolResponses } = extractTestExecutionHistory(messages);

    // Show progress
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Processing ${
        toolCalls.length
      } tool calls and ${toolResponses.length} tool responses...`
    );

    // Define system prompt for report generation
    const systemPrompt = new SystemMessage(
      `You are a test results analyzer. Review the test execution data and generate insights.
      Focus on providing a meaningful summary, useful recommendations, and analysis of any issues.
      DO NOT reassess the status of test steps - the provided step statuses are final and accurate.`
    );

    // Create a summary of the test actions for the LLM
    const actionsSummary = createActionsSummary(toolCalls, toolResponses);

    // Create the test steps list
    const stepsDesc = createStepsDescription(testSteps);

    const userMessage = new HumanMessage(
      `Analyze this browser automation test session and provide insights.
         
         TEST STEPS WITH FINAL STATUS:
         ${stepsDesc}
         
         TEST ACTIONS PERFORMED:
         ${actionsSummary}
         
         ${lastError ? `TEST ERROR: ${lastError}` : ""}
         
         Generate a comprehensive summary of the test execution, recommendations for improvement, 
         and analysis of any issues encountered. The step statuses are already final and accurate - 
         focus on providing valuable insights rather than reassessing step statuses.`
    );

    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating detailed test report...`
    );

    // Generate the report using the LLM
    const report = await generateTestReport(systemPrompt, userMessage);

    // Calculate pass rate if not provided by the LLM
    const passRate = report.passRate || calculatePassRate(testSteps);

    enhancedLogger.success(
      `${chalk.green(figures.tick)} Report generation completed successfully`
    );

    // Display the summary report
    displayComponents.displaySummaryReport(report, testSteps);

    // Display test steps in a nice table
    displayComponents.displayTestResultsTable(testSteps);

    // Display last error if present
    if (lastError) {
      displayComponents.displayErrorBox(lastError, report.errorAnalysis);
    }

    // Display recommendations if any
    if (report.recommendations && report.recommendations.length > 0) {
      displayComponents.displayRecommendations(report.recommendations);
    }

    // Display critical issues if any
    if (report.criticalIssues && report.criticalIssues.length > 0) {
      displayComponents.displayCriticalIssues(report.criticalIssues);
    }

    // Generate JUnit XML report
    try {
      enhancedLogger.info(
        `${chalk.blue(figures.pointer)} Generating JUnit XML report...`
      );

      const junitXml = generateJUnitXmlReport(
        testSteps,
        report.summary,
        report.executionTime,
        lastError,
        report.recommendations,
        report.criticalIssues
      );

      const xmlFilePath = writeJUnitXmlReport(junitXml, testSessionId);

      enhancedLogger.success(
        `${chalk.green(figures.tick)} XML report saved to: ${xmlFilePath}`
      );

      // Display the XML report path in a box
      console.log(
        boxen(
          chalk.bold.green("XML Report Generated") +
            "\n\n" +
            chalk.white(`File: ${xmlFilePath}`),
          {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "green",
          }
        )
      );

      // Generate HTML report
      enhancedLogger.info(
        `${chalk.blue(figures.pointer)} Generating HTML report...`
      );

      const htmlReport = generateHtmlReport(
        testSteps,
        report.summary,
        passRate,
        report.executionTime,
        lastError,
        report.recommendations,
        report.criticalIssues,
        testDuration
      );

      const htmlFilePath = writeHtmlReport(htmlReport, testSessionId);

      enhancedLogger.success(
        `${chalk.green(figures.tick)} HTML report saved to: ${htmlFilePath}`
      );

      // Display the HTML report path in a box
      console.log(
        boxen(
          chalk.bold.green("HTML Report Generated") +
            "\n\n" +
            chalk.white(`File: ${htmlFilePath}`),
          {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "green",
          }
        )
      );
    } catch (xmlError) {
      enhancedLogger.error(
        `${chalk.red(figures.cross)} Failed to generate reports: ${
          xmlError instanceof Error ? xmlError.message : "Unknown error"
        }`
      );
    }

    return {
      // Keep the original test steps - don't modify them
      testSummary: report.summary,
      passRate: passRate,
      recommendations: report.recommendations,
      criticalIssues: report.criticalIssues,
      errorAnalysis: report.errorAnalysis,
      // Add execution time tracking
      testEndTime,
      testDuration,
    };
  } catch (error) {
    enhancedLogger.error(
      `Error generating test report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    // Display error in a red box
    displayComponents.displayReportGenerationError(error);

    // If there was a lastError, display it separately
    if (lastError) {
      displayComponents.displayErrorBox(lastError);
    }

    return {
      // Don't modify test steps if report generation fails
      testSummary: `Failed to generate test report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      lastError,
    };
  }
};
