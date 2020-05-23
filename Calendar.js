const Token = require('./Token');
const axios = require('axios');
const moment = require('moment');

const getSchedule = async () => {
    const token = await Token.getToken();
    const headers = {headers: {"Authorization": `Bearer ${token}`}};
    const start_datetime = moment().toISOString();
    const end_datetime = moment().add(1, 'days').startOf("day").toISOString();

    const url = `https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=${start_datetime}&endDateTime=${end_datetime}`

    const eventsResponse = await axios.get(url, headers);
    let currentMeeting = null;
    let nextMeeting = null;
    const now = moment();
    for (const meeting of eventsResponse.data.value) {
        if (meeting.subject === "Lunch") {
            continue;
        }

        const meetingTime = moment.utc(meeting.start.dateTime);

        if (meetingTime < now) {
            currentMeeting = meeting;
        } else {
            nextMeeting = meeting;
        }

        if (nextMeeting) {
            break;
        }
    }

    return {
        currentMeeting: currentMeeting,
        nextMeeting: nextMeeting
    };
}

const getNextMeetingInfo = async () => {
    const meetings = await getSchedule();
    let minutesLeft = -1;
    let meetingString = "Free";
    if (!meetings.nextMeeting && !meetings.currentMeeting) {
        meetingString = "Free";
        minutesLeft = -1;
    } else if (!meetings.currentMeeting) {
        // there is a meeting coming up and we have nothing on the schedule now
        const meetingTime = moment.utc(meetings.nextMeeting.start.dateTime);
        minutesLeft = meetingTime.diff(moment(), "minutes");
        meetingString = meetings.nextMeeting.subject;
    } else {
        // we are in a meeting and there is something else planned next
        // show the amount of minutes until this one ends
        // and show if another one starts right away (end-to-end meeting)
        const endTime = moment.utc(meetings.currentMeeting.end.dateTime);
        const startTime = moment.utc(meetings.nextMeeting.start.dateTime);
        if (startTime.toISOString() == endTime.toISOString()) {
            // back to back meeting, so it doesn't matter how many minutes we show
            meetingString = meetings.nextMeeting.subject;
            minutesLeft = endTime.diff(moment(), "minutes");
        } else if (startTime < endTime) {
            // overlapping next meeting, show the amount of minutes until the next one 
            minutesLeft = startTime.diff(moment(), "minutes");
            meetingString = `* ${meetings.nextMeeting.subject}`;
        } else if (startTime > endTime) {
            // there is some space between the end of the current meeting and the start 
            // of the next one. Show the amount of minutes until this one ends
            minutesLeft = endTime.diff(moment(), "minutes");
            meetingString = "Free";
        }
    }
    
    // so we covered all scenarios
    // now format the strings to display them on the arduino
    if (minutesLeft > 59) {
        minutesLeft = `${Math.floor(minutesLeft / 60)}h`;
    } else if (minutesLeft < 0) {
        minutesLeft = "--";
    }

    return {
        nextMeeting: meetingString,
        minutesLeft: minutesLeft
    }
}

module.exports.getSchedule = getSchedule; 
module.exports.getNextMeetingInfo = getNextMeetingInfo;