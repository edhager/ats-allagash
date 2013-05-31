var ScrollView = (function () {
    var vis,
        dispatch,
        root,
        graphDimensions,
        pathMargin,
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
            option = target.options[target.selectedIndex];
        vis = vis || d3.select('#graph');
        // collapse siblings.
        vis.selectAll('div.scrollcontainer')
            .filter(function () {
                return +this.dataset.depth > +pruneDepth;
            })
            .remove();

        dispatch.loadChildren(option.__data__, update);
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
        if (source.children) {
            vis.node().appendChild(createScrollContainer(source.children));
        } else {
            var depth = source.depth;
            // remove child scroll containers
        }
    }

    return {
        initialize: function (source, config) {
            currentDepth = 0;
            root = source;
            pathMargin = config.pathMargin;
            graphDimensions = config.graphDimensions;
            dispatch = config.dispatch;
            m = config.graphMargins;

            var vis = document.getElementById('graph');
            vis.appendChild(createScrollContainer([source]));
        },

        update: update
    };
}());
