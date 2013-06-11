/*global d3*/
var Allagash = (function () {
    "use strict";

    var isLoading,
        loadSpinner,
        loadSpinnerTimeout;

    // TODO move this to utils file.
    function qXhr(path) {
        var response = Q.defer(),
            request = new XMLHttpRequest();
        request.open("GET", path, true);
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    response.resolve(JSON.parse(request.responseText));
                } else {
                    response.reject("HTTP " + request.status + " for " + path);
                }   
            }
        };
        request.send('');
        return response.promise;
    }

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

    function getAdjacent(node, edges) {
        var edge = edges[0],
            urlParams,
            index,
            nodeId;
        urlParams = node.labels.split('/');
        index = urlParams.indexOf('node') + 1;
        if (index) {
            nodeId = urlParams[index];
            urlParams = edge.end.split('/');
            if (urlParams[urlParams.length - 1] === nodeId) {
                return 'start';
            }
        }
        return 'end';
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

            this.loadNode(this.firstRequest)
                .then(function (node) {
                    self.root = node;
                    view.initialize(node, {
                        graphDimensions: self.graphDimensions,
                        pathMargin: self.pathMargin,
                        graphMargins: m,
                        dispatch: dispatch
                    });
                }, function (reason) {
                    console.warn('request failed: ' + reason);
                });
        },

        loadNode: function (url) {
            var self = this,
                node;
            return qXhr(url)
                .then(function (value) {
                    node = value;
                    return qXhr(node.labels);
                })
                .then(function (labels) {
                    node.name = (labels[0] + ': ' +
                                 self.nameFormatters[labels[0]](node.data)).toLowerCase();
                    return node;
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

            qXhr(node[relation] || node.outgoing_relationships)
                .then(function (json) {
                    var count = json.length,
                    adjacent;
                    if (!count) {
                        isLoading = false;
                        hideLoadSpinner();
                        node.childrenLoaded = true;
                        callback(node);
                    } else {
                        adjacent = getAdjacent(node, json);
                        json.forEach(function (relationship) {
                            self.loadNode(relationship[adjacent])
                            .then(function (adjacentNode) {
                                if (!node.children) {
                                    node.children = [];
                                }
                                node.children.push(adjacentNode);
                                count--;
                                if (count === 0) {
                                    isLoading = false;
                                    hideLoadSpinner();
                                    node.childrenLoaded = true;
                                    callback(node);
                                }
                            }, function () {
                                console.warn('request failed: ' + reason);
                            });
                        });
                    }
                });
        }
    };
}());
