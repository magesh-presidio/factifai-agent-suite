import { writeFileSync } from "fs";
import { browserAutomationGraph } from "../../core/graph/graph";

const saveGraphImage = async () => {
  try {
    // Generate the graph visualization
    const drawableGraph = await browserAutomationGraph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();

    // Specify the file path where you want to save the image
    const filePath = "./factifai-agent-graph.png";

    // Write the image data to the specified file
    writeFileSync(filePath, new Uint8Array(arrayBuffer));

    console.log(`Graph image saved successfully to ${filePath}`);
  } catch (error) {
    console.error("Error saving the graph image:", error);
  }
};

saveGraphImage();