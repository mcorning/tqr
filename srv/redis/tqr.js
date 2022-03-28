//#region Setup
let options;
console.groupCollapsed('redis tqr');
if (process.env.NODE_ENV === 'production') {
  console.log('Dereferencing process.env');
  options = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'tqr:',
  };
} else {
  const lctJsonOptions = require('../config/redisJson.options.js');
  options = {
    host: lctJsonOptions.redisHost,
    port: lctJsonOptions.redisPort,
    password: lctJsonOptions.redisPassword,
    showFriendlyErrorStack: true,
    keyPrefix: 'tqr:',
  };
}
const Redis = require('ioredis');
const redis = new Redis(options);
console.log('options:>>', options);
console.groupEnd();
//#endregion Setup

//#region Helpers

const forPromo = (promos) => {
  if (isEmpty(promos)) {
    return 'no promos';
  }
  return promos.reduce((a, c) => {
    const { name, promoUrl } = c;
    a.push({ name, promoUrl });
    return a;
  }, []);
};
//#endregion Helpers

//#region API
/**
 * `Add a connection to the stream for the given country.`
 * @param country - The country code of the country the user is connecting from.
 * @param nonce - A unique identifier for the connection.
 */
const addConnection = (country, nonce) => {
  const args = [`${country}:connections`, '*', 'nonce', nonce];
  console.log('addConnection(). args', args);
  return redis.xadd(args).catch((e) => error(e));
};

const addOutlet = (nonce, id) =>
  redis
    .xadd(`${nonce}`, '*', 'connectionID', id)
    .catch((e) => console.log(err(e)));

// xrange us 1642558471131-0 1642558471131-0
const getConnections = (cmd) =>
  // redis returns a Promise<Map>}
  redis.xrange(cmd).catch((e) => {
    console.log(e, e.cause);
  });

// > xadd tqr:us1642558736304-0:promos * biz "Fika" promoText 'Welcome back Renee'
const addPromo = ({ key, name, promoUrl }) =>
  redis.xadd(key, '*', 'name', name, 'promoUrl', promoUrl);

// xread tqr:us:1642558471131-0:promos 0
const getPromos = (key) => redis.xread('STREAMS', key, '0');

//#endregion API

////////////////// Old Code //////////////////
//#region Old Helpers
const { error, success, jLog } = require('../utils/helpers.js');
const {
  isEmpty,
  objectFromStream,
  objectFromStreamEntry,
  objectToKeyedArray,
} = require('../utils/utils');

const handleRedisError = (redisErr) => {
  console.log('redisError :>> ', redisErr.message);
  console.log('command :>> ', JSON.stringify(redisErr, null, 2));
  console.log('stack :>> ', redisErr.stack);
};

const forSponsor = (sponsor) =>
  sponsor.reduce((a, c) => {
    const { biz, uid, ssid } = c;
    a.push({ biz, uid, ssid });
    return a;
  }, []);

const forThisSponsor = (sponsor) => ({
  biz: sponsor.biz,
  uid: sponsor.uid,
  ssid: sponsor.uid,
});

const killSwitch = async (country) => {
  return redis.del(country);
};

//#endregion Old Helpers
//#region Old API

//#region CREATE
/**
 * `addSponsor` is a function that takes a `key`, a `biz`, and a `uid` and adds them to the stream
 * `key` using the `xadd` command
 */
const addSponsor = ({ key, biz, uid }) =>
  redis
    .xadd(`${key}`, '*', 'biz', biz, 'uid', uid)
    .catch((e) => console.log(err(e)));

// TODO this is weird. i used to be able to chain promises here
// at least refactor this to use compose()...
// and what happens if this chain fails at any point? how does the UI handle it?
/**
 * It reads the stream of sponsors and returns an array of objects.
 * @param key - The key of the stream to read from.
 * @returns An array of objects.
 */
const getSponsors = async (key) => {
  console.log(`XREAD STREAMS ${key} 0`);
  const stream = await redis
    .xread('STREAMS', key, 0)
    .catch((e) => handleRedisError(e));
  console.log(`getSponsors():stream = ${printJson(stream)}`);
  const sponsors = await objectFromStream(stream);
  if (sponsors) {
    console.log(`getSponsors():sponsors = ${printJson(sponsors)}`);
    const data = await objectToKeyedArray(sponsors);
    if (data) {
      return forSponsor(data);
    }
  } else {
    console.log('oops');
  }
};

// > xadd tqr:us1642558736304-0:rewards * biz "Fika" cid '9f8b77197764881a'
const addReward = ({ key, biz, sid }) =>
  redis.xadd(key, '*', 'biz', biz, 'sid', sid);

//#endregion CREATE
//#region DELETE
const deleteStream = (key, ids) => redis.xdel(key, ids);

//#endregion DELETE

//#region READ

const getCountries = () =>
  redis
    .scan('0', 'MATCH', 'tqr:*')
    .then((countries) => countries.filter((v, i) => i > 0))
    .then((countryIDs) => countryIDs.map((v) => v.map((c) => c.slice(4, 6))))
    .catch((e) => console.error('e :>> ', e));

// xrange us 1642558471131-0 1642558471131-0
const getSponsor = (country, ssid) => {
  console.log(`getSponsor(${country})`, country);
  redis
    .xrange(country, ssid, ssid)
    .then((stream) => objectFromStreamEntry(stream))
    .then((sponsor) => forThisSponsor(sponsor));
};
// xread STREAMS tqr:us:1642558471131-0:rewards:{cid} 0
const getRewards = (key) =>
  redis
    .xread('STREAMS', key, '0')
    .then((stream) => objectFromStream(stream))
    .catch((e) => console.log(err(e)));
//#0endregion READ
//#endregion API
//#endregion Old API
//////////////////////////////////////////////

//#region Tests
const TESTING = false;
// TODO refactor tests for new strategy
if (TESTING) {
  //#region Test Data
  const bids = [
    { biz: 'Fika', uid: '9f8b77197764881a', sid: '' },
    { biz: 'SCC', uid: '2cc4954d5cabe49a', sid: '' },
    { biz: 'Outlaw Barbers', uid: '9bb09370e625baf7', sid: '1642558736304-0' },
  ];
  const promos = [
    { biz: 'Fika', promoText: 'Welcome back Renee' },
    { biz: 'Fika', sid: '', promoText: 'Discount for card players' },
    { biz: 'Outlaw Barbers', promoText: 'Twenty percent for Vets on Vets Day' },
  ];
  const cids = [
    { name: 'debug', uid: '9f8b77197764881a' },
    { name: 'Firefox', uid: '9b7c302f6f1b1fa4' },
  ];
  //#endregion Test Data

  const updateBid = (bidUid, ssid) => {
    const updatedBid = bids.find((v) => v.uid === bidUid);
    updatedBid.sid = ssid;
    console.assert(updatedBid.sid == ssid, 'failed isometric truth test');
    return updatedBid.sid;
  };
  // We archive tests when TESTING is false (default)
  const COUNTRY = 'sg';
  const biz = bids[0].biz;
  const uid = bids[0].uid;
  const biz2 = bids[1].biz;
  const uid2 = bids[1].uid;

  const p0 = addSponsor({ country: 'sg', biz, uid }).then(() =>
    addSponsor({ country: 'sg', biz, uid })
  );

  const p1 = addSponsor({ country: COUNTRY, biz, uid })
    .then((ssid) => updateBid(uid, ssid))
    .then((ssid) => getSponsor(COUNTRY, ssid))
    .then((sponsor) => jLog(sponsor), 'Sponsor')
    .then(() => getSponsors(COUNTRY));
  const p2 = addSponsor({ country: COUNTRY, biz: biz2, uid: uid2 })
    .then((ssid) => updateBid(uid2, ssid))
    .then((ssid) => getSponsor(COUNTRY, ssid))
    .then((sponsor) => jLog(sponsor), 'Sponsor')
    .then(() => getSponsors(COUNTRY));

  Promise.all([p0, p1, p2])
    .then((promises) => jLog(promises), 'Sponsors')
    .then(() =>
      addReward({
        key: `${COUNTRY}:${bids[0].sid}:rewards`,
        biz,
        cid: cids[0].uid,
      })
    )
    .then(() => getRewards(`${COUNTRY}:${bids[0].sid}:rewards`))
    .then((rewards) => jLog(rewards), 'Rewards')
    .then(() =>
      addPromo({
        country: `${COUNTRY}:${bids[1].sid}:promos`,
        biz: promos[1].biz,
        promoText: promos[1].promoText,
      })
    )
    .then(() =>
      addPromo({
        country: `${COUNTRY}:${bids[0].sid}:promos`,
        biz: promos[2].biz,
        promoText: promos[2].promoText,
      })
    )
    .then(() => deleteStream(`${COUNTRY}:${bids[0].sid}:promos:${cids[0]}`))
    .then(() => getPromos(`${COUNTRY}:${bids[1].sid}:promos`))
    .then((ps) => jLog(ps), 'Promos')
    .then(() => getCountries())
    .then((countries) => jLog(countries));
  // NOTE: We return all Reward data, not a subset like the others
}

function getOutletsOk(key, sid1, sid2) {
  const startRange = sid1 ?? '-';
  const endRange = sid2 ?? '+';
  return redis.xrange(key, startRange, endRange);
}
//#endregion Tests

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
  getSponsor,
  getRewards,
  getSponsors,
  killSwitch,
  redis,
};

/* Stream examples:
Command: >scan 0
      Returns
cursor    all streams in database:
----------------------------------------------------
0         auditor:streams                    
          promotions:1642533459959-0
          tqr:us1642533459959-0
          tqr:us1642533459959-0:promos
          sponsors:us

Command: >scan 0 match us*[^promos]
      Returns
cursor    all USA Sponsors:
----------------------------------------------------
0         tqr:us1642533459959-0

Command: >scan 0 match us*
      Returns
cursor    all streams in USA:
----------------------------------------------------
0         tqr:us1642533459959-0
          tqr:us1642533459959-0:promos

Command: >scan 0 match us*rewards
      Returns
cursor    all Rewards in USA:
----------------------------------------------------
0         tqr:us1642533459959-0:rewards

Command: >scan 0 match us*promos
      Returns
cursor    all Promotions in USA:
----------------------------------------------------
0         tqr:us1642533459959-0:promos

Command: >scan 0 match tqr:us1642533459959-0*
      Returns
cursor    all streams for Sponsor 1642533459959-0:
----------------------------------------------------
0         tqr:us1642533459959-0:rewards
          tqr:us1642533459959-0
          tqr:us1642533459959-0:promos

Command: >scan 0 match tqr:us::*[^:promos][^:rewards]
      Returns
cursor    then array of values:
----------------------------------------------------
0         tqr:us1642533459959-0


> xadd us * biz SCC uid 2cc4954d5cabe49a
1642558471131-0

> xrange us 1642558471131-0 1642558471131-0
1642558471131-0
biz
SCC
uid
2cc4954d5cabe49a

> xadd us * biz "Outlaw Barbers" uid 9bb09370e625baf7
1642558736304-0
> xrange us 1642558736304-0 1642558736304-0
1642558736304-0
biz
Outlaw Barbers
uid
9bb09370e625baf7

> xadd tqr:us1642558736304-0:promos * biz "Outlaw Barbers" promoText 'Twenty percent for Vets on Vets Day'
1642558906193-0
> xread streams tqr:us1642558736304-0:promos 0
us:1642558736304-0:promos
1642558906193-0
biz
Outlaw Barbers
promoText
Twenty percent for Vets on Vets Day

> xadd tqr:us1642558471131-0:promos * biz "SCC" promoText 'Early Spring Break'
1642562389544-0
> xadd tqr:us1642558471131-0:promos * biz "SCC" promoText 'Get a break on breakfast'
1642562437423-0
> xread streams tqr:us1642558471131-0:promos 0
us:1642558471131-0:promos
1642562389544-0
biz
SCC
promoText
Early Spring Break
1642562437423-0
biz
SCC
promoText
Get a break on breakfast
*/
