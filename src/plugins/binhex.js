"use strict";

Hive.Plugins.binhex = class {

  static genAccessors() {
    let dFcn = d3.hexbin();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
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

    let binhexData = [];
    let bhGen = h.configGen(d3.hexbin(), cfg, ls);

    let maxX = ls.sa.x().range()[1];
    let maxY = ls.sa.y().range()[1];
    bhGen.extent([[0,0], [maxX, maxY]]);

    bhGen(ls.d).forEach((item, j) => {
      ls.d = binhexData;
      let data = {qty:item.length-2}
      binhexData.push(data);

      let c = {
        d:bhGen.hexagon(),
        data:data,
        cfg:cfg,
        layerState:ls,
        target:'path'
      };
      let rv = h.configElement(c);
      rv.e.setAttribute('transform', `translate(${item.x} ${item.y})`)
    });
  }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults() {
    return {
          frame:'chart center-container > view', radius:10, attr:{
            color:"fill", stroke:"rgb(0,0,0)", 'stroke-width':.5
          },
          opt:{clip:true}
        }
  }

}
