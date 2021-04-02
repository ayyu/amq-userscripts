#!/usr/bin/env bash

while getopts i: flag
do
	case "${flag}" in
		i) file=${OPTARG};;
	esac
done

source "${BASH_SOURCE%/*}/amq_volume_detect.sh" $@

extension="${file##*.}"
filename="${file%.*}"

format_settings="-c:v copy"

if [ $extension = "mp3" ]; then
	format_settings="-vn -c:a libmp3lame"
fi

mkdir -p norm
ffmpeg -y $@ $format_settings -map_metadata -1 -b:a 320k -ac 2 -af "volume=${diff_mean}dB" "norm/${filename}.${extension}"