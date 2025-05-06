import { convertElementsToXml } from "../common/utils/xml-formatter";

/**
 * Example showing how the XML formatter works with element data
 */
function demonstrateXmlFormatter() {
  // Sample element data (similar to what would come from markVisibleElements)
  const elements = [
    {
      labelNumber: "1",
      coordinates: { x: 640, y: 570 }
    },
    {
      labelNumber: "2",
      coordinates: { x: 1185, y: 690 }
    },
    {
      labelNumber: "3",
      coordinates: { x: 640, y: 661 }
    }
  ];
  
  console.log("Original JSON data:");
  console.log(JSON.stringify(elements, null, 2));
  
  console.log("\nConverted to XML format:");
  const xmlOutput = convertElementsToXml(elements);
  console.log(xmlOutput);
  
  console.log("\nThis XML format is easier for LLMs to understand because:");
  console.log("1. It has a clear hierarchical structure");
  console.log("2. The 'label' attribute directly corresponds to the visual markers");
  console.log("3. Coordinates are presented as simple x,y attributes");
  console.log("4. It avoids nested JSON objects which can be harder to parse");
}

// Run the example
demonstrateXmlFormatter();
