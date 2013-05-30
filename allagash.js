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

        if (parts[0] === 'mocks' && parts[1] === 'db' && parts[2] === 'data' && parts[3] === 'node') {
            buildNodeData(res, errorFn, parts[4], parts.slice(5));

        } else {
            errorFn({ status: 500, message: 'Not a valid mock data url.'});
        }
    }

    function initServer() {
        var send = require('send'),
            http = require('http'),
            url = require('url'),
            staticRoot = __dirname + '/web',
            port = 8080;

        http.createServer(function (req, res) {
            var path;

            function error(err) {
                res.statusCode = err.status || 500;
                res.end(res.statusCode + ' : ' + err.message);
            }

            path = url.parse(req.url).pathname;
            if (path.indexOf('/mocks') === 0) {
                console.log('Processing mock request: ' + path);
                buildMock(res, path, error);
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
