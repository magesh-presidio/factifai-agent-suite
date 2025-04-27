import { InteractionTools } from "./InteractionTools";
import { NavigationTools } from "./NavigationTools";

export const ALL_TOOLS = [...NavigationTools.getTools(), ...InteractionTools.getTools()];