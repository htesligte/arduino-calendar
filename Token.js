const querystring = require('querystring');
const { LocalStorage } = require('node-localstorage');
const localStorage = LocalStorage("./.ms-credentials");
const axios = require('axios');
const moment = require('moment-timezone');
const delay = require('delay');

const getToken = async () => {
    if (!isTokenValid()) {
        await getNewToken();
    }
    return localStorage.getItem('access_token');
}

const getNewToken = async () => {
    try {
        if (localStorage.getItem('refresh_token')) {
            await refreshToken();
            return;
        }
    } catch (error) {}
    await requestNewTokens();
}

const isTokenValid = () => {
    if (!localStorage.getItem('expires')) {
        return false;
    }

    return moment().unix() < localStorage.getItem('expires');
}

const refreshToken = async () => {
    const body = querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: localStorage.getItem('refresh_token'),
        client_id: process.env.MS_CLIENT_ID,
        scope: process.env.MS_SCOPE
    });
    const response = await axios.post(process.env.MS_TOKEN_URL, body);
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    localStorage.setItem('expires', moment().unix() + (response.data.expires_in - 10));
}

const requestNewTokens = async () => {
    const deviceCodeBody = querystring.stringify({client_id: process.env.MS_CLIENT_ID, scope: process.env.MS_SCOPE});
    const deviceCodeResponse = await axios.post(process.env.MS_DEVICECODE_URL, deviceCodeBody);
    console.log(deviceCodeResponse.data.message);
    let authorization_pending = true;
    const tokenBody = querystring.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: process.env.MS_CLIENT_ID,
        device_code: deviceCodeResponse.data.device_code,
        client_secret: process.env.MS_SECRET
    });
    do {
        await delay(deviceCodeResponse.data.interval * 1000);
        try {
            const tokenResponse = await axios.post(process.env.MS_TOKEN_URL, tokenBody);
            localStorage.setItem('access_token', tokenResponse.data.access_token);
            localStorage.setItem('refresh_token', tokenResponse.data.refresh_token);
            localStorage.setItem('expires', moment().unix() + (tokenResponse.data.expires_in - 10));
            authorization_pending = false;
        } catch (error) {
            if (error.response.data.error !== "authorization_pending") {
                throw error;
            }
        }
    } while(authorization_pending);
}

module.exports.getToken = getToken;