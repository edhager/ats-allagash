var ScrollView = (function () {
    var vis,
        dispatch,
        root,
        graphDimensions,
        pathMargin,
        breadcrumb,
        breadcrumbArray,
        currentDepth;


    function createScrollContainer(nodes) {
        var container = document.createElement('div'),
            select = document.createElement('select'),
            option = document.createElement('option'),
            searchBox = document.createElement('input'),
            node,
            _selectionChangeHandler,
            i;
        
        container.appendChild(searchBox);
        container.appendChild(select);
        container.classList.add('scrollcontainer');
        container.dataset.depth = currentDepth++;

        _selectionChangeHandler = function (e) {
            selectionChangeHandler(e, container.dataset.depth);
        };

        _searchInputHandler = function (e) {
            searchInputHandler(e, select);
        };

        searchBox.setAttribute('type', 'text');
        searchBox.addEventListener('keyup', _searchInputHandler);

        select.setAttribute('multiple', 'true');
        select.addEventListener('change', _selectionChangeHandler);

        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            option = option.cloneNode();
            option.innerText = node.name;
            option.__data__ = node;
            select.appendChild(option);
        }
        return container;
    }

    function selectionChangeHandler(e, pruneDepth) {
        var target = e.target,
            option = target.options[target.selectedIndex],
            prunedCount = 0;
        if (option) {
            vis = vis || d3.select('#graph');
            // collapse siblings.
            vis.selectAll('div.scrollcontainer')
                .filter(function () {
                    if (+this.dataset.depth > +pruneDepth) {
                        prunedCount++;
                        return true;
                    }
                })
                .remove();

            currentDepth -= prunedCount;
            dispatch.loadChildren(option.__data__, update);
        }
    }

    function searchInputHandler(e, select) {
        // filter scroll container
        var options = select.options,
            option,
            str = e.target.value,
            i;
        for (i = 0; i < options.length; i++) {
            option = options[i];
            if (option.innerText.indexOf(str) < 0) {
                option.setAttribute('disabled', 'true');
            } else {
                option.removeAttribute('disabled');
            }
        }
    }

    function update(source) {
        updateBreadcrumb(source);
        if (source.children) {
            vis.node().appendChild(createScrollContainer(source.children));
        } else {
            // remove child scroll containers
        }
    }

    function updateBreadcrumb(node) {
        var breadcrumbStr,
            index = currentDepth - 1;
        if (index >= 0) {
            breadcrumbArray.splice(index, breadcrumbArray.length, node);
        } else {
            breadcrumbArray.push(node);
        }

        breadcrumbStr = breadcrumbArray.map(function (d) {
            return d.name;
        }).join(' > ');
        breadcrumb.innerText = breadcrumbStr;
    }


    return {
        initialize: function (source, config) {
            var vis = document.getElementById('graph');

            currentDepth = 0;
            breadcrumbArray = [];
            root = source;
            pathMargin = config.pathMargin;
            graphDimensions = config.graphDimensions;
            dispatch = config.dispatch;
            m = config.graphMargins;
            breadcrumb = document.createElement('div');
            breadcrumb.classList.add('breadcrumb');

            vis.appendChild(breadcrumb);
            vis.appendChild(createScrollContainer([source]));
        },

        update: update
    };
}());
