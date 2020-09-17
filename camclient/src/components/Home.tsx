import React from 'react';
import { Alert, Spinner, Button, Card, Col, Container, Row } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import axios from 'axios';
import './Home.scss';
import DrawingCanvas from './DrawingCanvas';
import { Arc, Circle, DrawingModel, Line, Polyline, PolylineLW } from '../types/DrawingModel';

// read from .env files
const config = { apiUrl: process.env.REACT_APP_API };

export interface IHomeState {
  isLoading: boolean;
  isError: boolean;
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
        polylines: [],
        polylinesLW: []
      }
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

  private onDrop = (acceptedFiles: any) => {
    console.log(acceptedFiles);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const formData = new FormData();
      formData.append('files', acceptedFiles[i]);
      formData.append('description', acceptedFiles[i].name);
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

  private onPolyToCircle = () => {
    axios
      .get(`${config.apiUrl}/PolylineToCircles`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform poly to circle.', error);
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
        console.error('Unable to perform Trim.', error);
      });
  };

  private onRotate = () => {
    axios
      .get(`${config.apiUrl}/Rotate/45`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform Rotate.', error);
      });
  };

  private onSplit = () => {
    axios
      .get(`${config.apiUrl}/Split/100/0/5`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform Split.', error);
      });
  };

  private onTrimDisabled = () => {
    const { drawModel } = this.state;

    drawModel.circles.forEach((circle: Circle) => {
      if (circle.isVisible) {
        circle.center.x -= drawModel.bounds.min.x;
        circle.center.y -= drawModel.bounds.min.y;
      }
    });

    drawModel.lines.forEach((line: Line) => {
      if (line.isVisible) {
        line.startPoint.x -= drawModel.bounds.min.x;
        line.startPoint.y -= drawModel.bounds.min.y;
        line.endPoint.x -= drawModel.bounds.min.x;
        line.endPoint.y -= drawModel.bounds.min.y;
      }
    });

    drawModel.arcs.forEach((a: Arc) => {
      if (a.isVisible) {
        a.center.x -= drawModel.bounds.min.x;
        a.center.y -= drawModel.bounds.min.y;
      }
    });

    drawModel.polylines.forEach((p: Polyline) => {
      if (p.isVisible && p.vertexes.length >= 2) {
        for (let i = 0; i < p.vertexes.length; i++) {
          const vertex = p.vertexes[i];
          vertex.x -= drawModel.bounds.min.x;
          vertex.y -= drawModel.bounds.min.y;
        }
      }
    });

    drawModel.polylinesLW.forEach((p: PolylineLW) => {
      if (p.isVisible && p.vertexes.length >= 2) {
        for (let i = 0; i < p.vertexes.length; i++) {
          const vertex = p.vertexes[i];
          vertex.position.x -= drawModel.bounds.min.x;
          vertex.position.y -= drawModel.bounds.min.y;
        }
      }
    });

    // update state
    this.setState({ isLoading: false, drawModel });
  };

  render() {
    const { isLoading, isError, drawModel } = this.state;
    return (
      <Container fluid>
        <Row className="my-2">
          <Col xs={3} className="px-0 py-0 mx-1">
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
              <DrawingCanvas drawModel={drawModel} />
            )}
          </Col>
          <Col className="px-0 py-0 mx-1">
            <Button className="mb-1" title="Trim" variant="info" onClick={this.onTrim} size="sm">
              Trim X and Y
            </Button>
            {/* <Button className="mb-1" title="Rotate" variant="info" onClick={this.onRotate} size="sm">
              Rotate 45 degrees
            </Button> */}
            {/* <Button className="mb-1" title="Split" variant="info" onClick={this.onSplit} size="sm">
              Split
            </Button> */}
            <Button className="mb-1" title="ConvertToCircles" variant="info" onClick={this.onPolyToCircle} size="sm">
              Poly to Circle
            </Button>
            <a className="btn btn-info btn-sm" href={`${config.apiUrl}/CirclesToLayers/false`}>
              Circles to Layers
            </a>
          </Col>
        </Row>
      </Container>
    );
  }
}
