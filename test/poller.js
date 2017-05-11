'use strict';

require('should');
const { Poller } = require('../lib/poller');
const { parse, encode } = require('snmp-native');
const dgram = require('dgram');
const debug = require('debug')(`leonidas/test/poller`);

const request = require('./data/request');
describe(`Poller`, () => {

  it(`should poll`, (done) => {
    const server = dgram.createSocket(`udp4`);

    server.on(`message`, (buf, src) => {
      const parsed = parse(buf);

      parsed.pdu.type = 2;
      parsed.pdu.varbinds[0] = {
        type: 4,
        value: `foobar`,
        oid: [ 1, 3, 6, 1, 2, 1, 25, 1, 4, 0 ]
      };

      server.send(encode(parsed), src.port, src.address);
    });

    server.bind(() => {
      const { port } = server.address();

      const poller = new Poller({ ip: `127.0.0.1`, port });

      poller.poll(request)
        .then((varbind) => {
          (varbind).should.be.an.Object().with.properties([ `type`, `value`, `oid` ]);
          (varbind.value).should.eql(`foobar`)
          done();
        })
    });
  });

});
