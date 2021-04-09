'use strict';

const Homey = require('homey');

var ringZwaveSettings = [];
var defaultSettings = {
  "useTampering": false,
  "useLocalLog": true,
  "useHeimdallLog": false,
  "hidePinCodesInLog": true,
  "requirePinCodeToUnlockUserManagement": true,
  "requireKeypadToUnlockUserManagement": true
};
var testUsers = {
  "users": [
    { "name": "Danee1", "pincode": "123456", "admin": true, "valid": true },
    { "name": "Danee2", "pincode": "654321", "admin": false, "valid": true },
    { "name": "Danee3", "pincode": "000000", "admin": false, "valid": true }
  ]
};

class RingZwave extends Homey.App {

  async onInit() {
    //  // test test test test
        this.users = testUsers
    //  // /test test test test

    this.log(`${Homey.manifest.id} initialising`);

    // register Flow Trigger Cards

    // register Flow Condition Cards

    // register Flow Action Cards
    this.actionInputNotification = this.homey.flow.getActionCard('SendNotification');
    this.actionInputNotification
      .registerRunListener( async(args, state ) => {
          this.writeNotification(args.message)
          return Promise.resolve( true );
      })

    // read settings 
    this.ringZwaveSettings = this.homey.settings.get('settings');
    if ( this.ringZwaveSettings == (null || undefined) ) {
      this.log("No settings found, using Default Settings.");
      this.ringZwaveSettings = defaultSettings
    };

    // Init done
    this.log(`${Homey.manifest.id} ${Homey.manifest.version} has been initialized`);
  }

  // Write information to history and cleanup 20% when history above 2000 lines
  async writeLog(logLine) {
    // Write the logline to the log inside this app
    if ( this.ringZwaveSettings.useLocalLog ) {
      let savedHistory = this.homey.settings.get('RingZwaveLog');
      if (savedHistory != undefined) { 
          // cleanup history
          let lineCount = savedHistory.split(/\r\n|\r|\n/).length;
          if ( lineCount > 2000 ) {
              //let deleteItems = parseInt( lineCount * 0.2 );
              let savedHistoryArray = savedHistory.split(/\r\n|\r|\n/);
              //let cleanUp = savedHistoryArray.splice(-1*deleteItems, deleteItems, "" );
              savedHistory = savedHistoryArray.join('\n'); 
          }
          // end cleanup
          logLine = logLine+"\n"+savedHistory;
      }
      this.homey.settings.set('RingZwaveLog', logLine );
      logLine = "";
    }
    // Send the loginline to Heimdall
    if ( this.ringZwaveSettings.useHeimdallLog ) {

    }
  }

  async writeNotification(message) {
    this.homey.notifications
      .createNotification({ excerpt: message });
  }

}

module.exports = RingZwave;