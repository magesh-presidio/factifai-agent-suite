export const htmlStyles = `
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
`;
