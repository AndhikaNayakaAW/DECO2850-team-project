import numpy as np, math, sys
def hex2rgb(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16)/255 for i in (0,2,4)])
def rgb2hex(c): c=np.clip(c,0,1); return '#'+''.join(f'{round(x*255):02X}' for x in c)
def lin(c): return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def delin(c): c=np.clip(c,0,1); return np.where(c<=0.0031308,c*12.92,1.055*c**(1/2.4)-0.055)
def oklch2rgb(L,C,h):
    a=C*math.cos(math.radians(h)); b=C*math.sin(math.radians(h))
    l_=L+0.3963377774*a+0.2158037573*b; m_=L-0.1055613458*a-0.0638541728*b; s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s; g=-1.2684380046*l+2.6097574011*m-0.3413193965*s; bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    lr=np.array([r,g,bb]); ok=np.all((lr>=-1e-4)&(lr<=1+1e-4)); return delin(lr), ok
M=np.array([[0.4124564,0.3575761,0.1804375],[0.2126729,0.7151522,0.0721750],[0.0193339,0.1191920,0.9503041]])
def lab(rgb):
    X=M@lin(rgb); Xn=np.array([0.95047,1,1.08883]); t=X/Xn
    f=np.where(t>(6/29)**3,np.cbrt(t),t/(3*(6/29)**2)+4/29)
    return np.array([116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])])
def de2000(l1,l2):
    L1,a1,b1=l1;L2,a2,b2=l2
    C1=math.hypot(a1,b1);C2=math.hypot(a2,b2);Cb=(C1+C2)/2
    G=0.5*(1-math.sqrt(Cb**7/(Cb**7+25**7)));a1p=(1+G)*a1;a2p=(1+G)*a2
    C1p=math.hypot(a1p,b1);C2p=math.hypot(a2p,b2)
    h1p=math.degrees(math.atan2(b1,a1p))%360;h2p=math.degrees(math.atan2(b2,a2p))%360
    dLp=L2-L1;dCp=C2p-C1p
    dh=h2p-h1p
    if C1p*C2p==0: dh=0
    elif dh>180: dh-=360
    elif dh<-180: dh+=360
    dHp=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2))
    Lbp=(L1+L2)/2;Cbp=(C1p+C2p)/2
    if C1p*C2p==0: hbp=h1p+h2p
    elif abs(h1p-h2p)<=180: hbp=(h1p+h2p)/2
    elif h1p+h2p<360: hbp=(h1p+h2p+360)/2
    else: hbp=(h1p+h2p-360)/2
    T=1-0.17*math.cos(math.radians(hbp-30))+0.24*math.cos(math.radians(2*hbp))+0.32*math.cos(math.radians(3*hbp+6))-0.2*math.cos(math.radians(4*hbp-63))
    dth=30*math.exp(-((hbp-275)/25)**2);RC=2*math.sqrt(Cbp**7/(Cbp**7+25**7))
    SL=1+0.015*(Lbp-50)**2/math.sqrt(20+(Lbp-50)**2);SC=1+0.045*Cbp;SH=1+0.015*Cbp*T;RT=-math.sin(math.radians(2*dth))*RC
    return math.sqrt((dLp/SL)**2+(dCp/SC)**2+(dHp/SH)**2+RT*(dCp/SC)*(dHp/SH))
CVD={'protan':np.array([[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]]),
'deutan':np.array([[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]]),
'tritan':np.array([[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]])}
def sim(rgb,k): return delin(CVD[k]@lin(rgb))
def lum(rgb): return float(np.dot([0.2126,0.7152,0.0722],lin(rgb)))
def cr(a,b): la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
def grey(rgb): return lum(rgb)
GROUND=hex2rgb('#F5F2ED'); INK=hex2rgb('#1D2A25'); OTH={'uni3d':'#C8D5E1','personal3d':'#E59981','mcd3d':'#374938'}
def report(name,hexes,labels):
    print(f"=== {name}")
    rgbs=[hex2rgb(h) for h in hexes]
    for lab_,h,c in zip(labels,hexes,rgbs):
        L=lab(c)
        best='ink' if cr(c,INK)>cr(c,GROUND) else 'cream'
        print(f"{lab_:7s} {h} L*={L[0]:.1f}  vsGround={cr(c,GROUND):.2f}  textInk={cr(c,INK):.2f} textCream={cr(c,GROUND):.2f} -> label in {best}  "+"  ".join(f"dE({k})={de2000(L,lab(hex2rgb(v))):.1f}" for k,v in OTH.items()))
    for mode in ['normal','protan','deutan','tritan']:
        cs=[c if mode=='normal' else sim(c,mode) for c in rgbs]
        d=[de2000(lab(cs[i]),lab(cs[i+1])) for i in range(len(cs)-1)]
        Ls=[round(lab(c)[0],1) for c in cs]
        print(f"  {mode:7s} adjacent dE2000={[round(x,1) for x in d]}  L*={Ls}  dE(first,ground)={de2000(lab(cs[0]),lab(GROUND if mode=='normal' else sim(GROUND,mode))):.1f}")
if __name__=='__main__':
    for spec in sys.argv[1:]:
        if spec.startswith('oklch:'):
            pts=[tuple(map(float,p.split(','))) for p in spec[6:].split(';')]
            hs=[]
            for L,C,h in pts:
                c,ok=oklch2rgb(L,C,h); hs.append(rgb2hex(c)+('' if ok else '!'))
            print('oklch ->',hs); hexes=[x.rstrip('!') for x in hs]
        else: hexes=spec.split(',')
        labels=['Light','Steady','Busy','Hard','VeryHard'][:len(hexes)]
        report(spec[:60],hexes,labels)

def others_cvd(hexes):
    for mode in ['protan','deutan','tritan']:
        out=[]
        for h in hexes:
            c=sim(hex2rgb(h),mode)
            out.append(h+":"+",".join(f"{k[:3]}{de2000(lab(c),lab(sim(hex2rgb(v),mode))):.0f}" for k,v in OTH.items()))
        print("   ",mode," | ".join(out))
