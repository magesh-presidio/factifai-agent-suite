// Export core services
export { BrowserService } from "./BrowserService";
export { SessionManager } from "./SessionManager";

// Export action modules
export {
  navigate,
  getVisibleElements,
  getCurrentUrl,
} from "./actions/navigate";
export { click, type } from "./actions/interact";
