// TODO
// Make the select panes keyboard navigable.

var ScrollView = (function () {
    "use strict";
    var vis,
        view,
        dispatch,
        root,
        graphDimensions,
        pathMargin,
        breadcrumb,
        breadcrumbArray,
        currentDepth,
        breadcrumbClass = 'breadcrumb',
        breadcrumbNodeClass = 'breadcrumb-node',
        scrollContainerClass = 'scrollcontainer',
        selectClass = 'select',
        selectedClass = 'selected',
        optionClass = 'option',
        hiddenClass = 'hidden';


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
        container.classList.add(scrollContainerClass);
        container.dataset.depth = currentDepth++;
        container.setAttribute('tabindex', '0');

        _selectionChangeHandler = function (e) {
            selectionChangeHandler(e, select, container.dataset.depth);
        };

        _searchInputHandler = function (e) {
            searchInputHandler(e, select);
        };

        searchBox.setAttribute('type', 'text');
        searchBox.addEventListener('keyup', _searchInputHandler);

        select.addEventListener('click', _selectionChangeHandler);
        select.classList.add(selectClass);

        option.classList.add(optionClass);

        for (i = 0; i < nodes.length; i++) {
            node = nodes[i];
            option = option.cloneNode();
            option.textContent = node.name;
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
        if (target.classList.contains(optionClass) &&
            select.dataset.selectedIndex !== selectionIndex) {
            // new selection
            select.dataset.selectedIndex = selectionIndex;
            oldSelection = select.querySelectorAll('.' + selectedClass);
            for (i = 0; i < oldSelection.length; i++) {
                oldSelection[i].classList.remove(selectedClass);
            }

            target.classList.add(selectedClass);

            nodeExit = vis.selectAll('div.' + scrollContainerClass)
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
            if (option.textContent.toLowerCase().indexOf(str) < 0) {
                option.classList.add(hiddenClass);
            } else {
                option.classList.remove(hiddenClass);
            }
        }
    }

    function update(source) {
        updateBreadcrumb(source);
        if (source.children && source.children.length) {
            view.appendChild(createScrollContainer(source.children));
            d3.select('div.scrollview')
                .transition()
                .duration(500)
                .style('left', function () {
                    if (currentDepth > 4) {
                        return ((5 - currentDepth) * 232) + 'px';
                    }
                    return '0px';
                });
        }
    }

    function updateBreadcrumb(node) {
        var breadcrumbStr,
            breadcrumbNode = document.createElement('span'),
            insertIndex = currentDepth - 1,
            i;
        clearBreadcrumb();
        if (insertIndex >= 0) {
            breadcrumbArray.splice(insertIndex, breadcrumbArray.length, node);
        } else {
            breadcrumbArray.push(node);
        }

        breadcrumbNode.classList.add(breadcrumbNodeClass);
        for (i = 0; i < breadcrumbArray.length; i++) {
            breadcrumbNode = breadcrumbNode.cloneNode();
            breadcrumbNode.textContent = breadcrumbArray[i].name;          
            breadcrumb.appendChild(breadcrumbNode);
        }
        breadcrumb.scrollLeft = breadcrumb.scrollWidth;
    }
    
    function clearBreadcrumb() {
        var child;
        while(child = breadcrumb.lastChild) {
            breadcrumb.removeChild(child);
        }
    }

    function initialize(source, config) {
        var container;
        view = document.createElement('div');
        view.classList.add('scrollview');
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
        breadcrumb.classList.add(breadcrumbClass);

        view.appendChild(createScrollContainer([source]));
        container.appendChild(breadcrumb);
        container.appendChild(view);
    }

    return {
        initialize: initialize,
        update: update
    };
}());
