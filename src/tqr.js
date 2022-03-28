const io = require('socket.io-client');
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

const keyDelimiter = '@';

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

const getPromotions = (connection) => {
  const key = `${connection.country}:${connection.nonce}`;
  socket.emit('getPromos', key);
};

const earnReward = () => {
  notice('Earn a reward');
};
const grantReward = () => {
  notice('Grant a reward');
};
const getReward = () => {
  notice('Get a reward');
};

const addPromo = (promo) => socket.emit('addPromo', getPromo(promo));

module.exports = {
  getPromotions,
  addPromo,
  earnReward,
  grantReward,
  getReward,
};
