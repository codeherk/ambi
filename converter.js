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

    let z = 1.0 - x - y;
    let Y = (brightness / 254).toFixed(2);
    let X = (Y / y) * x;
    let Z = (Y / y) * z;

    //Convert to RGB using Wide RGB D65 conversion
    let red = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
    let green = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
    let blue = X * 0.051713 - Y * 0.121364 + Z * 1.011530;

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
    let r = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
    let g = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
    let b = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);

    //RGB values to XYZ using the Wide RGB D65 conversion formula
    let X = r * 0.664511 + g * 0.154324 + b * 0.162028;
    let Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
    let Z = r * 0.000088 + g * 0.072310 + b * 0.986039;

    //Calculate the xy values from the XYZ values
    let x = parseFloat((X / (X + Y + Z)).toFixed(4));
    let y = parseFloat((Y / (X + Y + Z)).toFixed(4));

    if (isNaN(x))
        x = 0;
    if (isNaN(y))
        y = 0;
    return [x, y];
}

module.exports = {cie_to_rgb, rgb_to_cie};