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
  getOutlets,
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
  console.groupCollapsed('io.on(connection)');
  const conn = {
    nonce,
    socketID: socket.id,
    userID,
    lastDeliveredId,
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
const initConnection = (socket) => {
  // auth can be a complex object modeling a Food Chain, Outlets, and Promotions
  const { auth } = socket.handshake;
  const { country, nonce, userID, lastDeliveredId = '$' } = auth;
  if (!userID && country && nonce) {
    addConnection(country, nonce)
      .then((id) => finishConnection(socket, nonce, lastDeliveredId, id))
      .then((newConnection) => socket.emit('newConnection', newConnection))
      .catch((e) =>
        error(`index.js: initConnection.addConnection 
    ${e.stack}
    ${e.cause}`)
      );
    return;
  }
  finishConnection(socket, nonce, lastDeliveredId, userID);
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

  addPromo({ key, name, promoUrl })
    .then((id) => socket.emit('newPromo', id))
    .catch((e) =>
      error(`index.js: onAddPromo())
       ${e.stack}
       ${e.cause}`)
    );
};

// TODO be sure client can specify - + values
const onGetOutlets = (socket, key, sid1, sid2) => {
  const startRange = sid1 ?? '-';
  const endRange = sid2 ?? '+';
  const cmd = [key, startRange, endRange];
  log(cmd, 'onGetOutlets().key');
  getOutlets(cmd).then((outlets) => {
    socket.emit('gotOutlets', outlets);
  });
};

const onGetPromos = (socket, key) => {
  const promoKey = `${key}${key.endsWith(':') ? 'promotions' : ':promotions'}`;
  console.log(promoKey);
  getPromos(promoKey).then((promos) => socket.emit('gotPromos', promos));
};

//#endregion Helpers

/* The above code is sending a request to the server to get the list of countries. */
io.on('connection', (socket) => {
  notice(`About to handle on('connection') for ${socket.handshake.auth.nonce}`);
  //#region Handling socket connection
  initConnection(socket);

  socket.on('addOutlet', ({ country, key }) =>
    onAddOutlet(socket, { country, key })
  );

  socket.on('addPromo', (promo) => onAddPromo(socket, promo));

  socket.on('getOutlets', (key) => onGetOutlets(socket, key));
  socket.on('getPromos', (key) => onGetPromos(socket, key));
  socket.on('getCountries', () =>
    getCountries().then((x) => {
      console.log(x);
      return x;
    })
  );
  //#endregion
});
