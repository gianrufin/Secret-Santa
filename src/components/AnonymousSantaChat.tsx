import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquare, 
  Shield, 
  User, 
  Sparkles, 
  HelpCircle, 
  AlertCircle,
  Inbox,
  Lock
} from 'lucide-react';
import { db, collection, doc, setDoc, query, where, onSnapshot } from '../firebase';
import { AnonymousMessage } from '../types';
import { playClickSound, playChimeSound } from '../utils/audio';

interface AnonymousSantaChatProps {
  exchangeId: string;
  santaId: string;
  recipientId: string;
  currentUserId: string;
  recipientName: string;
}

const QUICK_QUESTIONS = [
  '👕 What are your clothing or shoe sizes?',
  '🍫 Any favorite snacks, sweets, or coffee?',
  '🚫 Any allergies or things to avoid?',
  '🎨 What are your favorite colors or aesthetics?',
  '📚 What are your top hobbies or fandoms right now?',
];

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const AnonymousSantaChat: React.FC<AnonymousSantaChatProps> = ({
  exchangeId,
  santaId,
  recipientId,
  currentUserId,
  recipientName,
}) => {
  // 'to_recipient': You (as Santa) talking to your recipient
  // 'from_santa': Your Secret Santa talking to You (as recipient)
  const [activeTab, setActiveTab] = useState<'to_recipient' | 'from_santa'>('to_recipient');

  const [toRecipientMessages, setToRecipientMessages] = useState<AnonymousMessage[]>([]);
  const [fromSantaMessages, setFromSantaMessages] = useState<AnonymousMessage[]>([]);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to messages between current user (Santa) and assigned recipient
  useEffect(() => {
    if (!exchangeId || !santaId || !recipientId) return;

    try {
      const q = query(
        collection(db, 'exchanges', exchangeId, 'messages'),
        where('santaId', '==', santaId),
        where('recipientId', '==', recipientId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: AnonymousMessage[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as AnonymousMessage);
          });
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setToRecipientMessages(list);
          setError(null);
        },
        (err) => {
          console.error('Error fetching recipient chat messages:', err);
          setError('Could not load chat messages. Please check network connection.');
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Chat setup error:', err);
      setError(err.message || 'Chat service initialization error.');
    }
  }, [exchangeId, santaId, recipientId]);

  // 2. Subscribe to messages where current user is the recipient (messages from user's own Secret Santa)
  useEffect(() => {
    if (!exchangeId || !currentUserId) return;

    try {
      const qSanta = query(
        collection(db, 'exchanges', exchangeId, 'messages'),
        where('recipientId', '==', currentUserId)
      );

      const unsubscribeSanta = onSnapshot(
        qSanta,
        (snapshot) => {
          const list: AnonymousMessage[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as AnonymousMessage);
          });
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setFromSantaMessages(list);
        },
        (err) => {
          console.error('Error fetching secret santa notes for current user:', err);
        }
      );

      return () => unsubscribeSanta();
    } catch (err) {
      console.error('Santa messages subscription error:', err);
    }
  }, [exchangeId, currentUserId]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [toRecipientMessages, fromSantaMessages, activeTab]);

  const activeMessages = activeTab === 'to_recipient' ? toRecipientMessages : fromSantaMessages;

  // For the 'from_santa' tab: find the Santa's UID from existing messages in the thread if any
  const existingSantaId = fromSantaMessages.length > 0 ? fromSantaMessages[0].santaId : null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending) return;

    setError(null);
    setSending(true);

    try {
      const msgId = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

      let msgSantaId = santaId;
      let msgRecipientId = recipientId;
      let senderType: 'santa' | 'recipient' = 'santa';

      if (activeTab === 'to_recipient') {
        // You are Santa sending to your recipient
        msgSantaId = santaId;
        msgRecipientId = recipientId;
        senderType = 'santa';
      } else {
        // You are the recipient replying to your Secret Santa
        if (!existingSantaId) {
          throw new Error('Your Secret Santa has not messaged you yet! You can reply once they ask a question.');
        }
        msgSantaId = existingSantaId;
        msgRecipientId = currentUserId;
        senderType = 'recipient';
      }

      const newMsg: AnonymousMessage = {
        id: msgId,
        exchangeId,
        threadId: `${msgSantaId}_${msgRecipientId}`,
        santaId: msgSantaId,
        recipientId: msgRecipientId,
        senderId: currentUserId,
        senderType,
        text: textToSend,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'exchanges', exchangeId, 'messages', msgId), newMsg);
      setInputText('');
      playClickSound();
    } catch (err: any) {
      console.error('Failed to send anonymous message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSelectQuickQuestion = (question: string) => {
    setInputText(question);
    playClickSound();
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>Secret Santa Anonymous Q&A</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                100% Private
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Ask sneaky questions without spoiling who you drew!
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('to_recipient');
              setError(null);
              playClickSound();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'to_recipient'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>🎅 Ask {recipientName}</span>
            {toRecipientMessages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400">
                {toRecipientMessages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('from_santa');
              setError(null);
              playClickSound();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'from_santa'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>🤫 Notes from Your Santa</span>
            {fromSantaMessages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold">
                {fromSantaMessages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Subheader info depending on tab */}
      {activeTab === 'to_recipient' ? (
        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              You are sending to <strong>{recipientName}</strong>. Your identity is hidden—they will only see <strong>&quot;Secret Santa 🎅&quot;</strong>.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 font-bold uppercase tracking-wider shrink-0">
            Anonymous
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-purple-800 dark:text-purple-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <span>
              These are anonymous questions from whoever drew <strong>your</strong> name. You can reply directly here!
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-200/60 dark:bg-purple-900/60 font-bold uppercase tracking-wider shrink-0">
            Private Inbox
          </span>
        </div>
      )}

      {/* Error notification if any */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-[11px] font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Message History Container */}
      <div className="space-y-3 min-h-[140px] max-h-60 overflow-y-auto pr-1 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/70 dark:border-zinc-800/70">
        {activeMessages.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-2">
            {activeTab === 'to_recipient' ? (
              <>
                <Inbox className="w-6 h-6 mx-auto opacity-50" />
                <p>No questions sent to {recipientName} yet.</p>
                <p className="text-[11px] opacity-75">
                  Pick a suggested question below or type your own sneaky note!
                </p>
              </>
            ) : (
              <>
                <Shield className="w-6 h-6 mx-auto opacity-50 text-purple-500" />
                <p className="font-medium text-zinc-600 dark:text-zinc-400">
                  No questions from your Secret Santa yet!
                </p>
                <p className="text-[11px] max-w-xs mx-auto opacity-75">
                  When your Secret Santa has a question about your sizes or wishlist preferences, their anonymous note will show up here.
                </p>
              </>
            )}
          </div>
        ) : (
          activeMessages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isFromSanta = msg.senderType === 'santa';

            // Author name logic:
            let authorLabel = 'Secret Santa 🎅';
            if (activeTab === 'to_recipient') {
              // In this tab: Santa is current user, Recipient is recipientName
              authorLabel = isMe ? 'You (Secret Santa 🎅)' : recipientName;
            } else {
              // In this tab: Santa is anonymous Santa, Recipient is current user
              authorLabel = isMe ? 'You' : 'Secret Santa 🎅';
            }

            return (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl text-xs max-w-[85%] shadow-2xs space-y-1 transition-all ${
                  isMe
                    ? 'ml-auto bg-red-700 text-white dark:bg-red-800 rounded-br-xs'
                    : 'mr-auto bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] font-semibold opacity-80 pb-0.5">
                  <div className="flex items-center gap-1">
                    {isFromSanta ? (
                      <Shield className="w-3 h-3 text-amber-300 dark:text-amber-400" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    <span>{authorLabel}</span>
                  </div>
                  {msg.createdAt && (
                    <span className="text-[9px] opacity-70">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed break-words font-medium">
                  {msg.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions (Shown in Santa tab if draft is empty) */}
      {activeTab === 'to_recipient' && !inputText && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Suggested Questions:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSelectQuickQuestion(q)}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Form */}
      {activeTab === 'from_santa' && !existingSantaId ? (
        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-center text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          Waiting for your Secret Santa to send the first note! When they do, you can reply directly from here.
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder={
              activeTab === 'to_recipient'
                ? `Ask ${recipientName} an anonymous question...`
                : 'Reply anonymously to your Secret Santa...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            maxLength={500}
            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 active:scale-98 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
