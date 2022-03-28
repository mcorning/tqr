const {
  addConnection,
  addOutlet,
  getConnections,
  addPromo,
  getPromos,

  addSponsor,
  addReward,
  deleteStream,
  getCountries,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
} = require('./redis/tqr');
const { error, success, jLog, log, notice } = require('./utils/helpers');

const onAddOutlet = (socket, { country, key }) => {
  // first make a separate connection entry for outlet for its SID
  addConnection(country, key)
    // then add the outlet data
    .then((id) => addOutlet(key, id))
    .then((id) => socket.emit('newOutlet', id))
    .catch((e) =>
      error(`index.js: connectOutlet.addConnection 
    ${e.stack}
    ${e.cause}`)
    );
};

const onAddPromo = (socket, promo) => {
  const { key, name, promoUrl } = promo;
  jLog(key, `index.js onOddPromo()) calling tqr.addPromo(${key})`);

  const id = addPromo({ key, name, promoUrl });
  socket.emit('newPromo', id);
};

const onGetPromos = (socket, key) => {
  const promoKey = `${key}${key.endsWith(':') ? 'promotions' : ':promotions'}`;
  console.log(promoKey);
  getPromos(promoKey).then((promos) => socket.emit('gotPromos', promos));
};

module.exports = {
  getConnections,
  addConnection,
  addOutlet,
  addPromo,
  getPromos,

  addReward,
  addSponsor,
  deleteStream,
  getCountries,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
};
