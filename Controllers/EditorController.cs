using System;
using System.Collections.Generic;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CAMToolsNet.Models;
using CoordinateUtils;
using GCode;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using netDxf;
using netDxf.Entities;
using SVG;
using Svg;
using System.Text;
using System.Xml.Linq;
using System.Xml.XPath;

namespace CAMToolsNet.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public class EditorController : ControllerBase
	{
		private readonly ILogger<EditorController> _logger;

		public EditorController(ILogger<EditorController> logger)
		{
			_logger = logger;
		}

		[HttpGet] // GET /api/Editor
		public DrawModel Get()
		{
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel == null)
			{
				_logger.LogError("Could not read drawmodel from session!");
				return new DrawModel();
			}
			else
			{
				return drawModel;
			}
		}

		[HttpGet("GetSplit/{index:int}")]  // GET /api/Editor/GetSplit/1
		public DrawModel GetSplit(int index)
		{
			var drawModelSplit = HttpContext.Session.GetObjectFromJson<DrawModel>("Split-" + index);
			if (drawModelSplit == null)
			{
				_logger.LogError("Could not read drawmodel from session!");
				return new DrawModel();
			}
			else
			{
				return drawModelSplit;
			}
		}

		[HttpGet("SaveSplit/{index:int}")]  // GET /api/Editor/SaveSplit/1
		public DrawModel SaveSplit(int index)
		{
			var drawModelSplit = HttpContext.Session.GetObjectFromJson<DrawModel>("Split-" + index);
			if (drawModelSplit == null)
			{
				_logger.LogError("Could not read drawmodel from session!");
				return new DrawModel();
			}
			else
			{
				// save to model
				HttpContext.Session.SetObjectAsJson("DrawModel", drawModelSplit);
				return drawModelSplit;
			}
		}

		[HttpPost("Upload")] // POST /api/Editor/Upload
		public async Task<IActionResult> Upload(List<IFormFile> files, [FromForm] string description, [FromForm] bool useContours)
		{
			DrawModel drawModel = null;
			foreach (var file in files)
			{
				// Read file fully and save to file system
				// var basePath = Path.Combine(Directory.GetCurrentDirectory() + "\\Files\\");
				// bool basePathExists = System.IO.Directory.Exists(basePath);
				// if (!basePathExists) Directory.CreateDirectory(basePath);
				// var fileName = Path.GetFileNameWithoutExtension(file.FileName);
				// var filePath = Path.Combine(basePath, file.FileName);
				// var extension = Path.GetExtension(file.FileName);
				// if (!System.IO.File.Exists(filePath))
				// {
				//     using (var stream = new FileStream(filePath, FileMode.Create))
				//     {
				//         await file.CopyToAsync(stream);
				//     }
				// }

				// Read file fully into memory and act
				var hasParsedSuccessfully = false;
				using (var memoryStream = new MemoryStream())
				{
					await file.CopyToAsync(memoryStream);

					_logger.LogInformation("Successfully uploaded file!");

					// At this point, the Offset is at the end of the MemoryStream
					// Do this to seek to the beginning
					memoryStream.Seek(0, SeekOrigin.Begin);

					// try to parse as dxf
					if (!hasParsedSuccessfully)
					{
						try
						{
							_logger.LogInformation("Trying to parse file as DXF...");
							var dxf = DxfDocument.Load(memoryStream);
							if (dxf != null)
							{
								_logger.LogInformation("DXF read successfully!");

								// convert dxf to a model that can be serialized
								// since I am unable to get the default dxfnet model to be serialized
								drawModel = DrawModel.FromDxfDocument(dxf, file.FileName, useContours);
								_logger.LogInformation("Successfully parsed DXF to draw model!");
								hasParsedSuccessfully = true;
							}
						}
						catch (System.Exception e)
						{
							_logger.LogError(e, "Failed parsing as DXF!");
							// ignore
						}
					}

					// At this point, the Offset is at the end of the MemoryStream
					// Do this to seek to the beginning
					memoryStream.Seek(0, SeekOrigin.Begin);

					// try to parse as SVG
					if (!hasParsedSuccessfully)
					{
						try
						{
							_logger.LogInformation("Trying to parse file as SVG...");
							var svg = SVGDocument.Load(memoryStream);
							if (svg != null)
							{
								_logger.LogInformation("SVG read successfully!");
								drawModel = DrawModel.FromSVGDocument(svg, file.FileName, useContours);
								_logger.LogInformation("Successfully parsed SVG to draw model!");
								hasParsedSuccessfully = true;
							}
						}
						catch (System.Exception e)
						{
							_logger.LogError(e, "Failed parsing as SVG!");
							// ignore
						}
					}

					// At this point, the Offset is at the end of the MemoryStream
					// Do this to seek to the beginning
					memoryStream.Seek(0, SeekOrigin.Begin);

					// try to parse as GCODE
					if (!hasParsedSuccessfully)
					{
						try
						{
							_logger.LogInformation("Trying to parse file as GCODE...");
							StreamReader reader = new StreamReader(memoryStream);
							string gCode = reader.ReadToEnd();
							if (!"".Equals(gCode))
							{
								_logger.LogInformation("GCODE read successfully!");
								drawModel = DrawModel.FromGCode(gCode, file.FileName);
								_logger.LogInformation("Successfully parsed GCODE to draw model!");
								hasParsedSuccessfully = true;
							}
						}
						catch (System.Exception e)
						{
							_logger.LogError(e, "Failed parsing as GCODE!");
							// ignore
						}
					}

					if (drawModel != null) HttpContext.Session.SetObjectAsJson("DrawModel", drawModel);
				}
			}

			if (HttpContext.Session.Keys.Contains("DrawModel"))
			{
				_logger.LogInformation("File successfully uploaded!");
			}
			else
			{
				_logger.LogError("File upload failed!");
				return BadRequest();
			}

			return Ok();
		}

		[HttpGet("CirclesToLayers/{doSave:bool}")]  // GET /api/Editor/CirclesToLayers/false
		public IActionResult CirclesToLayers(bool doSave)
		{
			// traverse through all circles and set the layer whenever the radius is the same
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel != null)
			{
				// convert to a real dxf document
				var dxf = DrawModel.ToDxfDocument(drawModel);

				// create a bucket for each radius
				Dictionary<string, List<Circle>> radiusBuckets = dxf.Circles
				.GroupBy(o => o.Radius.ToString("F2", CultureInfo.InvariantCulture))
				.ToDictionary(g => g.Key, g => g.ToList());

				// move circle buckets to unique layers
				foreach (var pair in radiusBuckets)
				{
					var radiusString = pair.Key;
					var circles = pair.Value;

					double radius = 0;
					if (Double.TryParse(radiusString, NumberStyles.Any, CultureInfo.InvariantCulture, out radius))
					{
						double dia = radius * 2;
						string diaString = dia.ToString("F2", CultureInfo.InvariantCulture);

						foreach (var c in circles)
						{
							c.Layer = new netDxf.Tables.Layer("Diameter_" + diaString);
						}
					}
				}

				// build new filename
				string fileName = drawModel.FileName;
				var newFileName = Path.GetFileNameWithoutExtension(fileName);
				// var newFileExtension = Path.GetExtension(fileName);
				// always use the dxf extension since thats what we are saving
				var newFileExtension = ".dxf";
				var newFullFileName = newFileName + "_layered" + newFileExtension;

				if (doSave)
				{
					var basePath = Path.Combine(Directory.GetCurrentDirectory() + "\\Files\\");
					bool basePathExists = System.IO.Directory.Exists(basePath);
					if (!basePathExists) Directory.CreateDirectory(basePath);

					var filePath = Path.Combine(basePath, newFullFileName);
					dxf.Save(filePath);
				}
				else
				{
					// download converted file to user
					var memoryStream = new MemoryStream();
					dxf.Save(memoryStream);

					// At this point, the Offset is at the end of the MemoryStream
					// Either do this to seek to the beginning
					memoryStream.Position = 0;
					return File(memoryStream, "APPLICATION/octet-stream", newFullFileName);
				}
			}
			else
			{
				_logger.LogError("Circles to Layers unsuccessfull!");
				return BadRequest();
			}

			return Ok();
		}

		[HttpGet("SaveSvg/{doSave:bool}")]  // GET /api/Editor/SaveSvg/false
		public IActionResult SaveSvg(bool doSave)
		{
			// traverse through all circles and set the layer whenever the radius is the same
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel != null)
			{
				// convert to a real svg document
				var svg = DrawModel.ToSvgDocument(drawModel);

				// build new filename
				string fileName = drawModel.FileName;
				var newFileName = Path.GetFileNameWithoutExtension(fileName);

				// always use the svg extension since thats what we are saving
				var newFileExtension = ".svg";
				var newFullFileName = newFileName + newFileExtension;

				if (doSave)
				{
					var basePath = Path.Combine(Directory.GetCurrentDirectory() + "\\Files\\");
					bool basePathExists = System.IO.Directory.Exists(basePath);
					if (!basePathExists) Directory.CreateDirectory(basePath);

					var filePath = Path.Combine(basePath, newFullFileName);
					svg.Write(filePath);
				}
				else
				{
					// download converted file to user
					var memoryStream = new MemoryStream();
					svg.Write(memoryStream);

					// At this point, the Offset is at the end of the MemoryStream
					// Either do this to seek to the beginning
					memoryStream.Position = 0;

					// have to fix the xml / svg document since
					// the library used creates tags
					// that TinkerCad doesn't support
					var fixedMemStream = FixSvgDocument(memoryStream);

					return File(fixedMemStream, "APPLICATION/octet-stream", newFullFileName);
				}
			}
			else
			{
				_logger.LogError("Saving Svg unsuccessfull!");
				return BadRequest();
			}

			return Ok();
		}

		private static MemoryStream FixSvgDocument(MemoryStream input)
		{
			// have to fix the xml / svg document since
			// the library used creates some tags
			// that TinkerCad doesn't support
			XDocument xdoc = XDocument.Load(input);

			// modify the svg parameters
			var elements = xdoc.XPathSelectElements("//*[@fill-opacity='0']");
			foreach (var elem in elements)
			{
				elem.SetAttributeValue("fill-opacity", "1");
			}

			// convert back to stream
			var stream = new MemoryStream();
			xdoc.Save(stream);

			// Rewind the stream ready to read from it elsewhere
			stream.Position = 0;
			return stream;
		}

		[HttpGet("PolylineToCircles/{doConvertLines:bool}")]  // GET /api/Editor/PolylineToCircles/false
		public IActionResult PolylineToCircles(bool doConvertLines)
		{
			// traverse through all polylines and convert those that are circles to circles
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel != null)
			{
				// first sort points
				if (doConvertLines) drawModel.SortStartStopSegments();

				// convert connected visible lines to polylines first
				if (doConvertLines) drawModel.ConvertLinesToPolylines();

				// Iterate the list in reverse with a for loop to be able to remove while iterating
				for (int i = drawModel.Polylines.Count - 1; i >= 0; i--)
				{
					var poly = drawModel.Polylines[i];
					var points = poly.Vertexes.Select(p => p.PointF);

					// get center point and radius
					PointF center = PointF.Empty;
					float radius = 0.0f;
					if (Transformation.IsPolygonCircle(points, ref center, out radius))
					{
						// add circle
						drawModel.AddCircle(center, radius);

						// delete the now redundant polyline 
						drawModel.Polylines.RemoveAt(i);
					}
				}

				// update model
				HttpContext.Session.SetObjectAsJson("DrawModel", drawModel);
			}
			else
			{
				_logger.LogError("Polyline to circles unsuccessfull!");
				return BadRequest();
			}

			return Ok();
		}

		[HttpGet("Flatten/{doConvertCircles:bool}")]  // GET /api/Editor/Flatten/false
		public IActionResult Flatten(bool doConvertCircles)
		{
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel != null)
			{
				drawModel.SortStartStopSegments();
				drawModel.GroupIntoSegments();

				foreach (var segment in drawModel.GroupedSegments)
				{
					// if a segment contain a element that isn't
					// polyline, convert first
					var shapePoints = new List<PointF>();
					foreach (var shape in segment)
					{
						if (shape.GetType() == typeof(DrawModel.DrawArc))
						{
							var a = shape as DrawModel.DrawArc;
							// convert to polyline
							var centerX = a.Center.X;
							var centerY = a.Center.Y;
							var radius = a.Radius;
							var startAngle = a.StartAngle;
							var endAngle = a.EndAngle;

							var points = Transformation.RenderArc(centerX, centerY, radius, startAngle, endAngle);

							Transformation.AddAvoidDuplicates(shapePoints, points);

							// and remove arc
							drawModel.Arcs.Remove(a);
						}

						if (shape.GetType() == typeof(DrawModel.DrawLine))
						{
							var l = shape as DrawModel.DrawLine;

							var startPoint = l.StartPoint.PointF;
							var endPoint = l.EndPoint.PointF;

							Transformation.AddAvoidDuplicates(shapePoints, startPoint, endPoint);

							// and remove line
							drawModel.Lines.Remove(l);
						}
					}

					// add as separate polylines
					var polyline = new DrawModel.DrawPolyline(shapePoints);
					drawModel.Polylines.Add(polyline);
				}

				// converting circles
				if (doConvertCircles)
				{
					for (int i = drawModel.Circles.Count - 1; i >= 0; i--)
					{
						var c = drawModel.Circles.ElementAt(i);

						var cx = c.Center.X;
						var cy = c.Center.Y;
						var r = c.Radius;

						var points = Transformation.RenderCircle(cx, cy, r);

						// add as separate polylines
						var polyline = new DrawModel.DrawPolyline(points);
						drawModel.Polylines.Add(polyline);

						// and remove circle
						drawModel.Circles.Remove(c);
					}
				}

				// update model
				HttpContext.Session.SetObjectAsJson("DrawModel", drawModel);
			}
			else
			{
				_logger.LogError("Flatten unsuccessfull!");
				return BadRequest();
			}

			return Ok();
		}

		[HttpGet("Trim")]  // GET /api/Editor/Trim
		public IActionResult Trim()
		{
			// traverse through all polylines and convert those that are circles to circles
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel != null)
			{
				drawModel.Trim();

				// update model
				HttpContext.Session.SetObjectAsJson("DrawModel", drawModel);
			}
			else
			{
				_logger.LogError("Trim unsuccessfull!");
				return BadRequest();
			}

			return Ok();
		}

		[HttpGet("Rotate/{degrees:float}")]  // GET /api/Editor/Rotate/20
		public IActionResult Rotate(float degrees)
		{
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel != null)
			{
				var newDrawModel = new DrawModel();
				newDrawModel.FileName = drawModel.FileName;

				// circles
				foreach (var circle in drawModel.Circles)
				{
					var newCenterPoint = Transformation.Rotate(circle.Center.PointF, degrees);
					newDrawModel.AddCircle(newCenterPoint, circle.Radius, circle.IsVisible);
				}

				// lines
				foreach (var line in drawModel.Lines)
				{
					var newStartPoint = Transformation.Rotate(line.StartPoint.PointF, degrees);
					var newEndPoint = Transformation.Rotate(line.EndPoint.PointF, degrees);
					newDrawModel.AddLine(newStartPoint, newEndPoint, line.IsVisible);
				}

				// arcs
				foreach (var a in drawModel.Arcs)
				{
					var newCenterPoint = Transformation.Rotate(a.Center.PointF, degrees);

					// from: 
					// "center":{"x":74.99847,"y":222.5,"z":0}
					// "radius":10
					// "thickness":0
					// "startAngle":-0
					// "endAngle":90,"

					// to:
					// "center":{"x":-104.2983,"y":210.3642,"z":0}
					// "radius": 10.000049
					// "thickness": 0
					// "startAngle": 45.00003
					// "endAngle": 134.99957

					newDrawModel.AddArc(newCenterPoint, a.Radius, a.StartAngle + degrees, a.EndAngle + degrees, a.IsVisible);
				}

				// polylines
				foreach (var p in drawModel.Polylines)
				{
					var newVertexes = new List<PointF>();
					for (var i = 0; i < p.Vertexes.Count; i++)
					{
						var vertex = p.Vertexes[i];
						var newVertex = Transformation.Rotate(vertex.PointF, degrees);
						newVertexes.Add(newVertex);
					}
					newDrawModel.AddPolyline(newVertexes, p.IsVisible);
				}

				// make sure to recalculate the bounds
				newDrawModel.CalculateBounds();

				HttpContext.Session.SetObjectAsJson("DrawModel", newDrawModel);

				return Ok();
			}
			return BadRequest();
		}

		[HttpGet("Split/{xSplit:float}/{splitDegrees:float}/{zClearance:float}")]  // GET /api/Editor/Split/100/0/10
		public IActionResult Split(float xSplit, float splitDegrees, float zClearance)
		{
			// index means which side to get back
			if (xSplit != 0)
			{
				var splitPoint = new Point3D(xSplit, 0, 0);
				var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
				if (drawModel != null)
				{
					var gCode = DrawModel.ToGCode(drawModel);
					// SaveToFile("before_split.txt", gCode);

					var parsedInstructions = SimpleGCodeParser.ParseText(gCode);
					var gCodeArray = GCodeSplitter.Split(parsedInstructions, splitPoint, splitDegrees, zClearance);
					// SaveToFile("after_split_1.txt", GCodeUtils.GetGCode(gCodeArray[0]));
					// SaveToFile("after_split_2.txt", GCodeUtils.GetGCode(gCodeArray[1]));

					// clean up the mess with too many G0 commands
					var cleanedGCode1 = GCodeUtils.GetMinimizeGCode(gCodeArray[0]);
					var cleanedGCode2 = GCodeUtils.GetMinimizeGCode(gCodeArray[1]);
					// SaveToFile("after_split_clean_1.txt", GCodeUtils.GetGCode(cleanedGCode1));
					// SaveToFile("after_split_clean_2.txt", GCodeUtils.GetGCode(cleanedGCode2));

					var gCodeResult1 = Block.BuildGCodeOutput("Block_1", cleanedGCode1, false);
					var gCodeResult2 = Block.BuildGCodeOutput("Block_1", cleanedGCode2, false);
					// SaveToFile("after_split_build_output_1.txt", gCodeResult1);
					// SaveToFile("after_split_build_output_2.txt", gCodeResult2);

					// convert gcode to draw model
					var fileName = Path.GetFileNameWithoutExtension(drawModel.FileName);
					var extension = Path.GetExtension(drawModel.FileName);

					var newDrawModel1 = DrawModel.FromGCode(gCodeResult1, fileName + "_split_1" + extension);
					var newDrawModel2 = DrawModel.FromGCode(gCodeResult2, fileName + "_split_2" + extension);

					// store with index
					HttpContext.Session.SetObjectAsJson("Split-0", newDrawModel1);
					HttpContext.Session.SetObjectAsJson("Split-1", newDrawModel2);
				}
				return Ok();
			}
			return BadRequest();
		}

		private static void SaveToFile(string fileName, string content)
		{
			var basePath = Path.Combine(Directory.GetCurrentDirectory() + "\\Files\\");
			bool basePathExists = System.IO.Directory.Exists(basePath);
			if (!basePathExists) Directory.CreateDirectory(basePath);
			var filePath = Path.Combine(basePath, fileName);
			System.IO.File.WriteAllText(filePath, content);
		}
	}
}
