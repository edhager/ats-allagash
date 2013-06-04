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
            select = document.createElement('div'),
            option = document.createElement('div'),
            searchBox = document.createElement('input'),
            node,
            _selectionChangeHandler,
            _searchInputHandler,
            i;
        
        container.appendChild(searchBox);
        container.appendChild(select);
        container.classList.add('scrollcontainer');
        container.dataset.depth = currentDepth++;

        _selectionChangeHandler = function (e) {
            selectionChangeHandler(e, select, container.dataset.depth);
        };

        _searchInputHandler = function (e) {
            searchInputHandler(e, select);
        };

        searchBox.setAttribute('type', 'text');
        searchBox.addEventListener('keyup', _searchInputHandler);

        select.addEventListener('click', _selectionChangeHandler);
        select.classList.add('select');

        option.classList.add('option');

        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            option = option.cloneNode();
            option.innerText = node.name;
            option.setAttribute('title', node.name);
            option.__data__ = node;
            option.dataset.index = i;
            select.appendChild(option);
        }
        return container;
    }

    function selectionChangeHandler(e, select, pruneDepth) {
        var target = e.target,
            selectionIndex = target.dataset.index,
            prunedCount = 0,
            oldSelection,
            nodeExit,
            i;
        if (select.dataset.selectedIndex !== selectionIndex) {
            // new selection
            select.dataset.selectedIndex = selectionIndex;
            oldSelection = select.querySelectorAll('.selected');
            for (i = 0; i < oldSelection.length; i++) {
                oldSelection[i].classList.remove('selected');
            }

            target.classList.add('selected');

            nodeExit = vis.selectAll('div.scrollcontainer')
                .filter(function () {
                    if (+this.dataset.depth > +pruneDepth) {
                        prunedCount++;
                        return true;
                    }
                });
            currentDepth -= prunedCount;
            dispatch.loadChildren(target.__data__, function (node) {
                nodeExit.remove();
                update(node);
            });
        }
    }

    function searchInputHandler(e, select) {
        // filter scroll container
        var options = select.children,
            option,
            str = e.target.value.toLowerCase(),
            i;
        for (i = 0; i < options.length; i++) {
            option = options[i];
            if (option.innerText.toLowerCase().indexOf(str) < 0) {
                option.classList.add('hidden');
            } else {
                option.classList.remove('hidden');
            }
        }
    }

    function update(source) {
        updateBreadcrumb(source);
        if (source.children) {
            vis.node().appendChild(createScrollContainer(source.children));
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

    function initialize(source, config) {
        var container;
        vis = d3.select('#graph');
        container = vis.node();

        currentDepth = 0;
        breadcrumbArray = [];
        root = source;
        pathMargin = config.pathMargin;
        graphDimensions = config.graphDimensions;
        dispatch = config.dispatch;
        m = config.graphMargins;
        breadcrumb = document.createElement('div');
        breadcrumb.classList.add('breadcrumb');

        container.appendChild(breadcrumb);
        container.appendChild(createScrollContainer([source]));
    }

    return {
        initialize: initialize,
        update: update
    };
}());
