using System;
using System.Collections.Generic;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CAMToolsNet.Models;
using CoordinateUtils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using netDxf;
using netDxf.Entities;
using SVG;

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

		[HttpPost("Upload")] // POST /api/Editor/Upload
		public async Task<IActionResult> Upload(List<IFormFile> files, [FromForm] string description)
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
								drawModel = DrawModel.FromDxfDocument(dxf, file.FileName);
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
								drawModel = DrawModel.FromSVGDocument(svg, file.FileName);
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

		[HttpGet("PolylineToCircles")]  // GET /api/Editor/PolylineToCircles
		public IActionResult PolylineToCircles()
		{
			// traverse through all polylines and convert those that are circles to circles
			var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
			if (drawModel != null)
			{
				// Iterate the list in reverse with a for loop to be able to remove while iterating
				for (int i = drawModel.Polylines.Count - 1; i >= 0; i--)
				{
					var poly = drawModel.Polylines[i];
					var points = poly.Vertexes.Select(p => p.PointF);
					if (Transformation.IsPolygonCircle(points))
					{
						// get center point and radius
						PointF center = PointF.Empty;
						float radius = 0.0f;
						Transformation.GetCenterAndRadiusForPolygonCircle(points, ref center, out radius);

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
	}
}
