import React, { useState } from 'react';
import { 
  FolderKanban, Settings, Box, Activity, Camera, Plus, 
  ChevronRight, ChevronLeft, Printer, Save, AlertCircle,
  Edit2, Trash2, Check, X, Image as ImageIcon, Scale, Clock, ClipboardCheck, CalendarDays
} from 'lucide-react';

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #printable-area, #printable-area * { visibility: visible; }
    #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
    .no-print { display: none !important; }
    .print-exact-color { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break-before { page-break-before: always; }
  }
`;

const DEFECT_TYPES = [
  "Flash (รอยครีบ)", "Sink Mark (รอยยุบ)", "Short Shot (ฉีดไม่เต็ม)",
  "Flow Mark (รอยลายน้ำ)", "Silver Streak (รอยเงิน)", "Weld Line (รอยประสาน)",
  "Burn Mark (รอยไหม้)", "Warpage (บิดงอ)", "Color Difference (สีเพี้ยน)", "Scratch (รอยขีดข่วน)", "Other (อื่นๆ)"
];

const checkNg = (act: any, std: any, tol: any) => {
  if (!act || !std) return false;
  const a = parseFloat(act);
  const s = parseFloat(std);
  const t = parseFloat(tol || 0);
  return a < (s - t) || a > (s + t);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('projects'); // 'projects' or 'calendar'
  const [view, setView] = useState<string>('clients'); 
  const [path, setPath] = useState<any>({ client: null, model: null, part: null });

  const [clients, setClients] = useState<any[]>([
    { id: 1, name: 'TS TECH (THAILAND) CO., LTD.' }
  ]);
  const [models, setModels] = useState<any[]>([
    { id: 1, clientId: 1, name: '3DAA' },
    { id: 2, clientId: 1, name: '34AA' },
    { id: 3, clientId: 1, name: 'P700' },
  ]);
  
  const [parts, setParts] = useState<any[]>([
    { id: 1, modelId: 1, code: '81248-3DA7-H610-M1-0000', name: 'COVER R RECLINING INN', material: 'PP CP-WPIN (NH900L)', stdWeight: '62', stdWeightTol: '2', stdCycleTime: '75', stdCycleTimeTol: '5', cavity: '1+1', components: 'CSK JOB.701', img: '' },
    { id: 2, modelId: 1, code: '81514-3DA7-T510-M1-0001', name: 'INN COVER L BACK SW', material: 'PP CP-WPIN (NATURAL)', stdWeight: '75', stdWeightTol: '2', stdCycleTime: '60', stdCycleTimeTol: '5', cavity: '1', components: 'KRK', img: '' },
    { id: 3, modelId: 2, code: '82221-34A7-A010-M1-0000', name: 'LOCK COVER R LWR,RR BACK', material: 'PP CP-WPIN (NH900L)', stdWeight: '99', stdWeightTol: '3', stdCycleTime: '65', stdCycleTimeTol: '5', cavity: '1+1', components: 'WDA (JMG)', img: '' },
    { id: 4, modelId: 3, code: '83500-P707-1000-21-0000', name: 'POCKET DOOR PAD RH', material: 'SUD0301 (N343)', stdWeight: '289', stdWeightTol: '5', stdCycleTime: '60', stdCycleTimeTol: '5', cavity: '1+1', components: 'CSK JOB.746', img: '' },
  ]);
  
  const [trials, setTrials] = useState<any[]>([]);
  
  const [appointments, setAppointments] = useState<any[]>([
    { id: 101, date: '2026-08-12', time: '13:00', type: 'Trial / งานนัด', title: 'Try 34AA ORN GARN R/L,RR DOOR', note: 'ลูกค้าแก้ไขปัญหาชิ้นงานเสียรูป (งานหุบ แนวยาว)' },
    { id: 102, date: '2026-08-12', time: '13:00', type: 'Support / Jig', title: 'Modify 3DAA BASE R/L,FR ARMREST', note: 'ลูกค้าต้องเจีย mold' },
    { id: 103, date: '2026-08-12', time: '13:00', type: 'Support / Jig', title: 'Modify 3DAA BASE R/L,FR ARMREST', note: 'ลูกค้าต้องเจีย mold รบกวนเปิด mold ด้วย' }
  ]);
  const [appointmentModal, setAppointmentModal] = useState<boolean>(false);
  const [appointmentInput, setAppointmentInput] = useState<any>({ date: '2026-08-12', time: '13:00', type: 'Trial / งานนัด', title: '', note: '' });
  const [deleteApptConfirmId, setDeleteApptConfirmId] = useState<any>(null);

  const [addingId, setAddingId] = useState<any>(null);
  const [editingId, setEditingId] = useState<any>(null);
  const [editingTrialId, setEditingTrialId] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<any>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [partInput, setPartInput] = useState<any>({});
  const [zoomedImg, setZoomedImg] = useState<any>(null);

  const resetForms = () => { setAddingId(null); setEditingId(null); setConfirmDeleteId(null); setInputValue(''); setPartInput({}); setEditingTrialId(null); };
  
  const goBack = () => {
    resetForms();
    if (view === 'models') setView('clients');
    if (view === 'parts') setView('models');
    if (view === 'trials') setView('parts');
    if (view === 'report' || view === 'trial_form') setView('trials');
  };

  const ActionButtons = ({ id, onEdit, onDelete, isEditing, onSave, onCancel }: any) => {
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

  const ImageUpload = ({ label, onChange, value, height = "h-24" }: any) => {
    const handleFile = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        const url = URL.createObjectURL(e.target.files[0]);
        onChange(url);
      }
    };
    return (
      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-2 text-center relative ${height} flex flex-col items-center justify-center bg-white group`}>
        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFile} />
        {value ? (
          <div className="relative h-full w-full flex items-center justify-center">
            <img src={value} alt="Preview" className="h-full object-contain cursor-pointer" onClick={(e) => { e.stopPropagation(); setZoomedImg(value); }} title="คลิกเพื่อขยายดูรูป" />
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded pointer-events-none">คลิกขยาย</div>
          </div>
        ) : (
          <>
            <Camera className="w-5 h-5 text-gray-400 mb-1" />
            <span className="text-[10px] text-gray-500 leading-tight">{label}</span>
          </>
        )}
      </div>
    );
  };

  const ClientsView = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center"><FolderKanban className="mr-2" /> เลือกลูกค้า (Clients)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl shadow border-2 border-transparent flex justify-between items-center group">
            {editingId === c.id ? (
              <input autoFocus type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className="border-b-2 border-blue-500 outline-none flex-grow mr-4 px-2 py-1" />
            ) : (
              <div className="font-semibold text-gray-700 flex-grow cursor-pointer py-2 flex items-center" onClick={() => { resetForms(); setPath({ ...path, client: c }); setView('models'); }}>
                {c.name} <ChevronRight className="ml-2 text-gray-300" size={18} />
              </div>
            )}
            <ActionButtons id={c.id} isEditing={editingId === c.id} onEdit={() => { setEditingId(c.id); setInputValue(c.name); }} onSave={() => { setClients(clients.map(item => item.id === c.id ? { ...item, name: inputValue } : item)); resetForms(); }} onCancel={resetForms} onDelete={() => { setClients(clients.filter(item => item.id !== c.id)); resetForms(); }} />
          </div>
        ))}
        {addingId === 'client' ? (
          <div className="bg-blue-50 p-4 rounded-xl shadow border-2 border-blue-300 flex justify-between items-center">
            <input autoFocus type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className="bg-white border rounded px-3 py-2 flex-grow mr-4 outline-none" placeholder="ชื่อลูกค้าใหม่..." />
            <button onClick={() => { if(inputValue.trim()) setClients([...clients, { id: Date.now(), name: inputValue }]); resetForms(); }} className="p-2 bg-blue-600 text-white rounded mr-2"><Check size={20}/></button>
            <button onClick={resetForms} className="p-2 bg-gray-300 text-gray-700 rounded"><X size={20}/></button>
          </div>
        ) : (
          <div onClick={() => { resetForms(); setAddingId('client'); setInputValue(''); }} className="bg-gray-50 p-4 rounded-xl shadow border-2 border-dashed border-gray-300 text-gray-500 flex justify-center items-center cursor-pointer hover:bg-gray-100 hover:text-blue-600">
            <Plus className="mr-2" /> เพิ่มลูกค้าใหม่
          </div>
        )}
      </div>
    </div>
  );

  const ModelsView = () => {
    const clientModels = models.filter(m => m.clientId === path.client.id);
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center"><Settings className="mr-2" /> โมเดลของ: {path.client.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientModels.map(m => (
            <div key={m.id} className="bg-white p-4 rounded-xl shadow border-2 border-transparent flex justify-between items-center group">
              {editingId === m.id ? (
                <input autoFocus type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className="border-b-2 border-blue-500 outline-none flex-grow mr-4 px-2 py-1" />
              ) : (
                <div className="font-semibold text-gray-700 flex-grow cursor-pointer py-2 flex items-center" onClick={() => { resetForms(); setPath({ ...path, model: m }); setView('parts'); }}>
                  {m.name} <ChevronRight className="ml-2 text-gray-300" size={18} />
                </div>
              )}
              <ActionButtons id={m.id} isEditing={editingId === m.id} onEdit={() => { setEditingId(m.id); setInputValue(m.name); }} onSave={() => { setModels(models.map(item => item.id === m.id ? { ...item, name: inputValue } : item)); resetForms(); }} onCancel={resetForms} onDelete={() => { setModels(models.filter(item => item.id !== m.id)); resetForms(); }} />
            </div>
          ))}
          {addingId === 'model' ? (
             <div className="bg-blue-50 p-4 rounded-xl shadow border-2 border-blue-300 flex justify-between items-center">
             <input autoFocus type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className="bg-white border rounded px-3 py-2 flex-grow mr-4 outline-none" placeholder="ชื่อโมเดลใหม่..." />
             <button onClick={() => { if(inputValue.trim()) setModels([...models, { id: Date.now(), clientId: path.client.id, name: inputValue }]); resetForms(); }} className="p-2 bg-blue-600 text-white rounded mr-2"><Check size={20}/></button>
             <button onClick={resetForms} className="p-2 bg-gray-300 text-gray-700 rounded"><X size={20}/></button>
           </div>
          ) : (
            <div onClick={() => { resetForms(); setAddingId('model'); setInputValue(''); }} className="bg-gray-50 p-4 rounded-xl shadow border-2 border-dashed border-gray-300 text-gray-500 flex justify-center items-center cursor-pointer hover:bg-gray-100 hover:text-blue-600">
              <Plus className="mr-2" /> เพิ่มโมเดลใหม่
            </div>
          )}
        </div>
      </div>
    );
  };

  const PartsView = () => {
    const modelParts = parts.filter(p => p.modelId === path.model.id);

    const handleSavePart = () => {
      if (editingId) setParts(parts.map(p => p.id === editingId ? { ...p, ...partInput } : p));
      else setParts([...parts, { id: Date.now(), modelId: path.model.id, ...partInput }]);
      resetForms();
    };

    const PartForm = () => (
      <div className="bg-blue-50 p-6 rounded-xl shadow-lg border-2 border-blue-200 col-span-1 md:col-span-2">
        <h3 className="font-bold text-blue-800 mb-4">{editingId ? 'แก้ไขข้อมูลชิ้นงาน' : 'เพิ่มชิ้นงานใหม่'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <input type="text" placeholder="รหัสชิ้นงาน (Part No.)" value={partInput.code || ''} className="w-full border px-3 py-2 rounded focus:ring-2 outline-none" onChange={e => setPartInput({...partInput, code: e.target.value})} />
            <input type="text" placeholder="ชื่อชิ้นงาน (Part Name)" value={partInput.name || ''} className="w-full border px-3 py-2 rounded focus:ring-2 outline-none" onChange={e => setPartInput({...partInput, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="พลาสติก/สี (Material/Color)" value={partInput.material || ''} className="border px-3 py-2 rounded" onChange={e => setPartInput({...partInput, material: e.target.value})} />
              <input type="text" placeholder="Cavity" value={partInput.cavity || ''} className="border px-3 py-2 rounded" onChange={e => setPartInput({...partInput, cavity: e.target.value})} />
              
              <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
                <div className="relative flex-grow">
                  <input type="number" placeholder="STD Weight (g)" value={partInput.stdWeight || ''} className="w-full border px-3 py-2 rounded pl-8" onChange={e => setPartInput({...partInput, stdWeight: e.target.value})} />
                  <Scale className="absolute left-2 top-2.5 text-gray-400 w-4 h-4" />
                </div>
                <span className="text-gray-500 font-bold px-1">±</span>
                <input type="number" placeholder="Tol." value={partInput.stdWeightTol || ''} className="w-16 border px-2 py-2 rounded text-center" onChange={e => setPartInput({...partInput, stdWeightTol: e.target.value})} />
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
                <div className="relative flex-grow">
                  <input type="number" placeholder="STD C/T (s)" value={partInput.stdCycleTime || ''} className="w-full border px-3 py-2 rounded pl-8" onChange={e => setPartInput({...partInput, stdCycleTime: e.target.value})} />
                  <Clock className="absolute left-2 top-2.5 text-gray-400 w-4 h-4" />
                </div>
                <span className="text-gray-500 font-bold px-1">±</span>
                <input type="number" placeholder="Tol." value={partInput.stdCycleTimeTol || ''} className="w-16 border px-2 py-2 rounded text-center" onChange={e => setPartInput({...partInput, stdCycleTimeTol: e.target.value})} />
              </div>
            </div>
            <input type="text" placeholder="Tooling Maker / Other" value={partInput.components || ''} className="w-full border px-3 py-2 rounded focus:ring-2 outline-none" onChange={e => setPartInput({...partInput, components: e.target.value})} />
          </div>
          
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white relative min-h-[160px]">
             <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPartInput({...partInput, img: URL.createObjectURL(e.target.files[0])});
                }
             }} />
             {partInput.img ? (
               <div className="relative h-full w-full flex items-center justify-center">
                 <img src={partInput.img} alt="3D" className="h-full w-full object-contain cursor-pointer" onClick={(e) => { e.stopPropagation(); setZoomedImg(partInput.img); }} />
               </div>
             ) : (
               <div className="text-center text-gray-400">
                 <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                 <p className="text-sm">เพิ่มรูปชิ้นงาน 3D</p>
               </div>
             )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={resetForms} className="px-4 py-2 bg-white border text-gray-600 rounded shadow-sm hover:bg-gray-100">ยกเลิก</button>
          <button onClick={handleSavePart} className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">บันทึก</button>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center"><Box className="mr-2" /> ชิ้นงานของโมเดล: {path.model.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelParts.map(p => (
            editingId === p.id ? <PartForm key={p.id} /> :
            <div key={p.id} className="bg-white p-4 rounded-xl shadow border-2 border-transparent relative group">
              <div className="cursor-pointer flex justify-between h-full" onClick={() => { resetForms(); setPath({ ...path, part: p }); setView('trials'); }}>
                <div className="w-2/3 pr-2">
                  <div className="font-bold text-lg text-blue-800 mb-2 truncate">{p.code}</div>
                  <div className="text-gray-600 text-xs md:text-sm space-y-1">
                    <p className="truncate"><strong>ชื่อ:</strong> {p.name}</p>
                    <p className="truncate"><strong>MAT:</strong> {p.material}</p>
                    <div className="flex gap-4">
                       <p className="text-green-700"><strong>W(STD):</strong> {p.stdWeight}±{p.stdWeightTol || 0} g</p>
                       <p className="text-orange-700"><strong>C/T(STD):</strong> {p.stdCycleTime}±{p.stdCycleTimeTol || 0} s</p>
                    </div>
                  </div>
                </div>
                <div className="w-1/3 flex items-center justify-center border rounded bg-gray-50 h-24 mt-2 overflow-hidden">
                  {p.img ? <img src={p.img} alt="Part" className="max-h-full max-w-full object-contain p-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setZoomedImg(p.img); }} /> : <div className="text-gray-300 text-xs">ไม่มีรูป</div>}
                </div>
              </div>
              <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-lg">
                <ActionButtons id={p.id} isEditing={false} onEdit={() => { setEditingId(p.id); setPartInput(p); }} onDelete={() => { setParts(parts.filter(item => item.id !== p.id)); resetForms(); }} onSave={() => {}} onCancel={() => {}} />
              </div>
            </div>
          ))}
          {addingId === 'part' ? <PartForm /> : (
             <div onClick={() => { resetForms(); setAddingId('part'); setPartInput({}); }} className="bg-gray-50 p-4 rounded-xl shadow border-2 border-dashed border-gray-300 text-gray-500 flex justify-center items-center cursor-pointer hover:bg-gray-100 hover:text-blue-600 min-h-[150px]">
               <Plus className="mr-2" /> เพิ่มชิ้นงานใหม่
             </div>
          )}
        </div>
      </div>
    );
  };

  const CalendarView = () => {
    const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
          <h2 className="text-xl font-bold text-blue-900 flex items-center"><CalendarDays className="mr-2"/> ปฏิทินนัดหมาย Trial & Support ประจำเดือน สิงหาคม 2569</h2>
          <button onClick={() => setAppointmentModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center shadow hover:bg-blue-700">
            <Plus className="mr-2 w-5 h-5"/> เพิ่มนัดหมายใหม่
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden border">
          <div className="grid grid-cols-7 bg-blue-800 text-white text-center font-bold text-sm py-3">
            <div className="text-red-300">อาทิตย์</div>
            <div>จันทร์</div>
            <div>อังคาร</div>
            <div>พุธ</div>
            <div>พฤหัสบดี</div>
            <div>ศุกร์</div>
            <div>เสาร์</div>
          </div>
          <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-[1px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-50 min-h-[100px] p-2"></div>
            ))}
            
            {daysInMonth.map(day => {
              const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
              const dayAppointments = appointments.filter(a => a.date === dateStr);
              return (
                <div key={day} className="bg-white min-h-[100px] p-2 flex flex-col relative hover:bg-blue-50/20 transition-colors">
                  <span className={`font-bold text-sm mb-1 ${day === 12 ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded-full w-fit' : 'text-gray-700'}`}>{day}</span>
                  <div className="space-y-1 overflow-y-auto max-h-[100px]">
                    {dayAppointments.map(appt => (
                      <div key={appt.id} className={`text-[10px] p-1 rounded font-semibold truncate shadow-sm ${appt.type.includes('Trial') ? 'bg-amber-100 text-amber-900 border-l-2 border-amber-500' : 'bg-blue-100 text-blue-900 border-l-2 border-blue-500'}`} title={`${appt.time} ${appt.title} - ${appt.note}`}>
                        {appt.time} {appt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center border-b pb-2"><CalendarDays className="mr-2 text-blue-600"/> รายการนัดหมายประจำเดือน สิงหาคม</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="p-3">วันที่</th>
                  <th className="p-3">เวลา</th>
                  <th className="p-3">ประเภท</th>
                  <th className="p-3">หัวข้องาน (TITLE)</th>
                  <th className="p-3">รายละเอียด / หมายเหตุ</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">ไม่มีข้อมูลนัดหมายในเดือนนี้</td></tr>
                ) : (
                  appointments.map(appt => (
                    <tr key={appt.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-blue-900">{appt.date.split('-').reverse().join('/')}</td>
                      <td className="p-3">{appt.time}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${appt.type.includes('Trial') ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{appt.type}</span></td>
                      <td className="p-3 font-semibold text-gray-800">{appt.title}</td>
                      <td className="p-3 text-gray-600">{appt.note}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          {deleteApptConfirmId === appt.id ? (
                            <div className="flex gap-1 items-center">
                              <span className="text-xs text-red-600 font-bold">ยืนยันลบ?</span>
                              <button onClick={() => { setAppointments(appointments.filter(a => a.id !== appt.id)); setDeleteApptConfirmId(null); }} className="p-1 bg-red-600 text-white rounded hover:bg-red-700"><Check size={14}/></button>
                              <button onClick={() => setDeleteApptConfirmId(null)} className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"><X size={14}/></button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteApptConfirmId(appt.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {appointmentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-lg text-blue-900">เพิ่มนัดหมาย Trial / Support ใหม่</h3>
                <button onClick={() => setAppointmentModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่</label>
                    <input type="date" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-400" value={appointmentInput.date} onChange={e => setAppointmentInput({...appointmentInput, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">เวลา</label>
                    <input type="time" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-400" value={appointmentInput.time} onChange={e => setAppointmentInput({...appointmentInput, time: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภท</label>
                  <select className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-400" value={appointmentInput.type} onChange={e => setAppointmentInput({...appointmentInput, type: e.target.value})}>
                    <option value="Trial / งานนัด">Trial / งานนัด</option>
                    <option value="Support / Jig">Support / Jig</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">หัวข้องาน (TITLE)</label>
                  <input type="text" placeholder="ระบุชื่อชิ้นงาน หรือหัวข้อ..." className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-400" value={appointmentInput.title} onChange={e => setAppointmentInput({...appointmentInput, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียด / หมายเหตุ</label>
                  <textarea rows={3} placeholder="ระบุรายละเอียดเพิ่มเติม..." className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-400" value={appointmentInput.note} onChange={e => setAppointmentInput({...appointmentInput, note: e.target.value})}></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={() => setAppointmentModal(false)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100">ยกเลิก</button>
                <button onClick={() => {
                  if (appointmentInput.title.trim()) {
                    setAppointments([...appointments, { id: Date.now(), ...appointmentInput }]);
                    setAppointmentModal(false);
                    setAppointmentInput({ date: '2026-08-12', time: '13:00', type: 'Trial / งานนัด', title: '', note: '' });
                  }
                }} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow font-bold hover:bg-blue-700">บันทึกนัดหมาย</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const TrialsView = () => {
    const partTrials = trials.filter(t => t.partId === path.part.id);
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-xl font-bold flex items-center"><Activity className="mr-2" /> ประวัติ Trial: {path.part.code}</h2>
          <button onClick={() => setView('report')} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center shadow hover:bg-gray-900">
            <Printer className="w-4 h-4 mr-2" /> ดู Report รวม
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {partTrials.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">ยังไม่มีประวัติการ Trial สำหรับชิ้นงานนี้</div>
          ) : (
            partTrials.map((t, index) => (
              <div key={t.id} className="bg-white p-4 rounded-xl shadow border border-gray-100 relative group flex flex-col md:flex-row gap-4">
                <div className="md:w-3/4">
                  <div className="flex items-center mb-3 border-b pb-2">
                    <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm mr-3">Trial #{t.trialNo}</span>
                    <span className="text-gray-500 text-sm">วันที่: {t.date}</span>
                    <span className="ml-auto text-sm text-gray-500">PE: {t.peName || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2 bg-gray-50 p-2 rounded">
                    <div className={checkNg(t.actWeight, path.part.stdWeight, path.part.stdWeightTol) ? "text-red-600" : "text-green-600"}><strong>Weight ACT:</strong> {t.actWeight || '-'} g</div>
                    <div className={checkNg(t.actCycleTime, path.part.stdCycleTime, path.part.stdCycleTimeTol) ? "text-red-600" : "text-green-600"}><strong>C/T ACT:</strong> {t.actCycleTime || '-'} sec</div>
                  </div>
                  <p className="text-sm truncate"><strong className="text-red-600">ชิ้นงาน NG ({t.partProblems.length}):</strong> {t.partProblems.map((p: any) => p.defect).join(', ') || '-'}</p>
                </div>
                <div className="absolute top-4 right-4">
                   <ActionButtons 
                     id={t.id} 
                     isEditing={false} 
                     onEdit={() => { setEditingTrialId(t.id); setView('trial_form'); }} 
                     onDelete={() => { setTrials(trials.filter((item: any) => item.id !== t.id)); setConfirmDeleteId(null); }} 
                   />
                </div>
              </div>
            ))
          )}
          <button onClick={() => { setEditingTrialId(null); setView('trial_form'); }} className="w-full bg-blue-600 text-white p-4 rounded-xl shadow font-bold flex justify-center items-center hover:bg-blue-700">
            <Plus className="mr-2" /> บันทึกการ Trial ครั้งใหม่ (Trial #{partTrials.length + 1})
          </button>
        </div>
      </div>
    );
  };

  const TrialForm = () => {
    const partTrials = trials.filter(t => t.partId === path.part.id);
    const isEditing = !!editingTrialId;
    const existingTrial = isEditing ? trials.find(t => t.id === editingTrialId) : null;
    const currentTrialNo = isEditing ? existingTrial.trialNo : partTrials.length + 1;

    const [formData, setFormData] = useState<any>(existingTrial || {
      date: new Date().toISOString().split('T')[0],
      images: { setupClose: null, setupOpen: null, cav: null, core: null, coreEjector: null, resin: null, machine: null },
      equipmentImages: [],
      monitorImages: [],
      atmosphereImages: [],
      meetingImages: [],
      partProblems: [], 
      moldProblems: [],
      actWeight: '', actCycleTime: '',
      goodParts: '', ngParts: '',
      makerAction: '', deliveryDate: '', nextTrialDate: '', limitSampleOk: false,
      peName: ''
    });

    const handleSave = () => {
      if (isEditing) {
        setTrials(trials.map((t: any) => t.id === editingTrialId ? { ...t, ...formData } : t));
      } else {
        setTrials([...trials, { id: Date.now(), partId: path.part.id, trialNo: currentTrialNo, ...formData }]);
      }
      setView('trials');
      setEditingTrialId(null);
    };

    const addProblem = (type: string) => {
      const newProblem = { id: Date.now(), img: null, note: '', defect: 'Flash (รอยครีบ)' };
      if (type === 'part') setFormData({...formData, partProblems: [...formData.partProblems, newProblem]});
      if (type === 'mold') setFormData({...formData, moldProblems: [...formData.moldProblems, newProblem]});
    };
    
    const updateProblem = (type: string, id: any, field: string, value: any) => {
      if (type === 'part') setFormData({...formData, partProblems: formData.partProblems.map((p: any) => p.id === id ? {...p, [field]: value} : p)});
      if (type === 'mold') setFormData({...formData, moldProblems: formData.moldProblems.map((p: any) => p.id === id ? {...p, [field]: value} : p)});
    };

    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-24 text-sm md:text-base">
        <div className="bg-white p-4 rounded-xl shadow border-b-4 border-blue-500 sticky top-16 z-10">
          <h2 className="text-xl font-bold text-blue-900">{isEditing ? `แก้ไข Trial #${currentTrialNo}` : `บันทึก Trial #${currentTrialNo}`}</h2>
          <div className="text-gray-500 mt-1 flex justify-between">
            <span>{path.part.code} - {path.part.name}</span>
            <span className="font-semibold text-blue-600">STD: {path.part.stdCycleTime}±{path.part.stdCycleTimeTol || 0}s / {path.part.stdWeight}±{path.part.stdWeightTol || 0}g</span>
          </div>
        </div>

        {/* Section 1 */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4 border border-gray-200">
          <h3 className="font-bold text-gray-800 bg-gray-100 p-2 rounded flex items-center"><Camera className="mr-2" size={18}/> 1. รูปภาพอ้างอิงสภาพแวดล้อมและ Tooling</h3>
          <div className="space-y-3">
             <p className="font-semibold text-blue-800 text-sm border-b pb-1">1.1 สภาพแม่พิมพ์ (Mold Setup)</p>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
               <ImageUpload label="แม่พิมพ์ปิด" value={formData.images.setupClose} onChange={(url: any) => setFormData({...formData, images: {...formData.images, setupClose: url}})} />
               <ImageUpload label="แม่พิมพ์เปิด" value={formData.images.setupOpen} onChange={(url: any) => setFormData({...formData, images: {...formData.images, setupOpen: url}})} />
               <ImageUpload label="ฝั่ง Cavity" value={formData.images.cav} onChange={(url: any) => setFormData({...formData, images: {...formData.images, cav: url}})} />
               <ImageUpload label="ฝั่ง Core" value={formData.images.core} onChange={(url: any) => setFormData({...formData, images: {...formData.images, core: url}})} />
               <ImageUpload label="ฝั่ง Core (เช็คปลดงาน)" value={formData.images.coreEjector} onChange={(url: any) => setFormData({...formData, images: {...formData.images, coreEjector: url}})} />
             </div>
             
             <p className="font-semibold text-blue-800 text-sm border-b pb-1 mt-4">1.2 Material & Machine</p>
             <div className="grid grid-cols-2 gap-2">
               <ImageUpload label="กระสอบเม็ดพลาสติก" value={formData.images.resin} onChange={(url: any) => setFormData({...formData, images: {...formData.images, resin: url}})} />
               <ImageUpload label="เครื่องจักร & ป้าย" value={formData.images.machine} onChange={(url: any) => setFormData({...formData, images: {...formData.images, machine: url}})} />
             </div>

             <div className="flex justify-between items-center mt-4 border-b pb-1">
                <p className="font-semibold text-blue-800 text-sm">1.3 อุปกรณ์เสริม (เช่น Chiller, Hot Runner ฯลฯ)</p>
                <button onClick={() => setFormData({...formData, equipmentImages: [...formData.equipmentImages, { id: Date.now(), img: null, note: '' }]})} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+ เพิ่มรูปอุปกรณ์</button>
             </div>
             <div className="grid grid-cols-2 gap-2">
                {formData.equipmentImages.map((eq: any) => (
                  <div key={eq.id} className="border p-2 rounded bg-gray-50 flex flex-col relative group">
                     <button onClick={() => setFormData({...formData, equipmentImages: formData.equipmentImages.filter((i: any) => i.id !== eq.id)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block"><X size={12}/></button>
                     <ImageUpload label="รูปอุปกรณ์" height="h-20" value={eq.img} onChange={(url: any) => setFormData({...formData, equipmentImages: formData.equipmentImages.map((i: any) => i.id === eq.id ? {...i, img: url} : i)})} />
                     <input type="text" className="w-full text-xs p-1 border rounded mt-1" placeholder="ระบุชื่ออุปกรณ์..." value={eq.note} onChange={(e) => setFormData({...formData, equipmentImages: formData.equipmentImages.map((i: any) => i.id === eq.id ? {...i, note: e.target.value} : i)})} />
                  </div>
                ))}
             </div>

             <div className="flex justify-between items-center mt-4 border-b pb-1">
                <p className="font-semibold text-blue-800 text-sm">1.4 บรรยากาศ (รูปผู้เข้าร่วมทดลอง)</p>
                <button onClick={() => setFormData({...formData, atmosphereImages: [...formData.atmosphereImages, { id: Date.now(), img: null }]})} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+ เพิ่มรูป</button>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
               {formData.atmosphereImages.map((imgObj: any) => (
                  <div key={imgObj.id} className="relative group">
                    <button onClick={() => setFormData({...formData, atmosphereImages: formData.atmosphereImages.filter((i: any) => i.id !== imgObj.id)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block"><X size={12}/></button>
                    <ImageUpload label="บรรยากาศ" value={imgObj.img} onChange={(url: any) => setFormData({...formData, atmosphereImages: formData.atmosphereImages.map((i: any) => i.id === imgObj.id ? {...i, img: url} : i)})} />
                  </div>
               ))}
             </div>

             <div className="flex justify-between items-center mt-4 border-b pb-1">
                <p className="font-semibold text-blue-800 text-sm">1.5 Condition (หน้าจอมอนิเตอร์เครื่องฉีด)</p>
                <button onClick={() => setFormData({...formData, monitorImages: [...formData.monitorImages, { id: Date.now(), img: null, note: '' }]})} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">+ เพิ่มจอ Monitor</button>
             </div>
             <div className="grid grid-cols-2 gap-2">
                {formData.monitorImages.map((m: any) => (
                  <div key={m.id} className="border p-2 rounded bg-gray-50 flex gap-2 relative group">
                     <button onClick={() => setFormData({...formData, monitorImages: formData.monitorImages.filter((i: any) => i.id !== m.id)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 z-10 hidden group-hover:block"><X size={12}/></button>
                     <div className="w-1/2"><ImageUpload label="หน้าจอ" height="h-24" value={m.img} onChange={(url: any) => setFormData({...formData, monitorImages: formData.monitorImages.map((i: any) => i.id === m.id ? {...i, img: url} : i)})} /></div>
                     <div className="w-1/2"><textarea className="w-full h-full text-xs p-1 border rounded" placeholder="ระบุหน้าจอ..." value={m.note} onChange={(e) => setFormData({...formData, monitorImages: formData.monitorImages.map((i: any) => i.id === m.id ? {...i, note: e.target.value} : i)})} /></div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4 border border-red-200">
          <h3 className="font-bold text-red-800 bg-red-50 p-2 rounded flex items-center"><AlertCircle className="mr-2" size={18}/> 2. บันทึกปัญหาที่พบ (Troubleshooting)</h3>
          
          <div className="border border-red-100 rounded p-3">
             <div className="flex justify-between items-center mb-2">
               <label className="font-semibold text-gray-700">ชิ้นงาน (Part Defect)</label>
               <button onClick={() => addProblem('part')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">+ เพิ่มรูปปัญหา</button>
             </div>
             <div className="space-y-3">
               {formData.partProblems.length === 0 && <p className="text-xs text-gray-400 text-center">ไม่มีปัญหา</p>}
               {formData.partProblems.map((p: any) => (
                 <div key={p.id} className="flex flex-col md:flex-row gap-3 bg-red-50 p-2 rounded border border-red-100 relative">
                   <button onClick={() => setFormData({...formData, partProblems: formData.partProblems.filter((item: any) => item.id !== p.id)})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
                   <div className="md:w-1/3"><ImageUpload label="รูป NG" height="h-24" value={p.img} onChange={(url: any) => updateProblem('part', p.id, 'img', url)} /></div>
                   <div className="md:w-2/3 space-y-2">
                     <select className="w-full border p-1 text-sm rounded bg-white text-red-700 font-semibold" value={p.defect} onChange={(e) => updateProblem('part', p.id, 'defect', e.target.value)}>
                       {DEFECT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                     </select>
                     <textarea className="w-full text-sm p-2 border rounded focus:ring-1" rows={2} placeholder="รายละเอียด/ตำแหน่ง..." value={p.note} onChange={(e) => updateProblem('part', p.id, 'note', e.target.value)}></textarea>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="border border-orange-100 rounded p-3">
             <div className="flex justify-between items-center mb-2">
               <label className="font-semibold text-gray-700">แม่พิมพ์ (Mold Defect)</label>
               <button onClick={() => addProblem('mold')} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">+ เพิ่มรูปปัญหา</button>
             </div>
             <div className="space-y-3">
               {formData.moldProblems.length === 0 && <p className="text-xs text-gray-400 text-center">ไม่มีปัญหา</p>}
               {formData.moldProblems.map((p: any) => (
                 <div key={p.id} className="flex flex-col md:flex-row gap-3 bg-orange-50 p-2 rounded border border-orange-100 relative">
                   <button onClick={() => setFormData({...formData, moldProblems: formData.moldProblems.filter((item: any) => item.id !== p.id)})} className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-1"><X size={12}/></button>
                   <div className="md:w-1/3"><ImageUpload label="รูป Mold NG" height="h-24" value={p.img} onChange={(url: any) => updateProblem('mold', p.id, 'img', url)} /></div>
                   <div className="md:w-2/3"><textarea className="w-full h-full text-sm p-2 border rounded focus:ring-1" placeholder="เช่น สลักค้าง, น้ำรั่ว, ปลดไม่ออก..." value={p.note} onChange={(e) => updateProblem('mold', p.id, 'note', e.target.value)}></textarea></div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4 border border-green-200">
          <h3 className="font-bold text-green-800 bg-green-50 p-2 rounded flex items-center"><ClipboardCheck className="mr-2" size={18}/> 3. สรุปผลการทดลอง (Summary & Action Plan)</h3>
          
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border">
            <div>
              <label className="block text-xs font-semibold text-gray-600">Actual Weight (g)</label>
              <input type="number" step="0.001" className={`w-full border p-2 rounded mt-1 ${checkNg(formData.actWeight, path.part.stdWeight, path.part.stdWeightTol) ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={formData.actWeight} onChange={e => setFormData({...formData, actWeight: e.target.value})} placeholder={`STD: ${path.part.stdWeight}±${path.part.stdWeightTol || 0}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600">Actual Cycle Time (s)</label>
              <input type="number" className={`w-full border p-2 rounded mt-1 ${checkNg(formData.actCycleTime, path.part.stdCycleTime, path.part.stdCycleTimeTol) ? 'border-red-500 bg-red-50 text-red-700' : ''}`} value={formData.actCycleTime} onChange={e => setFormData({...formData, actCycleTime: e.target.value})} placeholder={`STD: ${path.part.stdCycleTime}±${path.part.stdCycleTimeTol || 0}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs text-gray-600">งานดี (Good Parts)</label><input type="number" className="w-full border p-2 rounded mt-1" value={formData.goodParts} onChange={e=>setFormData({...formData, goodParts:e.target.value})} /></div>
             <div><label className="block text-xs text-gray-600">งานเสีย (NG Parts)</label><input type="number" className="w-full border p-2 rounded mt-1" value={formData.ngParts} onChange={e=>setFormData({...formData, ngParts:e.target.value})} /></div>
          </div>

          <div className="space-y-2 border-t pt-3 mt-3">
             <label className="block text-sm font-semibold text-gray-700">Action สำหรับแม่พิมพ์</label>
             <textarea className="w-full border rounded p-2 text-sm" rows={2} placeholder="รับกลับไปแก้ไขหรือไม่? รายละเอียด..." value={formData.makerAction} onChange={e => setFormData({...formData, makerAction: e.target.value})}></textarea>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-600">วันที่แม่พิมพ์ส่งกลับมา</label><input type="date" className="w-full border p-1 rounded mt-1 text-sm" value={formData.deliveryDate} onChange={e=>setFormData({...formData, deliveryDate:e.target.value})} /></div>
                <div><label className="block text-xs text-gray-600">วันที่ Trial ครั้งต่อไป</label><input type="date" className="w-full border p-1 rounded mt-1 text-sm" value={formData.nextTrialDate} onChange={e=>setFormData({...formData, nextTrialDate:e.target.value})} /></div>
             </div>
          </div>

          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded mt-4">
            <input type="checkbox" id="limitSample" className="w-5 h-5 mr-3" checked={formData.limitSampleOk} onChange={e => setFormData({...formData, limitSampleOk: e.target.checked})} />
            <label htmlFor="limitSample" className="text-blue-900 font-semibold cursor-pointer"> อนุมัติจัดทำ Limit Sample สำหรับ Mass Production</label>
          </div>

          <div className="mt-4 border-t pt-4">
             <label className="block text-xs font-semibold text-gray-600 mb-1">ผู้บันทึก/รับผิดชอบ (PE / Recorder)</label>
             <input type="text" className="w-full border p-2 rounded" placeholder="ลงชื่อผู้ปฏิบัติงาน..." value={formData.peName} onChange={e => setFormData({...formData, peName: e.target.value})} />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_10px_rgba(0,0,0,0.1)] flex justify-between z-20">
          <div className="max-w-4xl mx-auto flex w-full justify-between gap-4">
            <button onClick={() => { setView('trials'); setEditingTrialId(null); }} className="px-6 py-3 w-1/3 text-gray-600 font-bold bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
            <button onClick={handleSave} className="px-6 py-3 w-2/3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 flex justify-center items-center">
              <Save className="w-5 h-5 mr-2" /> บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ReportView = () => {
    const allPartTrials = trials.filter(t => t.partId === path.part.id);
    const [selectedTrialIds, setSelectedTrialIds] = useState<any[]>(allPartTrials.map(t => t.id));
    const partTrialsToReport = allPartTrials.filter(t => selectedTrialIds.includes(t.id));

    const handleToggle = (id: any) => {
      if (selectedTrialIds.includes(id)) {
        setSelectedTrialIds(selectedTrialIds.filter(tid => tid !== id));
      } else {
        setSelectedTrialIds([...selectedTrialIds, id].sort((a: any, b: any) => {
          return allPartTrials.find((t: any)=>t.id===a).trialNo - allPartTrials.find((t: any)=>t.id===b).trialNo;
        }));
      }
    };

    return (
      <div className="space-y-4">
        <style dangerouslySetInnerHTML={{__html: printStyles}} />
        
        <div className="no-print bg-white p-4 rounded-lg shadow border-t-4 border-blue-500">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
             <h3 className="font-bold text-gray-700 flex items-center"><Printer className="mr-2 w-5 h-5"/> เลือก Trial ที่ต้องการพิมพ์ Report:</h3>
             <div className="flex gap-4">
                <button onClick={() => setSelectedTrialIds(allPartTrials.map(t => t.id))} className="text-sm text-blue-600 font-semibold hover:underline">เลือกทั้งหมด</button>
                <button onClick={() => setSelectedTrialIds([])} className="text-sm text-gray-500 font-semibold hover:underline">ล้างทั้งหมด</button>
             </div>
          </div>
          {allPartTrials.length === 0 ? (
             <p className="text-sm text-gray-500">ยังไม่มีประวัติการ Trial</p>
          ) : (
             <div className="flex flex-wrap gap-3 mb-4">
               {allPartTrials.map(t => (
                  <label key={t.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded border transition-colors ${selectedTrialIds.includes(t.id) ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                    <input type="checkbox" checked={selectedTrialIds.includes(t.id)} onChange={() => handleToggle(t.id)} className="w-4 h-4 text-blue-600 rounded" />
                    <span className={`text-sm ${selectedTrialIds.includes(t.id) ? 'text-blue-900 font-semibold' : 'text-gray-500'}`}>Trial #{t.trialNo} ({t.date})</span>
                  </label>
               ))}
             </div>
          )}
          <div className="flex justify-end pt-2">
            <button onClick={() => window.print()} disabled={partTrialsToReport.length === 0} className={`px-6 py-2 rounded-lg flex items-center shadow font-bold text-white transition-colors ${partTrialsToReport.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
              <Printer className="w-5 h-5 mr-2" /> Print PPAP / PDF
            </button>
          </div>
        </div>

        <div id="printable-area" className="bg-white p-8 rounded-lg shadow max-w-4xl mx-auto text-sm">
          <div className="flex flex-col md:flex-row items-start justify-between border-b-2 border-blue-900 pb-4 mb-6">
            <div className="flex items-center">
              <div className="print-exact-color bg-[#003399] text-white p-3 rounded flex flex-col items-center justify-center w-40 h-16 mr-4">
                 <span className="font-bold text-xl leading-none">WISDOM</span>
                 <span className="text-[10px] tracking-[0.2em] mt-1">AUTOPARTS</span>
              </div>
              <div>
                 <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider text-gray-800">Injection Trial & Inspection Report</h1>
                 <p className="text-gray-500 text-sm font-semibold">WISDOM AUTOPARTS CO.,LTD.</p>
              </div>
            </div>
            <div className="text-right text-gray-500 text-xs mt-2 md:mt-0">
               <p className="font-bold">Doc No: WI-PE3-02</p>
               <p>Print Date: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="w-2/3 grid grid-cols-2 gap-y-2 bg-gray-50 p-4 rounded border border-gray-200">
              <div><span className="font-semibold text-gray-600">Customer:</span> {path.client.name}</div>
              <div><span className="font-semibold text-gray-600">Model:</span> {path.model.name}</div>
              <div className="col-span-2 text-lg font-bold text-blue-900 border-b pb-1 mb-1">{path.part.code} : {path.part.name}</div>
              <div><span className="font-semibold text-gray-600">Material:</span> {path.part.material}</div>
              <div><span className="font-semibold text-gray-600">Cavity:</span> {path.part.cavity}</div>
              <div><span className="font-semibold text-gray-600">STD Weight:</span> {path.part.stdWeight} ± {path.part.stdWeightTol || 0} g</div>
              <div><span className="font-semibold text-gray-600">STD Cycle Time:</span> {path.part.stdCycleTime} ± {path.part.stdCycleTimeTol || 0} sec</div>
            </div>
            <div className="w-1/3 border border-gray-200 rounded p-2 flex items-center justify-center bg-white overflow-hidden">
              {path.part.img ? <img src={path.part.img} className="max-h-32 object-contain cursor-pointer" alt="Part" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(path.part.img); }} /> : <span className="text-gray-300">No Image</span>}
            </div>
          </div>

          {partTrialsToReport.length === 0 && <p className="text-center text-gray-400 py-10">--- กรุณาเลือก Trial ที่ต้องการพิมพ์จากแผงควบคุมด้านบน ---</p>}

          <div className="space-y-12">
            {partTrialsToReport.map((t: any, index: number) => (
              <div key={t.id} className={`${index !== 0 ? 'page-break-before' : ''}`}>
                <div className="border-2 border-gray-300 rounded-lg p-0 bg-white overflow-hidden">
                  <div className="print-exact-color bg-gray-800 text-white p-2 flex justify-between items-center">
                    <span className="font-bold">TRIAL EVENT #{t.trialNo}</span>
                    <span>Date: {t.date} | PE: {t.peName || 'N/A'}</span>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                       <div className="border p-2 rounded bg-gray-50">
                          <div className="text-xs text-gray-500">ACT Weight</div>
                          <div className={`font-bold ${checkNg(t.actWeight, path.part.stdWeight, path.part.stdWeightTol) ? 'text-red-600' : 'text-green-600'}`}>{t.actWeight || '-'} g</div>
                       </div>
                       <div className="border p-2 rounded bg-gray-50">
                          <div className="text-xs text-gray-500">ACT Cycle Time</div>
                          <div className={`font-bold ${checkNg(t.actCycleTime, path.part.stdCycleTime, path.part.stdCycleTimeTol) ? 'text-red-600' : 'text-green-600'}`}>{t.actCycleTime || '-'} sec</div>
                       </div>
                       <div className="border p-2 rounded bg-gray-50">
                          <div className="text-xs text-gray-500">Good / NG Parts</div>
                          <div className="font-bold text-gray-800">{t.goodParts || '0'} / {t.ngParts || '0'}</div>
                       </div>
                       <div className="border p-2 rounded bg-gray-50 flex flex-col items-center justify-center">
                          <div className="text-xs text-gray-500 mb-1">Limit Sample</div>
                          {t.limitSampleOk ? <span className="print-exact-color bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold">APPROVED</span> : <span className="print-exact-color bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded">PENDING</span>}
                       </div>
                    </div>

                    {t.partProblems.length > 0 && (
                      <div className="border border-red-200 rounded p-2 bg-red-50/30">
                         <h4 className="font-bold text-red-800 text-xs border-b border-red-200 pb-1 mb-2">PART DEFECTS (ปัญหาชิ้นงาน)</h4>
                         <div className="grid grid-cols-2 gap-2">
                           {t.partProblems.map((p: any) => (
                              <div key={p.id} className="flex gap-2 text-xs">
                                 {p.img && <img src={p.img} className="w-16 h-16 object-cover border cursor-pointer" alt="NG" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(p.img); }} />}
                                 <div>
                                   <div className="font-bold text-red-700">{p.defect}</div>
                                   <div className="text-gray-600">{p.note}</div>
                                 </div>
                              </div>
                           ))}
                         </div>
                      </div>
                    )}
                    
                    {t.moldProblems.length > 0 && (
                      <div className="border border-orange-200 rounded p-2 bg-orange-50/30">
                         <h4 className="font-bold text-orange-800 text-xs border-b border-orange-200 pb-1 mb-2">MOLD DEFECTS (ปัญหาแม่พิมพ์)</h4>
                         <div className="grid grid-cols-2 gap-2">
                           {t.moldProblems.map((p: any) => (
                              <div key={p.id} className="flex gap-2 text-xs">
                                 {p.img && <img src={p.img} className="w-16 h-16 object-cover border cursor-pointer" alt="Mold NG" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(p.img); }} />}
                                 <div>
                                   <div className="text-gray-700">{p.note}</div>
                                 </div>
                              </div>
                           ))}
                         </div>
                      </div>
                    )}

                    <div className="border border-blue-200 rounded p-2 bg-blue-50/20">
                        <h4 className="font-bold text-blue-800 text-xs border-b border-blue-200 pb-1 mb-2">ATTACHMENTS (รูปภาพอ้างอิงการตั้งค่าหน้างาน)</h4>
                        <div className="flex flex-wrap gap-2">
                            {t.images.setupClose && <div className="text-center w-20"><img src={t.images.setupClose} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Close" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(t.images.setupClose); }}/><div className="text-[10px] mt-1">แม่พิมพ์ปิด</div></div>}
                            {t.images.setupOpen && <div className="text-center w-20"><img src={t.images.setupOpen} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Open" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(t.images.setupOpen); }}/><div className="text-[10px] mt-1">แม่พิมพ์เปิด</div></div>}
                            {t.images.cav && <div className="text-center w-20"><img src={t.images.cav} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Cav" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(t.images.cav); }}/><div className="text-[10px] mt-1">ฝั่ง Cavity</div></div>}
                            {t.images.core && <div className="text-center w-20"><img src={t.images.core} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Core" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(t.images.core); }}/><div className="text-[10px] mt-1">ฝั่ง Core</div></div>}
                            {t.images.coreEjector && <div className="text-center w-20"><img src={t.images.coreEjector} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Core EJ" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(t.images.coreEjector); }}/><div className="text-[10px] mt-1">เช็คปลดงาน</div></div>}
                            {t.images.resin && <div className="text-center w-20"><img src={t.images.resin} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Resin" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(t.images.resin); }}/><div className="text-[10px] mt-1">กระสอบเม็ด</div></div>}
                            {t.images.machine && <div className="text-center w-20"><img src={t.images.machine} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Mc" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(t.images.machine); }}/><div className="text-[10px] mt-1">เครื่องจักร</div></div>}
                            
                            {t.equipmentImages.map((eq: any) => eq.img && (
                                <div key={eq.id} className="text-center w-20">
                                   <img src={eq.img} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Eq" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(eq.img); }}/>
                                   <div className="text-[10px] mt-1 truncate">{eq.note || 'อุปกรณ์เสริม'}</div>
                                </div>
                            ))}
                            
                            {t.monitorImages.map((m: any) => m.img && (
                                <div key={m.id} className="text-center w-20">
                                   <img src={m.img} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Monitor" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(m.img); }}/>
                                   <div className="text-[10px] mt-1 truncate">{m.note || 'หน้าจอ'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {t.meetingImages && t.meetingImages.length > 0 && (
                      <div className="border border-green-200 rounded p-2 bg-green-50/20 mt-2">
                          <h4 className="font-bold text-green-800 text-xs border-b border-green-200 pb-1 mb-2">MEETING & DISCUSSION (ภาพบรรยากาศการประชุมหลังทดลอง)</h4>
                          <div className="flex flex-wrap gap-2">
                              {t.meetingImages.map((m: any) => m.img && (
                                  <div key={m.id} className="text-center w-24">
                                     <img src={m.img} className="h-16 w-full object-contain border bg-white cursor-pointer" alt="Meeting" onClick={(e: any) => { e.stopPropagation(); setZoomedImg(m.img); }}/>
                                  </div>
                              ))}
                          </div>
                      </div>
                    )}

                    <div className="border border-gray-200 rounded p-3 bg-gray-50 text-xs mt-4">
                       <p><strong>Action Plan:</strong> {t.makerAction || '-'}</p>
                       <p><strong>Next Delivery/Trial:</strong> {t.deliveryDate || '-'} / {t.nextTrialDate || '-'}</p>
                       
                       <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                          <div>
                            <div className="border-b border-gray-400 w-3/4 mx-auto mb-1 h-8 flex items-end justify-center font-[cursive] text-lg text-blue-800">{t.peName}</div>
                            <p>Production Eng. (PE)</p>
                          </div>
                          <div>
                            <div className="border-b border-gray-400 w-3/4 mx-auto mb-1 h-8"></div>
                            <p>Quality Control (QC)</p>
                          </div>
                          <div>
                            <div className="border-b border-gray-400 w-3/4 mx-auto mb-1 h-8"></div>
                            <p>Tooling Maker</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans selection:bg-blue-200">
      <header className="bg-blue-800 text-white p-3 shadow-md sticky top-0 z-30 no-print border-b-4 border-blue-500">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            {view !== 'clients' && activeTab === 'projects' && (
              <button onClick={goBack} className="mr-3 p-1.5 hover:bg-blue-700 rounded-full transition-colors bg-blue-900">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg md:text-xl font-bold tracking-wide uppercase flex items-center">
              WISDOM AUTOPARTS | New Model Trial
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setActiveTab('projects'); setView('clients'); }}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors flex items-center ${activeTab === 'projects' ? 'bg-white text-blue-900 shadow' : 'bg-blue-900 text-blue-200 hover:bg-blue-700'}`}
            >
              <FolderKanban className="w-4 h-4 mr-1.5" /> โครงการ
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors flex items-center ${activeTab === 'calendar' ? 'bg-white text-blue-900 shadow' : 'bg-blue-900 text-blue-200 hover:bg-blue-700'}`}
            >
              <CalendarDays className="w-4 h-4 mr-1.5" /> ปฏิทินนัดคิว
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-6">
        {activeTab === 'calendar' ? (
          <CalendarView />
        ) : (
          <>
            {view === 'clients' && <ClientsView />}
            {view === 'models' && <ModelsView />}
            {view === 'parts' && <PartsView />}
            {view === 'trials' && <TrialsView />}
            {view === 'trial_form' && <TrialForm />}
            {view === 'report' && <ReportView />}
          </>
        )}
      </main>

      {/* Lightbox สำหรับคลิกขยายรูปภาพ */}
      {zoomedImg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoomedImg(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black" onClick={() => setZoomedImg(null)}>
            <X size={24} />
          </button>
          <img src={zoomedImg} alt="Zoomed" className="max-w-[95vw] max-h-[95vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
