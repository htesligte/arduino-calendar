const Token = require('./Token');
const axios = require('axios');
const moment = require('moment');

const getMeetings = async() => {
    const token = await Token.getToken();
    const headers = {headers: {"Authorization": `Bearer ${token}`}};
    const start_datetime = moment().toISOString();
    const end_datetime = moment().add(1, 'days').startOf("day").toISOString();

    const url = `https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=${start_datetime}&endDateTime=${end_datetime}`

    const eventsResponse = await axios.get(url, headers);

    const meetings = eventsResponse.data.value;

    meetings.sort((meeting1, meeting2) => {
        const startDateTime1 = moment.utc(meeting1.start.dateTime);
        const startDateTime2 = moment.utc(meeting2.start.dateTime);
        if (startDateTime1 == startDateTime2) {
            return 0;
        }
        return startDateTime1 < startDateTime2 ? -1 : 1;
    });
    return meetings;
}

const getSchedule = async (meetings) => {
    let currentMeeting = null;
    let nextMeeting = null;
    const now = moment();
    for (const meeting of meetings) {
        if (moment.utc(meeting.end.dateTime) < now) {
            continue;
        }
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

const getNextMeetingInfo = async (meetings) => {
    let secondsLeft = -1;
    let meetingString = "Free";
    if (!meetings.nextMeeting && !meetings.currentMeeting) {
        meetingString = "Free";
        secondsLeft = -1;
    } else if (!meetings.currentMeeting) {
        // there is a meeting coming up and we have nothing on the schedule now
        const meetingTime = moment.utc(meetings.nextMeeting.start.dateTime);
        secondsLeft = meetingTime.diff(moment(), "seconds");
        meetingString = meetings.nextMeeting.subject;
    } else if (!meetings.nextMeeting) {
        // we are in a meeting now but there is nothing after this
        const meetingTime = moment.utc(meetings.currentMeeting.end.dateTime);
        secondsLeft = meetingTime.diff(moment(), "seconds");
        meetingString = "Free";
    } else {
        // we are in a meeting and there is something else planned next
        // show the amount of minutes until this one ends
        // and show if another one starts right away (end-to-end meeting)
        const endTime = moment.utc(meetings.currentMeeting.end.dateTime);
        const startTime = moment.utc(meetings.nextMeeting.start.dateTime);
        if (startTime.toISOString() == endTime.toISOString()) {
            // back to back meeting, so it doesn't matter how many minutes we show
            meetingString = meetings.nextMeeting.subject;
            secondsLeft = endTime.diff(moment(), "seconds");
        } else if (startTime < endTime) {
            // overlapping next meeting, show the amount of minutes until the next one 
            secondsLeft = startTime.diff(moment(), "seconds");
            meetingString = `* ${meetings.nextMeeting.subject}`;
        } else if (startTime > endTime) {
            // there is some space between the end of the current meeting and the start 
            // of the next one. Show the amount of minutes until this one ends
            secondsLeft = endTime.diff(moment(), "seconds");
            meetingString = "Free";
        }
    }
    
    // so we covered all scenarios
    // now format the strings to display them on the arduino
    const minutesLeft = Math.ceil(secondsLeft / 60);
    let timeLeft = "";

    if (minutesLeft > 59) {
        timeLeft = `${Math.ceil(minutesLeft / 60)}h`;
    } else if (secondsLeft > 60) {
        timeLeft = minutesLeft;
    } else if (secondsLeft < 0) {
        timeLeft = "--";
    } else {
        timeLeft = secondsLeft;
    }

    return {
        nextMeeting: meetingString,
        timeLeft: timeLeft
    }
}

module.exports.getSchedule = getSchedule; 
module.exports.getNextMeetingInfo = getNextMeetingInfo;
module.exports.getMeetings = getMeetings;