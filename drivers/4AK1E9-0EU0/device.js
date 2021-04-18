'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');
const delay = time => new Promise(res=>setTimeout(res,time));

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
     this.enableDebug();
    // this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');

    // register flow cards
    this.sendPincodeTrigger = this.homey.flow.getDeviceTriggerCard('4AK1E9-0EU0-sendPincode');

    // register listener for Heimdall events
    this.homey.app.heimdallApp
      .on('realtime', (result,detail) => {
          this.updateKeypad(result,detail);
      })

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      // if (!report || !report.hasOwnProperty('Notification Type')) return null;
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
    });

    // register listener for ENTRY CONTROL NOTIFICATION
    this.registerReportListener('ENTRY_CONTROL', 'ENTRY_CONTROL_NOTIFICATION', report => {
      if ( report['Event Type'] == "CACHING" ) return;
      if ( report['Event Data Length'] > 0 ) {
        this.codeString = this.getCodeFromReport(report);
      } else {
        this.codeString = "";
      }

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

      // Trigger flowcard that sends the entered pincode and the action key
      var tokens = { pincode: this.codeString, actionkey: report['Event Type']};
      this.sendPincodeTrigger.trigger(this, tokens, {}, (err, result) => {
        if (err) {
          this.log(err);
          return this.homey.error(err);
        }
      });

      // Perform remote actions
      // send information to Heimdall when the user has the integration enabled
      if ( this.homey.app.heimdall.valid && this.getSetting('useheimdall') ) {
        let postBody = {
          "APIKEY": this.homey.app.heimdall.apikey,
          "actionReadable": this.homey.__("keypad.buttons.readable."+report['Event Type']),
          "action": this.homey.__("keypad.buttons.action."+report['Event Type']),
          "value": this.codeString,
          "diagnostics": {
              "sourceApp": "Ring Security App",
              "sourceFile": "drivers/4AK1E9-0EO0/device.js",
              "sourceDevice": this.getName()
          }
        }
        this.homey.app.heimdallApp.post('/keypad/action',postBody)
          .then((result) => {
            this.log('Heimdall API success reply: ', result);
            this.updateKeypad('Heimdall API Success',result);
          })
          .catch((error) => {
            this.error('Heimdall API ERROR reply: ', error);
            this.updateKeypad('Heimdall API Error',result);
          });
      }
      this.codeString = "";
      
    });

    this.log('Ring Keypad capabilities have been initialized');
  }

  // called from the Heimdall event listener and Heimdall API reply.
  async updateKeypad(result,detail) {
    // Settings?
    let useAudible = true;
    let useVisual = true;
    let soundBeforeDelayedArm = true;
    // 
    let value = 0;
    switch ( result ) {
      case "Surveillance Mode":
        switch (detail) {
          case "partially_armed":
            value = 1;    
            if ( !useAudible ) { value += 16 };
            if ( !useVisual ) { value += 32};
            this.setIndicator(value);
            this.homey.app.heimdall.cancelCountdown = true;
            break;
          case "armed":
            value = 2;    
            if ( !useAudible ) { value += 16 };
            if ( !useVisual ) { value += 32};
            this.setIndicator(value);
            this.homey.app.heimdall.cancelCountdown = true;
            break;
          case "disarmed":
            value = 3;    
            if ( !useAudible ) { value += 16 };
            if ( !useVisual ) { value += 32};
            this.setIndicator(value);
            this.homey.app.heimdall.cancelCountdown = true;
            break;
        }
        break;

      case "Arming Delay": case "Alarm Delay":
        this.homey.app.heimdall.cancelCountdown = false;
        let longDelay = Math.floor(detail/225); // How many times must the longest countdown run?
        let restDelay  = detail-longDelay*225; // how much time left after longest countdown?
        let nextCodeMultiplier = Math.floor(restDelay/15); //how many time does 15 seconds fit in the restDelay
        let nextCode = nextCodeMultiplier*16+6; // run the longest possible delay for the restDelay
        let startLastDelay = (restDelay - nextCodeMultiplier * 15)+1; // run the countdown again to match its endtime with the end of the arming/alarm delay
        let lastDelay = restDelay - startLastDelay; // duration before arming/alarm alert.

        // run the longest countdown untill the restDelay fits an available countdown duration
        for (let i=0; i<longDelay; i++) {
          //this.log("code send:", 246, "Countdown for 225");
          this.setIndicator(246);
          await delay(224000);
        }
        // run the duration of the restDelay if the countdown is still valid
        if ( !this.homey.app.heimdall.cancelCountdown ) {
          this.setIndicator(nextCode);
        }
        await delay(startLastDelay*1000);
        // run the duration of the restDelay, <startLastDelay> seconds after first to match endtime
        if ( !this.homey.app.heimdall.cancelCountdown ) {
          this.setIndicator(nextCode);
        }
        await delay(lastDelay*1000);
        // last alert before arming/alarm
        if ( !this.homey.app.heimdall.cancelCountdown ) {
          if ( soundBeforeDelayedArm && result == "Arming Delay" ) {
            this.setIndicator(36);
          } else {
            this.setIndicator(24);
          }
        }
        await delay(500);
        this.homey.app.heimdall.cancelCountdown = false;

        break;

      case "Sensor State at Arming":
        this.log("Sensor State at Arming:", detail)
        if ( detail = "Active" ) {
          value = 5;    
          if ( !useAudible ) { value += 16 };
          if ( !useVisual ) { value += 32};
          this.setIndicator(value);
        }
        break;

      case "Last Door function":
        this.log("Last Door function:", detail)
        if ( soundBeforeDelayedArm ) {
          if ( !this.homey.app.heimdall.cancelCountdown ) {
            this.setIndicator(36);
          }
          await delay(200);
          if ( !this.homey.app.heimdall.cancelCountdown ) {
            this.setIndicator(22);
          }
          await delay(7800);
          if ( !this.homey.app.heimdall.cancelCountdown ) {
            this.setIndicator(36);
          }
        } else {
          this.setIndicator(22);
        }
        this.homey.app.heimdall.cancelCountdown = true;
        break;
        
      case "Alarm Status":
        this.log("Received an Alarm Status of:", detail)
        if ( detail ) {
          this.setIndicator(52);
        }
        break;
      
      case "Heimdall API Success": case"Heimdall API Error":
        if ( result == "Heimdall API Error" || detail == "Invalid code entered. Logline written, no further action" ) {
          this.setIndicator(8);
        }
        break;

      default:
        // console.log(result, detail)

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
