// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Settings,
  Box,
  Activity,
  Camera,
  Plus,
  ChevronRight,
  ChevronLeft,
  Printer,
  Save,
  AlertCircle,
  Edit2,
  Trash2,
  Check,
  X,
  Image as ImageIcon,
  Scale,
  Clock,
  ClipboardCheck,
  ZoomIn,
  PlayCircle,
  Clock3,
  CheckCircle2,
  CalendarDays,
  Calendar as CalendarIcon,
  MapPin,
} from "lucide-react";

// === FIREBASE IMPORTS ===
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

// === FIREBASE CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyAw9msz9qZ3L011tHrAbQXAvppAvuMVbDg",
  authDomain: "wisdom-trial.firebaseapp.com",
  projectId: "wisdom-trial",
  storageBucket: "wisdom-trial.firebasestorage.app",
  messagingSenderId: "1082203023532",
  appId: "1:1082203023532:web:3d7acd991bd16e664e5709",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === ระบบบีบอัดรูปภาพก่อนส่งขึ้น Cloud ===
export const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.7));
    };
  };
};

const printStyles = `
  @page { size: A4 portrait; margin-top: 5mm; margin-bottom: 5mm; margin-left: 8mm; margin-right: 8mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
    .no-print { display: none !important; }
    #printable-area { font-family: 'Arial', sans-serif !important; width: 100%; display: block; }
    table.print-table { width: 100%; border-collapse: collapse; }
    thead.print-header { display: table-header-group; }
    tbody.print-body { display: table-row-group; }
    tr.print-row { page-break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; }
    .page-break-before { page-break-before: always; }
    .print-h1 { font-size: 14px !important; font-weight: bold !important; line-height: 1.2 !important; }
    .print-text { font-size: 11px !important; line-height: 1.4 !important; }
    .print-small { font-size: 9px !important; }
    .print-sign-name { font-size: 12px !important; }
    .print-sign-role { font-size: 10px !important; }
    .flex { display: flex !important; }
    .grid { display: grid !important; }
  }
`;

const formatThaiDate = (dateStr) => {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  return `${parts[2]}/${parts[1]}/${year}`;
};

// วันหยุดนักขัตฤกษ์
const PUBLIC_HOLIDAYS = [
  "2026-01-01",
  "2026-03-03",
  "2026-04-06",
  "2026-04-13",
  "2026-04-14",
  "2026-04-15",
  "2026-05-01",
  "2026-05-04",
  "2026-05-31",
  "2026-06-03",
  "2026-07-20",
  "2026-07-21",
  "2026-07-28",
  "2026-08-12",
  "2026-10-13",
  "2026-10-23",
  "2026-12-05",
  "2026-12-10",
  "2026-12-31",
];

const DEFECT_TYPES = [
  "Flash (รอยครีบ)",
  "Sink Mark (รอยยุบ)",
  "Short Shot (ฉีดไม่เต็ม)",
  "Flow Mark (รอยลายน้ำ)",
  "Silver Streak (รอยเงิน)",
  "Weld Line (รอยประสาน)",
  "Burn Mark (รอยไหม้)",
  "Warpage (บิดงอ)",
  "Color Difference (สีเพี้ยน)",
  "Scratch (รอยขีดข่วน)",
  "Other (อื่นๆ)",
];

const checkNgByTolerance = (act, std, plus, minus) => {
  if (act === "" || act === undefined || std === "" || std === undefined)
    return false;
  const a = parseFloat(act);
  const s = parseFloat(std);
  const p = parseFloat(plus || 0);
  const m = parseFloat(minus || 0);
  if (isNaN(a) || isNaN(s)) return false;
  return a < s - m || a > s + p;
};

const ActionButtons = ({
  id,
  onEdit,
  onDelete,
  isEditing,
  onSave,
  onCancel,
  confirmDeleteId,
  setConfirmDeleteId,
}) => {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          <Check size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          <X size={16} />
        </button>
      </div>
    );
  }
  if (confirmDeleteId === id) {
    return (
      <div className="flex gap-2 items-center">
        <span className="text-sm text-red-500 font-bold">ยืนยันลบ?</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          <Check size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDeleteId(null);
          }}
          className="p-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          <X size={16} />
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
      >
        <Edit2 size={18} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDeleteId(id);
        }}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
      >
        <Trash2 size={18} />
      </button>
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
    <div
      className={`border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:bg-gray-50 relative ${height} flex flex-col items-center justify-center bg-white group overflow-hidden`}
    >
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleFile}
        title={value ? "คลิกเพื่อเปลี่ยนรูป" : "คลิกเพื่อเพิ่มรูป"}
      />
      {value ? (
        <>
          <img src={value} alt="Preview" className="h-full object-contain" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onZoom(value);
            }}
            className="absolute top-1 left-1 bg-black/60 text-white p-1.5 rounded-lg z-20 hover:bg-blue-600 transition-colors shadow"
            title="ขยายรูป"
          >
            <ZoomIn size={16} />
          </button>
        </>
      ) : (
        <>
          <Camera className="w-5 h-5 text-gray-400 mb-1" />
          <span className="text-[10px] text-gray-500 leading-tight">
            {label}
          </span>
        </>
      )}
    </div>
  );
};

// --- Initial Mock Data ---
const initialClients = [{ id: 1, name: "TS TECH (THAILAND) CO., LTD." }];
const initialModels = [
  { id: 1, clientId: 1, name: "3DAA" },
  { id: 2, clientId: 1, name: "34AA" },
  { id: 3, clientId: 1, name: "P700" },
];
const initialSchedules = [
  {
    id: 1,
    date: "2026-07-02",
    time: "08:00",
    type: "trial",
    title: "INJ SHROUD COMP MMAA",
    detail: "WITH NEW BENDING JIG",
    reqMachineSent: true,
    prodApproved: false,
    planStatus: "on_time",
  },
  {
    id: 2,
    date: "2026-07-03",
    time: "13:00",
    type: "trial",
    title: "INJ ORDER MODEL 471",
    detail: "BRACKET 2 MOLD",
    reqMachineSent: true,
    prodApproved: true,
    planStatus: "on_time",
  },
];
const initialParts = [
  {
    id: 1,
    modelId: 1,
    code: "82333-3DA7-H010-M1-0000\n82733-3DA7-H010-M1-0000",
    name: "REC COVER R MID CUSH\nREC COVER L MID CUSH",
    material: "PP CP-WPIN (NH900L)",
    cavity: "1+1",
    components: "CSK JOB.701",
    img: "",
    cavities: [
      { id: 1, name: "R", std: "22", plus: "2", minus: "1" },
      { id: 2, name: "L", std: "22", plus: "2", minus: "1" },
    ],
    stdCycleTime: "75",
    stdCycleTimeTol: "5",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("projects");
  const [view, setView] = useState("clients");
  const [path, setPath] = useState({ client: null, model: null, part: null });
  const [zoomedImg, setZoomedImg] = useState(null);

  const [clients, setClients] = useState([]);
  const [models, setModels] = useState([]);
  const [parts, setParts] = useState([]);
  const [trials, setTrials] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [isBooking, setIsBooking] = useState(false);
  const getInitialBookingData = () => ({
    id: null,
    date: "",
    time: "",
    type: "trial",
    title: "",
    detail: "",
    clientId: "",
    partId: "",
    machine: "",
    requester: "",
    reqMachineSent: false,
    prodApproved: false,
    planStatus: "on_time",
    rescheduleReason: "",
  });
  const [bookingData, setBookingData] = useState(getInitialBookingData());

  const [addingId, setAddingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingTrialId, setEditingTrialId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [partInput, setPartInput] = useState({});
  const [formData, setFormData] = useState(null);
  const [selectedTrialIds, setSelectedTrialIds] = useState([]);

  // === ย้าย STATE ของปฏิทินมาไว้บนสุดตรงนี้ (แก้ Error) ===
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // === FIREBASE SYNC HOOK ===
  useEffect(() => {
    const initDB = async () => {
      const partsSnap = await getDocs(collection(db, "parts"));
      if (partsSnap.empty)
        initialParts.forEach((p) =>
          setDoc(doc(db, "parts", p.id.toString()), p)
        );
    };
    initDB();

    const unsubC = onSnapshot(doc(db, "wisdom", "clients"), (d) => {
      if (d.exists()) setClients(d.data().list);
      else setDoc(doc(db, "wisdom", "clients"), { list: initialClients });
    });
    const unsubM = onSnapshot(doc(db, "wisdom", "models"), (d) => {
      if (d.exists()) setModels(d.data().list);
      else setDoc(doc(db, "wisdom", "models"), { list: initialModels });
    });
    const unsubS = onSnapshot(doc(db, "wisdom", "schedules"), (d) => {
      if (d.exists()) setSchedules(d.data().list);
      else setDoc(doc(db, "wisdom", "schedules"), { list: initialSchedules });
    });

    const unsubP = onSnapshot(collection(db, "parts"), (snap) =>
      setParts(snap.docs.map((d) => d.data()))
    );
    const unsubT = onSnapshot(collection(db, "trials"), (snap) =>
      setTrials(snap.docs.map((d) => d.data()))
    );

    return () => {
      unsubC();
      unsubM();
      unsubS();
      unsubP();
      unsubT();
    };
  }, []);

  // === FIREBASE SAVING FUNCTIONS ===
  const updateClients = (newList) => {
    setClients(newList);
    setDoc(doc(db, "wisdom", "clients"), { list: newList });
  };
  const updateModels = (newList) => {
    setModels(newList);
    setDoc(doc(db, "wisdom", "models"), { list: newList });
  };
  const updateSchedules = (newList) => {
    setSchedules(newList);
    setDoc(doc(db, "wisdom", "schedules"), { list: newList });
  };

  const getInitialTrialData = () => ({
    date: new Date().toISOString().split("T")[0],
    images: {
      setupClose: null,
      setupOpen: null,
      cav: null,
      core: null,
      coreEjector: null,
      resin: null,
      machine: null,
      packing: null,
    },
    equipmentImages: [],
    monitorImages: [],
    atmosphereImages: [],
    meetingImages: [],
    partProblems: [],
    moldProblems: [],
    conditions: [
      {
        id: Date.now() + Math.random(),
        name: "Condition #1",
        actWeights: {},
        actCycleTime: "",
        note: "",
        customerResult: "pending",
      },
    ],
    goodParts: "",
    ngParts: "",
    reqModifyMold: false,
    reqRetrial: false,
    reqJig: false,
    makerAction: "",
    deliveryDate: "",
    nextTrialDate: "",
    limitSampleOk: false,
    remarks: "",
    signatures: [
      { id: 1, role: "PE", name: "" },
      { id: 2, role: "Tooling Maker", name: "" },
      { id: 3, role: "ลูกค้า (Customer)", name: "" },
    ],
    status: "draft",
  });

  const resetForms = () => {
    setAddingId(null);
    setEditingId(null);
    setConfirmDeleteId(null);
    setInputValue("");
    setPartInput({});
    setEditingTrialId(null);
    setIsBooking(false);
  };

  const goBack = () => {
    resetForms();
    if (view === "models") setView("clients");
    if (view === "parts") setView("models");
    if (view === "trials") setView("parts");
    if (view === "report" || view === "trial_form") setView("trials");
  };

  const CalendarView = () => {
    const monthNamesThai = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];

    const handlePrevMonth = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    };

    const handleNextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    };

    const handleSaveBooking = () => {
      if (!bookingData.date || !bookingData.title)
        return alert("กรุณาใส่วันที่และหัวข้องาน");
      if (bookingData.id) {
        updateSchedules(
          schedules.map((s) =>
            s.id === bookingData.id ? { ...bookingData } : s
          )
        );
      } else {
        updateSchedules([...schedules, { id: Date.now(), ...bookingData }]);
      }
      setIsBooking(false);
      setBookingData(getInitialBookingData());
    };

    const handleDeleteBooking = (id) => {
      if (window.confirm("ยืนยันการลบรายการนัดหมายนี้ใช่หรือไม่?")) {
        updateSchedules(schedules.filter((s) => s.id !== id));
        setIsBooking(false);
        setBookingData(getInitialBookingData());
      }
    };

    const handleEditSchedule = (schedObj) => {
      setBookingData({ ...schedObj });
      setIsBooking(true);
      window.scrollTo(0, 0);
    };

    const getTypeLabel = (typeCode) => {
      switch (typeCode) {
        case "trial":
          return "Trial / งานฉีด";
        case "delivery":
          return "งานจัดส่ง (Delivery)";
        case "support":
          return "Support / Jig";
        case "meeting":
          return "นัดประชุม (Meeting)";
        default:
          return typeCode;
      }
    };

    const renderCalendarGrid = () => {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
      const todayStr = new Date().toISOString().split("T")[0];

      let blanks = [];
      for (let i = 0; i < firstDayOfMonth; i++)
        blanks.push(
          <div
            key={`blank-${i}`}
            className="bg-gray-100/50 border-r border-b p-1 min-h-[80px]"
          ></div>
        );

      let days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
          2,
          "0"
        )}-${String(d).padStart(2, "0")}`;
        const dayEvents = schedules.filter((s) => s.date === dateStr);

        const isPublicHoliday = PUBLIC_HOLIDAYS.includes(dateStr);
        const isSunday = new Date(currentYear, currentMonth, d).getDay() === 0;
        const isDayOff = isPublicHoliday || isSunday;
        const isToday = dateStr === todayStr;

        days.push(
          <div
            key={d}
            className={`border-r border-b p-1 min-h-[80px] md:min-h-[100px] flex flex-col group relative transition-colors ${
              isDayOff
                ? "bg-red-50 hover:bg-red-100"
                : "bg-white hover:bg-blue-50"
            }`}
          >
            <span
              className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                isToday
                  ? "bg-blue-600 text-white shadow-md"
                  : isDayOff
                  ? "text-red-600"
                  : "text-gray-700"
              }`}
            >
              {d}
            </span>
            <div className="flex-1 overflow-y-auto space-y-1">
              {dayEvents.map((ev) => {
                let colorClass = "bg-gray-100 text-gray-800 border-gray-300";
                if (ev.type === "trial")
                  colorClass = "bg-[#fff3c4] text-[#8c6d1f] border-[#fce988]";
                if (ev.type === "delivery")
                  colorClass = "bg-[#6bb5ff] text-white border-[#4d9cf0]";
                if (ev.type === "meeting")
                  colorClass = "bg-[#a3f0b6] text-[#2c7a3f] border-[#81e89b]";
                if (ev.type === "support")
                  colorClass = "bg-[#fc9c42] text-white border-[#eb892d]";

                return (
                  <div
                    key={ev.id}
                    className={`text-[9px] md:text-[10px] leading-tight p-1 rounded border shadow-sm truncate cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
                    onClick={() => handleEditSchedule(ev)}
                  >
                    <strong>
                      {ev.time ? `${ev.time} ` : ""}
                      {ev.title}
                    </strong>
                    {ev.detail && (
                      <span className="block opacity-80 truncate">
                        {ev.detail}
                      </span>
                    )}
                    {ev.type === "trial" && (
                      <div className="mt-0.5 space-y-0.5">
                        {ev.reqMachineSent && (
                          <span className="block text-[8px] text-blue-700 font-semibold">
                            ✓ ขอเครื่องแล้ว
                          </span>
                        )}
                        {ev.prodApproved && (
                          <span className="block text-[8px] text-green-700 font-semibold">
                            ✓ แผนอนุมัติ
                          </span>
                        )}
                        {ev.planStatus === "moved_up" && (
                          <span className="block text-[8px] text-blue-700 font-bold">
                            ☑ เลื่อนเข้า
                          </span>
                        )}
                        {ev.planStatus === "delayed" && (
                          <span className="block text-[8px] text-blue-700 font-bold">
                            ☑ เลื่อนออก
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                setBookingData({ ...getInitialBookingData(), date: dateStr });
                setIsBooking(true);
              }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-100 rounded p-0.5"
            >
              <Plus size={14} />
            </button>
          </div>
        );
      }

      return (
        <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white mb-6">
          <div className="grid grid-cols-7 bg-[#2b4c9b] text-white text-center text-[10px] md:text-xs font-bold divide-x divide-gray-400">
            <div className="py-2 bg-[#d63434]">อาทิตย์</div>
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
      );
    };

    // กรองรายการนัดหมายเฉพาะเดือนที่กำลังดูอยู่
    const currentMonthSchedules = [...schedules]
      .filter((s) => {
        if (!s.date) return false;
        const [y, m] = s.date.split("-");
        return parseInt(y) === currentYear && parseInt(m) === currentMonth + 1;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (isBooking) {
      return (
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200 mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-start mb-4 border-b pb-2">
            <div>
              <h2 className="text-xl font-bold text-blue-900 flex items-center">
                <CalendarDays className="mr-2" />
                {bookingData.id
                  ? "แก้ไขนัดหมาย / จองคิวงาน"
                  : "เพิ่มตารางนัดหมาย / จองคิวงาน"}
              </h2>
              <p className="text-xs font-semibold text-gray-500 mt-1">
                วันที่ทำรายการ:{" "}
                {formatThaiDate(new Date().toISOString().split("T")[0])}
              </p>
            </div>
            <button
              onClick={() => {
                setIsBooking(false);
                setBookingData(getInitialBookingData());
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  วันที่ต้องการจอง
                </label>
                <input
                  type="date"
                  className="w-full border p-2 rounded focus:ring-2 outline-none"
                  value={bookingData.date}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  เวลา (Time)
                </label>
                <input
                  type="time"
                  className="w-full border p-2 rounded focus:ring-2 outline-none"
                  value={bookingData.time}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, time: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ประเภทงาน (Event Type)
                </label>
                <select
                  className="w-full border p-2 rounded focus:ring-2 outline-none font-semibold"
                  value={bookingData.type}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, type: e.target.value })
                  }
                >
                  <option value="trial">🟡 งานฉีด / Trial แม่พิมพ์</option>
                  <option value="delivery">🔵 งานจัดส่ง (Delivery)</option>
                  <option value="support">
                    🟠 งานซ่อม / Support / จัดทำ Jig
                  </option>
                  <option value="meeting">🟢 นัดประชุม (Meeting)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                หัวข้องานสั้นๆ (Title)
              </label>
              <input
                type="text"
                className="w-full border p-2 rounded focus:ring-2 outline-none"
                placeholder="เช่น INJ SHROUD COMP..."
                value={bookingData.title}
                onChange={(e) =>
                  setBookingData({ ...bookingData, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                รายละเอียดเพิ่มเติม / หมายเหตุ
              </label>
              <input
                type="text"
                className="w-full border p-2 rounded focus:ring-2 outline-none"
                placeholder="เช่น Test ประกอบที่ TRAD, จัดทำ Jig ให้เสร็จ..."
                value={bookingData.detail}
                onChange={(e) =>
                  setBookingData({ ...bookingData, detail: e.target.value })
                }
              />
            </div>

            {bookingData.type === "trial" && (
              <>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      เลือกลูกค้า
                    </label>
                    <select
                      className="w-full border p-1.5 rounded focus:ring-2 outline-none text-sm"
                      value={bookingData.clientId}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          clientId: Number(e.target.value),
                          partId: "",
                        })
                      }
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {bookingData.clientId && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        เลือกแม่พิมพ์
                      </label>
                      <select
                        className="w-full border p-1.5 rounded focus:ring-2 outline-none text-sm"
                        value={bookingData.partId}
                        onChange={(e) =>
                          setBookingData({
                            ...bookingData,
                            partId: Number(e.target.value),
                          })
                        }
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        {parts
                          .filter(
                            (p) =>
                              models.find((m) => m.id === p.modelId)
                                ?.clientId === bookingData.clientId
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code.split("\n")[0]}
                              {p.code.includes("\n") ? "..." : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      เครื่องจักร
                    </label>
                    <input
                      type="text"
                      className="w-full border p-1.5 rounded outline-none text-sm"
                      placeholder="เช่น MC-250T"
                      value={bookingData.machine}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          machine: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ผู้จอง (PE)
                    </label>
                    <input
                      type="text"
                      className="w-full border p-1.5 rounded outline-none text-sm"
                      placeholder="ชื่อ..."
                      value={bookingData.requester}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          requester: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-4 space-y-4 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-800 border-b border-gray-300 pb-1">
                    สถานะการเตรียม Trial (Preparation Status)
                  </h4>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-semibold hover:text-blue-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded"
                        checked={bookingData.reqMachineSent}
                        onChange={(e) =>
                          setBookingData({
                            ...bookingData,
                            reqMachineSent: e.target.checked,
                          })
                        }
                      />
                      ส่งใบขอใช้เครื่องจักรแล้ว
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-semibold hover:text-blue-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded"
                        checked={bookingData.prodApproved}
                        onChange={(e) =>
                          setBookingData({
                            ...bookingData,
                            prodApproved: e.target.checked,
                          })
                        }
                      />
                      โปรดักชั่นอนุมัติแผน
                    </label>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      การปรับเลื่อนแผน (Reschedule)
                    </label>
                    <div className="flex flex-wrap gap-4 mb-3">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer font-semibold text-gray-600">
                        <input
                          type="radio"
                          name="planStatus"
                          checked={bookingData.planStatus === "on_time"}
                          onChange={() =>
                            setBookingData({
                              ...bookingData,
                              planStatus: "on_time",
                              rescheduleReason: "",
                            })
                          }
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />{" "}
                        ตามแผนเดิม
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer font-semibold text-orange-600">
                        <input
                          type="radio"
                          name="planStatus"
                          checked={bookingData.planStatus === "moved_up"}
                          onChange={() =>
                            setBookingData({
                              ...bookingData,
                              planStatus: "moved_up",
                            })
                          }
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />{" "}
                        เลื่อนเข้า (เร็วขึ้น)
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer font-semibold text-red-600">
                        <input
                          type="radio"
                          name="planStatus"
                          checked={bookingData.planStatus === "delayed"}
                          onChange={() =>
                            setBookingData({
                              ...bookingData,
                              planStatus: "delayed",
                            })
                          }
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />{" "}
                        เลื่อนออก (ล่าช้า)
                      </label>
                    </div>

                    {bookingData.planStatus !== "on_time" && (
                      <input
                        type="text"
                        className="w-full border p-2 rounded outline-none text-sm border-orange-300 focus:ring-2 focus:ring-orange-500 bg-orange-50 placeholder-orange-300"
                        placeholder="โปรดระบุเหตุผลการเลื่อนแผน (เช่น รอเม็ดพลาสติก, เครื่องจักรเสีย)..."
                        value={bookingData.rescheduleReason}
                        onChange={(e) =>
                          setBookingData({
                            ...bookingData,
                            rescheduleReason: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end items-center gap-2 mt-6">
            {bookingData.id && (
              <button
                onClick={() => handleDeleteBooking(bookingData.id)}
                className="mr-auto px-4 py-2 border border-red-500 text-red-600 rounded hover:bg-red-50 font-semibold flex items-center"
              >
                <Trash2 size={16} className="mr-1" /> ลบรายการนี้
              </button>
            )}
            <button
              onClick={() => {
                setIsBooking(false);
                setBookingData(getInitialBookingData());
              }}
              className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveBooking}
              className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-bold"
            >
              {bookingData.id ? "อัปเดตข้อมูล" : "บันทึกตารางงาน"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-2">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold flex items-center text-gray-800">
                <CalendarIcon className="mr-2" /> ปฏิทินจองคิว
              </h2>

              <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={handlePrevMonth}
                  className="px-3 py-1.5 hover:bg-gray-100 border-r border-gray-300 text-gray-600 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-4 py-1.5 font-bold text-blue-900 min-w-[140px] text-center text-sm">
                  {monthNamesThai[currentMonth]} {currentYear + 543}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="px-3 py-1.5 hover:bg-gray-100 border-l border-gray-300 text-gray-600 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setBookingData(getInitialBookingData());
                setIsBooking(true);
              }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold shadow hover:bg-blue-700 flex items-center"
            >
              <Plus size={16} className="mr-1" /> เพิ่มงาน
            </button>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-600 mb-2">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-[#fff3c4] border border-[#fce988] rounded mr-1"></div>{" "}
              งานฉีด / Trial
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-[#6bb5ff] rounded mr-1"></div>{" "}
              งานจัดส่ง (Delivery)
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-[#fc9c42] rounded mr-1"></div> Support
              / Jig
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-[#a3f0b6] rounded mr-1"></div>{" "}
              นัดประชุม (Meeting)
            </span>
            <span className="flex items-center ml-2 text-red-600">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded mr-1"></div>{" "}
              วันหยุดนักขัตฤกษ์ / วันอาทิตย์
            </span>
          </div>

          {renderCalendarGrid()}

          <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex bg-gray-50 p-4 border-b border-gray-200 items-center justify-between">
              <h3 className="font-bold text-gray-700 flex items-center">
                <CalendarDays size={18} className="mr-2 text-blue-600" />
                รายการนัดหมายประจำเดือน {monthNamesThai[currentMonth]}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center w-28">วันที่</th>
                    <th className="px-4 py-3 text-center w-24">เวลา</th>
                    <th className="px-4 py-3 text-center w-36">ประเภท</th>
                    <th className="px-4 py-3">หัวข้องาน (Title)</th>
                    <th className="px-4 py-3 min-w-[250px]">
                      รายละเอียด / หมายเหตุ
                    </th>
                    <th className="px-4 py-3 text-center w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 divide-y divide-gray-100">
                  {currentMonthSchedules.map((s, i) => {
                    let extraDetails = [];
                    if (s.type === "trial") {
                      const clientName = clients.find(
                        (c) => c.id === s.clientId
                      )?.name;
                      const partObj = parts.find((p) => p.id === s.partId);
                      const partCode = partObj
                        ? partObj.code.split("\n")[0]
                        : null;

                      if (clientName) extraDetails.push(clientName);
                      if (partCode) extraDetails.push(`Mold: ${partCode}`);
                      if (s.machine) extraDetails.push(`M/C: ${s.machine}`);
                      if (s.requester) extraDetails.push(`PE: ${s.requester}`);
                    }

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-blue-50 transition-colors bg-white"
                      >
                        <td className="px-4 py-3 text-center font-semibold text-blue-800">
                          {formatThaiDate(s.date)}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {s.time || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              s.type === "trial"
                                ? "bg-yellow-100 text-yellow-800"
                                : s.type === "delivery"
                                ? "bg-blue-100 text-blue-800"
                                : s.type === "meeting"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {getTypeLabel(s.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-800">
                          {s.title}
                        </td>
                        <td className="px-4 py-3 whitespace-normal">
                          <div className="text-gray-600 leading-tight">
                            {s.detail || (extraDetails.length === 0 ? "-" : "")}
                          </div>
                          {extraDetails.length > 0 && (
                            <div className="text-[10px] text-blue-600 font-semibold mt-1 leading-tight">
                              {extraDetails.join(" • ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditSchedule(s)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(s.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {currentMonthSchedules.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-8 text-gray-500"
                      >
                        ไม่มีข้อมูลนัดหมายในเดือนนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ClientListView = () => {
    return (
      <div className="space-y-6">
        <div className="border-b-4 border-blue-200 pb-4 mb-6">
          <h2 className="text-xl font-bold flex items-center text-blue-900">
            <FolderKanban className="mr-2" /> โครงการแบ่งตามลูกค้า (Clients)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            เลือกชื่อลูกค้าเพื่อจัดการแม่พิมพ์และบันทึกประวัติการ Trial
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-xl shadow border-2 border-transparent flex justify-between items-center group hover:border-blue-300 transition-colors"
            >
              {editingId === c.id ? (
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="border-b-2 border-blue-500 outline-none flex-grow mr-4 px-2 py-1"
                />
              ) : (
                <div
                  className="font-semibold text-gray-700 flex-grow cursor-pointer py-2 flex items-center text-lg"
                  onClick={() => {
                    resetForms();
                    setPath({ ...path, client: c });
                    setView("models");
                  }}
                >
                  {c.name}{" "}
                  <ChevronRight
                    className="ml-2 text-gray-300 group-hover:text-blue-500"
                    size={20}
                  />
                </div>
              )}
              <ActionButtons
                id={c.id}
                isEditing={editingId === c.id}
                onEdit={() => {
                  setEditingId(c.id);
                  setInputValue(c.name);
                }}
                onSave={() => {
                  updateClients(
                    clients.map((item) =>
                      item.id === c.id ? { ...item, name: inputValue } : item
                    )
                  );
                  resetForms();
                }}
                onCancel={resetForms}
                onDelete={() => {
                  updateClients(clients.filter((item) => item.id !== c.id));
                  resetForms();
                }}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
              />
            </div>
          ))}
          {addingId === "client" ? (
            <div className="bg-blue-50 p-4 rounded-xl shadow border-2 border-blue-300 flex justify-between items-center">
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bg-white border rounded px-3 py-2 flex-grow mr-4 outline-none"
                placeholder="ชื่อลูกค้าใหม่..."
              />
              <button
                onClick={() => {
                  if (inputValue.trim())
                    updateClients([
                      ...clients,
                      { id: Date.now(), name: inputValue },
                    ]);
                  resetForms();
                }}
                className="p-2 bg-blue-600 text-white rounded mr-2"
              >
                <Check size={20} />
              </button>
              <button
                onClick={resetForms}
                className="p-2 bg-gray-300 text-gray-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                resetForms();
                setAddingId("client");
                setInputValue("");
              }}
              className="bg-gray-50 p-4 rounded-xl shadow border-2 border-dashed border-gray-300 text-gray-500 flex justify-center items-center cursor-pointer hover:bg-gray-100 hover:text-blue-600"
            >
              <Plus className="mr-2" /> เพิ่มลูกค้าใหม่
            </div>
          )}
        </div>
      </div>
    );
  };

  const ModelsView = () => {
    const clientModels = models.filter((m) => m.clientId === path.client.id);
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <Settings className="mr-2" /> โมเดลของ: {path.client.name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientModels.map((m) => (
            <div
              key={m.id}
              className="bg-white p-4 rounded-xl shadow border-2 border-transparent flex justify-between items-center group"
            >
              {editingId === m.id ? (
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="border-b-2 border-blue-500 outline-none flex-grow mr-4 px-2 py-1"
                />
              ) : (
                <div
                  className="font-semibold text-gray-700 flex-grow cursor-pointer py-2 flex items-center"
                  onClick={() => {
                    resetForms();
                    setPath({ ...path, model: m });
                    setView("parts");
                  }}
                >
                  {m.name}{" "}
                  <ChevronRight className="ml-2 text-gray-300" size={18} />
                </div>
              )}
              <ActionButtons
                id={m.id}
                isEditing={editingId === m.id}
                onEdit={() => {
                  setEditingId(m.id);
                  setInputValue(m.name);
                }}
                onSave={() => {
                  updateModels(
                    models.map((item) =>
                      item.id === m.id ? { ...item, name: inputValue } : item
                    )
                  );
                  resetForms();
                }}
                onCancel={resetForms}
                onDelete={() => {
                  updateModels(models.filter((item) => item.id !== m.id));
                  resetForms();
                }}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
              />
            </div>
          ))}
          {addingId === "model" ? (
            <div className="bg-blue-50 p-4 rounded-xl shadow border-2 border-blue-300 flex justify-between items-center">
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bg-white border rounded px-3 py-2 flex-grow mr-4 outline-none"
                placeholder="ชื่อโมเดลใหม่..."
              />
              <button
                onClick={() => {
                  if (inputValue.trim())
                    updateModels([
                      ...models,
                      {
                        id: Date.now(),
                        clientId: path.client.id,
                        name: inputValue,
                      },
                    ]);
                  resetForms();
                }}
                className="p-2 bg-blue-600 text-white rounded mr-2"
              >
                <Check size={20} />
              </button>
              <button
                onClick={resetForms}
                className="p-2 bg-gray-300 text-gray-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                resetForms();
                setAddingId("model");
                setInputValue("");
              }}
              className="bg-gray-50 p-4 rounded-xl shadow border-2 border-dashed border-gray-300 text-gray-500 flex justify-center items-center cursor-pointer hover:bg-gray-100 hover:text-blue-600"
            >
              <Plus className="mr-2" /> เพิ่มโมเดลใหม่
            </div>
          )}
        </div>
      </div>
    );
  };

  const PartsView = () => {
    const modelParts = parts.filter((p) => p.modelId === path.model.id);

    const handleSavePart = () => {
      const safePartInput = {
        ...partInput,
        cavities:
          partInput.cavities && partInput.cavities.length > 0
            ? partInput.cavities
            : [
                {
                  id: Date.now(),
                  name: "Cavity 1",
                  std: "",
                  plus: "",
                  minus: "",
                },
              ],
      };
      const partToSave = {
        id: editingId || Date.now(),
        modelId: path.model.id,
        ...safePartInput,
      };
      setDoc(doc(db, "parts", partToSave.id.toString()), partToSave);
      resetForms();
    };

    const handleDeletePart = (id) => {
      deleteDoc(doc(db, "parts", id.toString()));
      resetForms();
    };

    const PartForm = () => {
      if (!partInput.cavities) {
        partInput.cavities = [
          { id: Date.now(), name: "Cavity 1", std: "", plus: "", minus: "" },
        ];
      }

      const addCavity = () => {
        setPartInput({
          ...partInput,
          cavities: [
            ...partInput.cavities,
            {
              id: Date.now() + Math.random(),
              name: `Cavity ${partInput.cavities.length + 1}`,
              std: "",
              plus: "",
              minus: "",
            },
          ],
        });
      };

      const updateCavity = (id, field, value) => {
        setPartInput({
          ...partInput,
          cavities: partInput.cavities.map((c) =>
            c.id === id ? { ...c, [field]: value } : c
          ),
        });
      };

      const removeCavity = (id) => {
        setPartInput({
          ...partInput,
          cavities: partInput.cavities.filter((c) => c.id !== id),
        });
      };

      return (
        <div className="bg-blue-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 col-span-1 md:col-span-2">
          <h3 className="font-bold text-blue-800 mb-4">
            {editingId ? "แก้ไขข้อมูลแม่พิมพ์" : "เพิ่มแม่พิมพ์ใหม่"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <textarea
                rows="2"
                placeholder="รหัสชิ้นงาน (Part No.) - สามารถกด Enter ใส่หลายเบอร์ได้"
                value={partInput.code || ""}
                className="w-full border px-3 py-2 rounded focus:ring-2 outline-none whitespace-pre-wrap resize-y bg-white"
                onChange={(e) =>
                  setPartInput({ ...partInput, code: e.target.value })
                }
              />
              <textarea
                rows="2"
                placeholder="ชื่อชิ้นงาน (Part Name) - สามารถกด Enter ใส่หลายชื่อได้"
                value={partInput.name || ""}
                className="w-full border px-3 py-2 rounded focus:ring-2 outline-none whitespace-pre-wrap resize-y bg-white"
                onChange={(e) =>
                  setPartInput({ ...partInput, name: e.target.value })
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="พลาสติก/สี (Material/Color)"
                  value={partInput.material || ""}
                  className="border px-3 py-2 rounded bg-white outline-none focus:ring-2"
                  onChange={(e) =>
                    setPartInput({ ...partInput, material: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Cavity (เช่น 1+1)"
                  value={partInput.cavity || ""}
                  className="border px-3 py-2 rounded bg-white outline-none focus:ring-2"
                  onChange={(e) =>
                    setPartInput({ ...partInput, cavity: e.target.value })
                  }
                />
              </div>

              <div className="bg-white p-3 rounded border border-blue-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-blue-900">
                    กำหนดสเปกน้ำหนัก STD แยกตาม Cavity
                  </label>
                  <button
                    type="button"
                    onClick={addCavity}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200 flex items-center"
                  >
                    <Plus size={12} className="mr-1" /> เพิ่มช่อง
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(partInput.cavities || []).map((cav) => (
                    <div
                      key={cav.id}
                      className="p-2 bg-gray-50 rounded border relative group"
                    >
                      {(partInput.cavities || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCavity(cav.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hidden group-hover:block shadow-md"
                        >
                          <X size={12} />
                        </button>
                      )}

                      <input
                        type="text"
                        value={cav.name}
                        onChange={(e) =>
                          updateCavity(cav.id, "name", e.target.value)
                        }
                        className="text-xs font-bold text-gray-700 bg-transparent border-b border-gray-300 w-full mb-2 outline-none focus:border-blue-500"
                        placeholder="ชื่อช่อง (เช่น R, L, T1...)"
                      />
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="ค่ากลาง"
                          value={cav.std || ""}
                          className="border p-1 rounded text-xs text-center"
                          onChange={(e) =>
                            updateCavity(cav.id, "std", e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="0.001"
                          placeholder="+Tol"
                          value={cav.plus || ""}
                          className="border p-1 rounded text-xs text-center text-green-600 bg-green-50"
                          onChange={(e) =>
                            updateCavity(cav.id, "plus", e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="0.001"
                          placeholder="-Tol"
                          value={cav.minus || ""}
                          className="border p-1 rounded text-xs text-center text-red-600 bg-red-50"
                          onChange={(e) =>
                            updateCavity(cav.id, "minus", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-1">
                  <div className="relative flex-grow">
                    <input
                      type="number"
                      placeholder="STD C/T (s)"
                      value={partInput.stdCycleTime || ""}
                      className="w-full border px-3 py-2 rounded pl-8 bg-white"
                      onChange={(e) =>
                        setPartInput({
                          ...partInput,
                          stdCycleTime: e.target.value,
                        })
                      }
                    />
                    <Clock className="absolute left-2 top-2.5 text-gray-400 w-4 h-4" />
                  </div>
                  <span className="text-gray-500 font-bold px-1">±</span>
                  <input
                    type="number"
                    placeholder="Tol."
                    value={partInput.stdCycleTimeTol || ""}
                    className="w-16 border px-2 py-2 rounded text-center bg-white"
                    onChange={(e) =>
                      setPartInput({
                        ...partInput,
                        stdCycleTimeTol: e.target.value,
                      })
                    }
                  />
                </div>
                <input
                  type="text"
                  placeholder="Tooling Maker / Other"
                  value={partInput.components || ""}
                  className="border px-3 py-2 rounded bg-white outline-none focus:ring-2"
                  onChange={(e) =>
                    setPartInput({ ...partInput, components: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white relative min-h-[160px]">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    compressImage(e.target.files[0], (base64) =>
                      setPartInput({ ...partInput, img: base64 })
                    );
                  }
                }}
              />
              {partInput.img ? (
                <img
                  src={partInput.img}
                  alt="3D"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">เพิ่มรูปแม่พิมพ์ 3D</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={resetForms}
              className="px-4 py-2 bg-white border text-gray-600 rounded shadow-sm hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSavePart}
              className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
            >
              บันทึก
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <Box className="mr-2" /> แม่พิมพ์ของโมเดล: {path.model.name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelParts.map((p) =>
            editingId === p.id ? (
              <React.Fragment key={p.id}>{PartForm()}</React.Fragment>
            ) : (
              <div
                key={p.id}
                className="bg-white p-4 rounded-xl shadow border-2 border-transparent relative group"
              >
                <div
                  className="cursor-pointer flex justify-between h-full"
                  onClick={() => {
                    resetForms();
                    setPath({ ...path, part: p });
                    setView("trials");
                  }}
                >
                  <div className="w-2/3 pr-2">
                    <div className="font-bold text-sm md:text-base text-blue-800 mb-2 whitespace-pre-wrap">
                      {p.code}
                    </div>
                    <div className="text-gray-600 text-xs md:text-sm space-y-1">
                      <p className="whitespace-pre-wrap">
                        <strong>ชื่อ:</strong>
                        <br />
                        {p.name}
                      </p>
                      <p className="truncate mt-1">
                        <strong>MAT:</strong> {p.material}
                      </p>

                      <div className="bg-gray-50 p-1.5 rounded border text-[11px] space-y-0.5 mt-1">
                        {p.cavities && p.cavities.length > 0 ? (
                          p.cavities.map((c) => (
                            <p
                              key={c.id}
                              className="text-green-800 font-semibold"
                            >
                              W(STD) {c.name}: {c.std}{" "}
                              {c.plus ? `+${c.plus}` : ""}
                              {c.minus ? `/-${c.minus}` : ""} g
                            </p>
                          ))
                        ) : (
                          <p className="text-gray-500">W(STD): ไม่ได้ระบุ</p>
                        )}
                        <p className="text-orange-700 pt-1">
                          <strong>C/T(STD):</strong> {p.stdCycleTime}±
                          {p.stdCycleTimeTol || 0} s
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-1/3 flex items-center justify-center border rounded bg-gray-50 h-24 mt-2 relative">
                    {p.img ? (
                      <>
                        <img
                          src={p.img}
                          alt="Part"
                          className="max-h-full max-w-full object-contain p-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImg(p.img);
                          }}
                        />
                        <div className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded pointer-events-none hidden md:block">
                          <ZoomIn size={12} />
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-300 text-xs">ไม่มีรูป</div>
                    )}
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-lg">
                  <ActionButtons
                    id={p.id}
                    isEditing={false}
                    onEdit={() => {
                      setEditingId(p.id);
                      setPartInput(p);
                    }}
                    onDelete={() => handleDeletePart(p.id)}
                    onSave={() => {}}
                    onCancel={() => {}}
                    confirmDeleteId={confirmDeleteId}
                    setConfirmDeleteId={setConfirmDeleteId}
                  />
                </div>
              </div>
            )
          )}
          {addingId === "part" ? (
            PartForm()
          ) : (
            <div
              onClick={() => {
                resetForms();
                setAddingId("part");
                setPartInput({});
              }}
              className="bg-gray-50 p-4 rounded-xl shadow border-2 border-dashed border-gray-300 text-gray-500 flex justify-center items-center cursor-pointer hover:bg-gray-100 hover:text-blue-600 min-h-[150px]"
            >
              <Plus className="mr-2" /> เพิ่มแม่พิมพ์ใหม่
            </div>
          )}
        </div>
      </div>
    );
  };

  const TrialsView = () => {
    const partTrials = trials.filter((t) => t.partId === path.part.id);
    const headerTitleCode = path.part.code.split("\n")[0];

    const handleDeleteTrial = (id) => {
      deleteDoc(doc(db, "trials", id.toString()));
      setConfirmDeleteId(null);
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-xl font-bold flex items-center">
            <Activity className="mr-2" /> ประวัติ Trial: {headerTitleCode}
            {path.part.code.includes("\n") ? "..." : ""}
          </h2>
          <button
            onClick={() => {
              const allPartTrials = trials.filter(
                (t) => t.partId === path.part.id
              );
              setSelectedTrialIds(allPartTrials.map((t) => t.id));
              setView("report");
            }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center shadow hover:bg-gray-900"
          >
            <Printer className="w-4 h-4 mr-2" /> ดู Report รวม
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {partTrials.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
              ยังไม่มีประวัติการ Trial สำหรับแม่พิมพ์นี้
            </div>
          ) : (
            partTrials.map((t, index) => {
              const selectedCond =
                t.conditions?.find(
                  (c) =>
                    c.customerResult === "ok" ||
                    c.customerResult === "temporary"
                ) || t.conditions?.[0];

              return (
                <div
                  key={t.id}
                  className="bg-white p-4 rounded-xl shadow border border-gray-100 relative group flex flex-col md:flex-row gap-4"
                >
                  <div className="md:w-3/4">
                    <div className="flex items-center mb-3 border-b pb-2 flex-wrap gap-1">
                      <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm mr-2">
                        Trial #{t.trialNo}
                      </span>

                      {t.status === "completed" ? (
                        <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold mr-2 flex items-center">
                          <CheckCircle2 size={12} className="mr-1" /> เสร็จสิ้น
                        </span>
                      ) : t.status === "pending_customer" ? (
                        <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-bold mr-2 flex items-center animate-pulse">
                          <Clock3 size={12} className="mr-1" /> รอผลจากลูกค้า
                        </span>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-bold mr-2 flex items-center">
                          <PlayCircle size={12} className="mr-1" />{" "}
                          กำลังดำเนินการ
                        </span>
                      )}

                      <span className="text-gray-500 text-sm">
                        วันที่: {formatThaiDate(t.date)}
                      </span>
                      <span className="ml-auto text-sm text-gray-500">
                        PE:{" "}
                        {t.signatures && t.signatures.length > 0
                          ? t.signatures[0].name
                          : "-"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-2 bg-gray-50 p-2 rounded">
                      <div className="space-y-0.5">
                        {(path.part.cavities || []).map((cav) => {
                          const actVal =
                            selectedCond?.actWeights?.[cav.id] || "";
                          const isNg = checkNgByTolerance(
                            actVal,
                            cav.std,
                            cav.plus,
                            cav.minus
                          );
                          return (
                            <p
                              key={cav.id}
                              className={
                                isNg
                                  ? "text-red-600 font-bold"
                                  : "text-green-600 font-semibold"
                              }
                            >
                              <strong>{cav.name} ACT:</strong> {actVal || "-"} g
                            </p>
                          );
                        })}
                      </div>

                      <div
                        className={
                          checkNgByTolerance(
                            selectedCond?.actCycleTime,
                            path.part.stdCycleTime,
                            path.part.stdCycleTimeTol,
                            path.part.stdCycleTimeTol
                          )
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        <strong>C/T ACT:</strong>{" "}
                        {selectedCond?.actCycleTime || "-"} sec
                      </div>
                    </div>

                    <div className="text-sm bg-red-50/50 p-2 rounded border border-red-100 mt-2">
                      <strong className="text-red-600">ปัญหาที่พบ:</strong>
                      {t.partProblems.length === 0 &&
                      t.moldProblems.length === 0 ? (
                        <span className="text-gray-500 ml-2">- ไม่มี -</span>
                      ) : (
                        <div className="mt-1 ml-2 space-y-1">
                          {t.partProblems.length > 0 && (
                            <div className="text-red-700">
                              <span className="font-semibold text-gray-700">
                                ชิ้นงาน ({t.partProblems.length}):
                              </span>{" "}
                              {t.partProblems.map((p) => p.defect).join(", ")}
                            </div>
                          )}
                          {t.moldProblems.length > 0 && (
                            <div className="text-orange-700">
                              <span className="font-semibold text-gray-700">
                                แม่พิมพ์ ({t.moldProblems.length}):
                              </span>{" "}
                              {t.moldProblems
                                .map((p) => p.note || "ดูรูปภาพอ้างอิง")
                                .join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <ActionButtons
                      id={t.id}
                      isEditing={false}
                      onEdit={() => {
                        setEditingTrialId(t.id);
                        setFormData(JSON.parse(JSON.stringify(t)));
                        setView("trial_form");
                      }}
                      onDelete={() => handleDeleteTrial(t.id)}
                      confirmDeleteId={confirmDeleteId}
                      setConfirmDeleteId={setConfirmDeleteId}
                    />
                  </div>
                </div>
              );
            })
          )}
          <button
            onClick={() => {
              setEditingTrialId(null);
              setFormData(getInitialTrialData());
              setView("trial_form");
            }}
            className="w-full bg-blue-600 text-white p-4 rounded-xl shadow font-bold flex justify-center items-center hover:bg-blue-700"
          >
            <Plus className="mr-2" /> บันทึกการ Trial ครั้งใหม่ (Trial #
            {partTrials.length + 1})
          </button>
        </div>
      </div>
    );
  };

  const TrialForm = () => {
    if (!formData) return null;

    const partTrials = trials.filter((t) => t.partId === path.part.id);
    const isEditing = !!editingTrialId;
    const currentTrialNo = isEditing ? formData.trialNo : partTrials.length + 1;

    const handleSave = (statusType) => {
      const finalData = { ...formData, status: statusType };
      const trialToSave = {
        id: editingTrialId || Date.now(),
        partId: path.part.id,
        trialNo: currentTrialNo,
        ...finalData,
      };
      setDoc(doc(db, "trials", trialToSave.id.toString()), trialToSave);
      setView("trials");
      setEditingTrialId(null);
    };

    const addProblem = (type) => {
      const newProblem = {
        id: Date.now() + Math.random(),
        img: null,
        note: "",
        cause: "",
        fix: "",
        status: "",
      };
      if (type === "part")
        setFormData({
          ...formData,
          partProblems: [
            ...formData.partProblems,
            { ...newProblem, defect: "Flash (รอยครีบ)" },
          ],
        });
      if (type === "mold")
        setFormData({
          ...formData,
          moldProblems: [...formData.moldProblems, newProblem],
        });
    };

    const updateProblem = (type, id, field, value) => {
      if (type === "part")
        setFormData({
          ...formData,
          partProblems: formData.partProblems.map((p) =>
            p.id === id ? { ...p, [field]: value } : p
          ),
        });
      if (type === "mold")
        setFormData({
          ...formData,
          moldProblems: formData.moldProblems.map((p) =>
            p.id === id ? { ...p, [field]: value } : p
          ),
        });
    };

    const addCondition = () => {
      const newCond = {
        id: Date.now() + Math.random(),
        name: `Condition #${formData.conditions.length + 1}`,
        actWeights: {},
        actCycleTime: "",
        note: "",
        customerResult: "pending",
      };
      setFormData({
        ...formData,
        conditions: [...formData.conditions, newCond],
      });
    };

    const updateCondition = (id, field, value) => {
      setFormData({
        ...formData,
        conditions: formData.conditions.map((c) =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      });
    };

    const updateActWeight = (condId, cavId, value) => {
      setFormData({
        ...formData,
        conditions: formData.conditions.map((c) => {
          if (c.id === condId) {
            return {
              ...c,
              actWeights: { ...(c.actWeights || {}), [cavId]: value },
            };
          }
          return c;
        }),
      });
    };

    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-28 text-sm md:text-base">
        <div className="bg-white p-4 rounded-xl shadow border-b-4 border-blue-500 sticky top-16 z-10">
          <h2 className="text-xl font-bold text-blue-900">
            {isEditing
              ? `แก้ไข Trial #${currentTrialNo}`
              : `บันทึก Trial #${currentTrialNo}`}
          </h2>
          <div className="text-gray-500 mt-1 flex flex-col md:flex-row justify-between">
            <span className="whitespace-pre-wrap font-semibold leading-tight">
              {path.part.code} <br className="hidden md:block" />{" "}
              {path.part.name}
            </span>
            <div className="font-semibold text-blue-600 mt-2 md:mt-0 text-right text-xs">
              {(path.part.cavities || []).map((cav) => (
                <span key={cav.id}>
                  STD {cav.name}: {cav.std} +{cav.plus || 0}/-{cav.minus || 0}g
                  <br />
                </span>
              ))}
              <span>
                C/T: {path.part.stdCycleTime}±{path.part.stdCycleTimeTol || 0}s
              </span>
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 bg-gray-100 p-2 rounded flex-1 flex items-center">
              <Camera className="mr-2" size={18} /> 1.
              รูปภาพอ้างอิงสภาพแวดล้อมและ Tooling
            </h3>
            <div className="ml-4">
              <label className="text-xs font-semibold text-gray-500 mr-2">
                วันที่ Trial:
              </label>
              <input
                type="date"
                className="border p-1 rounded text-sm outline-none focus:ring-1"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-blue-800 text-sm border-b pb-1">
              1.1 สภาพแม่พิมพ์ (Mold Setup)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <ImageUpload
                label="แม่พิมพ์ปิด"
                value={formData.images.setupClose}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, setupClose: url },
                  })
                }
                onZoom={setZoomedImg}
              />
              <ImageUpload
                label="แม่พิมพ์เปิด"
                value={formData.images.setupOpen}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, setupOpen: url },
                  })
                }
                onZoom={setZoomedImg}
              />
              <ImageUpload
                label="ฝั่ง Cavity"
                value={formData.images.cav}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, cav: url },
                  })
                }
                onZoom={setZoomedImg}
              />
              <ImageUpload
                label="ฝั่ง Core"
                value={formData.images.core}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, core: url },
                  })
                }
                onZoom={setZoomedImg}
              />
              <ImageUpload
                label="ฝั่ง Core (เช็คปลดงาน)"
                value={formData.images.coreEjector}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, coreEjector: url },
                  })
                }
                onZoom={setZoomedImg}
              />
            </div>

            <p className="font-semibold text-blue-800 text-sm border-b pb-1 mt-4">
              1.2 Material, Machine & Packing
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <ImageUpload
                label="กระสอบเม็ดพลาสติก"
                value={formData.images?.resin}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, resin: url },
                  })
                }
                onZoom={setZoomedImg}
              />
              <ImageUpload
                label="เครื่องจักร & ป้าย"
                value={formData.images?.machine}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, machine: url },
                  })
                }
                onZoom={setZoomedImg}
              />
              <ImageUpload
                label="Box / PACKING"
                value={formData.images?.packing}
                onChange={(url) =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, packing: url },
                  })
                }
                onZoom={setZoomedImg}
              />
            </div>

            <div className="flex justify-between items-center mt-4 border-b pb-1">
              <p className="font-semibold text-blue-800 text-sm">
                1.3 อุปกรณ์เสริม (เช่น Chiller, Hot Runner ฯลฯ)
              </p>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    equipmentImages: [
                      ...formData.equipmentImages,
                      { id: Date.now() + Math.random(), img: null, note: "" },
                    ],
                  })
                }
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
              >
                + เพิ่มรูปอุปกรณ์
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {formData.equipmentImages.map((eq) => (
                <div
                  key={eq.id}
                  className="border p-2 rounded bg-gray-50 flex flex-col relative group"
                >
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        equipmentImages: formData.equipmentImages.filter(
                          (i) => i.id !== eq.id
                        ),
                      })
                    }
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block"
                  >
                    <X size={12} />
                  </button>
                  <ImageUpload
                    label="รูปอุปกรณ์"
                    height="h-20"
                    value={eq.img}
                    onChange={(url) =>
                      setFormData({
                        ...formData,
                        equipmentImages: formData.equipmentImages.map((i) =>
                          i.id === eq.id ? { ...i, img: url } : i
                        ),
                      })
                    }
                    onZoom={setZoomedImg}
                  />
                  <input
                    type="text"
                    className="w-full text-xs p-1 border rounded mt-1"
                    placeholder="ระบุชื่ออุปกรณ์..."
                    value={eq.note}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        equipmentImages: formData.equipmentImages.map((i) =>
                          i.id === eq.id ? { ...i, note: e.target.value } : i
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 border-b pb-1">
              <p className="font-semibold text-blue-800 text-sm">
                1.4 บรรยากาศ (รูปผู้เข้าร่วมทดลอง)
              </p>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    atmosphereImages: [
                      ...formData.atmosphereImages,
                      { id: Date.now() + Math.random(), img: null },
                    ],
                  })
                }
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
              >
                + เพิ่มรูป
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {formData.atmosphereImages.map((imgObj) => (
                <div key={imgObj.id} className="relative group">
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        atmosphereImages: formData.atmosphereImages.filter(
                          (i) => i.id !== imgObj.id
                        ),
                      })
                    }
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block"
                  >
                    <X size={12} />
                  </button>
                  <ImageUpload
                    label="บรรยากาศ"
                    value={imgObj.img}
                    onChange={(url) =>
                      setFormData({
                        ...formData,
                        atmosphereImages: formData.atmosphereImages.map((i) =>
                          i.id === imgObj.id ? { ...i, img: url } : i
                        ),
                      })
                    }
                    onZoom={setZoomedImg}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 border-b pb-1">
              <p className="font-semibold text-blue-800 text-sm">
                1.5 Condition (หน้าจอมอนิเตอร์เครื่องฉีด)
              </p>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    monitorImages: [
                      ...formData.monitorImages,
                      { id: Date.now() + Math.random(), img: null, note: "" },
                    ],
                  })
                }
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
              >
                + เพิ่มจอ Monitor
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {formData.monitorImages.map((m) => (
                <div
                  key={m.id}
                  className="border p-2 rounded bg-gray-50 flex gap-2 relative group"
                >
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        monitorImages: formData.monitorImages.filter(
                          (i) => i.id !== m.id
                        ),
                      })
                    }
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block"
                  >
                    <X size={12} />
                  </button>
                  <div className="w-1/2">
                    <ImageUpload
                      label="หน้าจอ"
                      height="h-24"
                      value={m.img}
                      onChange={(url) =>
                        setFormData({
                          ...formData,
                          monitorImages: formData.monitorImages.map((i) =>
                            i.id === m.id ? { ...i, img: url } : i
                          ),
                        })
                      }
                      onZoom={setZoomedImg}
                    />
                  </div>
                  <div className="w-1/2">
                    <textarea
                      className="w-full h-full text-xs p-1 border rounded"
                      placeholder="ระบุหน้าจอ..."
                      value={m.note}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monitorImages: formData.monitorImages.map((i) =>
                            i.id === m.id ? { ...i, note: e.target.value } : i
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4 border border-red-200">
          <h3 className="font-bold text-red-800 bg-red-50 p-2 rounded flex items-center">
            <AlertCircle className="mr-2" size={18} /> 2. บันทึกปัญหาที่พบ
            (Troubleshooting)
          </h3>

          <div className="border border-red-100 rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-gray-700">
                ชิ้นงาน (Part Defect)
              </label>
              <button
                onClick={() => addProblem("part")}
                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
              >
                + เพิ่มรูปปัญหา
              </button>
            </div>
            <div className="space-y-3">
              {formData.partProblems.length === 0 && (
                <p className="text-xs text-gray-400 text-center">ไม่มีปัญหา</p>
              )}
              {formData.partProblems.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col md:flex-row gap-3 bg-red-50 p-3 rounded border border-red-100 relative"
                >
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        partProblems: formData.partProblems.filter(
                          (item) => item.id !== p.id
                        ),
                      })
                    }
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                  <div className="md:w-1/3">
                    <ImageUpload
                      label="รูป NG"
                      height="h-full min-h-[100px]"
                      value={p.img}
                      onChange={(url) =>
                        updateProblem("part", p.id, "img", url)
                      }
                      onZoom={setZoomedImg}
                    />
                  </div>
                  <div className="md:w-2/3 space-y-2">
                    <select
                      className="w-full border p-1.5 text-sm rounded bg-white text-red-700 font-semibold"
                      value={p.defect}
                      onChange={(e) =>
                        updateProblem("part", p.id, "defect", e.target.value)
                      }
                    >
                      {DEFECT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="w-full text-sm p-2 border rounded focus:ring-1"
                      rows="1"
                      placeholder="รายละเอียด/ตำแหน่ง..."
                      value={p.note || ""}
                      onChange={(e) =>
                        updateProblem("part", p.id, "note", e.target.value)
                      }
                    ></textarea>
                    <textarea
                      className="w-full text-sm p-2 border rounded focus:ring-1 bg-white"
                      rows="1"
                      placeholder="สาเหตุ (Cause)..."
                      value={p.cause || ""}
                      onChange={(e) =>
                        updateProblem("part", p.id, "cause", e.target.value)
                      }
                    ></textarea>
                    <textarea
                      className="w-full text-sm p-2 border rounded focus:ring-1 bg-white"
                      rows="1"
                      placeholder="การแก้ไข (Countermeasure)..."
                      value={p.fix || ""}
                      onChange={(e) =>
                        updateProblem("part", p.id, "fix", e.target.value)
                      }
                    ></textarea>

                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer text-gray-700">
                        <input
                          type="radio"
                          name={`part-status-${p.id}`}
                          className="w-4 h-4 text-blue-600"
                          checked={p.status === "OK"}
                          onChange={() =>
                            updateProblem("part", p.id, "status", "OK")
                          }
                        />{" "}
                        OK
                      </label>
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer text-gray-700">
                        <input
                          type="radio"
                          name={`part-status-${p.id}`}
                          className="w-4 h-4 text-red-600"
                          checked={p.status === "NG"}
                          onChange={() =>
                            updateProblem("part", p.id, "status", "NG")
                          }
                        />{" "}
                        NG
                      </label>
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer text-gray-700">
                        <input
                          type="radio"
                          name={`part-status-${p.id}`}
                          className="w-4 h-4 text-orange-500"
                          checked={p.status === "Temporary"}
                          onChange={() =>
                            updateProblem("part", p.id, "status", "Temporary")
                          }
                        />{" "}
                        Temporary
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-orange-100 rounded p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-gray-700">
                แม่พิมพ์ (Mold Defect)
              </label>
              <button
                onClick={() => addProblem("mold")}
                className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded"
              >
                + เพิ่มรูปปัญหา
              </button>
            </div>
            <div className="space-y-3">
              {formData.moldProblems.length === 0 && (
                <p className="text-xs text-gray-400 text-center">ไม่มีปัญหา</p>
              )}
              {formData.moldProblems.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col md:flex-row gap-3 bg-orange-50 p-3 rounded border border-orange-100 relative"
                >
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        moldProblems: formData.moldProblems.filter(
                          (item) => item.id !== p.id
                        ),
                      })
                    }
                    className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                  <div className="md:w-1/3">
                    <ImageUpload
                      label="รูป Mold NG"
                      height="h-full min-h-[100px]"
                      value={p.img}
                      onChange={(url) =>
                        updateProblem("mold", p.id, "img", url)
                      }
                      onZoom={setZoomedImg}
                    />
                  </div>
                  <div className="md:w-2/3 space-y-2">
                    <textarea
                      className="w-full text-sm p-2 border rounded focus:ring-1"
                      rows="1"
                      placeholder="รายละเอียด (เช่น สลักค้าง, น้ำรั่ว...)"
                      value={p.note || ""}
                      onChange={(e) =>
                        updateProblem("mold", p.id, "note", e.target.value)
                      }
                    ></textarea>
                    <textarea
                      className="w-full text-sm p-2 border rounded focus:ring-1 bg-white"
                      rows="1"
                      placeholder="สาเหตุ (Cause)..."
                      value={p.cause || ""}
                      onChange={(e) =>
                        updateProblem("mold", p.id, "cause", e.target.value)
                      }
                    ></textarea>
                    <textarea
                      className="w-full text-sm p-2 border rounded focus:ring-1 bg-white"
                      rows="1"
                      placeholder="การแก้ไข (Countermeasure)..."
                      value={p.fix || ""}
                      onChange={(e) =>
                        updateProblem("mold", p.id, "fix", e.target.value)
                      }
                    ></textarea>

                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer text-gray-700">
                        <input
                          type="radio"
                          name={`mold-status-${p.id}`}
                          className="w-4 h-4 text-blue-600"
                          checked={p.status === "OK"}
                          onChange={() =>
                            updateProblem("mold", p.id, "status", "OK")
                          }
                        />{" "}
                        OK
                      </label>
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer text-gray-700">
                        <input
                          type="radio"
                          name={`mold-status-${p.id}`}
                          className="w-4 h-4 text-red-600"
                          checked={p.status === "NG"}
                          onChange={() =>
                            updateProblem("mold", p.id, "status", "NG")
                          }
                        />{" "}
                        NG
                      </label>
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer text-gray-700">
                        <input
                          type="radio"
                          name={`mold-status-${p.id}`}
                          className="w-4 h-4 text-orange-500"
                          checked={p.status === "Temporary"}
                          onChange={() =>
                            updateProblem("mold", p.id, "status", "Temporary")
                          }
                        />{" "}
                        Temporary
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4 border border-green-200">
          <div className="flex justify-between items-center bg-green-50 p-2 rounded">
            <h3 className="font-bold text-green-800 flex items-center">
              <ClipboardCheck className="mr-2" size={18} /> 3. สรุปผล &
              Condition การผลิต
            </h3>
            <button
              onClick={addCondition}
              className="text-xs bg-green-600 text-white px-2.5 py-1 rounded shadow hover:bg-green-700 font-semibold"
            >
              + เพิ่ม Condition
            </button>
          </div>

          <div className="space-y-3">
            {formData.conditions.map((cond, idx) => {
              return (
                <div
                  key={cond.id}
                  className={`p-3 rounded-lg border-2 transition-all relative ${
                    ["ok", "temporary"].includes(cond.customerResult)
                      ? "border-green-500 bg-green-50/20 shadow-sm"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {formData.conditions.length > 1 && (
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          conditions: formData.conditions.filter(
                            (c) => c.id !== cond.id
                          ),
                        })
                      }
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <div className="flex items-center justify-between mb-2 pr-6 border-b pb-2">
                    <input
                      type="text"
                      className="font-bold text-blue-900 bg-transparent border-b border-dashed border-gray-400 focus:outline-none focus:border-blue-600 text-sm w-full"
                      value={cond.name}
                      onChange={(e) =>
                        updateCondition(cond.id, "name", e.target.value)
                      }
                      placeholder="ชื่อ Condition..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    {(path.part.cavities || []).map((cav) => {
                      const actVal = cond.actWeights?.[cav.id] || "";
                      const isNg = checkNgByTolerance(
                        actVal,
                        cav.std,
                        cav.plus,
                        cav.minus
                      );
                      return (
                        <div
                          key={cav.id}
                          className={`p-2 rounded border ${
                            isNg ? "bg-red-50 border-red-300" : "bg-white"
                          }`}
                        >
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            ACT. Weight {cav.name} (g)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            className={`w-full border p-1.5 text-sm rounded outline-none font-semibold ${
                              isNg
                                ? "text-red-600 border-red-400 bg-white"
                                : "text-gray-800"
                            }`}
                            value={actVal}
                            onChange={(e) =>
                              updateActWeight(cond.id, cav.id, e.target.value)
                            }
                            placeholder={`ค่าน้ำหนัก ${cav.name}...`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-2">
                    <label className="block text-[11px] font-semibold text-gray-600">
                      Actual Cycle Time (s)
                    </label>
                    <input
                      type="number"
                      className="w-full border p-1.5 text-sm rounded mt-0.5 bg-white outline-none focus:ring-2"
                      value={cond.actCycleTime || ""}
                      onChange={(e) =>
                        updateCondition(cond.id, "actCycleTime", e.target.value)
                      }
                      placeholder="ค่า Cycle Time จริง..."
                    />
                  </div>

                  <input
                    type="text"
                    className="w-full border p-1.5 text-xs rounded bg-white mb-3 outline-none focus:ring-2"
                    placeholder="เงื่อนไขปรับจูนเพิ่มเติม (เช่น Temp, Injection Speed...)"
                    value={cond.note || ""}
                    onChange={(e) =>
                      updateCondition(cond.id, "note", e.target.value)
                    }
                  />

                  <div className="bg-blue-50/50 p-2 rounded border border-blue-100">
                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      ผลการตรวจสอบจากลูกค้า (Customer Result):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <label
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer border ${
                          cond.customerResult === "pending"
                            ? "bg-white border-blue-400 font-bold text-blue-800 shadow-sm"
                            : "border-transparent text-gray-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`cond-res-${cond.id}`}
                          className="hidden"
                          checked={cond.customerResult === "pending"}
                          onChange={() =>
                            updateCondition(
                              cond.id,
                              "customerResult",
                              "pending"
                            )
                          }
                        />{" "}
                        ⚪ รอยืนยัน
                      </label>
                      <label
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer border ${
                          cond.customerResult === "ok"
                            ? "bg-green-100 border-green-500 font-bold text-green-800 shadow-sm"
                            : "border-transparent text-gray-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`cond-res-${cond.id}`}
                          className="hidden"
                          checked={cond.customerResult === "ok"}
                          onChange={() =>
                            updateCondition(cond.id, "customerResult", "ok")
                          }
                        />{" "}
                        🟢 ผ่าน (OK)
                      </label>
                      <label
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer border ${
                          cond.customerResult === "temporary"
                            ? "bg-orange-100 border-orange-500 font-bold text-orange-800 shadow-sm"
                            : "border-transparent text-gray-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`cond-res-${cond.id}`}
                          className="hidden"
                          checked={cond.customerResult === "temporary"}
                          onChange={() =>
                            updateCondition(
                              cond.id,
                              "customerResult",
                              "temporary"
                            )
                          }
                        />{" "}
                        🟡 ยอมรับชั่วคราว
                      </label>
                      <label
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer border ${
                          cond.customerResult === "ng"
                            ? "bg-red-100 border-red-500 font-bold text-red-800 shadow-sm"
                            : "border-transparent text-gray-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`cond-res-${cond.id}`}
                          className="hidden"
                          checked={cond.customerResult === "ng"}
                          onChange={() =>
                            updateCondition(cond.id, "customerResult", "ng")
                          }
                        />{" "}
                        🔴 ไม่ผ่าน (NG)
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs text-gray-600">
                งานดี (Good Parts)
              </label>
              <input
                type="number"
                className="w-full border p-2 rounded mt-1 outline-none focus:ring-2"
                value={formData.goodParts}
                onChange={(e) =>
                  setFormData({ ...formData, goodParts: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">
                งานเสีย (NG Parts)
              </label>
              <input
                type="number"
                className="w-full border p-2 rounded mt-1 outline-none focus:ring-2"
                value={formData.ngParts}
                onChange={(e) =>
                  setFormData({ ...formData, ngParts: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-3 mt-3">
            <label className="block text-sm font-bold text-gray-800">
              แนวทางขั้นต่อไป / Action Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 p-2 rounded border">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600"
                  checked={formData.reqModifyMold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reqModifyMold: e.target.checked,
                    })
                  }
                />
                แก้ไขแม่พิมพ์
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600"
                  checked={formData.reqRetrial}
                  onChange={(e) =>
                    setFormData({ ...formData, reqRetrial: e.target.checked })
                  }
                />
                ปรับ Condition Trial ซ้ำ
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600"
                  checked={formData.reqJig}
                  onChange={(e) =>
                    setFormData({ ...formData, reqJig: e.target.checked })
                  }
                />
                จัดทำ Jig / อุปกรณ์เสริม
              </label>
            </div>
            <textarea
              className="w-full border rounded p-2 text-sm outline-none focus:ring-2"
              rows="2"
              placeholder="รายละเอียดแผนงานเพิ่มเติม..."
              value={formData.makerAction}
              onChange={(e) =>
                setFormData({ ...formData, makerAction: e.target.value })
              }
            ></textarea>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600">
                  วันที่แม่พิมพ์ส่งกลับมา
                </label>
                <input
                  type="date"
                  className="w-full border p-1 rounded mt-1 text-sm outline-none focus:ring-2"
                  value={formData.deliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">
                  วันที่ Trial ครั้งต่อไป
                </label>
                <input
                  type="date"
                  className="w-full border p-1 rounded mt-1 text-sm outline-none focus:ring-2"
                  value={formData.nextTrialDate}
                  onChange={(e) =>
                    setFormData({ ...formData, nextTrialDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-gray-700 text-sm">
                ภาพบรรยากาศการประชุม (Meeting & Discussion)
              </label>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    meetingImages: [
                      ...(formData.meetingImages || []),
                      { id: Date.now() + Math.random(), img: null },
                    ],
                  })
                }
                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded shadow-sm"
              >
                + เพิ่มรูปประชุม
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(formData.meetingImages || []).map((imgObj) => (
                <div key={imgObj.id} className="relative group">
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        meetingImages: (formData.meetingImages || []).filter(
                          (i) => i.id !== imgObj.id
                        ),
                      })
                    }
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block"
                  >
                    <X size={12} />
                  </button>
                  <ImageUpload
                    label="รูปบรรยากาศประชุม"
                    value={imgObj.img}
                    onChange={(url) =>
                      setFormData({
                        ...formData,
                        meetingImages: (formData.meetingImages || []).map((i) =>
                          i.id === imgObj.id ? { ...i, img: url } : i
                        ),
                      })
                    }
                    onZoom={setZoomedImg}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded mt-4">
            <input
              type="checkbox"
              id="limitSample"
              className="w-5 h-5 mr-3"
              checked={formData.limitSampleOk}
              onChange={(e) =>
                setFormData({ ...formData, limitSampleOk: e.target.checked })
              }
            />
            <label
              htmlFor="limitSample"
              className="text-blue-900 font-semibold cursor-pointer"
            >
              {" "}
              อนุมัติจัดทำ Limit Sample สำหรับ Mass Production
            </label>
          </div>

          <div className="mt-4 border-t pt-4">
            <label className="block text-sm font-semibold text-gray-700">
              หมายเหตุ / อื่นๆ (Remarks / Others)
            </label>
            <textarea
              className="w-full border rounded p-2 text-sm mt-1 focus:ring-1"
              rows="2"
              placeholder="บันทึกข้อมูลเพิ่มเติมอื่นๆ..."
              value={formData.remarks || ""}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
            ></textarea>
          </div>

          <div className="mt-4 border-t pt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <label className="font-semibold text-gray-700 text-sm flex items-center">
                <Edit2 size={16} className="mr-2" /> ผู้ลงนาม (Signatures)
              </label>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    signatures: [
                      ...(formData.signatures || []),
                      {
                        id: Date.now() + Math.random(),
                        role: "ระบุตำแหน่ง...",
                        name: "",
                      },
                    ],
                  })
                }
                className="text-xs bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded shadow-sm hover:bg-gray-100 flex items-center"
              >
                <Plus size={14} className="mr-1" /> เพิ่มผู้ลงนาม
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(formData.signatures || []).map((sig, index) => (
                <div
                  key={sig.id}
                  className="border border-gray-300 rounded p-3 bg-white relative group flex flex-col gap-2"
                >
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        signatures: formData.signatures.filter(
                          (s) => s.id !== sig.id
                        ),
                      })
                    }
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block shadow-md hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 mb-0.5">
                      ตำแหน่ง (Role)
                    </label>
                    <input
                      type="text"
                      className="w-full text-xs p-1.5 border bg-gray-50 rounded outline-none text-gray-700 focus:ring-1"
                      placeholder="เช่น PE, QC, Tooling Maker..."
                      value={sig.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          signatures: formData.signatures.map((s) =>
                            s.id === sig.id ? { ...s, role: e.target.value } : s
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 mb-0.5">
                      ชื่อผู้ลงนาม (Name)
                    </label>
                    <input
                      type="text"
                      className="w-full text-sm p-1.5 border border-blue-200 rounded outline-none text-blue-700 font-semibold focus:ring-1 focus:border-blue-400"
                      placeholder="ระบุชื่อ..."
                      value={sig.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          signatures: formData.signatures.map((s) =>
                            s.id === sig.id ? { ...s, name: e.target.value } : s
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] flex justify-between z-20">
          <div className="max-w-4xl mx-auto flex w-full justify-between gap-2">
            <button
              onClick={() => {
                setView("trials");
                setEditingTrialId(null);
              }}
              className="px-2 py-2.5 w-1/5 text-gray-600 font-bold bg-gray-100 rounded-lg hover:bg-gray-200 text-xs"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => handleSave("draft")}
              className="px-2 py-2.5 w-2/5 bg-orange-500 text-white font-bold rounded-lg shadow hover:bg-orange-600 flex justify-center items-center text-xs"
            >
              บันทึกร่าง
            </button>
            <button
              onClick={() => handleSave("pending_customer")}
              className="px-2 py-2.5 w-2/5 bg-purple-600 text-white font-bold rounded-lg shadow hover:bg-purple-700 flex justify-center items-center text-xs"
            >
              <Clock3 size={14} className="mr-1" /> รอผลลูกค้า
            </button>
            <button
              onClick={() => handleSave("completed")}
              className="px-2 py-2.5 w-2/5 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 flex justify-center items-center text-xs"
            >
              <Check size={14} className="mr-1" /> ปิดงาน
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ReportView = () => {
    const allPartTrials = trials.filter((t) => t.partId === path.part.id);
    const [selectedTrialIds, setSelectedTrialIds] = useState(
      allPartTrials.map((t) => t.id)
    );
    const partTrialsToReport = allPartTrials.filter((t) =>
      selectedTrialIds.includes(t.id)
    );

    const handleToggle = (id) => {
      if (selectedTrialIds.includes(id)) {
        setSelectedTrialIds(selectedTrialIds.filter((tid) => tid !== id));
      } else {
        setSelectedTrialIds(
          [...selectedTrialIds, id].sort((a, b) => {
            return (
              allPartTrials.find((t) => t.id === a).trialNo -
              allPartTrials.find((t) => t.id === b).trialNo
            );
          })
        );
      }
    };

    return (
      <div className="space-y-4">
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />

        <div className="no-print bg-white p-4 rounded-lg shadow border-t-4 border-blue-500">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h3 className="font-bold text-gray-700 flex items-center">
              <Printer className="mr-2 w-5 h-5" /> เลือก Trial ที่ต้องการพิมพ์
              Report:
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setSelectedTrialIds(allPartTrials.map((t) => t.id))
                }
                className="text-sm text-blue-600 font-semibold hover:underline"
              >
                เลือกทั้งหมด
              </button>
              <button
                onClick={() => setSelectedTrialIds([])}
                className="text-sm text-gray-500 font-semibold hover:underline"
              >
                ล้างทั้งหมด
              </button>
            </div>
          </div>
          {allPartTrials.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีประวัติการ Trial</p>
          ) : (
            <div className="flex flex-wrap gap-3 mb-4">
              {allPartTrials.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 cursor-pointer p-2 rounded border transition-colors ${
                    selectedTrialIds.includes(t.id)
                      ? "bg-blue-50 border-blue-300 shadow-sm"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTrialIds.includes(t.id)}
                    onChange={() => handleToggle(t.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span
                    className={`text-sm ${
                      selectedTrialIds.includes(t.id)
                        ? "text-blue-900 font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    Trial #{t.trialNo} ({formatThaiDate(t.date)})
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => window.print()}
              disabled={partTrialsToReport.length === 0}
              className={`px-6 py-2 rounded-lg flex items-center shadow font-bold text-white transition-colors ${
                partTrialsToReport.length > 0
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              <Printer className="w-5 h-5 mr-2" /> Print PPAP / PDF
            </button>
          </div>
        </div>

        <div id="printable-area" className="bg-white mx-auto font-sans">
          {partTrialsToReport.length === 0 && (
            <p className="text-center text-gray-400 py-10 no-print">
              --- กรุณาเลือก Trial ที่ต้องการพิมพ์จากแผงควบคุมด้านบน ---
            </p>
          )}

          <div className="space-y-0">
            {partTrialsToReport.map((t, index) => {
              const actionList = [];
              if (t.reqModifyMold) actionList.push("แก้ไขแม่พิมพ์");
              if (t.reqRetrial) actionList.push("Trial ซ้ำ");
              if (t.reqJig) actionList.push("จัดทำ Jig/อุปกรณ์เสริม");

              return (
                <table
                  key={t.id}
                  className={`print-table ${
                    index !== 0 ? "page-break-before" : ""
                  }`}
                >
                  <thead className="print-header">
                    <tr>
                      <td
                        className="pb-3 border-b-0"
                        style={{ paddingTop: "5mm" }}
                      >
                        <div className="flex flex-col md:flex-row items-start justify-between border-b-[3px] border-blue-900 pb-2 mb-2 avoid-break shrink-0">
                          <div className="flex items-center">
                            <div className="mr-4">
                              <img
                                src="/logo.png"
                                alt="WISDOM AUTOPARTS"
                                className="w-32 md:w-40 h-auto object-contain print-exact-color"
                                onError={(e) => {
                                  e.target.outerHTML =
                                    '<div class="print-exact-color bg-[#003399] text-white p-2 rounded flex flex-col items-center justify-center w-28 md:w-32 h-10 md:h-12"><span class="font-bold text-[14px] md:text-[16px] leading-none">WISDOM</span><span class="text-[7px] md:text-[8px] tracking-[0.2em] mt-1">AUTOPARTS</span></div>';
                                }}
                              />
                            </div>
                            <div>
                              <h1 className="print-h1 text-lg md:text-2xl uppercase tracking-wider text-gray-800">
                                Injection Trial & Inspection Report
                              </h1>
                              <p className="print-text text-gray-500 font-semibold">
                                WISDOM AUTOPARTS CO.,LTD.
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-gray-500 mt-2 md:mt-0">
                            <p className="print-text font-bold">
                              Doc No: WI-PE3-02
                            </p>
                            <p className="print-text">
                              Print Date:{" "}
                              {formatThaiDate(
                                new Date().toISOString().split("T")[0]
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 avoid-break print-text">
                          <div className="w-2/3 border border-gray-300 rounded p-2 bg-white flex flex-col justify-between">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-2">
                              <div className="col-span-1">
                                <span className="font-semibold text-gray-600">
                                  Customer:
                                </span>{" "}
                                {path.client.name}
                              </div>
                              <div className="col-span-1">
                                <span className="font-semibold text-gray-600">
                                  Model:
                                </span>{" "}
                                {path.model.name}
                              </div>

                              <div className="col-span-1 text-[13px] text-blue-900 font-bold border-b border-gray-200 pb-1 whitespace-pre-wrap pr-2">
                                {path.part.code}
                              </div>
                              <div className="col-span-1 text-[13px] text-gray-700 font-bold border-b border-gray-200 pb-1 whitespace-pre-wrap pl-2 border-l border-gray-100">
                                {path.part.name}
                              </div>

                              <div className="col-span-1">
                                <span className="font-semibold text-gray-600">
                                  Material:
                                </span>{" "}
                                {path.part.material}
                              </div>
                              <div className="col-span-1">
                                <span className="font-semibold text-gray-600">
                                  Cavity:
                                </span>{" "}
                                {path.part.cavity}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-auto">
                              <div className="col-span-2 grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded border border-gray-200">
                                {(path.part.cavities || []).map((cav) => (
                                  <div key={cav.id}>
                                    <span className="font-semibold text-gray-600">
                                      STD Weight {cav.name}:
                                    </span>{" "}
                                    {cav.std} +{cav.plus || 0}/-{cav.minus || 0}{" "}
                                    g
                                  </div>
                                ))}
                              </div>
                              <div className="col-span-2 mt-0.5">
                                <span className="font-semibold text-gray-600">
                                  STD Cycle Time:
                                </span>{" "}
                                {path.part.stdCycleTime} ±{" "}
                                {path.part.stdCycleTimeTol || 0} sec
                              </div>
                            </div>
                          </div>

                          <div className="w-1/3 border border-gray-300 rounded p-1 flex items-center justify-center bg-white min-h-[120px]">
                            {path.part.img ? (
                              <img
                                src={path.part.img}
                                className="max-h-32 object-contain"
                                alt="Part"
                              />
                            ) : (
                              <span className="text-gray-300 text-lg font-bold opacity-50">
                                No Image
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </thead>

                  <tbody className="print-body">
                    <tr className="print-row">
                      <td className="pt-1">
                        <div className="print-exact-color bg-gray-800 text-white p-2 flex justify-between items-center print-text rounded-t-lg mb-2">
                          <span className="font-bold">
                            TRIAL EVENT #{t.trialNo}
                          </span>
                          <span>
                            Date: {formatThaiDate(t.date)} | PE:{" "}
                            {t.signatures && t.signatures.length > 0
                              ? t.signatures[0].name
                              : "-"}
                          </span>
                        </div>
                      </td>
                    </tr>

                    <tr className="print-row">
                      <td className="pb-2">
                        <div className="border border-gray-300 rounded p-2 bg-gray-50 print-text">
                          <h4 className="font-bold text-gray-700 border-b border-gray-300 pb-0.5 mb-1 uppercase">
                            Conditions Summary
                          </h4>
                          <div className="space-y-1">
                            {t.conditions?.map((cond) => (
                              <div
                                key={cond.id}
                                className="flex flex-wrap items-center justify-between text-[10px] border-b border-gray-200 pb-1 last:border-0 last:pb-0"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span className="font-bold w-16">
                                    {cond.name}
                                  </span>
                                  <div className="flex-1 min-w-[120px]">
                                    {(path.part.cavities || []).map(
                                      (cav, idx) => {
                                        const actVal =
                                          cond.actWeights?.[cav.id] || "";
                                        const isNg = checkNgByTolerance(
                                          actVal,
                                          cav.std,
                                          cav.plus,
                                          cav.minus
                                        );
                                        return (
                                          <span
                                            key={cav.id}
                                            className={`block ${
                                              idx > 0 ? "mt-0.5" : ""
                                            } ${
                                              isNg
                                                ? "text-red-600 font-bold"
                                                : "text-green-700 font-semibold"
                                            }`}
                                          >
                                            {cav.name} ACT: {actVal || "-"} g
                                          </span>
                                        );
                                      }
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-[80px]">
                                    C/T:{" "}
                                    <span
                                      className={
                                        checkNgByTolerance(
                                          cond.actCycleTime,
                                          path.part.stdCycleTime,
                                          path.part.stdCycleTimeTol,
                                          path.part.stdCycleTimeTol
                                        )
                                          ? "text-red-600 font-bold"
                                          : "text-green-700 font-bold"
                                      }
                                    >
                                      {cond.actCycleTime || "-"} s
                                    </span>
                                  </div>
                                  <span className="text-gray-500 italic hidden md:inline w-1/4 truncate">
                                    {cond.note}
                                  </span>
                                  <div className="text-right">
                                    {cond.customerResult === "ok" && (
                                      <span className="print-exact-color bg-green-100 text-green-700 border border-green-300 px-1 py-0.5 rounded font-bold">
                                        OK
                                      </span>
                                    )}
                                    {cond.customerResult === "temporary" && (
                                      <span className="print-exact-color bg-orange-100 text-orange-700 border border-orange-300 px-1 py-0.5 rounded font-bold">
                                        ACCEPT (Temp)
                                      </span>
                                    )}
                                    {cond.customerResult === "ng" && (
                                      <span className="print-exact-color bg-red-100 text-red-700 border border-red-300 px-1 py-0.5 rounded font-bold">
                                        NG
                                      </span>
                                    )}
                                    {cond.customerResult === "pending" && (
                                      <span className="print-exact-color bg-gray-200 text-gray-500 px-1 py-0.5 rounded">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>

                    <tr className="print-row">
                      <td className="pb-2">
                        <div className="grid grid-cols-2 gap-2 text-center print-text">
                          <div className="border border-gray-300 p-1 rounded bg-gray-50">
                            <div className="text-gray-500">Good / NG Parts</div>
                            <div className="font-bold text-gray-800 text-[12px]">
                              {t.goodParts || "0"} / {t.ngParts || "0"}
                            </div>
                          </div>
                          <div className="border border-gray-300 p-1 rounded bg-gray-50 flex flex-col items-center justify-center">
                            <div className="text-gray-500 mb-0.5">
                              Limit Sample
                            </div>
                            {t.limitSampleOk ? (
                              <span className="print-exact-color bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-[10px]">
                                APPROVED
                              </span>
                            ) : (
                              <span className="print-exact-color bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-[10px]">
                                PENDING
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {t.partProblems.length > 0 && (
                      <tr className="print-row">
                        <td className="pb-2">
                          <div className="border border-blue-200 rounded p-2 bg-blue-50/20 print-text">
                            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-0.5 mb-1 uppercase">
                              PART DEFECTS
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {t.partProblems.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex gap-2 items-start border-b border-blue-100 pb-1 md:border-b-0 md:pb-0"
                                >
                                  {p.img && (
                                    <img
                                      src={p.img}
                                      className="w-16 h-16 object-cover border border-gray-300 rounded"
                                      alt="NG"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-center mb-0.5">
                                      <span className="font-bold text-red-700">
                                        {p.defect}
                                      </span>
                                      {p.status && (
                                        <span
                                          className={`text-[8px] px-1 py-0.5 border font-bold rounded uppercase print-exact-color
                                              ${
                                                p.status === "OK"
                                                  ? "border-green-500 text-green-700 bg-green-50"
                                                  : p.status === "NG"
                                                  ? "border-red-500 text-red-700 bg-red-50"
                                                  : "border-orange-500 text-orange-700 bg-orange-50"
                                              }`}
                                        >
                                          {p.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-700 leading-tight">
                                      <span className="font-semibold text-gray-500">
                                        Detail:
                                      </span>{" "}
                                      {p.note || "-"}
                                    </div>
                                    <div className="text-gray-700 leading-tight">
                                      <span className="font-semibold text-gray-500">
                                        Cause:
                                      </span>{" "}
                                      {p.cause || "-"}
                                    </div>
                                    <div className="text-gray-700 leading-tight">
                                      <span className="font-semibold text-gray-500">
                                        Fix:
                                      </span>{" "}
                                      {p.fix || "-"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {t.moldProblems.length > 0 && (
                      <tr className="print-row">
                        <td className="pb-2">
                          <div className="border border-orange-200 rounded p-2 bg-orange-50/20 print-text">
                            <h4 className="font-bold text-orange-800 border-b border-orange-200 pb-0.5 mb-1 uppercase">
                              MOLD DEFECTS
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {t.moldProblems.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex gap-2 items-start border-b border-orange-100 pb-1 md:border-b-0 md:pb-0"
                                >
                                  {p.img && (
                                    <img
                                      src={p.img}
                                      className="w-16 h-16 object-cover border border-gray-300 rounded"
                                      alt="Mold NG"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="flex justify-end items-center mb-0.5">
                                      {p.status && (
                                        <span
                                          className={`text-[8px] px-1 py-0.5 border font-bold rounded uppercase print-exact-color
                                              ${
                                                p.status === "OK"
                                                  ? "border-green-500 text-green-700 bg-green-50"
                                                  : p.status === "NG"
                                                  ? "border-red-500 text-red-700 bg-red-50"
                                                  : "border-orange-500 text-orange-700 bg-orange-50"
                                              }`}
                                        >
                                          {p.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-700 leading-tight">
                                      <span className="font-semibold text-gray-500">
                                        Detail:
                                      </span>{" "}
                                      {p.note || "-"}
                                    </div>
                                    <div className="text-gray-700 leading-tight">
                                      <span className="font-semibold text-gray-500">
                                        Cause:
                                      </span>{" "}
                                      {p.cause || "-"}
                                    </div>
                                    <div className="text-gray-700 leading-tight">
                                      <span className="font-semibold text-gray-500">
                                        Fix:
                                      </span>{" "}
                                      {p.fix || "-"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className="print-row">
                      <td className="pb-2">
                        <div className="border border-blue-200 rounded p-2 bg-blue-50/10 print-text">
                          <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-0.5 mb-1 uppercase">
                            ATTACHMENTS
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {t.images.setupClose && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.setupClose}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Close"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  แม่พิมพ์ปิด
                                </div>
                              </div>
                            )}
                            {t.images.setupOpen && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.setupOpen}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Open"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  แม่พิมพ์เปิด
                                </div>
                              </div>
                            )}
                            {t.images.cav && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.cav}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Cav"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  ฝั่ง Cavity
                                </div>
                              </div>
                            )}
                            {t.images.core && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.core}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Core"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  ฝั่ง Core
                                </div>
                              </div>
                            )}
                            {t.images.coreEjector && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.coreEjector}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Core EJ"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  เช็คปลดงาน
                                </div>
                              </div>
                            )}
                            {t.images.resin && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.resin}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Resin"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  กระสอบเม็ด
                                </div>
                              </div>
                            )}
                            {t.images.machine && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.machine}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Mc"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  เครื่องจักร
                                </div>
                              </div>
                            )}
                            {t.images.packing && (
                              <div className="text-center w-[18%] md:w-16">
                                <img
                                  src={t.images.packing}
                                  className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                  alt="Packing"
                                />
                                <div className="print-small mt-0.5 text-gray-600">
                                  Box/Packing
                                </div>
                              </div>
                            )}

                            {t.equipmentImages.map(
                              (eq) =>
                                eq.img && (
                                  <div
                                    key={eq.id}
                                    className="text-center w-[18%] md:w-16"
                                  >
                                    <img
                                      src={eq.img}
                                      className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                      alt="Eq"
                                    />
                                    <div className="print-small mt-0.5 text-gray-600 truncate">
                                      {eq.note || "อุปกรณ์เสริม"}
                                    </div>
                                  </div>
                                )
                            )}

                            {t.monitorImages.map(
                              (m) =>
                                m.img && (
                                  <div
                                    key={m.id}
                                    className="text-center w-[18%] md:w-16"
                                  >
                                    <img
                                      src={m.img}
                                      className="h-12 md:h-16 w-full object-cover border border-gray-300 rounded"
                                      alt="Monitor"
                                    />
                                    <div className="print-small mt-0.5 text-gray-600 truncate">
                                      {m.note || "หน้าจอ"}
                                    </div>
                                  </div>
                                )
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {t.meetingImages && t.meetingImages.length > 0 && (
                      <tr className="print-row">
                        <td className="pb-2">
                          <div className="border border-green-200 rounded p-2 bg-green-50/20 print-text">
                            <h4 className="font-bold text-green-800 border-b border-green-200 pb-0.5 mb-1 uppercase">
                              MEETING & DISCUSSION
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {t.meetingImages.map(
                                (m) =>
                                  m.img && (
                                    <div
                                      key={m.id}
                                      className="text-center w-24"
                                    >
                                      <img
                                        src={m.img}
                                        className="h-16 w-full object-cover border border-gray-300 rounded"
                                        alt="Meeting"
                                      />
                                    </div>
                                  )
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className="print-row">
                      <td className="pt-2">
                        <div className="border border-gray-300 rounded p-3 bg-white print-text">
                          <p className="mb-1">
                            <strong className="text-gray-700">
                              Next Step / Action Plan:
                            </strong>
                            {actionList.length > 0 ? (
                              <span className="ml-2 font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded print-exact-color border border-blue-200">
                                {actionList.join(", ")}
                              </span>
                            ) : (
                              <span className="ml-2">-</span>
                            )}
                          </p>
                          <p>
                            <strong className="text-gray-700">
                              รายละเอียดเพิ่มเติม:
                            </strong>{" "}
                            {t.makerAction || "-"}
                          </p>
                          <p>
                            <strong className="text-gray-700">
                              Next Delivery/Trial:
                            </strong>{" "}
                            {formatThaiDate(t.deliveryDate)} /{" "}
                            {formatThaiDate(t.nextTrialDate)}
                          </p>
                          <p>
                            <strong className="text-gray-700">
                              Remarks (อื่นๆ):
                            </strong>{" "}
                            {t.remarks || "-"}
                          </p>

                          <div className="flex flex-wrap justify-around items-end gap-4 mt-8 text-center">
                            {(
                              t.signatures || [
                                { id: 1, role: "PE", name: t.peName || "" },
                                { id: 2, role: "Tooling Maker", name: "" },
                                { id: 3, role: "ลูกค้า (Customer)", name: "" },
                              ]
                            ).map((sig) => (
                              <div key={sig.id} className="w-24 md:w-32">
                                <div className="border-b border-gray-400 w-full mx-auto mb-1 h-6 flex items-end justify-center font-[cursive] text-blue-800 print-sign-name leading-tight pb-0.5 truncate">
                                  {sig.name}
                                </div>
                                <p className="text-[10px] md:text-[11px] text-gray-500 print-sign-role truncate font-semibold uppercase">
                                  {sig.role}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans selection:bg-blue-200 relative">
      <header className="bg-blue-800 text-white p-3 shadow-md sticky top-0 z-30 no-print border-b-4 border-blue-500">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            {activeTab === "projects" && view !== "clients" && (
              <button
                onClick={goBack}
                className="mr-3 p-1.5 hover:bg-blue-700 rounded-full transition-colors bg-blue-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="bg-white px-2 py-1 rounded mr-3 flex items-center justify-center min-w-[100px]">
              <img
                src="/logo.png"
                alt="WISDOM AUTOPARTS"
                className="h-5 md:h-7 object-contain"
                onError={(e) => {
                  e.target.outerHTML =
                    '<span class="text-blue-800 font-bold text-sm md:text-base">WISDOM</span>';
                }}
              />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-wide uppercase flex items-center hidden sm:flex">
              | NEW MODEL TRIAL
            </h1>
          </div>

          <div className="flex bg-blue-900 p-1 rounded-lg border border-blue-700">
            <button
              onClick={() => {
                setActiveTab("projects");
                setView("clients");
                resetForms();
              }}
              className={`px-3 py-1 text-sm font-semibold rounded ${
                activeTab === "projects"
                  ? "bg-white text-blue-900 shadow"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              โครงการ
            </button>
            <button
              onClick={() => {
                setActiveTab("calendar");
                resetForms();
              }}
              className={`px-3 py-1 text-sm font-semibold rounded flex items-center ${
                activeTab === "calendar"
                  ? "bg-white text-blue-900 shadow"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              <CalendarDays size={16} className="mr-1" /> ปฏิทินจองคิว
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-6">
        {activeTab === "projects" && view === "clients"
          ? ClientListView()
          : null}
        {activeTab === "projects" && view === "models" ? ModelsView() : null}
        {activeTab === "projects" && view === "parts" ? PartsView() : null}
        {activeTab === "projects" && view === "trials" ? TrialsView() : null}
        {activeTab === "projects" && view === "trial_form" ? TrialForm() : null}
        {activeTab === "projects" && view === "report" ? ReportView() : null}
        {activeTab === "calendar" ? CalendarView() : null}
      </main>

      {zoomedImg && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 no-print cursor-pointer"
          onClick={() => setZoomedImg(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-red-600 rounded-full p-2 transition-colors"
            onClick={() => setZoomedImg(null)}
            title="ปิดหน้าต่าง"
          >
            <X size={24} />
          </button>
          <img
            src={zoomedImg}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded shadow-2xl cursor-default"
            alt="Zoomed"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
