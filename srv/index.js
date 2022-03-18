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
// const newConnection = (socket, { country, nonce }) => {
//   console.log({ country, nonce });
//   addConnection(country, nonce).then((id) => {
//     // emit new session details so the client can store the session in localStorage
//     socket.emit('newUserID', {
//       country,
//       nonce,
//       userID: id,
//       lastDeliveredId: '$',
//     });
//   });
// };
const finishConnection = (socket, nonce, lastDeliveredId, userID) => {
  const conn = {
    nonce,
    socketID: socket.id,
    userID,
    lastDeliveredId,
  };
  const tableData = [conn];
  console.table(tableData);

  console.groupCollapsed('io.on(connection)');

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
const initConnection = (socket) => {
  // auth can be a complex object modeling a Food Chain, Outlets, and Promotions
  const { auth } = socket.handshake;
  const { country, nonce, userID, lastDeliveredId = '$' } = auth;
  if (!userID && country && nonce) {
    addConnection(country, nonce)
      .then((id) => finishConnection(socket, nonce, lastDeliveredId, id))
      .then((newConnection) => socket.emit('newConnection', newConnection));
    return;
  }
  finishConnection(socket, nonce, lastDeliveredId, userID);
};

const safeAck = (ack, payload) => {
  if (ack) {
    ack(payload);
  }
};

//#endregion Helpers

/* The above code is sending a request to the server to get the list of countries. */
io.on('connection', (socket) => {
  log(formatTime());
  //#region Handling socket connection
  initConnection(socket);
  socket.emit('connected', { userID: socket.userID, nonce: socket.nonce });
  socket.on('addOutlet', ({ country, key }) => {
    addConnection(country, key)
      .then((id) => addOutlet(key, id))
      .then((id) => socket.emit('newOutlet', id))
      .catch((e) => error('e :>> ', e));
  });
  socket.on('addPromo', (promo) => {
    const { key, name, promoUrl } = promo;
    jLog(key, 'index on addPromo :>>');
    addPromo({ key, name, promoUrl })
      .then((id) => socket.emit('newPromo', id))
      .catch((e) => error('e :>> ', e));
  });
  //#endregion
});
