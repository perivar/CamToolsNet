using System;
using System.Collections.Generic;
using System.Drawing;
using System.Globalization;
using System.Linq;
using System.Text;
using CoordinateUtils;
using GCode;

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
		public List<DrawPolylineLW> PolylinesLW { get; set; }

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

		public abstract class DrawElement
		{
			public string CodeName { get; set; }
			public DrawColor Color { get; set; }
			public bool IsVisible { get; set; }
			public string LayerName { get; set; }

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
			public DrawCircle(PointF center, float radius)
			{
				Center = new Point3D(center.X, center.Y);
				Radius = radius;
				IsVisible = true;
			}

			public DrawCircle(netDxf.Entities.Circle c) : base(c)
			{
				Center = new Point3D((float)c.Center.X, (float)c.Center.Y, (float)c.Center.Z);
				Radius = (float)c.Radius;
				Thickness = (float)c.Thickness;
				IsVisible = true;
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
				IsVisible = true;
			}

			public DrawLine(netDxf.Entities.Line l) : base(l)
			{
				StartPoint = new Point3D((float)l.StartPoint.X, (float)l.StartPoint.Y, (float)l.StartPoint.Z);
				EndPoint = new Point3D((float)l.EndPoint.X, (float)l.EndPoint.Y, (float)l.EndPoint.Z);
				IsVisible = true;
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
				IsVisible = true;
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
				IsVisible = true;
			}

			public DrawPolyline(List<Point3D> vertexes)
			{
				Vertexes = vertexes;
				IsVisible = true;
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
				IsVisible = true;
			}
		}

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

				// polylines light weight
				var polylinesLW = new List<netDxf.Entities.LwPolyline>();
				foreach (var p in model.PolylinesLW)
				{
					// cannot add a polyline with only one point
					if (p.IsVisible && p.Vertexes.Count >= 2)
					{
						var vertexes = new List<netDxf.Entities.LwPolylineVertex>();
						foreach (var v in p.Vertexes)
						{
							vertexes.Add(new netDxf.Entities.LwPolylineVertex(v.Position.X, v.Position.Y, v.Bulge));
						}
						var polyLineLW = new netDxf.Entities.LwPolyline(vertexes, p.IsClosed);
						if (p.LayerName != null) polyLineLW.Layer = new netDxf.Tables.Layer(p.LayerName);
						polylinesLW.Add(polyLineLW);
					}
				}
				dxf.AddEntity(polylinesLW);

				return dxf;
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

				// polylines light weight
				foreach (var plw in model.PolylinesLW)
				{
					if (plw.IsVisible && plw.Vertexes.Count >= 2)
					{
						bool first = true;
						for (var i = 0; i < plw.Vertexes.Count; i++)
						{
							var vertex = plw.Vertexes[i];
							var pointX = vertex.Position.X;
							var pointY = vertex.Position.Y;
							// polyline vertex doesn't have Z
							var pointZ = safeZ;

							if (first)
							{
								sb.AppendLine("(Draw Polyline LW)");
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

				CalculateBounds();
			}
		}

		public DrawModel(SVG.SVGDocument svg, string fileName) : this()
		{
			FileName = fileName;

			if (svg != null)
			{
				var contours = svg.GetScaledContoursAndSetMinMax();
				var maxY = svg.MaxY;
				var minX = svg.MinX;
				// Make sure we are taking the shift of y origin into account
				Bounds = new Bounds(0, svg.MaxX - svg.MinX, 0, svg.MaxY - svg.MinY, 0, 0);

				// Assuming these points come from a SVG
				// we need to shift the Y pos since
				// the SVG origin is upper left, while in DXF and GCode it is assumed to be lower left

				foreach (var shape in svg.Shapes)
				{
					var elem = shape.DrawModel;

					Circles.AddRange(elem.Circles.Select(c => new DrawCircle(new PointF { X = c.Center.X - minX, Y = maxY - c.Center.Y }, c.Radius)).ToList());
					Lines.AddRange(elem.Lines.Select(l => new DrawLine(new PointF { X = l.StartPoint.X - minX, Y = maxY - l.StartPoint.Y }, new PointF { X = l.EndPoint.X - minX, Y = maxY - l.EndPoint.Y })).ToList());
					Arcs.AddRange(elem.Arcs.Select(a => new DrawArc(new PointF { X = a.Center.X - minX, Y = maxY - a.Center.Y }, a.Radius, -a.EndAngle, -a.StartAngle)).ToList());

					// fix vertexes for polylines
					var polylines = (elem.Polylines.Select(a => new DrawPolyline(a.Vertexes.Select(b => new PointF { X = b.X - minX, Y = maxY - b.Y }).ToList())));
					Polylines.AddRange(polylines);

					// svg doesn't have polylines lw
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

							if (line.Pen == PenColorList.RapidMove)
							{
								// we represent rapid movements as invisible lines
								var rapidLine = new DrawLine(new PointF(line.X1, line.Y1), new PointF(line.X2, line.Y2));
								rapidLine.IsVisible = false;
								Lines.Add(rapidLine);
							}
							else
							{
								AddLine(new PointF(line.X1, line.Y1), new PointF(line.X2, line.Y2));
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

								// Make sure angleB is always greater than angleA
								// and if not add 2PI so that it is (this also takes
								// care of the special case of angleA == angleB,
								// ie we want a complete circle)
								if (angleB <= angleA)
								{
									angleB += 2 * Math.PI;
								}

								// calculate a couple useful things.
								double radius = Math.Sqrt(aX * aX + aY * aY);

								AddArc(new PointF(center.X, center.Y), (float)radius, (float)Transformation.RadianToDegree(angleA), (float)Transformation.RadianToDegree(angleB));

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

			// polylines light weight
			foreach (var plw in PolylinesLW)
			{
				if (plw.IsVisible && plw.Vertexes.Count >= 2)
				{
					for (var i = 0; i < plw.Vertexes.Count; i++)
					{
						var vertex = plw.Vertexes[i];
						var pointX = vertex.Position.X;
						var pointY = vertex.Position.Y;
						// polyline vertex doesn't have Z

						curX = pointX;
						curY = pointY;
						maxX = curX > maxX ? curX : maxX;
						minX = curX < minX ? curX : minX;
						maxY = curY > maxY ? curY : maxY;
						minY = curY < minY ? curY : minY;
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
					line.StartPoint.X -= Bounds.Min.X;
					line.StartPoint.Y -= Bounds.Min.Y;
					line.EndPoint.X -= Bounds.Min.X;
					line.EndPoint.Y -= Bounds.Min.Y;

					// none of these are likely less than 0
					line.StartPoint.X = Math.Max(line.StartPoint.X, 0);
					line.StartPoint.Y = Math.Max(line.StartPoint.Y, 0);
					line.EndPoint.X = Math.Max(line.EndPoint.X, 0);
					line.EndPoint.Y = Math.Max(line.EndPoint.Y, 0);
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

			// polylines light weight
			foreach (var p in PolylinesLW)
			{
				if (p.Vertexes.Count >= 2 && doIncludeInvisible || p.IsVisible)
				{
					for (int i = 0; i < p.Vertexes.Count; i++)
					{
						var vertex = p.Vertexes[i];
						vertex.Position.X -= Bounds.Min.X;
						vertex.Position.Y -= Bounds.Min.Y;
					}
				}
			}

			// update bounds
			Bounds = new Bounds(0, Bounds.Max.X - Bounds.Min.X, 0, Bounds.Max.Y - Bounds.Min.Y, Bounds.Min.Z, Bounds.Max.Z);
		}
	}
}
