#!/usr/bin/env bash

for file in 480.webm 720.webm audio.mp3
do
	source "${BASH_SOURCE%/*}/amq_volume_norm.sh" -i $file
done