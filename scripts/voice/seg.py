import sys,numpy as np
from analyze import read,feats
def runs(lab):
    r=[];s=0
    for i in range(1,len(lab)+1):
        if i==len(lab) or lab[i]!=lab[s]: r.append((lab[s],s,i)); s=i
    return r
def label(F):
    t,e,v,fl,c=F.T; p90=np.percentile(e,90); floor=np.percentile(e,10)
    lab=np.where(e<floor+8,'.',np.where((v>0.45)|(e>p90-14),'S',np.where(e>p90-22,'f','b')))
    return lab,p90,floor
if __name__=="__main__":
    for p in sys.argv[1:]:
        F=feats(read(p)); lab,p90,floor=label(F)
        print(f"== {p} p90 {p90:.1f} floor {floor:.1f}")
        print(''.join(lab))
