import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { Settings, Users, Megaphone, Clock, Activity, History } from 'lucide-react';

function PracticeTable({ 
  weekStartStr, 
  usersList, 
  allSessions, 
  handleRoleToggle 
}: { 
  weekStartStr: string, 
  usersList: any[], 
  allSessions: any[], 
  handleRoleToggle?: (uid: string, role: string) => void 
}) {
  const [y, m, d] = weekStartStr.split('-').map(Number);
  const weekStart = new Date(y, m - 1, d);
  const weekDays = Array.from({ length: 7 }).map((_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));
  const weekLabels = Array.from({ length: 7 }).map((_, i) => format(addDays(weekStart, i), 'EEE'));
  
  return (
    <div className="overflow-x-auto w-full pb-4">
      <table className="w-full text-left font-mono text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-zinc-700 text-zinc-500 uppercase tracking-widest text-[10px] sm:text-xs">
            <th className="pb-3 pl-2 pr-6">Student</th>
            <th className="pb-3 pr-6">Role</th>
            {weekLabels.map((lbl, i) => <th key={i} className="pb-3 px-2 text-center text-zinc-400">{lbl}</th>)}
            <th className="pb-3 px-4 text-center text-[#FFAA00]">Week Total</th>
            <th className="pb-3 px-4 text-center text-[#00FF00]">All-Time</th>
            {handleRoleToggle && <th className="pb-3 text-right pr-2 pl-4">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {usersList.map((u) => {
            const userSessions = allSessions.filter(s => s.userId === u.id);
            const totalMinutes = userSessions.filter(s => s.dateString <= weekDays[6]).reduce((acc, s) => acc + s.durationMinutes, 0); // up to this week
            
            const thisWeekMinutes = weekDays.reduce((acc, date) => {
              acc[date] = userSessions.filter(s => s.dateString === date).reduce((sum, s) => sum + s.durationMinutes, 0);
              return acc;
            }, {} as Record<string, number>);
            
            const weeklyTotal = Object.values(thisWeekMinutes).reduce((a,b) => a+b, 0);
            
            // For historical reports, we only hide students if they have 0 minutes all-time up to this week, AND zero this week, to keep the report focused. 
            // Wait, just showing everyone is fine as we are checking role too.
            
            return (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 pl-2 pr-6">
                  <div className="text-white font-bold truncate max-w-[120px] sm:max-w-xs">{u.displayName}</div>
                  <div className="text-zinc-500 text-[10px] sm:text-xs cursor-pointer hover:text-zinc-300 truncate max-w-[120px] sm:max-w-xs" onClick={() => {navigator.clipboard.writeText(u.id); alert('ID copied')}} title="Click to copy UID">{u.email}</div>
                </td>
                <td className="py-3 pr-6">
                  <span className={`px-2 py-1 rounded-sm text-[10px] sm:text-xs ${u.role === 'moderator' ? 'bg-[#FF00FF]/20 text-[#FF00FF]' : 'bg-primary/20 text-primary'}`}>
                    {u.role}
                  </span>
                </td>
                {weekDays.map((date, idx) => (
                  <td key={idx} className="py-3 px-2 text-center text-zinc-400">
                     {thisWeekMinutes[date] > 0 ? `${thisWeekMinutes[date]}m` : '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center text-[#FFAA00] font-bold">
                  {weeklyTotal > 0 ? `${weeklyTotal}m` : '-'}
                </td>
                <td className="py-3 px-4 text-center text-[#00FF00] font-bold">
                  {totalMinutes > 0 ? `${totalMinutes}m` : '-'}
                </td>
                {handleRoleToggle && (
                  <td className="py-3 text-right pr-2 pl-4">
                     <button 
                       onClick={() => handleRoleToggle(u.id, u.role)}
                       disabled={u.email === 'bryonparis@gmail.com'}
                       className="text-[10px] sm:text-xs border border-zinc-700 px-3 py-1 bg-black/40 hover:border-white transition-colors disabled:opacity-30 whitespace-nowrap"
                     >
                       Toggle Role
                     </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ModeratorPanel() {
  const { user } = useAuth();
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  
  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Report view state
  const [viewingReport, setViewingReport] = useState<boolean>(false);
  const [selectedReportWeek, setSelectedReportWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const uQuery = query(collection(db, 'users'));
    const unSubUsers = onSnapshot(uQuery, (snap) => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()}))), (e) => handleFirestoreError(e, OperationType.GET, 'users'));
    
    // All practice sessions
    const sQuery = query(collection(db, 'practice_sessions'));
    const unSubSessions = onSnapshot(sQuery, (snap) => {
      setAllSessions(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (e) => handleFirestoreError(e, OperationType.GET, 'practice_sessions'));

    return () => { unSubUsers(); unSubSessions(); };
  }, [user]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!annContent.trim() || !user) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        authorId: user.uid,
        title: annTitle.trim(),
        content: annContent.trim(),
        createdAt: Date.now()
      });
      setAnnTitle('');
      setAnnContent('');
      alert("Announcement posted.");
    } catch(e) { handleFirestoreError(e, OperationType.CREATE, 'announcements'); }
  };

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'student' ? 'moderator' : 'student';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch(e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`); }
  };

  const getWeekStart = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  };

  const currentWeekStartStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const pastWeeks = Array.from(new Set<string>(allSessions.map(s => getWeekStart(s.dateString))))
    .filter(w => w !== currentWeekStartStr)
    .sort((a, b) => b.localeCompare(a));

  if (viewingReport) {
    return (
      <div className="space-y-8 pb-12">
        <div className="border-b brutal-border border-x-0 border-t-0 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <History className="w-8 h-8 text-[#00FFFF]" />
            <h1 className="font-display text-2xl sm:text-4xl uppercase tracking-widest text-[#00FFFF]">Past Reports</h1>
          </div>
          <button onClick={() => setViewingReport(false)} className="border border-zinc-700 px-4 py-3 sm:py-2 hover:bg-white hover:text-black transition-colors uppercase font-bold text-xs whitespace-nowrap self-start sm:self-auto">
            Back to Station
          </button>
        </div>
        
        {pastWeeks.length === 0 ? (
          <div className="text-zinc-500 text-center py-12 font-mono text-sm uppercase tracking-widest border border-zinc-800 border-dashed rounded-xl">No past weeks available yet.</div>
        ) : (
          <div className="space-y-8">
             <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
               {pastWeeks.map(w => (
                 <button 
                   key={w}
                   onClick={() => setSelectedReportWeek(w)}
                   className={`px-4 py-2 whitespace-nowrap text-xs font-bold uppercase tracking-widest border transition-colors ${selectedReportWeek === w ? 'border-[#00FFFF] bg-[#00FFFF]/10 text-[#00FFFF]' : 'border-zinc-700 text-zinc-400 hover:text-white'}`}
                 >
                   Week of {format(new Date(w + 'T12:00:00'), 'MMM d, yyyy')}
                 </button>
               ))}
             </div>
             
             {selectedReportWeek && (
               <section className="glass-panel p-6 rounded-2xl brutal-border overflow-hidden">
                 <PracticeTable 
                   weekStartStr={selectedReportWeek} 
                   usersList={usersList} 
                   allSessions={allSessions} 
                 />
               </section>
             )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b brutal-border border-x-0 border-t-0 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Settings className="w-8 h-8 text-[#FF00FF]" />
          <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-widest text-[#FF00FF]">Mod Station</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* POST ANNOUNCEMENT */}
        <section className="glass-panel p-6 rounded-2xl brutal-border">
          <div className="flex items-center gap-2 mb-6">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl uppercase tracking-wider">Broadcast</h2>
          </div>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <input 
              type="text" 
              placeholder="Title (Optional)"
              value={annTitle}
              onChange={e => setAnnTitle(e.target.value)}
              className="w-full bg-black/50 border border-zinc-700 p-3 text-white font-mono text-sm outline-none focus:border-primary"
            />
            <textarea 
              placeholder="Message body..."
              required
              value={annContent}
              onChange={e => setAnnContent(e.target.value)}
              className="w-full h-32 bg-black/50 border border-zinc-700 p-3 text-white font-sans text-sm outline-none focus:border-primary resize-none"
            />
            <button type="submit" className="bg-primary text-black font-bold uppercase tracking-widest px-6 py-3 hover:bg-white hover:text-black transition-colors text-sm">
              Publish
            </button>
          </form>
        </section>
      </div>

      {/* USER MANAGEMENT & PRACTICE BREAKDOWN */}
      <section className="glass-panel p-6 rounded-2xl brutal-border overflow-hidden flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00FFFF]" />
            <h2 className="font-display text-2xl uppercase tracking-wider text-[#00FFFF]">Roll Call & Practice Data</h2>
          </div>
          <button 
             onClick={() => setViewingReport(true)}
             className="border border-[#00FFFF] text-[#00FFFF] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#00FFFF] hover:text-black transition-colors flex items-center gap-2 justify-center"
          >
             <History className="w-4 h-4" />
             Past Reports
          </button>
        </div>
        
        <PracticeTable 
          weekStartStr={currentWeekStartStr} 
          usersList={usersList} 
          allSessions={allSessions} 
          handleRoleToggle={handleRoleToggle}
        />
      </section>

    </div>
  );
}
