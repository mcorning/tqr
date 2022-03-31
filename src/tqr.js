const io = require('socket.io-client');
const socket = io.connect('http://localhost:3333', { autoConnect: false });

const {
  error,
  log,
  jLog,
  notice,
  success,
  table,
  clc,
} = require('../srv/utils/helpers');

const keyDelimiter = '@';

const connectMe = () => Promise.resolve(socket.connect());

// "promotions": [
//     {
//         "name": "NETS Eat & Win",
//         "scope": "All Outlets",
//         "url": "https://foodrepublic.com.sg/2021/08/30/frxnetsluckydrawcampaign/"
//     },
//  ]
const getPromo = (connection, promo) => {
  const root = `${connection.country}:${connection.nonce}`;
  const outlet = connection.scope;
  const scopeKey = outlet ? `:${outlet}` : '';
  const keyBase = `${root}${scopeKey}`;
  const key = `${keyBase}:promotions`;
  const name = promo.name;
  const promoUrl = promo.url;
  const thisPromos = { key, name, promoUrl };
  jLog(thisPromos, 'getPromo() results :>>');
  return thisPromos;
};

// const promise = (socketEvent = new Promise(
//   (resolve) => (socketEvent) => resolve(newConn)
// ));

const getPromotions = (connection) => {
  const key = `${connection.country}:${connection.nonce}`;
  // TODO convert to Promise
  socket.emit('getPromos', key);
};

// const earnReward = () => {
//   notice('Earn a reward');
// };
// const grantReward = () => {
//   notice('Grant a reward');
// };
// const getReward = () => {
//   notice('Get a reward');
// };

const addPromo = (connection, promo) =>
  socket.emit('addPromo', getPromo(connection, promo));

socket.on('newPromo', (promo) => log(promo));

module.exports = { addPromo, getPromotions };

module.exports = {
  connectMe,
  addPromo,
  getPromo,
  getPromotions,
};
