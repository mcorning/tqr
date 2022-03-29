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

// xrange us 1642558471131-0 1642558471131-0
const getConnections = (cmd) =>
  // redis returns a Promise<Map>}
  redis.xrange(cmd).catch((e) => {
    console.log(e, e.cause);
  });

const getCountries = () =>
  redis
    .scan('0', 'MATCH', 'tqr:*')
    .then((countries) => countries.filter((v, i) => i > 0))
    .then((countryIDs) => countryIDs.map((v) => v.map((c) => c.slice(4, 6))))
    .catch((e) => console.error('e :>> ', e));
module.exports = { addConnection, getConnections, getCountries };
