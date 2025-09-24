import { GraphStateType } from "../graph/graph";

export const shouldContinueEdge = (state: GraphStateType) => {
  if (state.isComplete === false) {
    return "tools";
  }

  return "end";
};

export const shouldGenerateReport = (state: GraphStateType) => {
  // Skip report generation if noReport flag is set
  if (state.noReport === true) {
    return "end";
  }
  
  if (state.isComplete === true) {
    return "report";
  }

  return "end";
};


export const shouldGeneratePlaywrightScript = (state: GraphStateType): "playwrightScript" | "report" | "end" => {
  if (state.generatePlaywright && state.isComplete && !state.lastError && state.sessionId) {
    return "playwrightScript";
  }

  // If we're not generating Playwright scripts, proceed to report generation check
  if (state.noReport) {
    return "end";
  }

  if (state.isComplete || state.lastError) {
    return "report";
  }

  return "end";
};