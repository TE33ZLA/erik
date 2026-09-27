using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace VehicleMediaBridge {
    public static class ProtocolTests {
        static void Require(bool b,string why) { if(!b) throw new Exception(why); }
        static Frame F(ushort seq,int value) { return new Frame {Kind=1,Field=1,Nonce=0x12345678,Sequence=seq,Value=value}; }
        static void Feed(Decoder d,string s,ref long t) { foreach(char c in s) { d.Feed(c=='1'?"Next":"Previous",t); t+=250; } }
        public static List<string> Run() {
            var passed=new List<string>();
            Action<string,Action> check=(name,fn)=>{fn();passed.Add(name);};
            check("Independent CRC check vector",()=>Require(Wire.Crc(Encoding.ASCII.GetBytes("123456789"),9)==0xcbf43926,"CRC-32 standard vector"));
            check("Signed values and limits round-trip",()=>{foreach(int v in new[]{int.MinValue,-1,0,1,1234,int.MaxValue}) Require(Wire.Decode(Wire.Encode(F(1,v))).Value==v,"Value changed");});
            check("Every raw packet bit error rejected",()=>{byte[] original=Wire.Encode(F(1,1234));for(int i=0;i<original.Length*8;i++){byte[] b=(byte[])original.Clone();b[i/8]^=(byte)(1<<(i%8));bool refused=false;try{Wire.Decode(b);}catch(ArgumentException){refused=true;}Require(refused,"Undetected raw bit error "+i);}});
            check("Seeded varied payloads preserve exact values",()=>{var random=new Random(14092026);for(int i=0;i<300;i++){byte[] bytes=new byte[4];random.NextBytes(bytes);int value=BitConverter.ToInt32(bytes,0);var d=new Decoder(0x12345678,"internal-synthetic");int n=0;d.Received+=(f,s)=>{Require(f.Value==value,"Wrong random value");n++;};long t=0;Feed(d,Wire.Symbols(Wire.Encode(F(1,value))),ref t);Require(n==1,"Random frame lost");}});
            check("Noise before frame resynchronises",()=>{var d=new Decoder(0x12345678,"internal-synthetic");int count=0;d.Received+=(f,s)=>{Require(f.Value==1234 && s=="internal-synthetic","Bad provenance/value");count++;};long t=0;Feed(d,"001011001"+Wire.Symbols(Wire.Encode(F(1,1234))),ref t);Require(count==1,"Missing valid frame");});
            check("Every symbol flip avoids wrong values and next frame recovers",()=>{
                string original=Wire.Symbols(Wire.Encode(F(1,1234)));
                for(int pos=0;pos<original.Length;pos++) {var d=new Decoder(0x12345678,"internal-synthetic");var got=new List<int>();d.Received+=(f,s)=>got.Add(f.Value);char[] b=original.ToCharArray();b[pos]=b[pos]=='1'?'0':'1';long t=0;Feed(d,new string(b)+Wire.Symbols(Wire.Encode(F(2,5678))),ref t);Require(got.Count>=1 && got.Last()==5678 && got.All(v=>v==1234 || v==5678),"Corruption recovery at bit "+pos);}
            });
            check("Every dropped symbol avoids wrong values and recovery works",()=>{
                string original=Wire.Symbols(Wire.Encode(F(1,1234)));
                for(int pos=0;pos<original.Length;pos++) {var d=new Decoder(0x12345678,"internal-synthetic");var got=new List<int>();d.Received+=(f,s)=>got.Add(f.Value);long t=0;Feed(d,original.Remove(pos,1)+Wire.Symbols(Wire.Encode(F(2,5678))),ref t);Require(got.Count>=1 && got.Last()==5678 && got.All(v=>v==1234 || v==5678),"Drop recovery at "+pos);}
            });
            check("Every duplicated symbol avoids wrong values and recovery works",()=>{
                string original=Wire.Symbols(Wire.Encode(F(1,1234)));
                for(int pos=0;pos<original.Length;pos++) {var d=new Decoder(0x12345678,"internal-synthetic");var got=new List<int>();d.Received+=(f,s)=>got.Add(f.Value);long t=0;Feed(d,original.Insert(pos,original[pos].ToString())+Wire.Symbols(Wire.Encode(F(2,5678))),ref t);
                    // An insertion after the last differing bit can leave a complete valid first frame intact.
                    Require(got.Count>=1 && got.Last()==5678 && got.All(v=>v==1234 || v==5678),"Wrong accepted value");}
            });
            check("Duplicate and old frames ignored, sequence wraps",()=>{var d=new Decoder(0x12345678,"internal-synthetic");var got=new List<int>();d.Received+=(f,s)=>got.Add(f.Value);long t=0;foreach(var f in new[]{F(65535,1),F(65535,2),F(0,3),F(65534,4)}) Feed(d,Wire.Symbols(Wire.Encode(f)),ref t);Require(got.SequenceEqual(new[]{1,3}),"Sequence handling");});
            check("Wrong session rejected",()=>{var d=new Decoder(42,"internal-synthetic");int n=0;d.Received+=(f,s)=>n++;long t=0;Feed(d,Wire.Symbols(Wire.Encode(F(1,1234))),ref t);Require(n==0,"Wrong session accepted");});
            check("Timed-out fragments cannot form a reading",()=>{var d=new Decoder(0x12345678,"internal-synthetic");int n=0;d.Received+=(f,s)=>n++;string b=Wire.Symbols(Wire.Encode(F(1,1234)));long t=0;Feed(d,b.Substring(0,70),ref t);t+=4000;Feed(d,b.Substring(70),ref t);Require(n==0,"Stale partial accepted");Feed(d,Wire.Symbols(Wire.Encode(F(2,5678))),ref t);Require(n==1,"No recovery");});
            check("Unknown control resets partial packet",()=>{var d=new Decoder(0x12345678,"internal-synthetic");int n=0;d.Received+=(f,s)=>n++;string b=Wire.Symbols(Wire.Encode(F(1,1)));long t=0;Feed(d,b.Substring(0,90),ref t);d.Feed("Pause",t++);Feed(d,b.Substring(90),ref t);Require(n==0,"Mixed controls accepted");});
            check("Buffer stays bounded during noise",()=>{var d=new Decoder(1,"internal-synthetic");long t=0;Feed(d,new string('1',10000),ref t);Require(d.Buffered<16,"Unbounded buffer");});
            check("Unknown frame version and field fail closed",()=>{foreach(int at in new[]{2,3,10}) {byte[] b=Wire.Encode(F(1,1));b[at]=99;uint c=Wire.Crc(b,15);for(int i=0;i<4;i++)b[15+i]=(byte)(c>>(24-i*8));bool refused=false;try{Wire.Decode(b);}catch(ArgumentException){refused=true;}Require(refused,"Unknown schema accepted");}});
            check("Missing radio adapter cannot emit fabricated readings",()=>{bool sent=false;string error;Require(!HelperModel.TryReadAndEncode(null,b=>sent=true,1,1,out error) && !sent,"Absent adapter emitted");Require(!HelperModel.TryReadAndEncode(()=>null,b=>sent=true,1,1,out error) && !sent,"Missing data emitted");});
            check("Synthetic helper-to-receiver integration preserves provenance",()=>{var d=new Decoder(0x12345678,"internal-synthetic");int n=0;d.Received+=(f,s)=>{Require(f.Kind==2 && f.Value==1234 && s=="internal-synthetic","Synthetic mislabelled");n++;};string error;long t=0;Require(HelperModel.TryReadAndEncode(()=>1234,b=>Feed(d,Wire.Symbols(b),ref t),0x12345678,1,out error) && n==1,"Helper loopback failed");});
            return passed;
        }
    }
}
