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

const {
  binaryHas,
  error,
  log,
  jLog,
  notice,
  isEmpty,
  success,
  table,
  warn,
  clc,
} = require('../srv/utils/helpers');
//#endregion Setup

// true will empty the mock as soon as it opens
const reset = false;
const STEPS = {
  null: 0,
  onAddConnection: 1,
  getConnections: 1 << 1,
  addPromotion: 1 << 2,
  getPromotions: 1 << 3,
  addAnon: 1 << 4,
};

const TESTS = {
  onboard: STEPS.onAddConnection,
  getConnections: STEPS.getConnections,
  addPromo: STEPS.addPromotion,
  getPromos: STEPS.getPromotions,
  onboardAndGetConnections: STEPS.onAddConnection + STEPS.getConnections,
  onboardAnon: STEPS.addAnon,
};

// TEST=onboard && firstTest will copy the first test in TEST_DATA to MOCK
// TEST=onboard && firstTest=false will copy the next test in TEST_DATA
const TEST = TESTS.getConnections;

//#region Database
// very cool json MOCK: https://belphemur.github.io/node-json-MOCK/#appending-in-array

//#region Open data files
// @ts-ignore
const { JsonDB } = require('node-json-db');
// @ts-ignore
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
// when configuring the MOCK, be sure to start with the current dir name,
// otherwise, the data file goes to the parent folder
// or if you start the string with '/' the file will be on the PC's root dir
const MOCK = new JsonDB(new Config('tests/cacheMock', true, true, '/'));

// TESTER: set reset above to true until first test passes
if (reset) {
  warn('Resetting MOCK data');
  MOCK.delete('connections');
}

const TEST_DATA = new JsonDB(new Config('tests/testData', true, true, '/'));
//#endregion Open data files

//#region Helper methods
const mockNewConnection = (conn) => {
  jLog(conn, 'conn :>>');
  MOCK.push('/connections[]', conn, true);
  jLog(MOCK.getData('/'), 'TestData :>>', clc.green);
  log();
};

const getFirstTest = () => {
  const conn = TEST_DATA.getData('/tests[0]');
  mockNewConnection(conn);
  return conn;
};

const getNextTest = () => {
  const idx = MOCK.count('/connections');
  const onboarding = binaryHas(TEST, TESTS.onboard);
  // firstTest must be false if we are in this function
  const conn = onboarding
    ? TEST_DATA.getData(`/tests[${idx}]`)
    : MOCK.getData('/connections[-1]');
  if (onboarding) {
    mockNewConnection(conn);
  }
  return conn;
};

const canAddConnection = (checkNonce) => {
  const okToAdd = isEmpty(find(checkNonce));
  if (!okToAdd) {
    warn(
      `You cannot add a connection to ${checkNonce} because that already exists in Redis`
    );
  }
  return okToAdd;
};

const find = (value, prop = 'userID') =>
  TEST_DATA.find('/', (v) => v[prop] === value);

const getTestResult = (test, result) =>
  isEmpty(result)
    ? error(`Test Failed for ${test}`)
    : success(`Test Passed for ${test}`);
//#endregion Helper methods

//#region Setup Mock
const firstTest = !MOCK.exists('/connections');
const connection = firstTest ? getFirstTest() : getNextTest();
jLog(connection, `${firstTest ? 'Adding first test' : 'TestData.json :>>'}`);
log();
//#endregion

//#endregion Database

notice('Connecting...');
// connect to server and to Redis
// then run tests
app
  .connectMe()
  .then(() => tqr.connectMe())
  .then(() => test());

const test = () => {
  try {
    notice('Testing...');
    if (!TEST) {
      app
        .onTest('Testing')
        .then((ack) => success(`Tests.js: Testing returns: ${ack}`));
    }

    if (binaryHas(TEST, TESTS.onboard)) {
      log('TEST: onAddConnection()...');
      // ensure we don't duplicate AGENCYconnections
      if (firstTest || canAddConnection(connection.nonce)) {
        app
          .onAddConnection(connection)
          .then((newConn) =>
            success(jLog(newConn, 'Test Passed: new connection'))
          )
          .catch((e) => error(jLog(e, 'Error in onAddConnection() chain')));
      }
    }

    if (binaryHas(TEST, TESTS.onboardAnon)) {
      log('TEST: onAddAnonConnection()...');
      app
        .onAddAnonConnection(connection.country)
        .then((newConn) => mockNewConnection(newConn))
        .catch((e) => error(jLog(e, 'Error in onAddAnonConnection() chain')));
    }

    if (binaryHas(TEST, TESTS.getConnections)) {
      console.log('getConnections()...');
      app
        .getConnections(connection.country)
        // TODO better to use Promise.reject() for failed tests
        .then((x) => getTestResult('getConnections', x));
    }

    if (binaryHas(TEST, TESTS.addPromo)) {
      console.log('addPromo()...');
      const key = connection;
      tqr.addPromo(key, {
        name: 'Get Sauced at Pops',
        url: 'https://www.popsouthernbbq.com/menu',
      });
    }

    if (binaryHas(TEST, TESTS.getPromotions)) {
      console.log('calling getPromotions()...');
      tqr.getPromotions();
    }
  } catch (e) {
    error(`Test code failed: 
  ${e.message}
  ${e.stack}`);
  }
};
