//#region Setup
const io = require('socket.io-client');
// const socket = require('./socket.js');
const { writeFile } = require('fs');
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

const argsArray = process.argv.slice(2);
const args = reducePairsToObject(argsArray);
const onboard = args.length == 2; // no app args means we start from beginning
if (!onboard) {
  console.group('Expand for options and args...');
  log(args, 'args:');
  table([args]);
  log();
}

const USER_ID = args.userID;
const NONCE = args.nonce;
const SCOPE = args.scope;
const COUNTRY = args.country;
const auth = {
  userID: USER_ID,
  nonce: NONCE,
  country: COUNTRY,
};
//   const promoScope = [...['', 'Delivery'], ...data.outlets.map((v) => v.nonce)];

const options = {
  reconnectionDelayMax: 10_000,
  autoConnect: false,
  auth,
};
jLog(options, 'options :>> ');

const TESTS = {
  null: 0,
  connectMe: 1,
  addAgency: 1 << 1,
  addPromotion: 1 << 2,
  getPromotions: 1 << 3,
};

console.groupEnd();

//#endregion Setup

/////////////////// Main Entry Point ///////////////////
// called after options set up above
const socket = io.connect('http://localhost:3333', options);

////////////////////////////////////////////////////////

//#region Helpers
const onAddConnection = ({ country, agency }) => {
  socket.emit('addConnection', { country, nonce: agency });
};
// "promotions": [
//     {
//         "name": "NETS Eat & Win",
//         "scope": "All Outlets",
//         "url": "https://foodrepublic.com.sg/2021/08/30/frxnetsluckydrawcampaign/"
//     },
//  ]
const getPromo = (promo) => {
  const root = `${COUNTRY}:${NONCE}`;
  const outlet = SCOPE;
  const scopeKey = outlet ? `:${outlet}` : '';
  const keyBase = `${root}${scopeKey}`;
  const key = `${keyBase}:promotions`;
  const name = promo.name;
  const promoUrl = promo.url;
  const thisPromos = { key, name, promoUrl };
  jLog(thisPromos, 'getPromo() results :>>');
  return thisPromos;
};
const disconnected = () => {
  notice('Disconnected', clc.yellow);
};

const connectMe = ({ userID, country, nonce }) => {
  socket.auth = {
    userID,
    nonce,
    country,
  };
  socket.connect();
};

const getPromotions = () => {
  const key = `${COUNTRY}:${NONCE}:${SCOPE}`;
  socket.emit('getPromos', key);
};

const addOutlet = (outlet) =>
  socket.emit('addOutlet', {
    country: outlet.country,
    key: `${newChain.nonce}@${outlet.nonce}`,
  });

const addPromo = (promo) => socket.emit('addPromo', getPromo(promo));

const getAllConnections = () => {
  const key = `${COUNTRY}:connections`;
  socket.emit('getOutlets', key);
};

// TODO use this Map/Reduce everywhere
const showMap = (map, msg) => {
  console.groupCollapsed(`expand for ${msg}`);
  const mapArray = reduceMap(map);
  jLog(mapArray, msg);
  console.groupEnd();
  return mapArray;
};

const reduceMap = (map) =>
  map.reduce((a, c) => {
    a.push([c[0], c[1][1]]);
    return a;
  }, []);

//#endregion Helpers

//#region Socket handlers
socket.on('connected', ({ userID, nonce }) => {
  success(`Welcome back, ${userID} ${nonce}`);
  if (TEST) {
    test();
  }
  return { userID, nonce };
});

socket.on('disconnect', disconnected);

socket.on('newOutlet', (newOutlet) => success(`newOutlet: ${newOutlet}`));

socket.on('newPromo', (newPromo) => success(`newPromo: ${newPromo}`));

// handled only when onboarding
socket.on('newConnection', (newChain) => {
  notice('Handling on newConnection: >>');
  jLog(newChain, 'New chain:');
  const filePath = `${__dirname}\\${newChain.nonce}.json`;
  writeFile(filePath, JSON.stringify(newChain), (err) => error(err));
});

socket.on('gotPromos', (promos) => showMap(promos, 'promos :>>'));

socket.on('gotOutlets', (map) => showMap(map, 'outlets :>>'));
//#endregion Socket handlers

const TEST = 0;
const test = () => {
  if (TEST === 0) {
    return;
  }
  console.log('Testing...');
  if (binaryHas(TEST, TESTS.connectMe)) {
    console.log('connectMe()...');
    connectMe({ userID: '', country: 'us', nonce: 'Pops' });
  }
  if (binaryHas(TEST, TESTS.addAgency)) {
    console.log('addAgency()...');
    addOutlet({ COUNTRY, NONCE: 'test' });
  }

  if (binaryHas(TEST, TESTS.addPromotion)) {
    console.log('addPromo()...');
    addPromo({
      name: 'Get Sauced at Pops',
      url: 'https://www.popsouthernbbq.com/menu',
    });
  }

  if (binaryHas(TEST, TESTS.getPromotions)) {
    console.log('getPromotions()...');
    getPromotions();
  }
};

test();

module.exports = {
  connectMe,
  onAddConnection,
  addPromo,
  addOutlet,
  getPromotions,
  getAllConnections,
};
