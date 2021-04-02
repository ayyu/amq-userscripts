#!/usr/bin/env bash

usage () {
	cat <<EOM
Usage: $(basename $0) -i <dir>
-i     input directory. defaults to "source"
EOM
	exit 1
}

in_dir="source"

while getopts hi: flag
do
	case "${flag}" in
		h) usage;;
		i) in_dir=${OPTARG};;
	esac
done

for file in "$in_dir"/*
do
	bash "${BASH_SOURCE%/*}/amq_volume_norm.sh" -i "$file"
done