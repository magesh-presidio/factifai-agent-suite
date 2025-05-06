export interface IClickableElement {
  type: string;
  tagName: string;
  text?: string;
  placeholder?: string;
  coordinate: {
    x: number;
    y: number;
  };
  attributes: Record<string, string>;
  isVisibleInCurrentViewPort: boolean;
  isVisuallyVisible: boolean;
}

export interface BrowserInferenceData {
  image: string;
  inference: IClickableElement[];
  scrollPosition: number;
  totalScroll: number;
  originalImage: string;
}

export type Coordinates = { x: number; y: number };

/**
 * Element information with coordinates
 */
export interface VisibleElement {
  tagName: string;
  id?: string;
  className?: string;
  trimmedText?: string;
  coords: { x: number; y: number };
}
