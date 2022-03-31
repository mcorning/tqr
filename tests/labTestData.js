const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

// The first argument is the database filename. If no extension, '.json' is assumed and automatically added.
// The second argument is used to tell the DB to save after each push
// If you put false, you'll have to call the save() method.
// The third argument is to ask JsonDB to save the database in an human readable format. (default false)
// The last argument is the separator. By default it's slash (/)
var db = new JsonDB(new Config('tests/TestData', true, false, '/'));
let data = db.getData('/');

console.groupCollapsed('Expand for contents of testData.json');
console.log('All data:\n', JSON.stringify(data, null, 3));
console.groupEnd();

const find = (value, prop = 'userID') =>
  db.find('/tests', (v) => v[prop] === value);

const foundUserID = find('1648574962223-0');
const foundNonce = find('FoodRepublic@SuntecCity', 'nonce');
const idx = 0;

console.log('Found userID:\n', JSON.stringify(foundUserID, null, 2));
console.log(' ');
console.log('Found nonce:\n', JSON.stringify(foundNonce, null, 3));

const conn = db.getData(`/tests[${idx}]`);
console.log(' ');
console.log('Data by index:\n', JSON.stringify(conn, null, 3));

console.log();
