# ffmpeg scripts for handicaps

These scripts expedite 2-pass VP9/Opus encoding for AMQ using `ffmpeg`.

## Requirements

- `bash`
- if you're on Windows 10, you can use [WSL](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
  - if you're on older Windows versions, it might be time to upgrade
- `ffmpeg`
  - in bash, do `sudo apt update && sudo apt install ffmpeg`

## Installing

Probably the easiest way to do this would be to put the scripts in a folder under your home folder (e.g. `/home/amq_scripts/`), then do:

```bash
sudo install /home/amq_scripts/*.sh /usr/local/bin/
```

You should be able to run the scripts from any directory after doing that.
Make sure all the scripts are in the same folder as several of them depend on each other.

## Usage

### 1. Encoding video

The `amq_encode.sh` mostly gets called the same way that you would call an ffmpeg command, and will pass parameters as needed.
This is usually the first thing you will use.
First, pick your start and end timestamps from your source video, ideally to the millisecond level. You can use a player capable of frame advancing and millisecond display to do this. [mpv](https://mpv.io/) works quite well. You can also use an audio editor to do this.
Pass them to `amq_encode.sh` with the `-ss` and `-to` flags, respectively.

```bash
amq_encode.sh -i "[LowPower-Raws] Tokyo 7th Sisters (Bluray-1080p).mkv" -ss 58:05.679 -to 1:00:48.491
```

Once this is done, your (unclean) outputs will be in the `source` folder.

I would recommend saving your command in a `.sh` file for future reference:

```bash
amq_encode.sh \
  -i "[LowPower-Raws] Tokyo 7th Sisters (Bluray-1080p).mkv" \
  -ss 58:05.679 -to 1:00:48.491
```

I've lost timestamps in the past for uploads that needed corrections, and cba finding them again.

### 2. Audio levels

If the audio plays cleanly enough from the source and you are content, you can adjust the audio levels automatically to -18 dB LUFS and -1 dB peak with this script, pointing it to the `source` folder like so:

```bash
amq_volume_auto.sh -i "source"
```

which will produce outputs in a `norm` folder that you can then upload.

### 3. Muxing clean audio

However, if your source video has SFX/talking/whatever and needs to be muxed with a clean version of the audio, you'll have some more work to do.

First, sync your clean audio to the video. This may take some editing in the software of your choice. If you're poor/not a pirate you can use Audacity and line up the waveforms/spectrograms as best as you can.

Once you have your clean audio, you can mux it with your previously encoded output video with this script:

```bash
amq_mux.sh -i "source" -a "clean.wav"
```

where the flags `-i` points to your video folder and `-a` points to your clean audio file.
This generates outputs in a `clean` folder.

Then apply the same audio adjustment as in step 2, but pointing to your `clean` folder instead of `source`:

```bash
amq_volume_auto.sh -i "clean"
```

You can now upload the contents of your `norm` folder.

## Tips

### Don't use MP3/FLAC for your final cleans to be muxed

They add some amount of silence to the beginning and end of the file,
so your audio will be slightly out of sync with the video if they were originally synced properly in your editing software.
You can of course still use MP3/FLAC for your sources (as long as they are of acceptable quality).

### Audio quality

Generally, lossy codecs save space by discarding information that's humanly inaudible. The more compression, the lower the cutoff frequency gets.
MP3 @ 320K CBR usually cuts off at 20-22 kHz, so it's *usually* safe to use it as a source, but anything at lower bitrates gets worse rapidly. YMMV.
Lossless files do not have this limitation.
You can use [Spek](http://spek.cc/) to visualize this.

### fixing 3:2 pulldown, 30 FPS > 24 FPS

If your source file is 29.97 fps and has a duplicated frame once every 6 frames, you can fix it in your encode by adding the following argument to your encode command:

```bash
-vf "fps=30000/1001,fieldmatch,decimate"
```

If you require deinterlacing as well, do this instead:

```bash
-vf "fps=30000/1001,fieldmatch,yadif,decimate"
```

See this [Wikipedia entry](https://en.wikipedia.org/wiki/Three-two_pull_down) if you're a nerd.
