'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');
const delay = time => new Promise(res=>setTimeout(res,time));

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.enableDebug();
    // this.printNode();

    this.ringOnce = false;

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY');

    // register flow cards
    // Triggers
    this.sendPincodeTrigger = this.homey.flow.getDeviceTriggerCard('4AK1E9-0EU0-sendPincode');
    // Conditions
    // Actions

    /*
    this.homey.flow.getActionCard('4AK1E9-0EU0-activateSiren')
      .registerRunListener( async ( args, state ) => {
        return this.setIndicator(args.sirenMode);
      })
    
    this.homey.flow.getActionCard('4AK1E9-0EU0-deactivateSiren')
      .registerRunListener( async ( args, state ) => {
          this.deactivateSiren();
          return Promise.resolve( true );
      }) 

    // Chime action card 15,31,47,63,79
    this.homey.flow.getActionCard('4AK1E9-0EU0-soundChime')
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
        if ( !this.ringOnce ) {
          this.updateKeypadFromRing(result,detail);
          if ( detail === "ding" ) {
            this.ringOnce = true;
            setTimeout( () => {this.ringOnce = false}, 250);
          }
        }
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

      // Trigger flowcard that sends the entered pincode and the action key
      var tokens = { pincode: this.codeString, actionkey: report['Event Type']};
      this.sendPincodeTrigger.trigger(this, tokens, {})
        .then((result) => {
        }) 
        .catch((error) => {
          this.log('sendPincodeTrigger error:', error)
          return this.homey.error(error);
        })

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
            this.updateKeypadFromHeimdall('Heimdall API Success',result);
          })
          .catch((error) => {
            this.error('Heimdall API ERROR reply: ', error);
            this.updateKeypadFromHeimdall('Heimdall API Error',error);
          });
      }
      this.codeString = "";
      
    });

    this.log(`Ring Keypad "${this.getName()}" capabilities have been initialized`);
  }

  // called from the Heimdall event listener and Heimdall API reply.
  async updateKeypadFromHeimdall(result,detail) {
    if ( !this.getSetting('useheimdall') ) { 
      this.log("Heimdall integaration disabled, do nothing with events from Heimdall")
      return 
    }
    let audibleNotification = 16;
    if ( this.getSetting('useAudibleNotifications') ) {
      audibleNotification = 0
    }
    let value = 0;
    switch ( result ) {
      case "Surveillance Mode":
        switch (detail) {
          case "partially_armed":
            value = 1;    
            value += audibleNotification;
            this.setIndicator(value);
            this.homey.app.heimdall.cancelCountdown = true;
            this.activeSensorWarning = false;
            break;
          case "armed":
            value = 2;    
            value += audibleNotification;
            this.setIndicator(value);
            this.homey.app.heimdall.cancelCountdown = true;
            this.activeSensorWarning = false;
            break;
          case "disarmed":
            value = 3;
            value += audibleNotification;
            this.setIndicator(value);
            this.homey.app.heimdall.cancelCountdown = true;
            this.activeSensorWarning = false;
            break;
        }
        this.homey.app.heimdall.surveillancemode = detail;
        this.log("The Surveillance Mode is set to: " + detail);
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
          if ( this.getSetting('soundBeforeDelayedArm') && result == "Arming Delay" ) {
            this.setIndicator(36);
          } else {
            this.setIndicator(24);
          }
        }
        await delay(500);
        this.homey.app.heimdall.cancelCountdown = false;

        break;

      case "Sensor State at Arming":
        if ( this.activeSensorWarning || this.getSetting('ignoreActiveSensorWarning') ) return;
        this.log("Sensor State at Arming:", detail)
        if ( detail = "Active" ) {
          this.activeSensorWarning = true;
          await delay(1100);
          value = 5;
          value += audibleNotification;
          this.setIndicator(value);
        }
        break;

      case "Last Door function":
        this.log("Last Door function:", detail)
        if ( this.getSetting('soundBeforeDelayedArm') ) {
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
        this.log("Received an Alarm State of:", detail)
        if ( detail ) {
          if ( this.getSetting('usesiren') != "0" ) { 
            this.setIndicator(this.getSetting('usesiren'));
          }
        } else {
          this.setIndicator(51);
          await delay(500);
          switch ( this.homey.app.heimdall.surveillancemode ) {
            case "partially_armed":
              this.setIndicator(49);
              break;
            case "armed":
              this.setIndicator(50);
              break;
          }
        }
        break;
      
      case "Heimdall API Success": case"Heimdall API Error":
        if ( result == "Heimdall API Error" || detail == "Invalid code entered. Logline written, no further action" ) {
          this.setIndicator(8);
        }
        return;
        break;

      default:
        // console.log(result, detail)

    }
  }

  // called from the Ring event listener (Work in Progress)
  async updateKeypadFromRing(result,detail) {
    // this.log("Received realtime event from Ring app:", result, detail);
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

  // Flowcard actions
  async deactivateSiren() {
    switch ( await this.homey.app.heimdall.surveillancemode ) {
      case "partially_armed":
        this.setIndicator(49);
        break;
      case "armed":
        this.setIndicator(50);
        break;
      default:
        this.setIndicator(51);
        break;
    }    
  }

  async setIndicator(value) {
    this.log("Value received to send to indicator: ", value);
    let buf = Buffer.from([value]);  
    this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_SET({ Value: buf })
      //.then(this.log)
      .catch(this.error);
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