// TODO
// Make the select panes keyboard navigable.

var ScrollView = (function () {
    "use strict";
    var vis,
        view,
        d3view,
        dispatch,
        root,
        graphDimensions,
        pathMargin,
        slider,
        scale,
        breadcrumb,
        breadcrumbArray,
        currentDepth,
        breadcrumbClass = 'breadcrumb',
        breadcrumbNodeClass = 'breadcrumb-node',
        scrollContainerClass = 'scrollcontainer',
        selectClass = 'select',
        selectedClass = 'selected',
        optionClass = 'option',
        hiddenClass = 'hidden',
        SCROLL_CONTAINER_WIDTH = 230;

    function setAttributes(elem, attrs) {
        var key;
        for (key in attrs) {
            if (attrs.hasOwnProperty(key)) {
                elem.setAttribute(key, attrs[key]);
            }
        }
    }

    function createScrollContainer(nodes) {
        var container = document.createElement('div'),
            select = document.createElement('div'),
            option = document.createElement('div'),
            searchBox = document.createElement('input'),
            node,
            _selectionChangeHandler,
            _searchHandler,
            i;
        
        container.appendChild(searchBox);
        container.appendChild(select);
        container.classList.add(scrollContainerClass);
        container.dataset.depth = currentDepth++;
        container.setAttribute('tabindex', '0');

        _selectionChangeHandler = function (e) {
            selectionChangeHandler(e, select, container.dataset.depth);
        };

        _searchHandler = function (e) {
            searchHandler(e, select);
        };

        searchBox.setAttribute('type', 'text');
        searchBox.addEventListener('keyup', _searchHandler);

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

    function searchHandler(e, select) {
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
            setScrollWidth();
            d3view.transition()
                .duration(500)
                .style('left', function () {
                    if (currentDepth > 4) {
                        return ((5 - currentDepth) * (SCROLL_CONTAINER_WIDTH + 2)) + 'px';
                    }
                    return '0px';
                });
        }
    }

    function createBreadcrumb() {
        var breadcrumb = document.createElement('div');
        breadcrumb.classList.add(breadcrumbClass);
        return breadcrumb;
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

    function createNavControls() {
        slider = document.createElement('input');
        scale = d3.scale.linear()
            .domain([0, 100]);
        slider.classList.add('slider');
        setAttributes(slider, {
            'type': 'range',
            'min': '0',
            'max': '100',
            'value': '0'
        });

        slider.addEventListener('change', function () {
            var s = -scale(this.value),
                width = view.offsetWidth;
            d3view.style('left', s + 'px');
        });
        setScrollWidth();

        return slider;
    }

    function setScrollWidth() {
        if (currentDepth > 5) {
            var scrollWidth = Math.max(SCROLL_CONTAINER_WIDTH * (currentDepth - 5), 0);
            scale.range([0, scrollWidth]);
            slider.removeAttribute('disabled');
            slider.value = 100;
        } else {
            slider.setAttribute('disabled', 'true');
        }
    }

    function initialize(source, config) {
        var container,
            navControls;
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

        breadcrumb = createBreadcrumb();
        navControls = createNavControls();

        view.appendChild(createScrollContainer([source]));
        container.appendChild(breadcrumb);
        container.appendChild(view);
        container.appendChild(navControls);
        d3view = d3.select('div.scrollview');
    }

    return {
        initialize: initialize,
        update: update
    };
}());
