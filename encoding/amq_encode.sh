#!/usr/bin/env bash

crf=20
vf=""
af=""
out_dir=source

usage () {
	cat <<EOM
Usage: $(basename $0) -i <file> [...]
-i     input file
...    ffmpeg flags
EOM
	exit 1
}

while getopts hi:vf:af:crf: flag
do
	case "${flag}" in
		h) usage;;
		i) file=$(basename ${OPTARG});;
		vf) vf=,${OPTARG};;
		af) af="-af ${OPTARG}";;
		crf) crf=${OPTARG};;
	esac
done

source "${BASH_SOURCE%/*}/amq_settings.sh"

map_settings="-map 0:v -map 0:a -shortest"
video_settings="-c:v libvpx-vp9 -b:v 0 -g 119 -crf $crf -pix_fmt yuv420p"
cpu_settings="-deadline good -cpu-used 1 -row-mt 1 -frame-parallel 0 -tile-columns 2 -tile-rows 0 -threads 4"

mkdir -p $out_dir

echo map_settings

for scale in 480 720
do
	ffmpeg \
		-y "$@" \
		$map_settings \
		$meta_settings \
		$video_settings \
		-an \
		$cpu_settings \
		-vf "scale=-1:$scale,setsar=1${vf}" \
		-pass 1 -f null /dev/null && \
	ffmpeg \
		-y "$@" \
		$map_settings \
		$meta_settings \
		$video_settings \
		$opus_settings \
		$cpu_settings \
		$af \
		-vf "scale=-1:$scale,setsar=1${vf}" \
		-pass 2 -f webm $out_dir/$scale.webm
done

ffmpeg \
	-y "$@" \
	$meta_settings \
	-vn \
	$mp3_settings \
	$af \
	-f mp3 $out_dir/audio.mp3