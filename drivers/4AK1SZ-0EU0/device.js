'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.enableDebug();
    // this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');



    this.log(`Ring Keypad (2nd Gen) "${this.getName()}" capabilities have been initialized`);
    
  }
}

module.exports = RingDevice;