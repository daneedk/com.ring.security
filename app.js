'use strict';

const Homey = require('homey');

var ringZwaveSettings = [];
var defaultSettings = {
  "useTampering": false
};

class RingZwave extends Homey.App {

  async onInit() {
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
    ringZwaveSettings = this.homey.settings.get('settings');
		if ( ringZwaveSettings == (null || undefined) ) {
      this.log("No settings found, using Default Settings.");
			ringZwaveSettings = defaultSettings
    };

    this.log(ringZwaveSettings.useTampering);

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