---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Factifai"
  text: "Intelligent Test Automation Suite"
  tagline: Automate testing through AI-powered computer control. From manual steps to automated tests in minutes.
  image:
    src: /hai-logo.svg
    alt: Factifai Logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/presidio-oss/factifai-agent-suite

features:
  - icon: 🧠
    title: From Plain English to Executable Steps
    details: Write tests in natural language. The AI breaks down complex instructions into precise, organized steps ready for execution.
    link: /features/test-parsing
  - icon: 🔄
    title: Real-Time Test Execution Visualization
    details: See your tests run live with an intuitive CLI interface that shows exactly what's happening at each moment.
    link: /features/live-progress
  - icon: 📊
    title: Instant, Detailed Test Results
    details: Get comprehensive, beautifully formatted test results right in your terminal the moment execution completes.
    link: /features/cli-reports
  - icon: 📑
    title: Professional Reports for Teams & CI/CD
    details: Generate polished HTML reports for team sharing and structured XML outputs for your CI/CD pipelines.
    link: /features/html-xml-reports
---

<div class="demo-container">
  <video controls autoplay loop muted class="demo-video">
    <source src="/Demo.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</div>

## Overview

The Factifai Agent Suite provides a collection of AI-powered tools designed to accelerate and enhance testing processes across various development workflows. By leveraging Large Language Models (LLMs), the suite enables developers and QA teams to create, execute, and maintain tests using natural language, making testing more accessible, maintainable, and efficient.

Software testing has traditionally required specialized expertise and considerable time investment. The Factifai Agent Suite reimagines this process by allowing tests to be defined in plain English, automatically executed with precision, and seamlessly integrated into modern CI/CD pipelines.

<div class="custom-container tip">
  <p>Ready to get started? Check out our <a href="./getting-started/installation">installation guide</a> to set up Factifai Agent Suite in minutes!</p>
</div>

<style>
.demo-container {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
}
.demo-video {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
