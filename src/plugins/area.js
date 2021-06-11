"use strict";

Hive.Plugins.area = class {

  static genAccessors() {
    let dFcn = d3.area()
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function')
                        .map(d => d=='curve'?`(${d})`:d);
    return methods.concat('x1');
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

    if (!(Array.isArray(ls.d[0]))) ls.d = [ls.d];

    ls.d.forEach((item, j) => {
      let dFcn = h.configGen(d3.area(), cfg, ls, item[0]); // configure shape generator

      let c = {
        d:dFcn(item),
        data:item[0],
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
          frame:'chart center-container > view', attr:{
            fill:"#e9bcb733", stroke:"rgb(0,0,0)", 'stroke-width':0
          }
        }
  }
}
