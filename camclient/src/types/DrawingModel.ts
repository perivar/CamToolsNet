export interface PointF {
  isEmpty?: boolean;
  x: number;
  y: number;
}

export interface Bounds {
  min: PointF;
  max: PointF;
}

export interface Point3D {
  pointF: PointF;
  isEmpty: boolean;
  x: number;
  y: number;
  z: number;
}

export interface Vertex {
  pointF: PointF;
  isEmpty: boolean;
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
  isKnownColor: boolean;
  isEmpty: boolean;
  isNamedColor: boolean;
  isSystemColor: boolean;
  name: string;
}

export interface BaseElement {
  codeName?: string;
  color: Color;
  isVisible: boolean;
  layerName?: string;
}

export interface Circle extends BaseElement {
  center: Point3D;
  radius: number;
  thickness: number;
}

export interface Line extends BaseElement {
  startPoint: Point3D;
  endPoint: Point3D;
}

export interface Arc extends BaseElement {
  center: Point3D;
  radius: number;
  thickness: number;
  startAngle: number;
  endAngle: number;
}

export interface Polyline extends BaseElement {
  isClosed: boolean;
  vertexes: Vertex[];
}

export interface DrawingModel {
  fileName: string;
  circles: Circle[];
  lines: Line[];
  arcs: Arc[];
  polylines: Polyline[];
  polylinesLW: any[];
}
