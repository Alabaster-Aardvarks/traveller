# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.define 'development' do |vm| # Changes name of the output VM
  end
  config.vm.synced_folder '.' '/vagrant', disabled: true
  config.vm.synced_folder '../..', '/app'
  config.vm.provision 'docker', type: 'docker'
  config.vm.provision 'docker-compose', type: 'docker-compose', yml: 'docker-compose.yml', run: 'always', project_name: 'traveller'
end
