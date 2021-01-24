using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Drawing;
using System.Globalization;
using System.Linq;
using System.Text;
using CoordinateUtils;
using Util;
using GCode;
using Svg;
using Svg.Pathing;
using System.Text.Json.Serialization;

namespace CAMToolsNet.Models
{
	public class DrawModel
	{
		// used by the serializer and de-serializer
		public string FileName { get; set; }
		public Bounds Bounds { get; set; }
		public List<DrawCircle> Circles { get; set; }
		public List<DrawLine> Lines { get; set; }
		public List<DrawArc> Arcs { get; set; }
		public List<DrawPolyline> Polylines { get; set; }

		// used to hold the sorted start end segment list
		[JsonIgnore]
		public List<IStartEndPoint> SortedStartEnd { get; set; }

		public class DrawColor
		{
			public byte A { get; }
			public byte R { get; }
			public byte G { get; }
			public byte B { get; }

			// parameter-less constructor needed for de-serialization
			public DrawColor() { }

			public DrawColor(Color c)
			{
				this.A = c.A;
				this.R = c.R;
				this.B = c.G;
				this.A = c.B;
			}

			public DrawColor(byte R, byte G, byte B)
			{
				this.A = 255;
				this.R = R;
				this.B = G;
				this.A = B;
			}
		}

		public interface IStartEndPoint
		{
			Point3D StartPoint { get; }
			Point3D EndPoint { get; }
			void SwapStartEnd();
		}

		public abstract class DrawElement
		{
			public string CodeName { get; set; }
			public DrawColor Color { get; set; }
			public bool IsVisible { get; set; }
			public string LayerName { get; set; }

			// force the elements to implement ToString()
			public abstract override string ToString();

			public DrawElement()
			{

			}

			public DrawElement(dynamic o)
			{
				CodeName = o.CodeName;
				Color = new DrawColor(o.Color.R, o.Color.G, o.Color.B);
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
			public DrawCircle(PointF center, float radius, bool isVisible = true)
			{
				Center = new Point3D(center.X, center.Y);
				Radius = radius;
				IsVisible = isVisible;
			}

			public DrawCircle(netDxf.Entities.Circle c) : base(c)
			{
				Center = new Point3D((float)c.Center.X, (float)c.Center.Y, (float)c.Center.Z);
				Radius = (float)c.Radius;
				Thickness = (float)c.Thickness;
				IsVisible = true;
			}

			public override string ToString()
			{
				return string.Format(CultureInfo.CurrentCulture,
									 "Circle: Center={0}, Radius={1}", Center, Radius);
			}
		}

		public class DrawLine : DrawElement, IEquatable<DrawLine>, IStartEndPoint
		{
			public Point3D StartPoint { get; set; }
			public Point3D EndPoint { get; set; }


			// parameter-less constructor needed for de-serialization
			public DrawLine() { }

			// note! don't call base() since we might not support the base properties
			public DrawLine(PointF startPoint, PointF endPoint, bool isVisible = true)
			{
				StartPoint = new Point3D(startPoint.X, startPoint.Y, 0);
				EndPoint = new Point3D(endPoint.X, endPoint.Y, 0);
				IsVisible = isVisible;
			}

			public DrawLine(netDxf.Entities.Line l) : base(l)
			{
				StartPoint = new Point3D((float)l.StartPoint.X, (float)l.StartPoint.Y, (float)l.StartPoint.Z);
				EndPoint = new Point3D((float)l.EndPoint.X, (float)l.EndPoint.Y, (float)l.EndPoint.Z);
				IsVisible = true;
			}

			public bool Equals([AllowNull] DrawLine other)
			{
				return null != other
				&& this.StartPoint == other.StartPoint
				&& this.EndPoint == other.EndPoint
				&& this.IsVisible == other.IsVisible;
			}

			public override bool Equals(object obj)
			{
				return Equals(obj as DrawLine);
			}

			public override int GetHashCode()
			{
				return base.GetHashCode();
			}

			public void SwapStartEnd()
			{
				var startPoint = StartPoint;
				var endPoint = EndPoint;
				CollectionsUtils.Swap(ref startPoint, ref endPoint);
				StartPoint = startPoint;
				EndPoint = endPoint;
			}

			public override string ToString()
			{
				return string.Format(CultureInfo.CurrentCulture,
									 "Line: StartPoint={0}, EndPoint={1}", StartPoint, EndPoint);
			}
		}

		public class DrawArc : DrawElement, IStartEndPoint
		{
			public Point3D Center { get; set; }
			public float Radius { get; set; }
			public float Thickness { get; set; }
			public float StartAngle { get; set; }
			public float EndAngle { get; set; }

			public Point3D StartPoint
			{
				get
				{
					var centerX = this.Center.X;
					var centerY = this.Center.Y;
					var centerZ = this.Center.Z;
					var radius = this.Radius;
					var startAngle = this.StartAngle;

					var startX = centerX + Math.Cos((startAngle * Math.PI) / 180) * radius;
					var startY = centerY + Math.Sin((startAngle * Math.PI) / 180) * radius;

					return new Point3D((float)startX, (float)startY, centerZ);
				}
			}
			public Point3D EndPoint
			{
				get
				{
					var centerX = this.Center.X;
					var centerY = this.Center.Y;
					var centerZ = this.Center.Z;
					var radius = this.Radius;
					var endAngle = this.EndAngle;

					var endX = centerX + Math.Cos((endAngle * Math.PI) / 180) * radius;
					var endY = centerY + Math.Sin((endAngle * Math.PI) / 180) * radius;

					return new Point3D((float)endX, (float)endY, centerZ);
				}
			}

			// parameter-less constructor needed for de-serialization
			public DrawArc() { }

			// note! don't call base() since we might not support the base properties
			public DrawArc(PointF center, float radius, float startAngle, float endAngle, bool isVisible = true)
			{
				Center = new Point3D(center.X, center.Y, 0);
				Radius = radius;
				StartAngle = startAngle;
				EndAngle = endAngle;
				IsVisible = isVisible;
			}

			public DrawArc(netDxf.Entities.Arc a) : base(a)
			{
				Center = new Point3D((float)a.Center.X, (float)a.Center.Y, (float)a.Center.Z);
				Radius = (float)a.Radius;
				Thickness = (float)a.Thickness;
				StartAngle = (float)a.StartAngle;
				EndAngle = (float)a.EndAngle;
				IsVisible = true;
			}

			public void SwapStartEnd()
			{
				// ignore the swapping for arcs since the arcs are correct anyway
				// even if the start and end point isn't really swapped
			}

			public override string ToString()
			{
				return string.Format(CultureInfo.CurrentCulture,
									 "Arc: StartPoint={0}, EndPoint={1}", StartPoint, EndPoint);
			}
		}

		public class DrawPolyline : DrawElement, IStartEndPoint
		{
			public bool IsClosed { get; set; }

			public List<Point3D> Vertexes { get; set; }

			public Point3D StartPoint { get { return Vertexes.First(); } }

			public Point3D EndPoint { get { return Vertexes.Last(); } }

			// parameter-less constructor needed for de-serialization
			public DrawPolyline() { }

			// note! don't call base() since we might not support the base properties
			public DrawPolyline(List<PointF> vertexes, bool isVisible = true)
			{
				Vertexes = new List<Point3D>();

				foreach (var v in vertexes)
				{
					var Point3D = new Point3D(v.X, v.Y, 0);
					Vertexes.Add(Point3D);
				}
				IsVisible = isVisible;
			}

			// note! don't call base() since we might not support the base properties
			public DrawPolyline(List<Point3D> vertexes, bool isVisible = true)
			{
				Vertexes = vertexes;
				IsVisible = isVisible;
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
				IsVisible = true;
			}

			public DrawPolyline(netDxf.Entities.LwPolyline p) : base(p)
			{
				IsClosed = p.IsClosed;
				Vertexes = new List<Point3D>();

				foreach (var v in p.Vertexes)
				{
					var Point3D = new Point3D((float)v.Position.X, (float)v.Position.Y, 0);
					Vertexes.Add(Point3D);
				}
				IsVisible = true;
			}

			public override string ToString()
			{
				return string.Format(CultureInfo.CurrentCulture,
									 "Poly: StartPoint={0}, EndPoint={1}", Vertexes.First(), Vertexes.Last());
			}

			public void SwapStartEnd()
			{
				// ignore the swapping for polylines since the polylines are correctly connected anyway
				// even if the start and end point isn't really swapped
			}
		}

		/// <summary>
		/// Parse dxf to a draw model, just store the filename
		/// </summary>
		/// <param name="dxf">dxf model to parse</param>
		/// <param name="fileName">original filename</param>
		/// <returns></returns>
		public static DrawModel FromDxfDocument(netDxf.DxfDocument dxf, string fileName, bool useContours = true)
		{
			return new DrawModel(dxf, fileName, useContours);
		}

		/// <summary>
		/// Parse svg to a draw model, just store the filename
		/// </summary>
		/// <param name="svg">svg model to parse</param>
		/// <param name="fileName">original filename</param>
		/// <returns></returns>
		public static DrawModel FromSVGDocument(SVG.SVGDocument svg, string fileName, bool useContours = true)
		{
			return new DrawModel(svg, fileName, useContours);
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
					if (c.IsVisible)
					{
						var circle = new netDxf.Entities.Circle(new netDxf.Vector3(c.Center.X, c.Center.Y, c.Center.Z), c.Radius);
						if (c.LayerName != null) circle.Layer = new netDxf.Tables.Layer(c.LayerName);
						circles.Add(circle);
					}
				}
				dxf.AddEntity(circles);

				// lines
				var lines = new List<netDxf.Entities.Line>();
				foreach (var l in model.Lines)
				{
					if (l.IsVisible)
					{
						var line = new netDxf.Entities.Line(new netDxf.Vector3(l.StartPoint.X, l.StartPoint.Y, l.StartPoint.Z), new netDxf.Vector3(l.EndPoint.X, l.EndPoint.Y, l.EndPoint.Z));
						if (l.LayerName != null) line.Layer = new netDxf.Tables.Layer(l.LayerName);
						lines.Add(line);
					}
				}
				dxf.AddEntity(lines);

				// arcs
				var arcs = new List<netDxf.Entities.Arc>();
				foreach (var a in model.Arcs)
				{
					if (a.IsVisible)
					{
						var arc = new netDxf.Entities.Arc(new netDxf.Vector3(a.Center.X, a.Center.Y, a.Center.Z), a.Radius, a.StartAngle, a.EndAngle);
						if (a.LayerName != null) arc.Layer = new netDxf.Tables.Layer(a.LayerName);
						arcs.Add(arc);
					}
				}
				dxf.AddEntity(arcs);

				// polylines
				var polylines = new List<netDxf.Entities.Polyline>();
				foreach (var p in model.Polylines)
				{
					// cannot add a polyline with only one point
					if (p.IsVisible && p.Vertexes.Count >= 2)
					{
						var vertexes = new List<netDxf.Entities.PolylineVertex>();
						foreach (var v in p.Vertexes)
						{
							vertexes.Add(new netDxf.Entities.PolylineVertex(v.X, v.Y, v.Z));
						}
						var polyLine = new netDxf.Entities.Polyline(vertexes, p.IsClosed);
						if (p.LayerName != null) polyLine.Layer = new netDxf.Tables.Layer(p.LayerName);
						polylines.Add(polyLine);
					}
				}
				dxf.AddEntity(polylines);

				return dxf;
			}

			return null;
		}

		public static SvgDocument ToSvgDocument(DrawModel model)
		{
			if (model != null)
			{
				// store some useful variables
				var minX = model.Bounds.Min.X;
				var minY = model.Bounds.Min.Y;
				var maxX = model.Bounds.Max.X;
				var maxY = model.Bounds.Max.Y;

				var width = maxX;
				var height = maxY;

				var svg = new SvgDocument
				{
					Width = width,
					Height = height,
					ViewBox = new SvgViewBox(0, 0, width, height),
				};

				// We need to shift the Y pos since
				// the SVG origin is upper left, while in DXF and GCode it is assumed to be lower left

				// circles
				var circles = new SvgGroup();
				circles.Stroke = new SvgColourServer(Color.Blue);
				// circles.StrokeWidth = 1;
				// circles.Fill = new SvgColourServer(Color.Transparent);
				// circles.FillOpacity = 1.0f;
				foreach (var c in model.Circles)
				{
					if (c.IsVisible)
					{
						var circle = new SvgCircle
						{
							CenterX = c.Center.X,
							CenterY = maxY - c.Center.Y,
							Radius = c.Radius
						};
						circles.Children.Add(circle);
					}
				}
				if (circles.Children.Count > 0) svg.Children.Add(circles);

				// lines
				var lines = new SvgGroup();
				lines.Stroke = new SvgColourServer(Color.Green);
				// lines.StrokeWidth = 1;
				// lines.Fill = new SvgColourServer(Color.Transparent);
				// lines.FillOpacity = 1.0f;
				foreach (var l in model.Lines)
				{
					if (l.IsVisible)
					{
						var line = new SvgLine
						{
							StartX = l.StartPoint.X,
							StartY = maxY - l.StartPoint.Y,
							EndX = l.EndPoint.X,
							EndY = maxY - l.EndPoint.Y
						};
						lines.Children.Add(line);
					}
				}
				if (lines.Children.Count > 0) svg.Children.Add(lines);

				// arcs
				var arcs = new SvgGroup();
				arcs.Stroke = new SvgColourServer(Color.Black);
				// arcs.StrokeWidth = 1;
				// arcs.Fill = new SvgColourServer(Color.Transparent);
				// arcs.FillOpacity = 1.0f;
				foreach (var a in model.Arcs)
				{
					if (a.IsVisible)
					{
						var startPoint = new PointF(a.StartPoint.X, maxY - a.StartPoint.Y);
						var endPoint = new PointF(a.EndPoint.X, maxY - a.EndPoint.Y);

						var pathList = new SvgPathSegmentList();

						// add MoveTo
						SvgMoveToSegment svgMove = new SvgMoveToSegment(startPoint);
						pathList.Add(svgMove);

						// add arc segment
						var largeArcFlag = a.EndAngle - a.StartAngle <= 180 ? SvgArcSize.Small : SvgArcSize.Large;
						var sweepFlag = SvgArcSweep.Negative;
						var arc = new SvgArcSegment(startPoint, a.Radius, a.Radius, a.StartAngle, largeArcFlag, sweepFlag, endPoint);
						pathList.Add(arc);

						SvgPath path = new SvgPath();
						path.PathData = pathList;

						arcs.Children.Add(path);
					}
				}
				if (arcs.Children.Count > 0) svg.Children.Add(arcs);

				// polylines
				var polylines = new SvgGroup();
				polylines.Stroke = new SvgColourServer(Color.Purple);
				// polylines.StrokeWidth = 1;
				// polylines.Fill = new SvgColourServer(Color.Transparent);
				// polylines.FillOpacity = 1.0f;
				foreach (var p in model.Polylines)
				{
					// cannot add a polyline with only one point
					if (p.IsVisible && p.Vertexes.Count >= 2)
					{
						var vertexes = new SvgPointCollection();
						foreach (var v in p.Vertexes)
						{
							vertexes.Add(new SvgUnit(v.X));
							vertexes.Add(new SvgUnit(maxY - v.Y));
						}

						var polyLine = new SvgPolyline
						{
							Points = vertexes
						};

						polylines.Children.Add(polyLine);
					}
				}
				if (polylines.Children.Count > 0) svg.Children.Add(polylines);

				// Note! Color.Transparent 
				// produces a svg with a fill-opacity=0 property that isn't supported in TinkerCad
				svg.StrokeWidth = 1;
				svg.Fill = new SvgColourServer(Color.Transparent);
				svg.FillOpacity = 1.0f;

				return svg;
			}

			return null;
		}

		public static string ToGCode(DrawModel model)
		{
			var plungeFeed = 50;
			var rapidFeed = 200;
			var safeZ = 5;

			var sb = new StringBuilder();
			if (model != null)
			{
				sb.AppendLine("G21; Set units to millimeters");
				sb.AppendLine("G90; Set absolute coordinates");
				sb.AppendLine("G17; Set X Y Plane");
				sb.AppendLine();

				// circles
				foreach (var circle in model.Circles)
				{
					if (circle.IsVisible)
					{
						var centerX = circle.Center.X;
						var centerY = circle.Center.Y;
						var centerZ = circle.Center.Z;
						var radius = circle.Radius;

						var startX = centerX - radius;
						var startY = centerY;

						sb.AppendLine("(Draw Circle)");
						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 X{0:0.##} Y{1:0.##} \n", startX, startY);
						sb.AppendFormat(CultureInfo.InvariantCulture, "G1 Z{0:0.##} F{1:0.##}\n", centerZ, plungeFeed);

						// G2 = clockwise arc
						// G3 = counter clockwise arc
						sb.AppendFormat(CultureInfo.InvariantCulture, "G3 I{0:0.##} J{1:0.##} F{2:0.##}\n", radius, 0, rapidFeed);

						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
						sb.AppendLine();
					}
				}

				// lines
				foreach (var line in model.Lines)
				{
					if (line.IsVisible)
					{
						var startX = line.StartPoint.X;
						var startY = line.StartPoint.Y;
						var startZ = line.StartPoint.Z;
						var endX = line.EndPoint.X;
						var endY = line.EndPoint.Y;
						var endZ = line.EndPoint.Z;

						sb.AppendLine("(Draw Line)");
						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 X{0:0.##} Y{1:0.##} \n", startX, startY);
						sb.AppendFormat(CultureInfo.InvariantCulture, "G1 Z{0:0.##} F{1:0.##}\n", startZ, plungeFeed);

						sb.AppendFormat(CultureInfo.InvariantCulture, "G1 X{0:0.##} Y{1:0.##} F{2:0.##}\n", endX, endY, rapidFeed);

						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
						sb.AppendLine();
					}
				}

				// arcs
				foreach (var a in model.Arcs)
				{
					if (a.IsVisible)
					{
						var centerX = a.Center.X;
						var centerY = a.Center.Y;
						var centerZ = a.Center.Z;
						var radius = a.Radius;
						var startAngle = a.StartAngle;
						var endAngle = a.EndAngle;

						var startX = centerX + Math.Cos((startAngle * Math.PI) / 180) * radius;
						var startY = centerY + Math.Sin((startAngle * Math.PI) / 180) * radius;
						var endX = centerX + Math.Cos((endAngle * Math.PI) / 180) * radius;
						var endY = centerY + Math.Sin((endAngle * Math.PI) / 180) * radius;

						sb.AppendLine("(Draw Arc)");
						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 X{0:0.##} Y{1:0.##} \n", startX, startY);
						sb.AppendFormat(CultureInfo.InvariantCulture, "G1 Z{0:0.##} F{1:0.##}\n", centerZ, plungeFeed);

						// G2 = clockwise arc
						// G3 = counter clockwise arc					
						sb.AppendFormat(CultureInfo.InvariantCulture, "G3 X{0:0.##} Y{1:0.##} I{2:0.##} J{3:0.##} F{4:0.##}\n", endX, endY, centerX - startX, centerY - startY, rapidFeed);

						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
						sb.AppendLine();
					}
				}

				// polylines
				foreach (var p in model.Polylines)
				{
					if (p.IsVisible && p.Vertexes.Count >= 2)
					{
						bool first = true;

						for (var i = 0; i < p.Vertexes.Count; i++)
						{
							var vertex = p.Vertexes[i];
							var pointX = vertex.X;
							var pointY = vertex.Y;
							var pointZ = vertex.Z;

							if (first)
							{
								sb.AppendLine("(Draw Polyline)");
								sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
								sb.AppendFormat(CultureInfo.InvariantCulture, "G0 X{0:0.##} Y{1:0.##} \n", pointX, pointY);
								sb.AppendFormat(CultureInfo.InvariantCulture, "G1 Z{0:0.##} F{1:0.##}\n", pointZ, plungeFeed);
								first = false;
							}
							else
							{
								sb.AppendFormat(CultureInfo.InvariantCulture, "G1 X{0:0.##} Y{1:0.##} F{2:0.##}\n", pointX, pointY, rapidFeed);
							}
						}
						sb.AppendFormat(CultureInfo.InvariantCulture, "G0 Z{0:0.##}\n", safeZ);
						sb.AppendLine();
					}
				}
			}
			return sb.ToString();
		}

		// parameter-less constructor needed for de-serialization
		public DrawModel()
		{
			Bounds = new Bounds();
			Circles = new List<DrawCircle>();
			Lines = new List<DrawLine>();
			Arcs = new List<DrawArc>();
			Polylines = new List<DrawPolyline>();
		}

		public DrawModel(netDxf.DxfDocument dxf, string fileName, bool useContours = true) : this()
		{
			FileName = fileName;

			if (dxf != null)
			{
				if (!useContours)
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

					// add polylines lightweight as normal polylines
					foreach (var p in dxf.LwPolylines)
					{
						Polylines.Add(new DrawPolyline(p));
					}
				}
				else
				{
					// use contours, i.e. convert everything to polylines
					int shapeCounter = 0;

					// Enumerate each contour in the document

					// circles
					foreach (var c in dxf.Circles)
					{
						shapeCounter++;

						var cx = c.Center.X;
						var cy = c.Center.Y;
						var r = c.Radius;

						var points = Transformation.RenderCircle(cx, cy, r);

						// add as separate polylines
						var polyline = new DrawPolyline(points);
						Polylines.Add(polyline);
					}

					// lines
					foreach (var l in dxf.Lines)
					{
						shapeCounter++;

						Lines.Add(new DrawLine(l));
					}

					// arcs
					foreach (var a in dxf.Arcs)
					{
						shapeCounter++;

						var centerX = a.Center.X;
						var centerY = a.Center.Y;
						var radius = a.Radius;
						var startAngle = a.StartAngle;
						var endAngle = a.EndAngle;

						var points = Transformation.RenderArc(centerX, centerY, radius, startAngle, endAngle);

						// add as separate polylines
						var polyline = new DrawPolyline(points);
						Polylines.Add(polyline);
					}

					// polylines
					foreach (var p in dxf.Polylines)
					{
						shapeCounter++;

						Polylines.Add(new DrawPolyline(p));
					}

					// add polylines lightweight as normal polylines
					foreach (var p in dxf.LwPolylines)
					{
						shapeCounter++;

						Polylines.Add(new DrawPolyline(p));
					}
				}

				CalculateBounds();
			}
		}

		/// <summary>
		/// Convert a SVG Document to a DrawModel
		/// </summary>
		/// <param name="svg">the svg document</param>
		/// <param name="fileName">the filename</param>
		/// <param name="useContours">use contours (polylines) instead of geometrical shapes, default true</param>
		/// <returns>a draw model</returns>
		public DrawModel(SVG.SVGDocument svg, string fileName, bool useContours = true) : this()
		{
			FileName = fileName;

			if (svg != null)
			{
				var contours = svg.GetScaledContoursAndSetMinMax();

				// Assuming these points come from a SVG
				// we need to shift the Y pos since
				// the SVG origin is upper left, while in DXF and GCode it is assumed to be lower left
				var minX = svg.MinX;
				var minY = svg.MinY;
				var maxX = svg.MaxX;
				var maxY = svg.MaxY;

				var shiftX = 0; // to shift (crop) in X direction use minX
				var shiftY = svg.SvgHeight > 0 ? svg.SvgHeight : maxY; // to shift (crop) in Y direction except flipping, use maxY

				// we are not shifting except flipping
				Bounds = new Bounds(minX, maxX, shiftY - maxY, shiftY - minY, 0, 0);

				if (!useContours)
				{
					foreach (var shape in svg.Shapes)
					{
						var elem = shape.DrawModel;

						Circles.AddRange(elem.Circles.Select(c => new DrawCircle(new PointF { X = c.Center.X - shiftX, Y = shiftY - c.Center.Y }, c.Radius)).ToList());
						Lines.AddRange(elem.Lines.Select(l => new DrawLine(new PointF { X = l.StartPoint.X - shiftX, Y = shiftY - l.StartPoint.Y }, new PointF { X = l.EndPoint.X - shiftX, Y = shiftY - l.EndPoint.Y })).ToList());
						Arcs.AddRange(elem.Arcs.Select(a => new DrawArc(new PointF { X = a.Center.X - shiftX, Y = shiftY - a.Center.Y }, a.Radius, -a.EndAngle, -a.StartAngle)).ToList());

						// fix vertexes for polylines
						var polylines = (elem.Polylines.Select(a => new DrawPolyline(a.Vertexes.Select(b => new PointF { X = b.X - shiftX, Y = shiftY - b.Y }).ToList())));
						Polylines.AddRange(polylines);

						// svg doesn't have polylines lw
					}
				}
				else
				{
					// use contours
					int contourCounter = 0;

					// Enumerate each contour in the document
					foreach (var contour in contours)
					{
						contourCounter++;

						// add as separate polylines
						var vertexes = contour.Select(b => new Point3D(b.X - shiftX, shiftY - b.Y)).ToList();
						var polyline = new DrawPolyline(vertexes);
						Polylines.Add(polyline);
					}
				}
			}
		}

		public DrawModel(string gcode, string fileName) : this()
		{
			bool doReadUsingBlocks = false; // note! block reading doesn't support native arc, only arcs as polylines
			var doRenderArcAsPolyline = false;

			FileName = fileName;

			if (gcode != null)
			{
				var parsedInstructions = SimpleGCodeParser.ParseText(gcode);

				if (doReadUsingBlocks)
				{
					RenderGCodeAsBlock(parsedInstructions);
				}
				else
				{
					// set default arc parameters
					bool AbsoluteMode = true;
					bool AbsoluteArcCenterMode = false;
					bool Metric = true;

					var currentPosition = new Point3D();
					foreach (var currentInstruction in parsedInstructions)
					{
						var CommandType = currentInstruction.CommandType;
						var Command = currentInstruction.Command;
						var X = currentInstruction.X;
						var Y = currentInstruction.Y;
						var Z = currentInstruction.Z;
						var I = currentInstruction.I;
						var J = currentInstruction.J;

						if (CommandType == CommandType.Other)
						{
							if (Command == "G90") { AbsoluteMode = true; }
							if (Command == "G90.1") { AbsoluteArcCenterMode = true; }
							if (Command == "G91") { AbsoluteMode = false; }
							if (Command == "G91.1") { AbsoluteArcCenterMode = false; }
							if (Command == "G21") { Metric = true; }
							if (Command == "G20") { Metric = false; }
							continue;
						}
						if (CommandType == CommandType.Dwell)
						{
							// ignore
							continue;
						}

						var pos = new Point3D(currentPosition.X, currentPosition.Y, currentPosition.Z);

						if (CommandType == CommandType.ProbeTarget)
						{
							// if this is a probe, paint a circle at the point
							var radius = 4;
							AddCircle(pos.PointF, radius);
						}

						if (AbsoluteMode)
						{
							if (X.HasValue)
								pos.X = X.Value;
							if (Y.HasValue)
								pos.Y = Y.Value;
							if (Z.HasValue)
								pos.Z = Z.Value;
						}
						else
						{
							// relative specifies a delta
							if (X.HasValue)
								pos.X += X.Value;
							if (Y.HasValue)
								pos.Y += Y.Value;
							if (Z.HasValue)
								pos.Z += Z.Value;
						}

						if (!Metric)
						{
							pos.X *= 25.4f;
							pos.Y *= 25.4f;
							pos.Z *= 25.4f;
						}

						if (CommandType == CommandType.RapidMove || CommandType == CommandType.NormalMove)
						{
							var line = new LinePoints(currentPosition, pos, CommandType == CommandType.RapidMove ? PenColorList.RapidMove : PenColorList.NormalMove);
							currentPosition.X = pos.X;
							currentPosition.Y = pos.Y;
							currentPosition.Z = pos.Z;

							// ignore points that don't move in X or Y direction
							if (line.X1 == line.X2 && line.Y1 == line.Y2) continue;

							if (line.Pen == PenColorList.RapidMove)
							{
								// we represent rapid movements as invisible lines
								var rapidLine = new DrawLine(new PointF(line.X1, line.Y1), new PointF(line.X2, line.Y2));
								rapidLine.IsVisible = false;
								if (!Lines.Contains(rapidLine)) Lines.Add(rapidLine);
							}
							else
							{
								var normalLine = new DrawLine(new PointF(line.X1, line.Y1), new PointF(line.X2, line.Y2));
								normalLine.IsVisible = true;
								if (!Lines.Contains(normalLine)) Lines.Add(normalLine);
							}
							continue;
						}

						if (CommandType == CommandType.CWArc || CommandType == CommandType.CCWArc)
						{
							var current = new Point3D(currentPosition.X, currentPosition.Y, currentPosition.Z);

							// set center
							var center = new Point3D(0f, 0f, 0f);
							if (AbsoluteArcCenterMode)
							{
								center.X = I ?? 0;
								center.Y = J ?? 0;
							}
							else
							{
								center.X = current.X + I ?? 0;
								center.Y = current.Y + J ?? 0;
							}

							if (doRenderArcAsPolyline)
							{
								// render arcs as polylines instead of real arcs

								var arcPoints = currentInstruction.RenderArc(center, pos, (CommandType == CommandType.CWArc), ref currentPosition);

								// add arcs as polylines
								var vertexes = new List<Point3D>();
								var curP2 = new Point3D();

								foreach (var arcPoint in arcPoints)
								{
									var p1 = new Point3D(arcPoint.X1, arcPoint.Y1, arcPoint.Z1);
									var p2 = new Point3D(arcPoint.X2, arcPoint.Y2, arcPoint.Z2);

									if (p1.PointF == p2.PointF)
									{
										// if these are the same, we are only moving in z direction
										// ignore
									}
									else
									{
										// a closed polyline has the same first and last point
										// but a line plot contains from and to points
										// solve this by only adding p1, and make sure to add p2 as the very last point
										vertexes.Add(p1);
										curP2 = p2; // store p2 for later
									}
								}
								vertexes.Add(curP2);

								if (vertexes.Count > 0)
								{
									// add information
									var poly = new DrawPolyline();
									poly.Vertexes = vertexes;
									poly.IsVisible = true;
									Polylines.Add(poly);
								}
							}
							else
							{
								// do not render arcs as polyline
								// use real arc's instead

								// figure out our deltas
								var endpoint = pos;
								double aX = current.X - center.X;
								double aY = current.Y - center.Y;
								double bX = endpoint.X - center.X;
								double bY = endpoint.Y - center.Y;

								// angle variables.
								var clockwise = (CommandType == CommandType.CWArc);
								double angleA;
								double angleB;
								if (clockwise)
								{
									// Clockwise
									angleA = Math.Atan2(bY, bX);
									angleB = Math.Atan2(aY, aX);
								}
								else
								{
									// Counterclockwise
									angleA = Math.Atan2(aY, aX);
									angleB = Math.Atan2(bY, bX);
								}

								// calculate a couple useful things.
								double radius = Math.Sqrt(aX * aX + aY * aY);

								// check if this is a full circle
								if (angleA == angleB)
								{
									// full circle
									AddCircle(new PointF(center.X, center.Y), (float)radius);
								}
								else
								{
									// Make sure angleB is always greater than angleA
									// and if not add 2PI so that it is (this also takes
									// care of the special case of angleA == angleB,
									// ie we want a complete circle)
									if (angleB < angleA)
									{
										angleB += 2 * Math.PI;
									}

									AddArc(new PointF(center.X, center.Y), (float)radius, (float)Transformation.RadianToDegree(angleA), (float)Transformation.RadianToDegree(angleB));
								}


								// store the last position
								currentPosition.X = pos.X;
								currentPosition.Y = pos.Y;
								currentPosition.Z = pos.Z;
							}
						}
					}
				}

				CalculateBounds();
			}
		}

		private void RenderGCodeAsBlock(List<GCodeInstruction> parsedInstructions)
		{
			// turn the instructions into blocks
			var myBlocks = GCodeUtils.GetBlocks(parsedInstructions);

			if (myBlocks != null && myBlocks.Count > 0)
			{
				foreach (Block blockItem in myBlocks)
				{
					// cache if this is a drill point
					blockItem.CheckIfDrillOrProbePoint();

					if (blockItem.PlotPoints != null)
					{
						// add each block as polyline
						var vertexes = new List<Point3D>();
						var curP2 = new Point3D();
						foreach (var linePlots in blockItem.PlotPoints)
						{
							var p1 = new Point3D(linePlots.X1, linePlots.Y1, linePlots.Z1);
							var p2 = new Point3D(linePlots.X2, linePlots.Y2, linePlots.Z2);

							if (linePlots.Pen == PenColorList.RapidMove)
							{
								// we represent rapid movements as invisible lines
								var line = new DrawLine(p1.PointF, p2.PointF);
								if (blockItem.Name != null) line.LayerName = blockItem.Name;
								line.IsVisible = false;
								Lines.Add(line);
							}
							else
							{
								if (!blockItem.IsDrillPoint)
								{
									if (p1.PointF == p2.PointF)
									{
										// if these are the same, we are only moving in z direction
										// ignore
									}
									else
									{
										// a closed polyline has the same first and last point
										// but a line plot contains from and to points
										// solve this by only adding p1, and make sure to add p2 as the very last point
										vertexes.Add(p1);
										curP2 = p2; // store p2 for later
									}
								}
							}
						}
						// make sure to add the last p2
						if (!blockItem.IsDrillPoint)
						{
							vertexes.Add(curP2);
						}

						if (vertexes.Count > 0)
						{
							// add information
							var poly = new DrawPolyline();
							poly.Vertexes = vertexes;
							if (blockItem.Name != null) poly.LayerName = blockItem.Name;
							poly.IsVisible = true;
							Polylines.Add(poly);
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

		public void SortStartStopSegments()
		{
			var openList = new List<IStartEndPoint>();
			var orderedList = new List<IStartEndPoint>();

			// add Lines and Arcs
			openList.AddRange(Lines);
			openList.AddRange(Arcs);
			openList.AddRange(Polylines);

			// https://stackoverflow.com/questions/39546622/sort-my-class-by-two-values
			// https://forum.unity.com/threads/sorting-line-segments.254411/
			// https://www.geeksforgeeks.org/cocktail-sort/

			bool foundNext = true;
			while (openList.Count > 0)
			{
				// move entry from open to ordered
				orderedList.Add(openList.ElementAt(0));
				openList.RemoveAt(0);

				// forward direction
				do
				{
					foundNext = false;
					// Iterate the list in reverse with a for loop to be able to remove while iterating
					for (int i = openList.Count - 1; i >= 0; i--)
					{
						var segment = openList.ElementAt(i);
						if (orderedList.Last().EndPoint == segment.StartPoint)
						{
							// move segment from open to end of ordered
							orderedList.Add(segment);
							openList.RemoveAt(i);
							foundNext = true;
							continue;
						}
						else if (orderedList.Last().EndPoint == segment.EndPoint)
						{
							// swap start and end points
							segment.SwapStartEnd();

							// move segment from open to end of ordered
							orderedList.Add(segment);
							openList.RemoveAt(i);
							foundNext = true;
							continue;
						}
					}

				} while (foundNext);

				// backwards direction
				do
				{
					foundNext = false;
					// Iterate the list in reverse with a for loop to be able to remove while iterating
					for (int i = openList.Count - 1; i >= 0; i--)
					{
						var segment = openList.ElementAt(i);
						if (orderedList.First().StartPoint == segment.EndPoint)
						{
							// move segment from open to beginning of ordered
							orderedList.Insert(0, segment);
							openList.RemoveAt(i);
							foundNext = true;
							continue;
						}
						else if (orderedList.First().StartPoint == segment.StartPoint)
						{
							// swap start and end points
							segment.SwapStartEnd();

							// move segment from open to beginning of ordered
							orderedList.Insert(0, segment);
							openList.RemoveAt(i);
							foundNext = true;
							continue;
						}
					}

				} while (foundNext);
			}

			// open list should be empty at this point
			SortedStartEnd = orderedList.ToList();
		}

		public void ConvertLinesToPolylines()
		{
			// lines
			var firstStartPoint = new Point3D();
			var firstEndPoint = new Point3D();

			var prevLine = new DrawLine();
			prevLine.StartPoint = new Point3D();
			prevLine.EndPoint = new Point3D();

			var vertexes = new List<PointF>();

			var drawLines2Remove = new List<DrawLine>();

			// only care about lines
			var lineList = SortedStartEnd.OfType<DrawLine>();
			foreach (var line in lineList)
			{
				if (line.IsVisible)
				{
					if (prevLine.EndPoint == line.StartPoint)
					{
						// found connected lines - add to polyline

						// if we have a closed polyline
						if (line.EndPoint.NearlyEquals(firstStartPoint))
						{
							// Console.WriteLine("Found closed polyline:" + line.EndPoint + " = " + firstStartPoint);

							// add last end point
							vertexes.Add(line.EndPoint.PointF);

							// and add to model 
							AddPolyline(vertexes);

							// remember to remove this line as well
							if (!drawLines2Remove.Contains(line)) drawLines2Remove.Add(line);

							// add reset vertex list
							vertexes = new List<PointF>();
						}
						else
						{
							// Console.WriteLine("Found connected point: " + line.StartPoint + " -> " + line.EndPoint);

							// add both first and this to polyline
							if (!vertexes.Contains(prevLine.StartPoint.PointF)) vertexes.Add(prevLine.StartPoint.PointF);
							if (!vertexes.Contains(prevLine.EndPoint.PointF)) vertexes.Add(prevLine.EndPoint.PointF);
							if (!vertexes.Contains(line.StartPoint.PointF)) vertexes.Add(line.StartPoint.PointF);
							if (!vertexes.Contains(line.EndPoint.PointF)) vertexes.Add(line.EndPoint.PointF);

							// remember to remove these lines as well
							if (!drawLines2Remove.Contains(prevLine)) drawLines2Remove.Add(prevLine);
							if (!drawLines2Remove.Contains(line)) drawLines2Remove.Add(line);
						}
					}
					else
					{
						// first point or not a connected polyline anylonger
						// reset first points
						firstStartPoint = line.StartPoint;
						firstEndPoint = line.EndPoint;

						// Console.WriteLine("Found potential new start point: " + firstStartPoint + " -> " + firstEndPoint);

						// in case this is not a closed polygon, make sure to add existing vertexes
						if (vertexes.Count > 0)
						{
							// Console.WriteLine("Adding non-closed polyline. Vertex count: " + vertexes.Count);
							AddPolyline(vertexes);
						}

						// add reset vertex list
						vertexes = new List<PointF>();
					}

					prevLine = line;
				}
			}

			// remove the lines that are now redundant
			Lines = Lines.Except(drawLines2Remove).ToList();
		}

		public void AddPolyline(List<PointF> vertexes, bool isVisible = true)
		{
			var poly = new DrawPolyline(vertexes, isVisible);
			Polylines.Add(poly);
		}

		public void AddLine(PointF startPoint, PointF endPoint, bool isVisible = true)
		{
			var line = new DrawLine(startPoint, endPoint, isVisible);
			Lines.Add(line);
		}

		public void AddCircle(PointF center, float radius, bool isVisible = true)
		{
			var circle = new DrawCircle(center, radius, isVisible);
			Circles.Add(circle);
		}

		public void AddArc(PointF center, float radius, float startAngle, float endAngle, bool isVisible = true)
		{
			var arc = new DrawArc(center, radius, startAngle, endAngle, isVisible);
			Arcs.Add(arc);
		}

		public void CalculateBounds()
		{
			// calculate max values for X, Y and Z
			var maxX = -1000000.0;
			var maxY = -1000000.0;
			var maxZ = -1000000.0;
			var minX = 1000000.0;
			var minY = 1000000.0;
			var minZ = 1000000.0;
			var curX = 0.0;
			var curY = 0.0;
			var curZ = 0.0;

			// circles
			foreach (var circle in Circles)
			{
				if (circle.IsVisible)
				{
					var x = circle.Center.X;
					var y = circle.Center.Y;
					var z = circle.Center.Z;
					var radius = circle.Radius;

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

					curZ = z;
					maxZ = curZ > maxZ ? curZ : maxZ;
					minZ = curZ < minZ ? curZ : minZ;
				}
			}

			// lines
			foreach (var line in Lines)
			{
				if (line.IsVisible)
				{
					var startX = line.StartPoint.X;
					var startY = line.StartPoint.Y;
					var startZ = line.StartPoint.Z;
					var endX = line.EndPoint.X;
					var endY = line.EndPoint.Y;
					var endZ = line.EndPoint.Z;

					curX = startX;
					curY = startY;
					curZ = startZ;
					maxX = curX > maxX ? curX : maxX;
					minX = curX < minX ? curX : minX;
					maxY = curY > maxY ? curY : maxY;
					minY = curY < minY ? curY : minY;
					maxZ = curZ > maxZ ? curZ : maxZ;
					minZ = curZ < minZ ? curZ : minZ;

					curX = endX;
					curY = endY;
					curZ = endZ;
					maxX = curX > maxX ? curX : maxX;
					minX = curX < minX ? curX : minX;
					maxY = curY > maxY ? curY : maxY;
					minY = curY < minY ? curY : minY;
					maxZ = curZ > maxZ ? curZ : maxZ;
					minZ = curZ < minZ ? curZ : minZ;
				}
			}

			// arcs
			foreach (var a in Arcs)
			{
				if (a.IsVisible)
				{
					var centerX = a.Center.X;
					var centerY = a.Center.Y;
					var centerZ = a.Center.Z;

					var box = Transformation.GetArcBounds(Transformation.DegreeToRadian(a.StartAngle), Transformation.DegreeToRadian(a.EndAngle), a.Radius);
					var startX = box.X + centerX;
					var startY = box.Y + centerY;
					var endX = box.X + centerX + box.Width;
					var endY = box.Y + centerY + box.Height;

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

					// cannot include center since the center can be way outside the image for some arcs
					// curX = centerX;
					// curY = centerY;
					// maxX = curX > maxX ? curX : maxX;
					// minX = curX < minX ? curX : minX;
					// maxY = curY > maxY ? curY : maxY;
					// minY = curY < minY ? curY : minY;

					curZ = centerZ;
					maxZ = curZ > maxZ ? curZ : maxZ;
					minZ = curZ < minZ ? curZ : minZ;
				}
			}

			// polylines
			foreach (var p in Polylines)
			{
				if (p.IsVisible && p.Vertexes.Count >= 2)
				{
					for (var i = 0; i < p.Vertexes.Count; i++)
					{
						var vertex = p.Vertexes[i];
						var pointX = vertex.X;
						var pointY = vertex.Y;
						var pointZ = vertex.Z;

						curX = pointX;
						curY = pointY;
						curZ = pointZ;
						maxX = curX > maxX ? curX : maxX;
						minX = curX < minX ? curX : minX;
						maxY = curY > maxY ? curY : maxY;
						minY = curY < minY ? curY : minY;
						maxZ = curZ > maxZ ? curZ : maxZ;
						minZ = curZ < minZ ? curZ : minZ;
					}
				}
			}

			Bounds = new Bounds((float)minX, (float)maxX, (float)minY, (float)maxY, (float)minZ, (float)maxZ);
		}

		public void Trim()
		{
			// should we include invisible sections as well? typically rapid movements in gcode
			bool doIncludeInvisible = true;

			// don't do any trimming if the min values are already 0
			if (Bounds.Min.X == 0 && Bounds.Min.Y == 0) return;

			// circles
			foreach (var circle in Circles)
			{
				if (doIncludeInvisible || circle.IsVisible)
				{
					circle.Center.X -= Bounds.Min.X;
					circle.Center.Y -= Bounds.Min.Y;
				}
			}

			// lines
			foreach (var line in Lines)
			{
				if (doIncludeInvisible || line.IsVisible)
				{
					// if this is a invisible line (like rapid moves)
					// and the start point or end point is 0
					// keep the one that starts at 0,0 (start)
					if (!line.IsVisible && line.StartPoint.X == 0 && line.StartPoint.Y == 0)
					{
						// change end point
						line.EndPoint.X -= Bounds.Min.X;
						line.EndPoint.Y -= Bounds.Min.Y;
					}
					else if (!line.IsVisible && line.EndPoint.X == 0 && line.EndPoint.Y == 0)
					{
						// change start point
						line.StartPoint.X -= Bounds.Min.X;
						line.StartPoint.Y -= Bounds.Min.Y;
					}
					else
					{
						// change both
						line.StartPoint.X -= Bounds.Min.X;
						line.StartPoint.Y -= Bounds.Min.Y;
						line.EndPoint.X -= Bounds.Min.X;
						line.EndPoint.Y -= Bounds.Min.Y;
					}
				}
			}

			// arcs
			foreach (var a in Arcs)
			{
				if (doIncludeInvisible || a.IsVisible)
				{
					a.Center.X -= Bounds.Min.X;
					a.Center.Y -= Bounds.Min.Y;
				}
			}

			// polylines
			foreach (var p in Polylines)
			{
				if (p.Vertexes.Count >= 2 && doIncludeInvisible || p.IsVisible)
				{
					for (int i = 0; i < p.Vertexes.Count; i++)
					{
						var vertex = p.Vertexes[i];
						vertex.X -= Bounds.Min.X;
						vertex.Y -= Bounds.Min.Y;
					}
				}
			}

			// update bounds
			Bounds = new Bounds(0, Bounds.Max.X - Bounds.Min.X, 0, Bounds.Max.Y - Bounds.Min.Y, Bounds.Min.Z, Bounds.Max.Z);
		}
	}
}
