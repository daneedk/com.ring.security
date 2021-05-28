'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.enableDebug();
    // this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      switch (report['Notification Type']) {
        case "Home Security":
          if ( report['Event'] == 2 ) {
            this.setCapabilityValue('alarm_contact', true)
          } else if ( report['Event'] == 0 ) {
            this.setCapabilityValue('alarm_contact', false)
          }
          break;
      }
    });

  }
}

module.exports = RingDevice;