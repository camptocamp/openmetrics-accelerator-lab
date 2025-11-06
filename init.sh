#!/bin/bash

echo Installing extensions
/usr/bin/code-server --install-extension ms-python.python --install-extension ms-python.debugpy --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
echo Instalation finished
exec dumb-init /usr/bin/code-server --bind-addr 0.0.0.0:8080 --auth none --user-data-dir /home/coder/.local/share/code-server --extensions-dir /home/coder/.local/share/code-server/extensions /home/src
