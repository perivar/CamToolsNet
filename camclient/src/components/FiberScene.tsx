import React, { useEffect, useMemo, useRef } from 'react';
import { DrawingModel } from '../types/DrawingModel';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import * as THREE from 'three';
import { useThree, Camera } from 'react-three-fiber';
import { ToObject3D } from './3DModel';
import { makeSprite } from './ThreeUI';

interface OrbitRef {
  obj: {
    update: Function;
  };
  saveState: Function;
  target: any;
}

interface ISceneProps {
  drawModel: DrawingModel;
  showArrows: boolean;
  showInfo: boolean;
  xSplit: number;
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
    cam.position.z = 300;

    // Always look at [0, 0, 0]
    cam.lookAt(0, 0, 0);

    void setDefaultCamera(cam);
  }, []);

  return null;
};

const fitCameraToObject = (
  camera: Camera,
  object: THREE.Object3D,
  offset?: number,
  orbitControls?: OrbitRef | null
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

  if (orbitControls) {
    console.log('orbit controls exist');
    // set camera to rotate around center of loaded object
    orbitControls.target = center;
    orbitControls.saveState();
  } else {
    camera.lookAt(center);
  }
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
  return <primitive object={group} position={[0, 0, 10]} />;
};

const Model = ({ drawModel, showArrows }: { drawModel: DrawingModel; showArrows: boolean }) => {
  const svgGroup = ToObject3D(drawModel, showArrows);

  const { camera } = useThree();
  fitCameraToObject(camera, svgGroup);

  const group = useMemo(() => svgGroup, [drawModel]);
  return <primitive object={group} position={[0, 0, 0]} />;
};

const FiberScene: React.FC<ISceneProps> = ({ drawModel, showArrows }) => (
  <>
    <SetupCamera orthographic={false} />
    <SetupGrid />
    <SetupAxes />
    {/* <SvgModel svgMarkup='<path fill="none" d="M201,1 L201,201 L1,201 L1,1 L201,1 Z M53.27053,71 L37.6666667,71 L37.6666667,134.333333 L53.27053,134.333333 L53.27053,86.6038647 C59.2367133,86.879227 66.1207733,91.1014493 66.1207733,99.9130433 L66.1207733,134.333333 L80.4396133,134.333333 L80.4396133,99.9130433 C80.4396133,91.1014493 87.32367,86.879227 93.2898567,86.6038647 L93.2898567,134.333333 L110.63768,134.333333 L110.63768,86.6038647 C116.603863,86.879227 123.487923,91.1014493 123.487923,99.9130433 L123.487923,134.333333 L137.806763,134.333333 L137.806763,99.9130433 C137.806763,91.1014493 144.69082,86.879227 150.657003,86.6038647 L150.657003,134.333333 L166.26087,134.333333 L166.26087,71 L150.657003,71 C142.120773,71 133.859903,75.589372 130.647343,80.178744 C127.434783,75.589372 119.173913,71 110.63768,71 L93.2898567,71 C84.7536233,71 76.4927533,75.589372 73.2801933,80.178744 C70.0676333,75.589372 61.8067633,71 53.27053,71 Z" stroke="#979797"></path>'></SvgModel> */}
    <Model drawModel={drawModel} showArrows={showArrows} />
  </>
);

export default FiberScene;
