/*global d3*/
var Allagash = (function () {
    "use strict";
    return {

        // The amount of whitespace above and below nodes that have children showing.
        pathMargin: 35,

        nameFormatters: {
            /**
             * Format APL data
             * @param {Object} data
             * @return {string}
             */
            APL: function (data) {
                return data.ric + ' - ' + data.nomenclature;
            },

            /**
             * Format stock item data
             * @param {Object} data
             * @returns {string}
             */
            StockItem: function (data) {
                return data.fsc + ' - ' + data.niin + ' - ' + data.nomenclature;
            },

            /**
             * Formate part data.
             * @param {Object} data
             * @returns {string}
             */
            Part: function (data) {
                return data.part_number + ' - ' + data.cage;
            }
        },

        go: function (view) {
            var self = this, m = this.graphMargins, dispatch;
            this.view = view;

            // clean up old vis
            d3.selectAll('svg').remove();

            dispatch = d3.dispatch('toggle');
            dispatch.on('toggle', this.toggle.bind(this));

            this.loadNode(this.firstRequest, function (node) {
                self.root = node;
                view.initialize(node, {
                    graphDimensions: self.graphDimensions,
                    pathMargin: self.pathMargin,
                    graphMargins: m,
                    dispatch: dispatch
                });
            });
        },

        loadNode: function (url, callback) {
            var self = this;
            d3.json(url, function (node) {
                if (node) {
                    d3.json(node.labels, function (labels) {
                        var data = node.data;
                        node.name = labels[0] + ': ' + self.nameFormatters[labels[0]](data);
                        callback(node);
                    });
                }
            });
        },

        /**
         * Shows/hide the children of a give node.  Calls update.
         * @param node
         */
        toggle: function (node) {
            var view = this.view;
            if (node.children) {
                node.hiddenChildren = node.children;
                delete node.children;
                view.update(node);
            } else {
                if (node.hiddenChildren) {
                    node.children = node.hiddenChildren;
                    delete node.hiddenChildren;
                    view.update(node);
                } else {
                    this.loadChildren(node, function (node) {
                        view.update(node);
                    });
                }
            }
        },

        loadChildren: function (node, callback) {
            var self = this;
            if (!node.children) {
                node.children = [];
            }
            d3.json(node.outgoing_relationships, function (json) {
                var count = json.length;
                json.forEach(function (outgoing) {
                    self.loadNode(outgoing.end, function (endNode) {
                        node.children.push(endNode);
                        count -= 1;
                        if (count === 0) {
                            node.childrenLoaded = true;
                            callback(node);
                        }
                    });
                });
            });
        }
    };
}());
