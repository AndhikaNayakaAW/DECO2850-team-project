import Toybox.Graphics;
import Toybox.Lang;

//! The confirmed fēnix supports vector fonts. Cache them rather than allocating every redraw.
module WatchStyle {
    var _fonts as Dictionary<Number, Graphics.FontType> = {} as Dictionary<Number, Graphics.FontType>;

    function at(size as Number) as Graphics.FontType {
        if (!_fonts.hasKey(size)) {
            var font = Graphics.getVectorFont({ :face => "RobotoCondensedRegular", :size => size });
            _fonts[size] = font != null ? font : Graphics.FONT_XTINY;
        }
        return _fonts[size];
    }
}
