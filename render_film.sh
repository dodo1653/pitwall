# usage: bash render_film.sh <url> <frames_dir> <dur> <music.wav> <out.mp4>   (120 fps -> 4-frame blend -> 30 fps motion blur)
U=$1; D=$2; DUR=$3; M=$4; O=$5; N=$(python -c "print(int($DUR*120))")
rm -rf $D
for i in $(seq 1 15); do n=$(ls $D 2>/dev/null | wc -l); [ $n -ge $N ] && break; from=$(python -c "print($n/120)"); node render.mjs "$U" $D 120 $from > $D.log 2>&1; done
ffmpeg -y -loglevel error -framerate 120 -i $D/f%05d.jpg -i $M -vf "tmix=frames=4:weights='1 1 1 1',framestep=4,fade=t=in:st=0:d=0.5,format=yuv420p" -r 30 -c:v libx264 -crf 19 -preset slow -maxrate 12M -bufsize 24M -c:a aac -b:a 192k -shortest $O
ffprobe -v error -show_entries format=duration,size -of csv=p=0 $O
