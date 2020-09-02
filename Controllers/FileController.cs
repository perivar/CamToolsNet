

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
            var dxfModel = HttpContext.Session.GetObjectFromJson<DxfDocumentModel>("DxfDocument");
            return View(dxfModel);
        }

        [HttpPost]
        public async Task<IActionResult> UploadToFileSystem(List<IFormFile> files, string description)
        {
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

                    var dxf = DxfDocument.Load(memoryStream);
                    // convert to a model that can be serialized
                    // I am unable to get the default dxfnet model to be serialized
                    var dxfModel = DxfDocumentModel.FromDxfDocument(dxf);
                    HttpContext.Session.SetObjectAsJson("DxfDocument", dxfModel);
                }
            }

            TempData["Message"] = "File successfully uploaded";
            return RedirectToAction("Index");
        }


        [HttpGet]
        public async Task<IActionResult> CirclesToLayers()
        {
            // traverse through all circles and set the layer whenever the radius is the same
            
            TempData["Message"] = "Conversion Successfull";
            return RedirectToAction("Index");
        }
    }
}