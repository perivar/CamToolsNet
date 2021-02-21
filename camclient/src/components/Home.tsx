import React from 'react';
import {
  Alert,
  Spinner,
  Button,
  Card,
  Col,
  Container,
  Row,
  Form,
  Accordion,
  DropdownButton,
  Dropdown
} from 'react-bootstrap';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';
import Dropzone from 'react-dropzone';
import axios from 'axios';
import './Home.scss';
import { DrawArc, DrawCircle, DrawingModel, DrawLine, DrawPolyline } from '../types/DrawingModel';
import FontFaceObserver from 'fontfaceobserver';
// import { Canvas } from 'react-three-fiber';
// import FiberScene from './FiberScene';
// import Controls from './Controls';
// import Scene from './Scene';
import ThreeScene from './ThreeScene';
import DrawingCanvas from './DrawingCanvas';
// import { KonvaCanvas } from './KonvaCanvas';
// import FabricCanvas from './FabricCanvas';
import opentype from 'opentype.js';

// read from .env files
const config = { apiUrl: process.env.REACT_APP_API };

export interface IHomeState {
  isLoading: boolean;
  isError: boolean;
  xSplit: number;
  splitIndex: number;
  rotateDegrees: number;
  scaleFactor: number;
  showArrows: boolean;
  showInfo: boolean;
  textValue: string;
  textFont: string;
  textFontSize: number;
  textStartX: number;
  textStartY: number;
  textFonts: string[];
  show3D: boolean;
  drawModel: DrawingModel;
}

const loadFont = async (url: string): Promise<opentype.Font> => {
  return await new Promise((resolve, reject) =>
    opentype.load(url, (err: any, font: any) => (err ? reject(err) : resolve(font)))
  );
};

export default class Home extends React.PureComponent<{}, IHomeState> {
  // save opentype fonts in dictionary
  private opentypeDictionary: { [key: string]: opentype.Font } = {};

  constructor(props: any) {
    super(props);

    this.state = {
      isLoading: true,
      isError: false,
      drawModel: {
        fileName: '',
        bounds: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        circles: [],
        lines: [],
        arcs: [],
        polylines: [],
        texts: []
      },
      xSplit: 0,
      splitIndex: 0,
      rotateDegrees: 45,
      scaleFactor: 2,
      showArrows: false,
      showInfo: false,
      textValue: '',
      textFont: '',
      textFontSize: 10,
      textStartX: 0,
      textStartY: 0,
      textFonts: [],
      show3D: false
    };
  }

  componentDidMount() {
    const opentypeFonts: { [key: string]: string } = {
      Pacifico: 'Pacifico-Regular.ttf',
      VT323: 'VT323-Regular.ttf',
      Quicksand: 'Quicksand-VariableFont_wght.ttf',
      Inconsolata: 'Inconsolata-VariableFont_wdth,wght.ttf'
    };

    // Make one observer for each font,
    // by iterating over the data we already have
    const fontObservers: any[] = [];
    Object.keys(opentypeFonts).forEach((fontKey) => {
      const obs = new FontFaceObserver(fontKey);
      fontObservers.push(obs.load());
    });

    // load all fonts as normal fonts
    Promise.all(fontObservers).then(
      (fonts) => {
        fonts.forEach((font) => {
          console.log(`Normal font ${font.family} loaded`);
          this.state.textFonts.push(font.family);
        });
        // this.setState({ isLoading: false });
        // set first font as selected
        this.setState({ textFont: this.state.textFonts[0] });
      },
      (err) => {
        console.error('Failed to load fonts!', err);
        // this.setState({ isLoading: false });
      }
    );

    // load all fonts as opentype fonts
    Object.keys(opentypeFonts).forEach((fontKey) => {
      // console.log(`Processing opentype font ${fontKey}...`);
      const fontFileName = opentypeFonts[fontKey];
      loadFont(`fonts/${fontFileName}`)
        .then((font: opentype.Font) => {
          const fontName = font.names.fullName.en.toLowerCase();
          console.log(`Opentype font ${fontName} loaded`);
          // store in dictionary
          if (font) {
            this.opentypeDictionary[fontKey] = font;
          }
        })
        .catch((err) => {
          alert(`Font could not be loaded: ${err}`);
        });
    });

    this.getDrawModel();
  }

  private getDrawModel = () => {
    axios
      .get(`${config.apiUrl}`, { withCredentials: true })
      .then((response) => {
        const { data } = response;
        this.setState({ isLoading: false, drawModel: data });
        console.log(`Succesfully retrieved the draw model: ${data.fileName}`);
      })
      .catch((error) => {
        this.setState({ isError: true, isLoading: false });
        console.error('Unable to retrieve draw model.', error);
      });
  };

  private getDrawModelSplit = () => {
    axios
      .get(`${config.apiUrl}/GetSplit/${this.state.splitIndex}`, { withCredentials: true })
      .then((response) => {
        const { data } = response;
        this.setState({ isLoading: false, drawModel: data });
        console.log(`Succesfully retrieved the split model: ${data.fileName} - ${this.state.splitIndex}`);
      })
      .catch((error) => {
        this.setState({ isError: true, isLoading: false });
        console.error('Unable to retrieve split model.', error);
      });
  };

  private onDrop = (acceptedFiles: any) => {
    console.log(acceptedFiles);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const formData = new FormData();
      formData.append('files', acceptedFiles[i]);
      formData.append('description', acceptedFiles[i].name);
      formData.append('useContours', 'false');
      axios
        .post(`${config.apiUrl}/Upload`, formData, {
          withCredentials: true
        })
        .then(() => {
          this.getDrawModel();
        })
        .catch((e) => {
          console.log(e);
        });
    }
  };

  private onXSplitChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const splitValue = parseInt(value, 10);
    this.setState({ xSplit: splitValue });
  };

  private onSplitIndexChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const splitSideValue = parseInt(value, 10);
    this.setState({ splitIndex: splitSideValue });
  };

  private onReload = (): void => {
    this.getDrawModel();
  };

  private onShowArrowsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const flipArrowSet = value === 'false';
    this.setState({ showArrows: flipArrowSet });
  };

  private onShowInfoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const flipInfoSet = value === 'false';
    this.setState({ showInfo: flipInfoSet });
  };

  private onRotateDegressChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const degreeValue = parseInt(value, 10);
    this.setState({ rotateDegrees: degreeValue });
  };

  private onScaleFactorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const scaleValue = parseFloat(value);
    this.setState({ scaleFactor: scaleValue });
  };

  private onTextValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    this.setState({ textValue: value });
  };

  private onTextFontSelect = (eventKey: string | null, e: React.SyntheticEvent<unknown>): void => {
    if (eventKey) {
      this.setState({ textFont: eventKey });
    }
  };

  private onTextFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const sizeValue = parseFloat(value);
    this.setState({ textFontSize: sizeValue });
  };

  private onTextStartXChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const posValue = parseFloat(value);
    this.setState({ textStartX: posValue });
  };

  private onTextStartYChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = e.currentTarget;
    const posValue = parseFloat(value);
    this.setState({ textStartY: posValue });
  };

  private onModeChange = (checked: boolean): void => {
    this.setState({ show3D: checked });
  };

  private onPolyToCircle = () => {
    axios
      .get(`${config.apiUrl}/PolylineToCircles/true`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform poly to circle.', error);
      });
  };

  private onFlatten = () => {
    axios
      .get(`${config.apiUrl}/Flatten/true`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform flatten.', error);
      });
  };

  private onTrim = () => {
    axios
      .get(`${config.apiUrl}/Trim`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform trim.', error);
      });
  };

  private onRotate = () => {
    axios
      .get(`${config.apiUrl}/Rotate/${this.state.rotateDegrees}`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform rotate.', error);
      });
  };

  private onScale = () => {
    axios
      .get(`${config.apiUrl}/Scale/${this.state.scaleFactor}`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform scaling.', error);
      });
  };

  private onSplit = () => {
    axios
      .get(`${config.apiUrl}/Split/${this.state.xSplit}/0/5`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModelSplit();
      })
      .catch((error) => {
        console.error('Unable to perform split.', error);
      });
  };

  private onSaveSplit = () => {
    axios
      .get(`${config.apiUrl}/SaveSplit/${this.state.splitIndex}`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to save split model.', error);
      });
  };

  private onGetSplit = () => {
    this.getDrawModelSplit();
  };

  private onTextAdd = () => {
    const formData = new FormData();
    formData.append('text', this.state.textValue);
    formData.append('font', this.state.textFont);
    formData.append('fontSize', `${this.state.textFontSize}`);
    formData.append('startX', `${this.state.textStartX}`);
    formData.append('startY', `${this.state.textStartY}`);
    axios
      .post(`${config.apiUrl}/AddText`, formData, {
        withCredentials: true
      })
      .then(() => {
        this.getDrawModel();
      })
      .catch((e) => {
        console.log(e);
      });
  };

  private onTrimDisabled = () => {
    const { drawModel } = this.state;

    drawModel.circles.forEach((circle: DrawCircle) => {
      if (circle.isVisible) {
        circle.center.x -= drawModel.bounds.min.x;
        circle.center.y -= drawModel.bounds.min.y;
      }
    });

    drawModel.lines.forEach((line: DrawLine) => {
      if (line.isVisible) {
        line.startPoint.x -= drawModel.bounds.min.x;
        line.startPoint.y -= drawModel.bounds.min.y;
        line.endPoint.x -= drawModel.bounds.min.x;
        line.endPoint.y -= drawModel.bounds.min.y;
      }
    });

    drawModel.arcs.forEach((a: DrawArc) => {
      if (a.isVisible) {
        a.center.x -= drawModel.bounds.min.x;
        a.center.y -= drawModel.bounds.min.y;
      }
    });

    drawModel.polylines.forEach((p: DrawPolyline) => {
      if (p.isVisible && p.vertexes.length >= 2) {
        for (let i = 0; i < p.vertexes.length; i++) {
          const vertex = p.vertexes[i];
          vertex.x -= drawModel.bounds.min.x;
          vertex.y -= drawModel.bounds.min.y;
        }
      }
    });

    // update state
    this.setState({ isLoading: false, drawModel });
  };

  render() {
    const { isLoading, isError, drawModel, showArrows, showInfo } = this.state;
    return (
      <Container fluid>
        <Row className="my-2">
          <Col xs={2} className="px-0 py-0 mx-1">
            <Card className="mb-2">
              <Card.Header>
                <b>CAM tools</b> - read dxf, svg and gcode
              </Card.Header>
              <BootstrapSwitchButton
                checked={this.state.show3D}
                size="sm"
                onlabel="3D"
                offlabel="2D"
                onChange={this.onModeChange}
              />
            </Card>
            <Dropzone onDrop={this.onDrop}>
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div {...getRootProps()} className="drop-zone">
                  <input {...getInputProps()} />
                  {isDragActive ? "Drop it like it's hot!" : 'Click me or drag a file to upload!'}
                </div>
              )}
            </Dropzone>
            <Card className="mt-2 mb-2">
              <Card.Header>Add Text</Card.Header>
              <Card.Body>
                <Form className="align-items-center">
                  <Form.Row>
                    <Col>
                      <DropdownButton
                        className="mb-1"
                        onSelect={this.onTextFontSelect}
                        title={`${this.state.textFont} `}
                        id="font-selection"
                        size="sm"
                        variant="secondary">
                        {this.state.textFonts.map((font) => (
                          <Dropdown.Item key={font} eventKey={font} selected={font === this.state.textFont}>
                            {font}
                          </Dropdown.Item>
                        ))}
                      </DropdownButton>
                    </Col>
                  </Form.Row>
                  <Form.Row>
                    <Col>
                      <Form.Label column="sm">Size:</Form.Label>
                    </Col>
                    <Col>
                      <Form.Control
                        size="sm"
                        type="number"
                        step="any"
                        defaultValue={this.state.textFontSize}
                        onChange={this.onTextFontSizeChange}
                      />
                    </Col>
                  </Form.Row>
                  <Form.Row>
                    <Col>
                      <Form.Label column="sm">Pos:</Form.Label>
                    </Col>
                    <Col>
                      <Form.Control
                        className="mt-1"
                        size="sm"
                        type="number"
                        step="any"
                        defaultValue={this.state.textStartX}
                        onChange={this.onTextStartXChange}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        className="mt-1"
                        size="sm"
                        type="number"
                        step="any"
                        defaultValue={this.state.textStartY}
                        onChange={this.onTextStartYChange}
                      />
                    </Col>
                  </Form.Row>
                  <Form.Row>
                    <Form.Control
                      className="mt-1"
                      size="sm"
                      type="text"
                      defaultValue={this.state.textValue}
                      onChange={this.onTextValueChange}
                    />
                  </Form.Row>
                  <Form.Row>
                    <Button className="mb-1 mt-1" title="AddText" variant="info" onClick={this.onTextAdd} size="sm">
                      Add
                    </Button>
                  </Form.Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={8} className="px-0 py-0 mx-1">
            {isError ? (
              <Alert variant="danger">Loading drawing failed ...</Alert>
            ) : isLoading ? (
              <Alert variant="info">
                <Spinner animation="border" role="status">
                  <span className="sr-only">Loading drawing...</span>
                </Spinner>
                <div>Loading drawing ...</div>
              </Alert>
            ) : (
              <>
                {this.state.show3D ? (
                  // <Scene drawModel={drawModel} showArrows={showArrows} showInfo={showInfo} xSplit={this.state.xSplit} />
                  // <Canvas>
                  //   <FiberScene
                  //     drawModel={drawModel}
                  //     showArrows={showArrows}
                  //     showInfo={showInfo}
                  //     xSplit={this.state.xSplit}
                  //   />
                  //   <Controls />
                  // </Canvas>
                  <ThreeScene
                    drawModel={drawModel}
                    showArrows={showArrows}
                    showInfo={showInfo}
                    xSplit={this.state.xSplit}
                    opentypeDictionary={this.opentypeDictionary}
                  />
                ) : (
                  <DrawingCanvas
                    drawModel={drawModel}
                    showArrows={showArrows}
                    showInfo={showInfo}
                    xSplit={this.state.xSplit}
                  />
                )}
              </>
            )}
          </Col>
          <Col className="px-0 py-0 mx-1">
            <Accordion defaultActiveKey="3">
              <Card>
                <Accordion.Toggle as={Card.Header} eventKey="0">
                  Split
                </Accordion.Toggle>
                <Accordion.Collapse eventKey="0">
                  <Card.Body className="px-1 py-1">
                    <Form className="align-items-center">
                      <Form.Row>
                        <Col>
                          <Form.Label column="sm">X:</Form.Label>
                        </Col>
                        <Col>
                          <Form.Control
                            size="sm"
                            type="number"
                            defaultValue={this.state.xSplit}
                            onChange={this.onXSplitChange}
                          />
                        </Col>
                      </Form.Row>
                      <Form.Row>
                        <Col>
                          <Form.Label column="sm">Page:</Form.Label>
                        </Col>
                        <Col>
                          <Form.Check
                            id="split-page-1"
                            inline
                            type="radio"
                            value="0"
                            label="1"
                            checked={this.state.splitIndex === 0}
                            onChange={this.onSplitIndexChange}
                          />
                          <Form.Check
                            id="split-page-2"
                            inline
                            type="radio"
                            value="1"
                            label="2"
                            checked={this.state.splitIndex === 1}
                            onChange={this.onSplitIndexChange}
                          />
                        </Col>
                      </Form.Row>
                      <Form.Row>
                        <Col sm={{ offset: 1 }}>
                          <Button className="mb-1 mr-1" title="Split" variant="info" onClick={this.onSplit} size="sm">
                            Split
                          </Button>
                          <Button
                            className="mb-1 mr-1"
                            title="LoadSplit"
                            variant="info"
                            onClick={this.onGetSplit}
                            size="sm">
                            Load
                          </Button>
                          <Button
                            className="mb-1"
                            title="SaveSplit"
                            variant="info"
                            onClick={this.onSaveSplit}
                            size="sm">
                            Save
                          </Button>
                        </Col>
                      </Form.Row>
                    </Form>
                  </Card.Body>
                </Accordion.Collapse>
              </Card>

              <Card>
                <Accordion.Toggle as={Card.Header} eventKey="1">
                  Rotate
                </Accordion.Toggle>
                <Accordion.Collapse eventKey="1">
                  <Card.Body className="px-1 py-1">
                    <Form className="align-items-center">
                      <Form.Row>
                        <Col>
                          <Form.Label column="sm">Degrees:</Form.Label>
                        </Col>
                        <Col>
                          <Form.Control
                            size="sm"
                            type="number"
                            defaultValue={this.state.rotateDegrees}
                            onChange={this.onRotateDegressChange}
                          />
                        </Col>
                      </Form.Row>
                      <Form.Row>
                        <Col sm={{ span: 10, offset: 2 }}>
                          <Button className="mb-1 mt-1" title="Rotate" variant="info" onClick={this.onRotate} size="sm">
                            Rotate {`${this.state.rotateDegrees}`} degrees
                          </Button>
                        </Col>
                      </Form.Row>
                    </Form>
                  </Card.Body>
                </Accordion.Collapse>
              </Card>

              <Card>
                <Accordion.Toggle as={Card.Header} eventKey="2">
                  Scale
                </Accordion.Toggle>
                <Accordion.Collapse eventKey="2">
                  <Card.Body className="px-1 py-1">
                    <Form className="align-items-center">
                      <Form.Row>
                        <Col>
                          <Form.Label column="sm">Scale:</Form.Label>
                        </Col>
                        <Col>
                          <Form.Control
                            size="sm"
                            type="number"
                            step="any"
                            defaultValue={this.state.scaleFactor}
                            onChange={this.onScaleFactorChange}
                          />
                        </Col>
                      </Form.Row>
                      <Form.Row>
                        <Col sm={{ span: 10, offset: 2 }}>
                          <Button className="mb-1 mt-1" title="Rotate" variant="info" onClick={this.onScale} size="sm">
                            Scale by {`${this.state.scaleFactor}`}
                          </Button>
                        </Col>
                      </Form.Row>
                    </Form>
                  </Card.Body>
                </Accordion.Collapse>
              </Card>

              <Card>
                <Accordion.Toggle as={Card.Header} eventKey="3">
                  Other
                </Accordion.Toggle>
                <Accordion.Collapse eventKey="3">
                  <Card.Body className="px-1 py-1">
                    <Form className="align-items-center">
                      <Form.Row>
                        <Col sm={{ span: 10, offset: 2 }}>
                          <Form.Check
                            type="checkbox"
                            label="Show arrows"
                            value={`${this.state.showArrows}`}
                            checked={this.state.showArrows === true}
                            onChange={this.onShowArrowsChange}
                          />
                          <Form.Check
                            type="checkbox"
                            label="Show info"
                            value={`${this.state.showInfo}`}
                            checked={this.state.showInfo === true}
                            onChange={this.onShowInfoChange}
                          />
                          <Button className="mb-1" title="Trim" variant="info" onClick={this.onTrim} size="sm">
                            Trim X and Y
                          </Button>
                          <Button
                            className="mb-1"
                            title="ConvertToCircles"
                            variant="info"
                            onClick={this.onPolyToCircle}
                            size="sm">
                            Detect Circles
                          </Button>
                          {/* <Button className="mb-1" title="Reload" variant="info" onClick={this.onReload} size="sm">
                        Reload Model
                      </Button> */}
                          <Button className="mb-1" title="Flatten" variant="info" onClick={this.onFlatten} size="sm">
                            Flatten Polyline
                          </Button>
                        </Col>
                      </Form.Row>
                    </Form>
                  </Card.Body>
                </Accordion.Collapse>
              </Card>

              <Card>
                <Card.Header>Save</Card.Header>
                <Card.Body className="px-1 py-1">
                  <Form className="align-items-center">
                    <Form.Row>
                      <Col sm={{ span: 10, offset: 2 }}>
                        <a className="btn btn-info btn-sm mb-1" href={`${config.apiUrl}/CirclesToLayers/false`}>
                          Save DXF w/ Layers
                        </a>
                      </Col>
                      <Col sm={{ span: 10, offset: 2 }}>
                        <a className="btn btn-info btn-sm" href={`${config.apiUrl}/SaveSvg/false`}>
                          Save SVG
                        </a>
                      </Col>
                    </Form.Row>
                  </Form>
                </Card.Body>
              </Card>
            </Accordion>
          </Col>
        </Row>
      </Container>
    );
  }
}
