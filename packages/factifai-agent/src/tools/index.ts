import { InteractionTools } from "./interaction-tools";
import { NavigationTools } from "./navigation-tools";

export const ALL_TOOLS = [...NavigationTools.getTools(), ...InteractionTools.getTools()];