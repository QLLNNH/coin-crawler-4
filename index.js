'use strict';
const log = require('./lib/log');
const app = require('express')();
const http = require('http').Server(app);
const { port } = require('./config');
const aggregator = new (require('./lib/aggregator'))(require('socket.io')(http));

app.get('/binance', (req, res) => res.sendFile(__dirname + '/public/index.html'));

http.listen(port, () => log.info(`listening on ${port}`));