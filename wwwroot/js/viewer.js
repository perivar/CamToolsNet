var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var uri = 'api/Editor';
var drawModel = [];
var bounds = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
// get on-screen canvas
var canvas = document.getElementById('drawCanvas');
// make the images crisp
// https://stackoverflow.com/questions/31910043/html5-canvas-drawimage-draws-image-blurry
// get current size of the canvas
var canvasDiv = document.getElementById('canvasDiv');
// console.log('canvas div width: ' + canvasDiv.clientWidth);
// console.log('canvas div height: ' + canvasDiv.clientHeight);
var canvasWidth = canvasDiv.clientWidth;
var canvasHeight = canvasDiv.clientHeight;
// increase the actual size of our canvas
canvas.width = canvasWidth * devicePixelRatio;
canvas.height = canvasHeight * devicePixelRatio;
canvas.style.width = canvasWidth + "px";
canvas.style.height = canvasHeight + "px";
var ctx = canvas.getContext('2d', { alpha: false });
// offscreen canvas
var off_ctx;
var translatePos = {
    x: canvasWidth / 2,
    y: canvasHeight / 2
};
var scale = 1.0;
var scaleMultiplier = 0.8;
var startDragOffset = { x: 0, y: 0 };
var mouseDown = false;
var originTransform = new DOMMatrix();
var inverseOriginTransform = new DOMMatrix();
// https://stackoverflow.com/questions/45852075/getting-relative-mouse-position-on-canvas-after-scaling
function setZoomAndOffsetTransform() {
    originTransform = new DOMMatrix();
    originTransform.translateSelf(translatePos.x * devicePixelRatio, translatePos.y * devicePixelRatio);
    // do '-scale' as second argument to flip around the y axis
    originTransform.scaleSelf(scale * devicePixelRatio, -scale * devicePixelRatio);
    inverseOriginTransform = originTransform.inverse();
}
function getElementRelativeMousePosition(e) {
    return [e.offsetX, e.offsetY];
}
function getCanvasRelativeMousePosition(e) {
    var pos = getElementRelativeMousePosition(e);
    pos[0] = pos[0] * ctx.canvas.width / ctx.canvas.clientWidth;
    pos[1] = pos[1] * ctx.canvas.height / ctx.canvas.clientHeight;
    return pos;
}
function getTransformRelativeMousePosition(e) {
    var pos = getCanvasRelativeMousePosition(e);
    var p = new (DOMPoint.bind.apply(DOMPoint, __spreadArrays([void 0], pos)))();
    var point = inverseOriginTransform.transformPoint(p);
    return { x: point.x, y: point.y };
}
// event handler to resize the canvas when the document view is changed
window.addEventListener('resize', function (evt) {
    var div = document.getElementById('canvasDiv');
    // console.log('canvas div width: ' + div.clientWidth);
    // console.log('canvas div height: ' + div.clientHeight);
    var canvasWidth = div.clientWidth;
    var canvasHeight = div.clientHeight;
    // increase the actual size of our canvas
    canvas.width = canvasWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    zoomToFit();
    draw(scale, translatePos);
    return false;
});
// add event listeners to handle screen drag
canvas.addEventListener("mousedown", function (evt) {
    mouseDown = true;
    startDragOffset.x = evt.clientX - translatePos.x;
    startDragOffset.y = evt.clientY - translatePos.y;
});
canvas.addEventListener("mouseup", function (evt) {
    mouseDown = false;
});
canvas.addEventListener("mouseover", function (evt) {
    mouseDown = false;
});
canvas.addEventListener("mouseout", function (evt) {
    mouseDown = false;
});
canvas.addEventListener("mousemove", function (evt) {
    var mousePos = getTransformRelativeMousePosition(evt);
    // clear small area where the mouse pos is plotted
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.fillStyle = "white";
    ctx.fillRect(10, 42, 120, 10);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = "black";
    ctx.fillText('pos: ' + round2TwoDecimal(mousePos.x) + ' , ' + round2TwoDecimal(mousePos.y), 10, 50);
    ctx.restore();
    if (mouseDown) {
        translatePos.x = evt.clientX - startDragOffset.x;
        translatePos.y = evt.clientY - startDragOffset.y;
        draw(scale, translatePos);
    }
});
var handleScroll = function (evt) {
    // e is the mouse wheel event
    var x = evt.offsetX;
    var y = evt.offsetY;
    var amount = evt.wheelDelta > 0 ? 1.1 : 1 / 1.1;
    // set limits
    var tmpScale = scale * amount;
    if (tmpScale > 30)
        return;
    if (tmpScale < 0.3)
        return;
    scale *= amount; // the new scale
    // move the origin  
    translatePos.x = x - (x - translatePos.x) * amount;
    translatePos.y = y - (y - translatePos.y) * amount;
    draw(scale, translatePos);
    return evt.preventDefault() && false;
};
canvas.addEventListener('DOMMouseScroll', handleScroll, false);
canvas.addEventListener('mousewheel', handleScroll, false);
function zoomToFit() {
    // https://stackoverflow.com/questions/38354488/zoom-to-fit-canvas-javascript
    var dataWidth = (bounds.max.x - bounds.min.x);
    var dataHeight = (bounds.max.y - bounds.min.y);
    var scaleY = canvasHeight / dataHeight;
    var scaleX = canvasWidth / dataWidth;
    scale = Math.min(scaleX, scaleY);
    // move the origin  
    translatePos.x = (canvasWidth / 2) - ((dataWidth / 2) + bounds.min.x) * scale;
    // offset with 'canvasHeight -¨' since we are flipping around y axis
    translatePos.y = canvasHeight - ((canvasHeight / 2) - ((dataHeight / 2) + bounds.min.y) * scale);
}
function round2TwoDecimal(number) {
    return Math.round((number + Number.EPSILON) * 100) / 100;
}
// create off-screen canvas to draw pixels on
// https://stackoverflow.com/questions/48858220/javascript-put-image-data-on-top-of-canvas
// var off_ctx = createOffscreenContext(canvasWidth, canvasHeight);
// var imgData = off_ctx.createImageData(canvasWidth, canvasHeight);
// ... drawing ...
// doesn't work for negative x or y
// drawPixel(imgData, canvasWidth, x, y, 255, 0, 0, 255);
// copy offscreen to onscreen
// off_ctx.putImageData(imgData, 0, 0);
// ctx.drawImage(off_ctx.canvas, 0, 0);
function createOffscreenContext(width, height) {
    var offScreenCanvas = document.createElement('canvas');
    offScreenCanvas.width = width * devicePixelRatio;
    offScreenCanvas.height = height * devicePixelRatio;
    // offScreenCanvas.style.width = `${width}px`;
    // offScreenCanvas.style.height = `${height}px`;
    var off_ctx = offScreenCanvas.getContext("2d");
    return off_ctx; // use off_ctx.canvas to get the the context's canvas
}
function drawPixel(imgData, canvasWidth, x, y, r, g, b, a) {
    var index = (x + y * canvasWidth) * 4;
    imgData.data[index + 0] = r;
    imgData.data[index + 1] = g;
    imgData.data[index + 2] = b;
    imgData.data[index + 3] = a;
}
function calculateBounds() {
    var maxX = 0;
    var maxY = 0;
    var minX = 100000;
    var minY = 100000;
    var curX = 0;
    var curY = 0;
    drawModel.circles.forEach(function (circle) {
        var x = circle.center.x;
        var y = circle.center.y;
        var radius = circle.radius;
        curX = x + radius;
        curY = y + radius;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
        curX = x - radius;
        curY = y - radius;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
    });
    drawModel.lines.forEach(function (line) {
        var startX = line.startPoint.x;
        var startY = line.startPoint.y;
        var endX = line.endPoint.x;
        var endY = line.endPoint.y;
        curX = startX;
        curY = startY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
        curX = endX;
        curY = endY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
    });
    drawModel.arcs.forEach(function (a) {
        var centerX = a.center.x;
        var centerY = a.center.y;
        var radius = a.radius;
        var startAngle = a.startAngle;
        var endAngle = a.endAngle;
        var startX = (centerX + Math.cos(startAngle * Math.PI / 180) * radius);
        var startY = (centerY + Math.sin(startAngle * Math.PI / 180) * radius);
        var endX = (centerX + Math.cos(endAngle * Math.PI / 180) * radius);
        var endY = (centerY + Math.sin(endAngle * Math.PI / 180) * radius);
        curX = startX;
        curY = startY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
        curX = endX;
        curY = endY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
        curX = centerX;
        curY = centerY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
    });
    // drawing polylines
    drawModel.polylines.forEach(function (p) {
        for (var i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.x;
            var pointY = vertex.y;
            curX = pointX;
            curY = pointY;
            maxX = curX > maxX ? curX : maxX;
            minX = curX < minX ? curX : minX;
            maxY = curY > maxY ? curY : maxY;
            minY = curY < minY ? curY : minY;
        }
    });
    // drawing polylines light weight
    drawModel.polylinesLW.forEach(function (p) {
        for (var i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.position.x;
            var pointY = vertex.Position.y;
            curX = pointX;
            curY = pointY;
            maxX = curX > maxX ? curX : maxX;
            minX = curX < minX ? curX : minX;
            maxY = curY > maxY ? curY : maxY;
            minY = curY < minY ? curY : minY;
        }
    });
    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}
function drawGrid(context, gridPixelSize, colorAxis, colorGrid, gap, width, height) {
    context.strokeStyle = colorGrid;
    // horizontal grid lines
    for (var i = 0; i <= height; i = i + gridPixelSize) {
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(width, i);
        if (i % gap == 0) {
            context.lineWidth = 0.8;
        }
        else {
            context.lineWidth = 0.3;
        }
        context.closePath();
        context.stroke();
    }
    // vertical grid lines
    for (var j = 0; j <= width; j = j + gridPixelSize) {
        context.beginPath();
        context.moveTo(j, 0);
        context.lineTo(j, height);
        if (j % gap == 0) {
            context.lineWidth = 0.8;
        }
        else {
            context.lineWidth = 0.3;
        }
        context.closePath();
        context.stroke();
    }
    context.lineWidth = 0.5;
    context.strokeStyle = colorAxis;
    // x axis
    drawLineWithArrows(ctx, 0, 0, bounds.max.x + 25, 0, 2, 4, false, true);
    // y axis
    drawLineWithArrows(ctx, 0, 0, 0, bounds.max.y + 25, 2, 4, false, true);
}
// x0,y0: the line's starting point
// x1,y1: the line's ending point
// width: the distance the arrowhead perpendicularly extends away from the line
// height: the distance the arrowhead extends backward from the endpoint
// arrowStart: true/false directing to draw arrowhead at the line's starting point
// arrowEnd: true/false directing to draw arrowhead at the line's ending point
// Usage: 
// drawLineWithArrows(50, 50, 150, 50, 5, 8, true, true);
function drawLineWithArrows(context, x0, y0, x1, y1, aWidth, aLength, arrowStart, arrowEnd) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var angle = Math.atan2(dy, dx);
    var length = Math.sqrt(dx * dx + dy * dy);
    context.save();
    context.translate(x0, y0);
    context.rotate(angle);
    context.beginPath();
    // line
    context.moveTo(0, 0);
    context.lineTo(length, 0);
    if (arrowStart) {
        context.moveTo(aLength, -aWidth);
        context.lineTo(0, 0);
        context.lineTo(aLength, aWidth);
    }
    if (arrowEnd) {
        context.moveTo(length - aLength, -aWidth);
        context.lineTo(length, 0);
        context.lineTo(length - aLength, aWidth);
    }
    context.stroke();
    context.restore();
}
function drawFile(context) {
    drawGrid(context, 10, "#999999", "#F2F2F2", 100, bounds.max.x + 20, bounds.max.y + 20);
    // drawing circles
    context.beginPath(); // begin
    drawModel.circles.forEach(function (circle) {
        var startAngle = 0;
        var endAngle = 2 * Math.PI;
        var x = circle.center.x;
        var y = circle.center.y;
        var radius = circle.radius;
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, startAngle, endAngle, false);
        // draw diameter and center (need to flip y axis back first)     
        context.save();
        context.scale(1, -1); // flip back 
        context.translate(0, -canvasHeight); // and translate so that we draw the text the right way up
        context.fillRect(x - 0.2, canvasHeight - y - 0.2, 0.4, 0.4); // fill in the pixel
        var dia = round2TwoDecimal(radius * 2);
        context.font = '4px sans-serif';
        context.fillText('' + dia, x + 4, canvasHeight - y);
        context.restore();
    });
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = "#0000ff";
    context.stroke();
    // done drawing circles
    // drawing lines
    context.beginPath(); // begin
    drawModel.lines.forEach(function (line) {
        var startX = line.startPoint.x;
        var startY = line.startPoint.y;
        var endX = line.endPoint.x;
        var endY = line.endPoint.y;
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
    });
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = "#44cc44";
    context.stroke();
    // done drawing lines    
    // drawing arcs
    context.beginPath(); // begin
    drawModel.arcs.forEach(function (a) {
        var centerX = a.center.x;
        var centerY = a.center.y;
        var radius = a.radius;
        var startAngle = a.startAngle;
        var endAngle = a.endAngle;
        var startX = (centerX + Math.cos(startAngle * Math.PI / 180) * radius);
        var startY = (centerY + Math.sin(startAngle * Math.PI / 180) * radius);
        var endX = (centerX + Math.cos(endAngle * Math.PI / 180) * radius);
        var endY = (centerY + Math.sin(endAngle * Math.PI / 180) * radius);
        var isCounterClockwise = false;
        context.moveTo(startX, startY);
        context.arc(centerX, centerY, radius, startAngle * Math.PI / 180, endAngle * Math.PI / 180, isCounterClockwise);
        context.moveTo(endX, endY);
    });
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = "#000000";
    context.stroke();
    // done drawing arcs    
    // drawing polylines
    context.beginPath(); // begin
    drawModel.polylines.forEach(function (p) {
        for (var i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.x;
            var pointY = vertex.y;
            if (i == 0) {
                context.moveTo(pointX, pointY);
            }
            else {
                context.lineTo(pointX, pointY);
            }
        }
    });
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = "#ff00ff";
    context.stroke();
    // done drawing polylines
    // drawing polylines light weight
    context.beginPath(); // begin
    drawModel.polylinesLW.forEach(function (p) {
        for (var i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.position.x;
            var pointY = vertex.Position.y;
            var bulge = vertex.bulge;
            var prePointX = 0;
            var prePointY = 0;
            if (i == 0) {
                context.moveTo(pointX, pointY);
            }
            else {
                var angle = 4 * Math.atan(Math.abs(bulge)) / Math.PI * 180;
                var length_1 = Math.sqrt((pointX - prePointX) * (pointX - prePointX) + (pointY - prePointY) * (pointY - prePointY));
                var radius = Math.abs(length_1 / (2 * Math.sin(angle / 360 * Math.PI)));
                context.arc(pointX, pointY, radius, 0, angle * Math.PI / 180, false);
                prePointX = pointX;
                prePointY = pointY;
            }
        }
    });
    context.closePath(); // end
    context.lineWidth = 0.3;
    context.strokeStyle = "#002266";
    context.stroke();
    // done drawing polylines light weight
}
function draw(scale, translatePos) {
    ctx.imageSmoothingEnabled = false;
    // clear
    // ctx.clearRect(0, 0, canvasWidth * devicePixelRatio, canvasHeight * devicePixelRatio);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasWidth * devicePixelRatio, canvasHeight * devicePixelRatio);
    ctx.fillStyle = "black";
    // main drawing routine
    ctx.save();
    setZoomAndOffsetTransform();
    ctx.setTransform(originTransform.a, originTransform.b, originTransform.c, originTransform.d, originTransform.e, originTransform.f);
    // ---- start drawing the model ---
    // draw offscreen image    
    // ctx.drawImage(
    //     off_ctx.canvas, 0, 0,
    //     off_ctx.canvas.width * devicePixelRatio,
    //     off_ctx.canvas.height * devicePixelRatio
    // );
    drawFile(ctx);
    // mark bounds area
    // ctx.strokeStyle = "hsl(" + (360 * Math.random()) + ", 80%, 50%)";
    // ctx.strokeRect(bounds.min.x, bounds.min.y, bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);
    ctx.restore();
    // debugging: draw non zoomed and non panned
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.font = '10px sans-serif';
    ctx.fillText('scale: ' + round2TwoDecimal(scale), 10, 10);
    ctx.fillText('panning: ' + round2TwoDecimal(translatePos.x) + ' , ' + round2TwoDecimal(translatePos.y), 10, 20);
    // get bounds
    ctx.fillText('bounds X: ' + round2TwoDecimal(bounds.min.x) + ' to ' + round2TwoDecimal(bounds.max.x), 10, 30);
    ctx.fillText('bounds Y: ' + round2TwoDecimal(bounds.min.y) + ' to ' + round2TwoDecimal(bounds.max.y), 10, 40);
    ctx.restore();
    // end debugging
}
function getDrawModel() {
    fetch(uri)
        .then(function (response) { return response.json(); })
        .then(function (data) {
        // console.log(data);
        drawModel = data;
        bounds = calculateBounds();
        // create off-screen canvas to draw pixels on
        // https://stackoverflow.com/questions/48858220/javascript-put-image-data-on-top-of-canvas
        // off_ctx = createOffscreenContext(canvasWidth, canvasHeight);
        // drawFile(off_ctx);
        zoomToFit();
        draw(scale, translatePos);
        // treed('treemenu', {openedClass:'fa-folder-open', closedClass:'fa-folder'});
        treed('treemenu');
    })
        .catch(function (error) { return console.error('Unable to get draw model.', error); });
}
//# sourceMappingURL=viewer.js.map