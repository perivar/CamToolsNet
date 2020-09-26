import React, { useEffect } from 'react';
import { Stage, Layer, Circle, Line, Arc, Shape } from 'react-konva';
import Konva from 'konva';
import './KonvaCanvas.scss';
import {
  Bounds,
  PointF,
  DrawingModel,
  DrawCircle,
  DrawLine,
  DrawArc,
  DrawPolyline,
  DrawPolylineLW
} from '../types/DrawingModel';

interface IKonvaCanvasProps {
  drawModel: DrawingModel;
  showArrows: boolean;
}

const { PI } = Math;
const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const ArrowHead = (endX: number, endY: number, angle: number, arrowLen: number, color: string) => {
  return (
    <Shape
      sceneFunc={(context, shape) => {
        // draw arrow head as filled triangle
        context.beginPath();
        context.moveTo(endX, endY);
        context.lineTo(
          endX - arrowLen * Math.cos(angle - Math.PI / 6),
          endY - arrowLen * Math.sin(angle - Math.PI / 6)
        );
        context.lineTo(
          endX - arrowLen * Math.cos(angle + Math.PI / 6),
          endY - arrowLen * Math.sin(angle + Math.PI / 6)
        );
        context.lineTo(endX, endY);
        context.closePath();

        // (!) Konva specific method, it is very important
        context.fillStrokeShape(shape);
      }}
      fill={color}
    />
  );
};

const Drawing = (props: IKonvaCanvasProps): any => {
  // return <Circle radius={5} fill="green" x={localPos.x} y={localPos.y} />;

  let lineColor;
  const strokeWidth = 0.3;
  const arrowLen = 0.8; // length of head in pixels

  return (
    <>
      {props.drawModel.circles.map((circle: DrawCircle, i: number) => {
        // const startAngle = 0;
        // const endAngle = 2 * Math.PI;
        const { x } = circle.center;
        const { y } = circle.center;
        const { radius } = circle;
        return <Circle key={i++} radius={radius} stroke="#0000ff" strokeWidth={strokeWidth} x={x} y={y} />;
      })}
      {props.drawModel.lines.map((line: DrawLine, i: number) => {
        const startX = line.startPoint.x;
        const startY = line.startPoint.y;
        const endX = line.endPoint.x;
        const endY = line.endPoint.y;

        // don't draw if the start end points for x and y are the same
        // likely a z only move
        if (startX !== endX || startY !== endY) {
          const dx = endX - startX;
          const dy = endY - startY;
          const angle = Math.atan2(dy, dx);

          if (line.isVisible) {
            lineColor = '#44cc44';
          } else {
            lineColor = '#44ccff';
          }

          return (
            <>
              {/* {props.drawModel ? <ArrowHead {...endX} {...endY} {...angle} {...arrowLen} {...lineColor} /> : <></>} */}
              <Line key={i++} stroke={lineColor} strokeWidth={strokeWidth} points={[startX, startY, endX, endY]} />;
            </>
          );
        }
        return <></>;
      })}

      {props.drawModel.arcs.map((a: DrawArc, i: number) => {
        const centerX = a.center.x;
        const centerY = a.center.y;
        const { radius } = a;
        const { startAngle } = a;
        const { endAngle } = a;

        // since we have flipped the y orgin, we have to draw counter clockwise
        const isCounterClockwise = false;

        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        if (isCounterClockwise) {
          endX = centerX + Math.cos(startAngle * DEG_TO_RAD) * radius;
          endY = centerY + Math.sin(startAngle * DEG_TO_RAD) * radius;
          startX = centerX + Math.cos(endAngle * DEG_TO_RAD) * radius;
          startY = centerY + Math.sin(endAngle * DEG_TO_RAD) * radius;
        } else {
          startX = centerX + Math.cos(startAngle * DEG_TO_RAD) * radius;
          startY = centerY + Math.sin(startAngle * DEG_TO_RAD) * radius;
          endX = centerX + Math.cos(endAngle * DEG_TO_RAD) * radius;
          endY = centerY + Math.sin(endAngle * DEG_TO_RAD) * radius;
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
            arrowAngle = Math.atan2(dy, dx) - HALF_PI; // counter clockwise
            sAngle = endAngle * DEG_TO_RAD;
            eAngle = startAngle * DEG_TO_RAD;
          } else {
            arrowAngle = Math.atan2(dy, dx) + HALF_PI; // clockwise
            sAngle = startAngle * DEG_TO_RAD;
            eAngle = endAngle * DEG_TO_RAD;
          }

          // draw arrow head
          // if (this.props.showArrows) this.drawArrowHead(context, endX, endY, arrowAngle, arrowLen, '#000000');

          return (
            <Shape
              sceneFunc={(context, shape) => {
                // draw arc
                context.beginPath(); // begin
                context.moveTo(startX, startY);
                context.arc(centerX, centerY, radius, sAngle, eAngle, isCounterClockwise);
                context.moveTo(endX, endY);
                context.closePath(); // end

                // (!) Konva specific method, it is very important
                context.fillStrokeShape(shape);
              }}
              stroke="#000000"
              strokeWidth={strokeWidth}
            />
          );
        }
        return <></>;
      })}
    </>
  );
};
Drawing.displayName = 'Drawing';

export const KonvaCanvas = (props: IKonvaCanvasProps): JSX.Element => {
  const [localPos, setPos] = React.useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = React.useState({ width: 0, height: 0 });
  const [stageInfo, setStageInfo] = React.useState({ stageScale: 1, stageX: 0, stageY: 0 });

  const canvasDivRef = React.useRef<HTMLDivElement>(null);
  const layerRef = React.useRef<Konva.Layer>(null);

  const updateCanvasSize = () => {
    if (canvasDivRef.current) {
      const canvasWidth = canvasDivRef.current.clientWidth;
      const canvasHeight = canvasDivRef.current.clientHeight;

      setCanvasSize({ width: canvasWidth, height: canvasHeight });
    }
  };

  const handleResize = () => {
    // get current size of the canvas
    if (canvasDivRef.current) {
      // console.log(`resize canvas div width: ${canvasDivRef.current.clientWidth}`);
      // console.log(`resize canvas div height: ${canvasDivRef.current.clientHeight}`);

      updateCanvasSize();
      // zoomToFit();
      // draw(this.scale, this.translatePos);
    }
  };

  useEffect(() => {
    // code to run on component mount

    // subscribe event
    window.addEventListener('resize', handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    return () => {
      // unsubscribe event
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const scaleBy = 1.05;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setStageInfo({
      stageScale: newScale,
      stageX: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      stageY: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
    });
  };

  return (
    <>
      <div ref={canvasDivRef} id="canvasDiv">
        <Stage
          width={canvasSize.width}
          height={canvasSize.height}
          onWheel={handleWheel}
          scaleX={stageInfo.stageScale}
          scaleY={stageInfo.stageScale}
          x={stageInfo.stageX}
          y={stageInfo.stageY}
          draggable
          // onMouseMove={(e) => {
          //   if (layerRef.current != null) {
          //     const transform = layerRef.current.getAbsoluteTransform().copy();

          //     // to detect relative position we need to invert transform
          //     transform.invert();

          //     // now we find relative point
          //     if (e.target != null) {
          //       const pos = e.target.getStage()!.getPointerPosition();
          //       const circlePos = transform.point(pos!);

          //       setPos(circlePos);
          //     }
          //   }
          // }}
        >
          <Layer x={5} y={5} scaleX={1} scaleY={1} ref={layerRef}>
            <Drawing {...props} />
          </Layer>
        </Stage>
      </div>
    </>
  );
};
