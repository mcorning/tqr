// very cool json db: https://belphemur.github.io/node-json-db/#appending-in-array

const app = require('../src/app');
const {
  binaryHas,
  error,
  log,
  jLog,
  notice,
  reducePairsToObject,
  success,
  table,
  clc,
} = require('../srv/utils/helpers');

const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
// be sure to start with the current dir name,
// otherwise, the data file goes to the parent folder
// or if you start the string with '/' the file will be on the PC's root dir
const db = new JsonDB(new Config('tests/TestData', true, true, '/'));

const data = db.getData('/');
jLog(data, 'TestData.json :>>');
log();
const idx = db.getIndex('/nonces', 'BreadTalk', 'nonce');
log(idx, 'index for BreadTalk');
jLog(db.getData(`/nonces[${idx}]`), 'BreadTalk :>>');
// you can string NONCES together to make a key for Redis Stream
const NONCES = {
  PopsBbqTruck: 'Pops BBQ Truck',
  BendTruck: 'Bend Truck',
};
// Agency is a colon-delimited string of Agents beginning with a Pricipal
const AGENCY = {
  PopsBbqTruck: NONCES.PopsBbqTruck,
  PopsBendTruck: `${NONCES.PopsBbqTruck}:${NONCES.BendTruck}`,
};

// TODO Set country to wherever you want to test TQR
const country = 'us';
// TODO setup your own AGENCY enum
const nonce = AGENCY.PopsBendTruck;

const userID = '';
// tryDataFile will set userID if there is a datafile to dereference
const addConnection = () => {
  app
    .onAddConnection({ country, nonce })
    .then((x) => pushNewConnection(x))
    .catch((e) => error(jLog(e, 'Error in onAddConnection() chain')));
};

const pushNewConnection = (conn) => {
  jLog(conn, 'conn :>>');
  db.push('/nonces[]', conn, true);
  jLog(db.getData('/'), 'db :>>');
  log();
};
const TESTS = {
  null: 0,
  onAddConnection: 1,
  getAllConnections: 1 << 1,
  addPromotion: 1 << 2,
  getPromotions: 1 << 3,
};

const TEST = 0; //TESTS.onAddConnection; //TESTS.onAddConnection + TESTS.getAllConnections; // + TESTS.addPromotion + TESTS.getPromotions;

app.connectMe().then((socket) => addConnection());

console.log('Testing...');
if (binaryHas(TEST, TESTS.onAddConnection)) {
  console.log('onAddConnection()...');
  app
    .onAddConnection({ country, nonce })
    .then((x) => pushNewConnection(x))
    .catch((e) => error(jLog(e, 'Error in onAddConnection() chain')));
}
if (binaryHas(TEST, TESTS.getAllConnections)) {
  console.log('getAllConnections()...');
  app.getAllConnections();
}

if (binaryHas(TEST, TESTS.addPromotion)) {
  console.log('addPromo()...');
  app.addPromo({
    name: 'Get Sauced at Pops',
    url: 'https://www.popsouthernbbq.com/menu',
  });
}

if (binaryHas(TEST, TESTS.getPromotions)) {
  console.log('calling getPromotions()...');
  app.getPromotions();
}
