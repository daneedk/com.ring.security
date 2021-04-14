'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.log('Name:', this.getName());
    // this.enableDebug();
    // this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');

    // register flow cards
    this.sendPincodeTrigger = this.homey.flow.getDeviceTriggerCard('4AK1E9-0EU0-sendPincode');

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
