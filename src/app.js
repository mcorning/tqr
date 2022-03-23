//#region Setup
const io = require('socket.io-client');
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

const onboard = args.length == 2; // no app args means we start from beginning
if (!onboard) {
  console.group('Expand for options and args...');
  const argsArray = process.argv.slice(2);
  const args = reducePairsToObject(argsArray);
  log(args, 'args:');
  table([args]);
  log();
}

const dataFile = onboard ? './auth.onboard.json' : './auth.json';
const data = require(dataFile);
const USER_ID = args.userID || data.chain.userID;
const NONCE = args.nonce || data.chain.nonce;
const SCOPE = args.scope || '';
const COUNTRY = args.country || data.chain.country;
const auth = {
  userID: USER_ID,
  nonce: NONCE,
  country: data.chain.country,
};
const promoScope = [...['', 'Delivery'], ...data.outlets.map((v) => v.nonce)];

const options = {
  reconnectionDelayMax: 10_000,
  auth,
};
jLog(options, 'options :>> ');

const TESTS = {
  null: 0,
  addAgency: 1,
  addPromotion: 1 << 1,
  getPromotions: 1 << 2,
};

const TEST = 0; //TESTS.addPromotion + TESTS.getPromotions;

console.groupEnd();

//#endregion Setup

/////////////////// Main Entry Point ///////////////////

const socket = io.connect('http://localhost:3333', options);

////////////////////////////////////////////////////////

//#region Helpers

// "promotions": [
//     {
//         "name": "NETS Eat & Win",
//         "scope": "All Outlets",
//         "url": "https://foodrepublic.com.sg/2021/08/30/frxnetsluckydrawcampaign/"
//     },
//  ]
const getPromo = (promo) => {
  const root = `${data.chain.country}:${data.chain.nonce}`;
  const outlet = promoScope.find((v) => v === promo.scope);
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

const getAllOutlets = () => {
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

// TEST set above socket.on('connected')
const test = () => {
  console.log('Testing...');
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

module.exports = { addPromo, addOutlet, getPromotions, getAllOutlets };
