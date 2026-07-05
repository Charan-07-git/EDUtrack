import http from "http";
const data = JSON.stringify({ email: "teacher@edutrack.dev", password: "password123", role: "TEACHER" });
const req = http.request("http://localhost:4000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": data.length }
}, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});
req.write(data);
req.end();
