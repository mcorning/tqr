// @ts-check
console.clear();
//#region Setup
// @ts-ignore
require('clarify');
const ae = require('./redis/ae');
const path = require('path');
const express = require('express');
// @ts-ignore
const socketIO = require('socket.io');
const serveStatic = require('serve-static');

const PORT = process.env.PORT || 3333;
const dirPath = path.join(__dirname, '../dist');

const {
  onAddPromo,
  onGetPromos,

  addSponsor,
  addReward,
  deleteStream,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
} = require('./tqr');

const { error, success, jLog, log, notice } = require('./utils/helpers');

/* This is the express server that is listening on port 3333. */
const server = express()
  .use(serveStatic(dirPath))
  .use('*', (req, res) => res.sendFile(`${dirPath}/index.html`))
  .listen(PORT, () => {
    console.groupCollapsed('express');
    log('Listening on:');
    success(`http://localhost:${PORT}`);
    log();
    console.groupEnd();
  });
const io = socketIO(server);
//#endregion Setup

//#region Helpers
const safeAck = (ack, data) => {
  if (ack) {
    ack(data);
  }
};
/**
 * Create a new user ID and add it to the Redis database.
 * @param { Array } args - the Connection data for Redis Stream
 * @param {Object} socket - the socket that is connecting to the server
 * @returns  Promise by emitting a newConnection message that now includes the stream ID for the user
 * <br/>NOTE: the Stream ID serves as the connection ID for socket.io
 */
const onAddConnection = (args, socket) => {
  // strip off any callback function to get properties for Redis
  const props = args.slice(0, -1);
  const ack = args.at(-1);
  const [country, nonce, lastDeliveredId] = props;
  jLog(props, 'props:');

  ae.addConnection(country, nonce)
    .then((id) => joinSocketRoom(socket, country, nonce, lastDeliveredId, id))
    .then((conn) => safeAck(ack, conn));
};

const joinSocketRoom = (socket, country, nonce, lastDeliveredId, userID) => {
  console.groupCollapsed('io.on(connection).joinSocketRoom()');
  const conn = {
    country,
    nonce,
    userID,
    lastDeliveredId,
    socketID: socket.id,
  };
  const tableData = [conn];
  console.table(tableData);

  // join the "userID" room
  // we send alerts using the userID stored in Redis stream
  socket.join(userID);
  // used in tqrHandshake event handler
  socket.userID = userID;
  socket.nonce = nonce;
  console.groupEnd();

  return conn;
};

// TODO be sure client can specify - + values
const onGetConnections = (args) => {
  jLog(args, 'onGetConnections().args:');
  const cmd = args[0];
  const ack = args[1];
  console.assert(
    typeof ack === 'function',
    'onGetConnections(args) lacks a callback'
  );
  ae.getConnections(cmd).then((conns) => {
    if (ack) {
      ack(conns);
    }
  });
};

const onTest = (args) => {
  const [msg, ack] = args;
  console.log(msg);
  if (ack) {
    ack('tested');
  }
};

const onGetCountries = ae.getCountries().then((x) => {
  console.log(x);
  return x;
});
//#endregion Helpers

/** io.on('connection')
 * A socket auth may have a userID. If not, we need to add a connection to the Redis Stream.
 */
io.on('connection', (socket) => {
  notice(`About to handle on('connection') for ${socket.handshake.auth.nonce}`);

  socket.onAny((event, ...args) => {
    jLog(args, event);

    const methods = {
      addConnection: onAddConnection,
      getConnections: onGetConnections,
      test: onTest,
      addPromo: onAddPromo,
    };

    methods[event](args, socket);
  });
  //#endregion
});
