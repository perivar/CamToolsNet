import React from 'react';
import './DrawingCanvas.scss';
import { Bounds, PointF, DrawingModel, Circle, Line, Arc, Polyline, PolylineLW } from '../types/DrawingModel';

function round2TwoDecimal(number: number): number {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

interface IDrawingCanvasProps {
  drawModel: DrawingModel;
  showArrows: boolean;
}

const { PI } = Math;
const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export default class DrawingCanvas extends React.PureComponent<IDrawingCanvasProps> {
  // instance variables
  private bounds: Bounds = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
  private translatePos: PointF = { x: 0, y: 0 };

  private scale: number;
  private startDragOffset: PointF = { x: 0, y: 0 };
  private mouseDown: boolean;

  private originTransform = new DOMMatrix();
  private inverseOriginTransform = new DOMMatrix();

  // get on-screen canvas
  private canvasDiv: HTMLDivElement | null;
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null;

  private canvasWidth: number;
  private canvasHeight: number;

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
    const mousePos = this.getTransformRelativeMousePosition(evt);

    // clear small area where the mouse pos is plotted
    if (this.ctx) {
      this.ctx.save();
      this.ctx.scale(devicePixelRatio, devicePixelRatio);
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(10, 52, 200, 10);
      this.ctx.font = '10px sans-serif';
      this.ctx.fillStyle = 'black';
      this.ctx.fillText(`Pos: ${round2TwoDecimal(mousePos.x)} , ${round2TwoDecimal(mousePos.y)}`, 10, 60);
      this.ctx.restore();
    }

    if (this.mouseDown) {
      this.translatePos.x = evt.clientX - this.startDragOffset.x;
      this.translatePos.y = evt.clientY - this.startDragOffset.y;
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

    const dataWidth = this.bounds.max.x - this.bounds.min.x;
    const dataHeight = this.bounds.max.y - this.bounds.min.y;

    const scaleY = this.canvasHeight / dataHeight;
    const scaleX = this.canvasWidth / dataWidth;
    this.scale = Math.min(scaleX, scaleY);

    // move the origin
    this.translatePos.x = this.canvasWidth / 2 - (dataWidth / 2 + this.bounds.min.x) * this.scale;
    // offset with 'canvasHeight -¨' since we are flipping around y axis
    this.translatePos.y =
      this.canvasHeight - (this.canvasHeight / 2 - (dataHeight / 2 + this.bounds.min.y) * this.scale);
  };

  getQuadrant = (_angle: number) => {
    const angle = _angle % TWO_PI;

    if (angle >= 0.0 && angle < HALF_PI) return 0;
    if (angle >= HALF_PI && angle < PI) return 1;
    if (angle >= PI && angle < PI + HALF_PI) return 2;
    return 3;
  };

  // https://stackoverflow.com/a/35977476/461048
  getArcBoundingBox = (ini: number, end: number, radius: number, margin = 0) => {
    const iniQuad = this.getQuadrant(ini);
    const endQuad = this.getQuadrant(end);

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

  private calculateBounds = (): Bounds => {
    let maxX = -1000000;
    let maxY = -1000000;
    let minX = 1000000;
    let minY = 1000000;
    let curX = 0;
    let curY = 0;

    this.props.drawModel.circles.forEach((circle: Circle) => {
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
      }
    });

    this.props.drawModel.lines.forEach((line: Line) => {
      if (line.isVisible) {
        const startX = line.startPoint.x;
        const startY = line.startPoint.y;
        const endX = line.endPoint.x;
        const endY = line.endPoint.y;

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
    });

    this.props.drawModel.arcs.forEach((a: Arc) => {
      if (a.isVisible) {
        const centerX = a.center.x;
        const centerY = a.center.y;
        const { radius } = a;
        const { startAngle } = a;
        const { endAngle } = a;

        const box = this.getArcBoundingBox(startAngle * DEG_TO_RAD, endAngle * DEG_TO_RAD, radius);
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
      }
    });

    this.props.drawModel.polylines.forEach((p: Polyline) => {
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
      }
    });

    this.props.drawModel.polylinesLW.forEach((p: PolylineLW) => {
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
      }
    });

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  };

  private drawGrid = (
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

    // x axis
    this.drawLineWithArrows(this.ctx as CanvasRenderingContext2D, 0, 0, this.bounds.max.x + 25, 0, 2, 4, false, true);

    // y axis
    this.drawLineWithArrows(this.ctx as CanvasRenderingContext2D, 0, 0, 0, this.bounds.max.y + 25, 2, 4, false, true);
  };

  // x0,y0: the line's starting point
  // x1,y1: the line's ending point
  // width: the distance the arrowhead perpendicularly extends away from the line
  // height: the distance the arrowhead extends backward from the endpoint
  // arrowStart: true/false directing to draw arrowhead at the line's starting point
  // arrowEnd: true/false directing to draw arrowhead at the line's ending point
  // Usage:
  // drawLineWithArrows(50, 50, 150, 50, 5, 8, true, true);
  private drawLineWithArrows = (
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

  private drawArrowHead = (
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

  private drawFile = (context: CanvasRenderingContext2D) => {
    const arrowLen = 0.8; // length of head in pixels

    this.drawGrid(context, 10, '#999999', '#F2F2F2', 100, this.bounds.max.x + 20, this.bounds.max.y + 20);

    // drawing circles
    context.beginPath(); // begin
    this.props.drawModel.circles.forEach((circle: Circle) => {
      const startAngle = 0;
      const endAngle = 2 * Math.PI;
      const { x } = circle.center;
      const { y } = circle.center;
      const { radius } = circle;

      context.moveTo(x + radius, y);
      context.arc(x, y, radius, startAngle, endAngle, false);

      // draw diameter and center (need to flip y axis back first)
      context.save();
      context.scale(1, -1); // flip back
      context.translate(0, -this.canvasHeight); // and translate so that we draw the text the right way up
      context.fillRect(x - 0.2, this.canvasHeight - y - 0.2, 0.4, 0.4); // fill in the pixel

      const dia = round2TwoDecimal(radius * 2);
      context.font = '4px sans-serif';
      context.fillText(`${dia}`, x + 4, this.canvasHeight - y);
      context.restore();
    });
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = '#0000ff';
    context.stroke();
    // done drawing circles

    // drawing lines
    let lineColor = '#44cc44';
    this.props.drawModel.lines.forEach((line: Line) => {
      const startX = line.startPoint.x;
      const startY = line.startPoint.y;
      const endX = line.endPoint.x;
      const endY = line.endPoint.y;

      // don't draw if the start end points for x and y are the same
      // likely a z only move
      if (startX !== endX || startY !== endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);

        if (line.isVisible) {
          lineColor = '#44cc44';
        } else {
          lineColor = '#44ccff';
        }

        // draw arrow head
        if (this.props.showArrows) this.drawArrowHead(context, endX, endY, angle, arrowLen, lineColor);

        // draw line
        context.beginPath(); // begin
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.closePath(); // end
        context.lineWidth = 0.3;
        context.strokeStyle = lineColor;
        context.stroke();
      }
    });
    // done drawing lines

    // drawing arcs
    this.props.drawModel.arcs.forEach((a: Arc) => {
      const centerX = a.center.x;
      const centerY = a.center.y;
      const { radius } = a;
      const { startAngle } = a;
      const { endAngle } = a;

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
        if (this.props.showArrows) this.drawArrowHead(context, endX, endY, arrowAngle, arrowLen, '#000000');

        // draw arc
        context.beginPath(); // begin
        context.moveTo(startX, startY);
        context.arc(centerX, centerY, radius, sAngle, eAngle, isCounterClockwise);
        context.moveTo(endX, endY);
        context.closePath(); // end
        context.lineWidth = 0.3;
        context.strokeStyle = '#000000';
        context.stroke();
      }
    });
    // done drawing arcs

    // drawing polylines
    // drawing them backwards seem to get rid of some strange bugs
    context.beginPath(); // begin
    for (let j = this.props.drawModel.polylines.length - 1; j >= 0; j--) {
      const p = this.props.drawModel.polylines[j];
      for (let i = 0; i < p.vertexes.length; i++) {
        const vertex = p.vertexes[i];
        const pointX = vertex.x;
        const pointY = vertex.y;

        // context.lineTo(pointX, pointY);
        if (i === 0) {
          context.moveTo(pointX, pointY);
        } else {
          context.lineTo(pointX, pointY);
        }
      }
    }
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = '#ff00ff';
    context.stroke();
    // done drawing polylines

    // drawing polylines light weight
    // drawing them backwards seem to get rid of some strange bugs
    context.beginPath(); // begin
    for (let j = this.props.drawModel.polylinesLW.length - 1; j >= 0; j--) {
      const p = this.props.drawModel.polylinesLW[j];
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
          const angle = ((4 * Math.atan(Math.abs(bulge))) / Math.PI) * 180;
          const length = Math.sqrt(
            (pointX - prePointX) * (pointX - prePointX) + (pointY - prePointY) * (pointY - prePointY)
          );
          const radius = Math.abs(length / (2 * Math.sin((angle / 360) * Math.PI)));
          context.arc(pointX, pointY, radius, 0, (angle * Math.PI) / 180, false);

          prePointX = pointX;
          prePointY = pointY;
        }
      }
    }
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = '#002266';
    context.stroke();
    // done drawing polylines light weight
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
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText(`Filename: ${this.props.drawModel.fileName}`, 10, 10);
      this.ctx.fillText(`Scale: ${round2TwoDecimal(scale)}`, 10, 20);
      this.ctx.fillText(`Panning: ${round2TwoDecimal(translatePos.x)} , ${round2TwoDecimal(translatePos.y)}`, 10, 30);

      // get locally calculated bounds
      this.ctx.fillText(
        `Local Bounds: ${round2TwoDecimal(this.bounds.min.x)}:${round2TwoDecimal(
          this.bounds.min.y
        )} - ${round2TwoDecimal(this.bounds.max.x)}:${round2TwoDecimal(this.bounds.max.y)}`,
        10,
        40
      );

      // get bounds from the fetched model
      this.ctx.fillText(
        `Model Bounds: ${round2TwoDecimal(this.props.drawModel.bounds.min.x)}:${round2TwoDecimal(
          this.props.drawModel.bounds.min.y
        )} - ${round2TwoDecimal(this.props.drawModel.bounds.max.x)}:${round2TwoDecimal(
          this.props.drawModel.bounds.max.y
        )}`,
        10,
        50
      );

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
