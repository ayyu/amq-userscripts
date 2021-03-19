#!/usr/bin/env bash

echo "Detecting volume of sample..."
target_volume=-17
mean_volume=$(ffmpeg "$@" -af volumedetect -f null - |&  awk -F': | dB' '/mean_volume/ {print $2}')
diff_volume=$(awk "BEGIN {print ($target_volume)-($mean_volume)}")
echo "mean_volume: $mean_volume"
echo "target_volume: $target_volume"
echo "difference: $diff_volume"

map_settings="-map 0:v -map 0:a -shortest -map_metadata -1 -map_chapters -1"
video_settings="-c:v libvpx-vp9 -b:v 0 -g 119 -crf 20 -pix_fmt yuv420p"
audio_settings="-b:a 320k -ac 2 -af volume=${diff_volume}dB"
opus_settings="-c:a libopus $audio_settings"
mp3_settings="-c:a libmp3lame $audio_settings"
cpu_settings="-deadline good -cpu-used 1 -row-mt 1 -frame-parallel 0 -tile-columns 2 -tile-rows 0 -threads 4"

for scale in 480 720
do
	ffmpeg "$@" \
		$map_settings \
		$video_settings \
		-an \
		$cpu_settings \
		-vf "scale=-1:$scale" \
		-pass 1 -f null /dev/null && \
	ffmpeg "$@" \
		$map_settings \
		$video_settings \
		$opus_settings \
		$cpu_settings \
		-vf "scale=-1:$scale" \
		-pass 2 -f webm "$scale.webm"
done

ffmpeg "$@" $mp3_settings audio.mp3