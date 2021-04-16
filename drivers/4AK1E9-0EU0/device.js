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

    this.homey.app.heimdallApp
      .on('realtime', (result,detail) => {
          this.updateKeypad(result,detail);
      })

    // register listnener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      // if (!report || !report.hasOwnProperty('Notification Type')) return null;
      this.log("--------------- NOTIFICATION Listener report begin -----------------");
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
      this.log("--------------- NOTIFICATION Listener report einde -----------------");
    });

    // register listener for ENTRY CONTROL NOTIFICATION
    this.registerReportListener('ENTRY_CONTROL', 'ENTRY_CONTROL_NOTIFICATION', report => {
      this.log("--------------- ENTRY CONTROL NOTIFICATION Report -------------------");
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


      return
      // TESTCODE TESTCODE TESTCODE TESTCODE TESTCODE 
      
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
              "sourceApp": "Ring Zwave App",
              "sourceFile": "drivers/4AK1E9-0EO0/device.js",
              "sourceDevice": this.getName()
          }
        }
        this.homey.app.heimdallApp.post('/keypad/action',postBody)
          .then((result) => this.log('Heimdall API succes reply: ', result))
          .catch((error) => this.error('Heimdall API ERROR reply: ', error));
      }
      this.codeString = "";

      this.log("--------------- ENTRY CONTROL NOTIFICATION Report -------------------");
      
    });

// TESTS BELOW    
/*
    // Cycle indicator
    for ( let i=0; i<256 ; i++ ) {
      await delay(3000);
      let buf = Buffer([i]);
      
      console.log(i, buf);

        this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({
          "Value": buf
        }, function( err ) {
          if( err ) return console.error( err );
        });
    }
*/
/*
    //this.node.CommandClass.COMMAND_CLASS_BASIC.BASIC_GET()
    //  .then(result => this.log("\nBASIC_GET: ",result))
    //  .catch(error => this.log("\nBASIC_GET ERROR: ",error));  
/*
    this.node.CommandClass.COMMAND_CLASS_POWERLEVEL.POWERLEVEL_GET()
      .then(result => this.log("\nPOWERLEVEL_GET: ",result))
      .catch(error => this.log("\nPOWERLEVEL_GET: ",error)); 
    // [COMMAND_CLASS_POWERLEVEL] {"Power level (Raw)":{"type":"Buffer","data":[0]},"Power level":"NormalPower","Timeout (Raw)":{"type":"Buffer","data":[0]},"Timeout":0}
*/
/*
    this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_GET()
      .then(result => this.log("\nINDICATOR_GET: ",result))
      .catch(error => this.log("\nINDICATOR_GET ERROR: ",error));    
    // [COMMAND_CLASS_INDICATOR] {"Value (Raw)":{"type":"Buffer","data":[0]},"Value":"off/disable"}
*/
/*
    this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({
      "Value": 0xFF
    }, function( err ) {
      if( err ) return console.error( err );
    });
*/
/*
    this.node.CommandClass.COMMAND_CLASS_ENTRY_CONTROL.ENTRY_CONTROL_CONFIGURATION_GET()
      .then(result => this.log("\nENTRY_CONTROL_CONFIGURATION_GET: ",result))
      .catch(error => this.log("\nENTRY_CONTROL_CONFIGURATION_GET ERROR: ",error));
    // [COMMAND_CLASS_ENTRY_CONTROL] {"Key Cache Size (Raw)":{"type":"Buffer","data":[8]},"Key Cache Size":8,"Key Cache Timeout (Raw)":{"type":"Buffer","data":[5]},"Key Cache Timeout":5}
*/
/*
    this.node.CommandClass.COMMAND_CLASS_ENTRY_CONTROL.ENTRY_CONTROL_KEY_SUPPORTED_GET()
      .then(result => this.log("\nENTRY_CONTROL_KEY_SUPPORTED_GET: ",result))
      .catch(error => this.log("\nENTRY_CONTROL_KEY_SUPPORTED_GET ERROR: ",error));
*/
/*      
    this.node.CommandClass.COMMAND_CLASS_ENTRY_CONTROL.ENTRY_CONTROL_EVENT_SUPPORTED_GET()
      .then(result => this.log("\nENTRY_CONTROL_EVENT_SUPPORTED_GET: ",result))
      .catch(error => this.log("\nENTRY_CONTROL_EVENT_SUPPORTED_GET ERROR: ",error));
*/

// TESTS ABOVE

    this.log('Ring Keypad capabilities have been initialized');
  }

  async updateKeypad(result,detail) {
    let useAudible = true;
    let useVisual = true;
    let value = 0;
    let soundBeforeDelayedArm = true;
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
        this.log("Received an", result, "of:", detail)
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
        } else {
          console.log("countdown cancelled");
        }
        await delay(startLastDelay*1000);
        // run the duration of the restDelay, <startLastDelay> seconds after first to match endtime
        if ( !this.homey.app.heimdall.cancelCountdown ) {
          this.setIndicator(nextCode);
        } else {
          console.log("countdown cancelled");
        }
        await delay(lastDelay*1000);
        // last alert before arming/alarm
        if ( !this.homey.app.heimdall.cancelCountdown ) {
          if ( soundBeforeDelayedArm && result == "Arming Delay" ) {
            this.setIndicator(36);
          } else {
            this.setIndicator(24);
          }
        } else {
          console.log("countdown cancelled");
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
          } else {
            console.log("Last Door countdown cancelled");
          }
          await delay(200);
          if ( !this.homey.app.heimdall.cancelCountdown ) {
            this.setIndicator(22);
          } else {
            console.log("Last Door countdown cancelled");
          }
          await delay(7800);
          if ( !this.homey.app.heimdall.cancelCountdown ) {
            this.setIndicator(36);
          } else {
            console.log("Last Door countdown cancelled");
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
        
      default:
        //console.log(result, detail)

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
