import React from 'react';
import './DrawingCanvas.scss';
import {
  Bounds,
  PointF,
  DrawingModel,
  DrawCircle,
  DrawLine,
  DrawArc,
  DrawPolyline,
  DrawShape,
  DrawText
} from '../types/DrawingModel';

interface IDrawingCanvasProps {
  drawModel: DrawingModel;
  showArrows: boolean;
  showInfo: boolean;
  xSplit: number;
}

const { PI } = Math;
const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;
// const RAD_TO_DEG = 180 / Math.PI;

const round2TwoDecimal = (number: number): number => {
  return Math.round((number + Number.EPSILON) * 100) / 100;
};

const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x2 - x1, y2 - y1);
};

const measureFontHeight = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  p: DrawText
): {
  height: number;
  firstPixel: number;
  lastPixel: number;
} => {
  const sourceWidth = canvas.width;
  const sourceHeight = canvas.height;

  // place the text
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText(p.text, p.startPoint.x, p.startPoint.y);

  // returns an array containing the sum of all pixels in a canvas
  // * 4 (red, green, blue, alpha)
  // [pixel1Red, pixel1Green, pixel1Blue, pixel1Alpha, pixel2Red ...]
  const { data } = context.getImageData(p.startPoint.x, p.startPoint.y, sourceWidth, sourceHeight);

  let firstY = -1;
  let lastY = -1;

  // loop through each row
  for (let y = 0; y < sourceHeight; y++) {
    // loop through each column
    for (let x = 0; x < sourceWidth; x++) {
      // let red = data[((sourceWidth * y) + x) * 4];
      // let green = data[((sourceWidth * y) + x) * 4 + 1];
      // let blue = data[((sourceWidth * y) + x) * 4 + 2];
      const alpha = data[(sourceWidth * y + x) * 4 + 3];

      if (alpha > 0) {
        firstY = y;
        // exit the loop
        break;
      }
    }
    if (firstY >= 0) {
      // exit the loop
      break;
    }
  }

  // loop through each row, this time beginning from the last row
  for (let y = sourceHeight; y > 0; y--) {
    // loop through each column
    for (let x = 0; x < sourceWidth; x++) {
      const alpha = data[(sourceWidth * y + x) * 4 + 3];
      if (alpha > 0) {
        lastY = y;
        // exit the loop
        break;
      }
    }
    if (lastY >= 0) {
      // exit the loop
      break;
    }
  }

  return {
    // The actual height
    height: lastY - firstY,

    // The first pixel
    firstPixel: firstY,

    // The last pixel
    lastPixel: lastY
  };
};

const measureText = (
  p: DrawText
): {
  height: number;
  width: number;
} => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // set some approx initial values
  let textWidth = (p.fontSize / 2) * p.text.length;
  let textHeight = p.fontSize;

  if (context) {
    context.font = `${p.fontSize}px ${p.font}`;
    const metrics = context.measureText(p.text);
    textWidth = metrics.width;

    const fontHeight = measureFontHeight(canvas, context, p);
    textHeight = fontHeight.height;
  }
  return { height: textHeight, width: textWidth };
};

// https://stackoverflow.com/a/35977476/461048
const getQuadrant = (_angle: number) => {
  const angle = _angle % TWO_PI;

  if (angle >= 0.0 && angle < HALF_PI) return 0;
  if (angle >= HALF_PI && angle < PI) return 1;
  if (angle >= PI && angle < PI + HALF_PI) return 2;
  return 3;
};

const getArcBoundingBox = (ini: number, end: number, radius: number, margin = 0) => {
  const iniQuad = getQuadrant(ini);
  const endQuad = getQuadrant(end);

  const ix = Math.cos(ini) * radius;
  const iy = Math.sin(ini) * radius;
  const ex = Math.cos(end) * radius;
  const ey = Math.sin(end) * radius;

  const minX = Math.min(ix, ex);
  const minY = Math.min(iy, ey);
  const maxX = Math.max(ix, ex);
  const maxY = Math.max(iy, ey);

  const r = radius;
  const xMax = [
    [maxX, r, r, r],
    [maxX, maxX, r, r],
    [maxX, maxX, maxX, r],
    [maxX, maxX, maxX, maxX]
  ];
  const yMax = [
    [maxY, maxY, maxY, maxY],
    [r, maxY, r, r],
    [r, maxY, maxY, r],
    [r, maxY, maxY, maxY]
  ];
  const xMin = [
    [minX, -r, minX, minX],
    [minX, minX, minX, minX],
    [-r, -r, minX, -r],
    [-r, -r, minX, minX]
  ];
  const yMin = [
    [minY, -r, -r, minY],
    [minY, minY, -r, minY],
    [minY, minY, minY, minY],
    [-r, -r, -r, minY]
  ];

  const x1 = xMin[endQuad][iniQuad];
  const y1 = yMin[endQuad][iniQuad];
  const x2 = xMax[endQuad][iniQuad];
  const y2 = yMax[endQuad][iniQuad];

  const x = x1 - margin;
  const y = y1 - margin;
  const w = x2 - x1 + margin * 2;
  const h = y2 - y1 + margin * 2;

  return { x, y, w, h };
};

const fillTextFlipped = (
  context: CanvasRenderingContext2D,
  canvasHeight: number,
  text: string,
  startX: number,
  startY: number,
  font: string,
  fontSize: number,
  lineColor: string
) => {
  // draw text
  // (need to flip y axis back first)
  context.save();
  context.scale(1, -1); // flip back
  context.translate(0, -canvasHeight); // and translate so that we draw the text the right way up
  context.font = `${fontSize}px ${font}`;
  context.fillStyle = `${lineColor}`;
  context.fillText(`${text}`, startX, canvasHeight - startY);
  context.restore();
};

const drawArrowHead = (
  context: CanvasRenderingContext2D,
  endX: number,
  endY: number,
  angle: number,
  arrowLen: number,
  lineColor: string,
  lineWidth: number
) => {
  // draw arrow head as filled triangle
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - arrowLen * Math.cos(angle - Math.PI / 6), endY - arrowLen * Math.sin(angle - Math.PI / 6));
  context.lineTo(endX - arrowLen * Math.cos(angle + Math.PI / 6), endY - arrowLen * Math.sin(angle + Math.PI / 6));
  context.lineTo(endX, endY);
  context.closePath();

  context.lineWidth = lineWidth;
  context.strokeStyle = lineColor;
  context.stroke();

  context.fillStyle = lineColor;
  context.fill();
};

// x0,y0: the line's starting point
// x1,y1: the line's ending point
// width: the distance the arrowhead perpendicularly extends away from the line
// height: the distance the arrowhead extends backward from the endpoint
// arrowStart: true/false directing to draw arrowhead at the line's starting point
// arrowEnd: true/false directing to draw arrowhead at the line's ending point
// Usage:
// drawLineWithArrows(50, 50, 150, 50, 5, 8, true, true);
const drawLineWithArrows = (
  context: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  aWidth: number,
  aLength: number,
  arrowStart: boolean,
  arrowEnd: boolean
) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  context.save();
  context.translate(x0, y0);
  context.rotate(angle);
  context.beginPath();

  // line
  context.moveTo(0, 0);
  context.lineTo(length, 0);

  if (arrowStart) {
    context.moveTo(aLength, -aWidth);
    context.lineTo(0, 0);
    context.lineTo(aLength, aWidth);
  }
  if (arrowEnd) {
    context.moveTo(length - aLength, -aWidth);
    context.lineTo(length, 0);
    context.lineTo(length - aLength, aWidth);
  }

  context.stroke();
  context.restore();
};

const drawGrid = (
  context: CanvasRenderingContext2D,
  canvasHeight: number,
  gridPixelSize: number,
  colorAxis: string,
  colorGrid: string,
  gap: number,
  width: number,
  height: number
) => {
  context.strokeStyle = colorGrid;

  // horizontal grid lines
  for (let i = 0; i <= height; i += gridPixelSize) {
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(width, i);
    if (i % gap === 0) {
      context.lineWidth = 0.8;
    } else {
      context.lineWidth = 0.3;
    }

    // draw label
    fillTextFlipped(context, canvasHeight, `${i}`, 0 - 4, i - 0.5, 'sans-serif', 2, colorGrid);

    context.closePath();
    context.stroke();
  }

  // vertical grid lines
  for (let j = 0; j <= width; j += gridPixelSize) {
    context.beginPath();
    context.moveTo(j, 0);
    context.lineTo(j, height);
    if (j % gap === 0) {
      context.lineWidth = 0.8;
    } else {
      context.lineWidth = 0.3;
    }

    // draw label
    fillTextFlipped(context, canvasHeight, `${j}`, j - 1, -3, 'sans-serif', 2, colorGrid);

    context.closePath();
    context.stroke();
  }

  context.lineWidth = 0.5;
  context.strokeStyle = colorAxis;
};

const drawCircle = (
  context: CanvasRenderingContext2D,
  circle: DrawCircle,
  canvasHeight: number,
  showInfo = false,
  lineColor: string,
  lineWidth: number
) => {
  const startAngle = 0;
  const endAngle = 2 * Math.PI;
  const { x } = circle.center;
  const { y } = circle.center;
  const { radius } = circle;

  context.beginPath(); // begin
  context.moveTo(x + radius, y);
  context.arc(x, y, radius, startAngle, endAngle, false);
  context.closePath(); // end

  if (showInfo) {
    // draw diameter and center (need to flip y axis back first)
    context.fillRect(x - lineWidth / 2, y - lineWidth / 2, lineWidth, lineWidth); // fill in the center pixel

    const dia = round2TwoDecimal(radius * 2);
    fillTextFlipped(context, canvasHeight, `${dia}`, x + 1, y + radius + 1, 'sans-serif', 2, lineColor);
  }

  context.lineWidth = lineWidth;
  context.strokeStyle = lineColor;
  context.stroke();
};

const drawArc = (
  context: CanvasRenderingContext2D,
  arc: DrawArc,
  showArrows: boolean,
  arrowLen: number,
  showInfo = false,
  lineColor: string,
  lineWidth: number
) => {
  const centerX = arc.center.x;
  const centerY = arc.center.y;
  const { radius } = arc;
  const { startAngle } = arc;
  const { endAngle } = arc;

  const isCounterClockwise = arc.isClockwise; // since we are flipping the axis, we need to invert the clockwise as well

  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;
  if (isCounterClockwise) {
    endX = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
    endY = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
    startX = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
    startY = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
  } else {
    startX = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
    startY = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
    endX = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
    endY = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
  }

  // don't draw if the start end points for x and y are the same
  // likely a z only move
  if (startX !== endX || startY !== endY) {
    const dx = endX - centerX;
    const dy = endY - centerY;

    let arrowAngle = 0;
    let sAngle = 0;
    let eAngle = 0;
    if (isCounterClockwise) {
      arrowAngle = Math.atan2(dy, dx) - Math.PI / 2; // counter clockwise
      sAngle = (endAngle * Math.PI) / 180;
      eAngle = (startAngle * Math.PI) / 180;
    } else {
      arrowAngle = Math.atan2(dy, dx) + Math.PI / 2; // clockwise
      sAngle = (startAngle * Math.PI) / 180;
      eAngle = (endAngle * Math.PI) / 180;
    }

    // draw arrow head
    if (showArrows) drawArrowHead(context, endX, endY, arrowAngle, arrowLen, lineColor, lineWidth);

    // draw arc
    context.beginPath(); // begin
    context.moveTo(startX, startY);
    context.arc(centerX, centerY, radius, sAngle, eAngle, isCounterClockwise);
    context.moveTo(endX, endY);
    context.closePath(); // end

    if (showInfo) {
      context.fillRect(centerX - lineWidth / 2, centerY - lineWidth / 2, lineWidth, lineWidth); // fill in the center pixel
    }

    context.lineWidth = lineWidth;
    context.strokeStyle = lineColor;
    context.stroke();
  }
};

const drawSingleLine = (
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  showArrows: boolean,
  arrowLen: number,
  lineColor: string,
  lineWidth: number
) => {
  // don't draw if the start end points for x and y are the same
  // likely a z only move
  if (startX !== endX || startY !== endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);

    // draw arrow head
    if (showArrows) drawArrowHead(context, endX, endY, angle, arrowLen, lineColor, lineWidth);

    // draw line
    context.beginPath(); // begin
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.closePath(); // end

    context.lineWidth = lineWidth;
    context.strokeStyle = lineColor;
    context.stroke();
  }
};

const drawLine = (
  context: CanvasRenderingContext2D,
  line: DrawLine,
  showArrows: boolean,
  arrowLen: number,
  lineColor: string,
  lineWidth: number
) => {
  const startX = line.startPoint.x;
  const startY = line.startPoint.y;
  const endX = line.endPoint.x;
  const endY = line.endPoint.y;

  drawSingleLine(context, startX, startY, endX, endY, showArrows, arrowLen, lineColor, lineWidth);
};

const drawPolyline = (
  context: CanvasRenderingContext2D,
  p: DrawPolyline,
  showArrows: boolean,
  arrowLen: number,
  lineColor: string,
  lineWidth: number
) => {
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  for (let i = 0; i < p.vertexes.length; i++) {
    const vertex = p.vertexes[i];
    const posX = vertex.x;
    const posY = vertex.y;

    if (i === 0) {
      startX = posX;
      startY = posY;
    } else {
      endX = posX;
      endY = posY;

      drawSingleLine(context, startX, startY, endX, endY, showArrows, arrowLen, lineColor, lineWidth);

      // store new start pos
      startX = posX;
      startY = posY;
    }
  }
};

const drawText = (
  context: CanvasRenderingContext2D,
  drawText: DrawText,
  canvasHeight: number,
  showInfo = false,
  lineColor: string,
  lineWidth: number
) => {
  const startX = drawText.startPoint.x;
  const startY = drawText.startPoint.y;
  const { font } = drawText;
  const { fontSize } = drawText;
  const { text } = drawText;

  // draw text
  // (need to flip y axis back first)
  context.save();
  context.scale(1, -1); // flip back
  context.translate(0, -canvasHeight); // and translate so that we draw the text the right way up

  context.lineWidth = lineWidth;
  context.font = `${fontSize}px ${font}`;
  context.fillStyle = `${lineColor}`;
  context.fillText(`${text}`, startX, canvasHeight - startY);

  context.restore();

  // if (showInfo) {
  // }
};

const defineIrregularPath = (context: CanvasRenderingContext2D, shape: DrawShape) => {
  let points: PointF[] = [{ x: 0, y: 0 }];
  if (shape.kind === 'polyline') {
    points = shape.vertexes;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    context.lineTo(points[i].x, points[i].y);
  }
  // make sure to close the path since we are using isPointInPath as hit detection
  // this is never drawn so a closed path is only used for hit detection
  context.closePath();
};

const isOnLine = (xp: number, yp: number, x1: number, y1: number, x2: number, y2: number, maxDistance: number) => {
  // https://stackoverflow.com/questions/34474336/decide-if-a-point-is-on-or-close-enough-to-a-line-segment
  const dxL = x2 - x1;
  const dyL = y2 - y1; // line: vector from (x1,y1) to (x2,y2)
  const dxP = xp - x1;
  const dyP = yp - y1; // point: vector from (x1,y1) to (xp,yp)

  const squareLen = dxL * dxL + dyL * dyL; // squared length of line
  const dotProd = dxP * dxL + dyP * dyL; // squared distance of point from (x1,y1) along line
  const crossProd = dyP * dxL - dxP * dyL; // area of parallelogram defined by line and point

  // perpendicular distance of point from line
  const dist = Math.abs(crossProd) / Math.sqrt(squareLen);

  return dist <= maxDistance && dotProd >= 0 && dotProd <= squareLen;
};

// given mouse X & Y (mx & my) and shape object
// return true/false whether mouse is inside the shape
// https://riptutorial.com/html5-canvas/example/18919/dragging-irregular-shapes-around-the-canvas
const isMouseInShape = (context: CanvasRenderingContext2D, mx: number, my: number, shape: DrawShape) => {
  const lineWidthTreshold = 3;

  if (shape.kind === 'circle') {
    const circle = shape as DrawCircle;
    const dx = mx - circle.center.x;
    const dy = my - circle.center.y;
    // math test to see if mouse is inside circle
    if (dx * dx + dy * dy < circle.radius * circle.radius) {
      // yes, mouse is inside this circle
      return true;
    }
  } else if (shape.kind === 'arc') {
    const a = shape as DrawArc;
    drawArc(context, a, false, 0, false, '', lineWidthTreshold);

    // Then hit-test with isPointInStroke
    if (context.isPointInStroke(mx, my)) {
      return true;
    }
  } else if (shape.kind === 'line') {
    const line = shape as DrawLine;

    // hit test line with threshold
    // return isOnLine(mx, my, line.startPoint.x, line.startPoint.y, line.endPoint.x, line.endPoint.y, lineWidthTreshold);

    drawLine(context, line, false, 0, '', lineWidthTreshold);
    // Then hit-test with isPointInStroke
    if (context.isPointInStroke(mx, my)) {
      return true;
    }
  } else if (shape.kind === 'polyline') {
    // First redefine the path again (no need to stroke/fill!)
    defineIrregularPath(context, shape);

    // isPointInPath hits inside shapes, which makes it weird when this is a border
    // therefore hit-test with isPointInStroke
    // if (context.isPointInPath(mx, my)) {
    if (context.isPointInStroke(mx, my)) {
      return true;
    }
  }
  // the mouse isn't in any of the shapes
  return false;
};

export default class DrawingCanvas extends React.PureComponent<IDrawingCanvasProps> {
  // instance variables
  private bounds: Bounds = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
  private translatePos: PointF = { x: 0, y: 0 };

  private scale: number;
  private startDragOffset: PointF = { x: 0, y: 0 };
  private mouseDown: boolean;
  private currentMousePos: PointF = { x: 0, y: 0 };

  private originTransform = new DOMMatrix();
  private inverseOriginTransform = new DOMMatrix();

  // get on-screen canvas
  private canvasDivRef: React.RefObject<HTMLDivElement>;
  private canvasRef: React.RefObject<HTMLCanvasElement>;
  private canvasDiv: HTMLDivElement | null;
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null;

  private canvasWidth: number;
  private canvasHeight: number;

  // save all shapes in an array
  private shapes: DrawShape[] = [];
  private selectedShapeIndex: number;
  private selectedShapeInfo: string;

  constructor(props: IDrawingCanvasProps) {
    super(props);
    this.canvasDivRef = React.createRef<HTMLDivElement>();
    this.canvasRef = React.createRef<HTMLCanvasElement>();

    this.scale = 1.0;
    this.startDragOffset = { x: 0, y: 0 };
    this.mouseDown = false;
    this.canvasWidth = 0;
    this.canvasHeight = 0;

    this.canvasDiv = null;
    this.canvas = null;
    this.ctx = null;

    this.currentMousePos = { x: 0, y: 0 };
    this.selectedShapeIndex = -1;
    this.selectedShapeInfo = '';
  }

  componentDidMount() {
    if (this.canvasDivRef.current) {
      this.canvasDiv = this.canvasDivRef.current;
    }
    if (this.canvasRef.current) {
      this.canvas = this.canvasRef.current;
    }
    if (this.canvas && this.canvasDiv) {
      this.ctx = this.canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;

      // get current size of the canvas
      // console.log(`canvas div width: ${this.canvasDiv.clientWidth}`);
      // console.log(`canvas div height: ${this.canvasDiv.clientHeight}`);
      this.setCanvasSize();

      // init instance variables
      this.translatePos = {
        x: this.canvasWidth / 2,
        y: this.canvasHeight / 2
      };

      this.bounds = this.calculateBounds();
      this.zoomToFit();
      this.draw(this.scale, this.translatePos);
    }

    // event handler to resize the canvas when the document view is changed
    window.addEventListener('resize', () => {
      // get current size of the canvas
      // console.log(`resize canvas div width: ${this.canvasDiv.clientWidth}`);
      // console.log(`resize canvas div height: ${this.canvasDiv.clientHeight}`);

      this.setCanvasSize();
      this.zoomToFit();
      this.draw(this.scale, this.translatePos);

      return false;
    });
  }

  componentDidUpdate(prevProps: IDrawingCanvasProps) {
    if (prevProps.showArrows !== this.props.showArrows) {
      this.draw(this.scale, this.translatePos);
    }
    if (prevProps.showInfo !== this.props.showInfo) {
      this.draw(this.scale, this.translatePos);
    }
    if (prevProps.xSplit !== this.props.xSplit) {
      this.draw(this.scale, this.translatePos);
    }
    if (prevProps.drawModel !== this.props.drawModel) {
      if (this.canvas && this.canvasDiv) {
        this.ctx = this.canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;

        // get current size of the canvas
        // console.log(`canvas div width: ${this.canvasDiv.clientWidth}`);
        // console.log(`canvas div height: ${this.canvasDiv.clientHeight}`);
        this.setCanvasSize();

        // init instance variables
        this.translatePos = {
          x: this.canvasWidth / 2,
          y: this.canvasHeight / 2
        };

        this.bounds = this.calculateBounds();
        this.zoomToFit();
        this.draw(this.scale, this.translatePos);
      }
    }
  }

  private setCanvasSize = () => {
    if (this.canvas && this.canvasDiv) {
      this.canvasWidth = this.canvasDiv.clientWidth;
      this.canvasHeight = this.canvasDiv.clientHeight;

      // increase the actual size of our canvas
      this.canvas.width = this.canvasWidth * devicePixelRatio;
      this.canvas.height = this.canvasHeight * devicePixelRatio;
      this.canvas.style.width = `${this.canvasWidth}px`;
      this.canvas.style.height = `${this.canvasHeight}px`;
    }
  };

  private onMouseDown = (evt: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    this.mouseDown = true;
    this.startDragOffset.x = evt.clientX - this.translatePos.x;
    this.startDragOffset.y = evt.clientY - this.translatePos.y;
  };

  private OnMouseFinished = () => {
    this.mouseDown = false;
  };

  private onMouseMove = (evt: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    this.currentMousePos = this.getTransformRelativeMousePosition(evt);

    if (this.mouseDown) {
      this.translatePos.x = evt.clientX - this.startDragOffset.x;
      this.translatePos.y = evt.clientY - this.startDragOffset.y;
      this.draw(this.scale, this.translatePos);
      return;
    }

    if (this.ctx) {
      // test mouse position against all shapes
      this.selectedShapeIndex = -1;
      this.selectedShapeInfo = '';
      for (let i = 0; i < this.shapes.length; i++) {
        if (isMouseInShape(this.ctx, this.currentMousePos.x, this.currentMousePos.y, this.shapes[i])) {
          // the mouse is inside this shape
          // select this shape
          this.selectedShapeIndex = i;

          // and redraw?
          // this.draw(this.scale, this.translatePos);

          // and return (= stop looking for further shapes under the mouse)
          break;
        }
      }

      // always redraw (can take a lot of processor power?)
      this.draw(this.scale, this.translatePos);
    }
  };

  private setZoomAndOffsetTransform = () => {
    this.originTransform = new DOMMatrix();
    this.originTransform.translateSelf(this.translatePos.x * devicePixelRatio, this.translatePos.y * devicePixelRatio);
    // do '-scale' as second argument to flip around the y axis
    this.originTransform.scaleSelf(this.scale * devicePixelRatio, -this.scale * devicePixelRatio);
    this.inverseOriginTransform = this.originTransform.inverse();
  };

  private getElementRelativeMousePosition = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    return [e.nativeEvent.offsetX, e.nativeEvent.offsetY];
  };

  private getCanvasRelativeMousePosition = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const pos = this.getElementRelativeMousePosition(e);
    if (this.canvas) {
      pos[0] = (pos[0] * this.canvas.width) / this.canvas.clientWidth;
      pos[1] = (pos[1] * this.canvas.height) / this.canvas.clientHeight;
    }
    return pos;
  };

  private getTransformRelativeMousePosition = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): PointF => {
    const pos = this.getCanvasRelativeMousePosition(e);
    const p = new DOMPoint(...pos);
    const point = this.inverseOriginTransform.transformPoint(p);
    return { x: point.x, y: point.y };
  };

  private handleMouseScroll = (evt: React.WheelEvent<HTMLCanvasElement>) => {
    // e is the mouse wheel event
    const x = evt.nativeEvent.offsetX;
    const y = evt.nativeEvent.offsetY;

    // use deltaY instead of wheelData. Note deltaY has the opposite value of wheelData
    let amount = 0.999 ** evt.deltaY;

    let zoom = this.scale;
    zoom *= amount;
    if (zoom > 30) zoom = 30;
    if (zoom < 0.5) zoom = 0.5;
    amount = zoom / this.scale;
    this.scale = zoom;

    // move the origin
    this.translatePos.x = x - (x - this.translatePos.x) * amount;
    this.translatePos.y = y - (y - this.translatePos.y) * amount;

    this.draw(this.scale, this.translatePos);
  };

  private zoomToFit = () => {
    if (this.bounds.max.x > 1000 || this.bounds.min.x < -100) {
      // likely something wrong with the bounds calculation
      // ignore
      return;
    }

    // add 40 to try to zoom in a little less
    const dataWidth = 40 + this.bounds.max.x - this.bounds.min.x;
    const dataHeight = 40 + this.bounds.max.y - this.bounds.min.y;

    const scaleY = this.canvasHeight / dataHeight;
    const scaleX = this.canvasWidth / dataWidth;
    this.scale = Math.min(scaleX, scaleY);

    // move the origin
    // add and subtract 20 to pan more in the middle
    this.translatePos.x = 20 + this.canvasWidth / 2 - (dataWidth / 2 + this.bounds.min.x) * this.scale;
    // offset with 'canvasHeight -¨' since we are flipping around y axis
    this.translatePos.y =
      -20 + this.canvasHeight - (this.canvasHeight / 2 - (dataHeight / 2 + this.bounds.min.y) * this.scale);
  };

  private calculateBounds = (): Bounds => {
    let maxX = -1000000;
    let maxY = -1000000;
    let minX = 1000000;
    let minY = 1000000;
    let curX = 0;
    let curY = 0;

    // reset shapes
    this.shapes = [];
    this.selectedShapeIndex = -1;
    this.selectedShapeInfo = '';

    this.props.drawModel.circles.forEach((circle: DrawCircle) => {
      if (circle.isVisible) {
        const { x } = circle.center;
        const { y } = circle.center;
        const { radius } = circle;

        curX = x + radius;
        curY = y + radius;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        curX = x - radius;
        curY = y - radius;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        circle.kind = 'circle';
        circle.infoText = `Circle: Center: [${round2TwoDecimal(x)} , ${round2TwoDecimal(
          y
        )}] , Radius: ${round2TwoDecimal(radius)}`;
        this.shapes.push(circle);
      }
    });

    this.props.drawModel.lines.forEach((line: DrawLine) => {
      const startX = line.startPoint.x;
      const startY = line.startPoint.y;
      const endX = line.endPoint.x;
      const endY = line.endPoint.y;

      if (line.isVisible) {
        curX = startX;
        curY = startY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        curX = endX;
        curY = endY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
      }

      // include non visible lines (rapid moves)
      line.kind = 'line';
      line.infoText = `Line: [${round2TwoDecimal(startX)} , ${round2TwoDecimal(startY)}] → [${round2TwoDecimal(
        endX
      )} , ${round2TwoDecimal(endY)}] , Length: ${round2TwoDecimal(distance(startX, startY, endX, endY))}`;
      this.shapes.push(line);
    });

    this.props.drawModel.arcs.forEach((a: DrawArc) => {
      if (a.isVisible) {
        const centerX = a.center.x;
        const centerY = a.center.y;
        const { radius } = a;
        const { startAngle } = a;
        const { endAngle } = a;

        const box = getArcBoundingBox(startAngle * DEG_TO_RAD, endAngle * DEG_TO_RAD, radius);
        const startX = box.x + centerX;
        const startY = box.y + centerY;
        const endX = box.x + centerX + box.w;
        const endY = box.y + centerY + box.h;

        curX = startX;
        curY = startY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        curX = endX;
        curY = endY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        // cannot include center since the center can be way outside the image for some arcs
        // curX = centerX;
        // curY = centerY;
        // maxX = curX > maxX ? curX : maxX;
        // minX = curX < minX ? curX : minX;
        // maxY = curY > maxY ? curY : maxY;
        // minY = curY < minY ? curY : minY;

        a.kind = 'arc';
        a.infoText = `Arc: [${round2TwoDecimal(a.startPoint.x)} : ${round2TwoDecimal(
          a.startPoint.y
        )}] → [${round2TwoDecimal(a.endPoint.x)} , ${round2TwoDecimal(a.endPoint.y)}] , Center: [${round2TwoDecimal(
          centerX
        )} , ${round2TwoDecimal(centerY)}], Radius: ${round2TwoDecimal(radius)}, CW: ${a.isClockwise}`;
        this.shapes.push(a);
      }
    });

    this.props.drawModel.polylines.forEach((p: DrawPolyline) => {
      if (p.isVisible && p.vertexes.length >= 2) {
        for (let i = 0; i < p.vertexes.length; i++) {
          const vertex = p.vertexes[i];
          const pointX = vertex.x;
          const pointY = vertex.y;

          curX = pointX;
          curY = pointY;
          maxX = curX > maxX ? curX : maxX;
          minX = curX < minX ? curX : minX;
          maxY = curY > maxY ? curY : maxY;
          minY = curY < minY ? curY : minY;
        }

        p.kind = 'polyline';
        const firstPoint = p.vertexes[0];
        const lastPoint = p.vertexes[p.vertexes.length - 1];
        p.infoText = `Polyline: [${round2TwoDecimal(firstPoint.x)} , ${round2TwoDecimal(
          firstPoint.y
        )}] → [${round2TwoDecimal(lastPoint.x)} , ${round2TwoDecimal(lastPoint.y)}]`;
        this.shapes.push(p);
      }
    });

    this.props.drawModel.texts.forEach((p: DrawText) => {
      const { startPoint } = p;
      const startX = startPoint.x;
      const startY = startPoint.y;

      const m = measureText(p);
      const textWidth = m.width;
      const textHeight = m.height;

      const endX = startPoint.x + textWidth;
      const endY = startPoint.y + textHeight;

      curX = startX;
      curY = startY;
      maxX = curX > maxX ? curX : maxX;
      minX = curX < minX ? curX : minX;
      maxY = curY > maxY ? curY : maxY;
      minY = curY < minY ? curY : minY;

      curX = endX;
      curY = endY;
      maxX = curX > maxX ? curX : maxX;
      minX = curX < minX ? curX : minX;
      maxY = curY > maxY ? curY : maxY;
      minY = curY < minY ? curY : minY;

      p.kind = 'text';
      p.infoText = `Text: [${round2TwoDecimal(startPoint.x)} , ${round2TwoDecimal(startPoint.y)}] → ${p.text}`;
      this.shapes.push(p);
    });

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  };

  private drawFile = (context: CanvasRenderingContext2D) => {
    const arrowLen = 1; // length of head in pixels
    const defaultLineWidth = 0.3;
    const defaultHighlightColor = '#ffcc11';
    let lineWidth = defaultLineWidth;
    let lineColor = '#000000';

    drawGrid(context, this.canvasHeight, 10, '#999999', '#F2F2F2', 100, this.bounds.max.x + 20, this.bounds.max.y + 20);

    // x axis
    drawLineWithArrows(context, 0, 0, this.bounds.max.x + 25, 0, 2, 4, false, true);

    // y axis
    drawLineWithArrows(context, 0, 0, 0, this.bounds.max.y + 25, 2, 4, false, true);

    // draw xSplit
    lineColor = '#0088ff';
    if (this.props.xSplit !== 0) {
      // draw line
      context.beginPath(); // begin
      context.moveTo(this.props.xSplit, -5);
      context.lineTo(this.props.xSplit, this.bounds.max.y + 20);
      context.closePath(); // end

      context.lineWidth = defaultLineWidth;
      context.strokeStyle = lineColor;
      context.stroke();
    }

    // draw all the shapes
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];

      if (this.selectedShapeIndex === i) {
        lineWidth = defaultLineWidth * 2;
        this.selectedShapeInfo = shape.infoText || '';
      } else {
        lineWidth = defaultLineWidth;
      }

      switch (shape.kind) {
        case 'circle':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#0000ff';
          }
          drawCircle(context, shape, this.canvasHeight, this.props.showInfo, lineColor, lineWidth);
          break;
        case 'line':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else if (shape.isVisible) {
            lineColor = '#44cc44';
          } else {
            lineColor = '#44ccff';
          }
          drawLine(context, shape, this.props.showArrows, arrowLen, lineColor, lineWidth);
          break;
        case 'arc':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#000000';
          }
          drawArc(context, shape, this.props.showArrows, arrowLen, this.props.showInfo, lineColor, lineWidth);
          break;
        case 'polyline':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#ff00ff';
          }
          drawPolyline(context, shape, this.props.showArrows, arrowLen, lineColor, lineWidth);
          break;
        case 'text':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#ffcc99';
          }
          drawText(context, shape, this.canvasHeight, this.props.showInfo, lineColor, lineWidth);
          break;
        default:
          break;
      }
    }
  };

  private draw = (scale: number, translatePos: PointF) => {
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;

      // clear
      // this.ctx.clearRect(0, 0, this.canvasWidth * devicePixelRatio, this.canvasHeight * devicePixelRatio);
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(0, 0, this.canvasWidth * devicePixelRatio, this.canvasHeight * devicePixelRatio);
      this.ctx.fillStyle = 'black';

      // main drawing routine
      this.ctx.save();
      this.setZoomAndOffsetTransform();
      this.ctx.setTransform(
        this.originTransform.a,
        this.originTransform.b,
        this.originTransform.c,
        this.originTransform.d,
        this.originTransform.e,
        this.originTransform.f
      );

      // ---- start drawing the model ---
      this.drawFile(this.ctx);

      // mark local bounds area
      // this.ctx.strokeStyle = `hsl(${360 * Math.random()}, 80%, 50%)`;
      // this.ctx.strokeRect(
      //   this.bounds.min.x,
      //   this.bounds.min.y,
      //   this.bounds.max.x - this.bounds.min.x,
      //   this.bounds.max.y - this.bounds.min.y
      // );

      this.ctx.restore();

      // debugging: draw non zoomed and non panned
      this.ctx.save();
      this.ctx.scale(devicePixelRatio, devicePixelRatio);
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText(`Filename: ${this.props.drawModel.fileName}`, 10, 10);
      this.ctx.fillText(`Scale: ${round2TwoDecimal(scale)}`, 10, 25);
      this.ctx.fillText(`Panning: ${round2TwoDecimal(translatePos.x)} , ${round2TwoDecimal(translatePos.y)}`, 10, 40);

      // get locally calculated bounds
      this.ctx.fillText(
        `Local Bounds: [${round2TwoDecimal(this.bounds.min.x)} , ${round2TwoDecimal(
          this.bounds.min.y
        )}] → [${round2TwoDecimal(this.bounds.max.x)} , ${round2TwoDecimal(this.bounds.max.y)}]`,
        10,
        55
      );

      // get bounds from the fetched model
      this.ctx.fillText(
        `Model Bounds: [${round2TwoDecimal(this.props.drawModel.bounds.min.x)} , ${round2TwoDecimal(
          this.props.drawModel.bounds.min.y
        )}] → [${round2TwoDecimal(this.props.drawModel.bounds.max.x)} , ${round2TwoDecimal(
          this.props.drawModel.bounds.max.y
        )}]`,
        10,
        70
      );

      // draw mouse pos
      this.ctx.fillText(
        `Pos: ${round2TwoDecimal(this.currentMousePos.x)} , ${round2TwoDecimal(this.currentMousePos.y)}`,
        10,
        85
      );

      if (this.selectedShapeInfo) this.ctx.fillText(`${this.selectedShapeInfo}`, 10, 100);

      this.ctx.restore();
    }
    // end debugging
  };

  render() {
    return (
      <div ref={this.canvasDivRef} id="canvasDiv">
        <canvas
          className="border"
          ref={this.canvasRef}
          id="drawCanvas"
          width="200"
          height="200"
          onWheel={this.handleMouseScroll}
          onMouseDown={this.onMouseDown}
          onMouseUp={this.OnMouseFinished}
          onMouseOver={this.OnMouseFinished}
          onFocus={this.OnMouseFinished}
          onBlur={this.OnMouseFinished}
          onMouseOut={this.OnMouseFinished}
          onMouseMove={this.onMouseMove}>
          Sorry, your browser does not support the &lt;canvas&gt; element.
        </canvas>
      </div>
    );
  }
}
