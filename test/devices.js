'use strict';

require('should');
const redis = require('redis');
const debug = require('debug')(`leonidas/test/devices`);

const { Devices } = require('../lib/devices');
const device = require('./data/device');

describe(`Devices`, () => {

  it(`local created should emit locally`, (done) => {
    const devices = new Devices();

    devices.on(`created`, (d) => {
      (d).should.eql(device);
      devices.delete(d.key)
        .then(() => devices.stop())
        .then(() => done())
        .catch((err) => done(err));
    });

    devices.start()
      .then(() => {
        devices.create(device);
      })
      .catch((err) => done(err));
  });

  it(`locally updated should emit locally`, (done) => {
    const devices = new Devices();
    const updated = Object.assign({}, device, { handler: `passthrough` });

    devices.on(`updated`, (d) => {
      (d).should.eql(updated);
      devices.delete(d.key)
        .then(() => devices.stop())
        .then(() => done())
        .catch((err) => done(err));
    });

    devices.start()
      .then(() => devices.create(device))
      .then(() => devices.update(updated))
      .catch((err) => done(err));
  });

  it(`remotely updated should emit locally`, (done) => {
    const devices = new Devices();
    const updated = Object.assign({}, device, { handler: `passthrough` });
    const publisher = redis.createClient();

    devices.on(`updated`, (d) => {
      (d).should.eql(updated);
      devices.delete(d.key)
        .then(() => devices.stop())
        .then(() => done())
        .catch((err) => done(err));
    });

    devices.start()
      .then(() => devices.create(device))
      .then(() => new Promise((resolve, reject) => {
        publisher.set(updated.key, JSON.stringify(updated), (err) => {
          if (err)
            return reject(err);

          return resolve();
        });
      }))
      .then(() => {
        publisher.publish(`device`, JSON.stringify({
          key: `device:${device.ip}`,
          action: `updated`
        }));
      })
      .catch((err) => done(err));
  });

});
