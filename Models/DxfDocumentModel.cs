using System;
using System.Collections.Generic;
using System.Drawing;
using netDxf;
using netDxf.Entities;

namespace CAMToolsNet.Models
{
    public class DxfDocumentModel
    {
        public class Point3D
        {
            public double X { get; set; }
            public double Y { get; set; }
            public double Z { get; set; }

            // parameter-less constructor needed for de-serialization
            public Point3D() { }

            public Point3D(double x, double y, double z)
            {
                X = x;
                Y = y;
                Z = z;
            }
        }

        public class Vertex
        {
            //
            // Summary:
            //     Gets or sets the normal polyline vertex position.
            public Point3D Position { get; set; }

            // parameter-less constructor needed for de-serialization
            public Vertex() { }

            public Vertex(double x, double y, double z)
            {
                Position = new Point3D(x, y, z);
            }
        }

        public class VertexLW
        {
            //
            // Summary:
            //     Gets or sets the light weight polyline vertex position.
            public Point3D Position { get; set; }

            // Summary:
            //     Gets or sets the light weight polyline start segment width.
            //
            // Remarks:
            //     Widths greater than zero produce wide lines.
            public double StartWidth { get; set; }
            //
            // Summary:
            //     Gets or sets the light weight polyline end segment width.
            //
            // Remarks:
            //     Widths greater than zero produce wide lines.
            public double EndWidth { get; set; }
            //
            // Summary:
            //     Gets or set the light weight polyline bulge.
            //
            // Remarks:
            //     The bulge is the tangent of one fourth the included angle for an arc segment,
            //     made negative if the arc goes clockwise from the start point to the endpoint.
            //     A bulge of 0 indicates a straight segment, and a bulge of 1 is a semicircle.
            public double Bulge { get; set; }

            // parameter-less constructor needed for de-serialization
            public VertexLW() { }

            public VertexLW(double x, double y, double z)
            {
                Position = new Point3D(x, y, z);
            }
        }


        public abstract class DxfElement
        {
            public string CodeName { get; set; }
            public Color Color { get; set; }
            public bool IsVisible { get; set; }
            public string LayerName { get; set; }

            public DxfElement()
            {

            }

            public DxfElement(dynamic o)
            {
                CodeName = o.CodeName;
                Color = System.Drawing.Color.FromArgb(o.Color.R, o.Color.G, o.Color.B);
                IsVisible = o.IsVisible;
                LayerName = o.Layer.Name;
            }
        }

        public class DxfCircle : DxfElement
        {
            public Point3D Center { get; set; }
            public double Radius { get; set; }
            public double Thickness { get; set; }

            // parameter-less constructor needed for de-serialization
            public DxfCircle() { }

            public DxfCircle(Circle c) : base(c)
            {
                Center = new Point3D(c.Center.X, c.Center.Y, c.Center.Z);
                Radius = c.Radius;
                Thickness = c.Thickness;
            }
        }

        public class DxfLine : DxfElement
        {
            public Point3D StartPoint { get; set; }
            public Point3D EndPoint { get; set; }


            // parameter-less constructor needed for de-serialization
            public DxfLine() { }

            public DxfLine(Line l) : base(l)
            {
                StartPoint = new Point3D(l.StartPoint.X, l.StartPoint.Y, l.StartPoint.Z);
                EndPoint = new Point3D(l.EndPoint.X, l.EndPoint.Y, l.EndPoint.Z);
            }
        }

        public class DxfArc : DxfElement
        {
            public Point3D Center { get; set; }
            public double Radius { get; set; }
            public double Thickness { get; set; }
            public double StartAngle { get; set; }
            public double EndAngle { get; set; }

            // parameter-less constructor needed for de-serialization
            public DxfArc() { }

            public DxfArc(Arc a) : base(a)
            {
                Center = new Point3D(a.Center.X, a.Center.Y, a.Center.Z);
                Radius = a.Radius;
                Thickness = a.Thickness;
                StartAngle = a.StartAngle;
                EndAngle = a.EndAngle;
            }
        }

        public class DxfPolyline : DxfElement
        {
            public bool IsClosed { get; set; }

            public List<Vertex> Vertexes { get; set; }

            // parameter-less constructor needed for de-serialization
            public DxfPolyline() { }

            public DxfPolyline(Polyline p) : base(p)
            {
                IsClosed = p.IsClosed;
                Vertexes = new List<Vertex>();

                foreach (var v in p.Vertexes)
                {
                    var vertex = new Vertex(v.Position.X, v.Position.Y, v.Position.Z);
                    Vertexes.Add(vertex);
                }
            }
        }

        public class DxfPolylineLW : DxfElement
        {
            public bool IsClosed { get; set; }

            public List<VertexLW> Vertexes { get; set; }

            // parameter-less constructor needed for de-serialization
            public DxfPolylineLW() { }

            public DxfPolylineLW(LwPolyline p) : base(p)
            {
                IsClosed = p.IsClosed;
                Vertexes = new List<VertexLW>();

                foreach (var v in p.Vertexes)
                {
                    var vertex = new VertexLW(v.Position.X, v.Position.Y, 0);
                    vertex.StartWidth = v.StartWidth;
                    vertex.EndWidth = v.EndWidth;
                    vertex.Bulge = v.Bulge;
                    Vertexes.Add(vertex);
                }
            }
        }


        // used by the serializer and de-serializer
        public string FileName { get; set; }
        public List<DxfCircle> Circles { get; set; }
        public List<DxfLine> Lines { get; set; }
        public List<DxfArc> Arcs { get; set; }
        public List<DxfPolyline> Polylines { get; set; }
        public List<DxfPolylineLW> PolylinesLW { get; set; }

        public static DxfDocumentModel FromDxfDocument(DxfDocument dxf, string fileName)
        {
            return new DxfDocumentModel(dxf, fileName);
        }

        public static DxfDocument ToDxfDocument(DxfDocumentModel model)
        {
            if (model != null)
            {
                var dxf = new DxfDocument();

                // circles
                var circles = new List<Circle>();
                foreach (var c in model.Circles)
                {
                    circles.Add(new Circle(new Vector3(c.Center.X, c.Center.Y, c.Center.Z), c.Radius));
                }
                dxf.AddEntity(circles);

                // lines
                var lines = new List<Line>();
                foreach (var l in model.Lines)
                {
                    lines.Add(new Line(new Vector3(l.StartPoint.X, l.StartPoint.Y, l.StartPoint.Z), new Vector3(l.EndPoint.X, l.EndPoint.Y, l.EndPoint.Z)));
                }
                dxf.AddEntity(lines);

                // arcs
                var arcs = new List<Arc>();
                foreach (var a in model.Arcs)
                {
                    arcs.Add(new Arc(new Vector3(a.Center.X, a.Center.Y, a.Center.Z), a.Radius, a.StartAngle, a.EndAngle));
                }
                dxf.AddEntity(arcs);

                // polylines
                var polylines = new List<Polyline>();
                foreach (var p in model.Polylines)
                {
                    var vertexes = new List<PolylineVertex>();
                    foreach (var v in p.Vertexes)
                    {
                        vertexes.Add(new PolylineVertex(v.Position.X, v.Position.Y, v.Position.Z));
                    }
                    polylines.Add(new Polyline(vertexes, p.IsClosed));
                }
                dxf.AddEntity(polylines);

                // polylines light weight
                var polylinesLW = new List<LwPolyline>();
                foreach (var p in model.PolylinesLW)
                {
                    var vertexes = new List<LwPolylineVertex>();
                    foreach (var v in p.Vertexes)
                    {
                        vertexes.Add(new LwPolylineVertex(v.Position.X, v.Position.Y, v.Bulge));
                    }
                    polylinesLW.Add(new LwPolyline(vertexes, p.IsClosed));
                }
                dxf.AddEntity(polylinesLW);

                return dxf;
            }

            return null;
        }

        // parameter-less constructor needed for de-serialization
        public DxfDocumentModel() { }

        public DxfDocumentModel(DxfDocument dxf, string fileName)
        {
            FileName = fileName;

            if (dxf != null)
            {
                // circles
                Circles = new List<DxfCircle>();
                foreach (var c in dxf.Circles)
                {
                    Circles.Add(new DxfCircle(c));
                }

                // lines
                Lines = new List<DxfLine>();
                foreach (var l in dxf.Lines)
                {
                    Lines.Add(new DxfLine(l));
                }

                // arcs
                Arcs = new List<DxfArc>();
                foreach (var a in dxf.Arcs)
                {
                    Arcs.Add(new DxfArc(a));
                }

                // polylines
                Polylines = new List<DxfPolyline>();
                foreach (var p in dxf.Polylines)
                {
                    Polylines.Add(new DxfPolyline(p));
                }

                // polylines light weight
                PolylinesLW = new List<DxfPolylineLW>();
                foreach (var plw in dxf.LwPolylines)
                {
                    PolylinesLW.Add(new DxfPolylineLW(plw));
                }
            }
        }
    }
}
