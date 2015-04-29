var service = require(process.env.WEBSERVICE_DIR);
var co = require('co');

var running = new Set();

process.on('uncaughtException', function (err) {
    for (var message of running) {
        process.send({
            id: message.id,
            error: err ? (err.message ? err.message : err) : 'Unknown error'
        });
    }
    console.error(err.stack);
    running.clear();
});

var handle = co.wrap(function*(message){
    yield init();
    return yield service.run(message.message);
});

process.on('message', function (message) {
    running.add(message);
    handle(message).then(function (result) {
        if (running.has(message)) {
            running.delete(message);
            process.send({
                id: message.id,
                value: result
            });
        }
    }, function (e) {
        if (running.has(message)) {
            running.delete(message);
            process.send({
                id: message.id,
                error: e ? (e.message ? e.message : e) : 'Unknown error'
            });
        }
    });
});

var ready = false;
function*init() {
    if(ready) {
        return;
    }
    if(service.init && typeof service.init === 'function') {
        yield service.init();
    }
    ready = true;
}
