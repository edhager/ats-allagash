var Allagash = {

    // The amount of whitespace above and below nodes that have children showing.
    pathMargin: 35,

    nameFormatters: {
        APL: function (data) {
            return data.ric + ' - ' + data.nomenclature;
        },

        StockItem: function (data) {
            return data.fsc + ' - ' + data.niin + ' - ' + data.nomenclature;
        },

        Part: function (data) {
            return data.part_number + ' - ' + data.cage;
        }
    },

    go: function () {

        var _this = this, m = this.graphMargins;

        this.nodeIdGen = 0;
        var zoomController = this.zoomController = d3.behavior.zoom()
            .scaleExtent([.1, 30]);
        this.xScale = d3.scale.linear()
            .domain([0, 10])
            .range([0, 10]);
        this.yScale = d3.scale.linear()
            .domain([0, 10])
            .range([0, 10]);
        zoomController.x(this.yScale).y(this.xScale)
            .on('zoom', function () {
                _this.zoom();
            });

        this.tree = d3.layout.tree()
            .size(null)
            .elementsize([30, 450]);

        this.diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        var svg = d3.select("#graph").append("svg:svg");
        this.vis = svg.attr("width", "100%")
            .attr('pointer-events', 'all')
            .call(zoomController)
            .attr("height", "100%")
            .append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

        this.tooltip = d3.select('#tooltip')
            .style('display', 'none');

        this.loadNode(this.firstRequest, function (node) {
            _this.root = node;
            _this.update(node);
        });
    },

    loadNode: function (url, callback) {
        var _this = this;
        d3.json(url, function (node) {
            if (node) {
                d3.json(node.labels, function (labels) {
                    var data = node.data;
                    node.name = labels[0] + ': ' + _this.nameFormatters[labels[0]](data);
                    callback(node);
                });
            }
        });
    },

    zoom: function () {
        var _this = this;
        this.nodeSelection.attr("transform", function (d) {
            return "translate(" + _this.yScale(d.y) + "," + _this.xScale(d.x) + ")";
        });

        this.linkSelection.attr("d", function (d) {
            var source = d.source,
                target = d.target;

            source = {x: _this.xScale(source.x), y: _this.yScale(source.y)};
            target = {x: _this.xScale(target.x), y: _this.yScale(target.y)};
            return _this.diagonal({source: source, target: target});
        });
    },

    update: function (source) {
        var _this = this,
            visNode = _this.vis.node(),
            duration = d3.event && d3.event.altKey ? 5000 : 500;
            xOffset = 0, // remember, x and y are swapped.
            root = this.root,
            lastDepth, pathFound,
            nodeCache = [],
            totalShiftAmount = 0,
            pathMargin = this.pathMargin,
            rootVerticalShift = 0,
            elementsize = _this.tree.elementsize(),
            nodes,
            originalRootX,
            applyShift = function (shiftAmount) {
                if (shiftAmount) {
                    // Apply the shift amount to the cache.
                    nodeCache.forEach(function (d) {
                        d.x += shiftAmount;
                    });
                }
            };

        // Compute the new tree layout.
        nodes = this.tree.nodes(this.root).reverse();

        // sort the nodes by depth and x position
        nodes.sort(function (a, b) {
            var result = a.depth - b.depth;
            if (result === 0) {
                result = a.x - b.x;
            }
            return result;
        });

        if (root.x > 700 || root.x < 100) {
            xOffset = 400 - root.x;
        }
        originalRootX = root.x;

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            var depth = d.depth,
                inPath = !!d.children;

            if (depth != lastDepth) {
                nodeCache = [];
                pathFound = false;
                lastDepth = depth;
                totalShiftAmount = 0;
            }

            if (inPath) {
                rootVerticalShift = d.x - originalRootX;
                totalShiftAmount -= pathMargin + rootVerticalShift;
                applyShift(totalShiftAmount);
                pathFound = true;
            } else {
                if (pathFound) {
                    d.x += pathMargin;
                }
            }
            nodeCache.push(d);

            d.x += xOffset - rootVerticalShift;

        });

        // Update the nodes…
        var nodeSelection = this.nodeSelection = this.vis.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++_this.nodeIdGen);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = nodeSelection.enter().append("svg:g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + _this.yScale(source.y0) + "," + _this.xScale(source.x0) + ")";
            })
            .on("click", function (d) {
                _this.collapseSiblings(d);
                _this.toggle(d);
            })
            .on('mouseover', function (d) {
                // show tooltip
                _this.tooltip.text(d.name)
                    .style('display', '');
            })
            .on('mousemove', function (d) {
                // update position
                _this.tooltip
                    .style('top', (d3.event.offsetY - 45) + 'px')
                    .style('left', (d3.event.offsetX - 20) + 'px');
            })
            .on('mouseout', function (d) {
                // hide tooltip
                _this.tooltip.style('display', 'none');
            });

        nodeEnter.append("svg:circle")
            .attr("r", 1e-6);

        nodeEnter.append("svg:rect")
            .style('fill', '#B8D7FF')
            .attr("x", 8)
            .attr("y", -10)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", elementsize[1] - 50)
            .attr("height", elementsize[0] - 10);

        nodeEnter.append("svg:text")
            .attr("x", 15)
            .attr("dy", ".35em")
            .text(function (d) {
                return d.name;
            })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = nodeSelection.transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + _this.yScale(d.y)  + "," + _this.xScale(d.x) + ")";
            });

        nodeUpdate.select("circle")
            .attr("r", 4.5);

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = nodeSelection.exit().transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + _this.yScale(source.y)  + "," + _this.xScale(source.x) + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var linkSelection = this.linkSelection = this.vis.selectAll("path.link")
            .data(this.tree.links(nodes), function (d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        linkSelection.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function (d) {
                var o = {x: _this.xScale(source.x0), y: _this.yScale(source.y0)};
                return _this.diagonal({source: o, target: o});
            })
            .transition()
            .duration(duration)
            .attr("d", function (d) {
                var source = d.source,
                    target = d.target;
                source = {x: _this.xScale(source.x), y: _this.yScale(source.y)};
                target = {x: _this.xScale(target.x), y: _this.yScale(target.y)};
                return _this.diagonal({source: source, target: target});
            });

        // Transition links to their new position.
        linkSelection.transition()
            .duration(duration)
            .attr("d", function (d) {
                var source = d.source,
                    target = d.target;
                source = {x: _this.xScale(source.x), y: _this.yScale(source.y)};
                target = {x: _this.xScale(target.x), y: _this.yScale(target.y)};
                return _this.diagonal({source: source, target: target});
            });

        // Transition exiting nodes to the parent's new position.
        linkSelection.exit().transition()
            .duration(duration)
            .attr("d", function (d) {
                var o = {x: _this.xScale(source.x), y: _this.yScale(source.y)};
                return _this.diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    },

    /**
     * Shows/hide the children of a give node.  Calls update.
     * @param node
     */
    toggle: function (node) {
        var _this = this;
        if (node.children) {
            node._children = node.children;
            delete node.children;
            this.update(node);
        } else {
            if (node._children) {
                node.children = node._children;
                delete node._children;
                this.update(node);
            } else {
                this.loadChildren(node, function (node) {
                    _this.update(node);
                });
            }
        }
    },

    loadChildren: function (node, callback) {
        var _this = this;
        if (!node.children) {
            node.children = [];
        }
        d3.json(node.outgoing_relationships, function (json) {
            var count = json.length;
            json.forEach(function (outgoing) {
                    _this.loadNode(outgoing.end, function (endNode) {
                        node.children.push(endNode);
                        count--;
                        if (count === 0) {
                            node.childrenLoaded = true;
                            callback(node);
                        }
                    });
            });
        });
    },

    // toggle siblings of the current node.
    collapseSiblings: function (node) {
        var _this = this;
        if (node.parent) {
            var nodes = node.parent.children;
            if (nodes) {
                nodes.forEach(function (d) {
                    if (d.id !== node.id && d.children) {
                        _this.toggle(d);
                    }
                });
            }
        }
    }

};
