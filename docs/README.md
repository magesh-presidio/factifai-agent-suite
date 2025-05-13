# Factifai Agent Suite Documentation

This directory contains the VitePress documentation site for the Factifai Agent Suite.

## Local Development

To run the documentation site locally:

```bash
# Navigate to the docs directory
cd docs

# Install dependencies
pnpm install

# Start the development server
pnpm run docs:dev
```

The site will be available at port 5173

## Building the Documentation

To build the documentation site:

```bash
# Navigate to the docs directory
cd docs

# Build the site
pnpm run docs:build
```

The built site will be available in the `.vitepress/dist` directory.

## Deployment

The documentation site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment is handled by a GitHub Actions workflow defined in `.github/workflows/deploy-docs.yml`.

### Manual Deployment

You can also manually trigger the deployment workflow from the GitHub Actions tab in the repository.

## Configuration

The VitePress configuration is defined in `.vitepress/config.mts`. If you need to modify the site configuration, such as navigation, sidebar, or theme settings, edit this file.

## Adding Content

To add new content to the documentation:

1. Create a new Markdown file in the appropriate directory
2. Update the sidebar configuration in `.vitepress/config.mts` if needed
3. Link to the new content from existing pages

## Structure

- `assets/` - Static assets like images and videos
- `features/` - Documentation for Factifai Agent Suite features
- `getting-started/` - Getting started guides
- `guides/` - How-to guides for common tasks
- `tools/` - Documentation for specific tools in the suite
