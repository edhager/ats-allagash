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
        isLoading,
        breadcrumbClass = 'breadcrumb',
        breadcrumbNodeClass = 'breadcrumb-node',
        scrollContainerClass = 'scrollcontainer',
        selectClass = 'select',
        selectedClass = 'selected',
        optionClass = 'option',
        hiddenClass = 'hidden',
        VIEW_SIZE = 5,
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
            _keyNavHandler,
            _searchHandler,
            _focusChangeHandler,
            i;
        
        _searchHandler = function (e) {
            searchHandler(e, select);
        };

        _keyNavHandler = function (e) {
            if (!isLoading) {
                keyNavHandler(e, select);
            }
        };

        _focusChangeHandler = function (e) {
            if (!isLoading) {
                focusChangeHandler(e, select);
            }
        };

        container.appendChild(searchBox);
        container.appendChild(select);
        container.classList.add(scrollContainerClass);
        container.dataset.depth = currentDepth++;

        searchBox.setAttribute('type', 'text');
        searchBox.addEventListener('keyup', _searchHandler);

        select.addEventListener('keydown', _keyNavHandler);
        select.addEventListener('focus', _focusChangeHandler, true);
        select.classList.add(selectClass);
        select.setAttribute('tabindex' , '0');

        option.classList.add(optionClass);
        option.setAttribute('tabindex', '-1');

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

    function focusChangeHandler(e, select) {
        var target = document.activeElement,
            selectionIndex = target.dataset.index,
            pruneDepth = select.parentElement.dataset.depth,
            prunedNodes,
            i;
        // check to see if the select container is focused.
        if (target.classList.contains(selectClass)) {
            // If select already has a selection, don't do anything.
            if (target.dataset.selectedIndex) {
                return;
            }
            // otherwise, set selection to the first element.
            target = target.children[0];
            selectionIndex = select.dataset.selectedIndex = 0;
            target.focus();
        }

        // make sure there's actually a change in selection.
        if (target.classList.contains(optionClass) &&
            select.dataset.selectedIndex !== selectionIndex) {
            select.dataset.selectedIndex = selectionIndex;
            removeSelection(select);
            newSelection(target);
            prunedNodes = pruneTree(pruneDepth);
            isLoading = true;
            dispatch.loadChildren(target.__data__, function (node) {
                currentDepth -= prunedNodes[0].length;
                prunedNodes.remove();
                update(node);
                isLoading = false;
            });
        }
    }

    function newSelection(target) {
        target.classList.add(selectedClass);
    }

    function removeSelection(select) {
        var oldSelection = select.querySelectorAll('.' + selectedClass),
            i;
        for (i = 0; i < oldSelection.length; i++) {
            oldSelection[i].classList.remove(selectedClass);
        }
    }

    function pruneTree(pruneDepth) {
        return vis.selectAll('div.' + scrollContainerClass)
            .filter(function () {
                return +this.dataset.depth > +pruneDepth;
            });
    }

    function keyNavHandler(e, select) {
        var keyCode = e.keyCode,
            index = +select.dataset.selectedIndex,
            children = select.children,
            selectedChild;
        if (keyCode === 38) {
            // nav up
            index--;
            selectedChild = children[index];
        } else if (keyCode === 40) {
            // nav down
            index++;
            selectedChild = children[index];
        }
        if (selectedChild) {
            selectedChild.focus();
            select.dataset.selectedIndex = index;
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
        updateContentPane(source);
        if (source.children && source.children.length) {
            view.appendChild(createScrollContainer(source.children));
            setScrollWidth();
            d3view.transition()
                .duration(500)
                .style('left', function () {
                    if (currentDepth >= VIEW_SIZE) {
                        return ((VIEW_SIZE - currentDepth) * (SCROLL_CONTAINER_WIDTH + 2)) + 'px';
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
            breadcrumbNode = document.createElement('div'),
            insertIndex = currentDepth - 1,
            name,
            i;
        clearBreadcrumb();
        if (insertIndex >= 0) {
            breadcrumbArray.splice(insertIndex, breadcrumbArray.length, node);
        } else {
            breadcrumbArray.push(node);
        }

        breadcrumbNode.classList.add(breadcrumbNodeClass);
        for (i = 0; i < breadcrumbArray.length; i++) {
            name = breadcrumbArray[i].name;
            breadcrumbNode = breadcrumbNode.cloneNode();
            breadcrumbNode.textContent = breadcrumbNode.title = name;
            breadcrumb.appendChild(breadcrumbNode);
        }
        breadcrumb.scrollLeft = breadcrumb.scrollWidth;
    }
    
    function clearBreadcrumb() {
        var child;
        while(breadcrumb.lastChild) {
            child = breadcrumb.lastChild;
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
            'value': '100'
        });

        slider.addEventListener('change', function () {
            var s = -scale(this.value),
                width = view.offsetWidth;
            d3view.style('left', s + 'px');
        });
        setScrollWidth();

        return slider;
    }

    function createContentPane() {
        var contentPane = document.createElement('div');
        contentPane.classList.add('content');
        return contentPane;
    }

    function updateContentPane(source) {
        var contentPane = document.querySelector('div.content');
        contentPane.textContent = '[ content about ' + source.name + ' goes here ]';
    }

    function setScrollWidth() {
        if (currentDepth > VIEW_SIZE) {
            var scrollWidth = Math.max(SCROLL_CONTAINER_WIDTH * (currentDepth - VIEW_SIZE), 0);
            scale.range([0, scrollWidth]);
            slider.removeAttribute('disabled');
        } else {
            slider.setAttribute('disabled', 'true');
        }
        slider.value = 100;
    }

    function initialize(source, config) {
        var container,
            navControls,
            contentPane;
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
        contentPane = createContentPane();

        view.appendChild(createScrollContainer([source]));
        container.appendChild(breadcrumb);
        container.appendChild(view);
        container.appendChild(navControls);
        container.appendChild(contentPane);
        d3view = d3.select('div.scrollview');
    }

    return {
        initialize: initialize,
        update: update
    };
}());
