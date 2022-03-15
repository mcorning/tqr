console.clear();
require('clarify');
const { DateTime } = require('luxon');

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
const { success, log } = require('./utils/helpers');
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

const initConnection = (socket) => {
  const { sessionID, userID, lastDeliveredId } = socket.handshake.auth;
  let newUserID = userID;
  const tableData = [
    {
      socketID: socket.id,
      sessionID,
      userID,
      lastDeliveredId,
    },
  ];
  console.table(tableData);

  console.groupCollapsed('io.on(connection)');

  if (!userID) {
    const newSessionID = randomId();
    addConnection('connections', 'sessionID', newSessionID).then((id) => {
      log(id);
      newUserID = id;
      // emit new session details so the client can store the session in localStorage
      socket.emit('newUserID', {
        userID: id,
        sessionID: newSessionID,
      });
    });
  }

  // join the "userID" room
  // we send alerts using the userID stored in redisGraph for visitors
  socket.join(newUserID);
  // used in tqrHandshake event handler
  socket.userID = newUserID;

  console.groupEnd();
};

io.on('connection', (socket) => {
  //#region Handling socket connection
  initConnection(socket);
  //#endregion
});
