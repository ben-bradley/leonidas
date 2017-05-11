'use strict';

require('should');
const {
  proxy,
  passthrough,
  read,
  delAll,
  delOne,
  flush,
  startLogging,
  stopLogging
} = require('../lib/iptables');
const debug = require('debug')(`leonidas/test/iptables`);

const ip = `192.168.200.3`;
const loopback = `10.0.2.15`;
const port = 9999;

const shouldBeEmpty = (lines) => {
  // console.log({ lines })
  (lines.length).should.eql(3);
  (lines[0]).should.eql(`Chain PREROUTING (policy ACCEPT)`);
  (lines[1]).should.eql(`num  target     prot opt source               destination         `);
  (lines[2]).should.eql(``);
};

describe(`iptables`, () => {

  describe(`flush`, () => {
    it(`should empty the table`, () =>
      Promise.resolve()
        .then(() => flush())
        .then(() => read())
        .then((lines) => shouldBeEmpty(lines)));
  });

  describe(`logging`, () => {
    beforeEach(() => flush());
    afterEach(() => flush());

    it(`should start`, () =>
      Promise.resolve()
        .then(() => startLogging())
        .then(() => read())
        .then((lines) => {
          (lines.length).should.eql(4);
          (lines[2]).should.eql(`1    LOG        udp  --  anywhere             anywhere             udp dpt:snmp LOG level warning prefix "LEONIDAS "`);
        }));

    it(`should stop`, () =>
      Promise.resolve()
        .then(() => startLogging())
        .then(() => stopLogging())
        .then(() => read())
        .then((lines) => shouldBeEmpty(lines)))
  });

  describe(`proxy`, () => {
    beforeEach(() => flush());
    afterEach(() => flush());

    it(`should create a proxy rule`, () =>
      Promise.resolve()
        .then(() => proxy(ip, loopback, port))
        .then(() => read())
        .then((lines) => {
          (lines.length).should.eql(4);
          (lines[2]).should.eql(`1    DNAT       udp  --  anywhere             ${ip}        udp dpt:snmp to:${loopback}:${port}`);
        }));
  });

  describe(`passthrough`, () => {
    beforeEach(() => flush());
    afterEach(() => flush());

    it(`should create a passthrough rule`, () =>
      Promise.resolve()
        .then(() => passthrough(ip))
        .then(() => read())
        .then((lines) => {
          (lines.length).should.eql(4);
          (lines[2]).should.eql(`1    ACCEPT     udp  --  anywhere             ${ip}        udp dpt:snmp`);
        }));
  });

  describe(`del`, () => {
    beforeEach(() => flush());
    afterEach(() => flush());

    it(`should delete a specific rule`, () =>
      Promise.resolve()
        .then(() => startLogging())
        .then(() => proxy(ip, loopback, port))
        .then(() => read()).then((lines) => (lines.length).should.eql(5))
        .then(() => delAll(ip))
        .then(() => read()).then((lines) => (lines.length).should.eql(4)));
  });

});
