import * as fs from "fs";
import * as path from "path";
import { TEST_STATUS } from "../schemas";
import { logger } from "../../../../common/utils/logger";

/**
 * Generate JUnit XML report from test steps
 */
export function generateJUnitXmlReport(
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
export function writeJUnitXmlReport(xml: string, sessionId: string): string {
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
