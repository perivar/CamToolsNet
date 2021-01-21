import React, { FC, ReactElement, useEffect } from 'react';
import { Stage, Layer, Circle, Line, Shape } from 'react-konva';
import Konva from 'konva';
import './KonvaCanvas.scss';
import { PointF, DrawingModel, DrawCircle, DrawLine, DrawArc } from '../types/DrawingModel';

interface IKonvaCanvasProps {
  drawModel: DrawingModel;
  showArrows: boolean;
}

interface ArrowHeadProps {
  endX: number;
  endY: number;
  angle: number;
  arrowLen: number;
  color: string;
}

const drawArrowHead = (context: Konva.Context, endX: number, endY: number, angle: number, arrowLen: number) => {
  // draw arrow head as filled triangle
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - arrowLen * Math.cos(angle - Math.PI / 6), endY - arrowLen * Math.sin(angle - Math.PI / 6));
  context.lineTo(endX - arrowLen * Math.cos(angle + Math.PI / 6), endY - arrowLen * Math.sin(angle + Math.PI / 6));
  context.lineTo(endX, endY);
  context.closePath();

  // have to add fill to draw in the arc method
  context.fill();
};

const ArrowHead: FC<ArrowHeadProps> = ({ endX, endY, angle, arrowLen, color }): ReactElement => {
  return (
    <Shape
      sceneFunc={(context, shape) => {
        drawArrowHead(context, endX, endY, angle, arrowLen);

        // (!) Konva specific method, it is very important
        context.fillStrokeShape(shape);
      }}
      fill={color}
    />
  );
};

interface MyArcProps {
  center: PointF;
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
  strokeWidth: number;
  showArrows: boolean;
  arrowLen: number;
}

const MyArc: FC<MyArcProps> = ({
  center,
  radius,
  startAngle,
  endAngle,
  color,
  strokeWidth,
  showArrows,
  arrowLen
}): ReactElement => {
  return (
    <Shape
      sceneFunc={(context, shape) => {
        const centerX = center.x;
        const centerY = center.y;

        // since we have flipped the y orgin, we have to draw counter clockwise
        const isCounterClockwise = false;

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
          if (showArrows) drawArrowHead(context, endX, endY, arrowAngle, arrowLen);

          // draw arc
          context.beginPath(); // begin
          context.moveTo(startX, startY);
          context.arc(centerX, centerY, radius, sAngle, eAngle, isCounterClockwise);
          context.moveTo(endX, endY);
          context.closePath(); // end

          // (!) Konva specific method, it is very important
          context.fillStrokeShape(shape);
        }
      }}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  );
};

const Drawing = (props: IKonvaCanvasProps): ReactElement => {
  const strokeWidth = 0.3;
  const arrowLen = 0.8; // length of head in pixels
  let lineColor;

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
              {props.showArrows ? (
                <ArrowHead endX={endX} endY={endY} angle={angle} arrowLen={arrowLen} color={lineColor} />
              ) : (
                <></>
              )}
              <Line key={i++} stroke={lineColor} strokeWidth={strokeWidth} points={[startX, startY, endX, endY]} />
            </>
          );
        }
        return <></>;
      })}
      {props.drawModel.arcs.map((a: DrawArc, i: number) => {
        lineColor = '#000000';
        return (
          <MyArc
            key={i}
            center={a.center}
            radius={a.radius}
            startAngle={a.startAngle}
            endAngle={a.endAngle}
            color={lineColor}
            strokeWidth={strokeWidth}
            showArrows={props.showArrows}
            arrowLen={arrowLen}
          />
        );
      })}
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          for (let j = props.drawModel.polylines.length - 1; j >= 0; j--) {
            const p = props.drawModel.polylines[j];
            for (let i = 0; i < p.vertexes.length; i++) {
              const vertex = p.vertexes[i];
              const pointX = vertex.x;
              const pointY = vertex.y;

              if (i === 0) {
                context.moveTo(pointX, pointY);
              } else {
                context.lineTo(pointX, pointY);
              }
            }
          }
          context.closePath();

          // (!) Konva specific method, it is very important
          context.fillStrokeShape(shape);
        }}
        stroke="#ff00ff"
        strokeWidth={strokeWidth}
      />
    </>
  );
};
// Drawing.displayName = 'Drawing';

export const KonvaCanvas = (props: IKonvaCanvasProps): ReactElement => {
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
