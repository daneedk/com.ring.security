'use strict';

const Homey = require('homey');
const delay = time => new Promise(res=>setTimeout(res,time));

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

    // Check if Heimdall is available and configure if so
    this.heimdallApp = this.homey.api.getApiApp('com.uc.heimdall');
    this.heimdall = [];

    this.registerHeimdallEvents();

    await this.initializeHeimdall();

    // Init done
    this.log(`${Homey.manifest.id} ${Homey.manifest.version} has been initialized`);
  }

  async initializeHeimdall() {
    await delay(1000);
    this.heimdallApp.getVersion()
      .then( (result) => {
        if ( !result ) this.log("Heimdall found, can't comfirm version. Please restart Ring Z-Wave ", result); 
        var runningVersion = this.parseVersionString(result)
        var neededVersion = this.parseVersionString('2.0.43');
        this.log("rv", runningVersion);
        this.log("nv", neededVersion);
        if ( runningVersion.minor >= neededVersion.minor && runningVersion.patch >= neededVersion.patch ) {
          this.log("Heimdall found with correct version");
          this.heimdall.version = result;
          this.heimdall.valid = true;
          this.heimdall.apikey = Homey.env.APIKEY;
        } else {
          this.log("Heimdall found but incorrect version");
          this.heimdall.valid = false
        }
      })
      .catch((error) => {
        this.error('Heimdall.getVersion', error);
        this.heimdall.valid = false
      });
  }

  async registerHeimdallEvents() {
    //register for events from Heimdall, this can be done even when it's not installed
    this.heimdallApp
      .on('realtime', (result,detail) => {
        if ( result == "Surveillance Mode") {
          this.log("The Surveillance Mode is set to: " + detail);
        }
      })
      .on('install', result => {
        this.log('Heimdall is installed');
        this.heimdallApp = this.homey.api.getApiApp('com.uc.heimdall');
        this.initializeHeimdall();
      })
      .on('uninstall', result => {
        this.heimdall = [];
        this.heimdall.valid = false;
        this.log('Heimdall is uninstalled.');
      });
  }

  async writeNotification(message) {
    this.homey.notifications
      .createNotification({ excerpt: message });
  }

  // Support functions
  parseVersionString(version) {
    if (typeof(version) != 'string') { return false; }
    var x = version.split('.');
    // parse from string or default to 0 if can't parse
    var maj = parseInt(x[0]) || 0;
    var min = parseInt(x[1]) || 0;
    var pat = parseInt(x[2]) || 0;
    return {
        major: maj,
        minor: min,
        patch: pat
    }
  }
}

module.exports = RingZwave;