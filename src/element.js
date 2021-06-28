/**
 *  Drawable element base class
 *  Integrates: configuration, Resize debouncing, import export for all renderers
 */

"use strict";
import PubSub  from 'pubsub-js'

Hive.Element = class {

  /**
  * Initialize locals
  *
  * @param object Functions from core
  * @return none
  */
  constructor(handlers) {
    this.h = handlers;
    this.events = [];
    if (!Hive.Renderer)
      Hive.Renderer = {};
  }

  /**
  * Get defaults for the config frames section
  *
  * @param object The incomplete user specified cfg
  * @return a complete frames cfg
  */
  entry(cfg) {
      this.cfg = cfg;
      let drawableElement;
      this.container = document.querySelector(cfg.selector);
      this.container.style.position = 'relative';

      // style node
      if (cfg.style)
        Object.keys(cfg.style).forEach((item, i) => {
          this.container.style[item] = cfg.style[item];
        });

      // attrs node
      if (cfg.attrs)
        Object.keys(cfg.attrs).forEach((item, i) => {
          this.container[item] = cfg.attrs[item];
        });

      if (cfg.renderer.name == 'paperjs') {
        this.renderer = new Hive.Renderer.paperjs(this.container, cfg);
      }

      if (cfg.renderer.name == 'svg') {
        this.drawableObject = this.container;
        this.renderer = new Hive.Renderer.svg(this.container, cfg);
      }

      // if (cfg.renderer.name == 'threesvg') {
      //   this.drawableObject = this.container;
      //   this.renderer = new Hive.Renderer.threesvg(this.container, cfg);
      // }

      if (cfg.renderer.name == 'three') {
        this.drawableObject = this.container;
        this.renderer = new Hive.Renderer.three(this.container, cfg, this.h.sendStateChange);
      }

      this.renderer.messagePub = this.messagePub;
      this.renderer.setRendererSize(this.container.clientWidth, this.container.clientHeight);

      let ts = this.renderer.getTargetSize();
      this.viewBox = [0, 0, ts.w, ts.h];

      this.elSize = {w:500, h:500}

      if (cfg.renderer.name != 'three'){
        if (cfg.zoom) {// wheel handler
          this.container.addEventListener("wheel", function (event) {
            let sz = this.container.getBoundingClientRect();
            let delta = Math.sign(event.deltaY);
            let vb = this.viewBox;

            vb[2] += delta * (sz.width * .1);
            vb[3] += delta * (sz.height * .1);
            // sanity check sizes
            if(vb[2]< sz.width*.1) vb[2] = sz.width*.1;
            if(vb[2]> sz.width) vb[2] = sz.width;
            if(vb[3]< sz.height*.1) vb[3] = sz.height*.1;
            if(vb[3]> sz.height) vb[3] = sz.height;

            this.renderer.setViewBox(vb);
            event.preventDefault(); // don't scroll when in div
          }.bind(this), false);
        }

        if (cfg.drag){ // drag handler
          var dragHandler = d3.drag(event)
            .on("drag", function () {
              let sz = this.container.getBoundingClientRect();
              let vb = this.viewBox;
              vb[0] -= d3.event.dx * (vb[2]/sz.width);
              vb[1] -= d3.event.dy * (vb[3]/sz.height);

              this.renderer.setViewBox(vb);
            }.bind(this));

          dragHandler(d3.select(this.container));
        }
      }

      this.rdb = this.resizeDebounce.bind(this);
      window.addEventListener('resize', this.rdb, true);

      let handlers = {
        getElementPosition:(function(a){return this.getPosition(...arguments)}).bind(this.renderer),
      }

      if (cfg.popup.enabled){
        this.popup = new Hive.popup(handlers, cfg.selector, this.events, cfg.popup);
      }
  }

  /**
  * Debouncer for resize events.  Prevents event flooding.
  *
  * @return none
  */
  resizeDebounce() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(this.resize.bind(this), 10);
  }

  /**
  * Resize handler for the HTML element.
  *
  * @return none
  */
  resize() {
    let tsz = this.renderer.getTargetSize();
    this.viewBox[2]=tsz.w;
    this.viewBox[3]=tsz.h;

    this.renderer.setRendererSize(this.container.clientWidth, this.container.clientHeight);

    // Some plugins need event refreshes bc the number of elements changes. Eg: binhex
    if (this.popup) 
      this.popup.events = this.events;

    // dom resize and svg redraw are orthogonal when renderer == three
    if (this.cfg.renderer.name != 'three')
      this.h.frames(); // rerun frames & draw
  }

  /**
  * Registers an event for an element.
  *
  * @param string The element id
  * @param string The group the element is in
  * @param object The event cfg object
  * @param boolean The popup cfg object
  * @return none
  */
  eventRegister(id, gid, ev, altcfg) {
    if (!ev) return;
    if (!ev.group) ev.group = this.h.getGraphID() + ' default';

    let p={}, item={elId:id, groupId:gid, ev:ev}
    if (this.cfg.popup.enabled)
      p = this.popup.register(altcfg.popup);
    this.events.push({...item, ...p});
  }

  /**
  * Gets the element that is drawn to. Currently either canvas or svg.
  *
  * @return HTML element
  */
  getElement() {
    return this.renderer.drawableElement;
  }

  /**
  * Subscribe to a message.
  *
  * @param object varargs
  * @return none
  */
  messageSub(d) {
    PubSub.subscribe(...arguments);
  }

  /**
  * Publish to a message.
  *
  * @param object varargs
  * @return none
  */
  messagePub(d) {
    PubSub.publish(...arguments);
  }

  /**
  * Render an svg
  *
  * @param object SVG element
  * @return none
  */
  render(svg) { // call renderer w result
    svg.setAttribute('viewBox', this.viewBox.join(' '))
    console.log(svg);

    if (Hive.Renderer[this.cfg.renderer.name]) {
      let pubsubMsgs = this.renderer.render(svg, this.events);
      if (this.cfg.popup.enabled){
        pubsubMsgs = [... new Set(pubsubMsgs)];
        pubsubMsgs.forEach((item, i) => {  // subscribe to any groups in cfg
           this.messageSub(item, this.popup.pubsubHandler.bind(this.popup));
        });
      }
    } else {
      this.error('No renderer for:', this.cfg.renderer);
    }

    this.events = [];
  }

  // Deprocated
  getTextWidth(text){
    return this.renderer.getTextWidth.bind(this.renderer)(text);
  }

  /**
  * Get positioning information for an element.
  *
  * @param string group id
  * @param string element id
  * @param boolean If alt points should be used
  * @return position information
  */
  getElementPosition(gid, eid, alt){
    return this.renderer.getPosition.bind(this.renderer)(gid, eid, alt);
  }

  /**
  * Returns the resources allocated by a call to the constructor
  *
  * @return none
  */
  destroy(){
    window.removeEventListener('resize', this.rdb, true);
    let instance = document.querySelector(this.cfg.selector + " > div");
    if (this.popup && this.popup.PopupElement && this.popup.PopupElement._tippy)
      instance._tippy.destroy();  // TODO: make plugin destroy method

    if (this.renderer.destroy)
      this.renderer.destroy();
    // if (this.renderer.dispose)
    //   this.renderer.dispose();
  }

  /**
  * Get defaults for the config frames section
  *
  * @param object The incomplete user specified cfg
  * @return a complete frames cfg
  */
  resolveCfg(v) {
    let cfg = {
        selector:"#visualization",
        exportName:"visualization",
        style: {
          width:'70vw',
          height:'60vh'
        },
        attrs: {},
        zoom:false,
        drag:false,
        popup:{enabled:true},
        renderer:{
          name:'svg',
          hidpi:false
        }
      };

    v = this.h.mergeDeep(cfg, v);
    return v;
  }

  /**
  * download a single svg
  *
  * @param object The svg element
  * @param string The svg name
  * @return a complete frames cfg
  */
  exportSvg(svgEl, name) {
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var svgData = svgEl.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  /**
  * Create a single svg for all objects in a container
  *
  * @return none
  */
  export() {
    let name = this.cfg.exportName?this.cfg.exportName:"vis"
    let composite;

    if (this.renderer.exportSVG) { // engine specific
      let svg = this.renderer.exportSVG(name);
      composite = d3.select(svg);
    } else { // generic output
      let content = [];
      d3.selectAll(`${this.cfg.selector} > *`).each(function(e){
        if (this._visualization)
          content.push(this._visualization.tk.draw.getSVG());
      })

      composite = d3.create('svg').attr('viewBox', content[0].getAttribute('viewBox'));
      content.forEach((item, i) => {
        let nodes = d3.select(item).selectAll(':scope > clippath, :scope > g').clone(true).nodes(); // toplevel children
        nodes.forEach((e, i) => {
          composite.append(d=>e);
        });
      });
    }
    this.h.log('Export:', composite.node())
    // download it
    this.exportSvg(composite.node(), name + '.svg');
  }
}
