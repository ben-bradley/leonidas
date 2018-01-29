# -*- mode: ruby -*-
# vi: set ft=ruby :

VAGRANTFILE_API_VERSION = "2"

$routerStartup = <<SCRIPT
# Enable routing & connect to gateway
sudo sysctl -w net/ipv4/ip_forward=1
#
# Enable traffic internet traffic
iptables -t nat -A POSTROUTING -j MASQUERADE
#
# Install node
curl -k -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 6
#
# install redis
apt-get update
apt-get upgrade
apt-get install -y redis-server
cp /etc/redis/redis.conf /etc/redis/redis.conf.old
cat /etc/redis/redis.conf.old | grep -v bind > /etc/redis/redis.conf
echo "bind 0.0.0.0" >> /etc/redis/redis.conf
update-rc.d redis-server defaults
/etc/init.d/redis-server start
#
# ping the endpoints to activate the network
ping -c 1 192.168.10.2
ping -c 1 192.168.20.2
SCRIPT

$pollerStartup = <<SCRIPT
route
route del default
route add default gateway 192.168.10.2
ping -c 1 192.168.10.2
apt-get update
apt-get install -y snmp
SCRIPT

$serverStartup = <<SCRIPT
route
route del default
route add default gateway 192.168.20.2
ping -c 1 192.168.20.2
apt-get update
apt-get install -y snmpd
mv /etc/snmp/snmpd.conf /etc/snmp/snmpd.orig
cat /etc/snmp/snmpd.orig | grep -v agentAddress > /etc/snmp/snmpd.conf
echo "agentAddress udp:161,udp6:[::1]:161" >> /etc/snmp/snmpd.conf
service snmpd restart
SCRIPT

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"

  config.vm.define "router" do |router|
    router.vm.network "private_network", type: "dhcp", use_dhcp_assigned_default_route: true
    # router.vm.network "public_network", bridge: "en0: Wi-Fi (AirPort)"
    router.vm.network "private_network", ip: "192.168.10.2"
    router.vm.network "private_network", ip: "192.168.20.2"
    # router.vm.network "forwarded_port", guest: 3000, host: 4000
    router.vm.hostname = "router"
    router.vm.provision "shell", inline: $routerStartup
  end

  config.vm.define "server" do |server|
    server.vm.network "private_network", ip: "192.168.20.3"
    server.vm.hostname = "server"
    server.vm.provision "shell", inline: $serverStartup
  end

  config.vm.define "poller" do |poller|
    poller.vm.network "private_network", ip: "192.168.10.3"
    poller.vm.hostname = "poller"
    poller.vm.provision "shell", inline: $pollerStartup
  end

end
