"use strict";

Hive.Plugins.geopath = class {

  // static genAccessors() {
  //   let dFcn = d3.geoPath()
  //   return Object.keys(dFcn).filter(d => typeof dFcn[d]() == 'function');
  // }

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
    let projection;

    var dFcn = h.configGen(d3.geoPath(), cfg, ls); // configure shape generator
    if (dFcn.projection()) {
      projection = dFcn.projection.arg;
      projection.translate([ls.rk["bbox.w"]/2, -ls.rk["bbox.h"]/2]);
    }

    ls.d.forEach((item, i) => {

      let c = {
        d:dFcn(item.feature),
        data:item,
        cfg:cfg,
        layerState:ls,
        target:'path',
      };

      let rv = h.configElement(c);
      // Geopaths w a projection create paths in the correct cartesian quadrant
      // (+x,-y).  Without however they don't (+x,+y). Hence, translation.
      if (!dFcn.projection())
        rv.e.setAttribute('transform', `translate(0, -${ls.rk["bbox.h"]})`)

      if (cfg.centroid) {
        attr = { // create alt points for popup
          'id':rv.attr.id + '-alt',
          'r':0,
          'fill-opacity':0,
          'stroke-opacity':0,
          cx:projection(item[cfg.centroid])[0],
          cy:projection(item[cfg.centroid])[1]
        };
        h.createElement(attr, 'circle', ls.g);
      }
    });

    function getLon(d) {
      d = d[this.field];
      return projection([d, 0])[0];
    };

    function getLat(d) {
      d = d[this.field];
      return projection([0, d])[1];
    };

    let latVal = h.getObjPath(cfg, 'opt.generate.latitude');
    if (typeof latVal == 'string')
      h.generateAccessor(getLat, latVal);

    let lonVal = h.getObjPath(cfg, 'opt.generate.longitude');
    if (typeof lonVal == 'string')
      h.generateAccessor(getLon, lonVal);
  }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults(cfg) {
    return {frame:'chart center-container > view', feature:'[feature]', attr:{
      stroke:"black", 'stroke-width':3
    }, opt:{clip:false}
        // projectionOpts:{center:[-73.9679163, 40.7495461], scale:100000}
    };
  }
}
