const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');

// The first argument is the database filename. If no extension, '.json' is assumed and automatically added.
// The second argument is used to tell the DB to save after each push
// If you put false, you'll have to call the save() method.
// The third argument is to ask JsonDB to save the database in an human readable format. (default false)
// The last argument is the separator. By default it's slash (/)
var db = new JsonDB(new Config('tests/TestData', true, false, '/'));
let data = db.getData('/');
console.log(JSON.stringify(data, null, 3));
const setup = false;
const find = (someNonce) =>
  db.find('/connections', (v) => v.nonce === someNonce);

if (setup) {
  // Pushing the data into the database
  // With the wanted DataPath
  // By default the push will override the old value
  db.push(
    '/nonces[0]',
    {
      country: 'sg',
      nonce: 'FoodRepublic',
      userID: '1647651211684-0',
    },
    true
  );

  // It also create automatically the hierarchy when pushing new data for a DataPath that doesn't exists
  // db.push('/test2/my/test', 5);

  // You can also push directly objects
  // db.push('/test3', { test: 'test', json: { test: ['test'] } });

  // Get the data from the root
  data = db.getData('/');
  console.log(JSON.stringify(data, null, 3));
  // From a particular DataPath
  db.push(
    '/nonces[]',
    {
      country: 'sg',
      nonce: 'BreadTalk',
      userID: '1647651211769-0',
    },
    true
  );
  data = db.getData('/');
  console.log(JSON.stringify(data, null, 3));
}
console.log(find('Food Republic'));
