"use strict";

Hive.Plugins.arc = class {

  static genAccessors() {
    let dFcn = d3.arc();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => d!='centroid')
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods;
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

      let dFcn = h.configGen(d3.arc(), cfg, ls, item);

      let c = {
        d:dFcn(item),
        data:item,
        cfg:cfg,
        layerState:ls,
        target:'path'
      };
      let rv = h.configElement(c);

      let centroid = dFcn.centroid(item);
      let attr = { // create alt points for popup
        'id':rv.attr.id + '-alt',
        'r':0,
        'fill-opacity':0,
        'stroke-opacity':0,
        cx:centroid[0],
        cy:centroid[1]
      };
      h.createElement(attr, 'circle', ls.g);

    });
  }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults() {
    return {
          frame:'basic center-view', attr:{
            fill:"orange", stroke:"rgb(0,0,0)", 'stroke-width':0
          }
        }
  }
}
