const http = require("http");

const data = "{}";
const options = {
  hostname: "localhost",
  port: 3000,
  path: "/http-advanced-coffee-machine/actions/makeDrink",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log("Response:", body);
  });
});

req.on("error", (e) => {
  console.error("Request error:", e);
});

req.write(data);
req.end(); 