/* ===================== Firebase Config ===================== */
/* ใส่ค่าจริงของคุณไว้ตรงนี้ (คุณเจไดให้ค่ามาแล้ว ผมใส่ให้เรียบร้อย) */
const firebaseConfig = {
  apiKey: "AIzaSyAXxwOVK_2MDOY48mCH5ihzC_qQ0BX2ijo",
  authDomain: "form-link-project.firebaseapp.com",
  databaseURL: "https://form-link-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "form-link-project",
  storageBucket: "form-link-project.appspot.com",
  messagingSenderId: "363673337711",
  appId: "1:363673337711:web:f804404761e85bb3a6f29a"
};
/* =========================================================== */

const app = firebase.initializeApp(firebaseConfig);
const db  = firebase.database();

const DB_PATH = "/links";
const KEYS = { selecx: "selecxUrl", form: "formUrl" };

const defaultLinks = {
  selecx: "https://selecx.si.mahidol.ac.th/login/index.php",
  form:   "https://forms.gle/XXXXXXXXXXXXXX"
};

const CACHE = { selecx: "simset_link_selecx_cache", form: "simset_link_gform_cache" };

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const statusBox = $("#status");
const saveStatus = $("#saveStatus");
const toast = $("#toast");

function logStatus(el, msg, type="inf"){
  el.classList.remove("msg-ok","msg-warn","msg-inf");
  if(type==="ok") el.classList.add("msg-ok");
  if(type==="warn") el.classList.add("msg-warn");
  if(type==="inf") el.classList.add("msg-inf");
  el.textContent = msg;
}
function showToast(text="✅ ลิงก์ถูกบันทึกแล้ว"){
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 1800);
}
function flash(el){ el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
function isValidURL(str){ try{ const u=new URL(str); return /^https?:$/.test(u.protocol); }catch{ return false; } }

let currentLinks = { selecx: defaultLinks.selecx, form: defaultLinks.form };

function applyLinksToUI(links, {flashInputs=false}={}){
  currentLinks = links;
  const inpSelecx = $("#selecx");
  const inpGform  = $("#gform");
  if(inpSelecx && !document.activeElement.isSameNode(inpSelecx)) { inpSelecx.value = links.selecx; if(flashInputs) flash(inpSelecx); }
  if(inpGform  && !document.activeElement.isSameNode(inpGform))  { inpGform.value  = links.form;   if(flashInputs) flash(inpGform); }
}
function cacheLinks(links){
  localStorage.setItem(CACHE.selecx, links.selecx);
  localStorage.setItem(CACHE.form,   links.form);
}

/* -------- hydrate from cache -------- */
(function(){
  const cSelecx = localStorage.getItem(CACHE.selecx) || defaultLinks.selecx;
  const cForm   = localStorage.getItem(CACHE.form)   || defaultLinks.form;
  applyLinksToUI({ selecx: cSelecx, form: cForm });
})();

/* -------- realtime subscribe -------- */
db.ref(DB_PATH).on("value", (snap)=>{
  const val = snap.val() || {};
  const selecx = typeof val[KEYS.selecx] === "string" ? val[KEYS.selecx] : defaultLinks.selecx;
  const form   = typeof val[KEYS.form]   === "string" ? val[KEYS.form]   : defaultLinks.form;
  const links = {
    selecx: isValidURL(selecx) ? selecx : defaultLinks.selecx,
    form:   isValidURL(form)   ? form   : defaultLinks.form
  };
  applyLinksToUI(links, {flashInputs:true});
  cacheLinks(links);
  logStatus(statusBox, "ℹ️ ดึงค่าจากฐานข้อมูลเรียบร้อย", "inf");
}, (err)=>{
  logStatus(statusBox, "ℹ️ ใช้ค่าแคชชั่วคราว — ไม่สามารถอ่านจากฐานข้อมูล: " + err.message, "inf");
  const cSelecx = localStorage.getItem(CACHE.selecx) || defaultLinks.selecx;
  const cForm   = localStorage.getItem(CACHE.form)   || defaultLinks.form;
  applyLinksToUI({ selecx: cSelecx, form: cForm });
});

/* -------- OPEN two links -------- */
$("#openBtn").addEventListener("click", ()=>{
  const { selecx, form } = currentLinks;
  const errs = [];
  if(!isValidURL(selecx)) errs.push("ลิงก์ Selecx ไม่ถูกต้อง");
  if(!isValidURL(form))   errs.push("ลิงก์ Google Forms ไม่ถูกต้อง");
  if(errs.length){
    logStatus(statusBox, "ℹ️ " + errs.join(" • "), "inf");
    return;
  }

  logStatus(statusBox, "ℹ️ กำลังเปิดลิงก์…", "inf");
  const feat = "noopener,noreferrer";
  const w1 = window.open(selecx, "_blank", feat);
  const w2 = window.open(form,   "_blank", feat);

  const msgs = [];
  msgs.push(w1 && !w1.closed ? `✅ opened: ${selecx}` : `ℹ️ เบราว์เซอร์บล็อกการเปิดลิงก์อัตโนมัติ — กรุณาอนุญาต Pop-ups & Redirects`);
  msgs.push(w2 && !w2.closed ? `✅ opened: ${form}`   : `ℹ️ เบราว์เซอร์บล็อกการเปิดลิงก์อัตโนมัติ — กรุณาอนุญาต Pop-ups & Redirects`);

  const blocked = msgs.some(m => m.startsWith("ℹ️ เบราว์เซอร์บล็อก"));
  logStatus(statusBox, msgs.join("\n"), blocked ? "inf" : "ok");
  if(blocked){
    alert("ℹ️ เบราว์เซอร์บล็อกการเปิดลิงก์อัตโนมัติ\nกรุณา Allow Pop-ups & Redirects แล้วลองใหม่");
  }
});

/* -------- UPDATE (write to Firebase) -------- */
const formEl = $("#formLinks");
const saveBtn = $("#saveBtn");

/* fill inputs initially from currentLinks (after cache hydration) */
$("#selecx").value = currentLinks.selecx;
$("#gform").value  = currentLinks.form;

formEl.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const s = $("#selecx").value.trim();
  const g = $("#gform").value.trim();
  const errs = [];
  if(!isValidURL(s)) errs.push("กรุณาใส่ URL Selecx ที่ถูกต้อง");
  if(!isValidURL(g)) errs.push("กรุณาใส่ URL Google Forms ที่ถูกต้อง");
  if(errs.length){ logStatus(saveStatus, "ℹ️ " + errs.join(" • "), "inf"); return; }

  saveBtn.disabled = true;
  logStatus(saveStatus, "ℹ️ กำลังบันทึกขึ้น Firebase…", "inf");
  try{
    await db.ref(DB_PATH).update({
      [KEYS.selecx]: s,
      [KEYS.form]: g,
      updatedAt: Date.now()
    });
    cacheLinks({ selecx: s, form: g });
    logStatus(saveStatus, "ℹ️ อัปเดตสำเร็จ", "inf");
    showToast("✅ ลิงก์ถูกบันทึกแล้ว");
    flash($("#selecx")); flash($("#gform"));
  }catch(err){
    logStatus(saveStatus, "ℹ️ บันทึกไม่สำเร็จ: " + err.message, "inf");
  }finally{
    saveBtn.disabled = false;
  }
});

/* ---------------- QR modal + scanning ---------------- */
const qrModal=$("#qrModal"), qrVideo=$("#qrVideo"), qrInfo=$("#qrInfo");
const scanQRBtn=$("#scanQRBtn"), pickImageBtn=$("#pickImageBtn"), qrFile=$("#qrFile");
const startQR=$("#startQR"), stopQR=$("#stopQR"), closeQR=$("#closeQR");

let mediaStream=null, scanTimer=null, barcodeDetector=null, zxingReader=null, zxingLoaded=false;

const openQRModal = ()=>{ qrModal.classList.add("open"); qrInfo.textContent="กด ‘เริ่มสแกน’ เพื่อใช้กล้อง"; };
const closeQRModal = ()=>{ qrModal.classList.remove("open"); };

scanQRBtn.addEventListener("click", openQRModal);
closeQR.addEventListener("click", ()=>{ stopCamera(); closeQRModal(); });
stopQR.addEventListener("click", stopCamera);
startQR.addEventListener("click", startCameraScan);

pickImageBtn.addEventListener("click", ()=> qrFile.click());
qrFile.addEventListener("change", handleQRFile);

async function startCameraScan(){
  qrInfo.textContent="กำลังเปิดกล้อง…";
  try{
    if("BarcodeDetector" in window){
      barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    }else{
      if(!zxingLoaded){
        await loadScript("https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js");
        zxingLoaded = true;
      }
      zxingReader = new ZXing.BrowserMultiFormatReader();
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    qrVideo.srcObject = mediaStream;
    await qrVideo.play();
    if(barcodeDetector){ scanWithBarcodeDetector(); }
    else{ scanWithZXing(); }
  }catch(err){
    qrInfo.textContent = "ℹ️ ไม่สามารถเปิดกล้องได้: " + err.message;
  }
}
function stopCamera(){
  if(scanTimer){ cancelAnimationFrame(scanTimer); scanTimer=null; }
  if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream=null; }
  if(zxingReader){ try{ zxingReader.reset(); }catch{} }
  qrVideo.pause(); qrVideo.srcObject=null;
  qrInfo.textContent="หยุดสแกนแล้ว";
}
async function scanWithBarcodeDetector(){
  qrInfo.textContent="กำลังสแกน… เล็งกล้องไปที่ QR";
  const canvas=document.createElement("canvas");
  const ctx=canvas.getContext("2d");
  const loop = async () => {
    if(!mediaStream) return;
    canvas.width=qrVideo.videoWidth||640; canvas.height=qrVideo.videoHeight||480;
    ctx.drawImage(qrVideo,0,0,canvas.width,canvas.height);
    try{
      const barcodes = await barcodeDetector.detect(canvas);
      if(barcodes && barcodes.length){
        const raw = barcodes[0].rawValue?.trim();
        if(raw){ handleQRResult(raw); return; }
      }
    }catch(e){}
    scanTimer = requestAnimationFrame(loop);
  };
  loop();
}
async function scanWithZXing(){
  qrInfo.textContent="กำลังสแกน… เล็งกล้องไปที่ QR";
  try{
    await zxingReader.decodeFromVideoDevice(null, qrVideo, (result,err)=>{
      if(result && result.getText){ handleQRResult(result.getText().trim()); }
    });
  }catch(e){
    qrInfo.textContent="ℹ️ ZXing error: "+e.message;
  }
}
async function handleQRFile(e){
  const file = e.target.files?.[0]; if(!file) return;
  if(!zxingLoaded){ await loadScript("https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js"); zxingLoaded=true; }
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const img = new Image();
      img.onload = async ()=>{
        const canvas=document.createElement("canvas");
        canvas.width=img.width; canvas.height=img.height;
        canvas.getContext("2d").drawImage(img,0,0);
        const luminances = getLuminances(canvas);
        const hints = new ZXing.Map();
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        const bitmap = new ZXing.RGBLuminanceSource(luminances, canvas.width, canvas.height);
        const binBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(bitmap));
        const reader2 = new ZXing.MultiFormatReader();
        reader2.setHints(hints);
        const result = reader2.decode(binBitmap);
        if(result && result.getText) handleQRResult(result.getText().trim());
      };
      img.src = reader.result;
    }catch(err){
      alert("อ่าน QR จากรูปไม่สำเร็จ: "+err.message);
    }
  };
  reader.readAsDataURL(file);
  function getLuminances(cv){
    const ctx=cv.getContext("2d");
    const {data,width,height}=ctx.getImageData(0,0,cv.width,cv.height);
    const arr=new Int32Array(width*height);
    for(let i=0,j=0;i<arr.length;i++,j+=4){
      const r=data[j], g=data[j+1], b=data[j+2];
      arr[i]=(r+g+b)/3;
    }
    return arr;
  }
}
function handleQRResult(text){
  if(isValidURL(text)){
    $("#gform").value = text;
    qrInfo.textContent = "✅ พบ URL: " + text;
    stopCamera();
    setTimeout(()=>{ $("#qrModal").classList.remove("open"); }, 800);
  }else{
    qrInfo.textContent = "ℹ️ QR นี้ไม่ใช่ URL: " + text;
  }
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src=src; s.async=true;
    s.onload=()=>resolve(); s.onerror=()=>reject(new Error("failed to load "+src));
    document.head.appendChild(s);
  });
}

/* -------- Tabs -------- */
const tabOpen=$("#tab-open"), tabUpdate=$("#tab-update"), panelOpen=$("#panel-open"), panelUpdate=$("#panel-update");
function selectTab(which){
  const isOpen=which==="open";
  tabOpen.setAttribute("aria-selected", isOpen?"true":"false");
  tabUpdate.setAttribute("aria-selected", !isOpen?"true":"false");
  panelOpen.hidden=!isOpen; panelUpdate.hidden=isOpen;
}
tabOpen.addEventListener("click",()=>selectTab("open"));
tabUpdate.addEventListener("click",()=>selectTab("update"));
