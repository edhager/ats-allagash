var Allagash = {

    go: function () {

        var _this = this, m = this.graphMargins;

        this.nodeIdGen = 0;

        this.tree = d3.layout.tree()
            .size(null)
            .elementsize([15, 240]);

        this.diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        var svg = d3.select("#graph").append("svg:svg");
        this.vis = svg.attr("width", "100%")
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

    update: function (source) {
        var _this = this;
        var duration = d3.event && d3.event.altKey ? 5000 : 500;
        var xOffset = 0; // remember, x and y are swapped.
        var root = this.root;
        var lastDepth, pathFound;
        var nodeCache = [];
        var totalShiftAmount = 0;

        // Compute the new tree layout.
        var nodes = this.tree.nodes(this.root).reverse();

        // sort the nodes by depth and x position
        nodes.sort(function (a, b) {
            var result = b.depth - a.depth;
            if (result === 0) {
                result = b.x - a.x;
            }
            return result;
        });

        if (root.x > 700 || root.x < 100) {
            xOffset = 400 - root.x;
        }

        // Normalize for fixed-depth.
        var applyShift = function (shiftAmount) {
            if (shiftAmount) {
                // Apply the shift amount to the cache.
                nodeCache.forEach(function (d) {
                    d.x += shiftAmount;
                });
            }
        };
        nodes.forEach(function (d) {
            var depth = d.depth,
                inPath = !!d.children;

            if (depth != lastDepth) {
                nodeCache = [];
                pathFound = false;
                lastDepth = depth;
            }

            if (inPath) {
                totalShiftAmount += 25;
                applyShift(totalShiftAmount);
                pathFound = true;
            } else {
                if (pathFound) {
                    d.x -= 25;
                }
            }
            nodeCache.push(d);

            d.y = depth * 300;
            d.x += xOffset;

        });

        // Update the nodes…
        var node = this.vis.selectAll("g.node")
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
        var link = this.vis.selectAll("path.link")
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
            json = json.splice(0, 10);
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
    }
};