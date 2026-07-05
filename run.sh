#!/bin/bash
cd /home/charancherry/project/edutrack/frontend
setsid -f npx next dev -p 3000 > /tmp/fe.log 2>&1
echo "FE started"

cd /home/charancherry/project/edutrack/backend
setsid -f npm run dev > /tmp/be.log 2>&1
echo "BE started"
