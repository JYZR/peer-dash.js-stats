var port = process.env.PORT || 10000;
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
        port: port
    });

var fromPeers = 0;
var fromServer = 0;

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        if (message == 'PEER' || message == 'SERVER') {
            if (message == 'PEER')
                fromPeers++;
            else if (message == 'SERVER')
                fromServer++;
            console.log("From Peers:  %s % (%s)", (fromPeers / (fromPeers + fromServer) * 100).toFixed(), fromPeers);
            console.log("From Server: %s % (%s)", (fromServer / (fromPeers + fromServer) * 100).toFixed(), fromServer);
        } else {
            console.log('Received message: %s', message);
        }
    });
});
