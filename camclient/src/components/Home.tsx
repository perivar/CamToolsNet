import React from 'react';
import { Alert, Spinner, Button, Card, Col, Container, Row, Form, Accordion } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import axios from 'axios';
import './Home.scss';
import DrawingCanvas from './DrawingCanvas';
import { DrawArc, DrawCircle, DrawingModel, DrawLine, DrawPolyline } from '../types/DrawingModel';
// import { KonvaCanvas } from './KonvaCanvas';
// import FabricCanvas from './FabricCanvas';

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
  drawModel: DrawingModel;
}

export default class Home extends React.PureComponent<{}, IHomeState> {
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
        polylines: []
      },
      xSplit: 0,
      splitIndex: 0,
      rotateDegrees: 45,
      scaleFactor: 2,
      showArrows: false,
      showInfo: false
    };
  }

  componentDidMount() {
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
            </Card>
            <Dropzone onDrop={this.onDrop}>
              {({ getRootProps, getInputProps, isDragActive }) => (
                <div {...getRootProps()} className="drop-zone">
                  <input {...getInputProps()} />
                  {isDragActive ? "Drop it like it's hot!" : 'Click me or drag a file to upload!'}
                </div>
              )}
            </Dropzone>
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
              <DrawingCanvas
                drawModel={drawModel}
                showArrows={showArrows}
                showInfo={showInfo}
                xSplit={this.state.xSplit}
              />
              // <KonvaCanvas drawModel={drawModel} showArrows={showArrows} />
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
