// @ts-check
//#region Setup
// @ts-ignore
const io = require('socket.io-client');
const socket = io.connect('http://localhost:3333', { autoConnect: false });

const {
  error,
  log,
  jLog,
  notice,
  success,
  showMap,
  table,
  clc,
} = require('../srv/utils/helpers');

const keyDelimiter = '@';

//#endregion Setup

//#region Helpers

// testing and clients start processing here.
const connectMe = () => Promise.resolve(socket.connect());

const onAddConnection = ({ country, nonce }) =>
  // TODO how do we handle an error in the Promise?
  new Promise((resolve) =>
    socket.emit('addConnection', country, nonce, (/** @type {any} */ newConn) =>
      resolve(newConn)
    )
  );

const onAddAnonConnection = (country) =>
  // TODO how do we handle an error in the Promise?
  new Promise((resolve) =>
    socket.emit('addConnection', country, (/** @type {any} */ newConn) =>
      resolve(newConn)
    )
  );

const onGetCountries = () =>
  new Promise((resolve) =>
    socket.emit('getCountries', (result) =>
      resolve([...new Set(result.flat())])
    )
  );

// called by tests/tests.js or by UI
const onGetConnections = (country, sid1 = '-', sid2 = '+') =>
  new Promise((resolve) =>
    socket.emit(
      'getConnections',
      [`${country}:connections`, sid1, sid2],
      // (result) => resolve(showMap(result, 'onGetConnections()'))
      (result) => resolve(result)
    )
  );

const onTest = (event, data) => {
  log(event);
  jLog(data);
};

const disconnected = () => {
  notice('Disconnected', clc.yellow);
};
//#endregion Helpers

//#region Socket handlers
socket.on('connected', ({ userID, nonce }) => {
  success(`Welcome back, ${userID} ${nonce}`);

  return { userID, nonce };
});

socket.on('disconnect', disconnected);

socket.on('newOutlet', (newOutlet) => success(`newOutlet: ${newOutlet}`));

socket.on('gotConnections', (map) => showMap(map, 'connections :>>'));

//#endregion Socket handlers

module.exports = {
  connectMe,
  onAddAnonConnection,
  onAddConnection,
  onGetConnections,
  onGetCountries,
  keyDelimiter,
  onTest,
};
