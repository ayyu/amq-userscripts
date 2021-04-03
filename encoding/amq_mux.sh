#!/usr/bin/env bash

usage () {
	cat <<EOM
Usage: $(basename $0) -a <file> -i <directory>
-a     input audio. defaults to "clean.wav"
-i     directory of input videos. defaults to "source"
EOM
	exit 1
}

in_audio="clean.wav"
in_dir="source"

while getopts hi: flag
do
	case "${flag}" in
		h) usage;;
		a) in_audio=${OPTARG};;
		i) in_dir=${OPTARG};;
	esac
done

source "${BASH_SOURCE%/*}/amq_settings.sh"

out_dir="clean"
mkdir -p $out_dir

for file in "$in_dir"/*
do
	filename=$(basename "${file%.*}")
	extension="${file##*.}"

	if [[ $extension == "mp3" ]]; then
		ffmpeg \
			-y -i $in_audio \
			$mp3_settings \
			-f mp3 $out_dir/$filename.$extension
	else
		ffmpeg \
			-y -i $file \
			-i $in_audio \
			-shortest -map 0:v -map 1:a \
			-c:v copy \
			$opus_settings \
			-f webm $out_dir/$filename.$extension
	fi
done