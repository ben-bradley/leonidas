'use strict';

/*
The watcher observes the logfile and emits an event when there is a new IP.
This event should be published into redis so that subscribers can fire up a proxy for it
 */

const debug = require('debug')(`lib/watcher`);
const { Tail } = require('tail');
const EventEmitter = require('events');
const config = require('config');

const { stringify } = JSON;

class Watcher extends EventEmitter {
  constructor(options) {
    super();

    debug(`Watcher()`);

    const opts = Object.assign({}, config.watcher, options);

    this.file = opts.file;
    this.filter = opts.filter;
    this.matcher = new RegExp(opts.matcher);

    debug(stringify(opts));

    this.tail = new Tail(this.file);
    this.tail.unwatch();
    this.tail.on(`line`, (line) => this.lineHandler(line));
    debug(stringify(this.options));
  }

  start() {
    debug(`start()`);
    return new Promise((resolve, reject) => {
      this.tail.watch();
      debug(`started`);
      return resolve();
    });
  }

  stop() {
    debug(`stop()`);
    return new Promise((resolve, reject) => {
      this.tail.unwatch();
      debug(`stopped`);
      return resolve();
    });
  }

  lineHandler(line) {
    debug(`line: ${line}`);
    if (line.includes(this.filter) === false)
      return;

    const [ m, s, ip, ...rest ] = line.match(this.matcher);
    debug(`IP found in log: ${ip}`);

    this.emit(`ip`, ip);
  }
};

module.exports = { Watcher };
