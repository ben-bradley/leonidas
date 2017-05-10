'use strict';

/*
The poller handles issuing SNMP polls to a specific device.

 */

const debug = require('debug')(`lib/poller`);
const { Session } = require('snmp-native');
const config = require('config');

const { stringify } = JSON;

class Poller {
  constructor(options) {
    debug(`Poller()`);
    if (!options.ip)
      throw new Error(`You must include an ip property`);

    this.options = Object.assign({}, config.poller, options);

    this.session = new Session({
      host: this.options.ip,
      port: this.options.port
    });

    debug(stringify(this.options));
  }

  poll(request) {
    debug(`poll(): ${stringify(request)}`);
    return new Promise((resolve, reject) => {
      const poll = this.session[request.type].bind(this.session);

      poll({ oid: request.oid, community: request.community }, (err, varbinds) => {
        if (err) {
          debug(`poll error: ${err.stack}`);
          return reject(err);
        }

        debug(`polls rx: ${request.key}`);
        return resolve(varbinds[0]);
      });
    });
  }
};

module.exports = { Poller };
