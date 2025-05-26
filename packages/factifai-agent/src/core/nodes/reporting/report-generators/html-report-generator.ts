import * as fs from "fs";
import * as path from "path";
import { TEST_STATUS } from "../schemas";
import { formatDuration } from "../../../../common/utils/time-utils";
import { logger } from "../../../../common/utils/logger";
import { htmlStyles } from "../templates/html-styles";

/**
 * Generate HTML report from test steps
 */
export function generateHtmlReport(
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
  const recommendationsHtml = generateRecommendationsHtml(recommendations);
  const criticalIssuesHtml = generateCriticalIssuesHtml(criticalIssues);
  
  // Generate the HTML structure
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factifai Test Report</title>
    <style>
        ${htmlStyles}
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
 * Generate HTML for recommendations
 */
function generateRecommendationsHtml(recommendations: string[] | null): string {
  if (!recommendations || recommendations.length === 0) {
    return '';
  }

  return recommendations.map(rec => `
    <li class="recommendation-item">
      <span class="recommendation-icon">💡</span>
      <div>
        <strong>${rec.split(':')[0] || 'Recommendation'}</strong>
        <p>${rec.split(':').slice(1).join(':') || rec}</p>
      </div>
    </li>
  `).join('');
}

/**
 * Generate HTML for critical issues
 */
function generateCriticalIssuesHtml(criticalIssues: string[] | null): string {
  if (!criticalIssues || criticalIssues.length === 0) {
    return '';
  }

  return criticalIssues.map(issue => `
    <li class="critical-issue-item">
      <span class="critical-icon">⚠️</span>
      <div>
        <strong>${issue.split(':')[0] || 'Critical Issue'}</strong>
        <p>${issue.split(':').slice(1).join(':') || issue}</p>
      </div>
    </li>
  `).join('');
}

/**
 * Write HTML report to file
 */
export function writeHtmlReport(html: string, sessionId: string): string {
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
