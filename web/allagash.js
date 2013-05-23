var Allagash = {

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
                _this.zoom(_this.root);
            });

        this.tree = d3.layout.tree()
            .size(null)
            .elementsize([15, 240]);

        this.diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        var svg = d3.select("#graph").append("svg:svg");
        this.vis = svg.attr("width", "100%")
            .attr('pointer-events', 'all')
            .call(zoomController)
            .attr("height", "100%")
            .append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

        this.loadNode(this.firstRequest, function (node) {
            _this.root = node;
            node.x0 = 0;
            node.y0 = 0;
            _this.update(node);
        });
    },

    loadNode: function (url, callback) {

        d3.json(url, function (node) {
            if (node) {
                d3.json(node.labels, function (labels) {
                    var data = node.data;
                    node.name = labels[0] + ':' + data.ric + ' - ' + data.nomenclature;
                    callback(node);
                });
            }
        });
    },

    zoom: function () {
        var _this = this;
        this.node.attr("transform", function (d) {
            return "translate(" + _this.yScale(d.y) + "," + _this.xScale(d.x) + ")";
        });

        this.link.attr("d", function (d) {
            var source = d.source,
                target = d.target;

            source = {x: _this.xScale(source.x), y: _this.yScale(source.y)};
            target = {x: _this.xScale(target.x), y: _this.yScale(target.y)};
            return _this.diagonal({source: source, target: target});
        });
    },

    update: function (source) {
        var _this = this;
        var duration = d3.event && d3.event.altKey ? 5000 : 500;
        var xOffset = 0; // remember, x and y are swapped.
        var root = this.root;
        var lastDepth, pathFound;

        // Compute the new tree layout.
        var nodes = this.tree.nodes(this.root).reverse();

        if (root.x > 700 || root.x < 100) {
            xOffset = 400 - root.x;
        }

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            var depth = d.depth, shiftAmount = 0;

            if (depth != lastDepth) {
                pathFound = false;
                lastDepth = depth;
            }
            if (depth <= _this.openedDepth) {
                if (d.inPath) {
                    pathFound = true;
                } else {
                    shiftAmount = pathFound ? -25 : 25;
                }
            }

            d.y = depth * 300;
            d.x += xOffset + shiftAmount;

        });

        // Update the nodes…
        var node = this.node = this.vis.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++_this.nodeIdGen);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("svg:g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on("click", function (d) {
                _this.toggle(d);
                _this.collapseSiblings(d);
                _this.update(d);
            });

        nodeEnter.append("svg:circle")
            .attr("r", 1e-6)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("svg:text")
            .attr("x", function (d) {
                return 10;
            })
            .attr("dy", ".35em")
            .text(function (d) {
                return d.name;
            })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + d.y  + "," + d.x + ")";
            });

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + source.y  + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = this.link = this.vis.selectAll("path.link")
            .data(this.tree.links(nodes), function (d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function (d) {
                var o = {x: source.x0, y: source.y0};
                return _this.diagonal({source: o, target: o});
            })
            .transition()
            .duration(duration)
            .attr("d", this.diagonal);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", this.diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function (d) {
                var o = {x: source.x, y: source.y};
                return _this.diagonal({source: o, target: o});
            })
            .remove();

        this.zoom();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    },

    toggle: function (node) {
        if (node.children) {
            node._children = node.children;
            delete node.children;
            node.inPath = false;
            this.openedDepth = node.depth - 1;
        } else {
            if (node._children) {
                node.children = node._children;
                delete node._children;
            } else {
                this.loadChildren(node);
            }
            node.inPath = true;
            this.openedDepth = node.depth;
        }
    },

    loadChildren: function (node) {
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
