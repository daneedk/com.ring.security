'use strict';

const Homey = require('homey');

class RingDriver extends Homey.Driver {

    onInit() {

        this.homey.flow.getActionCard('GBS-enableDetection')
            .registerRunListener( async ( args, state ) => {
                args.device.enableDetection(true);
                return Promise.resolve( true );
            })

        this.homey.flow.getActionCard('GBS-disableDetection')
            .registerRunListener( async ( args, state ) => {
                args.device.enableDetection(false);
                return Promise.resolve( true );
            })

    }
}

module.exports = RingDriver;