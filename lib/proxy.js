'use strict';

/*
The proxy is started on a random port and handles the NAT'ed traffic
for a specific device.
 */

const debug = require('debug')(`leonidas/lib/proxy`);
const dgram = require('dgram');
const { parse, encode } = require('snmp-native');
const EventEmitter = require('events');
const config = require('config');

const { stringify } = JSON;

class Proxy extends EventEmitter {
  constructor(options) {
    super();
    debug(`Proxy()`);

    if (!options.loopback)
      throw new Error(`You must provide a loopback property`);

    if (!options.ip)
      throw new Error(`You must provide an ip property`);

    this.options = Object.assign({}, config.proxy, options);

    const { ip, protocol } = this.options;

    this.socket = dgram.createSocket(protocol);

    this.socket.on(`error`, (err) => { throw err; });

    this.socket.on(`listening`, () => {
      debug(`listening on ${stringify(this.socket.address())}`);
    });

    this.socket.on(`message`, (buf, src) => this.pollHandler(buf, src));
    debug(stringify(this.options));
  }

  start() {
    debug(`start()`);
    return new Promise((resolve, reject) => {
      this.socket.bind(() => {
        const { port } = this.socket.address();

        this.port = port;

        debug(`started`)

        return resolve(port);
      });
    });
  }

  stop() {
    debug(`stop()`);
    return new Promise((resolve, reject) => {
      this.port = null;
      this.socket.close((err) => {
        if (err)
          return reject(err);

        debug(`stopped`);

        return resolve();
      });
    });
  }

  pollHandler(buf, src) {
    debug(`poll from: ${src.address}:${src.port}`);

    const poll = new Poll(buf, src, this.options);
    const reply = new Reply(poll, this.socket);

    this.emit(`poll`, poll, reply);
    debug(`emitted poll: ${src.address}:${src.port}`);
  }
};

class Reply {
  constructor(poll, socket) {
    const { port, address } = poll.src;

    const reply = (varbind) => new Promise((resolve, reject) => {
      debug(`sending reply on socket`);
      const response = Object.assign({}, poll.payload);

      response.pdu.type = 2;
      response.pdu.varbinds = [
        // (typeof varbind === `string`) ? JSON.parse(varbind) : varbind
        JSON.parse(varbind)
      ];

      const encoded = encode(response);

      socket.send(encoded, port, address, (err, bytes) => {
        if (err)
          return reject(err);

        return resolve(bytes);
      });
    });

    return reply;
  }
};

class Poll {
  constructor(buf, src, options) {
    this.payload = parse(buf);
    this.key = this._makeKey(this.payload, options);
    this.src = src;

    this.community = this.payload.community;

    if (this.payload.pdu.type === 0)
      this.type = `get`;
    else if (this.payload.pdu.type === 1)
      this.type = `getNext`;

    this.oid = this.payload.pdu.varbinds[0].oid;
    this.dst = options.ip;
  }

  _makeKey(payload, options) {
    const { version, community, pdu } = payload;
    const { type, varbinds } = pdu;
    const { oid } = varbinds[0];

    const { ip } = options;

    return `poll:${ip}:${version}:${community}:${type}:${oid.join('.')}`;
  }
};

module.exports = { Proxy };
