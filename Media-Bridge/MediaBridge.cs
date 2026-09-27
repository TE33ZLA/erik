using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Windows.Media;
using Windows.Media.Core;
using Windows.Media.Playback;
using Windows.Media.Control;

namespace VehicleMediaBridge {
    public static class ExecutionEvidence {
        public static string Hash(string path) {using(var algorithm=SHA256.Create())using(var stream=File.OpenRead(path))return BitConverter.ToString(algorithm.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}
        public static readonly object Identity=Capture();
        static object Capture(){string root=AppDomain.CurrentDomain.BaseDirectory;string assembly=System.Reflection.Assembly.GetExecutingAssembly().Location;string manifest=Path.Combine(root,"kit-manifest.json");return new{executable=Path.GetFileName(assembly),executable_sha256=Hash(assembly),kit_manifest_sha256=File.Exists(manifest)?Hash(manifest):"missing",process_id=Process.GetCurrentProcess().Id,started_utc=DateTime.UtcNow.ToString("o")};}
    }
    public sealed class Journal {
        public readonly string DirectoryPath;
        readonly object gate=new object();
        readonly JavaScriptSerializer serializer=new JavaScriptSerializer();
        public Journal() { DirectoryPath=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"results",DateTime.UtcNow.ToString("yyyyMMddTHHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6)); Directory.CreateDirectory(DirectoryPath); Save("execution.json",ExecutionEvidence.Identity); }
        public void Write(string type,object detail) { lock(gate) File.AppendAllText(Path.Combine(DirectoryPath,"events.jsonl"),serializer.Serialize(new {at=DateTime.UtcNow.ToString("o"),type=type,detail=detail})+Environment.NewLine); }
        public void Save(string file,object data) { lock(gate) {var record=serializer.Deserialize<Dictionary<string,object>>(serializer.Serialize(data));record["execution"]=ExecutionEvidence.Identity;File.WriteAllText(Path.Combine(DirectoryPath,file),serializer.Serialize(record));} }
    }
    public sealed class MediaReceiver : IDisposable {
        MediaPlayer player;
        SystemMediaTransportControls controls;
        public event Action<string> Button;
        public event Action<string> Error;
        bool disposed;
        readonly object lifecycle=new object();
        public static string EnsureSilence() {
            string file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"silence.wav");
            if(!File.Exists(file)) using(var w=new BinaryWriter(File.Create(file))) {
                int bytes=8000*2*4;w.Write(Encoding.ASCII.GetBytes("RIFF"));w.Write(36+bytes);w.Write(Encoding.ASCII.GetBytes("WAVEfmt "));
                w.Write(16);w.Write((short)1);w.Write((short)1);w.Write(8000);w.Write(16000);w.Write((short)2);w.Write((short)16);
                w.Write(Encoding.ASCII.GetBytes("data"));w.Write(bytes);w.Write(new byte[bytes]);
            }
            return file;
        }
        public void Start(uint nonce,bool play) {
            try {
                player=new MediaPlayer(); player.CommandManager.IsEnabled=false;
                player.IsLoopingEnabled=true;player.Volume=0;
                player.MediaFailed+=(sender,args)=>{if(!disposed && Error!=null) Error(args.ErrorMessage);};
                controls=player.SystemMediaTransportControls;
                controls.IsEnabled=true; controls.IsNextEnabled=true;controls.IsPreviousEnabled=true;
                controls.IsPlayEnabled=true;controls.IsPauseEnabled=true;controls.IsStopEnabled=true;
                controls.ButtonPressed+=OnButton;
                controls.DisplayUpdater.Type=MediaPlaybackType.Music;
                controls.DisplayUpdater.MusicProperties.Title="Bridge test "+nonce.ToString("X8");
                controls.DisplayUpdater.MusicProperties.Artist="Connection test - no car readings";
                controls.DisplayUpdater.Update();
                player.Source=MediaSource.CreateFromUri(new Uri(EnsureSilence()));
                controls.PlaybackStatus=MediaPlaybackStatus.Paused;
                if(play) {player.Play();controls.PlaybackStatus=MediaPlaybackStatus.Playing;}
            } catch { Dispose();throw; }
        }
        void OnButton(SystemMediaTransportControls sender,SystemMediaTransportControlsButtonPressedEventArgs args) {
            lock(lifecycle){
            if(disposed)return;
            if(Button!=null)Button(args.Button.ToString());
            if(args.Button==SystemMediaTransportControlsButton.Play) {player.Play();controls.PlaybackStatus=MediaPlaybackStatus.Playing;}
            if(args.Button==SystemMediaTransportControlsButton.Pause || args.Button==SystemMediaTransportControlsButton.Stop) {player.Pause();controls.PlaybackStatus=MediaPlaybackStatus.Paused;}
            }
        }
        public void SetTitle(string title) {lock(lifecycle){if(disposed||controls==null)throw new InvalidOperationException("Media receiver is stopped");controls.DisplayUpdater.MusicProperties.Title=title;controls.DisplayUpdater.Update();}}
        public void SelectOutput(Windows.Devices.Enumeration.DeviceInformation device){lock(lifecycle){if(disposed)throw new InvalidOperationException("Receiver stopped");player.AudioDevice=device;if(player.AudioDevice==null||player.AudioDevice.Id!=device.Id)throw new InvalidOperationException("Windows did not retain the selected audio output");}}
        public async Task TestTone(){
            string file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"route-tone.wav");
            if(!File.Exists(file))using(var w=new BinaryWriter(File.Create(file))){int samples=8000;w.Write(Encoding.ASCII.GetBytes("RIFF"));w.Write(36+samples*2);w.Write(Encoding.ASCII.GetBytes("WAVEfmt "));w.Write(16);w.Write((short)1);w.Write((short)1);w.Write(8000);w.Write(16000);w.Write((short)2);w.Write((short)16);w.Write(Encoding.ASCII.GetBytes("data"));w.Write(samples*2);for(int i=0;i<samples;i++){double envelope=Math.Min(1,Math.Min(i/100.0,(samples-i)/100.0));w.Write((short)(Math.Sin(2*Math.PI*440*i/8000)*2000*envelope));}}
            lock(lifecycle){if(disposed)return;player.IsLoopingEnabled=false;player.Volume=.25;player.Source=MediaSource.CreateFromUri(new Uri(file));player.Play();}
            await Task.Delay(1400);
            lock(lifecycle){if(disposed)return;player.Volume=0;player.IsLoopingEnabled=true;player.Source=MediaSource.CreateFromUri(new Uri(EnsureSilence()));player.Play();}
        }
        public void Dispose() {
            lock(lifecycle){
            disposed=true;
            if(controls!=null) {controls.ButtonPressed-=OnButton;controls.IsEnabled=false;controls.DisplayUpdater.ClearAll();controls=null;}
            if(player!=null) {player.Pause();player.Dispose();player=null;}
            }
        }
    }
    public sealed class BridgeWindow : Form {
        readonly Journal journal=new Journal();
        readonly Stopwatch clock=Stopwatch.StartNew();
        MediaReceiver receiver;
        Decoder decoder;
        uint nonce;
        int buttonCount;
        readonly Label checks=new Label(), windows=new Label(), reading=new Label(), detail=new Label();
        readonly TextBox log=new TextBox();
        readonly Button start=new Button(), stop=new Button(), test=new Button();
        readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
        public BridgeWindow() {
            Text="Vehicle Media Bridge - Windows experiment";ClientSize=new Size(1020,730);MinimumSize=new Size(920,700);
            BackColor=Color.FromArgb(241,245,249);Font=new Font("Segoe UI",10);
            var layout=new TableLayoutPanel {Dock=DockStyle.Fill,Padding=new Padding(26),ColumnCount=1,RowCount=8};Controls.Add(layout);
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute,48));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,66));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute,106));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,64));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute,74));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,70));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,26));
            layout.Controls.Add(new Label {Text="Test the music-control connection",Dock=DockStyle.Fill,Font=new Font("Segoe UI",23,FontStyle.Bold),ForeColor=Color.FromArgb(15,23,42)});
            layout.Controls.Add(new Label {Text="Windows prototype. No car reading has been verified.\nThe radio-side program and USB installation route are not available yet.",Dock=DockStyle.Fill,ForeColor=Color.FromArgb(133,77,14),Padding=new Padding(12),BackColor=Color.FromArgb(254,249,195)});
            var cards=new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=3,Padding=new Padding(0,12,0,4)};
            for(int i=0;i<3;i++)cards.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,33.33f));
            checks.Text="1  Internal checks\nNot run in this session";windows.Text="2  Windows receiver\nStopped";reading.Text="3  Car data\nNot available";
            foreach(var l in new[]{checks,windows,reading}) {l.Dock=DockStyle.Fill;l.Padding=new Padding(12);l.BackColor=Color.White;l.Margin=new Padding(0,0,10,0);cards.Controls.Add(l);}layout.Controls.Add(cards);
            var buttons=new FlowLayoutPanel {Dock=DockStyle.Fill,Padding=new Padding(0,9,0,0)};
            test.Text="1. Run internal checks";start.Text="2. Start Windows receiver";stop.Text="Stop and save";
            foreach(var b in new[]{test,start,stop}) {b.AutoSize=true;b.Height=40;b.Padding=new Padding(10,5,10,5);buttons.Controls.Add(b);}stop.Enabled=false;
            test.Click+=(s,e)=>RunTests();start.Click+=(s,e)=>StartReceiver();stop.Click+=(s,e)=>StopReceiver();layout.Controls.Add(buttons);
            layout.Controls.Add(new Label {Dock=DockStyle.Fill,Text="Later, while parked: pair this laptop normally, choose Bluetooth audio on the car, start this receiver, then press Next / Previous once.\nA received button proves the control path only. Windows does not identify which device sent it.",Padding=new Padding(0,10,0,0)});
            detail.Dock=DockStyle.Fill;detail.Text="Start with internal checks. No Bluetooth scan, pairing change or firmware upload is performed.";layout.Controls.Add(detail);
            log.Dock=DockStyle.Fill;log.Multiline=true;log.ReadOnly=true;log.ScrollBars=ScrollBars.Vertical;log.Font=new Font("Consolas",9);layout.Controls.Add(log);
            var folder=new LinkLabel {Text="Open saved results",Dock=DockStyle.Fill};folder.LinkClicked+=(s,e)=>Process.Start("explorer.exe",journal.DirectoryPath);layout.Controls.Add(folder);
            timer.Interval=500;timer.Tick+=(s,e)=>{if(decoder!=null)decoder.Expire(clock.ElapsedMilliseconds);};timer.Start();
            FormClosing+=(s,e)=>{StopReceiver();timer.Stop();journal.Write("closed",new{verified_vehicle_reading=false});};
            journal.Write("opened",new{radio_installation="unavailable",vehicle_data="unverified"});
        }
        void Ui(Action action) {if(IsDisposed || Disposing)return;if(InvokeRequired) {try{BeginInvoke(action);}catch(InvalidOperationException){}} else action();}
        void Line(string text) {log.AppendText(DateTime.Now.ToString("HH:mm:ss")+"  "+text+Environment.NewLine);if(log.TextLength>35000)log.Text=log.Text.Substring(log.TextLength-24000);}
        void RunTests() {
            StopReceiver();test.Enabled=false;
            try {var result=ProtocolTests.Run();checks.Text="1  Internal checks\n"+result.Count+" groups passed";detail.Text="Synthetic messages decoded and damaged messages rejected. This does not test a Golf or USB installation.";
                journal.Save("internal-tests.json",new{passed=result,source="internal-synthetic",car_contact=false,vehicle_reading_verified=false});Line("Internal checks passed: "+result.Count+" groups. All input was synthetic.");}
            catch(Exception ex) {checks.Text="1  Internal checks\nFAILED";Line(ex.Message);journal.Write("test_failure",ex.ToString());}
            finally {test.Enabled=true;}
        }
        void StartReceiver() {
            StopReceiver();byte[] n=new byte[4];using(var rng=RandomNumberGenerator.Create())rng.GetBytes(n);nonce=BitConverter.ToUInt32(n,0);buttonCount=0;
            decoder=new Decoder(nonce,"windows-media-event-device-unattributed");
            decoder.Notice+=msg=>{Line(msg);journal.Write("decoder_notice",msg);};
            decoder.Received+=(frame,source)=>{reading.Text="3  Car data\nMessage received; unverified";detail.Text="Decoded integer "+frame.Value+" (no units or vehicle source established). This is NOT a verified car reading.";journal.Write("unverified_frame",new{frame.Kind,frame.Field,frame.Sequence,frame.Value,source=source,vehicle_reading_verified=false});Line("Frame decoded; source remains unverified.");};
            try {receiver=new MediaReceiver();var currentReceiver=receiver;receiver.Button+=button=>Ui(()=>{
                    if(!Object.ReferenceEquals(receiver,currentReceiver))return;buttonCount++;windows.Text="2  Windows receiver\n"+buttonCount+" media event(s)";Line("Windows received: "+button+" (device not identified)");journal.Write("windows_media_event",new{button=button,source="device-unattributed",monotonic_ms=clock.ElapsedMilliseconds});decoder.Feed(button,clock.ElapsedMilliseconds);
                });
                receiver.Error+=message=>Ui(()=>{if(!Object.ReferenceEquals(receiver,currentReceiver))return;Line("Windows media error: "+message);journal.Write("media_error",message);StopReceiver();});
                receiver.Start(nonce,true);start.Enabled=false;stop.Enabled=true;windows.Text="2  Windows receiver\nListening; no events yet";
                reading.Text="3  Car data\nNot available";detail.Text="Session "+nonce.ToString("X8")+". A silent media track keeps this test selectable. Pause other media apps if buttons go elsewhere.\nNo automatic retry or firmware installation will occur.";
                journal.Write("receiver_started",new{nonce=nonce.ToString("X8"),source="windows-media-event-device-unattributed"});Line("Windows media receiver started. Waiting for actual media events.");
            } catch(Exception ex) {StopReceiver();windows.Text="2  Windows receiver\nCould not start";detail.Text=ex.Message;journal.Write("receiver_error",ex.ToString());Line("Receiver could not start: "+ex.Message);}
        }
        void StopReceiver() {if(receiver!=null){receiver.Dispose();receiver=null;journal.Write("receiver_stopped",new{buttons=buttonCount,vehicle_reading_verified=false});Line("Receiver stopped; results saved.");}decoder=null;start.Enabled=true;stop.Enabled=false;windows.Text="2  Windows receiver\nStopped";}
        public void Preview(string path) {ShowInTaskbar=false;StartPosition=FormStartPosition.Manual;Location=new Point(-20000,-20000);Show();Application.DoEvents();RunTests();Application.DoEvents();using(var bmp=new Bitmap(Width,Height)){DrawToBitmap(bmp,new Rectangle(0,0,Width,Height));bmp.Save(path);}Close();}
    }
    public static class Program {
        [DllImport("shell32.dll",CharSet=CharSet.Unicode)] static extern int SetCurrentProcessExplicitAppUserModelID(string id);
        [STAThread] public static int Main(string[] args) {
            SetCurrentProcessExplicitAppUserModelID("VehicleMediaBridge.Lab");
            try {
                if(args.Contains("--self-test")) {var j=new Journal();var results=ProtocolTests.Run();results.AddRange(ButtonTrial.Tests());j.Save("internal-tests.json",new{passed=results,source="internal-synthetic",vehicle_reading_verified=false});Console.WriteLine(results.Count+" test groups passed. "+j.DirectoryPath);return 0;}
                if(args.Contains("--vector")) {var f=new Frame{Kind=1,Field=1,Nonce=0x12345678,Sequence=1,Value=1234};Console.WriteLine(BitConverter.ToString(Wire.Encode(f)).Replace("-",""));return 0;}
                if(args.Contains("--check-windows")) {var j=new Journal();using(var r=new MediaReceiver())r.Start(0,false);j.Save("windows-check.json",new{media_session_created=true,button_delivery_tested=false,car_contact=false,usb_installation_tested=false});Console.WriteLine("Windows media session created and released. Button delivery not tested. "+j.DirectoryPath);return 0;}
                if(args.Contains("--windows-loopback") || args.Contains("--windows-frame")) return Loopback(args.Contains("--windows-frame")).GetAwaiter().GetResult();
                Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
                int rehearsal=Array.IndexOf(args,"--rehearse-guided");
                if(rehearsal>=0||args.Contains("--prepare")){int code=0;using(var testWindow=new GuidedVisitWindow()){testWindow.ShowInTaskbar=false;testWindow.StartPosition=FormStartPosition.Manual;testWindow.Location=new Point(-20000,-20000);testWindow.Shown+=async(s,e)=>{try{if(rehearsal>=0)await testWindow.Rehearse(args[rehearsal+1]);else await testWindow.Prepare();}catch(Exception ex){Console.Error.WriteLine(ex);code=2;}finally{testWindow.Close();}};Application.Run(testWindow);}return code;}
                if(args.Contains("--advanced")){using(var window=new BridgeWindow())Application.Run(window);}
                else using(var window=new GuidedVisitWindow()) {int index=Array.IndexOf(args,"--preview");if(index>=0)window.Preview(args[index+1]);else Application.Run(window);}return 0;
            } catch(Exception ex) {Console.Error.WriteLine(ex.ToString());if(args.Length==0)MessageBox.Show(ex.Message,"Media Bridge could not start");return 1;}
        }
        static async Task<int> Loopback(bool fullFrame) {
            var j=new Journal();var received=new List<string>();var gate=new object();
            var decoded=new List<int>();var decoder=new Decoder(0x12345678,"local-windows-api-loopback");var clock=Stopwatch.StartNew();
            decoder.Received+=(f,s)=>decoded.Add(f.Value);
            try {
            using(var r=new MediaReceiver()) {
                r.Button+=b=>{lock(gate){received.Add(b);decoder.Feed(b,clock.ElapsedMilliseconds);j.Write("loopback_event",new{button=b,monotonic_ms=clock.ElapsedMilliseconds});}};r.Error+=e=>j.Write("media_error",e);r.Start(0x12345678,true);
                var manager=await AwaitOperation(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
                GlobalSystemMediaTransportControlsSession mine=null;
                for(int i=0;i<20 && mine==null;i++) {await Task.Delay(250);mine=manager.GetSessions().FirstOrDefault(s=>s.SourceAppUserModelId=="VehicleMediaBridge.Lab");}
                if(mine==null) {j.Save("windows-loopback.json",new{passed=false,reason="Own media session not identifiable; no other session was controlled",sessions=manager.GetSessions().Select(s=>s.SourceAppUserModelId).ToArray()});Console.WriteLine("Could not identify our own Windows media session. "+j.DirectoryPath);return 2;}
                string title="Local metadata check "+Guid.NewGuid().ToString("N").Substring(0,8);r.SetTitle(title);bool metadataPassed=false;
                for(int i=0;i<20&&!metadataPassed;i++){await Task.Delay(100);metadataPassed=(await AwaitOperation(mine.TryGetMediaPropertiesAsync())).Title==title;}
                string symbols=fullFrame?Wire.Symbols(Wire.Encode(new Frame{Kind=1,Field=1,Nonce=0x12345678,Sequence=1,Value=1234})):"10";
                bool accepted=true;foreach(char bit in symbols) {bool ok=await AwaitOperation(bit=='1'?mine.TrySkipNextAsync():mine.TrySkipPreviousAsync());accepted&=ok;if(!ok)break;await Task.Delay(250);}await Task.Delay(500);
                string[] events;int[] values;lock(gate){events=received.ToArray();values=decoded.ToArray();}bool passed=metadataPassed&&accepted&&events.SequenceEqual(symbols.Select(b=>b=='1'?"Next":"Previous"))&&(!fullFrame||values.SequenceEqual(new[]{1234}));
                j.Save("windows-loopback.json",new{passed=passed,metadata_update_verified_locally=metadataPassed,events=events,decoded_test_values=values,full_frame=fullFrame,symbols_sent=symbols.Length,source="local-windows-api-loopback",bluetooth_tested=false,car_contact=false,vehicle_reading_verified=false});
                Console.WriteLine("Local Windows event loopback "+(passed?"passed":"failed")+". "+j.DirectoryPath);return passed?0:2;
            }
            } catch(Exception ex) {j.Save("windows-loopback.json",new{passed=false,error=ex.Message,source="local-windows-api-loopback",car_contact=false,vehicle_reading_verified=false});throw;}
        }
        public static async Task<T> AwaitOperation<T>(Windows.Foundation.IAsyncOperation<T> operation) {
            var info=(Windows.Foundation.IAsyncInfo)operation;var elapsed=Stopwatch.StartNew();
            try {while(info.Status==Windows.Foundation.AsyncStatus.Started && elapsed.ElapsedMilliseconds<5000)await Task.Delay(25);
                if(info.Status==Windows.Foundation.AsyncStatus.Started) {info.Cancel();throw new TimeoutException("Windows media operation timed out.");}
                return operation.GetResults();
            } finally {info.Close();}
        }
    }
}
