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

export type Vertex = Point3D;

export interface VertexLW {
  position: PointF;
  bulge: number;
}

export interface DrawColor {
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
  color: DrawColor;
  isVisible: boolean;
  layerName?: string;
  infoText?: string;
}

export interface DrawCircle extends BaseElement {
  kind: 'circle';
  center: Point3D;
  radius: number;
  thickness: number;
}

export interface DrawLine extends BaseElement {
  kind: 'line';
  startPoint: Point3D;
  endPoint: Point3D;
}

export interface DrawArc extends BaseElement {
  kind: 'arc';
  center: Point3D;
  radius: number;
  thickness: number;
  startAngle: number;
  endAngle: number;
  isClockwise: boolean;
  startPoint: Point3D;
  endPoint: Point3D;
}

export interface DrawPolyline extends BaseElement {
  kind: 'polyline';
  isClosed: boolean;
  vertexes: Vertex[];
}

export interface DrawText extends BaseElement {
  kind: 'text';
  font: string;
  fontSize: number;
  text: string;
  startPoint: Point3D;
}

export type DrawShape = DrawCircle | DrawLine | DrawArc | DrawPolyline | DrawText;

export interface DrawingModel {
  fileName: string;
  bounds: Bounds;
  circles: DrawCircle[];
  lines: DrawLine[];
  arcs: DrawArc[];
  polylines: DrawPolyline[];
  texts: DrawText[];
}
