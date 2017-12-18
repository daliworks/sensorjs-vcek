'use strict';

var logger = require('log4js').getLogger('Sensor');

function initDrivers() {
  var vcekSensor;

  try {
    vcekSensor = require('./driver/vcekSensor');
  } catch(e) {
    logger.error('Cannot load ./driver/vcekSensor', e);
  }

  return {
    vcekSensor: vcekSensor
  };
}

function initNetworks() {
  var rs232Vcek;

  try {
    rs232Vcek = require('./network/rs232-vcek');
  } catch (e) {
    logger.error('Cannot load ./network/rs232-vcek', e);
  }

  return {
    'rs232-vcek': rs232Vcek
  };
}

module.exports = {
  networks: ['rs232-vcek'],
  drivers: {
    vcekSensor: ['vcekTemperature', 'vcekHumidity', 'vcekNoise', 'vcekDust', 'vcekLight', 'vcekWeight']
  },
  initNetworks: initNetworks,
  initDrivers: initDrivers
};
