using System;
using System.Collections.Generic;
using netDxf;
using netDxf.Entities;

namespace CAMToolsNet.Models
{
    public class DxfDocumentModel
    {
        public class DxfCircle
        {
            public Vector3 Center { get; set; }
            public double Radius { get; set; }
            public double Thickness { get; set; }

            // parameter-less constructor needed for de-serialization
            public DxfCircle() { }

            public DxfCircle(Circle c)
            {
                Center = new Vector3(c.Center.X, c.Center.Y, c.Center.Z);
                Radius = c.Radius;
                Thickness = c.Thickness;
            }
        }

        public class DxfLine
        {
            public Vector3 StartPoint { get; set; }
            public Vector3 EndPoint { get; set; }


            // parameter-less constructor needed for de-serialization
            public DxfLine() { }

            public DxfLine(Line l)
            {
                StartPoint = new Vector3(l.StartPoint.X, l.StartPoint.Y, l.StartPoint.Z);
                EndPoint = new Vector3(l.EndPoint.X, l.EndPoint.Y, l.EndPoint.Z);
            }
        }

        public class DxfArc
        {
            public Vector3 Center { get; set; }
            public double Radius { get; set; }
            public double Thickness { get; set; }
            public double StartAngle { get; set; }
            public double EndAngle { get; set; }

            // parameter-less constructor needed for de-serialization
            public DxfArc() { }

            public DxfArc(Arc a)
            {
                Center = new Vector3(a.Center.X, a.Center.Y, a.Center.Z);
                Radius = a.Radius;
                Thickness = a.Thickness;
                StartAngle = a.StartAngle;
                EndAngle = a.EndAngle;
            }
        }

        public class DxfPolyline
        {
            public List<PolylineVertex> Vertexes { get; set; }

            // parameter-less constructor needed for de-serialization
            public DxfPolyline() { }

            public DxfPolyline(Polyline p)
            {
                bool IsClosed = p.IsClosed;

                List<PolylineVertex> Vertexes = new List<PolylineVertex>();

                for (int i = 0; i < p.Vertexes.Count; i++)
                {
                    var vertex = (PolylineVertex)p.Vertexes[i].Clone();
                    var pos = vertex.Position;
                    Vertexes.Add(vertex);
                }
            }
        }


        // used by the serializer and de-serializer
        public List<DxfCircle> Circles { get; set; }
        public List<DxfLine> Lines { get; set; }
        public List<DxfArc> Arcs { get; set; }
        public List<DxfPolyline> Polylines { get; set; }

        public static DxfDocumentModel FromDxfDocument(DxfDocument dxf)
        {
            return new DxfDocumentModel(dxf);
        }

        // parameter-less constructor needed for de-serialization
        public DxfDocumentModel() { }

        public DxfDocumentModel(DxfDocument dxf)
        {

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

            }
        }
    }
}
