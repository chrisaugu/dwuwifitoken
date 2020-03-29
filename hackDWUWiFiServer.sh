#!/usr/bin/env bash

function xtitle() {
	case "$TERM" in
	*term* | rxvt)
		echo -en "\e]0;$*\a" ;;
	*) ;;
	esac
}

xtitle The hell manual

is_mongo=1
[[ -z $(which mongo) ]] && { is_mongo=0; }
is_node=1
[[ -z $(which node ) ]] && { is_node=0; }
is_nodemon=1
[[ -z $(which nodemon) ]] && { is_nodemon=0; }

echo -e "
	\e[0;31m !!! WARNING !!!\e[0m
	\e[1;31m This script will hack into the DWU-Hotspot WiFi.\e[0m
"
echo "checking utils..."

if [[ $is_mongo == 0 ]]; then
	echo -e "\e[0;33m Error: mongo is not installed!\e[0m"
	pause
elif [[ $is_node == 0 ]]; then
	echo -e "\e[0;33m Error: node is not installed!\e[0m"
	pause
elif [[ $is_nodeomon ]]; then
	echo -e "\e[0;33m Error: nodemon is not installed!\e[0m"
	pause
else 
	echo "All utils present"
	echo "Initializing utils..."

	function start_mongo {
		echo -e "Starting mongod";
		# open cmd on another terminal console and start mongod
		mongoDir='/c/Program Files/MongoDB/Server/3.2/bin/'
		if [ -d $mongoDir ]; then
			$(mongod --config '/c/Program Files/MongoDB/Server/3.2/bin/mongodb.config')
			# if [[ $mongoDir -ge 11 ]]; then
			# 	mongod --config mongodb.config
			# fi
		else
			filename=start_mongod.bat
			if [[ -e $filename ]]; then 
				cmd ${filename}
			else 
				echo "File $filename not found."
			fi
		fi
		echo -e "\nmongod started successfuly"
	}
	# start_mongo

	cd ~/WebstormProjects/hacking-cracking-tools
	echo -e "Initializing server...\n"
	script="hackDWUWiFiServer.js"
	nodemon ${script}

fi
