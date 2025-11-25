const url = "https://www.google.com/maps/place/%E6%9D%B1%E6%96%B9%E4%B8%8D%E6%95%97%E7%89%9B%E8%82%89%E9%BA%B5%E9%A4%A8/@24.9920702,121.467294,17z/data=!3m1!4b1!4m6!3m5!1s0x34680296389d5bd5:0xae35917d4d06df44!8m2!3d24.9920702!4d121.4698689!16s%2Fg%2F11bw2hd3ys?entry=ttu&g_ep=EgoyMDI1MTExNy4wIKXMDSoASAFQAw%3D%3D";

const placeIdMatch = url.match(/(?:placeid\/|!1s)([^&/?!]+)/);
const nameMatch = url.match(/google\.com\/maps\/place\/([^/]+)/);

let placeId = null;
let query = null;

if (placeIdMatch && placeIdMatch[1]) {
    placeId = placeIdMatch[1];
    console.log("Extracted Place ID raw:", placeId);
    if (placeId.includes(':')) {
        console.log("Ignored invalid Place ID (contains ':'):", placeId);
        placeId = null;
    }
}

if (nameMatch && nameMatch[1]) {
    query = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
    console.log("Extracted Query:", query);
}

console.log("Final Place ID:", placeId);
console.log("Final Query:", query);
