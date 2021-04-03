# AMQ scripts

## `userscripts`

Collection of \*monkey userscripts for Anime Music Quiz

### `amqCoopPaste.user.js`

Kinda defunct now with official teams mode, but playing as individual players still gives more XP/notes per right answer if everyone is on their own.
When turned on, automatically pastes your answer into the chat.

Maybe I will eventually add the ability to automatically copy paste someone else's answer from chat into your own box.

### `amqVideoBackground.user.js`

Changes AMQ background to the specified video. Edit the script to choose the URL. Somehow this breaks the IHI ladder assist and I don't know why yet.

### `amqHotkeys.user.js`

Streamlined version of nyamu's hotkey script that conflicts less with normal usage. Customize hotkeys by editing the keyBinds object.

#### Default bindings:

- <kbd>Escape</kbd>: remove zombie tooltips
- <kbd>Tab</kbd>: move cursor focus to answer box
- <kbd>Shift</kbd> + <kbd>Tab</kbd>: move cursor focus to chat box
- <kbd>Ctrl</kbd> + <kbd>Enter</kbd>: skip
- <kbd>Alt</kbd> + <kbd>1</kbd>: start game if all players are ready
- <kbd>Alt</kbd> + <kbd>2</kbd>: start vote for returning to lobby


## `encoding`

Scripts to make encoding for AMQ more braindead.

All of these require `ffmpeg` and `ffprobe` to be installed on your machine.

### `amq_encode.sh`

bash script that does 2-pass VP9 encoding with CRF 20. Generates output files named `720.webm`, `480.webm`, and `audio.mp3`.
Outputs to directory `./source/`

#### Usage

Same as ffmpeg for input files/timing. Put it in your home directory so you can call it with `~/amq_encode.sh`

```bash
# example usages
~/amq_encode.sh -i INPUTFILE.mkv
~/amq_encode.sh -i INPUTFILE.avi -ss START -to END
~/amq_encode.sh -i INPUTFILE.mp4 -ss START -t SECONDS
```

Windows version coming never cuz batch syntax is awful.

### `amq_volume_norm.sh`

Normalize audio to -18dB while avoiding clipping above 0 dB.
Outputs to directory `./norm/`

#### Usage

Same as ffmpeg for input files/timing. Put it in your home directory so you can call it with `~/amq_volume.sh`

```bash
# example usages
~/amq_volume_norm.sh -i INPUTFILE.webm  # output: ./norm/INPUTFILE.webm
~/amq_volume_norm.sh -i INPUTFILE.mp3   # output: ./norm/INPUTFILE.mp3
```

### `amq_volume_auto.sh`

Applies `amq_volume_norm.sh` to all files in the specified directory.

#### Usage

```bash
# example usage
~/amq_volume_auto.sh -i INPUTDIR        # output: ./norm/*
```

### `amq_mux.sh`

Muxes a clean audio track to all files in the specified input directory. Make sure your clean audio file is sync'd to and already about the same length as the video files.
This will ignore an existing MP3 file in the input directory and instead encode directly from your clean file to a new MP3.
Outputs to directory `./clean/`

#### Usage

```bash
# example usage
~/amq_mux.sh -a CLEANAUDIO -i INPUTDIR  # output: ./clean/*
```

### `amq_volume_detect.sh`

Wrapper for the `-af volumedetect` filter in ffmpeg. Extracts values for `mean_volume` and `max_volume` into shell variables and calculates the difference between `mean_volume` and `target_mean` as specified in `amq_settings.sh`.

### `amq_settings.sh`

Shared settings between the scripts, including things like desired audio levels and audio bitrates. Place this in the same directory as the other scripts or none of them will work.

### `sample_encode.sh`

An example script that does the following:

1. Encoding source video to 720, 480, and mp3 from the specified timecodes
2. (commented out) ~~Mux a clean audio file with the encoded 720 and 480 webm files from step 1~~
3. (commented out) ~~Apply volume normalization to -18 dB from the newly muxed clean files~~
4.  Apply volume normalization to -18 dB from the encoded source files