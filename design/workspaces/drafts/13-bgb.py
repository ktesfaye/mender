from PIL import Image
import numpy as np, cv2
for src,dst in (('bg-yard.png','13-bg.png'),('bg-busy.png','13-bgb.png')):
    im = cv2.imread(src); s=im.shape[1]/1480
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY); mask=np.zeros(g.shape,np.uint8)
    def box(x0,y0,x1,y1,t=9):
        x0,y0,x1,y1=[int(v*s) for v in (x0,y0,x1,y1)]
        sub=g[y0:y1,x0:x1]; med=cv2.medianBlur(sub,31)
        m=((sub.astype(int)-med.astype(int))>t).astype(np.uint8)*255
        mask[y0:y1,x0:x1]|=cv2.dilate(m,np.ones((9,9),np.uint8))
    box(30,40,560,102); box(1180,92,1450,138); box(30,138,1450,146,6)
    cv2.imwrite(dst, cv2.inpaint(im,mask,7,cv2.INPAINT_TELEA))
