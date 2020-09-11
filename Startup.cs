using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace CAMToolsNet
{
    public class Startup
    {
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            Env = env;
        }

        public IWebHostEnvironment Env { get; set; }
        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddDistributedMemoryCache();

            services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(20);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
            });

            services.AddCors(o =>
                       {
                           o.AddPolicy("Everything",

                               // To avoid the following error - use SetIsOriginAllowed(_ => true)
                               // Access to XMLHttpRequest at 'https://api.nerseth.com/crosswordsignalrhub/negotiate' from origin 'https://crossword.nerseth.com' 
                               // has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
                               // The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' 
                               // when the request's credentials mode is 'include'. 

                               // The credentials mode of requests initiated by the XMLHttpRequest is controlled by the withCredentials attribute.
                               // When using "AllowCredentials()" we cannot use AllowAnyOrigin()
                               // instead the SetIsOriginAllowed(_ => true) is required.
                               builder => builder
                                   .AllowAnyHeader()
                                   .AllowAnyMethod()
                                   // .AllowAnyOrigin()
                                   .SetIsOriginAllowed(_ => true)
                                   .AllowCredentials()
                                   .WithExposedHeaders("WWW-Authenticate", "Token-Expired", "Refresh-Token-Expired", "Invalid-Token", "Invalid-Refresh-Token")
                               );
                       });

            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders =
                    ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            });

            var mvcBuilder = services.AddControllersWithViews();
            if (Env.IsDevelopment())
            {
                mvcBuilder.AddRazorRuntimeCompilation();
            }
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseForwardedHeaders();

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }
            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();

            app.UseCors("Everything");

            app.UseAuthorization();

            app.UseSession();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
