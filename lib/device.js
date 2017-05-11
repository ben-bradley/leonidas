'use strict';

const debug = require('debug')(`leonidas/lib/device`);
const os = require('os');
const LRU = require('lru-cache');
const redis = require('redis');
const config = require('config');

const iptables = require('./iptables');
const { Proxy } = require('./proxy');
const { Poller } = require('./poller');

class Device {
  constructor(options) {
    this.options = Object.assign({}, config.device, options);
    this.options.source = this.options.source || os.hostname();

    // TODO: this.options.key validation

    this.key = this.options.key || `device:${this.options.ip}`;

    this.passthrough = null;
    this.proxy = null;
    this.cache = null;
  }

  start() {
    const { ip, loopback } = this.options;

    if (this.handler === `passthrough`)
      return iptables.passthrough(ip);

    this.lru = LRU(this.options.lru);
    this.redis = redis.createClient(this.options.redis);
    this.poller = new Poller(Object.assign({}, config.poller, { ip }));

    this.proxy = new Proxy({ loopback, ip });

    this.proxy.on(`poll`, (poll, reply) => this.pollHandler(poll, reply));

    return this.proxy.start()
      .then((port) => iptables.proxy(ip, loopback, port))
  }

  stop() {
    return Promise.resolve()
      .then(() => this.redis.quit())
      .then(() => iptables.delAll(this.options.ip));
  }

  pollHandler(poll, reply) {
    const { key } = poll;

    let varbind = this.lru.get(key);

    if (varbind) {
      debug(`lru had varbind: ${varbind}`);
      return reply(varbind);
    }

    debug(`checking redis for: ${key}`);
    this.redis.get(key, (err, varbind) => {
      if (err)
        return console.log(err);

      if (varbind) {
        debug(`redis had: ${key}, ${varbind}`);
        this.lru.set(key, varbind);
        return reply(varbind);
      }

      debug(`polling device for: ${key}`);
      this.poller.poll(poll)
        .then((varbind) => {
          if (!varbind) {
            debug(`no varbind returned from poll: ${key}`);
            return;
          }

          varbind = JSON.stringify(varbind);

          debug(`got varbind from poll: ${key}, ${varbind}`);
          this.redis.set(key, varbind, `EX`, this.options.redis.EX);
          this.lru.set(key, varbind);
          return reply(varbind);
        })
        .catch((err) => console.log(err));
    })
  }

  toJSON() {
    return {
      key: this.key,
      ip: this.options.ip,
      handler: this.options.handler,
      source: this.options.source
    };
  }

  stringify() {
    return JSON.stringify(this.toJSON());
  }
}

module.exports = { Device };
