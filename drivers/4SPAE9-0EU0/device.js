'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    this.enableDebug();
    this.printNode();

    // register Homey's capabilities with Z-Wave COMMAND CLASSES
    this.registerCapability('alarm_motion', 'SENSOR_BINARY');
    this.registerCapability('measure_battery', 'BATTERY');

  }
}

module.exports = RingDevice;