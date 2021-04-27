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

while [[ $# -gt 0 ]]; 
do
	flag="$1"
	case $flag in
	    -h) usage
		shift; shift;;
	    -i) file=$2
	    shift; shift;;
	    -vf) vf=",$2"
		shift; shift;;
		-af) af="-af $2"
		shift; shift;;
		-crf) crf=$2
		shift; shift;;
	    *)    # unknown option
	    POSITIONAL+=("$1") # save it in an array for later
	    shift # past argument
	    ;;
	esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

source "${BASH_SOURCE%/*}/amq_settings.sh"

map_settings="-map 0:v -map 0:a -shortest"
video_settings="-c:v libvpx-vp9 -b:v 0 -g 119 -crf $crf -pix_fmt yuv420p"
cpu_settings="-deadline good -cpu-used 1 -row-mt 1 -frame-parallel 0 -tile-columns 2 -tile-rows 0 -threads 4"

mkdir -p $out_dir
echo "outputs to $out_dir"

source_height=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nw=1:nk=1 $file)
echo "source height is $source_height"

for scale in 480 720
do
	if [[ "$source_height" -ge "$scale" || "$scale" -eq 480 ]]; then
		echo "encoding $scale"
		ffmpeg \
			-y -i "$file" $@ \
			$map_settings \
			$meta_settings \
			$video_settings \
			-an \
			$cpu_settings \
			-vf "scale=-1:$scale,setsar=1$vf" \
			-pass 1 -f null /dev/null && \
		ffmpeg \
			-y -i "$file" $@ \
			$map_settings \
			$meta_settings \
			$video_settings \
			$opus_settings \
			$cpu_settings \
			$af \
			-vf "scale=-1:$scale,setsar=1$vf" \
			-pass 2 -f webm $out_dir/$scale.webm
	else
		echo "skipping $scale"
	fi
done

echo "encoding mp3"
ffmpeg \
	-y -i "$file" $@ \
	$meta_settings \
	-vn \
	$mp3_settings \
	$af \
	-f mp3 $out_dir/audio.mp3