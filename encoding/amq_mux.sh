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
ss=""
crf=20

while [[ $# -gt 0 ]];
do
	flag="$1"
	case $flag in
	    -h) usage
		shift;;
	    -a) in_audio=$2
	    shift; shift;;
	    -i) in_dir=$2
		shift; shift;;
		-ss) ss="$1 $2"
		shift; shift;;
	    *)    # unknown option
	    POSITIONAL+=("$1") # save it in an array for later
	    shift # past argument
	    ;;
	esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

source "${BASH_SOURCE%/*}/amq_settings.sh"

video_settings="-c:v libvpx-vp9 -b:v 0 -g 119 -crf $crf -pix_fmt yuv420p"
cpu_settings="-deadline good -cpu-used 1 -row-mt 1 -frame-parallel 0 -tile-columns 2 -tile-rows 0 -threads 4"

out_dir="clean"
mkdir -p $out_dir

for file in "$in_dir"/*
do
	filename=$(basename "${file%.*}")
	extension="${file##*.}"

	if [[ $extension == "mp3" ]]; then
		ffmpeg \
			-y -i "$in_audio" $ss \
			$mp3_settings \
			-f mp3 "$out_dir/$filename.$extension"
	else
		ffmpeg \
			-y -i "$file" $ss \
			-i "$in_audio" $ss \
			-shortest -map 0:v -map 1:a \
			-c:v copy \
			$opus_settings \
			-f webm "$out_dir/$filename.$extension"
	fi
done