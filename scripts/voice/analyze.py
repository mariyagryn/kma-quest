import wave,sys,numpy as np
SR=48000; H=480; N=1440  # 10ms hop, 30ms window
def read(p):
    w=wave.open(p); return np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
def feats(a):
    out=[]
    win=np.hanning(N)
    for s in range(0,len(a)-N,H):
        x=a[s:s+N]; e=20*np.log10(np.sqrt(np.mean(x**2))+1e-9)
        # voicing: normalized autocorr peak in 70-400 Hz
        x0=x-x.mean(); ac=np.correlate(x0,x0,'full')[N-1:]; ac/= (ac[0]+1e-12)
        lo,hi=SR//400,SR//70; v=ac[lo:hi].max()
        X=np.abs(np.fft.rfft(x*win))+1e-9; fl=np.exp(np.mean(np.log(X)))/np.mean(X)
        f=np.fft.rfftfreq(N,1/SR); cen=(f*X).sum()/X.sum()
        out.append((s/SR,e,v,fl,cen))
    return np.array(out)
if __name__=="__main__":
    for p in sys.argv[1:]:
        F=feats(read(p)); print("==",p)
        for t,e,v,fl,c in F[::3]:
            bar='#'*int(max(0,e+70)/2)
            print(f"{t:5.2f} {e:6.1f} v{v:.2f} fl{fl:.2f} c{c:5.0f} {bar}")
