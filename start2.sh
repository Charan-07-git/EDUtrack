#!/bin/bash
cd /home/charancherry/project/edutrack/frontend
nohup npx next dev -p 3000 &> /tmp/fe.log &
cd /home/charancherry/project/edutrack/backend
nohup npm run dev &> /tmp/be.log &
echo "started"
