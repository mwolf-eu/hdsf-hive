Hive.Data = class {
  constructor(h, cfg) {
    this.h = h;

    this.cfg = cfg;
    this.promises = [];
    cfg.forEach((item, i) => {
      if (typeof item.url == 'string') {
        let type = item.url.split('.').pop().toLowerCase();
        if (['csv', 'tsv'].includes(type)){
          this.promises.push(d3[type](item.url)
            .then( function(d){
              item.content = d;
              if (item.handler) item.content = item.handler(d);
            })
          );
        } else {
          this.h.error('No loader for file type:', type);
        }
      }
    });
  }
  /**
  * Parses the data array.  This is a stub for future addons which may include:
  * Getting data from urls
  * Verification and wrangling callbacks
  *
  * @param object The relevant data array object
  * @return none
  */
  entry (cfg) {
    // promises are made in constructor
  }

  getPromises() {
    return this.promises;
  }

  /**
  * Gets a data object for a plugin
  *
  * @param object The plugin cfg
  * @return a data array
  */
  getData(drawCfg) {
    let data;
    if (drawCfg.data && typeof drawCfg.data == 'string') {
      // Built-in datas
      // if (drawCfg.data == '_guide-line_')
      switch(drawCfg.data) {
        case '_guide-center_':
          data = [{}];
          break;
        case '_zero_':
          data = [{x:0, y:0}];
          break;
        case '_guide-line_':
          data = [{x:0, y:50}, {x:100, y:50}];
          break;
        // case '_guide-line-end25-column_': // for column guide
        //   data = [{x:75, y:50}, {x:100, y:50}];
        //   break;
        // case '_guide-line-end25-row_':
        //   data = [{x:50, y:25}, {x:50, y:0}];
        //   break;
        case '_area-fill_':
          data = [{x:0, y:100}, {x:100, y:100}];
          break;
        default:
          data = this.cfg.filter(d => drawCfg.data==d.name)[0].content;
      }
    } else
      data = this.cfg[0].content;

    return data
  }

  /**
  * Get defaults for the config data section
  *
  * @param object The incomplete user specified data cfg
  * @return a complete data cfg
  */
  resolveCfg(v) {
    let cfg = {"name":"data-0"};
    v = v.map((data, i) => {
        let lcfg = JSON.parse(JSON.stringify(cfg));
        return this.h.mergeDeep(lcfg, data)
      });
    return v;
  }
}
