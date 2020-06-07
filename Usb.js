const SerialPort = require('serialport');
const delay = require('delay');

/**
 * Mac OS changes the path on every booth, so we need to find the correct device by just iterating through 
 * the connected devices.
 */
const findArduinoPath = async () => {
    const ports = await SerialPort.list();
    let port = null;
    for (const availablePort of ports) {
        if (availablePort.serialNumber == process.env.ARDUINO_SERIALNUMBER) {
            port = availablePort;
            break;
        }
    }

    if (!port) {
        throw new Error(`Could not find arduino with serialNumber ${process.env.ARDUINO_SERIALNUMBER}`);
    }

    return port.path;
}   

const open = async () => {
    return new Promise(async (resolve, reject) => {
        const path = await findArduinoPath();
        const port = new SerialPort(path, {baudRate: 9600});
        
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
