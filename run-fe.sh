#!/bin/bash
cd /home/charancherry/project/edutrack/frontend
/usr/bin/setsid -f npx next dev -p 3000 1>>/tmp/fe.log 2>>/tmp/fe.log
