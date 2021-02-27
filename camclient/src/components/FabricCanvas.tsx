import React from 'react';
import './FabricCanvas.scss';
import {
  Bounds,
  PointF,
  DrawingModel,
  DrawCircle,
  DrawLine,
  DrawArc,
  DrawPolyline,
  DrawShape
} from '../types/DrawingModel';
import { fabric } from 'fabric';

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

/**
 * Fabric.js patch
 */
fabric.Canvas.prototype.getPointer = function (e: Event, ignoreZoom: boolean) {
  // return cached values if we are in the event processing chain
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self: any = this;
  if (self) {
    if (self._absolutePointer && !ignoreZoom) {
      return self._absolutePointer;
    }
    if (self._pointer && ignoreZoom) {
      return self._pointer;
    }

    let pointer = fabric.util.getPointer(e, self.upperCanvasEl),
      { upperCanvasEl } = self,
      bounds = upperCanvasEl.getBoundingClientRect(),
      boundsWidth = bounds.width || 0,
      boundsHeight = bounds.height || 0,
      cssScale;

    if (!boundsWidth || !boundsHeight) {
      if ('top' in bounds && 'bottom' in bounds) {
        boundsHeight = Math.abs(bounds.top - bounds.bottom);
      }
      if ('right' in bounds && 'left' in bounds) {
        boundsWidth = Math.abs(bounds.right - bounds.left);
      }
    }

    self.calcOffset();
    pointer.x = pointer.x - self._offset.left;
    // pointer.y = pointer.y - self._offset.top;
    pointer.y = bounds.height - pointer.y + self._offset.top;

    if (!ignoreZoom) {
      pointer = self.restorePointerVpt(pointer);
    }

    const retinaScaling = self.getRetinaScaling();
    if (retinaScaling !== 1) {
      pointer.x /= retinaScaling;
      pointer.y /= retinaScaling;
    }

    if (boundsWidth === 0 || boundsHeight === 0) {
      // If bounds are not available (i.e. not visible), do not apply scale.
      cssScale = { width: 1, height: 1 };
    } else {
      cssScale = {
        width: upperCanvasEl.width / boundsWidth,
        height: upperCanvasEl.height / boundsHeight
      };
    }

    return {
      x: pointer.x * cssScale.width,
      y: pointer.y * cssScale.height
    };
  }
};

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
  canvas: fabric.Canvas,
  circle: DrawCircle,
  canvasHeight: number,
  showInfo = false,
  lineColor: string,
  lineWidth: number
) => {
  const { x } = circle.center;
  const { y } = circle.center;
  const { radius } = circle;

  const fabricCircle = new fabric.Circle({
    top: y,
    left: x,
    radius,
    originX: 'center',
    originY: 'center',
    stroke: lineColor,
    strokeWidth: lineWidth,
    fill: 'rgba(0,0,0,0)'
  });

  canvas.add(fabricCircle);
};

const drawArc = (
  canvas: fabric.Canvas,
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

  const isCounterClockwise = !arc.isClockwise; // since we are flipping the axis, we need to invert the clockwise as well

  let sAngle = 0;
  let eAngle = 0;
  sAngle = (startAngle * Math.PI) / 180;
  eAngle = (endAngle * Math.PI) / 180;
  let angle = 0;
  if (isCounterClockwise) {
    angle = 0.5;
  } else {
    angle = PI;
  }

  const fabricArc = new fabric.Circle({
    top: centerY,
    left: centerX,
    radius,
    originX: 'center',
    originY: 'center',
    startAngle: sAngle,
    endAngle: eAngle,
    // angle,
    stroke: lineColor,
    strokeWidth: lineWidth,
    fill: 'rgba(0,0,0,0)'
  });

  canvas.add(fabricArc);
};

const drawSingleLine = (
  canvas: fabric.Canvas,
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
    // Initiate a line instance
    const fabricLine = new fabric.Line([startX, startY, endX, endY], {
      stroke: lineColor,
      strokeWidth: lineWidth,
      fill: 'rgba(0,0,0,0)'
      // flipY: true
    });

    canvas.add(fabricLine);
  }
};

const drawLine = (
  canvas: fabric.Canvas,
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

  drawSingleLine(canvas, startX, startY, endX, endY, showArrows, arrowLen, lineColor, lineWidth);
};

const drawPolyline = (
  canvas: fabric.Canvas,
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

      drawSingleLine(canvas, startX, startY, endX, endY, showArrows, arrowLen, lineColor, lineWidth);

      // store new start pos
      startX = posX;
      startY = posY;
    }
  }
};

export default class FabricCanvas extends React.PureComponent<IDrawingCanvasProps> {
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
  private fabricCanvas: fabric.Canvas | null;
  private ctx: CanvasRenderingContext2D | null;

  private canvasWidth: number;
  private canvasHeight: number;

  // save all shapes in an array
  private shapes: DrawShape[] = [];
  private selectedShapeIndex: number;
  private selectedShapeInfo: string;

  private isDragging: boolean;

  constructor(props: IDrawingCanvasProps) {
    super(props);

    this.scale = 1.0;
    this.startDragOffset = { x: 0, y: 0 };
    this.mouseDown = false;
    this.canvasWidth = 0;
    this.canvasHeight = 0;

    this.canvasDiv = null;
    this.canvas = null;
    this.fabricCanvas = null;
    this.ctx = null;

    this.currentMousePos = { x: 0, y: 0 };
    this.selectedShapeIndex = -1;
    this.selectedShapeInfo = '';

    this.isDragging = false;
  }

  componentDidMount() {
    if (this.canvas && this.canvasDiv) {
      this.canvasWidth = this.canvasDiv.clientWidth;
      this.canvasHeight = this.canvasDiv.clientHeight;

      this.fabricCanvas = new fabric.Canvas('canvas', {
        height: this.canvasHeight,
        width: this.canvasWidth
      });

      // disable caching for all fabric objects
      fabric.Object.prototype.objectCaching = false;

      this.fabricCanvas.on('mouse:wheel', this.canvasMouseWheelEventHandler);
      this.fabricCanvas.on('mouse:down', this.canvasMouseDownEventHandler);
      this.fabricCanvas.on('mouse:move', this.canvasMouseMoveEventHandler);
      this.fabricCanvas.on('mouse:up', this.canvasMouseUpEventHandler);

      this.bounds = this.calculateBounds();
      this.draw(this.fabricCanvas);

      if (this.fabricCanvas) {
        const p: any = {
          x: this.canvasWidth / 2,
          y: this.canvasHeight / 2
        };

        // add 40 to try to zoom in a little less
        const dataWidth = 40 + this.bounds.max.x - this.bounds.min.x;
        const dataHeight = 40 + this.bounds.max.y - this.bounds.min.y;

        const scaleY = this.canvasHeight / dataHeight;
        const scaleX = this.canvasWidth / dataWidth;
        const s = Math.min(scaleX, scaleY);
        this.fabricCanvas.setZoom(s);

        const vpt = this.fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] = scaleX * s;
          vpt[5] = scaleY * s;
        }
      }

      this.fabricCanvas.renderAll();
    }

    // event handler to resize the canvas when the document view is changed
    window.addEventListener('resize', () => {
      if (this.canvas && this.canvasDiv) {
        // get current size of the canvas
        // console.log(`resize canvas div width: ${this.canvasDiv.clientWidth}`);
        // console.log(`resize canvas div height: ${this.canvasDiv.clientHeight}`);

        this.canvasWidth = this.canvasDiv.clientWidth;
        this.canvasHeight = this.canvasDiv.clientHeight;

        if (this.fabricCanvas) {
          this.fabricCanvas.setDimensions({
            height: this.canvasHeight,
            width: this.canvasWidth
          });

          this.fabricCanvas.clear();
          this.draw(this.fabricCanvas);
          this.fabricCanvas.renderAll();
        }
      }

      return false;
    });
  }

  componentDidUpdate(prevProps: IDrawingCanvasProps) {
    if (prevProps.drawModel !== this.props.drawModel) {
      if (this.canvas && this.canvasDiv) {
        if (this.fabricCanvas) {
          console.log('componentDidUpdate');
          // this.fabricCanvas.remove(...this.fabricCanvas.getObjects());
          // this.fabricCanvas.dispose();

          // Get the old canvas and remove it
          // let oldCanvas = document.getElementById('canvas');
          // oldCanvas = null;

          // // Add your completely new canvas
          // this.fabricCanvas = new fabric.Canvas('canvas', {
          //   height: this.canvasHeight,
          //   width: this.canvasWidth
          // });

          // // this.fabricCanvas.discardActiveObject();

          // this.fabricCanvas.clear();
          // this.draw(this.fabricCanvas);
          // this.fabricCanvas.renderAll();
          this.fabricCanvas.requestRenderAll();
        }
      }
    }
  }

  private readonly canvasMouseWheelEventHandler = (opt: any): void => {
    if (this.fabricCanvas) {
      const delta = opt.e.deltaY;
      let zoom = this.fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.5) zoom = 0.5;
      const p: any = { x: opt.e.offsetX, y: opt.e.offsetY };
      this.fabricCanvas.zoomToPoint(p, zoom);
    }
  };

  private readonly canvasMouseDownEventHandler = (opt: any): void => {
    if (this.fabricCanvas) {
      const { e } = opt;
      if (e.altKey === true) {
        this.isDragging = true;
        this.fabricCanvas.selection = false;
        this.translatePos.x = e.clientX;
        this.translatePos.y = e.clientY;
      }
    }
  };

  private readonly canvasMouseMoveEventHandler = (opt: any): void => {
    if (this.fabricCanvas) {
      if (this.isDragging) {
        const { e } = opt;
        const vpt = this.fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - this.translatePos.x;
          vpt[5] += -e.clientY + this.translatePos.y;
        }
        this.fabricCanvas.requestRenderAll();
        this.translatePos.x = e.clientX;
        this.translatePos.y = e.clientY;
      }
      console.log(`zoom: ${this.fabricCanvas.getZoom()}`);
      console.log(`vpt: ${this.fabricCanvas.viewportTransform}`);
    }
  };

  private readonly canvasMouseUpEventHandler = (opt: any): void => {
    if (this.fabricCanvas) {
      // on mouse up we want to recalculate new interaction
      // for all objects, so we call setViewportTransform
      const vpt = this.fabricCanvas.viewportTransform;
      if (vpt) {
        this.fabricCanvas.setViewportTransform(vpt);
      }
      this.isDragging = false;
      this.fabricCanvas.selection = true;
    }
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

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  };

  private draw = (canvas: fabric.Canvas) => {
    const arrowLen = 1; // length of head in pixels
    const defaultLineWidth = 0.3;
    const defaultHighlightColor = '#ffcc11';
    let lineWidth = defaultLineWidth;
    let lineColor = '#000000';

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
          drawCircle(canvas, shape, this.canvasHeight, this.props.showInfo, lineColor, lineWidth);
          break;
        case 'line':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else if (shape.isVisible) {
            lineColor = '#44cc44';
          } else {
            lineColor = '#44ccff';
          }
          drawLine(canvas, shape, this.props.showArrows, arrowLen, lineColor, lineWidth);
          break;
        case 'arc':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#000000';
          }
          drawArc(canvas, shape, this.props.showArrows, arrowLen, this.props.showInfo, lineColor, lineWidth);
          break;
        case 'polyline':
          if (this.selectedShapeIndex === i) {
            lineColor = defaultHighlightColor;
          } else {
            lineColor = '#ff00ff';
          }
          drawPolyline(canvas, shape, this.props.showArrows, arrowLen, lineColor, lineWidth);
          break;
        default:
          break;
      }
    }
  };

  render() {
    return (
      <div ref={(ref) => (this.canvasDiv = ref)} id="canvasDiv">
        <canvas ref={(ref) => (this.canvas = ref)} id="canvas" />
      </div>
    );
  }
}
