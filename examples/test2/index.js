// This example uses a Promise
exports.run = function (message) {
    return new Promise(function (resolve, reject) {
        function resolver() {
            resolve(
                {
                    content: {
                        message: 'I am another fork. Here is a random number for you:',
                        number: Math.random()
                    },
                    headers: {
                        'X-Custom-Header': 'YEAH'
                    }
                });
        }
        setTimeout(resolver, 500);
    });
};
