import { DrawArc, DrawCircle, DrawingModel, DrawLine, DrawPolyline, DrawText } from '../types/DrawingModel';
import * as THREE from 'three';
import opentype from 'opentype.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
// import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader';
// import Segmentize from 'svg-segmentize';

const measureOpentypeText = (font: opentype.Font, fontSize: number, text: string) => {
  // width can be gotten with
  // const dim2 = opentypeFont.getAdvanceWidth(text, fontSize);
  // console.log(dim2);

  let ascent = 0;
  let descent = 0;
  let width = 0;
  let kerningValue = 0;
  const scale = (1 / font.unitsPerEm) * fontSize;
  const glyphs = font.stringToGlyphs(text);

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    if (glyph.advanceWidth) {
      width += glyph.advanceWidth * scale;
    }
    if (i < glyphs.length - 1) {
      kerningValue = font.getKerningValue(glyph, glyphs[i + 1]);
      width += kerningValue * scale;
    }
    ascent = Math.max(ascent, glyph.getBoundingBox().y2);
    descent = Math.min(descent, glyph.getBoundingBox().y1);
  }

  return {
    width,
    actualBoundingBoxAscent: ascent * scale,
    actualBoundingBoxDescent: descent * scale,
    fontBoundingBoxAscent: font.ascender * scale,
    fontBoundingBoxDescent: font.descender * scale
  };
};

const drawText = (
  group: THREE.Group,
  drawText: DrawText,
  showInfo = false,
  lineColor: string,
  lineWidth: number,
  opentypeDictionary?: { [key: string]: opentype.Font }
) => {
  const startX = drawText.startPoint.x;
  const startY = drawText.startPoint.y;
  const { font } = drawText;
  const { fontSize } = drawText;
  const { text } = drawText;

  // draw text
  if (opentypeDictionary && opentypeDictionary[font]) {
    const opentypeFont = opentypeDictionary[font];
    const path = opentypeFont.getPath(text, startX, startY, fontSize);

    const svgMarkup = path.toSVG(2);
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);

    // Note! SVGs are flipped along y
    // We can fix this by simply inverting the group that contain our objects:
    // groupInput.scale.y *= -1;

    // Loop through all of the parsed paths
    // svgData.paths.forEach((shapePath, i) => {
    //   shapePath.color = new THREE.Color(lineColor);
    //   const newShapes = shapePath.toShapes(false);
    //   // paths.push(shapePath);
    //   shapes.push(...newShapes);
    // });

    const material = new THREE.MeshBasicMaterial({ color: '#EDBB99' });
    const material2 = new THREE.MeshBasicMaterial({ color: '#DC7633' });

    const letterGroup = new THREE.Group();
    letterGroup.scale.y *= -1;
    letterGroup.position.y = startY * 2;

    // for opentype we only have one path
    for (let i = 0; i < svgData.paths.length; i++) {
      const path = svgData.paths[i];
      const letters = path.toShapes(true);

      for (let j = 0; j < letters.length; j++) {
        const letter = letters[j];

        const extrGeometry = new THREE.ExtrudeGeometry(letter, {
          depth: 5,
          bevelThickness: 2,
          bevelSize: 0.5,
          bevelEnabled: false, // normally true
          bevelSegments: 3,
          curveSegments: 6
        });

        const mesh = new THREE.Mesh(extrGeometry, [material, material2]);
        letterGroup.add(mesh);
      }
    }

    group.add(letterGroup);

    // const segments = Segmentize(pathData, {
    //   input: 'string',
    //   output: 'data',
    //   resolution: {
    //     circle: 256,
    //     ellipse: 256,
    //     path: 1024
    //   }
    // });
    // segments.forEach((d: any) => {
    //   drawSingleLine(context, d[0], d[1], d[2], d[3], showInfo, 0.1, lineColor, lineWidth);
    // });
  }

  // const loader = new TTFLoader();
  // loader.load('fonts/Pacifico-Regular.ttf', function (json) {
  //   const font = new THREE.Font(json);
  //   createText();
  // });

  // if (showInfo) {
  // }
};

const drawCircle = (
  shapes: THREE.Shape[],
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
  // paths.push(path);
  shapes.push(...path.toShapes(false));
};

const drawArc = (
  shapes: THREE.Shape[],
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
    // paths.push(path);
    shapes.push(...path.toShapes(false));
  }
};

const drawSingleLine = (
  shapes: THREE.Shape[],
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
    // paths.push(path);
    shapes.push(...path.toShapes(false));
  }
};

const drawLine = (shapes: THREE.Shape[], line: DrawLine, showArrows: boolean, lineColor: string, lineWidth: number) => {
  const startX = line.startPoint.x;
  const startY = line.startPoint.y;
  const endX = line.endPoint.x;
  const endY = line.endPoint.y;

  drawSingleLine(shapes, startX, startY, endX, endY, showArrows, lineColor, lineWidth);
};

const drawPolyline = (
  shapes: THREE.Shape[],
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

      drawSingleLine(shapes, startX, startY, endX, endY, showArrows, lineColor, lineWidth);

      // store new start pos
      startX = posX;
      startY = posY;
    }
  }
};

// export const ToObject3D_OLD = (
//   drawModel: DrawingModel,
//   showArrows: boolean,
//   opentypeDictionary?: { [key: string]: opentype.Font }
// ): THREE.Object3D => {
//   let lineColor = '#000000';
//   const lineWidth = 10;
//   const showInfo = true;

//   const paths: THREE.ShapePath[] = [];

//   // drawing circles
//   lineColor = '#0000ff';
//   drawModel.circles.forEach((circle: DrawCircle) => {
//     drawCircle(paths, circle, showInfo, lineColor, lineWidth);
//   });
//   // done drawing circles

//   // drawing lines
//   drawModel.lines.forEach((line: DrawLine) => {
//     if (line.isVisible) {
//       lineColor = '#44cc44';
//     } else {
//       lineColor = '#44ccff';
//     }
//     drawLine(paths, line, showArrows, lineColor, lineWidth);
//   });
//   // done drawing lines

//   // drawing arcs
//   lineColor = '#000000';
//   drawModel.arcs.forEach((a: DrawArc) => {
//     drawArc(paths, a, showArrows, showInfo, lineColor, lineWidth);
//   });
//   // done drawing arcs

//   // drawing polylines
//   lineColor = '#ff00ff';
//   drawModel.polylines.forEach((p: DrawPolyline) => {
//     drawPolyline(paths, p, showArrows, lineColor, lineWidth);
//   });
//   // done drawing polylines

//   // drawing text
//   lineColor = '#ffcc99';
//   drawModel.texts.forEach((t: DrawText) => {
//     drawText(paths, t, showInfo, lineColor, lineWidth, opentypeDictionary);
//   });
//   // done drawing text

//   // Group that will contain all of our paths
//   const svgGroup = new THREE.Group();

//   // Loop through all of the parsed paths
//   paths.forEach((path, i) => {
//     const shapes = path.toShapes(true);

//     const material = new THREE.MeshBasicMaterial({
//       color: path.color,
//       side: THREE.DoubleSide,
//       depthWrite: true
//     });

//     // Each path has array of shapes
//     shapes.forEach((shape, j) => {
//       // Finally we can take each shape and extrude it
//       const geometry = new THREE.ExtrudeGeometry(shape, {
//         depth: 20,
//         bevelEnabled: false
//       });

//       // const geometry = new ShapeGeometry(shape);

//       // Create a mesh and add it to the group
//       const mesh = new THREE.Mesh(geometry, material);

//       svgGroup.add(mesh);
//     });
//   });

//   return svgGroup;
// };

export const ToObject3D = (
  drawModel: DrawingModel,
  showArrows: boolean,
  opentypeDictionary?: { [key: string]: opentype.Font }
): THREE.Object3D => {
  let lineColor = '#000000';
  const lineWidth = 10;
  const showInfo = true;

  const shapes: THREE.Shape[] = [];

  // drawing circles
  lineColor = '#0000ff';
  drawModel.circles.forEach((circle: DrawCircle) => {
    drawCircle(shapes, circle, showInfo, lineColor, lineWidth);
  });
  // done drawing circles

  // drawing lines
  drawModel.lines.forEach((line: DrawLine) => {
    if (line.isVisible) {
      lineColor = '#44cc44';
    } else {
      lineColor = '#44ccff';
    }
    drawLine(shapes, line, showArrows, lineColor, lineWidth);
  });
  // done drawing lines

  // drawing arcs
  lineColor = '#000000';
  drawModel.arcs.forEach((a: DrawArc) => {
    drawArc(shapes, a, showArrows, showInfo, lineColor, lineWidth);
  });
  // done drawing arcs

  // drawing polylines
  lineColor = '#ff00ff';
  drawModel.polylines.forEach((p: DrawPolyline) => {
    drawPolyline(shapes, p, showArrows, lineColor, lineWidth);
  });
  // done drawing polylines

  // Group that will contain all of our paths
  const svgGroup = new THREE.Group();

  // drawing text
  lineColor = '#ffcc99';
  drawModel.texts.forEach((t: DrawText) => {
    drawText(svgGroup, t, showInfo, lineColor, lineWidth, opentypeDictionary);
  });
  // done drawing text

  // const geometry = new THREE.ExtrudeGeometry(shapes, {
  //   depth: 10,
  //   bevelEnabled: false
  // });

  // const material = new THREE.MeshBasicMaterial({
  //   color: 'blue',
  //   side: THREE.DoubleSide,
  //   depthWrite: true
  // });
  // // const material = new THREE.MeshPhongMaterial();

  // // Create a mesh and add it to the group
  // const mesh = new THREE.Mesh(geometry, material);

  // svgGroup.add(mesh);

  // // // Loop through all of the parsed paths
  // // paths.forEach((path, i) => {
  // //   const shapes = path.toShapes(true);

  // //   const material = new THREE.MeshBasicMaterial({
  // //     color: path.color,
  // //     side: THREE.DoubleSide,
  // //     depthWrite: true
  // //   });

  // //   // Each path has array of shapes
  // //   shapes.forEach((shape, j) => {
  // //     // Finally we can take each shape and extrude it
  // //     const geometry = new THREE.ExtrudeGeometry(shape, {
  // //       depth: 20,
  // //       bevelEnabled: false
  // //     });

  // //     // const geometry = new ShapeGeometry(shape);

  // //     // Create a mesh and add it to the group
  // //     const mesh = new THREE.Mesh(geometry, material);

  // //     svgGroup.add(mesh);
  // //   });
  // // });

  return svgGroup;
};
