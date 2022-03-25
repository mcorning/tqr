// @ts-check
console.clear();
//#region Setup
// @ts-ignore
require('clarify');

const path = require('path');
const express = require('express');
// @ts-ignore
const socketIO = require('socket.io');
const serveStatic = require('serve-static');

const PORT = process.env.PORT || 3333;
const dirPath = path.join(__dirname, '../dist');

const {
  addConnection,
  addOutlet,
  getConnections,
  addPromo,
  getPromos,

  addSponsor,
  addReward,
  deleteStream,
  getCountries,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
} = require('./redis/tqr');

const { entryFromStream } = require('./utils/utils');
const { error, success, jLog, log, notice } = require('./utils/helpers');
const { debug } = require('console');

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
const safeAck = (ack, msg) => {
  if (ack) {
    ack(msg);
  }
};

/**
 * Create a new user ID and add it to the Redis database.
 * @param {Object} socket - the socket that is connecting to the server
 * @param { Object } connection - the Connection data for Redis Stream
 * @param { string } connection.country - country where entity exists
 * @param { string } connection.nonce - key value for Redis Stream
 * @param { string } connection.lastDeliveredId - ID used by Redis to query Stream
 * @returns {Promise} by emitting a newConnection message that now includes the stream ID for the user
 * <br/>NOTE: the Stream ID serves as the connection ID for socket.io
 * @see addOrFinishConnection()
 */
//
const onAddConnection = (socket, { country, nonce, lastDeliveredId }) =>
  addConnection(country, nonce)
    .then((id) => joinSocketRoom(socket, country, nonce, lastDeliveredId, id))
    .catch((e) =>
      error(`index.js: addOrFinishConnection.addConnection 
    ${e.stack}
    ${e.cause}`)
    );

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

/**
 * CALLED BY: io.on('connection')
 * HANDLING: socket.handshake.auth data structure
 * CALLS UPON: newConnection(socket, connection)
 *
 * When a new connection is made, we store the userID, socketID, and lastDeliveredId in Redis
 * @param socket - the socket object
 * @returns The socket.id
 */
const addOrFinishConnection = (socket) => {
  // auth can be a complex object modeling a Food Chain, Outlets, and Promotions
  const { auth } = socket.handshake;
  const { country, nonce, userID, lastDeliveredId = '$' } = auth;

  // only called during onboarding...
  if (!userID && country && nonce) {
    onAddConnection(socket, { country, nonce, lastDeliveredId });
    return;
  }
  // ...else finish connection
  joinSocketRoom(socket, nonce, lastDeliveredId, userID);
  socket.emit('connected', { userID: socket.userID, nonce: socket.nonce });
};

const onAddOutlet = (socket, { country, key }) => {
  // first make a separate connection entry for outlet for its SID
  addConnection(country, key)
    // then add the outlet data
    .then((id) => addOutlet(key, id))
    .then((id) => socket.emit('newOutlet', id))
    .catch((e) =>
      error(`index.js: connectOutlet.addConnection 
    ${e.stack}
    ${e.cause}`)
    );
};

const onAddPromo = (socket, promo) => {
  const { key, name, promoUrl } = promo;
  jLog(key, `index.js onOddPromo()) calling tqr.addPromo(${key})`);

  const id = addPromo({ key, name, promoUrl });
  socket.emit('newPromo', id);
};

// TODO be sure client can specify - + values
const onGetConnections = (socket, key, sid1, sid2) => {
  const cmd = [key, sid1, sid2];
  jLog(cmd, 'onGetConnections().cmd:');
  getConnections(cmd).then((conns) => {
    socket.emit('gotConnections', conns);
  });
};

const onGetPromos = (socket, key) => {
  const promoKey = `${key}${key.endsWith(':') ? 'promotions' : ':promotions'}`;
  console.log(promoKey);
  getPromos(promoKey).then((promos) => socket.emit('gotPromos', promos));
};

const onGetCountries = getCountries().then((x) => {
  console.log(x);
  return x;
});
//#endregion Helpers

/** io.on('connection')
 * A socket auth may have a userID. If not, we need to add a connection to the Redis Stream.
 */
io.on('connection', (socket) => {
  notice(`About to handle on('connection') for ${socket.handshake.auth.nonce}`);

  socket.on('addConnection', ({ country, nonce, lastDeliveredId }, ack) => {
    onAddConnection(socket, { country, nonce, lastDeliveredId })
      .then((x) => safeAck(ack, x))
      .catch((e) => e);
  });

  socket.on('getConnections', (key, sid1, sid2) =>
    onGetConnections(socket, key, sid1, sid2)
  );

  socket.on('test', (msg, ack) => {
    console.log(msg);
    if (ack) {
      ack('tested');
    }
  });

  //#endregion
});
