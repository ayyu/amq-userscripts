#!/usr/bin/env bash

target_max=-1.0
target_mean=-18.0
meta_settings="-map_metadata -1 -map_chapters -1 -sn"
audio_settings="-b:a 320k -ac 2"
opus_settings="-c:a libopus $audio_settings"
mp3_settings="-c:a libmp3lame $audio_settings"