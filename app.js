'use strict';

const Homey = require('homey');
const delay = time => new Promise(res=>setTimeout(res,time));

class RingSecurity extends Homey.App {

  async onInit() {
    this.log(`${Homey.manifest.id} initialising`);

    // Prepare API connection to Heimdall
    this.heimdallApp = this.homey.api.getApiApp('com.uc.heimdall');
    this.heimdall = [];

    // Register for events from Heimdall, this can be done even when it's not installed
    this.registerHeimdallEvents();

    // Get information from Heimdall and save it to this.heimdall
    await this.initializeHeimdall();

    // Prepare API connection to Ring (Work in Progress)
    this.ringApp = this.homey.api.getApiApp('com.amazon.ring');

    // Get information from Ring
    await this.initializeRing();

    // Init done
    this.log(`${Homey.manifest.id} ${Homey.manifest.version} has been initialized`);
  }

  // Functions
  // Generate systemwide event
  systemEvent(event, details)
  {
      this.homey.api.realtime(event, details)
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

  async initializeHeimdall() {
    this.heimdallApp.getVersion()
      .then( (result) => {
        if ( !result ) this.log("Heimdall found, can't comfirm version. Please restart Ring Security ", result);
        var runningVersion = this.parseVersionString(result)
        var neededVersion = this.parseVersionString('2.1.0');
        // this.log("rv", runningVersion);
        // this.log("nv", neededVersion);
        if ( runningVersion.major > neededVersion.major || runningVersion.minor > neededVersion.minor || runningVersion.major == neededVersion.major && runningVersion.minor == neededVersion.minor && runningVersion.patch >= neededVersion.patch ) {
          this.log("Heimdall found with correct version:", result);
          this.heimdall.version = result;
          this.heimdall.valid = true;
          this.heimdall.apikey = Homey.env.APIKEY;
          this.heimdall.cancelCountdown = false;
        } else {
          this.log("Heimdall found but incorrect version:", result);
          this.heimdall.valid = false
        }
      })
      .catch((error) => {
        this.error('Heimdall.getVersion:\n', error);
        this.heimdall.valid = false
      });
  }

  async initializeRing() {
    this.ringApp.getVersion()
      .then( (result) => {
        if ( !result ) this.log("Ring found, can't comfirm version. Please restart Ring Security ", result);
        var runningVersion = this.parseVersionString(result)
        var neededVersion = this.parseVersionString('2.2.3');
        if ( runningVersion.major > neededVersion.major || runningVersion.minor > neededVersion.minor || runningVersion.major == neededVersion.major && runningVersion.minor == neededVersion.minor && runningVersion.patch >= neededVersion.patch ) {
          this.log("Ring found with correct version:", result);
        } else {
          this.log("Ring found but incorrect version:", result);
        }
      })
      .catch((error) => {
        this.error('Ring.getVersion: Ring app is not installed');
        //this.ring.valid = false
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

module.exports = RingSecurity;

// Translate text in ChatGPT
/*
In this code en means English, please add Danish, German, Spanish, French, Italian, Dutch, Norwegian, Polish and Swedish. Answer in a codeblock, format as json.
{
  "en": "Added US/CA device ID to Outdoor Sensor",
}
*/