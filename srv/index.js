console.clear();
//#region Setup
require('clarify');

const path = require('path');
const express = require('express');
const socketIO = require('socket.io');
const serveStatic = require('serve-static');

const PORT = process.env.PORT || 3333;
const dirPath = path.join(__dirname, '../dist');

const {
  addConnection,
  addOutlet,
  addSponsor,
  addPromo,
  addReward,
  deleteStream,
  getCountries,
  getLoyalists,
  getPromos,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
} = require('./redis/tqr');

const { entryFromStream } = require('./utils/utils');
const { error, success, jLog, log, formatTime } = require('./utils/helpers');
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
/**
 * Create a new user ID and add it to the database.
 * @param socket - the socket that is connecting to the server
 * @param country - the country of the Principal
 * @param nonce - any locally unique value;  e.g., a business license or address
 */
// CALLED BY: initConnection()
// RETURNS: an event that now includes the stream ID for the user
// NOTE: the Stream ID serves as the connection ID for socket.io
const newConnection = (socket, { country, nonce }) => {
  console.log({ country, nonce });
  addConnection(country, nonce).then((id) => {
    // emit new session details so the client can store the session in localStorage
    socket.emit('newUserID', {
      country,
      nonce,
      userID: id,
      lastDeliveredId: '$',
    });
  });
};
const finishConnection = (socket, nonce, lastDeliveredId, userID) => {
  const tableData = [
    {
      nonce,
      socketID: socket.id,
      userID,
      lastDeliveredId,
    },
  ];
  console.table(tableData);

  console.groupCollapsed('io.on(connection)');

  // join the "userID" room
  // we send alerts using the userID stored in Redis stream
  socket.join(userID);
  // used in tqrHandshake event handler
  socket.userID = userID;
  console.groupEnd();

  return tableData;
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
const initConnection = (socket) => {
  // auth can be a complex object modeling a Food Chain, Outlets, and Promotions
  const { auth } = socket.handshake;
  const { country, nonce, userID, lastDeliveredId = '$' } = auth;
  if (!userID && country && nonce) {
    addConnection(country, nonce)
      .then((id) => finishConnection(socket, nonce, lastDeliveredId, id))
      .then((tableDate) => socket.emit('newConnection', tableDate));
    return;
  }
  finishConnection(socket, nonce, lastDeliveredId, userID);
};

const safeAck = (ack, payload) => {
  if (ack) {
    ack(payload);
  }
};

const addChain = (socket, node) => {
  if (node) {
    newConnection(socket, auth[node]);
    return;
  }
  if (Array.isArray(auth)) {
    auth.forEach((connection) => {
      newConnection(socket, connection);
    });
  }
};
//#endregion Helpers

/* The above code is sending a request to the server to get the list of countries. */
io.on('connection', (socket) => {
  log(formatTime());
  //#region Handling socket connection
  initConnection(socket);

  socket.on('addOutlet', ({ country, key }) => {
    addConnection(country, key)
      .then((id) => addOutlet(key, id))
      .then((id) => socket.emit('newOutlet', id))
      .catch((e) => error('e :>> ', e));
  });
  //#endregion
});
