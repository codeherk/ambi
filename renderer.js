// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


// const body = document.getElementsByTagName('body')[0];
// const red_input = document.getElementById('red_value');
// const green_input = document.getElementById('green_value');
// const blue_input = document.getElementById('blue_value');
// const hex_input = document.getElementById('hex_value');
// const inputs = [red_input, green_input, blue_input, hex_input];

const {
    remote
} = require('electron');
const fs = require('fs');


let slider; // global so we can add/remove event listeners
let huejay = require("huejay"); // https://github.com/sqmk/huejay
let client;
// let savedSize;

var data = {
    lights: false,
    selected_light: false, // set to false to hide slider,
    profile: null,
    show_profile: false,
    message: null
}

var app = new Vue({
    el: '#app',
    data: data,
    methods: {
        minimize: function () {
            remote.BrowserWindow.getFocusedWindow().minimize();
        },
        maximize: function () {
            console.log(`[maximize] is`,savedSize)
            // if(remote.BrowserWindow.getFocusedWindow().isMaximized){
            //     savedSize = remote.BrowserWindow.getFocusedWindow().getSize()
            //     console.log(`[maximize] savedSize`,savedSize)
            //     remote.BrowserWindow.getFocusedWindow().maximize()
            // }else{
            //     remote.BrowserWindow.getFocusedWindow().setSize(savedSize[0], savedSize[0], true);
            // }
            remote.getCurrentWindow().setFullScreen(!remote.getCurrentWindow().isFullScreen());
        },
        close: function () {
            remote.BrowserWindow.getFocusedWindow().close();
        },
        fetchLights: fetchLights,
        toggleLight: function (light) {
            // console.log(light)
            // console.log(this.$data)
            if (light.on) {
                light.on = false

                if (light == this.$data.selected_light) {
                    this.$data.selected_light = false; // hide slider
                    slider = null;
                }

            } else {
                light.on = true
                this.$data.selected_light = light

                if (light.type != "Dimmable light") {
                    if (colorPicker == null) {
                        activateColorPicker();
                        console.log(colorPicker);
                    }
                }

                // console.log(`selected light:`)
                // console.log(this.$data.selected_light)

                slider = document.getElementById('slider');
                slider.value = Math.round((data.selected_light.brightness / 254) * 100)
                // match slider color to color of light
                let style = document.createElement('style');
                style.type = 'text/css';
                style.innerHTML = `::-webkit-slider-thumb {
                    box-shadow: -100vw 0 0 100vw ${this.computeBG(this.$data.selected_light)};
                  }`;
                slider.appendChild(style);

                slider.addEventListener('input', function (event) {
                    console.log(`value: ${this.value} ${(this.value / 100) * 254}`);
                    // console.log(data.selected_light);
                    // if (this.value == 0){
                    //     data.selected_light.on = false
                    // }
                    (this.value == 0) ? data.selected_light.on = false: data.selected_light.on = true;
                    data.selected_light.brightness = Math.round((this.value / 100) * 254);
                    client.lights.save(data.selected_light).then(light => {
                        console.log(`Updated light [${light}]`);
                    });

                });
            }

            client.lights.save(light) // update light
        },
        computeBG: function (light) {
            if (light.reachable && light.on) {
                if (typeof light.xy !== 'undefined') {
                    // console.log(light.xy)  
                    color = cie_to_rgb(light.xy[0], light.xy[1]);
                    // console.log(color); 
                    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
                }
                return `rgb(254, 214, 47)`
            } else {
                return `rgba(255, 255, 255, 0.25)`
            }
        },
        calculateBrightness: function (light) {
            return Math.round((light.brightness / 254) * 100); // divide by max value 254 to get percentage
        },
        toggleProfile: function () {
            data.show_profile = !data.show_profile;
            if (data.show_profile && data.profile.user.created == null) {
                client.users.getByUsername(data.profile.user.username).then(user => {
                    data.profile.user = user;
                    console.log(`[toggleProfile] username: ${user.username}`);
                }).catch(error => {
                    console.log("[toggleProfile] error", error.stack);
                });
            }
        },
        loadClient: async function () {
            data.lights = false;
            let config = await createUser();
            console.log(`config: ${config}\ntypeof ${typeof config}`);
            if (typeof config === 'string') {
                console.log("config is instance of String");
                data.message = config;
            } else {
                load(config);
            }
        },
        deleteClient: function () {
            data.lights = false;
            console.log("[deleteClient] User", data.profile.user);
            client.users.delete(data.profile.user.username).then(() => {
                console.log("[deleteClient] User Deleted");
                data.message = "User Deleted";
            }).catch((error) => {
                console.log(error.stack);
                data.message = error.message;
            });

        }
    }
})


let colorPicker = null;

function activateColorPicker() {
    colorPicker = new iro.ColorPicker('#picker', {
        borderWidth: 2,
        layout: [{
            component: iro.ui.Wheel,
            options: {
                borderColor: '#ffffff'
            }
        }],
        display: 'flex',
        width: 300
    });

    colorPicker.on('color:change', function (color) {
        // if the first color changed
        if (color.index === 0) {
            // console.log('color 0 changed!');
            // log the color index and hex value
            // console.log(color, color.hexString);
            // console.log(color, color.xy);
            // red_input.value = color.rgb.r
            // green_input.value = color.rgb.g
            // blue_input.value = color.rgb.b
            // hex_input.value = color.hexString
            let xy = rgb_to_cie(color.rgb.r, color.rgb.g, color.rgb.b);
            // console.log(xy)
            if (data.selected_light.type != "Dimmable light") {

                data.selected_light.xy = xy;
                client.lights.save(data.selected_light).then(light => {
                    console.log(`Updated light [${light}]`)
                    slider.removeChild(slider.childNodes[0]);
                    let style = document.createElement('style');
                    style.type = 'text/css';
                    style.innerHTML = `::-webkit-slider-thumb {
                box-shadow: -100vw 0 0 100vw ${app.computeBG(light)};
            }`;
                    slider.appendChild(style);
                });
            }
            // body.setAttribute('style', `background-color:${color.hexString}`)

        }
    });
    let parent = document.getElementById('picker-container');
    window.onresize = function (event){
        console.log("[window.onresize]")
        let width = parent.getBoundingClientRect().width;
        console.log(width)
        if(width < 432){
            colorPicker.resize(width * 0.95) 
        }else{
            colorPicker.resize(width * 0.5) 
        }
    }
}

// add event listeners to color inputs 
// for (let i = 0; i < inputs.length; i++) {
//     inputs[i].addEventListener("dblclick", function () {
//         inputs[i].select();
//         inputs[i].setSelectionRange(0, 99999);
//         document.execCommand("copy");
//     });
// }

//   huejay.discover()
//   .then(bridges => {
//     for (let bridge of bridges) {
//       console.log(`Id: ${bridge.id}, IP: ${bridge.ip}`);
//     }
//   })
//   .catch(error => {
//     console.log(`An error occurred: ${error.message}`);
//   });

// CREATE USER
// created aKXZgV85wJbAfvgfQFp49p9imxG0tjlr7dn0bWC2
// let user = new client.users.User;

// Optionally configure a device type / agent on the user
// user.deviceType = 'my_device_type'; // Default is 'huejay'

// client.users.create(user)
//   .then(user => {
//     console.log(`New user created - Username: ${user.username}`);
//   })
//   .catch(error => {
//     if (error instanceof huejay.Error && error.type === 101) {
//       return console.log(`Link button not pressed. Try again...`);
//     }

//     console.log(error.stack);
//   });]

// client.users.get().then(user => {
// data.user = user
// console.log(user)
// console.log('Username:', user.username);
// console.log('Device type:', user.deviceType);
// console.log('Create date:', user.created);
// console.log('Last use date:', user.lastUsed);
// });


function fetchLights() {
    data.lights = null
    console.log("fetching lights");
    client.lights.getAll()
        .then(lights => {
            data.message = null;
            data.lights = lights;
            for (let i = 0; i < data.lights.length; i++) {
                console.log(data.lights[i]);
                // data.lights[i].brightness = Math.round((data.lights[i].brightness / 254) * 100)
            }
        }).catch((error) => {
            data.lights = false
            console.log(`[fetchLights] error: ${error}`);
            data.message = error.message;
        });
}

// fetchLights();

/**
 * Converts CIE color space to RGB color space
 * @param {Number} x
 * @param {Number} y
 * @param {Number} brightness - Ranges from 1 to 254
 * @return {Array} Array that contains the color values for red, green and blue
 */
function cie_to_rgb(x, y, brightness) {
    //Set to maximum brightness if no custom value was given (Not the slick ECMAScript 6 way for compatibility reasons)
    if (brightness === undefined) {
        brightness = 254;
    }

    var z = 1.0 - x - y;
    var Y = (brightness / 254).toFixed(2);
    var X = (Y / y) * x;
    var Z = (Y / y) * z;

    //Convert to RGB using Wide RGB D65 conversion
    var red = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
    var green = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
    var blue = X * 0.051713 - Y * 0.121364 + Z * 1.011530;

    //If red, green or blue is larger than 1.0 set it back to the maximum of 1.0
    if (red > blue && red > green && red > 1.0) {

        green = green / red;
        blue = blue / red;
        red = 1.0;
    } else if (green > blue && green > red && green > 1.0) {

        red = red / green;
        blue = blue / green;
        green = 1.0;
    } else if (blue > red && blue > green && blue > 1.0) {

        red = red / blue;
        green = green / blue;
        blue = 1.0;
    }

    //Reverse gamma correction
    red = red <= 0.0031308 ? 12.92 * red : (1.0 + 0.055) * Math.pow(red, (1.0 / 2.2)) - 0.055;
    green = green <= 0.0031308 ? 12.92 * green : (1.0 + 0.055) * Math.pow(green, (1.0 / 2.2)) - 0.055;
    blue = blue <= 0.0031308 ? 12.92 * blue : (1.0 + 0.055) * Math.pow(blue, (1.0 / 2.2)) - 0.055;


    //Convert normalized decimal to decimal
    red = Math.round(red * 255);
    green = Math.round(green * 255);
    blue = Math.round(blue * 255);

    if (isNaN(red))
        red = 0;

    if (isNaN(green))
        green = 0;

    if (isNaN(blue))
        blue = 0;


    return [red, green, blue];
}


/* From: https://github.com/usolved/cie-rgb-converter/blob/master/cie_rgb_converter.js
 * Converts RGB color space to CIE color space
 * @param {Number} red
 * @param {Number} green
 * @param {Number} blue
 * @return {Array} Array that contains the CIE color values for x and y
 */
function rgb_to_cie(red, green, blue) {
    //Apply a gamma correction to the RGB values, which makes the color more vivid and more the like the color displayed on the screen of your device
    var red = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
    var green = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
    var blue = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);

    //RGB values to XYZ using the Wide RGB D65 conversion formula
    var X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
    var Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
    var Z = red * 0.000088 + green * 0.072310 + blue * 0.986039;

    //Calculate the xy values from the XYZ values
    var x = parseFloat((X / (X + Y + Z)).toFixed(4));
    var y = parseFloat((Y / (X + Y + Z)).toFixed(4));

    if (isNaN(x))
        x = 0;
    if (isNaN(y))
        y = 0;
    return [x, y];
}


async function createUser() {
    let config = {};
    // find ip, save to config
    let bridges = await huejay.discover();
    if (bridges instanceof Error) {
        console.log(`An error occurred: ${error.message}`);
        return error.message;
    } else {
        config.bridges = bridges;

        let client = new huejay.Client({
            host: bridges[0].ip
        });
        let user = new client.users.User;

        // Optionally configure a device type / agent on the user
        user.deviceType = 'lwidget'; // Default is 'huejay'

        // on load, load config file, if config file does not exist, create user
        // create user
        // if successful, save user details to a config file
        return new Promise(function (resolve, reject) {
            client.users.create(user).then(user => {
                console.log(`New user created - Username: ${user.username}`);
                config.user = user.attributes.attributes;

                // save config and return config
                fs.writeFileSync('./config/config.json', JSON.stringify(config));
                resolve(config);

            }).catch(error => {
                if (error instanceof huejay.Error && error.type === 101) {
                    console.log(`Link button not pressed. Try again...`);
                    resolve(`Link button not pressed. Try again...`);
                }
                console.log(error.stack);
                reject(error.stack);
            });
        });
    }

}

function loadClient(config) {
    console.log("[loadClient]");
    let profile;

    if (config != null) {
        console.log("[loadClient] config provided");
        profile = config
        data.profile = profile
    } else {
        console.log("[loadClient] config NOT provided");
        try {
            console.log("[loadClient] try");
            if (!fs.existsSync("./config")){
                fs.mkdirSync("./config");
            }
            let rawdata = fs.readFileSync('./config/config.json');
            profile = JSON.parse(rawdata);
            console.log(`[loadClient] profile`, profile);
            data.profile = profile
        } catch (error) {
            console.log("[loadClient] error");
            return error;
        }
    }
    return new huejay.Client({
        host: profile.bridges[0].ip,
        username: profile.user.username
    });
}

function load(config = null) {
    console.log("[load]");
    client = loadClient(config);
    if (client instanceof Error) {
        console.log("[load] client is instance of error");
        console.log(`[load] error: ${client}`);
        data.message = "Profile not found. Click profile button and create one."
    } else {
        fetchLights();
    }
}

load();