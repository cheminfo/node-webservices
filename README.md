# node-webservices
Web server that can spawn services

## Installation

`$ npm install -g webservices`

## Usage

`node-webservices -d /usr/local/services/ -p 8080`

### Options

- `-d, --directory`: Directory where the services are located (default: ./services)
- `-p, --port`: HTTP port for the server (default: 8080)
- `-c, --config`: Optional JSON file where to find the config.

## Documentation

### Webservice development

Each folder located in `directory` is supposed to be a Node.js package. It must have an `index.js` entrypoint or a `package.json` file with a `main` property.  
For now, you have to `npm install` the eventual dependencies in each webservice directory.

The webservice module must implement a `run` method that returns a yieldable. Under the hood, [co](https://github.com/tj/co) is used so any type supported by co can be returned.  
The method will be called for each request to the webservice with a `message`.

The message has the following properties (example call : http://localhost/services/myservice/a/b?x=0):
 * `url`: URL of the webservice, as used by the client (http://localhost/services/myservice/)
 * `path`: Array of path elements starting after the service name (['a', 'b'])
 * `query`: Query string parsed as a map ({x: '0'})
 * `body`: If the request has a body, it will be in this property (parsed with [koa-body](https://www.npmjs.com/package/koa-body))

The service can return two kinds of data:
 * a string: Will be sent as is to the client with a 200 code.
 * an object with the following properties:
  * `content`: string or JSON, full response content
  * `file`: path to a file from which the response content must be read
  * `contenttype` or `mimetype`: sets the Content-Type header to this value
  * `filename`: sets a Content-Disposition header of type attachment with the provided filename
  * `status`: custom status code
  * `headers`: object with custom headers

The service can optionally implement an `init` method. It has to return a yieldable as well and will be executed once on the first request.

### Special paths

`/_reload`: Reload all services  
`/_reload/:serviceName`: Reload specific service

## License

  [MIT](./LICENSE)
