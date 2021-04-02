#!/usr/bin/env bash

while getopts i: flag
do
	case "${flag}" in
		i) file=${OPTARG};;
	esac
done

target_mean=-18.0

echo "Detecting volume of sample for ${file}..."
output=$(ffmpeg $@ -af volumedetect -f null /dev/null 2>&1)
mean_volume=`echo "$output" | awk -F': | dB' '/mean_volume/ {print $2}'`
max_volume=`echo "$output" | awk -F': | dB' '/max_volume/ {print $2}'`
diff_mean=$(awk "BEGIN {print ($target_mean)-($mean_volume)}")
diff_clip=$(awk "BEGIN {
	new_peak = ($max_volume) + ($diff_mean)
	if (new_peak > 0)
		print -($max_volume)
	else 
		print $diff_mean
}")
echo "mean_volume: $mean_volume"
echo "max_volume: $max_volume"
echo "target_mean: $target_mean"
echo "diff_mean: $diff_mean"
echo "diff_clip: $diff_clip"