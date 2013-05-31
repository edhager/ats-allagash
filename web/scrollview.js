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
        }

        searchBox.setAttribute('type', 'text');
        searchBox.addEventListener('keyup', searchInputHandler);

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

        dispatch.toggle(option.__data__);
    }

    function searchInputHandler(e) {
        // filter scroll container
        var options = select.options,
        option,
        i;
        for (i = 0; i < options; i++) {
            // TODO                             
        }
    }

    return {
        initialize: function (source, config) {
            var self = this;

            currentDepth = 0;
            root = source;
            pathMargin = config.pathMargin;
            graphDimensions = config.graphDimensions;
            dispatch = config.dispatch;
            m = config.graphMargins;


            var vis = d3.select('#graph');
            vis.node().appendChild(createScrollContainer([source]));
        },

        update: function (source) {
            if (source.children) {
                vis.node().appendChild(createScrollContainer(source.children));
            } else {
                var depth = source.depth;
                // remove child scroll containers
            }
        }
    };
}());
