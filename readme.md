# Leonidas

## TODO

- https://github.com/zeit/pkg
- Add the REST API

## Situation

SNMP polling places a high load on the network devices being polled. For legacy devices, this can have a negative impact on their ability to perform their intended purpose.

## Mission

Leonidas reduces the load that SNMP polling puts on network devices by transparently proxying polls and caching their responses in a distributed key/value store.

## Execution

Leonidas needs to be running on a server (virtual or physical) that is in the network path between the SNMP polling sources and the devices being polled. This will enable Leonidas to detect and reroute SNMP traffic through the proxy.

Leonidas can be run in single mode or in a distributed mode as needed based on the routing architecture of the network. The distributed cache will enable all configured instances of Leonidas to share polling data among themselves without having to poll the device directly.

### Devices

When Leonidas detects SNMP traffic bound for a device that it hasn't previously handled, it will spin up a new proxy for that device and alert any other instances of Leonidas to the existence of the new device.

Leonidas can also be configured to passthrough polls to specific devices without caching them.

### Polls

Leonidas handles an SNMP poll as diagramed below:
![Poll Handler Flowchart](https://https://raw.githubusercontent.com/ben-bradley/leonidas/master/docs/poll-handler-flowchart.png "Poll Handler Flowchart")

Data polled from a device is stored in the distributed and in-memory caches for a configurable period. The default is 30 seconds.


## Set up the dev environment

For development purposes, a `Vagrantfile` is included. When you issue the `vagrant up` command, it will spin up three virtual machines:
1. **router** - Where Leonidas runs and connects `poller` and `server`
2. **poller** - A simple host for issuing `snmp*` commands to simulate a polling application
3. **server** - A simple host for responding to SNMP polls

The `router` machine hosts Leonidas.


```bash
# terminal 1
git clone https://github.com/ben-bradley/leonidas.git
cd leonidas
vagrant up
vagrant ssh router
sudo su -
cd /vagrant
node app.js
```

```bash
# terminal 2
vagrant ssh poller
snmpget -v2c -c public 192.168.20.2 1.3.6.1.2.1.1.1.0 -r 0
```
