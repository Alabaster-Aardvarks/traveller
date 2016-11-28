# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network 'private_network', ip: '192.168.99.110'
  config.vm.define 'development' do |vm| # Changes name of the output VM
  end
  config.vm.synced_folder __dir__, '/vagrant', disabled: true
  config.vm.synced_folder __dir__, '/app'
  config.vm.provision :docker
  config.vm.provision :docker_compose, yml: '/app/docker-compose.yml', run: "always", project_name: 'traveller'
end
