from PIL import Image
import numpy as np, cv2
im = cv2.imread('bg-yard.png')
g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
mask = np.zeros(g.shape, np.uint8)
def box(x0,y0,x1,y1):
    x0,y0,x1,y1=[int(v*2) for v in (x0,y0,x1,y1)]
    sub=g[y0:y1,x0:x1]; med=cv2.medianBlur(sub,31)
    m=((sub.astype(int)-med.astype(int))>9).astype(np.uint8)*255
    mask[y0:y1,x0:x1]|=cv2.dilate(m,np.ones((9,9),np.uint8))
box(30,45,290,100)
box(1290,92,1450,138)
# the hairline rule under the head
box(30,138,1130,146)
box(1130,138,1450,146)
cv2.imwrite('13-bg.png', cv2.inpaint(im, mask, 7, cv2.INPAINT_TELEA))
