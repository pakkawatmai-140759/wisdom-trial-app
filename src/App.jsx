import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, CalendarDays, Plus, ChevronLeft, ChevronRight, 
  Box, X, Save, Camera, Clock, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [view, setView] = useState('clients');
  const [path, setPath] = useState({ client: null, model: null, part: null });
  const [zoomedImg, setZoomedImg] = useState(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBooking, setIsBooking] = useState(false);
  
  const getInitialBookingData = () => ({
    id: null,
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    clientId: '',
    modelId: '',
    partId: '',
    trialNo: '1',
    machineNo: 'MC-01',
    resin: '',
    status: 'scheduled',
    proofImages: [],
    note: '' // เพิ่มฟิลด์สำหรับช่องโน๊ตเพิ่มเติม
  });

  const [bookingData, setBookingData] = useState(getInitialBookingData());

  // Mock Data States
  const [clients] = useState([
    { id: 'c1', name: 'TS-TECH' },
    { id: 'c2', name: 'NHK' },
    { id: 'c3', name: 'AAPICO' }
  ]);

  const [models] = useState([
    { id: 'm1', clientId: 'c1', name: '3DAA' },
    { id: 'm2', clientId: 'c1', name: 'POCKET DOOR' },
    { id: 'm3', clientId: 'c2', name: 'BEZEL DOOR' }
  ]);

  const [parts, setParts] = useState([
    { id: 'p1', modelId: 'm1', code: 'LOCK KNOB R/L WALK IN', cavity: '2' },
    { id: 'p2', modelId: 'm1', code: 'COVER COMP R RECLINING OUT', cavity: '1' },
    { id: 'p3', modelId: 'm1', code: 'UNDER COVER RR CTR MID SEAT', cavity: '2' }
  ]);

  const [trials, setTrials] = useState([
    { id: 't1', partId: 'p1', date: '2026-06-15', trialNo: '1', status: 'completed', note: 'ทดลองครั้งแรกผ่านเรียบร้อย' },
    { id: 't2', partId: 'p2', date: '2026-06-20', trialNo: '1', status: 'scheduled', note: 'รอวัตถุดิบเม็ดพลาสติก' }
  ]);

  const monthNamesThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)} ${monthNamesThai[parseInt(m) - 1]} ${parseInt(y) + 543}`;
  };

  const handleSaveBooking = () => {
    if (!bookingData.partId) {
      alert('กรุณาเลือกชิ้นส่วนที่ต้องการ Trial');
      return;
    }
    const newTrial = {
      ...bookingData,
      id: bookingData.id || 't_' + Date.now()
    };
    if (bookingData.id) {
      setTrials(trials.map(t => t.id === bookingData.id ? newTrial : t));
    } else {
      setTrials([...trials, newTrial]);
    }
    setIsBooking(false);
    setBookingData(getInitialBookingData());
  };

  const goBack = () => {
    if (view === 'trials') setView('parts');
    else if (view === 'parts') setView('models');
    else if (view === 'models') setView('clients');
    else if (view === 'trial_form') setView('trials');
  };

  const printStyles = `
    @media print {
      body { background: white !important; color: black !important; }
      .no-print { display: none !important; }
    }
  `;

  const renderCalendarGrid = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50/50 border border-gray-100 min-h-[100px] p-2 opacity-40"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTrials = trials.filter(t => t.date === dateStr);

      days.push(
        <div key={day} className="bg-white border border-gray-200 min-h-[110px] p-2 flex flex-col justify-between hover:bg-blue-50/20 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${dateStr === new Date().toISOString().split('T')[0] ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                {day}
              </span>
              <button onClick={() => { 
                setBookingData({ ...getInitialBookingData(), date: dateStr }); 
                setIsBooking(true); 
              }} className="text-gray-400 hover:text-blue-600 opacity-0 hover:opacity-100 transition-opacity">
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-1 overflow-y-auto max-h-[80px]">
              {dayTrials.map((trial, idx) => {
                const partObj = parts.find(p => p.id === trial.partId);
                return (
                  <div 
                    key={trial.id || idx}
                    onClick={() => { setBookingData(trial); setIsBooking(true); }}
                    className="text-xs bg-blue-50 border-l-2 border-blue-600 text-blue-900 p-1 rounded cursor-pointer hover:bg-blue-100 truncate shadow-xs"
                    title={partObj ? partObj.code : 'Trial Task'}
                  >
                    <span className="font-semibold">{trial.time || '08:00'}</span> - {partObj ? partObj.code : 'Mold Trial'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const weekdays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b text-center text-xs font-bold text-gray-600 py-2.5">
          {weekdays.map((w, i) => <div key={i}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 bg-gray-200 gap-px">
          {days}
        </div>

        {/* Modal Booking / Trial Form */}
        {isBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsBooking(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
              
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarDays className="text-blue-600" size={20} />
                เพิ่ม / จัดการตารางนัดหมาย Mold Trial
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">วันที่ Trial</label>
                    <input 
                      type="date" 
                      value={bookingData.date} 
                      onChange={e => setBookingData({...bookingData, date: e.target.value})}
                      className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">เวลา</label>
                    <input 
                      type="time" 
                      value={bookingData.time} 
                      onChange={e => setBookingData({...bookingData, time: e.target.value})}
                      className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">เลือกรุ่นชิ้นส่วน (Part Code)</label>
                  <select 
                    value={bookingData.partId}
                    onChange={e => setBookingData({...bookingData, partId: e.target.value})}
                    className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- กรุณาเลือกชิ้นส่วน --</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>{p.code} (Cavity: {p.cavity})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">เครื่องฉีด (Machine No.)</label>
                    <input 
                      type="text" 
                      value={bookingData.machineNo}
                      onChange={e => setBookingData({...bookingData, machineNo: e.target.value})}
                      placeholder="เช่น MC-01"
                      className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">สถานะ</label>
                    <select 
                      value={bookingData.status}
                      onChange={e => setBookingData({...bookingData, status: e.target.value})}
                      className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="scheduled">รอดำเนินการ (Scheduled)</option>
                      <option value="completed">เสร็จสิ้น (Completed)</option>
                      <option value="cancelled">ยกเลิก (Cancelled)</option>
                    </select>
                  </div>
                </div>

                {/* ช่องสำหรับใส่โน๊ตเพิ่มเติม (เพิ่มเข้ามาใหม่ตามความต้องการ) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">บันทึกเพิ่มเติม (Note)</label>
                  <textarea
                    value={bookingData.note || ''}
                    onChange={(e) => setBookingData(prev => ({ ...prev, note: e.target.value }))}
                    rows={3}
                    placeholder="ระบุหมายเหตุ หรือรายละเอียดเพิ่มเติม..."
                    className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-700">รูปภาพหลักฐาน / ตัวอย่างชิ้นงาน</label>
                    <input 
                      type="file" 
                      id="proof-img-file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBookingData(prev => ({
                              ...prev,
                              proofImages: [...(prev.proofImages || []), { id: Date.now(), img: reader.result }]
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button type="button" onClick={() => {
                        const input = document.getElementById('proof-img-file');
                        if(input) input.click();
                    }} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded shadow font-bold flex items-center transition-colors">
                        <Camera size={14} className="mr-1"/> เพิ่มรูปภาพ
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {(bookingData.proofImages || []).map((item, idx) => (
                        <div key={item.id || idx} className="relative border rounded-lg overflow-hidden group bg-gray-50 h-24 flex items-center justify-center">
                            <img src={item.img} alt="Proof" className="h-full object-contain" />
                            <button type="button" onClick={() => {
                                setBookingData(prev => ({
                                    ...prev,
                                    proofImages: prev.proofImages.filter((_, i) => i !== idx)
                                }));
                            }} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" title="ลบรูปนี้">
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                  </div>
                </div>
             </div>

             <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => { setIsBooking(false); setBookingData(getInitialBookingData()); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors">
                  ยกเลิก
                </button>
                <button onClick={handleSaveBooking} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow flex items-center transition-colors">
                  <Save size={18} className="mr-1.5" /> บันทึกตารางนัดหมาย
                </button>
             </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 pb-12 print:bg-white print:pb-0">
      <style>{printStyles}</style>
      
      {/* Zoom Modal */}
      {zoomedImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoomedImg(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={zoomedImg} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button onClick={() => setZoomedImg(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X size={28} />
            </button>
          </div>
        </div>
      )}

      {/* Main Header / Navigation */}
      <header className="bg-[#1e3a8a] text-white shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <Box className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">Wisdom Autoparts - Mold Trial Management</h1>
              <p className="text-xs text-blue-200">ระบบจัดการงานทดลองแม่พิมพ์และติดตามสถานะการผลิต</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'projects' ? 'bg-blue-600 text-white shadow' : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800'}`}>
              <FolderKanban size={16} /> จัดการโปรเจกต์
            </button>
            <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors ${activeTab === 'calendar' ? 'bg-blue-600 text-white shadow' : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800'}`}>
              <CalendarDays size={16} /> ปฏิทินงานฉีด
            </button>
          </div>
        </div>
      </header>

      {/* Content Body */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'calendar' ? (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
              <div className="flex items-center gap-3">
                <button onClick={handlePrevMonth} className="p-2 bg-white border rounded-lg hover:bg-gray-50 shadow-sm"><ChevronLeft size={20}/></button>
                <h2 className="text-xl font-bold text-blue-900 min-w-[200px] text-center">
                  {monthNamesThai[currentMonth]} {currentYear + 543}
                </h2>
                <button onClick={handleNextMonth} className="p-2 bg-white border rounded-lg hover:bg-gray-50 shadow-sm"><ChevronRight size={20}/></button>
              </div>
              <button onClick={() => { setBookingData(getInitialBookingData()); setIsBooking(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow flex items-center gap-2 transition-colors">
                <Plus size={18} /> เพิ่มตารางนัดหมาย / จองคิว
              </button>
            </div>
            {renderCalendarGrid()}
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FolderKanban className="text-blue-600" size={20} />
                  {view === 'clients' && 'รายชื่อลูกค้า (Clients)'}
                  {view === 'models' && 'รุ่นผลิตภัณฑ์ (Models)'}
                  {view === 'parts' && 'รายการแม่พิมพ์ / ชิ้นส่วน (Parts)'}
                  {view === 'trials' && 'ประวัติการทำ Trial แม่พิมพ์'}
                </h2>
                {view !== 'clients' && (
                  <button onClick={goBack} className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-semibold transition-colors">
                    ← ย้อนกลับ
                  </button>
                )}
              </div>

              {view === 'clients' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {clients.map(client => (
                    <div key={client.id} onClick={() => { setPath(p => ({...p, client})); setView('models'); }} className="p-5 border rounded-xl bg-white hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group">
                      <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600">{client.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">คลิกเพื่อดูรุ่นผลิตภัณฑ์</p>
                      </div>
                      <ChevronRight className="text-gray-400 group-hover:text-blue-500" size={20} />
                    </div>
                  ))}
                </div>
              )}

              {view === 'models' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {models.filter(m => m.clientId === path.client?.id).map(model => (
                    <div key={model.id} onClick={() => { setPath(p => ({...p, model})); setView('parts'); }} className="p-5 border rounded-xl bg-white hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group">
                      <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-600">Model: {model.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">คลิกเพื่อดูรายการชิ้นส่วนแม่พิมพ์</p>
                      </div>
                      <ChevronRight className="text-gray-400 group-hover:text-blue-500" size={20} />
                    </div>
                  ))}
                </div>
              )}

              {view === 'parts' && (
                <div>
                  <div className="mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">ลูกค้า: <strong>{path.client?.name}</strong> | Model: <strong>{path.model?.name}</strong></p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parts.filter(part => part.modelId === path.model?.id).map(part => (
                      <div key={part.id} onClick={() => { setPath(p => ({...p, part})); setView('trials'); }} className="p-4 border rounded-xl bg-white hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group">
                        <div>
                          <h4 className="font-bold text-gray-800 group-hover:text-blue-600 whitespace-pre-line">{part.code}</h4>
                          <p className="text-xs text-gray-500 mt-1">Cavity: {part.cavity || '-'}</p>
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-blue-500" size={20} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'trials' && (
                <div>
                  <div className="mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">ชิ้นส่วน: <strong className="whitespace-pre-line">{path.part?.code}</strong></p>
                    <button onClick={() => setView('trial_form')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2">
                      <Plus size={16} /> เพิ่มบันทึก Trial ใหม่
                    </button>
                  </div>
                  <div className="space-y-3">
                    {trials.filter(t => t.partId === path.part?.id).length === 0 ? (
                      <p className="text-center text-gray-500 py-8">ยังไม่มีประวัติการทำ Trial สำหรับชิ้นส่วนนี้</p>
                    ) : (
                      trials.filter(t => t.partId === path.part?.id).map((trial, idx) => (
                        <div key={trial.id || idx} className="p-4 border rounded-xl bg-white flex justify-between items-center shadow-sm">
                          <div>
                            <h5 className="font-bold text-gray-800">Trial ครั้งที่ #{trial.trialNo || (idx + 1)}</h5>
                            <p className="text-xs text-gray-500 mt-0.5">วันที่: {formatThaiDate(trial.date)} | สถานะ: {trial.status || 'draft'}</p>
                            {trial.note && <p className="text-xs text-gray-600 mt-1 italic">โน๊ต: {trial.note}</p>}
                          </div>
                          <button onClick={() => { setFormData(trial); setView('trial_form'); }} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
                            เปิดดู / แก้ไข
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
