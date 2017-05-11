'use strict';

/*
This is the core app. It binds together all of the components in lib/ and
makes them work together. State is tracked here.
 */

const debug = require('debug')(`leonidas/app`);
const redis = require('redis');

const { Devices } = require('./lib/devices');
const { Device } = require('./lib/device');
const iptables = require('./lib/iptables');
const { Watcher } = require('./lib/watcher');

/*
1. Read the list of devices and start a proxy for each
2. Subscribe to the devices channel to be notified of host events
3. Start the watcher
 */

const app = {
  state: { devices: {} },
  watcher: new Watcher(),
  devices: new Devices()
}

const start = () => {
  return Promise.resolve()

    // flush the iptables
    .then(() => iptables.flush())

    // set up the devices
    .then(() => app.devices.read())
    .then((deviceList) => {
      for (let d of deviceList)
        createDevice(d);

      app.devices.on(`created`, (device) => createDevice(device));
      app.devices.on(`updated`, (device) => updateDevice(device));
      app.devices.on(`deleted`, (key) => deleteDevice(key));

      return app.devices.start();
    })

    // set up the watcher
    .then(() => {
      app.watcher.on(`ip`, (ip) => {
        const device = new Device({ ip });

        app.devices.create(device.toJSON());
      });

      return app.watcher.start();
    });
};

const createDevice = (d) => {
  const device = app.state.devices[d.key] = new Device(d);

  return device.start();
};

const deleteDevice = (key) => {
  const device = app.state.devices[key];

  if (device) {
    return device.stop()
      .then(() => app.state.devices[key] = null);
  }

  return Promise.resolve();
}

const updateDevice = (d) => {
  return deleteDevice(d.key)
    .then(() => createDevice(d))
};

start();
