var http = require('http');
var fs = require('fs');

var server = http.createServer();

var Eureca = require('../../');

var eurecaServer = new Eureca.Server({transport:'webrtc', allow:['hello', 'sub']});

eurecaServer.attach(server);



//functions under "exports" namespace will
//be exposed to client side
eurecaServer.exports.hello = function () {
    var client = eurecaServer.getClient(this.connection.id);
    client.hello();
    console.log('Hello from client');
	return ('hello return');
}
eurecaServer.exports.hello.onCall = function(conn)
{
    console.log('Client called hello', conn.id);
}


eurecaServer.onConnect(function (conn) {
    
    console.log('new Client **');
    var client = conn.clientProxy;
    

    
    client.sub(10, 4).then(function (r) {
        console.log('> 10 - 4 = ', r);
    });
    
});

eurecaServer.on('stateChange', (state) => {
    console.log(' [info] State changed ', state);
});


server.on('request', function (request, response) {
    var i;
    
    if (request.method === 'GET') {
        
        if (request.url.split('?')[0] === '/') {
            var filename = __dirname + '/index.html';
            fs.readFile(filename, function (err, data) {
                var text = data.toString();
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.write(text);
                response.end();
            });
        }
    }

});


console.log('\033[96mlistening on localhost:8000 \033[39m');
server.listen(8000);
