// very cool json MOCK: https://belphemur.github.io/node-json-MOCK/#appending-in-array

//#region Open data files
// @ts-ignore
const { JsonDB } = require('node-json-db');
// @ts-ignore
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

const TEST_DATA = new JsonDB(new Config('tests/testData', true, true, '/'));
//#endregion Open data files

//#region Helper methods

const findTest = (value, prop = 'userID') =>
  TEST_DATA.find('/', (v) => v[prop] === value);

const getConnections = () =>
  TEST_DATA.getData('/tests/').reduce((a, c) => {
    a.push({ country: c.country, nonce: c.nonce });
    return a;
  }, []);

const getConnectionsWithPromos = () =>
  TEST_DATA.filter('/tests/', (v) => v.promotions);

//#endregion Helper methods

module.exports = { findTest, getConnections, getConnectionsWithPromos };
