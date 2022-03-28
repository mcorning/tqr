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
 * There are two kinds of test data: Data stored in the TestData db, and ENUMs defined in code.
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

//#region Database
// very cool json db: https://belphemur.github.io/node-json-db/#appending-in-array

// @ts-ignore
const { JsonDB } = require('node-json-db');
// @ts-ignore
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
// when configuring the db, be sure to start with the current dir name,
// otherwise, the data file goes to the parent folder
// or if you start the string with '/' the file will be on the PC's root dir
const db = new JsonDB(new Config('tests/TestData', true, true, '/'));

const testData = db.getData('/');
const firstTest = isEmpty(testData);
jLog(testData, `${firstTest ? 'Adding first test' : 'TestData.json :>>'}`);
log();

const pushNewConnection = (conn) => {
  jLog(conn, 'conn :>>');
  db.push('/connections[]', conn, true);
  jLog(db.getData('/'), 'TestData :>>');
  log();
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

const find = (someNonce) =>
  db.find('/connections', (v) => v.nonce === someNonce);

const getIndex = (newNonce) => db.getIndex('/connections', newNonce, 'nonce');

//#endregion Database

// A nonce is a Named-Once string locally unique (at least at country level) that identifies an AGENCY.
// An AGENCY is any legal entity participating in Anonymous Engagement such as TQR.
// An AGENT is any authorized person in an AGENCY (e.g., a store manager).
// You can string NONCES together with the keyDelimiter to make a key for Redis Streams.
// A null NONCE indicates the other (anonymous) party in the engagement.
const NONCES = {
  PopsBbqTruck: 'Pops BBQ Truck',
  BendTruck: 'Bend Truck',
  FoodRepublic: 'Food Republic',
  BreadTalk: 'Bread Talk',
  SuntecCity: 'Suntec City',
};
// Agency is a keyDelimiter-delimited string of Agents beginning with a Pricipal
const AGENCY = {
  PopsBbqTruck: NONCES.PopsBbqTruck,
  PopsBbq_BendTruck: `${NONCES.PopsBbqTruck}${app.keyDelimiter}${NONCES.BendTruck}`,
  FoodRepublic: NONCES.FoodRepublic,
  FoodRepublic_SuntecCity: `${NONCES.FoodRepublic}${app.keyDelimiter}${NONCES.SuntecCity}`,
};

const connection = {
  // country with jurisdiction
  country: '',
  // string key identifying entity in Redis Streams
  nonce: '',
  // generated by Server, stored to and used from TestData
  userID: '',
};

if (firstTest) {
  // TODO Set country to wherever you want to test TQR
  connection.country = 'sg';
  // TODO setup your own entity enum
  connection.nonce = AGENCY.FoodRepublic;
} else {
  const newNonce = NONCES.BreadTalk;
  const idx = getIndex(newNonce);
  log(`index for ${newNonce}: ${idx}`);

  if (idx === -1) {
    connection.country = 'sg';
    connection.nonce = newNonce;
    connection.userID = '';
  } else {
    // TODO Randomize selection of connection
    const conn = db.getData(`/connections[${idx}]`);
    jLog(conn, `${newNonce} :>>`);
    connection.country = conn.country;
    connection.nonce = conn.nonce;
    connection.userID = conn.userID;
  }
}

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

const TEST = TESTS.onboard + TESTS.getConnections;

notice('Connecting...');
// connect to server and to Redis
// then run tests
app.connectMe().then((socket) => test());

const test = () => {
  notice('Testing...');
  if (!TEST) {
    app
      .onTest('Testing')
      .then((ack) => success(`Tests.js: Testing returns: ${ack}`));
  }

  if (binaryHas(TEST, TESTS.onboard)) {
    log('TEST: onAddConnection()...');
    // ensure we don't duplicate AGENCYconnections
    if (canAddConnection(connection.nonce)) {
      app
        .onAddConnection(connection)
        .then((newConn) => pushNewConnection(newConn))
        .catch((e) => error(jLog(e, 'Error in onAddConnection() chain')));
    }
  }
  if (binaryHas(TEST, TESTS.onboardAnon)) {
    log('TEST: onAddAnonConnection()...');
    app
      .onAddAnonConnection(connection.country)
      .then((newConn) => pushNewConnection(newConn))
      .catch((e) => error(jLog(e, 'Error in onAddAnonConnection() chain')));
  }

  if (binaryHas(TEST, TESTS.getConnections)) {
    console.log('getConnections()...');
    app.getConnections(connection.country);
  }

  if (binaryHas(TEST, TESTS.addPromo)) {
    console.log('addPromo()...');
    tqr.addPromo({
      name: 'Get Sauced at Pops',
      url: 'https://www.popsouthernbbq.com/menu',
    });
  }

  if (binaryHas(TEST, TESTS.getPromotions)) {
    console.log('calling getPromotions()...');
    tqr.getPromotions();
  }
};
