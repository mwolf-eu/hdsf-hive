"use strict";
import '../text.js';

Hive.Plugins.label = class {

  static genAccessors(h) {
    let dFcn = this.text();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods;
  }

  static text() {
    let cfg = {};
    let parentVal = undefined;

    let create = function(d) {

      let attr={
        x:cfg.x(d),
        y:cfg.y(d)
      };
      let element = cfg.h.createElement(attr, 'text', parentVal);
      element.textContent = cfg.content(d);

      return element;
    }

    let gen = function(d){
      return create(d);
    }

    let methods = ['x', 'y', 'content', 'parent', 'h'];
    methods.forEach((item, i) => {
      cfg[item] = d => d;
      gen[item] = function(d){
        if (d) {
          cfg[item] = d;
          return this;
        } else return cfg[item];
      }
    });

    cfg.h = {};
    cfg.content = d => '';

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
      let txtFcn = this.text().h(h).parent(ls.g);
      h.configGen(txtFcn, cfg, ls, item);
      let c = {
        data:item,
        cfg:cfg,
        layerState:ls,
        target:txtFcn(item)
      };
      let rv = h.configElement(c);

      let bandwidth = ls.sa.x.bandwidth;
      let text = h.getObjPath(cfg, 'opt.text');
      let textSA = {};  // hold those props in text that are scaled accessors
      ['textAnchor','pad','rotate'].forEach((prop, i) => {
        if (prop in (text||{}))
          textSA[prop] = ls.sa[`opt.text.${prop}`](item);
      });

      let txtrv;
      if (text)
        txtrv = Hive.Text.replace(rv.e, {vh:ls.rk['bbox.h'], vw:ls.rk['bbox.w'], bw:bandwidth?bandwidth():10, text:{...text, ...textSA}});

      if (text) // set-up template feedback handlers
        ls.template.calls.push(['setTextHeight', txtrv.h]);

      // h.template(frame, name, value);
      rv.e.setAttribute('class', 'plugin-label'); // THREE uses this to selectively not apply rotation
    });
  }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults(cfg) {
    let frame = 'chart center-container > view'; // normal label
    if (!('x' in cfg)) frame = 'basic > left-container > title > text'; // title

    return {
          frame:frame, data:'_zero_', x:0, y:0,
          content:"Lorem ipsum", attr:{
            fill:"#333333",
            'font-family':"Roboto",
            'font-size':14,
            'font-style':"normal",
          }
        }
  }
}
