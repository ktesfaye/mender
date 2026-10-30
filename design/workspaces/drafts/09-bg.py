import cv2, numpy as np, sys
im = cv2.imread('bg-yard.png')
g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
mask = np.zeros(g.shape, np.uint8)
def box(x0,y0,x1,y1,full=False):
    sub = g[y0:y1,x0:x1]
    if full:
        mask[y0:y1,x0:x1] = 255
    else:
        med = cv2.medianBlur(sub, 31)
        m = ((sub.astype(int) - med.astype(int)) > 10).astype(np.uint8)*255
        m = cv2.dilate(m, np.ones((9,9),np.uint8))
        mask[y0:y1,x0:x1] = m
box(70,90,720,215)
box(60,1170,430,1345)
box(50,1816,560,1960,True)
out = cv2.inpaint(im, mask, 9, cv2.INPAINT_TELEA)
cv2.imwrite('09-column-bg.png', out)
