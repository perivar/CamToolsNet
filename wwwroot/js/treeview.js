// tree 
function treed(id, o) {
    var openedClass = 'fa fa-minus-circle';
    var closedClass = 'fa fa-plus-circle';
    if (typeof o != 'undefined') {
        if (typeof o.openedClass != 'undefined') {
            openedClass = o.openedClass;
        }
        if (typeof o.closedClass != 'undefined') {
            closedClass = o.closedClass;
        }
    }
    ;
    //initialize each of the top levels
    var tree = $(document.getElementById(id));
    tree.addClass("tree");
    tree.find('li').has("ul").each(function () {
        var branch = $(this); //li with children ul
        branch.prepend("");
        branch.addClass('branch');
        branch.on('click', function (e) {
            if (this == e.target) {
                var icon = $(this).children('i:first');
                icon.toggleClass(openedClass + " " + closedClass);
                $(this).children().children().toggle();
            }
        });
        branch.children().children().toggle();
    });
    //fire event from the dynamically added icon
    tree.find('.branch .indicator').each(function () {
        $(this).on('click', function () {
            $(this).closest('li').trigger("click");
        });
    });
    //fire event to open branch if the li contains an anchor instead of text
    tree.find('.branch>a').each(function () {
        $(this).on('click', function (e) {
            $(this).closest('li').trigger("click");
            e.preventDefault();
        });
    });
    //fire event to open branch if the li contains a button instead of text
    tree.find('.branch>button').each(function () {
        $(this).on('click', function (e) {
            $(this).closest('li').trigger("click");
            e.preventDefault();
        });
    });
}
//# sourceMappingURL=treeview.js.map