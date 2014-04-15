var port = process.env.PORT || 10000;
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
        port: port
    });

var counters = {};
counters['peer'] = 0;
counters['server'] = 0;

var stats = [];
var STATS_TIME_INTERVAL = 10 * 1000; // 10 seconds

var REASON_INIT_BUFFER = 'INIT_BUFFER',
    REASON_RESPONSIBLE = 'RESPONSIBLE',
    REASON_FALLBACK = 'FALLBACK',
    REASON_NO_PEERS = 'NO_PEERS';

/* Boilerplate */
function containsKey(obj, key) {
    return typeof obj[key] !== 'undefined';
};

var onRegistration = function(message) {
    console.log(message.id + " connected");
};

var onStats = function(message) {
    counters[message.source]++;
    var now = Date.now();
    // Adds to stash array
    stats.push({
        source: message.source,
        time: now
    });
    // Remove old stats
    while (stats.length > 0) {
        var s = stats.shift();
        if (now - s.time > STATS_TIME_INTERVAL) {
            counters[s.source]--;
        } else {
            stats.unshift(s);
            break;
        }
    }
    var cs = counters['server'];
    var cp = counters['peer'];
    console.log("--- Stats for the last %s seconds ---", STATS_TIME_INTERVAL / 1000);
    console.log("From Peers:  %s % (%s)", (cp / (cp + cs) * 100).toFixed(), cp);
    console.log("From Server: %s % (%s)", (cs / (cp + cs) * 100).toFixed(), cs);
};

var onPing = function() {
    console.log("Received ping message");
};

var cases = {
    'registration': onRegistration,
    'stats': onStats,
    'ping': onPing
};

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        try {
            message = JSON.parse(message);
            if (containsKey(cases, message.type)) {
                cases[message.type](message);
            } else {
                console.log('Received unexpected message: %s', message);
            };
        } catch (error) {
            console.log('Received a message which was not JSON encoded: %s, error: %s', message, error);
        }
    });
});

console.log("Stats server listening for WebSocket connections on port " + port);
