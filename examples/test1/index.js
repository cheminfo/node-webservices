/*

 Message is an object with the following structure :
 URL for the examples : /ab/c/d?x=24&y=12
 {
    host: Host name used by the client. You can use it to generate URLs
    path: Array of path elements. Example: ['ab', 'c', 'd']
    query: Query string hashmap. Example: { x:24, y:12 }
    body: Body of the request (JSON and Form data are supported)
 }

 */

// This example uses a generator function
exports.run = function*(message) {
    return 'I am a fork.\nYou accessed me using the following path: /' + message.path.join('/');
};

// If some asynchronous initialization is required
exports.init = function*() {
    yield asyncTask();
};

function asyncTask() {
    return Promise.resolve();
}
