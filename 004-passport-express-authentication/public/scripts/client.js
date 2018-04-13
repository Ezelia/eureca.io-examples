var authToken = document.getElementById('eiohash').value;
var clientBtn = document.getElementById('clientBtn');
var clientInfo = document.getElementById('clientInfo');

clientBtn.addEventListener('click', function() {
    clientBtn.className='hidden';
    clientInfo.className='';

    client.serverProxy.hello();
});

var client = new Eureca.Client({
    transport: 'engine.io'
});


client.ready(function (serverProxy) {
    console.log('client ready to call server');
    clientBtn.className='';    
});

client.exports.hello = function () {
    
    clientInfo.className='hidden';
    clientBtn.className='';    

    alert('Hello from server ');
}

client.on('stateChange', (state) => {
    console.log(' [info] State changed ', state);
});

client.on('connect', () => {
    console.log('Connected ... authenticating');

    client.authenticate(authToken);
    
});
