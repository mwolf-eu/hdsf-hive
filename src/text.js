Hive.Text = class Text {

  static snakeToCamel (str) {
    return str.replace(/([-_][a-z])/g,
      (group) => group.toUpperCase()
                    .replace('-', '')
                    .replace('_', '')
                  );
  }

  static reposition(lines, w, sh, cfg) { // set the abs position of text
    let xOff = 0, yOff = 0;
    let h = sh * lines.length;

    switch(cfg.textAnchor) {
      // case 'tl':  // Top Left is the default case
      // break;

      case 'tm':
      case 'mt':
      xOff = -w/2;
      yOff = sh;
      break;

      case 'tr':
      case 'rt':
      xOff = -w;
      yOff = sh;
      break;

      case 'ml':
      case 'lm':
      yOff = sh-(h/2);
      break;

      case 'mm':
      xOff = -w/2;
      yOff = sh-(h/2);
      break;

      case 'mr':
      case 'rm':
      xOff = -w;
      yOff = sh-(h/2);
      break;

      case 'bl':
      case 'lb':
      yOff = -h + sh;
      break;

      case 'bm':
      case 'mb':
      xOff = -w/2;
      yOff = -h + sh;
      break;

      case 'br':
      case 'rb':
      xOff = -w;
      yOff = -h + sh;
      break;
    }

    // add padding
    if (cfg.textAnchor[0] == 'l' || cfg.textAnchor == 'ml') xOff += cfg.pad; // left
    if (cfg.textAnchor[0] == 'r' || cfg.textAnchor == 'mr') xOff -= cfg.pad; // right
    if (cfg.textAnchor[0] == 't' || cfg.textAnchor == 'mt') yOff += cfg.pad; // top
    if (cfg.textAnchor[0] == 'b' || cfg.textAnchor == 'mb') yOff -= cfg.pad; // bottom

    lines.forEach((l, i) => {
      let justOff = 0;
      let xDelta = w - l.measure.width;
      if (cfg.justify == 'center') justOff = xDelta/2;
      if (cfg.justify == 'right') justOff = xDelta;

      l.position.x += cfg.x + xOff + justOff;
      l.position.y += cfg.y + yOff + cfg.lineSpacing + cfg.yOffset;
    });
  }

  static ellipseize (line, w, attr) {
    let lineWidth = measureText([line.text + '...'], attr)[0].width;

    while(line.text.length && lineWidth > w) {
      line.text = line.text.slice(0,-1);
      lineWidth = measureText([line.text + '...'], attr)[0].width;
    }

    line.text += '...';
    line.measure.width = lineWidth;
  }

  // NOTE:  HTML/SVG fonts are not introspectable. "yOffset" exists because fonts may
  // have ascenders/descenders that go higher/lower respectively than a font's X-height.
  // Eg: You style a font to be 14px, draw an X and the bounding box height for the char
  // will be > 14px.  What's worse is you can't query the font for the delta AND the
  // asc/dec ratio can CHANGE as you scale the font.
  // tldr: SVG text vertical centering is unlikely w/o manual tweaking.

  // ALL font-* attrs that affect size must be applied to the text element directly
  // as window.getComputedStyle() will not work if the SVG never hits the DOM.
  static format (content, cfg) {
    let defs = {
      x:0,
      y:0,
      height:100,
      width:300,
      attr:{},
      lineSpacing:0,
      textAnchor:'tm',
      pad:0,
      yOffset:0,
      justify:'left',
      ellipseize:true,
      rotate:0,
      format:d=>d
    };
    cfg = {...defs, ...cfg};
    content = String(cfg.format(content));

    let attr = {};
    Object.keys(cfg.attr).filter(d => d.startsWith('font-')).map(d => attr[this.snakeToCamel(d)] = cfg.attr[d]);

    let rv = layoutText(content, {maxWidth:cfg.width, maxLines: 9999}, attr, {'lineSpacing':cfg.lineSpacing});
    let rvLen = rv[0].lines.length;

    let singleHeight = rv[0].lines[0].measure.height;
    let lines = rv[0].lines.slice(0, parseInt(cfg.height / singleHeight));
    let maxWidth = lines.map(d => d.measure.width).reduce((a, b)=>Math.max(a, b));
    if (maxWidth > cfg.width) maxWidth = cfg.width;

    if (cfg.ellipseize && rvLen > lines.length) {  // ellipseize
      let last = lines.length-1;
      this.ellipseize(lines[last], maxWidth, attr);
    }

    this.reposition(lines, maxWidth, singleHeight, cfg);

    var e = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // e.setAttribute('transform', `rotate(${cfg.rotate} ${cfg.x},${cfg.y})`)

    let strAttr = (' '+JSON.stringify(cfg.attr)).replace(/[{}]/g, '').replaceAll(':', '=').replaceAll(',',' ')
                                                          .replaceAll('"=', '=').replaceAll(' "',' ');

    lines.forEach((item, i) => {
      e.innerHTML += `<text x=${item.position.x} y=${item.position.y} ${strAttr} text-anchor="start" transform="rotate(${cfg.rotate} ${cfg.x},${cfg.y})">${item.text.replace('&nbsp;', ' ')}</text>`;
    });
    e.innerHTML = e.innerHTML.replaceAll('&nbsp;', ' ');

    return ({maxWidth, lines, e, bbox:{w:rv[0].width, h:singleHeight*lines.length}});
  }

  // integration w Hive
  static replace(e, cfg) {
    // resolve w/h units
    ['height', 'width'].forEach((param, i) => {
      let p = cfg.text[param];
      // vis width/height, axis bandwidth, (largest) guide icon height/width
      ['vw','vh','bw','iw','ih'].forEach((unit, i) => {
        if (p && typeof p == 'string' && p.endsWith(unit))
          cfg.text[param] = (parseInt(p)/100) * cfg[unit];
      });
    });
    let content = e.innerHTML;
    let format = cfg.text.format?cfg.text.format:d=>d;
    if(!format(content).length) return {h:0,w:0};
    // if(cfg.text.format && !cfg.text.format(content).length) return {h:0,w:0};

    let id = e.getAttribute('id');
    let x = e.getAttribute('x');
    let y = e.getAttribute('y');
    // let textAnchor = e.getAttribute('text-anchor');
    let rotate;
    (e.getAttribute('transform')||'').replace(/rotate\([\d ]+\)/, d=>rotate=parseFloat(d.slice(7)));

    let def = {x:+x, y:+y};
    // if (textAnchor) def.textAnchor = textAnchor;
    if (rotate) def.rotate = rotate;

    let attr = {};
    [...e.attributes].filter(d=>d.name.startsWith('font-')||d.name=='fill').forEach((a, i) => {
      attr[a.name] = a.nodeValue;
    });

    cfg = {...def, ...cfg.text, attr};


    let rv = this.format(content, cfg);
    rv.e.setAttribute('id', id);

    e.parentElement.append(rv.e);
    e.remove();

    return rv.bbox;
  }
}
