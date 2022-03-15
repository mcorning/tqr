const { DateTime, Interval } = require('luxon');
const { parseDate } = require('pratica');

const visitFormat = 'HH:mm ccc, DD';
const calendarFormat = 'yyyy-LL-dd hh:mm';

// TODO Good candidate for pointfree style
/**
 *
 * @param {*} date is ISODate string
 * @param {*} time can be null or a time literal
 * @param {*} incr can be null or number of minutes
 * @returns         rounded milliseconds
 */
const safeDateTime = (date, time, incr) => {
  console.log(date, time, incr);
  const dateString = time ? `${date}T${time}` : date;
  // if no time, date is irrelevant because we default to now
  const dt = time ? DateTime.fromISO(dateString) : t();
  return incr ? dt.plus({ minutes: incr }) : dt;
};

// using Luxon Presets
const t = () => DateTime.now();

const roundTime = (time = DateTime.now(), down = true) => {
  const roundTo = 15; // minutes
  const roundDownTime = roundTo * 60 * 1000;

  return down
    ? time - (time % roundDownTime)
    : time + (roundDownTime - (time % roundDownTime));
};

const startRounded = () => roundTime(t().toMillis());

const endRounded = () => roundTime(tPlusOne().toMillis());

const startTimeString = () => formatSmallTime();

const endTimeString = () => formatSmallTime(tPlusOne().toMillis());

const tPlusOne = (avgStay = 30) => {
  // using Luxon Presets
  const n = DateTime.now();
  console.log('n:', n.toLocaleString(DateTime.TIME_SIMPLE));
  console.log('avgStay:', avgStay);
  const nplus = n.plus({ minutes: avgStay });
  console.log('nplus:', nplus.toLocaleString(DateTime.TIME_SIMPLE));

  return nplus;
};
const getNow = (format = DateTime.TIME_24_WITH_SECONDS) =>
  DateTime.now().toLocaleString(format);

const getNowAsMillis = () => DateTime.now().toMillis();

const getNowAsIso = () => DateTime.now().toISO();

const isToday = (dateString) => {
  const dt1 = DateTime.fromISO(dateString);
  return dt1.toLocaleString() === DateTime.now().toLocaleString();
};

/**
 *
 * @param {*} dateString is an ISO date string for universal use
 * @returns true if date is tomorrow
 */

const isTomorrow = (dateString) => {
  const dayAfterTomorrow = DateTime.now()
    .plus({ day: 2 })
    .set({ hours: 0, minutes: 0, seconds: 0, millisecond: 0 });

  const tomorrow = DateTime.now().plus({ day: 1 }).set({
    hours: 0,
    minutes: 0,
    seconds: 0,
    millisecond: 0,
  });

  const testDateTime = DateTime.fromISO(dateString);

  // order matters
  return Interval.fromDateTimes(tomorrow, dayAfterTomorrow).contains(
    testDateTime
  );
};

const isYesterday = (dateString) => {
  const yesterday = DateTime.now().minus({ day: 1 }).set({
    hours: 0,
    minutes: 0,
    seconds: 0,
    millisecond: 0,
  });
  const midnight = DateTime.now().set({
    hours: 0,
    minutes: 0,
    seconds: 0,
    millisecond: 0,
  });
  const testDateTime = DateTime.fromISO(dateString);

  // order matters
  return Interval.fromDateTimes(yesterday, midnight).contains(testDateTime);
};

const isBetween = (dateString, daysBack) => {
  const past = DateTime.now().minus({ day: daysBack });
  const tomorrow = DateTime.now().plus({ day: 1 });
  return Interval.fromDateTimes(past, tomorrow).contains(
    DateTime.fromISO(dateString)
  );
};

const userSince = (then) => {
  const i = Interval.fromDateTimes(then, DateTime.now());
  return i.length('days');
};

const formatVisitedDate = (date) =>
  DateTime.fromISO(date).toFormat(visitFormat);

const formatDate = (time = Date.now()) =>
  DateTime.fromMillis(time).toLocaleString(DateTime.DATE_MED);

const formatTime = (time = Date.now()) =>
  DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_SHORT);

const formatSmallTime = (time = Date.now()) =>
  DateTime.fromMillis(time).toLocaleString(DateTime.TIME_SIMPLE);

const formatSmallTimeBare = (time = Date.now()) =>
  DateTime.fromMillis(time).toFormat('h:mm');

const getVisitDate = () => DateTime.now().toFormat(calendarFormat);

const showCurrentMilitaryTime = () =>
  DateTime.now().minus({ minute: 15 }).toLocaleString(DateTime.TIME_24_SIMPLE);

// takes an old time and two time strings
// returns the new time as the difference between intervals
const updateTime = (time, newVal, oldVal) => {
  if (!time) {
    console.log('Need a time to manipulate');
    return;
  }
  const newHrsMins = newVal.split(':');
  const oldHrsMins = oldVal.split(':');

  const hrs = Number(newHrsMins[0]) - Number(oldHrsMins[0]);
  const mins = Number(newHrsMins[1]) - Number(oldHrsMins[1]);
  const hrsInMs = hrs * 3_600_000;
  const minsInMs = mins * 60_000;
  const totalMs = hrsInMs + minsInMs;
  console.log(time);
  console.log(`Time difference in hrs: ${hrs} and mins: ${mins}`);
  console.log(
    `Time difference in msHrs: ${hrsInMs} and msMins: ${minsInMs} for total of: ${totalMs} ms`
  );
  const newTime = time + hrs * 3_600_000 + mins * 60_000;
  console.log(
    `Ms difference in original: ${time} and updated: ${newTime} is ${
      newTime - time
    } ms`
  );
  console.log('newTime:', newTime, formatTime(newTime));

  return newTime;
};

const inFuture = (date) => {
  const getDateValue = () => {
    const dateType = typeof date;
    switch (dateType) {
      case 'Number':
        return date > DateTime.now();
      case 'String':
        return DateTime.fromISO(date) > DateTime.now();
    }
  };

  parseDate(date).cata({
    Just: () => getDateValue(),
    Nothing: (results) => {
      console.log(results, 'No date to parse');
    },
  });
};

const yesterdayAsISO = () => {
  const y = t().minus({ days: 1 });
  return y.toISO();
};
const todayAsISO = () => t().toISO();

const tomorrowAsISO = () => {
  const y = t().plus({ days: 1 });
  return y.toISO();
};
const datesBack = (daysBack) => {
  const dayBeforeYesterday = 1;
  return Array.from({ length: daysBack }, (_, idx) =>
    DateTime.now()
      .minus({ days: daysBack - idx + dayBeforeYesterday })
      .toLocaleString(DateTime.DATE_MED)
  );
};
const datesAhead = (daysAhead) => {
  const dayAfterTomorrow = 2;
  return Array.from({ length: daysAhead }, (_, idx) =>
    DateTime.now()
      .plus({ days: idx + dayAfterTomorrow })
      .toLocaleString(DateTime.DATE_MED)
  );
};

const formatDateWithToken = (dt, token) =>
  DateTime.fromISO(dt).toLocaleString(token);
const formatMillisWithToken = (dt, token) =>
  DateTime.fromMillis(dt).toLocaleString(token);

const formatDateAsISO = (jsDate) => DateTime.fromJSDate(jsDate).toISO();

const asHour = ({ dateTime, padded = true, military }) => {
  const checkForPadding = padded ? 'hh' : 'h';
  const format = military ? 'HH' : checkForPadding;
  return dateTime.toFormat(format);
};
const asMinute = ({ dateTime, padded = true, military }) => {
  const checkForPadding = padded ? 'mm a' : 'm a';
  const format = military ? 'mm' : checkForPadding;
  return dateTime.toFormat(format);
};
const makeInterval = (start, end) =>
  Interval.fromDateTimes(
    DateTime.fromMillis(Number(start)),
    DateTime.fromMillis(Number(end))
  );

module.exports = {
  DateTime,
  Interval,
  asHour,
  asMinute,
  getNow,
  getNowAsMillis,
  getNowAsIso,
  inFuture,
  isToday,
  isBetween,
  isTomorrow,
  isYesterday,
  formatDate,
  formatSmallTime,
  formatSmallTimeBare,
  formatTime,
  formatVisitedDate,
  makeInterval,
  getVisitDate,
  roundTime,
  showCurrentMilitaryTime,
  updateTime,
  t,
  tPlusOne,
  userSince,
  todayAsISO,
  yesterdayAsISO,
  tomorrowAsISO,
  datesBack,
  datesAhead,
  formatDateWithToken,
  formatMillisWithToken,
  formatDateAsISO,
  startRounded,
  endRounded,
  startTimeString,
  endTimeString,
  parseDate,
  safeDateTime,
};
