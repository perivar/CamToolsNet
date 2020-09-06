

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using CAMToolsNet.Models;
using Microsoft.AspNetCore.Http;
using System.IO;
using netDxf;
using netDxf.Entities;
using System.Globalization;
using SVG;
using CoordinateUtils;
using System.Drawing;

namespace CAMToolsNet.Controllers
{
    public class FileController : Controller
    {
        private readonly ILogger<FileController> _logger;

        public FileController(ILogger<FileController> logger)
        {
            _logger = logger;
        }

        public IActionResult Index()
        {
            ViewData["Message"] = TempData["Message"];
            // var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
            // return View(drawModel);
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> UploadToFileSystem(List<IFormFile> files, string description)
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
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream);

                    // At this point, the Offset is at the end of the MemoryStream
                    // Either do this to seek to the beginning
                    memoryStream.Seek(0, SeekOrigin.Begin);

                    // try to parse as dxf
                    try
                    {
                        var dxf = DxfDocument.Load(memoryStream);
                        if (dxf != null)
                        {
                            // convert dxf to a model that can be serialized
                            // since I am unable to get the default dxfnet model to be serialized
                            drawModel = DrawModel.FromDxfDocument(dxf, file.FileName);
                        }
                    }
                    catch (System.Exception)
                    {
                        // ignore
                    }

                    // try to parse as SVG
                    try
                    {
                        var svg = SVGDocument.Load(memoryStream);
                        if (svg != null)
                        {
                            drawModel = DrawModel.FromSVGDocument(svg, file.FileName);
                        }
                    }
                    catch (System.Exception)
                    {
                        // ignore
                    }

                    if (drawModel != null) HttpContext.Session.SetObjectAsJson("DrawModel", drawModel);
                }
            }

            if (HttpContext.Session.Keys.Contains("DrawModel"))
            {
                TempData["Message"] = "File successfully uploaded";
            }
            else
            {
                TempData["Message"] = "Files missing!";
            }

            return RedirectToAction("Index");
        }

        [HttpGet]
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

                    TempData["Message"] = "File saved successfully";
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
                TempData["Message"] = "Conversion unsuccessfull!";
            }

            return RedirectToAction("Index");
        }

        [HttpGet]
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

            return RedirectToAction("Index");
        }
    }
}