#!/usr/bin/env bash

usage () {
	cat <<EOM
Usage: $(basename $0) -i <dir>
-i     input directory. defaults to "source"
EOM
	exit 1
}

in_dir="source"

while [[ $# -gt 0 ]]; 
do
	flag="$1"
	case $flag in
	    -h) usage
	 	shift;;
	    -i) in_dir="$2"
	    shift; shift;;
	    *)    # unknown option
	    POSITIONAL+=("$1") # save it in an array for later
	    shift # past argument
	    ;;
	esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

for file in "$in_dir"/*
do
	bash "${BASH_SOURCE%/*}/amq_volume_norm.sh" -i "$file"
done