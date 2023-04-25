'use strict';

const Homey = require('homey');

class RingDriver extends Homey.Driver {

    onInit() {

        this.homey.flow.getActionCard('4AK1E9-0EU0-activateSiren')
            .registerRunListener( async ( args, state ) => {
                args.device.setIndicator(args.sirenMode);
                return Promise.resolve( true );
            })
      
        this.homey.flow.getActionCard('4AK1E9-0EU0-deactivateSiren')
            .registerRunListener( async ( args, state ) => {
                args.device.deactivateSiren();
                return Promise.resolve( true );
            }) 
  
        // Chime action card 15,31,47,63,79
        this.homey.flow.getActionCard('4AK1E9-0EU0-soundChime')
            .registerRunListener((args, state) => {
                args.device.setIndicator(args.chime);
                return Promise.resolve( true );
            }); 

    }
}

module.exports = RingDriver;