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
const onAddPromo = (args, socket) => {
  const { key, name, promoUrl } = head(args);

  jLog(
    args,
    `tqr.js onOddPromo()) calling redis/tqr.js:addPromo(${key}, ${name},${promoUrl})`
  );

  const id = addPromo({ key, name, promoUrl });
  socket.emit('newPromo', id);
};

const onGetPromos = (key) => {
  const promoKey = `${key}${key.endsWith(':') ? 'promotions' : ':promotions'}`;
  console.log(promoKey);
  getPromos(promoKey).then((promos) => socket.emit('gotPromos', promos));
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
