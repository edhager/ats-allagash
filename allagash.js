/*global console, require, __dirname*/
(function () {
    "use strict";

    function replaceTokens(str, tokens) {
        tokens.forEach(function (token) {
            str = str.replace(new RegExp('%' + token.key + '%', 'g'), token.value);
        });
        return str;
    }

    function buildNodeData(res, errorFn, nodeId, params) {
        var fs = require('fs'),
            filename = __dirname + '/web/mocks/' + nodeId + '.json',
            nodeData;

        fs.readFile(filename, 'utf8', function (err, data) {
            var key;

            if (err) {
                errorFn({ status: 500, message: 'Could not read mock node data: ' + nodeId});
            } else {
                nodeData = JSON.parse(data);

                params.forEach(function (param) {
                    if (nodeData) {
                        nodeData = nodeData['_' + param];
                    }
                });

                if (nodeData) {
                    if (typeof nodeData === 'object') {
                        for (key in nodeData) {
                            if (nodeData.hasOwnProperty(key)) {
                                if (key.charAt(0) === '_') {
                                    delete nodeData[key];
                                }
                            }
                        }
                    }

                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.write(JSON.stringify(nodeData));
                    res.end();
                } else {
                    errorFn({ status: 500, message: 'Could not read mock node data: ' + params.join('/')});
                }
            }
        });
    }

    function buildMock(res, path, errorFn) {
        var parts = path.substring(1).split('/'),
            nodeId;

        if (parts[0] === 'db' && parts[1] === 'data' && parts[2] === 'node') {
            buildNodeData(res, errorFn, parts[3], parts.slice(4));

        } else {
            errorFn({ status: 500, message: 'Not a valid mock data url.'});
        }
    }

    function mocksConfigured() {
        var useMocks;
        process.argv.some(function (val) {
            if (val === 'useMocks') {
                useMocks = true;
                return true;
            }
        });
        return useMocks;
    }

    function initServer() {
        var send = require('send'),
            http = require('http'),
            httpProxy = require('http-proxy'),
            url = require('url'),
            staticRoot = __dirname + '/web',
            port = 8080,
            useMocks = mocksConfigured(),
            proxy = new httpProxy.RoutingProxy();

        http.createServer(function (req, res) {
            var path;

            function error(err) {
                res.statusCode = err.status || 500;
                res.end(res.statusCode + ' : ' + err.message);
            }

            path = url.parse(req.url).pathname;
            if (path.indexOf('/db') === 0) {
                if (useMocks) {
                    console.log('Processing mock request: ' + path);
                    buildMock(res, path, error);
                } else {
                    console.log('Processing data request: ' + path);
                    proxy.proxyRequest(req, res, {
                        host: 'localhost',
                        port: 7474
                    });
                }
            } else {
                send(req, url.parse(req.url).pathname)
                    .root(staticRoot)
                    .on('error', error)
                    .pipe(res);
            }
        }).listen(port);

        console.log('Allagash at http://localhost:' + port);
    }

    initServer();

}());
