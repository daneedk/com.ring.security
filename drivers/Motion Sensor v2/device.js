'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

/**
 * Enum representing the types of reports.
 * @enum {string}
 * @readonly
 * @property {string} homeSecurity - Home Security report type.
 * @property {string} system - System report type.
 */
const ReportTypes = {
  homeSecurity: 'Home Security',
  system: 'System',
  powerManagement: 'Power Management'
};

/**
 * Enum representing the state of a reported event.
 * @enum {number}
 */
const ReportEventId = {
  clear: 0,
  sensorCaseRemoved: 3,
  commButtonPressed: 5,
  intrusion: 8
};

export default class extends ZwaveDevice {

  /**
   * The state of the device.
   * @type {number}
   */
  state;

  /**
   * Initializes the capabilities and listeners for the Ring Motion Detector Gen 2.
   */
  onNodeInit() {
    // register Homey's capabilities with Z-Wave COMMAND CLASSES
    this.registerCapability('measure_battery', 'BATTERY');

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', this.onNotificationReport.bind(this));

    // Log that the device has been initialized
    this.log(`Ring Motion Detector Gen 2 "${this.getName()}" capabilities have been initialized`);
  }

  /**
   * Handles the notification report received from the motion sensor.
   * @param {Report} report - The notification report object.
   */
  onNotificationReport(report) {
    switch(report['Notification Type']) {
      case ReportTypes.homeSecurity: this.onHomeSecurityReport(report); break;
      case ReportTypes.system: this.onSystemReport(report); break;
      case ReportTypes.powerManagement: this.onPowerManagementReport(report); break;
      default: this.log('Unhandled notification report:', report);
    }
  }

  onHomeSecurityReport(report) {
    this.log('Home security report received:', report);
    if (this.state !== 0 && report['Event'] === ReportEventId.clear) {
      if (this.state === ReportEventId.intrusion) {
        this.setCapabilityValue('alarm_motion', false);
      } else if (this.state === ReportEventId.sensorCaseRemoved) {
        this.setCapabilityValue('alarm_tamper', false);
      }
      this.state = 0;
    } else if (report['Event'] === ReportEventId.intrusion) {
      this.setCapabilityValue('alarm_motion', true);
      this.state = ReportEventId.intrusion;
    } else if (report['Event'] === ReportEventId.sensorCaseRemoved) {
      this.setCapabilityValue('alarm_tamper', true);
      this.state = ReportEventId.sensorCaseRemoved;
    }
  }

  onSystemReport(report) {
    this.log('System report received:', report);
  }

  onPowerManagementReport(report) {
    this.log('Power management report received:', report);
  }
}