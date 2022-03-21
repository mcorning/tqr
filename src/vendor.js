//#region Setup
const io = require('socket.io-client');
const { writeFile } = require('fs');
const {
  error,
  log,
  jLog,
  notice,
  reducePairsToObject,
  success,
  table,
  warn,
  clc,
} = require('../srv/utils/helpers');

// console.group('Expand for options and args...');
const argsArray = process.argv.slice(2);
const args = reducePairsToObject(argsArray);
log(args, 'args:');
table([args]);
log();

const dataFile = args.onboard ? './auth.onboard.json' : './auth.json';
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

// console.groupEnd();

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
  jLog(thisPromos);
  return thisPromos;
};
const disconnected = () => {
  notice('Disconnected', clc.yellow);
};

const getPromotions = () => {
  const key = `${COUNTRY}:${NONCE}:${SCOPE}`;
  socket.emit('getPromos', key);
};

const getAllOutlets = () => {
  const key = `${COUNTRY}:connections`;
  socket.emit('getOutlets', key);
};

const showPromos = (promos) => jLog(promos, 'promos :>>');

// TODO use this Map/Reduce everywhere
const showMap = (map, msg) => {
  const arr = map.reduce((a, c) => {
    a.push([c[0], c[1][1]]);
    return a;
  }, []);
  // console.groupCollapsed(`expand for ${msg}`);
  jLog(arr, msg);
  // console.groupEnd();
};
//#endregion Helpers

//#region Socket message handlers
socket.on('connected', ({ userID, nonce }) => {
  success(`Welcome back, ${userID} ${nonce}`);
  getAllOutlets();
  getPromotions();
});

socket.on('disconnect', disconnected);

//#region New Streams Entry handlers
socket.on('newOutlet', (newOutlet) => success(`newOutlet: ${newOutlet}`));
socket.on('newPromo', (newPromo) => success(`newPromo: ${newPromo}`));

// handled only when onboarding Chain or Outlet
socket.on('newConnection', (newChain) => {
  //#region Connection Helpers
  notice('Handling on newConnection: >>');
  jLog(newChain, 'New chain:');
  const filePath = `${__dirname}\\${newChain.nonce}.json`;
  writeFile(filePath, JSON.stringify(newChain), (err) => error(err));

  const emitOutlet = (outlet) =>
    socket.emit('addOutlet', {
      country: outlet.country,
      key: `${newChain.nonce}@${outlet.nonce}`,
    });

  const emitPromo = (promo) => socket.emit('addPromo', getPromo(promo));
  //#endregion Connection Helpers

  // now populate the chain stream with the outlets...
  data.outlets.forEach((outlet) => emitOutlet(outlet));
  // ...and promos
  data.promotions.forEach((promo) => emitPromo(promo));
});
//#endregion New Streams Entry handlers
socket.on('gotPromos', (promos) => showMap(promos, 'promos :>>'));
socket.on('gotOutlets', (map) => showMap(map, 'outlets :>>'));
//#endregion Socket message handlers
