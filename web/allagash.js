/*global d3*/
var Allagash = (function () {
    "use strict";

    var isLoading,
        loadSpinner,
        loadSpinnerTimeout;

    function showLoadSpinner() {
        if (!loadSpinnerTimeout) {
            loadSpinnerTimeout = setTimeout(function () {
                loadSpinner.classList.remove('hidden');
                loadSpinnerTimeout = null;
            }, 500);
        }
    }

    function hideLoadSpinner() {
        if (loadSpinnerTimeout) {
            clearTimeout(loadSpinnerTimeout);
            loadSpinnerTimeout = null;
        } else {
            loadSpinner.classList.add('hidden');
        }
    }

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
            var self = this, m = this.graphMargins, dispatch,
                graph;
            this.view = view;
            isLoading = false;
            loadSpinner = document.querySelector('img.spinner');

            // clean up old vis
            graph = document.getElementById('graph');
            while (graph.lastChild) {
                graph.removeChild(graph.lastChild);
            }

            dispatch = d3.dispatch('loadChildren');
            dispatch.on('loadChildren', this.loadChildren.bind(this));

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
                        node.name = (labels[0] + ': ' +
                                     self.nameFormatters[labels[0]](data)).toLowerCase();
                        callback(node);
                    });
                }
            });
        },

        loadChildren: function (node, callback, relation) {
            var self = this;
            if (node.childrenLoaded) {
                callback(node);
                return;
            }
            if (isLoading) {
                return;
            }
            isLoading = true;
            showLoadSpinner();
            d3.json(node[relation] || node.outgoing_relationships, function (json) {
                var count = json.length;
                if (!count) {
                    isLoading = false;
                    hideLoadSpinner();
                    node.childrenLoaded = true;
                    callback(node);
                } else {
                    json.forEach(function (relationship) {
                        self.loadNode(relationship.end, function (endNode) {
                            if (!node.children) {
                                node.children = [];
                            }
                            node.children.push(endNode);
                            count--;
                            if (count === 0) {
                                isLoading = false;
                                hideLoadSpinner();
                                node.childrenLoaded = true;
                                callback(node);
                            }
                        });
                    });
                }
            });
        }
    };
}());
