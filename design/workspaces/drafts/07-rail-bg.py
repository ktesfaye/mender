import cv2, numpy as np
im = cv2.imread('bg-yard.png')
m = np.zeros(im.shape[:2], np.uint8)
def r(x0,y0,x1,y1): m[y0*2:y1*2, x0*2:x1*2] = 255
r(28,48,300,108)      # head text left
r(1300,94,1452,140)   # auto / model right
r(455,158,620,178)    # what it said label
r(436,150,446,212)    # column rule top
r(14,906,330,1010)    # rail lantern
r(14,906,330,1010)
out = cv2.inpaint(im, m, 6, cv2.INPAINT_TELEA)
# roughen inpaint with noise so it isn't flat
n = np.random.RandomState(1).normal(0,1.6,im.shape).astype(np.float32)
mk = cv2.GaussianBlur(m,(0,0),3)[...,None]/255.0
out = np.clip(out.astype(np.float32)+n*mk,0,255).astype(np.uint8)
cv2.imwrite('07-rail-bg.png', out)
