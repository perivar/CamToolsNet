﻿// Most of this comes from the lasercam project made by Chris Yerga
// Copyright (c) 2010 Chris Yerga

// Modified heavily by perivar@nerseth.com to amongst others support OpenScad SVGs import
// Also leaned heavily on the SVG-to-GCode project https://github.com/avwuff/SVG-to-GCode
using System;
using System.Collections.Generic;
using System.Drawing.Drawing2D;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using System.Globalization;
using System.Diagnostics;
using System.Net.Http;
using System.Numerics;

using CoordinateUtils;
using BiArcUtils;
using CAMToolsNet.Models;

namespace SVG
{
	/// <summary>
	/// A collection of static SVG Util methods
	/// </summary>
	public static class SVGUtils
	{
		// zero (or epsilon)
		public const float SELF_ZERO = 0.0000001f;

		/// <summary>
		/// Read from the data string while a whitespace is found
		/// </summary>
		/// <param name="data">data string</param>
		/// <param name="index">starting position (incremented)</param>
		public static void SkipWhiteSpace(string data, ref int index)
		{
			// Skip any white space.
			while (index < data.Length)
			{
				char character = data[index];

				// List all white space characters here
				if (char.IsWhiteSpace(character) || character == ',')
				{
					// Continue
				}
				else
				{
					return;
				}
				++index;
			}
			return;
		}

		/// <summary>
		/// Read from the data string until a space or comma is found
		/// </summary>
		/// <param name="data">data strin</param>
		/// <param name="index">starting position (incremented)</param>
		/// <returns>the extracted token string</returns>
		public static string ExtractToken(string data, ref int index)
		{
			// Extract until we get a space or a comma
			var builder = new StringBuilder();

			int startIndex = 0;
			char character;
			bool seenMinus = false;
			bool seenE = false;

			startIndex = index;

			while (index < data.Length)
			{
				character = data[index];

				switch (character)
				{
					// Only accept numbers
					case '-':
						if (seenE)
						{
							builder.Append(character);
							++index;
						}
						else if (seenMinus || index > startIndex)
						{
							// We already saw a minus sign
							return builder.ToString();
						}
						else
						{
							seenMinus = true;
							builder.Append(character);
							++index;
						}
						break;
					case '0':
					case '1':
					case '2':
					case '3':
					case '4':
					case '5':
					case '6':
					case '7':
					case '8':
					case '9':
					case '.':
						builder.Append(character);
						++index;
						//,6.192 -10e-4,12.385
						break;
					case 'e': // Exponent
						seenE = true;
						builder.Append(character);
						++index;
						break;
					default:
						return builder.ToString();
				}
			}
			return builder.ToString();
		}

		/// <summary>
		/// Read a float from the XElement
		/// </summary>
		/// <param name="element">X Element</param>
		/// <param name="attributeName">name of attribute</param>
		/// <returns>a float value or zero</returns>
		public static float ReadFloat(XElement element, string attributeName)
		{
			float value = 0.0f;
			string attributeValue = GetAttribute(element, attributeName);
			float.TryParse(attributeValue, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out value);
			return value;
		}

		/// <summary>
		/// Return the attribute value (or default value if it doesn't exist)
		/// </summary>
		/// <param name="element">the XElement</param>
		/// <param name="attributeName">the attribute name</param>
		/// <param name="defaultValue">default value to return if the attribute doesn't exist</param>
		/// <returns>value or default value (if the attribute doesn't exist)</returns>
		public static string GetAttribute(XElement element, string attributeName, string defaultValue = null)
		{
			return (string)element.Attribute(attributeName) ?? defaultValue;
		}

		/// <summary>
		/// Find out how many segments to use for the bezier curves
		/// I.e. 1 / number of segments
		/// </summary>
		/// <param name="startpoint">start point</param>
		/// <param name="endpoint">end point</param>
		/// <param name="svgImportResolution">SVG Import Resolution (1.0f is mm)</param>
		/// <returns>delta step = 1 / number of segments</returns>
		public static double GetDeltaStep(PointF startpoint, PointF endpoint, float svgImportResolution)
		{
			// SVG Import Resolution (1.0f is mm)
			double distance = Transformation.Distance(startpoint, endpoint) / svgImportResolution;

			// with a resolution of 500 dpi, the curve should be split into 500 segments per inch.
			// so a distance of 1 should be 500 segments, which is 0.002

			double segments = distance / 4; // turns out distance / 4 works pretty OK

			return Math.Max(0.01, 1.0 / segments);
		}

		/// <summary>
		/// Parse Arc Segment
		/// </summary>
		/// <param name="RX">radius X</param>
		/// <param name="RY">radius Y</param>
		/// <param name="rotAng">rotation angle in degrees</param>
		/// <param name="P1">start point</param>
		/// <param name="P2">end point</param>
		/// <param name="largeArcFlag">use large arc (meaning the longest distance between the two points)</param>
		/// <param name="sweepFlag">if true use increasing sweep (otherwise decreasing)</param>
		/// <returns>a list of points forming the arc</returns>
		public static List<PointF> ParseArcSegment(float RX, float RY, float rotAng, PointF P1, PointF P2, bool largeArcFlag, bool sweepFlag, int numSegments = -1)
		{
			// Parse "A" command in SVG, which is segments of an arc
			// P1 is start point
			// P2 is end point

			var points = new List<PointF>();

			PointF centerPoint = PointF.Empty;
			double theta = 0;
			PointF P1Prime = PointF.Empty;
			PointF P2Prime = PointF.Empty;

			PointF CPrime = PointF.Empty;
			double Q = 0;
			double qTop = 0;
			double qBot = 0;
			double c = 0;

			double startAng = 0;
			double endAng = 0;
			double ang = 0;
			double angStep = 0;

			PointF tempPoint = PointF.Empty;
			double tempAng = 0;
			double tempDist = 0;

			double theta1 = 0;
			double thetaDelta = 0;

			// Turn the degrees of rotation into radians
			theta = Transformation.DegreeToRadian(rotAng);

			// Calculate P1Prime
			P1Prime.X = (float)((Math.Cos(theta) * ((P1.X - P2.X) / 2)) + (Math.Sin(theta) * ((P1.Y - P2.Y) / 2)));
			P1Prime.Y = (float)((-Math.Sin(theta) * ((P1.X - P2.X) / 2)) + (Math.Cos(theta) * ((P1.Y - P2.Y) / 2)));

			P2Prime.X = (float)((Math.Cos(theta) * ((P2.X - P1.X) / 2)) + (Math.Sin(theta) * ((P2.Y - P1.Y) / 2)));
			P2Prime.Y = (float)((-Math.Sin(theta) * ((P2.X - P1.X) / 2)) + (Math.Cos(theta) * ((P2.Y - P1.Y) / 2)));

			qTop = (((Math.Pow(RX, 2))) * ((Math.Pow(RY, 2)))) - (((Math.Pow(RX, 2))) * ((Math.Pow(P1Prime.Y, 2)))) - (((Math.Pow(RY, 2))) * ((Math.Pow(P1Prime.X, 2))));

			// We've been given an invalid arc. Calculate the correct value.
			if (qTop < 0)
			{
				c = Math.Sqrt((((Math.Pow(P1Prime.Y, 2))) / ((Math.Pow(RY, 2)))) + (((Math.Pow(P1Prime.X, 2))) / ((Math.Pow(RX, 2)))));

				RX = (float)(RX * c);
				RY = (float)(RY * c);

				qTop = 0;
			}

			qBot = (((Math.Pow(RX, 2))) * ((Math.Pow(P1Prime.Y, 2)))) + (((Math.Pow(RY, 2))) * ((Math.Pow(P1Prime.X, 2))));
			if (qBot != 0)
			{
				Q = Math.Sqrt(qTop / qBot);
			}
			else
			{
				Q = 0;
			}

			// Q is negative
			if (largeArcFlag == sweepFlag)
			{
				Q = -Q;
			}

			// Calculate Center Prime
			CPrime.X = 0;

			if (RY != 0)
			{
				CPrime.X = (float)(Q * ((RX * P1Prime.Y) / RY));
			}
			if (RX != 0)
			{
				CPrime.Y = (float)(Q * -((RY * P1Prime.X) / RX));
			}

			// Calculate center point
			centerPoint.X = (float)(((Math.Cos(theta) * CPrime.X) - (Math.Sin(theta) * CPrime.Y)) + ((P1.X + P2.X) / 2));
			centerPoint.Y = (float)(((Math.Sin(theta) * CPrime.X) + (Math.Cos(theta) * CPrime.Y)) + ((P1.Y + P2.Y) / 2));

			// Calculate Theta1
			theta1 = Transformation.GetAngleRadians(P1Prime, CPrime);
			thetaDelta = Transformation.GetAngleRadians(P2Prime, CPrime);

			theta1 = theta1 - Math.PI;
			thetaDelta = thetaDelta - Math.PI;

			if (sweepFlag)
			{
				// Sweep is POSITIVE
				if (thetaDelta < theta1)
				{
					thetaDelta = thetaDelta + (Math.PI * 2);
				}
			}
			else
			{
				// Sweep is NEGATIVE
				if (thetaDelta > theta1)
				{
					thetaDelta = thetaDelta - (Math.PI * 2);
				}
			}

			startAng = theta1;
			endAng = thetaDelta;

			// calculate number of segments
			if (numSegments > 0)
			{
				angStep = (Math.PI / (numSegments * 2));
			}
			else
			{
				angStep = (Math.PI / 180);
			}

			// Sweep flag indicates a positive step
			if (!sweepFlag)
			{
				angStep = -angStep;
			}

			// Debug.WriteLine("Start angle {0}, End angle {1}, Step {2}.", Transformation.RadianToDegree(startAng), Transformation.RadianToDegree(endAng), Transformation.RadianToDegree(angStep));

			ang = startAng;
			do
			{
				tempPoint.X = (float)((RX * Math.Cos(ang)) + centerPoint.X);
				tempPoint.Y = (float)((RY * Math.Sin(ang)) + centerPoint.Y);

				tempAng = Transformation.GetAngleRadians(centerPoint, tempPoint) + theta;
				tempDist = Transformation.Distance(centerPoint, tempPoint);

				tempPoint.X = (float)((tempDist * Math.Cos(tempAng)) + centerPoint.X);
				tempPoint.Y = (float)((tempDist * Math.Sin(tempAng)) + centerPoint.Y);

				points.Add(tempPoint);

				ang = ang + angStep;
			} while (!((ang >= endAng && angStep > 0) | (ang <= endAng && angStep < 0)));

			// add the final point
			points.Add(P2);

			return points;
		}

		public static Matrix ParseTransformText(string transformText)
		{
			var matrix = new Matrix();

			// Parse the transform text
			int e = 0;
			int f = 0;

			string functionName = null;
			string functionParams = null;
			string[] splitParams = null;

			float p0, p1, p2, p3, p4, p5;

			// E.g. transform="translate(269.81467,-650.62904)"

			e = (transformText.IndexOf("(", 0) + 1);
			if (e > 0)
			{

				functionName = transformText.Substring(0, e - 1);
				f = (transformText.IndexOf(")", e) + 1);

				if (f > 0)
				{
					functionParams = transformText.Substring(e, f - e - 1);
				}

				switch (functionName.ToLower())
				{
					case "translate":
						// Just move everything
						splitParams = functionParams.Split(',');

						// Translate is
						// [ 1  0  tx ]
						// [ 0  1  ty ]
						// [ 0  0  1  ]

						if (splitParams.GetUpperBound(0) == 0)
						{
							p0 = float.Parse(splitParams[0], CultureInfo.InvariantCulture);
							matrix = new Matrix(1, 0, 0, 1, p0, 0);
						}
						else
						{
							p0 = float.Parse(splitParams[0], CultureInfo.InvariantCulture);
							p1 = float.Parse(splitParams[1], CultureInfo.InvariantCulture);
							matrix = new Matrix(1, 0, 0, 1, p0, p1);
						}
						break;

					case "matrix":
						/*
						splitParams = functionParams.Split(new [] { ' ', '\t', ',' } ).
							Select(tag => tag.Trim()).
							Where( tag => !string.IsNullOrEmpty(tag)).ToArray();
						 */
						splitParams = functionParams.Split(',');
						if (splitParams.GetUpperBound(0) == 0)
						{
							splitParams = functionParams.Split(' ');
						}
						if (splitParams.Count() == 6)
						{
							p0 = float.Parse(splitParams[0], CultureInfo.InvariantCulture);
							p1 = float.Parse(splitParams[1], CultureInfo.InvariantCulture);
							p2 = float.Parse(splitParams[2], CultureInfo.InvariantCulture);
							p3 = float.Parse(splitParams[3], CultureInfo.InvariantCulture);
							p4 = float.Parse(splitParams[4], CultureInfo.InvariantCulture);
							p5 = float.Parse(splitParams[5], CultureInfo.InvariantCulture);
							matrix = new Matrix(p0, p1, p2, p3, p4, p5);
						}
						break;

					case "rotate":
						splitParams = functionParams.Split(',');
						p0 = float.Parse(splitParams[0], CultureInfo.InvariantCulture);
						double angle = Transformation.DegreeToRadian(p0);
						matrix = new Matrix((float)Math.Cos(angle), (float)Math.Sin(angle), (float)-Math.Sin(angle), (float)Math.Cos(angle), 0, 0);
						break;

					case "scale": // scale(-1,-1)
						splitParams = functionParams.Split(',');
						if (splitParams.GetUpperBound(0) == 0)
						{
							splitParams = functionParams.Split(' ');
						}
						p0 = float.Parse(splitParams[0], CultureInfo.InvariantCulture);
						p1 = float.Parse(splitParams[1], CultureInfo.InvariantCulture);
						matrix = new Matrix(p0, 0, 0, p1, 0, 0);
						break;
				}
			}
			return matrix;

			// Multiply a line/poly by a transformation matrix
			// [ A C E ]
			// [ B D F ]
			// [ 0 0 1 ]

			// http://www.w3.org/TR/SVG11/coords.html#TransformMatrixDefined
			// X1 = AX + CY + E
			// Y1 = BX + DY + F
		}
	}

	/// <summary>
	/// Interface for a drawable object found in an SVG file. This
	/// is not a general-purpose SVG library -- it only does the
	/// bare minimum necessary to drive a CNC machine so this is
	/// mostly just to handle vectors and paths.
	/// </summary>
	public interface ISVGElement
	{
		// Retrieve the list of contours for this shape
		IEnumerable<IEnumerable<PointF>> GetContours();

		// System.Drawing GraphicsPath
		GraphicsPath GraphicsPath { get; }

		// generic draw model
		DrawModel DrawModel { get; }

		// Fill and outline
		double OutlineWidth { get; }
		Color OutlineColor { get; }
		Color FillColor { get; }
	}

	/// <summary>
	/// A contour is a set of points describing a closed polygon.
	/// </summary>
	public class Contour
	{
		public double Brightness { get; set; }
		public Color Color { get; set; }
		public IEnumerable<PointF> Points { get; set; }
	}

	/// <summary>
	/// Base class for shapes found in SVG file. This handles common tasks
	/// such as parsing styles, applying transforms, etc.
	/// </summary>
	public class SVGShapeBase
	{
		internal Matrix matrix = new Matrix();
		internal GraphicsPath graphicsPath = new GraphicsPath();
		public GraphicsPath GraphicsPath { get { return graphicsPath; } }
		public double OutlineWidth { get; set; }
		public Color OutlineColor { get; set; }
		public Color FillColor { get; set; }

		internal DrawModel drawModel = new DrawModel();
		public DrawModel DrawModel { get { return drawModel; } }

		/// <summary>
		/// Constructor for SVGShapeBase class. Called from derived class
		/// constructor.
		/// </summary>
		/// <param name="reader">XmlTextReader positioned at the XML element
		/// for the shape being constructed. This class uses it to look
		/// for style/transform attributes to apply to the shape</param>
		/// <param name="styleDictionary">Dictionary of named styles
		/// defined earlier in the SVG document, to be used should an
		/// XML style attribute with a name be encountered.</param>
		public SVGShapeBase(XmlTextReader reader, Dictionary<string, SVGStyle> styleDictionary)
		{
			string styleText = reader.GetAttribute("class");
			if (styleText != null)
			{
				string[] styleNames = styleText.Split(new[] { ' ', '\t' });

				foreach (string styleName in styleNames)
				{
					SVGStyle style = styleDictionary[styleName];

					if (style.FillColorPresent)
					{
						FillColor = style.FillColor;
					}
					if (style.OutlineColorPresent)
					{
						OutlineColor = style.OutlineColor;
					}
					if (style.OutlineWidthPresent)
					{
						OutlineWidth = style.OutlineWidth;
					}
				}
			}

			string xfs = reader.GetAttribute("transform");
			if (xfs != null)
			{
				if (xfs.StartsWith("matrix"))
				{
					xfs = xfs.Substring(6);
				}
				xfs = xfs.Trim(new[] { '(', ')' });
				var elements = xfs.Split(new[] { ' ', '\t', ',' }).
					Select(tag => tag.Trim()).
					Where(tag => !string.IsNullOrEmpty(tag)).ToList();

				matrix = new Matrix(
					float.Parse(elements[0], CultureInfo.InvariantCulture),
					float.Parse(elements[1], CultureInfo.InvariantCulture),
					float.Parse(elements[2], CultureInfo.InvariantCulture),
					float.Parse(elements[3], CultureInfo.InvariantCulture),
					float.Parse(elements[4], CultureInfo.InvariantCulture),
					float.Parse(elements[5], CultureInfo.InvariantCulture));
			}
		}

		/// <summary>
		/// Constructor for SVGShapeBase class. Called from derived class
		/// constructor.
		/// </summary>
		/// <param name="element">XML element for the shape being constructed.
		/// This class uses it to look
		/// for style/transform attributes to apply to the shape</param>
		/// <param name="styleDictionary">Dictionary of named styles
		/// defined earlier in the SVG document, to be used should an
		/// XML style attribute with a name be encountered.</param>
		public SVGShapeBase(XElement element, Dictionary<string, SVGStyle> styleDictionary)
		{
			// check if this element refers to a style class (should exist in the style dictionary)
			string styleText = SVGUtils.GetAttribute(element, "class");
			if (styleText != null)
			{
				string[] styleNames = styleText.Split(new[] { ' ', '\t' });

				foreach (string styleName in styleNames)
				{
					SVGStyle style = styleDictionary[styleName];

					if (style.FillColorPresent)
					{
						FillColor = style.FillColor;
					}
					if (style.OutlineColorPresent)
					{
						OutlineColor = style.OutlineColor;
					}
					if (style.OutlineWidthPresent)
					{
						OutlineWidth = style.OutlineWidth;
					}
				}
			}

			// check if this element has in-element styling
			string styleData = SVGUtils.GetAttribute(element, "style");
			if (styleData != null)
			{
				// https://stackoverflow.com/questions/21740264/parse-style-attribute-collection-using-linq
				var styleMap = styleData
					.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)
					.Select(x => x.Split(new[] { ':' }, StringSplitOptions.RemoveEmptyEntries));

				foreach (var styleElem in styleMap)
				{
					string styleName = styleElem[0];
					string styleValue = styleElem[1];
					var style = new SVGStyle(styleName, styleName + ":" + styleValue);
					if (style.FillColorPresent)
					{
						FillColor = style.FillColor;
					}
					if (style.OutlineColorPresent)
					{
						OutlineColor = style.OutlineColor;
					}
					if (style.OutlineWidthPresent)
					{
						OutlineWidth = style.OutlineWidth;
					}
				}
			}

			// check if this element includes a transform element
			string xfs = SVGUtils.GetAttribute(element, "transform");
			if (xfs != null)
			{
				matrix = SVGUtils.ParseTransformText(xfs);
			}
		}

		/// <summary>
		/// Transform the geometry of this shape as appropriate
		/// </summary>
		/// <param name="points"></param>
		/// <returns></returns>
		public List<PointF> Transform(List<PointF> points)
		{
			var pts = points.ToArray();

			// add dpi scaling factor to the matrix
			// so that it is included in the transform
			// matrix.Scale(dpi, dpi);

			matrix.TransformPoints(pts);
			return new List<PointF>(pts);
		}

		/// <summary>
		/// Transform a point as appropriate
		/// </summary>
		/// <param name="point"></param>
		/// <returns></returns>
		public PointF Transform(PointF point)
		{
			var pts = new List<PointF>();
			pts.Add(point);

			// add dpi scaling factor to the matrix
			// so that it is included in the transform
			// matrix.Scale(dpi, dpi);

			matrix.TransformPoints(pts.ToArray());
			return pts[0];
		}
	}

	/// <summary>
	/// SVG Line
	/// </summary>
	public class SVGLine : SVGShapeBase, ISVGElement
	{
		List<PointF> points = new List<PointF>();

		public SVGLine(XElement element, Dictionary<string, SVGStyle> styleDictionary)
			: base(element, styleDictionary)
		{
			float x1 = SVGUtils.ReadFloat(element, "x1");
			float y1 = SVGUtils.ReadFloat(element, "y1");
			float x2 = SVGUtils.ReadFloat(element, "x2");
			float y2 = SVGUtils.ReadFloat(element, "y2");

			points.Add(new PointF(x1, y1));
			points.Add(new PointF(x2, y2));

			points = Transform(points);

			graphicsPath.AddLine(points[0], points[1]);

			drawModel.AddLine(points[0], points[1]);
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			var result = new List<List<PointF>>();
			result.Add(points);
			return result;
		}
	}

	/// <summary>
	/// SVG Ellipse
	/// </summary>
	public class SVGEllipse : SVGShapeBase, ISVGElement
	{
		List<PointF> points = new List<PointF>();

		public SVGEllipse(XElement element, Dictionary<string, SVGStyle> styleDictionary)
			: base(element, styleDictionary)
		{

			//   cx = "245.46707"
			//   cy = "469.48389"
			//   rx = "13.131983"
			//   ry = "14.142136" />

			float cx = SVGUtils.ReadFloat(element, "cx");
			float cy = SVGUtils.ReadFloat(element, "cy");
			float rx = SVGUtils.ReadFloat(element, "rx");
			float ry = SVGUtils.ReadFloat(element, "ry");

			double a = 0;
			double x = 0;
			double y = 0;
			long rr = 0;

			// calculate number of steps
			rr = 8; // 2;
			if (rx > 100 | ry > 100)
			{
				rr = 4; // 1;
			}

			for (a = 0; a <= 360; a += rr)
			{
				x = Math.Cos(a * (Math.PI / 180)) * rx + cx;
				y = Math.Sin(a * (Math.PI / 180)) * ry + cy;

				points.Add(new PointF((float)x, (float)y));
			}

			points = Transform(points);

			graphicsPath.AddPolygon(points.ToArray());

			// ellipse is not supported as core drawing element, use polylines instead
			drawModel.AddPolyline(points);
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			var result = new List<List<PointF>>();
			result.Add(points);
			return result;
		}
	}

	/// <summary>
	/// SVG Rectangle
	/// </summary>
	public class SVGRect : SVGShapeBase, ISVGElement
	{
		List<PointF> points = new List<PointF>();

		public SVGRect(XElement element, Dictionary<string, SVGStyle> styleDictionary)
			: base(element, styleDictionary)
		{
			float x = SVGUtils.ReadFloat(element, "x");
			float y = SVGUtils.ReadFloat(element, "y");
			float width = SVGUtils.ReadFloat(element, "width");
			float height = SVGUtils.ReadFloat(element, "height");
			float rx = SVGUtils.ReadFloat(element, "rx");
			float ry = SVGUtils.ReadFloat(element, "ry");

			// rounded corners exampple
			// https://github.com/jstenback/inkscape-gcode/blob/master/src/export_gcode.py

			if (width > 0.0 && height >= 0.0)
			{
				if ((rx < width / 2.0) && (ry < height / 2.0))
				{
					if (rx + ry > 0.0f)
					{
						var p1 = new PointF(x + rx, y);
						var p2 = new PointF(x + width - rx, y);
						var p3 = new PointF(x + width, y + ry);
						var p4 = new PointF(x + width, y + height - ry);
						var p5 = new PointF(x + width - rx, y + height);
						var p6 = new PointF(x + rx, y + height);
						var p7 = new PointF(x, y + height - ry);
						var p8 = new PointF(x, y + ry);

						// Debug.WriteLine("p1: {0}, p2: {1}, p3: {2}, p4: {3}, p5: {4}, p6: {5}, p7: {6}, p8: {7}", p1, p2, p3, p4, p5, p6, p7, p8);

						if ((Math.Abs(rx - ry) < SVGUtils.SELF_ZERO))
						{
							// Use arcs for corners
							var c23 = new PointF(x + width - rx, y + ry);
							var c45 = new PointF(x + width - rx, y + height - ry);
							var c67 = new PointF(x + rx, y + height - ry);
							var c81 = new PointF(x + rx, y + ry);

							AddStraightLineSegment(p1, p2);
							AddArcSegment(p2, p3, c23, false);
							AddStraightLineSegment(p3, p4);
							AddArcSegment(p4, p5, c45, false);
							AddStraightLineSegment(p5, p6);
							AddArcSegment(p6, p7, c67, false);
							AddStraightLineSegment(p7, p8);
							AddArcSegment(p8, p1, c81, false);
						}
						else
						{
							// Use biarcs for corners
							var p2t = new PointF(x + width - rx / 2, y);
							var p3t = new PointF(x + width, y + ry / 2);
							var p4t = new PointF(x + width, y + height - ry / 2);
							var p5t = new PointF(x + width - rx / 2, y + height);
							var p6t = new PointF(x + rx / 2, y + height);
							var p7t = new PointF(x, y + height - ry / 2);
							var p8t = new PointF(x, y + ry / 2);
							var p1t = new PointF(x + rx / 2, y);

							// Debug.WriteLine("p1t: {0}, p2t: {1}, p3t: {2}, p4t: {3}, p5t: {4}, p6t: {5}, p7t: {6}, p8t: {7}", p1t, p2t, p3t, p4t, p5t, p6t, p7t, p8t);

							AddStraightLineSegment(p1, p2);
							AddBiArcSegment(p2, p3, p2t, p3t);
							AddStraightLineSegment(p3, p4);
							AddBiArcSegment(p4, p5, p4t, p5t);
							AddStraightLineSegment(p5, p6);
							AddBiArcSegment(p6, p7, p6t, p7t);
							AddStraightLineSegment(p7, p8);
							AddBiArcSegment(p8, p1, p8t, p1t);
						}
					}
					else
					{
						// Straight edges
						var p1 = new PointF(x, y);
						var p2 = new PointF(x + width, y);
						var p3 = new PointF(x + width, y + height);
						var p4 = new PointF(x, y + height);

						AddStraightLineSegment(p1, p2);
						AddStraightLineSegment(p2, p3);
						AddStraightLineSegment(p3, p4);
						AddStraightLineSegment(p4, p1);
					}
				}
			}

			// Note! Update - didn't get the arc's to work since we need to flip the coordinate system around the y axix
			// due to different origins for SVGs, DXFs etc.
			// Therefore we are (unfortunately) still using the polyline instead of lines and arc's
			// for drawModel we don't use the points transformed here, rather do it in the sub methods
			// only used by the graphics path
			points = Transform(points);
			graphicsPath.AddPolygon(points.ToArray());

			// don't add the polyline - use arcs and lines instead
			// see AddStraightLineSegment, AddBiArcSegment etc.
			// drawModel.AddPolyline(points);
		}

		private void AddStraightLineSegment(PointF startpoint, PointF endpoint)
		{
			// avoid duplicates by checking that the new starting point isn't
			// the same as the previous one
			if (points.Count() > 1)
			{
				var lastPoint = points.Last();
				if (!lastPoint.Equals(startpoint))
				{
					points.Add(startpoint);
				}
			}
			else
			{
				points.Add(startpoint);
			}

			// always add the second point
			points.Add(endpoint);

			// for drawModel we transform here and are not using the transformed points in the parent method
			var startpointT = Transform(startpoint);
			var endpointT = Transform(endpoint);
			drawModel.AddLine(startpointT, endpointT);
		}

		private static PointF FromVector2(Vector2 v)
		{
			return new PointF(v.X, v.Y);
		}

		private static Vector2 ToVector2(PointF p)
		{
			return new Vector2(p.X, p.Y);
		}

		private void AddBiArcSegment(PointF startpoint, PointF endpoint, PointF point1turn, PointF point2turn)
		{
			var p1 = ToVector2(startpoint);
			var p1t = ToVector2(point1turn);
			var p2 = ToVector2(endpoint);
			var p2t = ToVector2(point2turn);

			// ---------------------------------------------------------------------------
			// Calculate the transition point for the BiArc 
			// V: Intersection point of tangent lines
			// var C1 = p1t;
			// var C2 = p2t;
			var C1 = p1 == p1t ? p2t : p1t;
			var C2 = p2 == p2t ? p1t : p2t;

			var T1 = new Line(p1, C1);
			var T2 = new Line(p2, C2);

			var V = T1.Intersection(T2);

			// G: incenter point of the triangle (P1, V, P2)
			// http://www.mathopenref.com/coordincenter.html
			var dP2V = Vector2.Distance(p2, V);
			var dP1V = Vector2.Distance(p1, V);
			var dP1P2 = Vector2.Distance(p1, p2);
			var G = (dP2V * p1 + dP1V * p2 + dP1P2 * V) / (dP2V + dP1V + dP1P2);

			// ---------------------------------------------------------------------------
			// Calculate the BiArc
			var biarc = new BiArcUtils.BiArc(p1, (p1 - C1), p2, (p2 - C2), G);
			AddArcSegment(FromVector2(biarc.A1.P1), FromVector2(biarc.A1.P2), FromVector2(biarc.A1.C), false);
			AddArcSegment(FromVector2(biarc.A2.P1), FromVector2(biarc.A2.P2), FromVector2(biarc.A2.C), false);
		}

		private void AddArcSegment(PointF startpoint, PointF endpoint, PointF center, bool sweep)
		{
			// figure out our deltas
			double aX = startpoint.X - center.X;
			double aY = startpoint.Y - center.Y;
			double bX = endpoint.X - center.X;
			double bY = endpoint.Y - center.Y;

			double angleA = Math.Atan2(aY, aX);
			double angleB = Math.Atan2(bY, bX);

			// Make sure angleB is always greater than angleA
			// and if not add 2PI so that it is (this also takes
			// care of the special case of angleA == angleB,
			// ie we want a complete circle)
			if (angleB <= angleA)
			{
				angleB += 2 * Math.PI;
			}

			// calculate angle in radians
			double angle = angleB - angleA;

			// calculate a couple useful things.
			double radius = Math.Sqrt(aX * aX + aY * aY);

			// calculate the steps
			int steps = Transformation.CalculateStepsAsInt(angle, radius);

			// angle in degrees
			float angleDegrees = (float)Transformation.RadianToDegree(angle);
			var tmpPoints = SVGUtils.ParseArcSegment((float)radius, (float)radius, angleDegrees, startpoint, endpoint, false, !sweep, steps);

			// don't add the first point since it's already added
			if (tmpPoints.Any())
			{
				tmpPoints.RemoveAt(0);
				points.AddRange(tmpPoints);
			}

			// for drawModel we transform here and are not using the transformed points in the parent method
			var centerT = Transform(center);
			// note - radius might have to be transformed as well?!
			drawModel.AddArc(centerT, (float)radius, (float)(angleA * 180 / Math.PI), (float)(angleB * 180 / Math.PI));
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			var result = new List<List<PointF>>();
			result.Add(points);
			return result;
		}
	}

	/// <summary>
	/// SVG Image. This is handled differently from the rest of the shapes
	/// as it cannot be represented as vector contours. It loads the bitmap
	/// and elsewhere encapsulation is broken willy-nilly and the client
	/// code reaches in and grabs said bits. If you don't like it, go on
	/// the internet and complain.
	/// </summary>
	public class SVGImage : SVGShapeBase, ISVGElement
	{
		public Image image;
		public RectangleF DestBounds { get; set; }

		public SVGImage(XElement element, Dictionary<string, SVGStyle> styleDictionary, string imageDirectoryPath)
			: base(element, styleDictionary)
		{
			float x = SVGUtils.ReadFloat(element, "x");
			float y = SVGUtils.ReadFloat(element, "y");
			float w = SVGUtils.ReadFloat(element, "width");
			float h = SVGUtils.ReadFloat(element, "height");

			string path = SVGUtils.GetAttribute(element, "xlink:href");

			if (imageDirectoryPath != null)
			{
				string dir = Path.GetDirectoryName(imageDirectoryPath);
				string imagePath = Path.Combine(dir, path);
				image = Image.FromFile(imagePath);
			}
			else
			{
				// try to read as url
				image = Image.FromStream(new HttpClient().GetStreamAsync(path).Result);
			}

			var pts = new PointF[2];
			pts[0].X = x;
			pts[0].Y = y;
			pts[1].X = x + w;
			pts[1].Y = y + h;
			matrix.TransformPoints(pts);

			DestBounds = new RectangleF(pts[0].X, pts[0].Y, pts[1].X - pts[0].X, pts[1].Y - pts[0].Y);

			// Image is not supported by the import
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			var result = new List<List<PointF>>();
			return result;
		}
	}

	/// <summary>
	/// SVG Circle. We like polygons, so we just turn it into one of them.
	/// </summary>
	public class SVGCircle : SVGShapeBase, ISVGElement
	{
		List<PointF> points = new List<PointF>();

		public SVGCircle(XElement element, Dictionary<string, SVGStyle> styleDictionary)
			: base(element, styleDictionary)
		{
			float cx = SVGUtils.ReadFloat(element, "cx");
			float cy = SVGUtils.ReadFloat(element, "cy");
			float r = SVGUtils.ReadFloat(element, "r");

			points.AddRange(Transformation.RenderCircle(cx, cy, r));

			points = Transform(points);

			graphicsPath.AddPolygon(points.ToArray());

			// transform points for the benefit of the drawmodel (add circle)
			var centerT = Transform(new PointF(cx, cy));
			drawModel.AddCircle(centerT, r);
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			var result = new List<List<PointF>>();
			result.Add(points);

			return result;
		}
	}

	/// <summary>
	/// SVG polygon. This maps directly to our canonical representation,
	/// so nothing fancy going on in here.
	/// </summary>
	public class SVGPolygon : SVGShapeBase, ISVGElement
	{
		List<List<PointF>> contours = new List<List<PointF>>();
		List<PointF> currentContour = new List<PointF>();

		public SVGPolygon(XElement element, Dictionary<string, SVGStyle> styleDictionary)
			: base(element, styleDictionary)
		{
			// Support
			// <polygon points="50 160 55 180 70 180 60 190 65 205 50 195 35 205 40 190 30 180 45 180" />
			// <polyline points="60 110, 65 120, 70 115, 75 130, 80 125, 85 140, 90 135, 95 150, 100 145"/>
			// <polygon points="850,75  958,137.5 958,262.5 850,325 742,262.6 742,137.5" />

			string data = SVGUtils.GetAttribute(element, "points", "");

			// split the data string into elements
			// and remove empty strings
			var parts = data.Split(new[] { ' ', '\t', ',' }).
				Select(tag => tag.Trim()).
				Where(tag => !string.IsNullOrEmpty(tag)).ToList();

			// take two and two elements
			for (int i = 0; i < parts.Count(); i += 2)
			{
				currentContour.Add(
					new PointF(float.Parse(parts[i], CultureInfo.InvariantCulture),
							   float.Parse(parts[i + 1], CultureInfo.InvariantCulture)));
			}

			// Close the shape if polygon (not polyline)
			if (element.Name.LocalName.Equals("polygon") && currentContour.Count > 2)
			{
				float deltaX = currentContour[0].X - currentContour[currentContour.Count - 1].X;
				float deltaY = currentContour[0].Y - currentContour[currentContour.Count - 1].Y;

				if (Math.Abs(deltaX) + Math.Abs(deltaY) > 0.001)
				{
					currentContour.Add(currentContour[0]);
				}
			}

			currentContour = Transform(currentContour);

			if (currentContour.Count > 2)
			{
				graphicsPath.AddPolygon(currentContour.ToArray());
			}

			// add this single contour to the master point list as well
			contours.Add(currentContour);

			drawModel.AddPolyline(currentContour);
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			return contours;
		}
	}

	/// <summary>
	/// SVG path. The XML mini-language is full-featured and complex, making
	/// the parsing here the bulk of the work. Also, for curved portions of
	/// the path we approximate with polygons.
	/// </summary>
	public class SVGPath : SVGShapeBase, ISVGElement
	{
		List<List<PointF>> contours = new List<List<PointF>>();
		List<PointF> currentContour = new List<PointF>();

		public SVGPath(XElement element, Dictionary<string, SVGStyle> styleDictionary, float svgImportResolution)
			: base(element, styleDictionary)
		{

			string data = SVGUtils.GetAttribute(element, "d");
			if (data == null)
			{
				return;
			}

			// Parse an SVG path.
			int index = 0;
			string character = null;
			string lastCharacter = null;

			bool isRelative = false;
			bool gotFirstItem = false;

			float startX = 0;
			float startY = 0;
			float curX = 0;
			float curY = 0;

			PointF pt0 = PointF.Empty;
			PointF pt1 = PointF.Empty;
			PointF pt2 = PointF.Empty;
			PointF pt3 = PointF.Empty;
			PointF pt4 = PointF.Empty;
			PointF pt5 = PointF.Empty;

			string token1 = null;
			string token2 = null;
			string token3 = null;
			string token4 = null;
			string token5 = null;
			string token6 = null;
			string token7 = null;

			PointF prevPoint = PointF.Empty;
			bool hasPrevPoint = false;

			double deltaStep = 0;

			//M209.1,187.65c-0.3-0.2-0.7-0.4-1-0.4c-0.3,0-0.7,0.2-0.9,0.4c-0.3,0.3-0.4,0.6-0.4,0.9c0,0.4,0.1,0.7,0.4,1
			//c0.2,0.2,0.6,0.4,0.9,0.4c0.3,0,0.7-0.2,1-0.4c0.2-0.3,0.3-0.6,0.3-1C209.4,188.25,209.3,187.95,209.1,187.65z

			// Get rid of enter presses
			data = data.Replace("\r", " ");
			data = data.Replace("\n", " ");
			data = data.Replace("\t", " ");

			// Start parsing
			index = 0;
			while (index < data.Length)
			{
				character = "" + data[index];
				++index;
				isRelative = false;

				switch (character)
				{
					case "M":
					case "m":
					case "L":
					case "l":
					case "C":
					case "c":
					case "V":
					case "v":
					case "A":
					case "a":
					case "H":
					case "h":
					case "S":
					case "s":
					case "Z":
					case "z":
					case "Q":
					case "q":
					case "T":
					case "t":
						// Accepted character.
						lastCharacter = character;
						break;
					case " ":
						// Ignore whitespace
						break;
					default:
						// Not accepted, must be a continuation.
						if (lastCharacter != null)
						{
							character = lastCharacter;
							if (character == "m")
							{ // Continuous moveto becomes lineto
								character = "l";
							}
							if (character == "M")
							{ // Continuous moveto becomes lineto not relative
								character = "L";
							}
							index = index - 1;
						}
						break;
				}

				switch (character)
				{
					case " ": // Skip spaces
						break;
					case "M":
					case "m": // MOVE TO
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						// Extract two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set our "current" coordinates to this
						if (isRelative)
						{
							curX = curX + float.Parse(token1, CultureInfo.InvariantCulture);
							curY = curY + float.Parse(token2, CultureInfo.InvariantCulture);
						}
						else
						{
							curX = float.Parse(token1, CultureInfo.InvariantCulture);
							curY = float.Parse(token2, CultureInfo.InvariantCulture);
						}

						// Add the start point to this line
						currentContour.Add(new PointF(curX, curY));
						//pData(currentLine).PathCode = pData(currentLine).PathCode + "Move to " + currX + ", " + currY + System.Environment.NewLine;

						startX = curX;
						startY = curY;
						gotFirstItem = true;
						hasPrevPoint = false;

						break;
					case "L":
					case "l": // LINE TO
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						// Extract two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set our "current" coordinates to this
						if (isRelative)
						{
							curX = curX + float.Parse(token1, CultureInfo.InvariantCulture);
							curY = curY + float.Parse(token2, CultureInfo.InvariantCulture);
						}
						else
						{
							curX = float.Parse(token1, CultureInfo.InvariantCulture);
							curY = float.Parse(token2, CultureInfo.InvariantCulture);
						}

						// Add this point to the line
						currentContour.Add(new PointF(curX, curY));
						//pData(currentLine).PathCode = pData(currentLine).PathCode + "Line to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;
						hasPrevPoint = false;

						break;
					case "V":
					case "v": // VERTICAL LINE TO
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						// Extract one co-ordinate
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);

						// Set our "current" coordinates to this
						if (isRelative)
						{
							curY = curY + float.Parse(token1, CultureInfo.InvariantCulture);
						}
						else
						{
							curY = float.Parse(token1, CultureInfo.InvariantCulture);
						}

						// Add this point to the line
						currentContour.Add(new PointF(curX, curY));
						//pData(currentLine).PathCode = pData(currentLine).PathCode + "Vertical to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;
						hasPrevPoint = false;

						break;
					case "H":
					case "h": // HORIZONTAL LINE TO
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						// Extract one co-ordinate
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);

						// Set our "current" coordinates to this
						if (isRelative)
						{
							curX = curX + float.Parse(token1, CultureInfo.InvariantCulture);
						}
						else
						{
							curX = float.Parse(token1, CultureInfo.InvariantCulture);
						}

						// Add this point to the line
						currentContour.Add(new PointF(curX, curY));
						//pData(currentLine).PathCode = pData(currentLine).PathCode + "Horiz to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;
						hasPrevPoint = false;

						break;
					case "A":
					case "a": // PARTIAL ARC TO
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						// Radii X and Y
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// X axis rotation
						SVGUtils.SkipWhiteSpace(data, ref index);
						token3 = SVGUtils.ExtractToken(data, ref index);

						// Large arc flag
						SVGUtils.SkipWhiteSpace(data, ref index);
						token4 = SVGUtils.ExtractToken(data, ref index);

						// Sweep flag
						SVGUtils.SkipWhiteSpace(data, ref index);
						token5 = SVGUtils.ExtractToken(data, ref index);

						// X and Y
						SVGUtils.SkipWhiteSpace(data, ref index);
						token6 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token7 = SVGUtils.ExtractToken(data, ref index);

						// Start point
						pt0.X = curX;
						pt0.Y = curY;

						// Set our "current" coordinates to this
						if (isRelative)
						{
							curX = curX + float.Parse(token6, CultureInfo.InvariantCulture);
							curY = curY + float.Parse(token7, CultureInfo.InvariantCulture);
						}
						else
						{
							curX = float.Parse(token6, CultureInfo.InvariantCulture);
							curY = float.Parse(token7, CultureInfo.InvariantCulture);
						}

						pt1.X = curX;
						pt1.Y = curY;

						var points = SVGUtils.ParseArcSegment(
							float.Parse(token1, CultureInfo.InvariantCulture),
							float.Parse(token2, CultureInfo.InvariantCulture),
							float.Parse(token3, CultureInfo.InvariantCulture),
							pt0, pt1, (token4 == "1"), (token5 == "1")
						);
						currentContour.AddRange(points);
						//pData(currentLine).PathCode = pData(currentLine).PathCode + "Partial Arc to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;
						hasPrevPoint = false;

						break;
					case "C":
					case "c": // CURVE TO
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						pt0.X = curX;
						pt0.Y = curY;

						// Extract two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 0
						pt1.X = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						pt1.Y = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);

						// Extract next two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 1
						pt2.X = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						pt2.Y = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);

						// Extract next two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 2
						curX = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						curY = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);
						pt3.X = curX;
						pt3.Y = curY;

						deltaStep = SVGUtils.GetDeltaStep(pt0, pt3, svgImportResolution);

						// Run the bezier code
						currentContour.AddRange(Bezier.AddBezier((float)deltaStep, pt0, pt1, pt2, pt3));

						// Reflect this point
						prevPoint = Transformation.Reflect(pt2, pt3);
						hasPrevPoint = true;

						//pData(currentLine).PathCode = pData(currentLine).PathCode + "Bezier to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;

						break;
					case "S":
					case "s": // CURVE TO with 3 points
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						pt0.X = curX;
						pt0.Y = curY;

						// Extract two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 0
						pt1.X = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						pt1.Y = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);

						// Extract next two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 1
						curX = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						curY = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);
						pt2.X = curX;
						pt2.Y = curY;

						deltaStep = SVGUtils.GetDeltaStep(pt0, pt2, svgImportResolution);

						if (!hasPrevPoint)
						{
							// Same as pt1
							prevPoint = pt1;
						}

						// Run the bezier code
						currentContour.AddRange(Bezier.AddBezier((float)deltaStep, pt0, prevPoint, pt1, pt2));

						// Reflect this point
						prevPoint = Transformation.Reflect(pt1, pt2);
						hasPrevPoint = true;

						//pData(currentLine).PathCode = pData(currentLine).PathCode + "3Bezier to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;

						break;
					case "Q":
					case "q": // Quadratic Bezier TO with 3 points
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						pt0.X = curX;
						pt0.Y = curY;

						// Extract two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 0
						pt1.X = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						pt1.Y = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);

						// Extract next two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 1
						curX = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						curY = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);
						pt2.X = curX;
						pt2.Y = curY;

						deltaStep = SVGUtils.GetDeltaStep(pt0, pt2, svgImportResolution);

						// Run the bezier code
						currentContour.AddRange(Bezier.AddQuadBezier((float)deltaStep, pt0, pt1, pt2));

						// Reflect this point
						prevPoint = Transformation.Reflect(pt1, pt2);

						hasPrevPoint = true;

						//pData(currentLine).PathCode = pData(currentLine).PathCode + "3Bezier to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;

						break;
					case "T":
					case "t": // Quadratic Bezier TO with 3 points, but use reflection of last
						if (character.ToLower() == character)
						{ // Lowercase means relative coordinates
							isRelative = true;
						}
						if (!gotFirstItem)
						{ // Relative not valid for first item
							isRelative = false;
						}

						pt0.X = curX;
						pt0.Y = curY;

						// Extract two coordinates
						SVGUtils.SkipWhiteSpace(data, ref index);
						token1 = SVGUtils.ExtractToken(data, ref index);
						SVGUtils.SkipWhiteSpace(data, ref index);
						token2 = SVGUtils.ExtractToken(data, ref index);

						// Set into point 0
						pt1.X = (isRelative ? curX : 0) + float.Parse(token1, CultureInfo.InvariantCulture);
						pt1.Y = (isRelative ? curY : 0) + float.Parse(token2, CultureInfo.InvariantCulture);

						deltaStep = SVGUtils.GetDeltaStep(pt0, pt2, svgImportResolution);

						if (!hasPrevPoint)
						{
							// Same as pt1
							prevPoint = pt0; // SHOULD NEVER HAPPEN
						}

						// Run the bezier code
						currentContour.AddRange(Bezier.AddQuadBezier((float)deltaStep, pt0, prevPoint, pt1));

						// Reflect this point
						prevPoint = Transformation.Reflect(prevPoint, pt1);
						hasPrevPoint = true;

						//pData(currentLine).PathCode = pData(currentLine).PathCode + "3Bezier to " + currX + ", " + currY + System.Environment.NewLine;

						if (!gotFirstItem)
						{
							startX = curX;
							startY = curY;
						}
						gotFirstItem = true;

						break;
					case "Z":
					case "z":
						hasPrevPoint = false;

						// z means end the shape
						curX = startX;
						curY = startY;

						// Close current contour and open a new one
						// Draw a line back to start of shape
						currentContour.Add(currentContour.First());

						currentContour = Transform(currentContour);

						// add this single contour to the master point list as well
						contours.Add(currentContour);

						graphicsPath.AddPolygon(currentContour.ToArray());

						drawModel.AddPolyline(currentContour);

						// reset list
						currentContour = new List<PointF>();

						break;
					default:
						Debug.WriteLine("UNSUPPORTED PATH CODE: {0}", character);
						break;
				}
			}

			if (currentContour.Count > 0)
			{
				if (currentContour.Count <= 2)
				{
					// Happens sometimes. This is either a point or
					// a line. Empty area, so just toss it.
				}
				else
				{
					// close contour (closing shouldn't be necessary?!)
					// currentContour.Add(currentContour.First());

					currentContour = Transform(currentContour);

					// add this single contour to the master point list as well
					contours.Add(currentContour);

					graphicsPath.AddPolygon(currentContour.ToArray());

					drawModel.AddPolyline(currentContour);
				}
			}
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			return contours;
		}
	}

	/// <summary>
	/// Styles contain colors, stroke widths, etc. We use them to differentiate
	/// vector vs. raster portions of the document.
	/// </summary>
	public class SVGStyle
	{
		public string Name { get; set; }

		public bool OutlineWidthPresent { get; set; }
		public double OutlineWidth { get; set; }

		public bool OutlineColorPresent { get; set; }
		public Color OutlineColor { get; set; }

		public bool FillColorPresent { get; set; }
		public Color FillColor { get; set; }

		/// <summary>
		/// Return the color for the given string.
		/// If nothing is found fully black is returned
		/// </summary>
		/// <param name="c">color param</param>
		/// <returns>Color object</returns>
		static public Color ParseColor(string c)
		{
			Color result;

			if (c.Length == 7 && c[0] == '#')
			{
				string s1 = c.Substring(1, 2);
				string s2 = c.Substring(3, 2);
				string s3 = c.Substring(5, 2);

				byte r = 0;
				byte g = 0;
				byte b = 0;

				try
				{
					r = Convert.ToByte(s1, 16);
					g = Convert.ToByte(s2, 16);
					b = Convert.ToByte(s3, 16);
				}
				catch { }

				result = Color.FromArgb(r, g, b);
			}
			else
			{
				result = Color.FromName(c);
			}

			return result;
		}

		public SVGStyle(string name, string style)
		{
			Name = name;
			OutlineColorPresent = false;
			OutlineWidthPresent = false;
			FillColorPresent = false;

			try
			{
				style = style.Trim(new[] { '{', '}' });
				string[] stylePairs = style.Split(new[] { ':', ';' }, StringSplitOptions.RemoveEmptyEntries);

				// check we have pairs (can divide by 2)
				if ((stylePairs.Count() & 1) != 0)
				{
					throw new ArgumentException("Failed to parse style '" + style + "' with name + '" + name + "'");
				}

				for (int index = 0; index < stylePairs.Count(); index += 2)
				{
					switch (stylePairs[index])
					{
						case "stroke":
							OutlineColor = ParseColor(stylePairs[index + 1]);
							OutlineColorPresent = true;
							break;
						case "stroke-width":
							double strokeWidthVar = 0;
							if (double.TryParse(stylePairs[index + 1], NumberStyles.Any, CultureInfo.InvariantCulture, out strokeWidthVar))
							{
								OutlineWidth = strokeWidthVar;
								OutlineWidthPresent = true;
							}
							else
							{
								throw new ArgumentException("Parsing stroke-width value '" + stylePairs[index + 1] + "' not supported!");
							}
							break;
						case "fill":
							FillColor = ParseColor(stylePairs[index + 1]);
							FillColorPresent = true;
							break;
						default: break;
					}
				}
			}
			catch (System.Exception e)
			{
				Debug.WriteLine("SVGStyle failed with error: " + e.ToString());
			}
		}
	}

	/// <summary>
	/// An SVG Document. Read from file and build in-memory representation.
	/// </summary>
	public class SVGDocument
	{
		List<ISVGElement> shapes = new List<ISVGElement>();

		/* SVG Import Default Resolution (px/inch):
		○ Illustrator: 72
		○ Inkscape: 90
		○ OpenSCAD: 25.4  // as 1 inch is 25.4 millimeters
		 */
		public float SvgImportResolution = 1.0f; // set to 1 mm to the default unit
		public float SvgWidth; // SVG width in mm
		public float SvgHeight; // SVG height in mm

		public float MinX { get; set; }
		public float MaxX { get; set; }
		public float MinY { get; set; }
		public float MaxY { get; set; }

		public List<ISVGElement> Shapes
		{
			get
			{
				return shapes;
			}
		}

		public static SVGDocument Load(string filePath)
		{
			DateTime start = DateTime.UtcNow;

			var doc = new SVGDocument();
			var styleDictionary = new Dictionary<string, SVGStyle>();

			// Here begins the reading of the SVG file
			ProcessSVG(XDocument.Load(filePath).Root, 0, doc, null, new Matrix(), styleDictionary, filePath);

			TimeSpan duration = DateTime.UtcNow - start;
			Debug.WriteLine("### Load took {0}s", ((double)duration.TotalMilliseconds / 1000.0));

			return doc;
		}

		public static SVGDocument Load(Stream stream)
		{
			DateTime start = DateTime.UtcNow;

			var doc = new SVGDocument();
			var styleDictionary = new Dictionary<string, SVGStyle>();

			// Here begins the reading of the SVG file
			ProcessSVG(XDocument.Load(stream).Root, 0, doc, null, new Matrix(), styleDictionary, null);

			TimeSpan duration = DateTime.UtcNow - start;
			Debug.WriteLine("### Load took {0}s", ((double)duration.TotalMilliseconds / 1000.0));

			return doc;
		}

		/// <summary>
		/// Recursive method to process a SVG element
		/// </summary>
		/// <param name="element">parent xml node to process</param>
		/// <param name="depth">what depth are we on</param>
		/// <param name="doc">SVGDocument</param>
		/// <param name="layerName"></param>
		/// <param name="matrix"></param>
		static void ProcessSVG(XElement element, int depth, SVGDocument doc, string layerName, Matrix matrix, Dictionary<string, SVGStyle> styleDictionary, string imageDirectoryPath, bool doPrintDebug = false)
		{
			string tagName = element.Name.LocalName;

			string printLayer = "";
			if (layerName != null) printLayer = " Layer:" + layerName;

			// Styling SVG with CSS can be done a few different ways:
			// 1. using the style attribute to attach style rules to an individual element,
			// 2. adding a class attribute and then defining styles in an external or in-page stylesheet, and
			// 3. using inline stylesheets, which are nested right in the svg element.

			// Does the document contain in-page styles?
			if (tagName.Equals("style", StringComparison.InvariantCultureIgnoreCase))
			{
				// get style data
				var styleData = String.Join("", element.Nodes()).Trim();

				// remove all new lines and whitespaces etc
				styleData = Regex.Replace(styleData, @"\s+", string.Empty);

				// extract each css class section
				var regex = new Regex(@"\.?([_a-zA-Z\-]+[\w\-]*)\s*(\{.*?\})");
				foreach (Match match in regex.Matches(styleData))
				{
					// remove any new lines etc
					string cssClassName = match.Groups[1].Value;
					string cssClassValues = match.Groups[2].Value;

					// and add to style dictionary
					styleDictionary.Add(cssClassName, new SVGStyle(cssClassName, cssClassValues));
				}
			}

			// svg header
			if (tagName.Equals("svg", StringComparison.InvariantCultureIgnoreCase))
			{
				string widthValue = SVGUtils.GetAttribute(element, "width");
				string heightValue = SVGUtils.GetAttribute(element, "height");
				string viewBoxValue = SVGUtils.GetAttribute(element, "viewBox");
				doc.SetSVGImportResolutionAndSize(widthValue, heightValue, viewBoxValue);
			}

			// g layer
			else if (tagName.Equals("g", StringComparison.InvariantCultureIgnoreCase))
			{
				// <g id="g3023" transform="translate(269.81467,-650.62904)">
				// <g id="Layer_x0020_1">
				string inkscapeLabel = SVGUtils.GetAttribute(element, "label");
				if (inkscapeLabel != null)
				{
					layerName = inkscapeLabel;
				}
				else
				{
					string idValue = SVGUtils.GetAttribute(element, "id");
					if (idValue != null)
					{
						if (idValue.ToLower().StartsWith("layer"))
						{
							layerName = idValue;
						}
					}
				}

				// check if this element includes a transform element
				string xfs = SVGUtils.GetAttribute(element, "transform");
				if (xfs != null)
				{
					matrix = SVGUtils.ParseTransformText(xfs);
				}
			}

			// rectangle
			else if (tagName.Equals("rect", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGRect(element, styleDictionary));
			}

			// polyline
			else if (tagName.Equals("polyline", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGPolygon(element, styleDictionary));
			}

			// polygon
			else if (tagName.Equals("polygon", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGPolygon(element, styleDictionary));
			}

			// path
			else if (tagName.Equals("path", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGPath(element, styleDictionary, doc.SvgImportResolution));
			}

			// line
			else if (tagName.Equals("line", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGLine(element, styleDictionary));
			}

			// circle
			else if (tagName.Equals("circle", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGCircle(element, styleDictionary));
			}

			// ellipse
			else if (tagName.Equals("ellipse", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGEllipse(element, styleDictionary));
			}

			// image
			else if (tagName.Equals("image", StringComparison.InvariantCultureIgnoreCase))
			{
				doc.AddShape(new SVGImage(element, styleDictionary, imageDirectoryPath));
			}

			// if the element have no children
			if (!element.HasElements)
			{
				if (doPrintDebug)
				{
					// print attributes
					if (element.HasAttributes)
					{
						// print start tag
						Debug.WriteLine(string.Format(
							"{0}<{1}{2}>{3}",
							"".PadLeft(depth, '\t'),// {0}
							element.Name.LocalName, // {1}
							printLayer,             // {2}
							element.Value           // {3}
						));

						foreach (var attr in element.Attributes())
						{
							Debug.WriteLine(string.Format(
								"{0}*{1}={2}",
								"".PadLeft(depth + 1, '\t'), // {0}
								attr.Name.LocalName,  // {1}
								attr.Value            // {2}
							));
						}

						// print end tag
						Debug.WriteLine(string.Format(
							"{0}</{1}>",
							"".PadLeft(depth, '\t'), // {0}
							element.Name.LocalName  // {1}
						));
					}
					else
					{
						// print start and end tag
						Debug.WriteLine(string.Format(
							"{0}<{1}{2}>{3}</{1}>",
							"".PadLeft(depth, '\t'),// {0}
							element.Name.LocalName, // {1}
							printLayer,             // {2}
							element.Value           // {3}
						));
					}
				}
			}
			else
			{
				if (doPrintDebug)
				{
					// if element has children
					Debug.WriteLine("".PadLeft(depth, '\t') + // Indent to show depth
									"<" + tagName + printLayer + ">");

					// print attributes
					if (element.HasAttributes)
					{
						foreach (var attr in element.Attributes())
						{
							Debug.WriteLine(string.Format(
								"{0}*{1}={2}",
								"".PadLeft(depth + 1, '\t'), // {0}
								attr.Name.LocalName,  // {1}
								attr.Value            // {2}
							));
						}
					}
				}

				depth++;

				// for each child, recursively process the child
				foreach (XElement child in element.Elements())
				{
					ProcessSVG(child, depth, doc, layerName, matrix, styleDictionary, imageDirectoryPath);
				}

				depth--;

				if (doPrintDebug)
				{
					Debug.WriteLine
						(
							"".PadLeft(depth, '\t') + // Indent to show depth
							"</" + element.Name.LocalName + ">"
						);
				}
			}
		}

		public void AddShape(ISVGElement shape)
		{
			shapes.Add(shape);
		}

		public IEnumerable<IEnumerable<PointF>> GetContours()
		{
			// Enumerate each shape in the document
			foreach (ISVGElement shape in shapes)
			{
				foreach (var contour in shape.GetContours())
				{
					yield return contour;
				}
			}
		}

		/// <summary>
		/// Get the points for all contours in all shapes.
		/// </summary>
		/// <returns></returns>
		public IEnumerable<PointF> GetPoints()
		{
			// Enumerate each shape in the document
			foreach (ISVGElement shape in shapes)
			{
				foreach (var contour in shape.GetContours())
				{
					foreach (PointF point in contour)
					{
						yield return point;
					}
				}
			}
		}

		/// <summary>
		/// Scale the contours using the correct DPI,
		/// as well as the min x and min y coordinates.
		/// This fixes the issue where coordinates are negative
		/// </summary>
		/// <param name="doScaleAndShift">optionally remove space a top and left, default is false</param>
		/// <returns>a scaled contour list</returns>
		public IEnumerable<IEnumerable<PointF>> GetScaledContoursAndSetMinMax(bool doScaleAndShift = false)
		{
			var contours = new List<List<PointF>>();

			// Calculate the extents for all contours
			var points = GetPoints();

			if (!points.Any())
				return contours;

			MinX = points.Min(point => point.X);
			MaxX = points.Max(point => point.X);
			MinY = points.Min(point => point.Y);
			MaxY = points.Max(point => point.Y);

			if (doScaleAndShift)
			{
				// Scale by the DPI
				// And fix the points by removing space at the left and top
				foreach (ISVGElement shape in shapes)
				{
					foreach (var contour in shape.GetContours())
					{
						var scaledPoints = new List<PointF>();
						foreach (PointF point in contour)
						{
							// Scale using DPI and remove space left and bottom
							// (point.X - minX)/GLOBAL_DPI 	=> removes space on the left
							// (point.Y - minY)/GLOBAL_DPI 	=> removes space on the bottom
							// (maxY - point.Y)/GLOBAL_DPI 	=> flips up-side down and scales using DPI
							var scaledPoint = new PointF((point.X - MinX) / SvgImportResolution, (point.Y - MinY) / SvgImportResolution);
							scaledPoints.Add(scaledPoint);
						}
						contours.Add(scaledPoints);
					}
				}
			}
			else
			{
				// Only scale using DPI
				foreach (ISVGElement shape in shapes)
				{
					foreach (var contour in shape.GetContours())
					{
						var scaledPoints = new List<PointF>();
						foreach (PointF point in contour)
						{
							if (SvgImportResolution != 1)
							{
								var scaledPoint = point.ScaleByDPI(SvgImportResolution);
								scaledPoints.Add(scaledPoint);
							}
							else
							{
								scaledPoints.Add(point);
							}
						}
						contours.Add(scaledPoints);
					}
				}
			}

			return contours;
		}

		static void ParseNumberWithOptionalUnit(string stringWithOptionalUnit, out float number, out string unit)
		{
			// Read numbers with optional units like this:
			// width="8.5in"
			// height="11in"

			var match = Regex.Match(stringWithOptionalUnit, @"([0-9]+(?:\.[0-9]+)?)(\w*)");
			if (match.Success)
			{
				string numberString = match.Groups[1].Value;
				string unitString = match.Groups[2].Value;

				number = float.Parse(numberString, CultureInfo.InvariantCulture);
				unit = unitString;
			}
			else
			{
				number = -1;
				unit = "FAIL";
			}
		}

		/// <summary>
		/// Scale a passed value with the defined unit into mm
		/// i.e. 4mm or 6in
		/// </summary>
		/// <param name="value">unit less value (defaults to mm)</param>
		/// <param name="unit">unit (cm, mm, in, pt, pc)</param>
		/// <returns>a value in mm</returns>
		static float ScaleValueWithUnit(float value, string unit = "")
		{
			// Read the unit
			// default is mm
			switch (unit.ToLower())
			{
				case "in": // convert to mm
					value *= 25.4f;
					break;
				case "mm": // no conversion needed
				case "":
					break;
				case "cm": // convert from cm
					value *= 10.0f;
					break;
				case "pt": // 1 point = 1/72 in
					value = value * 25.4f / 72f;
					break;
				case "pc": // 1 pica = 1/6 in
					value = value * 25.4f / 6f;
					break;
			}

			return value;
		}

		/// <summary>
		/// Set SVG Import Resolution and Svg Size from the passed paramaters
		/// </summary>
		/// <param name="widthValue">width as string</param>
		/// <param name="heightValue">heigh as string</param>
		/// <param name="viewboxValue">viewbox as string</param>
		void SetSVGImportResolutionAndSize(string widthValue, string heightValue, string viewboxValue)
		{
			float widthMM = 0.0f;
			float heightMM = 0.0f;
			float svgImportResolution = 1.0f;

			// width="8.5in" height="11in"
			// viewBox="0 0 765.00001 990.00002"
			// width="20mm" height="20mm" viewBox="0 -20 20 20"

			// Read these numbers to determine the scale of the data inside the file.
			// width and height are the real-world widths and heights
			// viewbox is how we're going to scale the numbers in the file (expressed in pixels) to the native units of this program, which is mm

			if (widthValue != null)
			{
				string widthUnit;
				ParseNumberWithOptionalUnit(widthValue, out widthMM, out widthUnit);
				widthMM = ScaleValueWithUnit(widthMM, widthUnit);
			}

			if (heightValue != null)
			{
				string heightUnit;
				ParseNumberWithOptionalUnit(heightValue, out heightMM, out heightUnit);
				heightMM = ScaleValueWithUnit(heightMM, heightUnit);
			}

			if (widthMM != 0 && heightMM != 0)
			{
				Debug.WriteLine("Size in mm: {0}, {1}", widthMM, heightMM);
			}

			// The 'ViewBox' is how we scale an mm to a pixel.
			// The default is 90dpi but it may not be.
			if (viewboxValue != null)
			{
				var viewBoxArgs = viewboxValue.Split(new Char[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries);
				float[] viewBoxFloatArgs = viewBoxArgs.Select(arg => float.Parse(arg, CultureInfo.InvariantCulture)).ToArray();

				if (viewBoxArgs.Count() == 4)
				{
					// Get the width in pixels
					if (widthMM == 0)
					{
						svgImportResolution = 1.0f;
					}
					else
					{
						svgImportResolution = (viewBoxFloatArgs[2] / widthMM);
					}
					Debug.WriteLine("Svg Import Resolution: {0}", svgImportResolution);

					// set width and height if they haven't already been set
					if (widthMM == 0 || heightMM == 0)
					{
						if (widthMM == 0)
						{
							widthMM = viewBoxFloatArgs[2];
						}
						if (heightMM == 0)
						{
							heightMM = viewBoxFloatArgs[3];
						}
						Debug.WriteLine("Size in mm: {0}, {1}", widthMM, heightMM);
					}
				}
			}

			// set the global variables
			SvgImportResolution = svgImportResolution;
			SvgWidth = widthMM;
			SvgHeight = heightMM;
		}

		/// <summary>
		/// Render the SVG onto the graphic panel
		/// </summary>
		/// <param name="g">Graphics drawing surface</param>
		/// <param name="rasterOnly">Only draw raster </param>
		public void Render(Graphics g, bool rasterOnly)
		{
			foreach (ISVGElement shape in shapes)
			{
				var sVGImage = shape as SVGImage;
				if (sVGImage != null)
				{
					g.DrawImage(sVGImage.image, sVGImage.DestBounds);
				}

				// don't draw if the outline width is too small, alpha is 0 and raster only is set
				if (shape.OutlineWidth < .01 && shape.FillColor.A == 0 && rasterOnly)
				{
					continue;
				}

				GraphicsPath p = shape.GraphicsPath;
				if (shape.FillColor.A > 0)
				{
					Brush b = new SolidBrush(shape.FillColor);
					g.FillPath(b, p);
					b.Dispose();
				}
				if (shape.OutlineWidth > 0 && shape.OutlineColor.A > 0)
				{
					var pen = new Pen(shape.OutlineColor, (float)shape.OutlineWidth);
					g.DrawPath(pen, p);
					pen.Dispose();
				}
			}
		}

		/// <summary>
		/// Given a specific DPI resolution, returns vectors to approximate
		/// the shapes in the document at that resolution. This allows us to
		/// thin out the tons of polygon edges for curved segments.
		/// </summary>
		/// <param name="dpi"></param>
		/// <returns></returns>
		public IEnumerable<Contour> GetVectorContours(double dpi)
		{
			double threshhold = 1.0 / dpi;
			int total = 0;
			int thin = 0;

			foreach (ISVGElement shape in shapes)
			{
				if ((shape.OutlineWidth >= .01 && shape.OutlineColor.A == 255) || shape.FillColor.A == 255)
				{
					continue;
				}

				foreach (var contour in shape.GetContours())
				{
					var thinnedContour = new List<PointF>();
					PointF lastPoint = contour.First();
					bool first = true;

					foreach (PointF point in contour)
					{
						++total;

						if (first)
						{
							thinnedContour.Add(new PointF(point.X, point.Y));
							lastPoint = point;
							first = false;
						}
						else
						{
							if (Transformation.Distance(point, lastPoint) > threshhold)
							{
								++thin;
								thinnedContour.Add(point);
								lastPoint = point;
							}
						}
					}

					yield return new Contour()
					{
						Brightness = shape.OutlineColor.GetBrightness(),
						Color = shape.OutlineColor,
						Points = thinnedContour
					};
				}
			}

			Debug.WriteLine("Thinned contour ({0}/{1}) = {2}%", thin, total, (int)((double)thin / (double)total * 100.0));
		}
	}
}
