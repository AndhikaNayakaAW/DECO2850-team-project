import Toybox.Lang;

//! The biggest rise from any earlier low point: how much Body Battery came back.
(:background)
class RiseTracker {
    private var _lowest as Number?;
    private var _best as Number?;

    function initialize() {
    }

    function add(value as Number) as Void {
        if (_lowest != null && (_best == null || value - _lowest > _best)) {
            _best = value - _lowest;
        }
        if (_lowest == null || value < _lowest) {
            _lowest = value;
        }
    }

    //! Null when it never rose, which says nothing about the night.
    function best() as Number? {
        return (_best != null && _best > 0) ? _best : null;
    }
}

//! The lowest half-hour average, which is how Garmin finds a resting heart rate.
(:background)
class HalfHourTracker {
    private var _slot as Number?;
    private var _sum as Number = 0;
    private var _count as Number = 0;
    private var _lowest as Number?;

    function initialize() {
    }

    function add(seconds as Number, value as Number) as Void {
        var slot = seconds / 1800;
        if (_slot != null && slot != _slot) {
            close();
        }
        _slot = slot;
        _sum += value;
        _count += 1;
    }

    function lowest() as Number? {
        close();
        return _lowest;
    }

    //! A half hour counts once it has at least three real samples.
    private function close() as Void {
        if (_count >= 3) {
            var average = _sum / _count;
            if (_lowest == null || average < _lowest) {
                _lowest = average;
            }
        }
        _sum = 0;
        _count = 0;
    }
}
