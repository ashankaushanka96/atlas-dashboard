#!/bin/sh

COMPNAME="operations_dashboard_backend.py"

PID=`ps -ef | grep -vw grep | grep -w $COMPNAME | awk '{print $2}'`

if [ -n "$PID" ] ;then
    kill -9 $PID
fi

exit 0