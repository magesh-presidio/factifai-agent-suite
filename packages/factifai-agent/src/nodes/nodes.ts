import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { openAiModel } from "../llm/models";
import { GraphStateType } from "../state/state";
import { formatImageForLLM } from "../utils/llmUtils";
import { z } from "zod";
import { NavigationTools } from "../tools/NavigationTools";

export const parseTestStepsNode = async ({ testCase }: GraphStateType) => {
  if (!testCase) {
    return {
      testSteps: [],
      currentStepIndex: -1,
    };
  }

  try {
    // Define system prompt to guide the parsing
    const systemPrompt = new SystemMessage(
      "You are a test automation specialist who converts natural language test descriptions " +
        "into clear, structured test steps. Extract each distinct action or verification into " +
        "a separate step."
    );

    const userMessage = new HumanMessage(
      `Parse the following test description into sequential, atomic test steps:\n\n${testCase}\n\n` +
        "Format each step as a clear instruction beginning with an action verb. Don't combine " +
        "multiple actions into a single step."
    );

    // Define the structured output schema
    const outputSchema = z.object({
      steps: z.array(
        z.object({
          id: z.number().describe("Step number starting from 1"),
          instruction: z
            .string()
            .describe("Clear instruction of what to do in this step"),
          status: z
            .enum(["not_started", "in_progress", "passed", "failed"])
            .default("not_started")
            .describe("Current status of this step"),
          type: z
            .enum([
              "navigation",
              "click",
              "type",
              "verification",
              "wait",
              "other",
            ])
            .describe("The type of action this step represents"),
        })
      ),
    });

    // Get the model with structured output
    const model = openAiModel().withStructuredOutput(outputSchema);

    // Execute the analysis
    const result = await model.invoke([systemPrompt, userMessage]);

    // Set the first step to in_progress if there are any steps
    const testSteps = result.steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "in_progress" };
      }
      return step;
    });

    console.log("Parsed test steps:", testSteps);

    return {
      testSteps,
      currentStepIndex: testSteps.length > 0 ? 0 : -1,
    };
  } catch (error) {
    console.error("Error parsing test steps:", error);
    return {
      testSteps: [],
      currentStepIndex: -1,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const testCoordinatorNode = async (state: GraphStateType) => {
  const { testSteps, currentStepIndex } = state;

  console.log("testCoordinatorNode called with state:", state);

  // If no steps or all steps completed, return current state
  if (
    !testSteps.length ||
    currentStepIndex < 0 ||
    currentStepIndex >= testSteps.length
  ) {
    console.log("No steps to process or all steps completed.");
    return {};
  }

  const currentStep = testSteps[currentStepIndex];

  // Analyze current step to determine action type
  const stepType = currentStep.type;
  const instruction = currentStep.instruction;

  // Handle navigation steps
  if (stepType === "navigation") {
    // We'll trigger navigation through the state
    return {
      actionType: "navigate",
      actionParams: { url: extractUrlFromInstruction(instruction) },
      // Mark the step as in_progress
      testSteps: updateTestStepStatus(
        testSteps,
        currentStepIndex,
        "in_progress"
      ),
    };
  }

  // Handle other step types (for now, just acknowledge we can't handle them)
  return {
    actionType: "unsupported",
    actionMessage: `Cannot perform action "${stepType}" at this time. Only navigation is supported.`,
    // Mark unsupported steps as failed
    testSteps: updateTestStepStatus(testSteps, currentStepIndex, "failed"),
    // Move to next step
    currentStepIndex:
      currentStepIndex + 1 < testSteps.length ? currentStepIndex + 1 : -1,
  };
};

export const launchNode = async ({ testCase, messages }: GraphStateType) => {
  // If this is the first call, add the command as a human message
  if (messages.length === 0) {
    messages = [new HumanMessage(testCase)];
  }

  const model = openAiModel().bindTools(NavigationTools.getTools());
  const systemMessage = new SystemMessage(
    "You are a web navigation assistant. Use the navigate tool to help users visit websites."
  );

  const response = await model.invoke([systemMessage, ...messages]);

  // Bedrock quirk: strip duplicate tool_use fragments
  if (typeof response.content !== "string") {
    response.content = response.content.filter((c) => c.type !== "tool_use");
  }

  return { messages: [response] };
};

export const extractNode = ({ messages }: GraphStateType) => {
  // Find the most recent tool message from a navigation tool
  const toolMessage = [...messages]
    .reverse()
    .find((m) => m.name === "navigate");

  if (toolMessage) {
    try {
      const result = JSON.parse(toolMessage.content);

      // Extract the screenshot if available
      const screenshot = result.screenshot
        ? formatImageForLLM(result.screenshot)
        : null;

      return {
        navigationResult: result,
        currentScreenshot: screenshot,
      };
    } catch (error) {
      console.error("Error parsing tool result:", error);
      return {
        navigationResult: {
          success: false,
          error: "Failed to parse navigation result",
        },
        currentScreenshot: null,
      };
    }
  }

  return {
    navigationResult: { success: false, error: "No navigation occurred" },
    screenshot: null,
  };
};

// Verify Action Node - replaces shouldAnalyzeScreenshot
export const verifyActionNode = async (state: GraphStateType) => {
  const {
    testSteps,
    currentStepIndex,
    currentScreenshot,
    navigationResult,
    actionType,
  } = state;

  // If no steps or all steps completed, return current state
  if (
    !testSteps.length ||
    currentStepIndex < 0 ||
    currentStepIndex >= testSteps.length
  ) {
    console.log(
      "verificationNode: No steps to process or all steps completed."
    );
    return {};
  }

  const currentStep = testSteps[currentStepIndex];

  // For navigation actions
  if (actionType === "navigate") {
    // If navigation didn't succeed or no screenshot available
    if (!navigationResult?.success || !currentScreenshot) {
      console.log("Verification failed: No screenshot or navigation error.");
      // Mark step as failed
      return {
        testSteps: updateTestStepStatus(testSteps, currentStepIndex, "failed"),
        verificationMessage: "Navigation failed or no screenshot available",
        // Allow retry logic to be implemented later
        shouldRetry: true,
      };
    }

    // For successful navigation, we need to verify the content
    try {
      // Analyze screenshot to verify we navigated to the right place
      const multimodalMessage = new HumanMessage({
        content: [
          {
            type: "text",
            text: `Verify if this screenshot shows successful navigation to the website mentioned in: "${currentStep.instruction}"`,
          },
          {
            type: "image_url",
            image_url: { url: currentScreenshot },
          },
        ],
      });

      const systemPrompt = new SystemMessage(
        "You are a test verification specialist. Determine if the screenshot shows " +
          "the expected result of the navigation action. Be strict in your verification."
      );

      // In the verifyActionNode function
      const outputSchema = z.object({
        success: z
          .boolean()
          .describe("Whether the navigation appears successful"),
        confidence: z
          .number()
          .describe("Confidence level in the verification (0-1)"),
        reasoning: z
          .string()
          .describe("Reasoning behind the verification result"),
        visibleElements: z
          .array(z.string())
          .describe("Key elements visible in the screenshot"),
      });

      const model = openAiModel().withStructuredOutput(outputSchema);
      const verification = await model.invoke([
        systemPrompt,
        multimodalMessage,
      ]);

      // Update step status based on verification
      const newStatus =
        verification.success && verification.confidence > 0.7
          ? "passed"
          : "failed";
      const nextStepIndex =
        newStatus === "passed"
          ? currentStepIndex + 1 < testSteps.length
            ? currentStepIndex + 1
            : -1
          : currentStepIndex;

      // If moving to next step, update its status to in_progress
      const updatedSteps = updateTestStepStatus(
        testSteps,
        currentStepIndex,
        newStatus
      );
      const finalSteps =
        nextStepIndex >= 0 &&
        nextStepIndex < testSteps.length &&
        newStatus === "passed"
          ? updateTestStepStatus(updatedSteps, nextStepIndex, "in_progress")
          : updatedSteps;

      console.log("Verification result:", verification);
      console.log("State after verification:", {
        testSteps: finalSteps,
        currentStepIndex: nextStepIndex,
      });

      return {
        testSteps: finalSteps,
        currentStepIndex: nextStepIndex,
        verificationResult: verification,
        verificationMessage: verification.reasoning,
        shouldRetry: newStatus === "failed",
      };
    } catch (error) {
      console.error("Error in verification:", error);
      return {
        testSteps: updateTestStepStatus(testSteps, currentStepIndex, "failed"),
        verificationMessage:
          "Error during verification: " +
          (error instanceof Error ? error.message : "Unknown error"),
        shouldRetry: true,
      };
    }
  }

  // For unsupported actions, we already marked them as failed in the coordinator
  if (actionType === "unsupported") {
    return {
      verificationMessage: "Action type not supported",
      shouldRetry: false,
    };
  }

  return {};
};

// Helper function to update a specific test step's status
const updateTestStepStatus = (
  testSteps: GraphStateType["testSteps"],
  stepIndex: number,
  status: "not_started" | "in_progress" | "passed" | "failed"
) => {
  return testSteps.map((step, index) => {
    if (index === stepIndex) {
      return { ...step, status };
    }
    return step;
  });
};

// Helper to extract URLs from instructions
function extractUrlFromInstruction(instruction: string): string {
  // Simple regex to extract URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = instruction.match(urlRegex);

  if (matches && matches.length > 0) {
    return matches[0];
  }

  // If no URL found, try to extract domain names
  const domainRegex = /\b([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}\b/gi;
  const domainMatches = instruction.match(domainRegex);

  if (domainMatches && domainMatches.length > 0) {
    // Add https:// if missing
    return domainMatches[0].includes("://")
      ? domainMatches[0]
      : `https://${domainMatches[0]}`;
  }

  return "";
}
