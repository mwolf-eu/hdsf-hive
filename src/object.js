"use strict";

// node or frontend
(global||globalThis).Hive = globalThis.Hive||{Type:{}, templatePlugins:[], Plugins:{}, Renderer:{}}

export let Hive = globalThis.Hive;
Hive.Object = class  {

  /**
  * Initialize locals
  *
  * @return none
  */
  constructor() {
    Hive.systemOpts = {};

    // Hive.setOpt = function (path, val) {
    //   path.opt = val
    // }
    //
    // Hive.getOpt = function (path) {
    //   return path.opt
    // }
  }

	/**
  * Writes text to console pending config log level
  *
  * @param unknown Items to print
  * @return none
  */
  log(...msg){
		let txt = msg.join(' ');
    if (this.v == undefined || this.v.logLevel == 'log')
      console.log(txt)
  }


	/**
  * Writes text to console pending config log level
  *
  * @param unknown Items to print
  * @return none
  */
  warn(...msg) {
		let txt = msg.join(' ');
    if (this.v == undefined || this.v.logLevel == 'warn' || this.v.logLevel == 'log')
      console.warn(txt)
  }

	/**
  * Writes text to console pending config log level
  *
  * @param unknown Items to print
  * @return none
  */
  error(...msg) {
		let txt = msg.join(' ');
    if (this.v == undefined || this.v.logLevel == 'error' || this.v.logLevel == 'warn' || this.v.logLevel == 'log')
      console.error(txt)
  }

  /**
  * Returns an RFC4122 version 4 compliant but not cryptographically secure UUID
  *
  * @return UUID
  */
  uuidv4() {
    // let mask = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'; // TRUE UUIDv4
    let mask = 'xxxxxxx'; // smaller than uuidv4 and probably statistically workable
    return mask.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
  }

	/**
  * converts chars to hex codes
  *
  * @param string string object
  * @return string of hex
  */
  utf8ToHex(str) {
    return Array.from(str).map(c =>
      c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) :
      encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
    ).join('');
  }

	/**
  * converts hex to a string
  *
  * @param string hex string
  * @return decoded string
  */
  hexToUtf8(hex) {
    return decodeURIComponent('%' + hex.match(/.{1,2}/g).join('%'));
  }


  /**
   * Deep merge two objects.   WARNING DOES NOT MERGE ARRAYS - OVERWRITES ONLY
   * @param target
   * @param ...sources
   */
  static mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    let isObject = d => (d && typeof d === 'object' && !Array.isArray(d));

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.mergeDeep(target, ...sources);
  }
}
