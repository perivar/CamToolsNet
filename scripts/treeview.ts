// tree 
function initTreeMenu(divId: string, treeId: string, drawModel: any) {

    const treeDiv = document.getElementById(divId);

    var ul = document.createElement('ul');
    // ul.setAttribute('class', 'list-group');
    ul.setAttribute('id', treeId);
    treeDiv.appendChild(ul);

    var li = document.createElement('li');
    // li.setAttribute('class', 'list-group-item');
    ul.appendChild(li);

    var i = document.createElement('i');
    i.setAttribute('class', 'fa fa-plus-circle');
    i.setAttribute('aria-hidden', 'true');

    var a = document.createElement('a');
    a.setAttribute('href', '#');
    a.setAttribute('class', 'h6');
    var a_txt = document.createTextNode(' Show GCode');
    a.appendChild(a_txt);

    li.appendChild(i);
    li.appendChild(a);

    // children
    var child_ul = document.createElement('ul');
    // child_ul.setAttribute('id', 'treechild');
    li.appendChild(child_ul);

    const layers = ['Layer 1', 'Layer 2', 'Layer 3'];
    layers.forEach((item, index) => {

        var child_li = document.createElement('li');        
        child_ul.appendChild(child_li);

        var child_i = document.createElement('i');
        child_i.setAttribute('class', 'fa fa-plus-circle');
        child_i.setAttribute('aria-hidden', 'true');

        var child_a = document.createElement('a');
        child_a.setAttribute('href', '#');
        child_a.setAttribute('class', 'h6');
        var child_a_txt = document.createTextNode(' ' + item);
        child_a.appendChild(child_a_txt);

        // child_li.appendChild(child_i);
        child_li.appendChild(child_a);
    })

    //     <ul id='treemenu'>
    //     <li>
    //         <i class='fa fa-plus-circle' aria-hidden='true'></i>                        
    //         <a href='#'>Gcode</a>
    //         <ul>
    //         <li>Company Maintenance</li>
    //         <li>
    //             Employees
    //             <ul>
    //                 <li>
    //                     Reports
    //                     <ul>
    //                     <li>Report1</li>
    //                     <li>Report2</li>
    //                     <li>Report3</li>
    //                     </ul>
    //                 </li>
    //                 <li>Employee Maint.</li>
    //             </ul>
    //         </li>
    //         <li>Human Resources</li>
    //         </ul>
    //     </li>

}

function readTreeMenu(id: string, o?: any) {

    var openedClass = 'fa fa-minus-circle';
    var closedClass = 'fa fa-plus-circle';

    if (typeof o != 'undefined') {
        if (typeof o.openedClass != 'undefined') {
            openedClass = o.openedClass;
        }
        if (typeof o.closedClass != 'undefined') {
            closedClass = o.closedClass;
        }
    };

    //initialize each of the top levels
    const tree = $(document.getElementById(id));
    tree.addClass('tree');
    tree.find('li').has('ul').each(function () {
        var branch = $(this); //li with children ul
        branch.prepend('');
        branch.addClass('branch');
        branch.on('click', function (e) {
            if (this == e.target) {
                var icon = $(this).children('i:first');
                icon.toggleClass(openedClass + ' ' + closedClass);
                $(this).children().children().toggle();
            }
        })
        branch.children().children().toggle();
    });
    //fire event from the dynamically added icon
    tree.find('.branch .indicator').each(function () {
        $(this).on('click', function () {
            $(this).closest('li').trigger('click');
        });
    });
    //fire event to open branch if the li contains an anchor instead of text
    tree.find('.branch>a').each(function () {
        $(this).on('click', function (e) {
            $(this).closest('li').trigger('click');
            e.preventDefault();
        });
    });
    //fire event to open branch if the li contains a button instead of text
    tree.find('.branch>button').each(function () {
        $(this).on('click', function (e) {
            $(this).closest('li').trigger('click');
            e.preventDefault();
        });
    });
}
