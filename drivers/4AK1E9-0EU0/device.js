'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.enableDebug();
    // this.printNode();

    this.userList = this.homey.app.users;

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');

    // register listnener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      this.log("--------------- NOTIFICATION Listener report begin -----------------");
      switch (report['Notification Type']) {
        case "Power Management":
          if ( report['Event (Parsed)'] == "AC mains disconnected" ) {
            // The AC Mains power is lost
            this.log("Power Management: The AC Mains connection to the Keypad is lost");
            if ( this.homey.app.ringZwaveSettings.useTampering ) {
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
      this.log("--------------- Report Listener -------------------");
      if ( report['Event Type'] == "CACHING" ) return;
      if ( report['Event Data Length'] > 0 ) {
        this.codeString = this.getCodeFromReport(report);
      }
      this.userObject = this.getUserInfo(this.codeString, this.userList);

      // Perform local actions
      if ( this.userObject["valid"]) {
        this.log("Local code handling: " + this.userObject["name"] + " entered a valid code and pressed " + report['Event Type']);
      } else {
        this.log("Local code handling: Invalid code entered before pressing " + report['Event Type']);
      }

      // Perform remote actions
      // send information to Heimdall when the uses has the integration enable
      if ( this.homey.app.heimdall.valid && this.homey.app.ringZwaveSettings.useHeimdall ) {
        let postBody = {
          "APIKEY": this.homey.app.heimdall.apikey,
          "actionReadable": this.homey.__("keypad.buttons.readable."+report['Event Type']),
          "action": this.homey.__("keypad.buttons.action."+report['Event Type']),
          "value": this.codeString,
          "diagnostics": {
              "sourceApp": "Ring Zwave App",
              "sourceFile": "drivers/4AK1E9-0EO0/device.js",
              "sourceDevice": "Ring Keypad"
          }
        }
        this.homey.app.heimdallApp.post('/keypad/action',postBody)
          .then((result) => this.log('Post ENTER info to Heimdall succes: ', result))
          .catch((error) => this.error('Post ENTER info to Heimdall error: ', error));
      }

      this.log("--------------- Report Listener -------------------");
      
    });

    // ask for report
    // this.node.CommandClass.COMMAND_CLASS_BATTERY.BATTERY_GET(); 

    // this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_GET();

    /*
    this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({
      "Value": true
    }, function( err ) {
      if( err ) return console.error( err );
    });
    */
   
    // if (!report || !report.hasOwnProperty('Event Type')) return null;

    // this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_GET();

    // this.node.CommandClass.COMMAND_CLASS_POWERLEVEL.POWERLEVEL_GET();
    
    this.log('Ring Keypad capabilities have been initialized');
  }

  getCodeFromReport(report) {
    let codeString = "";
    let codeEntered = report['Event Data'].toJSON();
    for (var i = 0; i < codeEntered.data.length; i++) {
      codeString += String.fromCharCode(codeEntered.data[i]);
    }
    return codeString;
  }

  getUserInfo(codeString, userList) {
    if ( codeString.length > 3 ) {
      let userObject = userList.users.find( record => record.pincode === codeString);
      if ( userObject) {
        return userObject
      } else {
        return { "name": "null", "pincode": codeString, "admin": null, "valid": false }
      }   
    } else {
      return { "name": "null", "pincode": codeString, "admin": null, "valid": false }
    }
  }

}

module.exports = RingDevice;
