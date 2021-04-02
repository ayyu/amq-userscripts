#!/usr/bin/env bash

crf=20
vf=""
af=""

while getopts i:vf:af:crf: flag
do
	case "${flag}" in
		i) file=${OPTARG};;
		vf) vf=,${OPTARG};;
		af) af="-af ${OPTARG}";;
		crf) crf=${OPTARG};;
	esac
done

map_settings="-map 0:v -map 0:a -shortest -map_metadata -1 -map_chapters -1"
video_settings="-c:v libvpx-vp9 -b:v 0 -g 119 -crf $crf -pix_fmt yuv420p"
audio_settings="-b:a 320k -ac 2 $af"
opus_settings="-c:a libopus $audio_settings"
mp3_settings="-c:a libmp3lame $audio_settings"
cpu_settings="-deadline good -cpu-used 1 -row-mt 1 -frame-parallel 0 -tile-columns 2 -tile-rows 0 -threads 4"

for scale in 480 720
do
	ffmpeg \
		-y \
		"$@" \
		$map_settings \
		$video_settings \
		-an \
		$cpu_settings \
		-vf "scale=-1:$scale,setsar=1${vf}" \
		-pass 1 -f null /dev/null && \
	ffmpeg \
		-y \
		"$@" \
		$map_settings \
		$video_settings \
		$opus_settings \
		$cpu_settings \
		-vf "scale=-1:$scale,setsar=1${vf}" \
		-pass 2 -f webm "$scale.webm"
done

ffmpeg -y "$@" $mp3_settings audio.mp3