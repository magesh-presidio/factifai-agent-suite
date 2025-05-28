# CI/CD Integration

This guide explains how to integrate the Factifai Agent Suite into your Continuous Integration and Continuous Deployment (CI/CD) pipelines. By automating your tests as part of your CI/CD process, you can catch issues early and ensure your application maintains quality throughout the development lifecycle.

## Benefits of CI/CD Integration

- **Early Detection**: Catch issues before they reach production
- **Consistent Testing**: Run the same tests on every code change
- **Automated Verification**: Reduce manual testing effort
- **Quality Gates**: Prevent problematic code from being deployed
- **Historical Data**: Track test results over time

## Prerequisites

Before integrating Factifai Agent with your CI/CD pipeline, make sure you have:

- A working test project with Factifai Agent (see [Setting Up a Test Project](/guides/setup-test-project))
- Access to a CI/CD system (GitHub Actions, Jenkins, GitLab CI, etc.)
- API credentials for your chosen LLM provider (OpenAI or AWS Bedrock)

## General Integration Steps

Regardless of which CI/CD system you're using, the general integration steps are:

1. **Install Dependencies**: Install Node.js, Factifai Agent, and Playwright dependencies
2. **Configure Credentials**: Set up API keys securely
3. **Run Tests**: Execute tests as part of your pipeline
4. **Process Results**: Handle test results and reports
5. **Notify**: Send notifications based on test outcomes

## Integration with GitHub Actions

GitHub Actions is a popular CI/CD solution that integrates directly with GitHub repositories.

### Basic Configuration

Create a file at `.github/workflows/factifai-tests.yml` with the following content:

```yaml
name: Factifai Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          npm install -g @presidio-dev/factifai-agent
          npx playwright install --with-deps
          
      - name: Configure Factifai Agent
        run: |
          factifai-agent config --set OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          
      - name: Run tests
        run: |
          factifai-agent run --file tests/first-test.txt
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: factifai-session
          path: factifai
          
      - name: Publish Test Report
        uses: mikepenz/action-junit-report@v2
        if: always()
        with:
          report_paths: 'factifai/factifai-session-*/reports/*.xml'

> **Coming Soon:** Directory-based test running with the `--dir` option and custom report directories with `--report-dir` will be available in future releases.
```

### Storing Secrets

Store your API keys as GitHub Secrets:

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add your API key with the name `OPENAI_API_KEY` or appropriate AWS credentials

### Advanced Configuration

For more advanced scenarios, you can enhance your GitHub Actions workflow:

#### Parallel Testing

Run tests in parallel to speed up execution:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-group: [e2e, regression, smoke]
    steps:
      # ... other steps ...
      - name: Run tests
        run: |
          factifai-agent run --dir tests/${{ matrix.test-group }} --report-dir=./test-reports/${{ matrix.test-group }}
```

#### Cross-Browser Testing

Test across multiple browsers:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      # ... other steps ...
      - name: Run tests
        run: |
          factifai-agent run --dir tests --browser ${{ matrix.browser }} --report-dir=./test-reports/${{ matrix.browser }}
```

#### Scheduled Tests

Run tests on a schedule:

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # Run daily at midnight
```

## Integration with Jenkins

Jenkins is a widely used automation server that can be used for CI/CD pipelines.

### Jenkinsfile Configuration

Create a `Jenkinsfile` in your repository root:

```groovy
pipeline {
    agent {
        docker {
            image 'node:18'
            args '--network=host'
        }
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g @presidio-dev/factifai-agent'
                sh 'npx playwright install --with-deps'
                sh 'factifai-agent config --set OPENAI_API_KEY=${OPENAI_API_KEY}'
            }
        }
        
        stage('Test') {
            steps {
                sh 'factifai-agent run --file tests/first-test.txt'
            }
        }
    }
    
    post {
        always {
            junit 'factifai/factifai-session-*/reports/*.xml'
            archiveArtifacts artifacts: 'factifai/**/*', allowEmptyArchive: true
        }
    }

    // Coming Soon: Directory-based test running with the --dir option and custom report directories with --report-dir
}
```

### Storing Credentials in Jenkins

Store your API keys in Jenkins Credentials:

1. Navigate to Jenkins > Manage Jenkins > Manage Credentials
2. Add a new Secret text credential with ID `OPENAI_API_KEY`
3. Reference it in your pipeline with `${OPENAI_API_KEY}`

## Integration with GitLab CI

GitLab CI/CD is GitLab's built-in CI/CD solution.

### .gitlab-ci.yml Configuration

Create a `.gitlab-ci.yml` file in your repository root:

```yaml
image: node:18

stages:
  - test

before_script:
  - npm install -g @presidio-dev/factifai-agent
  - npx playwright install --with-deps
  - factifai-agent config --set OPENAI_API_KEY=$OPENAI_API_KEY

factifai-tests:
  stage: test
  script:
    - factifai-agent run --file tests/first-test.txt
  artifacts:
    paths:
      - factifai
    reports:
      junit: factifai/factifai-session-*/reports/*.xml

# Coming Soon: Directory-based test running with the --dir option and custom report directories with --report-dir
```

### Storing Credentials in GitLab

Store your API keys as GitLab CI/CD Variables:

1. Navigate to your project > Settings > CI/CD
2. Expand the Variables section
3. Add a variable with key `OPENAI_API_KEY` and mark it as "Masked"

## Integration with Azure DevOps

Azure DevOps provides CI/CD capabilities through Azure Pipelines.

### azure-pipelines.yml Configuration

Create an `azure-pipelines.yml` file in your repository root:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: |
      npm install -g @presidio-dev/factifai-agent
      npx playwright install --with-deps
    displayName: 'Install dependencies'

  - script: |
      factifai-agent config --set OPENAI_API_KEY=$(OPENAI_API_KEY)
    displayName: 'Configure Factifai Agent'

  - script: |
      factifai-agent run --file tests/first-test.txt
    displayName: 'Run tests'

  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'factifai/factifai-session-*/reports/*.xml'
      mergeTestResults: true
    displayName: 'Publish test results'
    condition: always()

  - task: PublishBuildArtifacts@1
    inputs:
      pathToPublish: 'factifai'
      artifactName: 'factifai-session'
    displayName: 'Publish test reports'
    condition: always()

  # Coming Soon: Directory-based test running with the --dir option and custom report directories with --report-dir
```

### Storing Credentials in Azure DevOps

Store your API keys as Azure DevOps Pipeline Variables:

1. Navigate to your project > Pipelines > Edit your pipeline
2. Click on "Variables" in the top right
3. Add a variable with name `OPENAI_API_KEY` and mark it as "Secret"

## Report Control in CI/CD

### Performance Optimization with Report Control

For CI/CD pipelines, you can optimize performance by controlling which reports are generated:

```yaml
# GitHub Actions example
- name: Run smoke tests (no reports for speed)
  run: |
    factifai-agent run --skip-report --file tests/smoke-test.txt

- name: Run full regression tests (XML only for CI integration)
  run: |
    factifai-agent run --report-format xml --file tests/regression-test.txt

- name: Run nightly tests (full reporting)
  if: github.event_name == 'schedule'
  run: |
    factifai-agent run --report-format both --file tests/full-test.txt
```

### Test Case Analysis Control

For CI/CD pipelines where speed is critical, you can skip test case quality analysis:

```yaml
# GitHub Actions example with analysis control
- name: Run smoke tests (maximum speed)
  run: |
    factifai-agent run --skip-analysis --skip-report --file tests/smoke-test.txt

- name: Run regression tests (skip analysis, XML reports only)
  run: |
    factifai-agent run --skip-analysis --report-format xml --file tests/regression-test.txt

- name: Run nightly tests (full analysis and reporting)
  if: github.event_name == 'schedule'
  run: |
    factifai-agent run --report-format both --file tests/full-test.txt
```

### Environment-Specific Configuration

Configure different report formats and analysis settings for different environments:

```bash
# Set CI-specific configuration for maximum performance
factifai-agent config --set REPORT_FORMAT=xml
factifai-agent config --set SKIP_ANALYSIS=true

# Or use environment-specific flags
factifai-agent run --skip-analysis --report-format xml "test instruction"  # CI/CD
factifai-agent run --report-format html "test instruction"                 # Development
factifai-agent run --skip-analysis --skip-report "test instruction"        # Performance testing
```

### Jenkins Pipeline with Analysis Control

```groovy
pipeline {
    agent any
    
    stages {
        stage('Smoke Tests') {
            steps {
                // Maximum speed - skip analysis and reports
                sh 'factifai-agent run --skip-analysis --skip-report --file tests/smoke.txt'
            }
        }
        
        stage('Integration Tests') {
            steps {
                // Skip analysis, XML reports only for Jenkins integration
                sh 'factifai-agent run --skip-analysis --report-format xml --file tests/integration.txt'
            }
        }
        
        stage('Nightly Tests') {
            when {
                anyOf {
                    triggeredBy 'TimerTrigger'
                    branch 'main'
                }
            }
            steps {
                // Full analysis and reporting for comprehensive nightly tests
                sh 'factifai-agent run --report-format both --file tests/comprehensive.txt'
            }
        }
    }
    
    post {
        always {
            // Only process XML reports since that's what we generated
            junit 'factifai/factifai-session-*/reports/*.xml'
        }
    }
}
```

### GitLab CI with Analysis Control

```yaml
stages:
  - smoke
  - test
  - nightly

smoke-tests:
  stage: smoke
  script:
    - factifai-agent run --skip-analysis --skip-report --file tests/smoke.txt
  only:
    - merge_requests

integration-tests:
  stage: test
  script:
    - factifai-agent run --skip-analysis --report-format xml --file tests/integration.txt
  artifacts:
    reports:
      junit: factifai/factifai-session-*/reports/*.xml

nightly-tests:
  stage: nightly
  script:
    - factifai-agent run --report-format both --file tests/full-suite.txt
  artifacts:
    paths:
      - factifai
  only:
    - schedules
```

## Best Practices for CI/CD Integration

### Security Considerations

- **Never hardcode API keys** in your configuration files
- Use your CI/CD system's secret management features
- Limit access to sensitive credentials
- Rotate API keys periodically

### Performance Optimization

- **Run tests in parallel** when possible
- Use test categorization (smoke, regression, etc.) to run appropriate tests at different stages
- Consider using headless browsers for faster execution
- Implement test retries for flaky tests
- **Use `--skip-analysis`** for faster test parsing in CI/CD environments
- **Use `--skip-report`** for smoke tests where detailed reports aren't needed

### Analysis and Reporting Strategy

- **Smoke Tests**: Use `--skip-analysis --skip-report` for maximum speed
- **Integration Tests**: Use `--skip-analysis --report-format xml` for CI integration
- **Nightly Tests**: Use full analysis and reporting for comprehensive feedback
- **Development**: Enable full analysis for test quality feedback

### Reporting and Notifications

- **Publish test reports** as artifacts
- Configure notifications for test failures
- Integrate with communication tools (Slack, Teams, etc.)
- Track test metrics over time

### Example: Slack Notification in GitHub Actions

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: rtCamp/action-slack-notify@v2
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
    SLACK_CHANNEL: ci-alerts
    SLACK_TITLE: Test Failure
    SLACK_MESSAGE: 'Factifai tests failed in ${{ github.repository }}'
    SLACK_COLOR: danger
```

## Troubleshooting CI/CD Integration

### Common Issues

#### Browser Launch Failures

If browsers fail to launch in CI environments:

```yaml
# For GitHub Actions
- name: Install browser dependencies
  run: |
    sudo apt-get update
    sudo apt-get install -y libgbm-dev libasound2
```

#### Timeout Issues

For tests that take longer to run:

```bash
factifai-agent run --dir tests --timeout 60000
```

#### Memory Issues

If you encounter memory issues:

```yaml
# For GitHub Actions
- name: Increase memory limit
  run: |
    export NODE_OPTIONS="--max-old-space-size=4096"
```

## Next Steps

Now that you've integrated Factifai Agent with your CI/CD pipeline, you might want to explore:

- [Setting Up a Test Project](/guides/setup-test-project) - If you haven't already set up a test project

## Coming Soon

Additional guides that will be available in future releases:

- Cross-Browser Testing - Test your application across different browsers
- Custom Reporting - Create custom reports for your specific needs
- Team Collaboration - Share tests and results with your team
- Performance Testing - Measure and optimize your application's performance
