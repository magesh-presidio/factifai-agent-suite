# docs

## 1.1.0

### Minor Changes

- 32d427c: add support for Azure OpenAI in Factifai Agent

## 1.0.1

### Patch Changes

- b687def: ## CLI Permissions Fix

  - **Fixed critical issue**: Resolved the CLI permissions problem where the `factifai-agent` command wasn't available when installed from npm
  - **Enhanced CI/CD pipeline**: Updated the GitHub Actions workflow to explicitly set executable permissions on CLI files before publishing to npm

  ## Playwright Integration

  - **Removed problematic script**: Eliminated the postinstall script from playwright-core which was causing installation issues
  - **Streamlined dependency management**: Improved how Playwright dependencies are handled to ensure consistent behavior across different environments

  ## Documentation Improvements

  - **Enhanced installation guide**: Updated all documentation to include the critical step of installing Playwright globally before running `npx playwright install --with-deps`
  - **Added troubleshooting information**: Included guidance on resolving common installation issues
  - **Standardized instructions**: Ensured consistent installation instructions across all documentation files including README.md, package documentation, and guides
  - **Improved CI/CD examples**: Updated CI/CD integration examples to reflect the correct installation sequence

  These changes ensure a smoother installation experience and resolve the issues with CLI command availability when installing packages from npm.

## 1.0.0

### Major Changes

- 9c98a27: ## Documentation Updates
  - Updated CLI documentation with new flags and configuration options
  - Added comprehensive examples for CI/CD integration
  - Improved test parsing documentation with performance optimization guidance
  - Enhanced HTML/XML reports documentation with new folder structure details
