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
  DrawPolylineLW,
  DrawShape
} from '../types/DrawingModel';

interface IDrawingCanvasProps {
  drawModel: DrawingModel;
  showArrows: boolean;
  xSplit: number;
}

const { PI } = Math;
const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const round2TwoDecimal = (number: number): number => {
  return Math.round((number + Number.EPSILON) * 100) / 100;
};

const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.hypot(x2 - x1, y2 - y1);
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

const drawArrowHead = (
  context: CanvasRenderingContext2D,
  endX: number,
  endY: number,
  angle: number,
  arrowLen: number,
  color: string
) => {
  // draw arrow head as filled triangle
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - arrowLen * Math.cos(angle - Math.PI / 6), endY - arrowLen * Math.sin(angle - Math.PI / 6));
  context.lineTo(endX - arrowLen * Math.cos(angle + Math.PI / 6), endY - arrowLen * Math.sin(angle + Math.PI / 6));
  context.lineTo(endX, endY);
  context.closePath();
  context.fillStyle = color;
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
  doInfo = false,
  lineColor = '#000000',
  lineWidth = 0.5
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

  if (doInfo) {
    // draw diameter and center (need to flip y axis back first)
    context.save();
    context.scale(1, -1); // flip back
    context.translate(0, -canvasHeight); // and translate so that we draw the text the right way up
    context.fillRect(x - 0.2, canvasHeight - y - 0.2, 0.4, 0.4); // fill in the pixel

    const dia = round2TwoDecimal(radius * 2);
    context.font = '3px sans-serif';
    context.fillText(`${dia}`, x - 2, canvasHeight - y - radius - 1);
    context.restore();
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
  doInfo = false,
  lineColor = '#000000',
  lineWidth = 0.5
) => {
  const centerX = arc.center.x;
  const centerY = arc.center.y;
  const { radius } = arc;
  const { startAngle } = arc;
  const { endAngle } = arc;

  // since we have flipped the y orgin, we have to draw counter clockwise
  const isCounterClockwise = false;

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
    if (showArrows) drawArrowHead(context, endX, endY, arrowAngle, arrowLen, lineColor);

    // draw arc
    context.beginPath(); // begin
    context.moveTo(startX, startY);
    context.arc(centerX, centerY, radius, sAngle, eAngle, isCounterClockwise);
    context.moveTo(endX, endY);
    context.closePath(); // end

    // if (doInfo && showArrows) {
    //   context.fillRect(centerX - 0.2, centerY - 0.2, 0.4, 0.4); // fill in the pixel
    // }

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
  lineColor = '#000000',
  lineWidth = 0.5
) => {
  // don't draw if the start end points for x and y are the same
  // likely a z only move
  if (startX !== endX || startY !== endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);

    // draw arrow head
    if (showArrows) drawArrowHead(context, endX, endY, angle, arrowLen, lineColor);

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
  lineColor = '#000000',
  lineWidth = 0.5
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
  lineColor = '#000000',
  lineWidth = 0.5
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

const drawPolylineLW = (
  context: CanvasRenderingContext2D,
  p: DrawPolylineLW,
  showArrows: boolean,
  arrowLen: number,
  lineColor = '#000000',
  lineWidth = 0.5
) => {
  context.beginPath(); // begin
  for (let i = 0; i < p.vertexes.length; i++) {
    const vertex = p.vertexes[i];
    const pointX = vertex.position.x;
    const pointY = vertex.position.y;
    const { bulge } = vertex;
    let prePointX = 0;
    let prePointY = 0;

    if (i === 0) {
      context.moveTo(pointX, pointY);
    } else {
      const angle = 4 * Math.atan(Math.abs(bulge)) * RAD_TO_DEG;
      const length = Math.sqrt(
        (pointX - prePointX) * (pointX - prePointX) + (pointY - prePointY) * (pointY - prePointY)
      );
      const radius = Math.abs(length / (2 * Math.sin((angle / 360) * Math.PI)));
      context.arc(pointX, pointY, radius, 0, (angle * Math.PI) / 180, false);

      prePointX = pointX;
      prePointY = pointY;
    }
  }

  context.lineWidth = lineWidth;
  context.strokeStyle = lineColor;
  context.stroke();
};

const defineIrregularPath = (context: CanvasRenderingContext2D, shape: DrawShape) => {
  let points: PointF[] = [{ x: 0, y: 0 }];
  if (shape.kind === 'polyline') {
    points = shape.vertexes;
  } else if (shape.kind === 'polylinelw') {
    points = Array.from(shape.vertexes, (p) => p.position);
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    context.lineTo(points[i].x, points[i].y);
  }
  context.closePath();
};

// given mouse X & Y (mx & my) and shape object
// return true/false whether mouse is inside the shape
// https://riptutorial.com/html5-canvas/example/18919/dragging-irregular-shapes-around-the-canvas
const isMouseInShape = (context: CanvasRenderingContext2D, mx: number, my: number, shape: DrawShape) => {
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
    drawArc(context, a, false, 0);

    // Then hit-test with isPointInStroke
    if (context.isPointInStroke(mx, my)) {
      return true;
    }
  } else if (shape.kind === 'line') {
    const line = shape as DrawLine;
    drawLine(context, line, false, 0);

    // Then hit-test with isPointInStroke
    if (context.isPointInStroke(mx, my)) {
      return true;
    }
  } else if (shape.kind === 'polyline' || shape.kind === 'polylinelw') {
    // First redefine the path again (no need to stroke/fill!)
    defineIrregularPath(context, shape);

    // Then hit-test with isPointInPath
    if (context.isPointInPath(mx, my)) {
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
    const amount = evt.deltaY > 0 ? 1 / 1.1 : 1.1;

    // set limits
    // const tmpScale = this.scale * amount;
    // if (tmpScale > 30) return;
    // if (tmpScale < 0.3) return;

    this.scale *= amount; // the new scale

    // move the origin
    this.translatePos.x = x - (x - this.translatePos.x) * amount;
    this.translatePos.y = y - (y - this.translatePos.y) * amount;

    this.draw(this.scale, this.translatePos);

    // i don't believe these work?!
    evt.preventDefault();
    evt.nativeEvent.returnValue = false;
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

    // const idCounter = 0;

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
        circle.infoText = `Circle: Center: [${round2TwoDecimal(x)} : ${round2TwoDecimal(
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
      line.infoText = `Line: [${round2TwoDecimal(startX)} : ${round2TwoDecimal(startY)}] - [${round2TwoDecimal(
        endX
      )} : ${round2TwoDecimal(endY)}] , Length: ${round2TwoDecimal(distance(startX, startY, endX, endY))}`;
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
        a.infoText = `Arc: [${round2TwoDecimal(startX)} : ${round2TwoDecimal(startY)}] - [${round2TwoDecimal(
          endX
        )} : ${round2TwoDecimal(endY)}] , Center: [${round2TwoDecimal(centerX)} : ${round2TwoDecimal(
          centerY
        )}], Radius: ${round2TwoDecimal(radius)}`;
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
        p.infoText = `Polyline: [${round2TwoDecimal(firstPoint.x)} : ${round2TwoDecimal(
          firstPoint.y
        )}] -- [${round2TwoDecimal(lastPoint.x)} : ${round2TwoDecimal(lastPoint.y)}]`;
        this.shapes.push(p);
      }
    });

    this.props.drawModel.polylinesLW.forEach((p: DrawPolylineLW) => {
      if (p.isVisible && p.vertexes.length >= 2) {
        for (let i = 0; i < p.vertexes.length; i++) {
          const vertex = p.vertexes[i];
          const pointX = vertex.position.x;
          const pointY = vertex.position.y;

          curX = pointX;
          curY = pointY;
          maxX = curX > maxX ? curX : maxX;
          minX = curX < minX ? curX : minX;
          maxY = curY > maxY ? curY : maxY;
          minY = curY < minY ? curY : minY;
        }

        p.kind = 'polylinelw';
        const firstPoint = p.vertexes[0].position;
        const lastPoint = p.vertexes[p.vertexes.length - 1].position;
        p.infoText = `PolylineLW: [${round2TwoDecimal(firstPoint.x)} : ${round2TwoDecimal(
          firstPoint.y
        )}] -- [${round2TwoDecimal(lastPoint.x)} : ${round2TwoDecimal(lastPoint.y)}]`;
        this.shapes.push(p);
      }
    });

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  };

  private drawShapes = (context: CanvasRenderingContext2D, lineWidth: number, arrowLen: number) => {
    let lineColor = '#000000';

    // drawing circles
    lineColor = '#0000ff';
    this.props.drawModel.circles.forEach((circle: DrawCircle) => {
      drawCircle(context, circle, this.canvasHeight, true, lineColor, lineWidth);
    });
    // done drawing circles

    // drawing lines
    this.props.drawModel.lines.forEach((line: DrawLine) => {
      if (line.isVisible) {
        lineColor = '#44cc44';
      } else {
        lineColor = '#44ccff';
      }
      drawLine(context, line, this.props.showArrows, arrowLen, lineColor, lineWidth);
    });
    // done drawing lines

    // drawing arcs
    lineColor = '#000000';
    this.props.drawModel.arcs.forEach((a: DrawArc) => {
      drawArc(context, a, this.props.showArrows, arrowLen, true, lineColor, lineWidth);
    });
    // done drawing arcs

    // drawing polylines
    lineColor = '#ff00ff';
    this.props.drawModel.polylines.forEach((p: DrawPolyline) => {
      drawPolyline(context, p, this.props.showArrows, arrowLen, lineColor, lineWidth);
    });
    // done drawing polylines

    // drawing polylines light weight
    lineColor = '#002266';
    this.props.drawModel.polylinesLW.forEach((p: DrawPolylineLW) => {
      drawPolylineLW(context, p, this.props.showArrows, arrowLen, lineColor, lineWidth);
    });
    // done drawing polylines light weight
  };

  private drawFile = (context: CanvasRenderingContext2D) => {
    const arrowLen = 0.8; // length of head in pixels
    const defaultLineWidth = 0.3;
    const defaultHighlightColor = '#ffcc11';
    let lineWidth = defaultLineWidth;
    let lineColor = '#000000';

    drawGrid(context, 10, '#999999', '#F2F2F2', 100, this.bounds.max.x + 20, this.bounds.max.y + 20);

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
          drawCircle(context, shape, this.canvasHeight, true, lineColor, lineWidth);
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
          drawArc(context, shape, this.props.showArrows, arrowLen, true, lineColor, lineWidth);
          break;
        case 'polyline':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#ff00ff';
          }
          drawPolyline(context, shape, this.props.showArrows, arrowLen, lineColor, lineWidth);
          break;
        case 'polylinelw':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#002266';
          }
          drawPolylineLW(context, shape, this.props.showArrows, arrowLen, lineColor, lineWidth);
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
        `Local Bounds: [${round2TwoDecimal(this.bounds.min.x)} : ${round2TwoDecimal(
          this.bounds.min.y
        )}] - [${round2TwoDecimal(this.bounds.max.x)} : ${round2TwoDecimal(this.bounds.max.y)}]`,
        10,
        55
      );

      // get bounds from the fetched model
      this.ctx.fillText(
        `Model Bounds: [${round2TwoDecimal(this.props.drawModel.bounds.min.x)} : ${round2TwoDecimal(
          this.props.drawModel.bounds.min.y
        )}] - [${round2TwoDecimal(this.props.drawModel.bounds.max.x)} : ${round2TwoDecimal(
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
      <div ref={(ref) => (this.canvasDiv = ref)} id="canvasDiv">
        <canvas
          className="border"
          ref={(ref) => (this.canvas = ref)}
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
