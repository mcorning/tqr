//#region Setup
const io = require('socket.io-client');
const fs = require('fs');
const {
  error,
  head,
  log,
  jLog,
  notice,
  reducePairsToObject,
  success,
  table,
} = require('../srv/utils/helpers');

const data = require('./auth.json');
const auth = {
  userID: data.chain.userID,
  nonce: data.chain.nonce,
  country: data.chain.country,
};
// const auth = { userID: data.outlets[0].userID, nonce: data.outlets[0].nonce };
const promoScope = [...['', 'Delivery'], ...data.outlets.map((v) => v.nonce)];

const options = {
  reconnectionDelayMax: 10_000,
  auth,
};
jLog(options, 'options :>> ');
const socket = io.connect('http://localhost:3333', options);

log('args:');
table([reducePairsToObject(process.argv.slice(2))]);

log();
//#endregion Setup

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
//#endregion Helpers

socket.on('connected', ({ userID, nonce }) => {
  success(`Welcome back, ${userID} ${nonce}`);
});

socket.on('newOutlet', (newOutlet) => success(`newOutlet: ${newOutlet}`));
socket.on('newPromo', (newPromo) => success(`newPromo: ${newPromo}`));

socket.on('newConnection', (newChain) => {
  //#region Helpers
  jLog(newChain, 'New chain:');
  notice('Handling on newConnection: >>');
  const filePath = `${__dirname}\\${newChain.nonce}.json`;
  fs.writeFile(filePath, JSON.stringify(newChain), (err) => error(err));

  const emitOutlet = (outlet) =>
    socket.emit('addOutlet', {
      country: outlet.country,
      key: `${newChain.nonce}@${outlet.nonce}`,
    });

  const emitPromo = (promo) => socket.emit('addPromo', getPromo(promo));
  //#endregion Helpers

  // now populate the chain stream with the outlets...
  data.outlets.forEach((outlet) => emitOutlet(outlet));
  // ...and promos
  data.promotions.forEach((promo) => emitPromo(promo));
});
