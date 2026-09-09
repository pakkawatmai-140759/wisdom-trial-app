import React, { useState } from 'react';

export default function App() {
  // state สำหรับเก็บข้อความใน Note ด้านข้างแบบอิสระ
 const [note, setNote] = useState('');

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      
      {/* CSS สำหรับสั่งพิมพ์ (Print Styles) - แนวกระดาษแนวตั้ง A4 */}
      <style>{`
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
          
          tr { page-break-inside: auto !important; page-break-after: auto !important; }
          td { page-break-inside: auto !important; }
          
          .page-break-before { page-break-before: always !important; }
          
          img { max-width: 100% !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* ส่วนหัวจำลองของระบบ */}
      <div style={{ backgroundColor: '#1d4ed8', color: '#fff', padding: '12px 20px', borderRadius: '6px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>WISDOM | NEW MODEL TRIAL</h2>
        <span style={{ fontSize: '14px' }}>ปฏิทินจองคิว</span>
      </div>

      {/* Layout หลัก: ปฏิทิน (ซ้าย) และ Note แยกอิสระ (ขวา) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap' }}>
        
        {/* ฝั่งซ้าย: ปฏิทินหลัก */}
        <div style={{ flex: 1, minWidth: '300px', background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>📅 ปฏิทินจองคิว - กันยายน 2569</h3>
            <button style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>+ เพิ่มงาน</button>
          </div>

          {/* จำลองตารางปฏิทิน */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#f3f4f6', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div>อาทิตย์</div><div>จันทร์</div><div>อังคาร</div><div>พุธ</div><div>พฤหัสฯ</div><div>ศุกร์</div><div>เสาร์</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: '260px', fontSize: '13px' }}>
              {/* ช่องตัวอย่างวันในปฏิทิน */}
              <div style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '6px' }}>1</div>
              <div style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '6px' }}>2</div>
              <div style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '6px' }}>3</div>
              <div style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '6px' }}>4</div>
              <div style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '6px' }}>5</div>
              <div style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '6px' }}>6</div>
              <div style={{ borderBottom: '1px solid #e5e7eb', padding: '6px' }}>7</div>
            </div>
          </div>
        </div>

        {/* ฝั่งขวา: ช่อง Note แยกต่างหาก (ไม่เกี่ยวกับปฏิทิน) */}
        <div style={{ 
          width: '280px', 
          minWidth: '280px', 
          background: '#fff', 
          border: '1px solid #dcdcdc', 
          borderRadius: '8px', 
          padding: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '8px', fontSize: '16px' }}>
            Note:
          </div>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="พิมพ์บันทึกข้อความอิสระตรงนี้..."
            style={{
              width: '100%',
              height: '280px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              backgroundColor: '#fafafa',
              boxSizing: 'border-box'
            }}
          />
        </div>

      </div>
    </div>
  );
}
