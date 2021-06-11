"use strict";

Hive.Plugins.errorbar = class {
  static genAccessors(h) {
    let dFcn = this.errorbar();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods;
  }

  static errorbar () {
    let cfg = {};

    let gen = function(d){

      let wl = cfg.h.getDrawWidth(cfg.ls.sa.x(), cfg.whiskerLen());

      let getPath = (x, y0, y1, wl) =>
        `M${x} ${y1} L${x} ${y0}
          M${x-(wl/2)} ${y1} L${x+(wl/2)} ${y1}
          M${x-(wl/2)} ${y0} L${x+(wl/2)} ${y0}`;

      return getPath(cfg.x(d), cfg.y0(d), cfg.y1(d), wl);
    }

    let methods = ['x', 'y0', 'y1', 'whiskerLen', 'h', 'ls'];
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
      let dFcn = h.configGen(this.errorbar().h(h).ls(ls), cfg, ls, item);
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
          frame:'chart center-container > view', whiskerLen:.3, y:0, min:0, max:0,
          attr:{stroke:'black', 'stroke-width':1}
        }
  }

}
