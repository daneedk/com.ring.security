'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    this.enableDebug();
    this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');   

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {

      //this.log(`Notification ${JSON.stringify(report)}`);
      switch (report['Notification Type']) {
        case "Home Security":
          if ( report['Event'] == 2 ) {
            this.setCapabilityValue('alarm_glassbreak', true)
          } else if ( report['Event'] == 3 ) {
            this.setCapabilityValue('alarm_tamper', true) 
          } else if ( report['Event'] == 0 ) {
            this.log("Event Parameter:", report['Event Parameter']);
            this.setCapabilityValue('alarm_glassbreak', false)
            this.setCapabilityValue('alarm_tamper', false)
          }
          break;

        case "System":
          if ( report['Event'] == 5 ) {
            this.enableTestLed();

          }
          break;

      }

    });

    // register listener for Heimdall events
    this.homey.app.heimdallApp
      .on('realtime', (result,detail) => {
          this.updateGlassBreakSensorFromHeimdall(result,detail);
      })

    this.log(`Ring Glass Break Sensor "${this.getName()}" capabilities have been initialized`);
  }

  async enableTestLed( ) {
    this.log('testrequest recieved');
    // A controller application can send an Indicator command class with 
    // the Indicator ID 0x50 (identify) to turn on the LED on the device.

    //this.setIndicator(80); // Does this work? Does it turn of again?

  }

  // Flowcard actions
  async enableDetection(status) {
    if ( status ) {
      this.log('enableDetection is true');
      
      await this.setSettings({
        11: 1,
      });

    } else {
      this.log('enableDetection is false');

      await this.setSettings({
        11: 0,
      });
    }

  }

  async updateGlassBreakSensorFromHeimdall(result,detail) {
    this.log('Event from Heimdall, result:', result); // Surveillance Mode
    this.log('Event from Heimdall, detail:', detail); // value: disarmed | armed | partially_armed

  }

  async setIndicator(value) {
    this.log("Value received to send to indicator: ", value);
    let buf = Buffer.from([value]);  
    this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({ Value: buf })
      .then(this.log)
      .catch(this.error);
  }


  // homeycompose added methods below
  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Glass Break sensor has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Glass Break sensor settings where changed');
    this.log('old:    ', oldSettings);
    this.log('new:    ', newSettings);
    this.log('change: ', changedKeys);
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Glass Break sensor was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Glass Break sensor has been deleted');
  }

}

module.exports = RingDevice;
