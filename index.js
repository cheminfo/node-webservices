#!/usr/bin/env node

'use strict';

var koa = require('koa');
var body = require('koa-body');
var cors = require('koa-cors');
var child_process = require('child_process');
var fs = require('mz/fs');
var nativeFs = require('fs');
var pathLib = require('path');
var pkg = require('./package.json');

var program = require('commander');
program
    .version(pkg.version)
    .option('-d --directory [path]', 'Service directory')
    .option('-p --port [port]', 'HTTP port')
    .option('-c --config [path]', 'Config file')
    .parse(process.argv);

var config = {
    directory: './examples',
    port: 8080
};
if (program.config) {
    try {
        config = require(pathLib.resolve(program.config));
    } catch (e) {
        console.error('Could not parse config file');
        console.error(e);
        process.exit(1);
    }
}

if (program.directory) config.directory = program.directory;
if (program.port) config.port = parseInt(program.port);

var app = koa();

var services_dir = config.directory;

var loaded_services = {};
var pending_messages = {};

var options = {
        origin:true,
        credentials:true,
        expose:true
}

app.use(cors(options));

app.use(body());

app.use(function*() {

    var path = this.path.split('/');
    var service = path[1];

    if (service) {

        if (service === '_reload') {
            if (path[2]) {
                var srv = loaded_services[path[2]];
                if (srv) {
                    srv.kill();
                    delete loaded_services[path[2]];
                    return this.body = 'Service ' + path[2] + ' reloaded';
                } else {
                    this.throw(400, 'Service ' + path[2] + ' not loaded.');
                }
            } else {
                for (var i in loaded_services) {
                    loaded_services[i].kill();
                    delete loaded_services[i];
                }
                return this.body = 'All services reloaded';
            }
        }

        var serviceInstance = loaded_services[service];

        if (!serviceInstance) {

            var thePath = pathLib.join(services_dir, service);
            if (yield fs.exists(thePath + '/index.js')) {
                serviceInstance = prepareService(thePath, service);
            } else {
                this.throw(404, 'Service ' + service + ' not found.');
            }

        }

        var id = newId();
        var prom = new Promise(function (resolve, reject) {

            pending_messages[id] = {
                id: id,
                resolve: resolve,
                reject: reject
            };

        });

        var host = 'http://' + (this.get('X-Forwarded-Host') || this.host) + '/';

        serviceInstance.send({
            id: id,
            message: {
                url: host + service + '/',
                path: path.slice(2),
                query: this.query,
                body: this.request.body,
                cookie: this.request.header.cookie
            }
        });

        var result;

        try {
            result = yield prom;
            if (typeof result === 'string') {
                this.body = result;
            } else if (result) {
                if (result.content) {
                    this.body = result.content;
                } else if (result.file) {
                    this.body = nativeFs.createReadStream(result.file);
                } else {
                    this.body = 'Missing content.\nIf the result is an object, wrap it like this:\n\nresolve({content: result});';
                    this.status = 500;
                    return;
                }
                if (result.contenttype || result.mimetype) {
                    this.set('Content-Type', result.contenttype || result.mimetype);
                }
                if (result.filename) {
                    this.set('Content-Disposition', 'attachment; filename="' + result.filename + '"');
                }
                if (result.status) {
                    this.status = result.status;
                }
                if (result.headers) {
                    for (var j in result.headers) {
                        this.set(j, result.headers[j]);
                    }
                }
            }
        } catch (e) {
            this.status = 500;
            this.body = 'INTERNAL SERVER ERROR\n\n' + e.message;
        }

    } else {
        this.body = 'Welcome to this webservices endpoint.'
    }

});

app.listen(config.port || 3000);

function prepareService(thePath, name) {

    var serviceInstance = child_process.fork(pathLib.join(__dirname, 'service.js'), {
        env: {
            WEBSERVICE_DIR: pathLib.resolve(thePath)
        }
    });

    loaded_services[name] = serviceInstance;

    serviceInstance.on('message', handleMessage);
    serviceInstance.on('exit', function () {
        loaded_services[name] = null;
    });

    return serviceInstance;
}

function handleMessage(message) {
    if (message.id && pending_messages[message.id]) {
        if (message.hasOwnProperty('value')) {
            pending_messages[message.id].resolve(message.value);
        } else {
            pending_messages[message.id].reject(Error(message.error));
        }

        delete pending_messages[message.id];
    }
}

function newId() {
    return Date.now() + '_' + Math.floor(Math.random() * 100000);
}
