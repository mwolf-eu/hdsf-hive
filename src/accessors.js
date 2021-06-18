Hive.Accessors = class {

  /**
  * Initialize locals
  *
  * @param object Functions from core
  * @return none
  */
  constructor(handlers) {
    this.h = handlers;
    this.generated = {accessors:{}}; // generated accessors
  }

  /**
  * Creates a scale for each accessor object in cfg and adds it to the scaleDict obj.
  * Since any accessor can be used in any frame, the range is deferred until the plugin runs.
  *
  * @param object The accessor cfg
  * @return none
  */
  entry (cfg) {
    let builtins ={ // used for builtin data
      "_builtin-x_":{field:'x', domain:[0,100], type:'linear', range:'width'},
      "_builtin-y_":{field:'y', domain:[0,100], type:'linear', range:'-height'}
    }
    this.cfg = {...builtins, ...cfg};
    this.scaleDict = {};
    this.dynMethods = ['domain', 'range']; // methods whose args can be uniq for each draw

    Object.keys(this.cfg).forEach((d, i) => {
      let c = this.cfg[d];
      let type = c.type.charAt(0).toUpperCase() + c.type.slice(1);

      this.scaleDict[d] = d3[`scale${type}`]();

      // set opts
      let methods = Object.keys(this.scaleDict[d]);
      methods.forEach((item, i) => {
        // set variable ranges or domains later
        if (this.dynMethods.includes(item) && !Array.isArray(c[item])) return;
        if (item in c) this.scaleDict[d][item](c[item]);
      });

      this.scaleDict[d].cfg = this.cfg[d];
      this.scaleDict[d].field = 'field' in c?c.field:d;
    });
  }

  /**
  * Parse the accessor section, resolve the scales with the local frame sizes,
  * and return the set of functions for all plugin config fields requested.
  *
  * @param object Draw attribute and accessor pairs
  * @param object Bbox stats
  * @param array  Draw data
  * @return An object containing the accessor functions
  */
  getScaledAccessors(keyPairs, relKeys, data) {
    let saDict = {}; // finalized scaled accessors
    let continuousDomains =
    ["linear", "pow", "sqrt", "log", "time", "sequential", "quantize"];

    let dynSetter = {
      domain:(domain, relKeys, sa) => {
        // set special keys here
        // if domain does not exist & special type of scale then do extents
      },
      range:(range, relKeys, sa) => {
        sa.range([0,1]);
        let rBeg = sa.bandwidth?sa.bandwidth()/2:0; // band scale? offset range begin

        if(range == "width")
          return [relKeys['bbox.w']*rBeg, relKeys['bbox.w'] + relKeys['bbox.w']*rBeg];

        if(range == "height")
          return [- rBeg * relKeys['bbox.h'], relKeys['bbox.h'] - (relKeys['bbox.h'] * rBeg)];

        if(range == "-height")
          return [rBeg * relKeys['bbox.h'], - relKeys['bbox.h'] + (relKeys['bbox.h'] * rBeg)];

        if(range == "circleRadians")
          return [0,Math.PI*2];
      }
    }

    // complexKeys.forEach((k) => {
    //   let accDes = getScaledAccessorCfgName(k, cfg); // set sa designator
    //   if (accDes == undefined) return;  // bail if not defined
    keyPairs.forEach((kp) => {
      let k = kp.key;
      let accDes = kp.accDes;

      if (typeof accDes == 'string') {

        function createSA(accDes) {
          if (accDes in this.cfg) {
            let sa = this.scaleDict[accDes]; // set scaled accessor
            let c = sa.cfg;

            // Resolve draw cfg context specific domains & ranges
            this.dynMethods.forEach((item, i) => {
              if(item in c && typeof c[item] == 'string')
              sa[item]( dynSetter[item](c[item], relKeys, sa) );
              if((! (item in c)) && continuousDomains.includes(sa.cfg.type) && item == 'domain') { // auto extent
                let ext = d3.extent(data, d=>d[sa.field]);
                this.warnExtent(sa.field, ext);
                c.domain = ext;  // UNSET THIS IF DATA CHANGES
                sa[item](ext);
              }
            });

            let preF = (d) => d; // ready pre scaler filter
            if ('preFilter' in this.cfg[accDes])
            preF = this.cfg[accDes].preFilter

            let postF = (d) => d; // ready post scaler filter
            if ('postFilter' in this.cfg[accDes])
            postF = (d,i,data) => {return this.cfg[accDes].postFilter(d,i,data)}

            return (d,i) => {
              if (d == undefined) return sa;
              let val = d[sa.field];
              if (val == undefined && 'data' in d)
              val = d.data[sa.field];
              return postF(sa(preF(val,i)), i, d);
            } // is scaled object accessor
          } else {
            this.h.error("No scaled accessor named:", accDes);
          }
        }

      // } else { // is a string of some sort
        // if (typeof(accDes) == 'string') {

          let val, sa, col; // val literal, scaled accessor, data col
          function adParse(a) {
            a.replace(/^[^\{\}\[\]]+|(\{[\w\-]+\})|(\[\w+\])/g,
              d=>{
                  if(/^[^\{\}\[\]]+$/.test(d)) val=d; // no diacritical marks == value
                  if(/\{[\w\-]+\}/.test(d)) sa=d.slice(1,-1);  // {x} == scaled accessor
                  if(/\[\w+\]/.test(d)) col=d.slice(1,-1); // [x] == data field
              }
            )
          }

          adParse(accDes);

          // might have to include "" enclosure for literals to include []{}
          if(val && !sa && !col) { // got literal value
            saDict[k] = d => val;
            return;
          }

          if(!val && sa && !col) { // got scaled accessor
            saDict[k] = createSA.bind(this)(sa);
            return;
          }

          if(!val && !sa && col){ // got field
            saDict[k] = d => d[col];
            return;
          }

          if(val && sa && !col) { // got value & scaled accessor
            saDict[k] = d => this.scaleDict[sa](val);
            return;
          }

          // BUG: Having the current function will be a problem on zoom / rotate / etc
          if(!val && sa && col) { // got field and GENERATED scaled accessor
            saDict[k] = this.generated.accessors[sa].bind({field:col});   // is pre-calc col name
            return;
          }

          // // column
          // if (/^\[[\w-]*\]/g.test(accDes)) {
          //   saDict[k] = d => {
          //     if (!d) return {name:'getField'}
          //     let val = d[accDes.slice(1,-1)];
          //     if (val == 'undefined') val = d.data[accDes.slice(1,-1)];
          //     return val   // is pre-calc col name
          //   }
          //   return;
          // }
          //
          // // column by accessor
          // if (/^\[.+\]/g.test(accDes)) {  // BUG: Having the current function will be a problem on zoom / rotate / etc
          //   let args = accDes.slice(1,-1).split(',');
          //   let context = {field:args[1]};
          //   saDict[k] = this.generated.accessors[args[0]].bind(context);   // is pre-calc col name
          //   return;
          // }
          //
          // // value by accessor
          // if (/\(.+\,.+\)/g.test(accDes)) { // bind accessor to specific domain value
          //   let args = accDes.slice(1,-1).split(',');
          //   saDict[k] = d => this.scaleDict[args[0]](args[1]);
          //   return;
          // }
          //
          // // string value
          // if (/\([\w-]*\)/g.test(accDes)) {
          //   saDict[k] = d => accDes;    // is string constant
          //   return
          // }

          this.h.error("Malformed scaled accessor:", accDes);
          return;
        // }
      }

      if (typeof(accDes) == 'object')
        saDict[k] = d => accDes;        // is object

      if (! isNaN(accDes))
        saDict[k] = d => accDes;        // is number constant

      if (typeof(accDes) == 'function')
        saDict[k] = d => accDes;        // is fcn
    });

    return saDict;
  }

  /**
  * Return a scale.
  *
  * @param object Scale key
  * @return A scale
  */
  getScale(n) {
    return this.scaleDict[n];
  }

  /**
  * Print a warning if an extent is derived at run-time.
  *
  * @param object Scale key
  * @param object Derived extent
  * @return none
  */
  warnExtent(field, ext) {
    this.h.warn(`Speed-up! Set the "${field}" domain to: ${JSON.stringify(ext)}!`)
  }

  // OLD_getScaledAccessors(relKeys, complexKeys, cfg, data) {
  //   let sd = this.scaleDict
  //   let accessorDict = {};
  //
  //
  //   complexKeys.forEach((k) => {
  //     if (! k in cfg) return; // bail if not defined
  //     let accDes = cfg;
  //     k.split('.').forEach((param, i) => {
  //       if (accDes == undefined) return;
  //       accDes = accDes[param];
  //     });
  //
  //     if (accDes in this.cfg && 'domain' in this.cfg[accDes])  // late binding of domain
  //       sd[accDes].domain(this.cfg[accDes].domain);
  //
  //     // let accDes = cfg[k];    // accessor designator == scales section key, string, number, function constant, or data col name
  //     if (typeof accDes == 'string') {
  //       if (accDes in this.cfg) {
  //
  //         if (! this.cfg[accDes].domain) {   // calc extents  TODO should be cached
  //           let l = data.map(d => parseFloat(d[accDes]));
  //           l = l.filter(d => !isNaN(d));
  //           let e = d3.extent(l);
  //           this.log('Auto domain:', e[0], e[1]);
  //           sd[accDes] = sd[accDes].domain(e);
  //         }
  //
  //         // set range
  //         if (sd[accDes].range) { // some don't have it.
  //           let range = this.cfg[accDes].range // define correct range
  //           sd[accDes].range([0,1]);
  //           let rBeg = sd[accDes].bandwidth?sd[accDes].bandwidth()/2:0; // band scale? offset range begin
  //
  //           if(Array.isArray(range))
  //             sd[accDes] = sd[accDes].range(range)
  //
  //           if(range == "width")
  //             sd[accDes] = sd[accDes].range([relKeys['bbox.w']*rBeg, relKeys['bbox.w'] + relKeys['bbox.w']*rBeg]);
  //
  //           if(range == "height")
  //             sd[accDes] = sd[accDes].range([- rBeg * relKeys['bbox.h'], relKeys['bbox.h'] - (relKeys['bbox.h'] * rBeg)]);
  //
  //           if(range == "-height")
  //             sd[accDes] = sd[accDes].range([rBeg * relKeys['bbox.h'], - relKeys['bbox.h'] + (relKeys['bbox.h'] * rBeg)]);
  //
  //           if(range == "circleRadians"){
  //             sd[accDes] = sd[accDes].range([0,Math.PI*2])
  //           }
  //
  //         }
  //
  //         let s = sd[accDes] // ready scale function
  //
  //         let fieldCfg = this.cfg[accDes].field;
  //         let field = fieldCfg!=undefined?fieldCfg:accDes
  //
  //         let preF = (d) => d; // ready pre scaler filter
  //         if ('preFilter' in this.cfg[accDes])
  //           preF = this.cfg[accDes].preFilter
  //
  //         let postF = (d) => d; // ready post scaler filter
  //         if ('postFilter' in this.cfg[accDes])
  //           postF = (d,i,data) => {return this.cfg[accDes].postFilter(d,i,data)}
  //
  //         accessorDict[k] = (d,i) => {
  //           if (d == undefined) return s;
  //           let val = d[field];
  //           if (val == undefined && 'data' in d)
  //             val = d.data[field];
  //           return postF(s(preF(val,i)), i, d);
  //         } // is scaled object accessor
  //       } else { // is a string of some sort
  //
  //         if (/^\[[\w-]*\]/g.test(accDes)) {
  //           accessorDict[k] = d => {
  //             if (!d) return {name:'getField'}
  //             return d[accDes.slice(1,-1)]   // is pre-calc col name
  //           }
  //           return
  //         }
  //
  //         if (/getGeneratedAccessor\(.+\)/g.test(accDes)) {  // BUG: Having the current function will be a problem on zoom / rotate / etc
  //           let args = accDes.slice(21,-1).split(',');
  //           let context = {field:args[1]};
  //           accessorDict[k] = this.generated.accessors[args[0]].bind(context);   // is pre-calc col name
  //           return;
  //         }
  //
  //         if (/bindAccessor\(.+\)/g.test(accDes)) { // bind accessor to specific domain value
  //           let args = accDes.slice(13,-1).split(',');
  //           // find the accessor obj and field
  //           let accessor = args[0];
  //           let field = accessor;
  //           let sao = this.cfg[accessor];
  //           if ('field' in sao) {
  //             field = sao.field;
  //           }
  //           // get the scaler and derive the value
  //           let sa = this.getScaledAccessors(relKeys, ['sakey'], {['sakey']:accessor}, null)
  //           let val = sa['sakey']({[field]:args[1]});
  //           accessorDict[k] = d => val;
  //           return;
  //         }
  //
  //         accessorDict[k] = d => accDes;    // is string constant
  //       }
  //     }
  //
  //     if (typeof(accDes) == 'object') {
  //       accessorDict[k] = d => accDes;        // is object
  //     }
  //
  //     if (! isNaN(accDes)) {
  //       accessorDict[k] = d => accDes;        // is number constant
  //     }
  //
  //     if (typeof(accDes) == 'function') {
  //       accessorDict[k] = d => accDes; // is fcn
  //     }
  //
  //   });
  //
  //   return accessorDict;
  // }

  /**
  * Dynamically creates an accessor.  Used currently only for maps.
  *
  * @param object The accessor
  * @param string The accessor key
  * @return none
  */
  // store a dyanamically created accessor
  generateAccessor(f, name) {
    this.generated.accessors[name] = f;
  }

  // setRange(sa) {
  //   sa[name].range([0,1]);
  //   let rBeg = sa[name].bandwidth?sa[name].bandwidth()/2:0; // range begin
  //   sa[name] = sa[name].range([qty*rBeg, qty + qty*rBeg])
  // }

  /**
  * Get defaults for the config accessor section
  *
  * @param object The incomplete user specified accessor cfg
  * @return a complete accessor cfg
  */
  resolveCfg(v) {

    let cfg = {type:"linear", range:"-height"};

    let keys = Object.keys(v);
    keys.forEach((k, i) => {
      let c = JSON.parse(JSON.stringify(cfg));
      v[k] = this.h.mergeDeep(c, v[k]);
    });

    return v;
  }
}
