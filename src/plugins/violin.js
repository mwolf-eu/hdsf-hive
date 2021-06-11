"use strict";

Hive.Plugins.violin = class {

  static violin() {
    let dFcn = d3.area();
    let band = d => 0;
    let bandwidth = d => 10;

    let gen = function(d){
      return dFcn(d);
    }

    // inherit all methods
    let methods = Object.keys(dFcn);
    methods.forEach((m, i) => {
      gen[m] = function(d){
        dFcn[m](d);
        return(this);
      }
    });

    gen.area_x = dFcn.x;

    // redefine x
    gen.x = function(d){
      if (d) {
        dFcn.x0((e) => ( (bandwidth(d(e))/2) + band(e)));
        dFcn.x1((e) => (-(bandwidth(d(e))/2) + band(e)));

        return this;
      } else return([dFcn.x0(),dFcn.x1()]);
    }

    gen.band = function(d){
      if (d) {
        band = d;
        return this;
      } else return band;
    }

    gen.bandwidth = function(d){
      if (d) {
        bandwidth = d;
        return this;
      } else return bandwidth;
    }

    return(gen);
  }


  static genAccessors(h) {
    let dFcn = this.violin();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function')
                        .map(d => d=='curve'?`(${d})`:d);
    return methods.concat('x');
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

    let dFcn = h.configGen(this.violin(), cfg, ls);
    dFcn.bandwidth(d=>h.getDrawWidth(ls.sa.band(), d)); // violin width

    ls.d.forEach((item, j) => {
      let c = {
        d:dFcn(item),
        data:item,
        cfg:cfg,
        layerState:ls,
        target:'path',
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
          frame:'chart center-container > view', attr:{fill:"rgb(0,0,0)", 'stroke-width':0}
        }
  }

}
