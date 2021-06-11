"use strict";

Hive.Plugins.link = class {

  static genAccessors(h) {
    let dFcn = this.link();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods;
  }

  static link () {
    let cfg = {};

    let gen = function(d){
      let sx = cfg.sx(d);
      let sy = cfg.sy(d);
      let tx = cfg.tx(d);
      let ty = cfg.ty(d);

      let orientation = cfg.orientation;
      if (cfg.orientation == 'auto') {
        orientation = 'linkVertical';
        let dx = sx-tx;
        let dy = sy-ty;
        if (Math.abs(dx) > Math.abs(dy))  // mostly horiz
          orientation = 'linkHorizontal';
      }
      // why did d3 bundle the coords unlike all other generators?
      let path = d3[orientation]().source(d=>[sx,sy]).target(d=>[tx,ty])(d);
      return path;
    }

    // both h/v have same methods
    let methods = ['sx', 'sy', 'tx', 'ty', 'orientation'];
    methods.forEach((item, i) => {
      cfg[item] = d => d;
      gen[item] = function(d){
        if (d) {
          cfg[item] = d;
          return this;
        } else return cfg[item];
      }
    });
    cfg.orientation = 'auto';

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
  static draw (cfg, h, ls) {
    let dFcn = h.configGen(this.link(), cfg, ls);

    ls.d.forEach((item, i) => {
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
          frame:'basic center-view', orientation:'auto', attr:{'fill':'none', 'fill-opacity':0, 'stroke-width':1}
        }
  }
}

// export {edge as "Hive.Plugins.edge"}
