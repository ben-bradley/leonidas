'use strict';

/*
The watcher observes the logfile and emits an event when there is a new IP.
This event should be published into redis so that subscribers can fire up a proxy for it
 */

const debug = require('debug')(`leonidas/lib/watcher`);
const { Tail } = require('tail');
const EventEmitter = require('events');
const iptables = require('./iptables');
const config = require('config');

const { stringify } = JSON;

class Watcher extends EventEmitter {
  constructor(options) {
    super();

    debug(`Watcher()`);

    this.options = Object.assign({}, config.watcher, options);

    debug(stringify(this.options));

    this.file = this.options.file;
    this.filter = this.options.filter;
    this.matcher = new RegExp(this.options.matcher);

    this.tail = new Tail(this.file);
    this.tail.unwatch();
    this.tail.on(`line`, (line) => this.lineHandler(line));
  }

  start() {
    debug(`start()`);
    return iptables.startLogging()
      .then(() => {
        this.tail.watch();
        debug(`started`);
      });
    // return new Promise((resolve, reject) => {
    //   this.tail.watch();
    //   return resolve();
    // });
  }

  stop() {
    debug(`stop()`);
    return iptables.stopLogging()
      .then(() => {
        this.tail.unwatch();
        debug(`stopped`);
      });
    // return new Promise((resolve, reject) => {
    //   this.tail.unwatch();
    //   debug(`stopped`);
    //   return resolve();
    // });
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
