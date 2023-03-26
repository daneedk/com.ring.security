'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.enableDebug();
    // this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');

    // Add tamper support if not present
    if (!this.getCapabilities().includes("alarm_tamper")) {
      this.addCapability('alarm_tamper');
    }

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      this.log(`Notification ${JSON.stringify(report)}`);
      switch (report['Notification Type']) {
        case "Home Security":
          if ( report['Event'] == 2 ) {
            this.setCapabilityValue('alarm_contact', true)
          } else if ( report['Event'] == 3 ) {
            this.setCapabilityValue('alarm_tamper', true) 
          } else if ( report['Event'] == 0 ) {
            this.setCapabilityValue('alarm_contact', false)
            this.setCapabilityValue('alarm_tamper', false)
          }
          
          break;
      }
    });
    this.log(`Ring Contact Sensor "${this.getName()}" capabilities have been initialized`);
  }
}

module.exports = RingDevice;