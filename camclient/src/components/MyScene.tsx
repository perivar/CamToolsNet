import React, { useEffect, useMemo } from 'react';
import { DrawArc, DrawCircle, DrawingModel, DrawLine, DrawPolyline } from '../types/DrawingModel';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import * as THREE from 'three';
import { useThree, Camera } from 'react-three-fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ISceneProps {
  drawModel: DrawingModel;
  showArrows: boolean;
  showInfo: boolean;
  xSplit: number;
}

interface ISpriteValue {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  size?: number;
}

const SetupCamera = ({ orthographic = false }) => {
  const { size, setDefaultCamera } = useThree();
  useEffect(() => {
    const { width } = size;
    const { height } = size;

    const fov = 60;
    const aspect = width / height;
    const near = 0.1;
    const far = 10000;

    const cam = orthographic
      ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
      : new THREE.PerspectiveCamera(fov, aspect, near, far);
    cam.position.z = 200;

    // Always look at [0, 0, 0]
    cam.lookAt(0, 0, 0);

    void setDefaultCamera(cam);
  }, []);

  return null;
};

const viewExtents = (scene: THREE.Scene, camera: Camera, object: THREE.Object3D) => {
  // get its bounding box
  const helper = new THREE.BoxHelper(object, 0xff0000);
  helper.update();
  const bboxHelper = helper;

  // If you want a visible bounding box
  scene.add(bboxHelper);

  const boundingBox = new THREE.Box3();

  // get bounding box of object - this will be used to setup controls and camera
  boundingBox.setFromObject(object);

  const bbox2 = boundingBox;
  const minx = bbox2.min.x || 0;
  const miny = bbox2.min.y || 0;
  const minz = bbox2.min.z || 0;
  const maxx = bbox2.max.x || 100;
  const maxy = bbox2.max.y || 100;
  const maxz = bbox2.max.z || 100;

  const center = new THREE.Vector3();
  center.x = minx + (maxx - minx) / 2;
  center.y = miny + (maxy - miny) / 2;
  center.z = minz + (maxz - minz) / 2;

  // controls.reset();

  // get max of any of the 3 axes to use as max extent
  const lenx = maxx - minx;
  const leny = maxy - miny;
  const lenz = maxz - minz;
  console.log('lenx:', lenx, 'leny:', leny, 'lenz:', lenz);

  const maxBeforeWarnX = 50;
  const maxBeforeWarnY = 50;
  const maxBeforeWarnZ = 50;
  if (lenx > maxBeforeWarnX || leny > maxBeforeWarnY || lenz > maxBeforeWarnZ) {
    // alert ("too big!");
  }

  const maxlen = Math.max(lenx, leny, lenz);
  const dist = 2 * maxlen;
  // center camera on gcode objects center pos, but twice the maxlen
  // camera.position.x = center.x;
  // camera.position.y = center.y;
  camera.position.z = center.z + dist;
  // camera.target.y = center.y;
  // camera.target.x = center.x;
  // camera.target.z = center.z;
  console.log('maxlen:', maxlen, 'dist:', dist);
  const fov = 2.2 * Math.atan(maxlen / (2 * dist)) * (180 / Math.PI);
  const cam = camera as THREE.PerspectiveCamera;
  console.log('new fov:', fov, ' old fov:', cam.fov);
  if (isNaN(fov)) {
    console.log('giving up on viewing extents because fov could not be calculated');
    return;
  }
  cam.fov = fov;

  const L = dist;
  const vector = center;
  const l = new THREE.Vector3().subVectors(camera.position, vector).length();
  // const up = camera.up.clone();
  // const quaternion = new Quaternion();

  // Zoom correction
  camera.translateZ(L - l / 2);
  // console.log('up:', up);
  // up.y = 1;
  // up.x = 0;
  // up.z = 0;
  // quaternion.setFromAxisAngle(up, 0.5);
  // up.y = 0;
  // up.x = 1;
  // up.z = 0;
  // quaternion.setFromAxisAngle(up, 0.5);
  // camera.position.applyQuaternion(quaternion);
  // up.y = 0;
  // up.x = 0;
  // up.z = 1;
  // quaternion.setFromAxisAngle(up, 0.5);

  // camera.lookAt(vector);

  camera.updateProjectionMatrix();
};

const fitCameraToObject = (
  camera: Camera,
  object: THREE.Object3D,
  offset?: number,
  controls?: OrbitControls | undefined
) => {
  offset = offset || 1.25;

  const boundingBox = new THREE.Box3();

  // get bounding box of object - this will be used to setup controls and camera
  boundingBox.setFromObject(object);

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  boundingBox.getCenter(center);
  boundingBox.getSize(size);

  // get the max side of the bounding box (fits to width OR height as needed )
  const maxDim = Math.max(size.x, size.y, size.z);

  if (camera.type === 'PerspectiveCamera') {
    const dist = 2 * maxDim;

    // center camera on gcode objects center pos, but twice the maxlen
    // camera.position.x = center.x;
    // camera.position.y = center.y;
    camera.position.z = center.z + dist;

    const fov = 2.2 * Math.atan(maxDim / (2 * dist)) * (180 / Math.PI);
    camera.fov = fov;
  } else {
    const width = maxDim;
    const height = maxDim;

    camera.zoom = Math.min(
      width / (boundingBox.max.x - boundingBox.min.x),
      height / (boundingBox.max.y - boundingBox.min.y)
    );
  }
  camera.updateProjectionMatrix();

  if (controls) {
    // set camera to rotate around center of loaded object
    controls.target = center;
    controls.saveState();
  } else {
    camera.lookAt(center);
  }
};

const makeSprite = (rendererType: string, vals: ISpriteValue): THREE.Object3D => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let metrics = null;
  let textHeight = 20;
  let textWidth = 0;
  let actualFontSize = 10;

  const txt = vals.text;
  if (vals.size) actualFontSize = vals.size;

  if (context) {
    context.font = `normal ${textHeight}px Arial`;
    metrics = context.measureText(txt);
    textWidth = metrics.width;

    canvas.width = textWidth;
    canvas.height = textHeight;
    context.font = `normal ${textHeight}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = vals.color;

    context.fillText(txt, textWidth / 2, textHeight / 2);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearMipMapNearestFilter;
    texture.magFilter = THREE.LinearFilter;
    // texture.generateMipmaps = false;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6
    });

    const textObject = new THREE.Object3D();
    textObject.position.x = vals.x;
    textObject.position.y = vals.y;
    textObject.position.z = vals.z;

    const sprite = new THREE.Sprite(material);
    textHeight = actualFontSize;
    textWidth = (textWidth / textHeight) * textHeight;

    if (rendererType == '2d') {
      sprite.scale.set(textWidth / textWidth, textHeight / textHeight, 1);
    } else {
      sprite.scale.set((textWidth / textHeight) * actualFontSize, actualFontSize, 1);
    }

    textObject.add(sprite);

    return textObject;
  }
  return new THREE.Object3D();
};

const SetupAxes = () => {
  const { scene } = useThree();
  useEffect(() => {
    // axes
    const axesgrp = new THREE.Object3D();
    const axes = new THREE.AxesHelper(100);
    axes.position.set(0, 0, -0.0001);
    axesgrp.add(axes);

    // add axes labels
    const xlbl = makeSprite('webgl', {
      x: 110,
      y: 0,
      z: 0,
      text: 'X',
      color: '#ff0000' // red
    });
    const ylbl = makeSprite('webgl', {
      x: 0,
      y: 110,
      z: 0,
      text: 'Y',
      color: '#00ff00' // green
    });
    const zlbl = makeSprite('webgl', {
      x: 0,
      y: 0,
      z: 110,
      text: 'Z',
      color: '#0000ff' // blue
    });

    axesgrp.add(xlbl);
    axesgrp.add(ylbl);
    axesgrp.add(zlbl);

    scene.add(axesgrp);
  }, []);

  return null;
};

const SetupGrid = () => {
  const { scene } = useThree();
  useEffect(() => {
    // draw grid
    const widthHeightOfGrid = 100 * 4; // 200 mm grid should be reasonable
    const subSectionsOfGrid = 10 * 4; // 10mm (1 cm) is good for mm work

    const helper = new THREE.GridHelper(widthHeightOfGrid, subSectionsOfGrid, 0x0000ff, 0x808080);
    helper.position.y = 0;
    helper.position.x = 0;
    helper.position.z = 0;
    helper.rotation.x = (90 * Math.PI) / 180;
    helper.receiveShadow = false;

    scene.add(helper);
  }, []);

  return null;
};

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

const SvgModel = ({ svgMarkup }: { svgMarkup: string }) => {
  const loader = new SVGLoader();
  const svgData = loader.parse(svgMarkup);

  // Group that will contain all of our paths
  const svgGroup = new THREE.Group();

  // When importing SVGs paths are inverted on Y axis
  // it happens in the process of mapping from 2d to 3d coordinate system
  svgGroup.scale.y *= -1;

  const material = new THREE.MeshNormalMaterial();

  // Loop through all of the parsed paths
  svgData.paths.forEach((path, i) => {
    const shapes = path.toShapes(true);

    // Each path has array of shapes
    shapes.forEach((shape, j) => {
      // Finally we can take each shape and extrude it
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 20,
        bevelEnabled: false
      });

      geometry.center();

      // Create a mesh and add it to the group
      const mesh = new THREE.Mesh(geometry, material);

      svgGroup.add(mesh);
    });
  });

  const group = useMemo(() => svgGroup, []);
  return <primitive object={group} position={[0, 0, 0]} />;
};

const Model = ({ drawModel, showArrows }: { drawModel: DrawingModel; showArrows: boolean }) => {
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
      depthWrite: false
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

  const { scene, camera } = useThree();
  fitCameraToObject(camera, svgGroup);
  // viewExtents(scene, camera, svgGroup);

  const group = useMemo(() => svgGroup, [drawModel]);
  return <primitive object={group} position={[0, 0, 0]} />;
};

const MyScene: React.FC<ISceneProps> = ({ drawModel, showArrows }) => (
  <>
    <SetupCamera orthographic={false} />
    <SetupGrid />
    <SetupAxes />
    {/* <SvgModel svgMarkup='<path fill="none" d="M201,1 L201,201 L1,201 L1,1 L201,1 Z M53.27053,71 L37.6666667,71 L37.6666667,134.333333 L53.27053,134.333333 L53.27053,86.6038647 C59.2367133,86.879227 66.1207733,91.1014493 66.1207733,99.9130433 L66.1207733,134.333333 L80.4396133,134.333333 L80.4396133,99.9130433 C80.4396133,91.1014493 87.32367,86.879227 93.2898567,86.6038647 L93.2898567,134.333333 L110.63768,134.333333 L110.63768,86.6038647 C116.603863,86.879227 123.487923,91.1014493 123.487923,99.9130433 L123.487923,134.333333 L137.806763,134.333333 L137.806763,99.9130433 C137.806763,91.1014493 144.69082,86.879227 150.657003,86.6038647 L150.657003,134.333333 L166.26087,134.333333 L166.26087,71 L150.657003,71 C142.120773,71 133.859903,75.589372 130.647343,80.178744 C127.434783,75.589372 119.173913,71 110.63768,71 L93.2898567,71 C84.7536233,71 76.4927533,75.589372 73.2801933,80.178744 C70.0676333,75.589372 61.8067633,71 53.27053,71 Z" stroke="#979797"></path>'></SvgModel> */}
    <Model drawModel={drawModel} showArrows={showArrows} />
  </>
);

export default MyScene;
