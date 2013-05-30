/*global d3*/
var SlideTree = (function () {
    "use strict";
    return {

        initialize: function (source, config) {
            var self = this,
                zoomController,
                svg,
                m;

            this.root = source;
            this.pathMargin = config.pathMargin;
            this.graphDimensions = config.graphDimensions;
            this.dispatch = config.dispatch;
            m = config.graphMargins;

            zoomController = this.zoomController = d3.behavior.zoom()
                .scaleExtent([0.1, 30]);
            this.xScale = d3.scale.linear()
                .domain([0, 10])
                .range([0, 10]);
            this.yScale = d3.scale.linear()
                .domain([0, 10])
                .range([0, 10]);
            zoomController.x(this.yScale).y(this.xScale)
                .on('zoom', function () {
                    self.zoom();
                });

            svg = d3.select("#graph").append("svg:svg");

            this.vis = svg.attr("width", "100%")
                .attr('pointer-events', 'all')
                .call(zoomController)
                .attr("height", "100%")
                .append("svg:g")
                .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

            this.tree = d3.layout.tree()
                .size(null)
                .elementsize([30, 450]);

            this.tooltip = d3.select('#tooltip')
                .style('display', 'none');

            this.diagonal = d3.svg.diagonal()
                .projection(function (d) {
                    return [d.y, d.x];
                });

            this.nodeIdGen = 0;
            this.update(source);
        },

        update: function (source) {
            var self = this, nodeSelection, nodeEnter, nodeUpdate,
                root = this.root,
                nodeExit, linkSelection,
                duration = d3.event && d3.event.altKey ? 5000 : 500,
                xOffset = 0, // remember, x and y are swapped.
                lastDepth,
                pathFound,
                nodeCache = [], trans = 0,
                totalShiftAmount = 0,
                pathMargin = this.pathMargin,
                rootVerticalShift = 0,
                elementsize = self.tree.elementsize(),
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

            if (source.children) {
                trans = -source.y;
            } else {
                if (source.parent) {
                    trans = -source.parent.y;
                }
            }
            this.zoomController.translate([trans, 0]).scale(1);

            // Compute the new tree layout.
            nodes = this.tree.nodes(root).reverse();

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

                if (depth !== lastDepth) {
                    applyShift(rootVerticalShift);
                    nodeCache = [];
                    pathFound = false;
                    lastDepth = depth;
                    totalShiftAmount = 0;
                }

                if (inPath) {
                    rootVerticalShift = (originalRootX - d.x);
                    totalShiftAmount -= pathMargin;
                    applyShift(totalShiftAmount);
                    pathFound = true;
                } else {
                    if (pathFound) {
                        d.x += pathMargin;
                    }
                }
                nodeCache.push(d);

                d.x += xOffset;

            });

            applyShift(rootVerticalShift);

            // Update the nodes…
            nodeSelection = this.nodeSelection = this.vis.selectAll("g.node")
                .data(nodes, function (d) {
                    if (!d.id) {
                        self.nodeIdGen += 1;
                        d.id = self.nodeIdGen;
                    }
                    return d.id;
                });

            // Enter any new nodes at the parent's previous position.
            nodeEnter = nodeSelection.enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function () {
                    return "translate(" + self.yScale(source.y0) + "," + self.xScale(source.x0) + ")";
                })
                .on("click", function (d) {
                    self.collapseSiblings(d);
                    self.dispatch.toggle(d);
                    //self.toggle(d);
                })
                .on('mouseover', function (d) {
                    // show tooltip
                    self.tooltip.style('display', '')
                        .select('span').text(d.name);
                })
                .on('mousemove', function () {
                    var top = d3.event.offsetY - 25,
                        left = d3.event.offsetX - 20,
                        dimensions = self.graphDimensions;

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
                    self.tooltip
                        .style('top', top + 'px')
                        .style('left', left + 'px');
                })
                .on('mouseout', function () {
                    // hide tooltip
                    self.tooltip.style('display', 'none');
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
                    return "translate(" + self.yScale(d.y) + "," + self.xScale(d.x) + ")";
                });

            nodeUpdate.select("rect")
                .style('fill', function (d) {
                    if (d.children) {
                        return 'lightcoral';
                    }
                    return 'lightsteelblue';
                });

            nodeUpdate.select("circle")
                .style('fill', function (d) {
                    if (d.children) {
                        return 'lightcoral';
                    }
                    return '#fff';
                })
                .attr("r", 4.5);

            nodeUpdate.select("text")
                .style("fill-opacity", 1);

            // Transition exiting nodes to the parent's new position.
            nodeExit = nodeSelection.exit().transition()
                .duration(duration)
                .attr("transform", function () {
                    return "translate(" + self.yScale(source.y) + "," + self.xScale(source.x) + ")";
                })
                .remove();

            nodeExit.select("circle")
                .attr("r", 1e-6);

            nodeExit.select("text")
                .style("fill-opacity", 1e-6);

            // Update the links…
            linkSelection = this.linkSelection = this.vis.selectAll("path.link")
                .data(this.tree.links(nodes), function (d) {
                    return d.target.id;
                });

            // Enter any new links at the parent's previous position.
            linkSelection.enter().insert("svg:path", "g")
                .attr("class", "link")
                .attr("d", function () {
                    var o = {x: self.xScale(source.x0), y: self.yScale(source.y0)};
                    return self.diagonal({source: o, target: o});
                })
                .transition()
                .duration(duration)
                .attr("d", function (d) {
                    var source = d.source,
                        target = d.target;
                    source = {x: self.xScale(source.x), y: self.yScale(source.y)};
                    target = {x: self.xScale(target.x), y: self.yScale(target.y)};
                    return self.diagonal({source: source, target: target});
                });

            // Transition links to their new position.
            linkSelection.transition()
                .duration(duration)
                .attr("d", function (d) {
                    var source = d.source,
                        target = d.target;
                    source = {x: self.xScale(source.x), y: self.yScale(source.y)};
                    target = {x: self.xScale(target.x), y: self.yScale(target.y)};
                    return self.diagonal({source: source, target: target});
                });

            // Transition exiting nodes to the parent's new position.
            linkSelection.exit().transition()
                .duration(duration)
                .attr("d", function () {
                    var o = {x: self.xScale(source.x), y: self.yScale(source.y)};
                    return self.diagonal({source: o, target: o});
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function (d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        },

        zoom: function () {
            var self = this;
            this.nodeSelection.attr("transform", function (d) {
                return "translate(" + self.yScale(d.y) + "," + self.xScale(d.x) + ")";
            });

            this.linkSelection.attr("d", function (d) {
                var source = d.source,
                    target = d.target;

                source = {x: self.xScale(source.x), y: self.yScale(source.y)};
                target = {x: self.xScale(target.x), y: self.yScale(target.y)};
                return self.diagonal({source: source, target: target});
            });
        },

        collapseSiblings: function (node) {
            var self = this, nodes;
            if (node.parent) {
                nodes = node.parent.children;
                if (nodes) {
                    nodes.forEach(function (d) {
                        if (d.id !== node.id && d.children) {
                            //self.toggle(d);
                            self.dispatch.toggle(d);
                        }
                    });
                }
            }
        }
    };
}());
