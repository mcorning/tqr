const app = require('./app');
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
const tryDataFile = () => {
  try {
    const dataFile = require(`./${nonce}.json`);
    userID = dataFile.userID;
  } catch (err) {
    userID = null;
    error(err, `${userID} is null because no data file:`);
  }
};
const country = 'us';
const nonce = 'Pops BBQ Truck';

let userID;
tryDataFile();

const TESTS = {
  null: 0,
  onAddConnection: 1,
  addAgency: 1 << 1,
  addPromotion: 1 << 2,
  getPromotions: 1 << 3,
};
const hasDataFile = () => {
  tryDataFile();
  tryDataFile();
  return userID != null;
};
const TEST = TESTS.onAddConnection; // + TESTS.addPromotion + TESTS.getPromotions;
// TEST set above socket.on('connected')
const test = () => {
  // connect app to server before running tests
  // NOTE: we can still call onAddConnection, but only for an agency
  // because connectMe() provides the stream with a root entry
  app.connectMe({ userID, country, nonce });
  console.assert(hasDataFile(), 'Missing data file');

  console.log('Testing...');
  if (binaryHas(TEST, TESTS.onAddConnection)) {
    console.log('onAddConnection()...');
    const agency = `${nonce}:Bend Truck`;
    app.onAddConnection({ country, agency });
  }
  if (binaryHas(TEST, TESTS.addAgency)) {
    console.log('addAgency()...');
    app.addOutlet({ country, nonce });
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
};

test();
