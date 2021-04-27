#!/usr/bin/env bash

usage () {
	cat <<EOM
Usage: $(basename $0) -i <file> [...]
-i     input file
...    ffmpeg flags
EOM
	exit 1
}

while getopts hi: flag
do
	case "${flag}" in
		h) usage;;
		i) file=$(basename ${OPTARG});;
	esac
done

source "${BASH_SOURCE%/*}/amq_volume_detect.sh" $@

filename="${file%.*}"
extension="${file##*.}"

source "${BASH_SOURCE%/*}/amq_settings.sh"

if [[ $extension = "mp3" ]]; then
	format_settings="-vn $mp3_settings"
else
	format_settings="-c:v copy $opus_settings"
fi

out_dir="norm"

mkdir -p "$out_dir"

ffmpeg \
	-y $@ \
	$meta_settings \
	$format_settings \
	-af "volume=${diff_clip}dB" \
	-f $extension $out_dir/${filename}.${extension}