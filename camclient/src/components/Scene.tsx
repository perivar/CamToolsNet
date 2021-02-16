import React, { useMemo } from 'react';
import { DrawArc, DrawCircle, DrawingModel, DrawLine, DrawPolyline } from '../types/DrawingModel';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { ExtrudeGeometry, Group, Mesh, MeshNormalMaterial, Path, ShapeGeometry, ShapePath } from 'three';

interface ISceneProps {
  drawModel: DrawingModel;
  showArrows: boolean;
  showInfo: boolean;
  xSplit: number;
}

const drawCircle = (paths: ShapePath[], circle: DrawCircle, showInfo = false, lineColor: string, lineWidth: number) => {
  const startAngle = 0;
  const endAngle = 2 * Math.PI;
  const { x } = circle.center;
  const { y } = circle.center;
  const { radius } = circle;

  const subpath = new Path();
  subpath.moveTo(x + radius, y);
  subpath.absarc(x, y, radius, startAngle, endAngle, false);

  const path = new ShapePath();
  path.subPaths.push(subpath);
  paths.push(path);
};

const drawArc = (
  paths: ShapePath[],
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
    const subpath = new Path();
    subpath.moveTo(startX, startY);
    subpath.absarc(centerX, centerY, radius, sAngle, eAngle, isCounterClockwise);
    subpath.moveTo(endX, endY);

    const path = new ShapePath();
    path.subPaths.push(subpath);
    paths.push(path);
  }
};

const drawSingleLine = (
  paths: ShapePath[],
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
    const subpath = new Path();
    subpath.moveTo(startX, startY);
    subpath.lineTo(endX, endY);

    const path = new ShapePath();
    path.subPaths.push(subpath);
    paths.push(path);
  }
};

const drawLine = (paths: ShapePath[], line: DrawLine, showArrows: boolean, lineColor: string, lineWidth: number) => {
  const startX = line.startPoint.x;
  const startY = line.startPoint.y;
  const endX = line.endPoint.x;
  const endY = line.endPoint.y;

  drawSingleLine(paths, startX, startY, endX, endY, showArrows, lineColor, lineWidth);
};

const drawPolyline = (
  paths: ShapePath[],
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

const SvgModel = ({ svgMarkup }: { svgMarkup: string }) => {
  const loader = new SVGLoader();
  const svgData = loader.parse(svgMarkup);

  // Group that will contain all of our paths
  const svgGroup = new Group();

  // When importing SVGs paths are inverted on Y axis
  // it happens in the process of mapping from 2d to 3d coordinate system
  svgGroup.scale.y *= -1;

  const material = new MeshNormalMaterial();

  // Loop through all of the parsed paths
  svgData.paths.forEach((path, i) => {
    const shapes = path.toShapes(true);

    // Each path has array of shapes
    shapes.forEach((shape, j) => {
      // Finally we can take each shape and extrude it
      const geometry = new ExtrudeGeometry(shape, {
        depth: 20,
        bevelEnabled: false
      });

      geometry.center();

      // Create a mesh and add it to the group
      const mesh = new Mesh(geometry, material);

      svgGroup.add(mesh);
    });
  });

  const group = useMemo(() => svgGroup, []);
  return <primitive object={group} position={[0, 0, 0]} />;
};

const Model = ({ drawModel }: { drawModel: DrawingModel }) => {
  let lineColor = '#000000';
  const lineWidth = 10;
  const showInfo = true;
  const showArrows = true;

  const paths: ShapePath[] = [];

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
  const svgGroup = new Group();

  const material = new MeshNormalMaterial();

  // Loop through all of the parsed paths
  paths.forEach((path, i) => {
    const shapes = path.toShapes(true);

    // Each path has array of shapes
    shapes.forEach((shape, j) => {
      // Finally we can take each shape and extrude it
      const geometry = new ExtrudeGeometry(shape, {
        depth: 20,
        bevelEnabled: false
      });

      // const geometry = new ShapeGeometry(shape);

      // geometry.center();

      // Create a mesh and add it to the group
      const mesh = new Mesh(geometry, material);

      svgGroup.add(mesh);
    });
  });

  // don't use memo to be able to reload easiliy
  // const group = useMemo(() => svgGroup, []);
  return <primitive object={svgGroup} position={[0, 0, 0]} />;
};

const Scene: React.FC<ISceneProps> = ({ drawModel, showArrows }) => (
  // <SvgModel svgMarkup='<path fill="none" d="M201,1 L201,201 L1,201 L1,1 L201,1 Z M53.27053,71 L37.6666667,71 L37.6666667,134.333333 L53.27053,134.333333 L53.27053,86.6038647 C59.2367133,86.879227 66.1207733,91.1014493 66.1207733,99.9130433 L66.1207733,134.333333 L80.4396133,134.333333 L80.4396133,99.9130433 C80.4396133,91.1014493 87.32367,86.879227 93.2898567,86.6038647 L93.2898567,134.333333 L110.63768,134.333333 L110.63768,86.6038647 C116.603863,86.879227 123.487923,91.1014493 123.487923,99.9130433 L123.487923,134.333333 L137.806763,134.333333 L137.806763,99.9130433 C137.806763,91.1014493 144.69082,86.879227 150.657003,86.6038647 L150.657003,134.333333 L166.26087,134.333333 L166.26087,71 L150.657003,71 C142.120773,71 133.859903,75.589372 130.647343,80.178744 C127.434783,75.589372 119.173913,71 110.63768,71 L93.2898567,71 C84.7536233,71 76.4927533,75.589372 73.2801933,80.178744 C70.0676333,75.589372 61.8067633,71 53.27053,71 Z" stroke="#979797"></path>'></SvgModel>
  <Model drawModel={drawModel}></Model>
);

export default Scene;
