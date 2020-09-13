import React from 'react';
import { Alert, Spinner, Button, Card, Col, Container, Row } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import axios from 'axios';
import './Home.scss';
import DrawingCanvas from './DrawingCanvas';
import { DrawingModel } from '../types/DrawingModel';

const apiUrl = 'http://localhost:5001/api/Editor';

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
      .get(apiUrl, { withCredentials: true })
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
        .post(`${apiUrl}/Upload`, formData, {
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
      .get(`${apiUrl}/PolylineToCircles`, { withCredentials: true })
      .then((response) => {
        console.log(response);
        this.getDrawModel();
      })
      .catch((error) => {
        console.error('Unable to perform poly to circle.', error);
      });
  };

  render() {
    const { isLoading, isError, drawModel } = this.state;
    return (
      <Container fluid>
        <Row className="my-2">
          <Col xs={3} className="px-0 py-0 mx-1">
            <Card className="mb-2">
              <Card.Header>
                <b>CAM tools</b> - dxf, svg and gcode support!
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
            <Button title="ConvertToCircles" variant="info" onClick={this.onPolyToCircle} size="sm">
              Poly to Circle
            </Button>
            <a className="btn btn-info btn-sm my-1" href={`${apiUrl}/CirclesToLayers/false`}>
              Circles to Layers
            </a>
          </Col>
        </Row>
      </Container>
    );
  }
}
