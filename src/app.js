//#region Setup
const io = require('socket.io-client');
const fs = require('fs');
const { error, log, jLog } = require('../srv/utils/helpers');

const auth = require('./auth.json');
jLog(auth);

const options = {
  reconnectionDelayMax: 10_000,
  auth,
};
jLog(options, 'options :>> ');
const socket = io.connect('http://localhost:3333', options);

log('args:');
process.argv.slice(2).forEach((val, index) => {
  log(`${index}: ${val}`);
});
const filePath = __dirname + '\\auth.json';
//#endregion Setup

socket.on('newUserID', (newUserCreds) => {
  jLog(newUserCreds, 'New credentials:');
  fs.writeFile(filePath, JSON.stringify(newUserCreds), (err) => error(err));
});

socket.on('connected', () => {
  log('connected');
  socket.emit('getCountries', null, (answer) =>
    log(`Countries :>> 
  ${answer}`)
  );
});
