var http = require('http');
var fs = require('fs');
var Eureca = require('eureca.io');


//assuming you want to use a third party static server like node-static, to server your static content.
var static = require('node-static');

var fileServer = new static.Server(__dirname);

var server = http.createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    }).resume();
});
    
    
  

var eurecaServer = new Eureca.Server();

eurecaServer.attach(server);

//functions under "exports" namespace will
//be exposed to client side
eurecaServer.exports.hello = function () {
    console.log('Hello from client');
}

console.log('\033[96mlistening on localhost:8000 \033[39m');
server.listen(8000);