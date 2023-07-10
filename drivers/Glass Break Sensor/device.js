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

    // Does any of the commands below switch on the indicator?
    //this.setIndicator1(80); // Does this work? Does it turn of again?
    // or
    //this.setIndicator2(80); // Does this work? Does it turn of again?
  }

  // Flowcard actions
  async enableDetection(status) {
    if ( status ) {
      this.log('enableDetection is true');
      

    } else {
      this.log('enableDetection is false');


    }

  }

  async updateGlassBreakSensorFromHeimdall(result,detail) {
    if (result == 'Surveillance Mode') {
      this.log('Event from Heimdall, result:', result,":",detail); 
    }

  }

  async setIndicator1(value) {
    this.log("Value received to send to indicator: ", value);
    let buf = Buffer.from([value]);  
    this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({ Value: buf })
      .then(this.log)
      .catch(this.error);
  
  }

  async setIndicator2(value) {
    this.log("Value received to send to indicator: ", value);
    this.node.sendCommand( this.IndicatorSet([value,]))
      .then(() => {
        this.log("setIndicator Value was sent successfully")
      })
      .catch((error) => {
        this.log("setIndicator error:", error)
        return this.homey.error(error);
      })
  }

  IndicatorSet(indicators) {
    return {
      commandClassId: COMMAND_CLASS_INDICATOR_ID,
      commandId: COMMAND_INDICATOR_SET_ID,
      params: Buffer.from([
        // Indicator 0 Value
        INDICATOR_VALUE_OFF,
        // Indicator Object Count (5 bits)
        indicators.length,
        ...indicators.flatMap((indicator) => [
          indicator.id,
          indicator.property,
          indicator.value,
        ]),
      ]),
    };
  }


  // homeycompose added methods below
  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  /*
  async onAdded() {
    this.log('Glass Break sensor has been added');
  }
  */

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  /*
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Glass Break sensor settings where changed');
    this.log('old:    ', oldSettings);
    this.log('new:    ', newSettings);
    this.log('change: ', changedKeys);
  }
  */

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  /*
  async onRenamed(name) {
    this.log('Glass Break sensor was renamed');
  }
  */

  /**
   * onDeleted is called when the user deleted the device.
   */
  /*
  async onDeleted() {
    this.log('Glass Break sensor has been deleted');
  }
  */

}

module.exports = RingDevice;
