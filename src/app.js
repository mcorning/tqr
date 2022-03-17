//#region Setup
const io = require('socket.io-client');
const fs = require('fs');
const {
  error,
  head,
  log,
  jLog,
  notice,
  reducePairsToObject,
  success,
  table,
} = require('../srv/utils/helpers');

const data = require('./auth.json');
const auth = data.chain;

const options = {
  reconnectionDelayMax: 10_000,
  auth,
};
jLog(options, 'options :>> ');
const socket = io.connect('http://localhost:3333', options);

log('args:');
table([reducePairsToObject(process.argv.slice(2))]);

log();
//#endregion Setup

socket.on('newOutlet', (newOutlet) => success(`newOutlet: ${newOutlet}`));

socket.on('newConnection', (newChains) => {
  const newChain = head(newChains);

  notice('on newConnection: >>');
  const filePath = `${__dirname}\\${newChain.nonce}.json`;
  jLog(newChain, 'New chain:');
  fs.writeFile(filePath, JSON.stringify(newChain), (err) => error(err));
  data.outlets.forEach((outlet) => {
    socket.emit('addOutlet', {
      country: outlet.country,
      key: `${newChain.nonce}@${outlet.nonce}`,
    });
  });
  // now populate the chain outlets and promos in the the chain stream
});
