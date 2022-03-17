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

const { entryFromStream, randomId, url } = require('./utils/utils');
const { success, jLog, log, formatTime } = require('./utils/helpers');
const { debug } = require('console');

const server = express()
  .use(serveStatic(dirPath))
  .use('*', (req, res) => res.sendFile(`${dirPath}/index.html`))
  .listen(PORT, () => {
    console.groupCollapsed('express');
    log('Listening on:');
    log(url(`http://localhost:${PORT}`));
    log();
    console.groupEnd();
  });
const io = socketIO(server);

const newConnection = (socket, { country, nonce }) => {
  addConnection(country, nonce).then((id) => {
    const newUserID = id;
    log(newUserID);
    // emit new session details so the client can store the session in localStorage
    socket.emit('newUserID', {
      country,
      nonce,
      userID: id,
      lastDeliveredId: '$',
    });
  });
};
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

  let newUserID = userID;
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
  socket.join(newUserID);
  // used in tqrHandshake event handler
  socket.userID = newUserID;

  console.groupEnd();
};

io.on('connection', (socket) => {
  log(formatTime());
  //#region Handling socket connection
  initConnection(socket);
  socket.emit('connected');

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
