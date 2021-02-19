import { DrawArc, DrawCircle, DrawingModel, DrawLine, DrawPolyline } from '../types/DrawingModel';
import * as THREE from 'three';

const drawCircle = (
  paths: THREE.ShapePath[],
  circle: DrawCircle,
  showInfo = false,
  lineColor: string,
  lineWidth: number
) => {
  const startAngle = 0;
  const endAngle = 2 * Math.PI;
  const { x } = circle.center;
  const { y } = circle.center;
  const { radius } = circle;

  const subpath = new THREE.Path();
  subpath.moveTo(x + radius, y);
  subpath.absarc(x, y, radius, startAngle, endAngle, false);

  const path = new THREE.ShapePath();
  path.color = new THREE.Color(lineColor);
  path.subPaths.push(subpath);
  paths.push(path);
};

const drawArc = (
  paths: THREE.ShapePath[],
  arc: DrawArc,
  showArrows: boolean,
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

    // draw arc
    const subpath = new THREE.Path();
    subpath.moveTo(startX, startY);
    subpath.absarc(centerX, centerY, radius, sAngle, eAngle, isCounterClockwise);
    subpath.moveTo(endX, endY);

    const path = new THREE.ShapePath();
    path.color = new THREE.Color(lineColor);
    path.subPaths.push(subpath);
    paths.push(path);
  }
};

const drawSingleLine = (
  paths: THREE.ShapePath[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  showArrows: boolean,
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

    // draw line
    const subpath = new THREE.Path();
    subpath.moveTo(startX, startY);
    subpath.lineTo(endX, endY);

    const path = new THREE.ShapePath();
    path.color = new THREE.Color(lineColor);
    path.subPaths.push(subpath);
    paths.push(path);
  }
};

const drawLine = (
  paths: THREE.ShapePath[],
  line: DrawLine,
  showArrows: boolean,
  lineColor: string,
  lineWidth: number
) => {
  const startX = line.startPoint.x;
  const startY = line.startPoint.y;
  const endX = line.endPoint.x;
  const endY = line.endPoint.y;

  drawSingleLine(paths, startX, startY, endX, endY, showArrows, lineColor, lineWidth);
};

const drawPolyline = (
  paths: THREE.ShapePath[],
  p: DrawPolyline,
  showArrows: boolean,
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

      drawSingleLine(paths, startX, startY, endX, endY, showArrows, lineColor, lineWidth);

      // store new start pos
      startX = posX;
      startY = posY;
    }
  }
};

export const ToObject3D = (drawModel: DrawingModel, showArrows: boolean): THREE.Object3D => {
  let lineColor = '#000000';
  const lineWidth = 10;
  const showInfo = true;

  const paths: THREE.ShapePath[] = [];

  // drawing circles
  lineColor = '#0000ff';
  drawModel.circles.forEach((circle: DrawCircle) => {
    drawCircle(paths, circle, showInfo, lineColor, lineWidth);
  });
  // done drawing circles

  // drawing lines
  drawModel.lines.forEach((line: DrawLine) => {
    if (line.isVisible) {
      lineColor = '#44cc44';
    } else {
      lineColor = '#44ccff';
    }
    drawLine(paths, line, showArrows, lineColor, lineWidth);
  });
  // done drawing lines

  // drawing arcs
  lineColor = '#000000';
  drawModel.arcs.forEach((a: DrawArc) => {
    drawArc(paths, a, showArrows, showInfo, lineColor, lineWidth);
  });
  // done drawing arcs

  // drawing polylines
  lineColor = '#ff00ff';
  drawModel.polylines.forEach((p: DrawPolyline) => {
    drawPolyline(paths, p, showArrows, lineColor, lineWidth);
  });
  // done drawing polylines

  // Group that will contain all of our paths
  const svgGroup = new THREE.Group();

  // Loop through all of the parsed paths
  paths.forEach((path, i) => {
    const shapes = path.toShapes(true);

    const material = new THREE.MeshBasicMaterial({
      color: path.color,
      side: THREE.DoubleSide,
      depthWrite: true
    });

    // Each path has array of shapes
    shapes.forEach((shape, j) => {
      // Finally we can take each shape and extrude it
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 20,
        bevelEnabled: false
      });

      // const geometry = new ShapeGeometry(shape);

      // Create a mesh and add it to the group
      const mesh = new THREE.Mesh(geometry, material);

      svgGroup.add(mesh);
    });
  });

  return svgGroup;
};
