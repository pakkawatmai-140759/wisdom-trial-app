import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, Settings, Box, Activity, Camera, Plus, 
  ChevronRight, ChevronLeft, Printer, Save, AlertCircle,
  Edit2, Trash2, Check, X, Image as ImageIcon, Scale, Clock, ClipboardCheck, ZoomIn, PlayCircle, Clock3, CheckCircle2,
  CalendarDays, Calendar as CalendarIcon, MapPin, Download, Image
} from 'lucide-react';

// === EXPORT LIBRARIES ===
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// === FIREBASE IMPORTS ===
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch, query, where } from "firebase/firestore";

// === FIREBASE CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyAw9msz9qZ3L011tHrAbQXAvppAvuMVbDg",
  authDomain: "wisdom-trial.firebaseapp.com",
  projectId: "wisdom-trial",
  storageBucket: "wisdom-trial.firebasestorage.app",
  messagingSenderId: "1082203023532",
  appId: "1:1082203023532:web:3d7acd991bd16e664e5709"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === ระบบบีบอัดรูปภาพ ===
export const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new window.Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1000;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
  };
};

// === ฟังก์ชันดึงรูปภาพแยกออกจากข้อมูลหลัก ===
export const extractImages = (obj, imagesList) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && obj.startsWith('data:image')) {
    const id = '@@IMG_REF@@_' + Date.now() + '_' + Math.random().toString(36).substring(2,9);
    imagesList.push({ id, data: obj });
    return id; 
  }
  if (Array.isArray(obj)) {
    return obj.map(item => extractImages(item, imagesList));
  }
  if (typeof obj === 'object') {
    const newObj = {};
    for (let key in obj) {
      newObj[key] = extractImages(obj[key], imagesList);
    }
    return newObj;
  }
  return obj;
};

// === ฟังก์ชันประกอบร่างรูปภาพกลับเข้าข้อมูลหลัก ===
export const restoreImages = (obj, imageMap) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && obj.startsWith('@@IMG_REF@@_')) {
    return imageMap[obj] || null; 
  }
  if (Array.isArray(obj)) {
    return obj.map(item => restoreImages(item, imageMap));
  }
  if (typeof obj === 'object') {
    const newObj = {};
    for (let key in obj) {
      newObj[key] = restoreImages(obj[key], imageMap);
    }
    return newObj;
  }
  return obj;
};

// === แก้ปัญหาจอขาวตอนปริ้นท์ และ บังคับเป็น แนวตั้ง (Portrait) ===
const printStyles = `
  /* บังคับกระดาษเป็นแนวตั้ง (Portrait) */
  @page { size: A4 portrait; margin: 8mm; }
  
  @media screen {
    .print-only { display: none !important; }
  }

  @media print {
    html, body, #root { 
        height: auto !important; 
        min-height: auto !important; 
        overflow: visible !important; 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: white !important; 
        margin: 0; 
        padding: 0; 
    }
    
    .no-print, .hide-on-print, .print\\:hidden, header { 
        display: none !important; 
    }
    
    .print-only { 
        display: block !important; 
        width: 100%; 
        max-width: 100%; 
        box-sizing: border-box !important;
    }
    
    table.print-table { 
        width: 100% !important; 
        border-collapse: collapse !important; 
    }
    table.print-table td, table.print-table th { 
        border: 1px solid black !important; 
    }
    
    /* ป้องกันจอขาวด้วยการอนุญาตให้แบ่งหน้าได้ตามธรรมชาติ */
    tr { page-break-inside: auto !important; page-break-after: auto !important; }
    td { page-break-inside: auto !important; }
    
    .page-break-before { page-break-before: always !important; }
    
    img { max-width: 100% !important; page-break-inside: avoid !important; }
  }
`;

const formatThaiDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  return `${parts[2]}/${parts[1]}/${year}`; 
};

const PUBLIC_HOLIDAYS = [
  '2026-01-01', '2026-03-03', '2026-04-06', '2026-04-13', '2026-04-14', '2026-04-15', 
  '2026-05-01', '2026-05-04', '2026-05-31', '2026-06-03', '2026-07-20', '2026-07-21', 
  '2026-07-28', '2026-08-12', '2026-10-13', '2026-10-23', '2026-12-05', '2026-12-10', '2026-12-31'
];

const DEFECT_TYPES = [
  "Flash (รอยครีบ)", "Sink Mark (รอยยุบ)", "Short Shot (ฉีดไม่เต็ม)",
  "Flow Mark (รอยลายน้ำ)", "Silver Streak (รอยเงิน)", "Weld Line (รอยประสาน)",
  "Burn Mark (รอยไหม้)", "Warpage (บิดงอ)", "Color Difference (สีเพี้ยน)", "Scratch (รอยขีดข่วน)", "Other (อื่นๆ)"
];

const checkNgByTolerance = (act, std, plus, minus) => {
  if (act === '' || act === undefined || std === '' || std === undefined) return false;
  const a = parseFloat(act);
  const s = parseFloat(std);
  const p = parseFloat(plus || 0);
  const m = parseFloat(minus || 0);
  if (isNaN(a) || isNaN(s)) return false;
  return a < (s - m) || a > (s + p);
};

const ActionButtons = ({ id, onEdit, onDelete, isEditing, onSave, onCancel, confirmDeleteId, setConfirmDeleteId }) => {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-2 bg-green-500 text-white rounded hover:bg-green-600"><Check size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"><X size={16} /></button>
      </div>
    );
  }
  if (confirmDeleteId === id) {
    return (
      <div className="flex gap-2 items-center">
        <span className="text-sm text-red-500 font-bold">ยืนยันลบ?</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 bg-red-600 text-white rounded hover:bg-red-700"><Check size={16} /></button>
        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"><X size={16} /></button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={18} /></button>
      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
    </div>
  );
};

const ImageUpload = ({ label, onChange, value, height = "h-24", onZoom }) => {
  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      compressImage(e.target.files[0], (base64String) => {
        onChange(base64String);
      });
    }
  };
  return (
    <div className={`border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-gray-50 relative ${height} flex flex-col items-center justify-center bg-white group overflow-hidden`}>
      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFile} title={value ? "คลิกเพื่อเปลี่ยนรูป" : "คลิกเพื่อเพิ่มรูป"} />
      {value ? (
        <>
          <img src={value} alt="Preview" className="h-full object-contain" />
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onZoom(value); }} className="absolute top-1 left-1 bg-black/60 text-white p-1.5 rounded-lg z-20 hover:bg-blue-600 transition-colors shadow" title="ขยายรูป"><ZoomIn size={16} /></button>
        </>
      ) : (
        <>
          <Camera className="w-5 h-5 text-gray-400 mb-1" />
          <span className="text-[10px] text-gray-500 leading-tight">{label}</span>
        </>
      )}
    </div>
  );
};

const initialClients = [{ id: 1, name: 'TS TECH (THAILAND) CO., LTD.' }];
const initialModels = [
  { id: 1, clientId: 1, name: '3DAA' },
  { id: 2, clientId: 1, name: '34AA' },
  { id: 3, clientId: 1, name: 'P700' },
];
const initialParts = [
  { id: 1, modelId: 1, code: '81125-3DAA\nLOCK KNOB R/L WALK IN', status: 'active' },
  { id: 2, modelId: 1, code: '81126-3DAA\nCOVER COMP R RECLINING OUT', status: 'active' },
  { id: 3, modelId: 1, code: '81127-3DAA\nUNDER COVER RR CTR MID SEAT', status: 'active' },
];

export default function App() {
  const [view, setView] = useState('clients');
  const [path, setPath] = useState({ client: null, model: null, part: null });
  const [zoomedImg, setZoomedImg] = useState(null);

  const [clients, setClients] = useState([]);
  const [models, setModels] = useState([]);
  const [parts, setParts] = useState([]);
  const [trials, setTrials] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  const [isBooking, setIsBooking] = useState(false);
  const [sideNote, setSideNote] = useState('');
  
  const getInitialBookingData = () => ({ 
    id: null, date: '', time: '', type: 'trial', title: '', detail: '', clientId: '', partId: '', machine: '', requester: '', location: '',
    reqMachineSent: false, prodApproved: false, planStatus: 'on_time', rescheduleReason: '',
    status: 'pending', proofImages: [], updatedAt: ''
  });
  const [bookingData, setBookingData] = useState(getInitialBookingData());

  const [addingId, setAddingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingTrialId, setEditingTrialId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [partInput, setPartInput] = useState({});
  const [compInput, setCompInput] = useState(null);
  const [formData, setFormData] = useState(null);
  
  const [selectedTrialIds, setSelectedTrialIds] = useState([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [includeCalendarInReport, setIncludeCalendarInReport] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); 
  const [reportImageMap, setReportImageMap] = useState({});
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  useEffect(() => {
    const initDB = async () => {
        const partsSnap = await getDocs(collection(db, 'parts'));
        if (partsSnap.empty) initialParts.forEach(p => setDoc(doc(db, 'parts', p.id.toString()), p));
    };
    initDB();

    const unsubC = onSnapshot(doc(db, 'wisdom', 'clients'), d => {
        if(d.exists()) setClients(d.data().list); else setDoc(doc(db, 'wisdom', 'clients'), {list: initialClients});
    });
    const unsubM = onSnapshot(doc(db, 'wisdom', 'models'), d => {
        if(d.exists()) setModels(d.data().list); else setDoc(doc(db, 'wisdom', 'models'), {list: initialModels});
    });
    const unsubS = onSnapshot(doc(db, 'wisdom', 'schedules'), d => {
        if(d.exists()) setSchedules(d.data().list || []); else setDoc(doc(db, 'wisdom', 'schedules'), {list: []});
    });
    
    const unsubP = onSnapshot(collection(db, 'parts'), snap => setParts(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(collection(db, 'trials'), snap => setTrials(snap.docs.map(d=>d.data())));

    return () => { unsubC(); unsubM(); unsubS(); unsubP(); unsubT(); };
  }, []);

  const updateClients = (newList) => { setClients(newList); setDoc(doc(db, 'wisdom', 'clients'), { list: newList }); };
  const updateModels = (newList) => { setModels(newList); setDoc(doc(db, 'wisdom', 'models'), { list: newList }); };
  const updateSchedules = (newList) => { setSchedules(newList); setDoc(doc(db, 'wisdom', 'schedules'), { list: newList }); };

  const getInitialTrialData = () => ({
    trialNo: 0, 
    trialLocation: 'in_house', 
    outsourceCompany: '',
    isSpecialRequest: false, 
    specialRequestDetail: '',
    specialRequestImg: null,
    date: new Date().toISOString().split('T')[0],
    images: { setupClose: null, setupOpen: null, cav: null, core: null, coreEjector: null, resin: null, machine: null, packing: null },
    equipmentImages: [], monitorImages: [], atmosphereImages: [], meetingImages: [],
    partProblems: [], moldProblems: [],
    conditions: [{ id: Date.now() + Math.random(), name: 'Condition #1', actWeights: {}, actGateWeight: '', actCycleTime: '', note: '', customerResult: 'pending' }],
    goodParts: '', ngParts: '', reqModifyMold: false, reqRetrial: false, reqJig: false,
    makerAction: '', deliveryDate: '', nextTrialDate: '', limitSampleOk: false, remarks: '',
    signatures: [{ id: 1, role: 'PE', name: '' }, { id: 2, role: 'Tooling Maker', name: '' }, { id: 3, role: 'ลูกค้า (Customer)', name: '' }],
    status: 'draft' 
  });

  const resetForms = () => { 
    setAddingId(null); setEditingId(null); setConfirmDeleteId(null); setInputValue(''); 
    setPartInput({}); setCompInput(null); setEditingTrialId(null); setIsBooking(false); 
  };
  
  const goBack = () => {
    resetForms();
    if (view === 'models') setView('clients');
    if (view === 'parts') setView('models');
    if (view === 'trials') setView('parts');
    if (view === 'report' || view === 'trial_form') setView('trials');
  };

  const handleExportPNG = async (elementId, filename) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export PNG Error:', error);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์รูปภาพ');
    }
  };

  const handleExportExcel = (elementId, filename) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const wb = XLSX.utils.table_to_book(element, { sheet: "Trial Report" });
      XLSX.writeFile(wb, `${filename}.xlsx`);
      alert('ส่งออก Excel สำเร็จ! \n*หมายเหตุ: รูปภาพไม่สามารถส่งออกในไฟล์ Excel ได้ครับ');
    } catch (error) {
      console.error('Export Excel Error:', error);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
    }
  };

  const CalendarView = () => {
    const monthNamesThai = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    const handlePrevMonth = () => {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } 
      else { setCurrentMonth(currentMonth - 1); }
      setSelectedScheduleIds([]);
    };

    const handleNextMonth = () => {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } 
      else { setCurrentMonth(currentMonth + 1); }
      setSelectedScheduleIds([]);
    };

    const handleSaveBooking = async () => {
      if(!bookingData.date || !bookingData.title) return alert('กรุณาใส่วันที่และหัวข้องาน');
      try {
         const now = new Date();
         const day = String(now.getDate()).padStart(2, '0');
         const month = String(now.getMonth() + 1).padStart(2, '0');
         const year = now.getFullYear() + 543;
         const hours = String(now.getHours()).padStart(2, '0');
         const mins = String(now.getMinutes()).padStart(2, '0');
         const updateTimeStr = `${day}/${month}/${year} ${hours}:${mins}`;

         const dataToSave = { ...bookingData, updatedAt: updateTimeStr };

         if (bookingData.id) {
            await updateSchedules(schedules.map(s => s.id === bookingData.id ? dataToSave : s));
         } else {
            const uniqueId = Date.now() + Math.random();
            await updateSchedules([...schedules, { ...dataToSave, id: uniqueId }]);
         }
         setIsBooking(false);
         setBookingData(getInitialBookingData());
      } catch (error) {
         alert('ไม่สามารถบันทึกข้อมูลได้!\nสาเหตุ: ' + error.message);
      }
    };

    const handleDeleteBooking = (idToDelete) => {
      if(window.confirm('ยืนยันการลบรายการนัดหมายนี้ใช่หรือไม่?')){
         updateSchedules(schedules.filter(s => s.id !== idToDelete));
         setIsBooking(false);
         setBookingData(getInitialBookingData());
      }
    };

    const handleEditSchedule = (schedObj) => {
      setBookingData({ ...schedObj, status: schedObj.status || 'pending', proofImages: schedObj.proofImages || [] });
      setIsBooking(true);
      window.scrollTo(0, 0); 
    };

    const currentMonthSchedules = [...schedules]
      .filter(s => {
         if (!s.date || typeof s.date !== 'string') return false;
         const dParts = s.date.split('-');
         if(dParts.length < 2) return false;
         return parseInt(dParts[0]) === currentYear && parseInt(dParts[1]) === currentMonth + 1;
      })
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    const renderCalendarGrid = () => {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); 
      const todayStr = new Date().toISOString().split('T')[0];
      
      let blanks = [];
      for (let i = 0; i < firstDayOfMonth; i++) blanks.push(<div key={`blank-${i}`} className="bg-gray-100/50 border-r border-b p-1 min-h-[80px]"></div>);
      
      let days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvents = schedules.filter(s => s.date === dateStr);
        
        const isPublicHoliday = PUBLIC_HOLIDAYS.includes(dateStr);
        const isSunday = new Date(currentYear, currentMonth, d).getDay() === 0;
        const isDayOff = isPublicHoliday || isSunday;
        const isToday = dateStr === todayStr;
        
        days.push(
          <div key={d} className={`border-r border-b p-1 min-h-[80px] md:min-h-[100px] flex flex-col group relative transition-colors ${isDayOff ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-blue-50'}`}>
            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-md' : (isDayOff ? 'text-red-600' : 'text-gray-700')}`}>
               {d}
            </span>
            <div className="flex-1 overflow-y-auto space-y-1">
              {dayEvents.map(ev => {
                let colorClass = "bg-gray-100 text-gray-800 border-gray-300";
                if(ev.type === 'trial') colorClass = "bg-[#fff3c4] text-[#8c6d1f] border-[#fce988]"; 
                if(ev.type === 'delivery') colorClass = "bg-[#6bb5ff] text-white border-[#4d9cf0]"; 
                if(ev.type === 'meeting') colorClass = "bg-[#a3f0b6] text-[#2c7a3f] border-[#81e89b]"; 
                if(ev.type === 'support') colorClass = "bg-[#fc9c42] text-white border-[#eb892d]"; 
                
                const isCompleted = ev.status === 'completed';

                return (
                  <div 
                    key={ev.id} 
                    className={`text-[9px] md:text-[10px] leading-tight p-1 rounded border shadow-sm truncate cursor-pointer hover:opacity-80 transition-all ${isCompleted ? 'opacity-60 bg-gray-50 border-gray-200 text-gray-500' : colorClass}`} 
                    onClick={() => handleEditSchedule(ev)}
                  >
                    <strong>
                      {isCompleted && <span className="text-green-600 mr-1">✅</span>}
                      {ev.time ? `${ev.time} ` : ''}{ev.title}
                    </strong>
                    {ev.detail && <span className="block opacity-80 truncate">{ev.detail}</span>}
                  </div>
                )
              })}
            </div>
            <button onClick={() => { setBookingData({...getInitialBookingData(), date: dateStr}); setIsBooking(true); }} className="no-print absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-100 rounded p-0.5"><Plus size={14}/></button>
          </div>
        );
      }

      return (
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white print-exact-color">
            <div className="grid grid-cols-7 bg-[#2b4c9b] text-white text-center text-[10px] md:text-xs font-bold divide-x divide-gray-400 print-exact-color">
              <div className="py-2 bg-[#d63434] print-exact-color">อาทิตย์</div>
              <div className="py-2">จันทร์</div>
              <div className="py-2">อังคาร</div>
              <div className="py-2">พุธ</div>
              <div className="py-2">พฤหัสบดี</div>
              <div className="py-2">ศุกร์</div>
              <div className="py-2">เสาร์</div>
            </div>
            <div className="grid grid-cols-7">
              {blanks}
              {days}
            </div>
          </div>
          <div className="w-full lg:w-72 bg-white border border-gray-300 rounded-lg shadow-sm p-4 flex flex-col">
            <label className="text-red-500 font-bold text-base mb-2">Note:</label>
            <textarea 
              className="w-full flex-1 min-h-[250px] lg:min-h-0 border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50" 
              placeholder="พิมพ์บันทึกข้อความอิสระที่นี่..."
              value={sideNote}
              onChange={(e) => setSideNote(e.target.value)}
            />
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={handlePrevMonth} className="p-2 border rounded-lg hover:bg-gray-100"><ChevronLeft size={20}/></button>
            <h2 className="text-lg font-bold text-gray-800 min-w-[180px] text-center">
              {monthNamesThai[currentMonth]} {currentYear + 543}
            </h2>
            <button onClick={handleNextMonth} className="p-2 border rounded-lg hover:bg-gray-100"><ChevronRight size={20}/></button>
          </div>
          <button onClick={() => { setBookingData(getInitialBookingData()); setIsBooking(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm font-semibold">
            <Plus size={18}/> จองคิว / นัดหมายใหม่
          </button>
        </div>

        {isBooking && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-start mb-4 border-b pb-2">
               <div>
                 <h2 className="text-xl font-bold text-blue-900 flex items-center">
                   <CalendarDays className="mr-2"/> 
                   {bookingData.id ? 'แก้ไขนัดหมาย / จองคิวงาน' : 'เพิ่มตารางนัดหมาย / จองคิวงาน'}
                 </h2>
                 <div className="flex flex-col gap-0.5 mt-1">
                   <p className="text-xs font-semibold text-gray-500">วันที่ทำรายการ: {formatThaiDate((new Date().toISOString() || '').split('T')[0])}</p>
                   {bookingData.id && bookingData.updatedAt && (
                     <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block w-max">
                       🕒 อัปเดตล่าสุด: {bookingData.updatedAt}
                     </p>
                   )}
                 </div>
               </div>
               <button onClick={() => { setIsBooking(false); setBookingData(getInitialBookingData()); }} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">วันที่ต้องการจอง</label>
                  <input type="date" className="w-full border p-2 rounded focus:ring-2 outline-none" value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">เวลา (Time)</label>
                  <input type="time" className="w-full border p-2 rounded focus:ring-2 outline-none" value={bookingData.time} onChange={e => setBookingData({...bookingData, time: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ประเภทงาน (Event Type)</label>
                  <select className="w-full border p-2 rounded focus:ring-2 outline-none font-semibold" value={bookingData.type} onChange={e => setBookingData({...bookingData, type: e.target.value})}>
                    <option value="trial">🟡 งานฉีด / Trial แม่พิมพ์</option>
                    <option value="delivery">🔵 งานจัดส่ง (Delivery)</option>
                    <option value="support">🟠 งานซ่อม / Support / จัดทำ Jig</option>
                    <option value="meeting">🟢 นัดประชุม (Meeting)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">หัวข้องานสั้นๆ (Title)</label>
                <input type="text" className="w-full border p-2 rounded focus:ring-2 outline-none" placeholder="เช่น INJ SHROUD COMP..." value={bookingData.title} onChange={e => setBookingData({...bookingData, title: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
                <input type="text" className="w-full border p-2 rounded focus:ring-2 outline-none" placeholder="รายละเอียดงาน หรือข้อควรระวัง..." value={bookingData.detail} onChange={e => setBookingData({...bookingData, detail: e.target.value})} />
              </div>

              {bookingData.type === 'trial' ? (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                   <div>
                     <label className="block text-xs font-semibold text-gray-700 mb-1">เลือกลูกค้า</label>
                     <select className="w-full border p-1.5 rounded focus:ring-2 outline-none text-sm" value={bookingData.clientId} onChange={e => setBookingData({...bookingData, clientId: Number(e.target.value), partId: ''})}>
                       <option value="">-- ไม่ระบุ --</option>
                       {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   </div>
                   {bookingData.clientId && (
                     <div>
                       <label className="block text-xs font-semibold text-gray-700 mb-1">เลือกแม่พิมพ์</label>
                       <select className="w-full border p-1.5 rounded focus:ring-2 outline-none text-sm" value={bookingData.partId} onChange={e => setBookingData({...bookingData, partId: Number(e.target.value)})}>
                         <option value="">-- ไม่ระบุ --</option>
                         {parts.filter(p => models.find(m => m.id === p.modelId)?.clientId === bookingData.clientId).map(p => (
                           <option key={p.id} value={p.id}>{(p.code||'').split('\n')[0]}{(p.code||'').includes('\n')?'...':''}</option>
                         ))}
                       </select>
                     </div>
                   )}
                   <div>
                     <label className="block text-xs font-semibold text-gray-700 mb-1">เครื่องจักร</label>
                     <input type="text" className="w-full border p-1.5 rounded outline-none text-sm" placeholder="เช่น MC-250T" value={bookingData.machine} onChange={e => setBookingData({...bookingData, machine: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-gray-700 mb-1">ผู้จอง (PE)</label>
                     <input type="text" className="w-full border p-1.5 rounded outline-none text-sm" placeholder="ชื่อ..." value={bookingData.requester} onChange={e => setBookingData({...bookingData, requester: e.target.value})} />
                   </div>
                </div>
              ) : (
                <div className="bg-blue-50 p-3 rounded border border-blue-200 grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                   <div>
                     <label className="block text-xs font-semibold text-blue-900 mb-1">
                       {bookingData.type === 'delivery' ? '📍 สถานที่จัดส่ง (Destination)' : '📍 สถานที่ / ห้อง (Location)'}
                     </label>
                     <input type="text" className="w-full border p-1.5 rounded outline-none text-sm focus:ring-2 focus:border-blue-400" placeholder="ระบุสถานที่..." value={bookingData.location || ''} onChange={e => setBookingData({...bookingData, location: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-blue-900 mb-1">👤 ผู้จองคิว / ผู้ประสานงาน</label>
                     <input type="text" className="w-full border p-1.5 rounded outline-none text-sm focus:ring-2 focus:border-blue-400" placeholder="ชื่อผู้รับผิดชอบงาน..." value={bookingData.requester || ''} onChange={e => setBookingData({...bookingData, requester: e.target.value})} />
                   </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-4 shadow-sm">
                 <h4 className="text-sm font-bold text-gray-800 border-b border-gray-300 pb-1 mb-3">สถานะความสำเร็จของงาน (Job Status)</h4>
                 
                 <div className="flex gap-4 mb-3">
                    <label className={`flex flex-1 items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${bookingData.status === 'pending' ? 'bg-white border-blue-500 shadow-md text-blue-800 font-bold' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <input type="radio" className="hidden" checked={bookingData.status === 'pending'} onChange={() => setBookingData({...bookingData, status: 'pending'})} />
                        ⏳ รอดำเนินการ
                    </label>
                    <label className={`flex flex-1 items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${bookingData.status === 'completed' ? 'bg-green-50 border-green-500 shadow-md text-green-800 font-bold' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <input type="radio" className="hidden" checked={bookingData.status === 'completed'} onChange={() => setBookingData({...bookingData, status: 'completed'})} />
                        ✅ เสร็จสิ้นแล้ว
                    </label>
                 </div>

                 {bookingData.status === 'completed' && (
                    <div className="p-3 bg-white border border-green-200 rounded-lg animate-in fade-in">
                        <div className="flex justify-between items-center mb-3">
                           <label className="text-sm font-bold text-green-800">แนบรูปถ่ายหลักฐานปิดงาน (สูงสุด 3 รูป)</label>
                           {(bookingData.proofImages || []).length < 3 && (
                              <button type="button" onClick={() => {
                                 if(isUploadingProof) return;
                                 const input = document.createElement('input');
                                 input.type = 'file'; input.accept = 'image/*';
                                 input.onchange = (e) => {
                                     if(e.target.files && e.target.files[0]) {
                                         setIsUploadingProof(true);
                                         compressImage(e.target.files[0], (url) => {
                                             setBookingData(prev => ({...prev, proofImages: [...(prev.proofImages || []), {id: Date.now(), img: url}]}));
                                             setIsUploadingProof(false);
                                         });
                                     }
                                 };
                                 input.click();
                              }} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 flex items-center gap-1 font-semibold">
                                 <Plus size={14}/> เพิ่มรูปภาพ
                              </button>
                           )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                           {(bookingData.proofImages || []).map((imgObj, idx) => (
                              <div key={imgObj.id || idx} className="relative group border rounded-lg overflow-hidden h-28 bg-gray-50 flex items-center justify-center">
                                 <img src={imgObj.img} alt="Proof" className="h-full object-contain" />
                                 <button type="button" onClick={() => setZoomedImg(imgObj.img)} className="absolute top-1 left-1 bg-black/60 text-white p-1 rounded hover:bg-blue-600"><ZoomIn size={14}/></button>
                                 <button type="button" onClick={() => setBookingData(prev => ({...prev, proofImages: prev.proofImages.filter((_, i) => i !== idx)}))} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded hover:bg-red-700"><X size={14}/></button>
                              </div>
                           ))}
                           {(!bookingData.proofImages || bookingData.proofImages.length === 0) && (
                              <div className="col-span-3 text-center py-4 text-xs text-gray-400 border border-dashed rounded-lg">
                                 ยังไม่มีรูปภาพหลักฐานปิดงาน
                              </div>
                           )}
                        </div>
                    </div>
                 )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                 {bookingData.id && (
                    <button onClick={() => handleDeleteBooking(bookingData.id)} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 font-semibold mr-auto">
                       ลบนัดหมายนี้
                    </button>
                 )}
                 <button onClick={() => { setIsBooking(false); setBookingData(getInitialBookingData()); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold">
                    ยกเลิก
                 </button>
                 <button onClick={handleSaveBooking} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold shadow">
                    บันทึกข้อมูล
                 </button>
              </div>
            </div>
          </div>
        )}

        {renderCalendarGrid()}

        {/* ตารางรายการนัดหมายประจำเดือน (ส่วนเดิมก่อนหน้า) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center flex-wrap gap-3">
             <div className="flex items-center gap-2">
               <CalendarIcon className="text-blue-600" size={20}/>
               <h3 className="font-bold text-gray-800">รายการนัดหมายประจำเดือน {monthNamesThai[currentMonth]}</h3>
             </div>
             <div className="flex items-center gap-2 flex-wrap">
               <label className="flex items-center gap-1.5 text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm cursor-pointer hover:bg-gray-50 font-semibold text-gray-700">
                 <input 
                   type="checkbox" 
                   checked={includeCalendarInReport} 
                   onChange={e => setIncludeCalendarInReport(e.target.checked)}
                   className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                 />
                 <span>แนบหน้าปฏิทินด้วย</span>
               </label>
               {selectedScheduleIds.length > 0 ? (
                 <button onClick={() => {
                   if(window.confirm(`ยืนยันการลบ ${selectedScheduleIds.length} รายการที่เลือก?`)){
                     updateSchedules(schedules.filter(s => !selectedScheduleIds.includes(s.id)));
                     setSelectedScheduleIds([]);
                   }
                 }} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 flex items-center gap-1 shadow-sm">
                   <Trash2 size={14}/> ลบที่เลือก ({selectedScheduleIds.length})
                 </button>
               ) : (
                 <button onClick={() => setSelectedScheduleIds(currentMonthSchedules.map(s => s.id))} className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 shadow-sm">
                   เลือกทั้งหมด
                 </button>
               )}
               {selectedScheduleIds.length > 0 && (
                 <button onClick={() => setSelectedScheduleIds([])} className="bg-white text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 shadow-sm">
                   ล้างทั้งหมด
                 </button>
               )}
               <button onClick={() => window.print()} className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-900 flex items-center gap-1 shadow-sm">
                 <Printer size={14}/> พิมพ์ตารางงาน (PDF)
               </button>
             </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse text-xs md:text-sm">
               <thead>
                 <tr className="bg-gray-100 text-gray-700 border-b">
                   <th className="p-3 w-10 text-center">
                     <input 
                       type="checkbox" 
                       checked={currentMonthSchedules.length > 0 && selectedScheduleIds.length === currentMonthSchedules.length}
                       onChange={e => {
                         if(e.target.checked) setSelectedScheduleIds(currentMonthSchedules.map(s => s.id));
                         else setSelectedScheduleIds([]);
                       }}
                       className="rounded text-blue-600 focus:ring-blue-500"
                     />
                   </th>
                   <th className="p-3">วันที่</th>
                   <th className="p-3">เวลา</th>
                   <th className="p-3">ประเภท</th>
                   <th className="p-3">หัวข้องาน (TITLE)</th>
                   <th className="p-3">รายละเอียด</th>
                   <th className="p-3 text-center">สถานะ / รูปหลักฐาน</th>
                   <th className="p-3 text-center">จัดการ</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200">
                 {currentMonthSchedules.length > 0 ? (
                   currentMonthSchedules.map(sched => {
                     const isSelected = selectedScheduleIds.includes(sched.id);
                     const isCompleted = sched.status === 'completed';
                     return (
                       <tr key={sched.id} className={`hover:bg-blue-50/50 transition-colors ${isSelected ? 'bg-blue-50/80' : ''}`}>
                         <td className="p-3 text-center">
                           <input 
                             type="checkbox" 
                             checked={isSelected}
                             onChange={e => {
                               if(e.target.checked) setSelectedScheduleIds([...selectedScheduleIds, sched.id]);
                               else setSelectedScheduleIds(selectedScheduleIds.filter(id => id !== sched.id));
                             }}
                             className="rounded text-blue-600 focus:ring-blue-500"
                           />
                         </td>
                         <td className="p-3 font-medium whitespace-nowrap">{formatThaiDate(sched.date)}</td>
                         <td className="p-3 whitespace-nowrap">{sched.time || '-'}</td>
                         <td className="p-3 whitespace-nowrap">
                           <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                             sched.type === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                             sched.type === 'delivery' ? 'bg-blue-100 text-blue-800' :
                             sched.type === 'meeting' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                           }`}>
                             {getTypeLabel(sched.type)}
                           </span>
                         </td>
                         <td className="p-3 font-bold text-gray-900">{sched.title}</td>
                         <td className="p-3 text-gray-600 max-w-xs truncate">{sched.detail || '-'}</td>
                         <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                {isCompleted ? '✅ เสร็จสิ้น' : '⏳ รอดำเนินการ'}
                              </span>
                              {sched.proofImages && sched.proofImages.length > 0 && (
                                <button onClick={() => setZoomedImg(sched.proofImages[0].img)} className="text-blue-600 hover:text-blue-800 p-1" title="ดูรูปหลักฐาน">
                                  <ImageIcon size={16}/>
                                </button>
                              )}
                            </div>
                         </td>
                         <td className="p-3 text-center whitespace-nowrap">
                           <div className="flex items-center justify-center gap-1">
                             <button onClick={() => handleEditSchedule(sched)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="แก้ไข">
                               <Edit2 size={16}/>
                             </button>
                             <button onClick={() => handleDeleteBooking(sched.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="ลบ">
                               <Trash2 size={16}/>
                             </button>
                           </div>
                         </td>
                       </tr>
                     );
                   })
                 ) : (
                   <tr>
                     <td colSpan="8" className="p-8 text-center text-gray-400">
                       ไม่มีข้อมูลนัดหมายในเดือนนี้
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    );
  };

  const renderClientsView = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FolderKanban className="text-blue-600"/> เลือกลูกค้า (Clients)
          </h2>
          <button onClick={() => { setAddingId('client'); setInputValue(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm font-semibold text-sm">
            <Plus size={18}/> เพิ่มลูกค้าใหม่
          </button>
        </div>

        {addingId === 'client' && (
          <div className="bg-white p-4 rounded-xl shadow border border-blue-200 flex gap-3 items-center">
            <input 
              type="text" 
              className="flex-1 border p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              placeholder="ชื่อบริษัทลูกค้า..." 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)}
              autoFocus
            />
            <button onClick={() => {
              if(!inputValue.trim()) return;
              updateClients([...clients, { id: Date.now(), name: inputValue.trim() }]);
              resetForms();
            }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1">
              <Check size={16}/> บันทึก
            </button>
            <button onClick={resetForms} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300">
              ยกเลิก
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <div 
              key={client.id} 
              onClick={() => { setPath({ ...path, client }); setView('models'); }}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {client.name.charAt(0)}
                </div>
                <ActionButtons 
                  id={client.id}
                  isEditing={editingId === client.id}
                  onEdit={() => { setEditingId(client.id); setInputValue(client.name); }}
                  onSave={() => {
                    if(!inputValue.trim()) return;
                    updateClients(clients.map(c => c.id === client.id ? {...c, name: inputValue.trim()} : c));
                    resetForms();
                  }}
                  onCancel={resetForms}
                  onDelete={() => {
                    updateClients(clients.filter(c => c.id !== client.id));
                    resetForms();
                  }}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                />
              </div>

              {editingId === client.id ? (
                <div onClick={e => e.stopPropagation()} className="my-2">
                  <input 
                    type="text" 
                    className="w-full border p-1.5 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    value={inputValue} 
                    onChange={e => setInputValue(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <h3 className="font-bold text-gray-800 text-base mb-1 group-hover:text-blue-600 transition-colors">
                  {client.name}
                </h3>
              )}

              <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                ดูโมเดลแม่พิมพ์ทั้งหมด <ChevronRight size={14}/>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderModelsView = () => {
    const clientModels = models.filter(m => m.clientId === path.client.id);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 border rounded-lg hover:bg-gray-100 text-gray-600">
              <ChevronLeft size={20}/>
            </button>
            <div>
              <p className="text-xs text-gray-500 font-semibold">ลูกค้า:</p>
              <h2 className="text-lg font-bold text-blue-900">{path.client.name}</h2>
            </div>
          </div>
          <button onClick={() => { setAddingId('model'); setInputValue(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm font-semibold text-sm">
            <Plus size={18}/> เพิ่มโมเดลใหม่
          </button>
        </div>

        {addingId === 'model' && (
          <div className="bg-white p-4 rounded-xl shadow border border-blue-200 flex gap-3 items-center">
            <input 
              type="text" 
              className="flex-1 border p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              placeholder="ชื่อโมเดล (เช่น 3DAA, P700)..." 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)}
              autoFocus
            />
            <button onClick={() => {
              if(!inputValue.trim()) return;
              updateModels([...models, { id: Date.now(), clientId: path.client.id, name: inputValue.trim() }]);
              resetForms();
            }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1">
              <Check size={16}/> บันทึก
            </button>
            <button onClick={resetForms} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300">
              ยกเลิก
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientModels.map(model => (
            <div 
              key={model.id} 
              onClick={() => { setPath({ ...path, model }); setView('parts'); }}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {model.name.charAt(0)}
                </div>
                <ActionButtons 
                  id={model.id}
                  isEditing={editingId === model.id}
                  onEdit={() => { setEditingId(model.id); setInputValue(model.name); }}
                  onSave={() => {
                    if(!inputValue.trim()) return;
                    updateModels(models.map(m => m.id === model.id ? {...m, name: inputValue.trim()} : m));
                    resetForms();
                  }}
                  onCancel={resetForms}
                  onDelete={() => {
                    updateModels(models.filter(m => m.id !== model.id));
                    resetForms();
                  }}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                />
              </div>

              {editingId === model.id ? (
                <div onClick={e => e.stopPropagation()} className="my-2">
                  <input 
                    type="text" 
                    className="w-full border p-1.5 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    value={inputValue} 
                    onChange={e => setInputValue(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <h3 className="font-bold text-gray-800 text-base mb-1 group-hover:text-indigo-600 transition-colors">
                  Model: {model.name}
                </h3>
              )}

              <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                ดูรายการชิ้นส่วน / แม่พิมพ์ <ChevronRight size={14}/>
              </p>
            </div>
          ))}
          {clientModels.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed">
              ยังไม่มีโมเดลในลูกค้ารายนี้ คลิก "เพิ่มโมเดลใหม่" ด้านบน
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <style>{printStyles}</style>
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center no-print">
        <h1 className="text-xl font-bold">Wisdom Autoparts - Trial Management</h1>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('projects')} className={`px-3 py-1.5 rounded ${activeTab === 'projects' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-800'}`}>
            Projects / Trials
          </button>
          <button onClick={() => setActiveTab('calendar')} className={`px-3 py-1.5 rounded ${activeTab === 'calendar' ? 'bg-blue-700 font-bold' : 'hover:bg-blue-800'}`}>
            Calendar / Schedule
          </button>
        </div>
      </header>

      <main className="p-6">
        {activeTab === 'calendar' ? (
          <CalendarView />
        ) : (
          <div>
            {view === 'clients' && renderClientsView()}
            {view === 'models' && renderModelsView()}
            {view === 'parts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3">
                    <button onClick={goBack} className="p-2 border rounded-lg hover:bg-gray-100"><ChevronLeft size={20}/></button>
                    <div>
                      <p className="text-xs text-gray-500">{path.client?.name} &gt; Model {path.model?.name}</p>
                      <h2 className="text-lg font-bold text-blue-900">รายการชิ้นส่วน / แม่พิมพ์</h2>
                    </div>
                  </div>
                  <button onClick={() => { setAddingId('part'); setInputValue(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm font-semibold text-sm">
                    <Plus size={18}/> เพิ่มแม่พิมพ์ใหม่
                  </button>
                </div>

                {addingId === 'part' && (
                  <div className="bg-white p-4 rounded-xl shadow border border-blue-200 flex gap-3 items-center">
                    <input 
                      type="text" 
                      className="flex-1 border p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                      placeholder="รหัสและชื่อชิ้นส่วน..." 
                      value={inputValue} 
                      onChange={e => setInputValue(e.target.value)}
                      autoFocus
                    />
                    <button onClick={async () => {
                      if(!inputValue.trim()) return;
                      const newPart = { id: Date.now(), modelId: path.model.id, code: inputValue.trim(), status: 'active' };
                      await setDoc(doc(db, 'parts', newPart.id.toString()), newPart);
                      resetForms();
                    }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1">
                      <Check size={16}/> บันทึก
                    </button>
                    <button onClick={resetForms} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300">
                      ยกเลิก
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parts.filter(p => p.modelId === path.model?.id).map(part => (
                    <div 
                      key={part.id} 
                      onClick={() => { setPath({ ...path, part }); setView('trials'); }}
                      className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <Box size={20}/>
                        </div>
                        <ActionButtons 
                          id={part.id}
                          isEditing={editingId === part.id}
                          onEdit={() => { setEditingId(part.id); setInputValue(part.code); }}
                          onSave={async () => {
                            if(!inputValue.trim()) return;
                            await setDoc(doc(db, 'parts', part.id.toString()), { ...part, code: inputValue.trim() });
                            resetForms();
                          }}
                          onCancel={resetForms}
                          onDelete={async () => {
                            await deleteDoc(doc(db, 'parts', part.id.toString()));
                            resetForms();
                          }}
                          confirmDeleteId={confirmDeleteId}
                          setConfirmDeleteId={setConfirmDeleteId}
                        />
                      </div>

                      {editingId === part.id ? (
                        <div onClick={e => e.stopPropagation()} className="my-2">
                          <textarea 
                            className="w-full border p-1.5 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                            value={inputValue} 
                            onChange={e => setInputValue(e.target.value)}
                            rows={2}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h3 className="font-bold text-gray-800 text-base mb-1 group-hover:text-purple-600 transition-colors whitespace-pre-line">
                          {part.code}
                        </h3>
                      )}

                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                        ประวัติการ Trial แม่พิมพ์ <ChevronRight size={14}/>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view === 'trials' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <button onClick={goBack} className="p-2 border rounded-lg hover:bg-gray-100"><ChevronLeft size={20}/></button>
                    <div>
                      <p className="text-xs text-gray-500">{path.client?.name} &gt; Model {path.model?.name}</p>
                      <h2 className="text-lg font-bold text-blue-900 whitespace-pre-line">{path.part?.code}</h2>
                    </div>
                  </div>
                  <button onClick={() => {
                    const existingTrials = trials.filter(t => t.partId === path.part.id);
                    const newTrialNo = existingTrials.length + 1;
                    const newTrial = { ...getInitialTrialData(), id: 'trial_' + Date.now(), partId: path.part.id, trialNo: newTrialNo };
                    setFormData(newTrial);
                    setView('trial_form');
                  }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm font-semibold text-sm">
                    <Plus size={18}/> บันทึกผล Trial ใหม่ (ครั้งที่ {trials.filter(t => t.partId === path.part.id).length + 1})
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">
                    ประวัติการทดสอบแม่พิมพ์ (Trial History)
                  </div>
                  <div className="divide-y divide-gray-200">
                    {trials.filter(t => t.partId === path.part?.id).map(trial => (
                      <div key={trial.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600 text-base">Trial #{trial.trialNo}</span>
                            <span className="text-xs text-gray-500">วันที่: {formatThaiDate(trial.date)}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${trial.trialLocation === 'in_house' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                              {trial.trialLocation === 'in_house' ? 'ภายในบริษัท (In-house)' : `นอกสถานที่ (${trial.outsourceCompany || 'Outsource'})`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            สภาพพิมพ์: {trial.status === 'completed' ? '✅ เสร็จสิ้น' : '📝 ฉบับร่าง'} | เงื่อนไขการฉีด: {trial.conditions?.length || 0} เงื่อนไข
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setFormData(trial); setView('report'); }} className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-100 flex items-center gap-1">
                            <Printer size={14}/> ดูรายงาน / ปริ้นท์
                          </button>
                          <button onClick={() => { setFormData(trial); setView('trial_form'); }} className="bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 flex items-center gap-1">
                            <Edit2 size={14}/> แก้ไข
                          </button>
                          <button onClick={async () => {
                            if(window.confirm('ยืนยันการลบประวัติ Trial นี้?')){
                              await deleteDoc(doc(db, 'trials', trial.id));
                              setTrials(trials.filter(t => t.id !== trial.id));
                            }
                          }} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded-lg hover:bg-red-100">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    ))}
                    {trials.filter(t => t.partId === path.part?.id).length === 0 && (
                      <div className="p-8 text-center text-gray-400">
                        ยังไม่มีประวัติการ Trial สำหรับแม่พิมพ์นี้
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {view === 'trial_form' && formData && (
              <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-xl font-bold text-blue-900">บันทึกผล Trial แม่พิมพ์ ครั้งที่ #{formData.trialNo}</h2>
                  <div className="flex gap-3">
                    <button onClick={goBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">ยกเลิก</button>
                    <button onClick={async () => {
                      setIsSaving(true);
                      try {
                        await setDoc(doc(db, 'trials', formData.id), formData);
                        alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
                        setView('trials');
                      } catch(e) {
                        alert('เกิดข้อผิดพลาด: ' + e.message);
                      } finally {
                        setIsSaving(false);
                      }
                    }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow flex items-center gap-2">
                      <Save size={18}/> บันทึกข้อมูล
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">วันที่ทำการ Trial</label>
                    <input type="date" className="w-full border p-2 rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">สถานที่ Trial</label>
                    <select className="w-full border p-2 rounded font-semibold" value={formData.trialLocation} onChange={e => setFormData({...formData, trialLocation: e.target.value})}>
                      <option value="in_house">ภายในบริษัท (In-house)</option>
                      <option value="outsource">นอกสถานที่ (Outsource)</option>
                    </select>
                  </div>
                  {formData.trialLocation === 'outsource' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อบริษัทที่ไป Trial</label>
                      <input type="text" className="w-full border p-2 rounded" placeholder="ระบุชื่อบริษัท..." value={formData.outsourceCompany || ''} onChange={e => setFormData({...formData, outsourceCompany: e.target.value})} />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                   <h3 className="font-bold text-gray-800">รูปภาพหน้างานและสภาพแม่พิมพ์</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ImageUpload label="Setup ปิดพิมพ์" value={formData.images.setupClose} onChange={url => setFormData({...formData, images: {...formData.images, setupClose: url}})} onZoom={setZoomedImg} />
                      <ImageUpload label="Setup เปิดพิมพ์" value={formData.images.setupOpen} onChange={url => setFormData({...formData, images: {...formData.images, setupOpen: url}})} onZoom={setZoomedImg} />
                      <ImageUpload label="Cavity Side" value={formData.images.cav} onChange={url => setFormData({...formData, images: {...formData.images, cav: url}})} onZoom={setZoomedImg} />
                      <ImageUpload label="Core Side" value={formData.images.core} onChange={url => setFormData({...formData, images: {...formData.images, core: url}})} onZoom={setZoomedImg} />
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={goBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold">ยกเลิก</button>
                  <button onClick={async () => {
                    setIsSaving(true);
                    try {
                      await setDoc(doc(db, 'trials', formData.id), formData);
                      alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
                      setView('trials');
                    } catch(e) {
                      alert('เกิดข้อผิดพลาด: ' + e.message);
                    } finally {
                      setIsSaving(false);
                    }
                  }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow">
                    บันทึกข้อมูล
                  </button>
                </div>
              </div>
            )}
            {view === 'report' && formData && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 no-print">
                  <button onClick={goBack} className="p-2 border rounded-lg hover:bg-gray-100 flex items-center gap-1 text-sm font-semibold">
                    <ChevronLeft size={16}/> กลับหน้าหลัก
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleExportPNG('report-container', `Trial_Report_${formData.trialNo}`)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-2 shadow-sm">
                      <Download size={16}/> บันทึกเป็นรูปภาพ (PNG)
                    </button>
                    <button onClick={() => handleExportExcel('report-table-container', `Trial_Report_${formData.trialNo}`)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                      <Download size={16}/> ส่งออก Excel
                    </button>
                    <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                      <Printer size={16}/> พิมพ์รายงาน (PDF)
                    </button>
                  </div>
                </div>

                <div id="report-container" className="bg-white p-8 rounded-xl shadow-lg border max-w-4xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0">
                  <div className="border-b-2 border-blue-900 pb-4 flex justify-between items-center">
                    <div>
                      <h1 className="text-xl font-bold text-blue-900">WISDOM AUTOPARTS CO., LTD.</h1>
                      <p className="text-xs text-gray-500">PLASTIC INJECTION MOLD TRIAL REPORT</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-900">Trial No: #{formData.trialNo}</p>
                      <p className="text-xs text-gray-500">วันที่: {formatThaiDate(formData.date)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg border">
                    <div>
                      <p><strong>ลูกค้า:</strong> {path.client?.name}</p>
                      <p><strong>Model:</strong> {path.model?.name}</p>
                    </div>
                    <div>
                      <p className="whitespace-pre-line"><strong>Part Code/Name:</strong> {path.part?.code}</p>
                      <p><strong>สถานที่:</strong> {formData.trialLocation === 'in_house' ? 'ภายในบริษัท (In-house)' : `Outsource (${formData.outsourceCompany || '-'})`}</p>
                    </div>
                  </div>

                  <div id="report-table-container" className="space-y-4">
                     <h3 className="font-bold text-gray-800 text-sm border-b pb-1">เงื่อนไขการทดสอบและผลลัพธ์</h3>
                     <table className="print-table w-full border-collapse border border-gray-300 text-xs">
                        <thead>
                           <tr className="bg-gray-100 text-gray-700">
                              <th className="border p-2">เงื่อนไข (Condition)</th>
                              <th className="border p-2">Cycle Time</th>
                              <th className="border p-2">Gate Weight</th>
                              <th className="border p-2">ผลประเมิน (Customer)</th>
                           </tr>
                        </thead>
                        <tbody>
                           {(formData.conditions || []).map((cond, idx) => (
                              <tr key={cond.id || idx}>
                                 <td className="border p-2 font-bold">{cond.name}</td>
                                 <td className="border p-2 text-center">{cond.actCycleTime || '-'} s</td>
                                 <td className="border p-2 text-center">{cond.actGateWeight || '-'} g</td>
                                 <td className="border p-2 text-center font-semibold">
                                    {cond.customerResult === 'ok' ? '✅ ผ่าน (OK)' : cond.customerResult === 'ng' ? '❌ ไม่ผ่าน (NG)' : '⏳ รอพิจารณา'}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-8 border-t text-center text-xs">
                     {(formData.signatures || []).map((sig, idx) => (
                        <div key={sig.id || idx} className="space-y-4">
                           <p className="font-bold text-gray-700">{sig.role}</p>
                           <div className="h-12 border-b border-dashed border-gray-400"></div>
                           <p className="text-gray-500">({sig.name || '......................................'})</p>
                        </div>
                     ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {zoomedImg && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoomedImg(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={zoomedImg} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded" />
            <button onClick={() => setZoomedImg(null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
