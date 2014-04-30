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
    REASON_NO_PEERS = 'NO_PEERS',
    REASON_LOW_BUFFER = 'LOW_BUFFER';

var reasonCounters = {};
reasonCounters[REASON_INIT_BUFFER] = 0;
reasonCounters[REASON_RESPONSIBLE] = 0;
reasonCounters[REASON_FALLBACK] = 0;
reasonCounters[REASON_NO_PEERS] = 0;
reasonCounters[REASON_LOW_BUFFER] = 0;

var noData = [];

var REASON_NO_DATA_NO_DECISION_YET = 'NO_DECISION_YET',
    REASON_NO_DATA_OTHER_BITRATE = 'OTHER_BITRATE',
    REASON_NO_DATA_NOT_RESPONSIBLE = 'NOT_RESPONSIBLE',
    REASON_NO_DATA_PAUSED = 'PAUSED',
    REASON_NO_DATA_NOT_STARTED = 'NOT_STARTED',
    REASON_NO_DATA_INIT_BUFFER = 'INIT_BUFFER',
    REASON_NO_DATA_NOT_YET_DOWNLOADED = 'NOT_YET_DOWNLOADED';

var noDataReasonCounters = {};
noDataReasonCounters[REASON_NO_DATA_NO_DECISION_YET] = 0;
noDataReasonCounters[REASON_NO_DATA_OTHER_BITRATE] = 0;
noDataReasonCounters[REASON_NO_DATA_NOT_RESPONSIBLE] = 0;
noDataReasonCounters[REASON_NO_DATA_PAUSED] = 0;
noDataReasonCounters[REASON_NO_DATA_NOT_STARTED] = 0;
noDataReasonCounters[REASON_NO_DATA_INIT_BUFFER] = 0;
noDataReasonCounters[REASON_NO_DATA_NOT_YET_DOWNLOADED] = 0;

dryBufferCounters = {};
dryBufferCounters['video'] = 0;
dryBufferCounters['audio'] = 0;
var dryBufferStats = [];

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
    printStats();
};

var onNoData = function(message) {
    noDataReasonCounters[message.reason]++;
    var now = Date.now();
    // Adds to stash array
    noData.push({
        reason: message.reason,
        time: now
    });
    // Remove old noData
    while (noData.length > 0) {
        var nd = noData.shift();
        if (now - nd.time > STATS_TIME_INTERVAL) {
            noDataReasonCounters[nd.reason]--;
        } else {
            noData.unshift(nd);
            break;
        }
    }
    printStats();
};

var onDryBuffer = function(message) {
    dryBufferCounters[message.media]++;
    var now = Date.now();
    // Adds to stash array
    dryBufferStats.push({
        time: now,
        media: message.media
    });
    // Remove old stats
    while (dryBufferStats.length > 0) {
        var s = dryBufferStats.shift();
        if (now - s.time > STATS_TIME_INTERVAL) {
            dryBufferCounters[s.media]--;
        } else {
            dryBufferStats.unshift(s);
            break;
        }
    }
    printStats();
};

var onPing = function() {
    // console.log("Received ping message");
};

var cases = {
    'registration': onRegistration,
    'stats': onStats,
    'ping': onPing,
    'dry-buffer': onDryBuffer,
    'no-data': onNoData
};

var printStats = function() {
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
    console.log("REASON_LOW_BUFFER:  %s", reasonCounters[REASON_LOW_BUFFER]);

    console.log("--- Dry buffer stats ---");
    console.log("Dry video buffer: " + dryBufferCounters['video']);
    console.log("Dry audio buffer: " + dryBufferCounters['audio']);

    console.log("--- Reasons for no data ---");
    console.log("REASON_NO_DATA_NO_DECISION_YET: %s", noDataReasonCounters[REASON_NO_DATA_NO_DECISION_YET]);
    console.log("REASON_NO_DATA_OTHER_BITRATE: %s", noDataReasonCounters[REASON_NO_DATA_OTHER_BITRATE]);
    console.log("REASON_NO_DATA_NOT_RESPONSIBLE: %s", noDataReasonCounters[REASON_NO_DATA_NOT_RESPONSIBLE]);
    console.log("REASON_NO_DATA_PAUSED: %s", noDataReasonCounters[REASON_NO_DATA_PAUSED]);
    console.log("REASON_NO_DATA_NOT_STARTED: %s", noDataReasonCounters[REASON_NO_DATA_NOT_STARTED]);
    console.log("REASON_NO_DATA_INIT_BUFFER: %s", noDataReasonCounters[REASON_NO_DATA_INIT_BUFFER]);
    console.log("REASON_NO_DATA_NOT_YET_DOWNLOADED: %s", noDataReasonCounters[REASON_NO_DATA_NOT_YET_DOWNLOADED]);

    console.log(); // New line
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
