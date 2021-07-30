#!/usr/bin/env bash

usage () {
	cat <<EOM
Usage: $(basename $0) -i <file> [...]
-i     input file
...    ffmpeg flags
EOM
	exit 1
}

while [[ $# -gt 0 ]]; 
do
	flag="$1"
	case $flag in
	    -h) usage
	 	shift;;
	    -i) file="$2"
	    shift; shift;;
	    *)    # unknown option
	    POSITIONAL+=("$1") # save it in an array for later
	    shift # past argument
	    ;;
	esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

source "${BASH_SOURCE%/*}/amq_volume_detect.sh" $@

filename="$(basename ${file%.*})"
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
	-y -i "$file" \
	$meta_settings \
	$format_settings \
	-af "volume=${diff_clip}dB" \
	-f $extension $out_dir/${filename}.${extension}