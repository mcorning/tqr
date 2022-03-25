//#region Setup
const io = require('socket.io-client');
const socket = io.connect('http://localhost:3333', { autoConnect: false });

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
const onboard = args.length > 2; // no app args means we start from beginning
console.groupCollapsed('Expand for options and args...');
if (onboard) {
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

console.groupEnd();

//#endregion Setup

//#region Helpers
// testing and clients start processing here.
// index.js:io.on('connection') will not see a userID,
// so first thing, it creates a new connection on Redis Stream db
const connectMe = () => Promise.resolve(socket.connect());

const onAddConnection = ({ country, nonce }) =>
  // TODO how do we handle an error in the Promise?
  new Promise((resolve) =>
    socket.emit('addConnection', { country, nonce }, (newConn) =>
      resolve(newConn)
    )
  );

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

const getPromotions = () => {
  const key = `${COUNTRY}:${NONCE}:${SCOPE}`;
  socket.emit('getPromos', key);
};

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

  return { userID, nonce };
});

socket.on('disconnect', disconnected);

socket.on('newOutlet', (newOutlet) => success(`newOutlet: ${newOutlet}`));

socket.on('newPromo', (newPromo) => success(`newPromo: ${newPromo}`));

socket.on('gotPromos', (promos) => showMap(promos, 'promos :>>'));

socket.on('gotOutlets', (map) => showMap(map, 'outlets :>>'));

socket.on('newConnection', (newConn) => {
  log(newConn);
  log(socket.userID);
});
//#endregion Socket handlers
const newConnection = [];
const getNewConnection = () => newConnection;

module.exports = {
  connectMe,
  onAddConnection,
  addPromo,
  getNewConnection,
  getPromotions,
  getAllConnections,
};
