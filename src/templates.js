"use strict";

/*
*  Templates are html flex-line templates to control layout of graphical elements.
*  The flex worker which resolves the config into x/y/h/w/etc. is running in another
*  thread.  As with html flex, there is a root node which contains nested children
*  ad-nauseum. In addition to flex properties, this implementation contains per-
*  node opt, and handlers.
*
*  Opt contains user attached data which it delivers in a callback whenever a specific
*  node resizes.
*
*  Handlers contains directives on how to RELATIVELY modify the template when a property
*  changes.  Eg: Account for a shift in title centering when the left axis grows.  While
*  it makes the overall template more cumbersome, it elides the need for two flex
*  reflows per viewport change. Eg: Reflow to get the width of the left axis, apply
*  it the title left margin, and reflow again.
*/

Hive.templates = class {

  /**
  * Initialize locals and template opts
  *
  * @return none
  */
  constructor() {

    // primitive opts for this module
    let margins = {
      all:0,
      // right:0,
      // bottom:0,
      // left:0
    };

    let textAnchor = {
      margins:this.clone(margins)
    };

    let axis = {
      enabled:true,
      height:'100%',
      width:'100%',
      margins:this.clone(margins),
      textAnchor:this.clone(textAnchor, {margins:{}})
    };

    let guide = {
      enabled:true,
      margins:this.clone(margins)
    }

    // main opts for this module
    this.opt = {
      prefix:'',
      viewData:{},

      basic:{
        title:{textAnchor:this.clone(textAnchor, {margins:{top:16,bottom:4}})},
        margins:this.clone(margins),
        padding:{all:5},
        guide:{
          right:this.clone(guide, {margins:{left:2}}),
          bottom:this.clone(guide, {margins:{top:2}})
        }
      },

      chart:{
        axis:{
          top:this.clone(axis, {enabled:false, height:30, textAnchor:{margins:{top:10}}, margins:{bottom:10}}),
          right:this.clone(axis, {enabled:false, width:30, textAnchor:{margins:{left:10}}, margins:{left:10}}),
          bottom:this.clone(axis, {height:30, textAnchor:{margins:{top:10}}, margins:{top:10}}),
          left:this.clone(axis, {width:30, textAnchor:{margins:{left:10}}, margins:{right:10}}),
          // left:this.clone(axis, {width:0, textAnchor:{margins:{left:10}}, margins:{right:10}})
        }
      }
    };

    Hive.templatePlugins.forEach((item, i) => { // add plugins
      Object.assign(this.__proto__, item.proto);
      item.init.bind(this)();
    });
  }

  /**
  * Clone & mask a template object
  *
  * @param object existing object
  * @param object new object to merge into existing
  * @return merged object
  */
  clone (branch, layer) {
    let obj = JSON.parse(JSON.stringify(branch));
    return Hive.Object.mergeDeep(obj, layer);
  }

  /**
  * Get node from a template config
  *
  * @param object template object
  * @param object node selector
  * @return config node
  */
  static getCfgNode(cfg, sel) {
    let byID = [];
    let getIDs  = function(cfg, pid) {
      let id = (pid?pid+' ':'')+cfg.id
      byID.push({id:id, node:cfg})
      if (cfg.children)
      cfg.children.forEach(d => {
        getIDs(d, id)
      });
      return byID;
    }

    let ids = getIDs(cfg);
    let s = sel.trim();
    s = s.replace(/ *> */g, '>');
    s = s.replace(/ /g, ' [ \\-\\w]*');
    s = s.replace(/>/g, ' ');
    // if (!(s.split(' ')[0] == cfg.id)) s = ' '+s; // put a space in front if not root
    s = s.split(' ')[0]==cfg.id ? '^'+s : ' '+s; // if root put caret else space


    let n = ids.filter(d => RegExp(s+'$').test(d.id));
    if (n.length > 1) console.warn('Multiple matches for selector:', sel, '\nUsing [0]');
    if (n.length == 0) console.error('No matches for selector:', sel);
    return n[0].node;

    //
    // path.split(' ').forEach(p => {
    //   cfg = cfg.children.filter(d => d.id == p)[0];
    // });
    // return cfg;
  }

  /**
  * Get options
  *
  * @param object template config
  * @return cloned template config
  */
  resolveOpt (cfg) {
    let c = this.clone(this.opt, cfg||{});
    if (c.prefix.length && !c.prefix.endsWith('-')) c.prefix += '-';
    return  c;
  }


  /**
  * Get basic template with right & bottom guides
  *
  * @param object template config options
  * @return template
  */
  basic(cfg) {
    let o = this.resolveOpt(cfg);
    let c = o.basic

    let rightGuideTopMargin = (c.title.textAnchor.margins.top||0) + (c.title.textAnchor.margins.bottom||0);
    let template = {
      "id": o.prefix+"basic", "attr": {
        "flex-wrap": "wrap-no-wrap", "flex-direction": "flex-direction-row", "flex-shrink":1, "flex-grow":1}, "children": [
          {"id": "left-container", "attr":{"flex-direction": "flex-direction-column","flex-shrink":1, "flex-grow":1}, "children":[
            {"id": "title", "attr":{"padding edge-left":0, "padding edge-right":0}, "children":[
              {"id": "text", handlers:{setTextHeight:[
                {op:'subCur', nodes:[`${o.prefix}basic > guide-right`], srcAttr:"margin edge-top", dstAttr:"padding edge-top"},
                {attr:"margin edge-top"},
                {op:'add', nodes:[`${o.prefix}basic > guide-right`], attr:"padding edge-top"}
              ]}, "attr":{"margin edge-top":c.title.textAnchor.margins.top, "margin edge-bottom":c.title.textAnchor.margins.bottom, "align-self":"align-center", "height":1, "width":1}},
            ]},
            {"id": "center-view", "attr":{"flex-shrink":1, "flex-grow":1}, opt:o.viewData, "children":[]},
            {"id": "guide-bottom", "attr":{"padding edge-left":0, "padding edge-right":0, "margin edge-top":c.guide.bottom.margins.top||0, "flex-wrap":"wrap-wrap", "flex-direction":"flex-direction-row"}, children:[]}
          ]},
          {"id": "guide-right", "attr":{"padding edge-top":rightGuideTopMargin, "margin edge-left":c.guide.right.margins.left||0, "height":"100%"}, "children":[]}
        ]
      }

      Object.keys(c.padding).forEach((p, i) => {
        template.attr[`padding edge-${p}`] = c.padding[p];
      });

      Object.keys(c.guide).forEach((g, i) => {
        if (!c.guide[g].enabled){
          let node = this.constructor.getCfgNode(template, 'guide-'+g);
          node.attr = {};
        }
      });

      return template;
    }

    /**
    * Get template with quadrants
    * This is often used for polar charts where the top right quadrant selector
    * & origin is used and the chart spans clockwise into the -x,-y domains.
    *
    * @param object template config options
    * @return template
    */
    quadrants(cfg) {
      let o = this.resolveOpt(cfg);
      let c = o.chart;

      let template = this.basic(c);

      this.constructor.getCfgNode(template, 'center-view').attr["flex-wrap"]="wrap-wrap";
      this.constructor.getCfgNode(template, 'center-view').attr["flex-direction"]="flex-direction-row";

      let children = [
        {"id": "q0", "attr": {"height":"50%", "width":"50%"}},
        {"id": "q1", "attr": {"height":"50%", "width":"50%"}},
        {"id": "q2", "attr": {"height":"50%", "width":"50%"}},
        {"id": "q3", "attr": {"height":"50%", "width":"50%"}}
      ];

      this.constructor.getCfgNode(template, 'center-view').children = children;
      return template;
    }

    /**
    * Get chart template with axes, & axes labels
    * This is often used for polar charts where the top right quadrant selector
    * & origin is used and the chart spans clockwise into the -x,-y domains.
    *
    * @param object template config options
    * @return template
    */
    chart(cfg) {
      let o = this.resolveOpt(cfg);
      let c = o.chart;

      let axisSize = {};
      Object.keys(c.axis).forEach((axis, i) => {
        let a = c.axis[axis];
        if (!a.enabled) {
          axisSize[axis]=0;
          return;
        }

        if (["top","bottom"].includes(axis))
        axisSize[axis] = a.height + (a.margins.top||0) + (a.margins.top||0) + (a.textAnchor.margins.top||0) + (a.textAnchor.margins.bottom||0);
        else
        axisSize[axis] = a.width + (a.margins.left||0) + (a.margins.right||0) + (a.textAnchor.margins.left||0) + (a.textAnchor.margins.right||0);
      });

      let parentTemplate = this.basic({...cfg, viewData:{}});

      let template = {
        "id": o.prefix+"chart", "attr": {"flex-wrap": "wrap-no-wrap", "flex-direction": "flex-direction-column", "flex-shrink":1, "flex-grow":1}, "children": [
          {"id":"top", "attr": {"flex-wrap": "wrap-no-wrap", "flex-direction": "flex-direction-column", "margin edge-left":axisSize.left, "margin edge-right":axisSize.right}, "children": [
            // {"id":"top", "attr":{"width":"100%", "flex-direction": "flex-direction-column",
            // "flex-shrink":1, "flex-grow":1}, "children": [
            {"id":"text", handlers:{setTextHeight:[{attr:"margin edge-top"}]}, "attr":{"align-self":"align-center"}},
            {"id":"axis", "attr":{"flex-direction": "flex-direction-row"}, children:[]}
            // ]},
          ]},
          {"id":"center-container", "attr": {"flex-wrap": "wrap-no-wrap", "flex-direction": "flex-direction-row", "flex-shrink":1, "flex-grow":1}, "children": [

            {"id":"left", "attr":{"flex-direction": "flex-direction-row"}, "children": [
              {"id":"text",
              handlers:{setTextHeight:[
                {op:'subCur', nodes:[o.prefix+'chart top', o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], srcAttr:'margin edge-left', dstAttr:"margin edge-left"},
                {attr:"margin edge-left"},
                {op:'add', nodes:[o.prefix+`chart top`, o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], attr:"margin edge-left"}
              ]
            }, "attr":{"align-self":"align-center"}},
            {"id":"axis",
            handlers:{setAxisSz:[
              {op:'subCur', nodes:[o.prefix+'chart top', o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], srcAttr:'width', dstAttr:"margin edge-left"},
              {attr:"width"},
              {op:'add', nodes:[o.prefix+'chart top', o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], attr:"margin edge-left"}
            ]
          }, "attr":{"flex-direction": "flex-direction-column"}, children:[]}
        ]},

        {"id":"view", "attr":{"flex-shrink":1, "flex-grow":1}, opt:o.viewData},

        {"id":"right", "attr":{"flex-direction": "flex-direction-row"}, "children": [
          {"id":"axis", handlers:{setAxisSz:[
            {op:'subCur', nodes:[o.prefix+'chart top', o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], srcAttr:'width', dstAttr:"margin edge-right"},
            {attr:"width"},
            {op:'add', nodes:[o.prefix+'chart top', o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], attr:"margin edge-right"}
          ]}, "attr":{"flex-direction": "flex-direction-column"}, children:[]},
          {"id":"text", handlers:{setTextHeight:[
            {op:'subCur', nodes:[o.prefix+'chart top', o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], srcAttr:'margin edge-right', dstAttr:"margin edge-right"},
            {attr:"margin edge-right"},
            {op:'add', nodes:[o.prefix+'chart top', o.prefix+'chart > bottom', o.prefix+'basic > left-container > title'], attr:"margin edge-right"}
          ]}, "attr":{"align-self":"align-center"}}
        ]}
      ]},
      {"id":"bottom", "attr": {"flex-wrap": "wrap-no-wrap", "flex-direction": "flex-direction-column", "margin edge-left":axisSize.left, "margin edge-right":axisSize.right},"children": [
        // {"id":"bottom", "attr":{"flex-direction": "flex-direction-column", "flex-shrink":1, "flex-grow":1}, "children": [
        {"id":"axis", handlers:{setAxisSz:[{attr:"height"}]}, "attr":{"flex-direction": "flex-direction-row"}, children:[]},
        {"id":"text", handlers:{setTextHeight:[{attr:"margin edge-top"}]}, "attr":{"align-self":"align-center"}}
        // ]},
      ]}
      // {"id":"bottom-container", "attr": {"flex-wrap": "wrap-no-wrap", "flex-direction": "flex-direction-row", "padding edge-left":axisSize.left, "padding edge-right":axisSize.right},"children": [
      //   {"id":"bottom", "attr":{"flex-direction": "flex-direction-column", "flex-shrink":1, "flex-grow":1}, "children": [
      //     {"id":"axis", handlers:{setAxisSz:[{attr:"height"}]}, "attr":{"flex-direction": "flex-direction-row"}, children:[]},
      //     {"id":"text", handlers:{setTextHeight:[{attr:"margin edge-top"}]}, "attr":{"align-self":"align-center"}}
      //   ]},
      // ]}
    ]};

    // basic title
    let node = this.constructor.getCfgNode(parentTemplate, `${o.prefix}basic > left-container > title`);
    ['left', 'right'].forEach((e, i) => {
      node.attr[`margin edge-${e}`] = axisSize[e];
    });

    // layout
    Object.keys(c.axis).forEach((a, i) => {
      if (c.axis[a].enabled) { // config axis
        let node = this.constructor.getCfgNode(template, `${a} axis`);
        node.attr.width = c.axis[a].width;
        node.attr.height = c.axis[a].height;
        Object.keys(c.axis[a].margins).forEach((m, i) => {
          node.attr[`margin edge-${m}`] = node.attr[`margin edge-${m}`]||0 + c.axis[a].margins[m];
        });

        node = this.constructor.getCfgNode(template, `${a} text`);
        Object.keys(c.axis[a].textAnchor.margins).forEach((m, i) => {
          node.attr[`margin edge-${m}`] = (node.attr[`margin edge-${m}`]||0) + c.axis[a].textAnchor.margins[m];
        });
      } else { // delete axis
        let node = this.constructor.getCfgNode(template, `${a}`)
        node.attr = {}; // DELETE ATTR INSTEAD
        node.children = [];
      }
    });

    this.constructor.getCfgNode(parentTemplate, 'center-view').children = [template];
    return parentTemplate;
  }

}
