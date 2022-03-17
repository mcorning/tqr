console.clear();
require('clarify');

const path = require('path');
const express = require('express');
const socketIO = require('socket.io');
const serveStatic = require('serve-static');

const PORT = process.env.PORT || 3333;
const dirPath = path.join(__dirname, '../dist');

const {
  addConnection,
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
const { success, jLog, log, formatTime } = require('./utils/helpers');
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

/**
 * Create a new user ID and add it to the database.
 * @param socket - the socket that is connecting to the server
 * @param country - the country of the Principal
 * @param nonce - any locally unique value;  e.g., a business license or address
 */
const newConnection = (socket, { country, nonce }) => {
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

/**
 * When a new connection is made, we store the userID, socketID, and lastDeliveredId in Redis
 * @param socket - the socket object
 * @returns The socket.id
 */
const initConnection = (socket) => {
  const { auth } = socket.handshake;
  if (Array.isArray(auth)) {
    auth.forEach((connection) => {
      newConnection(socket, connection);
    });
    return;
  }

  const { country, nonce, userID, lastDeliveredId } = auth;
  if (!userID) {
    newConnection(socket, { country, nonce });
  }

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
};

/* The above code is sending a request to the server to get the list of countries. */
io.on('connection', (socket) => {
  log(formatTime());
  //#region Handling socket connection
  initConnection(socket);
  socket.emit('connected');

  /* Sending a request to the server to get the list of countries. */
  socket.on('getCountries', (_, ack) => {
    getCountries()
      .then((countries) => {
        if (ack) {
          jLog(countries.flat(), 'countries :>> ');
          ack(countries);
        }
      })
      .catch((e) => {
        console.log('e :>> ', e);
      });
  });
  //#endregion
});
