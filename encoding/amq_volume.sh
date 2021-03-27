#!/usr/bin/env bash

while getopts i: flag
do
	case "${flag}" in
		i) file=${OPTARG};;
	esac
done

echo "Detecting volume of sample..."
target_volume=-18
mean_volume=$(ffmpeg "$@" -af volumedetect -f null - |&  awk -F': | dB' '/mean_volume/ {print $2}')
diff_volume=$(awk "BEGIN {print ($target_volume)-($mean_volume)}")
echo "mean_volume: $mean_volume"
echo "target_volume: $target_volume"
echo "difference: $diff_volume"

extension="${file##*.}"
filename="${file%.*}"

ffmpeg $@ -c:v copy -af "volume=${diff_volume}dB" "${filename}-norm.${extension}"