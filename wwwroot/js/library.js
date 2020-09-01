var jqtest = {
    showMsg: function () {
        var v = jQuery.fn.jquery.toString();
        var content = $("#ts-example-2")[0].innerHTML;
        //alert(content.toString());
        $("#ts-example-2")[0].innerHTML = content + " " + v + "!!";
    }
};
jqtest.showMsg();
//# sourceMappingURL=library.js.map