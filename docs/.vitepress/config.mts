import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Factifai Agent Suite",
  description: "AI-powered testing tools for modern development workflows",
  base: '/factifai-agent-suite/', // Base URL for GitHub Pages deployment
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/hai-logo.svg',
    siteTitle: 'Factifai',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'Tools', link: '/tools/' },
      { text: 'Features', link: '/features/' },
      { text: 'Guides', link: '/guides/' }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/getting-started/' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quick Start', link: '/getting-started/quick-start' }
          ]
        }
      ],
      '/tools/': [
        {
          text: 'Tools',
          items: [
            { text: 'Overview', link: '/tools/' },
            { text: 'Factifai Agent', link: '/tools/factifai-agent/' },
            { text: 'Playwright Core', link: '/tools/playwright-core/' }
          ]
        }
      ],
      '/features/': [
        {
          text: 'Features',
          items: [
            { text: 'Overview', link: '/features/' },
            { text: 'Test Parsing', link: '/features/test-parsing' },
            { text: 'Live Test Progress', link: '/features/live-progress' },
            { text: 'CLI Reports', link: '/features/cli-reports' },
            { text: 'HTML & XML Reports', link: '/features/html-xml-reports' }
          ]
        }
      ],
      '/guides/': [
        {
          text: 'Guides',
          items: [
            { text: 'Overview', link: '/guides/' },
            { text: 'Setting Up a Test Project', link: '/guides/setup-test-project' },
            { text: 'Writing Effective Test Cases', link: '/guides/writing-test-cases' },
            { text: 'CI/CD Integration', link: '/guides/ci-cd-integration' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/presidio-oss/factifai-agent-suite' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Presidio'
    }
  }
})
