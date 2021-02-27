import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DrawingModel } from '../types/DrawingModel';
import { ToObject3D } from './3DModel';

interface IDrawingCanvasProps {
  drawModel: DrawingModel;
  showArrows: boolean;
  showInfo: boolean;
  xSplit: number;
}

class Scene extends React.PureComponent<IDrawingCanvasProps> {
  containerRef: React.RefObject<HTMLDivElement>;
  container?: HTMLDivElement;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  object?: THREE.Object3D;
  spotLight?: THREE.SpotLight;
  controls?: OrbitControls;
  width = 0;
  height = 0;
  frameId = 0;

  constructor(props: IDrawingCanvasProps) {
    super(props);
    this.state = {};
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.animate = this.animate.bind(this);
    this.renderScene = this.renderScene.bind(this);
    this.computeBoundingBox = this.computeBoundingBox.bind(this);
    this.setupScene = this.setupScene.bind(this);
    this.destroyContext = this.destroyContext.bind(this);
    this.handleWindowResize = this.handleWindowResize.bind(this);

    this.containerRef = React.createRef<HTMLDivElement>();
  }

  componentDidMount() {
    if (this.containerRef.current) {
      this.container = this.containerRef.current;
    }

    window.addEventListener('resize', this.handleWindowResize);
    this.setupScene(this.props.drawModel, this.props.showArrows);
  }

  setupScene(drawModel: DrawingModel, showArrows: boolean) {
    this.width = this.container?.clientWidth || 0;
    this.height = this.container?.clientHeight || 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    const camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    scene.add(camera);

    const svgGroup = ToObject3D(drawModel, showArrows);
    scene.add(svgGroup);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.object = svgGroup;

    // const spotLight = new THREE.SpotLight(0xffffff, 0.25);
    // spotLight.position.set(45, 50, 15);
    // camera.add(spotLight);
    // this.spotLight = spotLight;

    // const ambLight = new THREE.AmbientLight(0x333333);
    // ambLight.position.set(5, 3, 5);
    // this.camera.add(ambLight);

    this.computeBoundingBox();
  }

  computeBoundingBox() {
    if (this.object && this.camera && this.renderer && this.container) {
      const offset = 2.6;
      const boundingBox = new THREE.Box3();
      boundingBox.setFromObject(this.object);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      boundingBox.getCenter(center);
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = this.camera.fov * (Math.PI / 180);
      let cameraZ = maxDim / 2 / Math.tan(fov / 2);
      cameraZ *= offset;
      this.camera.position.z = center.z + cameraZ;
      const minZ = boundingBox.min.z;
      const cameraToFarEdge = minZ < 0 ? -minZ + cameraZ : cameraZ - minZ;

      this.camera.far = cameraToFarEdge * 3;
      this.camera.lookAt(center);
      this.camera.updateProjectionMatrix();

      const controls = new OrbitControls(this.camera, this.renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.zoomSpeed = 0.1;
      controls.enableKeys = false;
      controls.screenSpacePanning = false;
      controls.enableRotate = true;
      controls.autoRotate = true;
      controls.dampingFactor = 1;
      controls.autoRotateSpeed = 1.2;
      controls.enablePan = false;
      controls.target.set(center.x, center.y, center.z);
      controls.update();
      this.controls = controls;

      this.renderer.setSize(this.width, this.height);
      this.container.appendChild(this.renderer.domElement);
      this.start();
    }
  }

  start() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  renderScene() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  animate() {
    this.frameId = requestAnimationFrame(this.animate);
    if (this.controls) this.controls.update();
    this.renderScene();
  }

  stop() {
    cancelAnimationFrame(this.frameId);
  }

  handleWindowResize() {
    if (this.camera) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  componentWillUnmount() {
    this.stop();
    this.destroyContext();
  }

  destroyContext() {
    if (this.container && this.renderer) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.forceContextLoss();
      // this.renderer.context = null;
      // this.renderer.domElement = null;
      // this.renderer = null;
    }
  }

  render() {
    const width = '100%';
    const height = '100%';
    return (
      <div
        ref={this.containerRef}
        style={{
          width,
          height,
          position: 'absolute',
          overflow: 'hidden'
        }}></div>
    );
  }
}

export default Scene;
