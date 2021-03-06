// @ts-check

/** TQR Tests
 * This file does two things. First, it manages test data. Seconod, it uses that test data
 * to test the TQR client (app.js).
 *
 * DATA
 * Anonymous Engagement processes two kinds of data: AGENCY data and ANON data.
 * AGENCY data stipulates a NONCE. A nonce is a string key used by Redis Streams to return 
 * a userID for the connection. The userID also serves as an identifier for Socket.IO.
 
 * ANON data uses the NULL NONCE.

 * In addition the nonce property, both AGENCY and ANON data include country and userID properties.
 * The Redis Streams database collects AGENCY and ANON data in the CONNECTIONS stream.
 * 
 * TEST DATA 
 * There are two kinds of test data: Data stored in the TestData MOCK, and ENUMs defined in code.
 * TestData is a database with *existing* connections in the Redis Streams database.
 * The NONCES enum can have any other keys used to create new connections and to test
 * that the client doesn't duplicated keys in the Stream (note: duplicate keys are
 * permissible in Redis Stream, but this breaks referntial integrity for the client).
 * The AGENCY enum is populated with NONCE combinations used to setup a connection.
 *
 * TESTS
 * The most basic test adds an entry in the Streams database returning the Stream ID
 * (which is a unique timestamp) that provides the client with a userID.
 * The test completes after adding the new entry to the TestData database.
 *
 * Subsequent tests are taken from the TestData database.
 * 
 * NOTE:
 * A nonce is a Named-Once string locally unique (at least at country level) that identifies an AGENCY.
 * An AGENCY is any legal entity participating in Anonymous Engagement such as TQR.
 * An AGENT is any authorized person in an AGENCY (e.g., a store manager).
 * You can string NONCES together with the keyDelimiter to make a key for Redis Streams.
 * A null NONCE indicates the other (anonymous) party in the engagement.
 *
 * @see app.js
 */

//#region Setup
const app = require('../src/app');
const tqr = require('../src/tqr');
const db = require('./db.js');

const {
  compose,
  error,
  log,
  jLog,
  notice,
  isEmpty,
  reducePairsToObject,
  success,
  table,
  warn,
  clc,
} = require('../srv/utils/helpers');
//#endregion Setup

const printResults = (msg, result) => {
  console.groupCollapsed(msg);
  table(result);
  console.groupEnd();
};

const testAddConnctions = (connections) => {
  log(`Testing onAddConnection with ${connections.length} connections`);
  connections.forEach((connection) => {
    printResults('onAddConnection results :>>', connection);
    app
      .onAddConnection(connection)
      .then((result) => printResults(`\tTest onAddConnection() PASSED`, result))
      .catch((e) => error(jLog(e, 'Error in onAddConnection() chain')));
  });
  // interesting...adding connections is orthogonal to add promos
  // so to enable the next step in tests, we can pass on the connectionsWithPromos
  // while we are adding connections
  return db.getConnectionsWithPromos();
};

const testAddPromotions = (connections) => {
  log('testing onAddPromotions');
  connections.forEach((connection) => {
    jLog(connection, 'connection', clc.green);
    tqr
      .onAddPromotion(connection)
      .then((result) => printResults(`\tTest onAddPromotion() PASSED`, result))
      .catch((e) => error(jLog(e, 'Error in onAddPromotions() chain')));
  });
};

const testAddAnon = () => {
  log('testing testAddAnon');
  app
    .onAddAnonConnection('us')
    .then((result) =>
      printResults(`\tTest onAdd[anon]Connection() PASSED`, result)
    );
};

const testGetCountries = () => {
  log('testing onGetCountries()');
  app
    .onGetCountries()
    // TODO better to use Promise.reject() for failed tests
    .then((countries) => {
      printResults(`\tTesting onGetCountries() PASSED:`, countries);
      return countries;
    });
};

const testGetConnections = () => {
  log('testing onGetConnections()');
  app.onGetCountries().then((countries) =>
    countries.forEach((country) => {
      app
        .onGetConnections(country)
        // TODO better to use Promise.reject() for failed tests
        .then((conns) => {
          printResults(`\tTesting onGetConnections() PASSED: `, conns);
        });
    })
  );
};

const getResults = (result) =>
  result ? reducePairsToObject(result[0][1][0][1]) : 'no promos';

const testGetPromotions = () => {
  app.onGetCountries().then((countries) => {
    countries.forEach((country) => {
      app.onGetConnections(country).then((conns) => {
        conns.forEach((connection) => {
          tqr
            .onGetPromotions({ country, nonce: connection[1][1] })
            .then((result) => getResults(result))
            .then((results) =>
              printResults(`\tTesting onGetPromotions() PASSED: `, results)
            );
        });
      });
    });
  });
};
const reset = true;

notice('Connecting...');
// connect to server and to Redis
// then run tests
app
  .connectMe()
  .then(() => tqr.connectMe()) // give tqr a socket of its own
  .then(() => notice('Connected'))
  .then(() => {
    if (reset) {
      testAdds();
    }
    testGets();
  });

const testAdds = compose(
  testAddAnon,
  testAddPromotions,
  testAddConnctions,
  db.getConnections
);
const testGets = compose(
  testGetPromotions,
  testGetConnections,
  testGetCountries
);
