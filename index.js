require('dotenv').config();
const moment = require('moment-timezone');
const Usb = require('./Usb');
const delay = require('delay');
const Calendar = require('./Calendar');

const main = async () => {    
    // get times
    const port = await Usb.open();
    do {
        const times = getTimeStrings();
        const meetingStrings = await getNextMeetingString();
        const line1 = `${times[0]}  ${times[1]}  ${times[2]}`;
        const line2 = `${meetingStrings[0]}  ${meetingStrings[1]}`;
        
        await Usb.write(port, `${line1}\n${line2}\n`);

        await delay(60000); // sleep for one minute
    } while (true);
    await Usb.close();    
    return;
}

const getTimeStrings = () => {
    const timezones = [
        'Europe/Amsterdam',
        'America/New_York',
        'Asia/Kolkata'
    ];
    let timeStrings = [];
    const now = moment().utc();
    for (i = 1; i <= 3; i++) {
        const hour = now.tz(timezones[i-1]).format("HH");
        const minutes = now.tz(timezones[i-1]).format("mm");
        timeStrings.push(`${hour}${minutes}`);
    }
    return timeStrings;
}

const getNextMeetingString = async () => {
    const meetingInfo = await Calendar.getNextMeetingInfo();
    return [
        meetingInfo.nextMeeting.substr(0, 12).padEnd(12),
        String(meetingInfo.minutesLeft).padStart(2, '0')
    ];
}

main();