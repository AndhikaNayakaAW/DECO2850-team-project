(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OffshiftLogic = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  function minutes(time) {
    var parts = String(time || '0:0').split(':').map(Number);
    return (parts[0] * 60) + parts[1];
  }

  function overlap(aStart, aEnd, bStart, bEnd) {
    return minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);
  }

  function paidMinutes(shift) {
    return Math.max(0, minutes(shift.end) - minutes(shift.start) - Number(shift.break || 0));
  }

  function income(shift) {
    return Math.round((paidMinutes(shift) / 60) * Number(shift.rate || 0) * 100) / 100;
  }

  function dayIndex(day) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day);
  }

  function shiftImpact(shift, events) {
    var dayEvents = (events || []).filter(function (event) { return event.day === shift.day; });
    var previous = dayEvents.filter(function (event) { return minutes(event.end) <= minutes(shift.start); })
      .sort(function (a, b) { return minutes(b.end) - minutes(a.end); })[0];
    var next = (events || []).filter(function (event) {
      return dayIndex(event.day) > dayIndex(shift.day) ||
        (event.day === shift.day && minutes(event.start) >= minutes(shift.end));
    }).sort(function (a, b) {
      return (dayIndex(a.day) * 1440 + minutes(a.start)) - (dayIndex(b.day) * 1440 + minutes(b.start));
    })[0];
    var conflicts = dayEvents.filter(function (event) {
      return overlap(shift.start, shift.end, event.start, event.end);
    });
    var gap = previous ? minutes(shift.start) - minutes(previous.end) : null;
    var restMinutes = next ? (dayIndex(next.day) - dayIndex(shift.day)) * 1440 + minutes(next.start) - minutes(shift.end) : null;
    return {
      conflicts: conflicts,
      travelBuffer: gap === null ? null : gap - Number(shift.travel || 0),
      restMinutes: restMinutes,
      paidMinutes: paidMinutes(shift),
      income: income(shift)
    };
  }

  function orderByPriority(items, priorities) {
    return items.slice().sort(function (a, b) {
      return priorities.indexOf(a) - priorities.indexOf(b);
    });
  }

  return { minutes, overlap, paidMinutes, income, shiftImpact, orderByPriority };
});
