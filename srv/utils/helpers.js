// see https://www.npmjs.com/package/cli-color
const { formatSmallTime, formatTime } = require('./luxonHelpers');
const clc = require('cli-color');
const url = clc.black.bold.bgCyanBright;

function error(msg) {
  console.error(clc.red.bold(msg));
}
function endSuccess(msg) {
  console.log(clc.bgGreen.black(msg));
}
function info(msg) {
  console.info(msg);
}
function jLog(json, msg = 'json >>:', color = clc.white) {
  const output = `${msg} ${JSON.stringify(json, null, 3)}`;
  console.log(color(output));
}

function log(msg = ' ') {
  console.log(msg);
}
function notice(msg) {
  console.log(clc.blue(`${formatSmallTime()}: ${msg}`));
}
function success(msg) {
  console.log(clc.green(msg));
}
function warn(msg) {
  console.warn(clc.yellow(msg));
}

module.exports = {
  clc,
  endSuccess,
  error,
  info,
  jLog,
  log,
  notice,
  success,
  warn,
  formatSmallTime,
  formatTime,
  url,
};
