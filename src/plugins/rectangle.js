"use strict";

Hive.Plugins.rectangle = class {

  static genAccessors(h) {
    let dFcn = this.rectangle();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods.concat('rotate');
  }

  static rectangle () {
    let cfg = {};

    let shapeFcn = [
      (x, y, w, v) => `M ${x}, ${v} L${x-(w/2)} ${v} L${x-(w/2)} ${y} L${x+(w/2)} ${y} L${x+(w/2)} ${v} L${x} ${v} Z`,
      (x, y, w, v) => `M ${x}, ${y} L${x+w} ${y} L${x+w} ${y-v} L${x} ${y-v} L${x} ${y} Z`,
    ];

    let gen = function(d){
      if (cfg.widthIsFraction)
        return shapeFcn[cfg.shape(d)](cfg.x(d), cfg.y(d), cfg.h.getDrawWidth(cfg.ls.sa.x(), cfg.width()), cfg.v(d));
      else
        return shapeFcn[cfg.shape(d)](cfg.x(d), cfg.y(d), cfg.ls.sa.width(d), cfg.v(d));
    }

    let methods = ['x','y', 'v', 'width', 'widthIsFraction', 'shape', 'h', 'ls'];
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
    cfg.widthIsFraction = false;

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

      let dFcn = h.configGen(this.rectangle().h(h).ls(ls), cfg, ls, item);
      if (typeof cfg.width == 'number')
        dFcn.widthIsFraction(true);

      let c = {
        d:dFcn(item),
        data:item,
        cfg:cfg,
        layerState:ls,
        target:'path'
      };
      let rv = h.configElement(c);

      if (h.getObjPath(cfg, 'opt.rotateOrigin') == 'xy') {
        rv.e.setAttribute('transform', `rotate(${ls.sa.rotate(item)},${ls.sa.x(item)},${ls.sa.y(item)})`);
      } else {
        rv.e.setAttribute('transform', `rotate(${ls.sa.rotate(item)},0,0)`);
      }

      let attr = { // create alt points for popup
        'id':rv.attr.id + '-alt',
        'r':0,
        'opacity':0,
        'stroke-opacity':0,
        cx:ls.sa.x(item),
        cy:ls.sa.y(item)
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
          frame:'chart center-container > view', v:0, width:.3, shape:0, rotate:0, attr:{
            fill:"orange", stroke:'black', 'stroke-width':0
          }
        }
  }
}
