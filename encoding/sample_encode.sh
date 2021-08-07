amq_encode.sh -i "source.mkv" -ss 15:24.883 -to 16:09.300
amq_volume_auto.sh -i source

# if you were muxing your video with clean audio instead of broadcast audio,
# you would comment out the 2nd line "amq_volume_auto.sh -i source"
# and use the following instead, assuming clean.wav is your clean audio file:

# amq_mux.sh -a clean.wav -i source
# amq_volume_auto.sh -i clean