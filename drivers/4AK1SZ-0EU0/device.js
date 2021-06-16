'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');
const delay = time => new Promise(res=>setTimeout(res,time));

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
       this.enableDebug();
       this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');

    // register flow cards
    // Triggers
    this.sendPincodeTrigger = this.homey.flow.getDeviceTriggerCard('4AK1SZ-0EU0-sendPincode');
    // Conditions
    // Actions

    // Chime action card 15,31,47,63,79
    /*
    this.homey.flow.getActionCard('4AK1SZ-0EU0-soundChime')
      .registerRunListener((args, state) => {
        return this.setIndicator(args.chime);
      });   
    */

    // register listener for Heimdall events
    this.homey.app.heimdallApp
      .on('realtime', (result,detail) => {
          this.updateKeypadFromHeimdall(result,detail);
      })

    // register listener for Ring events (Work in Progress)
    this.homey.app.ringApp
      .on('realtime', (result,detail) => {
          this.log("Ring Event:",result, detail);
          this.updateKeypadFromRing(result,detail);
      })

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      
      this.log(report);

      /*
      switch (report['Notification Type']) {
        case "Power Management":
          if ( report['Event (Parsed)'] == "AC mains disconnected" ) {
            // The AC Mains power is lost
            this.log("Power Management: The AC Mains connection to the Keypad is lost");
            if ( this.getSetting('usetamper') ) {
              this.setCapabilityValue('alarm_tamper', true)
              this.log("Use Tamper alarm is true, AC Mains is lost: Tamper Alarm is activated");
            }
          } else if ( report['Event (Parsed)'] == "AC mains reconnected" ) {
            // The AC Mains power is restored
            this.log("Power Management: The AC Mains connection to the Keypad is restored");
            this.setCapabilityValue('alarm_tamper', false)
          }
        break;

        default:
          this.log(report);
      }
      */
    });

    // register listener for ENTRY CONTROL NOTIFICATION
    this.registerReportListener('ENTRY_CONTROL', 'ENTRY_CONTROL_NOTIFICATION', report => {

      this.log(report);

      /*
      if ( report['Event Type'] == "CACHING" ) return;
      if ( report['Event Data Length'] > 0 ) {
        this.codeString = this.getCodeFromReport(report);
      } else {
        this.codeString = "";
      }
      */

// TESTCODE TESTCODE TESTCODE TESTCODE TESTCODE 
// TESTCODE TESTCODE TESTCODE TESTCODE TESTCODE 
// TESTCODE TESTCODE TESTCODE TESTCODE TESTCODE 
if ( report['Event Type'] == "CANCEL" ) {
  let buf = Buffer.from([0]);
  console.log("CANCEL");
  this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({
    "Value": buf
  }, function( err ) {
    if( err ) return console.error( err );
  });
}

if ( report['Event Type'] == "ENTER" ) {
  let buf = Buffer.from([this.codeString]);
  console.log("ENTER");
  this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({
    "Value": buf
  }, function( err ) {
    if( err ) return console.error( err );
  });
}
// TESTCODE TESTCODE TESTCODE TESTCODE TESTCODE 
// TESTCODE TESTCODE TESTCODE TESTCODE TESTCODE 
// TESTCODE TESTCODE TESTCODE TESTCODE TESTCODE 

      // Trigger flowcard that sends the entered pincode and the action key
      var tokens = { pincode: this.codeString, actionkey: report['Event Type']};
      this.sendPincodeTrigger.trigger(this, tokens, {}, (err, result) => {
        if (err) {
          this.log(err);
          return this.homey.error(err);
        }
      });




    });


    this.log(`Ring Keypad (2nd Gen) "${this.getName()}" capabilities have been initialized`);
    
  }

  // called from the Ring event listener (Work in Progress)
  async updateKeypadFromRing(result,detail) {
    // this.log(result, detail);
    if ( result === "doorbell" ) {
      if ( detail === "ding" ) {
        this.log("Ring Video Doorbell ding event received:",this.getSetting('usechime'));
        if ( this.getSetting('usechime') != "0") {
          this.setIndicator(this.getSetting('usechime'));
        }
      } else if ( detail === "motion" ) {
        this.log("Ring Video Doorbell motion event received");
        
      }
    }
  }

  async setIndicator(value) {
    this.log("Value received to send to indicator: ", value);
    let buf = Buffer.from([value]);    
    this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({
      "Value": buf
    }, function( err ) {
      if( err ) return console.error( err );
    });
  }

  // functions
  getCodeFromReport(report) {
    let codeString = "";
    let codeEntered = report['Event Data'].toJSON();
    for (var i = 0; i < codeEntered.data.length; i++) {
      codeString += String.fromCharCode(codeEntered.data[i]);
    }
    return codeString;
  }

}

module.exports = RingDevice;