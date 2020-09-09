using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using CoordinateUtils;
using GCode;
using Util;

namespace CAMToolsNet.Models
{
    public class DrawModel
    {
        public class VertexLW
        {
            //
            // Summary:
            //     Gets or sets the light weight polyline Point3D position.
            public Point3D Position { get; set; }

            // Summary:
            //     Gets or sets the light weight polyline start segment width.
            //
            // Remarks:
            //     Widths greater than zero produce wide lines.
            public float StartWidth { get; set; }
            //
            // Summary:
            //     Gets or sets the light weight polyline end segment width.
            //
            // Remarks:
            //     Widths greater than zero produce wide lines.
            public float EndWidth { get; set; }
            //
            // Summary:
            //     Gets or set the light weight polyline bulge.
            //
            // Remarks:
            //     The bulge is the tangent of one fourth the included angle for an arc segment,
            //     made negative if the arc goes clockwise from the start point to the endpoint.
            //     A bulge of 0 indicates a straight segment, and a bulge of 1 is a semicircle.
            public float Bulge { get; set; }

            // parameter-less constructor needed for de-serialization
            public VertexLW() { }

            public VertexLW(float x, float y, float z)
            {
                Position = new Point3D(x, y, z);
            }
        }


        public abstract class DrawElement
        {
            public string CodeName { get; set; }
            public Color Color { get; set; }
            public bool IsVisible { get; set; }
            public string LayerName { get; set; }

            public DrawElement()
            {

            }

            public DrawElement(dynamic o)
            {
                CodeName = o.CodeName;
                Color = System.Drawing.Color.FromArgb(o.Color.R, o.Color.G, o.Color.B);
                IsVisible = o.IsVisible;
                LayerName = o.Layer.Name;
            }
        }

        public class DrawCircle : DrawElement
        {
            public Point3D Center { get; set; }
            public float Radius { get; set; }
            public float Thickness { get; set; }

            // parameter-less constructor needed for de-serialization
            public DrawCircle() { }


            // note! don't call base() since we might not support the base properties
            public DrawCircle(PointF center, float radius)
            {
                Center = new Point3D(center.X, center.Y);
                Radius = radius;
            }

            public DrawCircle(netDxf.Entities.Circle c) : base(c)
            {
                Center = new Point3D((float)c.Center.X, (float)c.Center.Y, (float)c.Center.Z);
                Radius = (float)c.Radius;
                Thickness = (float)c.Thickness;
            }
        }

        public class DrawLine : DrawElement
        {
            public Point3D StartPoint { get; set; }
            public Point3D EndPoint { get; set; }


            // parameter-less constructor needed for de-serialization
            public DrawLine() { }

            // note! don't call base() since we might not support the base properties
            public DrawLine(PointF startPoint, PointF endPoint)
            {
                StartPoint = new Point3D(startPoint.X, startPoint.Y, 0);
                EndPoint = new Point3D(endPoint.X, endPoint.Y, 0);
            }

            public DrawLine(netDxf.Entities.Line l) : base(l)
            {
                StartPoint = new Point3D((float)l.StartPoint.X, (float)l.StartPoint.Y, (float)l.StartPoint.Z);
                EndPoint = new Point3D((float)l.EndPoint.X, (float)l.EndPoint.Y, (float)l.EndPoint.Z);
            }
        }

        public class DrawArc : DrawElement
        {
            public Point3D Center { get; set; }
            public float Radius { get; set; }
            public float Thickness { get; set; }
            public float StartAngle { get; set; }
            public float EndAngle { get; set; }

            // parameter-less constructor needed for de-serialization
            public DrawArc() { }

            // note! don't call base() since we might not support the base properties
            public DrawArc(PointF center, float radius, float startAngle, float endAngle)
            {
                Center = new Point3D(center.X, center.Y, 0);
                Radius = radius;
                StartAngle = startAngle;
                EndAngle = endAngle;
            }

            public DrawArc(netDxf.Entities.Arc a) : base(a)
            {
                Center = new Point3D((float)a.Center.X, (float)a.Center.Y, (float)a.Center.Z);
                Radius = (float)a.Radius;
                Thickness = (float)a.Thickness;
                StartAngle = (float)a.StartAngle;
                EndAngle = (float)a.EndAngle;
            }
        }

        public class DrawPolyline : DrawElement
        {
            public bool IsClosed { get; set; }

            public List<Point3D> Vertexes { get; set; }

            // parameter-less constructor needed for de-serialization
            public DrawPolyline() { }

            // note! don't call base() since we might not support the base properties
            public DrawPolyline(List<PointF> vertexes)
            {
                Vertexes = new List<Point3D>();

                foreach (var v in vertexes)
                {
                    var Point3D = new Point3D(v.X, v.Y, 0);
                    Vertexes.Add(Point3D);
                }
            }

            public DrawPolyline(List<Point3D> vertexes)
            {
                Vertexes = vertexes;
            }

            public DrawPolyline(netDxf.Entities.Polyline p) : base(p)
            {
                IsClosed = p.IsClosed;
                Vertexes = new List<Point3D>();

                foreach (var v in p.Vertexes)
                {
                    var Point3D = new Point3D((float)v.Position.X, (float)v.Position.Y, (float)v.Position.Z);
                    Vertexes.Add(Point3D);
                }
            }
        }

        public class DrawPolylineLW : DrawElement
        {
            public bool IsClosed { get; set; }

            public List<VertexLW> Vertexes { get; set; }

            // parameter-less constructor needed for de-serialization
            public DrawPolylineLW() { }

            public DrawPolylineLW(netDxf.Entities.LwPolyline p) : base(p)
            {
                IsClosed = p.IsClosed;
                Vertexes = new List<VertexLW>();

                foreach (var v in p.Vertexes)
                {
                    var Point3D = new VertexLW((float)v.Position.X, (float)v.Position.Y, 0);
                    Point3D.StartWidth = (float)v.StartWidth;
                    Point3D.EndWidth = (float)v.EndWidth;
                    Point3D.Bulge = (float)v.Bulge;
                    Vertexes.Add(Point3D);
                }
            }
        }


        // used by the serializer and de-serializer
        public string FileName { get; set; }
        public List<DrawCircle> Circles { get; set; }
        public List<DrawLine> Lines { get; set; }
        public List<DrawArc> Arcs { get; set; }
        public List<DrawPolyline> Polylines { get; set; }
        public List<DrawPolylineLW> PolylinesLW { get; set; }

        /// <summary>
        /// Parse dxf to a draw model, just store the filename
        /// </summary>
        /// <param name="dxf">dxf model to parse</param>
        /// <param name="fileName">original filename</param>
        /// <returns></returns>
        public static DrawModel FromDxfDocument(netDxf.DxfDocument dxf, string fileName)
        {
            return new DrawModel(dxf, fileName);
        }

        /// <summary>
        /// Parse svg to a draw model, just store the filename
        /// </summary>
        /// <param name="svg">svg model to parse</param>
        /// <param name="fileName">original filename</param>
        /// <returns></returns>
        public static DrawModel FromSVGDocument(SVG.SVGDocument svg, string fileName)
        {
            return new DrawModel(svg, fileName);
        }

        /// <summary>
        /// Parse gcode to a draw model, just store the filename
        /// </summary>
        /// <param name="gcode">GCode to parse</param>
        /// <param name="fileName">original filename</param>
        /// <returns></returns>
        public static DrawModel FromGCode(string gcode, string fileName)
        {
            return new DrawModel(gcode, fileName);
        }

        public static netDxf.DxfDocument ToDxfDocument(DrawModel model)
        {
            if (model != null)
            {
                var dxf = new netDxf.DxfDocument();

                // circles
                var circles = new List<netDxf.Entities.Circle>();
                foreach (var c in model.Circles)
                {
                    circles.Add(new netDxf.Entities.Circle(new netDxf.Vector3(c.Center.X, c.Center.Y, c.Center.Z), c.Radius));
                }
                dxf.AddEntity(circles);

                // lines
                var lines = new List<netDxf.Entities.Line>();
                foreach (var l in model.Lines)
                {
                    lines.Add(new netDxf.Entities.Line(new netDxf.Vector3(l.StartPoint.X, l.StartPoint.Y, l.StartPoint.Z), new netDxf.Vector3(l.EndPoint.X, l.EndPoint.Y, l.EndPoint.Z)));
                }
                dxf.AddEntity(lines);

                // arcs
                var arcs = new List<netDxf.Entities.Arc>();
                foreach (var a in model.Arcs)
                {
                    arcs.Add(new netDxf.Entities.Arc(new netDxf.Vector3(a.Center.X, a.Center.Y, a.Center.Z), a.Radius, a.StartAngle, a.EndAngle));
                }
                dxf.AddEntity(arcs);

                // polylines
                var polylines = new List<netDxf.Entities.Polyline>();
                foreach (var p in model.Polylines)
                {
                    var vertexes = new List<netDxf.Entities.PolylineVertex>();
                    foreach (var v in p.Vertexes)
                    {
                        vertexes.Add(new netDxf.Entities.PolylineVertex(v.X, v.Y, v.Z));
                    }
                    polylines.Add(new netDxf.Entities.Polyline(vertexes, p.IsClosed));
                }
                dxf.AddEntity(polylines);

                // polylines light weight
                var polylinesLW = new List<netDxf.Entities.LwPolyline>();
                foreach (var p in model.PolylinesLW)
                {
                    var vertexes = new List<netDxf.Entities.LwPolylineVertex>();
                    foreach (var v in p.Vertexes)
                    {
                        vertexes.Add(new netDxf.Entities.LwPolylineVertex(v.Position.X, v.Position.Y, v.Bulge));
                    }
                    polylinesLW.Add(new netDxf.Entities.LwPolyline(vertexes, p.IsClosed));
                }
                dxf.AddEntity(polylinesLW);

                return dxf;
            }

            return null;
        }

        // parameter-less constructor needed for de-serialization
        public DrawModel()
        {
            Circles = new List<DrawCircle>();
            Lines = new List<DrawLine>();
            Arcs = new List<DrawArc>();
            Polylines = new List<DrawPolyline>();
            PolylinesLW = new List<DrawPolylineLW>();
        }

        public DrawModel(netDxf.DxfDocument dxf, string fileName) : this()
        {
            FileName = fileName;

            if (dxf != null)
            {
                // circles
                foreach (var c in dxf.Circles)
                {
                    Circles.Add(new DrawCircle(c));
                }

                // lines
                foreach (var l in dxf.Lines)
                {
                    Lines.Add(new DrawLine(l));
                }

                // arcs
                foreach (var a in dxf.Arcs)
                {
                    Arcs.Add(new DrawArc(a));
                }

                // polylines
                foreach (var p in dxf.Polylines)
                {
                    Polylines.Add(new DrawPolyline(p));
                }

                // polylines light weight
                foreach (var plw in dxf.LwPolylines)
                {
                    PolylinesLW.Add(new DrawPolylineLW(plw));
                }
            }
        }

        public DrawModel(SVG.SVGDocument svg, string fileName) : this()
        {
            FileName = fileName;

            if (svg != null)
            {
                // var contours = svg.GetScaledContoursAndSetMinMax();
                // var maxY = svg.MaxY;
                // var minX = svg.MinX;

                // Assuming these points come from a SVG
                // we need to shift the Y pos since
                // the SVG origin is upper left, while in DXF and GCode it is assumed to be lower left

                foreach (var shape in svg.Shapes)
                {
                    var elem = shape.DrawModel;

                    // Circles.AddRange(elem.Circles.Select(c => new DrawCircle(new PointF { X = c.Center.X - minX, Y = maxY - c.Center.Y }, c.Radius)).ToList());
                    // Lines.AddRange(elem.Lines.Select(l => new DrawLine(new PointF { X = l.StartPoint.X - minX, Y = maxY - l.StartPoint.Y }, new PointF { X = l.EndPoint.X - minX, Y = maxY - l.EndPoint.Y })).ToList());
                    // Arcs.AddRange(elem.Arcs.Select(a => new DrawArc(new PointF { X = a.Center.X - minX, Y = maxY - a.Center.Y }, a.Radius, a.StartAngle, a.EndAngle)).ToList());

                    // // fix vertexes for polylines
                    // var polylines = (elem.Polylines.Select(a => new DrawPolyline(a.Vertexes.Select(b => new PointF { X = b.X - minX, Y = maxY - b.Y }).ToList())));
                    // Polylines.AddRange(polylines);

                    // svg doesn't have polylines lw

                    Circles.AddRange(elem.Circles);
                    Lines.AddRange(elem.Lines);
                    Arcs.AddRange(elem.Arcs);
                    Polylines.AddRange(elem.Polylines);
                }
            }
        }

        public DrawModel(string gcode, string fileName) : this()
        {
            FileName = fileName;

            if (gcode != null)
            {
                var parsedInstructions = SimpleGCodeParser.ParseText(gcode);

                // turn the instructions into blocks
                var myBlocks = GCodeUtils.GetBlocks(parsedInstructions);

                if (myBlocks != null && myBlocks.Count > 0)
                {
                    // calculate max values for X, Y and Z
                    // while finalizing the blocks and adding them to the lstPlot
                    var maxX = 0.0f;
                    var maxY = 0.0f;
                    var maxZ = 0.0f;
                    var minX = 0.0f;
                    var minY = 0.0f;
                    var minZ = 0.0f;
                    foreach (Block blockItem in myBlocks)
                    {
                        // cache if this is a drill point
                        blockItem.CheckIfDrillOrProbePoint();

                        blockItem.CalculateMinAndMax();
                        maxX = Math.Max(maxX, blockItem.MaxX);
                        maxY = Math.Max(maxY, blockItem.MaxY);
                        maxZ = Math.Max(maxZ, blockItem.MaxZ);

                        minX = Math.Min(minX, blockItem.MinX);
                        minY = Math.Min(minY, blockItem.MinY);
                        minZ = Math.Min(minZ, blockItem.MinZ);

                        if (blockItem.PlotPoints != null)
                        {
                            foreach (var linePlots in blockItem.PlotPoints)
                            {
                                var points = new List<Point3D>();
                                if (linePlots.Pen == PenColorList.RapidMove)
                                {
                                    // TODO - how to represent rapid movements?
                                }
                                else
                                {
                                    var p1 = new Point3D(linePlots.X1, linePlots.Y1, linePlots.Z1);
                                    var p2 = new Point3D(linePlots.X2, linePlots.Y2, linePlots.Z2);
                                    points.Add(p1);
                                    points.Add(p2);
                                    Polylines.Add(new DrawPolyline(points));
                                }
                            }

                            // if this is a drillblock, paint a circle at the point
                            if (blockItem.IsDrillPoint)
                            {
                                var x = blockItem.PlotPoints[1].X1;
                                var y = blockItem.PlotPoints[1].Y1;
                                var radius = 4;
                                AddCircle(new PointF(x, y), radius);
                            }
                        }
                    }
                }
            }
        }

        public void AddPolyline(List<PointF> vertexes)
        {
            var poly = new DrawPolyline(vertexes);
            Polylines.Add(poly);
        }

        public void AddLine(PointF startPoint, PointF endPoint)
        {
            var line = new DrawLine(startPoint, endPoint);
            Lines.Add(line);
        }

        public void AddCircle(PointF center, float radius)
        {
            var circle = new DrawCircle(center, radius);
            Circles.Add(circle);
        }

        public void AddArc(PointF center, float radius, float startAngle, float endAngle)
        {
            var arc = new DrawArc(center, radius, startAngle, endAngle);
            Arcs.Add(arc);
        }

    }
}
