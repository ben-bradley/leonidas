'use strict';

/*
The proxy is started on a random port and handles the NAT'ed traffic
for a specific device.
 */

const debug = require('debug')(`lib/proxy`);
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

    if (!options.cache)
      throw new Error(`You must provide a cache property`);
    else if (!options.cache.get)
      throw new Error(`Your cache needs a .get() method`);
    else if (!options.cache.set)
      throw new Error(`Your cache needs a .set() method`);
    else if (!options.cache.has)
      throw new Error(`Your cache needs a .has() method`);

    this.options = Object.assign({}, config.proxy, options);

    const { ip, protocol } = this.options;

    this.socket = dgram.createSocket(protocol);

    this.socket.on(`error`, (err) => { throw err; });

    this.socket.on(`listening`, () => {
      debug(`listening on ${stringify(this.socket.address())}`);
    });

    this.socket.on(`message`, (buf, src) => this.messageHandler(buf, src));
    debug(stringify(this.options));
  }

  start() {
    debug(`start()`);
    return new Promise((resolve, reject) => {
      this.socket.bind(() => {
        const { port } = this.socket.address();

        this.port = port;

        debug(`started`)

        return resolve()
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

  messageHandler(buf, src) {
    debug(`message from: ${src.address}:${src.port}`);

    const request = new Request(buf, src, this.options);
    const reply = new Reply(request, this.socket);

    this.emit(`message`, request, reply);
    debug(`emitted message: ${src.address}:${src.port}`);
  }
};

class Reply {
  constructor(request, socket) {
    const { port, address } = request.src;

    const reply = (varbind) => new Promise((resolve, reject) => {
      const response = Object.assign({}, request.payload);

      response.pdu.type = 2;
      response.pdu.varbinds = [ varbind ];

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

class Request {
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

    return `cache:${ip}:${version}:${community}:${type}:${oid.join('.')}`;
  }
};

module.exports = { Proxy };
