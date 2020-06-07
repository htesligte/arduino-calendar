require('dotenv').config();
const moment = require('moment-timezone');
const Usb = require('./Usb');
const delay = require('delay');
const Calendar = require('./Calendar');

let meetings = [];

const main = async () => {    
    let port = await waitForUsb();
    meetings = await Calendar.getMeetings();
    // update these meetings every minute
    setInterval(async () => {
        meetings = await Calendar.getMeetings();
        console.log("Updated meetings");
    }, 60000);

    // get times
    do {
        const times = getTimeStrings();
        const meetingStrings = await getNextMeetingString(meetings);
        const line1 = `${times[0]}  ${times[1]}  ${times[2]}`;
        const line2 = `${meetingStrings[0]}  ${meetingStrings[1]}`;
        try {
            await Usb.write(port, `${line1}\n${line2}\n`);
            console.log("Updated time");
        } catch (error) {
            console.error(error);
        }        

        await delay(1000); // sleep for one second
    } while (true);
    await Usb.close();    
    return;
}

const waitForUsb = async () => {
    let port = null;

    while(true) {
        try {
            port = await Usb.open();
            break;
        } catch (error) {
            console.log(error);
            await delay(1000);
        }
    }

    return port;
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

const getNextMeetingString = async (meetings) => {
    const meetingInfo = await Calendar.getNextMeetingInfo(await Calendar.getSchedule(meetings));
    return [
        meetingInfo.nextMeeting.substr(0, 12).padEnd(12),
        String(meetingInfo.timeLeft).padStart(2, '0')
    ];
}

main();