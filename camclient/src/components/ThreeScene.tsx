import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DrawingModel } from '../types/DrawingModel';
import { ToObject3D } from './3DModel';
import './ThreeScene.scss';
import { makeSprite } from './ThreeUI';
import opentype from 'opentype.js';

interface IDrawingCanvasProps {
  drawModel: DrawingModel;
  showArrows: boolean;
  showInfo: boolean;
  xSplit: number;
  opentypeDictionary?: { [key: string]: opentype.Font };
}

class ThreeScene extends React.PureComponent<IDrawingCanvasProps> {
  divRef: React.RefObject<HTMLDivElement>;
  div?: HTMLDivElement;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  object?: THREE.Object3D;
  controls?: OrbitControls;
  requestID?: number;

  constructor(props: IDrawingCanvasProps) {
    super(props);
    this.divRef = React.createRef<HTMLDivElement>();
  }

  componentDidMount() {
    if (this.divRef.current) {
      this.div = this.divRef.current;
    }

    this.setupScene();
    this.setupGrid();
    this.setupAxes();

    // this.addCustomSceneObjects();
    this.addModelToScene(this.props.drawModel, this.props.showArrows, this.props.opentypeDictionary);
    this.startAnimationLoop();

    window.addEventListener('resize', this.handleWindowResize);
  }

  handleWindowResize = () => {
    if (this.div && this.renderer && this.camera) {
      const width = this.div.clientWidth;
      const height = this.div.clientHeight;

      this.renderer.setSize(width, height);
      if (this.camera.type === 'PerspectiveCamera') {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }
    }
  };

  componentWillUnmount() {
    if (this.controls && this.requestID) {
      window.removeEventListener('resize', this.handleWindowResize);
      window.cancelAnimationFrame(this.requestID);
      this.controls.dispose();
    }
  }

  componentDidUpdate(prevProps: IDrawingCanvasProps) {
    // if (prevProps.showArrows !== this.props.showArrows) {
    // }
    // if (prevProps.showInfo !== this.props.showInfo) {
    // }
    // if (prevProps.xSplit !== this.props.xSplit) {
    // }
    if (prevProps.drawModel !== this.props.drawModel) {
      if (this.scene && this.object) {
        this.scene.remove(this.object);
        this.addModelToScene(this.props.drawModel, this.props.showArrows, this.props.opentypeDictionary);
      }
    }
  }

  setupScene = () => {
    if (this.div) {
      // get container dimensions and use them for scene sizing
      const width = this.div.clientWidth;
      const height = this.div.clientHeight;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('white');

      const orthographic = true;
      this.camera = orthographic
        ? new THREE.OrthographicCamera(width / -50, width / 50, height / 50, height / -50, 0.1, 1000)
        : new THREE.PerspectiveCamera(
            75, // fov = field of view
            width / height, // aspect ratio
            0.1, // near plane
            1000 // far plane
          );

      this.controls = new OrbitControls(this.camera, this.div);
      // after that this.controls might be used for enabling/disabling zoom:
      // this.controls.enableZoom = false;

      // set some distance from a cube that is located at z = 0
      this.camera.position.z = 300;

      // Always look at [0, 0, 0]
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setSize(width, height);

      this.div.appendChild(this.renderer.domElement); // mount using React ref
    }
  };

  setupGrid = () => {
    if (this.scene) {
      // draw grid
      const widthHeightOfGrid = 100 * 6; // 100 mm grid should be reasonable
      const subSectionsOfGrid = 10 * 6; // 10mm (1 cm) is good for mm work

      const helper = new THREE.GridHelper(widthHeightOfGrid, subSectionsOfGrid, 0x0000ff, 0x808080);
      helper.position.y = 0;
      helper.position.x = 0;
      helper.position.z = 0;
      helper.rotation.x = (90 * Math.PI) / 180;
      helper.receiveShadow = false;

      this.scene.add(helper);
    }
  };

  setupAxes = () => {
    if (this.scene) {
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

      this.scene.add(axesgrp);
    }
  };

  addCustomSceneObjects = () => {
    if (this.scene) {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshPhongMaterial({
        color: 0x156289,
        emissive: 0x072534,
        side: THREE.DoubleSide,
        flatShading: true
      });
      this.object = new THREE.Mesh(geometry, material);
      this.scene.add(this.object);

      const lights = [];
      lights[0] = new THREE.PointLight(0xffffff, 1, 0);
      lights[1] = new THREE.PointLight(0xffffff, 1, 0);
      lights[2] = new THREE.PointLight(0xffffff, 1, 0);

      lights[0].position.set(0, 200, 0);
      lights[1].position.set(100, 200, 100);
      lights[2].position.set(-100, -200, -100);

      this.scene.add(lights[0]);
      this.scene.add(lights[1]);
      this.scene.add(lights[2]);
    }
  };

  addModelToScene = (
    drawModel: DrawingModel,
    showArrows: boolean,
    opentypeDictionary?: { [key: string]: opentype.Font }
  ) => {
    if (this.scene) {
      const svgGroup = ToObject3D(drawModel, showArrows, opentypeDictionary);
      this.scene.add(svgGroup);
      this.object = svgGroup;

      this.computeBoundingBox();
    }
  };

  computeBoundingBox() {
    if (this.controls && this.camera && this.renderer && this.div && this.object) {
      const offset = 1.2;

      const boundingBox = new THREE.Box3();
      boundingBox.setFromObject(this.object);

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      boundingBox.getCenter(center);
      boundingBox.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);

      if (this.camera.type === 'PerspectiveCamera') {
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = maxDim / 2 / Math.tan(fov / 2);
        cameraZ *= offset;

        this.camera.position.x = center.x;
        this.camera.position.y = center.y;
        this.camera.position.z = center.z + cameraZ;

        const minZ = boundingBox.min.z;
        const cameraToFarEdge = minZ < 0 ? -minZ + cameraZ : cameraZ - minZ;

        this.camera.far = cameraToFarEdge * 20;
        this.camera.lookAt(center);
      } else {
        this.camera.position.x = center.x;
        this.camera.position.y = center.y;

        const width = maxDim / 3;
        const height = maxDim / 3;
        this.camera.zoom = Math.min(
          width / (boundingBox.max.x - boundingBox.min.x),
          height / (boundingBox.max.y - boundingBox.min.y)
        );
      }
      this.camera.updateProjectionMatrix();

      this.controls.target.set(center.x, center.y, center.z);
      this.controls.update();
    }
  }

  startAnimationLoop = () => {
    if (this.renderer && this.camera && this.scene && this.object) {
      // this.object.rotation.x += 0.01;
      // this.object.rotation.y += 0.01;

      this.renderer.render(this.scene, this.camera);
      this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
    }
  };

  render() {
    return <div id="threeContainerDiv" ref={this.divRef}></div>;
  }
}

export default ThreeScene;
