src = open('15-board-build.py').read()
src = src[:src.index("board(); circle(")]
src = src.replace("O = K + 's15/'", "O = K + 's15b/'")
exec(src)
circle('seal-full', 'full'); circle('seal-empty', 'empty'); ribbon(); pins(); slate()
paper('n-small', 40, 33)
paper('n-torn', 40, 33, tear=9)
paper('n-broken', 40, 33, tear=12, curl=((214, 120, 100), (160, 64, 52)))
paper('n-fresh', 40, 33)
paper('n-scrap', 38, 29, plain=True, ragged=True)
paper('n-hero', 100, 45)
for i in range(3):
    sl = Image.new('RGBA', (15, 9), (0, 0, 0, 0))
    for y in range(9):
        for x in range(15):
            if x in (0, 14) and y in (0, 8): continue
            edge = y in (0, 8) or x in (0, 14)
            sl.putpixel((x, y), (120, 92, 62, 255) if edge else (206, 192, 150, 255))
    for y, l in ((3, 9 - i), (5, 6 + i)):
        for x in range(2, 2 + l): sl.putpixel((x, y), (70, 48, 30, 255))
    sl.save(O + 'slip%d.png' % i)
paper('parch', 350, 326, parch=True)
im = Image.open(O + 'parch.png'); w, h = im.size
d = 2
for x in range(1, w - 1):
    d = max(0, min(5, d + random.choice([-1, 0, 0, 1])))
    for y in range(h - 1 - d, h): im.putpixel((x, y), (0, 0, 0, 0))
    im.putpixel((x, h - 2 - d), (140, 104, 66, 255))
im.save(O + 'parch.png')
# post: rounded cap from the billboard's post tops, body from its post
post = Image.new('RGBA', (8, 66), (0, 0, 0, 0))
for y in range(66):
    sy = 36 + (y % 10) if y > 3 else 0
    for x in range(8):
        if y <= 3:
            c = px(B, 6 + min(x, 5), y)
            if x >= 6 or c[3] == 0: c = (0, 0, 0, 0)
            if x == 6: c = (0, 0, 0, 0)
        else:
            c = px(B, 6 + min(x, 5), 36 + (y % 9)) if x < 6 else (0, 0, 0, 0)
        if c[3]: post.putpixel((x, y), c)
for x in range(6): post.putpixel((x, 65), (0, 0, 0, 0))
post.save(O + 'post.png')
# name plank
pl = Image.new('RGBA', (66, 10), (0, 0, 0, 0))
for i, sy in enumerate(range(4, 13)):
    for x in range(66):
        sx = x if x < 6 else (58 + x - 60 if x >= 60 else 6 + (x - 6 + 9) % 52)
        c = px(B, sx, sy)
        if c[3]: pl.putpixel((x, i), mul(c, .7))
pl.save(O + 'plank.png')
