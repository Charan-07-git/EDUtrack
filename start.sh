#!/bin/bash
pkill -f 'node src/server' 2>/dev/null
pkill -f 'next dev' 2>/dev/null
sleep 1

cd /home/charancherry/project/edutrack/backend
nohup node src/server.js > /tmp/backend.log 2>&1 &
BPID=$!
echo 
