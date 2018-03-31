var Eureca = require('eureca.io');

var client = new Eureca.Client({ uri: 'ws://localhost:8000/' });

client.ready(function (proxy) {

    proxy.hello();

});
