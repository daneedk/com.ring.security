# Ring Z-Wave

This Homey App enables the use of Ring Z-Wave devices on Homey.

## Supported Devices

* Ring Keypad (V1)

![image][ringkeypad]

## Unsupported Devices
The devices below must use COMMAND_CLASS_SECURITY_2 and can not be added to Homey because Homey doesn't support that yet. 
(They can be added but they reset themselves after 40 seconds because they are not added with S2. Ring most likely did this because of the Z-Shave vulnerability. See https://www.pentestpartners.com/security-blog/z-shave-exploiting-z-wave-downgrade-attacks/)

* Ring Contact Sensor (V1)

![image][ringcontactsensor]

* Ring Motion Detector (V1)

![image][ringmotiondetector]

[ringkeypad]: https://github.com/daneedk/com.ring.zwave/blob/02f3260315e14636d8acbf7fa2ab0d074381d0d7/drivers/4AK1E9-0EU0/assets/images/small.jpg
[ringcontactsensor]: https://github.com/daneedk/com.ring.zwave/blob/ab3e029bdf0ccb7a31b946cd98359732f33c65f6/drivers/4SDAE9-0EU0/assets/images/small.jpg
[ringmotiondetector]: https://github.com/daneedk/com.ring.zwave/blob/ab3e029bdf0ccb7a31b946cd98359732f33c65f6/drivers/4SPAE9-0EU0/assets/images/small.jpg