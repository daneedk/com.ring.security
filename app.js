'use strict';

const Homey = require('homey');

var ringZwaveSettings = [];
var defaultSettings = {
  "useTampering": false
};

class RingZwave extends Homey.App {

  async onInit() {
    this.log(`${Homey.manifest.id} initialising`);

    // To enable the use of local resources in other classes. Courtesy of Robert Klep ;)
    Homey.app = this;
    
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

    this.log("Setting: " + this.ringZwaveSettings.useTampering);

    // Init done
    this.log(`${Homey.manifest.id} ${Homey.manifest.version} has been initialized`);
  }

  async writeNotification(message) {
    this.log("Notification: "+ message);
    this.homey.notifications
      .createNotification({ excerpt: message });
  }
}

module.exports = RingZwave;