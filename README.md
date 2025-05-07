# Factifai Suite

An AI powered agentic browser automation testing suite powered by LLMs.

## Installation

```bash
pnpm install
```

## Usage

```bash
# Run with specified model provider
factifai-agent --model bedrock run "Navigate to duckduckgo.com"

# Run with OpenAI model
factifai-agent --model openai run "Navigate to duckduckgo.com"

# Run from a file (must specify model provider)
factifai-agent --model bedrock run --file ./tests/my-test.txt
```

## Model Configuration

Factifai supports multiple LLM providers that can be configured via the CLI:

### Available Model Providers

1. **bedrock** - AWS Bedrock models
   - Current model: `us.anthropic.claude-3-7-sonnet-20250219-v1:0`
   - Configure with environment variable: `BEDROCK_MODEL`

2. **openai** - OpenAI models
   - Current model: `gpt-4.1`
   - Configure with environment variable: `OPENAI_MODEL`

**Important**: You must explicitly specify a model provider. There is no default provider.

### Setting the Model Provider

You can set the model provider in several ways:

1. **Command-line option (per command):**
   ```bash
   factifai-agent --model openai run "Navigate to duckduckgo.com"
   ```

2. **Configuration command:**
   ```bash
   factifai-agent config --model openai
   ```

3. **Environment variable:**
   ```bash
   export MODEL_PROVIDER=openai
   factifai-agent run "Navigate to duckduckgo.com"
   ```

### Listing Available Models

To see all available models and the current configuration:

```bash
factifai-agent models
```

## Commands

- `run` - Run a browser automation task
- `config` - Configure settings and API keys
- `models` - List and manage available models

## Examples

```bash
# Run with OpenAI model
factifai-agent --model openai run "Navigate to duckduckgo.com and check if the logo is visible"

# Run from a file with custom session ID (must specify model provider)
factifai-agent --model bedrock run --file ./tests/checkout.txt --session my-session

# Show current configuration
factifai-agent config --show

# Set model provider for the current session
factifai-agent config --model bedrock
```

## Environment Variables

- `MODEL_PROVIDER` - The model provider to use (openai or bedrock)
- `OPENAI_MODEL` - The OpenAI model to use
- `OPENAI_API_KEY` - Your OpenAI API key
- `BEDROCK_MODEL` - The AWS Bedrock model to use
- `AWS_ACCESS_KEY_ID` - Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret access key
- `AWS_DEFAULT_REGION` - Your AWS region
