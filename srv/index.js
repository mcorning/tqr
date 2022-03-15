const { DateTime } = require('luxon');

const path = require('path');
const express = require('express');
const socketIO = require('socket.io');
const serveStatic = require('serve-static');

const PORT = process.env.PORT || 3333;
const dirPath = path.join(__dirname, '../dist');

const {
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
const { success } = require('./utils/helpers');

const server = express()
  .use(serveStatic(dirPath))
  .use('*', (req, res) => res.sendFile(`${dirPath}/index.html`))
  .listen(PORT, () => {
    console.groupCollapsed('express');
    console.log('Listening on:');
    console.log(url(`http://localhost:${PORT}`, '\n\n'));
    console.groupEnd();
  });
const io = socketIO(server);

const initConnection = (socket) => {
  const { sessionID, userID, username, usernumber, lastDeliveredId } =
    socket.handshake.auth;

  const data = [
    {
      socketID: socket.id,
      userID,
      username,
      usernumber,
      lastDeliveredId,
    },
  ];
  console.table(data);
  const newSessionID = sessionID || randomId(); // these values gets attached to the socket so the client knows which session has their data and messages
  const newUserID = userID || randomId();

  console.groupCollapsed('io.on(connection)');

  console.log(
    success(
      `${DateTime.now().toLocaleString(
        DateTime.DATETIME_SHORT
      )}: Client: ${newUserID} on socket id: ${socket.id}`
    )
  );

  if (!sessionID) {
    console.log('Returning session data to client', newSessionID, newUserID);

    // emit new session details so the client can store the session in localStorage
    socket.emit('newSession', {
      sessionID: newSessionID,
      userID: newUserID,
      username,
    });
  }

  // join the "userID" room
  // we send alerts using the userID stored in redisGraph for visitors
  socket.join(newUserID);
  // used in tqrHandshake event handler
  socket.userID = newUserID;

  // notify existing users (this is only important if use has opted in to ACT Private Messaging)
  socket.broadcast.emit('userConnected', {
    userID,
    username,
    connected: true,
  });

  console.groupEnd();
};

io.on('connection', (socket) => {
  //#region Handling socket connection
  initConnection(socket);
  socket.on('hi', (msg) => console.log(msg));
});
