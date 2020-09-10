function ajaxGet(url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            // console.log(xmlhttp.responseText);   
            try {
                var data = JSON.parse(xmlHttp.responseText);
            }
            catch (err) {
                console.log(err.message + ' Getting: ' + url);
                return;
            }
            callback(data);
        }
    };
    xmlHttp.open("GET", url, true);
    xmlHttp.send();
}
// https://www.freecodecamp.org/news/take-10-minutes-to-get-started-with-handlebars-298632ed82ab/
// use like this:
// runHandlebars('nav-sub-1', '/data/courses.json', 'nav-submenu-template');
// runHandlebars('contributors', '/data/contributors.json', 'contributors-template');
function runHandlebars(id, dataSrc, src) {
    if (document.getElementById(id) != null) {
        var content = document.getElementById(id);
        ajaxGet(dataSrc, function (data) {
            var source = document.getElementById(src).innerHTML;
            // let template = Handlebars.compile(source);
            // content.innerHTML = template(data);
        });
    }
}
//# sourceMappingURL=templating.js.map