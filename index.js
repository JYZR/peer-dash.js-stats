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

var reasonCounters = {};
reasonCounters[REASON_INIT_BUFFER] = 0;
reasonCounters[REASON_RESPONSIBLE] = 0;
reasonCounters[REASON_FALLBACK] = 0;
reasonCounters[REASON_NO_PEERS] = 0;


/* Boilerplate */
function containsKey(obj, key) {
    return typeof obj[key] !== 'undefined';
}

var onRegistration = function(message) {
    console.log(message.id + " connected");
};

var onStats = function(message) {
    counters[message.source]++;
    reasonCounters[message.reason]++;
    var now = Date.now();
    // Adds to stash array
    stats.push({
        source: message.source,
        reason: message.reason,
        time: now
    });
    // Remove old stats
    while (stats.length > 0) {
        var s = stats.shift();
        if (now - s.time > STATS_TIME_INTERVAL) {
            counters[s.source]--;
            reasonCounters[s.reason]--;
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

    console.log("--- Reasons for fetching from server ---");
    console.log("REASON_INIT_BUFFER: %s", reasonCounters[REASON_INIT_BUFFER]);
    console.log("REASON_RESPONSIBLE: %s", reasonCounters[REASON_RESPONSIBLE]);
    console.log("REASON_FALLBACK:    %s", reasonCounters[REASON_FALLBACK]);
    console.log("REASON_NO_PEERS:    %s", reasonCounters[REASON_NO_PEERS]);
};

var onPing = function() {
    // console.log("Received ping message");
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
            }
        } catch (error) {
            console.log('Received a message which was not JSON encoded: %s, error: %s', message, error);
        }
    });
});

console.log("Stats server listening for WebSocket connections on port " + port);
