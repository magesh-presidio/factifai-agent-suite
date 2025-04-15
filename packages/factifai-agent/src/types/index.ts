export interface AgentConfig {
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

export interface TestResult {
  instruction: string;
  result: {
    output: string;
    screenshot?: string;
    success: boolean;
    error?: string;
  };
}
