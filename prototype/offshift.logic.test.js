const assert = require('node:assert/strict');
const logic = require('./offshift.logic.js');

const offer = { day: 'Thu', start: '16:00', end: '21:00', rate: 32, break: 30, travel: 35 };
const events = [
  { day: 'Thu', start: '13:00', end: '15:00', title: 'Tutorial', kind: 'study' },
  { day: 'Thu', start: '20:00', end: '22:00', title: 'Dinner', kind: 'personal' },
  { day: 'Fri', start: '10:00', end: '16:00', title: 'Shift', kind: 'work' }
];

assert.equal(logic.minutes('16:00'), 960);
assert.equal(logic.overlap('16:00', '21:00', '20:00', '22:00'), true);
assert.equal(logic.paidMinutes(offer), 270);
assert.equal(logic.income(offer), 144);
assert.equal(logic.shiftImpact(offer, events).travelBuffer, 25);
assert.equal(logic.shiftImpact(offer, events).restMinutes, 780);
assert.deepEqual(
  logic.orderByPriority(['travel', 'study', 'income'], ['income', 'study', 'travel']),
  ['income', 'study', 'travel']
);
console.log('offshift.logic: all tests passed');
