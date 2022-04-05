// see https://www.npmjs.com/package/cli-color
const { formatSmallTime, formatTime } = require('./luxonHelpers');
const clc = require('cli-color');
const url = clc.black.bold.bgCyanBright;

//#region Internals
const promisify =
  (func) =>
  (...args) =>
    new Promise((resolve, reject) =>
      func(...args, (err, result) => (err ? reject(err) : resolve(result)))
    );

const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Flattens a (nested) Map returning a flattened array of arrays.
 * @param {Object} map - the map function to apply to the data.
 */
const reduceMapX = (map) =>
  map.reduce((a, c) => {
    a.push([c[0], c[1][1]]);
    return a;
  }, []);
//#endregion

const reduceMap = (map) =>
  map.reduce((a, c) => {
    const key = c[0];
    const value = c[1][0];
    a.push(key, !Array.isArray(value) ? value : value[1]);
    return a;
  }, []);
/** Use this Map/Reduce everywhere
 * It takes a map and reduces it to an array of arrays.
 * @param map - The map to be collapsed/expanded.
 * @param msg - The message to display in the console.
 * @returns The mapArray.
 */
const showMap = (map, msg) => {
  console.group(`app.js: Collapse/Expand for ${msg}`);
  const mapArray = reduceMap(map);
  log(msg);
  table(mapArray);
  console.groupEnd();
  return mapArray;
};

//#endregion Helpers
const trace = (promise, msg = 'results :>>') => {
  console.groupCollapsed(msg);
  console.table(promise);
  console.groupEnd();
  return promise;
};
const safeAck = (ack, data) => {
  if (ack && typeof ack === 'function') {
    ack(data);
  }
};
const binaryHas = (score, val) => (score & val) === val;

function error(e) {
  console.error(clc.red.bold(e));
}
function endSuccess(msg) {
  console.log(clc.bgGreen.black(msg));
}

const head = (val) => (Array.isArray(val) && !isEmpty(val) ? val[0] : '');

function info(msg) {
  console.info(msg);
}

const isEmpty = (val) => val == null || !(Object.keys(val) || val).length;

function jLog(json, msg = 'json >>:', color = clc.white) {
  if (isEmpty(json)) {
    return '';
  }
  const data =
    typeof json[0] === 'function' ? `` : JSON.stringify(json, null, 2);

  const output = `${msg}() ${data}`;
  console.log(color(output));
}

function log(msg = ' ') {
  console.log(msg);
}
function notice(msg, color = clc.cyanBright) {
  console.log(color(`${formatSmallTime()}: ${msg}`));
}
const reducePairsToObject = (arrayOfPairs) =>
  arrayOfPairs.reduce((a, c, i) => {
    if (i % 2 === 0) {
      a[c] = isValidJSON(arrayOfPairs[i + 1])
        ? JSON.parse(arrayOfPairs[i + 1])
        : arrayOfPairs[i + 1];
    }
    return a;
  }, {});

function success(msg) {
  console.log(clc.green(msg));
}
function warn(msg) {
  console.warn(clc.yellow(msg));
}

const compose = (...fns) =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args))
  );
/**
 * Try to construct a table with the columns of the properties of
 * `tabularData`(or use `properties`) and rows of `tabularData` and log it.
 * Falls back to just logging the argument if it can’t be parsed as tabular.
 *
 * ```js
 * // These can't be parsed as tabular data
 * console.table(Symbol());
 * // Symbol()
 *
 * console.table(undefined);
 * // undefined
 *
 * console.table([{ a: 1, b: 'Y' }, { a: 'Z', b: 2 }]);
 * // ┌─────────┬─────┬─────┐
 * // │ (index) │  a  │  b  │
 * // ├─────────┼─────┼─────┤
 * // │    0    │  1  │ 'Y' │
 * // │    1    │ 'Z' │  2  │
 * // └─────────┴─────┴─────┘
 *
 * console.table([{ a: 1, b: 'Y' }, { a: 'Z', b: 2 }], ['a']);
 * // ┌─────────┬─────┐
 * // │ (index) │  a  │
 * // ├─────────┼─────┤
 * // │    0    │  1  │
 * // │    1    │ 'Z' │
 * // └─────────┴─────┘
 * ```
 */
function table(data) {
  console.table(data);
}

module.exports = {
  binaryHas,
  compose,
  clc,
  endSuccess,
  error,
  head,
  info,
  isEmpty,
  jLog,
  log,
  notice,
  success,
  warn,
  formatSmallTime,
  formatTime,
  url,
  reducePairsToObject,
  safeAck,
  showMap,
  table,
  trace,

  promisify,
};
