export { BrowserService } from "./BrowserService";
export { SessionManager } from "./SessionManager";

export {
  navigate,
  getVisibleElements,
  getCurrentUrl,
  wait,
  reload,
  goBack,
  goForward,
  markVisibleElements,
  removeElementMarkers,
} from "./actions/navigate";

export {
  click,
  type,
  clear,
  scrollToNextChunk,
  scrollToPrevChunk,
  scrollBy,
  setCursorVisibility,
} from "./actions/interact";
