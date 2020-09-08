using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CAMToolsNet.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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

        [HttpGet]
        public DrawModel Get()
        {
            var drawModel = HttpContext.Session.GetObjectFromJson<DrawModel>("DrawModel");
            if (drawModel == null)
            {
                _logger.LogError("Could not read drawmodel from session!");
                return null;
            }
            else
            {
                return drawModel;
            }
        }
    }
}
