var io = require('socket.io-client');

const userID = '1647383723288-0';
const sessionID = '43623f17a7114aa9';
const lastDeliveredId = '';

const data = {
  userID,
  sessionID,
  lastDeliveredId,
  id: 1,
};

const options = {
  reconnectionDelayMax: 10000,
  auth: data,
};

var socket = io.connect('http://localhost:3333', options);

socket.on('newUserID', (newUser) => {
  console.log(newUser);
});

console.clear();
