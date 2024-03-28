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

class RingMotionSensorV2 extends ZwaveDevice {

  /**
   * Initializes the capabilities and listeners for the Ring Motion Detector Gen 2.
   */
  onNodeInit() {
    // register Homey's capabilities with Z-Wave COMMAND CLASSES
    this.registerCapability('measure_battery', 'BATTERY');

    // register listener for NOTIFICATION REPORT
    this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', this.onNotificationReport.bind(this));

    // Add capability for alarm_motion
    if (!this.hasCapability('alarm_tamper')) {
      this.addCapability('alarm_tamper');
    }

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
    if (report['Event'] === ReportEventId.clear) {
      const clearEventId = report['Event Parameter'].readUIntBE(0, 1);
      if (clearEventId === ReportEventId.intrusion) {
        this.setCapabilityValue('alarm_motion', false);
      } else if (clearEventId === ReportEventId.sensorCaseRemoved) {
        this.setCapabilityValue('alarm_tamper', false);
      }
    } else if (report['Event'] === ReportEventId.intrusion) {
      this.setCapabilityValue('alarm_motion', true);
    } else if (report['Event'] === ReportEventId.sensorCaseRemoved) {
      this.setCapabilityValue('alarm_tamper', true);
    }
  }

  onSystemReport(report) {
    if (report['Event'] === ReportEventId.commButtonPressed) {
      // How to handle the button press event?
    }
  }

  onPowerManagementReport(report) {
    // Should we handle the power management report?
  }
}

module.exports = RingMotionSensorV2;