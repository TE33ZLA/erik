using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace VehicleMediaBridge {
    // Deliberately separate from the packet decoder: these are human button
    // observations, never sensor messages and never authenticated source data.
    public sealed class ButtonTrial {
        public readonly string[] Expected;
        public int Position, Wrong, Late, Total;
        public bool Closed;
        long last=-10000;
        public ButtonTrial(string[] expected) {Expected=expected;}
        public bool Complete {get{return Position==Expected.Length;}}
        public bool Clean {get{return Complete && Wrong==0 && Late==0;}}
        public string Feed(string button,long ms) {
            if(Closed)return "outside_trial";
            Total++;
            if(Complete){Late++;return "extra_event";}
            if(ms-last<600){Wrong++;last=ms;return "too_fast_or_repeat";}
            last=ms;
            if(button!=Expected[Position]){Wrong++;return "unexpected_button";}
            Position++;return "matched_prompt";
        }
        public static List<string> Tests() {
            var passed=new List<string>();Action<bool,string> check=(ok,name)=>{if(!ok)throw new Exception(name);passed.Add(name);};
            var t=new ButtonTrial(new[]{"Next","Previous"});t.Feed("Next",0);t.Feed("Previous",1000);check(t.Clean,"Prompted sequence completes");
            t.Feed("Next",2000);check(!t.Clean && t.Late==1,"Extra event downgrades clean result");
            t=new ButtonTrial(new[]{"Next","Previous"});t.Feed("Pause",0);t.Feed("Next",1000);t.Feed("Previous",2000);check(t.Complete&&!t.Clean,"Unexpected event retained as contamination");
            t=new ButtonTrial(new[]{"Next","Next"});t.Feed("Next",0);t.Feed("Next",50);check(!t.Complete && t.Wrong==1,"Held-button repeat does not advance prompt");
            t.Closed=true;t.Feed("Next",2000);check(t.Position==1,"Late callbacks cannot finish a closed trial");
            t=new ButtonTrial(new[]{"Previous"});check(!t.Clean,"No events cannot pass");return passed;
        }
    }
    public sealed class GuidedVisitWindow : Form {
        readonly Journal journal=new Journal();
        readonly Stopwatch clock=Stopwatch.StartNew();
        readonly JavaScriptSerializer json=new JavaScriptSerializer();
        readonly Label step=new Label(), instruction=new Label(), bt=new Label(), timing=new Label();
        readonly Button home=new Button(), begin=new Button(), yes=new Button(), skip=new Button(), stop=new Button(), tone=new Button();
        readonly CheckBox parked=new CheckBox();
        readonly ComboBox outputs=new ComboBox();
        readonly TextBox log=new TextBox();
        readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
        readonly List<Process> children=new List<Process>();
        readonly List<object> comparisonWindows=new List<object>();
        Windows.Devices.Enumeration.DeviceInformation[] audioDevices;
        MediaReceiver receiver;
        ButtonTrial trial;
        string python, titleOne, titleTwo, workerScript;
        bool ready, visiting, closing, cancelled, serialStarted, serialDone, rehearsalMode, toneTried;
        int stage, generation, windowButtons, quietContamination, completeWindows, activeWindowsWithEvents;
        long phaseStart, stageMs, promptMs, actionsAfter, comparisonStart, timeOffset;
        DateTime windowUtc;
        string audioRoute="not_checked", discoveryOutcome="not_requested", serialOutcome="not_requested", serialEnd="not_tested", finishReason="not_finished";
        object firstTitle="not_tested", secondTitle="not_tested";
        Func<string,string,int,bool,Task<Dictionary<string,object>>> workerFixture;
        Task serialTask;
        long Now {get{return clock.ElapsedMilliseconds+timeOffset;}}
        const int MediaLimitMs=240000, SerialLimitMs=110000;
        static readonly int ClickGuardMs=Math.Max(1000,SystemInformation.DoubleClickTime+100);

        public GuidedVisitWindow() {
            Text="Golf connection test â€” reviewed revision";ClientSize=new Size(1030,830);MinimumSize=new Size(1010,850);
            BackColor=Color.FromArgb(241,245,249);Font=new Font("Segoe UI",11);
            var layout=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(24),ColumnCount=1,RowCount=11};Controls.Add(layout);
            foreach(int height in new[]{50,58,84,50,44,125,46,48,42,0,28})layout.RowStyles.Add(height==0?new RowStyle(SizeType.Percent,100):new RowStyle(SizeType.Absolute,height));
            layout.Controls.Add(new Label{Text="Check the media connection first",Dock=DockStyle.Fill,Font=new Font("Segoe UI",23,FontStyle.Bold)});
            layout.Controls.Add(new Label{Text="This tests sound, song titles and buttons. Engine-data access is still unresolved.\nThe USB cable is not part of this visit: no supported laptop-to-radio data setup exists.",Dock=DockStyle.Fill,BackColor=Color.FromArgb(254,249,195),Padding=new Padding(10)});
            var cards=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,Padding=new Padding(0,8,0,8)};
            for(int i=0;i<3;i++)cards.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,33.33f));
            bt.Text="BLUETOOTH\nNot checked in this session";
            foreach(var l in new[]{bt,new Label{Text="ORDER\nMedia first; serial is optional"},new Label{Text="VEHICLE DATA\nNo verified reading or radio helper"}}){l.Dock=DockStyle.Fill;l.BackColor=Color.White;l.Padding=new Padding(9);l.Margin=new Padding(0,0,8,0);cards.Controls.Add(l);}layout.Controls.Add(cards);
            var row=new FlowLayoutPanel{Dock=DockStyle.Fill};home.Text="1. Check laptop";begin.Text="2. Begin media test";stop.Text="Stop and save";
            foreach(var b in new[]{home,begin,stop}){b.AutoSize=true;b.Padding=new Padding(8,5,8,5);row.Controls.Add(b);}begin.Enabled=false;stop.Enabled=false;layout.Controls.Add(row);
            parked.Text="Parked, radio on, this laptop paired to the Golf. No USB cable needed.";parked.Dock=DockStyle.Fill;layout.Controls.Add(parked);
            var content=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=2};content.RowStyles.Add(new RowStyle(SizeType.Absolute,38));content.RowStyles.Add(new RowStyle(SizeType.Percent,100));
            step.Text="Start at home: check the laptop";step.Font=new Font("Segoe UI",17,FontStyle.Bold);step.Dock=DockStyle.Fill;content.Controls.Add(step);
            instruction.Text="Check software, Windows media support and the saved Golf pairing.\nAt the car, the app will first ask you to select an output and verify sound.";instruction.Dock=DockStyle.Fill;content.Controls.Add(instruction);layout.Controls.Add(content);
            var audioRow=new FlowLayoutPanel{Dock=DockStyle.Fill};outputs.Width=575;outputs.DropDownStyle=ComboBoxStyle.DropDownList;tone.Text="Play quiet test tone";tone.AutoSize=true;outputs.Visible=false;tone.Visible=false;audioRow.Controls.Add(outputs);audioRow.Controls.Add(tone);layout.Controls.Add(audioRow);
            var actions=new FlowLayoutPanel{Dock=DockStyle.Fill};foreach(var b in new[]{yes,skip}){b.AutoSize=true;b.Padding=new Padding(8,4,8,4);b.Visible=false;actions.Controls.Add(b);}layout.Controls.Add(actions);
            timing.Dock=DockStyle.Fill;timing.Text="Media check: up to 4 minutes. Optional serial comparison: up to 110 seconds.";layout.Controls.Add(timing);
            log.Dock=DockStyle.Fill;log.Multiline=true;log.ReadOnly=true;log.ScrollBars=ScrollBars.Vertical;log.Font=new Font("Consolas",9);layout.Controls.Add(log);
            var folder=new LinkLabel{Text="Open this session's evidence folder",Dock=DockStyle.Fill};folder.LinkClicked+=(s,e)=>Process.Start("explorer.exe",journal.DirectoryPath);layout.Controls.Add(folder);
            home.Click+=async(s,e)=>await Home();begin.Click+=async(s,e)=>await Begin();stop.Click+=(s,e)=>Finish("owner_stopped");
            yes.Click+=async(s,e)=>await Answer(true);skip.Click+=async(s,e)=>await Answer(false);tone.Click+=async(s,e)=>await TestOutput();
            outputs.SelectedIndexChanged+=(s,e)=>{toneTried=false;yes.Enabled=false;};
            timer.Interval=100;timer.Tick+=(s,e)=>Tick();timer.Start();
            FormClosing+=(s,e)=>{closing=true;if(visiting)Finish("window_closed");cancelled=true;KillWorkers();timer.Stop();};
            journal.Write("guided_visit_opened",new{revision="review-fixes",vehicle_reading_verified=false});
        }
        void Line(string text){if(!closing)log.AppendText(DateTime.Now.ToString("HH:mm:ss")+"  "+text+Environment.NewLine);}
        void Ui(Action action){if(closing||IsDisposed)return;if(InvokeRequired){try{BeginInvoke(action);}catch(InvalidOperationException){}}else action();}
        static string Quote(string x){return "\""+x.Replace("\"", "")+"\"";}
        static string Field(Dictionary<string,object> d,string key){return d!=null&&d.ContainsKey(key)?Convert.ToString(d[key]):"";}
        string PathIn(string name){return Path.Combine(journal.DirectoryPath,name);}
        Dictionary<string,object> Read(string file){return json.Deserialize<Dictionary<string,object>>(File.ReadAllText(PathIn(file)));}
        bool Current(int own){return visiting&&!closing&&generation==own;}
        void KillWorkers(){foreach(var p in children.ToArray()){try{if(!p.HasExited)p.Kill();}catch(InvalidOperationException){}}}
        void CheckManifest(){string root=AppDomain.CurrentDomain.BaseDirectory;var entries=json.Deserialize<Dictionary<string,string>>(File.ReadAllText(Path.Combine(root,"kit-manifest.json")));foreach(var e in entries){string path=Path.GetFullPath(Path.Combine(root,e.Key));if(!path.StartsWith(root,StringComparison.OrdinalIgnoreCase)||ExecutionEvidence.Hash(path)!=e.Value)throw new IOException("Kit file changed: "+e.Key+". Rebuild and validate before the visit.");}}
        async Task<Dictionary<string,object>> Worker(string mode,string file,int seconds,bool live) {
            if(workerFixture!=null){var fixture=await workerFixture(mode,file,seconds,live);fixture["evidence_source"]="internal-simulated-transport";journal.Save(file,fixture);return fixture;}
            string output=PathIn(file);var p=new Process{StartInfo=new ProcessStartInfo(python,"-B "+Quote(workerScript??Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"transport","visit_worker.py"))+" "+mode+" --out "+Quote(output)+(live?" --run":"")){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=AppDomain.CurrentDomain.BaseDirectory}};
            var elapsed=Stopwatch.StartNew();children.Add(p);
            try {
                p.Start();while(!p.HasExited&&!cancelled&&!closing&&elapsed.Elapsed.TotalSeconds<seconds)await Task.Delay(50);
                bool interrupted=cancelled||closing;bool expired=!p.HasExited&&!interrupted;
                if(!p.HasExited){p.Kill();await Task.Run(()=>p.WaitForExit(3000));}
                // Stop may already have killed the process. Check cancellation
                // even when HasExited is true; never replace it with IO failure.
                if(interrupted||expired){var terminal=new Dictionary<string,object>{{"outcome",interrupted?"cancelled":"deadline_inconclusive"},{"mode",mode},{"vehicle_reading_verified",false}};if(File.Exists(output))journal.Save(file+".termination.json",terminal);else journal.Save(file,terminal);return terminal;}
                if(!File.Exists(output))throw new IOException("Worker ended without its evidence file");return Read(file);
            }catch(Exception ex){var error=new Dictionary<string,object>{{"outcome",cancelled||closing?"cancelled":"local_worker_error"},{"error",ex.Message},{"vehicle_reading_verified",false}};if(File.Exists(output))journal.Save(file+".termination.json",error);else journal.Save(file,error);return error;}
            finally{children.Remove(p);p.Dispose();}
        }
        async Task Home() {
            home.Enabled=false;begin.Enabled=false;ready=false;cancelled=false;step.Text="Checking this laptopâ€¦";instruction.Text="Checking software, Windows media support and cached pairing. No serial connection.";
            try {
                python=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),".cache","codex-runtimes","codex-primary-runtime","dependencies","python","python.exe");string file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"runtime-path.txt");if(File.Exists(file))python=File.ReadAllText(file).Trim();if(!File.Exists(python))throw new FileNotFoundException("Prepared Python runtime missing");
                CheckManifest();var tests=ProtocolTests.Run();tests.AddRange(ButtonTrial.Tests());using(var r=new MediaReceiver()){r.Start(0,false);if(!rehearsalMode){var devices=await Program.AwaitOperation(Windows.Devices.Enumeration.DeviceInformation.FindAllAsync(Windows.Media.Devices.MediaDevice.GetAudioRenderSelector()));audioDevices=devices.ToArray();if(audioDevices.Length==0)throw new InvalidOperationException("No Windows audio output available");r.SelectOutput(audioDevices[0]);journal.Save("audio-outputs-local.json",new{names=audioDevices.Select(d=>d.Name).ToArray(),local_output_assignment_checked=true,sound_played=false,car_contact_requested=false});}}
                var local=await Worker("preflight","local-preflight.json",15,false);ready=Field(local,"outcome")=="local_ready";
                journal.Save("home-check.json",new{passed=ready,test_groups=tests,windows_session_created=true,car_contact_requested=false,vehicle_reading_verified=false});
                bt.Text="BLUETOOTH\n"+(ready?"Saved Golf pairing found; no live proof":"Local check needs attention");step.Text=ready?"Laptop checks passed":"Fix the local check first";
                instruction.Text=ready?"At the car, select this laptop as the Bluetooth music source and pause other media apps.\nThe first step verifies audio routing. No USB cable or serial test runs automatically.":Field(local,"error");
            }catch(Exception ex){step.Text="Laptop check failed";instruction.Text=ex.Message;journal.Write("home_check_failure",ex.ToString());}
            finally{if(!closing){home.Enabled=true;begin.Enabled=ready;}}
        }
        async Task Begin() {
            if(!ready||visiting)return;if(!parked.Checked){instruction.Text="Confirm the parked/radio/pairing line above before starting.";return;}
            visiting=true;cancelled=false;generation++;int own=generation;phaseStart=Now;home.Enabled=false;begin.Enabled=false;parked.Enabled=false;stop.Enabled=true;stage=0;
            step.Text="Checking saved pairing";instruction.Text="No serial connection will open during the media baseline.";
            var local=await Worker("preflight","visit-pairing.json",15,false);if(!Current(own))return;if(Field(local,"outcome")!="local_ready"){Finish("pairing_check_failed");return;}
            byte[] random=new byte[12];using(var rng=RandomNumberGenerator.Create())rng.GetBytes(random);titleOne="Golf check 1 "+BitConverter.ToUInt16(random,0).ToString("X4");titleTwo="Golf check 2 "+BitConverter.ToUInt16(random,2).ToString("X4");
            var order=new[]{"Next","Previous","Next","Previous","Next","Previous"};for(int i=5;i>0;i--){int j=random[4+i]%(i+1);string value=order[i];order[i]=order[j];order[j]=value;}trial=new ButtonTrial(order);
            try {
                receiver=new MediaReceiver();var current=receiver;
                receiver.Button+=button=>Ui(()=>{if(Current(own)&&Object.ReferenceEquals(receiver,current))OnButton(button,rehearsalMode?"local-windows-api-event":"windows-device-unattributed");});
                receiver.Error+=message=>Ui(()=>{if(Current(own)){journal.Write("media_error",message);Finish(audioRoute=="owner_heard_car"?"media_session_error":"audio_setup_unverified");}});
                receiver.Start(BitConverter.ToUInt32(random,0),true);receiver.SetTitle(titleOne);
                if(!rehearsalMode){var collection=await Program.AwaitOperation(Windows.Devices.Enumeration.DeviceInformation.FindAllAsync(Windows.Media.Devices.MediaDevice.GetAudioRenderSelector()));if(!Current(own))return;audioDevices=collection.ToArray();outputs.Items.Clear();foreach(var device in audioDevices)outputs.Items.Add(device.Name);outputs.SelectedIndex=-1;journal.Save("audio-outputs.json",new{source="Windows audio endpoint enumeration",names=audioDevices.Select(d=>d.Name).ToArray()});}
                StartStage(4);
            }catch(Exception ex){journal.Write("audio_setup_error",ex.ToString());Finish("audio_setup_unverified");}
        }
        async Task TestOutput(){if(!visiting||stage!=4||Now<actionsAfter||outputs.SelectedIndex<0)return;int own=generation;tone.Enabled=false;toneTried=false;yes.Enabled=false;try{var selected=audioDevices[outputs.SelectedIndex];receiver.SelectOutput(selected);audioRoute="selected_not_owner_verified";journal.Write("audio_output_selected",new{name=selected.Name,id_hash=HashText(selected.Id)});await receiver.TestTone();if(Current(own)&&stage==4){toneTried=true;instruction.Text="Did that tone come from the CAR speakers?\nIf it came from the laptop or you heard nothing, change the output and try again.\nAn unverified route stops the test; it is not recorded as a car failure.";}}catch(Exception ex){journal.Write("audio_output_error",ex.Message);}finally{if(Current(own))tone.Enabled=true;}}
        static string HashText(string value){using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(value))).Replace("-","").ToLowerInvariant();}
        void CloseComparisonWindow(){if(stage<8||stage>11)return;bool active=stage==8||stage==10;long duration=Now-comparisonStart;if(!active)quietContamination+=windowButtons;if(duration>=10000){completeWindows++;if(active&&windowButtons>0)activeWindowsWithEvents++;}comparisonWindows.Add(new{phase=stage,active=active,started_utc=windowUtc.ToString("o"),ended_utc=DateTime.UtcNow.ToString("o"),duration_ms=duration,media_events=windowButtons,complete=duration>=10000});journal.Save("comparison-windows.json",new{windows=comparisonWindows.ToArray(),source=rehearsalMode?"internal-simulated-timing":"live-visit-observations",comparison_is_correlation_only=true});}
        void StartStage(int next) {
            if(!visiting)return;CloseComparisonWindow();stage=next;stageMs=Now;actionsAfter=Now+ClickGuardMs;yes.Visible=true;skip.Visible=true;yes.Enabled=false;skip.Enabled=false;outputs.Visible=next==4;tone.Visible=next==4;
            if(next==4){step.Text="First: verify sound reaches the car";instruction.Text="Select the car's audio output below, then play the quiet test tone.\nOnly confirm if you hear it from the car. The app sets its own output explicitly.\nNo selected output or no sound means setup is unverified.";yes.Text="I heard it from the car";skip.Text="Cannot verify sound â€” finish";}
            else if(next==1||next==3){if(next==3){trial.Closed=true;try{receiver.SetTitle(titleTwo);}catch(Exception ex){journal.Write("title_error",ex.Message);Finish("metadata_update_failed");return;}}step.Text=next==1?"Check the first song title":"Check the updated song title";instruction.Text="Does the car show this exact song title?\n"+(next==1?titleOne:titleTwo)+"\nThis is an owner observation, not vehicle-sensor data.";yes.Text="Exact title visible";skip.Text="Missing / cannot check";}
            else if(next==2){promptMs=Now;yes.Visible=false;skip.Text="Skip remaining buttons";ShowPrompt();}
            else if(next==5){journal.Save("media-baseline.json",Summary("media_baseline_finished"));step.Text="Media results saved";instruction.Text="You can finish now. An optional serial comparison adds up to 110 seconds.\nIt compares buttons with quiet periods; earlier connections were silent and sometimes closed.\nIt is unlikely to reveal engine data and is not needed to finish the media test.";yes.Text="Run optional serial comparison";skip.Text="Finish and save";}
            else{yes.Visible=false;skip.Visible=false;if(next==7){step.Text="Optional serial: waiting for connection";instruction.Text="Fresh service discovery has completed. Waiting for the receiver to report open.\nButton windows will start only after that; early closure makes the comparison incomplete.";}
                else if(next>=8&&next<=11){comparisonStart=Now;windowUtc=DateTime.UtcNow;windowButtons=0;bool active=next==8||next==10;step.Text=active?"10 seconds: use the car's media buttons":"10 seconds: quiet comparison";instruction.Text=active?"Press NEXT and PREVIOUS at a comfortable pace during this window.\nThere is no encoded-data target. We are comparing incoming serial traffic with button timings.":"Do not press media buttons on the car, laptop or another remote.\nThe app is recording an equal-length quiet period.";journal.Write("comparison_window_started",new{phase=next,active=active,monotonic_ms=Now});}
                else if(next==12){step.Text="Comparison windows saved";instruction.Text="Waiting briefly for the receive-only window to finish. Stop still saves partial evidence.";}}
            journal.Write("stage_started",new{stage=stage,monotonic_ms=Now});
        }
        void ShowPrompt(){step.Text="Button "+(trial.Position+1)+" of "+trial.Expected.Length;instruction.Text="Press the car's "+trial.Expected[trial.Position].ToUpperInvariant()+" button once, then wait for the next prompt.\nEach prompt allows 10 seconds; this sequence allows up to 60 seconds in total.\nAvoid laptop media keys and other remotes. Windows does not identify the sender.";}
        void OnButton(string button,string source){string outcome=stage==2?trial.Feed(button,Now):"outside_prompted_trial";if(stage>=8&&stage<=11)windowButtons++;journal.Write("media_event",new{button=button,stage=stage,outcome=outcome,monotonic_ms=Now,source=source});Line("Button: "+button+" â€” "+outcome);if(stage==2){if(outcome=="matched_prompt")promptMs=Now;if(trial.Complete)StartStage(3);else ShowPrompt();}}
        async Task Answer(bool accepted){if(!visiting||Now<actionsAfter)return;
            if(stage==4){if(!accepted){Finish("audio_setup_unverified");return;}if(!toneTried)return;audioRoute="owner_heard_car";journal.Write("owner_audio_route_confirmed",new{simulated=rehearsalMode});StartStage(1);}
            else if(stage==1){firstTitle=accepted;StartStage(2);}
            else if(stage==2){trial.Closed=true;StartStage(3);}
            else if(stage==3){secondTitle=accepted;StartStage(5);}
            else if(stage==5){if(accepted)await StartSerial();else Finish("media_visit_completed");}
        }
        async Task StartSerial(){int own=generation;phaseStart=Now;stage=6;serialStarted=false;serialDone=false;discoveryOutcome="running";serialOutcome="not_attempted";yes.Visible=false;skip.Visible=false;step.Text="Optional serial: checking services";instruction.Text="One fresh query, limited to 25 seconds. The media baseline is already saved.";
            var services=await Worker("sdp","private-services.json",25,true);if(!Current(own))return;discoveryOutcome=Field(services,"outcome");if(discoveryOutcome!="discovery_complete"){serialOutcome="not_attempted_discovery_failed";Finish("discovery_failed");return;}
            serialStarted=true;serialOutcome="running";StartStage(7);serialTask=Serial(own);
        }
        async Task Serial(int own){try{var result=await Worker("serial","private-serial.json",65,true);if(!Current(own))return;serialOutcome=Field(result,"outcome");serialEnd=Field(result,"end_reason");}catch(Exception ex){serialOutcome="local_error";journal.Write("serial_error",ex.Message);}finally{if(Current(own)){serialDone=true;Finish(comparisonWindows.Count==4?"optional_comparison_finished":"serial_ended_before_comparison_completed");}}}
        void Tick(){if(!visiting)return;bool optional=stage>=6;int cap=optional?SerialLimitMs:MediaLimitMs;long elapsed=Now-phaseStart;timing.Text=(optional?"Optional comparison: ":"Media check: ")+(elapsed/1000)+" / "+(cap/1000)+" seconds.";
            if(elapsed>=cap){Finish("phase_deadline_inconclusive");return;}
            if(Now>=actionsAfter){yes.Enabled=stage!=4||toneTried;skip.Enabled=true;}
            if(stage==7&&File.Exists(PathIn("serial-status.json"))&&!serialDone){StartStage(8);return;}
            if(stage>=8&&stage<=11){timing.Text+="  Window: "+Math.Max(0,10-(Now-comparisonStart)/1000)+" seconds left.";if(Now-comparisonStart>=10000)StartStage(stage+1);return;}
            if(stage==2){timing.Text+="  This button: "+Math.Max(0,10-(Now-promptMs)/1000)+" seconds left.";if(Now-promptMs>=10000||Now-stageMs>=60000){journal.Write("button_timeout",new{completed=trial.Position});trial.Closed=true;StartStage(3);}return;}
            int limit=stage==4?45000:stage==1||stage==3?30000:stage==5?20000:0;
            if(limit>0&&Now-stageMs>=limit){journal.Write("stage_timeout",new{stage=stage});if(stage==4)Finish("audio_setup_unverified");else if(stage==1){firstTitle="timed_out";StartStage(2);}else if(stage==3){secondTitle="timed_out";StartStage(5);}else Finish("media_visit_completed");}
        }
        object Summary(string reason){return new{reason=reason,evidence_source=rehearsalMode?"internal-rehearsal":"live-visit-observations",owner_observations_simulated=rehearsalMode,audio_route=audioRoute,media_assessment=audioRoute=="owner_heard_car"?"owner_correlated_observations_only":"not_tested_setup_unverified",first_title_owner_report=firstTitle,second_title_owner_report=secondTitle,button_prompts_total=trial==null?0:trial.Expected.Length,button_prompts_completed=trial==null?0:trial.Position,button_wrong_or_repeat=trial==null?0:trial.Wrong,button_trial_complete=trial!=null&&trial.Complete,source_attribution="Windows events have no device identity",discovery=discoveryOutcome,serial=serialOutcome,serial_end_reason=serialEnd,comparison_assessment=completeWindows==4&&activeWindowsWithEvents==2&&quietContamination==0?"complete_windows_correlation_only":serialStarted?"incomplete_or_contaminated":"not_attempted",comparison_windows=comparisonWindows.ToArray(),quiet_period_media_events=quietContamination,usb="removed_no_supported_setup",vehicle_reading_verified=false,radio_helper_available=false,usb_installation_available=false,iphone_tested=false};}
        void Finish(string reason){if(!visiting)return;CloseComparisonWindow();visiting=false;cancelled=true;finishReason=reason;generation++;KillWorkers();if(receiver!=null){receiver.Dispose();receiver=null;}if(trial!=null)trial.Closed=true;
            if(serialStarted&&!serialDone)serialOutcome="cancelled_partial_evidence_retained";else if(discoveryOutcome=="running"){discoveryOutcome="cancelled";serialOutcome="not_attempted";}
            journal.Save("visit-summary.json",Summary(reason));File.WriteAllText(PathIn("READ THIS.txt"),"Golf media experiment\r\nReason: "+reason+"\r\nAudio route: "+audioRoute+"\r\nDiscovery: "+discoveryOutcome+"\r\nSerial: "+serialOutcome+"\r\nNo verified vehicle reading. USB is not a supported route in this kit.\r\n");
            yes.Visible=false;skip.Visible=false;outputs.Visible=false;tone.Visible=false;stop.Enabled=false;step.Text="Results saved â€” test finished";instruction.Text="Media prompts: "+(trial==null?0:trial.Position)+" / "+(trial==null?0:trial.Expected.Length)+". Audio: "+audioRoute+".\nDiscovery: "+discoveryOutcome+". Serial: "+serialOutcome+".\nEngine readings remain unavailable. You can switch the car off.";timing.Text="Close and reopen for a separate visit.";Line("Finished: "+reason);}
        public void Preview(string path){ShowInTaskbar=false;StartPosition=FormStartPosition.Manual;Location=new Point(-20000,-20000);Show();Application.DoEvents();SavePreview(path);Close();}
        void SavePreview(string path){using(var bmp=new Bitmap(Width,Height)){DrawToBitmap(bmp,new Rectangle(0,0,Width,Height));bmp.Save(path);}}
        public async Task Prepare(){await Home();if(!ready)throw new Exception("Actual local preflight failed: "+journal.DirectoryPath);journal.Save("guided-preflight.json",new{passed=true,source="actual-local-Windows-and-cached-pairing",car_contact_requested=false,vehicle_reading_verified=false});Console.WriteLine("Actual local preflight passed. "+journal.DirectoryPath);SavePreview(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"guided-ready.png"));}
        async Task GuardedAnswer(bool value){timeOffset+=ClickGuardMs+1;Tick();await Answer(value);}
        void Require(bool condition,string message){if(!condition)throw new Exception(message);}
        public async Task Rehearse(string scenario){rehearsalMode=true;var pending=new TaskCompletionSource<Dictionary<string,object>>();int serialCalls=0;
            workerFixture=async(mode,file,seconds,live)=>{await Task.Delay(1);if(mode=="preflight")return new Dictionary<string,object>{{"outcome","local_ready"}};if(mode=="sdp"){if(scenario=="cancel")return await pending.Task;return new Dictionary<string,object>{{"outcome",scenario=="discovery-failure"?"deadline_inconclusive":"discovery_complete"}};}serialCalls++;journal.Save("serial-status.json",new{connected=true,source="internal-simulated-transport"});return await pending.Task;};
            journal.Write("test_provenance",new{scenario=scenario,source="internal-rehearsal",owner_observations_simulated=true,car_contact=false});await Home();Require(ready,"Rehearsal preflight failed");
            if(scenario=="deadline"||scenario=="worker-cancel"){workerFixture=null;workerScript=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"transport","test_deadline_fixture.py");Task<Dictionary<string,object>> work=Worker("preflight","worker-test.json",scenario=="deadline"?1:10,false);if(scenario=="worker-cancel"){await Task.Delay(100);cancelled=true;KillWorkers();}var result=await work;Require(Field(result,"outcome")== (scenario=="deadline"?"deadline_inconclusive":"cancelled")&&children.Count==0,"Worker terminal state/cleanup wrong");SaveRehearsal(scenario);return;}
            parked.Checked=true;await Begin();Require(stage==4,"Media must begin before any discovery or serial");Require(serialCalls==0,"Unexpected early serial contact");
            if(scenario=="audio-unverified"){await GuardedAnswer(false);Require(!visiting&&firstTitle.Equals("not_tested")&&audioRoute!="owner_heard_car","Unverified route reached car assessment");SaveRehearsal(scenario);return;}
            toneTried=true;await GuardedAnswer(true);await GuardedAnswer(scenario!="double-click");Require(stage==2,"Button stage missing");
            if(scenario=="double-click"){await Answer(false);Require(stage==2&&!trial.Closed,"Double tap skipped button trial");Finish("rehearsal_completed");SaveRehearsal(scenario);return;}
            if(scenario=="windows-guided"){
                var manager=await Program.AwaitOperation(Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager.RequestAsync());Windows.Media.Control.GlobalSystemMediaTransportControlsSession mine=null;for(int i=0;i<20&&mine==null;i++){await Task.Delay(100);mine=manager.GetSessions().SingleOrDefault(s=>s.SourceAppUserModelId=="VehicleMediaBridge.Lab");}Require(mine!=null,"Own Windows media session not found");
                for(int i=0;i<trial.Expected.Length;i++){bool accepted=await Program.AwaitOperation(trial.Expected[i]=="Next"?mine.TrySkipNextAsync():mine.TrySkipPreviousAsync());Require(accepted,"Windows rejected own-session button");for(int wait=0;wait<30&&trial.Position<=i;wait++)await Task.Delay(50);Require(trial.Position==i+1,"Windows callback did not reach guided trial");await Task.Delay(700);}
            }else for(int i=0;i<trial.Expected.Length;i++){timeOffset+=scenario=="slow-human"?9000:5000;Tick();Require(stage==2,"Human-paced prompt timed out prematurely");OnButton(trial.Expected[i],"internal-simulated-event");}
            Require(trial.Complete&&stage==3,"Media sequence incomplete");await GuardedAnswer(true);Require(stage==5&&File.Exists(PathIn("media-baseline.json")),"Media baseline not saved before optional serial");
            if(scenario=="slow-human"||scenario=="windows-guided"){await GuardedAnswer(false);Require(serialCalls==0,"Media-only visit touched serial");SaveRehearsal(scenario);return;}
            timeOffset+=ClickGuardMs+1;Task optional=Answer(true);
            if(scenario=="cancel"){await Task.Delay(20);Finish("owner_stopped");pending.SetResult(new Dictionary<string,object>{{"outcome","discovery_complete"}});await optional;Require(serialCalls==0,"Stale discovery continued after cancellation");SaveRehearsal(scenario);return;}
            await optional;
            if(scenario=="discovery-failure"){Require(!visiting&&serialCalls==0&&serialOutcome=="not_attempted_discovery_failed"&&discoveryOutcome=="deadline_inconclusive","Discovery incorrectly recorded as serial attempt");SaveRehearsal(scenario);return;}
            while(!File.Exists(PathIn("serial-status.json")))await Task.Delay(10);Tick();Require(stage==8,"Active window did not start on open listener");
            if(scenario=="serial-early-close"){pending.SetResult(new Dictionary<string,object>{{"outcome","connected_silent_inconclusive"},{"end_reason","remote_closed"}});await serialTask;Require(!visiting&&comparisonWindows.Count<4&&finishReason=="serial_ended_before_comparison_completed","Early closure falsely completed comparison");SaveRehearsal(scenario);return;}
            if(scenario=="visit-timeout"){timeOffset+=SerialLimitMs;Tick();pending.SetResult(new Dictionary<string,object>{{"outcome","cancelled"}});await serialTask;Require(!visiting&&receiver==null&&finishReason=="phase_deadline_inconclusive","Phase deadline failed");SaveRehearsal(scenario);return;}
            for(int i=0;i<4;i++){if(i%2==0)OnButton("Next","internal-simulated-event");timeOffset+=10001;Tick();}
            Require(stage==12&&comparisonWindows.Count==4,"Matched comparison windows missing");pending.SetResult(new Dictionary<string,object>{{"outcome","connected_silent_inconclusive"},{"end_reason","receive_deadline"}});await serialTask;Require(!visiting&&receiver==null&&quietContamination==0,"Comparison cleanup failed");SaveRehearsal(scenario);
        }
        void SaveRehearsal(string scenario){journal.Save("guided-rehearsal.json",new{passed=true,scenario=scenario,source=scenario=="windows-guided"?"actual-Windows-controls-to-guided-callback-with-fixture-pairing":"internal-simulated-transport",car_contact=false,vehicle_reading_verified=false,owner_observations_simulated=true});Console.WriteLine("Guided rehearsal passed: "+scenario+". "+journal.DirectoryPath);}
    }
}
