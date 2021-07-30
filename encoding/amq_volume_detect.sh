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

source "${BASH_SOURCE%/*}/amq_settings.sh"

echo "Detecting volume of sample for ${file}..."
output=$(ffmpeg -i "$file" -vn -af volumedetect -f null /dev/null 2>&1)
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