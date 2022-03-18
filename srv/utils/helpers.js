// see https://www.npmjs.com/package/cli-color
const { formatSmallTime, formatTime } = require('./luxonHelpers');
const clc = require('cli-color');
const url = clc.black.bold.bgCyanBright;

//#region Internals
const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};
//#endregion

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
  const output = `${msg} ${JSON.stringify(json, null, 3)}`;
  console.log(color(output));
}

function log(msg = ' ') {
  console.log(msg);
}
function notice(msg) {
  console.log(clc.cyanBright(`${formatSmallTime()}: ${msg}`));
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
  table,
};
