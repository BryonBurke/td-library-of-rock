import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format } from 'date-fns';
import { MessageSquare, ExternalLink, Rss, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    // Chat listener
    const chatQuery = query(collection(db, 'chat_messages'), orderBy('createdAt', 'desc'));
    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chat_messages');
    });

    // Announcements listener
    const annQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribeAnn = onSnapshot(annQuery, (snapshot) => {
      const anns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(anns);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'announcements');
    });

    return () => {
      unsubscribeChat();
      unsubscribeAnn();
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userData) return;

    try {
      await addDoc(collection(db, 'chat_messages'), {
        authorId: user.uid,
        authorName: userData.displayName,
        content: newMessage.trim(),
        createdAt: Date.now()
      });
      setNewMessage('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'chat_messages');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT COLUMN: Announcements & Links */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* Schedule */}
        <section className="glass-panel p-6 rounded-2xl brutal-border">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-primary" />
            <h2 className="font-display text-3xl uppercase tracking-wider text-white">Class Schedule</h2>
          </div>
          
          <div className="space-y-4 font-mono text-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border-l-2 border-primary pl-4 py-2">
              <div className="text-white font-bold text-lg mb-1">June 24th</div>
              <div className="text-zinc-400">1:00 PM - 2:30 PM</div>
            </div>
            <div className="border-l-2 border-primary pl-4 py-2">
              <div className="text-white font-bold text-lg mb-1">July 1st</div>
              <div className="text-zinc-400">1:00 PM - 2:30 PM</div>
            </div>
            <div className="border-l-2 border-[#FF00FF] pl-4 py-2">
              <div className="text-white font-bold text-lg mb-1">July 8th</div>
              <div className="text-zinc-400">1:00 PM - 2:30 PM</div>
            </div>
            <div className="border-l-2 border-[#FF00FF] pl-4 py-2">
              <div className="text-white font-bold text-lg mb-1">July 15th</div>
              <div className="text-zinc-400">1:00 PM - 2:30 PM</div>
            </div>
          </div>
        </section>

        {/* Announcements Section */}
        <section className="glass-panel p-6 rounded-2xl brutal-border">
          <div className="flex items-center gap-3 mb-6 text-zinc-300">
            <Rss className="w-6 h-6" />
            <h2 className="font-display text-3xl uppercase tracking-wider">Loudspeaker</h2>
          </div>
          <div className="space-y-6">
            {announcements.length === 0 ? (
              <p className="text-zinc-500 font-mono italic">No announcements yet...</p>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="border-l-2 border-zinc-700 pl-4 py-1">
                  <h3 className="text-xl font-bold text-white mb-2">{ann.title}</h3>
                  <div className="text-zinc-300 whitespace-pre-wrap font-sans text-sm">{ann.content}</div>
                  <div className="mt-3 text-xs font-mono text-zinc-500 uppercase">
                    {format(new Date(ann.createdAt), "MMM d, yyyy - h:mm a")}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: Chat */}
      <section className="glass-panel rounded-2xl brutal-border flex flex-col h-[600px] lg:h-[calc(100vh-8rem)]">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-display text-2xl uppercase tracking-wider">Green Room Chat</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse space-y-4 space-y-reverse">
          {messages.map((msg) => {
            const isMe = msg.authorId === user?.uid;
            const isMod = userData?.role === 'moderator';
            const canDelete = isMe || isMod;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4 relative group`}>
                <div className="text-[10px] font-mono text-zinc-500 mb-1 px-1 tracking-widest uppercase flex items-center gap-2">
                  <span>{msg.authorName} • {format(new Date(msg.createdAt), "h:mm a")}</span>
                  {canDelete && (
                    <button 
                      onClick={async () => {
                        try {
                          await import('firebase/firestore').then(m => m.deleteDoc(m.doc(db, 'chat_messages', msg.id)));
                        } catch(e) { handleFirestoreError(e, OperationType.DELETE, 'chat_messages'); }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                      title="Delete msg"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                  isMe 
                    ? 'bg-primary text-white rounded-br-sm' 
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>
        
        <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Shred your thoughts..."
            className="w-full bg-black/50 border border-zinc-700 focus:border-primary rounded-full px-4 py-2 text-white font-sans text-sm outline-none transition-colors"
          />
        </form>
      </section>

    </div>
  );
}
