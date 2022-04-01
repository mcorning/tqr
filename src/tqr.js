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

const onGetPromotions = (key) =>
  new Promise((resolve) =>
    socket.emit('getPromos', key, (result) => {
      log(result);
      resolve(result);
    })
  );

const onAddPromotion = (promo) =>
  new Promise((resolve) =>
    socket.emit('addPromo', promo, (result) => {
      log(result);
      resolve(result);
    })
  );

socket.on('newPromo', (promo) => success(`New Promo: ${promo}`));

const earnReward = () => {
  notice('Earn a reward');
};
const grantReward = () => {
  notice('Grant a reward');
};
const getReward = () => {
  notice('Get a reward');
};

module.exports = {
  connectMe,
  onAddPromotion,
  onGetPromotions,
};
