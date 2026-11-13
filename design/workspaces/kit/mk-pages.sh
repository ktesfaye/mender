for m in rest point many; do
cat > lead-A-$m.html <<H
<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="lead-A.css"></head><body>
<canvas id="ground"></canvas><div id="world"></div><canvas id="night"></canvas><div id="lit"></div><div id="txt"></div><div class="vignette"></div>
<script>window.MODE='$m'</script><script src="lead-A.js"></script></body></html>
H
done
