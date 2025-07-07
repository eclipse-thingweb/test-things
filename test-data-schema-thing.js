const http = require("http");

const data = "true";
const options = {
  hostname: "localhost",
  port: 3000,
  path: "/http-data-schema-thing/properties/bool",
  method: "PUT",
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