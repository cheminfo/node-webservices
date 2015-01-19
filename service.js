var service = require(process.env.WEBSERVICE_DIR);
var co = require('co');

var handle = co.wrap(function*(message){
    yield init();
    return yield service.run(message.message);
});

process.on('message', function (message) {
    handle(message).then(function (result) {
        process.send({
            id: message.id,
            value: result
        });
    }, function (e) {
        process.send({
            id: message.id,
            error: e ? (e.message ? e.message : e) : 'Unknown error'
        });
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
