from PIL import Image
import numpy as np
im = np.array(Image.open('09-column-bg.png').convert('RGB')).astype(float)
l, r = 879, 886
for x in range(880, 886):
    t = (x - l) / (r - l)
    im[:, x] = im[:, l] * (1 - t) + im[:, r] * t
Image.fromarray(im.astype('uint8')).save('12-rail-bg.png')
import cv2
im2 = cv2.imread('12-rail-bg.png')
g = cv2.cvtColor(im2, cv2.COLOR_BGR2GRAY)
x0, y0, x1, y1 = 920, 410 - 100, 1200, 360
sub = g[y0:y1, x0:x1]
med = cv2.medianBlur(sub, 31)
m = ((sub.astype(int) - med.astype(int)) > 8).astype(np.uint8) * 255
m = cv2.dilate(m, np.ones((7, 7), np.uint8))
mask = np.zeros(g.shape, np.uint8); mask[y0:y1, x0:x1] = m
cv2.imwrite('12-rail-bg.png', cv2.inpaint(im2, mask, 7, cv2.INPAINT_TELEA))
