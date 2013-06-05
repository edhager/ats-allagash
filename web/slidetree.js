/*global d3*/
var SlideTree = (function () {
    "use strict";

    var root,
        pathMargin,
        graphDimensions,
        dispatch,
        zoomController,
        xScale,
        yScale,
        vis,
        tree,
        tooltip,
        nodeIdGen,
        nodes,
        nodeSelection,
        linkSelection,
        diagonal = d3.svg.diagonal()
                .projection(function (d) {
                    return [d.y, d.x];
                }),
        getNodeFill = function (d) {
                if (d.children) {
                    return 'lightcoral';
                }
                return 'lightsteelblue';
            };

    return {

        initialize: function (source, config) {
            var self = this,
                svg;

            root = source;
            pathMargin = config.pathMargin;
            graphDimensions = config.graphDimensions;
            dispatch = config.dispatch;
            m = config.graphMargins;

            zoomController = d3.behavior.zoom()
                .scaleExtent([0.1, 30]);
            xScale = d3.scale.linear()
                .domain([0, 10])
                .range([0, 10]);
            yScale = d3.scale.linear()
                .domain([0, 10])
                .range([0, 10]);
            zoomController.x(yScale).y(xScale)
                .on('zoom', function () {
                    self.zoom();
                });

            svg = d3.select("#graph").append("svg:svg")
                .attr('pointer-events', 'all')
                .style('position', 'absolute')
                .style("width", "100%")
                .style("height", "100%")
                .call(zoomController);

            vis = svg.append("svg:g")
                .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

            tree = d3.layout.tree()
                .size(null)
                .elementsize([30, 450]);

            tooltip = d3.select('#tooltip')
                .style('display', 'none');

            nodeIdGen = 0;
            this.update(source);
        },

        update: function (source) {
            var self = this, nodeEnter, nodeUpdate,
                nodeExit,
                duration = d3.event && d3.event.altKey ? 5000 : 500,
                xOffset = 0, // remember, x and y are swapped.
                lastDepth,
                pathFound,
                nodeCache = [], trans = 0,
                totalShiftAmount = 0,
                rootVerticalShift = 0,
                elementsize = tree.elementsize(),
                nodes,
                applyShift = function (nodes, shiftAmount) {
                    if (shiftAmount) {
                        // Apply the shift amount to the cache.
                        nodes.forEach(function (d) {
                            d.x += shiftAmount;
                        });
                    }
                };

            if (source.children) {
                trans = -source.y;
            } else {
                if (source.parent) {
                    trans = -source.parent.y;
                }
            }
            zoomController.translate([trans, 0]).scale(1);

            // Compute the new tree layout.
            nodes = tree.nodes(root).reverse();

            // sort the nodes by depth and x position
            nodes.sort(function (a, b) {
                var result = a.depth - b.depth;
                if (result === 0) {
                    result = a.x - b.x;
                }
                return result;
            });

            nodes.forEach(function (d) {
                var depth = d.depth,
                    inPath = !!d.children;

                if (depth !== lastDepth) {
                    applyShift(nodeCache, rootVerticalShift);
                    nodeCache = [];
                    pathFound = false;
                    lastDepth = depth;
                    totalShiftAmount = 0;
                }

                if (inPath) {
                    rootVerticalShift = (root.x - d.x);
                    totalShiftAmount -= pathMargin;
                    applyShift(nodeCache, totalShiftAmount);
                    pathFound = true;
                } else {
                    if (pathFound) {
                        d.x += pathMargin;
                    }
                }
                nodeCache.push(d);
            });

            applyShift(nodeCache, rootVerticalShift);

            xOffset = 300 - root.x;
            applyShift(nodes, xOffset);

            // Update the nodes…
            nodeSelection = vis.selectAll("g.node")
                .data(nodes, function (d) {
                    if (!d.id) {
                        nodeIdGen += 1;
                        d.id = nodeIdGen;
                    }
                    return d.id;
                });

            // Enter any new nodes at the parent's previous position.
            nodeEnter = nodeSelection.enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function () {
                    return "translate(" + yScale(source.y0) + "," + xScale(source.x0) + ")";
                })
                .on("click", function (d) {
                    self.collapseSiblings(d);
                    self.toggle(d);
                })
                .on('mouseover', function (d) {
                    // show tooltip
                    tooltip.style('display', '')
                        .select('span').text(d.name);
                })
                .on('mousemove', function () {
                    var top = d3.event.offsetY - 25,
                        left = d3.event.offsetX - 20,
                        dimensions = graphDimensions;

                    if (top < 0) {
                        top = 0;
                    } else if (top > dimensions[0]) {
                        top = dimensions[0];
                    }
                    if (left < 0) {
                        left = 0;
                    } else if (left > dimensions[1]) {
                        left = dimensions[1];
                    }
                    tooltip
                        .style('top', top + 'px')
                        .style('left', left + 'px');
                })
                .on('mouseout', function () {
                    // hide tooltip
                    tooltip.style('display', 'none');
                });

            nodeEnter.append("svg:circle")
                .attr("r", 1e-6);

            nodeEnter.append("svg:rect")
                .style('fill', 'lightsteelblue')
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
            nodeUpdate = nodeSelection.transition()
                .duration(duration)
                .attr("transform", function (d) {
                    return "translate(" + yScale(d.y) + "," + xScale(d.x) + ")";
                });

            nodeUpdate.select("rect")
                .style('fill', getNodeFill);

            nodeUpdate.select("circle")
                .style('fill', getNodeFill)
                .attr("r", 4.5);

            nodeUpdate.select("text")
                .style("fill-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            nodeExit = nodeSelection.exit().transition()
                .duration(duration)
                .attr("transform", function () {
                    return "translate(" + yScale(source.y) + "," + xScale(source.x) + ")";
                })
                .remove();

            nodeExit.select("circle")
                .attr("r", 1e-6);

            nodeExit.select("text")
                .style("fill-opacity", 1e-6);

            if (!this.noLinesMode) {
                // Update the links…
                linkSelection = vis.selectAll("path.link")
                    .data(tree.links(nodes), function (d) {
                        return d.target.id;
                    });

                // Enter any new links at the parent's previous position.
                linkSelection.enter().insert("svg:path", "g")
                    .attr("class", "link")
                    .attr("d", function () {
                        var o = {x: xScale(source.x0), y: yScale(source.y0)};
                        return diagonal({source: o, target: o});
                    })
                    .transition()
                    .duration(duration)
                    .attr("d", function (d) {
                        var source = d.source,
                            target = d.target;
                        source = {x: xScale(source.x), y: yScale(source.y)};
                        target = {x: xScale(target.x), y: yScale(target.y)};
                        return diagonal({source: source, target: target});
                    });

                // Transition links to their new position.
                linkSelection.transition()
                    .duration(duration)
                    .attr("d", function (d) {
                        var source = d.source,
                            target = d.target;
                        source = {x: xScale(source.x), y: yScale(source.y)};
                        target = {x: xScale(target.x), y: yScale(target.y)};
                        return diagonal({source: source, target: target});
                    });

                // Transition exiting nodes to the parent's new position.
                linkSelection.exit().transition()
                    .duration(duration)
                    .attr("d", function () {
                        var o = {x: xScale(source.x), y: yScale(source.y)};
                        return diagonal({source: o, target: o});
                    })
                    .remove();
            }

            // Stash the old positions for transition.
            nodes.forEach(function (d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        },

        zoom: function () {
            nodeSelection.attr("transform", function (d) {
                return "translate(" + yScale(d.y) + "," + xScale(d.x) + ")";
            });

            linkSelection.attr("d", function (d) {
                var source = d.source,
                    target = d.target;

                source = {x: xScale(source.x), y: yScale(source.y)};
                target = {x: xScale(target.x), y: yScale(target.y)};
                return diagonal({source: source, target: target});
            });
        },

        /**
         * Shows/hide the children of a give node.  Calls update.
         * @param node
         */
        toggle: function (node) {
            var self = this;
            if (node.children) {
                node.hiddenChildren = node.children;
                delete node.children;
                self.update(node);
            } else {
                if (node.hiddenChildren) {
                    node.children = node.hiddenChildren;
                    delete node.hiddenChildren;
                    self.update(node);
                } else if (!node.childrenLoaded) {
                    dispatch.loadChildren(node, function (node) {
                        self.update(node);
                    });
                }
            }
        },

        collapseSiblings: function (node) {
            var self = this;
            if (node.parent) {
                nodes = node.parent.children;
                if (nodes) {
                    nodes.forEach(function (d) {
                        if (d.id !== node.id && d.children) {
                            self.toggle(d);
                        }
                    });
                }
            }
        }
    };
}());
