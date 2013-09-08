var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs');

io.configure(function(){
      io.set('transports', ['xhr-polling']);
});


function handler (req, res) {
      fs.readFile(__dirname + '/index.html',
        function (err, data) {
                if (err) {
                          res.writeHead(500);
                                return res.end('Error loading index.html');
                                    }

                                        res.writeHead(200);
                                            res.end(data);
                                              });
}


var players = [],
    updateInterval = 800,
    commands = {
        READY: 'ready'
    },
    readyCount = 0;

app.listen(7000);

io.sockets.on('connection', function (socket) {
    socket.emit('welcome', {msg: 'Hi, there! Welcome.', id: socket.id});

    socket.on('disconnect', function () {
        socket.broadcast.emit('remove-player', {
            name: socket.data.name,
            id: socket.data.id
        });

        for (var i = 0; len = players.length; i++) {
            if (players[i] === socket) {
                players.splice(i, 1);
                return;
            }
        }
    });
    socket.on('msg', function (msg) {
        if (commands[msg ? msg.toUpperCase() : '']) {
            // we got a predefined command
            if (msg === commands.READY) {
                console.log(readyCount, players.length);
                if (++readyCount === players.length) {
                    resolveLevel();
                }
            }
            return;
        }

        socket.broadcast.emit('msg', '<b>' + socket.data.name + '</b>: ' + msg);
        var num = parseInt(msg, 10);
        if (num === targetNum) {
            win(socket);
        }
    });
    
    socket.on('set-data', function (data) {
        socket.data =  data;
        socket.emit('insert-players', players.map(function (p) {
            return p.data;
        }));
        
        // save player in list
        players.push(socket);
        if (players.length === 2) {
            startNewGame();
        }

        socket.broadcast.emit('insert-player', data);
    });
    
    socket.on('update-data', function (data) {
        if (!socket.data) return;
        delete data.id;
        _.extend(socket.data, data);
    });
});

function startNewGame () {
    level = 1;
    reset();
    startLevel();
}

var targetNum = 0,
    level = 0,
    currentLevelData = null,
    levelTimeout,
    levelTime = 10000;

function startLevel () {
    currentLevelData = generateLevel();
    io.sockets.emit('level-start', {
        level: level,
        data: currentLevelData.splits
    });
    levelTimeout = setTimeout(endLevel, levelTime);
}

function endLevel () {
    resolveLevel();
    //reset();
    //startLevel();
}

function resolveLevel () {
    players.forEach(function (socket) {
        socket.emit('level-end', {won: 0, fall: currentLevelData.fall});
    });
}


function generateLevel (c) {
    var num_splits = 1 + ~~(Math.random() * 2),
        splits = Array.apply(null, new Array(num_splits)).map(function (i, j) {
            return (j + 1) * (1/(num_splits + 1));
        });
    return {
        fall: [~~(Math.random() * (num_splits + 1))],
        splits: splits
    };
}

function reset () {
    if (levelTimeout) {
        clearTimeout(levelTimeout);
        levelTimeout = null;
    }
    readyCount = 0;
}

function win (socket) {
    socket.emit('msg', 'YOU WIN!!');
    socket.broadcast.emit('msg', 'Badluck, <b>' + socket.data.name + ' </b> won.');
    level++;
    endLevel();
}

function sendUpdates () {
    players.forEach(function (socket) {
        socket.emit('update-players', players.map(function (p) {
            return p.data;
        }));
    });
}

setInterval(sendUpdates, updateInterval);

_ = {};
_.extend = function (obj) {
    [].slice.call(arguments, 1).forEach (function (source) {
        if (source) {
            for (var prop in source) {
                obj[prop] = source[prop];
            }
        }
    });
    return obj;
};
