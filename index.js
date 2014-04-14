var port = process.env.PORT || 10000;
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
        port: port
    });

var fromPeers = 0;
var fromServer = 0;

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        switch (message.type) {
            case 'registration':
                console.log(message.id + " connected");
                break;
            case 'stats':
                if (message.source == 'server')
                    fromServer++;
                else if (message.source == 'peer')
                    fromPeers++;
                console.log("From Peers:  %s % (%s)", (fromPeers / (fromPeers + fromServer) * 100).toFixed(), fromPeers);
                console.log("From Server: %s % (%s)", (fromServer / (fromPeers + fromServer) * 100).toFixed(), fromServer);
                break;
            case 'ping':
                console.log("Received ping message");
                break;
            default:
                console.log('Received unexpected message: %s', message);
                break;
        }
    });
});
