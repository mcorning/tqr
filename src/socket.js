const { io } = require('socket.io-client');

const URL = 'http://localhost:3000';
const socket = io(URL, { autoConnect: false });
socket.onAny((event, ...args) => {
  console.log('socket.js :>>', event, args);
});

module.exports = { socket };
