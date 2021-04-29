'use strict';

const Homey = require('homey');
const delay = time => new Promise(res=>setTimeout(res,time));

class RingZwave extends Homey.App {

  async onInit() {
    this.log(`${Homey.manifest.id} initialising`);

    // Check if Heimdall is available and configure if so
    this.heimdallApp = this.homey.api.getApiApp('com.uc.heimdall');
    this.heimdall = [];

    // Register for events from Heimdall, this can be done even when it's not installed
    this.registerHeimdallEvents();

    // Get information from Heimdall and save it to this.heimdall
    await this.initializeHeimdall();

    // Init done
    this.log(`${Homey.manifest.id} ${Homey.manifest.version} has been initialized`);
  }

  // Functions
  async initializeHeimdall() {
    this.heimdallApp.getVersion()
      .then( (result) => {
        if ( !result ) this.log("Heimdall found, can't comfirm version. Please restart Ring Security ", result);
        var runningVersion = this.parseVersionString(result)
        var neededVersion = this.parseVersionString('2.1.0');
        this.log("rv", runningVersion);
        this.log("nv", neededVersion);
        if ( runningVersion.minor >= neededVersion.minor && runningVersion.patch >= neededVersion.patch ) {
          this.log("Heimdall found with correct version");
          this.heimdall.version = result;
          this.heimdall.valid = true;
          this.heimdall.apikey = Homey.env.APIKEY;
          this.heimdall.cancelCountdown = false;
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
    this.heimdallApp
      .on('install', async result => {
        this.log('Heimdall is installed');
        await delay(1000);
        this.initializeHeimdall();
      })
      .on('uninstall', result => {
        this.heimdall = [];
        this.heimdall.valid = false;
        this.log('Heimdall is uninstalled.');
      });
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