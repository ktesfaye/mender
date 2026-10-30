import cv2, numpy as np
im = cv2.imread('bg-yard.png')
def med(x0,y0,x1,y1,k):
    x0,y0,x1,y1=[int(v*2) for v in (x0,y0,x1,y1)]
    im[y0:y1,x0:x1]=cv2.medianBlur(im[y0:y1,x0:x1],k)
med(24,40,420,100,31)
med(1290,96,1445,136,31)
med(30,136,1450,150,15)
x0,y0,x1,y1=[int(v*2) for v in (20,906,300,985)]
im[y0:y1,x0:x1]=im[y0:y1,x0+1700:x1+1700]
cv2.imwrite('10-bar-bg.png', im)
