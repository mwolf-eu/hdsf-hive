"use strict";

Hive.Plugins.point = class {
  static genAccessors(h) {
    let dFcn = this.point();
    let methods = Object.keys(dFcn) // resolve curve before passing to gen
                        .filter(d => typeof dFcn[d] == 'function' && typeof dFcn[d]() == 'function');
    return methods.concat('x', 'y');
  }

  static point () {
    let cfg={};

    let gen = function(d){
      let syms;

      let s = cfg.shape(d);
      if (typeof(s) == 'string') // received string name instead
        syms = gen.symbolStack[gen.symbolNames.indexOf(s)];
      else
        syms = gen.symbolStack[s];

      syms = syms.map(s => {
        if (d3[`symbol${s}`])
          return d3[`symbol${s}`]; // from d3
        else
          return gen.extra[s]; // extra from below
      });

      let path = syms.map(t => d3.symbol().size(cfg.size(d)).type(t)(d)).join(' ');
      return path;
    }

    let methods = ['shape', 'size'];
    methods.forEach((item, i) => {
      cfg[item] = d => d;
      gen[item] = function(d){
        if (d) {
          cfg[item] = d;
          return this;
        } else return cfg[item];
      }
    });

    (this.initSymbolLocals).bind(gen)();

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

      let dFcn = h.configGen(this.point(), cfg, ls, item);
      let c = {
        d:dFcn(item),
        data:item,
        cfg:cfg,
        layerState:ls,
        target:'path',
      };

      let rv = h.configElement(c);
      let x = ls.sa.x(item) + (cfg.jitter?h.getDrawWidth(ls.sa.x(),Math.random()*cfg.jitter):0);
      rv.e.setAttribute('transform', `translate(${x} ${ls.sa.y(item)})`);

      // let type;
      // sym.forEach((s, i) => { // create composite symbols
      //
      //   if (d3[`symbol${s}`])
      //     type = d3[`symbol${s}`]; // from d3
      //   else {
      //     type = extra[s]; // extra from above
      //   }
      //
      //   var symbolGenerator = d3.symbol()
      //     .type(type)
      //     .size(ls.sa.size(item)**2);
      //
      //   let id = `${ls.g.id}-${cfg.id}-${j}`
      //   let attr = {
      //     'id':id,
      //     "d":symbolGenerator(),
      //     "transform":`translate(${x} ${y})`,
      //     "fill":ls.sa.color(item),
      //     ...h.parseCfgFill(ls.sa, item),
      //     ...h.parseCfgStroke(ls.sa, item, cfg.stroke)
      //   };
      //
      //   h.eventRegister(id, ls.g.id, cfg.ev, {popup:{attr:attr, idx:j, title:cfg.title, data:ls.d}});
      //   h.createElement(attr, 'path', ls.g);
      // });

    });
  }

  // static getOpts() {
  //   return {
  //     d:true,
  //     sa:['x', 'y', 'size', 'shape', 'color', 'alpha', 'stroke.color', 'stroke.alpha']
  //   };
  // }

  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults() {
    return {
          y:0, size:'25', shape:0, frame:'chart center-container > view', attr:{
            fill:"black", stroke:"black", 'stroke-width':1
          }
        }
  }



  static initSymbolLocals() {
    this.symbolNames = [
      'square open',
      'circle open',
      'triangle open',
      'plus',
      'cross',
      'diamond open',
      'triangle down open',
      'square cross',
      'asterisk',
      'diamond plus',
      'circle plus',
      'star',
      'box plus',
      'circle cross',
      'square triangle',
      'square',
      'circle',
      'triangle',
      'diamond',
      'circle',
      'bullet',
      'circle filled',
      'square filled',
      'diamond filled',
      'triangle filled',
    ]

    // GGPLOT: Square Circle Diamond TriangleDn Triangle Plus Times
    // https://ggplot2.tidyverse.org/articles/ggplot2-specs.html?q=points#point
    this.symbolStack = [ // 25 base points
      ['Square'],
      ['Circle'],
      ['Triangle'],
      ['Plus'],
      ['Times'],
      ['diamondSquare'],
      ['TriangleDn'],
      ['Square', 'Times'],
      ['Plus', 'Times'],
      ['diamondSquare', 'Plus'],
      ['Circle', 'Plus'],
      ['Star'], //['TriangleDn', 'Triangle'],
      ['Square', 'Plus'],
      ['Circle', 'Plus'],
      ['Square', 'Triangle'],
      ['Square'],
      ['Circle'],
      ['Triangle'],
      ['diamondSquare'],
      ['Circle'],
      ['Circle'],
      ['Circle'],
      ['Square'],
      ['diamondSquare'],
      ['Triangle'],
    ];

    // more symbols
    let sqrt3 = Math.sqrt(3);
    this.extra = {
      diamondSquare: {
        draw: function(context, size) {
          var w = Math.sqrt(size);
          var d = w / 2 * Math.sqrt(2);

          context.moveTo(0, -d);
          context.lineTo(d, 0);
          context.lineTo(0, d);
          context.lineTo(-d, 0);
          context.closePath();
        }
      },
      triangleDn: {
        draw: function(context, size) {
          var y = -Math.sqrt(size / (sqrt3 * 3));
          context.moveTo(0, -y * 2);
          context.lineTo(-sqrt3 * y, y);
          context.lineTo(sqrt3 * y, y);
          context.closePath();
        }
      },
      Times: {
        draw: function(context, size) {
          var w = Math.sqrt(size);
          var d = w / 2 * Math.sqrt(2);

          context.moveTo(d, d);
          context.lineTo(-d, -d);
          context.moveTo(-d,d);
          context.lineTo(d,-d);
        }
      },
      Plus: {
        draw: function(context, size) {
          var w = Math.sqrt(size);
          var d = w / 2 * Math.sqrt(2);

          context.moveTo(d, 0);
          context.lineTo(-d, 0);
          context.moveTo(0,d);
          context.lineTo(0,-d);
        }
      }
    }
  }
}
