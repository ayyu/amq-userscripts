#!/usr/bin/env bash

in_dir="source"

for file in $in_dir/*
do
	bash "${BASH_SOURCE%/*}/amq_volume_norm.sh" -i "$file"
done