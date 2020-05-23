const SerialPort = require('serialport');
const delay = require('delay');

const open = async () => {
    return new Promise((resolve, reject) => {
        const port = new SerialPort(process.env.ARDUINO_PORT, {baudRate: 9600});
        port.on('open', async (data) => {
            console.log('port is open');
            await delay(2000);
            resolve(port);
        });
        port.open((error) => {
            console.log("in port.open");
            if (error) {
                //reject(error);
            }
        });
    });
}

const close = async (port) => {
    return new Promise((resolve, reject) => {
        port.close((err) => {
            console.log("port close", err);
            resolve();
        });
    });
}

const write = async (port, data) => {
    return new Promise((resolve, reject) => {
        port.write(data, (error, bytesWritten) => {
            if (error) {
                reject(error);
            }
            resolve(bytesWritten);
        });
    });
}

module.exports.write = write;
module.exports.open = open;
module.exports.close = close;
