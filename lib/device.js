'use strict';

const debug = require('debug')(`lib/device`);
const os = require('os');
const config = require('config');

const { stringify } = JSON;

class Device {
  constructor(options) {
    this.options = Object.assign({}, config.devices.device, options);

    this.key = `device:${this.options.ip}`;

    this.ip = this.options.ip;
    this.handler = this.options.handler;
    this.source = this.options.source || os.hostname();
  }

  stringify() {
    return stringify({
      ip: this.ip,
      handler: this.handler,
      source: this.source
    });
  }
}

module.exports = { Device };
