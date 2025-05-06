/**
 * Utility functions for XML formatting
 */

/**
 * Converts an array of element objects to XML format
 * @param elements Array of elements with labelNumber and coordinates properties
 * @returns XML string representation of the elements
 */
export function convertElementsToXml(elements: Array<{ labelNumber: string; coordinates: { x: number; y: number } }>): string {
  if (!elements || elements.length === 0) {
    return "<elements></elements>";
  }
  
  const elementTags = elements.map(element => 
    `  <element label="${element.labelNumber}" x="${element.coordinates.x}" y="${element.coordinates.y}" />`
  );
  
  return `<elements>\n${elementTags.join('\n')}\n</elements>`;
}
