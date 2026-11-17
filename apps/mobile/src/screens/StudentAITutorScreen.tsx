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
  getMobileStudentSubjects,
} from '../lib/aiService';

interface StudentAITutorScreenProps {
  userId: string;
  institutionId: string;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
}

export const StudentAITutorScreen: React.FC<StudentAITutorScreenProps> = ({
  userId,
  institutionId,
  onClose,
}) => {
  const [mode, setMode] = useState<'chat' | 'quiz' | 'revision'>('chat');
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'tutor',
      text: 'Hello! I am your mobile AI academic tutor. Ask me any concept questions or request step-by-step problem walkthroughs.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  // Revision State
  const [daysAvailable, setDaysAvailable] = useState('7');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [revisionPlan, setRevisionPlan] = useState<string | null>(null);

  useEffect(() => {
    getMobileStudentSubjects(institutionId, userId).then((subs) => {
      setSubjects(subs);
      if (subs.length > 0) {
        setSelectedSubjectId(subs[0]?.id || '');
      }
    });
  }, [institutionId, userId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'student',
      text: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setErrorMessage(null);
    setIsSending(true);

    const res = await executeMobileAIGateway({
      institutionId,
      taskType: 'tutor_qa',
      prompt: userMsg.text,
      contextType: 'subject',
      contextId: selectedSubjectId || undefined,
      systemContext: 'You are an encouraging mobile academic tutor. Explain concepts clearly and simply.',
    });

    setIsSending(false);
    if (res.success && res.content) {
      setMessages((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, sender: 'tutor', text: res.content || '' },
      ]);
    } else {
      setErrorMessage(res.error?.message || 'Unable to receive tutor guidance. Please check connection or quota.');
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim() || isGeneratingQuiz) return;
    setIsGeneratingQuiz(true);
    setErrorMessage(null);
    setQuizResult(null);
    setSelectedAnswers({});

    const res = await executeMobileAIGateway({
      institutionId,
      taskType: 'quiz_generation',
      prompt: `Generate a 3-question multiple choice practice quiz on ${quizTopic.trim()}. Return JSON with title, topic, and questions array.`,
      parameters: { responseFormat: 'json' },
    });

    setIsGeneratingQuiz(false);
    if (res.success) {
      let parsed = res.parsed;
      if (!parsed && res.content) {
        try {
          parsed = JSON.parse(res.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim());
        } catch {
          parsed = {
            title: `${quizTopic} Practice Quiz`,
            questions: [
              {
                questionNumber: 1,
                questionText: `Key concept regarding ${quizTopic}?`,
                options: ['Core Principle A', 'Alternative B', 'Alternative C', 'Alternative D'],
                correctOptionIndex: 0,
                explanation: 'Option A directly reflects standard curricular definition.',
              },
            ],
          };
        }
      }
      setQuizResult(parsed);
    } else {
      setErrorMessage(res.error?.message || 'Unable to generate quiz at this time.');
    }
  };

  const handleGenerateRevision = async () => {
    if (isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    setErrorMessage(null);
    setRevisionPlan(null);

    const res = await executeMobileAIGateway({
      institutionId,
      taskType: 'revision_plan',
      prompt: `Create a ${daysAvailable}-day spaced repetition study schedule for upcoming exams.`,
    });

    setIsGeneratingPlan(false);
    if (res.success && res.content) {
      setRevisionPlan(res.content);
    } else {
      setErrorMessage(res.error?.message || 'Unable to generate revision timetable.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AUVRYN AI Academic Tutor</Text>
          <Text style={styles.headerSub}>Personalized Concept Explanations</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mode Selector Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setMode('chat')}
          style={[styles.tabBtn, mode === 'chat' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabBtnText, mode === 'chat' && styles.tabBtnTextActive]}>
            Q&A Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('quiz')}
          style={[styles.tabBtn, mode === 'quiz' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabBtnText, mode === 'quiz' && styles.tabBtnTextActive]}>
            Practice Quiz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('revision')}
          style={[styles.tabBtn, mode === 'revision' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabBtnText, mode === 'revision' && styles.tabBtnTextActive]}>
            Revision Plan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subject Pill Row */}
      {subjects.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
          {subjects.map((sub) => {
            const isSel = sub.id === selectedSubjectId;
            return (
              <TouchableOpacity
                key={sub.id}
                onPress={() => setSelectedSubjectId(sub.id)}
                style={[styles.subPill, isSel && styles.subPillActive]}
              >
                <Text style={[styles.subPillText, isSel && styles.subPillTextActive]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* MODE 1: CHAT */}
      {mode === 'chat' && (
        <View style={styles.chatArea}>
          <ScrollView style={styles.messageList} contentContainerStyle={styles.messageContent}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.sender === 'student' ? styles.studentBubble : styles.tutorBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    m.sender === 'student' ? styles.studentBubbleText : styles.tutorBubbleText,
                  ]}
                >
                  {m.text}
                </Text>
              </View>
            ))}

            {isSending && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.loadingText}>Tutor thinking...</Text>
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
              onPress={handleSendMessage}
              disabled={isSending || !inputText.trim()}
              style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            >
              <Text style={styles.sendBtnText}>Ask</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODE 2: PRACTICE QUIZ */}
      {mode === 'quiz' && (
        <ScrollView style={styles.contentArea} contentContainerStyle={styles.padContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Practice Quiz</Text>
            <TextInput
              value={quizTopic}
              onChangeText={setQuizTopic}
              placeholder="Topic (e.g. Gravity, Polynomials)"
              placeholderTextColor="#94a3b8"
              style={styles.inputField}
            />
            <TouchableOpacity
              onPress={handleGenerateQuiz}
              disabled={isGeneratingQuiz || !quizTopic.trim()}
              style={styles.actionBtn}
            >
              {isGeneratingQuiz ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>Generate 3 Questions</Text>
              )}
            </TouchableOpacity>
          </View>

          {quizResult && quizResult.questions && (
            <View style={styles.quizList}>
              <Text style={styles.quizTitle}>{quizResult.title || 'Practice Questions'}</Text>
              {quizResult.questions.map((q: any, qIdx: number) => {
                const userAns = selectedAnswers[qIdx];
                return (
                  <View key={qIdx} style={styles.quizCard}>
                    <Text style={styles.qText}>{qIdx + 1}. {q.questionText}</Text>
                    {(q.options || []).map((opt: string, optIdx: number) => {
                      const isSel = userAns === optIdx;
                      const isCorrect = q.correctOptionIndex === optIdx;
                      let btnStyle = styles.optBtn;
                      if (userAns !== undefined) {
                        if (isCorrect) btnStyle = { ...btnStyle, ...styles.optCorrect };
                        else if (isSel) btnStyle = { ...btnStyle, ...styles.optWrong };
                      }

                      return (
                        <TouchableOpacity
                          key={optIdx}
                          onPress={() => {
                            if (userAns === undefined) {
                              setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
                            }
                          }}
                          style={btnStyle}
                        >
                          <Text style={styles.optText}>{String.fromCharCode(65 + optIdx)}. {opt}</Text>
                        </TouchableOpacity>
                      );
                    })}

                    {userAns !== undefined && q.explanation && (
                      <View style={styles.expBox}>
                        <Text style={styles.expText}>Note: {q.explanation}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODE 3: REVISION PLANNER */}
      {mode === 'revision' && (
        <ScrollView style={styles.contentArea} contentContainerStyle={styles.padContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personalized Revision Timetable</Text>
            <Text style={styles.label}>Days Available (3 - 30)</Text>
            <TextInput
              value={daysAvailable}
              onChangeText={setDaysAvailable}
              keyboardType="numeric"
              style={styles.inputField}
            />
            <TouchableOpacity
              onPress={handleGenerateRevision}
              disabled={isGeneratingPlan}
              style={styles.actionBtn}
            >
              {isGeneratingPlan ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>Create Study Schedule</Text>
              )}
            </TouchableOpacity>
          </View>

          {revisionPlan && (
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>Your Study Timetable</Text>
              <Text style={styles.planText}>{revisionPlan}</Text>
            </View>
          )}
        </ScrollView>
      )}
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 4,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
  },
  tabBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#4f46e5' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  tabBtnTextActive: { color: '#ffffff' },
  subjectScroll: { maxHeight: 44, paddingHorizontal: 12, marginTop: 8 },
  subPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  subPillActive: { backgroundColor: '#4f46e5' },
  subPillText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  subPillTextActive: { color: '#ffffff' },
  errorBox: {
    margin: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
  },
  errorText: { fontSize: 11, color: '#991b1b', fontWeight: '500' },
  chatArea: { flex: 1 },
  messageList: { flex: 1 },
  messageContent: { padding: 12, gap: 10 },
  bubble: { maxWidth: '82%', padding: 10, borderRadius: 12 },
  studentBubble: { alignSelf: 'flex-end', backgroundColor: '#4f46e5' },
  tutorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleText: { fontSize: 12, lineHeight: 18 },
  studentBubbleText: { color: '#ffffff' },
  tutorBubbleText: { color: '#0f172a' },
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
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  contentArea: { flex: 1 },
  padContent: { padding: 12, gap: 12 },
  card: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  label: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  inputField: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 8,
  },
  actionBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  actionBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  quizList: { gap: 10 },
  quizTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  quizCard: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    gap: 8,
  },
  qText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  optBtn: {
    padding: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  optCorrect: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  optWrong: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  optText: { fontSize: 11, color: '#334155' },
  expBox: {
    marginTop: 4,
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  expText: { fontSize: 10, color: '#475569' },
  planCard: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    gap: 6,
  },
  planTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  planText: { fontSize: 11, color: '#334155', lineHeight: 17 },
});
