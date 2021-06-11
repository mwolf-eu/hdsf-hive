"use strict";

import './object.js';
import './element.js';
import './accessors.js';
import './data.js';
import './templates.js';
import './meta/guide-templates.js'; // TODO make dynamic import
import './frame.js';
import './draw.js';

// export let code = {Hive};
// let Hive = globalThis.Hive;
export let lib = {Hive};


Hive.Visualization = class extends Hive.Object {

  /**
  * Main entry point for drawing a chart/graph.
  *
  * @param object The whole config object.
  * @return none
  */
  constructor(...args) {
    super(args);

    this.tk = {}; // toolkit of other classes
    this.fontPromises = [];

    this.templates = new Hive.templates();

    if (args[0]) {
      this.graph(...args);
    }
    return this;
  }

  setTemplate(t,c) {
    this.v = {frames:this.templates[t](c?c:{})};
    return this;
  }

  graph(cfg) {
    let prekit = ["element", "data", "frames", "accessors"];
    let toolkit = ["logLevel", ...prekit, "draw"];

    if (arguments[1] && Array.isArray(arguments[1])) { // wait on fonts
      arguments[1].forEach((f, i) => {
        let font = new FontFace(...f);
        this.fontPromises.push(font.load());
      });
    }

    this.v = {...(this.v||{}), ...cfg};

    if (!this.v.name)
      this.v.name = this.uuidv4();
      // this.v.name = "g" + this.utf8ToHex(JSON.stringify({graphid:this.uuidv4()}))

    // set root defaults
    this.v = this.resolveCfg(this.v);

    // class services
    let handlers = {
      mergeDeep:Hive.Object.mergeDeep,
      log:(function (a){this.log(...arguments)}).bind(this),
      warn:(function (a){this.warn(...arguments)}).bind(this),
      error:(function (a){this.error(...arguments)}).bind(this),
      getGraphID:this.getGraphID.bind(this),

      getSize: (function() {return this.tk.element.renderer.getTargetSize()}).bind(this), // get size of svg
      frames: (function() {this.tk.frames.entry(this.v.frames)}).bind(this),
      draw: (function() {this.tk.draw.draw(this.v.draw)}).bind(this),
      getData:(function (a){return this.tk.data.getData(...arguments)}).bind(this),
      getFrame:this.getFrame.bind(this),
      resolveFrame:d=>this.tk.frames.resolveNode.bind(this.tk.frames)(d),
      getScaledAccessors:(function (a){return (this.tk.accessors.getScaledAccessors).bind(this.tk.accessors)(...arguments)}).bind(this),
      generateAccessor:(function (a){return this.tk.accessors.generateAccessor(...arguments)}).bind(this),
      drawPush:(function (a){return this.tk.draw.push(...arguments)}).bind(this),
      render:d=>this.tk.element.render.bind(this.tk.element)(d),
      getTextWidth:d=>this.tk.element.getTextWidth(d),
      eventRegister:(function (a){this.tk.element.eventRegister(...arguments)}).bind(this),
      sendStateChange:this.sendStateChange.bind(this),
      // getScale:(function (a){return this.tk.accessors.getScale(...arguments)}).bind(this)
      getTemplates:d=>this.templates,
      // getFixups:d=>this.templates.getFixups(),
      // setFixups:d=>this.templates.setFixups(d),
    }

    prekit.forEach((item, i) => {
        this.tk[item] = new Hive[item[0].toUpperCase()+item.slice(1)](handlers, this.v[item]);
        this.v[item] = this.tk[item].resolveCfg(this.v[item]);
      });

    let modPaths = [];  // dyn load code
    if (this.v.element.popup.enabled && !(Hive.popup)) modPaths.push('./popup.js');
    if (this.v.element.renderer.name == 'svg' && !(Hive.Renderer.svg)) modPaths.push('./renderers/svg.js');
    if (this.v.element.renderer.name == 'paperjs' && !(Hive.Renderer.paperjs)) modPaths.push('./renderers/paperjs.js');
    if (this.v.element.renderer.name == 'three' && !(Hive.Renderer.three)) modPaths.push('./renderers/three.js');

    // force area and text for guides
    let modPlugin = this.v.draw.map(d => {if (!Hive.Plugins[d.name]) return `./plugins/${d.name}.js`}).filter(d=>d);
    let guidePlugins = ['line', 'area', 'label'].map(d => {if (!Hive.Plugins[d]) return `./plugins/${d}.js`}).filter(d=>d);
    let pluginPaths = [...new Set([...modPlugin, ...guidePlugins])];

    if (!Hive.Plugins)
      Hive.Plugins = {}; // load plugins.  run bootstrap.
    let promises = [...modPaths, ...pluginPaths].map(d => import(d));
		this.bootstrap(toolkit, promises, handlers);
	}

  sendStateChange(...args) {
    if (this.v.onStateChange)
      this.v.onStateChange(...args);
  }

  setAccessor(key, value) { // TODO: Don't resolve whole cfg every time
    this.v.accessors[key] = value;
    this.tk.accessors.resolveCfg(this.v.accessors);
  }

  getGraphID() {
    return this.v.name;
  }

  /**
  * Returns the resources allocated by a call to the constructor
  *
  * @return none
  */
  destroy(){
    this.tk.element.destroy();
    this.tk.frames.destroy();
  }

  getOpts() {
    return {templates:this.templates.opt};
  }

  setOpts(o) {
    if ('templates' in o)
      Hive.Visualization.mergeDeep(this.templates.opt, o.templates);
  }

  getRenderer(){
    return this.tk.element.renderer
  }

  getData(){
    return this.tk.data.cfg;
  }

  getDataCfg(){
    return this.v.data;
  }

  getAccessorCfg(){
    return this.v.accessors;
  }

  getScales(){
    return this.tk.accessors.scaleDict;
  }

  getDrawCfg(){
    return this.v.draw;
  }

  getAccessor(num) {
    return this.tk.draw.pluginState.sa[num];
  }

  getFrame(f){
    return Hive.templates.getCfgNode(this.v.frames, f);
    // return this.tk.frames.getNode(f);
  }

  getDraw() {
    return this.v.draw;
  }

  /**
  * Get defaults for the config root
  *
  * @param object The incomplete user specified cfg
  * @return a complete root cfg
  */
  resolveCfg(v) {
    let cfg = {
      logLevel:"warn",
      name:'graph-',
      element:{},
      accessors:{},
      frames:{},
      data:[],
      draw:[]
    };

    v = Hive.Object.mergeDeep(cfg, v);
    return v;
  }

  /**
  * Checks that all imports are finished, then starts the config parsing
  *
  * @param object Keys of objects in the config
  * @param object Array of promises
  * @return none
  */
	async bootstrap(keys, promises, handlers) {
    try {
      let fontRv = await Promise.all(this.fontPromises)
      fontRv.forEach((f, i) => {
        if (f.status == 'loaded')
          document.fonts.add(f); // add font to document
      });
      await Promise.all(promises.concat(this.tk.data.promises)); // should be allSettled?
      // Load plugins late as promises could create new draw entries
      // let modPaths = this.v.draw.map(d => {if (!Hive.Plugins[d.name]) return `./plugins/${d.name}.js`}).filter(d=>d);
      // let drawPaths = [...new Set(modPaths)];
      // let drawPromises = drawPaths.map(d => import(d));
      // await Promise.all(drawPromises);
    } catch(e) {
      console.error(e);
    }

    // draw init follows plugin loading
    this.tk.draw = new Hive.Draw(handlers);
    this.v.draw = this.tk.draw.resolveCfg(this.v.draw);

		keys.forEach((item, i) => { // run all entry points
      if(typeof(this.v[item]) == "object")
        this.tk[item].entry(this.v[item]);
		});

    this.tk.element.getElement()._visualization = this;

    this.sendStateChange('PARSE_CFG_END', this);
	}

  /**
  * Returns the current config
  *
  * @return the config
  */
  getConfig() {
    return this.v;
  }

  /**
  * Sets a new configuration
  *
  * @param object The new cfg
  * @return none
  */
  setConfig(cfg) {
    this.v = cfg;
    this.accessors(cfg.accessors);
    this.rendererObj.redraw();
  }

  /**
  * Merge data into an existing config
  * This assumes unique id's which don't conflict
  *
  * @param object The new cfg
  * @param boolean If the new config should trigger a redraw
  * @return none
  */
  // merge accessors, frames, data, draw
  // assumes unique id's don't conflict
  mergeConfig(newCfg, update=true) {
    let mergeObjs = ['accessors','frames','data','draw'];
    mergeObjs.forEach((o, i) => {
      if (! newCfg[o]) return;
      if (Array.isArray(this.v[o]))
        this.v[o] = [...this.v[o], ...newCfg[o]];
      else
        this.v[o] = {...this.v[o], ...newCfg[o]};
    });

    this.v = this.resolveCfg(this.v);

    this.accessors(this.v.accessors);
    if(update)
      this.rendererObj.redraw();
  }

  static genGradientFromSA(sa, cfg) {
    if (!cfg) cfg = this.v;

    let range = cfg.accessors[sa]
    if(range) range = range.range;
    else {
      this.warn('No scaled accesor key:', sa);
      return;
    }
    return range.map(d => {return {'stop-color':d}});
  }

  export() {
    this.tk.element.export();
  }
}
