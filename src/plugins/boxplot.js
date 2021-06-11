"use strict";

Hive.Plugins.boxplot = class {
  static genAccessors(h) {
    let dFcn = this.boxplot();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods;
  }

  static boxplot () {
    let cfg = {};

    let gen = function(d){

      let w = cfg.h.getDrawWidth(cfg.ls.sa.x(), cfg.width());
      let nw = cfg.h.getDrawWidth(cfg.ls.sa.x(), cfg.notchWidth());
      let wl = cfg.h.getDrawWidth(cfg.ls.sa.x(), cfg.whiskerLen());

      let getPath = (x,y,min,max,lower,upper,notchLower,notchUpper,w,wl,nl) =>
        `M${x} ${max} L${x} ${upper}
         L${x+(w/2)} ${upper} L${x+(w/2)} ${notchUpper}
         L${x+(nl/2)} ${y} L${x-(nl/2)} ${y}
         L${x-(w/2)} ${notchUpper} L${x-(w/2)} ${upper}
         L${x} ${upper}
         M${x} ${min} L${x} ${lower}
         L${x+(w/2)} ${lower} L${x+(w/2)} ${notchLower}
         L${x+(nl/2)} ${y} L${x-(nl/2)} ${y}
         L${x-(w/2)} ${notchLower} L${x-(w/2)} ${lower}
         L${x} ${lower}
         M${x-(wl/2)} ${max} L${x+(wl/2)} ${max}
         M${x-(wl/2)} ${min} L${x+(wl/2)} ${min}`;

      return getPath(cfg.x(d), cfg.y(d), cfg.min(d), cfg.max(d), cfg.lower(d), cfg.upper(d),
                      cfg.notchLower(d), cfg.notchUpper(d), w, wl, nw);
    }

    let methods = ['x','y', 'min', 'max', 'lower', 'upper', 'notchLower', 'notchUpper',
                    'width', 'notchWidth', 'whiskerLen', 'h', 'ls'];
    methods.forEach((item, i) => {
      cfg[item] = d => d;
      gen[item] = function(d){
        if (d) {
          cfg[item] = d;
          return this;
        } else return cfg[item];
      }
    });

    cfg.h = null;
    cfg.ls = null;

    return(gen);
  }

  /**
  * Appends elements to the provided group
  *
  * @param object The plugin configuration
  * @param object The group element to attach to
  * @param object Relative sizing keys for this frame
  * @param object The visualization Object
  * @return none
  */
  static draw(cfg, h, ls) {

    ls.d.forEach((item, j) => {
      let dFcn = h.configGen(this.boxplot().h(h).ls(ls), cfg, ls, item);
      let c = {
        d:dFcn(item),
        data:item,
        cfg:cfg,
        layerState:ls,
        target:'path'
      };
      let rv = h.configElement(c);
    });
  }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults() {
    return {
          frame:'chart center-container > view', whiskerLen:.3, width:.3, notchWidth:.25,
          attr:{fill:'white', opacity:.5, stroke:'black', 'stroke-width':2}
        }
  }

}
