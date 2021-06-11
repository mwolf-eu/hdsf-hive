"use strict";

Hive.Plugins.axis = class {

  static genAccessors() {
    // let dFcn = d3.axisTop();
    // let methods = Object.keys(dFcn) // resolve curve before passing to gen
    //                     .filter(d => typeof dFcn[d]() == 'function')
    return ['(scale)'];
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
    let scale = ls.sa['(scale)'];
    let bw = scale().bandwidth?scale().bandwidth()/2:0;  // scaled are offset for some reason
    let gc = h.getObjPath(cfg, 'opt.gridColor');
    let orientation = h.getObjPath(cfg, 'opt.orientation')

    let cvt = {
      top:    {anchor:'bm', justify:'center', name:'axisTop', xlate:`translate(${-bw}, 0)`},
      bottom: {anchor:'tm', justify:'center', name:'axisBottom', xlate:`translate(${-bw}, ${-ls.rk['bbox.h']})`},
      left:   {anchor:'mr', justify:'right', name:'axisLeft', xlate:`translate(${ls.rk['bbox.w']}, ${-bw})`},
      right:  {anchor:'ml', justify:'left', name:'axisRight', xlate:`translate(0, ${-bw})`},
    }
    let info = cvt[orientation];

    let axisGen = h.configGen(d3[info.name](), cfg, ls);

    if (gc)
      axisGen.tickFormat('').tickSize(['top','bottom'].includes(orientation)?ls.rk['bbox.h']:ls.rk['bbox.w']);

    let group = d3.select(ls.g);
    group.call(axisGen);

    let c = {
      cfg:cfg,
      layerState:ls,
      target:group
    };
    let rv = h.configElements(c);

    if (gc) {
      group.selectAll('.tick > line').attr('stroke', gc);
      group.selectAll('path').remove();
    }

    // let ttw = h.getObjPath(cfg, 'opt.textWrap');
    // if (scale().bandwidth && ttw) {
    //   ttw = ttw=='auto'?(scale().bandwidth())*.9:ttw;
    //   let family  = group.select(".tick text").attr('font-size');
    //   let size = group.select(".tick text").attr('font-size');
    //   group.selectAll(".tick text")
    //     .call(h.wrap, ttw, family, size, orientation);
    // }
    //
    // let r = h.getObjPath(cfg, 'opt.rotateText');
    // if (r) {
    //   let text = group.selectAll('text');
    //   text.attr('transform',`rotate(${r})`);
    //   // let fs = text.attr('font-size');
    //   // text.attr('transform',`rotate(${r} 0,${(fs*1.5)})`);
    // }

    // translate to bbox
    group.selectAll('g, path')
      .attr('transform', (d,i,e)=>{
        let x = e[i].getAttribute('transform');
        return (x?(x + " "):"") + info.xlate;
      });

    let bandwidth = ls.sa['(scale)']().bandwidth;
    let text = h.getObjPath(cfg, 'opt.text');
    if (text) {
      let maxTxtH = 0;
      let szDim = ['top', 'bottom'].includes(orientation)?'h':'w';
      group.selectAll('text').each(function (d){
        let rv = Hive.Text.replace(this, {vh:ls.rk['bbox.h'], vw:ls.rk['bbox.w'], bw:bandwidth?bandwidth():10,
                    text:{textAnchor:info.anchor, justify:info.justify, ...text}});
        maxTxtH = maxTxtH>rv[szDim]?maxTxtH:rv[szDim];
      });
      let maxH = axisGen.tickSize() + axisGen.tickPadding() + maxTxtH;
      ls.template.calls.push(['setAxisSz', maxH]);
    }
  }


  /**
  * Gets the defaults for this plugin
  *
  * @return An object with the defaults
  */
  static getDefaults(cfg) {
    let def = {
      gridFrame:'chart center-container > view', opt:{orientation:'bottom', rotateText:0, textWrap:'auto'},
      attr:{
        '.tick > text':{'fill':'#333', 'font-family':"Roboto", 'font-size':10, 'font-style':"normal"},
        '.tick > line':{'stroke-width':1, color:"rgb(0,0,0)"},
        '.domain':{'stroke-width':1, stroke:"rgb(0,0,0)"}
      }
      // ticks:{font:{color:'#333', family:"Roboto", size:10, style:"normal"}, stroke:{width:1, color:"rgb(0,0,0)"}, padding:8, },
      // dbar:{stroke:{width:1, color:"rgb(0,0,0)"}}
    }

    if (cfg.frame)
      return def;

    if (cfg.opt && cfg.opt.gridColor)
      return {...def, frame:'chart center-container > view'};

    if (cfg.opt && cfg.opt.orientation)
      return {...def, frame:`chart ${cfg.opt.orientation} > axis`};
    else
      return {...def, frame:`chart bottom > axis`};
  }
}
