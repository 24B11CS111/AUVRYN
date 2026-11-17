import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  executeMobileAIGateway,
  getMobileParentLinkedStudents,
} from '../lib/aiService';

interface ParentAICompanionScreenProps {
  userId: string;
  institutionId: string;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'parent' | 'companion';
  text: string;
}

export const ParentAICompanionScreen: React.FC<ParentAICompanionScreenProps> = ({
  userId,
  institutionId,
  onClose,
}) => {
  const [children, setChildren] = useState<Array<{ id: string; name: string; className: string }>>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'p1',
      sender: 'companion',
      text: 'Hello! I am your mobile Parent AI Companion. I can help explain your child\'s marks, attendance, and weekly schedule with gentle home learning tips.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getMobileParentLinkedStudents(institutionId, userId).then((linked) => {
      setChildren(linked);
      if (linked.length > 0) {
        setSelectedChildId(linked[0]?.id || '');
      }
    });
  }, [institutionId, userId]);

  const activeChild = children.find((c) => c.id === selectedChildId);

  const handleSendMessage = async (promptOverride?: string) => {
    const textToSend = promptOverride || inputText.trim();
    if (!textToSend || !selectedChildId || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'parent',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptOverride) setInputText('');
    setErrorMessage(null);
    setIsSending(true);

    const res = await executeMobileAIGateway({
      institutionId,
      taskType: 'parent_summary',
      prompt: textToSend,
      contextType: 'student',
      contextId: selectedChildId,
      systemContext: 'You are an encouraging, empathetic parent companion. Highlight effort and positive habits. Never compare to peers.',
    });

    setIsSending(false);
    if (res.success && res.content) {
      setMessages((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, sender: 'companion', text: res.content || '' },
      ]);
    } else {
      setErrorMessage(res.error?.message || 'Unable to receive companion advice at this time.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AUVRYN Parent AI Companion</Text>
          <Text style={styles.headerSub}>Empathetic School Journey Support</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Child Switcher */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroll}>
          {children.map((c) => {
            const isSel = c.id === selectedChildId;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedChildId(c.id)}
                style={[styles.childPill, isSel && styles.childPillActive]}
              >
                <Text style={[styles.childPillText, isSel && styles.childPillTextActive]}>
                  {c.name} ({c.className})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Child Label */}
      <View style={styles.activeChildBanner}>
        <Text style={styles.activeChildText}>
          {activeChild ? `Discussing: ${activeChild.name} (${activeChild.className})` : 'Child Profile'}
        </Text>
        <Text style={styles.privateText}>Confidential Guidance</Text>
      </View>

      {/* Quick Action Pills */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          onPress={() => handleSendMessage('Please explain my child\'s latest exam marks and progress in plain English.')}
          disabled={isSending || !selectedChildId}
          style={styles.actionPill}
        >
          <Text style={styles.actionPillText}>Explain Marks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSendMessage('How is my child\'s attendance rate looking? Give me tips for positive home morning routines.')}
          disabled={isSending || !selectedChildId}
          style={styles.actionPill}
        >
          <Text style={styles.actionPillText}>Attendance Tips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSendMessage('Please summarize our weekly school timetable and key dates.')}
          disabled={isSending || !selectedChildId}
          style={styles.actionPill}
        >
          <Text style={styles.actionPillText}>Timetable & Dates</Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Message Area */}
      <ScrollView style={styles.messageList} contentContainerStyle={styles.messageContent}>
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.sender === 'parent' ? styles.parentBubble : styles.compBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                m.sender === 'parent' ? styles.parentBubbleText : styles.compBubbleText,
              ]}
            >
              {m.text}
            </Text>
          </View>
        ))}

        {isSending && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Companion reflecting on your child's journey...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask a question..."
          placeholderTextColor="#94a3b8"
          style={styles.textInput}
        />
        <TouchableOpacity
          onPress={() => handleSendMessage()}
          disabled={isSending || !inputText.trim() || !selectedChildId}
          style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  headerSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  childScroll: { maxHeight: 42, paddingHorizontal: 12, marginTop: 8 },
  childPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  childPillActive: { backgroundColor: '#4f46e5' },
  childPillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  childPillTextActive: { color: '#ffffff' },
  activeChildBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeChildText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  privateText: { fontSize: 10, color: '#94a3b8' },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  actionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
  },
  actionPillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  errorBox: {
    margin: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
  },
  errorText: { fontSize: 11, color: '#991b1b', fontWeight: '500' },
  messageList: { flex: 1 },
  messageContent: { padding: 12, gap: 10 },
  bubble: { maxWidth: '82%', padding: 10, borderRadius: 12 },
  parentBubble: { alignSelf: 'flex-end', backgroundColor: '#0B1E3F' },
  compBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleText: { fontSize: 12, lineHeight: 18 },
  parentBubbleText: { color: '#ffffff' },
  compBubbleText: { color: '#0f172a' },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  loadingText: { fontSize: 11, color: '#64748b' },
  inputBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    fontSize: 12,
    color: '#0f172a',
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});
