'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class RingDevice extends ZwaveDevice {

  async onNodeInit() {
    this.enableDebug();
    this.printNode();

    // register the measure_battery capability with COMMAND_CLASS_BATTERY
    this.registerCapability('measure_battery', 'BATTERY')

    // register listnener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', report =>  {
      this.log("--------------- NOTIFICATION Listener report begin -----------------");
      switch (report['Notification Type']) {
        case "Power Management":
          if ( report['Event (Parsed)'] == "AC mains disconnected" ) {
            // The AC Mains power is lost
            this.log("Power Management: The AC Mains connection to the Keypad is lost");
            if ( this.homey.ringZwaveSettings.useTampering ) {
              this.setCapabilityValue('alarm_tamper', true)
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
      switch (report['Event Type']) {
        case "CACHING":
          // First keypress, do nothing until sequence is complete
          return null;
          
        break;

        /*
        case "CACHED":
          this.log("CACHED");

        break;

        case "CANCEL":
          this.log("ENTER");
          
        break;

        case "DISARM":
          this.log("DISARM");
          
        break;

        case "FULLARM":
          this.log("FULLARM");
          
        break;

        case "PARTIALARM":
          this.log("PARTIALARM");
          
        break;
        */

        default:
          this.log(report);
          this.log(report['Event Type']);
          if ( report['Event Data Length'] > 0 ) {
            this.log(report['Event Data']);
            this.log(report['Event Data'].values());
            this.log(report['Event Data'].toJSON());
          }
      }
      this.log("--------------- Report Listener -------------------");
      
      // if (!report || !report.hasOwnProperty('Sensor Value') || !report.hasOwnProperty('Sensor Type')) return null;
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

    // this.node.CommandClass.COMMAND_CLASS_INDICATOR.INDICATOR_GET();

    // this.node.CommandClass.COMMAND_CLASS_POWERLEVEL.POWERLEVEL_GET();
    
    this.log('Ring Keypad capabilities have been initialized');
  }

    /*
    node.CommandClass.COMMAND_CLASS_BASIC.BASIC_SET({
      "Value": true
    }, function( err ) {
      if( err ) return console.error( err );
    });
    */

}

module.exports = RingDevice;
