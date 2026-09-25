import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Shield, User } from 'lucide-react';
import { db, collection, doc, setDoc, query, where, onSnapshot } from '../firebase';
import { AnonymousMessage } from '../types';
import { playClickSound } from '../utils/audio';

interface AnonymousSantaChatProps {
  exchangeId: string;
  santaId: string;
  recipientId: string;
  currentUserId: string;
  recipientName: string;
}

export const AnonymousSantaChat: React.FC<AnonymousSantaChatProps> = ({
  exchangeId,
  santaId,
  recipientId,
  currentUserId,
  recipientName,
}) => {
  const [messages, setMessages] = useState<AnonymousMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const isSanta = currentUserId === santaId;
  const isRecipient = currentUserId === recipientId;

  useEffect(() => {
    // Listen to messages between this santa and recipient pair
    const q = query(
      collection(db, 'exchanges', exchangeId, 'messages'),
      where('santaId', '==', santaId),
      where('recipientId', '==', recipientId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AnonymousMessage[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as AnonymousMessage);
      });
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(list);
    });

    return () => unsubscribe();
  }, [exchangeId, santaId, recipientId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setSending(true);
      const msgId = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const newMsg: AnonymousMessage = {
        id: msgId,
        exchangeId,
        santaId,
        recipientId,
        senderId: currentUserId,
        senderType: isSanta ? 'santa' : 'recipient',
        text: inputText.trim(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'exchanges', exchangeId, 'messages', msgId), newMsg);
      setInputText('');
      playClickSound();
    } catch (err) {
      console.error('Failed to send anonymous message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-700 dark:text-red-400" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            {isSanta ? 'Anonymous Santa Note' : 'Message from your Secret Santa'}
          </h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
          {isSanta ? 'Your identity is hidden' : 'Santa is anonymous'}
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {isSanta
          ? `Ask ${recipientName} an anonymous question about sizes or favorite flavors!`
          : 'Your Secret Santa can send you questions here without revealing who they are.'}
      </p>

      {/* Message History */}
      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500 italic">
            No messages sent yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isFromSanta = msg.senderType === 'santa';

            return (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg text-xs max-w-[85%] ${
                  isMe
                    ? 'ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'mr-auto bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                }`}
              >
                <div className="text-[10px] font-semibold opacity-70 mb-0.5 flex items-center gap-1">
                  {isFromSanta ? (
                    <>
                      <Shield className="w-2.5 h-2.5" />
                      <span>Secret Santa 🎅</span>
                    </>
                  ) : (
                    <>
                      <User className="w-2.5 h-2.5" />
                      <span>{recipientName}</span>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
        <input
          type="text"
          placeholder={isSanta ? 'Ask Santa question anonymously...' : 'Reply to Santa...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
