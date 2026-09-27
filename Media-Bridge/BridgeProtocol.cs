using System;
using System.Collections.Generic;
using System.Linq;

namespace VehicleMediaBridge {
    // Experimental wire format, NOT an existing Volkswagen protocol.
    // No sockets, native firmware calls or car writes exist in this assembly.
    public sealed class Frame {
        public byte Kind, Field;
        public uint Nonce;
        public ushort Sequence;
        public int Value;
    }
    public static class Wire {
        public const int Bytes = 19;
        public static uint Crc(byte[] b, int count) {
            uint c = 0xffffffff;
            for (int i=0; i<count; i++) { c ^= b[i]; for(int j=0;j<8;j++) c=(c>>1)^((c&1)!=0?0xedb88320:0); }
            return ~c;
        }
        static void U32(byte[] b,int at,uint v) { for(int i=0;i<4;i++) b[at+i]=(byte)(v>>(24-i*8)); }
        static uint R32(byte[] b,int at) { return ((uint)b[at]<<24)|((uint)b[at+1]<<16)|((uint)b[at+2]<<8)|b[at+3]; }
        public static byte[] Encode(Frame f) {
            if (f.Kind!=1 && f.Kind!=2) throw new ArgumentException("Unsupported frame kind");
            if (f.Field!=1) throw new ArgumentException("Only experimental field 1 is defined");
            byte[] b=new byte[Bytes]; b[0]=0xd3; b[1]=0x91; b[2]=1; b[3]=f.Kind;
            U32(b,4,f.Nonce); b[8]=(byte)(f.Sequence>>8); b[9]=(byte)f.Sequence; b[10]=f.Field;
            U32(b,11,unchecked((uint)f.Value)); U32(b,15,Crc(b,15)); return b;
        }
        public static string Bits(byte[] b) { return String.Concat(b.Select(x=>Convert.ToString(x,2).PadLeft(8,'0'))); }
        public static string Symbols(byte[] b) {
            var s=new System.Text.StringBuilder("0111111001111110");int ones=0;
            foreach(char bit in Bits(b)) {s.Append(bit);ones=bit=='1'?ones+1:0;if(ones==5){s.Append('0');ones=0;}}
            return s.Append("0111111001111110").ToString();
        }
        public static Frame Decode(byte[] b) {
            if(b.Length!=Bytes || b[0]!=0xd3 || b[1]!=0x91 || b[2]!=1 || (b[3]!=1 && b[3]!=2) || b[10]!=1)
                throw new ArgumentException("Unsupported frame");
            if(R32(b,15)!=Crc(b,15)) throw new ArgumentException("Checksum mismatch");
            return new Frame { Kind=b[3], Nonce=R32(b,4), Sequence=(ushort)((b[8]<<8)|b[9]), Field=b[10], Value=unchecked((int)R32(b,11)) };
        }
    }
    public sealed class Decoder {
        readonly string source;
        readonly uint nonce;
        readonly List<int> bits=new List<int>();
        long last=-1;
        ushort? sequence;
        bool inFrame;
        public event Action<Frame,string> Received;
        public event Action<string> Notice;
        public Decoder(uint sessionNonce,string provenance) { nonce=sessionNonce; source=provenance; }
        public int Buffered { get { return bits.Count; } }
        void Note(string s) { if(Notice!=null) Notice(s); }
        public void Expire(long now) {
            if(last>=0 && now-last>3000 && bits.Count>0) { bits.Clear();inFrame=false; Note("Incomplete message expired; waiting for a new frame."); }
        }
        public void Feed(string button,long now) {
            if(last>=0 && now<last) { bits.Clear();inFrame=false; last=now; Note("Clock moved backwards; partial message discarded."); return; }
            Expire(now); last=now;
            if(button!="Next" && button!="Previous") { bits.Clear();inFrame=false; Note("Non-data media control; partial message discarded."); return; }
            bits.Add(button=="Next"?1:0);
            int tail=0;if(bits.Count>=8)for(int i=bits.Count-8;i<bits.Count;i++)tail=(tail<<1)|bits[i];
            if(bits.Count>=8 && tail==0x7e) {
                var payload=bits.Take(bits.Count-8).ToArray();bits.Clear();bool hadStart=inFrame;inFrame=true;
                if(!hadStart || payload.Length==0)return;
                var unstuffed=new List<int>();int ones=0;
                foreach(int bit in payload) {if(ones==5) {if(bit!=0){Note("Invalid framing; message rejected.");return;}ones=0;continue;}unstuffed.Add(bit);ones=bit==1?ones+1:0;}
                if(ones==5 || unstuffed.Count!=Wire.Bytes*8) {Note("Incomplete or damaged message rejected.");return;}
                byte[] raw=new byte[Wire.Bytes];for(int i=0;i<unstuffed.Count;i++)raw[i/8]=(byte)((raw[i/8]<<1)|unstuffed[i]);
                Frame f;try { f=Wire.Decode(raw); }catch(ArgumentException) {Note("Damaged or unsupported message rejected.");return;}
                if(f.Nonce!=nonce) { Note("Message belongs to a different test session; ignored."); return; }
                if(sequence.HasValue) {
                    int delta=(f.Sequence-sequence.Value+65536)%65536;
                    if(delta==0 || delta>=32768) { Note("Duplicate or old message ignored."); return; }
                }
                sequence=f.Sequence;
                if(Received!=null) Received(f,source);
                return;
            }
            if(!inFrame && bits.Count>8)bits.RemoveAt(0);
            if(bits.Count>256){bits.RemoveRange(0,bits.Count-7);inFrame=false;Note("Oversized message discarded.");}
        }
    }
    public static class HelperModel {
        // A future radio port must supply BOTH callbacks. This is not a radio installer.
        // No made-up default is substituted when a vehicle value is unavailable.
        public static bool TryReadAndEncode(Func<int?> readValue,Action<byte[]> deliver,uint nonce,ushort sequence,out string error) {
            if(readValue==null || deliver==null) { error="Radio data/transport adapter is not implemented."; return false; }
            int? value=readValue();
            if(!value.HasValue) { error="No value is available; nothing was sent."; return false; }
            deliver(Wire.Encode(new Frame {Kind=2,Field=1,Nonce=nonce,Sequence=sequence,Value=value.Value}));
            error=null; return true;
        }
    }
}
