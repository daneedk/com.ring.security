'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.enableDebug();
    // this.printNode();

    // register Homey's capabilities with Z-Wave COMMAND CLASSES
    this.registerCapability('measure_battery', 'BATTERY');

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      //this.log(report);
      switch (report['Notification Type']) {
        case "Home Security":
          if ( report['Event'] == 8 ) {
            this.setCapabilityValue('alarm_motion', true)
          } else if ( report['Event'] == 0 ) {
            this.setCapabilityValue('alarm_motion', false)
          }
          break;
      }
    });

    this.log(`Ring Motion Detector "${this.getName()}" capabilities have been initialized`);
  }
}

module.exports = RingDevice;