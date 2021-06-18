"use strict";

import "./templates.js"

Hive.Frames = class {

  /**
  * Initialize locals
  *
  * @param object Functions from core
  * @param object frame configuration
  * @param object precalculated template information (optional)
  * @return none
  */
  constructor(handlers, cfg, calculated) {
    this.h = handlers;

    if (calculated) {
      this.data = calculated.data;
      this.entry (...calculated.redraw);
    } else {
      this.nodes;
      // import.meta not working somehow so hack it.
      let path = d3.select('script[src$="/hdsf-hive.js"]').attr('src').split('/');
      path.pop();
      path = path.join('/');
      this.flex = new Worker(path + '/flexWorker.js'); // flex
    }

    let calls = {
      nodeResized:this.updateNodeData.bind(this),  // individual
      nodesResized:this.updateNodes.bind(this)     // all
    }

    this.flex.addEventListener('message', (function(e) {
      calls[e.data[0]](...e.data[1]);
    }).bind(this), false);
  }

  /**
  * Gets size, layout information and starts a draw.
  * Since any accessor can be used in any frame, the range is deferred until the plugin runs.
  *
  * @param object The accessor cfg
  * @return none
  */
  entry(cfg) {
    let container = this.h.getSize();
    this.flex.postMessage(['resize', [cfg, this.nodes, container.w, container.h]]);
    console.log(cfg);
  }

  /**
  * Flex handler callback when a node geometry changes.
  *
  * @param object Frame id
  * @param object frame dataset
  * @param object user information
  * @return none
  */
  updateNodeData(id,d,u) {
    this.h.sendStateChange('FRAME_CHANGED',id,d,u);
  }

  /**
  * Flex handler callback when a full layout is calculated.
  *
  * @param object Node objects w geometry, etc.
  * @param object Array of node order
  * @return none
  */
  updateNodes(nodes, nodeOrder) {
    this.nodes = nodes;

    this.h.draw();
  }

  /**
  * Kill the layout worker
  *
  * @return none
  */
  destroy() {
    this.flex.terminate();
  }

  /**
  * Get a node geometry
  *
  * @param string node selector
  * @return node
  */
  resolveNode(sel) {
    let n = this.getNode(sel)

    if (!n) this.h.error("Bad selector: ", sel);
    let opt =  (n.cfg.opt)||{};
    let layout = n.layout;
    let isPerp = (opt.rotate%180 == 90); // perpendicular

    return {'bbox.w':(isPerp?layout.h:layout.w), 'bbox.h':(isPerp?layout.w:layout.h), 'translate.x':layout.x, 'translate.y':layout.y,
      rotate:opt.rotate||0, mirror:opt.mirror||false, crop:opt.crop||false};
  }

  /**
  * Get a node config
  *
  * @param string node selector
  * @return node
  */
  getNode(sel) {
    // Clean up the selector
    // supports: " " == nested, ">" == direct child
    let s = sel.trim();
    s = s.replace(/ *> */g, '>');   // normalize space + gt combos
    s = s.replace(/ /g, ' [ \\-\\w]*');// support nested regex
    s = s.replace(/>/g, ' ');       // support direct child
    let rootName = Object.keys(this.nodes)[0].split(' ')[0];
    // if (!(s.split(' ')[0] == rootName))
    //   s = ' '+s; // put a space in front if not root
    s = s.split(' ')[0]==rootName ? '^'+s : ' '+s; // if root put caret else space

    let n = Object.keys(this.nodes).filter(d => RegExp(s+'$').test(d));
    if (n.length > 1) this.h.warn('Multiple matches for selector:', sel, '\nUsing [0]');
    if (n.length == 0) this.h.error('No matches for selector:', sel);
    return this.nodes[n];
  }

  /**
  * Get defaults for the config frames section
  *
  * @param object The incomplete user specified cfg
  * @return a complete frames cfg
  */
  resolveCfg(v) {
    if (typeof v == 'string')
      v = this.constructor[v]();

    if (Object.keys(v).length == 0) {
      let vis = new Hive.Visualization();
      v = vis.templates.chart();
    }
    return v;
  }
}
