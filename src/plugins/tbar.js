"use strict";

Hive.Plugins.tbar = class {
  static genAccessors(h) {
    let dFcn = this.tbar();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods;
  }

  static tbar () {
    let cfg={};

    let gen = function(d){
      let rx = cfg.x(d); // resolve all values
      let ry = cfg.y(d);
      let rw = cfg.h.getDrawWidth(cfg.ls.sa.x(), cfg.width());
      let rv = cfg.v(d);
      return `M${rx} ${ry} L${rx} ${rv} M${rx-(rw/2)} ${ry} L${rx+(rw/2)} ${ry} Z`
    }

    let methods = ['x','y', 'v', 'width', 'h', 'ls'];
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

      let dFcn = h.configGen(this.tbar().h(h).ls(ls), cfg, ls, item);
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
          frame:'chart center-container > view', v:0, width:.3, attr:{stroke:'black', 'stroke-width':1}
        }
  }

}
