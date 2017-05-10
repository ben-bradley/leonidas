'use strict';

require('should');
const { Watcher } = require('../lib/watcher');
const { writeFile } = require('fs');

const watcherOptions = {
  file: `${__dirname}/data/tmp.log`,
  filter: `${Date.now()}`
};

const IP = `192.168.20.2`;
const line = `May  1 22:23:44 router kernel: [412531.930801] [${watcherOptions.filter}] IN=eth2 OUT= MAC=08:00:27:47:9c:e4:08:00:27:ef:d4:13:08:00 SRC=192.168.10.2 DST=${IP} LEN=64 TOS=0x00 PREC=0x00 TTL=64 ID=43159 DF PROTO=UDP SPT=34836 DPT=161 LEN=44\n`;

describe(`Watcher`, () => {

  const watcher = new Watcher(watcherOptions);

  before(() => watcher.start());
  after(() => {
    writeFile(watcherOptions.file, ``);
    watcher.stop();
  });

  it(`should emit an IP`, (done) => {
    watcher.on(`ip`, (ip) => {
      (ip).should.eql(IP);
      done();
    });

    writeFile(watcherOptions.file, line);
  });

});
