const {
  addPromo,
  getPromos,

  addSponsor,
  addReward,
  deleteStream,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
} = require('./redis/tqr');
const { error, head, success, jLog, log, notice } = require('./utils/helpers');

// methods called by index.js
const onAddPromo = (args, socket, io) => {
  const { country, nonce, promotions } = head(args);
  const ack = args.at(-1);
  const key = `${country}:${nonce}:promos`;
  const { promoName, promoUrl } = promotions[0];
  jLog(
    promotions[0],
    `tqr.js onOddPromo()) calling redis/tqr.js:addPromo(${key}, ${promoName},${promoUrl})`
  );
  addPromo({ key, promoName, promoUrl }).then((result) => {
    socket.broadcast.emit('newPromo', result);
    io.emit('newPromo', result);
    ack(result);
  });
};

const onGetPromos = (args) => {
  const key = args[0];
  const ack = args[1];

  const promoKey = key
    ? `${key}${key.endsWith(':') ? 'promos' : ':promos'}`
    : '*:promos';
  console.log('promoKey', promoKey);
  return getPromos(promoKey).then((result) => ack(result));
};

module.exports = {
  onAddPromo,
  onGetPromos,

  addReward,
  addSponsor,
  deleteStream,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
};
