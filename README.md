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
- <kbd>Ctrl</kbd> + <kbd>1</kbd>: start game if all players are ready
- <kbd>Ctrl</kbd> + <kbd>2</kbd>: start vote for returning to lobby


## `encoding`

Scripts to make encoding for AMQ more braindead.

### `amq_encode.sh`

bash script that does 2-pass VP9 encoding with CRF 20 and tries to normalize audio to -17dB. Generates output files named `720.webm`, `480.webm`, and `audio.mp3`.

#### Usage

Same as ffmpeg for input files/timing. Put it in your home directory so you can call it with `~/amq_encode.sh`

```bash
# example usages
~/amq_encode.sh -i INPUTFILE
~/amq_encode.sh -i INPUTFILE -ss START -to END
~/amq_encode.sh -i INPUTFILE -ss START -t SECONDS
```

Windows version coming never cuz batch syntax is awful.
