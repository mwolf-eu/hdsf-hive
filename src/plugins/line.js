"use strict";

Hive.Plugins.line = class {

  static genAccessors() {
    let dFcn = d3.line()
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d]() == 'function')
                        .map(d => d=='curve'?`(${d})`:d);
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
  static draw (cfg, h, ls) {

    if (!(Array.isArray(ls.d[0]))) ls.d = [ls.d];

    ls.d.forEach((item, j) => {
      let dFcn = h.configGen(d3.line(), cfg, ls, item[0]); // configure shape generator

      let c = {
        d:dFcn(item),
        data:item[0],
        cfg:cfg,
        layerState:ls,
        target:'path'
      };
      let rv = h.configElement(c);
    });

    // var dFcn = d3.line();
    // ['x', 'y', 'defined'].forEach((k, i) => { // assign accessors
    //   if (ls.sa[k])
    //     dFcn = dFcn[k](ls.sa[k]);
    //   else
    //     if (cfg[k]) dFcn = dFcn[k](cfg[k]);  // eg  .defined()
    // });

    // marker-end not supported in paperjs
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/marker-end
    // d3.select(g).append("defs").append("marker")
    //     .attr("id", "triangle")
    //     .attr("refX", 1) /*must be smarter way to calculate shift*/
    //     .attr("refY", 5)
    //     .attr("markerUnits", "strokeWidth")
    //     .attr("markerWidth", 10)
    //     .attr("markerHeight", 10)
    //     .attr("orient", "auto")
    //     .append("path")
    //         .attr("d", "M 0 0 L 10 5 L 0 10 z")
    //         .attr('fill', 'red');

    // let data = ls.d;
    // if (!(Array.isArray(data[0]))) data = [data];
    //
    // data.forEach((item, j) => {
    //
    //   dFcn.curve(ls.sa.curve(item[0]));
    //   let attr = {
    //     // "marker-end":"url(#triangle)",
    //     'id':`${ls.g.id}-${cfg.id}-${j}`,
    //     "d":dFcn(item),
    //     'fill':'none',
    //     ...h.parseCfgStroke(ls.sa, item[0], cfg.stroke)
    //   }
    //   attr.stroke = h.parseCfgColor(attr.stroke, `${ls.g.id}-${cfg.id}-0-gradient`, ls.g, 0, 0, 0, -ls.rk['bbox.h']);
    //
    //   h.createElement(attr, 'path', ls.g);
    // });
  }

  // static getOpts() {
  //   return {
  //     d:true,
  //     sa:['x', 'y', 'stroke.color', 'stroke.alpha', 'stroke.dash', 'curve']
  //   };
  // }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults() {
    return {
          frame:'chart center-container > view', attr:{fill:'none',
            'fill-opacity':0, stroke:"rgb(0,0,0)", 'stroke-width':1
          }
        }
  }
}
