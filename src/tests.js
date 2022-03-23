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

const TESTS = {
  null: 0,
  addAgency: 1,
  addPromotion: 1 << 1,
  getPromotions: 1 << 2,
};

const TEST = TESTS.addPromotion + TESTS.getPromotions;
// TEST set above socket.on('connected')
const test = () => {
  console.log('Testing...');
  if (binaryHas(TEST, TESTS.addAgency)) {
    console.log('addAgency()...');
    app.addOutlet({ COUNTRY, NONCE: 'test' });
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
