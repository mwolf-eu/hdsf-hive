import "./meta/guide.js";

Hive.Draw = class {
  constructor(handlers) {
    this.h = handlers;
    this.generated = {};
  }

  // draw is async called at frame resolution
  entry(){};

  /**
  * Sets up and calls each plugin listed in the draw array, adds result to svg.
  *
  * @param object The draw subsection of the config
  * @return none
  */
  draw (cfg) {
    this.cfg = cfg;
    this.pluginState = {curIdx:0, layer:[], svg:null, sa:[]};

    let eSize = this.h.getSize();
    let attr = {'width':eSize.w, 'height':eSize.h, xmlns:"http://www.w3.org/2000/svg"};
    let svg = this.createElement(attr, 'svg', null);

    // call each draw object
    let handlers = {
      // wrap:this.wrap.bind(this),
      text:this.text,
      getDrawWidth:this.getDrawWidth.bind(this),
      getObjPath:this.getObjPath,
      configGen:this.configGen.bind(this),
      configElement:this.configElement.bind(this),
      configElements:this.configElements.bind(this),
      createElement:this.createElement,
      // resolveFrame:this.h.resolveFrame,
      generateAccessor:this.h.generateAccessor,
      log:this.h.log,
      warn:this.h.warn,
      error:this.h.error,
    }

    for (let i=0, item=cfg[i]; i < cfg.length; item=cfg[++i]){
      this.pluginState.curIdx = i;
      this.layer = this.pluginState.layer[i];

      let id = this.formatID({g:this.h.getGraphID(), n:cfg[i].name, d:i});
      let g = this.createElement({id}, 'g', null);

      let frame = cfg[i].frame;
      let layer = {handler:Hive.Plugins[item.name], g:g, template:{calls:[]}};
      let genID = this.genID(id); // svg id generator
      layer.genID = ()=>genID.next().value; // attach

      if (!layer.handler) {
        this.h.warn('No handler for plugin:', item.name);
        return;
      }

      layer.rk = this.h.resolveFrame(frame); // always get relative keys
      function getObjPaths(o, root) {
        let p = [];
        Object.keys(o||{}).forEach((k, i) => {
          if (typeof o[k] == 'object' && !Array.isArray(o[k]))
            p = p.concat(getObjPaths(o[k], `${root?root+'.':''}${k}`));
          else
            p.push(`${root?root+'.':''}${k}`)
        });
        return p;
      }

      layer.d = this.h.getData(cfg[i]);
      let attrPath = getObjPaths(cfg[i].attr, 'attr').filter(a => (a.match(/\./g)||[]).length == 1);
      let oPaths = [...attrPath, ...getObjPaths(cfg[i].opt, 'opt')];
      if (layer.handler.genAccessors)
        oPaths = oPaths.concat((layer.handler.genAccessors).bind(layer.handler)(handlers));
      let saKeys = oPaths.map(d => {return{key:d, accDes:this.getScaledAccessorKey(d.replace(/[()]/g, ''), cfg[i])}})
             .filter(d=>d.accDes||!isNaN(d.accDes));
      layer.sa = this.h.getScaledAccessors(saKeys, layer.rk, layer.d);

      this.pluginState.sa[i] = layer.sa;  // store for guides

      layer.handler.draw(item, handlers, layer);

      // template upstreaming - first run only
      // possible args cmd, target array, attr
      let runOp = (cmd, n, d, callee) => {
        if (!cmd.op || cmd.op =='set') {
          this.h.log('set', n.id, cmd.attr, d[1]);
          n.attr[cmd.attr] = d[1];
        }
        if (cmd.op =='add') {
          let val = (n.attr[cmd.attr]||0) + d[1];
          this.h.log(cmd.op, n.id, cmd.attr, val, 'cur', n.attr[cmd.attr]);
          n.attr[cmd.attr] = val;
        }
        if (cmd.op =='subCur') {
          let val = (callee.attr[cmd.srcAttr]||0);
          this.h.log(cmd.op, n.id, cmd.srcAttr, 'cur', val, cmd.dstAttr);
          n.attr[cmd.dstAttr] = (n.attr[cmd.dstAttr]||0) - val;
        }
      }

      let nodeCfg = this.h.getFrame(cfg[i].frame);
      if (!this.guide && nodeCfg && nodeCfg.handlers) { // node has cmds
        layer.template.calls.forEach(d => { // for all cmds to call
          if (d[0] in nodeCfg.handlers) { // if node supports command
            let cmds = nodeCfg.handlers[d[0]];
            cmds.forEach((cmd, i) => { // make all changes

              if (! cmd.nodes)
                runOp(cmd, nodeCfg, d);
              else {
                cmd.nodes.forEach((n, i) => {
                  if (n.endsWith('*')) { // do all children
                    let children = this.h.getFrame(n.slice(0,-1)).children;
                    children.forEach((c, i) => {
                      runOp(cmd, c, d, nodeCfg);
                    });
                  } else {
                    runOp(cmd, this.h.getFrame(n), d, nodeCfg);
                  }
                });
              }
            });
          }
        });
      }

      let relKeys = layer.rk;

      // bbox clip outline
      let cpAttr = {id:this.formatID({g:this.h.getGraphID(), n:'clip', d:i})};
      let cp = this.createElement(cpAttr, 'clipPath', g);
      let rectAttr = {fill:'none', width:relKeys["bbox.w"], height:relKeys["bbox.h"], transform:`translate(0, -${relKeys["bbox.h"]})`};
      this.createElement(rectAttr, 'rect', cp);

      if (this.getObjPath(item, 'opt.clip'))
        g.setAttribute('clip-path', `url(#${cpAttr.id})`);

      let t = `translate(${relKeys["translate.x"]}, ${relKeys["translate.y"]})`;
      // view has -y so if we dont rotate into place later move it down now
      if (relKeys["rotate"]%180==0) t += ` translate(0, ${relKeys["bbox.h"]})`

      let r = `rotate(${relKeys["rotate"]%180}) rotate(${relKeys["rotate"]>=180?180:0} ${relKeys["bbox.w"]/2},${-relKeys["bbox.h"]/2})` // ${relKeys["bbox.w"]/2},${-relKeys["bbox.h"]/2})

      g.setAttribute('transform', `${t} ${r}`); // ${s}
      // g.setAttribute('data-data', `${relKeys["bbox.w"]} ${relKeys["bbox.h"]} ${relKeys["translate.x"]} ${relKeys["translate.y"]}`);
      svg.appendChild(g); // append groups
    }

    this.h.sendStateChange('DRAW_END');

    // Guides
    if (Hive.guide && !this.guide) {
      let handlers = {
        // getScale:this.h.getScale,
        getFrame:this.h.getFrame,
        drawPush:this.h.drawPush,
        getTemplates:this.h.getTemplates,
        mergeDeep:this.h.mergeDeep,
      };
      this.guide = new Hive.guide(handlers);
      let guideOpts = cfg.map((d,i) =>
        (d.guide||[]).map(e => {
          let keys = Array.isArray(e.key)?e.key:[e.key];
          let rv = {...e, field:keys.map((k, i)=>this.getScaledAccessorKey(k, d))};
          if (cfg[i].name == 'point' && 'shape' in cfg[i]) rv.shape = cfg[i].shape;
          return rv;
        })
      );
      let saKeys = guideOpts.flatMap(d => d.flatMap(e => {return e.field.flatMap((f,i)=>{
        let keys = Array.isArray(e.key)?e.key:[e.key];
        return{key:keys[i], accDes:f}
      })}));
      let sas = this.h.getScaledAccessors(saKeys);
      this.guide.addAll(sas, guideOpts);

      this.h.frames(); // Guide bboxes calculated. Now redraw.
      return;
    }

    this.generated.svg = svg;
    this.h.render(svg);
  }

  getSVG(){
    return this.generated.svg;
  }

  getObjPath(obj, path) { // belongs in Object.js
    let keys = path.split('.');
    let o = obj;
    for(let idx=0; idx<keys.length; idx++) {
      o = o[keys[idx]];
      if (o == undefined) return o;
    }
    return o;
  }

  // takes key name and draw cfg
  getScaledAccessorKey(k, cfg) {
    let accDes = cfg;
    k.split('.').forEach((param, i) => {
      if (accDes == undefined) return;
      accDes = accDes[param];
    });
    return accDes;
  }

  // config shape generator
  configGen(gen, cfg, layerState, row) {
    let genMethods = Object.keys(gen);
    let cfgMethods = Object.keys(cfg).filter(d => (d in gen && typeof gen[d] == 'function') || (d.startsWith && d.startsWith('d3.')) || !genMethods.length);

    cfgMethods.forEach((item, i) => {
      if (typeof cfg[item] == 'object' && !Array.isArray(cfg[item])) {
        if (item.startsWith('d3.')) {
          let m = new Function(`return ${item}()`)(); // genVal(item, true); // init sub generator
          this.configGen(m, cfg[item], layerState); // cfg sub generator
          gen.arg = m;
          gen(m); // add to parent generator
        } else {
          this.configGen(gen[item], cfg[item], layerState);
        }
      } else if (item in layerState.sa) { // BUG: deep cfgGen fails. Eg: projection['d3.mercator'].center:scaled-accesssor
        gen[item](layerState.sa[item]); // pass the accessor
      } else if (`(${item})` in layerState.sa)
        gen[item](layerState.sa[`(${item})`](row)); // or resolve it
      else
        gen[item](cfg[item]); // (genVal(cfg[item]));
    });
    return gen;
  }

  // configure single elements
  configElement(cfg) {
    let id = cfg.layerState.genID();
    let attr = {id:id.str};
    if (cfg.d) attr.d = cfg.d;
    let cfgAttr = Object.keys(cfg.cfg.attr||{}).filter(a => typeof cfg.cfg.attr[a] != 'object' || Array.isArray(cfg.cfg.attr[a]));

    cfgAttr.forEach((a, i) => { // adapt here for scss
      attr[a] = cfg.layerState.sa['attr.'+a](cfg.data);

      if (Array.isArray(attr[a])) { // is gradient color def
        let group =  cfg.layerState.g;
        let gType = this.getObjPath(cfg.cfg, `opt.gradient-type-${a}`);
        let args = [0,0,0,-cfg.layerState.rk['bbox.h']] // default vertical
        if (gType == 'linear') { // get start and end from path
          let path = cfg.d.split(/([\d\.-]+)/).map(d=>parseFloat(d)).filter(d=>d);
          args = [...path.slice(0, 2), ...path.slice(-2)]
        }
        attr[a] = this.parseCfgColor(attr[a], `${attr.id}_c-${a}`, group, ...args);
      }
    });

    let e = this.createElement(attr, cfg.target, cfg.layerState.g);

    // don't register events on first pass
    if (this.guide) {
      let ev = this.getObjPath(cfg.cfg, `opt.ev`);
      let title = this.getObjPath(cfg.cfg, `opt.title`)||'Values';
      if (ev)
        this.h.eventRegister(attr.id, cfg.layerState.g.id, ev,
          {popup:{attr:attr, idx:id.idx, title:title, data:cfg.layerState.d}});
    }
    return {attr, e}
  }

  // configure selections for several elements Eg: Axis
  // only basic config w/o scaled accessors etc.
  configElements(cfg) {
    let sel = [];
    let cfgAttr = Object.keys(cfg.cfg.attr||{}).filter(a => typeof cfg.cfg.attr[a] == 'object' && !Array.isArray(cfg.cfg.attr[a]));

    cfgAttr.forEach(s => {
      Object.keys(cfg.cfg.attr[s]).forEach(a => {
        sel.push([s, [a, cfg.cfg.attr[s][a]]]);
      });
    });

    sel.forEach((item, i) => {
      cfg.target.selectAll(item[0]).attr(...item[1]);
    });

    // TODO: Give nicer element specific names?
    cfg.target.selectAll('*').attr('id', d=>cfg.layerState.genID().str);
  }


  // parse the attributes and selectors
  // applyAttr(cfg) {
  //   let id = cfg.layerState.genID();
  //   let attr = cfg.target?{id:id.str, d:cfg.d}:{};
  //   let sel = [];
  //   cfg.extraAttr = cfg.extraAttr||{};
  //   cfg.cfg.attr = cfg.cfg.attr||{};
  //
  //   Object.keys({...cfg.extraAttr, ...cfg.cfg.attr}).forEach((a, i) => { // adapt here for scss
  //     let attribute = a in cfg.extraAttr? cfg.extraAttr[a] : cfg.layerState.sa['attr.'+a](cfg.data);
  //     if (Array.isArray(attribute)) { // is gradient color def
  //       let group =  cfg.layerState.g;
  //       let gType = this.getObjPath(cfg.cfg, `opt.gradient-type-${a}`);
  //       let args = [0,0,0,-cfg.layerState.rk['bbox.h']] // default vertical
  //       if (gType == 'linear') { // get start and end from path
  //         let path = cfg.d.split(/(\d+)/).map(d=>parseFloat(d)).filter(d=>d);
  //         args = [...path.slice(0, 2), ...path.slice(-2)]
  //       }
  //       attribute = this.parseCfgColor(attribute, `${group.id}_c-${a}`, group, ...args);
  //     }
  //     if (a.includes(' ')) {
  //       let s = a.split(/ (?=[^ ]*$)/i); // split selector/attr
  //       s[1] = [s[1], attribute];
  //       sel.push(s);
  //     } else
  //       attr[a] = attribute;
  //   });
  //
  //   if (typeof cfg.target == 'string') { // if single element
  //     this.createElement(attr, cfg.target, cfg.layerState.g);
  //
  //     // don't register events on first pass
  //     if (this.guide)
  //       this.h.eventRegister(attr.id, cfg.layerState.g.id, cfg.ev,
  //         {popup:{attr:attr, idx:id.idx, title:cfg.title, data:cfg.layerState.d}});
  //   } else {  // if several elements Eg: axis
  //     Object.keys(attr).forEach((a, i) => {
  //       d3.select(cfg.target).select('*').attr(attr, attr[a]);
  //     });
  //     sel.forEach((item, i) => {
  //       d3.select(cfg.target).selectAll(item[0]).attr(...item[1]);
  //     });
  //   }
  //
  //   return {attr, sel};
  // }

  /**
  * Creates and/or configs an SVG element
  *
  * @param object list of attr-val pairs
  * @param string element type
  * @param element The element (usually a <g>) where the new element is appended
  * @return The child element
  */
  // create HTML element and apply attrs
  createElement(attr, e, parent) {
    let child;
    if (e instanceof SVGElement) child = e;
    else child = document.createElementNS('http://www.w3.org/2000/svg', e);
    Object.keys(attr).forEach((item, i) => {
      child.setAttribute(item, attr[item]);
    });
    if (parent)
      parent.appendChild(child);
    return child;
  }

  getID(e) {
    let id = e.getAttribute('id');
    return JSON.parse (`{${id.replaceAll('.', ':').replaceAll('_',',').replace(/[a-z]\w*/g, d => '"'+d+'"')}}`);
  }

  formatID(o) {
    let fields = ['g', 'n', 'd', 'i', 'a']; // graphID, plugin name, draw index, plugin index, alt point index
    let string = '';
    fields.forEach((f, i) => {
      if (f in o) string += `${i?'_':''}${f}-${o[f]}`;
    });
    // TODO add utf8ToHex-ed userdata?
    return string;
  }

  setID(e, o){
    e.setAttribute('id', this.formatID(o));
  }

  * genID(s) {
    let idx = 0;
    while (true)
      yield {str:s + `_i-${idx}`, idx:idx++};
  }

 // /**
 //   * Cuts a text element vertically.
 //   * Yes. Tspan should do this.  No Paperjs does not support it.
 //   *
 //   * @param {Object} cfg.text Selected text elements
 //   * @param {string} cfg.width Max width
 //   * @param {string} cfg.fFamily Font family
 //   * @param {string} cfg.fSize Font size
 //   * @param {string} cfg.move How to move the text
 //   */
 //  wrap(text, width, fFamily, fSize, move) {
 //    let wFcn = this.h.getTextWidth.bind(this.rendererObj);
 //    text.each(function() {
 //      let texts = [];
 //      var text = d3.select(this),
 //          words = text.text().split(/\s+/).reverse(),
 //          word,
 //          line = [],
 //          lineNumber = 0,
 //          lineHeight = 1.1,
 //          y = text.attr("y"),
 //          dy = parseFloat(text.attr("dy"))
 //      let subText = text.text(null).clone();
 //
 //      let origDy = subText.node().getAttribute('dy');
 //      origDy = origDy.includes('em')?fSize*parseFloat(origDy):0;
 //
 //      subText.node().getAttribute('dy')
 //      subText.attr('dy', 0 + origDy);
 //      texts.push(subText);
 //      let idx = 1;
 //      while (word = words.pop()) {
 //        line.push(word);
 //        let delta = subText.attr('font-size')// dy;
 //        subText.text(line.join(" "));
 //        // if (subText.node().innerText.length > width && line.length > 1) { // .getComputedTextLength()
 //        if (wFcn(subText.node().innerHTML, fFamily, fSize) > width && line.length > 1) { // .getComputedTextLength()
 //          line.pop();
 //          subText.text(line.join(" "));
 //          line = [word];
 //          subText = subText.clone().text(word).attr('dy', (a,b,c) => `${(delta*idx) + origDy}`); // .attr("dy", ++lineNumber * lineHeight + dy + "em")
 //          texts.push(subText);
 //          idx++;
 //        }
 //      }
 //      // move the text based on orientation
 //      if (move == "top"){
 //        texts.forEach((item, i) => {
 //          item.attr('transform', (d,e,f) => {
 //            let tf = f[0].getAttribute('transform');
 //            tf = tf==null?'':(tf+' ');
 //            return `${tf}translate(0 ${-fSize*(idx-1)})`;
 //          });
 //        });
 //      }
 //    });
 //  }

  push(newCfg) {
    let guideDrawObjs = this.resolveCfg(newCfg);
    this.cfg.push(...guideDrawObjs);
  }

  /**
  * Get allowable width for an element based on axis bandwidth.
  *
  * @param object The x scaled accessor
  * @param number If <= 1, == the percent of the bandwidth. If > 1, == the px width.
  * @return the width in px
  */
  getDrawWidth(s, v) {
    if (v>1) return v;
    let bw;
    if (s.bandwidth)
      bw = s.bandwidth()
    else {
      this.h.warn('Axis bandwidth missing or zero.  Are you using the right scale? Using default: 10px')
      bw = 10;
    }
    return bw * v;
  }

  /**
  * Parse the complex color (gradient) attributes
  *
  * @param object The color attribute
  * @param string The unique plugin id
  * @param string The plugin element group
  * @param string The x1 stop color
  * @param string The y1 stop color
  * @param string The x2 stop color
  * @param string The y2 stop color
  * @return URL to the gradient definition
  */
  // allow for linear gradients
  parseCfgColor(color, uuid, group, x1, y1, x2, y2) {
    if (typeof(color) != 'object') return color;
    else {
      let defs = this.createElement({}, 'defs', group);
      let attr = {
        id:uuid,
        x1:x1==undefined?'0%':x1,
        y1:y1==undefined?'0%':y1,
        x2:x2==undefined?'0%':x2,
        y2:y2==undefined?'100%':y2,
      }
      if (x1!=undefined) attr.gradientUnits = "userSpaceOnUse"; // for point to point gradients. Eg: not horiz/vert
      let grad = this.createElement(attr, 'linearGradient', defs);
      color.forEach((item, i) => {
        attr = {
          'stop-color':item['stop-color'],
          offset:item.offset||(1/(color.length-1))*i
        }
        this.createElement(attr, 'stop', grad);
      });
      return `url(#${uuid})`;
    }
  }

  // Text manager in the form of a d3 generator
  // text() {
  //   let cfg = {};
  //   let rotateVal = 0;
  //   let parentVal = undefined;
  //
  //   let create = function(d) {
  //     let xoff = cfg.offsetX(d), yoff = cfg.offsetY(d), ta = 'middle';
  //     if (cfg.offset(d)) {  // override w auto offset
  //       xoff = 0;
  //       yoff = 0;
  //       if (rotateVal == 0) {
  //         yoff = cfg.offset(d);
  //       }
  //       if (rotateVal == 90) {
  //         xoff = cfg.offset(d);
  //         ta = 'start';
  //       }
  //       if (rotateVal == 180) {
  //         xoff = -cfg.offset(d);
  //       }
  //       if (rotateVal == 270) {
  //         yoff = -cfg.offset(d);
  //         ta = 'end';
  //       }
  //     }
  //
  //     let attr={
  //       x:cfg.x(d)+xoff,
  //       y:cfg.y(d)+yoff,
  //       'text-anchor':ta,
  //     };
  //     if (rotateVal) attr.transform = `rotate(${rotateVal} ${cfg.x(d)+xoff} ${cfg.y(d)+yoff})`;
  //
  //     let element = cfg.h.createElement(attr, 'text', parentVal);
  //     let ctv = cfg.content(d);
  //     if (typeof ctv == 'function') ctv = ctv(d);
  //     element.textContent = cfg.format()(ctv);
  //
  //     return element;
  //   }
  //
  //   let gen = function(d){
  //     return create(d);
  //   }
  //
  //   let methods = ['x', 'y', 'content', 'format', 'offset', 'offsetX', 'offsetY', 'parent', 'h'];
  //   methods.forEach((item, i) => {
  //     cfg[item] = d => d;
  //     gen[item] = function(d){
  //       if (d) {
  //         cfg[item] = d;
  //         return this;
  //       } else return cfg[item];
  //     }
  //   });
  //
  //   cfg.h = {};
  //   cfg.offset = d => 0;
  //   cfg.offsetX = d => 0;
  //   cfg.offsetY = d => 0;
  //   cfg.content = d => '';
  //   cfg.format = d => (e=>e);
  //
  //   gen.rotate = function(d){
  //     if (!isNaN(d)) {
  //       rotateVal = d;
  //       return this;
  //     } else return rotateVal;
  //   }
  //
  //   return(gen);
  // }

  /**
  * Get defaults for the config draw section
  *
  * @param object The incomplete user specified draw cfg
  * @return a complete draw cfg
  */
  resolveCfg(v) {
    v.forEach((item, i) => {
      let pluginHandler = Hive.Plugins[item.name];
      if (!pluginHandler) {
        this.h.warn('No config for plugin:', item.name);
        return;
      }

      v[i] = this.h.mergeDeep(pluginHandler.getDefaults(item), item);
    });

    return v;
  }
}
