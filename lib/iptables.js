'use strict';

/*
This wraps calls to iptables. There is some sugar on top to make it simpler
for the consuming code to execute commands.
 */

const debug = require('debug')(`leonidas/lib/iptables`);
const { exec } = require('child_process');
const config = require('config');

const { stringify } = JSON;

const { table, chain, prefix } = config.iptables;

const read = () => {
  debug(`read()`);
  const cmd = `iptables -t ${table} -L ${chain} --line-numbers -w`;

  return pexec(cmd)
    .then((lines) => lines.split(`\n`));
};

const delOne = (num) => {
  debug(`delOne()`)
  const cmd = `iptables -t ${table} -D ${chain} ${num} -w`;

  return pexec(cmd);
};

const delAll = (ip) => {
  debug(`deleting all entries for ${ip}`);
  return read()
    .then((lines) =>
      Promise.all(lines
        .reverse()
        .filter((line) => line.includes(ip))
        .map((line) => delOne(line.split(/\s+/)[0]))))
};

const flush = () => {
  debug(`flush()`);
  const cmd = `iptables -t ${table} -F ${chain}`;

  return pexec(cmd);
};

const proxy = (ip, loopback, port) => {
  debug(`proxy(): ${ip}, ${loopback}, ${port}`);
  return delAll(ip)
    .then(() => {
      const cmd = `iptables -t ${table} -I ${chain} 1 -p udp -d ${ip} --dport 161 -j DNAT --to-destination ${loopback}:${port} -w`;

      return pexec(cmd);
    });
}

const passthrough = (ip) => {
  debug(`passthrough(): ${ip}`);
  return delAll(ip)
    .then(() => {
      const cmd = `iptables -t ${table} -I ${chain} 1 -p udp -d ${ip} --dport 161 -j ACCEPT -w`;

      return pexec(cmd);
    });
}


const startLogging = () => {
  debug(`startLogging()`);
  return stopLogging()
    .then(() => {
      const cmd = `iptables -t ${table} -A ${chain} -p udp --dport 161 -j LOG --log-prefix='${prefix} ' -w`;

      return pexec(cmd);
    });
}

const stopLogging = () => {
  debug(`stopLogging()`);
  return read()
    .then((lines) => {
      let promises = lines
        .reverse()
        .filter((line) => line.includes(prefix))
        .map((line) => delOne(line.split(/\s+/)[0]));

      return Promise.all(promises);
    });
}

const pexec = (cmd) => new Promise((resolve, reject) => {
  debug(`pexec: ${cmd}`);

  exec(cmd, (err, stdout, stderr) => {
    if (err)
      return reject(err);

    return resolve(stdout);
  });
});

const iptables = {
  proxy,
  passthrough,
  read,
  delAll,
  delOne,
  flush,
  startLogging,
  stopLogging
};

module.exports = iptables;
