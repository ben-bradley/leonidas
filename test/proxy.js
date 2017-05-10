'use strict';

require('should');
const { Proxy } = require('../lib/proxy');
const { LRUCache } = require('../lib/cache');
const { parse, encode } = require('snmp-native');
const dgram = require('dgram');

const packet = require('./data/packet');

describe(`Proxy`, () => {

	it(`should have .start(), .stop(), and .messageHandler()`, () => {
		const proxy = new Proxy({
      cache: new LRUCache(),
      loopback: `127.0.0.1`,
      ip: `192.168.10.1`
    });

		(proxy).should.be.an.instanceof(Proxy);
		(proxy).should.have.properties([ `start`, `stop`, `messageHandler` ]);
	});

  it(`should rx/tx messages`, (done) => {

		const proxy = new Proxy({
      cache: new LRUCache(),
      loopback: `127.0.0.1`,
      ip: `192.168.10.1`
    });

    proxy.on(`message`, (request, reply) => {
      (request).should.be.an.Object().with.properties([ `payload`, `key`, `src`, `community`, `type`, `oid` ]);
      (request.key).should.eql(`cache:192.168.10.1:1:public:0:1.3.6.1.2.1.25.1.4.0`);
      (request.payload).should.be.an.Object().with.properties([ `version`, `community`, `pdu` ]);
      (request.payload.version).should.eql(packet.version);
      (request.payload.community).should.eql(packet.community);
      (request.payload.pdu).should.be.an.Object();

      return reply({ type: 4, value: `foobar`, oid: request.oid });
    });

    proxy.start()
      .then(() => {
        const client = dgram.createSocket(`udp4`);

        client.send(encode(packet), proxy.port, `127.0.0.1`);
        client.on(`message`, (buf, src) => {
          const response = parse(buf);

          (response).should.be.an.Object().with.properties([ `version`, `community`, `pdu` ]);
          (response.pdu.type).should.eql(2);
          (response.pdu.varbinds[0].oid).should.eql(packet.pdu.varbinds[0].oid);
          (response.pdu.varbinds[0].value).should.eql(`foobar`);

          done();
        });
      });

  });

});
