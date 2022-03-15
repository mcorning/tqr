var io = require('socket.io-client');
var socket = io.connect('http://localhost:3333');

var msg2 = 'hello';
socket.emit('hi', msg2);

socket.on('newSession', (newSession) => {
  console.log(newSession);
});
