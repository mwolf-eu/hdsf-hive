"use strict";

Hive.Plugins.node = class {
  static genAccessors(h) {
    let dFcn = this.node();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function');
    return methods;
  }

  static node () {
    let cfg = {};
    let imgDict = {};

    let gen = function(d){

      if (!(cfg.sym(d) in imgDict)){
        var request = new XMLHttpRequest();
          request.open('GET', cfg.path(d)+cfg.sym(d)+'.svg', false);  // `false` makes the request synchronous
          request.send(null);
          imgDict[cfg.sym(d)] = request.status===200?request.responseXML.rootElement:null;
      }

      let locGrp;
      if (imgDict[cfg.sym(d)] != null){

        let e = imgDict[cfg.sym(d)].cloneNode(true);

        let vb = e.getAttribute("viewBox").split(' ');
        let vw = vb[2];
        let vh = vb[3];

        // Importing svgs within svgs yields inconsistent results.
        // So, create a new group and append transformed children of svg.
        let attr = {
          transform:`translate(${cfg.x(d)-(cfg.size(d)/2)} ${cfg.y(d)-(cfg.size(d)/2)}) scale(${cfg.size(d)/vw})`,
        };
        locGrp = cfg.h.createElement(attr, 'g', cfg.ls.g);
        locGrp.append(...e.childNodes);
      }

      return locGrp;
    }

    let methods = ['x', 'y', 'size', 'path', 'sym', 'h', 'ls'];
    methods.forEach((item, i) => {
      cfg[item] = d => d;
      gen[item] = function(d){
        if (d) {
          cfg[item] = d;
          return this;
        } else return cfg[item];
      }
    });

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

    let element = h.configGen(this.node().h(h).ls(ls), cfg, ls);

    ls.d.forEach((item, j) => {
      let c = {
        data:item,
        cfg:cfg,
        layerState:ls,
        target:element(item)
      };

      let rv = h.configElement(c);
      d3.select(ls.g).selectAll('*').attr('data-svgid',rv.attr.id) // for popups
    });
  }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults() {
    return {frame:'basic center-view', y:0, size:'15', path:'/nopath/', sym:'noimg'}
  }
}
