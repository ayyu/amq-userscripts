#!/usr/bin/env bash

target_volume=-18

for file in 480.webm 720.webm audio.mp3
do
	echo "Detecting volume of sample for ${file}..."
	mean_volume=$(ffmpeg -i $file -af volumedetect -f null - |&  awk -F': | dB' '/mean_volume/ {print $2}')
	diff_volume=$(awk "BEGIN {print ($target_volume)-($mean_volume)}")
	echo "mean_volume: $mean_volume"
	echo "target_volume: $target_volume"
	echo "difference: $diff_volume"

	extension="${file##*.}"
	filename="${file%.*}"

	ffmpeg -i "$file" -c:v copy -af "volume=${diff_volume}dB" "${filename}-norm.${extension}"
done