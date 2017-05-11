'use strict';

require('should');
const { Proxy } = require('../lib/proxy');
const { parse, encode } = require('snmp-native');
const dgram = require('dgram');
const debug = require('debug')(`leonidas/test/proxy`);

const packet = require('./data/packet');

describe(`Proxy`, () => {

	it(`should have .start(), .stop(), and .pollHandler()`, () => {
		const proxy = new Proxy({
      loopback: `127.0.0.1`,
      ip: `192.168.10.1`
    });

		(proxy).should.be.an.instanceof(Proxy);
		(proxy).should.have.properties([ `start`, `stop`, `pollHandler` ]);
	});

  it(`should rx/tx messages`, (done) => {

		const proxy = new Proxy({
      loopback: `127.0.0.1`,
      ip: `192.168.10.1`
    });

    proxy.on(`poll`, (poll, reply) => {
      debug(`proxy got poll`);
      (poll).should.be.an.Object().with.properties([ `payload`, `key`, `src`, `community`, `type`, `oid` ]);
      (poll.key).should.eql(`poll:192.168.10.1:1:public:0:1.3.6.1.2.1.25.1.4.0`);
      (poll.payload).should.be.an.Object().with.properties([ `version`, `community`, `pdu` ]);
      (poll.payload.version).should.eql(packet.version);
      (poll.payload.community).should.eql(packet.community);
      (poll.payload.pdu).should.be.an.Object();

      debug(`poll validated, replying`);
      return reply(JSON.stringify({ type: 4, value: `foobar`, oid: poll.oid }))
        .catch((err) => console.log(err));
    });

    debug(`proxy starting...`);
    proxy.start()
      .then((port) => {
        debug(`proxy started`);
        const client = dgram.createSocket(`udp4`);

        debug(`sending poll`);
        client.send(encode(packet), port, `127.0.0.1`);
        client.on(`message`, (buf, src) => {
          debug(`got response to poll`);
          const response = parse(buf);

          (response).should.be.an.Object().with.properties([ `version`, `community`, `pdu` ]);
          (response.pdu.type).should.eql(2);
          (response.pdu.varbinds[0].oid).should.eql(packet.pdu.varbinds[0].oid);
          (response.pdu.varbinds[0].value).should.eql(`foobar`);

          debug(`everything checks out!`);
          done();
        });
      });

  });

});
