import net from "net";

const targets = [
  { host: "aws-1-ap-south-1.pooler.supabase.com", port: 5432, label: "Session Pooler 5432" },
  { host: "aws-1-ap-south-1.pooler.supabase.com", port: 6543, label: "Transaction Pooler 6543" },
];

let remaining = targets.length;

targets.forEach(({ host, port, label }) => {
  const s = net.createConnection(port, host, () => {
    console.log(`${label} - CONNECTED!`);
    s.end();
    if (--remaining === 0) process.exit(0);
  });
  s.on("error", (e) => {
    console.log(`${label} - ${e.message}`);
    if (--remaining === 0) process.exit(0);
  });
  s.setTimeout(15000, () => {
    console.log(`${label} - TIMEOUT`);
    s.destroy();
    if (--remaining === 0) process.exit(0);
  });
});
